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

1. **Daily challenge scoring** — best result per date-keyed seed in Records; "today's run" line on the menu. Completes mode #10, which currently only seeds the RNG.
2. **Accessibility sliders** — screen-shake intensity, colorblind-safe trail palette option, master-volume hotkey.
3. **Pause-menu restart + match stats** — restart button and current-match readout (longest rally, top speed, grazes).

### Medium

4. **Touch controls** — drag-to-move paddle so the game works on phones/tablets.
5. **Boss Rush ladder** — beat all three bosses in sequence with escalating difficulty instead of one random boss.
6. **Unlockable court skins** — palette variants tied to achievements.
7. **View angle sliders (viewport)** — horizontal/vertical sliders that orbit/pan the camera around the court (yaw + tilt), default = current pose, soft-animated transitions; keyboard aiming must stay correct at any angle.
8. **Side swap toggle** — button to trade places with the opponent (view from the far end); same pose system as #7 with a 180° yaw offset; default = current view.

### Bigger swings

9. **Replay system** — seed + input log makes any match reproducible; shareable codes.
10. **PWA offline install** — manifest + service worker so the single-file build is also installable.
