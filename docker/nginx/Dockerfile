# syntax=docker/dockerfile:1.6

# ==============================================================================
# Asset Management - nginx reverse proxy
# ------------------------------------------------------------------------------
# Sits in front of the frontend (static Vue SPA) and backend (NestJS) services.
#   - Routes "/api/*"   -> backend:3000
#   - Routes everything else -> frontend:80 (static SPA, with HTML5 fallback)
#
# Designed to be the single entry point on the EC2 host (or behind an ALB).
# ==============================================================================

ARG NGINX_VERSION=1.27-alpine

FROM nginx:${NGINX_VERSION}

# Replace the default site config with our reverse-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz >/dev/null 2>&1 || exit 1
