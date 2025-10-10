---
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
type: design
---

# Car Mode UI Design

## Overview

Car Mode is a safety-critical interface optimized for hands-free operation and minimal visual distraction while driving.

---

## Design Constraints

### Safety Requirements
- All interactions completable in <2 seconds
- No typing or complex input
- No scrolling lists
- No modal dialogs that block playback
- Dark mode only (reduce glare)
- High contrast (readable in bright sunlight)

### Touch Target Sizes
- Primary actions: 80x80pt minimum
- Secondary actions: 60x60pt minimum
- Text: 24pt minimum
- Spacing: 20pt minimum between targets

### Visual Simplification
- Maximum 5 interactive elements on screen
- No more than 2 levels of hierarchy
- Large, simple icons
- Minimal text (essential info only)

---

## Screen Layouts

### Main Car Mode Screen

```
┌─────────────────────────────────────────┐
│                                         │
│         THE PRAGMATIC PROGRAMMER        │
│           Chapter 3: The Power          │
│            of Plain Text                │
│                                         │
│   ┌──────┐    ┌──────┐    ┌──────┐    │
│   │  ◄◄  │    │      │    │  ►►  │    │
│   │ -15s │    │ PAUSE│    │ +30s │    │
│   └──────┘    └──────┘    └──────┘    │
│                                         │
│   ━━━━━━━━━━━━━━━━●─────────────────   │
│   12:34 / 22:18                         │
│                                         │
│   Speed: 1.5x            🎤 Voice       │
│                                         │
└─────────────────────────────────────────┘
```

**Elements:**
1. **Content Info** (top)
   - Book title: 24pt, bold, white
   - Chapter: 20pt, regular, gray
   - Truncate long titles with ellipsis

2. **Primary Controls** (center)
   - Skip back 15s: 80x80pt button, left
   - Play/Pause: 100x100pt button, center (largest)
   - Skip forward 30s: 80x80pt button, right

3. **Progress Bar** (below controls)
   - Current time / Total time
   - Large scrubber handle (60x60pt)
   - Chapter markers visible

4. **Secondary Controls** (bottom)
   - Speed toggle: Single tap cycles through 1x → 1.25x → 1.5x → 2x → 1x
   - Voice command: Launches voice input

---

### CarPlay Interface

```
┌─────────────────────────────────────────┐
│  Ridecast                        [≡]    │
├─────────────────────────────────────────┤
│                                         │
│          The Pragmatic Programmer       │
│            Chapter 3 of 12              │
│                                         │
│              [   PAUSE   ]              │
│                                         │
│   ━━━━━━━━━━━━━━●─────────────────────  │
│                                         │
│    [ ◄◄ ]           [ 1.5x ]    [ ►► ] │
│                                         │
└─────────────────────────────────────────┘
```

**CarPlay Specific:**
- Follows Apple CarPlay design guidelines
- Limited to 5 buttons per screen
- No custom fonts (use system)
- High contrast, simple layouts
- Now Playing screen + Library view

---

### Android Auto Interface

```
┌─────────────────────────────────────────┐
│  ← Ridecast                             │
├─────────────────────────────────────────┤
│                                         │
│         The Pragmatic Programmer        │
│               Chapter 3                 │
│                                         │
│                                         │
│            [  ⏸ PAUSE  ]                │
│                                         │
│   ━━━━━━━━━━━━━●───────────────────     │
│   12:34                          22:18  │
│                                         │
│  [Previous]   [1.5x]   [Next Chapter]  │
│                                         │
└─────────────────────────────────────────┘
```

**Android Auto Specific:**
- Follows Google Android Auto guidelines
- Material Design principles
- Voice actions via Google Assistant
- Max 4 content slots

---

## Component Specifications

### Play/Pause Button

