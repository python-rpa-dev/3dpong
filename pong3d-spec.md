# PONG 3D — Isometric Pong Clone

## Specification v1.0

---

## 1. Overview

A modern, colorful Pong clone rendered in **isometric 3D**, viewed from the **player's perspective**. The camera sits behind and above the player's paddle, looking down the court toward the opponent. All original Pong mechanics are preserved — the 3D presentation is purely visual and does not alter gameplay logic.

**Core promise:** classic Pong feel, wrapped in a vibrant neon-3D world.

---

## 2. Game Mechanics (Original Pong — Unchanged)

### 2.1 Court & Ball

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Ball movement       | Linear velocity vector `(vx, vy)` in court plane    |
| Wall bounce         | Ball reflects off left and right side walls (the "top" and "bottom" of classic Pong). Vertical component `vy` reverses sign. |
| Paddle bounce       | Ball reflects off a paddle. The `vx` component reverses sign. The `vy` component is adjusted based on **where** on the paddle the ball struck (offset from paddle center), producing angle variation. |
| Speed increase      | Ball speed increases by a small fixed increment (e.g. +2–4%) on every paddle hit, capped at a maximum speed. |
| Ball reset          | After a point is scored, the ball resets to court center and is served toward the player who **lost** the point. |

### 2.2 Paddles

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Player paddle       | Near side of court (bottom of screen). Moves along the court width axis (left/right). |
| Opponent paddle     | Far side of court (top of screen, in the distance). Moves along the court width axis. |
| Paddle movement     | Player: keyboard or mouse. Opponent: AI. |
| Paddle bounds       | Paddles cannot leave the court width. They are clamped to the side walls. |
| Paddle size         | Fixed height (depth along court axis) and width (along court width axis). |

### 2.3 Scoring

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Point scored        | When the ball fully passes behind a paddle (exits the court on that side). |
| Win condition       | First to **11 points** wins. (Configurable.) |
| Deuce rule          | Optional: at 10-10, must win by 2. (Configurable.) |

---

## 3. Isometric 3D Design (New Feature)

### 3.1 Camera

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Type                | Fixed perspective camera (not true isometric — uses perspective projection for depth cues). |
| Position            | Behind and above the player's paddle. Offset: `x=0`, `y≈12`, `z≈-10` (relative to court center). |
| Look-at             | Slightly beyond court center, toward the opponent. `x=0`, `y=0`, `z≈2`. |
| FOV                 | 50–60 degrees. |
| Rotation            | Tilted down 35–45 degrees from horizontal. |
| Movement            | None (fixed). Optional subtle sway (configurable, default OFF). |

The camera gives the player a "sitting at the table" perspective — looking down the length of the court toward the opponent.

### 3.2 Court Geometry

The court is a rectangular 3D space:

```
        C3 (back-left)          C4 (back-right)
         \                       /
          \   OPPONENT SIDE     /
           \  (far, smaller)    /
            \                   /
             \    ┌─ NET ─┐    /
              \   │       │   /
               \  └───────┘  /
                \            /
                 \          /
                  \        /
                   \      /
                    \    /
                     \  /
                      \/
        C1 (front-left)        C2 (front-right)
         /                       \
        /   PLAYER SIDE           \
       /  (near, larger)           \
      /                             \
```

| Element             | Description                                           |
|---------------------|-------------------------------------------------------|
| Floor               | The playing surface. A flat rectangle. Ball travels on this plane at `y=0`. |
| Side walls (L/R)    | Low walls along the left and right edges (height ≈ ball diameter × 2). The ball bounces off these. |
| Back wall           | Behind the opponent paddle. Slightly taller. Ball exits past the opponent paddle to score. |
| Front edge          | Behind the player paddle. No physical wall — the ball simply exits to score. Visually: a glowing edge line. |
| Net                 | A thin translucent plane at the court midpoint (`z = court_depth / 2`). **Visual only** — does not affect ball physics. |

### 3.3 Ball in 3D

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Shape               | Sphere. Radius ≈ 2–3% of court width. |
| Position            | Ball travels on the **floor plane** (`y=0`). The 3D y-component is always 0 (ball does not arc or bounce vertically). |
| Visual height       | Ball sits on the floor. A subtle shadow/glow beneath it grounds it. |
| Trail               | A short fading trail behind the ball (last 5–8 positions) for motion clarity. |
| Spin visual         | Optional: ball surface has a subtle rotating texture to imply spin (cosmetic only). |

