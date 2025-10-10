---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: technical
---

# Ridecast Technical Architecture

## System Overview

Ridecast is a mobile-first application with cloud backend services, designed for offline-first operation with seamless sync capabilities.

---

## Architecture Principles

1. **Offline-First**: Core functionality works without internet
2. **Mobile-Native**: Leverage platform capabilities (iOS/Android)
3. **Scalable**: Handle growth from hundreds to millions of users
4. **Cost-Efficient**: Optimize for TTS API costs and storage
5. **Privacy-Focused**: Minimize data collection, local processing when possible

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   iOS App    │    │ Android App  │                  │
│  │              │    │              │                  │
│  │ SwiftUI      │    │ Kotlin/      │                  │
│  │ AVFoundation │    │ Jetpack      │                  │
│  │ CarPlay      │    │ Android Auto │                  │
│  └──────────────┘    └──────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│              (Authentication, Rate Limiting)             │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Backend Services                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐     │
│  │ Auth       │  │ Content    │  │ Conversion   │     │
│  │ Service    │  │ Service    │  │ Service      │     │
│  └────────────┘  └────────────┘  └──────────────┘     │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐     │
│  │ User       │  │ Sync       │  │ Analytics    │     │
│  │ Service    │  │ Service    │  │ Service      │     │
│  └────────────┘  └────────────┘  └──────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐     │
│  │ PostgreSQL │  │ Redis      │  │ Object       │     │
│  │ (Metadata) │  │ (Cache)    │  │ Storage      │     │
│  │            │  │            │  │ (S3/GCS)     │     │
│  └────────────┘  └────────────┘  └──────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                 External Services                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐     │
│  │ TTS API    │  │ CDN        │  │ Push         │     │
│  │ (ElevenLabs│  │ (CloudFlare│  │ Notifications│     │
│  │ /Azure)    │  │ /Fastly)   │  │ (FCM/APNs)   │     │
│  └────────────┘  └────────────┘  └──────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Client Architecture (Mobile Apps)

### iOS App Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                            │
├─────────────────────────────────────────────────────────┤
│  SwiftUI Views                                          │
│  ├─ LibraryView                                         │
│  ├─ NowPlayingView                                      │
│  ├─ VoiceSelectionView                                  │
│  ├─ CarModeView                                         │
│  └─ SettingsView                                        │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Business Logic Layer                   │
├─────────────────────────────────────────────────────────┤
│  ViewModels (ObservableObject)                          │
│  ├─ LibraryViewModel                                    │
│  ├─ PlaybackViewModel                                   │
│  ├─ ConversionViewModel                                 │
│  └─ SyncViewModel                                       │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
├─────────────────────────────────────────────────────────┤
│  ├─ AudioPlayerService (AVFoundation)                   │
│  ├─ DownloadService (URLSession background)             │
│  ├─ SyncService (CloudKit/custom backend)               │
│  ├─ ConversionService (API client)                      │
│  └─ VoiceCommandService (SiriKit)                       │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
├─────────────────────────────────────────────────────────┤
│  ├─ CoreData (local database)                           │
│  ├─ FileManager (audio file storage)                    │
│  ├─ Keychain (secure credentials)                       │
│  └─ UserDefaults (preferences)                          │
└─────────────────────────────────────────────────────────┘
```

### Key iOS Technologies
- **UI**: SwiftUI
- **Audio Playback**: AVFoundation (AVPlayer, AVAudioSession)
- **CarPlay**: CarPlay framework
- **Background Tasks**: BackgroundTasks framework
- **Database**: Core Data or Realm
- **Networking**: URLSession with async/await
- **Voice**: SiriKit Media Intents

---

### Android App Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                            │
├─────────────────────────────────────────────────────────┤
│  Jetpack Compose UI                                     │
│  ├─ LibraryScreen                                       │
│  ├─ NowPlayingScreen                                    │
│  ├─ VoiceSelectionScreen                                │
│  ├─ CarModeScreen                                       │
│  └─ SettingsScreen                                      │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   ViewModel Layer                        │
├─────────────────────────────────────────────────────────┤
│  ViewModels (AndroidX ViewModel)                        │
│  ├─ LibraryViewModel                                    │
│  ├─ PlaybackViewModel                                   │
│  ├─ ConversionViewModel                                 │
│  └─ SyncViewModel                                       │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Repository Layer                       │
├─────────────────────────────────────────────────────────┤
│  ├─ AudioRepository                                     │
│  ├─ ContentRepository                                   │
│  ├─ UserRepository                                      │
│  └─ SyncRepository                                      │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
├─────────────────────────────────────────────────────────┤
│  ├─ AudioPlayerService (ExoPlayer)                      │
│  ├─ DownloadService (WorkManager)                       │
│  ├─ SyncService (background sync)                       │
│  ├─ AndroidAutoService                                  │
│  └─ VoiceCommandService (Google Assistant)              │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
├─────────────────────────────────────────────────────────┤
│  ├─ Room Database (local database)                      │
│  ├─ File System (audio file storage)                    │
│  ├─ EncryptedSharedPreferences                          │
│  └─ DataStore (preferences)                             │
└─────────────────────────────────────────────────────────┘
```

