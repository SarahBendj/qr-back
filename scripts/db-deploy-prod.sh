#!/usr/bin/env bash
set -euo pipefail

# Production DB deploy for Railway / CI.
# Set FORCE_DB_RESET=1 once to wipe failed migration state and reapply everything.

if [[ "${FORCE_DB_RESET:-}" == "1" || "${FORCE_DB_RESET:-}" == "true" ]]; then
  echo "[db-deploy] FORCE_DB_RESET=1 — reset database and reapply all migrations (data loss)."
  npx prisma migrate reset --force
else
  echo "[db-deploy] prisma migrate deploy"
  if ! npx prisma migrate deploy; then
    echo ""
    echo "[db-deploy] FAILED (e.g. P3009 failed migration on Railway)."
    echo "[db-deploy] Fix: in Railway variables set FORCE_DB_RESET=1, redeploy once, then remove it."
    exit 1
  fi
fi

echo "[db-deploy] seed plans"
npm run db:seed
echo "[db-deploy] OK"
