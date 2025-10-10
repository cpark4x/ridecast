# Ridecast

> Turn any book or document into a personalized listening experience for your commute.

**Ridecast** is a generative audio platform that converts written content into high-quality, AI-narrated audio optimized for car rides and commutes.

---

## 📖 About This Repository

This is a **spec-driven filesystem** for the Ridecast project. All product requirements, design decisions, and technical specifications are documented as markdown files, following the Amplifier methodology.

---

## 🗂️ Repository Structure

```
ridecast/
├── vision/              # High-level vision and goals
│   ├── Vision.md
│   ├── ProblemStatement.md
│   ├── Principles.md
│   └── SuccessMetrics.md
│
├── product/             # Product specifications
│   ├── Epics/           # High-level feature epics
│   ├── Features/        # Detailed feature specs
│   └── UserStories/     # User stories with acceptance criteria
│
├── design/              # Design documentation
│   ├── DesignVision.md
│   ├── InteractionFlow.md
│   ├── CarModeUI.md
│   ├── VoiceSelectionUI.md
│   └── PrototypeLinks.md
│
├── tech/                # Technical architecture
│   ├── Architecture.md
│   ├── StackDecisionLog.md
│   └── DataFlowDiagram.md
│
└── README.md            # This file
```

---

## 🎯 Vision

**Mission**: Make knowledge accessible and engaging during drive time by creating high-quality, AI-generated audio content that adapts to your preferences, schedule, and listening context.

**Core Value**:
- Turn reading time into drive time
- Personalized audio experience
- Commute-optimized content
- Offline-first architecture
- Hands-free, safety-first controls

---

## 🚀 Key Features (Planned)

### MVP Features
- **Audio Creation**: Convert EPUB, PDF, TXT, and URLs to audio
- **Voice Selection**: Choose from multiple high-quality AI voices
- **Library & Playback**: Organize and play audio content offline
- **Car Mode**: Safety-focused UI with large controls and voice commands
- **Cross-Device Sync**: Resume seamlessly across devices

### Future Features
- CarPlay and Android Auto integration
- Custom voice cloning
- Smart playlists based on commute length
- Multi-language support
- Social features (shared playlists)

---

## 📋 Documentation Index

### Vision & Strategy
- [Vision](vision/Vision.md) - Full product vision and long-term goals
- [Problem Statement](vision/ProblemStatement.md) - The problem we're solving
- [Design Principles](vision/Principles.md) - Core principles guiding decisions
- [Success Metrics](vision/SuccessMetrics.md) - How we measure success

### Product Specifications
- [Epics](product/Epics/) - High-level feature groups
  - E1: Audio Creation
  - E2: Voice System
  - E3: Library & Playback
  - E4: User Profiles
  - E5: Car Mode
- [Features](product/Features/) - Detailed feature specs
- [User Stories](product/UserStories/) - Stories with acceptance criteria

### Design
- [Design Vision](design/DesignVision.md) - Visual and interaction design philosophy
- [Interaction Flow](design/InteractionFlow.md) - User flows and journeys
- [Car Mode UI](design/CarModeUI.md) - Driving-optimized interface
- [Voice Selection UI](design/VoiceSelectionUI.md) - Voice browsing and preview
- [Prototype Links](design/PrototypeLinks.md) - Links to Figma/mockups

### Technical
- [Architecture](tech/Architecture.md) - System architecture overview
- [Stack Decision Log](tech/StackDecisionLog.md) - Technology choices and rationale
- [Data Flow Diagram](tech/DataFlowDiagram.md) - How data moves through the system

---

## 🛠️ Technology Stack (Planned)

### Mobile Apps
- **iOS**: SwiftUI, AVFoundation, CarPlay
- **Android**: Jetpack Compose, ExoPlayer, Android Auto

### Backend
- **API**: Node.js (Express) with TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: AWS S3 or Google Cloud Storage
- **Queue**: Redis Queue or AWS SQS

### External Services
- **TTS API**: Azure Neural TTS or ElevenLabs
- **CDN**: CloudFlare or AWS CloudFront
- **Auth**: JWT with refresh tokens
- **Analytics**: Mixpanel or Amplitude
- **Error Tracking**: Sentry

---

## 📐 Development Methodology

This project follows a **spec-driven development** approach:

1. **Define**: Write specs before building features
2. **Review**: Collaborate on specs via PRs
3. **Build**: Implement against approved specs
4. **Iterate**: Update specs as we learn

### Spec Metadata

All spec documents include frontmatter:
```yaml
---
version: 0.1.0
author: Chris Park
status: draft | in-review | approved | implemented
last_updated: 2025-10-10
type: vision | product | design | technical
---
```

---

## 🔄 Current Status

**Phase**: Initial Planning & Spec Development

- [x] Project structure created
- [x] Vision documents drafted
- [x] Product epics defined
- [x] User stories written
- [x] Design principles established
- [x] Technical architecture drafted
- [ ] Technology decisions finalized
- [ ] Prototypes created
- [ ] MVP development started

---

## 🤝 Contributing

This is currently a solo project by Chris Park. If you're interested in contributing or collaborating, please reach out.

### How to Use This Repo

1. **Start with Vision**: Read [Vision.md](vision/Vision.md) to understand the big picture
2. **Explore Product**: Check [Epics](product/Epics/) to see planned features
3. **Review Design**: Look at [Design Vision](design/DesignVision.md) for UX principles
4. **Understand Tech**: Read [Architecture.md](tech/Architecture.md) for technical details

---

## 📝 License

TBD - This is currently a private project.

---

## 📧 Contact

**Chris Park**
- Project: Ridecast
- Methodology: Amplifier (spec-driven development)

---

## 🗓️ Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-10-10 | Initial project structure and specs |

---

## 🙏 Acknowledgments

- Inspired by the need for productive commute time
- Built with the Amplifier spec-driven methodology
- Using Claude Code for project initialization

---

**Note**: This is a living document. As the project evolves, this README will be updated to reflect current status and progress.
