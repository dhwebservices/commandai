#!/bin/bash

# Start Comandr API Gateway
# This script starts the API server required by the desktop app

echo "🚀 Starting Comandr API Gateway..."
echo ""
echo "The API will run on http://localhost:3000"
echo "Keep this terminal window open while using the desktop app"
echo ""
echo "Press Ctrl+C to stop the API server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")/apps/api-gateway"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first-time setup)..."
    pnpm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create apps/api-gateway/.env with:"
    echo "  SUPABASE_URL=your_supabase_url"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "  SUPABASE_ANON_KEY=your_anon_key"
    echo "  RESEND_API_KEY=your_resend_key"
    echo "  RESEND_FROM_EMAIL=noreply@yourdomain.com"
    echo "  WEB_APP_URL=https://yourapp.com"
    echo ""
    read -p "Press Enter to continue anyway (will likely fail)..."
    echo ""
fi

# Start the API in development mode
pnpm run dev
