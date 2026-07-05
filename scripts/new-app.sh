#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Pipeline entry point for spinning up a new app on this platform.
# Run: ./scripts/new-app.sh my-new-app
#
# Zero manual env filling: account secrets live ONCE in root .env
# (see .env.example). This script derives everything else and writes
# apps/<name>/.env.local for you.
#
# What this automates (the toil):
#   - Copying the template with placeholders replaced
#   - Creating a new Supabase project + applying schema.sql
#   - Creating Stripe product/price for the subscription
#   - Deriving apps/<name>/.env.local from root .env + the CLIs
#
# What this deliberately does NOT automate (the judgment):
#   - Whether to build this app at all (Stage 0 — talk to 10 people first)
#   - Pricing decisions, feature scope, prompt design
#   - Creating the PROD Stripe webhook endpoint (a live account write) —
#     opt in with WEBHOOK_URL=... (see below)
#   - The decision to go live (prod promotion is a manual, gated step)
# ============================================================

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "Usage: ./scripts/new-app.sh <app-name>"
  exit 1
fi

# Only letters/digits/dot/underscore/hyphen — same rule the Node scripts enforce.
if ! printf '%s' "$APP_NAME" | grep -Eq '^[A-Za-z0-9._-]+$'; then
  echo "Error: app name '$APP_NAME' has unsafe characters. Use [A-Za-z0-9._-] only."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

APP_DIR="apps/${APP_NAME}"
if [ -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR already exists. Pick a different name or remove it first."
  exit 1
fi

echo "==> Checking for root .env (single source of truth)"
if [ ! -f "${REPO_ROOT}/.env" ]; then
  echo "Missing ${REPO_ROOT}/.env — copy .env.example to .env and fill in account secrets first."
  exit 1
fi
# Load root secrets so SUPABASE_ACCESS_TOKEN / SUPABASE_ORG_ID are available to the CLI.
set -a
# shellcheck disable=SC1091
. "${REPO_ROOT}/.env"
set +a
: "${SUPABASE_ORG_ID:?Set SUPABASE_ORG_ID in root .env}"
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in root .env}"

echo "==> Checking for required CLIs"
command -v supabase >/dev/null 2>&1 || { echo "Missing supabase CLI. Install: npm i -g supabase"; exit 1; }
command -v stripe   >/dev/null 2>&1 || { echo "Missing stripe CLI. Install: https://stripe.com/docs/stripe-cli"; exit 1; }
command -v vercel   >/dev/null 2>&1 || { echo "Missing vercel CLI. Install: npm i -g vercel"; exit 1; }

echo "==> Copying template into $APP_DIR"
cp -r templates/web-app "$APP_DIR"

echo "==> Replacing placeholders"
# Cross-platform sed (works on both GNU and BSD/macOS sed)
find "$APP_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name ".env.example" \) -exec \
  sed -i.bak "s/__APP_NAME__/${APP_NAME}/g" {} \;
find "$APP_DIR" -name "*.bak" -delete

echo "==> Creating Supabase project for ${APP_NAME}"
CREATE_OUT="$(supabase projects create "${APP_NAME}" --org-id "${SUPABASE_ORG_ID}" -o json 2>&1)" || {
  echo "$CREATE_OUT"
  echo "Supabase project creation failed."
  exit 1
}
# Extract the project ref from JSON output (id field), fall back to a ref-like token.
PROJECT_REF="$(printf '%s' "$CREATE_OUT" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([a-z0-9]\{20\}\)".*/\1/p' | head -n1)"
if [ -z "$PROJECT_REF" ]; then
  PROJECT_REF="$(printf '%s' "$CREATE_OUT" | grep -Eo '[a-z0-9]{20}' | head -n1)"
fi
if [ -z "$PROJECT_REF" ]; then
  echo "Could not determine Supabase project ref from CLI output:"
  echo "$CREATE_OUT"
  echo "Re-run: node scripts/fill-env.js ${APP_NAME} <project-ref> once you have it."
  exit 1
