---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: technical
---

# Data Flow Diagrams

This document illustrates how data flows through the Ridecast system for key user scenarios.

---

## 1. Content Upload and Conversion Flow

```
┌─────────────┐
│   User      │
│  (Mobile)   │
└──────┬──────┘
       │
       │ 1. Upload book file (EPUB/PDF)
       ↓
┌─────────────────────────────────────────┐
│         Content Service (API)           │
│                                         │
│  • Validate file format                 │
│  • Extract metadata (title, author)     │
│  • Extract text from file               │
│  • Store original file in S3            │
└──────┬──────────────────────────────────┘
       │
       │ 2. Text extracted
       ↓
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
│                                         │
│  • Save content record                  │
│  • Status: "processing"                 │
└──────┬──────────────────────────────────┘
       │
       │ 3. Queue conversion job
       ↓
┌─────────────────────────────────────────┐
│          Job Queue (Redis)              │
│                                         │
│  • Job ID, User ID, Content ID          │
│  • Voice selection                      │
│  • Text chunks                          │
└──────┬──────────────────────────────────┘
       │
       │ 4. Worker picks up job
       ↓
┌─────────────────────────────────────────┐
│      Conversion Service (Worker)        │
│                                         │
│  • Fetch job from queue                 │
│  • Split text into processable chunks   │
│  • For each chunk:                      │
│    └─> Send to TTS API                  │
└──────┬──────────────────────────────────┘
       │
       │ 5. Text chunks → TTS API
       ↓
┌─────────────────────────────────────────┐
│      TTS API (ElevenLabs/Azure)         │
│                                         │
│  • Generate audio for text              │
│  • Return audio segments                │
└──────┬──────────────────────────────────┘
       │
       │ 6. Audio segments returned
       ↓
┌─────────────────────────────────────────┐
│      Conversion Service (Worker)        │
│                                         │
│  • Concatenate audio segments           │
│  • Add chapter markers                  │
│  • Add metadata (ID3 tags)              │
│  • Encode final audio file              │
└──────┬──────────────────────────────────┘
       │
       │ 7. Upload final audio
       ↓
┌─────────────────────────────────────────┐
│        Object Storage (S3/GCS)          │
│                                         │
│  • Store audio file                     │
│  • Generate signed URL                  │
└──────┬──────────────────────────────────┘
       │
       │ 8. Update database
       ↓
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
│                                         │
│  • Update content status: "completed"   │
│  • Save audio_url, duration, file_size  │
└──────┬──────────────────────────────────┘
       │
       │ 9. Notify user
       ↓
┌─────────────────────────────────────────┐
│    Push Notification Service (FCM/APNs) │
│                                         │
│  • Send "Your book is ready!" alert     │
└──────┬──────────────────────────────────┘
       │
       │ 10. Notification received
       ↓
┌─────────────┐
│   User      │
│  (Mobile)   │
└─────────────┘
```

---

## 2. Playback and Progress Tracking Flow

```
┌─────────────┐
│   User      │
│  (Mobile)   │
└──────┬──────┘
       │
       │ 1. Tap "Play" on book
       ↓
┌─────────────────────────────────────────┐
│         Mobile App (Local DB)           │
│                                         │
│  • Check if audio is downloaded         │
│  • If not: Fetch audio_url from API     │
└──────┬──────────────────────────────────┘
       │
       │ 2. Request audio (if not local)
       ↓
┌─────────────────────────────────────────┐
│              API Gateway                │
│                                         │
│  • Authenticate user                    │
│  • Check user has access to content     │
└──────┬──────────────────────────────────┘
       │
       │ 3. Query audio URL
       ↓
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
│                                         │
│  • Fetch audio record for content       │
│  • Return audio_url                     │
└──────┬──────────────────────────────────┘
       │
       │ 4. Return audio URL to app
       ↓
┌─────────────────────────────────────────┐
│         Mobile App (Audio Player)       │
│                                         │
│  • AVPlayer (iOS) / ExoPlayer (Android) │
│  • Load audio from URL or local file    │
│  • Check for saved progress             │
│  • Resume from last position            │
└──────┬──────────────────────────────────┘
       │
       │ 5. Fetch from CDN/S3 (if streaming)
       ↓
┌─────────────────────────────────────────┐
│      CDN / Object Storage (S3/GCS)      │
│                                         │
│  • Serve audio file                     │
│  • Support range requests (for scrubbing)│
└──────┬──────────────────────────────────┘
       │
       │ 6. Audio playing
       ↓
┌─────────────┐
│   User      │
│  (Listening)│
└──────┬──────┘
       │
       │ 7. Periodic progress updates (every 30s)
       ↓
┌─────────────────────────────────────────┐
│         Mobile App (Local DB)           │
│                                         │
│  • Save current position locally        │
│  • Queue sync to server                 │
└──────┬──────────────────────────────────┘
       │
       │ 8. Sync progress to server (background)
       ↓
┌─────────────────────────────────────────┐
│              Sync Service               │
│                                         │
│  • Receive progress update              │
│  • Validate and sanitize                │
└──────┬──────────────────────────────────┘
       │
       │ 9. Update progress in DB
       ↓
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
│                                         │
│  • Update playback_progress table       │
│  • user_id, audio_id, position_seconds  │
└──────┬──────────────────────────────────┘
       │
       │ 10. Broadcast to other devices (WebSocket)
       ↓
┌─────────────────────────────────────────┐
│           WebSocket Service             │
│                                         │
│  • Push progress update to user's       │
│    other connected devices              │
└──────┬──────────────────────────────────┘
       │
       │ 11. Progress synced to other device
       ↓
┌─────────────┐
│   User      │
│ (Tablet)    │
└─────────────┘
```

