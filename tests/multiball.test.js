import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

const makeSettings = (overrides = {}) => ({
  data: { gameMode: 'fun', multiBall: true, powerups: false, paddleShifts: false, difficulty: 'medium', winScore: 11, ...overrides },
  get(key) { return this.data[key]; },
});

describe('Hit-stop', () => {
  it('freezes the simulation while the timer runs, then resumes', () => {
    const game = new Game(makeSettings({ multiBall: false }));
    game.start();
    game.state = 'PLAYING';
    game.ball.active = true;
    game.ball.x = 0;
    game.ball.z = 0;
    game.ball.vx = 5;
    game.ball.vz = 10;

    game.hitStopTimer = 0.1;
    game.update(0.05);
    expect(game.ball.x).toBe(0); // frozen
    expect(game.ball.z).toBe(0);
    expect(game.hitStopTimer).toBeCloseTo(0.05);

    game.hitStopTimer = 0;
    game.update(0.05);
    expect(game.ball.x).toBeCloseTo(0.25); // moving again
  });

  it('a score triggers a hit-stop freeze', () => {
    const game = new Game(makeSettings({ multiBall: false }));
    game.start();
    game.state = 'PLAYING';
    game.aiPaddle.x = 9;
    game.ball.active = true;
    game.ball.z = CONFIG.court.depth / 2 + 2;
    game.ball.vz = 10;
    game.handleCollisions();
    expect(game.state).toBe('SCORED');
    expect(game.hitStopTimer).toBeCloseTo(CONFIG.hitStop.score);
  });

  it('a paddle hit triggers a small hit-stop', () => {
    const game = new Game(makeSettings({ multiBall: false }));
    game.start();
    game.state = 'PLAYING';
    game.ball.active = true;
    game.ball.x = 0;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.ball.radius;
    game.ball.vz = -1;
    game.playerPaddle.x = 0;
    game.handleCollisions();
    expect(game.hitStopTimer).toBeGreaterThanOrEqual(CONFIG.hitStop.paddle);
  });
});

describe('Multi-ball', () => {
  it('spawns a second ball once the combo threshold is reached', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.ball.active = true;
    // Simulate reaching the threshold via repeated player hits
    game.rallyCombo = CONFIG.fun.multiBallCombo - 1;
    game.ball.x = 0;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.ball.radius;
    game.ball.vz = -1; // approaching player paddle
    game.playerPaddle.x = 0;
    game.handleCollisions();
    expect(game.balls.length).toBe(2);
  });

  it('does not spawn a second ball below the threshold', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.ball.active = true;
    game.rallyCombo = CONFIG.fun.multiBallCombo - 2;
    game.ball.x = 0;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.ball.radius;
    game.ball.vz = -1;
    game.playerPaddle.x = 0;
    game.handleCollisions();
    expect(game.balls.length).toBe(1);
  });

  it('spawns only once per rally (never a third ball)', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.ball.active = true;
    game.rallyCombo = CONFIG.fun.multiBallCombo + 5;
    game.ball.x = 0;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.ball.radius;
    game.ball.vz = -1;
    game.playerPaddle.x = 0;
    game.handleCollisions(); // spawns ball #2
    game.balls[1].active = false; // stop it interfering
    game.rallyCombo += 1;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.ball.radius;
    game.ball.vz = -1;
    game.handleCollisions();
    expect(game.balls.length).toBe(2);
  });

  it('extra ball moves away from the last hitter', () => {
    const game = new Game(makeSettings());
    game.start();
    game.spawnExtraBall('player');
    const extra = game.balls[game.balls.length - 1];
    expect(extra.vz).toBeGreaterThan(0); // toward AI
    game.spawnExtraBall('ai');
    const extra2 = game.balls[game.balls.length - 1];
    expect(extra2.vz).toBeLessThan(0); // toward player
  });

  it('multi-ball disabled in classic mode', () => {
    const game = new Game(makeSettings({ gameMode: 'classic' }));
    expect(game.multiBallEnabled()).toBe(false);
  });

  it('extra balls are cleared when the rally ends with a score', () => {
    const game = new Game(makeSettings());
    game.start();
    game.spawnExtraBall('player');
    expect(game.balls.length).toBe(2);
    // Force a score
    game.state = 'PLAYING';
    game.aiPaddle.x = 9;
    game.ball.active = true;
    game.ball.z = CONFIG.court.depth / 2 + 2;
    game.ball.vz = 10;
    game.handleCollisions();
    expect(game.state).toBe('SCORED');
    // After the SCORED timer resolves, serve resets to a single ball
    let t = 0;
    while (game.state !== 'SERVE' && t < CONFIG.serve.scoreDelay + 0.5) {
      game.update(0.1);
      t += 0.1;
    }
    expect(game.balls.length).toBe(1);
  });
});

describe('Serve aim', () => {
  it('setServeAimWorld clamps to normalized range', () => {
    const game = new Game(makeSettings());
    game.setServeAimWorld(0);
    expect(game.serveAimX).toBe(0);
    game.setServeAimWorld(CONFIG.court.width / 2);
    expect(game.serveAimX).toBe(1);
    game.setServeAimWorld(-999);
    expect(game.serveAimX).toBe(-1);
  });

  it('serve uses the current aim', () => {
    const game = new Game(makeSettings());
    game.start();
    game.setServeAimWorld(CONFIG.court.width / 2); // full right
    let t = 0;
    while (game.state === 'SERVE' && t < CONFIG.serve.delay + 0.5) {
      game.update(0.1);
      t += 0.1;
    }
    expect(game.state).toBe('PLAYING');
    expect(game.ball.vx).toBeGreaterThan(0); // aimed toward +x
  });
});
