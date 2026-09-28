#!/bin/bash
# Create Core Google OAuth SSM params (us-east-2) if missing.
# Other /backend-asset-tracker/* keys should already exist from prod.
#
#   chmod +x create-ssm-params-core-google-dummy.sh
#   ./create-ssm-params-core-google-dummy.sh
# Then set real values in SSM console (or aws ssm put-parameter --overwrite).

set -euo pipefail

REGION="us-east-2"
DUMMY="PENDING"

aws ssm put-parameter --region "$REGION" --name "/backend-asset-tracker/google_client_id" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/backend-asset-tracker/google_client_secret" --type SecureString --value "$DUMMY" --overwrite
aws ssm put-parameter --region "$REGION" --name "/backend-asset-tracker/google_oauth_redirect_uri" --type SecureString --value "https://assets.mindstix.com/api/auth/google/callback" --overwrite

echo "Done. Created/updated Core Google OAuth params in $REGION."
echo "Replace google_client_id / google_client_secret with real values before deploy."