---

## 3. Cross-Device Sync Flow

```
┌─────────────┐                      ┌─────────────┐
│   Device 1  │                      │   Device 2  │
│  (iPhone)   │                      │   (iPad)    │
└──────┬──────┘                      └──────┬──────┘
       │                                    │
       │ 1. User listens on iPhone         │
       ↓                                    │
   [Playing audio]                          │
       │                                    │
       │ 2. Progress saved locally          │
       │    (position: 12:34)               │
       ↓                                    │
┌─────────────────────────────────────┐    │
│      Local DB (iPhone)              │    │
│                                     │    │
│  • playback_progress updated        │    │
└──────┬──────────────────────────────┘    │
       │                                    │
       │ 3. Sync to server (background)    │
       ↓                                    │
┌─────────────────────────────────────┐    │
│         Sync Service (API)          │    │
│                                     │    │
│  • Receive progress update          │    │
│  • user_id: 123                     │    │
│  • audio_id: 456                    │    │
│  • position: 754 seconds            │    │
└──────┬──────────────────────────────┘    │
       │                                    │
       │ 4. Update database                 │
       ↓                                    │
┌─────────────────────────────────────┐    │
│      PostgreSQL Database            │    │
│                                     │    │
│  playback_progress:                 │    │
│  • user_id: 123                     │    │
│  • audio_id: 456                    │    │
│  • position: 754                    │    │
│  • last_updated: 2025-10-10 14:32   │    │
└──────┬──────────────────────────────┘    │
       │                                    │
       │ 5. WebSocket notification          │
       ├───────────────────────────────────>│
       │    {event: "progress_update",      │
       │     audio_id: 456,                 │
       │     position: 754}                 │
       │                                    ↓
       │                              ┌─────────────────┐
       │                              │   iPad App      │
       │                              │                 │
       │                              │ • Receives WS   │
       │                              │   event         │
       │                              │ • Updates local │
       │                              │   cache         │
       │                              └────────┬────────┘
       │                                       │
       │ 6. User opens iPad app                │
       │                                       ↓
       │                                  [App Launch]
       │                                       │
       │                                       │ 7. Fetch latest progress
       │                                       ↓
       │                              ┌─────────────────┐
       │                              │   Local DB      │
       │                              │   (iPad)        │
       │                              │                 │
       │                              │ • Check cached  │
       │                              │   progress      │
       │                              └────────┬────────┘
       │                                       │
       │                                       │ 8. Resume at 12:34
       │                                       ↓
       │                                  [Playing from
       │                                   synced position]
```

---

## 4. Offline Download and Playback Flow

