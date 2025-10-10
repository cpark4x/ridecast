# User Story 3.2.1: Save and Play Offline

> Part of [Feature 3.2: Offline Playback](../../../features/epic-3-library-playback/feature-3.2-offline-playback.md)

---

### User Story

**As a** commuter who drives through areas with poor cell coverage
**I want** to download audio content for offline playback
**So that** I can listen without interruption regardless of connectivity

---

### Acceptance Criteria

- [ ] Given I have converted audio in my library and I'm on WiFi, when I tap the download button, then the audio downloads in the background with progress indicator
- [ ] Given I have downloaded audio content and have no internet connection, when I browse my library and tap play, then the audio plays smoothly without buffering
- [ ] Given I have limited device storage, when I view my library, then I can see how much space each item uses and delete downloaded files to free space
- [ ] Given I have items in my playback queue and connect to WiFi, when auto-download is enabled, then upcoming queue items download automatically
- [ ] Given I am listening offline, when I make progress through the content, then my progress is tracked locally and syncs when I reconnect
- [ ] Given I am about to download on cellular, when I tap download, then the app warns me and asks for confirmation (unless I've disabled this warning)

---

### Technical Notes

**Download System:**
- Background downloads using URLSession (iOS) or WorkManager (Android)
- Resume interrupted downloads
- Download queue with prioritization
- Parallel downloads (configurable limit)
- Progress tracking per item

**Storage Management:**
- Store in app-specific directory (can't be accessed by other apps)
- File naming: `{content_id}.m4a` or `{content_id}.mp3`
- Metadata stored in local database
- Calculate and display storage usage
- Automatic cleanup options (LRU, manual)

**Offline Playback:**
- Check local availability before attempting network
- Use local file path for AVPlayer/ExoPlayer
- Track progress in local database
- Queue offline sync operations

**Sync When Online:**
- Detect network availability
- Upload pending progress updates
- Sync download status across devices
- Handle merge conflicts

**Storage UI:**
- Show download status (not downloaded, downloading, downloaded)
- Show file size per item
- Show total storage used
- Show available space on device
- Quick delete action (swipe)

**Network Handling:**
- Detect WiFi vs cellular
- User preference for cellular downloads
- Pause downloads when switching to cellular
- Resume when back on WiFi

---

### Design Reference

See design documents:
- [Interaction Flow: Offline Download and Playback](../../../3-design/InteractionFlow.md#4-offline-download-and-playback-flow)
- Storage Management UI: [To be designed]

---

### Dependencies

- **Depends on:** Feature 1.1 (TTS Conversion) for audio files
- **Blocks:** Feature 5.1 (Car Mode) - offline is critical for driving
- **Related:** Feature 4.1 (Sync) for syncing offline progress

---

### Testing Notes

**Test Scenarios:**

1. **Happy Path Download:** WiFi connected → Tap download → Wait for completion → Play
2. **Offline Playback:** Download content → Turn off WiFi/cellular → Play successfully
3. **Background Download:** Start download → Close app → Verify continues and notifies when done
4. **Storage Management:** View storage usage → Delete item → Verify space freed
5. **Auto-Download:** Add items to queue → Connect WiFi → Verify auto-downloads
6. **Progress Sync:** Listen offline → Make progress → Reconnect → Verify syncs
7. **Cellular Warning:** Switch to cellular → Tap download → Verify warning appears

**Edge Cases:**

- Download interrupted (lost connection, app killed)
- Storage full mid-download
- Downloaded file corrupted
- File deleted manually from filesystem
- Sync conflict (played on 2 devices offline)
- Download while playing same content
- Device runs out of battery during download

**Performance Testing:**

- Download speed on slow WiFi
- Playback of large files (2+ hours)
- Storage cleanup with 50+ downloaded items
- Sync performance with many offline changes

---

### Estimated Effort

**8 story points** (2-3 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
