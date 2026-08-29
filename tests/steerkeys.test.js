import { describe, it, expect } from 'vitest';
import { remapSteerKey } from '../src/input/steerKeys.js';

describe('remapSteerKey', () => {
  it('passes keys through in horizontal mode', () => {
    for (const k of ['ArrowUp', 'ArrowDown', 'w', 's', 'a', 'ArrowLeft']) {
      expect(remapSteerKey(k, false)).toBe(k);
    }
  });

  it('maps up/down to right/left in vertical mode', () => {
    expect(remapSteerKey('ArrowUp', true)).toBe('ArrowRight');
    expect(remapSteerKey('ArrowDown', true)).toBe('ArrowLeft');
  });

  it('maps WASD preserving case for versus key splits', () => {
    expect(remapSteerKey('w', true)).toBe('d');
    expect(remapSteerKey('W', true)).toBe('D');
    expect(remapSteerKey('s', true)).toBe('a');
    expect(remapSteerKey('S', true)).toBe('A');
  });

  it('leaves non-steering keys alone', () => {
    for (const k of [' ', 'p', 'Escape', 'Enter']) {
      expect(remapSteerKey(k, true)).toBe(k);
    }
  });
});
