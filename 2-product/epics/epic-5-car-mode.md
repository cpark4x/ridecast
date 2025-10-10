# Epic 5: Car Mode

---

### Problem Statement

Listening to audio while driving requires interaction with the app, but any complex interaction creates dangerous distraction. Small buttons, complex navigation, typing, or looking at the screen for more than 2 seconds increases accident risk. Existing audio apps often have cluttered interfaces designed for stationary use, not for driving. Users need a safety-first interface that allows them to control playback without taking their eyes off the road or hands off the wheel - ideally through voice commands and large, obvious buttons.

---

### Objective

Create a driving-optimized interface that enables hands-free control of audio playback through voice commands and large touch targets (<2 second interactions), automatically activates when connected to car Bluetooth, integrates with CarPlay/Android Auto, and maintains zero crashes or freezes with <0.5 second response time - making Ridecast the safest audio app for commuters.

---

### Business Value

- **Safety = Brand Reputation**: Being known as the safest audio app builds trust and word-of-mouth
- **Core Differentiator**: Purpose-built for driving sets us apart from general audio apps
- **Regulatory Compliance**: May become legally required; being ahead positions us well
- **User Confidence**: Users will choose Ridecast over competitors knowing it's designed for safe driving
- **Reduced Liability**: Thoughtful safety design reduces potential legal exposure

---

### Scope

**In-Scope:**

- Simplified "Car Mode" UI with minimal elements (5 max interactive elements per screen)
- Large touch targets (80x80pt minimum for primary, 60x60pt for secondary)
- Voice command support via Siri/Google Assistant for all primary functions
- Auto-detection via Bluetooth car connection or motion sensors
- Manual Car Mode toggle in quick settings
- CarPlay app integration (certified)
- Android Auto app integration (certified)
- Emergency interruption handling (calls, navigation alerts)
- Lock screen controls optimized for quick glances
- Dark mode optimized for night driving
- Haptic feedback for all interactions

**Out-of-Scope:**

- Advanced voice assistant features beyond media control (future)
- Deep integration with navigation apps like Waze (future partnership)
- Steering wheel button customization (depends on car manufacturer APIs)
- Head-up display (HUD) projection (future when APIs available)
- Gesture controls (future exploration)

---

### Features

This epic comprises the following features:

1. [Feature 5.1: Car Mode UI](../features/epic-5-car-mode/feature-5.1-car-mode-ui.md) - Simplified interface with large controls, voice commands, and auto-activation for safe driving

---

### Success Metrics

**Primary Metrics:**

- **Interaction Time**: 100% of controls usable in <2 seconds
- **Voice Accuracy**: >95% voice command recognition rate
- **Response Time**: <0.5 seconds for all button presses
- **Zero Critical Incidents**: Zero crashes or freezes during drive sessions
- **Certification**: CarPlay and Android Auto certified

**Secondary Metrics:**

- Adoption: >70% of commuters use Car Mode regularly
- Auto-Activation: >80% of Car Mode sessions auto-activated (not manual)
- Voice Usage: >40% of users use voice commands at least once
- User Satisfaction: >90% feel Car Mode is safe to use while driving
- Session Completion: <1% of sessions end in app crash or freeze

**How We'll Measure:**

- Log all interaction times (tap to action completion)
- Track voice command attempts and success/failure
- Monitor response time for all controls
- Track crashes and freezes specifically during Car Mode
- User surveys on safety perception
- Analytics for auto-activation vs manual

---

### User Personas

**Primary Users:**

- **Safety-Conscious Driver (Michael, 42)** - Father of two, won't use apps while driving unless they're explicitly designed for it, needs confidence in safety
- **Long Commuter (Lisa, 36)** - 1+ hour commute each way, uses audio apps daily, frustrated by unsafe interfaces
- **CarPlay User (David, 33)** - Has CarPlay-enabled car, expects seamless integration

**Secondary Users:**

- **Rural Driver** - Poor connectivity, needs offline + Car Mode combo
- **Rideshare Driver** - Listens between rides, needs quick on/off

---

### Dependencies

**Technical Dependencies:**

- CarPlay SDK and developer account (Apple)
- Android Auto SDK and developer account (Google)
- Voice integration via SiriKit (iOS) and App Actions (Android)
- Bluetooth and motion detection APIs
- Audio focus management for interruptions

**Product Dependencies:**

- **Requires:** Epic 3: Library & Playback (need playback controls to make car-safe)
- **Enables:** Safe, confident daily use of Ridecast while commuting

---

### Risks & Mitigations

| Risk               | Impact       | Probability  | Mitigation Strategy    |
| ------------------ | ------------ | ------------ | ---------------------- |
| User injury/accident while using app | Critical | Very Low | Extensive safety testing, follow platform guidelines strictly, clear safety warnings, design for <2s interactions |
| CarPlay/Android Auto certification failure | High | Low | Start early, follow Apple/Google guidelines exactly, test on multiple car models, have fallback basic Car Mode |
| Voice commands don't work in noisy car | Medium | Medium | Test in realistic conditions, use platform-native voice (Siri/Assistant), provide visual feedback, ensure buttons work as fallback |
| False positive auto-activation | Low | Medium | Tune detection algorithms carefully, always allow manual override, test with various Bluetooth devices (not just cars) |
| Performance issues (lag, crashes) | High | Low | Extensive performance testing, optimize for minimal processing, monitor in production, have kill switch to disable if issues |

---

### Timeline

**Estimated Duration:** 8-10 weeks for full epic

**Phases:**

1. **Phase 1: Basic Car Mode UI (2 weeks)** - Simplified interface with large buttons, auto-activation
2. **Phase 2: Voice Integration (2 weeks)** - Siri/Google Assistant commands for primary functions
3. **Phase 3: CarPlay (2 weeks)** - CarPlay app development and testing
4. **Phase 4: Android Auto (2 weeks)** - Android Auto app development and testing
5. **Phase 5: Safety Testing & Certification (2 weeks)** - Real-world testing, certification submission, refinements

**Key Milestones:**

- Week 2: Basic Car Mode UI functional with large buttons
- Week 4: Voice commands working for play/pause/skip
- Week 6: CarPlay app submitted for certification
- Week 8: Android Auto app submitted for certification
- Week 10: Both certifications received, safety testing complete, ready for launch

---

### Open Questions

- [ ] Should we disable certain features entirely when Car Mode is active (e.g., no browsing library)?
- [ ] How do we detect "passenger mode" vs "driver mode"?
- [ ] Should we integrate with Do Not Disturb While Driving mode?
- [ ] What's the liability exposure and do we need legal disclaimers?
- [ ] Should Car Mode have a separate voice from the audiobook voice?
- [ ] How do we handle user complaints about "too restrictive" Car Mode?
- [ ] Should we require Car Mode (force it) or just strongly recommend it?

---

### Metadata & Change History

| Version | Date   | Author   | Changes               |
| ------- | ------ | -------- | --------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial epic created following template structure. |
