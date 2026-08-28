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
    document.getElementById('setting-multiball').checked = settings.get('multiBall');
    document.getElementById('setting-paddleshifts').checked = settings.get('paddleShifts');
    document.getElementById('setting-aitaunts').checked = settings.get('aiTaunts');
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
    document.getElementById('setting-gamemode').addEventListener('change', () => this.updateFunSettingsVisibility());

    // Keyboard
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Mouse
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
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
    this.settings.set('multiBall', multiBall);
    this.settings.set('paddleShifts', paddleShifts);
    this.settings.set('aiTaunts', document.getElementById('setting-aitaunts').checked);
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
    this.comboDisplay.classList.add('hidden');
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
        if (this.game.isFunMode() && this.game.rallyCombo > 1) {
          this.comboDisplay.classList.remove('hidden');
          this.comboCountEl.textContent = this.game.rallyCombo;
          // Color shifts with combo
          const colors = [0x00e5ff, 0x00ff88, 0xffff00, 0xff8800, 0xff2d95];
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
      multi: 'MULTI-BALL!',
    };
    const colors = { wide: '#00ff88', shrink: '#ff2d95', slowmo: '#66aaff', double: '#ffff00', multi: '#00ff88' };
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
    const key = e.key;
    const versus = this.settings.get('playerMode') === 'versus';
    const leftPaddle = versus ? this.game.aiPaddle : this.game.playerPaddle;
    const rightPaddle = versus ? this.game.aiPaddle : this.game.playerPaddle;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (versus && (key === 'a' || key === 'A')) {
        this.game.playerPaddle.setKey('left', true);
      } else {
        leftPaddle.setKey('left', true);
      }
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (versus && (key === 'd' || key === 'D')) {
        this.game.playerPaddle.setKey('right', true);
      } else {
        rightPaddle.setKey('right', true);
      }
    } else if (key === ' ' || key === 'p' || key === 'P') {
      e.preventDefault();
      if (this.game.state === 'PLAYING') {
        this.game.pause();
      } else if (this.game.state === 'PAUSED') {
        this.resumeGame();
      }
    } else if (key === 'Escape') {
      if (this.game.state === 'PLAYING') {
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
    const key = e.key;
    const versus = this.settings.get('playerMode') === 'versus';
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (versus && (key === 'a' || key === 'A')) {
        this.game.playerPaddle.setKey('left', false);
      } else {
        (versus ? this.game.aiPaddle : this.game.playerPaddle).setKey('left', false);
      }
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (versus && (key === 'd' || key === 'D')) {
        this.game.playerPaddle.setKey('right', false);
      } else {
        (versus ? this.game.aiPaddle : this.game.playerPaddle).setKey('right', false);
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
      return;
    }
    el.textContent = `BEST RALLY ${r.bestRally} · BEST STREAK ${r.bestStreak} · W ${r.wins} - L ${r.losses}`;
    el.classList.remove('hidden');
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

  onMouseMove(e) {
    if (this.game.state === 'PLAYING' || this.game.state === 'SERVE' || this.game.state === 'SCORED') {
      if (!this._screenToWorld) return;
      const worldX = this._screenToWorld(e.clientX, e.clientY);
      this.game.playerPaddle.setWorldTarget(worldX);
      if (this.game.state === 'SERVE') {
        this.game.setServeAimWorld(worldX);
      }
    }
  }
}
