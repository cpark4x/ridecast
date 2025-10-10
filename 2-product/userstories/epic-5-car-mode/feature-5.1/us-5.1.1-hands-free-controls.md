# User Story 5.1.1: Hands-Free Controls

> Part of [Feature 5.1: Car Mode UI](../../../features/epic-5-car-mode/feature-5.1-car-mode-ui.md)

---

### User Story

**As a** driver prioritizing safety
**I want** to control playback using voice commands and large buttons
**So that** I can manage my audio without taking my eyes off the road or hands off the wheel

---

### Acceptance Criteria

- [ ] Given I connect my phone to my car's Bluetooth, when the connection is established, then Ridecast automatically switches to Car Mode with large, simple controls
- [ ] Given I am in Car Mode, when I say "Hey Siri/Google, pause Ridecast" (or similar), then playback pauses immediately and I hear audio confirmation
- [ ] Given I am listening to a book, when I say "Next chapter" or "Skip forward 30 seconds", then the app jumps to the requested position with audio feedback
- [ ] Given I am in Car Mode, when I glance at the screen and tap any control button, then it responds in <500ms with haptic feedback
- [ ] Given my car supports CarPlay/Android Auto, when I connect my iPhone/Android phone, then Ridecast appears with a simplified interface integrated with my car's display
- [ ] Given I am listening in Car Mode and receive a phone call, when the call comes in, then Ridecast automatically pauses and resumes when the call ends
- [ ] Given I disconnect from my car's Bluetooth, when the disconnection is detected, then Car Mode exits and the app returns to normal UI

---

### Technical Notes

**Auto-Detection:**
```swift
// iOS Example
let bluetoothManager = CBCentralManager()
if bluetoothManager.isCarAudioConnected {
    activateCarMode()
}

// Also check motion sensors
if CMMotionActivityManager.isDriving {
    suggestCarMode()
}
```

**Voice Commands:**
- **iOS:** SiriKit Media Intents
  - INPlayMediaIntent, INPauseMediaIntent
  - INSkipMediaIntent, INSetPlaybackSpeedIntent
- **Android:** Google Assistant App Actions
  - PLAY_MEDIA, PAUSE, RESUME
  - SKIP_NEXT, SKIP_PREVIOUS

**Supported Commands:**
- Play / Pause / Resume / Stop
- Next chapter / Previous chapter
- Skip forward / Skip back
- Faster / Slower / Normal speed
- Go to chapter [number]
- Play [book name]

**Car Mode UI Specs:**
- Button size: 80x80pt minimum (play/pause 100x100pt)
- Text size: 24pt minimum
- Touch targets: 20pt minimum spacing
- Colors: Dark mode with high contrast
- Max interactive elements: 5 per screen

**CarPlay Integration:**
```swift
// CarPlay Template
let playbackTemplate = CPNowPlayingTemplate.shared
playbackTemplate.add(observer: self)
playbackTemplate.upNextButton = createUpNextButton()
```

**Android Auto Integration:**
```kotlin
class RidecastMediaBrowserService : MediaBrowserServiceCompat() {
    override fun onGetRoot(): BrowserRoot {
        return BrowserRoot(ROOT_ID, null)
    }
}
```

**Interruption Handling:**
- Phone calls: Auto-pause, auto-resume
- Navigation alerts: Duck audio or pause
- Other apps: Follow audio session priority

---

### Design Reference

See design documents:
- [Car Mode UI Specifications](../../../3-design/CarModeUI.md)
- [Data Flow: Car Mode Auto-Activation](../../../4-tech/DataFlowDiagram.md#5-car-mode-auto-activation-flow)
- [Voice Command Flow](../../../4-tech/DataFlowDiagram.md#6-voice-command-flow)

---

### Dependencies

- **Depends on:** Feature 3.2 (Playback System), Feature 3.1 (Queue)
- **Blocks:** This is MVP-critical for safe driving experience
- **Related:** All playback features need Car Mode versions

---

### Testing Notes

**Test Scenarios:**

1. **Auto-Activation:** Connect to car Bluetooth → Verify Car Mode activates
2. **Voice Commands:** Say each supported command → Verify execution and feedback
3. **Large Buttons:** Tap all buttons in Car Mode → Verify <500ms response + haptic
4. **CarPlay:** Connect to CarPlay → Verify app appears and functions correctly
5. **Interruptions:** Receive call during playback → Verify pause and resume
6. **Exit Car Mode:** Disconnect Bluetooth → Verify exits and returns to normal UI

**Safety Testing:**
- All interactions completable in <2 seconds
- No typing or text input required
- No scrolling lists
- No modal dialogs that block controls
- Works with gloves on
- Readable in direct sunlight and at night

**Voice Command Testing:**
- Test in noisy environment (car running, road noise)
- Test with various accents
- Test with music playing
- Test rapid successive commands
- Test malformed commands

**CarPlay/Android Auto Testing:**
- Test on multiple car models
- Test with different screen sizes
- Test steering wheel button integration
- Test disconnection scenarios
- Certification requirements met

**Edge Cases:**

- Bluetooth connects but not a car (headphones, speaker)
- Multiple Bluetooth devices connected
- Voice command while another app is speaking
- CarPlay disconnects mid-playback
- Phone call during voice command
- Low battery during Car Mode

---

### Estimated Effort

**13 story points** (4-5 weeks for 1 developer)

---

### Metadata & Change History

| Version | Date       | Author     | Changes                     |
| ------- | ---------- | ---------- | --------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial user story created. |
