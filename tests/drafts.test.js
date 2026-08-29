import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';

function makeSettings(overrides = {}) {
  const data = {
    difficulty: 'easy',
    winScore: 11,
    deuce: false,
    gameMode: 'fun',
    playerMode: 'ai',
    powerups: true,
    drafts: true,
    multiBall: false,
    paddleShifts: false,
    aiTaunts: false,
    netGraze: false,
    ...overrides,
  };
  return { get: (k) => data[k], set: (k, v) => { data[k] = v; }, save() {} };
}

describe('powerup drafts', () => {
  it('offers a pick of two distinct types on every-N rally', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.rallyCombo = CONFIG.drafts.every;
    game.maybeOfferDraft();
    expect(game.state).toBe('DRAFT');
    const evt = game.events.find((e) => e.type === 'draft');
    expect(evt.options).toHaveLength(2);
    expect(evt.options[0]).not.toBe(evt.options[1]);
    for (const t of evt.options) expect(CONFIG.powerups.types).toContain(t);
  });

  it('does not offer mid-rally counts or when disabled', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.rallyCombo = CONFIG.drafts.every - 1;
    game.maybeOfferDraft();
    expect(game.state).toBe('PLAYING');

    const off = new Game(makeSettings({ drafts: false }));
    off.start();
    off.state = 'PLAYING';
    off.rallyCombo = CONFIG.drafts.every;
    off.maybeOfferDraft();
    expect(off.state).toBe('PLAYING');
  });

  it('chooseDraft stocks the pick and resumes play', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.rallyCombo = CONFIG.drafts.every;
    game.maybeOfferDraft();
    const options = game.events.find((e) => e.type === 'draft').options;
    game.chooseDraft(options[1]);
    expect(game.stockedPowerup).toBe(options[1]);
    expect(game.state).toBe('PLAYING');
  });

  it('skipping or an invalid choice stocks nothing', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.rallyCombo = CONFIG.drafts.every;
    game.maybeOfferDraft();
    game.chooseDraft(null);
    expect(game.stockedPowerup).toBeNull();
    expect(game.state).toBe('PLAYING');

    game.rallyCombo = CONFIG.drafts.every * 2;
    game.maybeOfferDraft();
    game.chooseDraft('bogus');
    expect(game.stockedPowerup).toBeNull();
    expect(game.state).toBe('PLAYING');
  });

  it('a tracked rally triggers a real draft offer at combo 5', () => {
    const game = new Game(makeSettings());
    game.start();
    let t = 0;
    let draftAtCombo = null;
    while (t < 60 && draftAtCombo === null) {
      if (game.state === 'DRAFT') {
        draftAtCombo = game.rallyCombo;
        break;
      }
      if (game.state === 'PLAYING' && game.ball.active) {
        game.playerPaddle.setWorldTarget(game.ball.x); // mouse tracking the ball
      }
      game.update(1 / 60);
      t += 1 / 60;
    }
    expect(draftAtCombo).toBe(CONFIG.drafts.every);
    const evt = game.events.find((e) => e.type === 'draft');
    expect(evt.options).toHaveLength(2);
  });
});
