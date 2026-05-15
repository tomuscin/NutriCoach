#!/usr/bin/env bash
# sync-pmos.sh — Deploy apps/pmos to lexaro-app/Leaxaro-PMOS on GitHub
# Usage: GITHUB_PAT=ghp_xxx ./scripts/sync-pmos.sh "commit message"
# Or set GITHUB_PAT in your shell profile / .env.deploy

set -e

REMOTE="https://${GITHUB_PAT}@github.com/lexaro-app/Leaxaro-PMOS.git"
TMPDIR=$(mktemp -d)
MSG="${1:-chore: sync pmos from monorepo}"

echo "📦 Syncing apps/pmos → Leaxaro-PMOS..."

rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  --exclude='.env.local' \
  --exclude='src/generated' \
  --exclude='.next' \
  /Users/tomaszuscinski/Projects/Lexaro/apps/pmos/ \
  "$TMPDIR/"

cd "$TMPDIR"
git init -q
git checkout -q -b main
git add .
git commit -q -m "$MSG"
git remote add origin "$REMOTE"
git push --force -q origin main

rm -rf "$TMPDIR"
echo "✅ Pushed to github.com/lexaro-app/Leaxaro-PMOS"
