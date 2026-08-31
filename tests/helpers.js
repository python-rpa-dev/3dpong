// Shared test doubles and fixtures for game-level tests.

import { CONFIG } from '../src/config.js';

export class FakeStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
}

export function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 11,
    deuce: false,
    gameMode: 'classic',
    playerMode: 'ai',
    powerups: false,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    netGraze: false,
    catchMode: false,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

export function toPlaying(game) {
  let t = 0;
  while (game.state !== 'PLAYING' && t < 5) { game.update(1 / 60); t += 1 / 60; }
  game.drainEvents();
}

/** Force a goal: send the active ball past `side`'s scoring line. */
export function scoreGoal(game, side = 'player') {
  game.state = 'PLAYING';
  const ball = game.ball;
  ball.active = true;
  ball.x = 0;
  const reach = CONFIG.court.depth / 2 + 2;
  ball.z = side === 'player' ? reach : -reach;
  ball.vz = side === 'player' ? 10 : -10;
  game.handleCollisions();
}
