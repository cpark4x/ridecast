#!/bin/bash
TOKEN=$(cat .token)
curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload.txt" \
  -F "title=Test Upload from Curl" \
  -F "author=Test Author" | jq '.'
