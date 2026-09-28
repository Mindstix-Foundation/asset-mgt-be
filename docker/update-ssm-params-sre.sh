#!/bin/bash
# Replace SRE SSM dummy values with real ones (us-east-2, SecureString).
# Run after create-ssm-params-sre-dummy.sh. Press Enter to skip a value (keep existing).
#
#   chmod +x update-ssm-params-sre.sh
#   ./update-ssm-params-sre.sh

set -euo pipefail

REGION="us-east-2"

update() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "skip  $name"
    return
  fi
  aws ssm put-parameter --region "$REGION" --name "$name" --type SecureString --value "$value" --overwrite
  echo "ok    $name"
}

echo "Enter new values (Enter = skip / leave unchanged)"
echo ""

read -r -p "jwt_secret: " V;           update "/sre-backend-asset-tracker/jwt_secret" "$V"
read -r -p "cookie_secure [true]: " V; update "/sre-backend-asset-tracker/cookie_secure" "${V:-}"
read -r -p "cors_origin: " V;          update "/sre-backend-asset-tracker/cors_origin" "$V"
read -r -p "database_url: " V;         update "/sre-backend-asset-tracker/database_url" "$V"
read -r -p "frontend_url: " V;         update "/sre-backend-asset-tracker/frontend_url" "$V"
read -r -p "node_env: " V;             update "/sre-backend-asset-tracker/node_env" "$V"
read -r -p "smtp_from: " V;            update "/sre-backend-asset-tracker/smtp_from" "$V"
read -r -p "smtp_host: " V;            update "/sre-backend-asset-tracker/smtp_host" "$V"
read -r -s -p "smtp_pass: " V; echo ""; update "/sre-backend-asset-tracker/smtp_pass" "$V"
read -r -p "smtp_port: " V;            update "/sre-backend-asset-tracker/smtp_port" "$V"
read -r -p "smtp_user: " V;            update "/sre-backend-asset-tracker/smtp_user" "$V"
read -r -p "google_client_id: " V;     update "/sre-backend-asset-tracker/google_client_id" "$V"
read -r -s -p "google_client_secret: " V; echo ""; update "/sre-backend-asset-tracker/google_client_secret" "$V"
read -r -p "google_oauth_redirect_uri: " V; update "/sre-backend-asset-tracker/google_oauth_redirect_uri" "$V"

read -r -p "vite_api_base_url: " V;    update "/sre-frontend-asset-tracker/vite_api_base_url" "$V"

read -r -p "postgres_db: " V;          update "/sre-postgres-asset-tracker/postgres_db" "$V"
read -r -p "postgres_host: " V;        update "/sre-postgres-asset-tracker/postgres_host" "$V"
read -r -s -p "postgres_password: " V; echo ""; update "/sre-postgres-asset-tracker/postgres_password" "$V"
read -r -p "postgres_port: " V;        update "/sre-postgres-asset-tracker/postgres_port" "$V"
read -r -p "postgres_user: " V;        update "/sre-postgres-asset-tracker/postgres_user" "$V"

echo ""
echo "Done."
