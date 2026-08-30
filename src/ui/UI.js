import { CONFIG } from '../config.js';
import { ACHIEVEMENTS } from '../settings/Records.js';
import { remapSteerKey, applySwap } from '../input/steerKeys.js';
import { POWERUP_INFO } from '../game/Powerups.js';

export class UI {
  constructor(game, settings) {
    this.game = game;
    this.settings = settings;
    this.prevState = null;
    this.showingSettings = false;
    this._screenToWorld = null;

    this.playerScoreEl = document.getElementById('player-score');
    this.opponentScoreEl = document.getElementById('opponent-score');
    this.scoreDisplay = document.getElementById('score-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.comboCountEl = document.getElementById('combo-count');
    this.menuScreen = document.getElementById('menu-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.settingsScreen = document.getElementById('settings-screen');
    this.gameoverText = document.getElementById('gameover-text');
    this.finalScoreEl = document.getElementById('final-score');
    this.powerupToastEl = document.getElementById('powerup-toast');

    // Load settings into selects
    document.getElementById('setting-difficulty').value = settings.get('difficulty');
    document.getElementById('setting-winscore').value = String(settings.get('winScore'));
    document.getElementById('setting-deuce').value = String(settings.get('deuce'));
    document.getElementById('setting-gamemode').value = settings.get('gameMode');
    document.getElementById('setting-playermode').value = settings.get('playerMode');
    document.getElementById('setting-powerups').checked = settings.get('powerups');
    document.getElementById('setting-drafts').checked = settings.get('drafts');
    document.getElementById('setting-multiball').checked = settings.get('multiBall');
    document.getElementById('setting-paddleshifts').checked = settings.get('paddleShifts');
    document.getElementById('setting-aitaunts').checked = settings.get('aiTaunts');
    document.getElementById('setting-netgraze').checked = settings.get('netGraze');
    document.getElementById('setting-bloom').checked = settings.get('bloom');
    document.getElementById('setting-catchmode').checked = settings.get('catchMode');
    document.getElementById('setting-music').checked = settings.get('music');
    document.getElementById('setting-gamepad').checked = settings.get('gamepad');
    document.getElementById('setting-daily').checked = settings.get('dailyChallenge');

    // View angle controls (in-viewport)
    this.viewYawEl = document.getElementById('view-yaw');
    this.viewTiltEl = document.getElementById('view-tilt');
    this.viewZoomEl = document.getElementById('view-zoom');
    this.swapSidesBtn = document.getElementById('btn-swap-sides');
    this.steerAxisBtn = document.getElementById('btn-steer-axis');
    this.updateSteerButton();
    this.steerAxisBtn.addEventListener('click', () => {
      const next = this.settings.get('steerAxis') === 'vertical' ? 'horizontal' : 'vertical';
      this.settings.set('steerAxis', next);
      this.settings.save();
      this.updateSteerButton();
    });
    this.viewYawEl.value = String(settings.get('viewYaw'));
    this.viewTiltEl.value = String(Math.round(settings.get('viewTilt') * 100));
    this.viewZoomEl.value = String(Math.round(settings.get('viewZoom') * 100));
    this.updateSwapButton();
    const emitView = () => {
      const v = {
        yaw: Number(this.viewYawEl.value),
        tilt: Number(this.viewTiltEl.value) / 100,
        zoom: Number(this.viewZoomEl.value) / 100,
        swapped: this.settings.get('sideSwap'),
      };
      this.settings.set('viewYaw', v.yaw);
      this.settings.set('viewTilt', v.tilt);
      this.settings.set('viewZoom', v.zoom);
      this.settings.save();
      if (this.onViewControlsCb) this.onViewControlsCb(v);
    };
    this.viewYawEl.addEventListener('input', emitView);
    this.viewTiltEl.addEventListener('input', emitView);
    this.viewZoomEl.addEventListener('input', emitView);
    this.swapSidesBtn.addEventListener('click', () => {
      this.settings.set('sideSwap', !this.settings.get('sideSwap'));
      this.settings.save();
      this.updateSwapButton();
      emitView();
    });
    this.updateFunSettingsVisibility();

    // Button handlers
    document.getElementById('btn-play').addEventListener('click', () => this.startGame());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
    document.getElementById('btn-again').addEventListener('click', () => this.startGame());
    document.getElementById('btn-menu').addEventListener('click', () => this.quitToMenu());
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('btn-back').addEventListener('click', () => this.showMenu());

    this.draftScreen = document.getElementById('draft-screen');
    this.draftCards = [document.getElementById('draft-0'), document.getElementById('draft-1')];
    this.draftTimerFill = document.getElementById('draft-timer-fill');
    this._draftOptions = null;
    // Hiding happens via the 'draftResolved' event so auto-picks close it too.
    this.draftCards.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const opt = this._draftOptions && this._draftOptions[i];
        this.game.chooseDraft(opt || null);
      });
    });
    document.getElementById('draft-skip').addEventListener('click', () => {
      this.game.chooseDraft(null);
    });
    document.getElementById('setting-gamemode').addEventListener('change', () => this.updateFunSettingsVisibility());

    // Keyboard
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Pointer (mouse always steers; touch/pen steers while the finger is down)
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') this._touchPointerId = e.pointerId;
    });
    const releaseTouch = (e) => {
      if (e.pointerId === this._touchPointerId) this._touchPointerId = null;
    };
    window.addEventListener('pointerup', releaseTouch);
    window.addEventListener('pointercancel', releaseTouch);
  }

  startGame() {
    this.showingSettings = false;
    this.game.start();
    this.hideAllScreens();
    this.scoreDisplay.classList.remove('hidden');
  }

  resumeGame() {
    this.game.resume();
    this.hideAllScreens();
    if (this.game.draftPending() && this._draftOptions) {
      this.showDraft(this._draftOptions, this.game.draftRemaining());
    }
    this.scoreDisplay.classList.remove('hidden');
  }

  quitToMenu() {
    this.showingSettings = false;
    this.game.quitToMenu();
    this.hideAllScreens();
    this.scoreDisplay.classList.add('hidden');
    this.menuScreen.classList.remove('hidden');
  }

  showMenu() {
    this.showingSettings = false;
    this.hideAllScreens();
    this.menuScreen.classList.remove('hidden');
    this.updateMenuRecords();
  }

  showSettings() {
    this.showingSettings = true;
    this.hideAllScreens();
    this.settingsScreen.classList.remove('hidden');
  }

  saveSettings() {
    const difficulty = document.getElementById('setting-difficulty').value;
    const winScore = parseInt(document.getElementById('setting-winscore').value);
    const deuce = document.getElementById('setting-deuce').value === 'true';
    const gameMode = document.getElementById('setting-gamemode').value;
    const powerups = document.getElementById('setting-powerups').checked;
    const multiBall = document.getElementById('setting-multiball').checked;
    const paddleShifts = document.getElementById('setting-paddleshifts').checked;

    this.settings.set('difficulty', difficulty);
    this.settings.set('winScore', winScore);
    this.settings.set('deuce', deuce);
    this.settings.set('gameMode', gameMode);
    this.settings.set('playerMode', document.getElementById('setting-playermode').value);
    this.settings.set('powerups', powerups);
    this.settings.set('drafts', document.getElementById('setting-drafts').checked);
    this.settings.set('multiBall', multiBall);
    this.settings.set('paddleShifts', paddleShifts);
    this.settings.set('aiTaunts', document.getElementById('setting-aitaunts').checked);
    this.settings.set('netGraze', document.getElementById('setting-netgraze').checked);
    this.settings.set('bloom', document.getElementById('setting-bloom').checked);
    this.settings.set('catchMode', document.getElementById('setting-catchmode').checked);
    this.settings.set('music', document.getElementById('setting-music').checked);
    this.settings.set('gamepad', document.getElementById('setting-gamepad').checked);
    this.settings.set('dailyChallenge', document.getElementById('setting-daily').checked);
    this.settings.save();

    this.showMenu();
  }

  updateFunSettingsVisibility() {
    const gameMode = document.getElementById('setting-gamemode').value;
    const funSettings = document.getElementById('fun-settings');
    if (gameMode === 'fun') {
      funSettings.classList.remove('hidden');
    } else {
      funSettings.classList.add('hidden');
    }
  }

  hideAllScreens() {
    this.menuScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.settingsScreen.classList.add('hidden');
    if (this.draftScreen) this.draftScreen.classList.add('hidden');
    this.comboDisplay.classList.add('hidden');
  }

  showDraft(options, seconds = CONFIG.drafts.timeout) {
    this._draftOptions = options;
    options.forEach((type, i) => {
      const info = POWERUP_INFO[type] || { label: type.toUpperCase(), desc: '' };
      const color = '#' + (CONFIG.powerups.colors[type] || 0xffffff).toString(16).padStart(6, '0');
      this.draftCards[i].innerHTML = `${info.label}<small>${info.desc}</small>`;
      this.draftCards[i].style.color = color;
      this.draftCards[i].style.borderColor = color;
    });
    if (this.draftTimerFill) {
      this.draftTimerFill.style.animation = 'none';
      void this.draftTimerFill.offsetWidth; // restart the drain animation
      this.draftTimerFill.style.animation = `draft-drain ${Math.max(0.05, seconds)}s linear forwards`;
    }
    this.draftScreen.classList.remove('hidden');
  }

  hideDraft() {
    this._draftOptions = null;
    if (this.draftScreen) this.draftScreen.classList.add('hidden');
  }

  update() {
    const state = this.game.state;

    // Only react to state changes, not every frame
    if (state === this.prevState) {
      // Still update score + combo text during gameplay
      if (state === 'PLAYING' || state === 'SERVE' || state === 'SCORED') {
        this.playerScoreEl.textContent = this.game.score.playerScore;
        this.opponentScoreEl.textContent = this.game.score.opponentScore;

        // Combo display (fun mode only)
        if ((this.game.isFunMode() || this.game.isBossMode()) && this.game.rallyCombo > 1) {
          this.comboDisplay.classList.remove('hidden');
          this.comboCountEl.textContent = this.game.rallyCombo;
          // Color shifts with combo
          const colors = CONFIG.comboColors;
          const idx = Math.min(Math.floor(this.game.rallyCombo / 3), colors.length - 1);
          this.comboCountEl.style.color = '#' + colors[idx].toString(16).padStart(6, '0');
        } else {
          this.comboDisplay.classList.add('hidden');
        }
      }
      return;
    }

    this.prevState = state;

    if (state === 'MENU') {
      if (!this.showingSettings) {
        this.hideAllScreens();
        this.scoreDisplay.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
      }
    } else if (state === 'PAUSED') {
      this.hideAllScreens();
      this.pauseScreen.classList.remove('hidden');
    } else if (state === 'GAME_OVER') {
      this.hideAllScreens();
      this.scoreDisplay.classList.add('hidden');
      const versus = this.settings.get('playerMode') === 'versus';
      const playerWins = this.game.winner === 'player';
      this.gameoverText.textContent = versus
        ? (playerWins ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!')
        : (playerWins ? 'YOU WIN!' : 'YOU LOSE!');
      this.gameoverText.style.color = playerWins ? '#00e5ff' : '#ff2d95';
      this.finalScoreEl.textContent = this.game.score.display;
      this.gameoverScreen.classList.remove('hidden');
    } else {
      // PLAYING, SERVE, SCORED
      this.hideAllScreens();
      this.scoreDisplay.classList.remove('hidden');
      this.playerScoreEl.textContent = this.game.score.playerScore;
      this.opponentScoreEl.textContent = this.game.score.opponentScore;
    }
  }

  showPowerupToast(puType, target) {
    const labels = {
      wide: 'PADDLE BOOST!',
      shrink: 'OPPONENT SHRUNK!',
      slowmo: 'SLOW-MO!',
      double: 'DOUBLE POINTS!',
      ghost: 'GHOST BALL!',
      freeze: 'OPPONENT FROZEN!',
      multi: 'MULTI-BALL!',
    };
    const colors = { wide: '#00ff88', shrink: '#ff2d95', slowmo: '#66aaff', double: '#ffff00', ghost: '#9d7bff', freeze: '#88ddff', multi: '#00ff88' };
    let text = labels[puType] || 'POWER-UP!';
    const versus = this.settings.get('playerMode') === 'versus';
    if ((puType === 'shrink' || puType === 'double') && target === 'ai') {
      text = versus
        ? (puType === 'shrink' ? 'P2 PADDLE SHRUNK!' : 'P2 DOUBLE POINTS!')
        : (puType === 'shrink' ? 'YOUR PADDLE SHRANK!' : 'AI DOUBLE POINTS!');
    }
    this.powerupToastEl.textContent = text;
    this.powerupToastEl.style.color = colors[puType] || '#ffffff';
    // Restart the CSS animation
    this.powerupToastEl.classList.add('hidden');
    void this.powerupToastEl.offsetWidth;
    this.powerupToastEl.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.powerupToastEl.classList.add('hidden');
    }, 1600);
  }

  showTaunt(text) {
    const el = document.getElementById('taunt-bubble');
    if (!el) return;
    el.textContent = text;
    el.classList.add('hidden');
    void el.offsetWidth;
    el.classList.remove('hidden');
    clearTimeout(this._tauntTimer);
    this._tauntTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  onKeyDown(e) {
    const vertical = this.settings.get('steerAxis') === 'vertical';
    const swapped = this.settings.get('sideSwap');
    const key = remapSteerKey(e.key, vertical);
    const versus = this.settings.get('playerMode') === 'versus';
    const leftPaddle = versus ? this.game.aiPaddle : this.game.playerPaddle;
    const rightPaddle = versus ? this.game.aiPaddle : this.game.playerPaddle;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (versus && (key === 'a' || key === 'A')) {
        this.game.playerPaddle.setKey(applySwap('left', swapped), true);
      } else {
        leftPaddle.setKey(applySwap('left', swapped), true);
      }
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (versus && (key === 'd' || key === 'D')) {
        this.game.playerPaddle.setKey(applySwap('right', swapped), true);
      } else {
        rightPaddle.setKey(applySwap('right', swapped), true);
      }
    } else if (key === ' ' || key === 'p' || key === 'P') {
      e.preventDefault();
      if (this.game.state === 'PLAYING') {
        this.game.pause();
      } else if (this.game.state === 'PAUSED') {
        this.resumeGame();
      }
    } else if (key === 'Escape') {
      if (this.game.draftPending()) {
        this.game.chooseDraft(null);
        this.hideDraft();
      } else if (this.game.state === 'PLAYING') {
        this.game.pause();
      } else if (this.game.state === 'PAUSED') {
        this.quitToMenu();
      }
    } else if (key === 'Enter') {
      if (this.game.state === 'MENU' && !this.showingSettings) {
        this.startGame();
      } else if (this.game.state === 'GAME_OVER') {
        this.startGame();
      }
    }
  }

  onKeyUp(e) {
    const vertical = this.settings.get('steerAxis') === 'vertical';
    const swapped = this.settings.get('sideSwap');
    const key = remapSteerKey(e.key, vertical);
    const versus = this.settings.get('playerMode') === 'versus';
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (versus && (key === 'a' || key === 'A')) {
        this.game.playerPaddle.setKey(applySwap('left', swapped), false);
      } else {
        (versus ? this.game.aiPaddle : this.game.playerPaddle).setKey(applySwap('left', swapped), false);
      }
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (versus && (key === 'd' || key === 'D')) {
        this.game.playerPaddle.setKey(applySwap('right', swapped), false);
      } else {
        (versus ? this.game.aiPaddle : this.game.playerPaddle).setKey(applySwap('right', swapped), false);
      }
    }
  }

  setScreenToWorld(fn) {
    this._screenToWorld = fn;
  }

  setRecords(records) {
    this.records = records;
    this.updateMenuRecords();
  }

  updateMenuRecords() {
    const el = document.getElementById('menu-records');
    if (!el || !this.records) return;
    const r = this.records.data;
    if (r.bestRally === 0 && r.wins === 0 && r.losses === 0) {
      el.classList.add('hidden');
    } else {
      el.textContent = `BEST RALLY ${r.bestRally} · BEST STREAK ${r.bestStreak} · W ${r.wins} - L ${r.losses}`;
      el.classList.remove('hidden');
    }
    const achEl = document.getElementById('menu-achievements');
    if (achEl) {
      const unlocked = ACHIEVEMENTS.filter(a => this.records.has(a.id));
      if (unlocked.length === 0) {
        achEl.classList.add('hidden');
      } else {
        achEl.textContent = `TROPHIES ${unlocked.length}/${ACHIEVEMENTS.length}: ${unlocked.map(a => a.label).join(' · ')}`;
        achEl.classList.remove('hidden');
      }
    }
  }

  onViewControls(cb) {
    this.onViewControlsCb = cb;
    cb({
      yaw: Number(this.viewYawEl.value),
      tilt: Number(this.viewTiltEl.value) / 100,
      zoom: Number(this.viewZoomEl.value) / 100,
      swapped: this.settings.get('sideSwap'),
    });
  }

  updateSteerButton() {
    const vertical = this.settings.get('steerAxis') === 'vertical';
    this.steerAxisBtn.setAttribute('aria-pressed', String(vertical));
    this.steerAxisBtn.innerHTML = vertical ? '&#8645; STEER &#8597;' : '&#8596; STEER';
  }

  updateSwapButton() {
    this.swapSidesBtn.setAttribute('aria-pressed', String(Boolean(this.settings.get('sideSwap'))));
  }

  showBoss(label, effect) {
    const texts = {
      intro: `${label} BLOCKS YOUR PATH`,
      shrink: `${label} SHRINKS YOUR PADDLE!`,
      freeze: `${label} FREEZES YOUR PADDLE!`,
    };
    this.powerupToastEl.textContent = texts[effect] || `${label} STRIKES!`;
    this.powerupToastEl.style.color = '#9d7bff';
    this.powerupToastEl.classList.add('hidden');
    void this.powerupToastEl.offsetWidth;
    this.powerupToastEl.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.powerupToastEl.classList.add('hidden');
    }, 2500);
  }

  showAchievement(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    this.powerupToastEl.textContent = `ACHIEVEMENT UNLOCKED — ${ach.label}!`;
    this.powerupToastEl.style.color = '#ffcc00';
    this.powerupToastEl.classList.add('hidden');
    void this.powerupToastEl.offsetWidth;
    this.powerupToastEl.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.powerupToastEl.classList.add('hidden');
    }, 2500);
    this.updateMenuRecords();
  }

  showRecord(kind, value) {
    this.powerupToastEl.textContent = kind === 'streak'
      ? `NEW BEST STREAK: ${value}!`
      : `NEW BEST RALLY: ${value}!`;
    this.powerupToastEl.style.color = '#00ff88';
    this.powerupToastEl.classList.add('hidden');
    void this.powerupToastEl.offsetWidth;
    this.powerupToastEl.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.powerupToastEl.classList.add('hidden');
    }, 1600);
  }

  onPointerMove(e) {
    if (e.pointerType !== 'mouse' && e.pointerId !== this._touchPointerId) return;
    if (this.game.state === 'PLAYING' || this.game.state === 'SERVE' || this.game.state === 'SCORED') {
      if (!this._screenToWorld) return;
      let worldX;
      if (this.settings.get('steerAxis') === 'vertical') {
        const half = CONFIG.court.width / 2;
        worldX = ((e.clientY / window.innerHeight) * 2 - 1) * half;
      } else {
        worldX = this._screenToWorld(e.clientX, e.clientY);
      }
      this.game.playerPaddle.setWorldTarget(worldX);
      if (this.game.state === 'SERVE') {
        this.game.setServeAimWorld(worldX);
      }
    }
  }
}
