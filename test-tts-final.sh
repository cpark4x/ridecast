#!/bin/bash
# Login as test2
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test2@example.com","password":"TestPassword123"}' | jq -r '.data.accessToken')

echo "Logged in as test2@example.com"
echo "Testing audio conversion with synchronous processing..."
echo ""

# Convert existing content
curl -s -X POST "http://localhost:3001/api/v1/audio/convert" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"contentId":"d999c334-f2e1-41ca-8bff-6b7b5d888906","voiceId":"en-US-JennyNeural","config":{"speed":1.0,"pitch":0}}' | jq '.'
