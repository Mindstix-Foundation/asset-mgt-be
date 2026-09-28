#!/bin/bash
# Create all SRE SSM params with dummy/PENDING values (us-east-2, SecureString).
# Safe to run first — replace real secrets later with update-ssm-params-sre.sh
#
#   chmod +x create-ssm-params-sre-dummy.sh
#   ./create-ssm-params-sre-dummy.sh

set -euo pipefail

REGION="us-east-2"
DUMMY="PENDING"

aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/jwt_secret" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/cookie_secure" --type SecureString --value "true" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/cors_origin" --type SecureString --value "https://assets.sre.mindstix.com" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/database_url" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/frontend_url" --type SecureString --value "https://assets.sre.mindstix.com" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/node_env" --type SecureString --value "production" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/smtp_from" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/smtp_host" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/smtp_pass" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/smtp_port" --type SecureString --value "587" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/smtp_user" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/google_client_id" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/google_client_secret" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-backend-asset-tracker/google_oauth_redirect_uri" --type SecureString --value "https://assets.sre.mindstix.com/api/auth/google/callback" --overwrite

aws ssm put-parameter --region "$REGION" --name "/sre-frontend-asset-tracker/vite_api_base_url" --type SecureString --value "/api" --overwrite

aws ssm put-parameter --region "$REGION" --name "/sre-postgres-asset-tracker/postgres_db" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-postgres-asset-tracker/postgres_host" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-postgres-asset-tracker/postgres_password" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-postgres-asset-tracker/postgres_port" --type SecureString --value "5432" --overwrite
aws ssm put-parameter --region "$REGION" --name "/sre-postgres-asset-tracker/postgres_user" --type SecureString --value "$DUMMY" --overwrite

echo "Done. Created/updated SRE params with dummy values in $REGION."
