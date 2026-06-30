#!/bin/bash
# Run once from the marketplace-api repo root. Creates an empty
# src/assets/.gitkeep in every backend service that doesn't already
# have an assets directory, so the shared Dockerfile.service's
# unconditional `COPY ${SERVICE_DIR}/src/assets ./assets` line never
# fails the build again. orders already has real font files there —
# this script will skip it (or any service that already has src/assets).

set -e

SERVICES=(
  api-gateway
  audit
  authentication
  cart
  categories
  color
  escrow
  inventory
  notification
  organization
  payment
  products
  review
  size
  stores
  subscription
  users
  view
)

for svc in "${SERVICES[@]}"; do
  dir="backend/${svc}/src/assets"
  if [ -d "$dir" ] && [ "$(ls -A "$dir" 2>/dev/null)" ]; then
    echo "skip  ${svc}: assets/ already exists with content"
    continue
  fi
  mkdir -p "$dir"
  touch "$dir/.gitkeep"
  echo "added ${svc}: ${dir}/.gitkeep"
done

echo ""
echo "Done. Review with: git status"
echo "Then: git add backend/*/src/assets/.gitkeep && git commit -m 'chore: add empty assets dirs so shared Dockerfile COPY never fails'"