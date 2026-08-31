import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { PlayerPaddle } from '../src/game/PlayerPaddle.js';
import { AIPaddle } from '../src/game/AIPaddle.js';
import { CONFIG } from '../src/config.js';
import { makeSettings } from './helpers.js';

describe('Versus mode', () => {
  it('creates a second player paddle on the AI side when versus', () => {
    const game = new Game(makeSettings({ playerMode: 'versus' }));
    expect(game.aiPaddle).toBeInstanceOf(PlayerPaddle);
    expect(game.isVersus()).toBe(true);
  });

  it('creates an AI paddle by default', () => {
    const game = new Game(makeSettings());
    expect(game.aiPaddle).toBeInstanceOf(AIPaddle);
    expect(game.isVersus()).toBe(false);
  });

  it('swaps opponent paddle on start when mode changed', () => {
    const settings = makeSettings();
    const game = new Game(settings);
    expect(game.aiPaddle).toBeInstanceOf(AIPaddle);
    settings.set('playerMode', 'versus');
    game.start();
    expect(game.aiPaddle).toBeInstanceOf(PlayerPaddle);
    expect(game.aiPaddle.z).toBe(CONFIG.paddle.opponentZ);
  });

  it('P2 paddle position aims serves toward the player side', () => {
    const game = new Game(makeSettings({ playerMode: 'versus' }));
    game.start();
    game.serveDirection = -1;
    game.aiPaddle.x = CONFIG.court.width / 4; // half-way right
    expect(game.currentServeAim()).toBeCloseTo(0.5);
    game.aiPaddle.x = 999;
    expect(game.currentServeAim()).toBe(1);
  });

  it('P1 mouse aim is used when serve heads toward AI side', () => {
    const game = new Game(makeSettings({ playerMode: 'versus' }));
    game.start();
    game.serveDirection = 1;
    game.setServeAimWorld(-CONFIG.court.width / 2);
    expect(game.currentServeAim()).toBe(-1);
  });

  it('keyboard paddle moves when keys held', () => {
    const game = new Game(makeSettings({ playerMode: 'versus' }));
    game.start();
    const p2 = game.aiPaddle;
    const x0 = p2.x;
    p2.setKey('left', true);
    p2.update(0.1);
    expect(p2.x).toBeGreaterThan(x0); // +x is screen-left with this camera
  });
});
