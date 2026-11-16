#!/usr/bin/env bash
# Create a Lightsail deployment for an image already pushed to ECR.
# Usage: deploy/lightsail-deploy.sh [tag]      (tag defaults to the short git SHA)
#
# Every input can be passed as an env var (CI does this). Anything unset is read from
# `terraform output` (local use). Needs aws, jq. The backend loads its secrets from Secrets Manager at startup.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

if [ -z "${IMAGE:-}" ]; then
  TAG="${1:-$(git rev-parse --short HEAD)}"
  IMAGE="$(tfout ecr_repository_url):$TAG"
fi
APP_ENV="${APP_ENV:-dev}"
need LIGHTSAIL_SERVICE lightsail_service
need DB_HOST db_host
need DB_NAME db_name
need WEB_URL web_url
need DB_SECRET_ARN db_secret_arn
need APP_SECRET_ARN backend_secret_arn
need RUNTIME_ACCESS_KEY_ID runtime_access_key_id
need RUNTIME_SECRET_ACCESS_KEY runtime_secret_access_key

# The containers JSON contains the runtime key: keep it in a private temp file, not in argv.
CONTAINERS_FILE="$(mktemp)"
trap 'rm -f "$CONTAINERS_FILE"' EXIT
chmod 600 "$CONTAINERS_FILE"

jq -n \
  --arg image "$IMAGE" \
  --arg app_env "$APP_ENV" \
  --arg db_host "$DB_HOST" \
  --arg db_name "$DB_NAME" \
  --arg web_url "$WEB_URL" \
  --arg region "$AWS_REGION" \
  --arg key_id "$RUNTIME_ACCESS_KEY_ID" \
  --arg key_secret "$RUNTIME_SECRET_ACCESS_KEY" \
  --arg db_secret_arn "$DB_SECRET_ARN" \
  --arg app_secret_arn "$APP_SECRET_ARN" \
  '{
    backend: {
      image: $image,
      ports: { "4000": "HTTP" },
      environment: {
        APP_ENV: $app_env,
        PORT: "4000",
        DB_HOST: $db_host,
        DB_PORT: "5432",
        DB_NAME: $db_name,
        DB_SSLMODE: "require",
        CORS_ALLOWED_ORIGINS: $web_url,
        CLERK_AUTHORIZED_PARTIES: $web_url,
        AWS_REGION: $region,
        AWS_ACCESS_KEY_ID: $key_id,
        AWS_SECRET_ACCESS_KEY: $key_secret,
        AWS_SECRET_DB_ARN: $db_secret_arn,
        AWS_SECRET_APP_ARN: $app_secret_arn
      }
    }
  }' > "$CONTAINERS_FILE"

PUBLIC_ENDPOINT='{
  "containerName": "backend",
  "containerPort": 4000,
  "healthCheck": {
    "path": "/healthz",
    "successCodes": "200",
    "healthyThreshold": 2,
    "unhealthyThreshold": 3,
    "timeoutSeconds": 5,
    "intervalSeconds": 10
  }
}'

aws lightsail create-container-service-deployment \
  --service-name "$LIGHTSAIL_SERVICE" \
  --containers "file://$CONTAINERS_FILE" \
  --public-endpoint "$PUBLIC_ENDPOINT" >/dev/null

echo "Deployed $IMAGE to $LIGHTSAIL_SERVICE"