```
┌─────────────┐
│   User      │
│  (Mobile)   │
└──────┬──────┘
       │
       │ 1. User on WiFi, taps "Download"
       ↓
┌─────────────────────────────────────────┐
│            Mobile App                   │
│                                         │
│  • Check network: WiFi ✓                │
│  • Check storage: Available space OK ✓  │
│  • Queue download job                   │
└──────┬──────────────────────────────────┘
       │
       │ 2. Fetch audio metadata
       ↓
┌─────────────────────────────────────────┐
│              API Gateway                │
│                                         │
│  • Authenticate user                    │
│  • Return audio_url and file_size       │
└──────┬──────────────────────────────────┘
       │
       │ 3. Start background download
       ↓
┌─────────────────────────────────────────┐
│      Download Service (Background)      │
│                                         │
│  • URLSession (iOS) / WorkManager (Android)│
│  • Download audio file from CDN         │
│  • Show progress notification           │
└──────┬──────────────────────────────────┘
       │
       │ 4. Fetch from CDN
       ↓
┌─────────────────────────────────────────┐
│      CDN / Object Storage (S3/GCS)      │
│                                         │
│  • Serve audio file                     │
│  • Support resume (range requests)      │
└──────┬──────────────────────────────────┘
       │
       │ 5. Audio downloaded
       ↓
┌─────────────────────────────────────────┐
│       Local File System (Mobile)        │
│                                         │
│  • Save audio file to app directory     │
│  • /Documents/Audio/456.m4a             │
└──────┬──────────────────────────────────┘
       │
       │ 6. Update local database
       ↓
┌─────────────────────────────────────────┐
│         Local DB (CoreData/Room)        │
│                                         │
│  • Mark audio as "downloaded"           │
│  • Save local file path                 │
│  • Update UI (show download icon)       │
└──────┬──────────────────────────────────┘
       │
       │ 7. Download complete notification
       ↓
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 8. User goes offline (in car, no signal)
       │    Taps "Play"
       ↓
┌─────────────────────────────────────────┐
│            Mobile App                   │
│                                         │
│  • Check network: Offline ✗             │
│  • Check local DB: Downloaded ✓         │
│  • Load from local file path            │
└──────┬──────────────────────────────────┘
       │
       │ 9. Playback from local file
       ↓
┌─────────────────────────────────────────┐
│      Audio Player (AVPlayer/ExoPlayer)  │
│                                         │
│  • Load audio from local file           │
│  • No network required                  │
│  • Track progress locally               │
└──────┬──────────────────────────────────┘
       │
       │ 10. Progress saved locally
       ↓
┌─────────────────────────────────────────┐
│         Local DB (CoreData/Room)        │
│                                         │
│  • Save progress while offline          │
│  • Mark as "needs_sync"                 │
└──────┬──────────────────────────────────┘
       │
       │ 11. User reconnects to network
       ↓
┌─────────────────────────────────────────┐
│            Sync Service                 │
│                                         │
│  • Detect network reconnection          │
│  • Upload pending progress updates      │
│  • Sync to server                       │
└──────┬──────────────────────────────────┘
       │
       │ 12. Sync complete
       ↓
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
│                                         │
│  • Update playback_progress             │
│  • Offline changes now synced           │
└─────────────────────────────────────────┘
```

---

## 5. Car Mode Auto-Activation Flow

