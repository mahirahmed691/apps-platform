#!/usr/bin/env bash
set -euo pipefail

read -p "Your GitHub username: " GH_USER
read -p "Repo name [apps-platform]: " REPO_NAME
REPO_NAME="${REPO_NAME:-apps-platform}"

echo "==> Switching repo to public"
gh api repos/${GH_USER}/${REPO_NAME} --method PATCH --field private=false

echo "==> Enabling branch protection on main (now available on public repos, free)"
gh api repos/${GH_USER}/${REPO_NAME}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build-and-test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null

echo "==> Creating production environment"
gh api repos/${GH_USER}/${REPO_NAME}/environments/production \
  --method PUT \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}'

echo ""
echo "=== Done. Branch protection is live: CI must pass + 1 approval to merge main. ==="
echo "=== Remaining manual step: Settings > Environments > production > add        ==="
echo "=== yourself as a required reviewer. GitHub doesn't expose this via API.      ==="
echo ""
echo "=== Reminder: this repo is now PUBLIC. Before pushing any app-specific        ==="
echo "=== code (prompts, business logic), decide if it belongs here or in a        ==="
echo "=== separate private repo. Infra plumbing being public is fine; your         ==="
echo "=== actual product idea being public might not be.                          ==="
