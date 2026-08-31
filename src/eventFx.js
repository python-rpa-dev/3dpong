import { CONFIG } from './config.js';

/**
 * Presentation reactions to game events (audio, particles, UI toasts).
 * Returns a handler that consumes the drained event queue each frame,
 * keeping the game loop free of per-event-type branching.
 */
export function createEventFx({ game, audio, effects, ui, camera, ballRenderer, paddleRenderer }) {
  const handlers = {
    wallBounce(evt) {
      audio.playWallBounce();
      ballRenderer.triggerSquash('x');
      effects.spawnParticles(evt.x, 0.5, evt.z, CONFIG.colors.wallHit, 6, 2);
      effects.triggerShake(CONFIG.effects.hitShake, CONFIG.effects.hitShakeDuration);
    },

    paddleHit(evt) {
      const speed = game.ball.currentSpeed;
      audio.playPaddleHit(speed, evt.combo || 0);
      ballRenderer.triggerSquash('z');
      const color = evt.who === 'player' ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
      const combo = evt.combo || 1;
      const particleCount = CONFIG.effects.hitParticles + Math.min(combo * 2, 20);
      const shakeMag = CONFIG.effects.hitShake + Math.min(combo * 0.1, 1);
      effects.spawnParticles(evt.x, 0.5, evt.z, color, particleCount, 3 + Math.min(combo * 0.2, 2));
      effects.triggerShake(shakeMag, CONFIG.effects.hitShakeDuration);
      if (evt.who === 'player') paddleRenderer.flashPlayer();
      else paddleRenderer.flashAI();
      // Combo milestones: 5, 10, 15, 20
      if (combo % 5 === 0 && combo > 0) {
        effects.spawnComboRing(evt.x, 0.5, evt.z, combo);
        audio.playComboMilestone(combo);
      }
    },

    paddleShift(evt) {
      audio.playPaddleShift(evt.mode);
      const paddle = evt.affected === 'player' ? game.playerPaddle : game.aiPaddle;
      const shiftColor = evt.mode === 'shrink' ? CONFIG.colors.shiftShrink : CONFIG.colors.shiftGrow;
      effects.spawnParticles(paddle.x, 1, paddle.z, shiftColor, 12, 3);
    },

    multiBallSpawn(evt) {
      audio.playMultiBall();
      effects.spawnParticles(evt.x, 1, evt.z, CONFIG.colors.multiball, 24, 5);
      effects.triggerShake(2, 0.15);
      ui.showPowerupToast('multi', evt.target);
    },

    powerup(evt) {
      const puColor = CONFIG.powerups.colors[evt.puType] || 0xffffff;
      audio.playPowerup(evt.puType);
      effects.spawnParticles(game.ball.x, 1, game.ball.z, puColor, 20, 4);
      effects.triggerShake(1.5, 0.15);
      ui.showPowerupToast(evt.puType, evt.target, evt.mult || 1);
    },

    record(evt) {
      ui.showRecord(evt.kind, evt.value);
    },

    achievement(evt) {
      ui.showAchievement(evt.id);
      audio.playPowerup('double');
    },

    boss(evt) {
      ui.showBoss(evt.label, evt.effect);
      if (evt.effect === 'intro') audio.playPowerup('shrink');
      else audio.playNetGrazed();
    },

    draft(evt) {
      ui.showDraft(evt.options, evt.timeout);
    },

    draftResolved(evt) {
      ui.hideDraft();
      if (evt.choice) ui.showPowerupToast(evt.choice, 'player');
    },

    netGrazed(evt) {
      audio.playNetGrazed();
      effects.spawnParticles(evt.x, 0.6, evt.z, CONFIG.colors.netGrazed, 10, 2.5);
    },

    taunt(evt) {
      ui.showTaunt(evt.text);
    },

    score(evt) {
      const isPlayer = evt.who === 'player';
      audio.playScore(isPlayer);
      const color = isPlayer ? CONFIG.colors.playerPaddle : CONFIG.colors.opponentPaddle;
      effects.spawnParticles(evt.x, 1, evt.z, color, CONFIG.effects.scoreParticles * 2, 5);
      effects.triggerShake(CONFIG.effects.scoreShake * 1.5, CONFIG.effects.scoreShakeDuration);
      effects.triggerScreenFlash(isPlayer ? color : CONFIG.colors.lossFlash, 0.3);
      camera.punch(0.06);
    },

    gameOver(evt) {
      if (evt.winner === 'player') audio.playWin();
      else audio.playLose();
    },
  };

  return function handleGameEvents(events) {
    for (const evt of events) {
      const handler = handlers[evt.type];
      if (handler) handler(evt);
    }
  };
}
