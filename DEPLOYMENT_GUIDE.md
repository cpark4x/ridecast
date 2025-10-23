# Ridecast - Complete Deployment Guide

**Version:** 1.0.0
**Last Updated:** October 22, 2025
**Status:** Ready for Production (with security hardening)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment](#production-deployment)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Ridecast is a full-stack text-to-speech platform that converts books and documents into personalized audio experiences optimized for commutes.

### Tech Stack

**Frontend:**
- Next.js 15.5.4 (React 19)
- TypeScript
- TailwindCSS 4
- Dexie (IndexedDB for offline storage)
- Zustand (state management)

**Backend:**
- Node.js 18+ with TypeScript
- Express.js
- PostgreSQL 16
- Redis 7
- Bull (job queue)
- Microsoft Azure Cognitive Services (TTS)
- AWS S3 (file storage)

**Deployment:**
- Frontend: Vercel
- Backend: Railway, Render, or AWS ECS
- Database: Neon, Supabase, or AWS RDS
- Redis: Upstash or Redis Cloud

---

## Architecture

```
┌──────────────────┐
│   Vercel Edge    │
│   Next.js App    │
└────────┬─────────┘
         │ HTTPS/REST
         ▼
┌──────────────────┐     ┌──────────────┐
│  Railway/Render  │────▶│   Neon PG    │
│  Node.js API     │     │   Database   │
└────────┬─────────┘     └──────────────┘
         │
         ├──────▶ ┌──────────────┐
         │        │  Upstash     │
         │        │  Redis       │
         │        └──────────────┘
         │
         ├──────▶ ┌──────────────┐
         │        │  Azure TTS   │
         │        │  API         │
         │        └──────────────┘
         │
         └──────▶ ┌──────────────┐
                  │  AWS S3      │
                  │  Storage     │
                  └──────────────┘
```

---

## Prerequisites

### Required Accounts

1. **Azure Account** (for TTS API)
   - Create Azure Cognitive Services resource
   - Copy API key and region

2. **AWS Account** (for S3 storage)
   - Create S3 bucket
   - Create IAM user with S3 access
   - Copy access key and secret

3. **Vercel Account** (for frontend deployment)
   - Free tier works fine

4. **Railway/Render Account** (for backend)
   - Free tier available

5. **Neon/Supabase** (for PostgreSQL)
   - Free tier with 0.5GB storage

6. **Upstash** (for Redis)
   - Free tier with 10K commands/day

### Local Development Tools

- Node.js 18+ and npm
- Docker & Docker Compose (optional, for local DB)
- Git
- Code editor (VS Code recommended)

---

## Local Development Setup

### Step 1: Clone Repository

```bash
cd ~/dev/projects
git clone https://github.com/cpark4x/ridecast.git
cd ridecast
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**

```env
# Server
PORT=3001
NODE_ENV=development

# Database (use local Docker or Neon)
DATABASE_URL=postgresql://user:password@localhost:5432/ridecast

# Redis (use local Docker or Upstash)
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Azure TTS
AZURE_SPEECH_KEY=your-azure-key-here
AZURE_SPEECH_REGION=eastus

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-here
AWS_S3_BUCKET=ridecast-dev
AWS_REGION=us-east-1

# CORS (frontend URL)
CORS_ORIGIN=http://localhost:3000

# Security
BCRYPT_ROUNDS=12
```

### Step 3: Start Database (Option A: Docker)

```bash
# From backend directory
docker compose up -d

# Verify services are running
docker compose ps
```

### Step 3: Start Database (Option B: Neon/Supabase)

1. Create Neon project at https://neon.tech
2. Copy connection string
3. Update `DATABASE_URL` in `.env`

### Step 4: Run Database Migrations

```bash
npm run migrate
```

### Step 5: Start Backend Server

```bash
npm run dev
```

Backend should be running at http://localhost:3001

### Step 6: Frontend Setup

```bash
# Open new terminal
cd ../web

# Install dependencies
npm install

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
EOF

# Start development server
npm run dev
```

Frontend should be running at http://localhost:3000

### Step 7: Test the Application

1. Open http://localhost:3000
2. Register a new user
3. Upload a `.txt` file
4. Select a voice and convert to audio
5. Listen to the generated audio

---

## Production Deployment

### Backend Deployment (Railway)

#### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link to backend directory
cd backend
railway link
```

#### 2. Add Environment Variables

In Railway dashboard, add all production environment variables:

```env
NODE_ENV=production
DATABASE_URL=<your-neon-postgres-url>
REDIS_URL=<your-upstash-redis-url>
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
AZURE_SPEECH_KEY=<your-azure-key>
AZURE_SPEECH_REGION=eastus
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_S3_BUCKET=ridecast-prod
AWS_REGION=us-east-1
CORS_ORIGIN=https://your-domain.vercel.app
```

#### 3. Deploy

```bash
railway up
```

#### 4. Run Migrations

```bash
railway run npm run migrate
```

Your backend will be available at: `https://your-app.railway.app`

### Frontend Deployment (Vercel)

#### 1. Connect GitHub Repository

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Select the `web` directory as root

#### 2. Configure Environment Variables

In Vercel project settings, add:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

#### 3. Deploy

Vercel will automatically deploy on push to main branch.

Your frontend will be available at: `https://your-app.vercel.app`

### Database Setup (Neon)

1. Go to https://neon.tech
2. Create new project
3. Create database named `ridecast`
4. Copy connection string
5. Run migrations:

```bash
DATABASE_URL=<your-neon-url> npm run migrate
```

### Redis Setup (Upstash)

1. Go to https://upstash.com
2. Create new Redis database
3. Copy connection string (starts with `rediss://`)
4. Add to backend environment variables

### S3 Bucket Setup

```bash
# Create S3 bucket
aws s3 mb s3://ridecast-prod

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket ridecast-prod \
  --server-side-encryption-configuration \
  '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

# Set private ACL
aws s3api put-bucket-acl --bucket ridecast-prod --acl private

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ridecast-prod \
  --versioning-configuration Status=Enabled
```

---

## Security Hardening

### Critical Security Tasks (Before Production)

#### 1. Generate Strong JWT Secrets

```bash
# Generate 32-byte secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Configure CORS Properly

In production, NEVER use wildcard `*`:

```typescript
// backend/src/server.ts
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

#### 3. Enable S3 Encryption

Update `backend/src/services/content/s3Client.ts`:

```typescript
const params: AWS.S3.PutObjectRequest = {
  Bucket: BUCKET_NAME,
  Key: key,
  Body: fileContent,
  ContentType: contentType || 'application/octet-stream',
  ServerSideEncryption: 'AES256',  // Add this
  ACL: 'private'  // Add this
};
```

#### 4. Implement Token Rotation

See zen-architect review for full implementation details.

#### 5. Add Rate Limiting Per User

```typescript
// backend/src/shared/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // per user
  keyGenerator: (req: any) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### 6. Environment Validation

Add to `backend/src/server.ts`:

```typescript
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'AZURE_SPEECH_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate secret strength
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  if (process.env.JWT_REFRESH_SECRET!.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
  }
}

