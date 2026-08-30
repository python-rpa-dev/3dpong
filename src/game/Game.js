import { Ball } from './Ball.js';
import { PlayerPaddle } from './PlayerPaddle.js';
import { AIPaddle } from './AIPaddle.js';
import { Score } from './Score.js';
import { Court } from './Court.js';
import { PowerupManager } from './Powerups.js';
import { pickPersonality } from './AIPersonality.js';
import { pickBoss, BOSS_TUNING } from './Boss.js';
import { mulberry32, dailySeed } from './rng.js';
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
    this.resetPointBoost();
    this._peakDoubleMult = 1;
    this.hitStopTimer = 0;
    this.serveAimX = 0;
    this._tauntedImpressed = false;
    this.pointStreak = 0;
    this._lastScorer = null;
    this._grazes = 0;
    this._shrinks = 0;
    this._minMargin = 0;
    this.boss = null;
    this._bossTimer = 0;
    this.rng = Math.random;
    this.stockedPowerup = null;
    this._pendingDraft = null;
    this._draftTimer = 0;
  }

  isFunMode() {
    return this.settings.get('gameMode') === 'fun';
  }

  isBossMode() {
    return this.settings.get('gameMode') === 'boss';
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
    extra.reset(dir, null, this.rng);
    const f = CONFIG.fun.extraBallSpeedFactor;
    extra.vx *= f;
    extra.vz *= f;
    this.balls.push(extra);
    this.events.push({ type: 'multiBallSpawn', x: 0, z: 0, target: awayFrom === 'player' ? 'ai' : 'player' });
  }

  powerupsEnabled() {
    return this.isFunMode() && this.settings.get('powerups');
  }

  /** Cross-match carry; never in versus or dailies (daily scores must stay comparable). */
  loadoutEnabled() {
    return this.powerupsEnabled() && !!this.records && !this.isVersus() && !this.settings.get('dailyChallenge');
  }

  /** Next point wins; achievement-gated, and off in dailies so seeds stay comparable. */
  suddenDeathEnabled() {
    return this.settings.get('suddenDeath') && !!this.records && this.records.has('double_stack')
      && !this.settings.get('dailyChallenge');
  }

  /** Restore the banked double-points multiplier into a fresh match. */
  seedLoadout() {
    this._peakDoubleMult = 1;
    if (!this.loadoutEnabled()) return;
    const mult = Math.min(Math.max(1, this.records.loadoutMult('double')), CONFIG.powerups.doubleMaxMult);
    if (mult <= 1) return;
    const goalsLeft = CONFIG.powerups.loadoutGoals;
    this.doublePoints.player = { mult, goalsLeft };
    this.activeEffects.push({ type: 'double', target: 'player', goalsLeft, mult });
    this._peakDoubleMult = mult;
  }

  draftsEnabled() {
    return this.powerupsEnabled() && this.settings.get('drafts');
  }

  /** Offer a pick-of-two powerup draft every Nth rally hit; play continues. */
  maybeOfferDraft() {
    if (!this.draftsEnabled() || this._pendingDraft) return;
    if (this.rallyCombo % CONFIG.drafts.every !== 0) return;
    const types = [...CONFIG.powerups.types];
    const a = Math.floor(this.rng() * types.length);
    let b = Math.floor(this.rng() * (types.length - 1));
    if (b >= a) b++;
    this._pendingDraft = [types[a], types[b]];
    this._draftTimer = CONFIG.drafts.timeout;
    this.events.push({ type: 'draft', options: this._pendingDraft, timeout: CONFIG.drafts.timeout });
  }

  draftPending() {
    return !!this._pendingDraft;
  }

  draftRemaining() {
    return Math.max(0, this._draftTimer);
  }

  /** Resolve the draft with a powerup type or null to skip. */
  chooseDraft(type) {
    if (!this._pendingDraft) return;
    const choice = type && this._pendingDraft.includes(type) ? type : null;
    this.finishDraft(choice, false);
  }

  /** Timeout fallback: random pick among the two options plus a skip. */
  resolveDraftAuto() {
    if (!this._pendingDraft) return;
    const idx = Math.floor(this.rng() * (this._pendingDraft.length + 1));
    const choice = idx < this._pendingDraft.length ? this._pendingDraft[idx] : null;
    this.finishDraft(choice, true);
  }

  finishDraft(choice, auto) {
    if (choice) this.stockedPowerup = choice;
    this._pendingDraft = null;
    this._draftTimer = 0;
    this.events.push({ type: 'draftResolved', choice, auto });
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
    this.rng = this.settings.get('dailyChallenge') ? mulberry32(dailySeed()) : Math.random;
    this.powerups.rng = this.rng;
    if (this.aiPaddle.rng) this.aiPaddle.rng = this.rng;
    const suddenDeath = this.suddenDeathEnabled();
    this.score.winScore = suddenDeath ? 1 : this.settings.get('winScore');
    this.score.deuce = suddenDeath ? false : this.settings.get('deuce');
    this.score.reset();
    this.balls = [new Ball()];
    this.rallyCombo = 0;
    this.maxRallyCombo = 0;
    this.lastHitter = null;
    this.timeScale = 1;
    this.activeEffects = [];
    this.resetPointBoost();
    this.powerups.reset();
    this.stockedPowerup = null;
    this._pendingDraft = null;
    this._draftTimer = 0;
    this.seedLoadout();
    this.serveDirection = this.rng() > 0.5 ? 1 : -1;
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
    this.resetPointBoost();
    this.powerups.reset();
    this.stockedPowerup = null;
    this._pendingDraft = null;
    this._draftTimer = 0;
    this.applyModifiers();
  }

  update(dt) {
    // Hit-stop: brief simulation freeze so impacts register (visuals keep animating)
    if (this.hitStopTimer > 0 && (this.state === STATES.PLAYING || this.state === STATES.SCORED)) {
      this.hitStopTimer -= dt;
      return;
    }

    // Draft countdown runs during live play only; timeout auto-picks (incl. skip)
    if (this._pendingDraft && (this.state === STATES.PLAYING || this.state === STATES.SERVE || this.state === STATES.SCORED)) {
      this._draftTimer -= dt;
      if (this._draftTimer <= 0) this.resolveDraftAuto();
    }

    switch (this.state) {
      case STATES.SERVE:
        this.serveTimer -= dt;
        if (this.serveTimer <= 0) {
          this.ball.reset(this.serveDirection, this.currentServeAim(), this.rng);
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
            if (this.loadoutEnabled()) {
              const banked = Math.max(this.records.loadoutMult('double'), this._peakDoubleMult);
              this.records.setLoadoutMult('double', banked);
            }
            if (this.records && this.settings.get('dailyChallenge')) {
              this.records.noteDaily(dailySeed(), {
                won: winner === 'player',
                margin: this.score.playerScore - this.score.opponentScore,
                rally: this.maxRallyCombo,
              });
            }
            if (winner === 'player' && this.achievementsEnabled()) {
              this.tryUnlock('first_win');
              if (this.score.opponentScore === 0) this.tryUnlock('perfect_game');
              if (this._minMargin <= -5) this.tryUnlock('comeback');
            }
            this.events.push({ type: 'gameOver', winner });
          } else {
            this.balls.length = 1;
            this.ball.reset(this.serveDirection, null, this.rng);
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
          && this.rng() < CONFIG.fun.netGrazeChance) {
        const nudge = 1 + (this.rng() - 0.5) * 2 * CONFIG.fun.netGrazeNudge;
        ball.vx *= nudge;
        this._grazes++;
        if (this.achievementsEnabled() && this._grazes >= 3) this.tryUnlock('grazer_3');
        this.events.push({ type: 'netGrazed', x: ball.x, z: 0 });
      }

      // Player paddle bounce
      const playerHit = this.court.checkPaddleBounce(ball, this.playerPaddle, fun);
      if (playerHit) {
        if (this.boss && this.boss.id === 'metronome') ball.increaseSpeed();
        this.registerPaddleHit('player', ball, playerHit.offset, fun);
        if (this.boss && this.boss.id === 'shrinker' && this.rallyCombo % BOSS_TUNING.shrinkerHits === 0) {
          this.bossShrinkPlayer();
        }
        if (this.stockedPowerup) {
          const stocked = this.stockedPowerup;
          this.stockedPowerup = null;
          this.applyPowerup(stocked, 'player');
        } else {
          this.maybeOfferDraft();
        }
      }

      // AI paddle bounce
      const aiHit = this.court.checkPaddleBounce(ball, this.aiPaddle, fun);
      if (aiHit) {
        this.registerPaddleHit('ai', ball, aiHit.offset, fun);
        if (this.settings.get('catchMode')) ball.applyCatchAssist(CONFIG.fun.catchSpeedFactor);
        this.maybeOfferDraft();
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
        this.endRally(ball, scorer);
        break; // rally over
      }
    }
  }

  /** Shared bookkeeping for a paddle return on either side. */
  registerPaddleHit(side, ball, offset, fun) {
    if (!fun) ball.increaseSpeed();
    this.rallyCombo++;
    this.maxRallyCombo = Math.max(this.maxRallyCombo, this.rallyCombo);
    this.lastHitter = side;
    this.applyPaddleShift(side, offset);
    this.recordRally();
    this.hitStopTimer = CONFIG.hitStop.paddle + Math.min(this.rallyCombo * 0.001, CONFIG.hitStop.maxComboScale);
    this.events.push({ type: 'paddleHit', x: ball.x, z: ball.z, who: side, offset, combo: this.rallyCombo });
  }

  /** A ball left the court: apply points, streaks, taunts and state change. */
  endRally(ball, scorer) {
    const side = scorer === 'opponent' ? 'ai' : scorer;
    const boost = this.doublePoints[side];
    const points = boost.goalsLeft > 0 ? boost.mult : 1;
    if (boost.goalsLeft > 0) {
      boost.goalsLeft--;
      if (boost.goalsLeft === 0) {
        boost.mult = 1;
        this.activeEffects = this.activeEffects.filter(e => !(e.type === 'double' && e.target === side));
      } else {
        const marker = this.activeEffects.find(e => e.type === 'double' && e.target === side);
        if (marker) marker.goalsLeft = boost.goalsLeft;
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
  }

  applyPowerup(type, target) {
    const cfg = CONFIG.powerups;
    const opponent = target === 'player' ? 'ai' : 'player';

    if (type === 'slowmo') {
      this.activeEffects.push({ type, target: 'global', timeLeft: cfg.durationSlowmo });
    } else if (type === 'double') {
      // Stacks multiplicatively (x2 -> x4 -> x8); goals refresh, multiplier persists
      const boost = this.doublePoints[target];
      boost.mult = Math.min(boost.mult * 2, cfg.doubleMaxMult);
      boost.goalsLeft = Math.max(boost.goalsLeft, cfg.doublePointsGoals);
      if (target === 'player') {
        this._peakDoubleMult = Math.max(this._peakDoubleMult, boost.mult);
        if (boost.mult >= cfg.doubleMaxMult && this.achievementsEnabled()) this.tryUnlock('double_stack');
      }
      // One marker per side so the HUD reflects the current stack
      this.activeEffects = this.activeEffects.filter(e => !(e.type === 'double' && e.target === target));
      this.activeEffects.push({ type, target, goalsLeft: boost.goalsLeft, mult: boost.mult });
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

    const evt = { type: 'powerup', puType: type, target };
    if (type === 'double') evt.mult = this.doublePoints[target].mult;
    this.events.push(evt);
    this.applyModifiers();
  }

  /** Per-side point multiplier granted by `double` powerups. */
  resetPointBoost() {
    const empty = () => ({ mult: 1, goalsLeft: 0 });
    this.doublePoints = { player: empty(), ai: empty() };
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
        if (e.type === 'double' && this.doublePoints[e.target].goalsLeft === 0) {
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