### 3.4 Paddles in 3D

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Shape               | Rounded box (beveled edges). Height (court-axis depth) ≈ 4–6% of court depth. Width ≈ 15–20% of court width. |
| Player paddle       | Near side. Larger apparent size due to perspective. |
| Opponent paddle     | Far side. Smaller apparent size due to perspective. |
| Glow                | Emissive edges. Player: cyan/blue. Opponent: magenta/pink. |
| Hit flash           | On ball contact, paddle briefly flashes white + emits a ring of particles. |

### 3.5 Perspective & Depth Cues

Since the camera is behind the player looking toward the opponent:

- **Opponent paddle appears smaller** (further away) — natural perspective.
- **Ball appears to grow** as it approaches the player — natural perspective.
- **Court floor** uses a subtle grid or gradient that reinforces depth.
- **Side walls** converge toward the vanishing point — classic isometric look.
- **Net** at midpoint provides a depth reference.

This perspective is **purely visual**. The game logic operates in 2D court coordinates (`x` = width, `z` = depth). The 3D renderer projects these to screen space.

### 3.6 Coordinate Mapping

| 2D Game Coordinate  | 3D World Coordinate                               |
|---------------------|---------------------------------------------------|
| `x` (court width)   | `x` (world X, centered at 0)                      |
| `z` (court depth)   | `z` (world Z, player at negative Z, opponent at positive Z) |
| `y` (always 0)      | `y` (world Y, floor level)                        |

---

## 4. Visual Design (Modern, Colorful)

### 4.1 Color Palette

| Element             | Color (hex)       | Notes                                  |
|---------------------|-------------------|----------------------------------------|
| Background          | `#0a0a1a`         | Very dark navy. Near-black.            |
| Court floor         | Gradient: `#1a1a3e` → `#2d1b4e` | Dark purple gradient, subtle grid overlay. |
| Court grid lines    | `#3a3a6e`         | Faint grid, 10×6 cells.                |
| Side walls          | `#2a2a5e`         | Slightly lighter than floor.           |
| Net                 | `#ffffff22`       | Translucent white, 15% opacity.        |
| Player paddle       | `#00e5ff`         | Neon cyan. Emissive glow.              |
| Opponent paddle     | `#ff2d95`         | Neon magenta/pink. Emissive glow.      |
| Ball                | `#ffff00`         | Bright yellow. Emissive glow.          |
| Ball trail          | `#ffff00` → transparent | Fading yellow.                     |
| Score text          | `#ffffff`         | White, large. Player score left, opponent right. |
| UI accents          | `#00e5ff`, `#ff2d95` | Cyan and magenta for buttons, highlights. |
| Particle (hit)      | `#ffffff`, `#ffff00` | White/yellow sparks.               |
| Particle (score)    | `#00e5ff` or `#ff2d95` | Matches scoring player's color.  |

### 4.2 Effects & Juice

| Effect              | Description                                           |
|---------------------|-------------------------------------------------------|
| Ball glow           | Additive sprite or bloom post-process on the ball. Radius ≈ 3× ball size. |
| Paddle glow         | Emissive material + subtle bloom on paddle edges.    |
| Hit particles       | 8–12 small particles burst from the contact point. Fade over 300ms. |
| Score particles     | 20–30 particles burst from the scoring side. Larger, longer fade (500ms). |
| Screen shake        | On paddle hit: 2px shake, 100ms. On score: 5px shake, 200ms. |
| Ball stretch        | Ball slightly stretches along its velocity vector at high speeds (cosmetic). |
| Court flash         | On score, the court floor briefly flashes the scoring player's color (100ms, 20% opacity). |
| Background          | Subtle animated starfield or floating particles in the background. Very slow, low opacity. |

### 4.3 Typography & UI

| Element             | Style                                             |
|---------------------|---------------------------------------------------|
| Font                | Modern sans-serif. Recommended: **Inter**, **Space Grotesk**, or **Orbitron** (for a more techy feel). |
| Score display       | Large (48–64px), centered top. Player score left, opponent score right. Semi-transparent background pill. |
| Menu text           | 24–32px. Buttons with rounded corners, neon border, hover glow. |

---

## 5. Controls

| Input             | Action                                          |
|-------------------|--------------------------------------------------|
| Mouse move        | Player paddle follows mouse X position (mapped to court width). |
| Arrow keys / A-D  | Move paddle left/right at fixed speed.          |
| W / S (optional)  | Fine-tune paddle position (slower).             |
| Space / P         | Pause / Resume.                                 |
| Esc               | Pause (or quit to menu from pause).             |
| Enter             | Confirm selection in menus.                     |
| Touch (mobile)    | Drag to move paddle. Tap to pause.              |

---

## 6. Audio

