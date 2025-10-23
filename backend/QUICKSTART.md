# Ridecast Backend - Quick Start Guide

Get the Ridecast backend running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Docker installed and running

## Steps

### 1. Install Dependencies (2 min)

```bash
cd /Users/chrispark/dev/projects/ridecast/backend
npm install
```

This installs ~30 packages including Express, TypeScript, PostgreSQL, Redis, Azure TTS, and more.

### 2. Configure Credentials (1 min)

Edit `/Users/chrispark/dev/projects/ridecast/backend/.env`:

```bash
# Replace these with your actual credentials:
AZURE_SPEECH_KEY=your-actual-azure-key
AZURE_SPEECH_REGION=eastus

AWS_ACCESS_KEY_ID=your-actual-aws-key
AWS_SECRET_ACCESS_KEY=your-actual-aws-secret
AWS_S3_BUCKET=your-bucket-name
```

**Don't have credentials yet?**
- Azure TTS: https://portal.azure.com (Create Speech resource)
- AWS S3: https://console.aws.amazon.com (Create IAM user + S3 bucket)

### 3. Start Database Services (30 sec)

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis in Docker containers.

Verify:
```bash
docker-compose ps
```

You should see both services as "Up".

### 4. Run Database Migrations (10 sec)

```bash
npm run migrate
```

This creates 6 database tables (users, content, audio_cache, etc.).

### 5. Start Backend Server (5 sec)

```bash
npm run dev
```

You should see:
```
Server started on port 3001
Environment: development
Health check: http://localhost:3001/health
```

### 6. Test It! (30 sec)

Open http://localhost:3001/health or:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-10-22T...",
  "uptime": 1.234
}
```

## You're Done!

The backend is now running on **http://localhost:3001**

## Next Steps

### Test the API

```bash
# Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login (save the token)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Upload Content

```bash
# Upload a PDF/EPUB/TXT file
curl -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer <your-access-token>" \
  -F "file=@/path/to/your/book.pdf" \
  -F "title=My Book"
```

### Convert to Audio

```bash
# Start TTS conversion
curl -X POST http://localhost:3001/api/v1/audio/convert \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "<content-id-from-upload>",
    "voiceId": "en-US-JennyNeural",
    "config": {"speed": 1.0, "pitch": 0}
  }'

# Check conversion status
curl http://localhost:3001/api/v1/audio/status/<job-id> \
  -H "Authorization: Bearer <your-access-token>"
```

## Available API Endpoints

See **API.md** for complete documentation.

**Authentication:** `/api/v1/auth/*`
**Content:** `/api/v1/content/*`
**Audio:** `/api/v1/audio/*`
**User:** `/api/v1/user/*`

## Troubleshooting

### "Cannot connect to database"
```bash
docker-compose restart postgres
```

### "Redis connection failed"
```bash
docker-compose restart redis
```

### "Port 3001 already in use"
Change PORT in `.env`:
```
PORT=3002
```

### "Migration failed"
Reset database:
```bash
docker-compose down -v
docker-compose up -d
npm run migrate
```

## Documentation

- **SETUP.md** - Detailed setup instructions
- **API.md** - Complete API documentation
- **IMPLEMENTATION_REPORT.md** - Technical details
- **STRUCTURE.txt** - File structure overview

## Need Help?

1. Check logs: `logs/error.log`
2. Verify Docker is running: `docker ps`
3. Check environment variables: `cat .env`

---

Happy coding! The backend is ready for your frontend integration.
