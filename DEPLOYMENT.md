# Production Deployment Guide

This guide describes how to deploy the **Asset Management** system (NestJS backend + Vue 3 frontend + PostgreSQL) to a single AWS Lightsail / EC2 / any Ubuntu 22.04 VM for a small admin user base (~10 users).

> **Audience**: ~10 internal admin users. This guide intentionally chooses the simplest, cheapest, secure setup. If your user base grows beyond ~100 users, see the "Scaling Up" section at the bottom.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-deployment Checklist](#2-pre-deployment-checklist)
3. [Provision the Server](#3-provision-the-server)
4. [Install System Dependencies](#4-install-system-dependencies)
5. [Configure PostgreSQL](#5-configure-postgresql)
6. [Deploy the Backend](#6-deploy-the-backend)
7. [Deploy the Frontend](#7-deploy-the-frontend)
8. [Configure Nginx](#8-configure-nginx)
9. [Enable HTTPS (Let's Encrypt)](#9-enable-https-lets-encrypt)
10. [Process Management (PM2)](#10-process-management-pm2)
11. [Backups](#11-backups)
12. [Logging & Monitoring](#12-logging--monitoring)
13. [Post-Deployment Smoke Test](#13-post-deployment-smoke-test)
14. [Updating / Redeploying](#14-updating--redeploying)
15. [Troubleshooting](#15-troubleshooting)
16. [Scaling Up (if needed later)](#16-scaling-up-if-needed-later)

---

## 1. Architecture Overview

```
                        Internet
                           |
                    (DNS → server IP)
                           |
                    [ Lightsail VM ]
                           |
                ┌──────────┴──────────┐
                |        Nginx        |  ← ports 80, 443 (TLS via Certbot)
                └──┬───────────────┬──┘
                   |               |
       /  (static) |               | /api/*  → reverse proxy
                   ↓               ↓
        /var/www/asset-mgt-fe   localhost:3000
        (Vue build output)      NestJS (managed by PM2)
                                       |
                                       ↓
                                 PostgreSQL 15
                                 (localhost only)
```

**Key choices**:
- **One VM** = lower cost, easier backups, simpler operations.
- **PostgreSQL on the same VM** = fine for 10 users; daily snapshots cover backup needs.
- **Nginx** serves static frontend AND reverse-proxies `/api` to the backend → no CORS issues, single domain.
- **PM2** keeps the NestJS process alive across crashes and reboots.
- **Let's Encrypt** = free, auto-renewing SSL.

---

## 2. Pre-deployment Checklist

Before touching the server, prepare the following:

### 2.1 Code & Repository
- [ ] Both repos (`asset-mgt-be`, `asset-mgt-fe`) pushed to a private Git remote (GitHub/GitLab/Bitbucket).
- [ ] Latest `main`/`master` branch is the one you want in production.
- [ ] All migrations are committed (`prisma/migrations/` is in repo).
- [ ] Run `npm run build` locally on both projects to confirm they build cleanly.

### 2.2 Secrets to Generate
Run these on your local machine and **save the output securely** (e.g., 1Password, Bitwarden):

```bash
# Strong JWT secret (paste into JWT_SECRET)
openssl rand -base64 64

# Strong DB password (paste into DATABASE_URL)
openssl rand -base64 32 | tr -d '/+=' | head -c 32
```

### 2.3 SMTP / Email
- [ ] Gmail App Password generated at https://myaccount.google.com/apppasswords (or use SES/Mailgun/SendGrid for a real production setup).
- [ ] From-address is verified.

### 2.4 Domain & DNS
- [ ] You own a domain (e.g., `assets.yourcompany.com`).
- [ ] You can edit its DNS records.

### 2.5 AWS / Hosting
- [ ] AWS account with billing alerts enabled.
- [ ] Region chosen (pick one closest to your users; e.g., `ap-south-1` Mumbai for India).

---

## 3. Provision the Server

### 3.1 Create the Lightsail Instance
1. Open https://lightsail.aws.amazon.com/
2. Click **Create instance**.
3. Settings:
   - **Region**: closest to your users
   - **Platform**: Linux/Unix
   - **Blueprint**: OS Only → **Ubuntu 22.04 LTS**
   - **Plan**: **$12 USD/month** (2 GB RAM, 2 vCPU, 60 GB SSD) — recommended minimum
   - **Instance name**: `asset-mgt-prod`
4. Click **Create instance**.

### 3.2 Attach a Static IP
Lightsail → Networking → Create static IP → attach to your instance. **A static IP is free as long as it's attached.**

### 3.3 Open Firewall Ports
Lightsail → your instance → Networking → IPv4 Firewall → ensure these are allowed:
- **SSH (22)** — restrict source to your office/home IP if possible
- **HTTP (80)**
- **HTTPS (443)**

> Do **NOT** open port 3000 (backend) or 5432 (PostgreSQL) — they must remain internal only.

### 3.4 Point Your Domain
At your DNS provider, create:
```
A   assets.yourcompany.com   →   <Static IP from Lightsail>
```
Wait for DNS to propagate (5–30 minutes). Verify with:
```bash
dig +short assets.yourcompany.com
```

### 3.5 SSH In
Download the SSH key from Lightsail (Account → SSH keys → Download default key), then:
```bash
chmod 600 ~/Downloads/LightsailDefaultKey-<region>.pem
ssh -i ~/Downloads/LightsailDefaultKey-<region>.pem ubuntu@<static-ip>
```

---

## 4. Install System Dependencies

All the following commands run **on the server** as the `ubuntu` user.

### 4.1 Update the system
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```

### 4.2 Configure firewall (defense-in-depth, alongside Lightsail FW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 4.3 Install Node.js 20 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x
npm -v
```

### 4.4 Install PM2 globally
```bash
sudo npm install -g pm2
pm2 -v
```

### 4.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

### 4.6 Install PostgreSQL 15
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
psql --version
```

### 4.7 Install Certbot (for Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 5. Configure PostgreSQL

### 5.1 Create the production database & user
```bash
sudo -u postgres psql
```

Inside the `psql` prompt (replace `YOUR_STRONG_PASSWORD`):
```sql
CREATE USER asset_app WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE asset_management_db OWNER asset_app;
GRANT ALL PRIVILEGES ON DATABASE asset_management_db TO asset_app;
\q
```

### 5.2 Verify Postgres listens only on localhost
```bash
sudo grep -E "^listen_addresses" /etc/postgresql/15/main/postgresql.conf
```
Should be `listen_addresses = 'localhost'` (this is the default — leave it).

### 5.3 (Optional) Test the connection
```bash
psql "postgresql://asset_app:YOUR_STRONG_PASSWORD@localhost:5432/asset_management_db" -c "SELECT 1;"
```

---

## 6. Deploy the Backend

### 6.1 Create a deploy directory
```bash
sudo mkdir -p /opt/apps
sudo chown ubuntu:ubuntu /opt/apps
cd /opt/apps
```

### 6.2 Clone the backend repo
```bash
git clone <your-backend-repo-url> asset-mgt-be
cd asset-mgt-be
```
> If the repo is private, set up a [deploy SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) first.

### 6.3 Create the production `.env`
```bash
nano .env
```
Paste the following (filling in your real values):

```ini
DATABASE_URL="postgresql://asset_app:YOUR_STRONG_PASSWORD@localhost:5432/asset_management_db?schema=public"

JWT_SECRET="<paste output of `openssl rand -base64 64` here>"
JWT_EXPIRES_IN="7d"

NODE_ENV="production"
PORT=3000
ENABLE_SWAGGER=false
LOG_LEVEL="info"

CORS_ORIGIN="https://assets.yourcompany.com"
FRONTEND_URL="https://assets.yourcompany.com"

MAX_FILE_SIZE=10485760
UPLOAD_DEST="/opt/apps/asset-mgt-be/uploads"

DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-app-password"
SMTP_FROM='"Asset Management" <your-email@example.com>'
```

Lock down the file permissions:
```bash
chmod 600 .env
```

### 6.4 Install dependencies & build
```bash
npm ci
npx prisma generate
npx prisma migrate deploy   # applies all committed migrations
npm run build
```

> If you have seed data to load on the very first deploy, run `npm run db:seed`.
> Do NOT run seeds on subsequent deploys (it will duplicate data).

### 6.5 Create uploads dir
```bash
mkdir -p /opt/apps/asset-mgt-be/uploads
chmod 750 /opt/apps/asset-mgt-be/uploads
```

### 6.6 Start with PM2
```bash
pm2 start dist/src/main.js --name asset-be --time
pm2 save
pm2 startup systemd     # follow the instructions it prints (run the sudo command it shows)
```

Verify:
```bash
pm2 status
curl http://localhost:3000/api
```

---

## 7. Deploy the Frontend

### 7.1 Clone & build
```bash
cd /opt/apps
git clone <your-frontend-repo-url> asset-mgt-fe
cd asset-mgt-fe/frontend
```

### 7.2 Create production env
```bash
cat > .env <<'EOF'
VITE_API_BASE_URL=https://assets.yourcompany.com/api
EOF
```

### 7.3 Build the static site
```bash
npm ci
npm run build
```
Build output lands in `dist/`.

### 7.4 Publish to Nginx web root
```bash
sudo mkdir -p /var/www/asset-mgt-fe
sudo rsync -a --delete dist/ /var/www/asset-mgt-fe/
sudo chown -R www-data:www-data /var/www/asset-mgt-fe
```

---

## 8. Configure Nginx

### 8.1 Create the site config
```bash
sudo nano /etc/nginx/sites-available/asset-mgt
```

Paste (replace `assets.yourcompany.com`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name assets.yourcompany.com;

    # Certbot will modify this file to add HTTPS later.

    # Increase max body size for file uploads (>= MAX_FILE_SIZE in backend)
    client_max_body_size 20m;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    # API → backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 120s;
    }

    # Frontend (Vue SPA)
    root /var/www/asset-mgt-fe;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### 8.2 Enable and reload
```bash
sudo ln -sf /etc/nginx/sites-available/asset-mgt /etc/nginx/sites-enabled/asset-mgt
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://assets.yourcompany.com` — you should now see the Vue app.

---

## 9. Enable HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d assets.yourcompany.com
```
- Choose **redirect HTTP → HTTPS** when asked.
- Certbot adds an automatic renewal timer; verify with:
  ```bash
  sudo systemctl list-timers | grep certbot
  ```

Visit `https://assets.yourcompany.com` — confirm the padlock and a valid certificate.

---

## 10. Process Management (PM2)

### 10.1 Useful commands
```bash
pm2 status                     # see processes
pm2 logs asset-be              # tail backend logs
pm2 logs asset-be --lines 200  # last 200 lines
pm2 restart asset-be           # restart after deploy
pm2 reload asset-be            # zero-downtime restart
pm2 monit                      # live CPU/RAM dashboard
```

### 10.2 Log rotation (so logs don't fill the disk)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

---

## 11. Backups

### 11.1 Daily database backup
Create the backup script:
```bash
sudo mkdir -p /var/backups/asset-mgt
sudo nano /usr/local/bin/asset-db-backup.sh
```

Paste:
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/asset-mgt"
TIMESTAMP="$(date +%F_%H%M)"
FILE="$BACKUP_DIR/asset_management_db_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

PGPASSWORD='YOUR_STRONG_PASSWORD' pg_dump \
    -h localhost -U asset_app -d asset_management_db \
    --no-owner --clean --if-exists \
    | gzip > "$FILE"

# Keep only the last 14 daily backups
find "$BACKUP_DIR" -name '*.sql.gz' -type f -mtime +14 -delete

echo "Backup written to $FILE"
```

Make executable:
```bash
sudo chmod 700 /usr/local/bin/asset-db-backup.sh
sudo /usr/local/bin/asset-db-backup.sh   # test run
```

### 11.2 Schedule via cron (daily at 02:30 server time)
```bash
sudo crontab -e
```
Add:
```
30 2 * * * /usr/local/bin/asset-db-backup.sh >> /var/log/asset-db-backup.log 2>&1
```

### 11.3 Off-server backups (highly recommended)
A backup on the same server is **not** a real backup. Pick one:

- **Lightsail automatic snapshots** (cheapest): Lightsail → instance → Snapshots → Enable automatic snapshots. Costs ~$2/mo for a 60 GB instance.
- **AWS S3** sync (more durable): install AWS CLI, create an S3 bucket with lifecycle rules, and add `aws s3 sync /var/backups/asset-mgt s3://your-bucket/` to the backup script.

### 11.4 Restore drill (do this once before going live!)
```bash
# Spin up a temp DB and restore into it
sudo -u postgres createdb asset_restore_test
gunzip -c /var/backups/asset-mgt/asset_management_db_<DATE>.sql.gz \
  | sudo -u postgres psql asset_restore_test
sudo -u postgres dropdb asset_restore_test
```
If that succeeds, your backups are valid.

---

## 12. Logging & Monitoring

### 12.1 Where logs live
| Service     | Log location                                       |
| ----------- | -------------------------------------------------- |
| Backend     | `~/.pm2/logs/asset-be-out.log`, `asset-be-error.log` |
| Nginx       | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |
| PostgreSQL  | `/var/log/postgresql/postgresql-15-main.log`       |
| Backup cron | `/var/log/asset-db-backup.log`                     |

### 12.2 Free uptime monitoring
Sign up for **UptimeRobot** (free) and add a monitor:
- Type: HTTPS
- URL: `https://assets.yourcompany.com/api`
- Interval: 5 minutes
- Alert via email/Slack/SMS

### 12.3 Disk & memory alerts
Quick check anytime:
```bash
df -h            # disk
free -h          # memory
pm2 monit        # backend live stats
```

---

## 13. Post-Deployment Smoke Test

Run through this list **before announcing the URL** to users:

- [ ] `https://assets.yourcompany.com` loads the login page over HTTPS (padlock visible).
- [ ] Browser console is free of red errors.
- [ ] `https://assets.yourcompany.com/api/docs` is **404 / not exposed** (because `ENABLE_SWAGGER=false`).
- [ ] Login works with the seeded admin account.
- [ ] Create a test asset → it persists across page refresh.
- [ ] Assign the asset to an employee → assignment shows up.
- [ ] Generate / export a report (Excel) → downloads correctly.
- [ ] Trigger "forgot password" → email arrives in the inbox (check spam).
- [ ] Reboot the VM (`sudo reboot`) → after ~1 min, app is back online without manual intervention.
- [ ] Run the backup script manually → file appears in `/var/backups/asset-mgt/`.

---

## 14. Updating / Redeploying

### 14.1 Backend update
```bash
cd /opt/apps/asset-mgt-be
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload asset-be
```

### 14.2 Frontend update
```bash
cd /opt/apps/asset-mgt-fe/frontend
git pull
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/asset-mgt-fe/
```

### 14.3 (Optional) Single deploy script
Create `/opt/apps/deploy.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "→ Backend"
cd /opt/apps/asset-mgt-be
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload asset-be

echo "→ Frontend"
cd /opt/apps/asset-mgt-fe/frontend
git pull
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/asset-mgt-fe/

echo "✓ Deploy complete"
```
```bash
chmod +x /opt/apps/deploy.sh
```
Run with `/opt/apps/deploy.sh`.

---

## 15. Troubleshooting

| Symptom                                    | Likely cause / fix                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| 502 Bad Gateway                            | Backend crashed → `pm2 logs asset-be`; check `.env` and DB connectivity.   |
| CORS error in browser                      | `CORS_ORIGIN` in `.env` doesn't match the frontend URL exactly (https vs http, trailing slash). |
| Cookies not set / 401 on every request     | `NODE_ENV` not set to `production`, or domain mismatch on cookie. Restart backend after fixing `.env`. |
| Login email never arrives                  | SMTP creds wrong, or Gmail blocked sign-in → use App Password. Tail PM2 logs. |
| `npx prisma migrate deploy` fails          | DB user lacks privileges. Re-grant: `GRANT ALL ON SCHEMA public TO asset_app;` |
| Disk full                                  | Old PM2 logs / backups → check pm2-logrotate, prune `/var/backups/`.       |
| Cert renewal failed                        | `sudo certbot renew --dry-run` — ensure ports 80/443 are open.             |
| File upload returns 413                    | Increase `client_max_body_size` in Nginx, must be ≥ `MAX_FILE_SIZE`.       |

---

## 16. Scaling Up (if needed later)

You'll only need to revisit this if your user base grows beyond ~100 active users or you hit performance issues.

| Bottleneck       | Upgrade Path                                              |
| ---------------- | --------------------------------------------------------- |
| CPU / RAM        | Resize Lightsail plan ($24 → $48 → $96 / mo)              |
| Database         | Move to **AWS RDS PostgreSQL** (managed, automated backups, point-in-time recovery) |
| File uploads     | Move `uploads/` to **AWS S3** + signed URLs              |
| Multiple servers | Add an **Application Load Balancer**, run 2+ backend nodes |
| Static frontend  | Push `dist/` to **CloudFront + S3** for global CDN         |
| Email            | Move from Gmail SMTP → **AWS SES** or **SendGrid**        |

For now, **none of this is necessary**. Keep it simple.

---

## Quick Reference: File Locations on the Server

```
/opt/apps/asset-mgt-be/             ← backend code + .env + uploads/
/opt/apps/asset-mgt-fe/frontend/    ← frontend source (built artifacts go elsewhere)
/var/www/asset-mgt-fe/              ← built static frontend served by Nginx
/etc/nginx/sites-available/asset-mgt← Nginx config
/var/backups/asset-mgt/             ← daily DB dumps
/usr/local/bin/asset-db-backup.sh   ← backup script
~/.pm2/logs/                        ← backend logs
```

---

## One-time Production Setup: Estimated Time

| Phase                                 | Time          |
| ------------------------------------- | ------------- |
| Prepare repos, secrets, DNS           | 30 min        |
| Provision Lightsail + install software| 30 min        |
| Configure DB, deploy backend          | 30–45 min     |
| Build & deploy frontend, Nginx, SSL   | 30 min        |
| Backups, monitoring, smoke test       | 30 min        |
| **Total**                             | **~3 hours**  |

After this, future deploys take **5–10 minutes**.
