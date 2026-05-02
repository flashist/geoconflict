# Flashist Initialization

**Layer**: client
**Key files**: `src/client/flashist/FlashistFacade.ts`, `src/client/Main.ts`, `src/client/yandex-games_iframe.html`, `src/client/OtelBrowserInit.ts`

## Summary

`FlashistFacade` is the client bootstrap for analytics, Yandex SDK access, experiment flags, player identity helpers, and a few shared platform utilities. Its `initializationPromise` is the synchronization point that lets the rest of the client wait for SDK-dependent startup work without duplicating that logic.

## Architecture

### Singleton bootstrap
- `FlashistFacade.instance` lazily constructs a single facade
- The constructor immediately starts `yandexSdkInit()` and `initPlayer()`, configures GameAnalytics in production, fires the session/device/platform/new-vs-returning/day-depth events, and exposes `initializationPromise`

### Ordered initialization
- `_initialize()` is the explicit staged startup sequence
- Step 1: wait up to one second for Yandex SDK readiness so session analytics are not blocked by slow SDK startup
- Step 2: log exactly one Yandex login-status event immediately for guest/unknown fallback cases, or schedule deferred logged-in/guest resolution after player auth
- Step 3: run player init and `loadExperimentFlags()` in parallel with `Promise.allSettled`
- Step 4: call idempotent `logExperimentEvents()` after flags load, leaving a single place for experiment-driven config mutations
- Step 5: best-effort OTEL user tagging via `setOtelUser(name)`

### Experiment flags
- `loadExperimentFlags()` memoizes flag fetching in `yandexInitExperimentsPromise`
- Flags are fetched once from `this.yandexGamesSDK.getFlags()` and stored in `yandexExperimentFlags`
- `logExperimentEvents()` mirrors loaded flags into analytics as `Experiment:{name}:{value}` and is guarded by `hasLoggedExperimentEvents`
- `checkExperimentFlag()` always awaits flag initialization before reading

### Shared platform helpers
- The facade also centralizes current-player name lookup, interstitial ads, language lookup, and URL navigation helpers such as `changeHref()`
- `Main.ts` and multiple UI components use the singleton rather than touching the Yandex SDK directly

## Gotchas / Known Issues

- `initializationPromise` is the safe contract; code that reaches into raw SDK state without awaiting it risks race conditions
- Yandex login-status analytics is intentionally one-shot through `hasLoggedYandexLoginStatus`; removing the guard would double count slow-auth and fallback paths
- Experiment flag fetching and event emission are separately idempotent; removing either guard would duplicate flag fetches or `Experiment:*` analytics events
- Much of the facade is production-sensitive: analytics writes are gated by `DEPLOY_ENV === "prod"`, but session/device/platform events are still invoked through the same helper path
- This class mixes several responsibilities by design; it is more of a startup/service hub than a narrow analytics wrapper

## Related

- [[systems/analytics]] — event conventions and GameAnalytics usage built on top of this facade
- [[tasks/analytics-p0-yandex-login-status]] — Yandex auth-status session enrichment and experiment-event idempotency changes
- [[tasks/yandex-payments-investigation]] — recommends adding memoized Yandex payments/catalog caching into `FlashistFacade`
