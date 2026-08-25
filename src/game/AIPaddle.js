import { Paddle } from './Paddle.js';
import { CONFIG } from '../config.js';

export class AIPaddle extends Paddle {
  constructor(difficulty = 'medium') {
    super(CONFIG.paddle.opponentZ);
    this.difficulty = difficulty;
    const aiConfig = CONFIG.ai[difficulty];
    this.reactionDelay = aiConfig.reactionDelay;
    this.maxSpeed = aiConfig.maxSpeed;
    this.errorFactor = aiConfig.error;
    this.targetX = 0;
    this.lastUpdate = 0;
    this.time = 0;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    const aiConfig = CONFIG.ai[difficulty];
    this.reactionDelay = aiConfig.reactionDelay;
    this.maxSpeed = aiConfig.maxSpeed;
    this.errorFactor = aiConfig.error;
  }

  update(dt, ball) {
    this.time += dt;

    if (this.time >= this.lastUpdate + this.reactionDelay) {
      this.lastUpdate = this.time;

      if (ball.active && ball.vz > 0) {
        // Ball moving toward AI — predict where it will be
        const timeToReach = (this.z - ball.z) / ball.vz;
        let predictedX = ball.x + ball.vx * timeToReach;

        // Bounce prediction off walls
        const halfWidth = CONFIG.court.width / 2;
        while (Math.abs(predictedX) > halfWidth) {
          if (predictedX > halfWidth) {
            predictedX = 2 * halfWidth - predictedX;
          } else {
            predictedX = -2 * halfWidth - predictedX;
          }
        }

        // Add error
        const error = (Math.random() - 0.5) * 2 * this.errorFactor * halfWidth;
        this.targetX = predictedX + error;
      } else {
        // Ball moving away — drift to center
        this.targetX = 0;
      }
    }

    const diff = this.targetX - this.x;
    const maxMove = this.maxSpeed * dt;
    if (Math.abs(diff) > maxMove) {
      this.x += Math.sign(diff) * maxMove;
    } else {
      this.x = this.targetX;
    }
    this.clampToCourt();
  }
}
