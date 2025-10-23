# Backend Integration Guide

This document describes the integration of the Next.js frontend with the Node.js backend API.

## Overview

The frontend now connects to the backend API for:
- User authentication (register, login, token refresh)
- Content upload and text extraction
- Azure TTS audio conversion
- User library and progress synchronization

## Architecture

### API Client Layer (`src/lib/api/`)

**Files:**
- `types.ts` - TypeScript interfaces matching backend responses
- `client.ts` - Base HTTP client with auth headers and token refresh
- `auth.ts` - Authentication API calls
- `content.ts` - Content upload and management
- `audio.ts` - TTS conversion and job polling
- `user.ts` - User profile, library, and progress

**Features:**
- Automatic JWT token storage in localStorage
- Token refresh on 401 errors
- Type-safe API calls with full TypeScript support
- Error handling with custom APIError class

### Authentication System (`src/lib/auth/`)

**Files:**
- `auth-store.ts` - Zustand store for auth state
- `auth-context.tsx` - React Context provider
- `index.ts` - Public API exports

**Components:**
- `src/components/auth/login-form.tsx` - Login UI
- `src/components/auth/register-form.tsx` - Registration UI
- `src/components/auth-page.tsx` - Combined auth page

**Features:**
- Login/Register with email and password
- JWT token management (access + refresh tokens)
- Auto-refresh tokens before expiry
- Protected routes (auth required to access app)

### TTS Integration (`src/lib/tts/`)

**New Files:**
- `backend-converter.ts` - Real backend TTS conversion
- `converter.ts` - Updated with deprecation notice

**Features:**
- Upload content to backend for text extraction
- Start TTS conversion job
- Poll job status with progress updates
- Download completed audio file
- Store audio in IndexedDB for offline playback

### Sync Manager (`src/lib/sync/`)

**Files:**
- `sync-manager.ts` - Online/offline state tracking
- `index.ts` - Public API exports

**Features:**
- Real-time online/offline detection
- Network status indicator in UI
- Queue for operations when offline (future enhancement)

### Updated Components

**`src/components/upload-page-backend.tsx`:**
- New upload component using backend API
- Shows authentication status
- Displays conversion progress with steps
- Downloads and caches audio locally

**`src/app/page.tsx`:**
- Integrated authentication flow
- Shows AuthPage when not logged in
- Network status indicator
- User info and logout button

**`src/app/layout.tsx`:**
- Wrapped app in AuthProvider
- Global auth state available throughout app

## Environment Configuration

**`web/.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Setup Instructions

### 1. Start Backend Server

```bash
cd /Users/chrispark/dev/projects/ridecast/backend
npm install
npm run dev
```

Backend should be running on `http://localhost:3001`

### 2. Start Frontend Server

```bash
cd /Users/chrispark/dev/projects/ridecast/web
npm install
npm run dev
```

Frontend should be running on `http://localhost:3000`

### 3. Configure Environment

Make sure `.env.local` exists in the `web/` directory with the correct API URL.

## Testing Checklist

### Authentication Flow

1. **Register New User**
   - Open http://localhost:3000
   - Click "Sign up"
   - Enter email, password, and optional name
   - Should automatically log in after registration

2. **Login Existing User**
   - If logged out, should see login page
   - Enter credentials
   - Should redirect to main app

3. **Token Refresh**
   - Stay logged in for extended period
   - Tokens should refresh automatically before expiry
   - No interruption to user experience

4. **Logout**
   - Click "Logout" in top-right
   - Should clear tokens and return to auth page

### Upload and Conversion Flow

1. **Upload Content**
   - Click "Upload" tab
   - Select a .txt or .epub file
   - Enter title (auto-populated from filename)
   - Optionally enter author
   - Select a voice

2. **Monitor Conversion**
   - Click "Convert to Audio"
   - Should see progress:
     - Uploading file... (10%)
     - Converting to audio... (20-90%)
     - Downloading audio... (90%)
     - Saving for offline playback... (95%)
     - Complete! (100%)

3. **Check Library**
   - After conversion, go to "Library" tab
   - Content should appear in library
   - "Downloaded" badge should be visible
   - Audio should be playable

### Offline Functionality

1. **Test Offline Playback**
   - Convert content while online
   - Disconnect from internet (or use dev tools to simulate offline)
   - Go to Library
   - Uploaded content should still be playable
   - Network indicator should show "Offline"

2. **Test Online Requirement**
   - Disconnect from internet
   - Try to upload new content
   - Should show error: "Backend upload requires internet connection"

### Network Status

- **Online Indicator**: Green badge showing "Online"
- **Offline Indicator**: Orange badge showing "Offline"
- Changes in real-time when connectivity changes

