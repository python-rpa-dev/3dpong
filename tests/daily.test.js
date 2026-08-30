import { describe, it, expect, beforeEach } from 'vitest';
import { mulberry32, dailySeed } from '../src/game/rng.js';
import { Game } from '../src/game/Game.js';
import { PowerupManager } from '../src/game/Powerups.js';
import { Records } from '../src/settings/Records.js';
import { CONFIG } from '../src/config.js';

class FakeStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
}

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

describe('Daily challenge scoring', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('noteDaily aggregates plays, wins and best margin per seed', () => {
    const rec = new Records();
    expect(rec.daily(20260830)).toBeNull();

    rec.noteDaily(20260830, { won: false, margin: -3, rally: 4 });
    rec.noteDaily(20260830, { won: true, margin: 2, rally: 9 });
    rec.noteDaily(20260830, { won: false, margin: -1, rally: 2 });
    rec.noteDaily(20260831, { won: true, margin: 5, rally: 7 });

    const d = rec.daily(20260830);
    expect(d).toEqual({ plays: 3, wins: 1, bestMargin: 2, bestRally: 9 });
    expect(rec.daily(20260831)).toEqual({ plays: 1, wins: 1, bestMargin: 5, bestRally: 7 });
  });

  it('best margin improves a negative record toward zero', () => {
    const rec = new Records();
    rec.noteDaily(20260830, { won: false, margin: -5, rally: 1 });
    rec.noteDaily(20260830, { won: false, margin: -2, rally: 1 });
    expect(rec.daily(20260830).bestMargin).toBe(-2);
  });

  it('a finished daily game stores a result under today\'s seed', () => {
    const records = new Records();
    const game = new Game(makeSettings({ winScore: 1 }), records);
    game.start();
    let t = 0;
    while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
    game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1;
    game.update(1 / 60);
    t = 0;
    while (game.state !== 'GAME_OVER' && t < 10) { game.update(1 / 60); t += 1 / 60; }
    expect(game.state).toBe('GAME_OVER');

    const d = records.daily(dailySeed());
    expect(d.plays).toBe(1);
    expect(Math.abs(d.bestMargin)).toBe(1);
  });

  it('non-daily games store nothing', () => {
    const records = new Records();
    const game = new Game(makeSettings({ winScore: 1, dailyChallenge: false }), records);
    game.start();
    let t = 0;
    while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
    game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1;
    game.update(1 / 60);
    t = 0;
    while (game.state !== 'GAME_OVER' && t < 10) { game.update(1 / 60); t += 1 / 60; }
    expect(game.state).toBe('GAME_OVER');
    expect(records.daily(dailySeed())).toBeNull();
  });
});
