// native/__tests__/theme.test.ts
// Unit tests for the dark theme token module.
// theme.ts is a pure Node-importable module (no React, no React Native).
// These tests verify: all exports defined, key color exact values,
// typography.weights are strings, all content-type colors present,
// no undefined values in any exported object.

import {
  colors,
  typography,
  spacing,
  borderRadius,
  sizes,
  theme,
} from '../lib/theme';

describe('theme exports', () => {
  it('exports all 6 named exports as objects', () => {
    expect(colors).toBeDefined();
    expect(typography).toBeDefined();
    expect(spacing).toBeDefined();
    expect(borderRadius).toBeDefined();
    expect(sizes).toBeDefined();
    expect(theme).toBeDefined();
  });

  it('theme convenience bundle resolves to same objects as named imports', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.typography).toBe(typography);
    expect(theme.spacing).toBe(spacing);
    expect(theme.borderRadius).toBe(borderRadius);
    expect(theme.sizes).toBe(sizes);
  });
});

describe('colors', () => {
  it('accentPrimary is #FF6B35 (not #EA580C — the old incorrect accent)', () => {
    expect(colors.accentPrimary).toBe('#FF6B35');
  });

  it('backgroundScreen is #0F0F1A', () => {
    expect(colors.backgroundScreen).toBe('#0F0F1A');
  });

  it('surface is #1A1A2E', () => {
    expect(colors.surface).toBe('#1A1A2E');
  });

  it('surfaceElevated is #242438', () => {
    expect(colors.surfaceElevated).toBe('#242438');
  });

  it('textPrimary is #FFFFFF', () => {
    expect(colors.textPrimary).toBe('#FFFFFF');
  });

  it('backgroundOled is #000000 (OLED black — Car Mode and Expanded Player only)', () => {
    expect(colors.backgroundOled).toBe('#000000');
  });

  it('statusSuccess is #16A34A', () => {
    expect(colors.statusSuccess).toBe('#16A34A');
  });

  it('statusError is #EF4444', () => {
    expect(colors.statusError).toBe('#EF4444');
  });

  it('all 6 content-type color keys are present', () => {
    expect(colors.contentTech).toBeDefined();
    expect(colors.contentBusiness).toBeDefined();
    expect(colors.contentScience).toBeDefined();
    expect(colors.contentFiction).toBeDefined();
    expect(colors.contentNews).toBeDefined();
    expect(colors.contentBiography).toBeDefined();
  });

  it('has no undefined values', () => {
    Object.entries(colors).forEach(([key, value]) => {
      expect(value).not.toBeUndefined();
      expect(typeof value).toBe('string');
    });
  });
});

describe('typography', () => {
  it('sizes has all 6 scale entries', () => {
    expect(Object.keys(typography.sizes)).toHaveLength(6);
    expect(typography.sizes.display).toBeDefined();
    expect(typography.sizes.h1).toBeDefined();
    expect(typography.sizes.h2).toBeDefined();
    expect(typography.sizes.body).toBeDefined();
    expect(typography.sizes.caption).toBeDefined();
    expect(typography.sizes.micro).toBeDefined();
  });

  it('sizes have pinned pixel values matching design spec', () => {
    expect(typography.sizes.display).toBe(28);
    expect(typography.sizes.h1).toBe(22);
    expect(typography.sizes.h2).toBe(18);
    expect(typography.sizes.body).toBe(15);
    expect(typography.sizes.caption).toBe(13);
    expect(typography.sizes.micro).toBe(11);
  });

  it('weights are string literals (not numbers) for React Native fontWeight', () => {
    expect(typeof typography.weights.regular).toBe('string');
    expect(typeof typography.weights.medium).toBe('string');
    expect(typeof typography.weights.semibold).toBe('string');
    expect(typeof typography.weights.bold).toBe('string');
  });

  it('weights have correct string values', () => {
    expect(typography.weights.regular).toBe('400');
    expect(typography.weights.medium).toBe('500');
    expect(typography.weights.semibold).toBe('600');
    expect(typography.weights.bold).toBe('700');
  });

  it('has no undefined values', () => {
    Object.values(typography.sizes).forEach((v) => {
      expect(v).not.toBeUndefined();
      expect(typeof v).toBe('number');
    });
    Object.values(typography.weights).forEach((v) => {
      expect(v).not.toBeUndefined();
      expect(typeof v).toBe('string');
    });
  });
});

describe('spacing', () => {
  it('has all 8 spacing tokens as numbers', () => {
    expect(Object.keys(spacing)).toHaveLength(8);
    Object.values(spacing).forEach((v) => {
      expect(typeof v).toBe('number');
    });
  });

  it('screenMargin is 20', () => {
    expect(spacing.screenMargin).toBe(20);
  });
});

describe('borderRadius', () => {
  it('has all 5 radius tokens as numbers', () => {
    expect(Object.keys(borderRadius)).toHaveLength(5);
    Object.values(borderRadius).forEach((v) => {
      expect(typeof v).toBe('number');
    });
  });

  it('card radius is 10', () => {
    expect(borderRadius.card).toBe(10);
  });

  it('full radius is 9999', () => {
    expect(borderRadius.full).toBe(9999);
  });

  it('all 5 radius values are pinned', () => {
    expect(borderRadius.card).toBe(10);
    expect(borderRadius.thumbnail).toBe(8);
    expect(borderRadius.full).toBe(9999);
    expect(borderRadius.miniPlayer).toBe(14);
    expect(borderRadius.sheet).toBe(14);
  });
});

describe('sizes', () => {
  it('has all 6 size tokens as numbers', () => {
    expect(Object.keys(sizes)).toHaveLength(6);
    Object.values(sizes).forEach((v) => {
      expect(typeof v).toBe('number');
    });
  });

  it('all 6 size values are pinned to design-spec dimensions', () => {
    expect(sizes.thumbnail).toBe(64);
    expect(sizes.cardHeight).toBe(76);
    expect(sizes.playButton).toBe(36);
    expect(sizes.iconNav).toBe(24);
    expect(sizes.buttonHeight).toBe(52);
    expect(sizes.tabBarHeight).toBe(56);
  });
});
