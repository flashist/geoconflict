# Task — Fix LocalServer Hash Guard (Singleplayer Crash)

## Sprint
Sprint 4c — Stabilization

## Priority
High — ~31.0 errors/min. Direct client crash path in singleplayer/local game execution.

---

## Context

`LocalServer.onMessage()` handles hash verification messages by writing `this.turns[clientMsg.turnNumber].hash = clientMsg.hash` every 100 turns. In production, hash messages sometimes reference a turn index not yet present in `this.turns`, causing an uncaught `TypeError`.

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `TypeError: Cannot set properties of undefined (setting 'hash')` | ~19.15/min (multiple groups) |
| `Uncaught TypeError: Cannot set properties of undefined (setting 'hash') [object Object]` | 9.15/min |
| Safari: `undefined is not an object (evaluating 'this.turns[e.turnNumber].hash=e.hash')` | 2.22/min |
| `Uncaught TypeError: ... YandexSDKLogError` | 0.44/min |

This is a singleplayer/local game path, not the multiplayer server path. The crash breaks the match for the affected player.

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

### 1. Add a defensive guard in `LocalServer.onMessage()`

In `src/client/LocalServer.ts`, locate the hash assignment in `onMessage()`:

```
this.turns[clientMsg.turnNumber].hash = clientMsg.hash
```

Add a guard before the assignment:
- If `this.turns[clientMsg.turnNumber]` is undefined, log a bounded warning including `turnNumber` and the current `this.turns.length`, then return without assigning.
- Do not re-throw or leave the error uncaught.

### 2. Investigate the root cause

With the guard in place, the crash is eliminated, but the underlying cause is worth understanding:
- Why does a hash message arrive for a turn that does not yet exist in `this.turns`? Plausible causes: async turn processing, replay/timing race, duplicate/stale hash messages, or a turn number off-by-one in the hash emission.
- Add a `console.warn` with enough context (turn number, turns length, timestamp) to diagnose this in Uptrace if it persists after the guard.
- If the root cause is a turn ordering/timing race, document it in the task findings for a follow-up fix.

---

## Verification

1. A hash message for a missing turn does not throw an uncaught `TypeError`.
2. Existing hash verification and replay behavior still work correctly (existing tests should pass; add one if none covers this path).
3. The hash crash error groups disappear from Uptrace after deployment.
4. Any remaining bounded warnings include enough context (turn number, turns length) to diagnose the root cause.

---

## Notes

- The guard is the primary deliverable. Root-cause investigation is secondary — do not block shipping the guard while tracing the timing issue.
- All code changes in `src/client/` that touch game execution logic should have test coverage; check if a test exists for `LocalServer.onMessage()` hash handling and add one if not.
