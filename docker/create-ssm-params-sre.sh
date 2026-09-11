#!/bin/bash
# ==============================================================================
# Create all SRE Asset Tracker SSM parameters (interactive)
# ------------------------------------------------------------------------------
# Region : us-east-2
# Type   : SecureString
# Paths  : /sre-backend-asset-tracker/*
#          /sre-frontend-asset-tracker/*
#          /sre-postgres-asset-tracker/*
#
# No secrets are hardcoded. The script prompts for sensitive values at runtime.
# SSO params are created as PENDING so deploy can proceed; replace later in
# Parameter Store console, then recreate containers when ready.
#
# Usage on EC2:
#   chmod +x create-ssm-params-sre.sh
#   ./create-ssm-params-sre.sh
#
# Optional:
#   OVERWRITE=true ./create-ssm-params-sre.sh   # update if param already exists
#   DRY_RUN=true ./create-ssm-params-sre.sh     # print actions only
# ==============================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"
OVERWRITE="${OVERWRITE:-false}"
DRY_RUN="${DRY_RUN:-false}"
SSO_PLACEHOLDER="PENDING"

# ── helpers ───────────────────────────────────────────────────────────────────

prompt() {
  # prompt "Label" "default" -> sets REPLY
  local label="$1"
  local default="${2:-}"
  if [[ -n "${default}" ]]; then
    read -r -p "${label} [${default}]: " REPLY
    REPLY="${REPLY:-${default}}"
  else
    read -r -p "${label}: " REPLY
  fi
}

prompt_secret() {
  # prompt_secret "Label" -> sets REPLY (hidden). Empty allowed if $2=allow_empty
  local label="$1"
  local allow_empty="${2:-}"
  while true; do
    read -r -s -p "${label}: " REPLY
    echo ""
    if [[ -n "${REPLY}" || "${allow_empty}" == "allow_empty" ]]; then
      break
    fi
    echo "  (required — cannot be empty)"
  done
}

prompt_secret_confirm() {
  local label="$1"
  local a b
  while true; do
    read -r -s -p "${label}: " a
    echo ""
    read -r -s -p "${label} (again): " b
    echo ""
    if [[ -z "${a}" ]]; then
      echo "  (required — cannot be empty)"
      continue
    fi
    if [[ "${a}" != "${b}" ]]; then
      echo "  (values do not match — try again)"
      continue
    fi
    REPLY="${a}"
    break
  done
}

gen_secret() {
  openssl rand -base64 48 | tr -d '/+=' | head -c 64
}

urlencode() {
  python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1" 2>/dev/null \
    || echo "$1"
}

put_param() {
  local name="$1"
  local value="$2"
  local desc="${3:-}"

  if [[ -z "${value}" ]]; then
    echo "ERROR: empty value for ${name}" >&2
    exit 1
  fi

  local args=(
    ssm put-parameter
    --region "${AWS_REGION}"
    --name "${name}"
    --type "SecureString"
    --value "${value}"
  )

  if [[ -n "${desc}" ]]; then
    args+=(--description "${desc}")
  fi

  if [[ "${OVERWRITE}" == "true" ]]; then
    args+=(--overwrite)
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    local shown="${value}"
    if [[ "${#shown}" -gt 24 ]]; then
      shown="${shown:0:8}…(hidden)"
    fi
    echo "[DRY_RUN] put SecureString ${name} = ${shown}"
    return
  fi

  echo "  + ${name}"
  aws "${args[@]}" >/dev/null
}

# ── intro ─────────────────────────────────────────────────────────────────────

echo "============================================================"
echo " SRE Asset Tracker — create SSM parameters"
echo " Region : ${AWS_REGION}"
echo " Type   : SecureString"
echo " Overwrite : ${OVERWRITE}"
echo " Dry-run   : ${DRY_RUN}"
echo "============================================================"
echo ""
echo "Paths (NEW — does not touch prod /backend-asset-tracker/*):"
echo "  /sre-backend-asset-tracker/..."
echo "  /sre-frontend-asset-tracker/..."
echo "  /sre-postgres-asset-tracker/..."
echo ""
echo "SSO values will be set to '${SSO_PLACEHOLDER}' for now."
echo "Press Enter to accept defaults shown in [brackets]."
echo ""

