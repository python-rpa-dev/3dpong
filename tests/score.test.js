import { describe, it, expect } from 'vitest';
import { Score } from '../src/game/Score.js';

describe('Score', () => {
  it('initializes with zero scores', () => {
    const score = new Score();
    expect(score.playerScore).toBe(0);
    expect(score.opponentScore).toBe(0);
    expect(score.checkWin()).toBeNull();
  });

  it('addPoint increments correct side', () => {
    const score = new Score();
    score.addPoint('player');
    expect(score.playerScore).toBe(1);
    expect(score.opponentScore).toBe(0);

    score.addPoint('opponent');
    expect(score.playerScore).toBe(1);
    expect(score.opponentScore).toBe(1);
  });

  it('checkWin detects win at default win score (11)', () => {
    const score = new Score();
    for (let i = 0; i < 10; i++) score.addPoint('player');
    expect(score.checkWin()).toBeNull();
    score.addPoint('player');
    expect(score.checkWin()).toBe('player');
  });

  it('checkWin with custom win score', () => {
    const score = new Score(5, true);
    for (let i = 0; i < 5; i++) score.addPoint('opponent');
    expect(score.checkWin()).toBe('opponent');
  });

  it('deuce requires win by 2 (player)', () => {
    const score = new Score(5, true);
    for (let i = 0; i < 4; i++) {
      score.addPoint('player');
      score.addPoint('opponent');
    }
    // 4-4: isDeuce
    expect(score.isDeuce()).toBe(true);
    // 5-4: no win
    score.addPoint('player');
    expect(score.checkWin()).toBeNull();
    // 6-4: win
    score.addPoint('player');
    expect(score.checkWin()).toBe('player');
  });

  it('deuce requires win by 2 (opponent)', () => {
    const score = new Score(5, true);
    for (let i = 0; i < 4; i++) {
      score.addPoint('player');
      score.addPoint('opponent');
    }
    // 4-5: no win
    score.addPoint('opponent');
    expect(score.checkWin()).toBeNull();
    // 4-6: win
    score.addPoint('opponent');
    expect(score.checkWin()).toBe('opponent');
  });

  it('no deuce: first to win score wins', () => {
    const score = new Score(5, false);
    for (let i = 0; i < 4; i++) {
      score.addPoint('player');
      score.addPoint('opponent');
    }
    // 5-4: immediate win
    score.addPoint('player');
    expect(score.checkWin()).toBe('player');
    expect(score.isDeuce()).toBe(false);
  });

  it('reset clears scores', () => {
    const score = new Score(5);
    for (let i = 0; i < 5; i++) score.addPoint('player');
    expect(score.checkWin()).toBe('player');

    score.reset();
    expect(score.playerScore).toBe(0);
    expect(score.opponentScore).toBe(0);
    expect(score.checkWin()).toBeNull();
  });

  it('display returns formatted string', () => {
    const score = new Score();
    score.addPoint('player');
    score.addPoint('player');
    score.addPoint('opponent');
    expect(score.display).toBe('2 : 1');
  });
});
