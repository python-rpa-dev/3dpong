const STORAGE_KEY = 'pong3d_records';

export const ACHIEVEMENTS = [
  { id: 'first_win', label: 'FIRST WIN' },
  { id: 'rally20', label: '20-RALLY' },
  { id: 'perfect_game', label: 'PERFECT GAME' },
  { id: 'comeback', label: 'COMEBACK KING' },
  { id: 'shrink_triple', label: 'SHRINK TRIPLE' },
  { id: 'grazer_3', label: 'NET GRAZER x3' },
];

const DEFAULTS = {
  bestRally: 0,
  bestStreak: 0,
  wins: 0,
  losses: 0,
  achievements: {},
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
        this.data = { ...DEFAULTS, ...parsed, achievements: { ...(parsed.achievements || {}) } };
      } else {
        this.data = { ...DEFAULTS, achievements: {} };
      }
    } catch (e) {
      this.data = { ...DEFAULTS, achievements: {} };
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
    this.data = { ...DEFAULTS, achievements: {} };
    this.save();
  }
}
