#!/bin/bash
# ==============================================================================
# Load Core (Mindstix / prod) Asset Tracker secrets from AWS SSM (us-east-2)
# ------------------------------------------------------------------------------
# Exports CORE_ASST_TRACKER_* so Core and SRE can both be sourced in one shell
# without overwriting each other (SRE uses SRE_ASST_TRACKER_*).
#
# SSM paths:
#   /backend-asset-tracker/*
#   /frontend-asset-tracker/*
#   /postgres-asset-tracker/*
#
#   cd /home/ssm-user/asset-mgt/asset-mgt-be/docker
#   docker-compose -f docker-compose.aws.core.yml build          # no secrets needed
#   cd /home/ssm-user/asset-mgt
#   source asset-mgt-be/docker/loadsecrets-core.sh               # secrets for up only
#   cd asset-mgt-be/docker
#   docker-compose -f docker-compose.aws.core.yml up -d
# ==============================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"

echo "Fetching Core secrets from AWS SSM Parameter Store (${AWS_REGION})..."

ssm_get() {
  aws ssm get-parameter \
    --region "${AWS_REGION}" \
    --name "$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text
}

# ── Backend Asset Tracker (Core) ──────────────────────────────────────────────

export CORE_ASST_TRACKER_BACKEND_JWT_SECRET
CORE_ASST_TRACKER_BACKEND_JWT_SECRET="$(ssm_get "/backend-asset-tracker/jwt_secret")"

export CORE_ASST_TRACKER_BACKEND_COOKIE_SECURE
CORE_ASST_TRACKER_BACKEND_COOKIE_SECURE="$(ssm_get "/backend-asset-tracker/cookie_secure")"

export CORE_ASST_TRACKER_BACKEND_CORS_ORIGIN
CORE_ASST_TRACKER_BACKEND_CORS_ORIGIN="$(ssm_get "/backend-asset-tracker/cors_origin")"

export CORE_ASST_TRACKER_BACKEND_DATABASE_URL
CORE_ASST_TRACKER_BACKEND_DATABASE_URL="$(ssm_get "/backend-asset-tracker/database_url")"

export CORE_ASST_TRACKER_BACKEND_FRONTEND_URL
CORE_ASST_TRACKER_BACKEND_FRONTEND_URL="$(ssm_get "/backend-asset-tracker/frontend_url")"

export CORE_ASST_TRACKER_BACKEND_NODE_ENV
CORE_ASST_TRACKER_BACKEND_NODE_ENV="$(ssm_get "/backend-asset-tracker/node_env")"

# ── Google OAuth ──────────────────────────────────────────────────────────────

export CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID
CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID="$(ssm_get "/backend-asset-tracker/google_client_id")"

export CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET
CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET="$(ssm_get "/backend-asset-tracker/google_client_secret")"

export CORE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI
CORE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI="$(ssm_get "/backend-asset-tracker/google_oauth_redirect_uri")"

# ── SMTP ──────────────────────────────────────────────────────────────────────

export CORE_ASST_TRACKER_BACKEND_SMTP_FROM
CORE_ASST_TRACKER_BACKEND_SMTP_FROM="$(ssm_get "/backend-asset-tracker/smtp_from")"

export CORE_ASST_TRACKER_BACKEND_SMTP_HOST
CORE_ASST_TRACKER_BACKEND_SMTP_HOST="$(ssm_get "/backend-asset-tracker/smtp_host")"

export CORE_ASST_TRACKER_BACKEND_SMTP_PASS
CORE_ASST_TRACKER_BACKEND_SMTP_PASS="$(ssm_get "/backend-asset-tracker/smtp_pass")"

export CORE_ASST_TRACKER_BACKEND_SMTP_PORT
CORE_ASST_TRACKER_BACKEND_SMTP_PORT="$(ssm_get "/backend-asset-tracker/smtp_port")"

export CORE_ASST_TRACKER_BACKEND_SMTP_USER
CORE_ASST_TRACKER_BACKEND_SMTP_USER="$(ssm_get "/backend-asset-tracker/smtp_user")"