## API Endpoints Used

### Auth Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login existing user
- `POST /auth/refresh` - Refresh access token

### Content Endpoints
- `POST /content/upload` - Upload file for text extraction
- `GET /content/:id` - Get content by ID

### Audio Endpoints
- `POST /audio/convert` - Start TTS conversion job
- `GET /audio/status/:jobId` - Get conversion job status
- `GET /audio/voices` - List available voices (not yet used)

### User Endpoints
- `GET /user/profile` - Get current user profile
- `GET /user/library` - Get user's library (not yet used)
- `PUT /user/progress/:id` - Update playback progress (not yet used)

## Known Issues and Future Enhancements

### Current Limitations

1. **Library Sync**: Library page still reads from local IndexedDB only. Backend sync not yet implemented.

2. **Progress Sync**: Playback progress is saved locally but not yet synced to backend.

3. **Voice List**: Frontend uses hardcoded voice list. Should fetch from `/audio/voices` endpoint.

4. **Offline Queue**: Operations performed offline are not queued for sync when back online.

5. **Error Boundaries**: No global error boundaries for API failures.

### Recommended Next Steps

1. **Implement Library Sync**
   - Fetch library from backend on load
   - Merge with local cache
   - Mark items available offline

2. **Implement Progress Sync**
   - Debounce progress updates to backend
   - Resume from synced position on other devices

3. **Add Voice List Sync**
   - Fetch voices from backend
   - Cache locally
   - Update VoiceSelector component

4. **Add Offline Queue**
   - Queue progress updates when offline
   - Sync on reconnect
   - Show sync status in UI

5. **Add Error Boundaries**
   - Catch API errors globally
   - Show user-friendly error messages
   - Retry failed requests

6. **Add Loading States**
   - Show skeleton screens
   - Better loading indicators
   - Optimistic UI updates

## File Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Updated with AuthProvider
│   │   └── page.tsx             # Updated with auth integration
│   ├── lib/
│   │   ├── api/                 # NEW: Backend API client
│   │   │   ├── auth.ts
│   │   │   ├── audio.ts
│   │   │   ├── client.ts
│   │   │   ├── content.ts
│   │   │   ├── user.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── auth/                # NEW: Authentication system
│   │   │   ├── auth-store.ts
│   │   │   ├── auth-context.tsx
│   │   │   └── index.ts
│   │   ├── sync/                # NEW: Sync manager
│   │   │   ├── sync-manager.ts
│   │   │   └── index.ts
│   │   ├── tts/
│   │   │   ├── backend-converter.ts  # NEW: Backend TTS
│   │   │   ├── converter.ts          # Updated (deprecated)
│   │   │   └── index.ts              # Updated exports
│   │   └── storage/             # Existing (unchanged)
│   └── components/
│       ├── auth/                # NEW: Auth components
│       │   ├── login-form.tsx
│       │   └── register-form.tsx
│       ├── auth-page.tsx        # NEW: Combined auth page
│       ├── upload-page-backend.tsx  # NEW: Backend upload
│       ├── upload-page.tsx      # Existing (kept for reference)
│       ├── library-page.tsx     # Existing (needs backend sync)
│       └── playlists-page.tsx   # Existing (unchanged)
└── .env.local                   # NEW: Environment config
```

## Debugging Tips

### Check Browser Console
- All API calls are logged with `[Upload]` prefix
- Check for error messages
- Verify token storage in localStorage

### Check Network Tab
- Verify API calls to `http://localhost:3001/api/v1/*`
- Check request/response payloads
- Verify JWT tokens in Authorization headers

### Check Backend Logs
- Backend should log all incoming requests
- Check for errors in text extraction or TTS conversion
- Verify file uploads are processed

### Common Issues

**"Backend upload requires internet connection"**
- Check network connection
- Verify backend server is running
- Check CORS configuration

**"Authentication required"**
- Check if logged in
- Verify tokens in localStorage
- Try logging out and back in

**"Failed to upload file"**
- Check file size (max 50MB)
- Verify file type (.txt, .epub, .pdf)
- Check backend logs for errors

## Success Criteria

- User can register and login
- JWT tokens are stored and refreshed automatically
- File upload extracts text on backend
- TTS conversion uses Azure voices
- Progress updates show in real-time
- Audio downloads and caches locally
- Offline playback works with cached audio
- Network status updates in real-time
- Clean error messages throughout

## Conclusion

The frontend is now integrated with the backend API for authentication, content upload, and TTS conversion. The offline-first architecture is maintained by caching audio locally after download. Future enhancements will add full library sync and progress synchronization across devices.
