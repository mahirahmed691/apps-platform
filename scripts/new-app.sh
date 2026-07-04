#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Pipeline entry point for spinning up a new app on this platform.
# Run: ./scripts/new-app.sh my-new-app
#
# What this automates (the toil):
#   - Copying the template with placeholders replaced
#   - Creating a new Supabase project + applying schema.sql
#   - Creating Stripe product/price for the subscription
#   - Wiring .env with the values it just provisioned
#
# What this deliberately does NOT automate (the judgment):
#   - Whether to build this app at all (that's Stage 0 — talk
#     to 10 people first, this script doesn't run until that's done)
#   - Pricing decisions, feature scope, prompt design
#   - The decision to go live (canary/prod promotion is manual,
#     gated by CI checks — see .github/workflows/deploy.yml)
# ============================================================

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "Usage: ./scripts/new-app.sh <app-name>"
  exit 1
fi

APP_DIR="apps/${APP_NAME}"

if [ -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR already exists. Pick a different name or remove it first."
  exit 1
fi

echo "==> Copying template into $APP_DIR"
cp -r templates/web-app "$APP_DIR"

echo "==> Replacing placeholders"
# Cross-platform sed (works on both GNU and BSD/macOS sed)
find "$APP_DIR" -type f \( -name "*.ts" -o -name "*.json" \) -exec \
  sed -i.bak "s/__APP_NAME__/${APP_NAME}/g" {} \;
find "$APP_DIR" -name "*.bak" -delete

echo "==> Checking for required CLIs"
command -v supabase >/dev/null 2>&1 || { echo "Missing supabase CLI. Install: npm i -g supabase"; exit 1; }
command -v stripe >/dev/null 2>&1 || { echo "Missing stripe CLI. Install: https://stripe.com/docs/stripe-cli"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "Missing vercel CLI. Install: npm i -g vercel"; exit 1; }

echo "==> Creating Supabase project for ${APP_NAME}"
echo "    (This opens an interactive Supabase CLI flow — follow the prompts.)"
supabase projects create "${APP_NAME}" --org-id "${SUPABASE_ORG_ID:?Set SUPABASE_ORG_ID env var first}"

echo "==> Applying shared schema to the new project"
echo "    Run manually once the project is ready (DB takes ~2 min to provision):"
echo "    supabase link --project-ref <ref-from-above>"
echo "    supabase db push --file packages/app-core/supabase/schema.sql"

echo "==> Creating Stripe product + price"
node scripts/provision-stripe.js "${APP_NAME}"

echo "==> Writing .env.local template for the new app"
cat > "${APP_DIR}/.env.local" <<EOF
# Filled in by new-app.sh — verify these before first run
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
ANTHROPIC_API_KEY=
EOF

echo ""
echo "==> Done. Manual steps remaining (deliberately not automated):"
echo "    1. Fill in .env.local with the real Supabase/Stripe values above"
echo "    2. Run 'supabase db push' as shown above to apply the schema"
echo "    3. cd ${APP_DIR} && npm install"
echo "    4. Rename FEATURE_NAME in app/api/ai/generate/route.ts and write your prompt"
echo "    5. Fill in runbook links for this app (copy from packages/app-core template)"
echo "    6. Deploy to stage via 'vercel' (preview), NOT production, first"
