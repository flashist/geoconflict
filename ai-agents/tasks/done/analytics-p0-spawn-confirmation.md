# Task — Analytics P0: Spawn Confirmation

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Time-to-spawn and ghost rate cannot be measured without a server-confirmed spawn event. Ghost rate directly affects qualifying-match XP crediting design.

---

## Context

Current spawn events (`Match:SpawnChosen`, `Match:SpawnAuto`) fire at intent-send time on the client, not when the server confirms placement. We cannot measure actual time-to-spawn or whether spawn flow issues persist post-Sprint 2 fixes.

Absence of `Match:Spawned` within a session that has `Game:Start` is itself signal: it measures the ghost rate (players who join but never place a spawn).

This is one of three match lifecycle enrichment events. The other two are game mode segmentation (`analytics-p0-game-mode-segmentation.md`) and match duration (`analytics-p0-match-duration.md`).

---

## What to Build

Fire when the server's placement of the player is reflected in client-side game state — not at intent-send time.

| Enum key | Event string | Value |
|---|---|---|
| `MATCH_SPAWNED_CONFIRMED` | `Match:Spawned` | Integer — seconds from match join to confirmed spawn |

**Finding the right hook:** the confirmed placement arrives as a `GameUpdate` from the server that sets the player's territory for the first time. Find the point in the client where the player transitions from "no territory" to "territory owned" — this is the correct fire point.

Record the match join timestamp when `Game:Start` fires. At the confirmed spawn point, compute elapsed seconds and pass as the event value.

This event fires at most once per match per player. If a player never spawns (ghost), the event does not fire.

Add the enum key to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

## Verification

1. Spawn manually in a match — confirm `Match:Spawned` fires after `Match:SpawnChosen` with a positive integer value (seconds to spawn).
2. Let auto-spawn trigger — confirm `Match:Spawned` fires after `Match:SpawnAuto` with a positive integer value.
3. Confirm the value reflects server-confirmed placement, not intent-send time (it should be measurably later than the intent events).
4. Confirm the new enum key appears in `flashistConstants.analyticEvents`.
5. Confirm the event is documented in `ai-agents/knowledge-base/analytics-event-reference.md`.
6. Confirm no event strings are written inline.
