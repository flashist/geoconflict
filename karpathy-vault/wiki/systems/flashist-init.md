# Flashist Initialization

**Layer**: client
**Key files**: `src/client/Bootstrap.ts`, `src/client/flashist/FlashistFacade.ts`, `src/client/Main.ts`, `src/client/LangSelector.ts`, `src/client/yandex-games_iframe.html`, `src/client/index.html`, `src/client/OtelBrowserInit.ts`

## Summary

The client now has a single explicit bootstrap entry point. `src/client/Bootstrap.ts` runs analytics/session startup immediately, waits for bounded platform initialization, then dynamically imports `Main.ts` so Lit custom elements cannot upgrade before SDK, player, experiment-flag, and language startup has settled.

`FlashistFacade` remains the shared platform hub for analytics, Yandex SDK access, experiment flags, player identity helpers, language resolution, ads, and URL helpers. Its lazy singleton still exists for compatibility, but construction and initialization are now forced by `Bootstrap.ts` at the start of every app session.

## Architecture

### Three-phase bootstrap

- **Phase 1: immediate startup.** `Bootstrap.ts` constructs `FlashistFacade.instance` and calls `initializeImmediate()`. This consumes pending session-match counts, initializes GameAnalytics in production, fires `Session:Start`, emits device/platform/new-vs-returning/day-depth analytics, and starts session-match tracking. Nothing in this phase waits on external SDKs.
- **Phase 2: bounded platform gate.** `initializePlatform()` runs Yandex script readiness, `YaGames.init()`, player data, experiment flags, and language resolution under a shared `PLATFORM_INIT_DEADLINE_MS` deadline (`5000` ms). Timeout or SDK failure resolves into degraded mode instead of blocking the app.
- **Phase 3: app load.** Only after the platform gate settles does `Bootstrap.ts` `import("./Main")`, registering all custom elements and calling `startClient()`. `flashist_markGameInitComplete()` then resolves the public game-ready gate used by the templates.

### Game-ready gate

`flashist_waitGameInitComplete()` is now backed by a promise resolved by `Bootstrap.ts` after platform init has settled, the app chunk has loaded, and `Client` has wired the UI. The global `window.flashist_waitGameInitComplete` remains because `yandex-games_iframe.html` uses it before revealing the loading overlay and calling `LoadingAPI.ready()`.

### Degraded mode

The degraded path is deliberate and permanent for SDK failure cases. If the Yandex SDK script fails, `YaGames.init()` rejects, or platform work exceeds the deadline, the session continues with default flags, localStorage username fallback, browser language, and no ads. `Session:PlatformInitTimeout` records deadline cases. `Player:YandexUnknown` is used for Yandex-platform sessions where auth state cannot be determined by the deadline; `Player:YandexGuest` is reserved for standalone/non-Yandex or actual Yandex guest sessions.

Slow-but-eventually-successful SDK init has a narrow recovery path: once `YaGames.init()` succeeds after the deadline, the facade can still deliver `LoadingAPI.ready()`, fetch experiment flags, and rehydrate the player object. Rejected SDK init does not retry or reload.

### Experiment flags

`loadExperimentFlags()` memoizes a bounded flag fetch only when the SDK exists. A no-SDK call is not treated as final, which allows late SDK recovery to fetch flags later. A hung `getFlags()` is raced against the platform deadline so later `checkExperimentFlag()` calls do not hang forever. `logExperimentEvents()` remains idempotent and logs `Experiment:{name}:{value}` only once flags exist.

### App chunk failure recovery

The dynamic import of `Main.ts` is a new network step. `Bootstrap.ts` retries a failed app-chunk load once, then performs one session-latched reload for likely stale content-hashed chunks after a deploy. The latch prevents reload loops.

## Gotchas / Known Issues

- Real Yandex iframe behaviour still needs live/dev-VPS verification after the bootstrap refactor; local Playwright covered standalone, stalled SDK, stub SDK, parent wrapper, chunk-retry, and normal local boot paths.
- The Yandex iframe parent template must not receive the app bundle; otherwise explicit bootstrap would double-fire session/platform init. The refactor excludes its chunks.
- Login-status analytics is intentionally one-shot. Late player rehydration updates helper methods such as `isYandexAuthorized()` and `getCurPlayerName()`, but it does not re-log `Player:Yandex*`.
- Boot-rendered UI keeps degraded values after late SDK recovery unless that UI explicitly re-queries the facade.
- Two independent side bugs found during the bootstrap investigation remain backlog work: the dead `initializeFuseTag` polling loop and `GutterAds.hide()` permanently removing its `userMeResponse` listener. See [[decisions/sprint-backlog]].

## Related

- [[tasks/app-bootstrap-single-entry-point]] — task and findings behind the explicit bootstrap refactor
- [[systems/analytics]] — session, degraded-mode, Yandex auth, and experiment analytics emitted by this bootstrap
- [[systems/localization]] — language code is resolved during platform init before components render
- [[tasks/analytics-p0-yandex-login-status]] — original Yandex auth-status event task, later semantics refined by the bootstrap work
- [[tasks/analytics-p0-session-match-count]] — `consumePendingSessionEnd` and `startSessionMatchTracking` run in immediate bootstrap
- [[tasks/yandex-payments-investigation]] — future payments/catalog caching should build on the explicit facade gate
