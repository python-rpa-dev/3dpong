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
