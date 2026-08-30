# AGENTS.md — 3D Pong Project Guide

## Environment: Windows 11

**This is a critical constraint for all agents working on this project.**

- **Shell**: PowerShell (not bash). Use PowerShell syntax throughout.
- **Command chaining**: Use `;` to separate commands. The `&&` operator is NOT available in PowerShell 5 (the default on Windows 11). Example:
  ```powershell
  # WRONG (bash):
  npm install && npm run dev

  # CORRECT (PowerShell 5):
  npm install; npm run dev
  ```
- **No `||` operator** for fallback: Use `if ($LASTEXITCODE -ne 0) { ... }` instead.
- **No `$(...)` command substitution** in the bash sense. Use PowerShell subexpressions or separate commands.
- **No `which`**: Use `where.exe <command>` instead.
- **No `ls -la`**: Use `Get-ChildItem` or just `ls` (PowerShell alias).
- **No `rm -rf`**: Use `Remove-Item -Recurse -Force <path>`.
- **No `mkdir -p`**: Use `New-Item -ItemType Directory -Force <path>`.
- **Path separators**: Use forward slashes `/` in git commands and config. PowerShell accepts both, but git is more consistent with `/`.
- **Line endings**: Git may convert LF to CRLF on checkout. Set `core.autocrlf` to `true` if needed.
- **`npx`, `node`, `npm`** work normally — these are the primary tools.
- **Avoid**: `sed`, `awk`, `grep` (use `Select-String`), `find` (use `Get-ChildItem -Recurse`).

### Quick Reference: Bash → PowerShell

| Bash | PowerShell |
|---|---|
| `cmd1 && cmd2` | `cmd1; cmd2` |
| `cmd1 \|\| cmd2` | `cmd1; if ($LASTEXITCODE -ne 0) { cmd2 }` |
| `which node` | `where.exe node` |
| `rm -rf dist/` | `Remove-Item -Recurse -Force dist` |
| `mkdir -p src/game` | `New-Item -ItemType Directory -Force src/game` |
| `cat file.md` | `Get-Content file.md` |
| `grep "pattern" file` | `Select-String "pattern" file` |
| `cp a b` | `Copy-Item a b` |
| `mv a b` | `Move-Item a b` |
| `ls -la` | `Get-ChildItem` |
| `export VAR=val` | `$env:VAR = "val"` |

---

## Project Overview

**PONG 3D** — A modern, colorful Pong clone in isometric 3D, viewed from the player's perspective.

- **Spec**: `pong3d-spec.md` (authoritative — all decisions trace back here)
- **Engine**: Three.js (WebGL)
- **Build**: Vite (dev + single-file dist via vite-plugin-singlefile)
- **Language**: JavaScript (ES modules)
- **No framework** — vanilla JS + Three.js

### Key Design Constraint

**Game logic is 2D. Rendering is 3D.** The ball and paddles operate on a 2D court plane (x = width, z = depth). The Three.js camera projects this into an isometric perspective view. Never add 3D physics — the ball does not arc, bounce vertically, or spin in 3D space.

---

## Git Workflow

### Branches

| Branch | Purpose | When to commit |
|---|---|---|
| `main` | Stable, milestone-ready | ONLY when a build milestone is hit (e.g. "single-file build passes all acceptance criteria") |
| `dev` | Active development | Every change that passes tests |

### Rules

1. **All development happens on `dev`.**
2. **Commit to `dev`** after every working change that passes tests.
3. **`main` is reserved** for milestone releases. Merge `dev` → `main` only when a spec-defined milestone is complete.
4. **Never commit directly to `main`** during active development.
5. **Commit messages**: Conventional Commits format.
   ```
   feat: add ball physics with wall bounce
   fix: correct paddle angle calculation at edges
   chore: add .gitignore
   docs: update spec with build section
   test: add unit tests for collision detection
   ```

### Credentials

```
user.name:  python-rpa-dev
user.email: 108140019+python-rpa-dev@users.noreply.github.com
```

These are set as **local** repo config (not global).

---

## Sub-Agent Parallelization

The project is designed for parallel work. Here is how to split it:

### Phase 1: Foundation (sequential — do first)

| Task | Files | Dependencies |
|---|---|---|
| Project scaffold | `index.html`, `package.json`, `vite.config.js`, `src/main.js`, `src/config.js` | None |
| Three.js scene setup | `src/scene/Scene.js` | Scaffold |
| Camera setup | `src/scene/Camera.js` | Scene |

### Phase 2: Core Game (parallel — independent modules)

These can be worked on **simultaneously** by different agents:

| Agent | Task | Files | Interface Contract |
|---|---|---|---|
| **Ball** | Ball physics, movement, wall/paddle collision | `src/game/Ball.js` | Exports: `Ball` class with `update(dt)`, `position`, `velocity`, `reset(direction)` |
| **Paddle** | Paddle base + player input + AI | `src/game/Paddle.js`, `src/game/PlayerPaddle.js`, `src/game/AIPaddle.js` | Exports: `Paddle` class with `update(dt)`, `position`, `width`, `height`. `PlayerPaddle` handles mouse/keyboard. `AIPaddle` handles tracking. |
| **Court** | Court geometry, wall collision, scoring detection | `src/game/Court.js` | Exports: `Court` class with `checkBallOut(ball)`, `bounceOffWalls(ball)`, `dimensions` |
| **Score** | Score tracking, win condition, deuce | `src/game/Score.js` | Exports: `Score` class with `point(player)`, `checkWin()`, `playerScore`, `opponentScore` |

### Phase 3: Rendering (parallel — depends on Phase 2 interfaces)

| Agent | Task | Files |
|---|---|---|
| **Court Renderer** | 3D court mesh, walls, net, floor | `src/scene/CourtRenderer.js` |
| **Ball Renderer** | 3D sphere, glow, trail | `src/scene/BallRenderer.js` |
| **Paddle Renderer** | 3D rounded boxes, emissive glow | `src/scene/PaddleRenderer.js` |
| **Effects** | Particles, screen shake, court flash | `src/scene/Effects.js` |

### Phase 4: UI & Flow (parallel)

| Agent | Task | Files |
|---|---|---|
| **UI** | Menu, pause, game over screens, score display | `src/ui/UI.js`, `src/ui/Menu.js`, `src/ui/ScoreDisplay.js` |
| **Game Flow** | State machine, game loop, serve logic | `src/game/Game.js` |
| **Audio** | Web Audio API sounds, music | `src/audio/Audio.js` |
| **Settings** | Settings persistence, config management | `src/settings/Settings.js` |

### Phase 5: Build & Test (sequential)

| Task | Files |
|---|---|
| Unit tests | `tests/*.test.js` |
| Build config | `vite.config.js` (+ vite-plugin-singlefile) |
| Single-file build | `dist/pong3d.html` |
| Acceptance testing | All criteria from spec section 11 |

### Interface Contracts

When working on a module in parallel, **only depend on the interface contract above**, not on the implementation. If you need a value from another module, use the contract. If the contract is insufficient, update this file and coordinate.

---

## Build Commands (PowerShell)

```powershell
# Install dependencies
npm install

# Dev server (Vite)
npx vite

# Build for production (single-file dist via vite-plugin-singlefile)
npx vite build

# Run tests
npx vitest run

# Run tests in watch mode
npx vitest
```

---

## Testing Expectations

- **Unit tests**: Physics (ball bounce, paddle angle), scoring (win condition, deuce), AI (tracking, reaction delay).
- **Integration tests**: Game flow (serve → rally → score → game over).
- **Acceptance tests**: All 20 criteria from spec section 11.
- **Single-file test**: Open `dist/pong3d.html` via `file://`, verify no network requests, full playability.

**A change is ready to commit to `dev` when:**
1. `npx vitest run` passes
2. No console errors in dev server
3. The change does not break existing functionality

---

## File Structure (Target)

```
3dpong/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── AGENTS.md
├── pong3d-spec.md
├── src/
│   ├── main.js
│   ├── config.js
│   ├── scene/
│   │   ├── Scene.js
│   │   ├── Camera.js
│   │   ├── CourtRenderer.js
│   │   ├── BallRenderer.js
│   │   ├── PaddleRenderer.js
│   │   └── Effects.js
│   ├── game/
│   │   ├── Game.js
│   │   ├── Ball.js
│   │   ├── Paddle.js
│   │   ├── PlayerPaddle.js
│   │   ├── AIPaddle.js
│   │   ├── Court.js
│   │   └── Score.js
│   ├── ui/
│   │   ├── UI.js
│   │   ├── Menu.js
│   │   └── ScoreDisplay.js
│   ├── audio/
│   │   └── Audio.js
│   └── settings/
│       └── Settings.js
├── tests/
│   ├── ball.test.js
│   ├── paddle.test.js
│   ├── court.test.js
│   ├── score.test.js
│   └── game.test.js
├── assets/
│   ├── fonts/
│   └── textures/
├── styles/
│   └── main.css
└── dist/
    └── pong3d.html
```

---

## Critical Reminders for All Agents

1. **Windows 11 / PowerShell** — No bash syntax. See table above.
2. **2D logic, 3D rendering** — Never add vertical ball physics.
3. **Spec is authoritative** — `pong3d-spec.md` defines all behavior. If in doubt, check the spec.
4. **Commit to `dev`** — Never to `main` unless a milestone is complete.
5. **No external asset fetches** — Single-file build must work offline. Generate sounds via Web Audio API, use procedural textures.
6. **ES modules** — Use `import`/`export`, not CommonJS `require`.
7. **No frameworks** — Vanilla JS + Three.js only. No React, Vue, Svelte, etc.
