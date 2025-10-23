# Ridecast Backend API

A complete Node.js/TypeScript backend with modular microservices architecture for text-to-speech content conversion.

## Features

- **Authentication Service**: User registration, login with JWT tokens
- **Content Service**: File upload (PDF, EPUB, TXT), text extraction, S3 storage
- **Audio Service**: Azure Neural TTS integration, background job queue, audio caching
- **User Service**: Profile management, library, playback progress tracking, cross-device sync

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Bull
- **Text-to-Speech**: Azure Cognitive Services
- **Storage**: AWS S3
- **Security**: JWT, bcrypt, Helmet, CORS, rate limiting

## Project Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── auth/           # Authentication service
│   │   ├── content/        # Content upload and storage
│   │   ├── audio/          # TTS conversion and audio generation
│   │   └── user/           # User profiles and library
│   ├── shared/
│   │   ├── types/          # Shared TypeScript types
│   │   ├── middleware/     # Auth, validation, error handling
│   │   └── utils/          # Common utilities
│   ├── config/
│   │   ├── database.ts     # PostgreSQL config
│   │   ├── redis.ts        # Redis config
│   │   └── azure-tts.ts    # Azure TTS config
│   └── server.ts           # Main entry point
├── migrations/             # Database migrations
├── scripts/                # Utility scripts
├── package.json
├── tsconfig.json
└── docker-compose.yml      # Local dev with Postgres + Redis
```

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local development)
- PostgreSQL 16+
- Redis 7+
- Azure Cognitive Services account (for TTS)
- AWS account (for S3 storage)

## Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database connection string
- Redis URL
- JWT secrets (generate secure random strings)
- Azure Speech API key and region
- AWS credentials and S3 bucket

### 3. Start Database Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

Check health: `http://localhost:3001/health`

## API Endpoints

### Authentication (`/api/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user
- `GET /me` - Get current user

### Content (`/api/v1/content`)

- `POST /upload` - Upload content file (PDF, EPUB, TXT)
- `GET /` - List all content (with pagination)
- `GET /:id` - Get specific content
- `DELETE /:id` - Delete content

### Audio (`/api/v1/audio`)

- `POST /convert` - Start audio conversion job
- `GET /status/:jobId` - Get conversion job status
- `GET /jobs` - List all conversion jobs
- `GET /voices` - Get available TTS voices

### User (`/api/v1/user`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `GET /library` - Get user library (with pagination)
- `POST /library` - Add content to library
- `DELETE /library/:contentId` - Remove from library
- `POST /library/:contentId/favorite` - Toggle favorite
- `GET /progress/:contentId` - Get playback progress
- `PUT /progress/:contentId` - Update playback progress

## Authentication

Most endpoints require authentication. Include JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

## Key Features

### Content-Based Audio Caching

Audio is cached based on SHA-256 hash of (text + voice + config). Identical content with same voice settings uses cached audio, saving processing time and costs.

### Background Job Queue

Audio conversion runs in background using Bull queue with Redis. Supports:
- Job status tracking
- Progress updates
- Error handling and retry logic

### Text Chunking

Long texts are chunked into 5-10 minute segments for optimal TTS processing.

### Cross-Device Sync

Playback progress is stored in PostgreSQL, enabling seamless sync across devices.

## Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Database Management

Run migrations:
```bash
npm run migrate
```

Connect to PostgreSQL:
```bash
docker exec -it ridecast-postgres psql -U ridecast -d ridecast
```

Connect to Redis:
```bash
docker exec -it ridecast-redis redis-cli
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `AZURE_SPEECH_KEY` - Azure Cognitive Services API key
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Helmet for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Input validation with Joi
- SQL injection protection via parameterized queries

## Error Handling

All errors return consistent JSON format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Success responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Logging

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

## Troubleshooting

### Database connection issues

Ensure PostgreSQL is running:
```bash
docker-compose ps
```

### Redis connection issues

Check Redis connectivity:
```bash
docker exec -it ridecast-redis redis-cli ping
```

### Azure TTS errors

Verify your Azure Speech API key and region are correct in `.env`.

### S3 upload errors

Ensure AWS credentials have proper S3 permissions.

## License

MIT

---

Built with Node.js, TypeScript, Express, PostgreSQL, Redis, Azure TTS, and AWS S3.
