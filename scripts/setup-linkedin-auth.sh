#!/usr/bin/env bash
set -euo pipefail

# Interactive LinkedIn (OIDC) OAuth setup for a Supabase-backed app.
#
# Usage:
#   ./scripts/setup-linkedin-auth.sh <app-name> [supabase-project-ref]
#   ./scripts/setup-linkedin-auth.sh ceevie --yes
#   ./scripts/setup-linkedin-auth.sh ceevie --site-url=https://ceevie.co.uk

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

exec node scripts/setup-linkedin-auth.js "$@"
