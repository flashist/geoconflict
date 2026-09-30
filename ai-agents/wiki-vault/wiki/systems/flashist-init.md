# Flashist Initialization

**Layer**: client
**Key files**: `src/client/Bootstrap.ts`, `src/client/flashist/FlashistFacade.ts`, `src/client/Main.ts`, `src/client/LangSelector.ts`, `src/client/yandex-games_iframe.html`, `src/client/index.html`, `src/client/OtelBrowserInit.ts`, `src/client/SdkLoaderRetry.ts`, `src/client/PlatformDegradedAnalytics.ts`

## Summary

The client now has a single explicit bootstrap entry point. `src/client/Bootstrap.ts` runs analytics/session startup immediately, waits for bounded platform initialization, then dynamically imports `Main.ts` so Lit custom elements cannot upgrade before SDK, player, experiment-flag, and language startup has settled.

`FlashistFacade` remains the shared platform hub for analytics, Yandex SDK access, experiment flags, player identity helpers, language resolution, ads, and URL helpers. Its lazy singleton still exists for compatibility, but construction and initialization are now forced by `Bootstrap.ts` at the start of every app session.

## Architecture

### Three-phase bootstrap

- **Phase 1: immediate startup.** `Bootstrap.ts` constructs `FlashistFacade.instance` and calls `initializeImmediate()`. This consumes pending session-match counts, initializes GameAnalytics in production, fires `Session:Start`, emits device/platform/new-vs-returning/day-depth analytics, and starts session-match tracking. Nothing in this phase waits on external SDKs.
- **Phase 2: bounded platform gate.** `initializePlatform()` runs Yandex script readiness, `YaGames.init()`, player data, experiment flags, and language resolution under a shared `PLATFORM_INIT_DEADLINE_MS` deadline (`5000` ms). Timeout or SDK failure resolves into degraded mode instead of blocking the app. Since task 0019, `initPayments()` (Yandex payments object + session catalog cache) joins the same `Promise.allSettled` batch under the shared deadline — `unavailable` outside Yandex, never throws, re-inits on late SDK recovery. See [[tasks/yandex-payments-implementation]].
- **Phase 3: app load.** Only after the platform gate settles does `Bootstrap.ts` `import("./Main")`, registering all custom elements and calling `startClient()`. `flashist_markGameInitComplete()` then resolves the public game-ready gate used by the templates.

### Game-ready gate

`flashist_waitGameInitComplete()` is now backed by a promise resolved by `Bootstrap.ts` after platform init has settled, the app chunk has loaded, and `Client` has wired the UI. The global `window.flashist_waitGameInitComplete` remains because `src/client/yandex-games_iframe.html` uses it before revealing the loading overlay and calling `LoadingAPI.ready()`.

### Degraded mode

The degraded path is deliberate for SDK failure cases. If the Yandex SDK script fails, `YaGames.init()` rejects, or platform work exceeds the deadline, the session continues with default flags, localStorage username fallback, browser language, and no ads. `Session:PlatformInitTimeout` records deadline cases — **at most once per boot (latched)**, not once per stage. Since task `0328` (built 2026-09-28), `Session:PlatformDegraded:{Cause}` records **why** a Yandex boot degraded (seven causes, first match wins) and whether it followed a match exit, and `Session:PlatformRecovered` records a late flags recovery — see [[tasks/platform-degraded-analytics-event]]. `Player:YandexUnknown` is used for Yandex-platform sessions where auth state cannot be determined by the deadline; `Player:YandexGuest` is reserved for standalone/non-Yandex or actual Yandex guest sessions.

