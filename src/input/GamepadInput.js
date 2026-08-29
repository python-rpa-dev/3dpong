import { CONFIG } from '../config.js';

const DEADZONE = 0.15;

export class GamepadInput {
  /**
   * Maps gamepad 0 -> P1 paddle, gamepad 1 -> P2 paddle (versus mode).
   * Stick/dpad control is relative: pushing right moves the paddle screen-right.
   */
  constructor(game) {
    this.game = game;
    this.getGamepads = () =>
      (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
    this.targets = [game.playerPaddle.x, game.aiPaddle.x];
  }

  /** Test seam: inject a fake pad provider. */
  setProvider(fn) {
    this.getGamepads = fn;
  }

  activePaddles() {
    const list = [this.game.playerPaddle];
    if (this.game.isVersus()) list.push(this.game.aiPaddle);
    return list;
  }

  update(dt) {
    const pads = this.getGamepads() || [];
    const paddles = this.activePaddles();
    const vertical = this.game.settings?.get('steerAxis') === 'vertical';
    for (let i = 0; i < paddles.length; i++) {
      const pad = pads[i];
      if (!pad) continue;
      let axis = 0;
      if (vertical) {
        const raw = Math.abs(pad.axes?.[1] || 0) > DEADZONE ? pad.axes[1] : 0;
        // Stick up (-1 on gamepad y-axis) steers like stick-right did: screen-right
        axis = -raw;
        if (!axis && pad.buttons) {
          if (pad.buttons[12]?.pressed) axis = 1;  // dpad up -> screen right
          if (pad.buttons[13]?.pressed) axis = -1; // dpad down -> screen left
        }
      } else {
        axis = Math.abs(pad.axes?.[0] || 0) > DEADZONE ? pad.axes[0] : 0;
        if (!axis && pad.buttons) {
          if (pad.buttons[14]?.pressed) axis = -1; // dpad left -> world +x (screen left)
          if (pad.buttons[15]?.pressed) axis = 1;
        }
      }
      if (!axis) continue;
      // Under a side swap the screen is mirrored; flip stick/dpad so it matches what the player sees.
      if (this.game.settings?.get('sideSwap')) axis = -axis;
      const paddle = paddles[i];
      if (typeof paddle.setWorldTarget !== 'function') continue; // AI-controlled in this mode
      // World +x is screen-left under this camera, so stick-right decreases x
      const next = (this.targets[i] ?? paddle.x) - axis * paddle.moveSpeed * dt;
      const hw = CONFIG.court.width / 2 - paddle.width / 2;
      this.targets[i] = Math.max(-hw, Math.min(hw, next));
      paddle.setWorldTarget(this.targets[i]);
    }
  }
}
