#!/bin/bash
# Pre-commit checks — run this before every commit
# Usage: bash scripts/pre-commit.sh
# To auto-run on git commit, copy to .git/hooks/pre-commit and chmod +x

set -e

echo "Running pre-commit checks..."

echo ""
echo "1/3 Generating Prisma client..."
npx turbo run db:generate

echo ""
echo "2/3 Lint check..."
npm run lint

echo ""
echo "3/3 Type check..."
npm run typecheck

echo ""
echo "All checks passed — safe to commit!"
