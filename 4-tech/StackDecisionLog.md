---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: technical
---

# Stack Decision Log

This document tracks key technology decisions for Ridecast, including the rationale, alternatives considered, and trade-offs.

---

## Decision Log Format

Each decision includes:
- **Status**: Proposed / Decided / Deprecated
- **Context**: What problem are we solving?
- **Decision**: What did we choose?
- **Rationale**: Why did we choose it?
- **Alternatives**: What else did we consider?
- **Consequences**: Trade-offs and implications

---

## Mobile Platform

### Decision: Native iOS and Android Apps

**Status**: Decided

**Context**: Need mobile apps for iOS and Android with offline capabilities, audio playback, and CarPlay/Android Auto integration.

**Decision**: Build separate native apps for iOS (SwiftUI) and Android (Jetpack Compose).

**Rationale**:
- **Performance**: Audio playback requires native performance
- **Platform Integration**: Deep CarPlay/Android Auto integration
- **Offline-First**: Native file system and database access
- **Best UX**: Platform-specific design patterns and interactions

**Alternatives Considered**:
1. **React Native**
   - Pros: Single codebase, large community
   - Cons: Performance concerns for audio, CarPlay integration complex
2. **Flutter**
   - Pros: Single codebase, fast development
   - Cons: CarPlay/Android Auto support limited, audio libraries less mature
3. **Progressive Web App (PWA)**
   - Pros: No app store approval, cross-platform
   - Cons: No offline audio, no CarPlay support, poor performance

**Consequences**:
- ✅ Best performance and platform integration
- ✅ Access to latest platform features
- ❌ Requires maintaining two codebases
- ❌ Slower initial development (2x the work)
- ✅ Can leverage platform-specific APIs without workarounds

**Mitigation**: Share backend API client logic, design system, and product specs to reduce duplication.

---

## iOS UI Framework

### Decision: SwiftUI

**Status**: Decided

**Context**: Need to choose iOS UI framework for modern, maintainable app.

**Decision**: Use SwiftUI for all UI development.

**Rationale**:
- **Modern**: Apple's recommended framework going forward
- **Declarative**: Easier to reason about UI state
- **Performance**: Compiled, optimized by Apple
- **Maintainable**: Less boilerplate than UIKit
- **CarPlay**: Good CarPlay framework support

**Alternatives Considered**:
1. **UIKit**
   - Pros: Mature, well-documented, more Stack Overflow answers
   - Cons: More verbose, imperative style, not Apple's focus
2. **Hybrid (SwiftUI + UIKit)**
   - Pros: Use best of both
   - Cons: Complexity, interop overhead

**Consequences**:
- ✅ Future-proof choice
- ✅ Faster development with less code
- ❌ iOS 14+ only (acceptable for new app)
- ❌ Some advanced features still require UIKit interop

---

## Android UI Framework

### Decision: Jetpack Compose

**Status**: Decided

**Context**: Need to choose Android UI framework.

**Decision**: Use Jetpack Compose for all UI development.

**Rationale**:
- **Modern**: Google's recommended framework
- **Declarative**: Consistent with SwiftUI approach
- **Less Code**: ~30% less code vs XML layouts
- **Performance**: Optimized rendering
- **Android Auto**: Supported

**Alternatives Considered**:
1. **XML Layouts + Views**
   - Pros: Mature, more resources
   - Cons: Verbose, harder to maintain
2. **Hybrid (Compose + Views)**
   - Pros: Gradual migration
   - Cons: Complexity, not needed for new app

**Consequences**:
- ✅ Modern, maintainable codebase
- ✅ Faster UI development
- ❌ Android 5.0+ (API 21+) required (acceptable)
- ✅ Growing community and resources

---

## Text-to-Speech API

### Decision: To Be Decided

**Status**: Proposed

**Context**: Need high-quality TTS for audio generation. This is the most critical technical decision as it determines audio quality and cost.

**Candidates**:

#### 1. ElevenLabs
**Pros**:
- Highest quality, most natural-sounding voices
- Excellent prosody and emotion
- Multiple voices with distinct personalities
- Good API, well-documented

