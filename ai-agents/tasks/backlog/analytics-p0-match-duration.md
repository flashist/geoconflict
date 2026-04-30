# Task — Analytics P0: Match Duration

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Without match duration we cannot measure what fraction of matches are abandoned early vs played to completion — critical for understanding real XP accrual rates under the qualifying-match rules.

---

## Context

We fire `Game:Start` and `Game:End` but do not record how long the match lasted. We cannot segment short abandons from full-length matches or validate that the XP qualifying-match definition works as intended at the population level.

This is one of three match lifecycle enrichment events. The other two are game mode segmentation (`analytics-p0-game-mode-segmentation.md`) and spawn confirmation (`analytics-p0-spawn-confirmation.md`).

---

## What to Build

Fire alongside `Game:End` (not instead of it — `Game:End` continues to fire):

| Enum key | Event string | Value |
|---|---|---|
| `MATCH_DURATION` | `Match:Duration` | Integer — seconds from `Game:Start` to `Game:End` |

Implementation: record the timestamp when `Game:Start` fires. When `Game:End` fires, compute `Math.round((Date.now() - matchStartTime) / 1000)` and fire `Match:Duration` with that integer value.

This event fires for all match endings: win, loss, abandon, disconnect. The accompanying `Game:Win` / `Game:Loss` / `Game:Abandon` events provide the outcome dimension.

Add the enum key to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

## Verification

1. Play a match to completion — confirm `Match:Duration` fires alongside `Game:End` with a plausible positive integer value.
2. Abandon a match approximately 30 seconds in — confirm `Match:Duration` fires with value approximately 30.
3. Confirm `Game:End` still fires (this event is additive, not a replacement).
4. Confirm the new enum key appears in `flashistConstants.analyticEvents`.
5. Confirm the event is documented in `ai-agents/knowledge-base/analytics-event-reference.md`.
6. Confirm no event strings are written inline.
