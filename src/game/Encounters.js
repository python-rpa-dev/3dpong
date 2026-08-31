import { BOSSES } from './Boss.js';

/**
 * Authored encounters: a boss plus the rules of the match it owns. The ladder
 * plays these in order; story mode can reuse the same shape with more stages.
 */
export const LADDER = [
  { id: 'shrinker', difficulty: 'easy', speedFactor: 1 },
  { id: 'freezer', difficulty: 'medium', speedFactor: 1.15 },
  { id: 'metronome', difficulty: 'hard', speedFactor: 1.3 },
];

export function ladderStage(index) {
  return LADDER[Math.max(0, Math.min(LADDER.length - 1, index))];
}

export function bossFor(encounter) {
  return BOSSES.find((b) => b.id === encounter.id) || null;
}
