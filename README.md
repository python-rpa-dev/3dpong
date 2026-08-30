# PONG 3D

A modern, colorful Pong clone rendered in isometric 3D — Three.js on a WebGL canvas, vanilla ES modules, no framework, and a single self-contained HTML file for the release build.

## Play

Open `dist/index.html` directly in a browser (no server, no network needed), or run the dev server:

```bash
npm install
npx vite
```

## Controls

| Input | Action |
|---|---|
| Mouse / touch drag | Move paddle |
| `A` / `D` or `←` / `→` | Move paddle (P2 in local 2-player) |
| Gamepad stick | Move paddle |
| `Space` / `P` | Pause, resume |
| `Esc` | Cancel a draft pick / pause / quit to menu |
| `Enter` | Start match, play again |

In-game buttons toggle steering axis (`STEER`), swap sides (`SIDES`), and orbit/zoom the camera.

## Game concepts

- **Game logic is 2D, rendering is 3D.** Ball and paddles live on a court plane (x = width, z = depth); the camera projects it. There is no vertical physics.
- **Modes** — *Classic* (plain Pong), *Fun* (spin, speed ramp, combos, powerups), *Boss Rush* (a random boss AI with its own rule: shrinker / freezer / metronome).
- **Powerups** spawn on the court and are collected by running the ball over them: wide, shrink, slow-mo, double points, ghost, freeze. Every 5-hit rally also offers a *draft* — pick one powerup to stock for your next hit.
- **Combos** count rally hits and drive scoring tint, particles, music layers and multi-ball.
- **Double-points loadout** — the best `x2 → x4 → x8` stack you reach in a match is banked in your records and seeds the next single-player match (never in dailies or 2-player).
- **Sudden death** — unlockable match rule (next point wins), gated behind the *Double Stack* trophy.
- **Records & trophies** — best rally, streaks, wins/losses, achievements, and a seeded daily challenge, all in `localStorage`.

## Development

```bash
npx vite          # dev server
npx vite build    # production build -> dist/index.html (single file)
npx vitest run    # unit + integration tests
```

- **`dev`** is the active branch; commit every change that passes tests. **`main`** only receives milestone merges. Conventional Commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- A change is ready when `npx vitest run` passes, the dev server shows no console errors, and nothing existing broke.
- Modules are deliberately decoupled — see the interface contracts in [`AGENTS.md`](AGENTS.md) before touching `src/game/*` or `src/scene/*`.

## Where things are decided

| File | Role |
|---|---|
| [`pong3d-spec.md`](pong3d-spec.md) | Authoritative spec — behavior questions end here |
| [`AGENTS.md`](AGENTS.md) | Module map, interface contracts, build/test workflow |
| [`IDEAS.md`](IDEAS.md) | Improvement backlog (implemented items are ticked) |
