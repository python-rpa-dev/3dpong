# Improvement Backlog

Ideas captured after the juice/feature pass (powerups, multi-ball, versus mode, records, bloom, etc.).
Implement one at a time on `dev`, commit each separately.

## Quick wins (small)

✅ 1. **Paddle impact animation** — squash the paddle briefly on hit, matching the ball squash; FOV/camera punch on scoring.
✅ 2. **Combo-tinted ball trail** — trail hue shifts through the combo palette already used in the UI.
✅ 3. **Court theme escalation** — floor/wall colors intensify with rally length ("the court is heating up").
✅ 4. **Catch mode** — assist toggle: AI-side shots get slightly slowed so beginners can rally longer.

## Medium

✅ 5. **More powerups** — *ghost ball* (ball fades out near the opponent for ~0.5s per hit) and *freeze* (opponent paddle locked for 1s).
✅ 6. **Rally music layers** — looping procedural bass/arp whose layers fade in at combo thresholds instead of just pitch ramps.
✅ 7. **Achievements screen** — "20-rally", "shrink triple", "comeback from match point down"; persisted next to records.
✅ 8. **Gamepad support** — P1 or P2 on pad; nice for couch versus.

## Bigger swings

✅ 9. **Arcade/boss mode** — AI gets a personality per game with special rules (teleports at high combo, double-shrinks you, etc.).
✅ 10. **Seeded daily challenge** — deterministic RNG so scores are comparable across days.

---

## Round 2 backlog

### Quick wins (small)

1. ✅ **Daily challenge scoring** — best result per date-keyed seed in Records; "today's run" line on the menu. Completes mode #10, which currently only seeds the RNG.
2. ✅ **Accessibility sliders** — screen-shake intensity, colorblind-safe trail palette option, master-volume hotkey.
3. ✅ **Pause-menu restart + match stats** — restart button and current-match readout (longest rally, top speed, grazes).

### Medium

4. ✅ **Touch controls** — drag-to-move paddle so the game works on phones/tablets.
5. ✅ **Boss Rush ladder** — beat all three bosses in sequence with escalating difficulty instead of one random boss.
6. **Unlockable court skins** — palette variants tied to achievements.
✅ 7. **View angle sliders (viewport)** — horizontal/vertical sliders that orbit/pan the camera around the court (yaw + tilt), default = current pose, soft-animated transitions; keyboard aiming must stay correct at any angle.
✅ 8. **Side swap toggle** — button to trade places with the opponent (view from the far end); same pose system as #7 with a 180° yaw offset; default = current view.

### Bigger swings

9. **Replay system** — seed + input log makes any match reproducible; shareable codes.
10. ✅ **PWA offline install** — manifest + service worker so the single-file build is also installable. (Manifest shipped; SW intentionally skipped, see caveats.)

---

## Round 3 backlog

### Gameplay depth

1. ✅ **Powerup drafts** — after a 5-rally, pick 1 of 2 random powerups to keep for your next hit (deckbuilding layer). Non-blocking: play continues behind the overlay; auto-picks randomly (including skip) after 3 s.
2. **Hazard zones** — random court tiles that speed up / slow / curve the ball for one bounce; telegraphed with floor glow.
3. **Curve/spin shot** — paddle-edge contact bends the ball path; aim skill without vertical physics (velocity stays planar).
4. **Multi-stage AI difficulty** — AI ramps reaction/error within a game when losing, eases when winning (rubber-band tension).
5. **Grazes as resource** — net grazes charge a special-shot meter (one free heavy shot per full bar).

### Modes & meta

6. **Survival/endless mode** — one life, balls keep coming faster; rally-score leaderboard by seed.
7. **Zen practice mode** — no scoring, auto-returns, aim training with target zones.
8. **Weekly gauntlet** — fixed modifier combo per week (e.g. boss + low-friction court + double shrink), shareable code.
9. **Unlockable paddle trails/shapes** tied to achievements (pairs with round 2 #6).

### Feel & juice

10. **Ball shadow/ground indicator** — readability win at extreme camera tilts.
11. **Slow-mo on match point** — brief time dilation + audio duck on game/match-point serves.
12. ✅ **Hit-stop freeze** — ~30 ms freeze frame on big combo hits.
13. **Ambient stadium reactions** — procedural crowd murmur swelling with rally length (Web Audio, no assets).

### Social/sharing

14. **Share cards** — end screen emits a text/PNG result card ("21-17 vs Metronome, best 14-rally, seed 20260829").
15. **Replay theater** — watch input-log replays with camera controls (builds on round 2 #9).

---

## Round 4 backlog

### New powerups

1. **Shield** — one-time goal save: next incoming goal is blocked at the line, shield pops. Counterweight to freeze/shrink being punishing.
2. **Echo paddle** — a ghost paddle hovers on your goal line for ~6s and blocks one shot; covers only part of the line, so positioning still matters.
3. **Turbo** — ball +40% speed until *you* score or concede. Stacks with combo scoring; glass-cannon play.
4. **Big ball** — 2x ball size for ~6s: easier for you to return, less reaction time for the opponent. Symmetric and readable.
5. **Vortex tile** — a glowing tile drifts on the court; ball deflects off it once. Shares the tile language with hazard zones (round 3 #2) — build them on one tile system.
6. **Magnet** — ball curves slightly toward your paddle face when approaching within ~1 unit; strong late returns, weaker angle shots.
7. **Drain** — steals remaining duration of the opponent's active timed powerup and applies it to you. Drafts make this visible-knowledge mind games.

### Systems

8. **Cumulative powerups** — collected powerups persist and stack across rallies/matches instead of expiring. *Double points* is the perfect candidate (x2 -> x4 -> x8 stacking). Award a trophy for collecting them; use collection milestones to unlock other mechanics, e.g. **sudden death** mode (next point wins) as an achievement-gated unlock.

---

## Caveats & known limitations

### PWA / mobile install (shipped in `779efd8`)
- **No service worker** — intentionally skipped to keep the single-file build. Modern Chrome/Edge install from manifest alone; if offline-caching guarantees are ever needed, ship an extra `sw.js` next to the HTML (breaks "single file" rule) and register it guarded by `location.protocol.startsWith('http')`.
- **iOS touch icon** — `apple-touch-icon` is a data URI; iOS may ignore it. Needs a real 180x180 PNG file if we ever ship static assets alongside the HTML.

### Replay system (round 2 #9, not yet built)
- Seeded replay only reproduces while the **simulation code is byte-identical** — any physics/AI/powerup/timestep change desyncs old replays. Mitigations: stamp replays with a sim version/build hash and refuse mismatches, or record periodic state snapshots + inputs instead of pure re-simulation.
- Requires a **fixed timestep** for the sim; current loop uses variable rAF `dt`.


