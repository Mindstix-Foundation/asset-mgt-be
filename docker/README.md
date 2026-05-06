# Asset Management - Docker

Container setup for the Asset Management system. This folder contains everything
needed to build and run the full stack (Postgres + NestJS backend + Vue/Vite
frontend + nginx reverse proxy) with a single `docker compose` command.

## Architecture

```
Browser → host:8080 → [nginx]  ───────► /api/*  → [backend] (NestJS :3000)
                                  └──► /*       → [frontend] (static Vue, nginx :80)
                       │
                       └─ The single public-facing container.
                          Frontend + backend stay on the internal compose network.
```

## Layout

```
asset-mgt-be/                          # NestJS backend (build context for backend image)
├── docker/                            # <- you are here
│   ├── backend/
│   │   ├── Dockerfile                  # multi-stage NestJS image (Prisma + dist/)
│   │   └── Dockerfile.dockerignore
│   ├── frontend/
│   │   ├── Dockerfile                  # multi-stage Vite -> tiny static-serving nginx
│   │   └── Dockerfile.dockerignore
│   ├── nginx/
│   │   ├── Dockerfile                  # reverse-proxy image
│   │   ├── nginx.conf                  # /api -> backend, /* -> frontend
│   │   └── Dockerfile.dockerignore
│   ├── docker-compose.yml              # local stack: db + backend + frontend + nginx
│   ├── docker-compose.aws.yml          # AWS stack: backend + frontend + nginx (RDS provides db)
│   ├── .env.example                    # template for the local stack
│   ├── .env.aws.example                # template for the AWS stack
│   ├── DEPLOY_AWS.md                   # step-by-step EC2 + RDS deployment guide
│   ├── AWS_TEST_DEPLOY.md              # quick test deployment guide
│   └── README.md
└── ...
asset-mgt-fe/
└── frontend/                            # Vue 3 + Vite app (build context for frontend image)
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

## Quick start (local)

```bash
cd asset-mgt-be/docker
cp .env.example .env
# edit .env: at minimum set POSTGRES_PASSWORD and JWT_SECRET

docker compose up -d --build
```

Then open:

- Frontend (via nginx): http://localhost:8080
- Swagger (if `ENABLE_SWAGGER=true`): http://localhost:8080/api/docs

The browser only ever talks to the nginx container on port 8080. nginx proxies
`/api/*` to the backend and serves everything else from the frontend container.
Neither the frontend nor backend exposes ports to the host.

## Useful commands

```bash
# Tail logs from all services
docker compose logs -f

# Restart only the backend after code changes
docker compose up -d --build backend

# Restart nginx after editing nginx.conf
docker compose up -d --build nginx

# Run Prisma migrations manually (the backend container also runs `migrate deploy` on startup)
docker compose exec backend npx prisma migrate deploy

# Open a psql shell against the bundled Postgres
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Stop everything (keeps volumes)
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

## Environment variables of note

- **`COOKIE_SECURE`** — controls the `secure` flag on the auth cookies.
  - `true` (default in `docker-compose.aws.yml`) — required when serving over HTTPS.
  - `false` — required when serving over plain HTTP (otherwise login appears
    to succeed but the browser silently drops the cookie and you're bounced
    back to the login screen).
- **`VITE_API_BASE_URL`** — baked into the frontend at **build time**. The
  default (`/api`) assumes same-origin requests through nginx, which is the
  recommended setup. If you change it, rebuild with
  `docker compose build frontend`.

## Persistent data

- `postgres_data` — Postgres data files (local stack only)
- `backend_uploads` — files written by the backend to `/app/uploads`

Both are named Docker volumes; they survive `docker compose down` but are
removed by `docker compose down -v`.

## Notes

- The backend image runs `npx prisma migrate deploy` on startup, so new
  migrations checked into `prisma/migrations/` are applied automatically the
  next time the container starts.
- All images run as non-root users where practical and use multi-stage builds
  to keep the final images small.
- `Dockerfile.dockerignore` files live next to their Dockerfiles so the source
  repos stay clean. BuildKit (default in Docker 23+) automatically picks them
  up. If you need to build with the legacy builder, set `DOCKER_BUILDKIT=1`.
