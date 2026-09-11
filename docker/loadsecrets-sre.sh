#!/bin/bash
# ==============================================================================
# Load SRE Asset Tracker secrets from AWS SSM Parameter Store (us-east-2)
# ------------------------------------------------------------------------------
# Paths (separate from prod — never reads /backend-asset-tracker/*):
#   /sre-backend-asset-tracker/*
#   /sre-frontend-asset-tracker/*
#   /sre-postgres-asset-tracker/*
#
#   cd /opt/asset-mgt
#   source ./loadsecrets-sre.sh
#   cd asset-mgt-be/docker
#   docker-compose -f docker-compose.aws.sre.yml up -d --build
# ==============================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"

echo "Fetching SRE secrets from AWS SSM Parameter Store (${AWS_REGION})..."

ssm_get() {
  aws ssm get-parameter \
    --region "${AWS_REGION}" \
    --name "$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text
}

# ── Backend Asset Tracker (SRE) ───────────────────────────────────────────────

export ASST_TRACKER_BACKEND_JWT_SECRET
ASST_TRACKER_BACKEND_JWT_SECRET="$(ssm_get "/sre-backend-asset-tracker/jwt_secret")"

export ASST_TRACKER_BACKEND_COOKIE_SECURE
ASST_TRACKER_BACKEND_COOKIE_SECURE="$(ssm_get "/sre-backend-asset-tracker/cookie_secure")"

export ASST_TRACKER_BACKEND_CORS_ORIGIN
ASST_TRACKER_BACKEND_CORS_ORIGIN="$(ssm_get "/sre-backend-asset-tracker/cors_origin")"

export ASST_TRACKER_BACKEND_DATABASE_URL
ASST_TRACKER_BACKEND_DATABASE_URL="$(ssm_get "/sre-backend-asset-tracker/database_url")"

export ASST_TRACKER_BACKEND_FRONTEND_URL
ASST_TRACKER_BACKEND_FRONTEND_URL="$(ssm_get "/sre-backend-asset-tracker/frontend_url")"

export ASST_TRACKER_BACKEND_NODE_ENV
ASST_TRACKER_BACKEND_NODE_ENV="$(ssm_get "/sre-backend-asset-tracker/node_env")"

# ── SMTP ──────────────────────────────────────────────────────────────────────

export ASST_TRACKER_BACKEND_SMTP_FROM
ASST_TRACKER_BACKEND_SMTP_FROM="$(ssm_get "/sre-backend-asset-tracker/smtp_from")"

export ASST_TRACKER_BACKEND_SMTP_HOST
ASST_TRACKER_BACKEND_SMTP_HOST="$(ssm_get "/sre-backend-asset-tracker/smtp_host")"

export ASST_TRACKER_BACKEND_SMTP_PASS
ASST_TRACKER_BACKEND_SMTP_PASS="$(ssm_get "/sre-backend-asset-tracker/smtp_pass")"

export ASST_TRACKER_BACKEND_SMTP_PORT
ASST_TRACKER_BACKEND_SMTP_PORT="$(ssm_get "/sre-backend-asset-tracker/smtp_port")"

export ASST_TRACKER_BACKEND_SMTP_USER
ASST_TRACKER_BACKEND_SMTP_USER="$(ssm_get "/sre-backend-asset-tracker/smtp_user")"

# ── Frontend ──────────────────────────────────────────────────────────────────

export ASST_TRACKER_FRONTEND_VITE_API_BASE_URL
ASST_TRACKER_FRONTEND_VITE_API_BASE_URL="$(ssm_get "/sre-frontend-asset-tracker/vite_api_base_url")"

# ── Postgres ──────────────────────────────────────────────────────────────────

export ASST_TRACKER_POSTGRES_DB
ASST_TRACKER_POSTGRES_DB="$(ssm_get "/sre-postgres-asset-tracker/postgres_db")"

export ASST_TRACKER_POSTGRES_HOST
ASST_TRACKER_POSTGRES_HOST="$(ssm_get "/sre-postgres-asset-tracker/postgres_host")"

export ASST_TRACKER_POSTGRES_PASSWORD
ASST_TRACKER_POSTGRES_PASSWORD="$(ssm_get "/sre-postgres-asset-tracker/postgres_password")"

export ASST_TRACKER_POSTGRES_PORT
ASST_TRACKER_POSTGRES_PORT="$(ssm_get "/sre-postgres-asset-tracker/postgres_port")"

export ASST_TRACKER_POSTGRES_USER
ASST_TRACKER_POSTGRES_USER="$(ssm_get "/sre-postgres-asset-tracker/postgres_user")"

# ── Verification (secrets masked) ─────────────────────────────────────────────

echo ""
echo "All SRE secrets loaded successfully!"
echo ""
echo "Loaded variables:"
echo "  ASST_TRACKER_BACKEND_JWT_SECRET           = ***"
echo "  ASST_TRACKER_BACKEND_COOKIE_SECURE        = ${ASST_TRACKER_BACKEND_COOKIE_SECURE}"
echo "  ASST_TRACKER_BACKEND_CORS_ORIGIN          = ${ASST_TRACKER_BACKEND_CORS_ORIGIN}"
echo "  ASST_TRACKER_BACKEND_DATABASE_URL         = postgresql://***@***"
echo "  ASST_TRACKER_BACKEND_FRONTEND_URL         = ${ASST_TRACKER_BACKEND_FRONTEND_URL}"
echo "  ASST_TRACKER_BACKEND_NODE_ENV             = ${ASST_TRACKER_BACKEND_NODE_ENV}"
echo "  ASST_TRACKER_BACKEND_SMTP_FROM            = ${ASST_TRACKER_BACKEND_SMTP_FROM}"
echo "  ASST_TRACKER_BACKEND_SMTP_HOST            = ${ASST_TRACKER_BACKEND_SMTP_HOST}"
echo "  ASST_TRACKER_BACKEND_SMTP_PASS            = ***"
echo "  ASST_TRACKER_BACKEND_SMTP_PORT            = ${ASST_TRACKER_BACKEND_SMTP_PORT}"
echo "  ASST_TRACKER_BACKEND_SMTP_USER            = ${ASST_TRACKER_BACKEND_SMTP_USER}"
echo "  ASST_TRACKER_FRONTEND_VITE_API_BASE_URL   = ${ASST_TRACKER_FRONTEND_VITE_API_BASE_URL}"
echo "  ASST_TRACKER_POSTGRES_DB                  = ${ASST_TRACKER_POSTGRES_DB}"
echo "  ASST_TRACKER_POSTGRES_HOST                = ${ASST_TRACKER_POSTGRES_HOST}"
echo "  ASST_TRACKER_POSTGRES_PASSWORD            = ***"
echo "  ASST_TRACKER_POSTGRES_PORT                = ${ASST_TRACKER_POSTGRES_PORT}"
echo "  ASST_TRACKER_POSTGRES_USER                = ${ASST_TRACKER_POSTGRES_USER}"
