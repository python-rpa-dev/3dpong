import { describe, it, expect, afterEach } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 11,
    deuce: false,
    gameMode: 'fun',
    playerMode: 'ai',
    powerups: false,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    netGraze: true,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

function toPlaying(game) {
  let t = 0;
  while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
  game.drainEvents();
}

describe('Net graze', () => {
  const originalChance = CONFIG.fun.netGrazeChance;
  afterEach(() => { CONFIG.fun.netGrazeChance = originalChance; });

  it('fires an event when the ball crosses the net with chance 1', () => {
    CONFIG.fun.netGrazeChance = 1;
    const game = new Game(makeSettings());
    game.start();
    toPlaying(game);
    game.ball.x = 8; // away from paddle centers
    game.ball.z = -0.15;
    if (game.ball.vz < 0) { game.ball.vx *= -1; game.ball.vz *= -1; }
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'netGrazed')).toBe(true);
  });

  it('never fires when chance is 0', () => {
    CONFIG.fun.netGrazeChance = 0;
    const game = new Game(makeSettings());
    game.start();
    toPlaying(game);
    game.ball.x = 8;
    game.ball.z = -0.15;
    if (game.ball.vz < 0) { game.ball.vx *= -1; game.ball.vz *= -1; }
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'netGrazed')).toBe(false);
  });

  it('does not fire mid-flight without crossing', () => {
    CONFIG.fun.netGrazeChance = 1;
    const game = new Game(makeSettings());
    game.start();
    toPlaying(game);
    game.ball.x = 8;
    game.ball.z = -5; // far from net, one step won't cross
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'netGrazed')).toBe(false);
  });

  it('is off in classic mode', () => {
    CONFIG.fun.netGrazeChance = 1;
    const game = new Game(makeSettings({ gameMode: 'classic' }));
    game.start();
    toPlaying(game);
    game.ball.x = 8;
    game.ball.z = -0.15;
    if (game.ball.vz < 0) { game.ball.vx *= -1; game.ball.vz *= -1; }
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'netGrazed')).toBe(false);
  });
});
