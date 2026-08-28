# 3D Pong — Session Notes

## Architecture
- `src/config.js` — all game constants (CONFIG object)
- `src/game/Game.js` — orchestrator, game loop, event system
- `src/game/PlayerPaddle.js` — player input (keys + mouse)
- `src/game/AIPaddle.js` — AI with difficulty, rally combo makes it worse
- `src/game/Ball.js` — ball physics, speed ramp, spin
- `src/game/Court.js` — wall/paddle bounce detection
- `src/game/Score.js` — scoring, win detection
- `src/scene/` — Three.js renderers (Ball, Paddle, Court, Effects, Particles)
- `src/audio/Audio.js` — Web Audio API synth sounds
- `src/settings/Settings.js` — localStorage persistence
- `src/ui/SettingsPanel.js` — DOM settings UI
- `src/ui/ScoreDisplay.js` — score + combo DOM overlay
- `src/main.js` — entry point, event wiring

## Key Design Decisions
- Isometric camera at (0, 22, -20) looking at origin — x-axis is flipped vs player POV
- Event system: Game pushes events, main.js drains and dispatches to renderers/audio
- Fun mode: spin, speed ramp, rally combo, power-ups, multi-ball, paddle shifts (all selectable)
- Classic mode: original Pong behavior, no extras
- Rally combo is a MECHANICAL weapon: makes AI worse (error + reaction + panic chance)

## Rally Combo Mechanics
- AI error grows 12% per hit (capped 2.5x)
- AI reaction delay grows 12% per hit (capped 2.5x)
- AI panic chance: 3% per hit (capped 25%) — moves wrong direction
- Ball speed ramps 3% per hit (capped 2.5x)
- Ball color shifts yellow→orange→red→white with speed
- Trail intensifies with speed
- Particles scale with combo

## Next: Power-ups, Multi-ball, Paddle Shifts (Fun mode selectable)
- Settings: powerups, multiBall, paddleShifts (booleans, Fun mode only)
- Power-ups: BIG_PADDLE, CONFUSE_AI, SPIN_BOOST, DOUBLE_POINTS
- Multi-ball: 2nd ball at 10+ combo
- Paddle shifts: edge hit shrinks AI, center hit grows AI (3s duration)
