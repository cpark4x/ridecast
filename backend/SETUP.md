# Ridecast Backend - Setup Guide

Complete step-by-step guide to set up and run the Ridecast backend.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install all required packages including:
- Express.js
- TypeScript
- PostgreSQL client
- Redis client
- Azure TTS SDK
- AWS SDK
- Bull queue
- And more...

### 2. Configure Environment Variables

The `.env` file has been created with development defaults. You need to update:

**Azure TTS Configuration:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Create a Cognitive Services resource (Speech)
3. Copy the API key and region
4. Update in `.env`:
   ```
   AZURE_SPEECH_KEY=your-actual-azure-key
   AZURE_SPEECH_REGION=eastus  # or your region
   ```

**AWS S3 Configuration:**
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create an IAM user with S3 permissions
3. Create an S3 bucket (e.g., `ridecast-content`)
4. Update in `.env`:
   ```
   AWS_ACCESS_KEY_ID=your-actual-aws-key
   AWS_SECRET_ACCESS_KEY=your-actual-aws-secret
   AWS_S3_BUCKET=your-bucket-name
   AWS_REGION=us-east-1  # or your region
   ```

**JWT Secrets (Production):**
For production, generate secure random strings:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Database Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

Verify they're running:
```bash
docker-compose ps
```

You should see both services as "Up".

### 4. Run Database Migrations

```bash
npm run migrate
```

This creates all database tables:
- users
- content
- audio_cache
- conversion_jobs
- user_library
- playback_progress

### 5. Start Development Server

```bash
npm run dev
```

You should see:
```
Server started on port 3001
Environment: development
Health check: http://localhost:3001/health
```

### 6. Test the Server

Open your browser or use curl:
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

## Troubleshooting

### PostgreSQL Connection Issues

**Error:** `Connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Issues

**Error:** `ECONNREFUSED`

**Solution:**
```bash
# Check if Redis is running
docker-compose ps

# Test Redis connection
docker exec -it ridecast-redis redis-cli ping
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

### Migration Fails

**Error:** `relation already exists`

This means migrations have already been run. To reset:

```bash
# Stop and remove database
docker-compose down -v

# Restart database
docker-compose up -d

# Wait a few seconds, then run migrations
npm run migrate
```

### TypeScript Compilation Errors

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npx tsc --version
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=3002
```

## Next Steps

### 1. Test API Endpoints

Use the provided Postman collection or test manually:

**Register a user:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response for authenticated requests.

### 2. Upload Content

```bash
curl -X POST http://localhost:3001/api/v1/content/upload \
  -H "Authorization: Bearer <your-access-token>" \
  -F "file=@/path/to/your/file.pdf" \
  -F "title=My Book"
```

### 3. Convert to Audio

```bash
curl -X POST http://localhost:3001/api/v1/audio/convert \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "<content-id>",
    "voiceId": "en-US-JennyNeural",
    "config": {
      "speed": 1.0,
      "pitch": 0
    }
  }'
```

### 4. Check Conversion Status

```bash
curl http://localhost:3001/api/v1/audio/status/<job-id> \
  -H "Authorization: Bearer <your-access-token>"
```

## Production Deployment

### Environment Variables

Update `.env` for production:
- Use strong JWT secrets
- Set `NODE_ENV=production`
- Configure production database URL
- Use production Redis URL
- Set proper CORS_ORIGIN

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
npm start
```

### Using PM2 (Process Manager)

```bash
npm install -g pm2

pm2 start dist/server.js --name ridecast-backend
pm2 save
pm2 startup
```

### Docker Production Deployment

Create a production `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

Build and run:
```bash
docker build -t ridecast-backend .
docker run -p 3001:3001 --env-file .env ridecast-backend
```

## Database Management

### Connect to PostgreSQL

```bash
docker exec -it ridecast-postgres psql -U ridecast -d ridecast
```

Common queries:
```sql
-- List all tables
\dt

-- Count users
SELECT COUNT(*) FROM users;

-- View recent content
SELECT id, title, created_at FROM content ORDER BY created_at DESC LIMIT 10;

-- Check audio cache
SELECT voice_id, COUNT(*), SUM(file_size_bytes) FROM audio_cache GROUP BY voice_id;
```

### Connect to Redis

```bash
docker exec -it ridecast-redis redis-cli
```

Common commands:
```redis
# Check keys
KEYS *

# Monitor queue
LLEN bull:audio-conversion:wait

# View job data
GET bull:audio-conversion:1
```

## Monitoring

### View Logs

Development logs are in console. Production logs:

```bash
# Error logs
tail -f logs/error.log

# All logs
tail -f logs/combined.log
```

### Queue Monitoring

Install Bull Board for visual queue monitoring:

```bash
npm install @bull-board/express
```

Then add to `server.ts` for development.

## Support

For issues or questions:
1. Check logs: `logs/error.log`
2. Verify environment variables
3. Check database connectivity
4. Review API documentation in README.md

---

Happy coding!
