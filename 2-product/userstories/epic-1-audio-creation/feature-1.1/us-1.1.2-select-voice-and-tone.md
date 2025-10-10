# User Story 1.1.2: Select Voice and Tone

> Part of [Feature 1.1: Text-to-Speech Conversion](../../../features/epic-1-audio-creation/feature-1.1-text-to-speech-conversion.md)

---

### User Story

**As a** listener with specific preferences
**I want** to choose from different AI voices and preview them
**So that** I can find a narrator voice that I enjoy and that matches the content

---

### Acceptance Criteria

- [ ] Given I am about to convert a book, when I reach the voice selection step, then I see a list of available voices with characteristics (gender, style, accent)
- [ ] Given I am browsing the voice library, when I tap the preview button on a voice, then a 15-30 second sample plays immediately (<2s load time)
- [ ] Given I am previewing a voice, when I tap preview on another voice, then the current preview stops and the new one starts playing
- [ ] Given I have found a voice I like, when I tap "Use This Voice", then the voice is applied to my conversion and saved as my preferred voice
- [ ] Given I have already converted a book with one voice, when I want to try a different narrator, then I can regenerate the audio with a new voice while preserving my progress
- [ ] Given I have previously selected a voice, when I convert new content, then that voice is pre-selected as the default

---

### Technical Notes

**Voice Library:**
- Minimum 5 distinct voices at launch
- Voice metadata structure:
```json
{
  "id": "voice_alex_001",
  "name": "Alex",
  "gender": "male",
  "style": "professional",
  "accent": "us_neutral",
  "description": "Perfect for technical content",
  "preview_url": "https://cdn.ridecast.com/voices/alex_preview.mp3",
  "rating": 4.7,
  "usage_count": 15000
}
```

**Preview System:**
- Pre-generated 20-second samples
- Cached after first play (CDN + local cache)
- Generic sample text OR genre-specific text
- Support for scrubbing within preview

**Voice Preference Storage:**
- Store in user profile (synced)
- Local cache for offline access
- Per-content-type recommendations
- Most recently used voice

**Voice Recommendation:**
- Fiction → Storytelling voices
- Technical → Professional voices
- Articles → Conversational voices
- Based on user history

---

### Design Reference

See design documents:
- [Voice Selection UI](../../../3-design/VoiceSelectionUI.md)
- [Interaction Flow: Voice Selection](../../../3-design/InteractionFlow.md)

---

### Dependencies

- **Depends on:** TTS API must provide multiple voice options
- **Blocks:** US 1.1.1 (Convert Book) requires voice selection
- **Related:** Feature 2.1 (Voice Selection) - this is the core implementation

---

### Testing Notes

**Test Scenarios:**

1. **Browse Voices:** View all available voices with characteristics
2. **Preview Multiple:** Play previews for 3+ different voices
3. **Select Voice:** Choose voice and verify it's applied to conversion
4. **Voice Persistence:** Select voice → Convert → Create new book → Verify voice pre-selected
5. **Preview Performance:** Verify preview loads and plays in <2 seconds
6. **Offline Behavior:** Verify previously previewed voices cached for offline

**Edge Cases:**

- Voice API unavailable (show cached list)
- Preview file failed to load (show error, allow retry)
- User has no previous voice preference
- Voice removed from API after user selected it
- Multiple devices with different voice preferences

---

### Estimated Effort

**5 story points** (1-2 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
