import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, ...overrides });

describe('Ghost + freeze powerups', () => {
  it('freeze locks the opponent of the collector', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('freeze', 'player');
    expect(game.aiPaddle.frozen).toBe(true);
    expect(game.playerPaddle.frozen).toBeFalsy();

    let t = 0;
    while (t < CONFIG.powerups.durationFreeze + 0.1) {
      game.tickEffects(1 / 60);
      t += 1 / 60;
    }
    expect(game.aiPaddle.frozen).toBeFalsy();
  });

  it('frozen AI paddle does not move during play', () => {
    const game = new Game(makeSettings());
    game.start();
    while (game.state !== 'PLAYING') game.update(1 / 60);
    game.drainEvents();

    game.applyPowerup('freeze', 'player');
    const x0 = game.aiPaddle.x;
    game.ball.z = -5;
    game.ball.vz = -CONFIG.ball.initialSpeed; // irrelevant direction, AI just must not move
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    expect(game.aiPaddle.x).toBe(x0);
  });

  it('ghost hides the ball only on the AI half heading toward the AI', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('ghost', 'player');

    const ball = game.ball;
    ball.active = true;
    ball.vz = 5;

    ball.z = 3;
    expect(game.isBallHidden(ball)).toBe(true);
    ball.z = -3;
    expect(game.isBallHidden(ball)).toBe(false);
    ball.z = 3;
    ball.vz = -5;
    expect(game.isBallHidden(ball)).toBe(false);
  });

  it('ghost expires after its duration', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('ghost', 'player');
    let t = 0;
    while (t < CONFIG.powerups.durationGhost + 0.1) {
      game.tickEffects(1 / 60);
      t += 1 / 60;
    }
    const ball = game.ball;
    ball.active = true;
    ball.vz = 5;
    ball.z = 3;
    expect(game.isBallHidden(ball)).toBe(false);
  });

  it('collecting spawns a powerup event with the new types', () => {
    const game = new Game(makeSettings());
    game.applyPowerup('ghost', 'player');
    game.applyPowerup('freeze', 'ai');
    const types = game.events.filter(e => e.type === 'powerup').map(e => e.puType);
    expect(types).toContain('ghost');
    expect(types).toContain('freeze');
  });
});
