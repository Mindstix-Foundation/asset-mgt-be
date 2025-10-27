## TrackStix Asset Management — DevOps Launch Brief

### 1) Tech Stack
- **Frontend**: Vue 3, Vite 7, TypeScript, Pinia, Vue Router, Axios, Bootstrap 5
- **Backend**: NestJS 11, TypeScript, Passport-JWT, class-validator/transformer, Helmet, Throttler, Swagger
- **ORM/DB**: Prisma 6 with **PostgreSQL**
- **Auth**: JWT access tokens (15m) + DB-backed refresh sessions (7d), token blacklist, HTTP-only cookies
- **Background/Utilities**: Node 20+, Nodemailer (SMTP), Multer (file uploads), ExcelJS, Chart.js
- **Tooling/QA**: ESLint, Prettier, Jest/Vitest, Playwright (optional)

### 2) Databases and External Services
- **PostgreSQL**: Required. Currently installed on the same EC2 instance for dev/stage. Can be managed or SaaS (e.g., Amazon RDS) for production. PostgreSQL itself is open source, but managed offerings (RDS) are paid.
- **SMTP (Email)**: External SMTP provider required for password reset emails. Can use free tiers for testing (e.g., Gmail/ethereal) but for business use a paid/approved SMTP service (SES, SendGrid, Mailgun).
- **Object/File Storage**: Backend repo includes an `uploads/` folder; local disk is used currently. For production, recommended to use object storage (e.g., S3) — managed and paid — or mount a persistent volume.
- **Other SaaS**: None strictly required. All other services are in-app libraries.

Environment variables (backend):
- Required: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT` (optional, default 3000), `NODE_ENV`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (optional)

Environment variables (frontend):
- `VITE_API_BASE_URL` (e.g., `https://api.example.com/api`)

### 3) Deployment on EC2 (Current Process)
- **Instance**: Initially t2.micro (insufficient for PostgreSQL), upgraded to **t2.small** which improved performance/stability for backend and DB.
- **System setup**:
  - Installed: Git, Node.js (v20+), npm, PostgreSQL
  - Initialized PostgreSQL service and configured users/db.
- **Directory layout**:
  - Backend: `/home/ec2-user/backend`
  - Frontend: `/var/www/frontend`
- **Source code**: Cloned GitHub repos into the above directories.
- **Configuration**:
  - Frontend: updated `.env` and `config.ts` to set `VITE_API_BASE_URL` and CORS alignment.
  - Backend: updated `.env` and ensured CORS/Helmet settings in `main.ts` align with `FRONTEND_URL`.
- **Install & build**:
  - In both folders: `npm install`
  - Backend: `npm run build` (Nest → `dist/`)
  - Frontend: `npm run build` (Vite → `dist/`)
- **Process manager**: **PM2** used to keep apps running and auto-start on reboot.
  - Install globally: `npm i -g pm2`
  - Start backend: `pm2 start dist/src/main.js --name asset-be`
  - Start frontend preview or serve built assets via NGINX (recommended). If using Vite preview: `pm2 start "npm run preview" --name asset-fe`
  - Persist: `pm2 save` and `pm2 startup`
- **Seeding**:
  - Ran backend seed to create default roles/admin and baseline data: `npm run db:seed`
- **Verification**:
  - Backend reachable via EC2 public IP and configured port; Swagger at `/api/docs`.
  - Frontend served via domain mapped to EC2; verified CORS and environment alignment.

### Notes/Recommendations for Production
- Prefer managed PostgreSQL (Amazon RDS) over local DB for reliability/backups (paid).
- Move file uploads from local `uploads/` to S3 or mounted persistent volume.
- Serve frontend `dist/` via NGINX/ALB/CloudFront with HTTPS, caching, and security headers.
- Run migrations during deploy: `npx prisma migrate deploy` before `pm2 start`.
- Lock down Swagger in prod (disable/public IP allow-list/basic auth).
- Ensure CORS with credentials: set exact `FRONTEND_URL` origin and cookie flags (`secure`, `sameSite`).
- Configure reverse proxy body size/timeouts to support bulk CSV/XLSX uploads.
- Centralize logs and add alerts (5xx spikes, latency, rate-limit hits).

### Quick Command Reference
```bash
# Backend
cd /home/ec2-user/backend
npm ci
npx prisma migrate deploy
npm run build
pm2 start dist/src/main.js --name asset-be
pm2 save && pm2 startup

# Frontend
cd /var/www/frontend
npm ci
VITE_API_BASE_URL=https://api.example.com/api npm run build
# Recommended: serve via NGINX pointing to ./dist

# Seed (optional first-time setup)
cd /home/ec2-user/backend
npm run db:seed
```


