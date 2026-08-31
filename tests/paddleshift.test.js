import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', paddleShifts: true, difficulty: 'medium', ...overrides });

describe('Paddle shifts', () => {
  const base = CONFIG.paddle.width;
  const cfg = CONFIG.paddleShifts;

  it('edge hit by player shrinks the AI paddle', () => {
    const game = new Game(makeSettings());
    game.start();
    game.applyPaddleShift('player', 1 * Math.sign(1) * cfg.edgeThreshold);
    expect(game.aiPaddle.width).toBeCloseTo(base * cfg.shrinkScale);
    expect(game.playerPaddle.width).toBe(base);
  });

  it('center hit by player grows the AI paddle', () => {
    const game = new Game(makeSettings());
    game.start();
    game.applyPaddleShift('player', 0);
    expect(game.aiPaddle.width).toBeCloseTo(base * cfg.growScale);
  });

  it('mid-range offset causes no shift', () => {
    const game = new Game(makeSettings());
    game.start();
    const mid = (cfg.edgeThreshold + cfg.centerThreshold) / 2;
    game.applyPaddleShift('player', mid);
    expect(game.aiPaddle.width).toBe(base);
    expect(game.activeEffects.length).toBe(0);
  });

  it('shift applies to player when AI hits center', () => {
    const game = new Game(makeSettings());
    game.start();
    game.applyPaddleShift('ai', 0);
    expect(game.playerPaddle.width).toBeCloseTo(base * cfg.growScale);
    expect(game.aiPaddle.width).toBe(base);
  });

  it('shift expires and restores width', () => {
    const game = new Game(makeSettings());
    game.start();
    game.applyPaddleShift('player', 1);
    let t = 0;
    while (t < cfg.duration + 0.5) {
      game.tickEffects(0.1);
      t += 0.1;
    }
    expect(game.aiPaddle.width).toBe(base);
  });

  it('newest shift wins on the same paddle', () => {
    const game = new Game(makeSettings());
    game.start();
    game.applyPaddleShift('player', 0); // grow AI
    game.applyPaddleShift('player', 1); // shrink AI (replaces)
    expect(game.aiPaddle.width).toBeCloseTo(base * cfg.shrinkScale);
    const shiftEffects = game.activeEffects.filter(e => e.type === 'shift' && e.target === 'ai');
    expect(shiftEffects.length).toBe(1);
  });

  it('disabled when toggle off or classic mode', () => {
    const off = new Game(makeSettings({ paddleShifts: false }));
    off.start();
    off.applyPaddleShift('player', 1);
    expect(off.aiPaddle.width).toBe(base);

    const classic = new Game(makeSettings({ gameMode: 'classic' }));
    classic.start();
    classic.applyPaddleShift('player', 1);
    expect(classic.aiPaddle.width).toBe(base);
  });
});
