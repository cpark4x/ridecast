#!/bin/bash
TOKEN=$(cat .token)
CONTENT_ID="32a1dac9-25bb-467f-b4f9-81a2b1eef215"

curl -s -X POST "http://localhost:3001/api/v1/audio/convert" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\":\"${CONTENT_ID}\",\"voiceId\":\"en-US-JennyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0}}" | jq '.'
