import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 2,
    deuce: false,
    gameMode: 'classic',
    playerMode: 'ai',
    powerups: false,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    netGraze: false,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

function runUntil(game, predicate, maxT = 10) {
  let t = 0;
  while (!predicate(game) && t < maxT) { game.update(1 / 60); t += 1 / 60; }
  return t < maxT;
}

function scorePlayer(game) {
  runUntil(game, g => g.state === 'PLAYING');
  game.drainEvents();
  game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
  game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1;
  game.update(1 / 60);
  return game.drainEvents();
}

describe('Game flow integration', () => {
  it('serve fires after delay and transitions SERVE -> PLAYING', () => {
    const game = new Game(makeSettings());
    game.start();
    expect(game.state).toBe('SERVE');
    expect(game.ball.active).toBe(false);
    runUntil(game, g => g.state === 'PLAYING');
    expect(game.ball.active).toBe(true);
  });

  it('full game: two player points end the match with GAME_OVER', () => {
    const states = [];
    const game = new Game(makeSettings());
    game.start();

    let events1 = scorePlayer(game);
    expect(events1.some(e => e.type === 'score' && e.who === 'player')).toBe(true);
    expect(game.score.playerScore).toBe(1);
    expect(game.state).toBe('SCORED');

    // next serve comes automatically, then match point
    let events2 = scorePlayer(game);
    expect(events2.some(e => e.type === 'score' && e.who === 'player')).toBe(true);
    expect(game.score.playerScore).toBe(2);

    runUntil(game, g => { states.push(g.state); return g.state === 'GAME_OVER'; });
    expect(game.state).toBe('GAME_OVER');
    expect(game.winner).toBe('player');
  });

  it('rally hits register paddleHit events and combo grows', () => {
    const game = new Game(makeSettings());
    game.start();
    runUntil(game, g => g.state === 'PLAYING');
    game.drainEvents();

    // Put the ball right at the player paddle, approaching it
    game.ball.x = 0;
    game.ball.z = CONFIG.paddle.playerZ + CONFIG.paddle.depth / 2 + game.ball.radius + 0.1;
    game.ball.vz = -Math.abs(game.ball.vz);
    game.update(1 / 60);
    const events = game.drainEvents();
    const hit = events.find(e => e.type === 'paddleHit');
    expect(hit).toBeDefined();
    expect(hit.who).toBe('player');
    expect(game.rallyCombo).toBe(1);
  });

  it('pause and resume round-trips through PAUSED', () => {
    const game = new Game(makeSettings());
    game.start();
    runUntil(game, g => g.state === 'PLAYING');
    game.pause();
    expect(game.state).toBe('PAUSED');
    game.resume();
    expect(game.state).toBe('PLAYING');
  });

  it('quit to menu clears balls and effects', () => {
    const game = new Game(makeSettings());
    game.start();
    runUntil(game, g => g.state === 'PLAYING');
    game.quitToMenu();
    expect(game.state).toBe('MENU');
    expect(game.balls.length).toBe(1);
  });
});
