# Deploying Asset Management on AWS (EC2 + RDS)

End-to-end guide for running the Dockerized Asset Management stack on AWS using:

- **EC2** (Amazon Linux 2023) — runs `frontend` (nginx) + `backend` (NestJS) via Docker Compose
- **RDS PostgreSQL 16** — managed database (replaces the bundled `db` service)
- **Application Load Balancer** — terminates TLS, fronts the EC2
- **Route 53 + ACM** — domain + certificate
- **S3** _(optional)_ — for `uploads/` and DB backups
- **Secrets Manager / SSM Parameter Store** _(optional)_ — for JWT_SECRET, DB password
- **CloudWatch Logs** _(optional)_ — for container logs

---

## 0. Prerequisites

- An AWS account with admin (or sufficient IAM) access
- A registered domain (e.g. `example.com`) — Route 53 strongly recommended
- The asset-mgt source repos pushed somewhere the EC2 can reach (GitHub HTTPS or a private repo with a deploy key)
- AWS CLI configured locally (optional, for the CLI commands shown)

Replace placeholder values before pasting:

| Placeholder | Example |
|---|---|
| `${REGION}` | `us-east-1` |
| `${DOMAIN}` | `assets.example.com` |
| `${VPC_ID}` | from VPC step |
| `${ALB_SG}` / `${EC2_SG}` / `${RDS_SG}` | from SG step |
| `${EC2_KEY}` | name of an EC2 keypair you own |

---

## 1. Networking — VPC, subnets, security groups

You can use the **default VPC** for a quick PoC, but for production use a dedicated VPC.

### 1.1 VPC + subnets (Console: VPC > Create VPC > "VPC and more")

Use the wizard with:

- IPv4 CIDR: `10.0.0.0/16`
- 2 Availability Zones
- 2 public subnets (`10.0.1.0/24`, `10.0.2.0/24`)
- 2 private subnets (`10.0.11.0/24`, `10.0.12.0/24`)
- 1 NAT Gateway (in 1 AZ — cheapest), or "None" if EC2 will sit in a public subnet for v1
- DNS hostnames + DNS resolution: **enabled**

For a simpler **single-EC2 PoC** you can skip the NAT and place the EC2 in a public subnet.

### 1.2 Security groups (3 SGs, layered)

| SG name | Inbound | Outbound |
|---|---|---|
| `alb-sg` | 80/tcp + 443/tcp from `0.0.0.0/0` | all |
| `ec2-sg` | **8080/tcp from `alb-sg`** (only) + 22/tcp from your office IP / SSM | all |
| `rds-sg` | **5432/tcp from `ec2-sg`** (only) | all |

**Critical:** the source for `ec2-sg:8080` is the **ALB security group**, and the source for `rds-sg:5432` is the **EC2 security group**. Never allow `0.0.0.0/0` on those ports.

---

## 2. RDS PostgreSQL 16

### 2.1 Create an RDS subnet group

Console: **RDS > Subnet groups > Create**. Pick the VPC + the two **private** subnets.

### 2.2 Create the database

Console: **RDS > Create database**

