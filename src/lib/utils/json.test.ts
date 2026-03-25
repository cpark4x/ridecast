import { describe, it, expect } from 'vitest';
import { stripJsonMarkdownFences, asRecord } from './json';

describe('stripJsonMarkdownFences', () => {
  it('returns plain JSON unchanged', () => {
    const input = '{"category":"Bug","priority":"High"}';
    expect(stripJsonMarkdownFences(input)).toBe(input);
  });

  it('strips ```json ... ``` fences', () => {
    const input = '```json\n{"category":"Bug","priority":"High"}\n```';
    expect(stripJsonMarkdownFences(input)).toBe('{"category":"Bug","priority":"High"}');
  });

  it('strips plain ``` ... ``` fences (no language tag)', () => {
    const input = '```\n{"category":"Bug"}\n```';
    expect(stripJsonMarkdownFences(input)).toBe('{"category":"Bug"}');
  });

  it('trims surrounding whitespace', () => {
    const input = '  \n{"key":"value"}\n  ';
    expect(stripJsonMarkdownFences(input)).toBe('{"key":"value"}');
  });
});

describe('asRecord', () => {
  it('returns undefined for null', () => {
    expect(asRecord(null)).toBeUndefined();
  });

  it('returns undefined for a string primitive', () => {
    expect(asRecord('hello')).toBeUndefined();
  });

  it('returns undefined for a number primitive', () => {
    expect(asRecord(42)).toBeUndefined();
  });

  it('returns the object cast to Record for a plain object', () => {
    const obj = { category: 'Bug', priority: 'High' };
    expect(asRecord(obj)).toBe(obj);
  });

  it('returns undefined for an array (arrays are objects but not records)', () => {
    expect(asRecord([1, 2, 3])).toBeUndefined();
  });
});
