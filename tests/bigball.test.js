import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, ...overrides });

describe('Big ball powerup', () => {
  it('doubles live ball radius and restores after expiry', () => {
    const game = new Game(makeSettings());
    game.start();
    while (game.state !== 'PLAYING') game.update(1 / 60);

    game.applyPowerup('bigball', 'player');
    expect(game.ball.radius).toBeCloseTo(CONFIG.ball.radius * CONFIG.powerups.bigBallScale, 5);

    let t = 0;
    while (t < CONFIG.powerups.durationBigBall + 0.1) {
      game.tickEffects(1 / 60);
      t += 1 / 60;
    }
    expect(game.ball.radius).toBeCloseTo(CONFIG.ball.radius, 5);
    expect(game.ballRadiusScale).toBe(1);
  });

  it('extra balls spawned during the effect inherit the grown radius', () => {
    const game = new Game(makeSettings());
    game.start();
    while (game.state !== 'PLAYING') game.update(1 / 60);

    game.applyPowerup('bigball', 'player');
    game.spawnExtraBall('player');
    expect(game.balls[1].radius).toBeCloseTo(CONFIG.ball.radius * CONFIG.powerups.bigBallScale, 5);
  });
});
