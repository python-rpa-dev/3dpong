const STORAGE_KEY = 'pong3d_records';

export const ACHIEVEMENTS = [
  { id: 'first_win', label: 'FIRST WIN', hint: 'win a match vs the AI' },
  { id: 'rally20', label: '20-RALLY', hint: 'reach a 20-hit rally' },
  { id: 'perfect_game', label: 'PERFECT GAME', hint: 'win without letting the AI score' },
  { id: 'comeback', label: 'COMEBACK KING', hint: 'win after trailing by 5+ points' },
  { id: 'shrink_triple', label: 'SHRINK TRIPLE', hint: 'shrink the AI paddle 3x in one match' },
  { id: 'grazer_3', label: 'NET GRAZER x3', hint: 'graze the net 3 times in one match' },
];

const DEFAULTS = {
  bestRally: 0,
  bestStreak: 0,
  wins: 0,
  losses: 0,
  achievements: {},
  dailies: {},
  loadout: {},
};

export class Records {
  constructor() {
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULTS, ...parsed, achievements: { ...(parsed.achievements || {}) }, dailies: { ...(parsed.dailies || {}) }, loadout: { ...(parsed.loadout || {}) } };
      } else {
        this.data = { ...DEFAULTS, achievements: {}, dailies: {}, loadout: {} };
      }
    } catch (e) {
      this.data = { ...DEFAULTS, achievements: {}, dailies: {}, loadout: {} };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      // localStorage not available
    }
  }

  noteRally(combo) {
    if (combo > this.data.bestRally) {
      this.data.bestRally = combo;
      this.save();
      return true;
    }
    return false;
  }

  noteStreak(streak) {
    if (streak > this.data.bestStreak) {
      this.data.bestStreak = streak;
      this.save();
      return true;
    }
    return false;
  }

  noteResult(playerWon) {
    if (playerWon) this.data.wins++;
    else this.data.losses++;
    this.save();
  }

  /** Record a daily-challenge result under its date seed (e.g. 20260830). */
  noteDaily(seed, { won, margin, rally }) {
    const day = this.data.dailies[seed] || { plays: 0, wins: 0, bestMargin: null, bestRally: 0 };
    day.plays++;
    if (won) day.wins++;
    if (day.bestMargin === null || margin > day.bestMargin) day.bestMargin = margin;
    if (rally > day.bestRally) day.bestRally = rally;
    this.data.dailies[seed] = day;
    this.save();
  }

  daily(seed) {
    return this.data.dailies[seed] || null;
  }

  has(id) {
    return !!this.data.achievements[id];
  }

  unlock(id) {
    if (this.data.achievements[id]) return false;
    this.data.achievements[id] = Date.now();
    this.save();
    return true;
  }

  achievementCount() {
    return Object.keys(this.data.achievements).length;
  }

  reset() {
    this.data = { ...DEFAULTS, achievements: {}, dailies: {}, loadout: {} };
    this.save();
  }

  /** Banked cross-match multiplier for a powerup type (1 = none carried). */
  loadoutMult(type) {
    return this.data.loadout[type] || 1;
  }

  setLoadoutMult(type, mult) {
    const next = Math.max(1, mult || 1);
    if (this.data.loadout[type] === next) return false;
    this.data.loadout[type] = next;
    this.save();
    return true;
  }
}
