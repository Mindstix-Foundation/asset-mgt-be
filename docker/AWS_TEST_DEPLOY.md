# AWS Test Deployment — Step-by-Step Guide

End-to-end testing playbook for the Asset Management stack on AWS:
**EC2 (Docker Compose) + RDS PostgreSQL + Application Load Balancer**, in
**ap-south-1 (Mumbai)**, accessed over the ALB's auto-generated DNS name on
plain HTTP. No custom domain or TLS cert needed — perfect for testing.

> When you later want to add HTTPS + a custom domain, see [`DEPLOY_AWS.md`](./DEPLOY_AWS.md) sections 5.1 and 5.4.

For each AWS resource you'll see **two paths**: the AWS Console (clicks) and
the AWS CLI (copy-paste). Pick whichever you prefer.

---

## Table of contents

1. [What we're building](#1-whats-getting-built)
2. [Phase 0 — Prerequisites](#phase-0--prerequisites)
3. [Phase 1 — Networking (VPC + Security Groups)](#phase-1--networking-vpc--security-groups)
4. [Phase 2 — RDS PostgreSQL](#phase-2--rds-postgresql)
5. [Phase 3 — EC2 instance with Docker](#phase-3--ec2-instance-with-docker)
6. [Phase 4 — Run the stack with Docker Compose](#phase-4--run-the-stack-with-docker-compose)
7. [Phase 5 — Application Load Balancer](#phase-5--application-load-balancer)
8. [Phase 6 — End-to-end test checklist](#phase-6--end-to-end-test-checklist)
9. [Phase 7 — Teardown (don't skip — avoid surprise bills)](#phase-7--teardown)
10. [Troubleshooting](#troubleshooting)

---

## 1. What's getting built

```
Browser ──HTTP──▶ ALB (public)  ──HTTP:8080──▶ EC2 (public subnet)
                                                  │
                                                  │ Docker Compose:
                                                  │   ├── nginx     (reverse proxy, host:8080 → :80)
                                                  │   │     ├── /api/* → backend
                                                  │   │     └── /*     → frontend
                                                  │   ├── frontend  (static Vue SPA, internal :80)
                                                  │   └── backend   (NestJS :3000, internal-only)
                                                  │
                                                  └─── psql 5432 (TLS) ───▶ RDS PostgreSQL 16
```

**Decisions made for this test**:

- Region: **ap-south-1** (Mumbai)
- EC2: 1 instance, **t3.small**, **public subnet**, public IP enabled (no NAT Gateway → cheaper)
- RDS: **db.t4g.micro**, **single-AZ** (free-tier eligible)
- ALB: HTTP only (no ACM cert)
- Single AZ (`ap-south-1a`) for everything except the ALB and RDS subnet group, which need ≥2 subnets in ≥2 AZs

**Estimated cost while running**: ~₹500–600 / day (~$6–7) for the EC2 + RDS + ALB combo. Run the [teardown](#phase-7--teardown) when done.

---

## Phase 0 — Prerequisites

You need:

| Item | How |
|---|---|
| AWS account | https://aws.amazon.com (sign up if needed) |
| IAM user with admin (for testing) | IAM → Users → Create with `AdministratorAccess` |
| AWS CLI installed (only if using CLI path) | `sudo dnf install -y awscli` (Linux) / `brew install awscli` (macOS) |
| AWS CLI configured | `aws configure` → paste access key, secret, region `ap-south-1` |
| EC2 key pair (`.pem`) | Console: EC2 → Key Pairs → Create → download `.pem` |
| Source code in GitHub | Both repos (`asset-mgt-be`, `asset-mgt-fe`) must be reachable from EC2 (public, or with a deploy key) |

Verify the CLI works:

```bash
aws sts get-caller-identity
# should print your account ID + IAM user/role
aws configure get region
# should print ap-south-1
```

Throughout this guide I'll assume the following shell variables. **Set them once at the top of your terminal session** and leave the terminal open until teardown:

```bash
export AWS_REGION=ap-south-1
export AZ_PRIMARY=ap-south-1a
export AZ_SECONDARY=ap-south-1b
export PROJECT=asset-mgt-test
export KEY_NAME=YOUR-EC2-KEY-PAIR-NAME      # the name of the keypair you created
export DB_MASTER_PASSWORD='Change-Me-To-A-Strong-Password-1234!'
```

---

## Phase 1 — Networking (VPC + Security Groups)

### 1.1 Create the VPC + subnets + internet gateway

#### Console path

1. Open **VPC** → **Your VPCs** → **Create VPC**.
2. Choose **VPC and more** (the wizard).
3. Name tag auto-generation: `asset-mgt-test`.
4. IPv4 CIDR: `10.0.0.0/16`.
5. Number of AZs: **2**. Number of public subnets: **2**. Number of private subnets: **0**. (We're keeping it cheap; the EC2 will go in a public subnet.)
6. NAT gateways: **None**.
7. VPC endpoints: **None**.
8. DNS options: tick both **Enable DNS hostnames** and **Enable DNS resolution**.
9. Click **Create VPC**.

This gives you `asset-mgt-test-vpc` plus two public subnets (one in `ap-south-1a`, one in `ap-south-1b`), an internet gateway, and a route table.

Note the IDs — you'll need them. From the VPC dashboard, click the new VPC → copy the **VPC ID** and the **two subnet IDs**.

#### CLI path

```bash
# 1. VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT}-vpc}]" \
  --query 'Vpc.VpcId' --output text)

aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support

# 2. Internet gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT}-igw}]" \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID

# 3. Two public subnets in two AZs
SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone $AZ_PRIMARY \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-public-a}]" \
  --query 'Subnet.SubnetId' --output text)

SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone $AZ_SECONDARY \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-public-b}]" \
  --query 'Subnet.SubnetId' --output text)

aws ec2 modify-subnet-attribute --subnet-id $SUBNET_A --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_B --map-public-ip-on-launch

# 4. Route table with default route to the IGW, associated to both subnets
RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT}-public-rt}]" \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id $RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
aws ec2 associate-route-table --route-table-id $RT_ID --subnet-id $SUBNET_A
aws ec2 associate-route-table --route-table-id $RT_ID --subnet-id $SUBNET_B

echo "VPC_ID=$VPC_ID"
echo "SUBNET_A=$SUBNET_A   ($AZ_PRIMARY)"
echo "SUBNET_B=$SUBNET_B   ($AZ_SECONDARY)"
```

**Save the printed IDs in your scratch file.**

### 1.2 Create three security groups

We use three layered SGs:

| SG | Inbound | Source |
|---|---|---|
| `alb-sg` | TCP 80 | `0.0.0.0/0` (public) |
| `ec2-sg` | TCP 8080 | `alb-sg` only (so only the ALB can hit the app) |
| `ec2-sg` | TCP 22 | your home IP /32 (so you can SSH) |
| `rds-sg` | TCP 5432 | `ec2-sg` only |

#### Console path

For each of the three SGs: **VPC → Security Groups → Create security group** in the `asset-mgt-test-vpc`.

After creating all three, edit them and add the inbound rules above. For "source = another SG", in the rule's source field, type/select the SG name.

#### CLI path

```bash
# Find your public IP for the SSH rule
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "Your IP is $MY_IP"

# alb-sg
ALB_SG=$(aws ec2 create-security-group --vpc-id $VPC_ID \
  --group-name ${PROJECT}-alb-sg --description "ALB - public 80" \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT}-alb-sg}]" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0

# ec2-sg
EC2_SG=$(aws ec2 create-security-group --vpc-id $VPC_ID \
  --group-name ${PROJECT}-ec2-sg --description "EC2 - 8080 from ALB, 22 from me" \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT}-ec2-sg}]" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 8080 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 22 --cidr ${MY_IP}/32

# rds-sg
RDS_SG=$(aws ec2 create-security-group --vpc-id $VPC_ID \
  --group-name ${PROJECT}-rds-sg --description "RDS - 5432 from EC2 only" \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT}-rds-sg}]" \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $EC2_SG

echo "ALB_SG=$ALB_SG"
echo "EC2_SG=$EC2_SG"
echo "RDS_SG=$RDS_SG"
```

---

## Phase 2 — RDS PostgreSQL

### 2.1 DB subnet group

RDS needs ≥2 subnets in ≥2 AZs, even for single-AZ. We'll reuse our two public subnets (it's a test; for prod, use private subnets).

#### Console path

**RDS → Subnet groups → Create DB subnet group**:

- Name: `asset-mgt-test-db-subnet`
- VPC: `asset-mgt-test-vpc`
- AZs: tick `ap-south-1a` and `ap-south-1b`
- Subnets: tick the two `asset-mgt-test-public-*` subnets
- **Create**.

#### CLI path

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name ${PROJECT}-db-subnet \
  --db-subnet-group-description "Subnet group for ${PROJECT}" \
  --subnet-ids $SUBNET_A $SUBNET_B \
  --tags Key=Name,Value=${PROJECT}-db-subnet
```

### 2.2 Create the DB instance

#### Console path

**RDS → Databases → Create database**:

- Choose **Standard create**, engine **PostgreSQL**, version **16.x** (latest minor is fine).
- Templates → **Free tier** (or Dev/Test).
- DB instance identifier: `asset-mgt-test-db`
- Master username: `asset_admin`
- Master password: paste your `DB_MASTER_PASSWORD` from Phase 0.
- Instance: `db.t4g.micro` (free tier) or `db.t4g.small`
- Storage: gp3, 20 GiB, autoscaling **off**
- Connectivity:
  - VPC: `asset-mgt-test-vpc`
  - DB subnet group: `asset-mgt-test-db-subnet`
  - Public access: **No**
  - VPC security group → existing → tick `asset-mgt-test-rds-sg`, **untick** `default`
- Initial database name: leave **blank** (we'll create one with the right owner)
- Backup retention: 1 day (test) or 7 (real)
- Encryption: leave on (default)
- Deletion protection: **off** (so teardown is easier)
- Click **Create database**.

It takes ~5–10 minutes to come up.

#### CLI path

```bash
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT}-db \
  --engine postgres --engine-version 16 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username asset_admin \
  --master-user-password "$DB_MASTER_PASSWORD" \
  --db-subnet-group-name ${PROJECT}-db-subnet \
  --vpc-security-group-ids $RDS_SG \
  --no-publicly-accessible \
  --backup-retention-period 1 \
  --no-multi-az \
  --tags Key=Name,Value=${PROJECT}-db

# Wait until it's ready (this takes ~5-10 min)
aws rds wait db-instance-available --db-instance-identifier ${PROJECT}-db
echo "RDS is ready."

# Capture the endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT}-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)
echo "RDS_ENDPOINT=$RDS_ENDPOINT"
```

### 2.3 Verify (from your laptop, just to sanity-check the endpoint exists)

```bash
nslookup $RDS_ENDPOINT
# You should see an internal AWS IP (like 10.0.x.x). You can NOT psql from your laptop.
```

We'll create the actual `asset_user` + `asset_management_db` from inside the EC2 in Phase 4, since only the EC2's SG can talk to RDS.

---

## Phase 3 — EC2 instance with Docker

### 3.1 Find the latest Amazon Linux 2023 AMI

```bash
AMI_ID=$(aws ec2 describe-images --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)
echo "AMI_ID=$AMI_ID"
```

### 3.2 Launch the EC2

#### Console path

**EC2 → Instances → Launch instances**:

- Name: `asset-mgt-test-ec2`
- AMI: **Amazon Linux 2023** (latest)
- Instance type: `t3.small`
- Key pair: pick `$KEY_NAME` (the one you have the `.pem` file for)
- Network settings → **Edit**:
  - VPC: `asset-mgt-test-vpc`
  - Subnet: pick `asset-mgt-test-public-a`
  - Auto-assign public IP: **Enable**
  - Firewall: **Select existing security group** → tick `asset-mgt-test-ec2-sg`
- Storage: 30 GiB gp3
- **Launch instance**.

After ~30 seconds, copy the **public IPv4** and **public IPv4 DNS** of the instance.

#### CLI path

```bash
EC2_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name $KEY_NAME \
  --security-group-ids $EC2_SG \
  --subnet-id $SUBNET_A \
  --associate-public-ip-address \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT}-ec2}]" \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --instance-ids $EC2_ID

EC2_PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $EC2_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "EC2_ID=$EC2_ID"
echo "EC2_PUBLIC_IP=$EC2_PUBLIC_IP"
```

### 3.3 SSH in

```bash
chmod 400 ~/Downloads/${KEY_NAME}.pem    # only needed once
ssh -i ~/Downloads/${KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}
```

If you get "host key verification failed" later when re-using a recycled IP, run `ssh-keygen -R ${EC2_PUBLIC_IP}` and try again.

### 3.4 On the EC2 — install Docker, Compose v2, git

```bash
# ===== run these on the EC2, not your laptop =====
sudo dnf update -y
sudo dnf install -y docker git postgresql16
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Compose v2 plugin (so `docker compose` works without the hyphen)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -sSL \
  "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Re-login so the docker group takes effect
exit
```

SSH back in, then verify:

```bash
docker version
docker compose version
git --version
psql --version
```

### 3.5 Clone the source

Only **two** repos are needed. The Docker setup lives inside `asset-mgt-be`.

```bash
sudo mkdir -p /opt/asset-mgt
sudo chown -R ec2-user:ec2-user /opt/asset-mgt
cd /opt/asset-mgt

git clone https://github.com/<your-org>/asset-mgt-be.git
git clone https://github.com/<your-org>/asset-mgt-fe.git
```

If they're private, generate a deploy key on the EC2:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub      # paste this into GitHub → repo → Deploy keys
```

Then `git clone git@github.com:...` instead.

After cloning, you should have:

```
/opt/asset-mgt/
├── asset-mgt-be/
│   ├── docker/          # compose files + Dockerfiles
│   ├── prisma/
│   ├── src/
│   └── ...
└── asset-mgt-fe/
    └── frontend/
```

---

## Phase 4 — Run the stack with Docker Compose

### 4.1 Bootstrap the application database in RDS

Still on the EC2:

```bash
psql "host=${RDS_ENDPOINT} port=5432 user=asset_admin sslmode=require dbname=postgres"
# When prompted, paste your DB_MASTER_PASSWORD.
```

> If `${RDS_ENDPOINT}` isn't set on the EC2, look it up in the RDS console (Databases → asset-mgt-test-db → Connectivity → Endpoint), and `export RDS_ENDPOINT=<that-value>` first. Same for `DB_MASTER_PASSWORD` and the `DB_APP_PASSWORD` below.

Inside `psql`:

```sql
-- Create the application's role + database. Use a different password from the master password.
CREATE ROLE asset_user WITH LOGIN PASSWORD 'App-Password-Different-From-Master-9876!';
CREATE DATABASE asset_management_db OWNER asset_user;
GRANT ALL PRIVILEGES ON DATABASE asset_management_db TO asset_user;
\q
```

Save the application password — we'll need it next:

```bash
export DB_APP_PASSWORD='App-Password-Different-From-Master-9876!'
```

### 4.2 Build the compose `.env`

```bash
cd /opt/asset-mgt/asset-mgt-be/docker
cp .env.aws.example .env
```

Now edit `.env` and fill in **at minimum** these five values:

```bash
# Generate a JWT secret (paste the output into JWT_SECRET below)
openssl rand -base64 64 | tr -d '\n'; echo
```

Open the file with `vi .env` (or `nano .env`) and set:

```ini
DATABASE_URL=postgresql://asset_user:App-Password-Different-From-Master-9876!@<paste RDS endpoint>:5432/asset_management_db?schema=public&sslmode=require
JWT_SECRET=<paste the 86-char base64 string from openssl above>
JWT_EXPIRES_IN=7d

# We don't have a domain yet, so use the EC2's public DNS for now.
# We'll switch this to the ALB DNS in Phase 5.4.
CORS_ORIGIN=http://<EC2 public IPv4 DNS, e.g. ec2-3-110-12-34.ap-south-1.compute.amazonaws.com>
FRONTEND_URL=http://<same as CORS_ORIGIN>

VITE_API_BASE_URL=/api
ENABLE_SWAGGER=true                 # leave on for testing; turn off for prod
LOG_LEVEL=info
FRONTEND_PORT=8080

# CRITICAL for plain-HTTP testing without TLS: tells the backend to set the
# auth cookies WITHOUT the `Secure` flag, otherwise the browser silently drops
# them and login appears to succeed but immediately bounces back to /login.
COOKIE_SECURE=false
```

> Tip: special chars (`!`, `&`, `?`, `@`) in `DATABASE_URL` are fine inside the
> URL because compose's `.env` parser does no shell expansion — it reads the
> file as raw key=value lines. **Don't** put quotes around the URL.

### 4.3 Build & start the stack

```bash
cd /opt/asset-mgt/asset-mgt-be/docker
docker compose -f docker-compose.aws.yml up -d --build
```

First build pulls Node, runs `npm ci` for both apps, and builds Vite — expect ~3–8 minutes depending on EC2 + network. Subsequent runs use cache.

Watch the logs while migrations apply:

```bash
docker compose -f docker-compose.aws.yml logs -f backend
```

You should see:

```
9 migrations found in prisma/migrations
Applying migration `20250915112523_mfam_51_update_db_schema`
...
Applying migration `20260506000000_sync_schema_with_app`
[Nest] LOG [NestApplication] Nest application successfully started
Application is running on port 3000 (NODE_ENV=production)
```

Press `Ctrl-C` to stop tailing (the containers keep running).

### 4.4 Verify on the EC2

```bash
docker compose -f docker-compose.aws.yml ps
# both containers should be "Up"

curl -s -o /dev/null -w "frontend: HTTP %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "api:      HTTP %{http_code}\n" http://localhost:8080/api/
# expected: both 200
```

### 4.5 Verify from your laptop (direct EC2, before the ALB)

From your laptop:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://${EC2_PUBLIC_IP}:8080/
```

This should **fail / time out**, because the EC2 SG only allows port 8080 from the ALB's SG, not from `0.0.0.0/0`. That's correct — the ALB will be the entry point.

> If it succeeds, your `ec2-sg` is too permissive. Re-check: 8080 should be source `alb-sg`, not `0.0.0.0/0`.

### 4.6 Seed the database (one-time)

The seed script needs `ts-node` (a dev-dep, pruned out of the runtime image), so run it **on the EC2 host**, against RDS:

```bash
cd /opt/asset-mgt/asset-mgt-be
npm ci                            # ~3 min, installs all deps incl. dev

DATABASE_URL="postgresql://asset_user:${DB_APP_PASSWORD}@${RDS_ENDPOINT}:5432/asset_management_db?schema=public&sslmode=require" \
  npx ts-node prisma/seeds/updated-april-2026/seed-updated-april-2026.ts
```

Expected output:

```
STEP 1: Clean Database & Create Admin            ✓
STEP 2: Asset Structure                          Created 1 categories / 4 types / 4 brands / 27 models
STEP 3: Employees                                Created 171 employees
STEP 4 & 5: Assets + Assignments                 Assets created: 252 / Assignments created: 219 / Failed: 0
SEEDING COMPLETE                                 Duration: ~3s
Admin Login: username=admin, password=Admin@123
```

---

## Phase 5 — Application Load Balancer

### 5.1 Create a target group

#### Console path

**EC2 → Target groups → Create target group**:

- Target type: **Instances**
- Name: `asset-mgt-test-tg`
- Protocol/port: **HTTP** / **8080**
- VPC: `asset-mgt-test-vpc`
- Protocol version: HTTP1
- **Health checks** → expand "Advanced":
  - Path: `/healthz`  (the nginx reverse-proxy exposes this lightweight endpoint)
  - Healthy threshold: 2
  - Interval: 15s
  - Success codes: `200`
- **Next**.
- On the "Register targets" page, tick the EC2 instance, set port `8080`, click **Include as pending below**, then **Create target group**.

#### CLI path

```bash
TG_ARN=$(aws elbv2 create-target-group \
  --name ${PROJECT}-tg \
  --protocol HTTP --port 8080 \
  --vpc-id $VPC_ID \
  --target-type instance \
  --health-check-path /healthz --health-check-interval-seconds 15 \
  --healthy-threshold-count 2 \
  --matcher 'HttpCode=200' \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 register-targets --target-group-arn $TG_ARN \
  --targets Id=$EC2_ID,Port=8080

echo "TG_ARN=$TG_ARN"
```

### 5.2 Create the ALB

#### Console path

**EC2 → Load balancers → Create load balancer → Application Load Balancer**:

- Name: `asset-mgt-test-alb`
- Scheme: **internet-facing**
- IP address type: IPv4
- VPC: `asset-mgt-test-vpc`
- Mappings: tick **both** AZs (`ap-south-1a` + `ap-south-1b`) and pick the matching `asset-mgt-test-public-*` subnet for each.
- Security groups: tick `asset-mgt-test-alb-sg`, **untick** `default`.
- Listeners and routing:
  - Listener: **HTTP** on port **80**, default action: **Forward** → `asset-mgt-test-tg`.
- **Create load balancer**.

After ~2 minutes the ALB state becomes "Active". Copy its **DNS name**, e.g.

```
asset-mgt-test-alb-1234567890.ap-south-1.elb.amazonaws.com
```

#### CLI path

```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name ${PROJECT}-alb \
  --type application --scheme internet-facing --ip-address-type ipv4 \
  --subnets $SUBNET_A $SUBNET_B \
  --security-groups $ALB_SG \
  --tags Key=Name,Value=${PROJECT}-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN

ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

# HTTP listener -> target group
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "ALB_DNS=$ALB_DNS"
```

### 5.3 Wait for the target to go healthy

This takes ~30–60 seconds (the ALB has to do 2 successful health checks at 15s intervals).

```bash
# CLI:
aws elbv2 describe-target-health --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[].TargetHealth.State' --output text
# Wait until it prints "healthy" (initially shows "initial" or "unhealthy")
```

In the **Console** equivalent: EC2 → Target groups → `asset-mgt-test-tg` → **Targets** tab → wait for the status to change from `initial` → `healthy`.

### 5.4 Update the app to allow the ALB hostname

The backend's `CORS_ORIGIN` and `FRONTEND_URL` were set to the EC2's public DNS in Phase 4.2. Now that we have the ALB, switch them. On the EC2:

```bash
cd /opt/asset-mgt/asset-mgt-be/docker

# Set both to the new ALB DNS (no trailing slash).
ALB_URL="http://asset-mgt-test-alb-XXXXXXXXXX.ap-south-1.elb.amazonaws.com"   # use your real ALB DNS

sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=${ALB_URL}|"   .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${ALB_URL}|" .env

# Restart only the backend (the frontend bundle doesn't depend on these vars).
docker compose -f docker-compose.aws.yml up -d backend
```

(The Vite frontend uses `VITE_API_BASE_URL=/api` for same-origin requests, so the frontend image doesn't need to be rebuilt when the public hostname changes.)

---

## Phase 6 — End-to-end test checklist

Run from your laptop. Substitute your real ALB DNS.

### 6.1 Smoke tests with curl

```bash
ALB="http://asset-mgt-test-alb-XXXXXXXXXX.ap-south-1.elb.amazonaws.com"

# 1. Frontend serves the SPA
curl -s -o /dev/null -w "frontend:  %{http_code}\n" $ALB/
# expected: 200

# 2. /api/ goes through nginx -> backend
curl -s -o /dev/null -w "api root:  %{http_code}\n" $ALB/api/
# expected: 200

# 3. Login as the seeded admin
curl -s -X POST $ALB/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' \
  | python3 -m json.tool | head -30
# expected: success:true, an access_token, and user payload

# 4. Use the token to query a protected endpoint
TOKEN=$(curl -s -X POST $ALB/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s $ALB/api/employees -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -10
# expected: list of employees (paginated). 401 means token didn't go through.

# 5. Swagger (since we set ENABLE_SWAGGER=true for testing)
curl -s -o /dev/null -w "swagger:   %{http_code}\n" $ALB/api/docs
# expected: 200 or 301
```

### 6.2 Browser test

Open `http://asset-mgt-test-alb-XXXXXXXXXX.ap-south-1.elb.amazonaws.com` in your browser.

Tick off:

- [ ] Login page loads (Vue SPA, no broken assets)
- [ ] Login with `admin` / `Admin@123` succeeds → redirected to dashboard
- [ ] Dashboard shows seeded data (252 assets, 172 employees, etc.)
- [ ] Open DevTools → Network: API calls go to `/api/*` (same origin, status 200)
- [ ] Open DevTools → Network: no CORS errors, no 502s
- [ ] Refresh the page mid-session — auth survives (cookie/JWT persists)
- [ ] Navigate to a deep route (e.g. `/assets/1`) and refresh — SPA fallback works (no 404)

### 6.3 Resilience checks (optional)

```bash
# Restart the backend; ALB health check should briefly mark unhealthy then recover
ssh -i ~/Downloads/${KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP} \
  'cd /opt/asset-mgt/asset-mgt-be/docker && docker compose -f docker-compose.aws.yml restart backend'

# Watch from your laptop
while true; do
  curl -s -o /dev/null -w "$(date +%T)  %{http_code}\n" $ALB/api/
  sleep 2
done
# Expect a few 502s during the ~10s the backend is restarting, then 200 again.
```

```bash
# Check the AWS-side target health during the restart
aws elbv2 describe-target-health --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[].{State:TargetHealth.State,Reason:TargetHealth.Reason}'
```

### 6.4 Reading logs

On the EC2:

```bash
cd /opt/asset-mgt/asset-mgt-be/docker

# Tail both
docker compose -f docker-compose.aws.yml logs -f --tail=50

# Just the backend
docker compose -f docker-compose.aws.yml logs -f backend

# Just nginx access logs
docker compose -f docker-compose.aws.yml logs -f frontend
```

---

## Phase 7 — Teardown

⚠️ **Don't skip this.** A running ALB + RDS + EC2 in ap-south-1 costs ~₹500/day even idle.

### Console path

Delete in this order:

1. **EC2 → Load balancers** → select `asset-mgt-test-alb` → **Actions → Delete**.
2. **EC2 → Target groups** → select `asset-mgt-test-tg` → **Actions → Delete**.
3. **EC2 → Instances** → select `asset-mgt-test-ec2` → **Instance state → Terminate instance**.
4. **RDS → Databases** → select `asset-mgt-test-db` → **Actions → Delete** → tick "Skip final snapshot", "Acknowledge…" → type `delete me` → **Delete**. Takes ~5 min.
5. **RDS → Subnet groups** → delete `asset-mgt-test-db-subnet`.
6. **VPC → Security groups** → delete the three SGs (delete `rds-sg` first, then `ec2-sg`, then `alb-sg` because they reference each other).
7. **VPC → Your VPCs** → delete `asset-mgt-test-vpc` (this also removes the IGW, subnets, and route tables that the wizard created).

### CLI path

Run these from the same shell session you've been using (so `$VPC_ID` etc. are still in scope). Order matters.

```bash
# 1. ALB + listener + target group
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
sleep 30  # AWS needs a moment before the SG/VPC can be freed
aws elbv2 delete-target-group --target-group-arn $TG_ARN

# 2. EC2
aws ec2 terminate-instances --instance-ids $EC2_ID
aws ec2 wait instance-terminated --instance-ids $EC2_ID

# 3. RDS (skip final snapshot)
aws rds delete-db-instance --db-instance-identifier ${PROJECT}-db \
  --skip-final-snapshot --delete-automated-backups
aws rds wait db-instance-deleted --db-instance-identifier ${PROJECT}-db
aws rds delete-db-subnet-group --db-subnet-group-name ${PROJECT}-db-subnet

# 4. Security groups (rds first because it references ec2-sg)
aws ec2 delete-security-group --group-id $RDS_SG
aws ec2 delete-security-group --group-id $EC2_SG
aws ec2 delete-security-group --group-id $ALB_SG

# 5. Routes, IGW, subnets, VPC
aws ec2 disassociate-route-table --association-id $(aws ec2 describe-route-tables \
    --filters "Name=route-table-id,Values=$RT_ID" \
    --query 'RouteTables[0].Associations[?!Main].RouteTableAssociationId' --output text | head -1) 2>/dev/null || true
aws ec2 delete-route-table --route-table-id $RT_ID || true

aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID

aws ec2 delete-subnet --subnet-id $SUBNET_A
aws ec2 delete-subnet --subnet-id $SUBNET_B
aws ec2 delete-vpc --vpc-id $VPC_ID

echo "Teardown complete."
```

> If a VPC delete fails with "has dependencies", run
> `aws ec2 describe-network-interfaces --filters Name=vpc-id,Values=$VPC_ID`
> and delete any leftover ENIs (usually from a not-yet-fully-deleted ALB; wait
> 30s and retry).

### Verify nothing's left

```bash
aws ec2 describe-instances --filters "Name=tag:Name,Values=${PROJECT}-*" \
  --query 'Reservations[].Instances[?State.Name!=`terminated`].InstanceId' --output text

aws rds describe-db-instances --query "DBInstances[?DBInstanceIdentifier=='${PROJECT}-db'].DBInstanceStatus" --output text

aws elbv2 describe-load-balancers --query "LoadBalancers[?LoadBalancerName=='${PROJECT}-alb']" --output text

aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT}-vpc" --query 'Vpcs[].VpcId' --output text
```

All four commands should return empty output. Done.

---

## Troubleshooting

### Target health is `unhealthy` (or stuck on `initial`)

1. Confirm the EC2 SG allows 8080 from `alb-sg`:

   ```bash
   aws ec2 describe-security-groups --group-ids $EC2_SG \
     --query 'SecurityGroups[0].IpPermissions'
   ```

2. Confirm nginx is responding on the EC2:

   ```bash
   ssh -i ~/Downloads/${KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP} \
     'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/'
   # expected 200
   ```

3. Check what the ALB is actually getting:

   ```bash
   aws elbv2 describe-target-health --target-group-arn $TG_ARN
   # Look at TargetHealth.Reason — common ones:
   #   Target.FailedHealthChecks   -> nginx isn't on 8080, or 8080 isn't bound
   #   Target.Timeout              -> SG blocking
   #   Target.HealthCheckMismatch  -> nginx returned a 4xx/5xx; check 'Matcher' includes 200
   ```

### Login returns 401 even with correct credentials

You ran the seed *before* the schema was synced. Re-run the seed (it cleans the DB) — see Phase 4.6.

### Browser shows "Not Allowed by CORS"

`CORS_ORIGIN` in `.env` doesn't match the URL in the address bar. Fix the value, then `docker compose -f docker-compose.aws.yml up -d backend` to restart the backend.

### `docker compose up` fails with "no space left on device"

`t3.small` with 30 GiB EBS is comfortable, but the `npm ci` for both apps + Docker images + cached layers can fill `/var/lib/docker`. Either grow the EBS volume or run `docker system prune -af` between rebuilds.

### Migrations fail on the second deploy

The first deploy fixed schema drift via `20260506000000_sync_schema_with_app`. If you've redeployed after pulling new code that adds a migration, ensure the order matches `prisma/migrations/` directory listing — Prisma applies them by filename. Don't rename or reorder migrations after they've been applied.

### RDS is "Available" but the EC2 can't connect

Always check the SG chain in this order:

```
EC2's outbound  →  RDS-SG inbound (port 5432, source = EC2-SG)
                                           │
                                  must be EC2's *security group ID*,
                                  not its IP, not 0.0.0.0/0
```

`telnet $RDS_ENDPOINT 5432` from the EC2 should connect immediately.

### I see `ContainerConfig` KeyError on `docker-compose down`

Only happens on the legacy Python `docker-compose` v1.x with Docker 25+.
On Amazon Linux 2023 we installed the modern `docker compose` plugin (no
hyphen), which doesn't have this bug. Always use `docker compose -f ...`.

---

## Quick reference card

```bash
# SSH in
ssh -i ~/Downloads/${KEY_NAME}.pem ec2-user@${EC2_PUBLIC_IP}

# Update the app
cd /opt/asset-mgt/asset-mgt-be && git pull
cd /opt/asset-mgt/asset-mgt-fe && git pull
cd /opt/asset-mgt/asset-mgt-be/docker && docker compose -f docker-compose.aws.yml up -d --build

# Tail logs
docker compose -f docker-compose.aws.yml logs -f backend
docker compose -f docker-compose.aws.yml logs -f frontend

# Reseed
cd /opt/asset-mgt/asset-mgt-be
DATABASE_URL="..." npx ts-node prisma/seeds/updated-april-2026/seed-updated-april-2026.ts

# Open psql against RDS
psql "host=${RDS_ENDPOINT} port=5432 user=asset_admin sslmode=require dbname=postgres"
```