| Sound             | Description                                           |
|-------------------|-------------------------------------------------------|
| Paddle hit        | Short "pop" / "bloop". Pitch increases with ball speed. |
| Wall bounce       | Softer "tick".                                        |
| Score             | Rising chime (player scores) / descending tone (opponent scores). |
| Game win          | Short victory jingle (3–4 notes).                    |
| Game lose         | Short descending jingle.                             |
| UI click          | Soft "blip".                                          |
| Background music  | Optional. Lo-fi / synthwave loop. Low volume. Muteable. |

- All sounds synthesized or short WAV/OGG files.
- Master volume + mute toggle in settings.

---

## 7. Settings (Persisted)

| Setting           | Default       | Options                          |
|-------------------|---------------|----------------------------------|
| Difficulty        | Medium        | Easy / Medium / Hard             |
| Win score         | 11            | 5 / 7 / 11 / 15                  |
| Deuce rule        | ON            | ON / OFF                         |
| Ball speed        | Normal        | Slow / Normal / Fast             |
| Paddle size       | Normal        | Small / Normal / Large           |
| Sound             | ON            | ON / OFF                         |
| Music             | ON            | ON / OFF                         |
| Screen shake      | ON            | ON / OFF                         |
| Camera sway       | OFF           | ON / OFF                         |

Persisted in `localStorage` (web) or platform-appropriate storage.

---

## 8. Game Flow

### 8.1 Start

1. Load → **MENU** screen.
2. Title: "PONG 3D" with animated 3D ball bouncing behind the text.
3. Options: Play, Settings, (Credits if desired).
4. Play → Difficulty select → **PLAYING**.

### 8.2 Rally

1. Ball served toward the player who lost the previous point (or random for first serve).
2. Ball travels, bounces off walls and paddles.
3. Speed increases each paddle hit.
4. Point scored when ball exits past a paddle.
5. Brief pause (500ms) with score flash → next serve.

### 8.3 Game Over

1. When a player reaches the win score.
2. **GAME_OVER** screen: winner announcement, final score.
3. Buttons: Play Again, Menu.

---

## 9. Technical Specifications

### 9.1 Rendering

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Engine              | Three.js (or equivalent WebGL wrapper).            |
| Target FPS          | 60 FPS on mid-range hardware.                      |
| Renderer            | WebGL 2.0. Anti-aliasing enabled.                  |
| Post-processing     | Bloom (for glow effects). Optional: motion blur.   |
| Shading             | PBR materials for paddles and ball. Emissive for glow. |
| Particles           | GPU-instanced or sprite-based. Max 100 active particles. |
| Responsive          | Canvas resizes to viewport. Camera FOV adjusts for aspect ratio. |

### 9.2 Game Loop

```
1. Input processing (mouse, keyboard, touch)
2. Physics update (ball position, collisions)
3. AI update (opponent paddle movement)
4. Score check (ball out of bounds)
5. Particle update
6. Camera update (fixed + optional sway)
7. Render (Three.js)
8. UI update (score, overlays)
```

- Fixed timestep physics (60Hz) with interpolation for rendering.
- Delta time clamped to prevent spiral of death.

### 9.3 AI Behavior

| Property            | Value / Rule                                        |
|---------------------|-----------------------------------------------------|
| Tracking            | AI paddle moves toward ball X position with a reaction delay. |
| Reaction delay      | Easy: 300ms. Medium: 150ms. Hard: 50ms.            |
| Max speed           | Easy: 60% of ball max speed. Medium: 80%. Hard: 95%. |
| Imperfection        | AI occasionally "misses" the ball's true trajectory (adds ±5–10% error to target). |
| Idle behavior       | When ball is moving away, AI drifts slowly toward center. |

### 9.4 File Structure

```
pong3d/
├── index.html
├── package.json
├── src/
│   ├── main.js             # Bootstrap, game loop
│   ├── config.js           # All tunable constants
│   ├── game/
│   │   ├── Game.js         # State machine, game flow
│   │   ├── Ball.js         # Ball physics
│   │   ├── Paddle.js       # Paddle base class
│   │   ├── PlayerPaddle.js # Player input
│   │   ├── AIPaddle.js     # AI logic
│   │   ├── Court.js        # Wall collision, scoring
│   │   └── Score.js        # Score tracking
│   ├── scene/
│   │   ├── Scene.js        # Three.js scene setup
│   │   ├── Camera.js       # Camera config
│   │   ├── CourtMesh.js    # 3D court geometry
│   │   ├── BallMesh.js     # 3D ball + trail
│   │   ├── PaddleMesh.js   # 3D paddles + glow
│   │   ├── NetMesh.js      # 3D net
│   │   └── Particles.js    # Particle system
│   ├── ui/
│   │   ├── ScoreDisplay.js # Score overlay
│   │   ├── Menu.js         # Main menu
│   │   ├── PauseMenu.js    # Pause overlay
│   │   ├── Settings.js     # Settings panel
│   │   └── GameOver.js     # Game over screen
│   ├── audio/
│   │   ├── AudioManager.js # Sound playback
│   │   └── sounds/         # Audio files
│   └── utils/
│       ├── math.js         # Vector helpers
│       └── storage.js      # Settings persistence
├── assets/
│   ├── fonts/
│   └── textures/
└── styles/
    └── main.css
```

