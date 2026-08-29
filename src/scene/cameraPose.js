/**
 * Pure camera pose math for the view-angle sliders and side swap.
 * Yaw rotates the whole rig (position + target) around the court center;
 * tilt raises/lowers the camera. yaw=0, tilt=0 reproduces the base pose exactly.
 */

export const VIEW_LIMITS = {
  yawMax: 45,
  tiltMin: -1,
  tiltMax: 1,
};

/** Elevation orbit range in degrees (both directions from the base pose). */
const TILT_DEG_RANGE = 25;
const ELEV_MIN = (12 * Math.PI) / 180;
const ELEV_MAX = (85 * Math.PI) / 180;

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

/** Maximum FOV reduction at full zoom (before the no-clip clamp kicks in). */
export const MIN_ZOOM_REDUCTION = 0.3;

/**
 * Smallest fov that still contains content whose max NDC extent at baseFov is maxExtent.
 * NDC scales with 1/tan(fov/2), so this inversion is exact for both axes.
 */
export function minFovToContain(baseFovDeg, maxExtent) {
  const half = Math.tan((baseFovDeg * Math.PI) / 360) * Math.max(maxExtent, 0);
  return (2 * Math.atan(half) * 180) / Math.PI;
}

/**
 * @param {{x,y,z}} basePos CONFIG.camera.position
 * @param {{x,y,z}} baseLook CONFIG.camera.lookAt
 * @param {number} yawDeg degrees, negative = orbit left
 * @param {number} tilt -1..1 elevation orbit (constant distance), +/-25 degrees
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
  const px = rotX(basePos.x, basePos.z);
  const pz = rotZ(basePos.x, basePos.z);

  const dx = px - lookAt.x;
  const dy = basePos.y - lookAt.y;
  const dz = pz - lookAt.z;
  const dist = Math.hypot(dx, dy, dz);
  const horiz = Math.hypot(dx, dz);
  let elev = Math.atan2(dy, horiz) + tilt * TILT_DEG_RANGE * (Math.PI / 180);
  elev = Math.max(ELEV_MIN, Math.min(ELEV_MAX, elev));
  const h = Math.cos(elev) * dist;

  return {
    position: {
      x: lookAt.x + (dx / horiz) * h,
      y: lookAt.y + Math.sin(elev) * dist,
      z: lookAt.z + (dz / horiz) * h,
    },
    lookAt,
  };
}
