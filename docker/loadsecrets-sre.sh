#!/bin/bash
# ==============================================================================
# Load SRE Asset Tracker secrets from AWS SSM Parameter Store (us-east-2)
# ------------------------------------------------------------------------------
# Exports SRE_ASST_TRACKER_* so Core and SRE can both be sourced in one shell
# without overwriting each other (Core uses CORE_ASST_TRACKER_*).
#
# SSM paths (never reads /backend-asset-tracker/*):
#   /sre-backend-asset-tracker/*
#   /sre-frontend-asset-tracker/*
#   /sre-postgres-asset-tracker/*
#
#   cd /home/ssm-user/asset-mgt/asset-mgt-be/docker
#   docker-compose -f docker-compose.aws.sre.yml build           # no secrets needed
#   cd /home/ssm-user/asset-mgt
#   source asset-mgt-be/docker/loadsecrets-sre.sh                # secrets for up only
#   cd asset-mgt-be/docker
#   docker-compose -f docker-compose.aws.sre.yml up -d
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

export SRE_ASST_TRACKER_BACKEND_JWT_SECRET
SRE_ASST_TRACKER_BACKEND_JWT_SECRET="$(ssm_get "/sre-backend-asset-tracker/jwt_secret")"

export SRE_ASST_TRACKER_BACKEND_COOKIE_SECURE
SRE_ASST_TRACKER_BACKEND_COOKIE_SECURE="$(ssm_get "/sre-backend-asset-tracker/cookie_secure")"

export SRE_ASST_TRACKER_BACKEND_CORS_ORIGIN
SRE_ASST_TRACKER_BACKEND_CORS_ORIGIN="$(ssm_get "/sre-backend-asset-tracker/cors_origin")"

export SRE_ASST_TRACKER_BACKEND_DATABASE_URL
SRE_ASST_TRACKER_BACKEND_DATABASE_URL="$(ssm_get "/sre-backend-asset-tracker/database_url")"

export SRE_ASST_TRACKER_BACKEND_FRONTEND_URL
SRE_ASST_TRACKER_BACKEND_FRONTEND_URL="$(ssm_get "/sre-backend-asset-tracker/frontend_url")"

export SRE_ASST_TRACKER_BACKEND_NODE_ENV
SRE_ASST_TRACKER_BACKEND_NODE_ENV="$(ssm_get "/sre-backend-asset-tracker/node_env")"

# ── Google OAuth ──────────────────────────────────────────────────────────────

export SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID
SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID="$(ssm_get "/sre-backend-asset-tracker/google_client_id")"

export SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET
SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET="$(ssm_get "/sre-backend-asset-tracker/google_client_secret")"

export SRE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI
SRE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI="$(ssm_get "/sre-backend-asset-tracker/google_oauth_redirect_uri")"

# ── SMTP ──────────────────────────────────────────────────────────────────────

export SRE_ASST_TRACKER_BACKEND_SMTP_FROM
SRE_ASST_TRACKER_BACKEND_SMTP_FROM="$(ssm_get "/sre-backend-asset-tracker/smtp_from")"

export SRE_ASST_TRACKER_BACKEND_SMTP_HOST
SRE_ASST_TRACKER_BACKEND_SMTP_HOST="$(ssm_get "/sre-backend-asset-tracker/smtp_host")"

export SRE_ASST_TRACKER_BACKEND_SMTP_PASS
SRE_ASST_TRACKER_BACKEND_SMTP_PASS="$(ssm_get "/sre-backend-asset-tracker/smtp_pass")"

export SRE_ASST_TRACKER_BACKEND_SMTP_PORT
SRE_ASST_TRACKER_BACKEND_SMTP_PORT="$(ssm_get "/sre-backend-asset-tracker/smtp_port")"

export SRE_ASST_TRACKER_BACKEND_SMTP_USER
SRE_ASST_TRACKER_BACKEND_SMTP_USER="$(ssm_get "/sre-backend-asset-tracker/smtp_user")"

# ── Frontend ──────────────────────────────────────────────────────────────────

export SRE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL
SRE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL="$(ssm_get "/sre-frontend-asset-tracker/vite_api_base_url")"

