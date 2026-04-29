# Task — Analytics P0: Match Lifecycle Enrichment

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Match duration and spawn confirmation are needed to understand real match completion patterns before the XP qualifying-match rules ship. If 40% of matches end in voluntary leave, the effective citizenship progression is slower than designed.

---

## Context

We currently fire `Game:Start` and `Game:End` without any segmentation by game mode (multiplayer vs solo) and without recording match duration. `Game:Start` fires for both multiplayer matches and solo/mission matches — they are indistinguishable in analytics. Spawn events (`Match:SpawnChosen`, `Match:SpawnAuto`) fire at intent-send time, not at confirmed server placement, so we cannot measure actual time-to-spawn.

Three gaps to close:

1. **Game mode segmentation** — we cannot segment match funnels by multiplayer vs solo without this.
2. **Spawn confirmation** — we know when spawn intent is sent but not when the server confirms it. Time-to-spawn (intent → confirmed placement) tells us whether spawn flow issues persist post-Sprint 2 fixes.
3. **Match duration** — we cannot measure what fraction of matches are abandoned early vs played to completion without this.

---

## What to Build

### Event 1: Game mode segmentation

Fire one event immediately after `Game:Start`, before any other match events:

| Enum key | Event string | Condition |
|---|---|---|
| `GAME_MODE_MULTIPLAYER` | `Game:Mode:Multiplayer` | Match is a public or private multiplayer lobby |
| `Game:Mode:Solo` | `Game:Mode:Solo` | Match is a solo mode or mission |

This mirrors the pattern used for `Device:Type` and `Platform:OS` in the session-start sequence — a classification event fires right after the anchor event.

The mode is known at match start from the game configuration / lobby type. Identify the flag or parameter that distinguishes multiplayer from solo in `ClientGameRunner.ts` or the match init path.

Add both enum keys to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

### Event 2: Spawn confirmation

Fire when the server's placement of the player is reflected in client-side game state — not at intent-send time.

| Enum key | Event string | Value |
|---|---|---|
| `MATCH_SPAWNED_CONFIRMED` | `Match:Spawned` | Integer — seconds from match join to confirmed spawn |

**Finding the right hook:** the current spawn intent events (`Match:SpawnChosen`, `Match:SpawnAuto`) fire at intent-send time. The confirmed placement arrives as a `GameUpdate` from the server that sets the player's territory for the first time. Find the point in the client where the player transitions from "no territory" to "territory owned" — this is the correct fire point for `Match:Spawned`.

Pass seconds elapsed since match join as the value (record the match join timestamp when `Game:Start` fires; compute elapsed at spawn confirmation time).

Add the enum key to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

**Note:** this event fires once per match per player, at most. If a player never spawns (ghost), the event does not fire — and the absence of `Match:Spawned` within a session that has `Game:Start` is itself signal (ghost rate measurement).

---

### Event 3: Match duration

Fire alongside `Game:End` (not instead of it — `Game:End` continues to fire):

| Enum key | Event string | Value |
|---|---|---|
| `MATCH_DURATION` | `Match:Duration` | Integer — seconds from `Game:Start` to `Game:End` |

Implementation: record the timestamp when `Game:Start` fires. When `Game:End` fires, compute `Math.round((Date.now() - matchStartTime) / 1000)` and fire `Match:Duration` with that integer value.

This event fires for all match endings: win, loss, abandon, disconnect. The accompanying `Game:Win` / `Game:Loss` / `Game:Abandon` events provide the outcome dimension.

Add the enum key to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

## Verification

1. Start a multiplayer match — confirm `Game:Start` fires followed immediately by `Game:Mode:Multiplayer`. Confirm `Game:Mode:Solo` does not fire.
2. Start a solo / mission match — confirm `Game:Start` fires followed immediately by `Game:Mode:Solo`. Confirm `Game:Mode:Multiplayer` does not fire.
3. Spawn in a match — confirm `Match:Spawned` fires with a positive integer value (seconds to spawn). Confirm it fires after both manual spawn (`Match:SpawnChosen`) and auto-spawn (`Match:SpawnAuto`) scenarios.
4. End a match (any outcome) — confirm `Match:Duration` fires alongside `Game:End` with a plausible positive integer value.
5. Abandon a match early (30 seconds in) — confirm `Match:Duration` fires with value approximately 30.
6. Confirm all three new events appear in `ai-agents/knowledge-base/analytics-event-reference.md`.
7. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.
