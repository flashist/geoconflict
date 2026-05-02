# Task — Analytics P0: Yandex Login Status Event

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. The Yandex login rate determines the real addressable market for citizenship. If a large fraction of players are guests, the addressable market is much smaller than DAU suggests. This cannot be backfilled.

---

## Context

The session-start sequence fires `Session:Start → Device:Type → Platform:OS → Player:New/Returning` but does not record whether the player is logged into Yandex. The citizenship system requires a verified Yandex identity — guest players cannot earn or purchase citizenship. Knowing the guest fraction before citizenship UI launches is required to validate the feature's reach.

**Complexity discovered during implementation:** The Yandex player object is not synchronously available at session-start time. `_initialize()` only awaits the SDK bootstrap promise, but player auth (`yandexSdkPlayerObject`) resolves as a separate async step and may not be ready when the session baseline must fire. The implementation cannot simply block the session-start sequence on player auth resolution — a slow or failing Yandex SDK would suppress `Session:Start` entirely.

The solution:
- Give the Yandex SDK a short window (`YANDEX_SDK_INIT_TIMEOUT_MS = 1000ms`) to become ready
- If it resolves in time: fire session baseline with no login status, then schedule the accurate status event asynchronously after player auth completes
- If it times out but Yandex is available: fire `Player:YandexUnknown` immediately (SDK was there but slow), no deferred re-emit
- If Yandex SDK is not available at all (non-Yandex platform): fire `Player:YandexGuest` immediately

A third state `Player:YandexUnknown` is required (not in original spec) for the degraded-SDK case.

---

## What to Build

### Enum keys (add to `flashistConstants.analyticEvents`)

| Enum key | Event string | Condition |
|---|---|---|
| `PLAYER_YANDEX_LOGGED_IN` | `Player:YandexLoggedIn` | Player is authenticated with Yandex |
| `PLAYER_YANDEX_GUEST` | `Player:YandexGuest` | Player is in Yandex guest mode, or Yandex SDK unavailable |
| `PLAYER_YANDEX_UNKNOWN` | `Player:YandexUnknown` | Yandex SDK available but auth state could not be determined within the timeout |

### `isYandexLoggedIn(): boolean` on `FlashistFacade`
Reads `yandexSdkPlayerObject.isAuthorized()`. Returns `false` if the player object is absent or throws.

### `waitForYandexSdkForSession(): Promise<boolean>` on `FlashistFacade`
Races `yandexInitPromise` against a `YANDEX_SDK_INIT_TIMEOUT_MS` timeout. Returns `true` if SDK became ready in time, `false` if it timed out.

### `resolveYandexLoginStatus(): Promise<YandexLoginStatus>` on `FlashistFacade`
Awaits `yandexSdkInitPlayerPromise`, then calls `isYandexLoggedIn()`. Returns `"logged-in"` or `"guest"`.

### `logYandexLoginStatusEvent(status)` — idempotent, guarded by `hasLoggedYandexLoginStatus`
Fires the correct analytics event and sets the guard. Cannot fire twice per session.

### Session-start sequence integration
Updated sequence in `_initialize()`:
```
consumePendingSessionEnd → Session:Start → startSessionMatchTracking → Device:[class] →
Platform:[os] → Player:New/Player:Returning → Player:YandexLoggedIn/Guest/Unknown (if known immediately)
```
If login status is not known immediately (SDK ready, player auth pending), fire session baseline without it, then call `scheduleYandexLoginStatusEvent()` to fire the accurate status once auth resolves.

### Experiment flags prerequisite
`initExperimentFlags()` must be split into `loadExperimentFlags()` (fetches, does not emit) and `logExperimentEvents()` (emits, idempotent). Required so the deferred Yandex login path cannot trigger duplicate experiment event firing.

---

## Verification

1. Open the game as a Yandex-authenticated player — confirm `Player:YandexLoggedIn` fires in the analytics dashboard and not `Player:YandexGuest` or `Player:YandexUnknown`.
2. Open the game in a Yandex guest session — confirm `Player:YandexGuest` fires.
3. Simulate a slow Yandex SDK (stub `yandexInitPromise` to resolve after 2000ms) — confirm `Player:YandexUnknown` fires without delaying `Session:Start`.
4. Confirm `Player:YandexLoggedIn/Guest/Unknown` fires exactly once per session — no duplicate events on slow SDK paths.
5. Confirm experiment events (`Experiment:*`) do not fire twice when the deferred login path is taken.
6. Confirm all three enum keys appear in `ai-agents/knowledge-base/analytics-event-reference.md`.
7. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.
