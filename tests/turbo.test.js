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

describe('Turbo powerup', () => {
  it('kicks live ball speed by the turbo factor', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    const b = game.ball;
    const v0 = Math.hypot(b.vx, b.vz);

    game.applyPowerup('turbo', 'player');

    expect(b.speedMultiplier).toBeCloseTo(CONFIG.powerups.turboFactor, 5);
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(v0 * CONFIG.powerups.turboFactor, 3);
    expect(b.speed).toBeCloseTo(b.baseSpeed * CONFIG.powerups.turboFactor, 3);
  });

  it('does not leak into the next rally', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.applyPowerup('turbo', 'player');

    const b = game.ball;
    b.x = CONFIG.court.width / 2 - 1.5; // outside paddle reach -> real goal
    b.z = -game.court.halfDepth - b.radius * 2.5;
    b.vz = -CONFIG.ball.initialSpeed;
    let guard = 0;
    while (game.state === 'PLAYING' && guard++ < 60) game.update(1 / 60);
    expect(game.score.opponentScore).toBe(1);

    guard = 0;
    while (game.state !== 'PLAYING' && guard++ < 300) game.update(1 / 60);
    expect(game.ball.speedMultiplier).toBe(1);
    expect(game.ball.speed).toBe(CONFIG.ball.initialSpeed);
  });
});
