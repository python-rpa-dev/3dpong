import { describe, it, expect, beforeEach } from 'vitest';
import { Records } from '../src/settings/Records.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { FakeStorage, makeSettings as baseSettings, scoreGoal } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, winScore: 1, ...overrides });

/** Player scores the match-winning goal, then the SCORED delay runs out. */
function finishMatch(game) {
  scoreGoal(game);
  let t = 0;
  while (game.state !== 'GAME_OVER' && t < 5) { game.update(1 / 60); t += 1 / 60; }
}

describe('cumulative double-points loadout', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('banks the peak multiplier at match end and seeds the next match', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    game.aiPaddle.x = 9;
    game.applyPowerup('double', 'player');
    game.applyPowerup('double', 'player'); // x4 peak
    finishMatch(game);
    expect(records.loadoutMult('double')).toBe(4);

    const next = new Game(makeSettings(), records);
    next.start();
    expect(next.doublePoints.player).toEqual({ mult: 4, goalsLeft: CONFIG.powerups.loadoutGoals });
  });

  it('banked carry grants only loadoutGoals goals', () => {
    const records = new Records();
    records.setLoadoutMult('double', 8);
    const game = new Game(makeSettings(), records);
    game.aiPaddle.x = 9;
    game.start();
    scoreGoal(game);
    expect(game.score.playerScore).toBe(8);
    expect(game.doublePoints.player).toEqual({ mult: 1, goalsLeft: 0 });
  });

  it('keeps a lower banked peak instead of lowering it later', () => {
    const records = new Records();
    records.setLoadoutMult('double', 8);
    const game = new Game(makeSettings(), records);
    game.start(); // seeded x8, spent immediately by the winning goal
    finishMatch(game);
    expect(records.loadoutMult('double')).toBe(8);
  });

  it('quitting to menu mid-match banks nothing', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    game.applyPowerup('double', 'player');
    game.quitToMenu();
    expect(records.loadoutMult('double')).toBe(1);
  });

  it('ignores the carry in daily challenge mode', () => {
    const records = new Records();
    records.setLoadoutMult('double', 4);
    const game = new Game(makeSettings({ dailyChallenge: true }), records);
    game.start();
    expect(game.doublePoints.player.mult).toBe(1);
    game.applyPowerup('double', 'player');
    finishMatch(game);
    expect(records.loadoutMult('double')).toBe(4); // unchanged, not re-banked
  });

  it('ignores the carry in versus and classic modes', () => {
    const records = new Records();
    records.setLoadoutMult('double', 4);
    expect(new Game(makeSettings({ playerMode: 'versus' }), records).loadoutEnabled()).toBe(false);
    expect(new Game(makeSettings({ gameMode: 'classic' }), records).loadoutEnabled()).toBe(false);

    const versus = new Game(makeSettings({ playerMode: 'versus' }), records);
    versus.start();
    expect(versus.doublePoints.player.mult).toBe(1);
  });

  it('caps a corrupted stored multiplier', () => {
    const records = new Records();
    records.setLoadoutMult('double', 64);
    const game = new Game(makeSettings(), records);
    game.start();
    expect(game.doublePoints.player.mult).toBe(CONFIG.powerups.doubleMaxMult);
  });

  it('records survive a reload and stay isolated per instance', () => {
    const records = new Records();
    records.setLoadoutMult('double', 2);
    expect(new Records().loadoutMult('double')).toBe(2);

    const fresh = new Records();
    fresh.reset();
    expect(fresh.loadoutMult('double')).toBe(1);
    expect(records.loadoutMult('double')).toBe(2);
  });
});
