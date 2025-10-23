#!/bin/bash
TOKEN=$(cat .token)

# Upload new content
echo "Uploading content..."
CONTENT_ID=$(curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload3.txt" \
  -F "title=Final TTS Test" \
  -F "author=Test Author" | jq -r '.data.id')

echo "Content ID: $CONTENT_ID"

# Convert to audio
echo -e "\nStarting audio conversion..."
curl -s -X POST "http://localhost:3001/api/v1/audio/convert" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\":\"${CONTENT_ID}\",\"voiceId\":\"en-US-JennyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0}}" | jq '.'
