#!/usr/bin/env bash
# Build the backend prod image and push it to ECR. Usage: deploy/ecr-push.sh [tag]
# Tags are immutable in ECR, so the default is the short git SHA.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/_tf.sh

TAG="${1:-$(git rev-parse --short HEAD)}"
REPO="$(tfout ecr_repository_url)"

aws ecr get-login-password | docker login --username AWS --password-stdin "${REPO%%/*}"
# Lightsail runs on x86_64.
docker buildx build --platform linux/amd64 -f backend/docker/app-prod/Dockerfile \
  -t "$REPO:$TAG" --push backend
echo "Pushed $REPO:$TAG"
