# Testing Protocol

## CRITICAL: Test Before Claiming "It Works"

**RULE:** Never tell the user something works without running these tests first.

## Large File Support Tests

### Test 1: Chunking Verification
```bash
# Check that a large document gets chunked correctly
# Expected: 5,306 words → 7 chunks (800 words each)
# Check backend logs for: "Text chunked" and "chunkCount":7
```

### Test 2: Audio Stitching
```bash
# Verify all chunks convert and stitch
# Check backend logs for: "Audio stitching completed"
# Expected: durationSeconds around 2899 (48 minutes)
```

### Test 3: S3 Upload
```bash
# Verify file uploaded to S3
curl -I "https://ridecast-dev.s3.amazonaws.com/audio/..."
# Expected: HTTP 200 OK
```

### Test 4: Database Verification
```bash
psql -U chrispark -d ridecast -c "SELECT title, word_count, cj.status, ac.duration_seconds FROM content c JOIN conversion_jobs cj ON c.id = cj.content_id JOIN audio_cache ac ON cj.audio_cache_id = ac.id WHERE c.word_count > 1000 ORDER BY c.created_at DESC LIMIT 1;"
# Expected: status='completed', has duration_seconds
```

## Compression Feature Tests

### Test 1: Python Path Verification
```bash
$PYTHON_CMD --version
# Expected: Python 3.x.x
```

### Test 2: Amplifier Path Verification
```bash
ls $AMPLIFIER_PATH/scenarios/audio_compressor/
# Expected: main.py, __init__.py, etc.
```

### Test 3: Direct CLI Test
```bash
cd $AMPLIFIER_PATH && $PYTHON_CMD -m scenarios.audio_compressor.main --help
# Expected: Usage message with options
```

### Test 4: End-to-End Compression Test
```bash
# Create test file
echo "Test document with multiple sentences for compression testing." > /tmp/test.txt

# Run compression
cd $AMPLIFIER_PATH && $PYTHON_CMD -m scenarios.audio_compressor.main \
  --input /tmp/test.txt \
  --output /tmp/compressed.txt \
  --ratio medium

# Verify output exists
cat /tmp/compressed.txt
# Expected: Compressed text (shorter than input)
```

### Test 5: Backend Integration Test
```bash
# Check backend logs for successful compression
# Watch for: "Compression completed" with word counts
# Should NOT see: "CLI process error" or "ModuleNotFoundError"
```

## Backend Server Tests

### Test 1: Health Check
```bash
curl -s http://localhost:3001/health | jq .
# Expected: {"status":"healthy",...}
```

### Test 2: Environment Variables Loaded
```bash
# Check backend logs on startup for any environment-related errors
# Should NOT see: "ENOENT" or "command not found: python3"
```

## Frontend Tests

### Test 1: Frontend Running
```bash
curl -s http://localhost:3003 | head -20
# Expected: HTML content (not error page)
```

### Test 2: API Connection
```bash
# Check browser console for API connection errors
# Should NOT see: 503, 500, CORS errors
```

## Test Execution Order

**For ANY feature change:**

1. Run direct CLI/unit tests first
2. Check backend logs for errors
3. Verify database state
4. Test API endpoints with curl
5. ONLY THEN tell user to test in browser

## Common Failure Patterns

### "It should work" (WITHOUT TESTING)
❌ **WRONG** - This is speculation

### "I tested the CLI and it works, so the web app should work"
❌ **WRONG** - Backend integration may still fail

### "The logs show it completed successfully"
✅ **CORRECT** - This is evidence-based

### "Let me verify the complete flow..." (runs all tests)
✅ **CORRECT** - This is the right approach

## Reminder

**Before saying "it works" or "ready to test":**
- [ ] Did I run the CLI test myself?
- [ ] Did I check the backend logs for errors?
- [ ] Did I verify the output/database state?
- [ ] Did I test the API endpoint directly?

If any answer is "no", **STOP and test first**.
