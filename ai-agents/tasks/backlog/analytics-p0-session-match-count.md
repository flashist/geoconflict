# Task — Analytics P0: Session Match Count Event

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Match-count-per-session is the input needed to reason about how quickly real players progress toward the 100-match citizenship threshold. Cannot be backfilled — each session produces a value that is lost if not recorded.

---

## Context

We currently have no way to know how many matches a player plays per session. `Session:Heartbeat` records session duration in 5-minute buckets, but not match count. Before citizenship XP launches at 10 XP per qualifying match toward 1,000 XP, we need empirical data on how many matches players actually play per session — not just time spent.

**Complexity discovered during implementation:** Two issues not anticipated in the original spec:

1. **`beforeunload` is unreliable on mobile** — iOS does not fire it consistently on tab close or navigation. Adding `pagehide` as a co-handler covers most of the gap. The write is still best-effort; a small loss rate is acceptable given that an unwritten session is simply missed, not corrupting data.

2. **Multi-tab collisions** — A player with two tabs open writes to the same localStorage key. Tab B's close overwrites Tab A's pending data, and Tab A's count is lost when Tab B's entry is consumed at next session start. The fix: key each pending entry by a per-tab session UUID (`geoconflict_pending_session_end:{uuid}`). The consume path reads all keys matching the prefix and fires one `Session:MatchesPlayed` event per pending entry. A legacy migration path handles the old single-key format for existing sessions in the wild.

---

## What to Build

### `SessionMatchAnalytics.ts` — standalone module

Module-level functions (no class needed):

| Function | Behaviour |
|---|---|
| `startSessionMatchTracking(nowMs?)` | Resets match counter to 0, records session start timestamp, generates a new session UUID, installs `beforeunload`/`pagehide` handlers (idempotent — installs once per page load) |
| `recordSessionMatchStart()` | Increments the in-memory session match counter |
| `persistPendingSessionEnd(storage?, nowMs?)` | Writes `{ matchesPlayed, sessionStartTime, firedAt }` to `geoconflict_pending_session_end:{sessionId}`. Best-effort — swallows storage errors. No-op if `startSessionMatchTracking` was never called. |
| `consumePendingSessionEnd(logMatchesPlayed, storage?)` | Scans localStorage for all keys matching the prefix (plus legacy key). For each, parses and calls `logMatchesPlayed(matchesPlayed)`, then removes the key. Silently drops malformed entries. |

### Key naming
- Active key pattern: `geoconflict_pending_session_end:{uuid}`
- Legacy key (consume-only, for migration): `geoconflict_pending_session_end`

### Enum key (add to `flashistConstants.analyticEvents`)

| Enum key | Event string | Value |
|---|---|---|
| `SESSION_MATCHES_PLAYED` | `Session:MatchesPlayed` | Integer — match starts recorded in that session |

### Integration points

**Session start** — in `logSessionStartSequence()` in `FlashistFacade`, before `Session:Start` fires:
```ts
consumePendingSessionEnd((matchesPlayed) => {
  logEventAnalytics(flashistConstants.analyticEvents.SESSION_MATCHES_PLAYED, matchesPlayed);
});
```
Then, after `Session:Start` fires: call `startSessionMatchTracking(sessionStartTime)`.

**Match start** — wherever `Game:Start` is fired, also call `recordSessionMatchStart()`.

### `recordSessionMatchStart` call site
`Game:Start` is the correct trigger — it fires on each fresh match start. See `analytics-p0-game-mode-segmentation` task for the existing `Game:Start` call site.

---

## Verification

1. Play two matches in one session, close the tab, reopen — confirm `Session:MatchesPlayed` fires with value `2` early in the new session-start sequence (before `Session:Start`).
2. Play zero matches, close the tab, reopen — confirm `Session:MatchesPlayed` fires with value `0`.
3. Open two tabs, play one match in each, close both, reopen — confirm two `Session:MatchesPlayed` events fire (value `1` each), not one combined event.
4. Simulate `beforeunload` not firing (stub it out) — confirm `pagehide` handler still persists the pending entry.
5. Write a malformed JSON string to a matching localStorage key — confirm it is silently dropped and does not block the session-start sequence.
6. Confirm `SESSION_MATCHES_PLAYED` appears in `ai-agents/knowledge-base/analytics-event-reference.md` with the correct enum key and event string.
7. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.
