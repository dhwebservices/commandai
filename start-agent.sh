#!/bin/bash
# CommandAI Agent Quick Start Script

echo "🤖 CommandAI Desktop Agent Launcher"
echo "===================================="
echo ""

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set!"
    echo ""
    echo "To use AI features, set your Anthropic API key:"
    echo "export ANTHROPIC_API_KEY=your-key-here"
    echo ""
    echo "Get your key at: https://console.anthropic.com/"
    echo ""
    read -p "Continue without AI? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get user ID (tenant ID)
if [ -z "$TENANT_ID" ]; then
    echo "Enter your User ID (from login session):"
    read -r TENANT_ID
fi

if [ -z "$TENANT_ID" ]; then
    echo "❌ TENANT_ID is required"
    exit 1
fi

echo ""
echo "Starting CommandAI Agent..."
echo "User ID: $TENANT_ID"
echo ""

# Navigate to desktop-agent directory
cd "$(dirname "$0")/apps/desktop-agent" || exit

# Start the agent
TENANT_ID="$TENANT_ID" pnpm start
