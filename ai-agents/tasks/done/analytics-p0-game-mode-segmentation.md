# Task — Analytics P0: Game Mode Segmentation

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Match funnels by multiplayer vs solo cannot be built until this is in place.

---

## Context

`Game:Start` fires for both multiplayer and solo/mission matches with no way to distinguish them in analytics. We need a classification event immediately after `Game:Start` to segment all downstream match funnel analysis.

This is one of three match lifecycle enrichment events. The other two are spawn confirmation (`analytics-p0-spawn-confirmation.md`) and match duration (`analytics-p0-match-duration.md`).

---

## What to Build

Fire one event immediately after `Game:Start`, before any other match events:

| Enum key | Event string | Condition |
|---|---|---|
| `GAME_MODE_MULTIPLAYER` | `Game:Mode:Multiplayer` | Match is a public or private multiplayer lobby |
| `GAME_MODE_SOLO` | `Game:Mode:Solo` | Match is a solo mode or mission |

This mirrors the pattern used for `Device:Type` and `Platform:OS` in the session-start sequence — a classification event fires right after the anchor event.

The mode is known at match start from the game configuration / lobby type. Identify the flag or parameter that distinguishes multiplayer from solo in `ClientGameRunner.ts` or the match init path.

Add both enum keys to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

## Verification

1. Start a multiplayer match — confirm `Game:Start` fires followed immediately by `Game:Mode:Multiplayer`. Confirm `Game:Mode:Solo` does not fire.
2. Start a solo / mission match — confirm `Game:Start` fires followed immediately by `Game:Mode:Solo`. Confirm `Game:Mode:Multiplayer` does not fire.
3. Confirm both new enum keys appear in `flashistConstants.analyticEvents`.
4. Confirm both events are documented in `ai-agents/knowledge-base/analytics-event-reference.md`.
5. Confirm no event strings are written inline.
