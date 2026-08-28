import { Ball } from './Ball.js';
import { PlayerPaddle } from './PlayerPaddle.js';
import { AIPaddle } from './AIPaddle.js';
import { Score } from './Score.js';
import { Court } from './Court.js';
import { PowerupManager } from './Powerups.js';
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
    this.powerups = new PowerupManager();
    this.state = STATES.MENU;
    this.serveTimer = 0;
    this.scoreTimer = 0;
    this.serveDirection = 1;
    this.events = [];
    this.rallyCombo = 0;
    this.maxRallyCombo = 0;
    this.lastHitter = null;
    this.timeScale = 1;
    this.activeEffects = [];
    this.doublePoints = { player: 0, ai: 0 };
    this._gameOverSoundPlayed = false;
  }

  isFunMode() {
    return this.settings.get('gameMode') === 'fun';
  }

  powerupsEnabled() {
    return this.isFunMode() && this.settings.get('powerups');
  }

  start() {
    this.score.reset();
    this.ball.active = false;
    this.rallyCombo = 0;
    this.maxRallyCombo = 0;
    this.lastHitter = null;
    this.timeScale = 1;
    this.activeEffects = [];
    this.doublePoints = { player: 0, ai: 0 };
    this.powerups.reset();
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
    this.timeScale = 1;
    this.activeEffects = [];
    this.doublePoints = { player: 0, ai: 0 };
    this.powerups.reset();
    this.applyModifiers();
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

      case STATES.PLAYING: {
        const gdt = dt * this.timeScale;
        this.playerPaddle.update(gdt);
        this.aiPaddle.update(gdt, this.ball, this.rallyCombo);
        this.ball.update(gdt);
        this.handleCollisions();

        if (this.powerupsEnabled()) {
          const collected = this.powerups.update(gdt, this.ball, this.lastHitter);
          for (const pu of collected) {
            this.applyPowerup(pu.type, pu.target);
          }
        }

        this.tickEffects(gdt);
        break;
      }

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
      this.lastHitter = 'player';
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'player', offset: playerHit.offset, combo: this.rallyCombo });
    }

    // AI paddle bounce
    const aiHit = this.court.checkPaddleBounce(this.ball, this.aiPaddle, fun);
    if (aiHit) {
      if (!fun) this.ball.increaseSpeed();
      this.rallyCombo++;
      this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
      this.lastHitter = 'ai';
      this.events.push({ type: 'paddleHit', x: this.ball.x, z: this.ball.z, who: 'ai', offset: aiHit.offset, combo: this.rallyCombo });
    }

    // Score
    const scorer = this.court.checkScore(this.ball);
    if (scorer) {
      const points = this.doublePoints[scorer] > 0 ? 2 : 1;
      if (this.doublePoints[scorer] > 0) {
        this.doublePoints[scorer]--;
        if (this.doublePoints[scorer] === 0) {
          this.activeEffects = this.activeEffects.filter(e => !(e.type === 'double' && e.target === scorer));
        }
      }
      this.score.addPoint(scorer, points);
      this.state = STATES.SCORED;
      this.scoreTimer = CONFIG.serve.scoreDelay;
      this.serveDirection = scorer === 'player' ? 1 : -1;
      this.events.push({ type: 'score', who: scorer, x: this.ball.x, z: this.ball.z, combo: this.rallyCombo, points });
    }
  }

  applyPowerup(type, target) {
    const cfg = CONFIG.powerups;
    const opponent = target === 'player' ? 'ai' : 'player';

    if (type === 'slowmo') {
      this.activeEffects.push({ type, target: 'global', timeLeft: cfg.durationSlowmo });
    } else if (type === 'double') {
      this.doublePoints[target] = Math.max(this.doublePoints[target], cfg.doublePointsGoals);
      this.activeEffects.push({ type, target, goalsLeft: cfg.doublePointsGoals });
    } else {
      // wide benefits the collector; shrink hits the opponent
      const affected = type === 'wide' ? target : opponent;
      const duration = type === 'wide' ? cfg.durationWide : cfg.durationShrink;
      // Replace any existing effect of this pair on the same paddle
      this.activeEffects = this.activeEffects.filter(
        e => !(e.target === affected && (e.type === 'wide' || e.type === 'shrink'))
      );
      this.activeEffects.push({ type, target: affected, timeLeft: duration });
    }

    this.events.push({ type: 'powerup', puType: type, target });
    this.applyModifiers();
  }

  tickEffects(dt) {
    if (this.activeEffects.length === 0) return;
    let changed = false;
    for (const e of this.activeEffects) {
      if (e.timeLeft !== undefined) {
        e.timeLeft -= dt;
        if (e.timeLeft <= 0) changed = true;
      }
    }
    if (changed) {
      this.activeEffects = this.activeEffects.filter(e => e.timeLeft === undefined || e.timeLeft > 0);
      for (const e of this.activeEffects) {
        if (e.type === 'double' && this.doublePoints[e.target] === 0) {
          // goals exhausted, drop marker
          e.expired = true;
        }
      }
      this.activeEffects = this.activeEffects.filter(e => !e.expired);
      this.applyModifiers();
    }
  }

  applyModifiers() {
    const cfg = CONFIG.powerups;
    let widePlayer = false, wideAi = false, shrinkPlayer = false, shrinkAi = false, slowmo = false;
    for (const e of this.activeEffects) {
      if (e.type === 'wide') { if (e.target === 'player') widePlayer = true; else wideAi = true; }
      if (e.type === 'shrink') { if (e.target === 'player') shrinkPlayer = true; else shrinkAi = true; }
      if (e.type === 'slowmo') slowmo = true;
    }
    const scaleFor = (shrunk, widened) =>
      shrunk ? cfg.shrinkScale : (widened ? cfg.wideScale : 1);
    this.playerPaddle.width = this.playerPaddle.baseWidth * scaleFor(shrinkPlayer, widePlayer);
    this.aiPaddle.width = this.aiPaddle.baseWidth * scaleFor(shrinkAi, wideAi);
    this.timeScale = slowmo ? cfg.slowmoScale : 1;
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
