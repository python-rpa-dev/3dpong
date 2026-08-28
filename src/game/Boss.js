import { CONFIG } from '../config.js';

export const BOSSES = [
  { id: 'shrinker', label: 'THE SHRINKER', intro: 'SHRINKS YOUR PADDLE EVERY 6 HITS' },
  { id: 'freezer', label: 'THE FREEZER', intro: 'FREEZES YOUR PADDLE MID-RALLY' },
  { id: 'metronome', label: 'THE METRONOME', intro: 'BALL ACCELERATES FAST OFF YOUR PADDLE' },
];

export function pickBoss() {
  return BOSSES[Math.floor(Math.random() * BOSSES.length)];
}

export const BOSS_TUNING = {
  shrinkerHits: 6,
  shrinkScale: 0.75,
  shrinkDuration: 4,
  freezerInterval: 8,
  freezeDuration: 0.8,
};
