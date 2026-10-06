#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${ASSPS_REPO_URL:-https://github.com/HassiMian/app-assps-edu-pk.git}"
BRANCH="${ASSPS_SANDBOX_BRANCH:-feat/free-cloud-workstation-zero-paid-20261004}"
TARGET="${ASSPS_SANDBOX_DIR:-$HOME/assps-sandbox}"

echo "ASSPS AWS BUILDER SANDBOX BOOTSTRAP"
echo "repo=$REPO_URL"
echo "branch=$BRANCH"
echo "target=$TARGET"

for c in git node npm; do
  command -v "$c" >/dev/null 2>&1 || { echo "REFUSE: missing required command $c" >&2; exit 31; }
done

if [[ -e "$TARGET/.git" ]]; then
  git -C "$TARGET" fetch origin "$BRANCH:refs/remotes/origin/$BRANCH"
  git -C "$TARGET" checkout "$BRANCH"
  git -C "$TARGET" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$TARGET"
fi

cd "$TARGET"
if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "REFUSE: wrong branch" >&2
  exit 32
fi

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"
npm ci --prefix al-siddique-frontend
npm ci --prefix al-siddique-backend/src
npm run build:frontend
npm run production:safety
echo "SANDBOX_BOOTSTRAP_PASS"
