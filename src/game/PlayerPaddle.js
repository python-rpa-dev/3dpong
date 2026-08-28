import { Paddle } from './Paddle.js';
import { CONFIG } from '../config.js';

export class PlayerPaddle extends Paddle {
  constructor() {
    super(CONFIG.paddle.playerZ);
    this.targetX = null;
    this.keys = { left: false, right: false };
    this.moveSpeed = CONFIG.paddle.moveSpeed;
  }

  /**
   * @param {number} worldX - target x in court coordinates (already unprojected)
   */
  setWorldTarget(worldX) {
    this.targetX = worldX;
  }

  setKey(key, pressed) {
    if (key === 'left') {
      this.keys.left = pressed;
      if (pressed) this.targetX = null;
    }
    if (key === 'right') {
      this.keys.right = pressed;
      if (pressed) this.targetX = null;
    }
  }

  update(dt) {
    if (this.targetX !== null) {
      const diff = this.targetX - this.x;
      this.x += diff * Math.min(1, dt * 15);
    } else {
      if (this.keys.left) this.x += this.moveSpeed * dt;
      if (this.keys.right) this.x -= this.moveSpeed * dt;
    }
    this.clampToCourt();
  }
}
