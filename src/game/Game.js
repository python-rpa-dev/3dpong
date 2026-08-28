import { Ball } from './Ball.js';
import { PlayerPaddle } from './PlayerPaddle.js';
import { AIPaddle } from './AIPaddle.js';
import { Score } from './Score.js';
import { Court } from './Court.js';
import { PowerupManager } from './Powerups.js';
import { pickPersonality } from './AIPersonality.js';
import { pickBoss, BOSS_TUNING } from './Boss.js';
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
  constructor(settings, records = null) {
    this.settings = settings;
    this.records = records;
    this.balls = [new Ball()];
    this.playerPaddle = new PlayerPaddle();
    this.personality = settings.get('playerMode') === 'versus' ? null : pickPersonality();
    this.aiPaddle = settings.get('playerMode') === 'versus'
      ? new PlayerPaddle(CONFIG.paddle.opponentZ)
      : new AIPaddle(settings.get('difficulty'), this.personality);
    this.score = new Score(settings.get('winScore'), settings.get('deuce'));
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
    this.hitStopTimer = 0;
    this.serveAimX = 0;
    this._tauntedImpressed = false;
    this.pointStreak = 0;
    this._lastScorer = null;
    this._gameOverSoundPlayed = false;
    this._grazes = 0;
    this._shrinks = 0;
    this._minMargin = 0;
    this.boss = null;
    this._bossTimer = 0;
  }

  isFunMode() {
    return this.settings.get('gameMode') === 'fun';
  }

  isVersus() {
    return this.settings.get('playerMode') === 'versus';
  }

  opponentPaddle() {
    return this.aiPaddle;
  }

  /**
   * Effective serve aim for the upcoming serve: P1's mouse when the ball
   * heads toward the AI side, P2's paddle position in versus otherwise.
   */
  currentServeAim() {
    const halfWidth = CONFIG.court.width / 2;
    if (this.isVersus() && this.serveDirection === -1) {
      return Math.max(-1, Math.min(1, this.aiPaddle.x / halfWidth));
    }
    return this.serveAimX;
  }

  get ball() {
    return this.balls[0];
  }

  threatBall() {
    let best = this.balls[0];
    for (const b of this.balls) {
      if (b.active && b.vz > 0 && b.z > best.z) best = b;
    }
    return best;
  }

  multiBallEnabled() {
    return this.isFunMode() && this.settings.get('multiBall');
  }

  /**
   * Aim the next serve from a world-space x position (court center = 0).
   */
  setServeAimWorld(worldX) {
    const halfWidth = CONFIG.court.width / 2;
    this.serveAimX = Math.max(-1, Math.min(1, worldX / halfWidth));
  }

  spawnExtraBall(awayFrom) {
    const dir = awayFrom === 'player' ? 1 : -1;
    const extra = new Ball();
    extra.reset(dir);
    const f = CONFIG.fun.extraBallSpeedFactor;
    extra.vx *= f;
    extra.vz *= f;
    this.balls.push(extra);
    this.events.push({ type: 'multiBallSpawn', x: 0, z: 0, target: awayFrom === 'player' ? 'ai' : 'player' });
  }

  powerupsEnabled() {
    return this.isFunMode() && this.settings.get('powerups');
  }

  tauntsEnabled() {
    return !this.isVersus() && this.isFunMode() && !!this.personality && this.settings.get('aiTaunts');
  }

  netGrazeEnabled() {
    return this.isFunMode() && this.settings.get('netGraze');
  }

  emitTaunt(list) {
    const text = list[Math.floor(Math.random() * list.length)];
    this.events.push({ type: 'taunt', text });
  }

  recordRally() {
    if (this.records && this.records.noteRally(this.rallyCombo)) {
      this.events.push({ type: 'record', kind: 'rally', value: this.rallyCombo });
    }
    if (this.achievementsEnabled() && this.rallyCombo >= 20) {
      this.tryUnlock('rally20');
    }
  }

  achievementsEnabled() {
    return !!this.records && !this.isVersus();
  }

  tryUnlock(id) {
    if (this.records.unlock(id)) {
      this.events.push({ type: 'achievement', id });
    }
  }

  noteOpponentShrink(affected, scale) {
    if (!this.achievementsEnabled() || affected !== 'ai' || !(scale < 1)) return;
    this._shrinks++;
    if (this._shrinks >= 3) this.tryUnlock('shrink_triple');
  }

  /** Boss special rules, ticked every frame during PLAYING. */
  tickBoss(dt) {
    if (!this.boss) return;
    if (this.boss.id === 'freezer') {
      this._bossTimer += dt;
      if (this._bossTimer >= BOSS_TUNING.freezerInterval) {
        this._bossTimer = 0;
        this.activeEffects = this.activeEffects.filter(e => !(e.type === 'freeze' && e.target === 'player'));
        this.activeEffects.push({ type: 'freeze', target: 'player', timeLeft: BOSS_TUNING.freezeDuration });
        this.applyModifiers();
        this.events.push({ type: 'boss', bossId: 'freezer', effect: 'freeze', label: this.boss.label });
      }
    }
  }

  bossShrinkPlayer() {
    this.activeEffects = this.activeEffects.filter(e => !(e.type === 'shrink' && e.target === 'player'));
    this.activeEffects.push({ type: 'shrink', target: 'player', scale: BOSS_TUNING.shrinkScale, timeLeft: BOSS_TUNING.shrinkDuration });
    this.applyModifiers();
    this.events.push({ type: 'boss', bossId: 'shrinker', effect: 'shrink', label: this.boss.label });
  }

  start() {
    const versus = this.isVersus();
    if (versus) {
      this.personality = null;
      if (!(this.aiPaddle instanceof PlayerPaddle)) {
        this.aiPaddle = new PlayerPaddle(CONFIG.paddle.opponentZ);
      }
    } else {
      this.personality = pickPersonality();
      if (this.aiPaddle instanceof AIPaddle) {
        this.aiPaddle.personality = this.personality;
      } else {
        this.aiPaddle = new AIPaddle(this.settings.get('difficulty'), this.personality);
      }
    }
    this._tauntedImpressed = false;
    this.pointStreak = 0;
    this._lastScorer = null;
    this._grazes = 0;
    this._shrinks = 0;
    this._minMargin = 0;
    this.boss = this.settings.get('gameMode') === 'boss' ? pickBoss() : null;
    this._bossTimer = 0;
    this.score.winScore = this.settings.get('winScore');
    this.score.deuce = this.settings.get('deuce');
    this.score.reset();
    this.balls = [new Ball()];
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
    if (this.boss) {
      this.events.push({ type: 'boss', bossId: this.boss.id, effect: 'intro', label: this.boss.label });
    }
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
    for (const ball of this.balls) ball.active = false;
    this.balls.length = 1;
    this.timeScale = 1;
    this.activeEffects = [];
    this.doublePoints = { player: 0, ai: 0 };
    this.powerups.reset();
    this.applyModifiers();
  }

  update(dt) {
    // Hit-stop: brief simulation freeze so impacts register (visuals keep animating)
    if (this.hitStopTimer > 0 && (this.state === STATES.PLAYING || this.state === STATES.SCORED)) {
      this.hitStopTimer -= dt;
      return;
    }

    switch (this.state) {
      case STATES.SERVE:
        this.serveTimer -= dt;
        if (this.serveTimer <= 0) {
          this.ball.reset(this.serveDirection, this.currentServeAim());
          this.state = STATES.PLAYING;
        }
        break;

      case STATES.PLAYING: {
        const gdt = dt * this.timeScale;
        this.tickBoss(gdt);
        if (!this.playerPaddle.frozen) this.playerPaddle.update(gdt);
        const threat = this.threatBall();
        if (!this.aiPaddle.frozen) this.aiPaddle.update(gdt, threat, this.rallyCombo, this.isBallHidden(threat));
        for (const ball of this.balls) ball.update(gdt);
        this.handleCollisions();

        if (this.powerupsEnabled()) {
          this.powerups.update(gdt);
          for (const ball of this.balls) {
            const collected = this.powerups.checkPickups(ball, this.lastHitter);
            for (const pu of collected) {
              this.applyPowerup(pu.type, pu.target);
            }
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
            if (this.records) this.records.noteResult(winner === 'player');
            if (winner === 'player' && this.achievementsEnabled()) {
              this.tryUnlock('first_win');
              if (this.score.opponentScore === 0) this.tryUnlock('perfect_game');
              if (this._minMargin <= -5) this.tryUnlock('comeback');
            }
          } else {
            this.balls.length = 1;
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

    for (const ball of this.balls) {
      if (!ball.active) continue;

      // Wall bounces
      if (this.court.checkWallBounce(ball)) {
        this.events.push({ type: 'wallBounce', x: ball.x, z: ball.z });
      }

      // Net graze: rare lucky/unlucky deflection when crossing the net line
      if (this.netGrazeEnabled() && ball.crossedNet()
          && Math.random() < CONFIG.fun.netGrazeChance) {
        const nudge = 1 + (Math.random() - 0.5) * 2 * CONFIG.fun.netGrazeNudge;
        ball.vx *= nudge;
        this._grazes++;
        if (this.achievementsEnabled() && this._grazes >= 3) this.tryUnlock('grazer_3');
        this.events.push({ type: 'netGrazed', x: ball.x, z: 0 });
      }

      // Player paddle bounce
      const playerHit = this.court.checkPaddleBounce(ball, this.playerPaddle, fun);
      if (playerHit) {
        if (!fun) ball.increaseSpeed();
        if (this.boss && this.boss.id === 'metronome') ball.increaseSpeed();
        this.rallyCombo++;
        this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
        this.lastHitter = 'player';
        this.applyPaddleShift('player', playerHit.offset);
        this.recordRally();
        this.hitStopTimer = CONFIG.hitStop.paddle + Math.min(this.rallyCombo * 0.001, CONFIG.hitStop.maxComboScale);
        if (this.boss && this.boss.id === 'shrinker' && this.rallyCombo % BOSS_TUNING.shrinkerHits === 0) {
          this.bossShrinkPlayer();
        }
        this.events.push({ type: 'paddleHit', x: ball.x, z: ball.z, who: 'player', offset: playerHit.offset, combo: this.rallyCombo });
      }

      // AI paddle bounce
      const aiHit = this.court.checkPaddleBounce(ball, this.aiPaddle, fun);
      if (aiHit) {
        if (!fun) ball.increaseSpeed();
        if (this.settings.get('catchMode')) ball.applyCatchAssist(CONFIG.fun.catchSpeedFactor);
        this.rallyCombo++;
        this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
        this.lastHitter = 'ai';
        this.applyPaddleShift('ai', aiHit.offset);
        this.recordRally();
        this.hitStopTimer = CONFIG.hitStop.paddle + Math.min(this.rallyCombo * 0.001, CONFIG.hitStop.maxComboScale);
        this.events.push({ type: 'paddleHit', x: ball.x, z: ball.z, who: 'ai', offset: aiHit.offset, combo: this.rallyCombo });
      }

      // Multi-ball trigger: spawn a second ball at the combo threshold (once per rally)
      if (this.multiBallEnabled() && this.balls.length === 1 && this.rallyCombo >= CONFIG.fun.multiBallCombo) {
        this.spawnExtraBall(this.lastHitter);
      }

      // AI impressed taunt at long rallies (once per rally)
      if (this.tauntsEnabled() && !this._tauntedImpressed && this.rallyCombo >= CONFIG.fun.tauntImpressedCombo) {
        this._tauntedImpressed = true;
        this.emitTaunt(this.personality.impressed);
      }

      // Score
      const scorer = this.court.checkScore(ball);
      if (scorer) {
        const side = scorer === 'opponent' ? 'ai' : scorer;
        const points = this.doublePoints[side] > 0 ? 2 : 1;
        if (this.doublePoints[side] > 0) {
          this.doublePoints[side]--;
          if (this.doublePoints[side] === 0) {
            this.activeEffects = this.activeEffects.filter(e => !(e.type === 'double' && e.target === side));
          }
        }
        this.score.addPoint(side, points);
        this._minMargin = Math.min(this._minMargin, this.score.playerScore - this.score.opponentScore);
        this.state = STATES.SCORED;
        this.hitStopTimer = CONFIG.hitStop.score;
        this.scoreTimer = CONFIG.serve.scoreDelay;
        this.serveDirection = side === 'player' ? 1 : -1;
        if (this.tauntsEnabled()) {
          this.emitTaunt(side === 'ai' ? this.personality.win : this.personality.lose);
        }
        this._tauntedImpressed = false;
        this.pointStreak = side === this._lastScorer ? this.pointStreak + 1 : 1;
        this._lastScorer = side;
        if (side === 'player' && this.records && this.records.noteStreak(this.pointStreak)) {
          this.events.push({ type: 'record', kind: 'streak', value: this.pointStreak });
        }
        this.events.push({ type: 'score', who: side, x: ball.x, z: ball.z, combo: this.rallyCombo, points });
        break; // rally over
      }
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
    } else if (type === 'ghost') {
      this.activeEffects = this.activeEffects.filter(e => e.type !== 'ghost');
      this.activeEffects.push({ type, target: 'global', timeLeft: cfg.durationGhost });
    } else if (type === 'freeze') {
      // Freezes the opponent's paddle briefly
      const affected = opponent;
      this.activeEffects = this.activeEffects.filter(e => !(e.type === 'freeze' && e.target === affected));
      this.activeEffects.push({ type, target: affected, timeLeft: cfg.durationFreeze });
    } else {
      // wide benefits the collector; shrink hits the opponent
      const affected = type === 'wide' ? target : opponent;
      const duration = type === 'wide' ? cfg.durationWide : cfg.durationShrink;
      const scale = type === 'wide' ? cfg.wideScale : cfg.shrinkScale;
      // Replace any existing effect of this pair on the same paddle
      this.activeEffects = this.activeEffects.filter(
        e => !(e.target === affected && (e.type === 'wide' || e.type === 'shrink'))
      );
      this.activeEffects.push({ type, target: affected, scale, timeLeft: duration });
      if (type === 'shrink') this.noteOpponentShrink(affected, scale);
    }

    this.events.push({ type: 'powerup', puType: type, target });
    this.applyModifiers();
  }

  shiftsEnabled() {
    return this.isFunMode() && this.settings.get('paddleShifts');
  }

  /**
   * Paddle shifts: edge hits shrink the opponent's paddle, center hits grow it.
   * @param {string} hitter - 'player' | 'ai'
   * @param {number} offset - hit offset -1..1 (|offset| near 1 = edge)
   */
  applyPaddleShift(hitter, offset) {
    if (!this.shiftsEnabled()) return;
    const cfg = CONFIG.paddleShifts;
    const abs = Math.abs(offset);
    let scale = null;
    if (abs >= cfg.edgeThreshold) scale = cfg.shrinkScale;
    else if (abs <= cfg.centerThreshold) scale = cfg.growScale;
    if (scale === null) return;

    const affected = hitter === 'player' ? 'ai' : 'player';
    // One shift per paddle at a time; freshest wins
    this.activeEffects = this.activeEffects.filter(e => !(e.type === 'shift' && e.target === affected));
    this.activeEffects.push({ type: 'shift', target: affected, scale, timeLeft: cfg.duration });
    this.noteOpponentShrink(affected, scale);
    this.events.push({
      type: 'paddleShift',
      affected,
      mode: scale < 1 ? 'shrink' : 'grow',
    });
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
    let slowmo = false;
    let playerMult = 1;
    let aiMult = 1;
    let playerFrozen = false;
    let aiFrozen = false;
    for (const e of this.activeEffects) {
      if (e.type === 'slowmo') { slowmo = true; continue; }
      if (e.type === 'freeze') {
        if (e.target === 'player') playerFrozen = true;
        else if (e.target === 'ai') aiFrozen = true;
        continue;
      }
      if (e.scale !== undefined) {
        if (e.target === 'player') playerMult *= e.scale;
        else if (e.target === 'ai') aiMult *= e.scale;
      }
    }
    // Clamp so stacked effects never produce absurd paddles
    const clamp = (m) => Math.max(0.5, Math.min(2, m));
    this.playerPaddle.width = this.playerPaddle.baseWidth * clamp(playerMult);
    this.aiPaddle.width = this.aiPaddle.baseWidth * clamp(aiMult);
    this.playerPaddle.frozen = playerFrozen;
    this.aiPaddle.frozen = aiFrozen;
    this.timeScale = slowmo ? cfg.slowmoScale : 1;
  }

  /** True while a ghost powerup hides balls heading toward the AI on its half. */
  isBallHidden(ball) {
    const ghost = this.activeEffects.some(e => e.type === 'ghost');
    return ghost && ball.active && ball.vz > 0 && ball.z > 0;
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
