#!/bin/bash
# Register new user
echo "Registering new user..."
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test3@example.com","password":"TestPassword123","name":"Test User 3"}' \
  | jq -r '.data.accessToken' > .token3

TOKEN=$(cat .token3)
echo "Token obtained"

# Upload content
echo "Uploading content..."
curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload3.txt" \
  -F "title=Final TTS Test" \
  -F "author=Test Author" | jq '.'
