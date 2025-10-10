# User Story 3.1.1: Create Custom Playlist

> Part of [Feature 3.1: Playback Queue](../../../features/epic-3-library-playback/feature-3.1-playback-queue.md)

---

### User Story

**As a** regular Ridecast user
**I want** to create and manage playlists of my favorite content
**So that** I can queue up the perfect listening experience for my commute

---

### Acceptance Criteria

- [ ] Given I have multiple items in my library, when I create a new playlist, then I can give it a name and add books/chapters/articles to it
- [ ] Given I am browsing my library, when I long-press on a book or article, then I see an option to "Add to Playlist" and can select which playlist
- [ ] Given I have a playlist with multiple items, when I open the playlist editor, then I can drag and drop items to reorder them
- [ ] Given I have a playlist ready, when I tap "Play Playlist", then playback starts with the first unfinished item and automatically continues through the list
- [ ] Given I have a commute pattern (e.g., 25 minutes), when I create a new playlist, then the app suggests content that fits my commute duration
- [ ] Given I have created a playlist, when I view it, then I see the total duration and number of items

---

### Technical Notes

**Playlist Data Model:**
```javascript
{
  id: "playlist_uuid",
  user_id: "user_uuid",
  name: "Morning Commute",
  description: "Perfect for my drive to work",
  items: [
    { content_id: "book_1", position: 0 },
    { content_id: "article_2", position: 1 },
    { content_id: "book_3_chapter_5", position: 2 }
  ],
  total_duration_seconds: 1500,
  created_at: "2025-10-10",
  updated_at: "2025-10-10"
}
```

**Playlist Operations:**
- Create new playlist
- Add/remove items
- Reorder items (update position)
- Rename playlist
- Delete playlist
- Duplicate playlist

**Smart Suggestions:**
- Calculate user's typical commute duration
- Suggest content that fits time window (±5 minutes)
- Prioritize in-progress content
- Consider content type preferences

**UI Components:**
- Playlist creation modal
- Drag-and-drop reordering
- Add to playlist quick action
- Playlist card in library
- Playlist detail view

**Sync:**
- Sync playlists across devices
- Handle concurrent edits
- Merge conflicts (most recent wins)

---

### Design Reference

See design documents:
- [Interaction Flow: Building a Queue/Playlist](../../../3-design/InteractionFlow.md#5-building-a-queueplaylist)
- Wireframes: [To be added]

---

### Dependencies

- **Depends on:** Feature 3.2 (Offline Playback) for playback system
- **Blocks:** Feature 5.1 (Car Mode) benefits from pre-built playlists
- **Related:** Feature 4.1 (Sync) for cross-device playlist sync

---

### Testing Notes

**Test Scenarios:**

1. **Create Playlist:** Create new playlist with name → Add 3 items → Play
2. **Reorder Items:** Create playlist → Drag items to new positions → Verify order
3. **Add from Library:** Long-press book → Add to Playlist → Verify appears
4. **Smart Suggestions:** Create playlist → Verify suggestions fit commute time
5. **Multiple Playlists:** Create 3 playlists → Add same item to multiple
6. **Delete Playlist:** Create → Delete → Verify removed and items remain in library

**Edge Cases:**

- Empty playlist (no items)
- Single-item playlist
- Very long playlist (100+ items)
- Adding deleted content to playlist
- Playlist with unavailable (not downloaded) items
- Concurrent edits on multiple devices

---

### Estimated Effort

**5 story points** (1-2 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
