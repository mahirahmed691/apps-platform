#!/usr/bin/env bash
set -euo pipefail

echo "=== Apps Platform: one-shot GitHub setup ==="
echo ""

read -p "Your git email: " GIT_EMAIL
read -p "Your GitHub username: " GH_USER
read -p "Repo name [apps-platform]: " REPO_NAME
REPO_NAME="${REPO_NAME:-apps-platform}"
read -p "Private repo? [Y/n]: " PRIVATE_INPUT
VISIBILITY="private"
if [[ "$PRIVATE_INPUT" =~ ^[Nn]$ ]]; then VISIBILITY="public"; fi

git config user.email "$GIT_EMAIL"
git config user.name "$GH_USER"

if command -v gh >/dev/null 2>&1; then
  echo "==> Found gh CLI, creating + pushing in one step"
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
else
  echo "==> gh CLI not found. Two options:"
  echo "    1. Install it: https://cli.github.com  (then re-run this script)"
  echo "    2. Manual: create '$REPO_NAME' at github.com/new, then run:"
  echo "       git remote add origin git@github.com:${GH_USER}/${REPO_NAME}.git"
  echo "       git branch -M main"
  echo "       git push -u origin main"
  exit 1
fi

echo ""
echo "==> Repo pushed. Now enforcing your pipeline rules as actual settings"
echo "    (not just files that say them):"
echo ""

gh api repos/${GH_USER}/${REPO_NAME}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build-and-test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null \
  2>/dev/null && echo "    Branch protection on main: enabled (CI must pass to merge)" \
  || echo "    Branch protection needs a paid plan for private repos, or run manually in Settings > Branches"

gh api repos/${GH_USER}/${REPO_NAME}/environments/production \
  --method PUT \
  --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}' \
  2>/dev/null && echo "    Production environment: created (add yourself as required reviewer in Settings > Environments)" \
  || echo "    Create the 'production' environment manually in Settings > Environments if this failed"

echo ""
echo "=== Done. Remaining manual step (deliberately manual, GitHub doesn't ==="
echo "=== expose this via API): go to Settings > Environments > production   ==="
echo "=== and add yourself as a required reviewer. That's what makes the    ==="
echo "=== prod approval gate real instead of just a workflow file.          ==="
