// native/lib/theme.ts
// Design tokens for the Ridecast dark theme.
// Pure data module — no React, no React Native, no Expo imports.
// Consumers import directly: import { colors } from '../lib/theme'

export const colors = {
  // Backgrounds — 3-tier elevation model (no shadows, color only)
  backgroundScreen:  '#0F0F1A',   // base — every screen background
  backgroundOled:    '#000000',   // Car Mode screen AND Expanded Player atmospheric background ONLY — no other use

  // Surfaces
  surface:           '#1A1A2E',   // cards, tab bar, bottom sheets, grouped lists
  surfaceElevated:   '#242438',   // inputs, mini player, active segments

  // Accent — the only interactive accent in the system
  accentPrimary:     '#FF6B35',   // CTAs, active tab, toggles, progress, selected chips

  // Text
  textPrimary:       '#FFFFFF',
  textSecondary:     '#9CA3AF',   // metadata, descriptions, inactive icons
  textTertiary:      '#6B7280',   // placeholders, inactive tab labels

  // Content-type category colors (for thumbnails and labels, NOT interactive)
  contentTech:       '#2563EB',
  contentBusiness:   '#EA580C',
  contentScience:    '#0D9488',
  contentFiction:    '#7C3AED',
  contentNews:       '#DB2777',
  contentBiography:  '#059669',

  // Status
  statusSuccess:     '#16A34A',   // played, downloaded
  statusError:       '#EF4444',   // destructive, error

  // Borders (rgba — never opaque)
  borderDivider:     'rgba(255,255,255,0.06)',   // horizontal dividers, tab bar top
  borderInput:       'rgba(255,255,255,0.08)',   // input field borders
  borderDropzone:    'rgba(255,255,255,0.12)',   // dashed drop zones
} as const;

export const typography = {
  sizes: {
    display: 28,   // screen titles, greeting
    h1:      22,   // section titles, source names
    h2:      18,   // section headers ("Up Next", "For You")
    body:    15,   // card titles, row labels
    caption: 13,   // metadata, timestamps
    micro:   11,   // badges, topic pills
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
} as const;

export const spacing = {
  xs:           4,
  sm:           8,
  md:           12,
  lg:           16,
  xl:           20,
  screenMargin: 20,   // left/right padding for all screen content
  sectionGap:   32,   // vertical gap between sections
  cardGap:      12,   // vertical gap between cards in a list
} as const;

export const borderRadius = {
  card:       10,     // cards, groups, buttons, inputs
  thumbnail:  8,      // episode artwork thumbnails
  full:       9999,   // pill tags, status badges
  miniPlayer: 14,     // mini player bar
  sheet:      14,     // bottom sheet top corners
} as const;

export const sizes = {
  thumbnail:   64,   // episode card artwork (standard list card)
  cardHeight:  76,   // standard list card height
  playButton:  36,   // play icon button tap target
  iconNav:     24,   // navigation bar icons
  buttonHeight: 52,  // primary action buttons
  tabBarHeight: 56,  // bottom tab bar
} as const;

// Convenience re-export for consumers that want a single import
export const theme = { colors, typography, spacing, borderRadius, sizes } as const;
