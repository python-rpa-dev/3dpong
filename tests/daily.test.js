import { describe, it, expect } from 'vitest';
import { mulberry32, dailySeed } from '../src/game/rng.js';
import { Game } from '../src/game/Game.js';
import { PowerupManager } from '../src/game/Powerups.js';

function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 11,
    deuce: false,
    gameMode: 'classic',
    playerMode: 'ai',
    powerups: true,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    netGraze: false,
    dailyChallenge: true,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

describe('Daily challenge seeding', () => {
  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
    expect(mulberry32(999)()).not.toBe(mulberry32(1)());
  });

  it('dailySeed encodes YMD', () => {
    expect(dailySeed(new Date(2026, 7, 29))).toBe(20260829);
  });

  it('two games with the same daily seed serve identically', () => {
    const g1 = new Game(makeSettings());
    const g2 = new Game(makeSettings());
    g1.start();
    g2.start();
    // Serve direction coin flip and angle come from the seeded stream
    expect(g1.serveDirection).toBe(g2.serveDirection);
    g1.ball.reset(g1.serveDirection, null, g1.rng);
    g2.ball.reset(g2.serveDirection, null, g2.rng);
    expect(g1.ball.vx).toBe(g2.ball.vx);
    expect(g1.ball.vz).toBe(g2.ball.vz);
  });

  it('non-daily games use plain Math.random', () => {
    const game = new Game(makeSettings({ dailyChallenge: false }));
    game.start();
    expect(game.rng).toBe(Math.random);
  });

  it('powerup spawns are reproducible with a seeded rng', () => {
    const m1 = new PowerupManager(mulberry32(42));
    const m2 = new PowerupManager(mulberry32(42));
    const s1 = [], s2 = [];
    for (let i = 0; i < 5; i++) {
      s1.push(m1._spawn());
      s2.push(m2._spawn());
    }
    expect(s1).toEqual(s2);
  });
});
