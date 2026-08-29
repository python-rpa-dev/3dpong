/**
 * Pure camera pose math for the view-angle sliders and side swap.
 * Yaw rotates the whole rig (position + target) around the court center;
 * tilt raises/lowers the camera. yaw=0, tilt=0 reproduces the base pose exactly.
 */

export const VIEW_LIMITS = {
  yawMax: 45,
  tiltMin: -0.6,
  tiltMax: 1,
};

const TILT_UP_Y = 9;
const TILT_DOWN_Y = 4;
const TILT_UP_RADIUS = 0.25;

export function clampView(yaw, tilt) {
  return {
    yaw: Math.max(-VIEW_LIMITS.yawMax, Math.min(VIEW_LIMITS.yawMax, yaw)),
    tilt: Math.max(VIEW_LIMITS.tiltMin, Math.min(VIEW_LIMITS.tiltMax, tilt)),
  };
}

/** Slider yaw plus the side-swap half turn. */
export function effectiveYaw(sliderDeg, swapped) {
  return sliderDeg + (swapped ? 180 : 0);
}

/**
 * @param {{x,y,z}} basePos CONFIG.camera.position
 * @param {{x,y,z}} baseLook CONFIG.camera.lookAt
 * @param {number} yawDeg degrees, negative = orbit left
 * @param {number} tilt -1..1 normalized camera height offset
 */
export function poseFor(basePos, baseLook, yawDeg, tilt) {
  const rad = (yawDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotX = (x, z) => x * cos - z * sin;
  const rotZ = (x, z) => x * sin + z * cos;

  const lookAt = {
    x: rotX(baseLook.x, baseLook.z),
    y: baseLook.y,
    z: rotZ(baseLook.x, baseLook.z),
  };
  let px = rotX(basePos.x, basePos.z);
  let pz = rotZ(basePos.x, basePos.z);

  const r = tilt > 0 ? 1 + TILT_UP_RADIUS * tilt : 1;
  return {
    position: {
      x: lookAt.x + (px - lookAt.x) * r,
      y: basePos.y + (tilt > 0 ? TILT_UP_Y : TILT_DOWN_Y) * tilt,
      z: lookAt.z + (pz - lookAt.z) * r,
    },
    lookAt,
  };
}
