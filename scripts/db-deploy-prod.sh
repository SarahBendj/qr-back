#!/bin/sh
set -eu

# Production DB deploy for Railway / CI (POSIX sh — no bash required).
# Set FORCE_DB_RESET=1 once to wipe failed migration state and reapply everything.

case "${FORCE_DB_RESET:-}" in
  1|true)
    echo "[db-deploy] FORCE_DB_RESET=1 — reset database and reapply all migrations (data loss)."
    npx prisma migrate reset --force
    ;;
  *)
    echo "[db-deploy] prisma migrate deploy"
    if ! npx prisma migrate deploy; then
      echo ""
      echo "[db-deploy] FAILED (e.g. P3009 failed migration on Railway)."
      echo "[db-deploy] Fix: in Railway variables set FORCE_DB_RESET=1, redeploy once, then remove it."
      exit 1
    fi
    ;;
esac

echo "[db-deploy] seed plans"
npm run db:seed
echo "[db-deploy] OK"