# ── non-secret prompts ────────────────────────────────────────────────────────

prompt "CORS origin" "https://assets.sre.mindstix.com"
CORS_ORIGIN="${REPLY}"

prompt "Frontend URL" "https://assets.sre.mindstix.com"
FRONTEND_URL="${REPLY}"

prompt "NODE_ENV" "production"
NODE_ENV="${REPLY}"

prompt "COOKIE_SECURE" "true"
COOKIE_SECURE="${REPLY}"

prompt "Vite API base URL" "/api"
VITE_API_BASE_URL="${REPLY}"

prompt "Postgres host (same RDS endpoint as prod)" ""
POSTGRES_HOST="${REPLY}"
if [[ -z "${POSTGRES_HOST}" ]]; then
  echo "ERROR: postgres host is required" >&2
  exit 1
fi

prompt "Postgres port" "5432"
POSTGRES_PORT="${REPLY}"

prompt "Postgres DB name (NEW database on same RDS)" "asset_management_sre_db"
POSTGRES_DB="${REPLY}"

prompt "Postgres user (NEW user)" "asset_sre_user"
POSTGRES_USER="${REPLY}"

prompt "SMTP host" ""
SMTP_HOST="${REPLY}"

prompt "SMTP port" "587"
SMTP_PORT="${REPLY}"

prompt "SMTP user" ""
SMTP_USER="${REPLY}"

prompt "SMTP from (display)" "Asset Management SRE <noreply@mindstix.com>"
SMTP_FROM="${REPLY}"

# ── secret prompts ────────────────────────────────────────────────────────────

echo ""
echo "--- Secrets (input hidden; leave JWT blank to auto-generate) ---"

prompt_secret "JWT secret (Enter = auto-generate)" "allow_empty"
JWT_SECRET="${REPLY}"
if [[ -z "${JWT_SECRET}" ]]; then
  JWT_SECRET="$(gen_secret)"
  echo "  (auto-generated JWT secret)"
fi

prompt_secret_confirm "Postgres password (NEW complex password)"
POSTGRES_PASSWORD="${REPLY}"

prompt_secret "SMTP password" "allow_empty"
SMTP_PASS="${REPLY}"
if [[ -z "${SMTP_PASS}" ]]; then
  SMTP_PASS="${SSO_PLACEHOLDER}"
  echo "  (SMTP password set to ${SSO_PLACEHOLDER} — update later if needed)"
fi

ENC_PASS="$(urlencode "${POSTGRES_PASSWORD}")"
DATABASE_URL="postgresql://${POSTGRES_USER}:${ENC_PASS}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public&sslmode=require"

# SSO placeholders (replace later in console)
GOOGLE_CLIENT_ID="${SSO_PLACEHOLDER}"
GOOGLE_CLIENT_SECRET="${SSO_PLACEHOLDER}"
GOOGLE_OAUTH_REDIRECT_URI="https://assets.sre.mindstix.com/api/auth/google/callback"

# ── confirm ───────────────────────────────────────────────────────────────────

echo ""
echo "------------------------------------------------------------"
echo " Will create these parameters in ${AWS_REGION}:"
echo "------------------------------------------------------------"
echo "  cors_origin / frontend_url = ${CORS_ORIGIN}"
echo "  node_env / cookie_secure   = ${NODE_ENV} / ${COOKIE_SECURE}"
echo "  vite_api_base_url          = ${VITE_API_BASE_URL}"
echo "  postgres host/db/user/port = ${POSTGRES_HOST} / ${POSTGRES_DB} / ${POSTGRES_USER} / ${POSTGRES_PORT}"
echo "  postgres password          = ***"
echo "  database_url               = postgresql://${POSTGRES_USER}:***@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public&sslmode=require"
echo "  jwt_secret                 = ***"
echo "  smtp                       = ${SMTP_HOST}:${SMTP_PORT} user=${SMTP_USER}"
echo "  google_*                   = ${SSO_PLACEHOLDER} (redirect URI set to real URL)"
echo "------------------------------------------------------------"
read -r -p "Proceed? [y/N]: " CONFIRM
if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Creating parameters..."

