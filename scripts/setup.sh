#!/usr/bin/env bash
set -euo pipefail

# One-command setup: create root .env from .env.example (if missing) and
# optionally derive an app's .env.local. Safe to run from any directory.
#
# Usage:
#   ./scripts/setup.sh                  # create/check root .env only
#   ./scripts/setup.sh ceevie           # + derive apps/ceevie/.env.local
#   ./scripts/setup.sh ceevie <ref>     # + explicit supabase project ref

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

APP_NAME="${1:-}"
PROJECT_REF="${2:-}"

echo "==> Repo root: ${REPO_ROOT}"

if [ ! -f "${REPO_ROOT}/.env.example" ]; then
  echo "Error: missing ${REPO_ROOT}/.env.example"
  exit 1
fi

if [ -f "${REPO_ROOT}/.env" ]; then
  echo "==> Root .env already exists — leaving it untouched"
else
  cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"
  echo "==> Created ${REPO_ROOT}/.env from .env.example"
  echo ""
  echo "    Edit that file ONCE with your account secrets:"
  echo "      STRIPE_SECRET_KEY, ANTHROPIC_API_KEY,"
  echo "      SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_ID"
  echo ""
  echo "    (Optional: VERCEL_TOKEN for deploy/env sync)"
fi

if [ -z "$APP_NAME" ]; then
  echo ""
  echo "Next: fill in root .env, then run:"
  echo "  node scripts/fill-env.js <app-name> <supabase-project-ref>"
  exit 0
fi

if [ ! -d "${REPO_ROOT}/apps/${APP_NAME}" ]; then
  echo "Error: apps/${APP_NAME} does not exist"
  exit 1
fi

# shellcheck disable=SC1091
set -a
. "${REPO_ROOT}/.env"
set +a

MISSING=()
for key in STRIPE_SECRET_KEY ANTHROPIC_API_KEY; do
  if [ -z "${!key:-}" ]; then MISSING+=("$key"); fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "Fill these in ${REPO_ROOT}/.env before deriving app env:"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
fi

if [ -z "$PROJECT_REF" ]; then
  PROJECT_REF="$(node -e "
    const { readProjectRef } = require('./scripts/lib/derive-app-env');
    const ref = readProjectRef('${APP_NAME}');
    if (ref) process.stdout.write(ref);
  " 2>/dev/null || true)"
fi

if [ -z "$PROJECT_REF" ]; then
  echo ""
  echo "Pass the Supabase project ref:"
  echo "  ./scripts/setup.sh ${APP_NAME} <supabase-project-ref>"
  exit 1
fi

echo "==> Deriving apps/${APP_NAME}/.env.local"
node scripts/fill-env.js "${APP_NAME}" "${PROJECT_REF}"

echo ""
if [ -t 0 ]; then
  read -r -p "Set up Google sign-in on Supabase now? [y/N] " SETUP_GOOGLE || true
  if [[ "${SETUP_GOOGLE:-}" =~ ^[Yy]$ ]]; then
    node scripts/setup-google-auth.js "${APP_NAME}" "${PROJECT_REF}"
  else
    echo "    Skip for now — run later: npm run setup:google-auth -- ${APP_NAME} ${PROJECT_REF}"
  fi
else
  echo "    Google auth: run  npm run setup:google-auth -- ${APP_NAME} ${PROJECT_REF}"
fi

echo ""
echo "==> Ready: cd apps/${APP_NAME} && npm run dev"
