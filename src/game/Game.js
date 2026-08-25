import { CONFIG } from '../config.js';
import { Ball } from './Ball.js';
import { PlayerPaddle } from './PlayerPaddle.js';
import { AIPaddle } from './AIPaddle.js';
import { Court } from './Court.js';
import { Score } from './Score.js';

const STATES = {
  MENU: 'MENU',
  SERVE: 'SERVE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  SCORED: 'SCORED',
  GAME_OVER: 'GAME_OVER',
};

export class Game {
  constructor(settings) {
    this.state = STATES.MENU;
    this.ball = new Ball();
    this.playerPaddle = new PlayerPaddle();
    this.aiPaddle = new AIPaddle();
    this.court = new Court();
    this.winScore = parseInt(settings.get('winScore', '11'));
    this.deuce = settings.get('deuce', 'true') === 'true';
    this.score = new Score(this.winScore, this.deuce);
    this.aiDifficulty = settings.get('difficulty', 'medium');
    this.aiPaddle.setDifficulty(this.aiDifficulty);

    this.serveTimer = 0;
    this.scoreTimer = 0;
    this.serveDirection = 1;
    this.scoreEvent = null;
    this.events = [];
  }

  start() {
    this.score.reset();
    this.state = STATES.SERVE;
    this.serveTimer = CONFIG.serve.delay;
    this.serveDirection = Math.random() > 0.5 ? 1 : -1;
    this.events.length = 0;
  }

  pause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
    }
  }

  resume() {
    if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
    }
  }

  quitToMenu() {
    this.state = STATES.MENU;
    this.ball.active = false;
  }

  update(dt) {
    switch (this.state) {
      case STATES.SERVE:
        this.serveTimer -= dt;
        if (this.serveTimer <= 0) {
          this.ball.reset(this.serveDirection);
          this.state = STATES.PLAYING;
        }
        break;

      case STATES.PLAYING:
        this.playerPaddle.update(dt);
        this.aiPaddle.update(dt, this.ball);
        this.ball.update(dt);
        this.handleCollisions();
        break;

      case STATES.SCORED:
        this.scoreTimer -= dt;
        if (this.scoreTimer <= 0) {
          const winner = this.score.checkWin();
          if (winner) {
            this.state = STATES.GAME_OVER;
            this.winner = winner;
          } else {
            this.state = STATES.SERVE;
            this.serveTimer = CONFIG.serve.scoreDelay;
          }
        }
        break;
    }
  }

  handleCollisions() {
    // Wall bounces
    if (this.court.checkWallBounce(this.ball)) {
      this.events.push({ type: 'wallBounce', x: this.ball.x, z: this.ball.z });
    }

    // Player paddle bounce
    if (this.court.checkPaddleBounce(this.ball, this.playerPaddle)) {
      this.ball.increaseSpeed();
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'player' });
    }

    // AI paddle bounce
    if (this.court.checkPaddleBounce(this.ball, this.aiPaddle)) {
      this.ball.increaseSpeed();
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'ai' });
    }

    // Score
    const scorer = this.court.checkScore(this.ball);
    if (scorer) {
      this.score.addPoint(scorer);
      this.state = STATES.SCORED;
      this.scoreTimer = CONFIG.serve.scoreDelay;
      this.serveDirection = scorer === 'player' ? 1 : -1;
      this.events.push({ type: 'score', who: scorer, x: this.ball.x, z: this.ball.z });
    }
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
