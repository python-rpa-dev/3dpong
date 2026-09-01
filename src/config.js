// All tunable game constants
export const CONFIG = {
  court: {
    width: 20,
    depth: 30,
    wallHeight: 2,
    netHeight: 3,
  },
  ball: {
    radius: 0.5,
    initialSpeed: 15,
    speedIncrement: 0.03,
    maxSpeed: 40,
    // Velocity smear (pseudo motion blur): stretch along travel direction so
    // fast depth-wise motion reads continuous at high zoom / near camera.
    smearGain: 1.2,
    smearMax: 0.5,
  },
  paddle: {
    width: 5,
    depth: 0.8,
    height: 2.5,
    playerZ: -14,
    opponentZ: 14,
    maxBounceAngle: Math.PI / 3,
    moveSpeed: 12,
  },
  camera: {
    fov: 60,
    near: 0.1,
    far: 100,
    position: { x: 10, y: 27, z: -21 },
    lookAt: { x: 0, y: 0, z: -3 },
  },
  colors: {
    background: 0x0a0a1a,
    floorTop: 0x1a1a3e,
    floorBottom: 0x2d1b4e,
    grid: 0x3a3a6e,
    wall: 0x2a2a5e,
    net: 0xffffff,
    playerPaddle: 0x00e5ff,
    opponentPaddle: 0xff2d95,
    ball: 0xffff00,
    wallHit: 0xffffff,
    shiftShrink: 0xff2d95,
    shiftGrow: 0x00ff88,
    multiball: 0x00ff88,
    netGrazed: 0xffffee,
    lossFlash: 0xff0044,
  },
  ai: {
    easy: { reactionDelay: 0.3, maxSpeed: 9, error: 0.1 },
    medium: { reactionDelay: 0.15, maxSpeed: 12, error: 0.05 },
    hard: { reactionDelay: 0.05, maxSpeed: 15, error: 0.02 },
  },
  scoring: {
    defaultWinScore: 11,
  },
  effects: {
    hitParticles: 10,
    scoreParticles: 25,
    hitShake: 0.5,
    scoreShake: 5,
    hitShakeDuration: 0.08,
    scoreShakeDuration: 0.2,
  },
  hitStop: {
    paddle: 0.025,
    score: 0.14,
    maxComboScale: 0.03, // extra freeze seconds added at high combo
  },
  serve: {
    delay: 0.8,
    scoreDelay: 1.0,
    maxAimAngle: 0.5,
  },

  postfx: {
    bloom: { strength: 0.7, radius: 0.5, threshold: 0.82 },
  },

  comboColors: [0x00e5ff, 0x00ff88, 0xffff00, 0xff8800, 0xff2d95],
  // Okabe-Ito palette: distinguishable under common color-vision deficiencies.
  comboColorsCB: [0xe69f00, 0x56b4e9, 0x009e73, 0xf0e442, 0xcc79a7],
  paddleShifts: {
    edgeThreshold: 0.65,
    centerThreshold: 0.2,
    shrinkScale: 0.72,
    growScale: 1.28,
    duration: 3,
  },
  powerups: {
    spawnMinDelay: 5,
    spawnMaxDelay: 9,
    maxActive: 2,
    pickupRadius: 1.1,
    zoneHalfDepth: 6,
    wideScale: 1.6,
    shrinkScale: 0.65,
    slowmoScale: 0.6,
    durationWide: 6,
    durationShrink: 6,
    durationSlowmo: 3,
    durationGhost: 4,
    durationFreeze: 1.2,
    durationEcho: 6,
    turboFactor: 1.4,
    durationBigBall: 6,
    bigBallScale: 2,
    doublePointsGoals: 2,
    doubleMaxMult: 8,
    loadoutGoals: 1,
    types: ['wide', 'shrink', 'slowmo', 'double', 'ghost', 'freeze', 'shield', 'echo', 'turbo', 'bigball'],
    colors: { wide: 0x00ff88, shrink: 0xff2d95, slowmo: 0x66aaff, double: 0xffff00, ghost: 0x9d7bff, freeze: 0x88ddff, shield: 0xffb347, echo: 0x18e0ce, turbo: 0xff3b30, bigball: 0xf5f5ff },
  },
  drafts: {
    every: 5,
    timeout: 3,
  },
  fun: {
    spinFactor: 0.6,
    speedRampPerHit: 0.03,
    maxSpeedMultiplier: 2.5,
    multiBallCombo: 10,
    tauntImpressedCombo: 8,
    netGrazeChance: 0.12,
    netGrazeNudge: 0.15,
    catchSpeedFactor: 0.82,
    extraBallSpeedFactor: 0.85,
  },
};

/** Court skins: cosmetic palette variants, some gated behind achievements. */
export const COURT_SKINS = [
  { id: 'default', name: 'NEON NIGHT', unlock: null },
  { id: 'sunset', name: 'SUNSET DRIFT', unlock: 'first_win', colors: { wall: 0x5a2d3c, net: 0xff9e6e, floorTop: '#3a1626', floorBottom: '#6e2f14', heat: 0xff6b3d } },
  { id: 'toxic', name: 'TOXIC LAB', unlock: 'grazer_3', colors: { wall: 0x1f3d2b, net: 0x7cffb2, floorTop: '#0e2418', floorBottom: '#1d3a10', heat: 0x9dff4a } },
  { id: 'abyss', name: 'DEEP ABYSS', unlock: 'ladder_clear', colors: { wall: 0x101c3a, net: 0x6ea8ff, floorTop: '#050a1e', floorBottom: '#12204d', heat: 0x3da6ff } },
];

/** Resolve a skin id to a usable skin; locked or unknown ids fall back to the default. */
export function resolveCourtSkin(id, unlocked = () => false) {
  const skin = COURT_SKINS.find((s) => s.id === id);
  if (!skin || (skin.unlock && !unlocked(skin.unlock))) return COURT_SKINS[0];
  return skin;
}
