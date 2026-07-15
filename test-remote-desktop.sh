#!/bin/bash
# Quick test of remote desktop functionality

echo "🧪 Remote Desktop Test Script"
echo "=============================="
echo ""

# 1. Check if API is running
echo "1. Checking API..."
if curl -s http://localhost:3000/health 2>/dev/null | grep -q "ok"; then
    echo "   ✅ API is running"
else
    echo "   ❌ API is NOT running"
    echo "   → Start it with: ./START_API.sh"
    exit 1
fi

# 2. Check if app is built
echo "2. Checking app build..."
if [ -f "apps/desktop-app/release/Comandr-1.0.0-arm64.dmg" ]; then
    echo "   ✅ App is built"
else
    echo "   ❌ App is NOT built"
    echo "   → Build it with: npm run build"
    exit 1
fi

# 3. Check if screen recording permission granted
echo "3. Checking permissions..."
echo "   ⚠️  Manual check required:"
echo "   → System Preferences → Security & Privacy → Screen Recording"
echo "   → System Preferences → Security & Privacy → Accessibility"
echo ""

# 4. Instructions
echo "4. Test Instructions:"
echo "   → Install: open apps/desktop-app/release/Comandr-1.0.0-arm64.dmg"
echo "   → Launch Comandr from Applications"
echo "   → Login with your account"
echo "   → Go to Devices tab"
echo "   → Click 'Connect' on a device"
echo "   → Open DevTools and check console"
echo ""
echo "✅ All prerequisites met! Ready for testing."
