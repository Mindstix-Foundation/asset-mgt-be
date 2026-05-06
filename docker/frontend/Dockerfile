# syntax=docker/dockerfile:1.6

# ==============================================================================
# Asset Management Frontend (Vue 3 + Vite)
# ------------------------------------------------------------------------------
# Multi-stage build:
#   1. builder - install deps and run `vite build` to produce static assets
#   2. runner  - tiny nginx image serving the built assets and proxying /api
#
# Build context: this Dockerfile expects asset-mgt-fe/frontend as its build
# context (see ../docker-compose.yml).
# ==============================================================================

ARG NODE_VERSION=22-alpine
ARG NGINX_VERSION=1.27-alpine

# ------------------------------------------------------------------------------
# 1. Build the production bundle
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# VITE_* vars are baked into the build, so they must be available at build time.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ------------------------------------------------------------------------------
# 2. Serve the static assets via nginx
# ------------------------------------------------------------------------------
FROM nginx:${NGINX_VERSION} AS runner

# nginx config is written inline so it doesn't need to be in the Vite build
# context. Mirrors Docker/frontend/nginx.conf (kept in source for reference).
RUN rm /etc/nginx/conf.d/default.conf && \
    printf '%s\n' \
    'upstream backend_upstream {' \
    '    server backend:3000;' \
    '}' \
    '' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '' \
    '    add_header X-Content-Type-Options "nosniff" always;' \
    '    add_header X-Frame-Options "DENY" always;' \
    '    add_header X-XSS-Protection "1; mode=block" always;' \
    '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
    '    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;' \
    '' \
    '    client_max_body_size 25M;' \
    '' \
    '    gzip on;' \
    '    gzip_vary on;' \
    '    gzip_min_length 1024;' \
    '    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;' \
    '' \
    '    location /assets/ {' \
    '        try_files $uri =404;' \
    '        expires 1y;' \
    '        add_header Cache-Control "public, immutable";' \
    '    }' \
    '' \
    '    location /api/ {' \
    '        proxy_pass         http://backend_upstream;' \
    '        proxy_http_version 1.1;' \
    '        proxy_set_header   Host              $host;' \
    '        proxy_set_header   X-Real-IP         $remote_addr;' \
    '        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;' \
    '        proxy_set_header   X-Forwarded-Proto $scheme;' \
    '        proxy_set_header   Upgrade           $http_upgrade;' \
    '        proxy_set_header   Connection        "upgrade";' \
    '        proxy_read_timeout 120s;' \
    '        proxy_send_timeout 120s;' \
    '    }' \
    '' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' \
    > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
