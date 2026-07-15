#!/bin/bash
# Test if API tables exist

echo "🔍 Testing Comandr API Endpoints"
echo "=================================="
echo ""

API="http://localhost:3000"

echo "1. Health Check:"
curl -s "$API/health" | jq . || echo "Failed"
echo ""

echo "2. Check if remote_sessions table exists (will fail if not):"
curl -s -X POST "$API/v1/remote-sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token" \
  -d '{
    "tenantId": "test",
    "targetDeviceId": "test",
    "initiatorUserId": "test",
    "sessionType": "interactive"
  }' | jq . || echo "Failed"
echo ""

echo "3. Test devices endpoint:"
curl -s "$API/v1/devices?tenantId=test" \
  -H "Authorization: Bearer fake-token" | jq . || echo "Failed"
echo ""

echo "=================================="
echo "Check API terminal for detailed error logs"
