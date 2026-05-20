#!/usr/bin/env bash
# Creates a new public GitHub repo and pushes (requires: gh auth login)
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="${1:-chess-review}"
GH_BIN="${GH_BIN:-gh}"

if ! command -v "$GH_BIN" >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/  (or set GH_BIN=/path/to/gh)"
  exit 1
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  echo "Log in first: $GH_BIN auth login"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin already exists. Pushing..."
  git push -u origin HEAD
else
  "$GH_BIN" repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

echo ""
echo "Done. Import in Vercel: https://vercel.com/new"
echo "Optional env var: VITE_GEMINI_API_KEY"