- Engine: **PostgreSQL 16.x**
- Templates: **Production** (or **Dev/Test** for PoC)
- DB instance identifier: `asset-mgt-prod`
- Master username: `asset_admin`
- Master password: generate a strong one (or "Manage in Secrets Manager" — recommended)
- Instance: `db.t4g.medium` (start small, scale later)
- Storage: gp3, 20 GiB, autoscale to 100 GiB
- Multi-AZ: **enabled** for prod, off for PoC
- VPC: the one created above
- Subnet group: the one above
- **Public access: NO**
- VPC security group: `rds-sg`
- Initial database name: leave empty (we'll create it ourselves so the name matches what the app expects)
- Backup retention: 7 days (or 30)
- Deletion protection: **enabled** for prod

Wait ~10 minutes. Note the **endpoint** (e.g. `asset-mgt-prod.abc123.us-east-1.rds.amazonaws.com`).

### 2.3 Bootstrap the database

You can do this from the EC2 in step 3 once it's up. From there:

```bash
sudo dnf install -y postgresql16
psql "host=${RDS_ENDPOINT} port=5432 user=asset_admin sslmode=require dbname=postgres"
```

Inside `psql`:

```sql
CREATE ROLE asset_user WITH LOGIN PASSWORD 'STRONG_APP_PASSWORD';
CREATE DATABASE asset_management_db OWNER asset_user;
GRANT ALL PRIVILEGES ON DATABASE asset_management_db TO asset_user;
\q
```

The connection string for the app then becomes:

```
postgresql://asset_user:STRONG_APP_PASSWORD@${RDS_ENDPOINT}:5432/asset_management_db?schema=public&sslmode=require
```

> **Migrations are applied automatically** on backend container startup (`npx prisma migrate deploy`). Don't run them manually.

---

## 3. EC2 instance

### 3.1 Launch

Console: **EC2 > Launch instance**

- Name: `asset-mgt-app-1`
- AMI: **Amazon Linux 2023** (x86_64 or arm64)
- Instance type: `t3.small` (PoC) or `t3.medium` / `t3.large` (prod)
- Key pair: `${EC2_KEY}`
- VPC: the one above; place in a **private subnet** (with NAT) for prod, or a **public subnet** for PoC
- Security group: `ec2-sg`
- Storage: 30 GiB gp3
- IAM instance profile: create one with the policies below
- Auto-assign public IP: only if in a public subnet

### 3.2 IAM role for the EC2

Attach a role with these AWS-managed policies (or scoped equivalents):

- `AmazonSSMManagedInstanceCore` — connect via Session Manager (no SSH needed)
- `CloudWatchAgentServerPolicy` — push logs (optional)
- A custom policy granting `secretsmanager:GetSecretValue` on the specific secret ARNs (optional)
- A custom policy granting `s3:GetObject`/`s3:PutObject` on `arn:aws:s3:::your-uploads-bucket/*` (optional, if using S3 for uploads)

### 3.3 Install Docker + Compose

SSH in (or use Session Manager) and:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Compose v2 plugin
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
sudo mkdir -p $DOCKER_CONFIG/cli-plugins
sudo curl -sSL \
  "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# Re-login to pick up the docker group
exit
```

Verify after re-login:

```bash
docker version
docker compose version
```

### 3.4 Pull the source

```bash
sudo mkdir -p /opt/asset-mgt
sudo chown -R ec2-user:ec2-user /opt/asset-mgt
cd /opt/asset-mgt

git clone https://github.com/<org>/asset-mgt-be.git
git clone https://github.com/<org>/asset-mgt-fe.git
```

Final layout on the EC2:

```
/opt/asset-mgt/
├── asset-mgt-be/
│   ├── docker/          # compose files + Dockerfiles live here
│   ├── prisma/
│   ├── src/
│   └── ...
└── asset-mgt-fe/
    └── frontend/
```

---

## 4. Configure & run the stack on EC2

### 4.1 Build the `.env`

```bash
cd /opt/asset-mgt/asset-mgt-be/docker
cp .env.aws.example .env
vi .env
```

Fill in:

```ini
DATABASE_URL=postgresql://asset_user:STRONG_APP_PASSWORD@${RDS_ENDPOINT}:5432/asset_management_db?schema=public&sslmode=require

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')   # generate locally, paste the value
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
VITE_API_BASE_URL=/api

ENABLE_SWAGGER=false
LOG_LEVEL=info
FRONTEND_PORT=8080
```

> **Better:** store `JWT_SECRET` and the DB password in **Secrets Manager**, fetch them at boot:
>
> ```bash
> JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id asset-mgt/jwt --query SecretString --output text)
> DB_PASS=$(aws secretsmanager get-secret-value --secret-id asset-mgt/db --query SecretString --output text)
> ```
>
> and inject them into `.env` (or pass with `docker compose --env-file`).

### 4.2 Bring it up

```bash
cd /opt/asset-mgt/asset-mgt-be/docker
docker compose -f docker-compose.aws.yml up -d --build
```

The backend container's entrypoint runs `npx prisma migrate deploy` against RDS, then starts NestJS. First boot takes ~30 seconds.

### 4.3 Health check from the EC2

```bash
docker compose -f docker-compose.aws.yml ps
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "api:      %{http_code}\n" http://localhost:8080/api/
```

Both should return `200`.

### 4.4 Seed initial data (optional, one-time)

The seed script needs `ts-node`, which is pruned out of the production image. Easiest path:

```bash
cd /opt/asset-mgt/asset-mgt-be
npm ci                            # installs dev deps locally on the EC2
DATABASE_URL='postgresql://asset_user:STRONG_APP_PASSWORD@${RDS_ENDPOINT}:5432/asset_management_db?schema=public&sslmode=require' \
  npx ts-node prisma/seeds/updated-april-2026/seed-updated-april-2026.ts
