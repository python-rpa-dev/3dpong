import { CONFIG } from '../config.js';

export class Paddle {
  constructor(z) {
    this.x = 0;
    this.z = z;
    this.baseWidth = CONFIG.paddle.width;
    this.width = CONFIG.paddle.width;
    this.depth = CONFIG.paddle.depth;
    this.height = CONFIG.paddle.height;
  }

  update(dt) {
    this.clampToCourt();
  }

  clampToCourt() {
    const halfWidth = CONFIG.court.width / 2 - this.width / 2;
    this.x = Math.max(-halfWidth, Math.min(halfWidth, this.x));
  }
}
