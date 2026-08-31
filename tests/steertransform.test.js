import { describe, it, expect } from 'vitest';
import { mirrorDir, flipIf } from '../src/input/steerTransform.js';
import { applySwap } from '../src/input/steerKeys.js';

describe('steerTransform', () => {
  it('mirrorDir flips left/right only when swapped', () => {
    expect(mirrorDir('left', true)).toBe('right');
    expect(mirrorDir('right', true)).toBe('left');
    expect(mirrorDir('left', false)).toBe('left');
    expect(mirrorDir('up', true)).toBe('up');
  });

  it('flipIf negates only when swapped', () => {
    expect(flipIf(0.5, true)).toBe(-0.5);
    expect(flipIf(-3, false)).toBe(-3);
    expect(flipIf(0, true)).toBe(-0);
  });

  it('steerKeys re-exports mirrorDir as applySwap for keyboard callers', () => {
    expect(applySwap).toBe(mirrorDir);
  });
});
