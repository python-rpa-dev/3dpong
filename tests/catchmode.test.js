import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { Ball } from '../src/game/Ball.js';
import { CONFIG } from '../src/config.js';
import { makeSettings } from './helpers.js';

describe('Catch mode', () => {
  it('applyCatchAssist slows the ball and preserves direction', () => {
    const ball = new Ball();
    ball.reset(1);
    ball.speed = CONFIG.ball.initialSpeed * 2;
    ball.vx = 3;
    ball.vz = -4;
    ball.applyCatchAssist(0.5);
    expect(ball.currentSpeed).toBeCloseTo(CONFIG.ball.initialSpeed, 5);
    expect(ball.vx / ball.vz).toBeCloseTo(3 / -4, 5);
  });

  it('never slows below base speed', () => {
    const ball = new Ball();
    ball.reset(1);
    ball.applyCatchAssist(0.1);
    expect(ball.speed).toBeGreaterThanOrEqual(CONFIG.ball.initialSpeed);
  });

  it('slows the return after an AI paddle bounce when enabled', () => {
    const game = new Game(makeSettings({ catchMode: true }));
    game.start();
    while (game.state !== 'PLAYING') game.update(1 / 60);
    game.drainEvents();

    const ball = game.ball;
    ball.speed = CONFIG.ball.initialSpeed * 2;
    ball.x = game.aiPaddle.x;
    ball.z = CONFIG.paddle.opponentZ - ball.radius - 0.05;
    ball.vx = 0;
    ball.vz = ball.speed;
    const beforeSpeed = ball.currentSpeed;
    game.update(1 / 60);

    const hit = game.events.find((e) => e.type === 'paddleHit' && e.who === 'ai');
    expect(hit).toBeTruthy();
    expect(ball.vz).toBeLessThan(0);
    expect(ball.currentSpeed).toBeLessThan(beforeSpeed);
  });

  it('does not slow the return when disabled', () => {
    const game = new Game(makeSettings({ catchMode: false }));
    game.start();
    while (game.state !== 'PLAYING') game.update(1 / 60);
    game.drainEvents();

    const ball = game.ball;
    ball.speed = CONFIG.ball.initialSpeed * 2;
    ball.x = game.aiPaddle.x;
    ball.z = CONFIG.paddle.opponentZ - ball.radius - 0.05;
    ball.vx = 0;
    ball.vz = ball.speed;
    const beforeSpeed = ball.currentSpeed;
    game.update(1 / 60);

    const hit = game.events.find((e) => e.type === 'paddleHit' && e.who === 'ai');
    expect(hit).toBeTruthy();
    expect(ball.currentSpeed).toBeGreaterThanOrEqual(beforeSpeed * 0.999);
  });
});
