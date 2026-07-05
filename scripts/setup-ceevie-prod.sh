#!/usr/bin/env bash
set -euo pipefail

# Wire ceevie.co.uk for production: Stripe webhook + Vercel env sync.
#
# Usage:
#   ./scripts/setup-ceevie-prod.sh [supabase-project-ref]
#
# Prerequisites:
#   - Root .env filled (see .env.example)
#   - Vercel project linked: cd apps/ceevie && vercel link
#   - Domain ceevie.co.uk added in Vercel dashboard (DNS below)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DOMAIN="ceevie.co.uk"
SITE_URL="https://${DOMAIN}"
PROJECT_REF="${1:-}"

if [ -z "$PROJECT_REF" ] && [ -f "apps/ceevie/.provisioning.json" ]; then
  PROJECT_REF="$(node -e "console.log(JSON.parse(require('fs').readFileSync('apps/ceevie/.provisioning.json','utf8')).supabaseProjectRef||'')")"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "Usage: ./scripts/setup-ceevie-prod.sh <supabase-project-ref>"
  echo "  (or run fill-env first — it writes apps/ceevie/.provisioning.json)"
  exit 1
fi

if [ ! -f "${REPO_ROOT}/.env" ]; then
  echo "Missing root .env — copy .env.example and fill in account secrets first."
  exit 1
fi

echo "==> Ceevie production setup for ${SITE_URL}"
echo "    Supabase project: ${PROJECT_REF}"
echo ""

echo "==> 1. DNS (at your registrar — one-time)"
echo "    Add domain in Vercel: Project → Settings → Domains → ${DOMAIN}"
echo "    Then set DNS records Vercel shows you, typically:"
echo "      A     @     → 76.76.21.21"
echo "      CNAME www   → cname.vercel-dns.com"
echo ""

echo "==> 2. Supabase auth + Google OAuth"
if [ -t 0 ]; then
  read -r -p "    Configure Google sign-in now? [Y/n] " SETUP_GOOGLE || true
  if [[ ! "${SETUP_GOOGLE:-}" =~ ^[Nn]$ ]]; then
    NEXT_PUBLIC_SITE_URL="${SITE_URL}" node scripts/setup-google-auth.js ceevie "${PROJECT_REF}" --site-url="${SITE_URL}"
  else
    echo "    Skipped — run later: npm run setup:google-auth -- ceevie ${PROJECT_REF} --site-url=${SITE_URL}"
  fi
else
  NEXT_PUBLIC_SITE_URL="${SITE_URL}" node scripts/setup-google-auth.js ceevie "${PROJECT_REF}" --site-url="${SITE_URL}" --yes
fi

echo ""

echo "==> 3. Stripe prod webhook + price"
node scripts/provision-stripe.js ceevie 1900 "--webhook-url=${SITE_URL}"

echo ""
echo "==> 4. Sync env vars to Vercel (production + preview)"
NEXT_PUBLIC_SITE_URL="${SITE_URL}" node scripts/sync-vercel-env.js ceevie "${PROJECT_REF}" --link

echo ""
echo "==> 5. Redeploy"
echo "    Deploy from the monorepo root (not apps/ceevie — workspace deps need the full repo):"
echo "    cd ../.. && vercel --prod"
echo ""
echo "    Vercel project settings (recommended):"
echo "      Root Directory: apps/ceevie"
echo "      Enable: Include source files outside of the Root Directory in the Build Step"
echo ""
echo "==> Done. After DNS propagates, ${SITE_URL} should serve Ceevie."
