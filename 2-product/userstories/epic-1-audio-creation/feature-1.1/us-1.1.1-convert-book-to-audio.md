# User Story 1.1.1: Convert Book to Audio

> Part of [Feature 1.1: Text-to-Speech Conversion](../../../features/epic-1-audio-creation/feature-1.1-text-to-speech-conversion.md)

---

### User Story

**As a** daily commuter
**I want** to upload a book and convert it to audio
**So that** I can listen to it during my drive instead of having it sit unread on my shelf

---

### Acceptance Criteria

- [ ] Given I have an EPUB file on my device, when I tap "Add Content" and select the file, then the app extracts the book's metadata (title, author, cover) and shows me a preview
- [ ] Given I have selected a voice for my book, when I tap "Convert to Audio", then the app shows a progress indicator with estimated time and allows me to continue using the app
- [ ] Given my book conversion is in progress, when I navigate away from the app, then the conversion continues in the background and I receive a notification when complete
- [ ] Given I have uploaded a corrupted or incompatible file, when the conversion fails, then the app shows a clear error message with troubleshooting steps and allows me to retry
- [ ] Given my book has been successfully converted, when conversion completes, then the audio appears in my library with correct metadata and I can immediately start playing it
- [ ] Given I have previously listened to converted audio, when I return to it later, then the app remembers my exact playback position

---

### Technical Notes

**Text Extraction:**
- Use epub.js for EPUB files
- Use pdf.js or PyPDF2 for PDF files
- Support plain TXT files
- Extract metadata: title, author, cover image, ISBN (if available)

**Content Processing:**
- Clean text: remove page numbers, headers, footers
- Detect chapter boundaries
- Preserve paragraph structure
- Handle special characters and formatting

**Conversion Pipeline:**
1. Upload and validate file
2. Extract text and metadata
3. Create conversion job in queue
4. Send text chunks to TTS API
5. Receive and concatenate audio segments
6. Add chapter markers and metadata
7. Upload to storage
8. Update database and notify user

**Error Handling:**
- Validate file format before processing
- Check file size limits
- Handle TTS API failures with retry logic
- Provide specific error messages
- Allow manual retry

---

### Design Reference

See design documents:
- [Interaction Flow: Converting Content](../../../3-design/InteractionFlow.md#2-converting-content-to-audio)
- Wireframes: [To be added to PrototypeLinks.md]

---

### Dependencies

- **Depends on:** TTS API integration must be complete
- **Blocks:** US 3.2.1 (Save and Play Offline) - needs audio files to download
- **Related:** US 1.1.2 (Select Voice) - voice selection happens during this flow

---

### Testing Notes

**Test Scenarios:**

1. **Happy Path:** Upload valid EPUB → Select voice → Convert → Play
2. **Large File:** Upload 500-page book and verify conversion completes
3. **Invalid File:** Upload non-book file and verify error handling
4. **Background Processing:** Start conversion → Close app → Verify continues
5. **Progress Tracking:** Monitor progress indicator updates during conversion
6. **Metadata Accuracy:** Verify title, author, cover extracted correctly

**Edge Cases:**

- File with no metadata
- File with special characters in title
- Extremely large file (>100MB)
- Network interruption during upload
- TTS API rate limit reached
- Storage space full on device or server

---

### Estimated Effort

**8 story points** (2-3 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