validateEnvironment();
```

### SSL/TLS Configuration

- ✅ Vercel provides automatic HTTPS for frontend
- ✅ Railway provides automatic HTTPS for backend
- ✅ All traffic should be HTTPS in production
- ❌ Disable HTTP connections in production

### Password Requirements

Update `backend/src/services/auth/schemas.ts`:

```typescript
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    }),
  name: Joi.string().optional()
});
```

---

## Monitoring & Maintenance

### Health Checks

Add to `backend/src/server.ts`:

```typescript
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok'
  };
  res.json(health);
});

app.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await query('SELECT 1');

    // Check Redis
    await redisClient.ping();

    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error });
  }
});
```

### Logging

Winston is configured. Logs are written to:
- Console (all levels)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

**In production**, send logs to:
- Datadog
- LogDNA
- CloudWatch
- Or similar service

### Monitoring Services

Recommended additions:

1. **APM (Application Performance Monitoring)**
   - New Relic (free tier available)
   - DataDog APM
   - Elastic APM

2. **Error Tracking**
   - Sentry (already configured in code)
   - Rollbar
   - Bugsnag

3. **Uptime Monitoring**
   - UptimeRobot (free)
   - Pingdom
   - StatusCake

### Database Backups

**Neon:** Automatic daily backups included

**Manual backup:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**Restore:**
```bash
psql $DATABASE_URL < backup-20251022.sql
```

### Performance Monitoring

**Key Metrics to Track:**

1. **API Response Times**
   - Target: p95 < 500ms
   - Monitor: `/api/v1/content/upload`

2. **TTS Conversion Time**
   - Target: < 60 seconds for average book chapter
   - Monitor: Bull queue processing time

3. **Database Query Performance**
   - Target: p95 < 100ms
   - Monitor: Slow query log

4. **Cache Hit Rate**
   - Target: > 80% for audio cache
   - Monitor: Audio cache access_count

5. **Error Rate**
   - Target: < 1% of requests
   - Monitor: Error logs

---

## Troubleshooting

### Common Issues

#### Backend won't start

**Error:** `Cannot connect to database`

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
railway variables

# Check logs
railway logs
```

