import { describe, it, expect, beforeEach } from 'vitest';
import { FakeStorage, makeSettings } from './helpers.js';

const noop = () => {};
const el = () => ({
  classList: { add: noop, remove: noop },
  _click: null,
  addEventListener(type, fn) { if (type === 'click') this._click = fn; },
  style: {}, value: '0', checked: false,
  textContent: '', innerHTML: '', setAttribute: noop, offsetWidth: 0,
});

let Game, UI, MOUSE_SENS_LEVELS;

async function load() {
  const elements = {};
  globalThis.document = { getElementById: (id) => (elements[id] ??= el()) };
  globalThis.window = { addEventListener: noop, innerWidth: 1280, innerHeight: 720 };
  if (!Game) ({ Game } = await import('../src/game/Game.js'));
  if (!UI) ({ UI, MOUSE_SENS_LEVELS } = await import('../src/ui/UI.js'));
}

function makeGame(overrides = {}) {
  const settings = makeSettings({ mouseSensitivity: 1, sideSwap: false, steerAxis: 'horizontal', ...overrides });
  const game = new Game(settings);
  game.start();
  game.state = 'PLAYING';
  const ui = new UI(game, settings);
  // Linear stand-in for the camera unprojection: +clientX maps to -worldX (screen-left is +x).
  ui.setScreenToWorld((x) => -(x - 640) * 0.02);
  return { game, ui, settings };
}

const move = (ui, x) => ui.onPointerMove({ pointerType: 'mouse', clientX: x, clientY: 360 });

describe('mouse sensitivity', () => {
  beforeEach(async () => {
    globalThis.localStorage = new FakeStorage();
    await load();
  });

  it('the button cycles levels and persists the choice', () => {
    const { ui, settings } = makeGame();
    expect(MOUSE_SENS_LEVELS).toEqual([0.25, 0.5, 0.75, 1, 1.5]);
    ui.mouseSensBtn._click(); // 1 -> 1.5
    expect(settings.get('mouseSensitivity')).toBe(1.5);
    expect(ui.mouseSensBtn.innerHTML).toContain('150%');
    ui.mouseSensBtn._click(); // wraps to the lowest level
    expect(settings.get('mouseSensitivity')).toBe(0.25);
    expect(ui.mouseSensBtn.innerHTML).toContain('25%');
  });

  it('first move after (re)arming anchors at the paddle without jumping', () => {
    const { game, ui } = makeGame();
    move(ui, 300); // far from center: must not teleport
    expect(game.playerPaddle.targetX).toBe(0);
  });

  it('movement accumulates scaled by the sensitivity level', () => {
    const { game, ui, settings } = makeGame({ mouseSensitivity: 0.5 });
    move(ui, 640); // anchor at current world (wx=0)
    move(ui, 740); // +100px -> dWorld -2 -> *0.5 = -1
    expect(game.playerPaddle.targetX).toBeCloseTo(-1);
  });

  it('the accumulated target is clamped to the court', () => {
    const { game, ui } = makeGame();
    move(ui, 640);
    for (let x = 640; x < 5000; x += 200) move(ui, x);
    expect(game.playerPaddle.targetX).toBeGreaterThanOrEqual(-10 - 1e-9); // half width
    expect(Math.abs(game.playerPaddle.targetX)).toBeLessThanOrEqual(10 + 1e-9);
  });

  it('leaving play re-arms the anchor so resume does not teleport', () => {
    const { game, ui } = makeGame();
    move(ui, 640);
    move(ui, 700);
    expect(game.playerPaddle.targetX).toBeCloseTo(-1.2);
    game.state = 'MENU';
    move(ui, 1200); // ignored, re-arms
    game.state = 'PLAYING';
    move(ui, 1250); // first move after resume: anchor at the paddle's actual spot, no jump
    expect(game.playerPaddle.targetX).toBe(game.playerPaddle.x);
  });
});
