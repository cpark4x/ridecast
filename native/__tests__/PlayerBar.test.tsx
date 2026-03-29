// native/__tests__/PlayerBar.test.tsx
// Tests for F-P5-UI-02: Navigation Shell Redesign — PlayerBar visual refresh
//
// Covers AC-10 through AC-22.
// NOTE: Component-render tests require native Jest environment to be fixed
// (see CONTEXT-TRANSFER known issues). Pure-data tests (exported style objects,
// grep-based checks) are immediately verifiable.

import { PLAYER_BAR_CONTAINER_STYLES } from '../components/PlayerBar';
import { EXEMPT_SEGMENTS } from '../app/_layout';

// ---------------------------------------------------------------------------
// AC-10: Container backgroundColor is #242438
// AC-11: Container borderRadius is 14
// AC-12: No shadow props
// ---------------------------------------------------------------------------
describe('PlayerBar container styles', () => {
  it('AC-10: backgroundColor is #242438 (colors.surfaceElevated)', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES.backgroundColor).toBe('#242438');
  });

  it('AC-11: borderRadius is 14 (borderRadius.miniPlayer)', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES.borderRadius).toBe(14);
  });

  it('AC-12: no shadowColor prop', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES).not.toHaveProperty('shadowColor');
  });

  it('AC-12: no shadowOffset prop', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES).not.toHaveProperty('shadowOffset');
  });

  it('AC-12: no shadowOpacity prop', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES).not.toHaveProperty('shadowOpacity');
  });

  it('AC-12: no shadowRadius prop', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES).not.toHaveProperty('shadowRadius');
  });

  it('AC-12: no elevation prop', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES).not.toHaveProperty('elevation');
  });

  it('marginHorizontal is 8 (unchanged)', () => {
    expect(PLAYER_BAR_CONTAINER_STYLES.marginHorizontal).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// AC-14: Title fontSize=14, fontWeight='500', color='#F5F5F5'
// AC-15: Caption fontSize=12, color=#9CA3AF
// AC-16: Progress fill color=#FF6B35
// AC-17: Play/pause icon size=24
// ---------------------------------------------------------------------------
import { PLAYER_BAR_TITLE_STYLES, PLAYER_BAR_CAPTION_STYLES, PLAYER_BAR_PROGRESS_FILL_COLOR, PLAYER_BAR_PLAY_ICON_SIZE } from '../components/PlayerBar';

describe('PlayerBar text + control styles', () => {
  it('AC-14: title fontSize is 14', () => {
    expect(PLAYER_BAR_TITLE_STYLES.fontSize).toBe(14);
  });

  it('AC-14: title fontWeight is 500', () => {
    expect(PLAYER_BAR_TITLE_STYLES.fontWeight).toBe('500');
  });

  it('AC-14: title color is #F5F5F5', () => {
    expect(PLAYER_BAR_TITLE_STYLES.color).toBe('#F5F5F5');
  });

  it('AC-15: caption fontSize is 12', () => {
    expect(PLAYER_BAR_CAPTION_STYLES.fontSize).toBe(12);
  });

  it('AC-15: caption color is #9CA3AF (colors.textSecondary)', () => {
    expect(PLAYER_BAR_CAPTION_STYLES.color).toBe('#9CA3AF');
  });

  it('AC-16: progress fill color is #FF6B35 (colors.accentPrimary)', () => {
    expect(PLAYER_BAR_PROGRESS_FILL_COLOR).toBe('#FF6B35');
  });

  it('AC-17: play/pause icon size is 24 (sizes.iconNav)', () => {
    expect(PLAYER_BAR_PLAY_ICON_SIZE).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// AC-22: EXEMPT_SEGMENTS is exported from _layout.tsx
// AC-19, AC-20, AC-21: visibility by segment
// ---------------------------------------------------------------------------
describe('EXEMPT_SEGMENTS export', () => {
  it('AC-22: EXEMPT_SEGMENTS is exported from native/app/_layout.tsx', () => {
    expect(EXEMPT_SEGMENTS).toBeDefined();
    expect(Array.isArray(EXEMPT_SEGMENTS)).toBe(true);
  });

  it('AC-19: sign-in is in EXEMPT_SEGMENTS', () => {
    expect(EXEMPT_SEGMENTS).toContain('sign-in');
  });

  it('AC-20: processing is in EXEMPT_SEGMENTS', () => {
    expect(EXEMPT_SEGMENTS).toContain('processing');
  });

  it('settings is in EXEMPT_SEGMENTS', () => {
    expect(EXEMPT_SEGMENTS).toContain('settings');
  });

  it('has exactly 3 exempt segments', () => {
    expect(EXEMPT_SEGMENTS).toHaveLength(3);
  });

  it('AC-21: (tabs) is NOT in EXEMPT_SEGMENTS (PlayerBar visible on tab screens)', () => {
    expect(EXEMPT_SEGMENTS).not.toContain('(tabs)');
  });
});

// ---------------------------------------------------------------------------
// Component render tests (require native Jest env — deferred)
// ---------------------------------------------------------------------------
// TODO(native-jest-fix): Enable when native Jest environment is fixed.
//
// import { render } from '@testing-library/react-native';
// import PlayerBar from '../components/PlayerBar';
// import { PlayerContext } from '../lib/usePlayer';
//
// const mockCurrentItem = {
//   audioId: 'test-audio-1',
//   title: 'Test Article',
//   sourceType: 'url',
//   sourceUrl: 'https://example.com',
//   sourceName: 'Example',
//   filePath: '/audio/test.mp3',
//   durationSecs: 900,
// };
//
// describe('PlayerBar renders correctly with currentItem', () => {
//   it('AC-13: SourceThumbnail has size=40', () => { ... });
//   it('AC-18: no Rewind or Skip buttons in render tree', () => { ... });
// });