#### TTS conversion fails

**Error:** `Azure TTS authentication failed`

**Solution:**
```bash
# Verify Azure credentials
echo $AZURE_SPEECH_KEY

# Test Azure API
curl -X POST "https://$AZURE_SPEECH_REGION.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY" \
  -H "Content-Type: application/ssml+xml" \
  -d '<speak version="1.0" xml:lang="en-US"><voice name="en-US-JennyNeural">Test</voice></speak>'
```

#### S3 upload fails

**Error:** `Access Denied`

**Solution:**
```bash
# Test S3 credentials
aws s3 ls s3://$AWS_S3_BUCKET --profile default

# Check IAM permissions - needs:
# - s3:PutObject
# - s3:GetObject
# - s3:DeleteObject
```

#### Frontend can't connect to backend

**Error:** `CORS policy blocked`

**Solution:**
1. Verify `CORS_ORIGIN` includes frontend URL
2. Check frontend `NEXT_PUBLIC_API_URL` is correct
3. Ensure both use HTTPS in production

### Debug Mode

Enable verbose logging:

```bash
# Backend
LOG_LEVEL=debug npm run dev

# Check Bull queue
redis-cli
> KEYS bull:*
> LLEN bull:audio-conversion:active
```

### Database Issues

**Reset database:**
```bash
# ⚠️ CAUTION: Deletes all data
npm run migrate:rollback
npm run migrate
```

**Check connection pool:**
```typescript
// Add to server startup
logger.info('Database pool', {
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount
});
```

---

## Maintenance Tasks

### Weekly

- [ ] Review error logs
- [ ] Check disk space usage
- [ ] Monitor cache hit rates
- [ ] Review security alerts

### Monthly

- [ ] Update dependencies (`npm outdated`)
- [ ] Review performance metrics
- [ ] Backup database
- [ ] Audit user activity
- [ ] Review TTS costs

### Quarterly

- [ ] Security audit
- [ ] Load testing
- [ ] Documentation updates
- [ ] Dependency upgrades

---

## Cost Estimation

### Production Costs (1000 active users)

**Infrastructure:**
- Railway (backend): $5-20/month
- Neon (database): Free tier or $19/month
- Upstash (Redis): Free tier or $10/month
- Vercel (frontend): Free tier
- **Total Infrastructure:** $5-50/month

**Services:**
- Azure TTS: $16/1M characters (~$480/month for 1000 users at 30 conversions each)
- AWS S3: $0.023/GB storage + $0.09/GB transfer (~$20/month)
- **Total Services:** $500/month

**Optimization:**
With 90% cache hit rate: $48/month (TTS only)

**Total Monthly Cost:** $50-100/month with caching

---

## Next Steps

### Before Production Launch

1. ✅ Complete security hardening checklist
2. ✅ Add comprehensive test suite
3. ✅ Set up monitoring and alerting
4. ✅ Configure error tracking
5. ✅ Load testing
6. ✅ Create runbook for operations team
7. ✅ Set up staging environment
8. ✅ Document incident response procedures

### Post-Launch

1. Monitor error rates and performance
2. Gather user feedback
3. Optimize based on usage patterns
4. Add features from product backlog

---

## Support

For issues or questions:

1. Check this deployment guide
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Check [API.md](./backend/API.md)
4. Review code review: [IMPLEMENTATION_REPORT.md](./backend/IMPLEMENTATION_REPORT.md)
5. GitHub Issues: https://github.com/cpark4x/ridecast/issues

---

**Last Updated:** October 22, 2025
**Maintainer:** Ridecast Team
**Version:** 1.0.0
