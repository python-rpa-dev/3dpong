import { describe, it, expect, beforeEach } from 'vitest';
import { Records } from '../src/settings/Records.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { FakeStorage, makeSettings as baseSettings, scoreGoal } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, winScore: 7, ...overrides });

describe('sudden death unlock', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('stays locked until the double stack achievement is earned', () => {
    const records = new Records();
    const game = new Game(makeSettings({ suddenDeath: true }), records);
    game.start();
    expect(game.suddenDeathEnabled()).toBe(false);
    expect(game.score.winScore).toBe(7);
  });

  it('next point wins once unlocked', () => {
    const records = new Records();
    records.unlock('double_stack');
    const game = new Game(makeSettings({ suddenDeath: true, deuce: true }), records);
    game.aiPaddle.x = 9;
    game.start();
    expect(game.score.winScore).toBe(1);
    expect(game.score.deuce).toBe(false);

    scoreGoal(game);
    let t = 0;
    while (game.state !== 'GAME_OVER' && t < 5) { game.update(1 / 60); t += 1 / 60; }
    expect(game.winner).toBe('player');
    expect(game.score.playerScore).toBe(1);
  });

  it('is ignored in daily challenge mode so seeds stay comparable', () => {
    const records = new Records();
    records.unlock('double_stack');
    const game = new Game(makeSettings({ suddenDeath: true, dailyChallenge: true }), records);
    game.start();
    expect(game.suddenDeathEnabled()).toBe(false);
    expect(game.score.winScore).toBe(7);
  });

  it('stacking to the cap awards DOUBLE STACK', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    for (let i = 0; i < 3; i++) game.applyPowerup('double', 'player'); // x2 -> x4 -> x8
    expect(records.has('double_stack')).toBe(true);
    expect(game.events.some((e) => e.type === 'achievement' && e.id === 'double_stack')).toBe(true);
  });

  it('one step short of the cap awards nothing', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    const stepsToCap = Math.log2(CONFIG.powerups.doubleMaxMult);
    for (let i = 0; i < stepsToCap - 1; i++) game.applyPowerup('double', 'player');
    expect(records.has('double_stack')).toBe(false);
  });

  it('no trophies in versus mode', () => {
    const records = new Records();
    const game = new Game(makeSettings({ playerMode: 'versus' }), records);
    game.start();
    for (let i = 0; i < 3; i++) game.applyPowerup('double', 'player');
    expect(records.has('double_stack')).toBe(false);
  });
});
