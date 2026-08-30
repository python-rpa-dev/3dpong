// Shared test doubles and fixtures for game-level tests.

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
