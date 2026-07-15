#!/bin/bash
# Build script for Cloudflare Pages
# This builds the web console and copies output to root dist/

set -e

echo "🔨 Building Comandr Web Console for Cloudflare Pages..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build web console
echo "🏗️  Building web console..."
cd apps/web-console
pnpm run build
cd ../..

# Copy to root dist folder (what Cloudflare expects)
echo "📋 Copying build output to root dist/..."
rm -rf dist
cp -r apps/web-console/dist dist

echo "✅ Build complete! Output: dist/"
ls -lh dist/ | head -10
