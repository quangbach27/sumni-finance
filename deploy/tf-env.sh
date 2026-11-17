#!/usr/bin/env bash
# Export the non-secret infra values (Terraform outputs) as env vars for the next GitHub Actions
# steps (written to $GITHUB_ENV). Needs AWS credentials that can read the state bucket, and terraform, jq.
# Locally: GITHUB_ENV=/dev/stdout deploy/tf-env.sh   (prints them; uses the already initialised backend)
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
  terraform -chdir="$TF_DIR" init -input=false -reconfigure \
    -backend-config="bucket=${PROJECT:-sumni-finance}-tfstate-$ACCOUNT_ID" >/dev/null
fi

OUTPUTS="$(terraform -chdir="$TF_DIR" output -json)"

# ENV_VAR:terraform_output
for pair in \
  LIGHTSAIL_SERVICE:lightsail_service \
  DB_HOST:db_host \
  DB_NAME:db_name \
  DB_SECRET_ARN:db_secret_arn \
  APP_SECRET_ARN:backend_secret_arn \
  WEB_URL:web_url \
  WEB_BUCKET:web_bucket \
  WEB_DISTRIBUTION_ID:web_distribution_id \
  VITE_API_BASE_URL:api_url; do
  var="${pair%%:*}"
  out="${pair#*:}"
  val="$(jq -r --arg o "$out" '.[$o].value // empty' <<<"$OUTPUTS")"
  if [ -z "$val" ]; then
    echo "error: terraform output '$out' is missing (run make tf-apply)" >&2
    exit 1
  fi
  echo "$var=$val" >> "${GITHUB_ENV:-/dev/stdout}"
done
