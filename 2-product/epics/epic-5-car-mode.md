---
epic_id: E5
version: 0.1.0
author: Chris Park
status: draft
last_updated: 2025-10-10
priority: high
type: epic
---

# Epic 5: Car Mode

## Overview
Create a driving-optimized interface that prioritizes safety, minimal distraction, and easy interaction through large touch targets, voice commands, and integration with CarPlay/Android Auto.

## Goals
- Zero-distraction interface design
- Large, easy-to-tap controls
- Voice command support for all primary functions
- CarPlay and Android Auto integration
- Auto-detection of driving mode

## Scope

### In Scope
- Simplified "Car Mode" UI with large buttons
- Voice commands (play, pause, skip, speed, next chapter)
- CarPlay integration
- Android Auto integration
- Automatic mode switching based on Bluetooth/motion
- Emergency pause (phone call, navigation alert)
- Lock screen controls optimized for glances

### Out of Scope (for v1)
- Advanced voice assistant features
- Integration with other navigation apps
- Steering wheel button customization
- Head-up display (HUD) support

## User Stories
- US6: Hands-Free Controls

## Success Criteria
- All controls usable with <2 second interaction
- Voice command accuracy >95%
- CarPlay/Android Auto certified
- Zero crashes or freezes during drive sessions
- <0.5 second response time for controls

## Technical Considerations
- CarPlay framework integration
- Android Auto framework integration
- Voice recognition (Siri/Google Assistant integration vs custom)
- Motion/Bluetooth detection for auto-mode
- Audio focus management for interruptions

## Dependencies
- Epic 3: Library & Playback (controls for playback system)
- CarPlay/Android Auto developer accounts

## Timeline Estimate
- MVP: 4-5 weeks (basic car mode UI)
- Full feature set: 8-10 weeks (with CarPlay/Android Auto)
