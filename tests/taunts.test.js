import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/Game.js';
import { PERSONALITIES } from '../src/game/AIPersonality.js';
import { CONFIG } from '../src/config.js';
import { makeSettings as baseSettings, toPlaying } from './helpers.js';

const makeSettings = (overrides = {}) => baseSettings({ gameMode: 'fun', aiTaunts: true, ...overrides });

describe('AI taunts', () => {
  it('AI brags when it scores (fun mode + aiTaunts)', () => {
    const game = new Game(makeSettings());
    game.start();
    game.personality = PERSONALITIES.chill;
    toPlaying(game);
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius; // court edge, away from paddle
    game.ball.z = -(CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1); // past player's goal line
    game.update(1 / 60);
    const events = game.drainEvents();
    const taunt = events.find(e => e.type === 'taunt');
    expect(taunt).toBeDefined();
    expect(PERSONALITIES.chill.win).toContain(taunt.text);
  });

  it('AI sulks when the player scores', () => {
    const game = new Game(makeSettings());
    game.start();
    game.personality = PERSONALITIES.confident;
    toPlaying(game);
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
    game.ball.z = CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1; // past AI's goal line
    game.update(1 / 60);
    const events = game.drainEvents();
    const taunt = events.find(e => e.type === 'taunt');
    expect(taunt).toBeDefined();
    expect(PERSONALITIES.confident.lose).toContain(taunt.text);
  });

  it('no taunts in versus mode', () => {
    const game = new Game(makeSettings({ playerMode: 'versus' }));
    game.start();
    toPlaying(game);
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
    game.ball.z = -(CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1);
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'taunt')).toBe(false);
  });

  it('no taunts when aiTaunts is off', () => {
    const game = new Game(makeSettings({ aiTaunts: false }));
    game.start();
    toPlaying(game);
    game.ball.x = CONFIG.court.width / 2 - game.ball.radius;
    game.ball.z = -(CONFIG.court.depth / 2 + CONFIG.ball.radius * 2 + 1);
    game.update(1 / 60);
    const events = game.drainEvents();
    expect(events.some(e => e.type === 'taunt')).toBe(false);
  });

  it('personality picks a valid entry', () => {
    const game = new Game(makeSettings());
    expect(Object.values(PERSONALITIES)).toContain(game.personality);
  });
});
