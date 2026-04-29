# Task — Analytics P0: Session Baseline Enrichment

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. The Yandex login rate determines the real addressable market for citizenship. Session match count is required to validate the 100-match XP threshold before it ships. Neither can be backfilled.

---

## Context

The current session-start sequence fires `Session:Start → Device:Type → Platform:OS → Player:New/Returning` but does not record whether the player is logged into Yandex. The entire citizenship system requires a verified Yandex identity, so if a large fraction of players are guests, the addressable market for citizenship is much smaller than DAU suggests. We need to know this number before citizenship UI launches.

Additionally, we currently have no way to know how many matches a player plays per session. The `Session:Heartbeat` system tells us session duration in 5-minute buckets, but not match count. Match-count-per-session is the input needed to reason about how quickly players progress toward the 100-match citizenship threshold.

---

## What to Build

### Event 1: Yandex login status — add to session-start sequence

Fire one of two mutually exclusive events immediately after `Player:New` / `Player:Returning` in the session-start sequence:

| Enum key | Event string | Condition |
|---|---|---|
| `PLAYER_YANDEX_LOGGED_IN` | `Player:YandexLoggedIn` | Yandex SDK reports the player is authenticated |
| `PLAYER_YANDEX_GUEST` | `Player:YandexGuest` | Yandex SDK reports the player is in guest mode |

Detection: use `FlashistFacade` — Yandex login state is already available there after `_initialize()` completes (the facade checks platform authorization for name lookup). Add a `isYandexLoggedIn(): boolean` helper if one does not already exist, then call it in the session-start sequence.

Updated session-start sequence:
```
Session:Start → Device:[class] → Platform:[os] → Player:New/Player:Returning → Player:YandexLoggedIn/Player:YandexGuest
```

Add both enum keys to `flashistConstants.analyticEvents` and document them in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

### Event 2: Session match count

The goal is to know how many matches a player played in a given session. Because `beforeunload` is unreliable on mobile (iOS does not fire it consistently), use a deferred write pattern: persist session data to `localStorage` and fire the analytics event at the start of the next session.

**Step 1 — Track match count in memory during the session**

In the client session layer (wherever `Game:Start` is fired), increment an in-memory session match counter on each `Game:Start`.

**Step 2 — Persist on tab close (best-effort)**

On `beforeunload` (fire-and-forget, best-effort only):
```ts
localStorage.setItem('geoconflict_pending_session_end', JSON.stringify({
  matchesPlayed: sessionMatchCount,
  sessionStartTime: sessionStartTimestamp,   // set when Session:Start fires
  firedAt: Date.now()
}));
```

**Step 3 — Fire deferred event on next session start**

Early in the session-start sequence, before firing `Session:Start`, check for a pending entry:
```ts
const pending = localStorage.getItem('geoconflict_pending_session_end');
if (pending) {
  const data = JSON.parse(pending);
  FlashistFacade.instance.logEvent(
    flashistConstants.analyticEvents.SESSION_MATCHES_PLAYED,
    data.matchesPlayed
  );
  localStorage.removeItem('geoconflict_pending_session_end');
}
```

| Enum key | Event string | Value |
|---|---|---|
| `SESSION_MATCHES_PLAYED` | `Session:MatchesPlayed` | Integer — matches started in that session |

Add the enum key to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

**Note on alltime match count:** `Session:MatchesPlayed` only covers the current session. A true per-player alltime match count requires the player profile store (Sprint 4 implementation) and is not in scope for this task.

---

## Verification

1. Open the game as a Yandex-logged-in player — confirm `Player:YandexLoggedIn` fires in the analytics dashboard and not `Player:YandexGuest`.
2. Open the game in a fresh Yandex guest session — confirm `Player:YandexGuest` fires and not `Player:YandexLoggedIn`.
3. Play two matches in one session, close the tab, reopen — confirm `Session:MatchesPlayed` fires with value `2` early in the new session start sequence.
4. Play zero matches, close the tab, reopen — confirm `Session:MatchesPlayed` fires with value `0` (the pending entry was written on close).
5. Confirm both new events appear in `ai-agents/knowledge-base/analytics-event-reference.md` with correct enum keys and event strings.
6. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.
