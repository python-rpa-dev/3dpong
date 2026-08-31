/**
 * Device-agnostic steering mapping rules shared by keyboard, gamepad and
 * mouse/touch. Each device keeps its own raw input reading; the decisions of
 * "which screen axis steers" and "is the view mirrored" live here so they can
 * never drift apart again.
 */

/** Flip a logical 'left'/'right' direction when the side-swapped view mirrors the screen. */
export function mirrorDir(dir, swapped) {
  if (!swapped || dir !== 'left' && dir !== 'right') return dir;
  return dir === 'left' ? 'right' : 'left';
}

/** Sign-flip a continuous steer value (stick axis, screen delta) under side swap. */
export function flipIf(value, swapped) {
  return swapped ? -value : value;
}
