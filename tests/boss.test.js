import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { BOSSES, BOSS_TUNING } from '../src/game/Boss.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings, toPlaying } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'boss', ...overrides });

describe('Boss mode', () => {
  it('picks a boss and announces the intro on start', () => {
    const game = new Game(makeSettings());
    game.start();
    expect(BOSSES).toContain(game.boss);
    const intro = game.events.find(e => e.type === 'boss' && e.effect === 'intro');
    expect(intro).toBeDefined();
  });

  it('no boss in classic or fun mode', () => {
    for (const gameMode of ['classic', 'fun']) {
      const game = new Game(makeSettings({ gameMode }));
      game.start();
      expect(game.boss).toBeNull();
    }
  });

  it('freezer freezes the player paddle on its interval', () => {
    const game = new Game(makeSettings());
    game.start();
    game.boss = BOSSES.find(b => b.id === 'freezer');
    game.events.length = 0;
    let t = 0;
    while (t < BOSS_TUNING.freezerInterval + 0.2) { game.tickBoss(1 / 60); t += 1 / 60; }
    const events = game.drainEvents();
    expect(game.playerPaddle.frozen).toBe(true);
    expect(events.some(e => e.type === 'boss' && e.effect === 'freeze')).toBe(true);

    let s = 0;
    while (s < BOSS_TUNING.freezeDuration + 0.1) { game.tickEffects(1 / 60); s += 1 / 60; }
    expect(game.playerPaddle.frozen).toBe(false);
  });

  it('shrinker shrinks the player paddle', () => {
    const game = new Game(makeSettings());
    game.start();
    toPlaying(game);
    game.boss = BOSSES.find(b => b.id === 'shrinker');
    const w0 = game.playerPaddle.width;
    game.bossShrinkPlayer();
    expect(game.playerPaddle.width).toBeCloseTo(w0 * BOSS_TUNING.shrinkScale, 5);
    const ev = game.events.find(e => e.type === 'boss' && e.effect === 'shrink');
    expect(ev).toBeDefined();
  });

  it('metronome double-ramps speed on player hits', () => {
    const withBoss = new Game(makeSettings());
    withBoss.start();
    toPlaying(withBoss);
    withBoss.boss = BOSSES.find(b => b.id === 'metronome');
    const plain = new Game(makeSettings());
    plain.start();
    plain.boss = null;
    toPlaying(plain);

    function forcePlayerHit(game) {
      const ball = game.ball;
      expect(game.state).toBe('PLAYING');
      game.hitStopTimer = 0;
      ball.speed = CONFIG.ball.initialSpeed;
      ball.x = game.playerPaddle.x;
      ball.z = CONFIG.paddle.playerZ + ball.radius + 0.05;
      ball.vx = 0;
      ball.vz = -ball.speed;
      game.update(1 / 60);
      const hit = game.events.find(e => e.type === 'paddleHit' && e.who === 'player');
      expect(hit).toBeTruthy();
      return ball.currentSpeed;
    }

    const speedBoss = forcePlayerHit(withBoss);
    const speedPlain = forcePlayerHit(plain);
    expect(speedBoss).toBeGreaterThan(speedPlain);
  });
});
