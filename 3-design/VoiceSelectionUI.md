---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: design
---

# Voice Selection UI Design

## Overview

The voice selection interface allows users to browse, preview, and choose AI voices for their content. It's a critical touchpoint that sets expectations for audio quality.

---

## Design Goals

1. **Easy Comparison**: Users can quickly audition multiple voices
2. **Clear Differentiation**: Voice characteristics are immediately obvious
3. **Fast Preview**: Samples load and play instantly (<2s)
4. **Confident Selection**: Users feel good about their choice

---

## Screen Layout

### Voice Selection Screen

```
┌─────────────────────────────────────────┐
│  ← Choose a Voice                    ✓  │
├─────────────────────────────────────────┤
│                                         │
│  Choose a voice for:                    │
│  "The Pragmatic Programmer"             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🎤 Alex           ⭐ Popular      │ │
│  │ Professional • Male • Clear       │ │
│  │                                   │ │
│  │ Perfect for technical content     │ │
│  │                                   │ │
│  │ [  ▶  Preview  ]      [ Select ]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🎤 Emma                           │ │
│  │ Conversational • Female • Warm    │ │
│  │                                   │ │
│  │ Great for fiction and storytelling│ │
│  │                                   │ │
│  │ [  ▶  Preview  ]      [ Select ]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🎤 Jordan                         │ │
│  │ Narrative • Neutral • Expressive  │ │
│  │                                   │ │
│  │ Ideal for non-fiction books       │ │
│  │                                   │ │
│  │ [  ▶  Preview  ]      [ Select ]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Show More Voices]                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## Voice Card Component

### Structure

Each voice card contains:

1. **Voice Name**: Large, bold (20pt)
2. **Microphone Icon**: Visual indicator
3. **Characteristics Tags**: Gender • Style • Accent
4. **Badge** (optional): ⭐ Popular, 🆕 New, 👤 Recommended
5. **Description**: One-sentence use case
6. **Preview Button**: Play 15-30s sample
7. **Select Button**: Choose this voice

### Visual Hierarchy

```
┌─────────────────────────────────────────┐
│ 🎤 Alex                  ⭐ Popular     │  ← Name + Badge
│ Professional • Male • Clear             │  ← Characteristics
│                                         │
│ Perfect for technical content and       │  ← Description
│ non-fiction books                       │
│                                         │
│ [  ▶  Preview  ]         [ Select ]     │  ← Actions
└─────────────────────────────────────────┘
```

### States

**Default:**
- Background: Surface color (#1E1E1E)
- Border: 1pt gray (#333)

**Playing Preview:**
- Border: 2pt primary color (#4A90E2)
- Preview button: Show waveform animation
- Text: "▶ Playing..."

**Selected:**
- Background: Primary color (15% opacity)
- Border: 2pt primary color
- Checkmark in Select button

---

## Filtering and Search

### Filter Bar

```
┌─────────────────────────────────────────┐
│  All Voices  ▼                         │
│                                         │
│  [ All ]  [ Male ]  [ Female ]  [ ... ] │
└─────────────────────────────────────────┘
```

**Filter Options:**
- Gender: All, Male, Female, Neutral
- Style: All, Professional, Conversational, Narrative, Storytelling
- Accent: All, US, UK, Neutral
- Content Type: All, Fiction, Non-Fiction, Technical, Articles

### Search Bar (Future)
- Appears after user has >10 voices
- Searches by name and characteristics
- Type-ahead suggestions

---

## Preview Player

### Inline Playback

When user taps Preview:

```
┌─────────────────────────────────────────┐
│ 🎤 Alex                  ⭐ Popular     │
│ Professional • Male • Clear             │
│                                         │
│ Perfect for technical content and       │
│ non-fiction books                       │
│                                         │
│ [ ⏸ Playing... ]  ━━━━━━●────  0:08    │  ← Progress bar
│                          [ Select ]     │
└─────────────────────────────────────────┘
```

**Behavior:**
- Tapping Preview on another voice stops current playback
- Only one preview plays at a time
- Preview auto-stops at end
- Preview loops if user doesn't interact

### Preview with User's Content (Optional Feature)

```
┌─────────────────────────────────────────┐
│  Preview Options                        │
│                                         │
│  [ 📖 Sample Text ]                     │
│  [ 📄 My Book's First Paragraph ]       │
│                                         │
└─────────────────────────────────────────┘
```

- Generates quick preview with user's actual content
- Helps users make more informed choice
- Takes 5-10 seconds to generate

---

## Voice Recommendation Logic

### Suggested Voice

Display one voice as "Recommended for You" based on:

1. **Content Type**:
   - Fiction → Storytelling voice
   - Technical → Professional voice
   - Articles → Conversational voice

2. **User History**:
   - Previously selected voices
   - Highly rated voices from similar users

3. **Popularity**:
   - Most selected voice overall
   - Highest satisfaction rating

**UI Indicator:**
```
┌─────────────────────────────────────────┐
│ 🎤 Alex            ⭐ Recommended       │
│ Based on your book genre               │
└─────────────────────────────────────────┘
```

---

## Empty States

### Loading Voices

```
┌─────────────────────────────────────────┐
│                                         │
│           Loading voices...             │
│                                         │
│              [Spinner]                  │
│                                         │
└─────────────────────────────────────────┘
```

### No Voices Available (Error)

```
┌─────────────────────────────────────────┐
│                                         │
│      ⚠️ Unable to load voices          │
│                                         │
│     Check your internet connection      │
│                                         │
│          [ Try Again ]                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Voice Comparison Mode (Future)

Allow users to compare 2-3 voices side-by-side:

```
┌─────────────────────────────────────────┐
│  Compare Voices                         │
├─────────────────────────────────────────┤
│  Alex               Emma                │
│  Professional       Conversational      │
│  [▶ Play]          [▶ Play]            │
│                                         │
│  "In the beginning..."                  │
│                                         │
│  [ Select Alex ]    [ Select Emma ]     │
└─────────────────────────────────────────┘
```

---

## Microcopy

### Encouragement
- "Find the perfect narrator for your book"
- "Each voice brings its own personality"

### Guidance
- "Not sure? Try Alex – our most popular voice"
- "You can change the voice later"

### Reassurance
- "All voices are high quality"
- "Preview as many as you like"

---

## Accessibility

### VoiceOver/TalkBack
- Voice cards: "Alex, Professional male voice with clear accent. Recommended for technical content. Double tap to preview."
- Playing state: "Now playing preview for Alex voice"
- Selection: "Alex voice selected"

### Keyboard Navigation
- Tab through voice cards
- Enter to play preview
- Space to select

### Dynamic Type
- Support text scaling up to 200%
- Cards expand to accommodate larger text

---

## Analytics Tracking

### Events to Track
- Voices previewed (which and how many)
- Preview duration (full listen or partial)
- Voice selected
- Time to selection (how long they browse)
- Voice changed later (dissatisfaction signal)

### Insights
- Most popular voices overall
- Popular voices by content type
- Voices with low preview-to-selection ratio (bad quality?)

---

## Technical Considerations

### Preview Audio Files
- Pre-generated samples stored on CDN
- Format: MP3, 128kbps, 15-30s duration
- Cached locally after first play
- Generic sample text (same for all users) OR genre-specific

### Voice Metadata Structure
```json
{
  "id": "voice_alex_001",
  "name": "Alex",
  "gender": "male",
  "style": "professional",
  "accent": "us_neutral",
  "description": "Perfect for technical content and non-fiction books",
  "preview_url": "https://cdn.ridecast.com/voices/alex_preview.mp3",
  "tags": ["popular", "recommended"],
  "rating": 4.7,
  "usage_count": 15000
}
```

### Performance
- Load voice list: <1s
- Play preview: <2s (including network)
- Cache previews: After first play
- Preload previews: Top 3 voices

---

## Future Enhancements

### Voice Rating
Allow users to rate voices after using them:

```
┌─────────────────────────────────────────┐
│  How did you like the Alex voice?      │
│                                         │
│  ⭐ ⭐ ⭐ ⭐ ⭐                          │
│                                         │
│  [ Skip ]              [ Submit ]       │
└─────────────────────────────────────────┘
```

### Custom Voices (Voice Cloning)
- Upload voice sample (30s-1min)
- Generate custom voice
- Use for personal content only

### Voice Packs
- Themed voice collections
- Premium voices (higher quality or celebrity)
- Seasonal voices (holiday-themed)

### A/B Testing
- Test different card layouts
- Test preview lengths (15s vs 30s)
- Test recommendation algorithms