**Cons**:
- Most expensive (~$0.30 per 1K characters)
- Newer company (sustainability risk)
- Rate limits may be restrictive at scale

**Cost Estimate**: $45-60 to convert a 300-page book

#### 2. Azure Neural TTS
**Pros**:
- Very good quality (close to ElevenLabs)
- Microsoft backing (reliable)
- More affordable (~$16 per 1M characters)
- Many voice options
- Good API and SDKs

**Cons**:
- Slightly less natural than ElevenLabs
- Requires Azure account and setup

**Cost Estimate**: $4.80 to convert a 300-page book

#### 3. Google Cloud Text-to-Speech (WaveNet)
**Pros**:
- Good quality
- Affordable (~$16 per 1M characters)
- Reliable Google infrastructure
- Multiple languages

**Cons**:
- Quality not quite as good as Azure or ElevenLabs
- Fewer voice personalities

**Cost Estimate**: $4.80 to convert a 300-page book

#### 4. Amazon Polly (Neural)
**Pros**:
- Decent quality
- Affordable (~$16 per 1M characters)
- AWS integration (if using AWS)

**Cons**:
- Quality below Azure and ElevenLabs
- Fewer voice options
- Less natural prosody

**Cost Estimate**: $4.80 to convert a 300-page book

**Recommendation**: Start with Azure Neural TTS for balance of quality and cost. Evaluate ElevenLabs for premium tier later.

**Decision Needed By**: Before MVP development starts

---

## Backend Language/Framework

### Decision: Node.js with Express

**Status**: Proposed

**Context**: Need to choose backend technology for API services.

**Decision**: Use Node.js with Express framework.

**Rationale**:
- **JavaScript Everywhere**: Same language as potential admin web app
- **Async I/O**: Perfect for I/O-bound operations (API calls, DB queries)
- **Large Ecosystem**: npm packages for everything
- **Fast Development**: Quick to prototype and iterate
- **WebSocket Support**: Good for real-time sync

**Alternatives Considered**:
1. **Python (Django/Flask)**
   - Pros: Great for TTS processing, ML libraries
   - Cons: Slower for I/O, async support not as mature
2. **Go**
   - Pros: Fast, compiled, great concurrency
   - Cons: Smaller ecosystem, more verbose
3. **Ruby on Rails**
   - Pros: Rapid development, great for CRUD
   - Cons: Slower runtime, less modern

**Consequences**:
- ✅ Fast API responses
- ✅ Easy to hire Node.js developers
- ✅ Single language for full-stack (if building web admin)
- ❌ Less type safety (mitigated with TypeScript)
- ❌ CPU-intensive tasks slower (offload to Python services)

**Mitigation**: Use TypeScript for type safety. Use Python microservices for text processing.

---

## Database

### Decision: PostgreSQL

**Status**: Decided

**Context**: Need relational database for user data, content metadata, and progress tracking.

**Decision**: Use PostgreSQL as primary database.

**Rationale**:
- **Relational**: Data has clear relationships (users → content → audio)
- **ACID Compliance**: Important for user data and transactions
- **JSON Support**: Flexible for metadata and settings
- **Mature**: Battle-tested, excellent documentation
- **Scalable**: Can handle millions of users with proper indexing

**Alternatives Considered**:
1. **MySQL**
   - Pros: Popular, good performance
   - Cons: Less advanced features than Postgres
2. **MongoDB**
   - Pros: Flexible schema, good for rapid iteration
   - Cons: Eventual consistency issues, less suitable for transactional data
3. **Firebase Firestore**
   - Pros: Real-time, managed, good for mobile
   - Cons: Expensive at scale, vendor lock-in

**Consequences**:
- ✅ Strong data integrity
- ✅ Complex queries and joins
- ✅ Good tooling and ORMs
- ❌ Requires more setup than managed solutions
- ❌ Scaling requires planning (read replicas, connection pooling)

---

## Object Storage

### Decision: AWS S3 or Google Cloud Storage

**Status**: Proposed

**Context**: Need to store large audio files (GB per user potentially).

