const STORAGE_KEY = 'pong3d_settings';

const DEFAULTS = {
  difficulty: 'medium',
  winScore: 11,
  deuce: true,
  gameMode: 'fun',
  playerMode: 'ai',
  powerups: true,
  multiBall: true,
  paddleShifts: true,
  aiTaunts: true,
  netGraze: true,
  bloom: true,
  catchMode: false,
  music: true,
  gamepad: true,
  dailyChallenge: false,
  viewYaw: 0,
  viewTilt: 0,
  viewZoom: 0,
  sideSwap: false,
  steerAxis: 'horizontal',
};

export class Settings {
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

  get(key) {
    return this.data[key] !== undefined ? this.data[key] : DEFAULTS[key];
  }

  set(key, value) {
    this.data[key] = value;
  }
}
