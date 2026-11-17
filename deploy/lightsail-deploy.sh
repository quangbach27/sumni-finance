#!/usr/bin/env bash
# Create a Lightsail deployment for an image in the Lightsail service registry, then wait for the result.
# The image is $IMAGE if set (the Deploy Backend workflow pushes it from GHCR first), otherwise the
# newest one labelled with the tag (pushed by deploy/image-push.sh).
# Usage: deploy/lightsail-deploy.sh [tag]      (tag defaults to the short git SHA)
#
# Every input can be passed as an env var (CI does this). Anything unset is read from
# `terraform output` (local use), except RUNTIME_ACCESS_KEY_ID / RUNTIME_SECRET_ACCESS_KEY, which
# must always be set. Needs aws, jq. The backend loads its secrets from Secrets Manager at startup.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

TAG="${TAG:-${1:-$(git rev-parse --short HEAD)}}"
APP_ENV="${APP_ENV:-dev}"
need LIGHTSAIL_SERVICE lightsail_service
need DB_HOST db_host
need DB_NAME db_name
need WEB_URL web_url
need DB_SECRET_ARN db_secret_arn
need APP_SECRET_ARN backend_secret_arn
# The runtime key is not in Terraform: it must be passed in (CI: GitHub secrets).
need RUNTIME_ACCESS_KEY_ID
need RUNTIME_SECRET_ACCESS_KEY

# CI pushes the image itself and passes its Lightsail name (":<service>.<label>.<n>") in IMAGE.
# Locally (make image-push), look up the newest image registered with the label = tag.
if [ -z "${IMAGE:-}" ]; then
  IMAGE="$(aws lightsail get-container-images --service-name "$LIGHTSAIL_SERVICE" --output json |
    jq -r --arg prefix ":$LIGHTSAIL_SERVICE.$TAG." \
      '[.containerImages[] | select(.image | startswith($prefix))] | sort_by(.createdAt) | last | .image // empty')"
  if [ -z "$IMAGE" ]; then
    echo "error: no image with label '$TAG' in the registry of $LIGHTSAIL_SERVICE." >&2
    echo "Push it first (make image-push TAG=$TAG), or run the Deploy Backend workflow, which pushes it from GHCR." >&2
    exit 1
  fi
fi

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

VERSION="$(aws lightsail create-container-service-deployment \
  --service-name "$LIGHTSAIL_SERVICE" \
  --containers "file://$CONTAINERS_FILE" \
  --public-endpoint "$PUBLIC_ENDPOINT" \
  --query 'containerService.nextDeployment.version' --output text)"

echo "Created deployment $VERSION of $IMAGE on $LIGHTSAIL_SERVICE, waiting for it to become active..."

# Lightsail gives up on its own after a few failed starts; the timeout is only a safety net.
STATE="ACTIVATING"
for _ in $(seq 1 60); do
  STATE="$(aws lightsail get-container-service-deployments --service-name "$LIGHTSAIL_SERVICE" \
    --query "deployments[?version==\`$VERSION\`].state | [0]" --output text)"
  [ "$STATE" = "ACTIVATING" ] || break
  sleep 10
done

if [ "$STATE" != "ACTIVE" ]; then
  echo "error: deployment $VERSION is $STATE. Last container log lines:" >&2
  aws lightsail get-container-log --service-name "$LIGHTSAIL_SERVICE" --container-name backend \
    --output json | jq -r '.logEvents[-30:][].message' >&2 || true
  exit 1
fi

echo "Deployed $IMAGE to $LIGHTSAIL_SERVICE (deployment $VERSION)"