**Decision**: Use AWS S3 or Google Cloud Storage (aligned with cloud provider choice).

**Rationale**:
- **Scalable**: Handles unlimited storage
- **Durable**: 99.999999999% durability
- **Cost-Effective**: ~$0.023 per GB/month
- **CDN Integration**: Easy to serve via CloudFront/Cloud CDN

**Alternatives Considered**:
1. **Self-Hosted Storage**
   - Pros: More control
   - Cons: Much more expensive, complex to manage
2. **Cloudflare R2**
   - Pros: No egress fees
   - Cons: Newer, less mature

**Consequences**:
- ✅ Low cost at scale
- ✅ High availability
- ✅ Easy backups and replication
- ❌ Egress costs (mitigated with CDN)

---

## Cache Layer

### Decision: Redis

**Status**: Decided

**Context**: Need caching for session tokens, voice metadata, and frequently accessed data.

**Decision**: Use Redis for caching and session storage.

**Rationale**:
- **Fast**: In-memory, sub-millisecond latency
- **Versatile**: Key-value, pub/sub, queues
- **Mature**: Battle-tested, excellent documentation
- **Simple**: Easy to set up and use

**Alternatives Considered**:
1. **Memcached**
   - Pros: Simpler, slightly faster for pure caching
   - Cons: Less features (no persistence, pub/sub)
2. **In-Process Cache**
   - Pros: No external dependency
   - Cons: Not shared across instances

**Consequences**:
- ✅ Significant performance boost
- ✅ Reduce database load
- ✅ Can be used for job queues
- ❌ Another service to manage (mitigated with managed Redis)

---

## Authentication

### Decision: JWT with Refresh Tokens

**Status**: Decided

**Context**: Need to authenticate users and maintain sessions across devices.

**Decision**: Use JWT access tokens (short-lived) + refresh tokens (long-lived).

**Rationale**:
- **Stateless**: No server-side session storage needed
- **Scalable**: Works across multiple servers
- **Standard**: Well-understood, many libraries
- **Mobile-Friendly**: Easy to implement in native apps

**Alternatives Considered**:
1. **Session Cookies**
   - Pros: Simpler, more secure (httpOnly)
   - Cons: Requires server-side storage, less mobile-friendly
2. **OAuth Only (Firebase Auth, Auth0)**
   - Pros: Managed, less to build
   - Cons: Vendor lock-in, cost, less control

**Consequences**:
- ✅ Scalable authentication
- ✅ Works well with mobile apps
- ❌ Token refresh logic required
- ❌ Token revocation more complex (mitigate with short expiration + blacklist)

---

## Audio Player (iOS)

### Decision: AVFoundation (AVPlayer)

**Status**: Decided

**Context**: Need to play audio with scrubbing, speed control, background playback.

**Decision**: Use AVFoundation's AVPlayer.

**Rationale**:
- **Native**: Built into iOS
- **Powerful**: Supports all needed features
- **CarPlay**: Integrates with CarPlay
- **Background Audio**: Well-supported
- **Free**: No licensing costs

**Alternatives Considered**:
1. **Third-Party Player Libraries**
   - Pros: Higher-level API
   - Cons: Less control, potential bugs, dependencies
2. **AudioKit**
   - Pros: Music production features
   - Cons: Overkill for our needs

**Consequences**:
- ✅ Full control over playback
- ✅ Best performance
- ✅ Apple support and updates
- ❌ Lower-level API (more code)

---

## Audio Player (Android)

### Decision: ExoPlayer (Media3)

**Status**: Decided

**Context**: Need to play audio on Android with same features as iOS.

**Decision**: Use ExoPlayer (now part of AndroidX Media3).

**Rationale**:
- **Google-Recommended**: Official recommendation for media
- **Feature-Rich**: All features needed (speed, scrubbing, etc.)
- **Android Auto**: Full support
- **Customizable**: Flexible architecture
- **Free**: Apache 2.0 license

**Alternatives Considered**:
1. **MediaPlayer (Android)**
   - Pros: Simple, built-in
   - Cons: Less features, harder to customize
2. **Third-Party Libraries**
   - Cons: Why use third-party when ExoPlayer is official?

