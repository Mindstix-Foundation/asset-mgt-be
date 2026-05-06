# syntax=docker/dockerfile:1.6

# ==============================================================================
# Asset Management Frontend (Vue 3 + Vite) - static asset image
# ------------------------------------------------------------------------------
# Multi-stage build:
#   1. builder - install deps and run `vite build` to produce static assets
#   2. runner  - tiny nginx image that ONLY serves the built /dist directory
#                (with HTML5 history fallback). API proxying is the job of the
#                separate "nginx" reverse-proxy container in front of this one.
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
# 2. Serve the static assets via a minimal nginx (no API proxying here)
# ------------------------------------------------------------------------------
FROM nginx:${NGINX_VERSION} AS runner

# Replace default site config: SPA fallback only, no /api routing.
RUN rm /etc/nginx/conf.d/default.conf && \
    printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
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