# ── Postgres ──────────────────────────────────────────────────────────────────

export SRE_ASST_TRACKER_POSTGRES_DB
SRE_ASST_TRACKER_POSTGRES_DB="$(ssm_get "/sre-postgres-asset-tracker/postgres_db")"

export SRE_ASST_TRACKER_POSTGRES_HOST
SRE_ASST_TRACKER_POSTGRES_HOST="$(ssm_get "/sre-postgres-asset-tracker/postgres_host")"

export SRE_ASST_TRACKER_POSTGRES_PASSWORD
SRE_ASST_TRACKER_POSTGRES_PASSWORD="$(ssm_get "/sre-postgres-asset-tracker/postgres_password")"

export SRE_ASST_TRACKER_POSTGRES_PORT
SRE_ASST_TRACKER_POSTGRES_PORT="$(ssm_get "/sre-postgres-asset-tracker/postgres_port")"

export SRE_ASST_TRACKER_POSTGRES_USER
SRE_ASST_TRACKER_POSTGRES_USER="$(ssm_get "/sre-postgres-asset-tracker/postgres_user")"

# ── Verification (secrets masked) ─────────────────────────────────────────────

echo ""
echo "All SRE secrets loaded successfully (SRE_ASST_TRACKER_*)!"
echo ""
echo "Loaded variables:"
echo "  SRE_ASST_TRACKER_BACKEND_JWT_SECRET           = ***"
echo "  SRE_ASST_TRACKER_BACKEND_COOKIE_SECURE        = ${SRE_ASST_TRACKER_BACKEND_COOKIE_SECURE}"
echo "  SRE_ASST_TRACKER_BACKEND_CORS_ORIGIN          = ${SRE_ASST_TRACKER_BACKEND_CORS_ORIGIN}"
echo "  SRE_ASST_TRACKER_BACKEND_DATABASE_URL         = postgresql://***@***"
echo "  SRE_ASST_TRACKER_BACKEND_FRONTEND_URL         = ${SRE_ASST_TRACKER_BACKEND_FRONTEND_URL}"
echo "  SRE_ASST_TRACKER_BACKEND_NODE_ENV             = ${SRE_ASST_TRACKER_BACKEND_NODE_ENV}"
echo "  SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_ID     = ***"
echo "  SRE_ASST_TRACKER_BACKEND_GOOGLE_CLIENT_SECRET = ***"
echo "  SRE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI = ${SRE_ASST_TRACKER_BACKEND_GOOGLE_OAUTH_REDIRECT_URI}"
echo "  SRE_ASST_TRACKER_BACKEND_SMTP_FROM            = ${SRE_ASST_TRACKER_BACKEND_SMTP_FROM}"
echo "  SRE_ASST_TRACKER_BACKEND_SMTP_HOST            = ${SRE_ASST_TRACKER_BACKEND_SMTP_HOST}"
echo "  SRE_ASST_TRACKER_BACKEND_SMTP_PASS            = ***"
echo "  SRE_ASST_TRACKER_BACKEND_SMTP_PORT            = ${SRE_ASST_TRACKER_BACKEND_SMTP_PORT}"
echo "  SRE_ASST_TRACKER_BACKEND_SMTP_USER            = ${SRE_ASST_TRACKER_BACKEND_SMTP_USER}"
echo "  SRE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL   = ${SRE_ASST_TRACKER_FRONTEND_VITE_API_BASE_URL}"
echo "  SRE_ASST_TRACKER_POSTGRES_DB                  = ${SRE_ASST_TRACKER_POSTGRES_DB}"
echo "  SRE_ASST_TRACKER_POSTGRES_HOST                = ${SRE_ASST_TRACKER_POSTGRES_HOST}"
echo "  SRE_ASST_TRACKER_POSTGRES_PASSWORD            = ***"
echo "  SRE_ASST_TRACKER_POSTGRES_PORT                = ${SRE_ASST_TRACKER_POSTGRES_PORT}"
echo "  SRE_ASST_TRACKER_POSTGRES_USER                = ${SRE_ASST_TRACKER_POSTGRES_USER}"
