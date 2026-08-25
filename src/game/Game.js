import { Ball } from './Ball.js';
import { PlayerPaddle } from './PlayerPaddle.js';
import { AIPaddle } from './AIPaddle.js';
import { Score } from './Score.js';
import { Court } from './Court.js';
import { CONFIG } from '../config.js';

const STATES = {
  READY: 'READY',
  SERVE: 'SERVE',
  PLAYING: 'PLAYING',
  SCORED: 'SCORED',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED',
  MENU: 'MENU',
};

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.ball = new Ball();
    this.playerPaddle = new PlayerPaddle();
    this.aiPaddle = new AIPaddle(settings.get('difficulty'));
    this.score = new Score(settings.get('winScore'));
    this.court = new Court();
    this.state = STATES.READY;
    this.serveTimer = 0;
    this.scoreTimer = 0;
    this.serveDirection = 1;
    this.events = [];
    this.rallyCombo = 0;
    this.maxRallyCombo = 0;
    this._gameOverSoundPlayed = false;
  }

  isFunMode() {
    return this.settings.get('gameMode') === 'fun';
  }

  start() {
    this.score.reset();
    this.ball.active = false;
    this.rallyCombo = 0;
    this.maxRallyCombo = 0;
    this.serveDirection = Math.random() > 0.5 ? 1 : -1;
    this.state = STATES.SERVE;
    this.serveTimer = CONFIG.serve.delay;
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
            this.ball.reset(this.serveDirection);
            this.rallyCombo = 0;
            this.state = STATES.SERVE;
            this.serveTimer = CONFIG.serve.delay;
          }
        }
        break;
    }
  }

  handleCollisions() {
    const fun = this.isFunMode();

    // Wall bounces
    if (this.court.checkWallBounce(this.ball)) {
      this.events.push({ type: 'wallBounce', x: this.ball.x, z: this.ball.z });
    }

    // Player paddle bounce
    const playerHit = this.court.checkPaddleBounce(this.ball, this.playerPaddle, fun);
    if (playerHit) {
      if (!fun) this.ball.increaseSpeed();
      this.rallyCombo++;
      this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'player', offset: playerHit.offset, combo: this.rallyCombo });
    }

    // AI paddle bounce
    const aiHit = this.court.checkPaddleBounce(this.ball, this.aiPaddle, fun);
    if (aiHit) {
      if (!fun) this.ball.increaseSpeed();
      this.rallyCombo++;
      this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'ai', offset: aiHit.offset, combo: this.rallyCombo });
    }

    // Score
    const scorer = this.court.checkScore(this.ball);
    if (scorer) {
      this.score.addPoint(scorer);
      this.state = STATES.SCORED;
      this.scoreTimer = CONFIG.serve.scoreDelay;
      this.serveDirection = scorer === 'player' ? 1 : -1;
      this.events.push({ type: 'score', who: scorer, x: this.ball.x, z: this.ball.z, combo: this.rallyCombo });
    }
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
