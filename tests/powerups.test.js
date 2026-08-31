import { describe, it, expect } from 'vitest';
import { PowerupManager } from '../src/game/Powerups.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings, scoreGoal } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, difficulty: 'medium', ...overrides });

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
    game.applyPowerup('double', 'player');
    scoreGoal(game);
    expect(game.score.playerScore).toBe(2);

    // second goal still doubled, third is single
    scoreGoal(game);
    expect(game.score.playerScore).toBe(4);

    scoreGoal(game);
    expect(game.score.playerScore).toBe(5);
  });

  it('double stacks multiplicatively and caps at doubleMaxMult', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('double', 'player');
    expect(game.doublePoints.player).toEqual({ mult: 2, goalsLeft: CONFIG.powerups.doublePointsGoals });
    game.applyPowerup('double', 'player');
    expect(game.doublePoints.player.mult).toBe(4);
    game.applyPowerup('double', 'player');
    game.applyPowerup('double', 'player');
    expect(game.doublePoints.player.mult).toBe(CONFIG.powerups.doubleMaxMult);
  });

  it('stacked double scores the current multiplier until goals run out', () => {
    const game = makeGame();
    game.start();
    game.aiPaddle.x = 9;
    game.applyPowerup('double', 'player');
    game.applyPowerup('double', 'player'); // x4, 2 goals left
    scoreGoal(game);
    expect(game.score.playerScore).toBe(4);
    scoreGoal(game);
    expect(game.score.playerScore).toBe(8);
    scoreGoal(game);
    expect(game.score.playerScore).toBe(9);
    expect(game.doublePoints.player).toEqual({ mult: 1, goalsLeft: 0 });
  });

  it('stacked double marker is replaced, not duplicated per side', () => {
    const game = makeGame();
    game.start();
    game.applyPowerup('double', 'player');
    game.applyPowerup('double', 'player');
    game.applyPowerup('double', 'ai');
    const markers = game.activeEffects.filter((e) => e.type === 'double');
    expect(markers.length).toBe(2);
    expect(markers.find((e) => e.target === 'player').mult).toBe(4);
  });

  it('each side keeps its own multiplier', () => {
    const game = makeGame();
    game.start();
    game.aiPaddle.x = 9;
    game.applyPowerup('double', 'ai');
    game.playerPaddle.x = 9; // ball heads for the player's line
    scoreGoal(game, 'ai');
    expect(game.score.opponentScore).toBe(2);
    expect(game.doublePoints.player.mult).toBe(1);
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
