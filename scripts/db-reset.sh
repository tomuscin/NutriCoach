#!/usr/bin/env bash
# NutriCoach — Database Reset Script
# WARNING: Drops and recreates the database. Development only.

set -e

echo "⚠️  This will DROP and recreate the database."
read -p "Are you sure? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo "🗑️  Resetting database..."
cd apps/web
npx prisma migrate reset --force

echo "✅ Database reset complete."
echo "   Run: npm run db:seed   (to populate with sample data)"
