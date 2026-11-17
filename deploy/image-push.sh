#!/usr/bin/env bash
# Build the backend prod image and push it to the Lightsail service registry.
# Usage: deploy/image-push.sh [tag]      (tag defaults to the short git SHA)
#
# The tag becomes the Lightsail image label, so deploy/lightsail-deploy.sh can find the image again.
# Local pushes go to Lightsail only; CI (Backend Commit Stage) also publishes to GHCR.
# Needs docker buildx and the lightsailctl plugin (brew install aws/tap/lightsailctl).
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

for bin in docker lightsailctl; do
  command -v "$bin" >/dev/null || { echo "error: $bin is required" >&2; exit 1; }
done

TAG="${1:-$(git rev-parse --short HEAD)}"
need LIGHTSAIL_SERVICE lightsail_service
LOCAL_IMAGE="sumni-finance-backend:$TAG"

# Lightsail runs on x86_64.
docker buildx build --platform linux/amd64 --load -f backend/docker/app-prod/Dockerfile \
  -t "$LOCAL_IMAGE" backend

aws lightsail push-container-image \
  --service-name "$LIGHTSAIL_SERVICE" --label "$TAG" --image "$LOCAL_IMAGE"
echo "Pushed $LOCAL_IMAGE to $LIGHTSAIL_SERVICE (label $TAG)"