Slow-but-eventually-successful SDK init has a narrow recovery path: once `YaGames.init()` succeeds after the deadline, the facade can still deliver `LoadingAPI.ready()`, fetch experiment flags, and rehydrate the player object. **A rejected or hung `YaGames.init()` still never retries, re-calls or reloads** (`0049`'s locked decision, still in force for `init()`).

🔓 **Since task `0330` (built 2026-09-28, committed `68303d5`, not recorded as released): a failed loader-script DOWNLOAD is retried.** Owner ruling D-1 on `0318` narrowed `0049`'s "no SDK retry" for downloads only. `src/client/SdkLoaderRetry.ts` re-inserts the loader after `onerror` at about +0.5 s and +1.5 s inside the 5 s deadline; if those fail the boot goes degraded at once (about 2 s — owner ruling D-A) and background retries continue at about +5 s / +15 s / +45 s, then stop (5 at most). Only after `onerror`, removing the failed tag first, so exactly one loader ever executes. A background success hands off to the existing late-recovery branch. The outcome is logged as `Session:SdkLoaderRetry:{Recovered|RecoveredLate|GaveUp}`. ⚠️ The inner SDK file failing after the loader's own 3 retries (trigger C) is **not** retried. See [[tasks/sdk-loader-download-retry]].

🔔 **Since task `0329`, late recovery re-checks the citizenship card.** The facade exposes a once-only `whenPlatformRecoveredLate()` signal, fired after the late flags re-fetch and player recovery settle on a degraded boot; a card hidden by missing flags re-reads `citizenship_ui` and reveals only if it is really on (fail-closed kept), waiting until the player is back on the start screen. Proven by unit tests only. See [[tasks/citizenship-card-late-recovery-recheck]].

### Experiment flags

`loadExperimentFlags()` memoizes a bounded flag fetch only when the SDK exists. A no-SDK call is not treated as final, which allows late SDK recovery to fetch flags later. A hung `getFlags()` is raced against the platform deadline so later `checkExperimentFlag()` calls do not hang forever. `logExperimentEvents()` remains idempotent and logs `Experiment:{name}:{value}` only once flags exist.

### App chunk failure recovery

The dynamic import of `Main.ts` is a new network step. `Bootstrap.ts` retries a failed app-chunk load once, then performs one session-latched reload for likely stale content-hashed chunks after a deploy. The latch prevents reload loops.

## Gotchas / Known Issues

- Real Yandex iframe behaviour still needs live/dev-VPS verification after the bootstrap refactor; local Playwright covered standalone, stalled SDK, stub SDK, parent wrapper, chunk-retry, and normal local boot paths.
- The Yandex iframe parent template must not receive the app bundle; otherwise explicit bootstrap would double-fire session/platform init. The refactor excludes its chunks.
- Login-status analytics is intentionally one-shot. Late player rehydration updates helper methods such as `isYandexAuthorized()` and `getCurPlayerName()`, but it does not re-log `Player:Yandex*`.
- `isYandexAuthorized()` and `getYandexUniqueId()` follow the same degraded-mode contract: they resolve to `false`/`null` when player state is unavailable instead of blocking match join. The unique ID is forwarded by [[tasks/yandex-identity-plumbing]].
- Boot-rendered UI keeps degraded values after late SDK recovery unless that UI explicitly re-queries the facade. **The citizenship card now does** (task `0329`, via `whenPlatformRecoveredLate()`); other boot-rendered UI still does not.
- 🚩 **Every match exit is a full page reload** (`changeHref(rootPathname)`), so every return to the menu re-downloads the Yandex SDK and re-runs platform init — one more chance to boot degraded. ~~⚠️ Inferred, **not verified**: the exit also **drops the URL query string**, which Yandex's loader reads its SDK address from; task `0331` (keep the query) is blocked on the owner's read-only probe.~~ *(Superseded 2026-09-29.)* The owner's probe **confirmed** that the old exit dropped the query string — `sdk` present on a first load, gone after a match exit. **Since task `0331`** (built 2026-09-29, shipped in the 2026-09-29 game deploy), `changeHref` **keeps the query string** when navigating to `rootPathname`; the hash is still dropped. ⚠️ Whether `sdk` now survives a match exit **in production** is `0337`'s to check (not reported yet). See [[tasks/match-exit-keeps-query-string]] and [[tasks/citizenship-card-vanishes-investigation]].
- `yaGamesAvailable` is now also a UI contract for the citizenship card: when false, the card suppresses the Yandex login CTA because `openYandexAuthDialog()` cannot work outside a Yandex SDK context. See [[tasks/citizenship-card-guest-cta-no-sdk]].
- Yandex degraded mode is distinct from no-SDK standalone mode, and since task 0049 the client can tell them apart: `FlashistFacade.instance.isYandexDegraded()` (Yandex context present, no SDK/player object) drives a connection-problem citizenship-card state with no login CTA. See [[tasks/degraded-mode-ux-treatment]].
- 🚨 **`windowOrigin` is `origin + pathname`, and it is a document base, not a URL-join base.** It is a `// Flashist Adaptation` — upstream used `origin` alone — and its sibling `rootPathname` is what lets several components navigate "back to the start screen" without leaving the current document. Because the production Yandex entry point is `/yandex-games_iframe.html`, **anything built by concatenating onto `windowOrigin` is suspect in production**; host-root APIs must take a bare root-absolute path instead. Two other consumers send the value as a payload field rather than concatenating — `Cosmetics.ts` (`hostname`) and `AccountModal.ts` (`redirectDomain`) — and in production both are now known to be sending the origin **plus** `/yandex-games_iframe.html`. See [[decisions/windoworigin-url-join-defect]].
- ❓ **The Yandex template claims the platform unconditionally, and off-portal behaviour is UNMEASURED.** `src/client/yandex-games_iframe.html` (line 19) sets `window.flashist_isYandexPlatform = true` **unconditionally**, before the async SDK tag; `src/client/index.html` sets nothing. The constructor sets `yaGamesAvailable = true` when that flag is `true` **or** `window.YaGames` is defined, so the template flag **alone** is sufficient. Consequence: anyone who opens that template outside the Yandex portal iframe — e.g. a private-lobby invite recipient at `https://geoconflict.ru/yandex-games_iframe.html#join=<id>` — **still enters Yandex platform mode**, with SDK init, ads, auth, payments and leaderboards all on the Yandex code path from a page the portal never framed. ⚠️ **What that path actually does off-portal is NOT established** — the SDK may init, degrade, or fail, and whether the bounded-deadline degraded-mode machinery above absorbs it is unknown. **Measuring it is step 1 of task `0199`**; do not assume either outcome. See [[decisions/yandex-invite-portal-boundary]].
- Two independent side bugs found during the bootstrap investigation remain backlog work: the dead `initializeFuseTag` polling loop and `GutterAds.hide()` permanently removing its `userMeResponse` listener. See [[decisions/sprint-backlog]].

## Related

- [[tasks/app-bootstrap-single-entry-point]] — task and findings behind the explicit bootstrap refactor
- [[systems/analytics]] — session, degraded-mode, Yandex auth, and experiment analytics emitted by this bootstrap
- [[systems/localization]] — language code is resolved during platform init before components render
- [[tasks/analytics-p0-yandex-login-status]] — original Yandex auth-status event task, later semantics refined by the bootstrap work
- [[tasks/analytics-p0-session-match-count]] — `consumePendingSessionEnd` and `startSessionMatchTracking` run in immediate bootstrap
- [[tasks/yandex-payments-investigation]] — the investigation that placed payments/catalog caching on the explicit facade gate
- [[tasks/yandex-payments-implementation]] — the shipped `initPayments()` catalog cache and purchase helpers in the boot batch
- [[tasks/degraded-mode-ux-treatment]] — the shipped `isYandexDegraded()` accessor and citizenship-card degraded state
- [[tasks/hide-citizenship-card-flag]] — the 0054 `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` local flag (default OFF) gating the citizenship card ahead of every facade signal
- [[tasks/yandex-identity-plumbing]] — tolerant auth and unique-ID helpers used by the match join path
- [[tasks/citizenship-card-guest-cta-no-sdk]] — citizenship-card use of the Yandex-context signal to avoid a dead login CTA
- [[systems/project-brief]] — degraded mode as a first-class platform state
- [[systems/architecture-overview]] — the three-phase bootstrap in the wider survey
- [[decisions/windoworigin-url-join-defect]] — the `windowOrigin` / `rootPathname` rule and the production defect that established it
- [[decisions/yandex-invite-portal-boundary]] — task `0199`: the unconditional `flashist_isYandexPlatform` flag, and the unmeasured off-portal question it raises
- [[tasks/citizenship-name-change]] — task 0067, whose UI sits behind the `CITIZENSHIP_CARD_ENABLED` flag and has never been seen in a browser
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, whose citizenship-surfaces helper and its **synchronous snapshot** are primed inside `initializePlatform()` and re-primed on late-SDK recovery
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — task `0291`: `isYandexDegraded()` **no longer bypasses** the citizenship-card gate. 🚩 **The degraded state is OBSERVED in production** — an owner-run devtools probe inside the Yandex game frame returned `isYandexDegraded: true` on a signed-in session, 2026-09-21
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`: the card decided once at boot and never re-checked; the ranked triggers and the D-1 ruling
- [[tasks/platform-degraded-analytics-event]] — task `0328`, the degraded-cause and recovered events and the after-match marker
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, the `whenPlatformRecoveredLate()` signal and the card's re-check
- [[tasks/sdk-loader-download-retry]] — task `0330`, the loader download retry (never `init()`)
- [[tasks/citizenship-kill-switch-launch-check]] — task `0238`, the remote `citizenship_ui` kill switch flipped off and on in production, 2026-09-26
- [[tasks/match-exit-keeps-query-string]] — task `0331`: a match exit now keeps the query string (Yandex's `sdk` parameter)
- [[tasks/verified-login-shadow-mode]] — task `0325`: the facade pre-fetches Yandex's signed player data at boot for the profile login
