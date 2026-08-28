import { CONFIG } from '../config.js';

export class Court {
  constructor() {
    this.halfWidth = CONFIG.court.width / 2;
    this.halfDepth = CONFIG.court.depth / 2;
  }

  checkWallBounce(ball) {
    if (!ball.active) return false;
    const r = ball.radius;
    if (ball.x - r < -this.halfWidth) {
      ball.x = -this.halfWidth + r;
      ball.vx = Math.abs(ball.vx);
      return true;
    }
    if (ball.x + r > this.halfWidth) {
      ball.x = this.halfWidth - r;
      ball.vx = -Math.abs(ball.vx);
      return true;
    }
    return false;
  }

  checkPaddleBounce(ball, paddle, funMode = false) {
    if (!ball.active) return false;

    const pz = paddle.z;
    const pd = paddle.depth / 2;
    const pw = paddle.width / 2;

    // Ball approaching paddle from the correct side
    const ballApproaching = (pz > 0 && ball.vz > 0) || (pz < 0 && ball.vz < 0);
    if (!ballApproaching) return false;

    // Z overlap
    const zNear = pz - pd;
    const zFar = pz + pd;
    if (pz > 0) {
      if (ball.z + ball.radius < zNear) return false;
    } else {
      if (ball.z - ball.radius > zFar) return false;
    }

    // X overlap
    if (Math.abs(ball.x - paddle.x) > pw + ball.radius) return false;

    // Bounce
    const offset = (ball.x - paddle.x) / pw;
    const clampedOffset = Math.max(-1, Math.min(1, offset));

    if (funMode) {
      ball.hitPaddle(paddle.x, paddle.width, true);
    } else {
      const angle = clampedOffset * CONFIG.paddle.maxBounceAngle;
      ball.vx = Math.sin(angle) * ball.speed;
      ball.vz = Math.cos(angle) * ball.speed * (pz > 0 ? -1 : 1);
    }

    // Push ball out of paddle
    if (pz > 0) {
      ball.z = zNear - ball.radius;
    } else {
      ball.z = zFar + ball.radius;
    }

    return { hit: true, offset: clampedOffset };
  }

  checkScore(ball) {
    if (!ball.active) return null;
    const margin = ball.radius * 2;
    if (ball.z < -this.halfDepth - margin) {
      ball.active = false;
      return 'opponent';
    }
    if (ball.z > this.halfDepth + margin) {
      ball.active = false;
      return 'player';
    }
    return null;
  }
}
