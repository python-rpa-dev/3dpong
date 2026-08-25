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
    fov: 55,
    near: 0.1,
    far: 100,
    position: { x: 14, y: 22, z: -14 },
    lookAt: { x: 0, y: 0, z: 0 },
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
  serve: {
    delay: 0.8,
    scoreDelay: 1.0,
  },
  fun: {
    spinFactor: 0.6,
    speedRampPerHit: 0.03,
    maxSpeedMultiplier: 2.5,
    comboColors: [0x00e5ff, 0x00ff88, 0xffff00, 0xff8800, 0xff2d95],
  },
};
