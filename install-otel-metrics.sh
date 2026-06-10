
!/usr/bin/env bash
set -euo pipefail

PACKAGE="@opentelemetry/exporter-metrics-otlp-http"

SERVICES=(
  authentication
  organization
  subscription
  stores
  products
  inventory
  cart
  orders
  payment
  notification
  review
  audit
  api-gateway
)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"

echo "=============================="
echo " Installing: ${PACKAGE}"
echo " Backend dir: ${BACKEND_DIR}"
echo "=============================="
echo ""

SUCCESS=()
FAILED=()

for service in "${SERVICES[@]}"; do
  SERVICE_DIR="${BACKEND_DIR}/${service}"

  if [ ! -d "${SERVICE_DIR}" ]; then
    echo "[SKIP] ${service} — directory not found: ${SERVICE_DIR}"
    FAILED+=("${service} (not found)")
    continue
  fi

  if [ ! -f "${SERVICE_DIR}/package.json" ]; then
    echo "[SKIP] ${service} — no package.json"
    FAILED+=("${service} (no package.json)")
    continue
  fi

  echo "[INSTALL] ${service}..."
  if (cd "${SERVICE_DIR}" && npm install "${PACKAGE}" --save 2>&1); then
    echo "[OK] ${service}"
    SUCCESS+=("${service}")
  else
    echo "[FAIL] ${service}"
    FAILED+=("${service}")
  fi

  echo ""
done

echo "=============================="
echo " SUMMARY"
echo "=============================="
echo ""
echo "Succeeded (${#SUCCESS[@]}):"
for s in "${SUCCESS[@]}"; do echo "  ✓ ${s}"; done

echo ""
echo "Failed/Skipped (${#FAILED[@]}):"
for f in "${FAILED[@]}"; do echo "  ✗ ${f}"; done
echo ""