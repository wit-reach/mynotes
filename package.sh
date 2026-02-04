#!/bin/bash

# Vibe Code / My Notes Packaging Script
# This script bundles the application for live server deployment.

set -e

APP_NAME="vibe-code-release"
ZIP_NAME="${APP_NAME}.zip"

echo "📦 Starting packaging process for ${APP_NAME}..."

# 1. Build Frontend
echo ""
echo "🎨 Building Frontend..."
cd frontend
npm ci
npm run build
cd ..

# 2. Cleanup previous build
echo ""
echo "🧹 Cleaning up previous builds..."
rm -rf "$APP_NAME"
rm -f "$ZIP_NAME"

# Clean Laravel cache to avoid stale configs in production
# We use rm instead of artisan to avoid database connection errors during build
rm -f bootstrap/cache/*.php

# 3. Create release directory
mkdir "$APP_NAME"

# 4. Copy Files
echo ""
echo "Cc Copying files..."

# -- Laravel Core --
echo "  > Copying Laravel core..."
cp -r app bootstrap config database public resources routes storage tests vendor artisan composer.json composer.lock package.json vite.config.js .htaccess "$APP_NAME/"

# -- Backend --
echo "  > Copying Backend (SKIPPED - MIGRATED TO PHP)..."
# mkdir "$APP_NAME/backend"
# rsync -av --progress backend/ "$APP_NAME/backend/" --exclude node_modules --exclude .env --exclude "*.log" --exclude "*.db"

# -- Deployment Scripts --
echo "  > Copying deployment scripts..."
cp deploy.sh ecosystem.config.js "$APP_NAME/"
if [ -f "build.sh" ]; then
    cp build.sh "$APP_NAME/"
fi

# -- Environment Example --
if [ -f ".env.example" ]; then
    cp .env.example "$APP_NAME/.env"
else
    # Create a dummy .env if example doesn't exist
    touch "$APP_NAME/.env"
fi

# Copy installer.env as .env for initial setup
echo "  > Copying Installer Env..."
cp installer.env "$APP_NAME/.env"

# 5. Zip it up
echo ""
echo "🤐 Zipping application..."
zip -r "$ZIP_NAME" "$APP_NAME"

# 6. Cleanup
echo ""
echo "🧹 Removing temporary directory..."
rm -rf "$APP_NAME"

echo ""
echo "✅ Packaging complete!"
echo "📂 Output: $(pwd)/$ZIP_NAME"
echo ""
