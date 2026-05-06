# Asset Management - Docker

Container setup for the Asset Management system. This folder contains everything
needed to build and run the full stack (Postgres + NestJS backend + Vue/Vite
frontend) with a single `docker compose` command.

## Layout

```
asset-mgt-be/                        # NestJS backend (build context for backend image)
├── docker/                          # <- you are here
│   ├── backend/
│   │   ├── Dockerfile                  # multi-stage NestJS image (Prisma + dist/)
│   │   └── Dockerfile.dockerignore     # honored by BuildKit (default in Docker 23+)
│   ├── frontend/
│   │   ├── Dockerfile                  # multi-stage Vite -> nginx image
│   │   ├── nginx.conf                  # SPA fallback + /api reverse-proxy (reference)
│   │   └── Dockerfile.dockerignore
│   ├── docker-compose.yml         # local stack: db + backend + frontend
│   ├── docker-compose.aws.yml     # AWS stack: backend + frontend (RDS provides db)
│   ├── .env.example               # template for the local stack
│   ├── .env.aws.example           # template for the AWS stack
│   ├── DEPLOY_AWS.md              # step-by-step EC2 + RDS deployment guide
│   ├── AWS_TEST_DEPLOY.md         # quick test deployment guide
│   └── README.md
└── ...
asset-mgt-fe/
└── frontend/                        # Vue 3 + Vite app (build context for frontend image)
```

The Dockerfiles live alongside the compose files inside the backend repo so
everything needed for deployment can be pushed and cloned from a single repo.
The frontend repo (`asset-mgt-fe`) is a sibling of `asset-mgt-be` and is
referenced via relative paths (`../../asset-mgt-fe/frontend`).

## AWS deployment

- **Quick test on AWS** (EC2 + RDS + ALB in ap-south-1, plain HTTP, no domain):
  follow [`AWS_TEST_DEPLOY.md`](./AWS_TEST_DEPLOY.md). Includes both Console
  and CLI paths and a teardown script.
- **Production-grade deployment** (with ACM, Route 53, S3 uploads, Secrets
  Manager, CloudWatch, hardening checklist): follow
  [`DEPLOY_AWS.md`](./DEPLOY_AWS.md).

## Quick start

```bash
cd asset-mgt-be/docker
cp .env.example .env
# edit .env: at minimum set POSTGRES_PASSWORD and JWT_SECRET

docker compose up -d --build
```

Then open:

- Frontend: http://localhost:8080
- Backend (direct): http://localhost:3000/api
- Swagger (if `ENABLE_SWAGGER=true`): http://localhost:3000/api/docs

The frontend's nginx proxies `/api/*` to the backend container, so in normal use
the browser only needs to talk to port `8080`.

## Useful commands

```bash
# Tail logs from all services
docker compose logs -f

# Restart only the backend after code changes
docker compose up -d --build backend

# Run Prisma migrations manually (the backend container also runs `migrate deploy` on startup)
docker compose exec backend npx prisma migrate deploy

# Seed the database
docker compose exec backend npm run db:seed

# Open a psql shell
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Stop everything (keeps volumes)
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

## Persistent data

- `postgres_data` — Postgres data files
- `backend_uploads` — files written by the backend to `/app/uploads`

Both are named Docker volumes; they survive `docker compose down` but are
removed by `docker compose down -v`.

## Notes

- `VITE_API_BASE_URL` is baked into the frontend at **build time**. The default
  (`/api`) assumes same-origin requests through nginx, which is the recommended
  setup. If you change it, rebuild with `docker compose build frontend`.
- The backend image runs `npx prisma migrate deploy` on startup, so new
  migrations checked into `prisma/migrations/` are applied automatically the
  next time the container starts.
- Both images run as non-root users where practical and use multi-stage builds
  to keep the final images small.
- The `Dockerfile.dockerignore` files live next to their Dockerfiles (rather
  than at the repo root) so the source repos stay clean. BuildKit (default in
  Docker 23+) automatically picks them up. If you need to build with the legacy
  builder, set `DOCKER_BUILDKIT=1`.