fi
echo "    Project ref: ${PROJECT_REF}"

echo "==> Waiting for the database to come online (up to ~3 min)"
DB_READY=0
for _ in $(seq 1 18); do
  if supabase projects api-keys --project-ref "${PROJECT_REF}" -o json >/dev/null 2>&1; then
    DB_READY=1
    break
  fi
  sleep 10
done
if [ "$DB_READY" -ne 1 ]; then
  echo "    DB still provisioning. Continue manually once ready:"
  echo "      supabase link --project-ref ${PROJECT_REF}"
  echo "      supabase db push --file packages/app-core/supabase/schema.sql"
  echo "      node scripts/fill-env.js ${APP_NAME} ${PROJECT_REF}"
  exit 1
fi

echo "==> Applying shared schema"
supabase link --project-ref "${PROJECT_REF}" >/dev/null 2>&1 || true
supabase db push --file packages/app-core/supabase/schema.sql || {
  echo "Schema push failed — apply manually:"
  echo "  supabase db push --file packages/app-core/supabase/schema.sql"
}

echo "==> Creating Stripe product + price"
if [ -n "${WEBHOOK_URL:-}" ]; then
  # Opt-in: also create the live prod webhook endpoint and capture its secret.
  node scripts/provision-stripe.js "${APP_NAME}" "${PRICE_CENTS:-1900}" "--webhook-url=${WEBHOOK_URL}"
else
  node scripts/provision-stripe.js "${APP_NAME}" "${PRICE_CENTS:-1900}"
fi

echo "==> Deriving ${APP_DIR}/.env.local (no manual filling)"
node scripts/fill-env.js "${APP_NAME}" "${PROJECT_REF}"

echo ""
if [ -t 0 ]; then
  read -r -p "Set up Google sign-in on Supabase now? [y/N] " SETUP_GOOGLE || true
  if [[ "${SETUP_GOOGLE:-}" =~ ^[Yy]$ ]]; then
    node scripts/setup-google-auth.js "${APP_NAME}" "${PROJECT_REF}"
  fi
fi

if [ -n "${SYNC_VERCEL:-}" ]; then
  echo "==> Syncing env vars to Vercel (SYNC_VERCEL is set)"
  node scripts/sync-vercel-env.js "${APP_NAME}" "${PROJECT_REF}" --link ${WEBHOOK_URL:+--webhook-url=${WEBHOOK_URL}}
fi

echo "==> Installing dependencies"
npm install >/dev/null 2>&1 || npm install

echo ""
echo "==> Done. apps/${APP_NAME} is provisioned and .env.local is populated."
echo "    Remaining (judgment, not toil):"
echo "    1. Rename FEATURE_NAME in app/api/ai/generate/route.ts and write your prompt"
echo "    2. Replace app/page.tsx with your product UI (auth/login already wired)"
echo "    3. Fill in runbook links for this app (copy from packages/app-core template)"
echo "    4. cd ${APP_DIR} && npm run dev  (then smoke test signup -> generate)"
echo "    5. Enable Google auth in Supabase (optional but templated):"
echo "       npm run setup:google-auth -- ${APP_NAME} ${PROJECT_REF}"
echo "    6. Deploy to stage via 'vercel' (preview), NOT production, first"
echo ""
echo "    Sync env vars to Vercel (zero-fill deploys):"
echo "      node scripts/sync-vercel-env.js ${APP_NAME} ${PROJECT_REF} --link"
echo "      # or set SYNC_VERCEL=1 when running new-app.sh to do this automatically"
echo ""
echo "    For a PROD Stripe webhook secret, include WEBHOOK_URL when syncing:"
echo "      node scripts/sync-vercel-env.js ${APP_NAME} ${PROJECT_REF} --link --webhook-url=https://${APP_NAME}.vercel.app"
