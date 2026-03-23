# Ridecast — Design Brief

> **This document is the universal design reference for all development on Ridecast.**
> Every visual and copy decision should be traceable back to something here.
> When in doubt: simpler, warmer, more obvious.

---

## 1. Brand Philosophy

### What Ridecast is
A personal AI podcast factory. You give it anything you want to read — articles, PDFs, saved tabs — and it produces a properly produced audio episode. Not text-to-speech. Transformation. It competes against TTS readers and AI summarizers, and beats all of them on: *any content + duration precision + commute UX.*

### What Ridecast stands for
*Listening should be easier than reading.*

Some people will never read that article. But they'd listen to it on the way to work. Ridecast exists for that person — anyone who'd rather hear something than read it, whether that's a 45-minute commuter with a backlog or someone who just wants to hear a piece while they walk.

### Brand personality
**Simple. Warm. Effortless.**

Not enterprise. Not a power-user tool. Not intimidating. Ridecast should feel like the thing you reach for without thinking — the way you reach for music when you get in the car. The sophistication is real but invisible. You never see the machinery. You just press play.

### The design mandate
*Remove every reason not to use it.* Each screen has one job. Each decision has been made for you. The app never asks you to configure what it should curate. Complexity lives in the backend — the surface is clean, warm, and obvious.

### The single repeated message
**"Reads worth listening to."**

This is the external-facing tagline. Use it in the app, in marketing, in the product description. Say it everywhere until it becomes synonymous with Ridecast.

---

## 2. Identity

### Wordmark
- **Typeface:** Geist Sans, weight 800–900, tracking −3%
- **Color:** `#18181A` on light backgrounds; `#F0F0F2` on dark
- **Usage:** Never use the gradient on the wordmark. Clean, confident, no effects.

### Tagline
*"Reads worth listening to."*

Two registers exist in the codebase — keep the short functional version (*"Turn anything into audio for your commute"*) for meta descriptions and SEO. Use the tagline everywhere with brand presence.

### Icon / App mark
**Status: Pending icon study.**

A dedicated icon study is required before committing to a mark. The icon must work at 16px (favicon), 64px (UI), and 512px (App Store). Direction: icon + wordmark combination mark. The icon study will explore visual metaphors for the brand; no placeholder should be promoted to production.

Until the icon study is complete, use a text-only lockup for the wordmark.

---

## 3. Color System

### Philosophy
Neutrals carry the UI. The accent appears only to direct attention or signal state. Less color = more premium.

### Palette

#### Canvas & surfaces
| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#F7F6F3` | Warm off-white page canvas |
| `--surface` | `#FFFFFF` | Cards, elevated surfaces |
| `--surface-2` | `#F0EEE9` | Recessed surfaces, inputs |
| `--border` | `rgba(0,0,0,0.07)` | Subtle dividers |
| `--border-md` | `rgba(0,0,0,0.11)` | Inputs, active card outlines |

#### Text
| Token | Value | Role |
|-------|-------|------|
| `--text` | `#18181A` | Primary — headings, labels |
| `--text-mid` | `rgba(24,24,26,0.50)` | Secondary — supporting text |
| `--text-dim` | `rgba(24,24,26,0.30)` | Tertiary — captions, placeholders |

#### Brand accent — amber-orange
| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#EA580C` | Primary CTAs, active states, progress |
| `--accent-text` | `#C2410C` | Accent text on light backgrounds |
| `--accent-light` | `rgba(234,88,12,0.10)` | Active card tint, badge background |
| `--accent-pale` | `rgba(234,88,12,0.06)` | Subtle hover / selected state |
| Brand gradient | `#EA580C → #F97316 → #FCD34D` | Episode artwork, hero moments only |

#### Status colors — functional only
| Token | Value | Role |
|-------|-------|------|
| `--green` | `#16A34A` | Ready / complete |
| `--green-dim` | `rgba(22,163,74,0.10)` | Badge background |
| `--amber` | `#D97706` | Processing / in-progress |
| `--amber-dim` | `rgba(217,119,6,0.10)` | Badge background |

### Rules
1. **Status colors communicate, never decorate.** Green and amber do not appear in gradients, hover states, or illustrations.
2. **Don't add color where opacity will do.** `rgba(0,0,0,0.05)` on a white surface is usually enough.
3. **Amber-orange only on primary actions and active states.** If you're reaching for it decoratively — don't.
4. **Artwork carries the warmth.** The gradient lives in episode artwork and hero moments. Everywhere else: restrained.

---

## 4. Typography

### Typeface: Geist Sans
Replaces Inter throughout the app. Purpose-built for screen rendering. Available via `next/font/google` at zero cost.

```ts
import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
```

### Scale

| Role | Size | Weight | Tracking | Usage |
|------|------|--------|----------|-------|
| Hero / wordmark | 52–84px | 900 | −4% | Marketing, splash |
| Screen title | 26–28px | 800 | −3% | H1 per screen |
| Card title | 16–20px | 700 | −2% | Episode titles, section heads |
| Body / detail | 13–15px | 400–500 | 0 | Supporting text |
| Section label | 10–11px | 700 | +12%, uppercase | Category labels |
| Caption / time | 11px | 400 | 0 | Metadata, timestamps |

