# Feature 5.1: Car Mode UI

### Epic Context

**Parent Epic:** [Epic 5: Car Mode](../../epics/epic-5-car-mode.md)
**Epic Objective:** Create driving-optimized interface prioritizing safety

---

### Feature Overview

**What:** A simplified, safety-focused interface with large buttons, voice commands, and automatic activation when connected to car Bluetooth, designed for minimal distraction while driving.

**Why:** Driving safety is paramount. Users need to control playback without taking eyes off the road or hands off the wheel.

**Success Criteria:**
- All interactions completable in <2 seconds
- Voice command accuracy >95%
- Zero safety-related incidents
- >90% user satisfaction with Car Mode

---

### User Stories

Link to related user stories:

- [Story 5.1.1: Hands-Free Controls](../../userstories/epic-5-car-mode/feature-5.1/us-5.1.1-hands-free-controls.md) - Voice commands and large button controls for safe driving

---

### Technical Requirements

**Auto-Activation:**
- Detect car Bluetooth connection
- Detect driving motion (speed sensors)
- Manual toggle option
- User preference settings (always/never/ask)
- Exit Car Mode when disconnected

**UI Simplification:**
- Large touch targets (80x80pt minimum for primary)
- High contrast dark mode
- Extra-large text (24pt minimum)
- Limited screen elements (max 5 interactive)
- No scrolling or complex navigation
- No typing or text input

**Voice Commands:**
- Integration with Siri/Google Assistant
- Support core commands (play, pause, skip, speed)
- Audio feedback for commands
- Works with screen locked
- Background noise handling

**CarPlay/Android Auto:**
- Native CarPlay integration
- Native Android Auto integration
- Simplified interface for car displays
- Steering wheel button support
- Car speaker integration

**Safety Features:**
- Haptic feedback for all interactions
- Audio confirmation for voice commands
- Auto-pause for interruptions (calls, navigation)
- No popups or modals while driving
- Instant response (<500ms)

**Controls:**
- Play/Pause (center, largest button)
- Skip back 15s / Skip forward 30s
- Speed control (1x, 1.25x, 1.5x, 2x)
- Previous/Next chapter
- Voice command activation

---

### Dependencies

- **Blocks:** Critical for safe driving experience
- **Blocked by:** Feature 3.2 (needs playback system), Feature 3.1 (needs queue)
- **Related:** All playback features need Car Mode version

---

### Definition of Done

- [x] All user stories completed with acceptance criteria met
- [ ] Auto-detect car connection
- [ ] Simplified Car Mode UI implemented
- [ ] Large button controls (80x80pt+)
- [ ] Voice command integration
- [ ] CarPlay app integration
- [ ] Android Auto app integration
- [ ] Interruption handling (calls, navigation)
- [ ] Dark mode optimized for night driving
- [ ] Response time <500ms for all controls
- [ ] Haptic and audio feedback
- [ ] Manual toggle and preferences
- [ ] Unit tests written and passing
- [ ] Safety testing completed
- [ ] CarPlay/Android Auto certification
- [ ] Code reviewed and merged
- [ ] Feature documented
- [ ] User testing in real driving scenarios

---

### Metadata & Change History

| Version | Date       | Author     | Changes                                    |
| ------- | ---------- | ---------- | ------------------------------------------ |
| v1.0    | 2025-10-10 | Chris Park | Initial feature breakdown for Car Mode UI. |
