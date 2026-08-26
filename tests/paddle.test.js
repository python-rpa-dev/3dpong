import { describe, it, expect } from 'vitest';
import { Paddle } from '../src/game/Paddle.js';
import { CONFIG } from '../src/config.js';

describe('Paddle', () => {
  it('initializes at center x with given z', () => {
    const paddle = new Paddle(14);
    expect(paddle.x).toBe(0);
    expect(paddle.z).toBe(14);
    expect(paddle.width).toBe(CONFIG.paddle.width);
    expect(paddle.depth).toBe(CONFIG.paddle.depth);
    expect(paddle.height).toBe(CONFIG.paddle.height);
  });

  it('clamps to court left boundary', () => {
    const paddle = new Paddle(14);
    paddle.x = -100;
    paddle.update(0.016);
    const halfWidth = CONFIG.court.width / 2 - paddle.width / 2;
    expect(paddle.x).toBe(-halfWidth);
  });

  it('clamps to court right boundary', () => {
    const paddle = new Paddle(14);
    paddle.x = 100;
    paddle.update(0.016);
    const halfWidth = CONFIG.court.width / 2 - paddle.width / 2;
    expect(paddle.x).toBe(halfWidth);
  });

  it('stays within bounds when in range', () => {
    const paddle = new Paddle(14);
    paddle.x = 2;
    paddle.update(0.016);
    expect(paddle.x).toBe(2);
  });

  it('clamps to exact boundary values', () => {
    const paddle = new Paddle(-14);
    const halfWidth = CONFIG.court.width / 2 - paddle.width / 2;

    paddle.x = halfWidth + 0.001;
    paddle.update(0.016);
    expect(paddle.x).toBe(halfWidth);

    paddle.x = -halfWidth - 0.001;
    paddle.update(0.016);
    expect(paddle.x).toBe(-halfWidth);
  });
});
