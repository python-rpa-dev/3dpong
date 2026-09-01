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

// Paddle parked at center -> echo guards the x >= 0 half of the player line.
function aimBallAtLine(game, x) {
  const b = game.ball;
  b.active = true;
  b.x = x;
  b.z = -game.court.halfDepth + 1.4;
  b.vz = -CONFIG.ball.initialSpeed;
}

describe('Echo paddle', () => {
  it('expires after its duration', () => {
    const game = new Game(makeSettings());
    game.playerPaddle.x = 0;
    game.applyPowerup('echo', 'player');
    let t = 0;
    while (t < CONFIG.powerups.durationEcho + 0.1) {
      game.tickEffects(1 / 60);
      t += 1 / 60;
    }
    expect(game.activeEffects.some(e => e.type === 'echo')).toBe(false);
  });

  it('blocks one shot in the guarded half and pops', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.playerPaddle.x = 0;
    game.applyPowerup('echo', 'player');
    aimBallAtLine(game, 4); // covered half, outside paddle reach
    game.update(1 / 60);

    expect(game.score.opponentScore).toBe(0);
    expect(game.state).toBe('PLAYING');
    expect(game.ball.vz).toBeGreaterThan(0);
    const evt = game.drainEvents().find(e => e.type === 'echoBlock');
    expect(evt?.who).toBe('player');
    expect(game.activeEffects.some(e => e.type === 'echo')).toBe(false);
  });

  it('does not cover the other half', () => {
    const game = new Game(makeSettings());
    toPlaying(game);
    game.playerPaddle.x = 0;
    game.applyPowerup('echo', 'player');
    aimBallAtLine(game, -4); // uncovered half
    let guard = 0;
    while (game.state === 'PLAYING' && guard++ < 60) game.update(1 / 60);

    expect(game.score.opponentScore).toBe(1);
    expect(game.activeEffects.some(e => e.type === 'echo')).toBe(true);
  });
});
