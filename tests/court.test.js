import { describe, it, expect } from 'vitest';
import { Court } from '../src/game/Court.js';
import { CONFIG } from '../src/config.js';

const R = CONFIG.ball.radius;

function makeBall(o = {}) {
  const b = { x: 0, y: R, z: 0, vx: 0, vy: 0, vz: 0, radius: R, active: true, speed: 10 };
  Object.assign(b, o);
  return b;
}

function makePaddle(o = {}) {
  const p = { x: 0, z: 14, width: CONFIG.paddle.width, depth: CONFIG.paddle.depth, height: CONFIG.paddle.height };
  Object.assign(p, o);
  return p;
}

describe('Court', () => {
  it('initializes with correct dimensions', () => {
    const court = new Court();
    expect(court.halfWidth).toBe(CONFIG.court.width / 2);
    expect(court.halfDepth).toBe(CONFIG.court.depth / 2);
  });

  describe('checkWallBounce', () => {
    it('bounces off left wall', () => {
      const court = new Court();
      const b = makeBall({ x: -court.halfWidth + R - 0.1, vx: -5 });
      expect(court.checkWallBounce(b)).toBe(true);
      expect(b.vx).toBeGreaterThan(0);
    });

    it('bounces off right wall', () => {
      const court = new Court();
      const b = makeBall({ x: court.halfWidth - R + 0.1, vx: 5 });
      expect(court.checkWallBounce(b)).toBe(true);
      expect(b.vx).toBeLessThan(0);
    });

    it('no bounce in bounds', () => {
      const court = new Court();
      expect(court.checkWallBounce(makeBall({ x: 0, vx: 5 }))).toBe(false);
    });
  });

  describe('checkPaddleBounce', () => {
    it('hit when ball overlaps paddle', () => {
      const court = new Court();
      const p = makePaddle({ z: 14, x: 0 });
      const b = makeBall({ x: 0, z: 14 - p.depth / 2 - R + 0.1, vz: 5, speed: 10 });
      const r = court.checkPaddleBounce(b, p);
      expect(r).not.toBe(false);
      expect(r.hit).toBe(true);
    });

    it('no hit too far from paddle', () => {
      const court = new Court();
      const p = makePaddle({ z: 14, x: 0 });
      const b = makeBall({ x: 0, z: 10, vz: 5 });
      expect(court.checkPaddleBounce(b, p)).toBe(false);
    });

    it('no hit moving away from paddle', () => {
      const court = new Court();
      const p = makePaddle({ z: 14, x: 0 });
      const b = makeBall({ x: 0, z: 13, vz: -5 });
      expect(court.checkPaddleBounce(b, p)).toBe(false);
    });

    it('center hit gives offset near zero', () => {
      const court = new Court();
      const p = makePaddle({ z: 14, x: 0 });
      const b = makeBall({ x: 0, z: 14 - p.depth / 2 - R + 0.1, vz: 5, speed: 10 });
      const r = court.checkPaddleBounce(b, p);
      expect(r.hit).toBe(true);
      expect(Math.abs(r.offset)).toBeLessThan(0.1);
    });

    it('no hit for inactive ball', () => {
      const court = new Court();
      const p = makePaddle({ z: 14, x: 0 });
      const b = makeBall({ active: false });
      expect(court.checkPaddleBounce(b, p)).toBe(false);
    });
  });

  describe('checkScore', () => {
    it('opponent scores when ball passes player side', () => {
      const court = new Court();
      const b = makeBall({ z: -court.halfDepth - 2 });
      expect(court.checkScore(b)).toBe('opponent');
      expect(b.active).toBe(false);
    });

    it('player scores when ball passes opponent side', () => {
      const court = new Court();
      const b = makeBall({ z: court.halfDepth + 2 });
      expect(court.checkScore(b)).toBe('player');
      expect(b.active).toBe(false);
    });

    it('no score in bounds', () => {
      const court = new Court();
      expect(court.checkScore(makeBall({ z: 0 }))).toBeNull();
    });

    it('no score for inactive ball', () => {
      const court = new Court();
      const b = makeBall({ z: court.halfDepth + 1, active: false });
      expect(court.checkScore(b)).toBeNull();
    });
  });
});
