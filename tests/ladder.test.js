import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game/Game.js';
import { LADDER, ladderStage, bossFor } from '../src/game/Encounters.js';
import { Records } from '../src/settings/Records.js';
import { CONFIG } from '../src/config.js';
import { FakeStorage, makeSettings as baseSettings, scoreGoal } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'ladder', winScore: 1, ...overrides });

function winPoint(game) {
  game.aiPaddle.x = 9; // keep AI paddle out of the way
  scoreGoal(game, 'player');
  let t = 0;
  while (game.state === 'SCORED' && t < 5) { game.update(1 / 60); t += 1 / 60; }
}

describe('Encounters', () => {
  it('clamps ladder stages to the authored list', () => {
    expect(ladderStage(-2)).toBe(LADDER[0]);
    expect(ladderStage(99)).toBe(LADDER[LADDER.length - 1]);
  });

  it('bossFor resolves an encounter id to its boss definition', () => {
    expect(bossFor({ id: 'freezer' }).label).toBe('THE FREEZER');
    expect(bossFor({ id: 'nobody' })).toBeNull();
  });
});

describe('Boss Rush Ladder', () => {
  beforeEach(() => {
    globalThis.localStorage = new FakeStorage();
  });

  it('starts at stage 1 with the first boss, its difficulty and a staged intro', () => {
    const game = new Game(makeSettings());
    game.start();
    expect(game.boss.id).toBe('shrinker');
    expect(game.ladderStage).toBe(0);
    expect(game.aiPaddle.difficulty).toBe('easy');
    const intro = game.events.find((e) => e.type === 'boss' && e.effect === 'intro');
    expect(intro.label).toContain('STAGE 1/3');
  });

  it('a stage win advances to the next boss instead of ending the run', () => {
    const game = new Game(makeSettings());
    game.start();
    winPoint(game);
    expect(game.state).not.toBe('GAME_OVER');
    expect(game.ladderStage).toBe(1);
    expect(game.boss.id).toBe('freezer');
    expect(game.aiPaddle.difficulty).toBe('medium');
    expect(game.ball.baseSpeed).toBeCloseTo(CONFIG.ball.initialSpeed * 1.15, 5);
  });

  it('a loss ends the run at the current stage', () => {
    const game = new Game(makeSettings());
    game.start();
    game.playerPaddle.x = -9;
    scoreGoal(game, 'ai');
    let t = 0;
    while (game.state === 'SCORED' && t < 5) { game.update(1 / 60); t += 1 / 60; }
    expect(game.state).toBe('GAME_OVER');
    expect(game.winner).toBe('opponent');
    expect(game.ladderCleared).toBe(false);
  });

  it('beating the final stage clears the ladder and unlocks the trophy', () => {
    const records = new Records();
    const game = new Game(makeSettings(), records);
    game.start();
    for (let i = 0; i < LADDER.length; i++) winPoint(game);
    expect(game.state).toBe('GAME_OVER');
    expect(game.ladderCleared).toBe(true);
    expect(records.has('ladder_clear')).toBe(true);
    const overs = game.events.filter((e) => e.type === 'gameOver');
    expect(overs).toHaveLength(1);
    expect(overs[0].winner).toBe('player');
  });

  it('starting from the game-over screen restarts the ladder at stage 1', () => {
    const game = new Game(makeSettings());
    game.start();
    winPoint(game);
    expect(game.ladderStage).toBe(1);
    game.state = 'GAME_OVER';
    game.start();
    expect(game.ladderStage).toBe(0);
    expect(game.boss.id).toBe('shrinker');
    expect(game.ladderCleared).toBe(false);
  });

  it('single-boss mode keeps picking one random boss (no ladder)', () => {
    const game = new Game(makeSettings({ gameMode: 'boss' }));
    game.start();
    expect(game.encounter).toBeNull();
    expect(game.ladderStage).toBe(0);
  });
});
