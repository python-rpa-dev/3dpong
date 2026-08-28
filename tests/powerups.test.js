import { describe, it, expect } from 'vitest';
import { PowerupManager } from '../src/game/Powerups.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

const makeSettings = (overrides = {}) => ({
  data: { gameMode: 'fun', powerups: true, difficulty: 'medium', winScore: 11, ...overrides },
  get(key) { return this.data[key]; },
});

describe('PowerupManager', () => {
  it('spawns a powerup after the spawn delay elapses', () => {
    const rng = (() => { let i = 0; return () => [0.5, 0.5, 0.5][i++ % 3]; })();
    const mgr = new PowerupManager(rng);
    expect(mgr.active.length).toBe(0);
    let t = 0;
    while (mgr.active.length === 0 && t < 20) {
      mgr.update(0.1);
      t += 0.1;
    }
    expect(mgr.active.length).toBe(1);
    expect(CONFIG.powerups.types).toContain(mgr.active[0].type);
  });

  it('collects powerup on overlap with lastHitter as target', () => {
    const mgr = new PowerupManager();
    mgr.active.push({ x: 3, z: 2, type: 'wide' });
    const ball = { active: true, x: 3.2, z: 2, radius: CONFIG.ball.radius, vz: 1 };
    const collected = mgr.checkPickups(ball, 'player');
    expect(collected).toEqual([{ type: 'wide', target: 'player' }]);
    expect(mgr.active.length).toBe(0);
  });

  it('falls back to ball direction for target when no lastHitter', () => {
    const mgr = new PowerupManager();
    mgr.active.push({ x: 0, z: 0, type: 'shrink' });
    const ball = { active: true, x: 0, z: 0, radius: CONFIG.ball.radius, vz: -1 };
    const collected = mgr.checkPickups(ball, null);
    expect(collected[0].target).toBe('ai');
  });

  it('inactive ball does not collect', () => {
    const mgr = new PowerupManager();
    mgr.active.push({ x: 0, z: 0, type: 'wide' });
    const ball = { active: false, x: 0, z: 0, radius: CONFIG.ball.radius, vz: 1 };
    const collected = mgr.checkPickups(ball, 'player');
    expect(collected.length).toBe(0);
  });

  it('reset clears active spawns', () => {
    const mgr = new PowerupManager();
    mgr.active.push({ x: 0, z: 0, type: 'wide' });
    mgr.reset();
    expect(mgr.active.length).toBe(0);
  });
});

describe('Game powerup effects', () => {
  const makeGame = (overrides) => new Game(makeSettings(overrides));

  it('wide widens the collector paddle', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('wide', 'player');
    expect(game.playerPaddle.width).toBeCloseTo(CONFIG.paddle.width * CONFIG.powerups.wideScale);
    expect(game.aiPaddle.width).toBe(CONFIG.paddle.width);
  });

  it('shrink narrows the opponent paddle', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('shrink', 'player');
    expect(game.aiPaddle.width).toBeCloseTo(CONFIG.paddle.width * CONFIG.powerups.shrinkScale);
  });

  it('effects expire and restore paddle widths', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('wide', 'player');
    let t = 0;
    while (t < CONFIG.powerups.durationWide + 0.5) {
      game.tickEffects(0.1);
      t += 0.1;
    }
    expect(game.playerPaddle.width).toBe(CONFIG.paddle.width);
  });

  it('slowmo scales the time scale and expires', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('slowmo', 'player');
    expect(game.timeScale).toBeCloseTo(CONFIG.powerups.slowmoScale);
    let t = 0;
    while (t < CONFIG.powerups.durationSlowmo + 0.5) {
      game.tickEffects(0.1);
      t += 0.1;
    }
    expect(game.timeScale).toBe(1);
  });

  it('double points adds 2 per goal and decrements counter', () => {
    const game = makeGame();
    game.start();
    game.aiPaddle.x = 9; // keep AI paddle out of the way
    const scoreOnce = () => {
      game.state = 'PLAYING';
      game.ball.active = true;
      game.ball.x = 0;
      game.ball.z = CONFIG.court.depth / 2 + 2; // past the goal line
      game.ball.vz = 10;
      game.handleCollisions();
    };
    game.applyPowerup('double', 'player');
    scoreOnce();
    expect(game.score.playerScore).toBe(2);

    // second goal still doubled, third is single
    scoreOnce();
    expect(game.score.playerScore).toBe(4);

    scoreOnce();
    expect(game.score.playerScore).toBe(5);
  });

  it('powerups disabled in classic mode', () => {
    const game = makeGame({ gameMode: 'classic' });
    expect(game.powerupsEnabled()).toBe(false);
  });

  it('quitToMenu clears all effects and modifiers', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('wide', 'player');
    game.applyPowerup('slowmo', 'ai');
    game.quitToMenu();
    expect(game.playerPaddle.width).toBe(CONFIG.paddle.width);
    expect(game.timeScale).toBe(1);
    expect(game.activeEffects.length).toBe(0);
  });
});