### Key Android Technologies
- **UI**: Jetpack Compose
- **Audio Playback**: ExoPlayer (Media3)
- **Android Auto**: Android Auto framework
- **Background Work**: WorkManager
- **Database**: Room (SQLite wrapper)
- **Networking**: Retrofit + OkHttp
- **Voice**: Google Assistant App Actions
- **Architecture**: MVVM with Clean Architecture principles

---

## Backend Architecture

### Service Breakdown

#### 1. Auth Service
**Responsibilities:**
- User registration and login
- JWT token generation and validation
- OAuth integration (Google, Apple Sign-In)
- Session management

**Tech Stack:**
- Language: Node.js or Go
- Framework: Express.js or Gin
- Auth: Firebase Auth, Auth0, or custom JWT

#### 2. Content Service
**Responsibilities:**
- Content upload and validation
- Metadata extraction (title, author, cover)
- Text extraction from EPUB, PDF, TXT
- Content storage and retrieval

**Tech Stack:**
- Language: Python (for text processing)
- Libraries: ebooklib, PyPDF2, BeautifulSoup
- Storage: S3 or Google Cloud Storage

#### 3. Conversion Service
**Responsibilities:**
- Text-to-speech conversion
- Voice selection and application
- Audio file generation
- Job queue management

**Tech Stack:**
- Language: Python or Node.js
- Queue: RabbitMQ, AWS SQS, or Redis Queue
- TTS API: ElevenLabs, Azure Neural TTS, or Google Cloud TTS
- Storage: S3 for generated audio files

#### 4. User Service
**Responsibilities:**
- User profile management
- Preferences storage
- Listening history
- Statistics and analytics

**Tech Stack:**
- Language: Node.js or Go
- Database: PostgreSQL
- Cache: Redis

#### 5. Sync Service
**Responsibilities:**
- Cross-device library sync
- Progress sync
- Conflict resolution
- Real-time updates (WebSocket)

**Tech Stack:**
- Language: Node.js (for WebSocket support)
- Database: PostgreSQL
- Real-time: WebSocket or Firebase Realtime Database

#### 6. Analytics Service
**Responsibilities:**
- Event tracking
- User behavior analysis
- Performance monitoring
- Error logging

**Tech Stack:**
- Analytics: Mixpanel, Amplitude, or custom
- Logging: Sentry for error tracking
- Monitoring: Datadog or New Relic

---

## Data Models