```
┌─────────────┐
│   User      │
│ (In Car)    │
└──────┬──────┘
       │
       │ 1. Connect phone to car Bluetooth
       ↓
┌─────────────────────────────────────────┐
│       Mobile OS (iOS/Android)           │
│                                         │
│  • Bluetooth connection detected        │
│  • Device type: Car audio system        │
└──────┬──────────────────────────────────┘
       │
       │ 2. Bluetooth event broadcast
       ↓
┌─────────────────────────────────────────┐
│            Mobile App                   │
│                                         │
│  • Listen for Bluetooth events          │
│  • Detect car connection                │
└──────┬──────────────────────────────────┘
       │
       │ 3. Check user preferences
       ↓
┌─────────────────────────────────────────┐
│       User Preferences (Local)          │
│                                         │
│  • auto_car_mode: true                  │
│  • auto_resume: true                    │
└──────┬──────────────────────────────────┘
       │
       │ 4. Activate Car Mode
       ↓
┌─────────────────────────────────────────┐
│            Mobile App (UI)              │
│                                         │
│  • Switch to Car Mode layout            │
│  • Large buttons, simplified UI         │
│  • Show notification: "Car Mode Active" │
└──────┬──────────────────────────────────┘
       │
       │ 5. Fetch last played content
       ↓
┌─────────────────────────────────────────┐
│         Local DB (CoreData/Room)        │
│                                         │
│  • Query last played audio              │
│  • Query last position                  │
└──────┬──────────────────────────────────┘
       │
       │ 6. Auto-resume last content
       ↓
┌─────────────────────────────────────────┐
│      Audio Player (AVPlayer/ExoPlayer)  │
│                                         │
│  • Load last audio file                 │
│  • Resume from last position            │
│  • Start playing automatically          │
└──────┬──────────────────────────────────┘
       │
       │ 7. Audio playing in Car Mode
       ↓
┌─────────────┐
│   User      │
│ (Listening) │
└──────┬──────┘
       │
       │ 8. User receives phone call
       ↓
┌─────────────────────────────────────────┐
│       Mobile OS (iOS/Android)           │
│                                         │
│  • Incoming call interrupt              │
└──────┬──────────────────────────────────┘
       │
       │ 9. Audio Session interruption
       ↓
┌─────────────────────────────────────────┐
│      Audio Player (AVPlayer/ExoPlayer)  │
│                                         │
│  • Receive interrupt event              │
│  • Pause playback                       │
│  • Save position                        │
└──────┬──────────────────────────────────┘
       │
       │ 10. User ends call
       ↓
┌─────────────────────────────────────────┐
│       Mobile OS (iOS/Android)           │
│                                         │
│  • Interrupt ended                      │
└──────┬──────────────────────────────────┘
       │
       │ 11. Resume playback
       ↓
┌─────────────────────────────────────────┐
│      Audio Player (AVPlayer/ExoPlayer)  │
│                                         │
│  • Receive interrupt ended event        │
│  • Auto-resume playback                 │
└──────┬──────────────────────────────────┘
       │
       │ 12. User disconnects Bluetooth
       ↓
┌─────────────────────────────────────────┐
│       Mobile OS (iOS/Android)           │
│                                         │
│  • Bluetooth disconnection detected     │
└──────┬──────────────────────────────────┘
       │
       │ 13. Exit Car Mode
       ↓
┌─────────────────────────────────────────┐
│            Mobile App (UI)              │
│                                         │
│  • Detect car disconnect                │
│  • Exit Car Mode                        │
│  • Return to normal UI                  │
│  • Keep playing (or pause based on pref)│
└─────────────────────────────────────────┘
```

---

## 6. Voice Command Flow

```
┌─────────────┐
│   User      │
│ (Driving)   │
└──────┬──────┘
       │
       │ 1. User says "Hey Siri/Google, pause Ridecast"
       ↓
┌─────────────────────────────────────────┐
│    Voice Assistant (Siri/Google)        │
│                                         │
│  • Capture voice command                │
│  • Parse intent: "pause"                │
│  • Target app: "Ridecast"               │
└──────┬──────────────────────────────────┘
       │
       │ 2. Route to app intent handler
       ↓
┌─────────────────────────────────────────┐
│   App Intent Handler (SiriKit/Actions)  │
│                                         │
│  • Receive parsed intent                │
│  • Intent type: MediaPauseIntent        │
└──────┬──────────────────────────────────┘
       │
       │ 3. Execute command
       ↓
┌─────────────────────────────────────────┐
│      Audio Player (AVPlayer/ExoPlayer)  │
│                                         │
│  • Pause playback                       │
│  • Save position                        │
└──────┬──────────────────────────────────┘
       │
       │ 4. Provide audio feedback
       ↓
┌─────────────────────────────────────────┐
│      Text-to-Speech (System TTS)        │
│                                         │
│  • Speak: "Paused"                      │
└──────┬──────────────────────────────────┘
       │
       │ 5. Return success to assistant
       ↓
┌─────────────────────────────────────────┐
│    Voice Assistant (Siri/Google)        │
│                                         │
│  • Confirm command executed             │
└──────┬──────────────────────────────────┘
       │
       │ 6. User hears confirmation
       ↓
┌─────────────┐
│   User      │
└─────────────┘
```

---

## Data Flow Summary

### Key Patterns

1. **Offline-First**:
   - Local DB as source of truth for UI
   - Background sync to server
   - Conflict resolution: server wins (most recent timestamp)

2. **Async Processing**:
   - Job queues for long-running tasks (TTS conversion)
   - Background workers process jobs
   - Push notifications for completion

3. **Real-Time Sync**:
   - WebSocket for live progress updates
   - Fallback to polling if WebSocket fails
   - Only sync when network available

4. **Caching Strategy**:
   - Local cache for frequently accessed data
   - CDN for static assets (audio, images)
   - Redis for server-side caching

5. **Security**:
   - JWT authentication for API calls
   - Signed URLs for S3/CDN access (time-limited)
   - No audio files stored in API responses (only URLs)
