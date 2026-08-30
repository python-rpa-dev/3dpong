import { describe, it, expect, beforeEach } from 'vitest';
import { Records, ACHIEVEMENTS } from '../src/settings/Records.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { FakeStorage, makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ winScore: 1, ...overrides });

function scorePlayer(game) {
  let t = 0;
  while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
  game.drainEvents();
  game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
  game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1;
  game.update(1 / 60);
  t = 0;
  while (game.state !== 'GAME_OVER' && t < 5) { game.update(1 / 60); t += 1 / 60; }
  return game.drainEvents();
}

describe('Achievements', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('unlock fires once per achievement', () => {
    const r = new Records();
    expect(r.unlock('first_win')).toBe(true);
    expect(r.unlock('first_win')).toBe(false);
    expect(r.has('first_win')).toBe(true);
    expect(r.achievementCount()).toBe(1);
  });

  it('achievements persist across instances', () => {
    const r = new Records();
    r.unlock('rally20');
    const r2 = new Records();
    expect(r2.has('rally20')).toBe(true);
  });

  it('a winning run unlocks first_win and perfect_game', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    const events = scorePlayer(game);
    const ids = events.filter(e => e.type === 'achievement').map(e => e.id);
    expect(ids).toContain('first_win');
    expect(ids).toContain('perfect_game');
  });

  it('a comeback from 5 down unlocks comeback', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    game._minMargin = -6; // trailed by 6 earlier in the match
    const events = scorePlayer(game);
    const ids = events.filter(e => e.type === 'achievement').map(e => e.id);
    expect(ids).toContain('comeback');
  });

  it('rally of 20 unlocks rally20', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.rallyCombo = 20;
    game.recordRally();
    expect(records.has('rally20')).toBe(true);
  });

  it('three opponent shrinks unlock shrink_triple', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.noteOpponentShrink('ai', 0.7);
    game.noteOpponentShrink('ai', 0.8);
    expect(records.has('shrink_triple')).toBe(false);
    game.noteOpponentShrink('ai', 0.6);
    expect(records.has('shrink_triple')).toBe(true);
    const ev = game.events.find(e => e.type === 'achievement' && e.id === 'shrink_triple');
    expect(ev).toBeDefined();
  });

  it('no achievements in versus mode', () => {
    const records = new Records();
    const game = new Game(makeSettings({ playerMode: 'versus' }), records);
    game.rallyCombo = 25;
    game.recordRally();
    expect(records.has('rally20')).toBe(false);
  });

  it('achievement list is well-formed', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(6);
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
