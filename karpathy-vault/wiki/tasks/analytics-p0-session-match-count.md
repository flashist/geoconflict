# Analytics P0: Session Match Count Event

**Source**: `ai-agents/tasks/done/analytics-p0-session-match-count.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Track how many matches a player starts per session so that the citizenship XP threshold (1,000 XP at 10 XP per qualifying match → 100 matches) is grounded in empirical session depth data, not guesswork. Match count per session cannot be backfilled — each session that fires without this event is a permanent data gap.

## Key Changes

- New module `src/client/SessionMatchAnalytics.ts` — four exported functions:
  - `startSessionMatchTracking(nowMs?)` — resets counter, generates per-tab UUID, installs `beforeunload`/`pagehide` handlers (idempotent guard; installs once per page load).
  - `recordSessionMatchStart()` — increments the in-memory match counter.
  - `persistPendingSessionEnd(storage?, nowMs?)` — writes `{ matchesPlayed, sessionStartTime, firedAt }` to localStorage under key `geoconflict.session.pendingEnd:{sessionId}`. Swallows storage errors silently (sandboxed iframe / quota).
  - `consumePendingSessionEnd(logMatchesPlayed, storage?)` — scans localStorage for all keys matching the `geoconflict.session.pendingEnd:` prefix, fires the callback once per entry with the stored `matchesPlayed` count, then removes the key. Silently drops malformed entries.
- Added `SESSION_MATCHES_PLAYED` / `Session:MatchesPlayed` to `flashistConstants.analyticEvents` in `FlashistFacade.ts`.
- Integrated in `FlashistFacade._initialize()`: `consumePendingSessionEnd` fires **before** `Session:Start`; `startSessionMatchTracking()` fires after `Session:Start`.
- `recordSessionMatchStart()` called from `logMatchStartAnalytics()` in `src/client/MatchStartAnalytics.ts` on each fresh, non-reconnect match start (at the point where `Game:Start` and game-mode events already fire).
- Comprehensive unit tests in `tests/client/SessionMatchAnalytics.test.ts` (14 cases covering all branches including broken storage, malformed JSON, multi-tab round-trip).

## Implementation Notes

**Mobile `beforeunload` unreliability:** iOS does not fire `beforeunload` consistently on tab close or navigation. `pagehide` is added as a co-handler to close most of the gap. Persistence remains best-effort — a small loss rate (mostly iOS cold kills) is acceptable since a missed write simply drops that session silently rather than corrupting data.

**Multi-tab collision fix:** A player with two tabs open would have caused one tab's close to overwrite the other's pending entry if a single shared localStorage key were used. The fix: each tab generates a fresh UUID on `startSessionMatchTracking()` and writes under a UUID-suffixed key. `consumePendingSessionEnd` reads all matching prefix keys and fires one `Session:MatchesPlayed` event per entry — so two closed tabs produce two analytics events in the next session, not one merged one.

**Storage key namespace:** Uses `geoconflict.session.pendingEnd:{uuid}` — consistent with the established `geoconflict.player.*` dot-separated namespace.

**State encapsulation:** The initial implementation used three separate nullable module-level variables (`sessionId`, `sessionStartTimeMs`, `sessionMatchCount`). The shipped version collapses these into a single `ActiveSession | null` object, making the invariant structural: if `activeSession !== null`, all fields are guaranteed present.

## Outcome

The session baseline now records per-session match depth. This is a required P0 input before the citizenship XP economy launches — it tells the team whether the 100-match threshold is achievable in a reasonable number of sessions for active players.

## Related

- [[systems/analytics]]
- [[systems/flashist-init]]
- [[decisions/sprint-4]]
- [[tasks/session-start-sequence]] — documents the full session-start sequence that this event now precedes
- [[tasks/analytics-p0-yandex-login-status]]
- [[tasks/analytics-p0-game-mode-segmentation]]
- [[tasks/monetization-analytics-spec]]