**Normal Mode:**
- Size: 100x100pt
- Shape: Circle
- Background: Primary color (#4A90E2)
- Icon: Play (▶) or Pause (⏸), 48pt
- States:
  - Default: Background color
  - Pressed: Scale 0.95x + darker background
  - Loading: Spinner overlay

**Visual:**
```
     ┌─────────┐
     │         │
     │    ▶    │    (Play state)
     │         │
     └─────────┘

     ┌─────────┐
     │         │
     │   ⏸    │    (Pause state)
     │         │
     └─────────┘
```

### Skip Buttons

**Design:**
- Size: 80x80pt
- Shape: Rounded square (12pt radius)
- Background: Secondary color (#2C2C2C)
- Icon: ◄◄ or ►►, 36pt
- Label: -15s or +30s, 14pt, below icon

**Visual:**
```
  ┌──────────┐         ┌──────────┐
  │    ◄◄    │         │    ►►    │
  │   -15s   │         │   +30s   │
  └──────────┘         └──────────┘
```

### Speed Control

**Design:**
- Size: 60x60pt
- Shape: Rounded rectangle
- Background: Transparent
- Border: 2pt, gray
- Text: "1.5x", 18pt, center

**Behavior:**
- Single tap cycles through speeds
- Brief animation showing new speed
- Haptic feedback on change

**Visual:**
```
  ┌─────────┐
  │  1.0x   │  → tap →  ┌─────────┐
  └─────────┘           │  1.25x  │
                        └─────────┘
```

### Progress Bar

**Design:**
- Height: 8pt
- Background: Dark gray (#333)
- Progress fill: Primary color (#4A90E2)
- Scrubber handle: 40x40pt circle, white

**Behavior:**
- Tap: Jump to position
- Drag: Scrub to position
- Chapter markers: Small vertical lines (12pt height)

**Visual:**
```
  ━━━━━━━━━━━━━━━●─────────────────────
  0:00                            22:18
```

---

## Voice Command Overlay

When user activates voice:

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              🎤 Listening...            │
│                                         │
│          Say a command like:            │
│          • "Pause"                      │
│          • "Skip forward"               │
│          • "Speed up"                   │
│                                         │
│              [Cancel]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Auto-dismisses after:**
- Command recognized (2s)
- 5 seconds of silence
- User taps Cancel

---

## Supported Voice Commands

### Playback Control
- "Play" / "Pause" / "Stop"
- "Resume"

### Navigation
- "Next chapter" / "Previous chapter"
- "Skip forward" / "Skip back"
- "Go to chapter [number]"
- "Start from beginning"

### Speed Control
- "Faster" / "Speed up" (increases by 0.25x)
- "Slower" / "Slow down" (decreases by 0.25x)
- "Normal speed" / "Regular speed" (1x)

### Content Selection
- "Play [book name]"
- "Resume [book name]"

---

## Auto-Activation Logic

### Bluetooth Detection
```python
if bluetooth_device.is_car:
    activate_car_mode()
    auto_resume_last_content()
```

### Motion Detection
```python
if speed > 15_mph and !is_passenger:
    suggest_car_mode()
```

### Manual Override
- Settings: "Always use Car Mode"
- Settings: "Never auto-activate"
- Quick Settings tile (Android)

---

## Notification and Lock Screen

### Lock Screen Controls (iOS)

```
┌─────────────────────────────┐
│  Ridecast                   │
│  The Pragmatic Programmer   │
│  Chapter 3                  │
│                             │
│  [◄◄]   [⏸]   [►►]         │
└─────────────────────────────┘
```

### Notification (Android)

```
┌─────────────────────────────┐
│  🎧 Ridecast - Car Mode     │
│  The Pragmatic Programmer   │
│  Chapter 3 • 12:34 / 22:18  │
│                             │
│  [◄◄]  [⏸]  [►►]  [1.5x]   │
└─────────────────────────────┘
```

**Always Visible:**
- Non-dismissible while playing
- Quick access to controls
- Shows current position

---

## Dark Mode Optimization

### Color Adjustments for Night Driving
- Background: Pure black (#000000) vs. dark gray
- Text: Off-white (#E0E0E0) vs. pure white (reduce glare)
- Primary buttons: Slightly desaturated blue
- Avoid bright reds or intense colors

### Brightness Auto-Adjust
- Detect ambient light (if available)
- Dim UI further at night
- Increase contrast in bright daylight

---

## Accessibility in Car Mode

### VoiceOver/TalkBack
- All buttons labeled clearly
- Progress announcements ("12 minutes remaining")
- Chapter change announcements

### Haptic Feedback
- Button press: Light tap
- Skip action: Medium tap
- Error: Three quick taps
- Chapter boundary: Gentle notification tap

---

## Error States in Car Mode

### Playback Error

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           ⚠️ Playback Error             │
│                                         │
│         Unable to load audio            │
│                                         │
│              [ Try Again ]              │
│              [ Choose Another ]         │
│                                         │
└─────────────────────────────────────────┘
```

**Principle:** Large buttons, minimal text, clear actions

---

## Implementation Notes

### Performance Requirements
- Button response: <100ms
- Skip action execution: <200ms
- Voice command response: <500ms
- No lag or stutter during UI updates

### Testing Checklist
- [ ] All controls accessible with gloves
- [ ] Readable in direct sunlight
- [ ] Readable at night (not too bright)
- [ ] Works with various car displays (size, resolution)
- [ ] Handles interruptions gracefully (calls, navigation)
- [ ] Voice commands work with background noise
- [ ] No accidental taps (button spacing adequate)
- [ ] Battery efficient (no excessive wake-ups)
