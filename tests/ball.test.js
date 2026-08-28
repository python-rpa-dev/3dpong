import { describe, it, expect } from 'vitest';
import { Ball } from '../src/game/Ball.js';
import { CONFIG } from '../src/config.js';

describe('Ball serve aim', () => {
  it('reset with aimX uses aimed angle instead of random', () => {
    const ball = new Ball();
    ball.reset(1, 0);
    expect(ball.vx).toBeCloseTo(0);
    expect(ball.vz).toBeGreaterThan(0);

    ball.reset(1, 1);
    expect(ball.vx).toBeGreaterThan(0);
    const expectedAngle = CONFIG.serve.maxAimAngle;
    expect(Math.atan2(ball.vx, ball.vz)).toBeCloseTo(expectedAngle);

    ball.reset(-1, -1);
    expect(ball.vx).toBeLessThan(0);
  });

  it('aimX is clamped to [-1, 1]', () => {
    const ball = new Ball();
    ball.reset(1, 5);
    expect(Math.atan2(ball.vx, ball.vz)).toBeCloseTo(CONFIG.serve.maxAimAngle);
  });

  it('reset without aimX keeps small random spread', () => {
    const ball = new Ball();
    ball.reset(1);
    expect(Math.abs(Math.atan2(ball.vx, ball.vz))).toBeLessThanOrEqual(0.2 + 1e-9);
  });
});
import { CONFIG } from '../src/config.js';

describe('Ball', () => {
  it('initializes at center, inactive', () => {
    const ball = new Ball();
    expect(ball.x).toBe(0);
    expect(ball.z).toBe(0);
    expect(ball.active).toBe(false);
    expect(ball.speed).toBe(CONFIG.ball.initialSpeed);
    expect(ball.rallyHits).toBe(0);
  });

  it('reset activates ball and sets direction', () => {
    const ball = new Ball();
    ball.reset(1); // toward opponent (+z)
    expect(ball.active).toBe(true);
    expect(ball.vz).toBeGreaterThan(0);
    expect(ball.rallyHits).toBe(0);
    expect(ball.speedMultiplier).toBe(1);
  });

  it('reset toward player (-z)', () => {
    const ball = new Ball();
    ball.reset(-1);
    expect(ball.active).toBe(true);
    expect(ball.vz).toBeLessThan(0);
  });

  it('update moves ball when active', () => {
    const ball = new Ball();
    ball.reset(1);
    const startZ = ball.z;
    const startX = ball.x;
    ball.update(0.016);
    expect(ball.z).toBeGreaterThan(startZ);
  });

  it('update does nothing when inactive', () => {
    const ball = new Ball();
    const startZ = ball.z;
    ball.update(0.016);
    expect(ball.z).toBe(startZ);
  });

  it('hitPaddle bounces ball back (classic mode)', () => {
    const ball = new Ball();
    ball.reset(1);
    ball.z = 13;
    ball.vz = 5;
    const result = ball.hitPaddle(0, CONFIG.paddle.width, false);
    expect(ball.vz).toBeLessThan(0); // bounced back
    expect(result.offset).toBeDefined();
    expect(result.angle).toBeDefined();
  });

  it('hitPaddle in fun mode increases speed', () => {
    const ball = new Ball();
    ball.reset(1);
    const speedBefore = ball.speed;
    ball.hitPaddle(0, CONFIG.paddle.width, true);
    expect(ball.speed).toBeGreaterThan(speedBefore);
    expect(ball.rallyHits).toBe(1);
  });

  it('hitPaddle fun mode caps speed at max multiplier', () => {
    const ball = new Ball();
    ball.reset(1);
    // Simulate many hits
    for (let i = 0; i < 100; i++) {
      ball.hitPaddle(0, CONFIG.paddle.width, true);
    }
    const maxSpeed = CONFIG.ball.initialSpeed * CONFIG.fun.maxSpeedMultiplier;
    expect(ball.speed).toBeLessThanOrEqual(maxSpeed + 0.01);
  });

  it('hitPaddle edge hit gives larger angle', () => {
    const ball = new Ball();
    ball.reset(1);
    ball.x = CONFIG.paddle.width / 2; // edge
    ball.hitPaddle(0, CONFIG.paddle.width, false);
    const edgeAngle = Math.abs(ball.vx / ball.currentSpeed);

    const ball2 = new Ball();
    ball2.reset(1);
    ball2.x = 0; // center
    ball2.hitPaddle(0, CONFIG.paddle.width, false);
    const centerAngle = Math.abs(ball2.vx / ball2.currentSpeed);

    expect(edgeAngle).toBeGreaterThan(centerAngle);
  });

  it('increaseSpeed scales velocity', () => {
    const ball = new Ball();
    ball.reset(1);
    const speedBefore = ball.currentSpeed;
    ball.increaseSpeed();
    expect(ball.currentSpeed).toBeGreaterThan(speedBefore);
  });

  it('currentSpeed returns magnitude of velocity', () => {
    const ball = new Ball();
    ball.reset(1);
    const expected = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
    expect(ball.currentSpeed).toBeCloseTo(expected, 10);
  });
});
