import { CONFIG, resolveCourtSkin } from './config.js';
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
import { GamepadInput } from './input/GamepadInput.js';
import { effectiveYaw } from './scene/cameraPose.js';
import { createEventFx } from './eventFx.js';

const buildTag = document.getElementById('build-tag');
if (buildTag) {
  buildTag.textContent = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
}

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
const effects = new Effects(scene.scene, camera);
effects.setShakeScale(() => settings.get('shakeIntensity'));
audio.enabled = settings.get('soundOn') !== false;
const game = new Game(settings, records);
const ui = new UI(game, settings);
ui.setRecords(records);

ui.setScreenToWorld((clientX, clientY) =>
  camera.screenToWorldX(clientX, clientY, window.innerWidth, window.innerHeight, CONFIG.paddle.playerZ)
);

ui.onViewControls((v) => {
  camera.setView(effectiveYaw(v.yaw, v.swapped), v.tilt, v.yaw);
  camera.setZoom(v.zoom);
});

const gamepadInput = new GamepadInput(game);
// Debug handle for automated testing (opt-in via ?debug)
if (new URLSearchParams(location.search).has('debug')) {
  window.__pong = { game, ui, camera, settings, ballRenderer };
}
const handleGameEvents = createEventFx({
  game, audio, effects, ui, camera, ballRenderer, paddleRenderer,
});

let lastTime = performance.now();
let loopErrors = 0;
const PHYS_STEP = 1 / 120;
let accumulator = 0;

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  try {
    if (scene.bloomEnabled !== settings.get('bloom')) {
      scene.setBloom(settings.get('bloom'));
    }
    const soundOn = Boolean(settings.get('soundOn'));
    if (audio.enabled !== soundOn) audio.enabled = soundOn;
    const trailPalette = settings.get('cbTrail') ? CONFIG.comboColorsCB : CONFIG.comboColors;
    if (ballRenderer.trailPalette !== trailPalette) ballRenderer.setTrailPalette(trailPalette);
    const skin = resolveCourtSkin(settings.get('courtSkin'), (id) => records.has(id));
    if (courtRenderer.skin !== skin) courtRenderer.setSkin(skin);
    if (settings.get('gamepad')) gamepadInput.update(dt);
    // Fixed-timestep physics with render interpolation: decouples simulation
    // from display refresh rate and removes bounce overshoot jitter.
    accumulator += dt;
    while (accumulator >= PHYS_STEP) {
      game.update(PHYS_STEP);
      accumulator -= PHYS_STEP;
    }
    const alpha = game.state === 'PLAYING' ? accumulator / PHYS_STEP : 1;
    handleGameEvents(game.drainEvents());

    // Rally music follows game state + combo intensity
    if (settings.get('music') && audio.enabled && game.state === 'PLAYING') {
      if (!audio.musicPlaying) audio.startMusic();
      audio.setMusicIntensity(game.rallyCombo);
    } else if (audio.musicPlaying) {
      audio.stopMusic();
    }

    // Update renderers
    ballRenderer.setGhost(game.isBallHidden(game.threatBall()));
    ballRenderer.update(game.balls, dt, game.rallyCombo, alpha);
    courtRenderer.update(game.rallyCombo, dt);
    paddleRenderer.update(game.playerPaddle, game.aiPaddle, dt);
    powerupRenderer.update(game.powerups.active, dt);
    powerupRenderer.setEchoes(game.echoPaddles());
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
    // Log the first failure loudly, then stay quiet instead of spamming every frame
    if (loopErrors === 0) console.error('Game loop error:', e);
    else if (loopErrors === 1) console.error('(further game-loop errors suppressed)');
    loopErrors++;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
