# Seeded randomness

*Captured 2026-08-30 during the cumulative-powerup work, for later review (relevant to the replay system and any "story mode" encounter design).*

## The primitive

`mulberry32(seed)` (`src/game/rng.js:3`) is a small deterministic PRNG: the same integer seed always yields the same sequence of `0..1` values. `dailySeed()` (`src/game/rng.js:13`) encodes today's date as that integer (e.g. `20260830`), so every player on the same calendar day shares one stream.

## How it is wired

One stream per match, decided once in `Game.start()` (`src/game/Game.js:283`):

- daily challenge on → `mulberry32(dailySeed())`
- otherwise → `Math.random`

That single function is handed to every stochastic subsystem:

| Consumer | What it rolls | Reference |
|---|---|---|
| PowerupManager | spawn delay, position, type | `src/game/Powerups.js:26`, `:70` |
| AIPaddle | aim error, panic chance | `src/game/AIPaddle.js:62`, `:66` |
| Ball / serve | spin jitter, serve direction | `src/game/Ball.js:25`, `Game.js:302` |
| Net graze | chance to graze + nudge amount | `src/game/Game.js:432` |
| Drafts | the two offered options, auto-pick | `src/game/Game.js:162`, `:188` |

Same seed **and** same player inputs ⇒ same match.

## What it buys today

- **Daily challenge**: results are stored per-seed in `Records.dailies`, so "today" is one shared board with comparable scores.
- **Testability**: tests inject a scripted rng instead of relying on luck (e.g. `tests/powerups.test.js:11`).
- **Fairness opt-outs**: the loadout carry and sudden death are deliberately ignored in dailies (`Game.loadoutEnabled()`, `Game.suddenDeathEnabled()`) because they change the shape of the match per player — the seed would no longer describe a common challenge.

## Limits to respect before building on it

1. **One stream, order-sensitive.** Determinism depends on *when* each subsystem draws. Any divergence in draw order — an extra ball spawning, a draft resolving differently — shifts every later value and desyncs the rest of the match.
2. **Variable timestep.** The loop runs on rAF `dt`, not a fixed step, so the same seed is not frame-rate independent today. A replay system needs a fixed sim step plus an input log (see the replay caveats in `IDEAS.md`).
3. **Replays need versioning.** Seeded re-simulation only reproduces while the simulation code is byte-identical; stamp replays with a build hash and refuse mismatches, or record periodic state snapshots.
4. **"Comparable" is loose.** The seed fixes the board (spawns, AI error), not the outcome — two players with different paddle inputs still produce different rallies.

## Ideas this unlocks

- **Story mode / Boss Rush ladder**: authored encounters can pin a seed per stage so a designed sequence (which powerup appears when, where the tiles sit) is reproducible while still varying player skill.
- **Shareable seeds**: a code like `seed 20260830` reproduces a specific run for discussion or challenge.
