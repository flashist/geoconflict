# Flashist Initialization

**Layer**: client
**Key files**: `src/client/flashist/FlashistFacade.ts`, `src/client/Main.ts`, `src/client/yandex-games_iframe.html`, `src/client/OtelBrowserInit.ts`

## Summary

`FlashistFacade` is the client bootstrap for analytics, Yandex SDK access, experiment flags, player identity helpers, and a few shared platform utilities. Its `initializationPromise` is the synchronization point that lets the rest of the client wait for SDK-dependent startup work without duplicating that logic.

## Architecture

### Singleton bootstrap
- `FlashistFacade.instance` lazily constructs a single facade
- The constructor immediately starts `yandexSdkInit()` and `initPlayer()`, configures GameAnalytics in production, fires the session/device/platform/new-vs-returning events, and exposes `initializationPromise`

### Ordered initialization
- `_initialize()` is the explicit staged startup sequence
- Step 1: wait for `yandexInitPromise`
- Step 2: run player init and `initExperimentFlags()` in parallel with `Promise.allSettled`
- Step 3: leave a single place for experiment-driven config mutations
- Step 4: best-effort OTEL user tagging via `setOtelUser(name)`

### Experiment flags
- `initExperimentFlags()` memoizes its work in `yandexInitExperimentsPromise`
- Flags are fetched once from `this.yandexGamesSDK.getFlags()`, stored in `yandexExperimentFlags`, and immediately mirrored into analytics as `Experiment:{name}:{value}`
- `checkExperimentFlag()` always awaits flag initialization before reading

### Shared platform helpers
- The facade also centralizes current-player name lookup, interstitial ads, language lookup, and URL navigation helpers such as `changeHref()`
- `Main.ts` and multiple UI components use the singleton rather than touching the Yandex SDK directly

## Gotchas / Known Issues

- `initializationPromise` is the safe contract; code that reaches into raw SDK state without awaiting it risks race conditions
- `initExperimentFlags()` is intentionally idempotent through `yandexInitExperimentsPromise`; removing that memoization would duplicate flag fetches and analytics events
- Much of the facade is production-sensitive: analytics writes are gated by `DEPLOY_ENV === "prod"`, but session/device/platform events are still invoked through the same helper path
- This class mixes several responsibilities by design; it is more of a startup/service hub than a narrow analytics wrapper

## Related

- [[systems/analytics]] — event conventions and GameAnalytics usage built on top of this facade
