# Ridecast API Documentation

Base URL: `http://localhost:3001/api/v1`

## Authentication

Most endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"  // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-10-22T..."
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

---

## Content Endpoints

### Upload Content
```http
POST /content/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <PDF/EPUB/TXT file>
- title: "My Book" (optional)
- author: "Author Name" (optional)
- type: "book" (optional)
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Book",
    "author": "Author Name",
    "type": "pdf",
    "word_count": 5000,
    "created_at": "2024-10-22T..."
  }
}
```

### List Content
```http
GET /content?page=1&limit=20&type=book
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `type` (optional: book, article, pdf, epub, txt, other)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Book",
      "author": "Author Name",
      "type": "pdf",
      "word_count": 5000,
      "created_at": "2024-10-22T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Content
```http
GET /content/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Book",
    "author": "Author Name",
    "type": "pdf",
    "text_content": "Full text...",
    "word_count": 5000,
    "created_at": "2024-10-22T..."
  }
}
```

### Delete Content
```http
DELETE /content/:id
Authorization: Bearer <token>
```

---

## Audio Endpoints

### Get Available Voices
```http
GET /audio/voices
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "en-US-JennyNeural",
      "name": "Jenny (Female, US)",
      "locale": "en-US",
      "gender": "Female"
    },
    {
      "id": "en-US-GuyNeural",
      "name": "Guy (Male, US)",
      "locale": "en-US",
      "gender": "Male"
    }
  ]
}
```

### Convert to Audio
```http
POST /audio/convert
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content-uuid",
  "voiceId": "en-US-JennyNeural",
  "config": {
    "speed": 1.0,    // 0.5 to 2.0
    "pitch": 0       // -50 to 50
  }
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "status": "pending",
    "message": "Audio conversion started"
  }
}
```

### Check Job Status
```http
GET /audio/status/:jobId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "status": "completed",  // pending, processing, completed, failed
    "progress": 100,
    "audioUrl": "https://s3.amazonaws.com/...",
    "durationSeconds": 300,
    "errorMessage": null,
    "createdAt": "2024-10-22T...",
    "completedAt": "2024-10-22T..."
  }
}
```

### List Conversion Jobs
```http
GET /audio/jobs
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "job-uuid",
      "content_id": "content-uuid",
      "status": "completed",
      "progress": 100,
      "created_at": "2024-10-22T...",
      "completed_at": "2024-10-22T...",
      "content_title": "My Book"
    }
  ]
}
```

---

## User Endpoints

### Get Profile
```http
GET /user/profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-10-22T..."
  }
}
```

### Update Profile
```http
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "newemail@example.com"
}
```

### Get Library
```http
GET /user/library?page=1&limit=20&favorites=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `favorites` (optional: true/false)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "content-uuid",
      "title": "My Book",
      "author": "Author Name",
      "type": "pdf",
      "word_count": 5000,
      "created_at": "2024-10-22T...",
      "is_favorite": true,
      "added_at": "2024-10-22T...",
      "position_seconds": 120,
      "duration_seconds": 300,
      "completed": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Add to Library
```http
POST /user/library
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content-uuid"
}
```

### Remove from Library
```http
DELETE /user/library/:contentId
Authorization: Bearer <token>
```

### Toggle Favorite
```http
POST /user/library/:contentId/favorite
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isFavorite": true
  }
}
```

### Update Playback Progress
```http
PUT /user/progress/:contentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "positionSeconds": 120,
  "durationSeconds": 300,
  "completed": false
}
```

### Get Playback Progress
```http
GET /user/progress/:contentId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "positionSeconds": 120,
    "durationSeconds": 300,
    "completed": false,
    "updatedAt": "2024-10-22T..."
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (async operation started)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (expired token)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Rate Limiting

- 100 requests per 15 minutes per IP
- Applies to all `/api/` routes
- Returns `429` when limit exceeded

---

## File Upload Limits

- Max file size: 50MB
- Supported formats: PDF, EPUB, TXT
- Content-Type: `multipart/form-data`

---

## Audio Configuration

### Voice IDs
- `en-US-JennyNeural` - Jenny (Female, US)
- `en-US-GuyNeural` - Guy (Male, US)
- `en-US-AriaNeural` - Aria (Female, US)
- `en-US-DavisNeural` - Davis (Male, US)
- `en-GB-SoniaNeural` - Sonia (Female, UK)
- `en-GB-RyanNeural` - Ryan (Male, UK)

### Speed Range
- Min: `0.5` (half speed)
- Default: `1.0` (normal)
- Max: `2.0` (double speed)

### Pitch Range
- Min: `-50` (lower pitch)
- Default: `0` (normal)
- Max: `50` (higher pitch)

---

## Testing with cURL

### Complete Flow Example

```bash
# 1. Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 2. Login (save the token)
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')

# 3. Upload content
CONTENT_ID=$(curl -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@book.pdf" \
  -F "title=My Book" \
  | jq -r '.data.id')

# 4. Convert to audio
JOB_ID=$(curl -X POST http://localhost:3001/api/v1/audio/convert \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\":\"$CONTENT_ID\",\"voiceId\":\"en-US-JennyNeural\",\"config\":{\"speed\":1.0,\"pitch\":0}}" \
  | jq -r '.data.jobId')

# 5. Check status
curl http://localhost:3001/api/v1/audio/status/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

For more details, see README.md and SETUP.md.
