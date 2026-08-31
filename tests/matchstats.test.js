import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings } from './helpers.js';

function runUntil(game, predicate, maxT = 10) {
  let t = 0;
  while (!predicate(game) && t < maxT) { game.update(1 / 60); t += 1 / 60; }
  return t < maxT;
}

function hitPlayerPaddle(game) {
  runUntil(game, g => g.state === 'PLAYING');
  game.drainEvents();
  game.ball.x = 0;
  game.ball.z = CONFIG.paddle.playerZ + CONFIG.paddle.depth / 2 + game.ball.radius + 0.1;
  game.ball.vz = -Math.abs(game.ball.vz);
  game.update(1 / 60);
}

describe('match stats readout', () => {
  it('starts empty on a fresh match', () => {
    const game = new Game(makeSettings());
    game.start();
    expect(game.matchStats).toEqual({ longestRally: 0, topSpeed: 0, grazes: 0 });
  });

  it('tracks the ball speed while the rally runs', () => {
    const game = new Game(makeSettings());
    game.start();
    runUntil(game, g => g.state === 'PLAYING');
    game.update(1 / 60);
    expect(game.matchStats.topSpeed).toBeGreaterThanOrEqual(CONFIG.ball.initialSpeed);
  });

  it('longest rally grows with paddle hits', () => {
    const game = new Game(makeSettings());
    game.start();
    hitPlayerPaddle(game);
    expect(game.rallyCombo).toBe(1);
    expect(game.matchStats.longestRally).toBe(1);
  });

  it('a restart resets the stats', () => {
    const game = new Game(makeSettings());
    game.start();
    hitPlayerPaddle(game);
    game._grazes = 2;
    game.start();
    expect(game.matchStats).toEqual({ longestRally: 0, topSpeed: 0, grazes: 0 });
  });

  it('pause menu shows the current-match readout', async () => {
    const noop = () => {};
    const el = () => ({
      classList: { add: noop, remove: noop },
      addEventListener: noop, style: {}, value: '0', checked: false,
      textContent: '', innerHTML: '', setAttribute: noop, offsetWidth: 0,
    });
    const elements = {};
    globalThis.document = { getElementById: (id) => (elements[id] ??= el()) };
    globalThis.window = { addEventListener: noop, innerWidth: 1280, innerHeight: 720 };
    const { UI } = await import('../src/ui/UI.js');

    const settings = makeSettings();
    const game = new Game(settings);
    game.start();
    hitPlayerPaddle(game);
    game.pause();
    const ui = new UI(game, settings);
    ui.update();
    expect(ui.pauseStatsEl.textContent).toContain('LONGEST RALLY 1');
  });
});
