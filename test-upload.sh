#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMGMzNzRjMS01MWE5LTQwMDYtOTBhMy00NjljZTJmYmIxZjUiLCJlbWFpbCI6InRlc3RjdXJsQGV4YW1wbGUuY29tIiwiaWF0IjoxNzYxMjM4OTAzLCJleHAiOjE3NjEyMzk4MDN9.6vzyKgCpdQKIJ7C6CuvOQraQoJorLDgUENkUelWE8dw"

curl -s -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test-upload.txt" \
  -F "title=Test Upload" \
  -F "author=Test Author" | jq '.'
