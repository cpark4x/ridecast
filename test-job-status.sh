#!/bin/bash
TOKEN=$(cat .token)
JOB_ID="5c8a8a08-e860-4e23-95dd-8d2c303433ff"

curl -s -X GET "http://localhost:3001/api/v1/audio/status/${JOB_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
