import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game/Game.js';
import { Records } from '../src/settings/Records.js';
import { CONFIG } from '../src/config.js';
import { FakeStorage, makeSettings, scoreGoal } from './helpers.js';

function finishMatch(game) {
  game.aiPaddle.x = 9; // keep the AI paddle out of the ball's path
  scoreGoal(game, 'player');
  let t = 0;
  while (game.state === 'SCORED' && t < 5) { game.update(1 / 60); t += 1 / 60; }
}

describe('regressions', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('a pinned ladder encounter does not leak into the next match after quitting to menu', () => {
    const game = new Game(makeSettings({ gameMode: 'ladder', winScore: 1 }));
    game.start();
    expect(game.boss).not.toBeNull();
    game.quitToMenu();
    game.settings.set('gameMode', 'classic');
    game.start();
    expect(game.encounter).toBeNull();
    expect(game.boss).toBeNull();
    expect(game.aiPaddle.difficulty).toBe('easy');
    expect(game.ball.baseSpeed).toBe(CONFIG.ball.initialSpeed);
  });

  it('daily runs pick the same AI personality and serve direction from the seed', () => {
    const a = new Game(makeSettings({ dailyChallenge: true }));
    const b = new Game(makeSettings({ dailyChallenge: true }));
    a.start();
    b.start();
    expect(a.personality.name).toBe(b.personality.name);
    expect(a.serveDirection).toBe(b.serveDirection);
  });

  it('versus matches do not write global records', () => {
    const records = new Records();
    const game = new Game(makeSettings({ playerMode: 'versus', winScore: 1 }), records);
    game.start();
    finishMatch(game);
    expect(game.state).toBe('GAME_OVER');
    expect(records.data.wins).toBe(0);
    expect(records.data.bestRally).toBe(0);
  });

  it('AI matches still record wins and rallies', () => {
    const records = new Records();
    const game = new Game(makeSettings({ winScore: 1 }), records);
    game.start();
    finishMatch(game);
    expect(records.data.wins).toBe(1);
  });
});
