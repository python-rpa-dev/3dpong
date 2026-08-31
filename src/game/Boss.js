import { CONFIG } from '../config.js';

export const BOSSES = [
  { id: 'shrinker', label: 'THE SHRINKER', intro: 'SHRINKS YOUR PADDLE EVERY 6 HITS' },
  { id: 'freezer', label: 'THE FREEZER', intro: 'FREEZES YOUR PADDLE MID-RALLY' },
  { id: 'metronome', label: 'THE METRONOME', intro: 'BALL ACCELERATES FAST OFF YOUR PADDLE' },
];

export function pickBoss(rng = Math.random) {
  return BOSSES[Math.floor(rng() * BOSSES.length)];
}

export const BOSS_TUNING = {
  shrinkerHits: 6,
  shrinkScale: 0.75,
  shrinkDuration: 4,
  freezerInterval: 8,
  freezeDuration: 0.8,
};

/**
 * Per-boss rule hooks invoked by Game during a rally. Rules decide policy;
 * effects stay inside Game via its own helpers (bossShrinkPlayer, bossFreeze).
 *
 * - beforePlayerHit(game, ball): just before the return is registered
 * - afterPlayerHit(game): just after the return is registered
 * - interval + onInterval(game): fires every `interval` seconds of play
 */
export const BOSS_RULES = {
  metronome: {
    beforePlayerHit(game, ball) {
      ball.increaseSpeed();
    },
  },
  shrinker: {
    afterPlayerHit(game) {
      if (game.rallyCombo % BOSS_TUNING.shrinkerHits === 0) game.bossShrinkPlayer();
    },
  },
  freezer: {
    interval: BOSS_TUNING.freezerInterval,
    onInterval(game) {
      game.bossFreeze(BOSS_TUNING.freezeDuration);
    },
  },
};

export function bossRules(boss) {
  return (boss && BOSS_RULES[boss.id]) || null;
}
