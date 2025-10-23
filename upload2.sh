#!/bin/bash
TOKEN=$(cat .token)
curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload2.txt" \
  -F "title=Test Upload 2 for TTS" \
  -F "author=Test Author" | jq -r '.data.id' > .content_id2
cat .content_id2
