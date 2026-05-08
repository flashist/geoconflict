# LocalServer Hash Guard

**Source**: `ai-agents/tasks/done/s4c-fix-local-server-hash-guard.md`
**Status**: done
**Sprint/Tag**: Sprint 4c / stabilization

## Goal

Prevent a production singleplayer crash where `LocalServer.onMessage()` received a hash message for a turn index that was not present in `this.turns` and threw `TypeError: Cannot set properties of undefined (setting 'hash')`.

## Key Changes

- Added a defensive guard in `src/client/LocalServer.ts` before writing the every-100-turn singleplayer hash into `this.turns[clientMsg.turnNumber].hash`.
- When the target turn is missing, the local server now logs a diagnostic warning containing the hash turn number, current `turns.length`, delta, and timestamp, forwards that warning through `logOtelWarn()`, and returns without throwing.
- Preserved the existing archive-size behavior: non-replay singleplayer still records only hashes whose turn number is divisible by 100.

## Outcome

The immediate crash path is removed for local/singleplayer matches. Remaining warning logs should help diagnose whether the underlying mismatch is a timing race, stale/duplicate hash message, or off-by-one between the worker hash tick and `LocalServer` turn history.

## Related

- [[systems/telemetry]]
- [[decisions/sprint-4c]]