# ── backend ───────────────────────────────────────────────────────────────────

put_param "/sre-backend-asset-tracker/jwt_secret"    "${JWT_SECRET}"    "SRE Asset Tracker JWT secret"
put_param "/sre-backend-asset-tracker/cookie_secure" "${COOKIE_SECURE}" "SRE Asset Tracker cookie Secure flag"
put_param "/sre-backend-asset-tracker/cors_origin"   "${CORS_ORIGIN}"   "SRE Asset Tracker CORS origin"
put_param "/sre-backend-asset-tracker/database_url"  "${DATABASE_URL}"  "SRE Asset Tracker DATABASE_URL"
put_param "/sre-backend-asset-tracker/frontend_url"  "${FRONTEND_URL}"  "SRE Asset Tracker frontend URL"
put_param "/sre-backend-asset-tracker/node_env"      "${NODE_ENV}"      "SRE Asset Tracker NODE_ENV"

put_param "/sre-backend-asset-tracker/smtp_from" "${SMTP_FROM}" "SRE Asset Tracker SMTP from"
put_param "/sre-backend-asset-tracker/smtp_host" "${SMTP_HOST:-${SSO_PLACEHOLDER}}" "SRE Asset Tracker SMTP host"
put_param "/sre-backend-asset-tracker/smtp_pass" "${SMTP_PASS}" "SRE Asset Tracker SMTP password"
put_param "/sre-backend-asset-tracker/smtp_port" "${SMTP_PORT}" "SRE Asset Tracker SMTP port"
put_param "/sre-backend-asset-tracker/smtp_user" "${SMTP_USER:-${SSO_PLACEHOLDER}}" "SRE Asset Tracker SMTP user"

put_param "/sre-backend-asset-tracker/google_client_id"         "${GOOGLE_CLIENT_ID}"         "SRE Google OAuth client id (PENDING until provided)"
put_param "/sre-backend-asset-tracker/google_client_secret"     "${GOOGLE_CLIENT_SECRET}"     "SRE Google OAuth client secret (PENDING until provided)"
put_param "/sre-backend-asset-tracker/google_oauth_redirect_uri" "${GOOGLE_OAUTH_REDIRECT_URI}" "SRE Google OAuth redirect URI"

# ── frontend ──────────────────────────────────────────────────────────────────

put_param "/sre-frontend-asset-tracker/vite_api_base_url" "${VITE_API_BASE_URL}" "SRE Asset Tracker Vite API base"

# ── postgres ──────────────────────────────────────────────────────────────────

put_param "/sre-postgres-asset-tracker/postgres_db"       "${POSTGRES_DB}"       "SRE Asset Tracker Postgres DB name"
put_param "/sre-postgres-asset-tracker/postgres_host"     "${POSTGRES_HOST}"     "SRE Asset Tracker Postgres host"
put_param "/sre-postgres-asset-tracker/postgres_password" "${POSTGRES_PASSWORD}" "SRE Asset Tracker Postgres password"
put_param "/sre-postgres-asset-tracker/postgres_port"     "${POSTGRES_PORT}"     "SRE Asset Tracker Postgres port"
put_param "/sre-postgres-asset-tracker/postgres_user"     "${POSTGRES_USER}"     "SRE Asset Tracker Postgres user"

echo ""
echo "Done. Created 20 SecureString parameters in ${AWS_REGION}."
echo ""
echo "Next:"
echo "  1. Create Postgres role + database on RDS to match the values you entered"
echo "  2. source ./loadsecrets-sre.sh"
echo "  3. docker-compose -f docker-compose.aws.sre.yml up -d --build"
echo "  4. Later: replace google_* PENDING values in console, then recreate backend"
echo ""
echo "Console: https://us-east-2.console.aws.amazon.com/systems-manager/parameters/?region=us-east-2&tab=Table"