### Rules
1. **Headings: heavy and tight.** 700–900 weight, negative tracking.
2. **Body: light and spacious.** 400–500 weight, normal tracking.
3. **Skip 600 weight.** It sits in the uncanny valley — go bold or go regular.
4. **Tabular nums for all time displays.** `font-variant-numeric: tabular-nums` on duration, progress, timestamps.
5. **Antialiasing globally.** `-webkit-font-smoothing: antialiased`.

---

## 5. Motion

### Philosophy
Motion communicates state, not personality. Every animation has a job. If you can't describe what it's communicating — remove it.

### Timing

| Context | Duration | Easing |
|---------|----------|--------|
| Micro (button press, badge) | 120ms | `ease-out` |
| Transition (screen, overlay) | 260ms | `ease-in-out` |
| Hero / ambient (artwork, glow) | 800ms–9s | `ease infinite` |

### The three animations

1. **Gradient shift** — Episode artwork breathes slowly. 9s loop. Background-position oscillation. Never jarring.
2. **Slide-up entrance** — New content enters from `translateY(12px)` at `opacity: 0`. Resolves in 260ms.
3. **Processing pulse** — Active pipeline step glows softly via box-shadow pulse. Progress feels alive.

### Rules
- No bounces. No spring physics. No celebratory confetti.
- This is a tool people use every day — surprise wears out.
- Transitions exist to maintain spatial context, not to entertain.

---

## 6. Voice & Tone

### The personality
Direct. Warm. Quietly confident. Ridecast doesn't explain itself — it invites you in.

### The register
Conversational, never casual. Like a smart friend who knows about this — not a brand, not a manual.

### The model line
> *"You have a 45-minute commute and 12 tabs you'll never read."*

Short sentences. Specific. Earns the reader in one line. This is the voice everything should aspire to.

### In practice

| Instead of... | Say... |
|---------------|--------|
| "Upload your content to begin the AI-powered transformation process" | "Drop a link. We'll handle the rest." |
| "Your episode has been successfully generated" | "Ready to play." |
| "Select your desired episode duration" | "How long is your commute?" |
| "Processing your content" | "Writing your episode..." |
| "An error has occurred. Please try again." | "Something went wrong. Try again?" |
| "Generating audio narration" | "Almost ready." |

### Rules
- **No exclamation marks. Ever.**
- No "powerful", "seamless", "intuitive", or "AI-powered" — show, don't label.
- Numbers over words: *"28 min"* not *"twenty-eight minutes"*.
- Sentence fragments are fine when they're confident.
- Processing stages are a writing task, not a technical one. Name them like a human, not a system log.

---

## 7. Component Philosophy

*How these principles become code.*

### 1. One job per screen
Every screen has a single primary action. The CTA is always obvious. If you're adding a second primary CTA, ask whether it belongs on this screen at all.

### 2. Chrome recedes. Content leads.
Navigation, borders, and labels exist to support content, not compete with it. Use opacity and spacing to create hierarchy before reaching for color or weight.

### 3. Neutral surfaces. Warm accent.
Build UI with `#F7F6F3`, `#FFFFFF`, and `rgba(0,0,0,x)`. Reach for `#EA580C` only when directing attention to a primary action or communicating active state.

### 4. Status colors communicate, never decorate
Green means *ready*. Amber means *processing*. These are not brand colors. They do not appear in gradients, illustrations, or hover states.

### 5. Don't add color where opacity will do
Before adding a color, try `rgba(0,0,0,0.05)` on white. It's usually enough.

### 6. Artwork carries the warmth
The amber-orange gradient lives in episode artwork and hero moments. This is where the brand has permission to be expressive. Everywhere else: restrained.

### 7. When in doubt, add space
Generous padding signals confidence. Cramped UI signals uncertainty. Default to more whitespace, not less.

### 8. Bottom 40% for primary controls
Primary player controls (play, skip, speed) live at the bottom of the screen — reachable one-handed. This is a commute app; it's used in motion.

---

## 8. What This Is Not

To protect the aesthetic from drift:

- **Not a developer dashboard.** Avoid table layouts, dense data grids, or anything that reads as enterprise SaaS.
- **Not playful.** No emojis in UI (except where explicitly added for content). No bouncy animations. No illustration.
- **Not configurable.** Defaults should be right. Don't expose settings that should be design decisions.
- **Not purple.** The indigo/violet palette from the initial build is retired. Amber-orange is the brand accent.

---

## 9. Open Items

| Item | Status | Notes |
|------|--------|-------|
| Icon / app mark | **Pending icon study** | Requires dedicated exploration before committing |
| Light mode migration | **Pending implementation** | This brief specifies light mode; existing codebase is dark |
| Geist Sans migration | **Pending implementation** | Replace Inter throughout |
| `icon-192.png` / `icon-512.png` | **Blocked on icon study** | PWA manifest references these; they don't exist yet |
| CSS variable audit | **Pending** | Align all component-level hex values to tokens |

---

## 10. Design Preview

A living HTML preview of the design system is maintained at:

```
/design-preview.html
```

Open in browser to see: color palette, typography scale, app screens (Queue, Player, Add), and token reference. Update this file when the design evolves.

---

*Last updated: 2026-03-09*
*Status: Approved — ready for implementation planning*