### 9.5 Performance Targets

| Metric              | Target                                            |
|---------------------|---------------------------------------------------|
| Frame time          | < 16.7ms (60 FPS)                                 |
| Draw calls          | < 50                                              |
| Memory              | < 100MB                                           |
| Load time           | < 3s (initial)                                    |
| Particles           | Max 100 active                                    |

### 9.6 Build & Distribution

Two build targets:

| Target              | Purpose                                         | Method                                            |
|---------------------|-------------------------------------------------|---------------------------------------------------|
| **Modular (dev)**   | Development, testing, iteration.                | Standard file structure (section 9.4). Run via `npx vite` or any dev server. |
| **Single HTML (dist)** | Distribution, demo, zero-dependency.         | Bundle all JS + CSS into one self-contained `pong3d.html`. |

**Single HTML build process:**

1. Use **esbuild** (fast, zero-config) or **Vite** (`vite build --single`) to bundle `src/main.js` and all imports into a single JS file.
2. Inline the bundled JS into `index.html` via a `<script>` tag.
3. Inline `styles/main.css` into a `<style>` tag.
4. Output: `dist/pong3d.html` — one file, no external dependencies, no server required.

**Requirements for single-file compatibility:**

- No `fetch()` calls for assets at runtime (fonts, textures, sounds must be inlined as base64 data URIs or generated procedurally).
- Three.js bundled inline (not loaded from CDN).
- All audio generated via Web Audio API (synthesized) or inlined as base64.
- No `localStorage` dependency for core functionality (settings should work without persistence in single-file mode).

**Build command (esbuild example):**

```bash
# Bundle JS
npx esbuild src/main.js --bundle --minify --outfile=dist/bundle.js

# Inline into HTML (script or manual)
# Result: dist/pong3d.html
```

**Verification:** Open `dist/pong3d.html` directly in a browser (file:// protocol). Game must be fully playable with no network requests.

---

## 10. Stretch Goals (Post v1.0)

- **Two-player mode**: Local, split keyboard (WASD vs Arrows).
- **Ball spin**: Paddle movement at contact adds spin to ball curve (cosmetic 3D arc).
- **Power-ups**: Items that appear on the court (paddle size, ball speed, multi-ball).
- **Replay system**: Record and replay rallies.
- **Online multiplayer**: WebSocket-based, real-time.
- **Custom themes**: Color palette selector.
- **Mobile optimization**: Touch controls, responsive layout, reduced effects on low-end devices.

---

## 11. Acceptance Criteria

- [ ] Ball bounces off side walls correctly (vy reversal).
- [ ] Ball bounces off paddles correctly (vx reversal, vy angle adjustment).
- [ ] Ball speed increases per paddle hit, capped at max.
- [ ] Scoring works: ball exits past paddle → point awarded.
- [ ] Win condition: first to N points (default 11).
- [ ] Deuce rule at 10-10 (win by 2) when enabled.
- [ ] AI tracks ball with configurable reaction delay and max speed.
- [ ] 3D isometric camera: fixed, behind player, 35–45° downward angle.
- [ ] Court rendered as 3D box with floor, side walls, back wall, net.
- [ ] Ball is a glowing sphere on the floor plane.
- [ ] Paddles are 3D rounded boxes with emissive glow.
- [ ] Perspective: opponent paddle appears smaller, ball grows as it approaches.
- [ ] Colorful neon palette applied to all elements.
- [ ] Hit particles, score particles, screen shake, court flash.
- [ ] Score display: large, centered, player/opponent.
- [ ] Menu, pause, game over screens functional.
- [ ] Settings persisted across sessions.
- [ ] 60 FPS on mid-range hardware.
- [ ] Responsive: works at various viewport sizes.
- [ ] Single HTML build (`dist/pong3d.html`) works standalone via file:// protocol with no network requests.

---

*End of specification.*
