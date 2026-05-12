#!/usr/bin/env bash
# NutriCoach — Development Setup Script
# Run once after cloning: ./scripts/setup.sh

set -e

echo "🚀 NutriCoach — Setting up development environment..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "20" ]; then
  echo "❌ Node.js >= 20 required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f "apps/web/.env.local" ]; then
  echo ""
  echo "📄 Creating apps/web/.env.local from template..."
  cp .env.example apps/web/.env.local
  echo "⚠️  Fill in your secrets in apps/web/.env.local before running the app."
else
  echo "✅ apps/web/.env.local already exists"
fi

# Generate Prisma client
echo ""
echo "🗄️  Generating Prisma client..."
npm run db:generate

# Setup Husky
echo ""
echo "🪝 Setting up Husky git hooks..."
npx husky install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in your secrets in apps/web/.env.local"
echo "  2. Run: npm run db:migrate   (to create database tables)"
echo "  3. Run: npm run dev          (to start development server)"
echo "  4. Open: http://localhost:3100"
echo ""
