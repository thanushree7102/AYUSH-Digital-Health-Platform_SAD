#!/usr/bin/env bash
# Build, tag and push all images to Docker Hub.   Usage: DOCKERHUB_USER=yourname TAG=v1 ./scripts/dockerhub-push.sh
set -euo pipefail
: "${DOCKERHUB_USER:?set DOCKERHUB_USER}"; TAG="${TAG:-latest}"
docker login
export DOCKERHUB_USER TAG AYUSH_SECRET=x MYSQL_PASSWORD=x MYSQL_ROOT_PASSWORD=x
docker compose build
for s in frontend api ml; do docker push "$DOCKERHUB_USER/ayush-$s:$TAG"; done
echo "Pushed. On any machine: docker pull $DOCKERHUB_USER/ayush-api:$TAG"
