import { describe, it, expect, beforeEach } from 'vitest';
import { FakeStorage, makeSettings } from './helpers.js';

// Minimal DOM stub so UI can be constructed in node (mirrors keystub experiments).
const noop = () => {};
const el = () => ({
  classList: { add: noop, remove: noop },
  addEventListener: noop,
  style: {},
  value: '0',
  checked: false,
  textContent: '',
  innerHTML: '',
  setAttribute: noop,
  offsetWidth: 0,
});

let Game, UI;

async function load() {
  const elements = {};
  globalThis.document = { getElementById: (id) => (elements[id] ??= el()) };
  globalThis.window = { addEventListener: noop, innerWidth: 1280, innerHeight: 720 };
  if (!Game) ({ Game } = await import('../src/game/Game.js'));
  if (!UI) ({ UI } = await import('../src/ui/UI.js'));
}

function makeGame(overrides = {}) {
  const settings = makeSettings({ steerAxis: 'horizontal', sideSwap: false, ...overrides });
  const game = new Game(settings);
  game.start();
  return { game, ui: new UI(game, settings), settings };
}

const down = (ui, key) => ui.onKeyDown({ key, preventDefault: noop });
const up = (ui, key) => ui.onKeyUp({ key });

describe('UI steer key tracking', () => {
  beforeEach(async () => {
    globalThis.localStorage = new FakeStorage();
    await load();
  });

  it('press and release sets and clears the paddle key', () => {
    const { game, ui } = makeGame();
    down(ui, 'ArrowLeft');
    expect(game.playerPaddle.keys.left).toBe(true);
    up(ui, 'ArrowLeft');
    expect(game.playerPaddle.keys.left).toBe(false);
  });

  it('releasing after toggling steer axis mid-hold does not strand a key', () => {
    const { game, ui, settings } = makeGame({ steerAxis: 'vertical' });
    down(ui, 'ArrowUp'); // vertical: behaves like ArrowRight
    expect(game.playerPaddle.keys.right).toBe(true);
    settings.set('steerAxis', 'horizontal'); // player clicks STEER mid-hold
    up(ui, 'ArrowUp');
    expect(game.playerPaddle.keys).toEqual({ left: false, right: false });
  });

  it('releasing after toggling side swap mid-hold does not strand a key', () => {
    const { game, ui, settings } = makeGame();
    down(ui, 'ArrowLeft');
    expect(game.playerPaddle.keys.left).toBe(true);
    settings.set('sideSwap', true); // swapped would flip the logical dir
    up(ui, 'ArrowLeft');
    expect(game.playerPaddle.keys).toEqual({ left: false, right: false });
  });

  it('blur releases every held key', () => {
    const { game, ui } = makeGame();
    down(ui, 'a');
    down(ui, 'd');
    ui.releaseAllSteerKeys(); // window blur handler
    expect(game.playerPaddle.keys).toEqual({ left: false, right: false });
  });

  it('versus routing is unchanged: arrows drive P2, a/d drive P1', () => {
    const { game, ui } = makeGame({ playerMode: 'versus' });
    down(ui, 'ArrowLeft');
    expect(game.aiPaddle.keys.left).toBe(true);
    expect(game.playerPaddle.keys.left).toBe(false);
    down(ui, 'd');
    expect(game.playerPaddle.keys.right).toBe(true);
  });

  it('side swap mirrors the arrow direction', () => {
    const { game, ui } = makeGame({ sideSwap: true });
    down(ui, 'ArrowLeft');
    expect(game.playerPaddle.keys.right).toBe(true);
    expect(game.playerPaddle.keys.left).toBe(false);
  });
});
