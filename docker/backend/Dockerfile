# syntax=docker/dockerfile:1.6

# ==============================================================================
# Asset Management Backend (NestJS + Prisma)
# ------------------------------------------------------------------------------
# Multi-stage build:
#   1. deps    - install all npm deps (incl. dev) for building
#   2. builder - generate Prisma client and compile TypeScript -> dist/
#   3. runner  - small production image with only what is needed at runtime
#
# Build context: this Dockerfile expects the asset-mgt-be repo as its build
# context (see ../docker-compose.yml).
# ==============================================================================

ARG NODE_VERSION=20-alpine

# ------------------------------------------------------------------------------
# 1. Install dependencies (with dev deps, needed for build)
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm ci --no-audit --no-fund

# ------------------------------------------------------------------------------
# 2. Build: generate Prisma client and compile TypeScript
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# 3. Runtime image
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat dumb-init \
    && addgroup -S nodejs -g 1001 \
    && adduser -S nestjs -u 1001 -G nodejs

ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

# Run pending Prisma migrations on startup, then start the Nest app.
# `prisma migrate deploy` is the production-safe migration command.
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
