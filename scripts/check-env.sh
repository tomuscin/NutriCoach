#!/usr/bin/env bash
# NutriCoach — Check Tech Stack Versions
# Run to verify all required tools are installed

echo "🔍 NutriCoach — Environment Check"
echo "================================="

check() {
  local tool=$1
  local cmd=$2
  local result
  result=$(eval "$cmd" 2>&1) && echo "✅ $tool: $result" || echo "❌ $tool: NOT FOUND"
}

check "Node.js"    "node --version"
check "npm"        "npm --version"
check "git"        "git --version"
check "npx"        "npx --version"
check "docker"     "docker --version 2>/dev/null | head -1"

echo ""
echo "📋 Workspace packages:"
ls -1 apps/ 2>/dev/null | sed 's/^/  apps\//' || echo "  (none)"
ls -1 packages/ 2>/dev/null | sed 's/^/  packages\//' || echo "  (none)"