```

After seeding, you can `rm -rf node_modules` to reclaim disk if you want — the running container has its own copy.

---

## 5. Application Load Balancer + TLS

### 5.1 Request a TLS cert in ACM

Console: **Certificate Manager (in the same region as the ALB) > Request public certificate**

- Domain: `${DOMAIN}` (and optionally `*.${DOMAIN}`)
- Validation: **DNS** (Route 53 can do this in one click if the domain is hosted there)

Wait for "Issued" status (~5 minutes after DNS validation).

### 5.2 Target group

Console: **EC2 > Target groups > Create**

- Type: Instances
- Protocol/port: **HTTP / 8080**
- VPC: same as the EC2
- Health check path: `/`
- Healthy threshold: 2, interval 15s
- Register the EC2 instance, port 8080

### 5.3 Application Load Balancer

Console: **EC2 > Load balancers > Create > Application Load Balancer**

- Scheme: **internet-facing**
- Network: VPC + both **public** subnets
- Security group: `alb-sg`
- Listeners:
  - **HTTPS :443** → forward → target group from 5.2; SSL cert from ACM (5.1)
  - **HTTP :80** → redirect to HTTPS :443 (best-practice; use a "Redirect" action)

Note the ALB DNS name (e.g. `asset-mgt-prod-1234567890.us-east-1.elb.amazonaws.com`).

### 5.4 Route 53 alias record

Console: **Route 53 > Hosted zones > ${parent zone} > Create record**

- Name: `assets`
- Type: A
- Alias: yes → ALB → pick the one above

After ~30 seconds, `https://${DOMAIN}` will resolve to the ALB and serve the frontend.

---

## 6. Verification

```bash
curl -sI https://${DOMAIN}/ | head -1                          # HTTP/2 200
curl -s  https://${DOMAIN}/api/ -o /dev/null -w "%{http_code}\n"  # 200

# Login as the seeded admin (change password immediately!)
curl -s -X POST https://${DOMAIN}/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}'
```

Open `https://${DOMAIN}` in your browser → log in with `admin / Admin@123` → **change the password immediately**.

---

## 7. Hardening checklist (before going live)

- [ ] **Rotate the seeded `Admin@123` password** on first login.
- [ ] **Disable SSH in `ec2-sg`**; use **Session Manager** instead (`aws ssm start-session --target i-...`).
- [ ] **`ENABLE_SWAGGER=false`** in `.env` (already the default).
- [ ] **`LOG_LEVEL=info`** (or `warn`).
- [ ] **RDS deletion protection: ON**, automated backups: 7–30 days.
- [ ] **RDS encryption at rest** (default for new DBs) — verify it's on.
- [ ] **`sslmode=require`** in `DATABASE_URL` (forces TLS to RDS) — already in the template.
- [ ] **Secrets in Secrets Manager**, not in `.env` files on disk.
- [ ] **CloudWatch alarms** on EC2 CPU > 80%, RDS free storage < 20%, ALB 5xx rate.
- [ ] **AWS Backup** for the EBS volume on the EC2 (or just the `backend_uploads` volume) if you're not using S3 for uploads.
- [ ] **WAF** on the ALB (managed rules for OWASP top 10) — optional but recommended.
- [ ] **`/api/docs` blocked at the ALB** if Swagger ever gets enabled.
- [ ] **Restrict outbound** of `ec2-sg` if you want defense-in-depth (only allow 443 to internet, 5432 to `rds-sg`, 587 to SES, etc.).

