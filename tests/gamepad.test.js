import { describe, it, expect } from 'vitest';
import { GamepadInput } from '../src/input/GamepadInput.js';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

function makeSettings(overrides = {}) {
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
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

describe('GamepadInput', () => {
  it('moves P1 paddle with stick axis (stick right -> screen right)', () => {
    const game = new Game(makeSettings());
    const input = new GamepadInput(game);
    input.setProvider(() => [{ axes: [1], buttons: [] }]);
    const x0 = game.playerPaddle.x;
    input.update(1 / 60);
    expect(game.playerPaddle.targetX).toBeLessThan(x0); // world -x is screen right
  });

  it('respects the deadzone', () => {
    const game = new Game(makeSettings());
    const input = new GamepadInput(game);
    input.setProvider(() => [{ axes: [0.1], buttons: [] }]);
    input.update(1 / 60);
    expect(game.playerPaddle.targetX).toBeNull();
  });

  it('vertical steer axis maps stick up to screen right', () => {
    const game = new Game(makeSettings({ steerAxis: 'vertical' }));
    const input = new GamepadInput(game);
    input.setProvider(() => [{ axes: [0, -1], buttons: [] }]);
    const x0 = game.playerPaddle.x;
    input.update(1 / 60);
    expect(game.playerPaddle.targetX).toBeLessThan(x0);
  });

  it('vertical steer ignores horizontal stick', () => {
    const game = new Game(makeSettings({ steerAxis: 'vertical' }));
    const input = new GamepadInput(game);
    input.setProvider(() => [{ axes: [1, 0], buttons: [] }]);
    input.update(1 / 60);
    expect(game.playerPaddle.targetX).toBeNull();
  });

  it('vertical steer dpad up/down works', () => {
    const game = new Game(makeSettings({ steerAxis: 'vertical' }));
    const input = new GamepadInput(game);
    const buttons = [];
    buttons[12] = { pressed: true };
    input.setProvider(() => [{ axes: [], buttons }]);
    const x0 = game.playerPaddle.x;
    input.update(1 / 60);
    expect(game.playerPaddle.targetX).toBeLessThan(x0);
  });

  it('dpad overrides and clamps to court', () => {
    const game = new Game(makeSettings());
    const input = new GamepadInput(game);
    input.setProvider(() => [{ axes: [], buttons: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { pressed: true }, {}] }]);
    for (let i = 0; i < 2000; i++) input.update(1 / 60);
    const hw = CONFIG.court.width / 2 - game.playerPaddle.width / 2;
    expect(game.playerPaddle.targetX).toBeCloseTo(hw, 5); // dpad left -> world +x (screen left)
  });

  it('second pad controls P2 only in versus mode', () => {
    const ai = new Game(makeSettings({ playerMode: 'ai' }));
    const inputAi = new GamepadInput(ai);
    inputAi.setProvider(() => [{ axes: [] }, { axes: [1], buttons: [] }]);
    inputAi.update(1 / 60);
    // AIPaddle keeps its own internal target (0 = center drift); the pad must not touch it
    expect(ai.aiPaddle.targetX).toBe(0);

    const vs = new Game(makeSettings({ playerMode: 'versus' }));
    vs.start(); // swaps opponent to a PlayerPaddle
    const inputVs = new GamepadInput(vs);
    inputVs.setProvider(() => [{ axes: [] }, { axes: [1], buttons: [] }]);
    inputVs.update(1 / 60);
    expect(vs.aiPaddle.targetX).toBeLessThan(vs.aiPaddle.x);
  });

  it('absent pads are a no-op', () => {
    const game = new Game(makeSettings());
    const input = new GamepadInput(game);
    input.setProvider(() => []);
    expect(() => input.update(1 / 60)).not.toThrow();
    expect(game.playerPaddle.targetX).toBeNull();
  });
});
