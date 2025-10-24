# Compression API Documentation

## Overview

The Compression API provides endpoints for compressing content using the amplifier audio-compressor CLI tool. It supports multiple compression ratios and caches compressed versions for performance.

## Base URL

```
/api/v1/compression
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Compress Content

Create a compressed version of existing content.

**Endpoint:** `POST /api/v1/compression/compress`

**Request Body:**
```json
{
  "contentId": "uuid",
  "ratio": 0.5
}
```

**Parameters:**
- `contentId` (string, required): UUID of the content to compress
- `ratio` (number, required): Compression ratio between 0.1 (90% compression) and 0.9 (10% compression)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Content compressed successfully",
  "data": {
    "id": "uuid",
    "parent_content_id": "uuid",
    "compression_ratio": 0.5,
    "original_word_count": 10000,
    "compressed_word_count": 5000,
    "processing_time_ms": 1234,
    "quality_score": 0.95,
    "created_at": "2025-10-23T14:00:00Z",
    "access_count": 0
  }
}
```

**Notes:**
- If a compressed version with the same ratio already exists, it will be returned from cache
- The full compressed text is not included in this response; use GET endpoint to retrieve it
- Processing time varies based on content length

---

### 2. Get Compressed Content

Retrieve a specific compressed content version with full text.

**Endpoint:** `GET /api/v1/compression/:compressedId`

**Parameters:**
- `compressedId` (string, required): UUID of the compressed content

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "parent_content_id": "uuid",
    "user_id": "uuid",
    "compression_ratio": 0.5,
    "compressed_text": "Full compressed text content...",
    "original_word_count": 10000,
    "compressed_word_count": 5000,
    "processing_time_ms": 1234,
    "quality_score": 0.95,
    "created_at": "2025-10-23T14:00:00Z",
    "accessed_at": "2025-10-23T14:15:00Z",
    "access_count": 5
  }
}
```

**Notes:**
- Access count and accessed_at are automatically updated on each retrieval
- Only the content owner can access compressed versions

---

### 3. List Compressed Versions

Get all compressed versions for a specific content item.

**Endpoint:** `GET /api/v1/compression/versions/:contentId`

**Parameters:**
- `contentId` (string, required): UUID of the parent content

**Query Parameters:**
- `page` (number, optional): Page number, default: 1
- `limit` (number, optional): Items per page, default: 20, max: 100

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "parent_content_id": "uuid",
      "user_id": "uuid",
      "compression_ratio": 0.5,
      "compressed_text": "...",
      "original_word_count": 10000,
      "compressed_word_count": 5000,
      "processing_time_ms": 1234,
      "quality_score": 0.95,
      "created_at": "2025-10-23T14:00:00Z",
      "accessed_at": "2025-10-23T14:15:00Z",
      "access_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 4. Delete Compressed Version

Delete a specific compressed content version.

**Endpoint:** `DELETE /api/v1/compression/:compressedId`

**Parameters:**
- `compressedId` (string, required): UUID of the compressed content to delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Compressed content deleted successfully"
}
```

**Notes:**
- Only the content owner can delete compressed versions
- Deleting a compressed version does not affect the original content

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid parameters or validation failure
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid token but insufficient permissions
- `404 Not Found`: Content or compressed version not found
- `409 Conflict`: Duplicate compression attempt (handled automatically by returning cached version)
- `500 Internal Server Error`: Server-side error
- `503 Service Unavailable`: Compression service failed (CLI execution error)

---

## Database Schema

The compressed content is stored in the `compressed_content` table:

```sql
CREATE TABLE compressed_content (
  id UUID PRIMARY KEY,
  parent_content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  compression_ratio DECIMAL(3,2) NOT NULL,
  compressed_text TEXT NOT NULL,
  original_word_count INTEGER NOT NULL,
  compressed_word_count INTEGER NOT NULL,
  processing_time_ms INTEGER,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  UNIQUE(parent_content_id, compression_ratio)
);
```

**Indexes:**
- `idx_compressed_content_parent` on `parent_content_id`
- `idx_compressed_content_user` on `user_id`
- `idx_compressed_content_accessed` on `accessed_at DESC`

---

## Usage Examples

### Example 1: Compress content at 50%

```bash
curl -X POST http://localhost:3001/api/v1/compression/compress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "123e4567-e89b-12d3-a456-426614174000",
    "ratio": 0.5
  }'
```

### Example 2: Get compressed content

```bash
curl -X GET http://localhost:3001/api/v1/compression/987fcdeb-51a2-43f7-b789-123456789abc \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 3: List all versions

```bash
curl -X GET "http://localhost:3001/api/v1/compression/versions/123e4567-e89b-12d3-a456-426614174000?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 4: Delete a version

```bash
curl -X DELETE http://localhost:3001/api/v1/compression/987fcdeb-51a2-43f7-b789-123456789abc \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Performance Considerations

1. **Caching**: Compressed versions are automatically cached. Requesting the same content with the same ratio will return the cached version instantly.

2. **Processing Time**: Initial compression can take several seconds depending on content length. The `processing_time_ms` field provides actual processing duration.

3. **Access Tracking**: Each retrieval updates `accessed_at` and `access_count` for analytics.

4. **Temp Files**: The service automatically manages temporary files during compression and cleans them up after processing.

---

## Configuration

Set the following environment variable to customize the amplifier CLI path:

```
AMPLIFIER_CLI_PATH=/path/to/audio-compressor
```

Default: `audio-compressor` (expects CLI in PATH)

---

## Next Steps for Testing

1. **Install amplifier CLI**: Ensure `audio-compressor` is available in PATH or set `AMPLIFIER_CLI_PATH`
2. **Upload content**: Use `/api/v1/content/upload` to create content first
3. **Test compression**: Use the compress endpoint with different ratios (0.3, 0.5, 0.7)
4. **Verify caching**: Request the same compression twice and check response times
5. **Test retrieval**: Fetch compressed content and verify text quality
6. **Monitor metrics**: Check `processing_time_ms` and `quality_score` values
