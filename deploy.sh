#!/bin/bash
# Full deployment script for Vibe Code / My Notes
# Run locally to build, or on server after upload

set -e

echo "🚀 Vibe Code - Production Build"
echo "================================"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Frontend (needs devDeps for build)
echo ""
echo "📦 [1/4] Building frontend..."
cd frontend
npm ci
npm run build
cd "$PROJECT_ROOT"

# 2. Backend dependencies
echo ""
echo "📦 [2/4] Installing backend dependencies..."
cd backend
npm ci --omit=dev
cd "$PROJECT_ROOT"

# 3. PHP/Laravel
echo ""
echo "📦 [3/4] PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# 4. Laravel optimize
echo ""
echo "🔧 [4/4] Laravel optimization..."
php artisan config:clear 2>/dev/null || true
php artisan cache:clear 2>/dev/null || true
php artisan route:clear 2>/dev/null || true
php artisan view:clear 2>/dev/null || true

if [ -f .env ]; then
  php artisan config:cache 2>/dev/null || true
  php artisan route:cache 2>/dev/null || true
  php artisan view:cache 2>/dev/null || true
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps on live server:"
echo "  1. Ensure .env exists (copy from .env.production.example)"
echo "  2. Run: chmod -R 775 storage bootstrap/cache"
echo "  3. Start Node backend: cd backend && pm2 start ecosystem.config.js"
echo "  4. Point document root to: $PROJECT_ROOT/public"
echo ""
