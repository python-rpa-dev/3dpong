import { describe, it, expect, beforeEach } from 'vitest';
import { Records, ACHIEVEMENTS } from '../src/settings/Records.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

class FakeStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
}

function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 1,
    deuce: false,
    gameMode: 'classic',
    playerMode: 'ai',
    powerups: false,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

function scorePlayer(game) {
  let t = 0;
  while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
  game.drainEvents();
  game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
  game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1;
  game.update(1 / 60);
  return game.drainEvents();
}

describe('Records', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('noteRally only reports a new best once', () => {
    const r = new Records();
    expect(r.noteRally(5)).toBe(true);
    expect(r.noteRally(3)).toBe(false);
    expect(r.noteRally(5)).toBe(false);
    expect(r.noteRally(9)).toBe(true);
    expect(r.data.bestRally).toBe(9);
  });

  it('persists across instances', () => {
    const r = new Records();
    r.noteRally(7);
    r.noteResult(true);
    const r2 = new Records();
    expect(r2.data.bestRally).toBe(7);
    expect(r2.data.wins).toBe(1);
  });

  it('game notes a player streak event on consecutive points', () => {
    const records = new Records();
    const game = new Game(makeSettings({ winScore: 5 }), records);
    game.start();
    scorePlayer(game);
    const events = scorePlayer(game);
    const rec = events.find(e => e.type === 'record' && e.kind === 'streak');
    expect(rec).toBeDefined();
    expect(rec.value).toBe(2);
    expect(records.data.bestStreak).toBe(2);
  });

  it('game over notes the result', () => {
    const records = new Records();
    const game = new Game(makeSettings({ winScore: 1 }), records);
    game.start();
    scorePlayer(game); // player reaches winScore=1
    let t = 0;
    while (game.state !== 'GAME_OVER' && t < 5) { game.update(1 / 60); t += 1 / 60; }
    expect(game.state).toBe('GAME_OVER');
    expect(records.data.wins).toBe(1);
  });

  it('works without a records object', () => {
    const game = new Game(makeSettings());
    game.start();
    scorePlayer(game); // must not throw
    expect(game.score.playerScore).toBe(1);
  });

  it('every achievement has a discoverable hint', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.label).toBeTruthy();
      expect(a.hint).toBeTruthy();
    }
  });
});
