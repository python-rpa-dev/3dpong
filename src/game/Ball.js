import { CONFIG } from '../config.js';

export class Ball {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.prevX = 0;
    this.prevZ = 0;
    this.vx = 0;
    this.vz = 0;
    this.speed = CONFIG.ball.initialSpeed;
    this.baseSpeed = CONFIG.ball.initialSpeed;
    this.radius = CONFIG.ball.radius;
    this.active = false;
    this.rallyHits = 0;
    this.speedMultiplier = 1;
  }

  reset(direction, aimX = null, rng = Math.random) {
    this.x = 0;
    this.z = 0;
    this.prevX = 0;
    this.prevZ = 0;
    this.speed = this.baseSpeed;
    this.speedMultiplier = 1;
    this.rallyHits = 0;
    const angle = aimX === null
      ? (rng() - 0.5) * 0.4
      : Math.max(-1, Math.min(1, aimX)) * CONFIG.serve.maxAimAngle;
    this.vx = Math.sin(angle) * this.speed;
    this.vz = Math.cos(angle) * this.speed * direction;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.prevX = this.x;
    this.prevZ = this.z;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
  }

  /** True on the frame the ball crosses the net line (z = 0). */
  crossedNet() {
    return this.active && this.prevZ !== 0 && this.z !== 0 && Math.sign(this.z) !== Math.sign(this.prevZ);
  }

  /**
   * Handle paddle collision with spin and optional speed ramp.
   * @param {number} paddleX - paddle center x
   * @param {number} paddleWidth - paddle width
   * @param {boolean} funMode - enable spin + speed ramp
   * @returns {{offset: number, angle: number}} hit info
   */
  hitPaddle(paddleX, paddleWidth, funMode = false) {
    const offset = (this.x - paddleX) / (paddleWidth / 2);
    const clampedOffset = Math.max(-1, Math.min(1, offset));

    if (funMode) {
      // Speed ramp: ball accelerates each hit
      this.rallyHits++;
      this.speedMultiplier = Math.min(
        1 + this.rallyHits * CONFIG.fun.speedRampPerHit,
        CONFIG.fun.maxSpeedMultiplier
      );
      this.speed = this.baseSpeed * this.speedMultiplier;

      // Spin: sharper angles at edges
      const angle = clampedOffset * (0.5 + Math.abs(clampedOffset) * CONFIG.fun.spinFactor);

      const dir = this.vz > 0 ? -1 : 1;
      this.vx = Math.sin(angle) * this.speed;
      this.vz = Math.cos(angle) * this.speed * dir;

      return { offset: clampedOffset, angle };
    } else {
      // Classic: simple fixed-angle bounce
      const angle = clampedOffset * 0.5;
      const dir = this.vz > 0 ? -1 : 1;
      this.vx = Math.sin(angle) * this.speed;
      this.vz = Math.cos(angle) * this.speed * dir;

      return { offset: clampedOffset, angle };
    }
  }

  increaseSpeed() {
    this.speed = Math.min(this.speed * (1 + CONFIG.ball.speedIncrement), CONFIG.ball.maxSpeed);
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    if (currentSpeed > 0) {
      const scale = this.speed / currentSpeed;
      this.vx *= scale;
      this.vz *= scale;
    }
  }

  /**
   * Catch mode assist: slow the ball after an AI hit so beginners can rally longer.
   */
  applyCatchAssist(factor) {
    this.speed = Math.max(this.baseSpeed, this.speed * factor);
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    if (currentSpeed > 0) {
      const scale = this.speed / currentSpeed;
      this.vx *= scale;
      this.vz *= scale;
    }
  }

  get currentSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vz * this.vz);
  }
}
