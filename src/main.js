import { CONFIG } from './config.js';
import { Scene } from './scene/Scene.js';
import { Camera } from './scene/Camera.js';
import { CourtRenderer } from './scene/CourtRenderer.js';
import { BallRenderer } from './scene/BallRenderer.js';
import { PaddleRenderer } from './scene/PaddleRenderer.js';
import { PowerupRenderer } from './scene/PowerupRenderer.js';
import { AimIndicator } from './scene/AimIndicator.js';
import { Effects } from './scene/Effects.js';
import { Game } from './game/Game.js';
import { UI } from './ui/UI.js';
import { Audio } from './audio/Audio.js';
import { Settings } from './settings/Settings.js';
import { Records } from './settings/Records.js';

const canvas = document.getElementById('game-canvas');
const settings = new Settings();
const records = new Records();
const audio = new Audio();
const scene = new Scene(canvas);
const camera = new Camera();
const courtRenderer = new CourtRenderer(scene.scene);
const ballRenderer = new BallRenderer(scene.scene);
const paddleRenderer = new PaddleRenderer(scene.scene);
const powerupRenderer = new PowerupRenderer(scene.scene);
const aimIndicator = new AimIndicator(scene.scene);
const effects = new Effects(scene.scene);
const game = new Game(settings, records);
const ui = new UI(game, settings);
ui.setRecords(records);

ui.setScreenToWorld((clientX, clientY) =>
  camera.screenToWorldX(clientX, clientY, window.innerWidth, window.innerHeight, CONFIG.paddle.playerZ)
);

let lastTime = performance.now();

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  try {
    if (scene.bloomEnabled !== settings.get('bloom')) {
      scene.setBloom(settings.get('bloom'));
    }
    game.update(dt);

    // Drain game events and trigger effects/sounds
    const events = game.drainEvents();
  for (const evt of events) {
    switch (evt.type) {
      case 'wallBounce':
        audio.playWallBounce();
        ballRenderer.triggerSquash('x');
        effects.spawnParticles(evt.x, 0.5, evt.z, 0xffffff, 6, 2);
        effects.triggerShake(CONFIG.effects.hitShake, CONFIG.effects.hitShakeDuration);
        break;
      case 'paddleHit': {
        const speed = game.ball.currentSpeed;
        audio.playPaddleHit(speed, evt.combo || 0);
        ballRenderer.triggerSquash('z');
        const color = evt.who === 'player' ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
        const combo = evt.combo || 1;
        const particleCount = CONFIG.effects.hitParticles + Math.min(combo * 2, 20);
        const shakeMag = CONFIG.effects.hitShake + Math.min(combo * 0.1, 1);
        effects.spawnParticles(evt.x, 0.5, evt.z, color, particleCount, 3 + Math.min(combo * 0.2, 2));
        effects.triggerShake(shakeMag, CONFIG.effects.hitShakeDuration);
        // Paddle flash
        if (evt.who === 'player') paddleRenderer.flashPlayer();
        else paddleRenderer.flashAI();
        // Combo milestones: 5, 10, 15, 20
        if (combo % 5 === 0 && combo > 0) {
          effects.spawnComboRing(evt.x, 0.5, evt.z, combo);
          audio.playComboMilestone(combo);
        }
        break;
      }
      case 'paddleShift': {
        audio.playPaddleShift(evt.mode);
        const paddle = evt.affected === 'player' ? game.playerPaddle : game.aiPaddle;
        const shiftColor = evt.mode === 'shrink' ? 0xff2d95 : 0x00ff88;
        effects.spawnParticles(paddle.x, 1, paddle.z, shiftColor, 12, 3);
        break;
      }
      case 'multiBallSpawn':
        audio.playMultiBall();
        effects.spawnParticles(evt.x, 1, evt.z, 0x00ff88, 24, 5);
        effects.triggerShake(2, 0.15);
        ui.showPowerupToast('multi', evt.target);
        break;
      case 'powerup': {
        const puColor = CONFIG.powerups.colors[evt.puType] || 0xffffff;
        audio.playPowerup(evt.puType);
        effects.spawnParticles(game.ball.x, 1, game.ball.z, puColor, 20, 4);
        effects.triggerShake(1.5, 0.15);
        ui.showPowerupToast(evt.puType, evt.target);
        break;
      }
      case 'record':
        ui.showRecord(evt.kind, evt.value);
        break;
      case 'netGrazed':
        audio.playNetGrazed();
        effects.spawnParticles(evt.x, 0.6, evt.z, 0xffffee, 10, 2.5);
        break;
      case 'taunt':
        ui.showTaunt(evt.text);
        break;
      case 'score': {
        const isPlayer = evt.who === 'player';
        audio.playScore(isPlayer);
        const color = isPlayer ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
        effects.spawnParticles(evt.x, 1, evt.z, color, CONFIG.effects.scoreParticles * 2, 5);
        effects.triggerShake(CONFIG.effects.scoreShake * 1.5, CONFIG.effects.scoreShakeDuration);
        effects.triggerScreenFlash(isPlayer ? color : 0xff0044, 0.3);
        camera.punch(0.06);
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
  ballRenderer.setGhost(game.isBallHidden(game.threatBall()));
  ballRenderer.update(game.balls, dt, game.rallyCombo);
  courtRenderer.update(game.rallyCombo, dt);
  paddleRenderer.update(game.playerPaddle, game.aiPaddle, dt);
  powerupRenderer.update(game.powerups.active, dt);
  aimIndicator.update(game.state === 'SERVE', game.currentServeAim(), game.serveDirection, dt);
  effects.update(dt);

  // Apply screen shake to camera
  camera.applyShake(effects.shakeOffset);
  camera.update(dt);

  // Render
  scene.render(camera.camera);

  // Update UI
  ui.update();
  } catch (e) {
    console.error('Game loop error:', e);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