**Consequences**:
- ✅ Best-in-class Android audio playback
- ✅ Future-proof (Google maintains it)
- ❌ Slightly more complex than MediaPlayer (acceptable)

---

## CI/CD

### Decision: GitHub Actions

**Status**: Proposed

**Context**: Need automated testing, building, and deployment.

**Decision**: Use GitHub Actions for CI/CD.

**Rationale**:
- **Integrated**: Already using GitHub for code
- **Free**: 2,000 minutes/month free
- **Flexible**: YAML-based workflows
- **Marketplace**: Pre-built actions for mobile builds

**Alternatives Considered**:
1. **CircleCI**
   - Pros: Mature, good mobile support
   - Cons: Cost, another service
2. **Bitrise**
   - Pros: Mobile-focused
   - Cons: More expensive
3. **Fastlane + Jenkins**
   - Pros: Full control
   - Cons: More setup and maintenance

**Consequences**:
- ✅ Easy setup, integrated with GitHub
- ✅ Cost-effective
- ❌ MacOS runners expensive (for iOS builds)

---

## Hosting / Cloud Provider

### Decision: To Be Decided

**Status**: Proposed

**Context**: Need to choose cloud provider for backend services.

**Candidates**:

#### AWS (Amazon Web Services)
**Pros**:
- Most mature, largest ecosystem
- S3, RDS, ElastiCache well-suited for our needs
- Good documentation

**Cons**:
- Complex pricing
- Steep learning curve
- Can get expensive

#### Google Cloud Platform
**Pros**:
- Good for ML/AI (if we do custom processing)
- Cloud Run (serverless containers) easy to use
- Generous free tier

**Cons**:
- Smaller ecosystem than AWS
- Less enterprise support

#### Railway / Render / Fly.io
**Pros**:
- Simple, developer-friendly
- Cheaper for small scale
- Fast deployment

**Cons**:
- Less mature
- May not scale as well
- Fewer services

**Recommendation**: Start with Railway or Render for MVP (simple, cheap), migrate to AWS or GCP if we scale.

**Decision Needed By**: Before backend development

---

## Monitoring & Analytics

### Decision: To Be Decided

**Status**: Proposed

**Context**: Need to track errors, performance, and user analytics.

**Candidates**:
- **Sentry**: Error tracking (decided: yes)
- **Mixpanel vs Amplitude**: User analytics (TBD)
- **Datadog vs New Relic**: APM (TBD, maybe start free/lightweight)

---

## Pending Decisions

### Content Deduplication Strategy
**Context**: Multiple users may upload the same book. Should we detect and reuse generated audio?

**Options**:
1. Hash-based deduplication (MD5/SHA256 of text)
2. Title + Author matching
3. No deduplication (each user gets own copy)

**Decision Needed By**: Before MVP

---

### Monetization Model
**Context**: How do we charge users?

**Options**:
1. Freemium (limited conversions free, unlimited paid)
2. Subscription (monthly fee for unlimited)
3. Pay-per-conversion (credit system)
4. Free with ads (audio ads between chapters?)

**Decision Needed By**: Before MVP (affects TTS API usage planning)

---

### Voice Library Curation
**Context**: Should we curate a limited set of voices or offer all available from TTS API?

**Options**:
1. Curated set (5-10 best voices)
2. Full catalog (20+ voices)
3. Tiered (free users: 3 voices, paid: all voices)

**Decision Needed By**: Before MVP

---

## Deprecated Decisions

(None yet)

---

## Future Considerations

### Voice Cloning
If we add custom voice cloning:
- Evaluate: ElevenLabs Voice Cloning API
- Evaluate: Azure Custom Neural Voice
- Consider privacy and consent implications

### Multi-Language Support
If we expand beyond English:
- Google Cloud TTS: 220+ voices in 40+ languages
- Azure: 300+ voices in 120+ languages
- ElevenLabs: Limited language support

### Real-Time Streaming TTS
If we want to stream audio as it's generated (rather than batch processing):
- Evaluate WebSocket-based TTS APIs
- Consider latency and user experience trade-offs
