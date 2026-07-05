#!/usr/bin/env bash
set -euo pipefail

# Interactive Google OAuth setup for a Supabase-backed app.
#
# Usage:
#   ./scripts/setup-google-auth.sh <app-name> [supabase-project-ref]
#   ./scripts/setup-google-auth.sh ceevie --yes
#   ./scripts/setup-google-auth.sh ceevie --site-url=https://ceevie.co.uk

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

exec node scripts/setup-google-auth.js "$@"
