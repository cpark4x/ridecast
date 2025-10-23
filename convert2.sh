#!/bin/bash
TOKEN=$(cat .token)
CONTENT_ID=$(cat .content_id2)

curl -s -X POST "http://localhost:3001/api/v1/audio/convert" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\":\"${CONTENT_ID}\",\"voiceId\":\"en-US-JennyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0}}" | jq '.'
