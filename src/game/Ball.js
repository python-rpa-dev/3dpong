import { CONFIG } from '../config.js';

export class Ball {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.speed = CONFIG.ball.initialSpeed;
    this.radius = CONFIG.ball.radius;
    this.active = false;
  }

  reset(direction) {
    this.x = 0;
    this.z = 0;
    this.speed = CONFIG.ball.initialSpeed;
    const angle = (Math.random() - 0.5) * 0.4;
    this.vx = Math.sin(angle) * this.speed;
    this.vz = Math.cos(angle) * this.speed * direction;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
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

  get currentSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vz * this.vz);
  }
}
