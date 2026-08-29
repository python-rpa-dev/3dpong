import { Paddle } from './Paddle.js';
import { CONFIG } from '../config.js';

export class AIPaddle extends Paddle {
  constructor(difficulty = 'medium', personality = null) {
    super(CONFIG.paddle.opponentZ);
    this.difficulty = difficulty;
    const aiConfig = CONFIG.ai[difficulty];
    this.reactionDelay = aiConfig.reactionDelay;
    this.maxSpeed = aiConfig.maxSpeed;
    this.errorFactor = aiConfig.error;
    this.personality = personality || { errorScale: 1, delayScale: 1 };
    this.targetX = 0;
    this.lastUpdate = 0;
    this.time = 0;
    this.rng = Math.random;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    const aiConfig = CONFIG.ai[difficulty];
    this.reactionDelay = aiConfig.reactionDelay;
    this.maxSpeed = aiConfig.maxSpeed;
    this.errorFactor = aiConfig.error;
  }

  update(dt, ball, rallyCombo = 0, hidden = false) {
    this.time += dt;

    // Rally combo makes the AI worse: bigger errors, slower reaction
    const comboScale = 1 + Math.min(rallyCombo * 0.12, 1.5);
    const effectiveDelay = this.reactionDelay * comboScale * this.personality.delayScale;
    const effectiveError = this.errorFactor * comboScale * this.personality.errorScale;

    if (this.time >= this.lastUpdate + effectiveDelay) {
      this.lastUpdate = this.time;

      if (!hidden && ball.active && ball.vz > 0) {
        // Ball moving toward AI — predict where it will be
        if (Math.abs(ball.vz) < 0.01) {
          this.targetX = 0;
        } else {
          const timeToReach = (this.z - ball.z) / ball.vz;
          let predictedX = ball.x + ball.vx * timeToReach;

          // Bounce prediction off walls (max 10 iterations as safety)
          const halfWidth = CONFIG.court.width / 2;
          let bounces = 0;
          while (Math.abs(predictedX) > halfWidth && bounces < 10) {
            if (predictedX > halfWidth) {
              predictedX = 2 * halfWidth - predictedX;
            } else {
              predictedX = -2 * halfWidth - predictedX;
            }
            bounces++;
          }
          if (Math.abs(predictedX) > halfWidth) {
            predictedX = Math.max(-halfWidth, Math.min(halfWidth, predictedX));
          }

          // Add error (grows with combo)
          const error = (this.rng() - 0.5) * 2 * effectiveError * halfWidth;

          // Panic chance on long rallies: AI moves wrong direction
          const panicChance = Math.min(rallyCombo * 0.03, 0.25);
          if (this.rng() < panicChance) {
            this.targetX = -predictedX + error * 2;
          } else {
            this.targetX = predictedX + error;
          }
        }
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
