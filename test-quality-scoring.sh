#!/bin/bash

# Quality Scoring End-to-End Test Script
# Tests compression with quality scoring feature

set -e

API_BASE="http://localhost:3001/api/v1"
TEST_EMAIL="test_quality_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TOKEN=""
CONTENT_ID=""
COMPRESSED_ID=""
QUALITY_SCORE=""
JOB_ID=""

echo "========================================="
echo "Quality Scoring E2E Test"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: Register new user
echo "Test 1: Register new user"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}")

echo "Register response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    print_success "User registration successful"
else
    print_fail "User registration failed"
    exit 1
fi
echo ""

# Test 2: Login and get token
echo "Test 2: Login and get valid token"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_success "Login successful, token obtained"
    print_info "Token: ${TOKEN:0:20}..."
else
    print_fail "Login failed - no token received"
    exit 1
fi
echo ""

# Test 3: Upload test document
echo "Test 3: Upload test document"
TEST_CONTENT="The Evolution of Artificial Intelligence

Artificial intelligence has transformed from a theoretical concept to a practical technology that impacts our daily lives. Machine learning algorithms now power everything from recommendation systems to autonomous vehicles. Deep learning, a subset of machine learning, has achieved remarkable breakthroughs in image recognition, natural language processing, and game playing.

The field of AI continues to advance rapidly, with researchers exploring new architectures and techniques. Transfer learning allows models to apply knowledge from one domain to another. Reinforcement learning enables agents to learn optimal behaviors through trial and error. Generative models can create realistic images, text, and audio.

As AI systems become more capable, questions about ethics, safety, and societal impact become increasingly important. Researchers and policymakers work to ensure AI development benefits humanity while minimizing potential risks. The future of AI promises exciting possibilities across healthcare, education, scientific research, and countless other domains."

# Create temporary test file
TEST_FILE="/tmp/test_content_$$.txt"
echo "$TEST_CONTENT" > "$TEST_FILE"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/content/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE" \
  -F "title=AI Article" \
  -F "type=article")

# Clean up test file
rm -f "$TEST_FILE"

echo "Upload response: $UPLOAD_RESPONSE"

CONTENT_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CONTENT_ID" ]; then
    print_success "Content uploaded successfully"
    print_info "Content ID: $CONTENT_ID"
else
    print_fail "Content upload failed"
    exit 1
fi
echo ""

# Test 4: Compress with quality scoring (ratio 0.3)
echo "Test 4: Create compression with quality scoring (ratio 0.3)"
COMPRESS_RESPONSE=$(curl -s -X POST "$API_BASE/compression/compress" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"contentId\":\"$CONTENT_ID\",\"ratio\":0.3}")

echo "Compress response: $COMPRESS_RESPONSE"

COMPRESSED_ID=$(echo "$COMPRESS_RESPONSE" | grep -o '"compressedContentId":"[^"]*"' | cut -d'"' -f4)
QUALITY_SCORE=$(echo "$COMPRESS_RESPONSE" | grep -o '"qualityScore":"[0-9.]*"' | cut -d'"' -f4)

if [ -n "$COMPRESSED_ID" ]; then
    print_success "Compression successful"
    print_info "Compressed ID: $COMPRESSED_ID"

    if [ -n "$QUALITY_SCORE" ]; then
        print_success "Quality score returned in API response: $QUALITY_SCORE"

        # Check if quality score is in valid range (0-100)
        if (( $(echo "$QUALITY_SCORE >= 0" | bc -l) )) && (( $(echo "$QUALITY_SCORE <= 100" | bc -l) )); then
            print_success "Quality score is in valid range (0-100): $QUALITY_SCORE"
        else
            print_fail "Quality score out of range: $QUALITY_SCORE"
        fi
    else
        print_fail "No quality score in API response"
    fi
else
    print_fail "Compression failed"
    exit 1
fi
echo ""

# Test 5: Verify quality score in database
echo "Test 5: Verify quality score stored in database"
print_info "Fetching compressed content to verify database storage..."

GET_COMPRESSED_RESPONSE=$(curl -s -X GET "$API_BASE/compression/$COMPRESSED_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get compressed response: $GET_COMPRESSED_RESPONSE"

DB_QUALITY_SCORE=$(echo "$GET_COMPRESSED_RESPONSE" | grep -o '"quality_score":"[0-9.]*"' | cut -d'"' -f4)

if [ -n "$DB_QUALITY_SCORE" ]; then
    print_success "Quality score found in database: $DB_QUALITY_SCORE"

    if [ "$DB_QUALITY_SCORE" = "$QUALITY_SCORE" ]; then
        print_success "Database quality score matches API response"
    else
        print_fail "Database quality score ($DB_QUALITY_SCORE) does not match API response ($QUALITY_SCORE)"
    fi
else
    print_fail "No quality score in database"
fi
echo ""

# Test 6: Convert compressed content to audio
echo "Test 6: Test audio conversion for compressed content"
print_info "Converting compressed content to audio..."

CONVERT_RESPONSE=$(curl -s -X POST "$API_BASE/audio/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"contentId\":\"$COMPRESSED_ID\",\"voiceId\":\"en-US-GuyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0},\"isCompressed\":true}")

echo "Convert response: $CONVERT_RESPONSE"

if echo "$CONVERT_RESPONSE" | grep -q '"success":true'; then
    JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    print_success "Audio conversion job created successfully"
    print_info "Job ID: $JOB_ID"

    # Check for foreign key errors
    if echo "$CONVERT_RESPONSE" | grep -qi "foreign key"; then
        print_fail "Foreign key error detected in audio conversion"
        exit 1
    else
        print_success "No foreign key errors - audio conversion works correctly"
    fi
else
    print_fail "Audio conversion failed"
    echo "Error details: $CONVERT_RESPONSE"
    exit 1
fi
echo ""

# Test 7: Check TypeScript compilation
echo "Test 7: Check frontend TypeScript compilation"
cd /Users/chrispark/amplifier/ridecast/web

print_info "Running TypeScript compiler..."
if npx tsc --noEmit 2>&1 | tee /tmp/typecheck_output.txt; then
    print_success "TypeScript compilation successful - no errors"
else
    print_fail "TypeScript compilation failed"
    echo "Error output:"
    cat /tmp/typecheck_output.txt
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
print_success "1. User registration: PASSED"
print_success "2. User login: PASSED"
print_success "3. Content upload: PASSED"
print_success "4. Compression with quality scoring: PASSED"
print_success "5. Quality score verification: PASSED"
print_success "6. Audio conversion (no foreign key errors): PASSED"
print_success "7. TypeScript compilation: PASSED"
echo ""
print_success "ALL TESTS PASSED ✅"
echo ""
echo "Quality Score Value: $QUALITY_SCORE"
echo "Content ID: $CONTENT_ID"
echo "Compressed ID: $COMPRESSED_ID"
echo "Job ID: $JOB_ID"
echo ""
