#!/bin/bash
# Use existing uploaded content
CONTENT_ID="d999c334-f2e1-41ca-8bff-6b7b5d888906"

# Get fresh token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"test-final@example.com","password":"TestPassword123","name":"Test Final"}' | jq -r '.data.accessToken')

echo "Testing complete audio conversion..."
echo "Content ID: $CONTENT_ID"
echo ""

# Upload content for this user
echo "Uploading content for new user..."
curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload3.txt" \
  -F "title=Final Complete Test" \
  -F "author=Test Author" > /tmp/upload-result.json

NEW_CONTENT_ID=$(jq -r '.data.id' /tmp/upload-result.json)
echo "New Content ID: $NEW_CONTENT_ID"
echo ""

# Start audio conversion
echo "Starting audio conversion (this may take 5-10 seconds)..."
curl -s -X POST "http://localhost:3001/api/v1/audio/convert" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\":\"${NEW_CONTENT_ID}\",\"voiceId\":\"en-US-JennyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0}}" | jq '.'
