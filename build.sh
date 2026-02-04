#!/bin/bash

# Build script for Vibe Code React Frontend
# This script builds the frontend and deploys it to the Laravel public directory

echo "🔧 Building Vibe Code Frontend..."
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend" || exit 1

echo "📦 Installing dependencies (if needed)..."
npm install

echo ""
echo "🏗️  Building production bundle..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Files have been built to: ../public/"
    echo ""
    echo "Next steps:"
    echo "1. Test locally: cd public && php -S localhost:8000"
    echo "2. Upload the public directory to your live server"
    echo "3. Ensure .htaccess files are included"
    echo ""
else
    echo ""
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi
