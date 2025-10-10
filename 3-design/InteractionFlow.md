---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: design
---

# Interaction Flow

## Primary User Flows

### 1. First-Time User Onboarding

```
[Splash Screen]
       ↓
[Welcome: "Turn reading time into drive time"]
       ↓
[Permission Requests: Notifications, Storage]
       ↓
[Optional: Sign Up / Skip]
       ↓
[Tutorial: "Let's convert your first book"]
       ↓
[Upload First Content]
       ↓
[Select Voice]
       ↓
[Converting... Progress Screen]
       ↓
[Success! "Ready to listen"]
       ↓
[Now Playing Screen]
```

**Key Principles:**
- Skip to value immediately (can sign up later)
- Inline education (no separate tutorial screens)
- Immediate gratification (first book converts fast)

---

### 2. Converting Content to Audio

```
[Library Screen]
       ↓
[Tap "+" Add Content]
       ↓
┌──────────────┬──────────────┬──────────────┐
│ Upload File  │ Enter URL    │ Connect Apps │
└──────────────┴──────────────┴──────────────┘
       ↓
[Content Preview: Title, Author, Cover, Page Count]
       ↓
[Edit Metadata (optional)]
       ↓
[Select Voice]
  ├─ Browse voices
  ├─ Play samples
  └─ Select
       ↓
[Confirm: "Convert to Audio"]
       ↓
[Processing Screen]
  ├─ Progress bar
  ├─ Estimated time
  └─ "You can continue using the app"
       ↓
[Notification: "Book is ready!"]
       ↓
[Appears in Library]
```

**Key Principles:**
- Preview before committing
- Voice selection is prominent but not blocking
- Asynchronous processing (don't block user)

---

### 3. Playing Audio Content

```
[Library Screen]
       ↓
[Tap on Book/Article Card]
       ↓
[Now Playing Screen]
  ├─ Large Play/Pause button
  ├─ Progress bar (scrubbing enabled)
  ├─ Skip back 15s / Skip forward 30s
  ├─ Playback speed (1x → 1.25x → 1.5x → 2x)
  ├─ Chapter list (drawer)
  └─ Queue view (drawer)
       ↓
[Playback Controls]
  ├─ Background audio continues
  ├─ Lock screen controls
  └─ Progress auto-saves
       ↓
[Chapter ends]
       ↓
[Auto-advance to next chapter or queue item]
```

**Key Principles:**
- One tap from library to playback
- All controls accessible without navigation
- Progress always saved

---

### 4. Car Mode Experience

```
[User enters car and connects Bluetooth]
       ↓
[Auto-detect: Car Mode triggered]
       ↓
[Large-button Interface]
  ├─ Continue current book (auto-plays)
  ├─ OR select from recents
  └─ Voice command prompt visible
       ↓
[Driving with Playback]
  ├─ Large Play/Pause in center
  ├─ Skip back (left) / Skip forward (right)
  ├─ Speed control (single tap toggle)
  └─ Voice commands active
       ↓
[Interruption: Phone Call]
       ↓
[Auto-pause, audio ducks]
       ↓
[Call ends]
       ↓
[Auto-resume playback]
       ↓
[User disconnects Bluetooth]
       ↓
[Exit Car Mode, return to normal UI]
```

**Key Principles:**
- Zero friction: Auto-resume last content
- Maximum safety: Large targets, voice control
- Intelligent interruption handling

---

### 5. Building a Queue/Playlist

```
[Library Screen]
       ↓
[Long-press on content item]
       ↓
[Context Menu]
  ├─ Play Now
  ├─ Play Next
  ├─ Add to Queue
  ├─ Add to Playlist
  └─ Download
       ↓
[Select "Add to Queue"]
       ↓
[Item added, visual feedback]
       ↓
[Tap Queue icon in Now Playing]
       ↓
[Queue View]
  ├─ Currently playing (highlighted)
  ├─ Up next (ordered list)
  ├─ Drag to reorder
  ├─ Swipe to remove
  └─ Total duration displayed
```

**Key Principles:**
- Quick actions from anywhere
- Visual feedback for all actions
- Easy reordering and management

---

### 6. Managing Storage and Downloads

```
[Profile/Settings Screen]
       ↓
[Storage Management]
       ↓
[List of downloaded content]
  ├─ Shows file size per item
  ├─ Shows total storage used
  └─ Shows available device space
       ↓
[Swipe left on item]
       ↓
[Delete downloaded file]
       ↓
[Confirmation: "Remove from device?"]
  ├─ "Remove" (keeps in library, deletes audio)
  └─ "Cancel"
       ↓
[Space freed, updated in list]
```

**Key Principles:**
- Clear visibility of storage usage
- Easy cleanup of old content
- Confirmation for destructive actions

---

### 7. Cross-Device Sync

```
[User opens app on Device 1]
       ↓
[Signs in / Already signed in]
       ↓
[Listens to Book A, Chapter 3]
       ↓
[Progress saved locally]
       ↓
[Sync to cloud (background, 30s)]
       ↓
---
[User opens app on Device 2]
       ↓
[Signs in with same account]
       ↓
[Library syncs from cloud]
       ↓
[Opens Book A]
       ↓
[Resumes at Chapter 3, exact position]
```

**Key Principles:**
- Seamless sync, no user action required
- Offline progress tracked and synced later
- Conflict resolution (most recent wins)

---

## Edge Cases and Error States

### Upload Fails
```
[Upload in progress...]
       ↓
[Error: "Unable to process file"]
       ↓
[Error message + suggestion]
  - "This file format isn't supported"
  - "Try EPUB, PDF, or TXT"
       ↓
[Button: "Try Another File"]
```

### Conversion Fails
```
[Converting...]
       ↓
[Error: "Conversion failed"]
       ↓
[Detailed message + retry option]
  - "We encountered an issue with this text"
  - [Retry] [Report Problem] [Cancel]
```

### No Internet During Upload
```
[User tries to upload]
       ↓
[Detect: No connection]
       ↓
[Message: "Connect to upload content"]
[Alternative: "Or manage your downloaded library"]
```

### Storage Full
```
[User tries to download]
       ↓
[Check: Device storage]
       ↓
[Warning: "Not enough space"]
  - "You need 150 MB"
  - "Free up space or remove old downloads"
       ↓
[Button: "Manage Storage"]
```

---

## Gesture Map

### Library Screen
- **Tap**: Open/play content
- **Long-press**: Context menu (queue, playlist, download)
- **Swipe left**: Quick actions (delete, share)
- **Pull down**: Refresh library

### Now Playing Screen
- **Tap play button**: Play/pause
- **Tap progress bar**: Scrub to position
- **Swipe up**: Open queue/chapter list
- **Swipe left/right**: Previous/next chapter
- **Double-tap left**: Rewind 15s
- **Double-tap right**: Fast forward 30s

### Car Mode
- **Tap only**: No swipe gestures (safety)
- **Large tap areas**: 80x80pt minimum
- **Voice overrides**: Any voice command works anytime

---

## Animation Specifications

### Transitions
- **Screen transitions**: 250ms ease-in-out slide
- **Modal appearance**: 200ms fade + scale
- **Button press**: 100ms scale down (0.95x)
- **Success feedback**: 150ms scale pulse (1.0x → 1.1x → 1.0x)

### Loading States
- **Progress bar**: Smooth linear progression
- **Spinner**: Only for indeterminate waits (<5s)
- **Skeleton screens**: For content loading

### Microinteractions
- **Toggle switches**: 200ms ease
- **Checkbox**: 150ms scale + checkmark draw
- **Slider**: Immediate feedback, smooth interpolation
