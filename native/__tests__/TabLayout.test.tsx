// native/__tests__/TabLayout.test.tsx
// Tests for F-P5-UI-02: Navigation Shell Redesign — Tab Layout
//
// Covers AC-1 through AC-8.
// NOTE: Tests for pure-exportable data (tabScreenOptions, icon helpers) are
// immediately runnable. Component-render tests (assert on rendered tree) require
// the native Jest environment to be fixed (see CONTEXT-TRANSFER known issues).

import {
  tabScreenOptions,
  getHomeIcon,
  getDiscoverIcon,
  getLibraryIcon,
} from '../app/(tabs)/_layout';
import { colors, sizes } from '../lib/theme';

// ---------------------------------------------------------------------------
// AC-2: Active tint color is #FF6B35, inactive is #6B7280
// ---------------------------------------------------------------------------
describe('tabScreenOptions colors', () => {
  it('AC-2: active tab tint is #FF6B35 (colors.accentPrimary)', () => {
    expect(tabScreenOptions.tabBarActiveTintColor).toBe('#FF6B35');
    expect(tabScreenOptions.tabBarActiveTintColor).toBe(colors.accentPrimary);
  });

  it('AC-2: inactive tab tint is #6B7280 (colors.textTertiary)', () => {
    expect(tabScreenOptions.tabBarInactiveTintColor).toBe('#6B7280');
    expect(tabScreenOptions.tabBarInactiveTintColor).toBe(colors.textTertiary);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Tab bar background is #1A1A2E
// ---------------------------------------------------------------------------
describe('tabScreenOptions tabBarStyle', () => {
  it('AC-3: tab bar background is #1A1A2E (colors.surface)', () => {
    expect(tabScreenOptions.tabBarStyle.backgroundColor).toBe('#1A1A2E');
    expect(tabScreenOptions.tabBarStyle.backgroundColor).toBe(colors.surface);
  });

  // AC-4: Top border is rgba(255,255,255,0.06)
  it('AC-4: tab bar borderTopColor is rgba(255,255,255,0.06) (colors.borderDivider)', () => {
    expect(tabScreenOptions.tabBarStyle.borderTopColor).toBe('rgba(255,255,255,0.06)');
    expect(tabScreenOptions.tabBarStyle.borderTopColor).toBe(colors.borderDivider);
  });

  it('AC-4: tab bar borderTopWidth is 1', () => {
    expect(tabScreenOptions.tabBarStyle.borderTopWidth).toBe(1);
  });

  // AC-5: Tab bar height is 56
  it('AC-5: tab bar height is 56 (sizes.tabBarHeight)', () => {
    expect(tabScreenOptions.tabBarStyle.height).toBe(56);
    expect(tabScreenOptions.tabBarStyle.height).toBe(sizes.tabBarHeight);
  });

  it('lazy is true', () => {
    expect(tabScreenOptions.lazy).toBe(true);
  });

  it('headerShown is false', () => {
    expect(tabScreenOptions.headerShown).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-6: Home tab icon names
// ---------------------------------------------------------------------------
describe('getHomeIcon', () => {
  it('AC-6: returns home-outline when unfocused', () => {
    expect(getHomeIcon(false)).toBe('home-outline');
  });

  it('AC-6: returns home when focused', () => {
    expect(getHomeIcon(true)).toBe('home');
  });
});

// ---------------------------------------------------------------------------
// AC-7: Discover tab icon names
// ---------------------------------------------------------------------------
describe('getDiscoverIcon', () => {
  it('AC-7: returns compass-outline when unfocused', () => {
    expect(getDiscoverIcon(false)).toBe('compass-outline');
  });

  it('AC-7: returns compass when focused', () => {
    expect(getDiscoverIcon(true)).toBe('compass');
  });
});

// ---------------------------------------------------------------------------
// AC-8: Library tab icon names
// ---------------------------------------------------------------------------
describe('getLibraryIcon', () => {
  it('AC-8: returns library-outline when unfocused', () => {
    expect(getLibraryIcon(false)).toBe('library-outline');
  });

  it('AC-8: returns library when focused', () => {
    expect(getLibraryIcon(true)).toBe('library');
  });
});

// ---------------------------------------------------------------------------
// AC-1: 3 tabs registered
// AC-9: discover.tsx renders correctly
// These ACs require component rendering — to be enabled once native Jest is fixed.
// ---------------------------------------------------------------------------
// TODO(native-jest-fix): Enable these when native Jest environment is fixed.
// describe('TabLayout renders 3 screens', () => {
//   it('AC-1: renders 3 Tabs.Screen children: index, discover, library', () => {
//     const { UNSAFE_getAllByType } = render(<TabLayout />);
//     const screens = UNSAFE_getAllByType(Tabs.Screen);
//     expect(screens).toHaveLength(3);
//     expect(screens[0].props.name).toBe('index');
//     expect(screens[1].props.name).toBe('discover');
//     expect(screens[2].props.name).toBe('library');
//   });
// });
