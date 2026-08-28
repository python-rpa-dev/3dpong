const STORAGE_KEY = 'pong3d_records';

const DEFAULTS = {
  bestRally: 0,
  bestStreak: 0,
  wins: 0,
  losses: 0,
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
        this.data = { ...DEFAULTS, ...parsed };
      }
    } catch (e) {
      this.data = { ...DEFAULTS };
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

  reset() {
    this.data = { ...DEFAULTS };
    this.save();
  }
}
