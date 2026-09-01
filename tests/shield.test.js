import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, ...overrides });

function toPlaying(game) {
  game.start();
  while (game.state !== 'PLAYING') game.update(1 / 60);
  game.drainEvents();
}

function pushBallPastLine(game, side) {
  const b = game.ball;
  const half = game.court.halfDepth;
  b.active = true;
  b.x = CONFIG.court.width / 2 - 1.5; // past the paddle's reach so it truly scores
  if (side === 'player') {
    b.z = -half - b.radius * 2.5;
    b.vz = -CONFIG.ball.initialSpeed;
  } else {
    b.z = half + b.radius * 2.5;
    b.vz = CONFIG.ball.initialSpeed;
  }
}

describe('Shield powerup', () => {
  it('is in the spawn pool and draftable info exists', () => {
    expect(CONFIG.powerups.types).toContain('shield');
  });

  it('persists until used (no expiry tick)', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('shield', 'player');
    for (let i = 0; i < 600; i++) game.tickEffects(1 / 60);
    expect(game.activeEffects.some(e => e.type === 'shield' && e.target === 'player')).toBe(true);
  });

  it('re-collecting keeps a single charge', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('shield', 'player');
    game.applyPowerup('shield', 'player');
    expect(game.activeEffects.filter(e => e.type === 'shield').length).toBe(1);
  });

  it('blocks a goal against the player and pops', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.applyPowerup('shield', 'player');
    pushBallPastLine(game, 'player');
    game.update(1 / 60);

    expect(game.score.playerScore).toBe(0);
    expect(game.score.opponentScore).toBe(0);
    expect(game.state).toBe('PLAYING');
    expect(game.ball.active).toBe(true);
    expect(game.ball.vz).toBeGreaterThan(0);
    const evt = game.drainEvents().find(e => e.type === 'shieldSave');
    expect(evt?.who).toBe('player');
    expect(game.activeEffects.some(e => e.type === 'shield')).toBe(false);
  });

  it('blocks a goal against the AI and pops', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.applyPowerup('shield', 'ai');
    pushBallPastLine(game, 'ai');
    game.update(1 / 60);

    expect(game.score.playerScore).toBe(0);
    expect(game.state).toBe('PLAYING');
    expect(game.ball.vz).toBeLessThan(0);
    const evt = game.drainEvents().find(e => e.type === 'shieldSave');
    expect(evt?.who).toBe('ai');
  });

  it('only saves once — the next goal scores normally', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.applyPowerup('shield', 'player');
    pushBallPastLine(game, 'player');
    game.update(1 / 60);

    // second unblocked goal against the player
    pushBallPastLine(game, 'player');
    game.update(1 / 60);
    expect(game.score.opponentScore).toBe(1);
    expect(game.state).not.toBe('PLAYING');
  });

  it('shield on one side does not protect the other', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.applyPowerup('shield', 'player');
    pushBallPastLine(game, 'ai');
    game.update(1 / 60);

    expect(game.score.playerScore).toBe(1);
    expect(game.activeEffects.some(e => e.type === 'shield')).toBe(true);
  });
});