### Database Schema (PostgreSQL)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  subscription_tier VARCHAR(50) DEFAULT 'free'
);
```

#### Content Table
```sql
CREATE TABLE content (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  content_type VARCHAR(50), -- book, article, pdf
  file_url TEXT,
  cover_url TEXT,
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) -- uploaded, processing, completed, error
);
```

#### Audio Table
```sql
CREATE TABLE audio (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  voice_id VARCHAR(100),
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Playback Progress Table
```sql
CREATE TABLE playback_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  audio_id UUID REFERENCES audio(id),
  position_seconds FLOAT,
  last_updated TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, audio_id)
);
```

#### Voices Table
```sql
CREATE TABLE voices (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(20),
  style VARCHAR(50),
  accent VARCHAR(50),
  description TEXT,
  preview_url TEXT,
  rating FLOAT,
  usage_count INTEGER DEFAULT 0
);
```

---

## API Design

### REST API Endpoints

#### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

#### Content Management
```
POST   /api/v1/content/upload
GET    /api/v1/content/:id
GET    /api/v1/content/library
DELETE /api/v1/content/:id
PATCH  /api/v1/content/:id
```

#### Conversion
```
POST   /api/v1/conversion/start
GET    /api/v1/conversion/:jobId/status
GET    /api/v1/conversion/:jobId/result
```

#### Voices
```
GET    /api/v1/voices
GET    /api/v1/voices/:id
GET    /api/v1/voices/:id/preview
```

#### User & Sync
```
GET    /api/v1/user/profile
PATCH  /api/v1/user/profile
GET    /api/v1/user/library
POST   /api/v1/sync/progress
GET    /api/v1/sync/progress
```

### WebSocket API
```
WS     /ws/sync
```

**Events:**
- `progress_update`: Sync playback progress
- `library_changed`: Library item added/removed
- `conversion_complete`: Audio conversion finished

---

## Audio Pipeline

### Conversion Flow

```
1. User uploads content
   ↓
2. Content Service validates and extracts text
   ↓
3. Text is chunked (by chapter/section)
   ↓
4. Conversion job queued
   ↓
5. Conversion Service picks up job
   ↓
6. For each chunk:
   a. Send text to TTS API
   b. Receive audio segment
   c. Store segment temporarily
   ↓
7. Concatenate all segments into single file
   ↓
8. Add chapter markers and metadata
   ↓
9. Upload final audio to object storage
   ↓
10. Update database with audio URL
   ↓
11. Notify client via WebSocket/push notification
```

### Audio Format Specifications
- **Format**: AAC (M4A) or MP3
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128 kbps (standard), 256 kbps (high quality)
- **Channels**: Stereo
- **Metadata**: ID3v2 tags (title, artist, album, chapter markers)

---

## Scalability Considerations

### Horizontal Scaling
- Stateless backend services (easy to scale horizontally)
- Load balancer for API gateway
- Auto-scaling groups based on CPU/memory

### Database Scaling
- Read replicas for PostgreSQL
- Connection pooling
- Sharding by user_id (if needed at scale)

### Caching Strategy
- Redis for:
  - Session tokens
  - Voice metadata
  - Frequently accessed user data
- CDN for:
  - Audio files
  - Voice preview files
  - Cover images

### Cost Optimization
- TTS API costs are the main concern
- Cache generated audio indefinitely
- Deduplication: Same book + same voice = reuse audio
- Batch processing to reduce API calls

---

## Security

### Authentication & Authorization
- JWT tokens with short expiration (15 min)
- Refresh tokens (longer lived)
- Role-based access control (RBAC)

### Data Security
- Encryption at rest (S3 server-side encryption)
- Encryption in transit (HTTPS/TLS 1.3)
- Secure credential storage (AWS Secrets Manager)

### API Security
- Rate limiting (per user, per IP)
- Input validation and sanitization
- CORS configuration
- API key rotation

### Privacy
- GDPR compliance (data export, deletion)
- Minimal data collection
- Anonymous analytics where possible
- User consent for tracking

---

## Monitoring & Observability

### Metrics to Track
- API latency and error rates
- Conversion job success/failure rates
- Audio playback errors
- User retention and engagement
- Storage usage and costs

### Logging
- Structured logging (JSON format)
- Log aggregation (ELK stack, CloudWatch)
- Error tracking (Sentry)

### Alerts
- High error rates
- Conversion service failures
- Database connection issues
- High API costs (TTS usage)

---

## Deployment

### Infrastructure
- **Cloud Provider**: AWS, Google Cloud, or Azure
- **Containerization**: Docker
- **Orchestration**: Kubernetes or ECS
- **CI/CD**: GitHub Actions, CircleCI, or GitLab CI

### Environments
- **Development**: Local and staging
- **Staging**: Pre-production testing
- **Production**: Live environment

### Database Migrations
- Automated migrations (Flyway, Liquibase)
- Rollback capability
- Zero-downtime deployments

---

## Technology Decision Rationale

(See StackDecisionLog.md for detailed reasoning)

**Mobile:**
- SwiftUI (iOS): Modern, declarative, Apple-recommended
- Jetpack Compose (Android): Modern, declarative, Google-recommended

**Backend:**
- Node.js: Fast, async I/O, large ecosystem
- PostgreSQL: Relational data, strong consistency
- Redis: Fast caching and session storage

**TTS API:**
- ElevenLabs: Best quality, natural voices
- Azure Neural TTS: Good quality, lower cost
- (Decision pending in StackDecisionLog.md)

**Hosting:**
- AWS or Google Cloud: Mature, scalable, full-featured
- (Decision pending in StackDecisionLog.md)
