#!/usr/bin/env bash
# PMOS Starter — Install Script
# Usage: bash scripts/install-pmos.sh [project-root]
#
# Copies PMOS into a target project and initializes it.
# Run from the pmos-starter directory.

set -e

STARTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-$PWD}"

echo ""
echo "PMOS Starter Install"
echo "===================="
echo "Starter:  $STARTER_DIR"
echo "Target:   $TARGET_DIR"
echo ""

# ── Step 1: Copy PMOS app ────────────────────────────────────────────────────
echo "[1/6] Copying apps/pmos..."
mkdir -p "$TARGET_DIR/apps"
cp -r "$STARTER_DIR/apps/pmos" "$TARGET_DIR/apps/pmos"
echo "      Done."

# ── Step 2: Copy scripts ────────────────────────────────────────────────────
echo "[2/6] Copying scripts/build-pmos-context.ts..."
mkdir -p "$TARGET_DIR/scripts"
cp "$STARTER_DIR/scripts/build-pmos-context.ts" "$TARGET_DIR/scripts/build-pmos-context.ts"
echo "      Done."

# ── Step 3: Copy docs ────────────────────────────────────────────────────────
echo "[3/6] Copying PMOS documentation..."
mkdir -p "$TARGET_DIR/docs"
cp "$STARTER_DIR/PMOS-ARCHITECTURE.md" "$TARGET_DIR/docs/PMOS-ARCHITECTURE.md"
cp "$STARTER_DIR/VSC-BOOTSTRAP-PROMPT.md" "$TARGET_DIR/docs/VSC-BOOTSTRAP-PROMPT.md"
echo "      Done."

# ── Step 4: Set up .env.local ────────────────────────────────────────────────
echo "[4/6] Setting up .env.local..."
if [ ! -f "$TARGET_DIR/apps/pmos/.env.local" ]; then
  cp "$TARGET_DIR/apps/pmos/.env.example" "$TARGET_DIR/apps/pmos/.env.local"
  echo "      Created apps/pmos/.env.local — fill in DATABASE_URL and DIRECT_URL."
else
  echo "      apps/pmos/.env.local already exists — skipping."
fi

# ── Step 5: Install dependencies ────────────────────────────────────────────
echo "[5/6] Installing npm dependencies..."
(cd "$TARGET_DIR/apps/pmos" && npm install)
echo "      Done."

# ── Step 6: Summary ─────────────────────────────────────────────────────────
echo ""
echo "[6/6] Next steps:"
echo ""
echo "  1. Edit apps/pmos/.env.local with your Postgres credentials"
echo "     (Get a free Neon database at https://neon.tech)"
echo ""
echo "  2. Edit apps/pmos/pmos.config.ts with your project details"
echo ""
echo "  3. Run database setup:"
echo "     cd apps/pmos && npm run db:generate && npm run db:push && npm run db:seed"
echo ""
echo "  4. Start PMOS:"
echo "     cd apps/pmos && npm run dev"
echo "     → http://localhost:3200"
echo ""
echo "  5. Build AI context:"
echo "     npx tsx scripts/build-pmos-context.ts"
echo ""
echo "  6. Use VSC-BOOTSTRAP-PROMPT to customize for your project:"
echo "     docs/VSC-BOOTSTRAP-PROMPT.md"
echo ""
echo "PMOS installed successfully."