# ── Frontend ──────────────────────────────────────────────────────────────────

export CORE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL
CORE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL="$(ssm_get "/frontend-asset-tracker/vite_api_base_url")"

# ── Postgres ──────────────────────────────────────────────────────────────────

export CORE_ASST_TRACKER_POSTGRES_DB
CORE_ASST_TRACKER_POSTGRES_DB="$(ssm_get "/postgres-asset-tracker/postgres_db")"

export CORE_ASST_TRACKER_POSTGRES_HOST
CORE_ASST_TRACKER_POSTGRES_HOST="$(ssm_get "/postgres-asset-tracker/postgres_host")"

export CORE_ASST_TRACKER_POSTGRES_PASSWORD
CORE_ASST_TRACKER_POSTGRES_PASSWORD="$(ssm_get "/postgres-asset-tracker/postgres_password")"

export CORE_ASST_TRACKER_POSTGRES_PORT
CORE_ASST_TRACKER_POSTGRES_PORT="$(ssm_get "/postgres-asset-tracker/postgres_port")"

export CORE_ASST_TRACKER_POSTGRES_USER
CORE_ASST_TRACKER_POSTGRES_USER="$(ssm_get "/postgres-asset-tracker/postgres_user")"

# ── Verification (secrets masked) ─────────────────────────────────────────────

echo ""
echo "All Core secrets loaded successfully (CORE_ASST_TRACKER_*)!"
echo ""
echo "Loaded variables:"
echo "  CORE_ASST_TRACKER_BACKEND_JWT_SECRET           = ***"
echo "  CORE_ASST_TRACKER_BACKEND_COOKIE_SECURE        = ${CORE_ASST_TRACKER_BACKEND_COOKIE_SECURE}"
echo "  CORE_ASST_TRACKER_BACKEND_CORS_ORIGIN          = ${CORE_ASST_TRACKER_BACKEND_CORS_ORIGIN}"
echo "  CORE_ASST_TRACKER_BACKEND_DATABASE_URL         = postgresql://***@***"
echo "  CORE_ASST_TRACKER_BACKEND_FRONTEND_URL         = ${CORE_ASST_TRACKER_BACKEND_FRONTEND_URL}"
echo "  CORE_ASST_TRACKER_BACKEND_NODE_ENV             = ${CORE_ASST_TRACKER_BACKEND_NODE_ENV}"
echo "  CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID     = ***"
echo "  CORE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET = ***"
echo "  CORE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI = ${CORE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI}"
echo "  CORE_ASST_TRACKER_BACKEND_SMTP_FROM            = ${CORE_ASST_TRACKER_BACKEND_SMTP_FROM}"
echo "  CORE_ASST_TRACKER_BACKEND_SMTP_HOST            = ${CORE_ASST_TRACKER_BACKEND_SMTP_HOST}"
echo "  CORE_ASST_TRACKER_BACKEND_SMTP_PASS            = ***"
echo "  CORE_ASST_TRACKER_BACKEND_SMTP_PORT            = ${CORE_ASST_TRACKER_BACKEND_SMTP_PORT}"
echo "  CORE_ASST_TRACKER_BACKEND_SMTP_USER            = ${CORE_ASST_TRACKER_BACKEND_SMTP_USER}"
echo "  CORE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL   = ${CORE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL}"
echo "  CORE_ASST_TRACKER_POSTGRES_DB                  = ${CORE_ASST_TRACKER_POSTGRES_DB}"
echo "  CORE_ASST_TRACKER_POSTGRES_HOST                = ${CORE_ASST_TRACKER_POSTGRES_HOST}"
echo "  CORE_ASST_TRACKER_POSTGRES_PASSWORD            = ***"
echo "  CORE_ASST_TRACKER_POSTGRES_PORT                = ${CORE_ASST_TRACKER_POSTGRES_PORT}"
echo "  CORE_ASST_TRACKER_POSTGRES_USER                = ${CORE_ASST_TRACKER_POSTGRES_USER}"
