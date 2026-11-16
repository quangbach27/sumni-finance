#!/usr/bin/env bash
# Build the SPA against the dev API and publish it to S3 + CloudFront.
# Requires VITE_CLERK_PUBLISHABLE_KEY in the environment.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

: "${VITE_CLERK_PUBLISHABLE_KEY:?set VITE_CLERK_PUBLISHABLE_KEY}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-$(tfout api_url)}"
BUCKET="$(tfout web_bucket)"

(cd web && npm ci && npm run build)

# Hashed assets are immutable; index.html must always be revalidated.
aws s3 sync web/dist "s3://$BUCKET" --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp web/dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --content-type "text/html"
aws cloudfront create-invalidation --distribution-id "$(tfout web_distribution_id)" --paths "/*" >/dev/null
echo "Deployed: $(tfout web_url)"
