export class UI {
  constructor(game, settings) {
    this.game = game;
    this.settings = settings;
    this.prevState = null;
    this.showingSettings = false;

    this.playerScoreEl = document.getElementById('player-score');
    this.opponentScoreEl = document.getElementById('opponent-score');
    this.scoreDisplay = document.getElementById('score-display');
    this.menuScreen = document.getElementById('menu-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.settingsScreen = document.getElementById('settings-screen');
    this.gameoverText = document.getElementById('gameover-text');
    this.finalScoreEl = document.getElementById('final-score');

    // Load settings into selects
    document.getElementById('setting-difficulty').value = settings.get('difficulty');
    document.getElementById('setting-winscore').value = String(settings.get('winScore'));
    document.getElementById('setting-deuce').value = String(settings.get('deuce'));

    // Button handlers
    document.getElementById('btn-play').addEventListener('click', () => this.startGame());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
    document.getElementById('btn-again').addEventListener('click', () => this.startGame());
    document.getElementById('btn-menu').addEventListener('click', () => this.quitToMenu());
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('btn-back').addEventListener('click', () => this.showMenu());

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
  }

  showSettings() {
    this.showingSettings = true;
    this.hideAllScreens();
    this.settingsScreen.classList.remove('hidden');
  }

  saveSettings() {
    const difficulty = document.getElementById('setting-difficulty').value;
    const winScore = parseInt(document.getElementById('setting-winscore').value, 10);
    const deuce = document.getElementById('setting-deuce').value === 'true';

    this.settings.set('difficulty', difficulty);
    this.settings.set('winScore', winScore);
    this.settings.set('deuce', deuce);
    this.settings.save();

    this.showMenu();
  }

  hideAllScreens() {
    this.menuScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.settingsScreen.classList.add('hidden');
  }

  update() {
    const state = this.game.state;

    // Only react to state changes, not every frame
    if (state === this.prevState) {
      // Still update score text during gameplay
      if (state === 'PLAYING' || state === 'SERVE' || state === 'SCORED') {
        this.playerScoreEl.textContent = this.game.score.playerScore;
        this.opponentScoreEl.textContent = this.game.score.opponentScore;
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
      this.gameoverText.textContent = this.game.winner === 'player' ? 'YOU WIN!' : 'YOU LOSE!';
      this.gameoverText.style.color = this.game.winner === 'player' ? '#00e5ff' : '#ff2d95';
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

  onKeyDown(e) {
    const key = e.key;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      this.game.playerPaddle.setKey('left', true);
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      this.game.playerPaddle.setKey('right', true);
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
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      this.game.playerPaddle.setKey('left', false);
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      this.game.playerPaddle.setKey('right', false);
    }
  }

  onMouseMove(e) {
    if (this.game.state === 'PLAYING' || this.game.state === 'SERVE' || this.game.state === 'SCORED') {
      this.game.playerPaddle.setMouseTarget(e.clientX, window.innerWidth);
    }
  }
}
