# Auto-Spawn Late Join Fix

**Date**: 2026-04-07
**Status**: accepted

## Context

Players who joined a match that had been running for 30+ seconds (late joiners, reconnectors, slow connections) could get permanently stuck with no path to enter the game. The bug was especially damaging in the tutorial — auto-spawn is the first action, so affected players saw the tutorial start and then nothing happened, with no way to proceed.

Analytics measured the failure rate at **0.36%** of all spawn sessions (`Match:SpawnMissed:TimingRace`).

Source: `ai-agents/knowledge-base/autospawn-bug-fix-report.md` (2026-04-07)

## Decision

Guard auto-spawn against firing during the client catch-up (fast-forward) window:

> *If the client is still catching up, hold the spawn attempt and retry once catch-up ends.*

This ensures the spawn intent only goes to the server when the client is in sync and the server's spawn window is still open.

## Consequences

**Fixed:** Auto-spawn during catch-up window. `Match:SpawnMissed:TimingRace` should drop significantly. New event `Match:SpawnRetryAfterCatchup` fires when a held spawn is successfully retried — gives direct count of players saved per day.

**Still unfixed (known limitation):** If a player joins so late that the spawn phase has already closed by the time fast-forward finishes, they still cannot spawn. Tracked as a follow-up (Problem 2). Measured by `Match:SpawnMissed:CatchupTooLong`.

**Analytics signals to monitor post-deploy:**
| Signal | Expected change |
|---|---|
| `Match:SpawnMissed:TimingRace` | Should drop significantly |
| `Match:SpawnRetryAfterCatchup` | Should appear — confirms fix is saving players |
| `Match:SpawnMissed:NoAttempt` | Should stay flat (different root cause) |

## Related

- [[systems/analytics]] — spawn analytics events that instrument this fix
- [[features/tutorial]] — tutorial context where this bug was most damaging
