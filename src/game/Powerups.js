import { CONFIG } from '../config.js';

export class PowerupManager {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.active = [];
    this.timer = this._nextDelay();
  }

  _nextDelay() {
    const { spawnMinDelay, spawnMaxDelay } = CONFIG.powerups;
    return spawnMinDelay + this.rng() * (spawnMaxDelay - spawnMinDelay);
  }

  /**
   * Tick spawn timer and test pickup overlap.
   * @param {number} dt - scaled timestep
   * @param {object} ball - ball with x, z, radius, active
   * @param {string|null} lastHitter - 'player' | 'ai' | null
   * @returns {Array<{type: string, target: string}>} collected powerups
   */
  update(dt, ball, lastHitter) {
    const collected = [];

    if (ball.active) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const pu = this.active[i];
        const dist = Math.hypot(ball.x - pu.x, ball.z - pu.z);
        if (dist < CONFIG.powerups.pickupRadius + ball.radius) {
          const target = lastHitter || (ball.vz > 0 ? 'player' : 'ai');
          collected.push({ type: pu.type, target });
          this.active.splice(i, 1);
        }
      }
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.active.length < CONFIG.powerups.maxActive) {
        this.active.push(this._spawn());
      }
      this.timer = this._nextDelay();
    }

    return collected;
  }

  _spawn() {
    const types = CONFIG.powerups.types;
    const hw = CONFIG.court.width / 2 - 1.5;
    return {
      x: (this.rng() * 2 - 1) * hw,
      z: (this.rng() * 2 - 1) * CONFIG.powerups.zoneHalfDepth,
      type: types[Math.floor(this.rng() * types.length)],
    };
  }
}
