# 3D Pong — Milestone: First Playable Version

## Date
2026-06-28

## What was built
Full 3D pong game merged to main. 23 files, ~4800 lines.

## Key features
- Isometric diamond view (camera at 45°, position 14,22,-14)
- Player paddle: mouse + arrow keys (input negated for camera angle)
- AI opponent: 3 difficulty levels (easy/medium/hard)
- Ball physics: angle-based bounces off paddles, speed increases per hit
- Particle effects: hit particles (10), score particles (25)
- Camera shake: hit (0.5 amplitude), score (5 amplitude)
- Score: first to 11
- Single-file build: `npx vite build` → `dist/index.html` (498KB)

## Architecture
- `src/config.js` — all tunable constants
- `src/game/` — game logic (Ball, Paddle, PlayerPaddle, AIPaddle, Court, Score, Game)
- `src/scene/` — Three.js rendering (Scene, Camera, CourtRenderer, BallRenderer, PaddleRenderer, Effects)
- `src/audio/` — Web Audio synth
- `src/ui/` — input handling
- `src/settings/` — localStorage persistence
- `src/main.js` — entry point, game loop

## Build
- Dev: `npx vite` (HMR)
- Production: `npx vite build` → single HTML file
