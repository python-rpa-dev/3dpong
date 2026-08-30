import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', powerups: true, drafts: true, ...overrides });

function offerDraft(game) {
  game.start();
  game.state = 'PLAYING';
  game.rallyCombo = CONFIG.drafts.every;
  game.maybeOfferDraft();
  return game.events.find((e) => e.type === 'draft');
}

describe('powerup drafts', () => {
  it('offers a pick of two distinct types without pausing play', () => {
    const game = new Game(makeSettings());
    const evt = offerDraft(game);
    expect(game.state).toBe('PLAYING');
    expect(game.draftPending()).toBe(true);
    expect(evt.options).toHaveLength(2);
    expect(evt.options[0]).not.toBe(evt.options[1]);
    expect(evt.timeout).toBe(CONFIG.drafts.timeout);
    for (const t of evt.options) expect(CONFIG.powerups.types).toContain(t);
  });

  it('does not offer mid-rally counts or when disabled', () => {
    const game = new Game(makeSettings());
    game.start();
    game.state = 'PLAYING';
    game.rallyCombo = CONFIG.drafts.every - 1;
    game.maybeOfferDraft();
    expect(game.draftPending()).toBe(false);

    const off = new Game(makeSettings({ drafts: false }));
    off.start();
    off.state = 'PLAYING';
    off.rallyCombo = CONFIG.drafts.every;
    off.maybeOfferDraft();
    expect(off.draftPending()).toBe(false);
  });

  it('chooseDraft stocks the pick and clears the pending draft', () => {
    const game = new Game(makeSettings());
    const evt = offerDraft(game);
    game.chooseDraft(evt.options[1]);
    expect(game.stockedPowerup).toBe(evt.options[1]);
    expect(game.draftPending()).toBe(false);
    expect(game.state).toBe('PLAYING');
    const done = game.events.find((e) => e.type === 'draftResolved');
    expect(done.choice).toBe(evt.options[1]);
    expect(done.auto).toBe(false);
  });

  it('skipping or an invalid choice stocks nothing', () => {
    const game = new Game(makeSettings());
    offerDraft(game);
    game.chooseDraft(null);
    expect(game.stockedPowerup).toBeNull();
    expect(game.draftPending()).toBe(false);

    game.rallyCombo = CONFIG.drafts.every * 2;
    game.maybeOfferDraft();
    game.chooseDraft('bogus');
    expect(game.stockedPowerup).toBeNull();
  });

  it('auto-resolves with a random pick (including skip) after the timeout', () => {
    const game = new Game(makeSettings());
    const evt = offerDraft(game);
    game._draftTimer = 0.01;
    game.update(0.02);
    expect(game.draftPending()).toBe(false);
    const done = game.events.find((e) => e.type === 'draftResolved');
    expect(done.auto).toBe(true);
    expect([null, ...evt.options]).toContain(done.choice);
  });

  it('auto-resolve picks option A at rng 0 and skips near rng 1', () => {
    const a = new Game(makeSettings());
    const evtA = offerDraft(a);
    a.rng = () => 0;
    a.resolveDraftAuto();
    expect(a.stockedPowerup).toBe(evtA.options[0]);

    const b = new Game(makeSettings());
    offerDraft(b);
    b.rng = () => 0.999999;
    b.resolveDraftAuto();
    expect(b.stockedPowerup).toBeNull();
  });

  it('timer does not tick while paused', () => {
    const game = new Game(makeSettings());
    offerDraft(game);
    game.state = 'PAUSED';
    for (let i = 0; i < 100; i++) game.update(0.1);
    expect(game.draftPending()).toBe(true);
    expect(game.draftRemaining()).toBe(CONFIG.drafts.timeout);
  });

  it('a tracked rally triggers a real draft offer at combo 5', () => {
    const game = new Game(makeSettings());
    game.start();
    let t = 0;
    let draftAtCombo = null;
    while (t < 60 && draftAtCombo === null) {
      if (game.draftPending()) {
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
