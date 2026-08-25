import { CONFIG } from './config.js';
import { Scene } from './scene/Scene.js';
import { Camera } from './scene/Camera.js';
import { CourtRenderer } from './scene/CourtRenderer.js';
import { BallRenderer } from './scene/BallRenderer.js';
import { PaddleRenderer } from './scene/PaddleRenderer.js';
import { Effects } from './scene/Effects.js';
import { Game } from './game/Game.js';
import { UI } from './ui/UI.js';
import { Audio } from './audio/Audio.js';
import { Settings } from './settings/Settings.js';

const canvas = document.getElementById('game-canvas');
const settings = new Settings();
const audio = new Audio();
const scene = new Scene(canvas);
const camera = new Camera();
const courtRenderer = new CourtRenderer(scene.scene);
const ballRenderer = new BallRenderer(scene.scene);
const paddleRenderer = new PaddleRenderer(scene.scene);
const effects = new Effects(scene.scene);
const game = new Game(settings);
const ui = new UI(game, settings);

let lastTime = performance.now();

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  game.update(dt);

  // Drain game events and trigger effects/sounds
  const events = game.drainEvents();
  for (const evt of events) {
    switch (evt.type) {
      case 'wallBounce':
        audio.playWallBounce();
        effects.spawnParticles(evt.x, 0.5, evt.z, 0xffffff, 6, 2);
        effects.triggerShake(CONFIG.effects.hitShake, CONFIG.effects.hitShakeDuration);
        break;
      case 'paddleHit': {
        const speed = game.ball.currentSpeed;
        audio.playPaddleHit(speed);
        const color = evt.who === 'player' ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
        // Scale particles with combo
        const combo = evt.combo || 1;
        const particleCount = CONFIG.effects.hitParticles + Math.min(combo * 2, 20);
        const shakeMag = CONFIG.effects.hitShake + Math.min(combo * 0.1, 1);
        effects.spawnParticles(evt.x, 0.5, evt.z, color, particleCount, 3 + Math.min(combo * 0.2, 2));
        effects.triggerShake(shakeMag, CONFIG.effects.hitShakeDuration);
        break;
      }
      case 'score': {
        const isPlayer = evt.who === 'player';
        audio.playScore(isPlayer);
        const color = isPlayer ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
        effects.spawnParticles(evt.x, 1, evt.z, color, CONFIG.effects.scoreParticles, 4);
        effects.triggerShake(CONFIG.effects.scoreShake, CONFIG.effects.scoreShakeDuration);
        break;
      }
    }
  }

  // Check for game over sound
  if (game.state === 'GAME_OVER' && !game._gameOverSoundPlayed) {
    game._gameOverSoundPlayed = true;
    if (game.winner === 'player') audio.playWin();
    else audio.playLose();
  }
  if (game.state !== 'GAME_OVER') {
    game._gameOverSoundPlayed = false;
  }

  // Update renderers
  ballRenderer.update(game.ball);
  paddleRenderer.update(game.playerPaddle, game.aiPaddle);
  effects.update(dt);

  // Apply screen shake to camera
  camera.applyShake(effects.shakeOffset);

  // Render
  scene.render(camera.camera);

  // Update UI
  ui.update();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
