# User Story 4.1.1: Share Across Devices

> Part of [Feature 4.1: Cross-Device Sync](../../../features/epic-4-user-profiles/feature-4.1-cross-device-sync.md)

---

### User Story

**As a** user with multiple devices (phone, tablet, CarPlay)
**I want** to access my library and resume playback from any device
**So that** I can seamlessly continue listening wherever I am

---

### Acceptance Criteria

- [ ] Given I am a new user, when I sign up for a Ridecast account, then my library is automatically backed up to the cloud and my preferences are saved
- [ ] Given I have content in my library on one device, when I log in on a different device, then I see all my library content with correct progress on each item
- [ ] Given I am listening on my phone and pause at 12:34, when I open the app on my tablet within 30 seconds, then the tablet shows the exact playback position and I can resume immediately
- [ ] Given I am listening offline on a device, when I make progress and later reconnect to the internet, then my progress syncs to the cloud and appears on my other devices
- [ ] Given I add or remove content on one device, when I open the app on another device, then the library changes are reflected automatically
- [ ] Given I change my voice preference on one device, when I convert content on another device, then my updated preference is used

---

### Technical Notes

**Authentication System:**
- Email/password registration
- OAuth (Google Sign-In, Apple Sign-In)
- JWT access tokens (15 min expiration)
- Refresh tokens (30 day expiration)
- Secure token storage (Keychain/EncryptedSharedPreferences)

**Data Sync Architecture:**
- WebSocket connection for real-time updates
- Fallback to polling (30s interval) if WebSocket fails
- Delta sync (only send changes, not full data)
- Batch sync operations for efficiency

**Synced Data:**
```javascript
{
  library: [
    { content_id, title, author, status, added_date }
  ],
  progress: [
    { content_id, position_seconds, last_updated, completed }
  ],
  preferences: {
    default_voice, playback_speed, auto_download, etc.
  },
  playlists: [
    { playlist_id, name, items, updated_at }
  ]
}
```

**Conflict Resolution:**
- Most recent timestamp wins for progress
- Merge library additions from all devices
- Preferences: most recent update wins
- Playlists: merge items, resolve by timestamp

**Offline Queue:**
- Store sync operations in local queue
- Execute when connection restored
- Retry failed operations with exponential backoff

**Performance:**
- Initial sync: Full library download
- Subsequent: Only deltas
- Background sync (doesn't block UI)
- Optimistic UI updates

---

### Design Reference

See design documents:
- [Data Flow: Cross-Device Sync](../../../4-tech/DataFlowDiagram.md#3-cross-device-sync-flow)
- [Architecture: Sync Service](../../../4-tech/Architecture.md#sync-service)

---

### Dependencies

- **Depends on:** Backend infrastructure (auth, sync service, database)
- **Blocks:** All other features benefit from sync
- **Related:** All features that store user data

---

### Testing Notes

**Test Scenarios:**

1. **New Account:** Sign up → Add content → Login on second device → Verify synced
2. **Progress Sync:** Listen on device A → Pause → Open device B → Verify position synced
3. **Offline Sync:** Listen offline → Make progress → Reconnect → Verify syncs
4. **Library Changes:** Add book on device A → Check device B → Verify appears
5. **Preference Sync:** Change voice on device A → Convert on device B → Verify new voice used
6. **Real-Time Update:** Listen on device A → Device B open → Verify progress updates live

**Edge Cases:**

- Sync conflict (progress updated on 2 devices offline)
- Account login on 10+ devices
- Very large library (1000+ items)
- Slow network connection
- Sync service temporarily down
- Corrupted sync data
- User deletes account (data cleanup)

**Performance Testing:**

- Initial sync time with 100 library items
- Real-time sync latency (<30s requirement)
- Battery impact of WebSocket connection
- Bandwidth usage for sync operations

---

### Estimated Effort

**10 story points** (3-4 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