---

## 8. Day-2 operations

### Updating the app

On the EC2:

```bash
cd /opt/asset-mgt/asset-mgt-be && git pull
cd /opt/asset-mgt/asset-mgt-fe && git pull
cd /opt/asset-mgt/asset-mgt-be/docker
docker compose -f docker-compose.aws.yml up -d --build
```

The backend's entrypoint will run any new Prisma migrations on startup.

### Tailing logs

```bash
cd /opt/asset-mgt/asset-mgt-be/docker
docker compose -f docker-compose.aws.yml logs -f backend
docker compose -f docker-compose.aws.yml logs -f frontend
```

### Manual DB shell

```bash
psql "$(grep ^DATABASE_URL /opt/asset-mgt/asset-mgt-be/docker/.env | cut -d= -f2-)"
```

### Manual DB backup (ad hoc — RDS automated backups also run)

```bash
pg_dump "$(grep ^DATABASE_URL /opt/asset-mgt/asset-mgt-be/docker/.env | cut -d= -f2-)" \
  | gzip > /tmp/asset-mgt-$(date +%F).sql.gz
aws s3 cp /tmp/asset-mgt-*.sql.gz s3://your-backup-bucket/
```

### Scaling later

- **Vertical:** stop EC2 → change instance type → start. Or modify RDS instance class (a few minutes downtime, or zero with Multi-AZ).
- **Horizontal:** put two EC2s in an Auto Scaling Group behind the same ALB; move uploads to S3 (the app currently writes to a local volume, which won't be shared between instances), and consider Redis (ElastiCache) for refresh-token sessions.

---

## 9. Cost estimate (us-east-1, on-demand, ~hourly)

| Resource | Spec | ~Monthly USD |
|---|---|---|
| EC2 `t3.small` 24/7 | 2 vCPU / 2 GiB | ~$15 |
| EBS gp3 30 GiB | | ~$2.40 |
| RDS `db.t4g.medium` Single-AZ | 2 vCPU / 4 GiB | ~$50 |
| RDS storage gp3 20 GiB | | ~$2.30 |
| ALB | 1 LCU avg | ~$22 |
| Data transfer 50 GB out | | ~$4.50 |
| Route 53 hosted zone | | $0.50 |
| **Total (PoC)** | | **~$95/mo** |
| Multi-AZ RDS, t3.medium EC2 | (production) | **~$165–200/mo** |

ACM certs and CloudWatch basic metrics are free.

---

## 10. Common pitfalls

- **`Failed to connect to RDS`** → SG mis-config. Confirm `rds-sg` has 5432 from `ec2-sg`, NOT from a CIDR.
- **`ALB returns 502`** → backend crashed or target health is failing. `docker compose logs backend` and check the target group health.
- **Prisma `P1001` (`Can't reach database server`)** → your `DATABASE_URL` is wrong, or the EC2 is in a subnet that doesn't have a route to the RDS subnets, or `sslmode=require` was set but RDS rejected the cert (fix: ensure RDS has the default RDS CA, or set `sslmode=no-verify` for self-signed local certs — not for prod).
- **`Migration failed`** → look at `_prisma_migrations` table; the project's migration history has had drift fixes (see `docker/README.md` notes).
- **HTTPS works but `/api` returns CORS error** → `CORS_ORIGIN` in `.env` must match the exact `https://${DOMAIN}` you're hitting (no trailing slash).
- **Logins succeed, then 401s on next request** → the JWT cookie isn't being sent because the ALB stripped the `Set-Cookie` header on a different domain. Make sure the API and the frontend share the same domain (they do by default through the bundled nginx proxy).
