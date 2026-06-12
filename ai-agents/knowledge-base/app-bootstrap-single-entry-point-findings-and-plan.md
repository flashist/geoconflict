# App Bootstrap — Single Entry Point: Findings & Refactoring Plan

**Date:** 2026-06-12
**Status:** IMPLEMENTED 2026-06-12 (uncommitted, on `dev` working tree) and verified locally — see §6. Pending: review by Mark + dev-VPS testing of the real Yandex iframe path.
**Scope:** `src/client/` bootstrap path only. No game-logic (`src/core/`) changes.

---

## 1. Problem statement

The client has **no single, explicit starting point**. Component creation is driven by when custom elements upgrade in the DOM, so initialization order is *emergent* — a side effect of webpack import order, HTML template contents, and TypeScript compiler details — rather than an explicit sequence. External-SDK initialization (Yandex Games SDK, experiment flags, player data, language) races against component creation, held together by scattered per-component gates and conventions.

This has been survivable so far, but every new external-SDK integration increases the risk of race-condition bugs introduced by innocent refactors (reordering imports, editing HTML templates, adding code splitting).

**Goal:** one explicit bootstrap sequence that finishes all "starting/initial/preparation" work (SDK init, experiment flags, user data, language) *before* any component code runs, with a bounded wait and a defined failure policy.

---

## 2. How initialization actually works today (verified findings)

The investigation combined static analysis of the bundle/import graph with **live instrumentation of production (geoconflict.ru)** via Playwright.

### 2.1 The boot mechanism

- The bundle is injected by `HtmlWebpackPlugin` (v5 defaults) as **`defer` scripts** at the end of `<head>` (`webpack.config.js:280-312`). Module evaluation therefore happens after the entire HTML body is parsed — all ~46 custom-element tags already exist in the DOM, un-upgraded, before any app code runs.
- There are **68 `@customElement` registrations** in `src/client/`, all statically reachable from the single entry `src/client/Main.ts` (no dynamic `import()` exists anywhere in `src/client/`).
- `customElements.define()` upgrades already-parsed elements **synchronously, inside the define call** — constructors and `connectedCallback`s run mid-bundle-evaluation, **in Main.ts import order, not DOM order**, all *before* `DOMContentLoaded`. (Verified empirically with a browser repro.)
- Both HTML templates (`src/client/index.html`, `src/client/yandex-games_iframe.html`) contain the identical set of custom-element tags. The yandex template (the one served in production) additionally loads the Yandex SDK as a **synchronous, parse-blocking** script in `<head>` (`yandex-games_iframe.html:16`).

### 2.2 The half-built gate that already exists

- `Main.ts:974` registers a `DOMContentLoaded` handler that does `await flashist_waitGameInitComplete()` before constructing `Client` and wiring the start screen.
- The yandex template's inline window-load handler awaits the same `window.flashist_waitGameInitComplete()` global, then calls `yandexGamesReadyCallback()` (Yandex `LoadingAPI.ready()`) and removes the `flashist-preload` loading overlay.
- So the *concept* of an init gate exists — the problem is everything that escapes it (see 2.3) and the fragility of the gate itself (see 2.4).

### 2.3 What escapes the gate — real work at element-upgrade time

All of this runs during bundle evaluation, before any gate:

| Component | Work done at upgrade time |
|---|---|
| `UsernameInput` (`UsernameInput.ts:39-46`) | async `connectedCallback` awaits SDK player name (`getCurPlayerName()`); until it resolves, username is `""` while `isValid()` returns `true` |
| `MatchmakingButton` (`Matchmaking.ts:156-160`) | fires a `/api/env` network fetch during element upgrade |
| `GameStartingModal`, `WinModal`, `EmailSubscribeModal` | fire-and-forget experiment-flag reads (`void this.loadCtaFlags()` pattern, no `.catch`) |
| `LangSelector` (`LangSelector.ts:93-103`) | kicks off language resolution; creates the `langReadyPromise` latch in `connectedCallback` |
| `PublicLobby` (`PublicLobby.ts:59-69`), `CitizenshipCard` (`CitizenshipCard.ts:42-71`) | each independently re-implements the gate with its own `flashist_waitGameInitComplete().then(...)` |

### 2.4 FlashistFacade construction is a lottery

`FlashistFacade` — owner of ALL external-SDK init (YaGames.init, player data, experiment flags, GameAnalytics, `Session:Start`) — is a **lazy singleton** (`FlashistFacade.ts:281-287`), constructed by whichever code path touches `.instance` first.

The strongest illustration of the problem came from the investigation itself: **three independent analyses gave three different answers** about who constructs it first — two static candidates (`CitizenshipCard` via the `Main.ts:19` import; `LangSelector` via the Utils import chain) — while **live instrumentation of the deployed prod build showed a third**: the singleton was constructed at t≈305ms during the `email-subscribe-modal` upgrade, before `lang-selector` was even defined. Nobody can reliably predict who kicks off the SDK/analytics/session boot.

Its constructor (`FlashistFacade.ts:300-397`) has heavy side effects whose *timing* therefore varies: GameAnalytics init + `Session:Start` (prod only), device/platform/new-vs-returning analytics, days-played analytics, session-match tracking, and kicking off the async `_initialize()` chain.

### 2.5 Fragilities of the current gate (production risks)

1. **No timeout on `YaGames.init()`.** The 1s `YANDEX_SDK_INIT_TIMEOUT_MS` (`FlashistFacade.ts:276,444-452`) only selects which login-status *analytics event* fires. The actual gate (`initializationPromise` → `Promise.allSettled` at `:417-420`) awaits promises that internally `await this.yandexInitPromise` with **no bound**. If the SDK hangs → **permanent loading screen** in the production iframe.
2. **`YaGames.init()` rejection has two divergent fatal paths** depending on whether it rejects before or after the 1s race: (a) before → `initializationPromise` rejects → unhandled rejection in the `DOMContentLoaded` handler, `Client` never constructed; (b) after → `_initialize` resolves (allSettled absorbs it), but `getLanguageCode()` rejects → `LangSelector.initializeLanguage` dies before `langReadyPromiseResolve()` → gate hangs forever. Both = dead app, no error UI.
3. **Unguarded DOM dereference in the gate itself.** `flashist_waitGameInitComplete` (`FlashistFacade.ts:929-941`) does `document.querySelector("lang-selector").langReadyPromise` with no null/upgrade guard; `langReadyPromise` only exists after `connectedCallback` runs. Holds today purely by convention (defer script + element present in both templates + no code splitting).
4. **Safety by compiler accident.** The `FlashistFacade ↔ LangSelector` circular import is survivable only because the import is *type-only* and elided by ts-loader. A browser repro verified that a runtime version TDZ-crashes (`ReferenceError: Cannot access 'FlashistFacade' before initialization`). Adding any runtime use of `LangSelector` inside `FlashistFacade.ts`/`Utils.ts` (or enabling `verbatimModuleSyntax`) would hang the boot with no surfaced error.
5. **Parse-blocking SDK script.** `sdk.js` is a synchronous `<head>` script in the prod template — if Yandex's CDN stalls, HTML parsing itself stalls, before any of our code can run a timeout.
6. **`translateText` masks ordering bugs** (`Utils.ts:103-122`): silently returns the raw key when called before language is ready — components rendering early show untranslated keys instead of failing visibly.
7. **`Client.initialize()` / `GameRenderer.createRenderer` wire everything via ~25 `document.querySelector` lookups** — some hard-throw, some warn-then-dereference-anyway. Anything that delays a component's define past wiring time flips warnings into crashes.

### 2.6 Side findings — separate bugs (candidates for their own tasks)

These were discovered during the investigation and are **not** fixed by the bootstrap refactor:

1. **`initializeFuseTag` polls forever** (`Main.ts:950-970`): the 100ms `setInterval` waits for `window.fusetag`, but the fuse.js script is commented out in **both** HTML templates — the predicate can never become true, the interval never clears. Dead code + perpetual timer in every session.
2. **`GutterAds.hide()` permanently removes its `userMeResponse` listener**, and `hide()` runs on every game start / lobby leave. After the first game, the element (still connected) never reacts to login-state changes again; re-subscription only happens in `connectedCallback`, which doesn't re-run.
3. **`userMeResponse` is a fire-once event with no replay** (`Main.ts:405-430`): any consumer subscribing after `Client.initialize()` dispatches it (synchronously, for logged-out users) permanently misses login state. Holds today only because all subscribers register at upgrade time, pre-DOMContentLoaded.
4. **`getServerConfigFromClient` has no in-flight dedup** (`src/core/configuration/ConfigLoader.ts:29-33`): concurrent early callers each issue their own `/api/env` fetch.
5. **`yandex-games_iframe-parent.html` receives the full app bundle** — its `HtmlWebpackPlugin` instance has no chunks filter. Today merely wasteful; becomes an active double-init bug after this refactor (see §4, "gotcha").

---

## 3. Agreed decisions (from discussion with Mark, 2026-06-12)

1. **Failure policy: degraded mode** (option a). On SDK init failure or timeout: proceed with default flags, localStorage username, `navigator.language`, no ads — essentially the path standalone `index.html` already exercises — plus an analytics event so frequency is measurable. No error/retry screen, no infinite blocking.
2. **Blocking set stays as-is:** SDK init → player data ∥ experiment flags → language. No reserved slot for future citizenship auth — a correctly built gate makes adding a blocking step a one-line change later.
3. **Analytics timing resembles current behavior.** `Session:Start` and other no-wait analytics fire at the very beginning, before the gate's blocking logic. This leads to the **two-part split of FlashistFacade init**:
   - **Part 1 (immediate, synchronous, no waiting):** analytics initialization, device/platform info, session tracking.
   - **Part 2 (async, gated, bounded):** Yandex SDK init, user data, experiment flags, language. The gate blocks on part 2 only.
   - Verified: the current constructor already has this seam — `FlashistFacade.ts:308-394` is the synchronous part 1 block; `:305-306` + `:396` kick off part 2. The split is mostly mechanical extraction.
4. **One PR** (split into two later only if it turns out too problematic).
5. **`index.html` (standalone) is unused now but must remain viable** for a future Yandex-independent version. The bootstrap's platform detection makes standalone work by construction (it is just the degraded path taken instantly).
6. **No DI/context refactor.** Singleton stays; the bootstrap just makes its construction explicit and ordering guaranteed.

---

## 4. Proposed design

### `bootstrap.ts` — new webpack entry (replaces `Main.ts` as entry at `webpack.config.js:179`)

```
Phase 1 — synchronous, fires immediately:
    explicit FlashistFacade construction
    + extracted no-wait block (Session:Start first, then device/platform/
      player analytics, session-match tracking, days-played)
    (window error handlers stay at module scope, as today)

Phase 2 — async, bounded — THE GATE:
    platform detection (YaGames present?) — standalone skips SDK legs (degraded path)
    → SDK script readiness (sdk.js becomes async + readiness promise)
    → YaGames.init()
    → in parallel: player data + experiment flags
    → language code (Yandex SDK; fallback navigator.language)
    Each leg bounded by a single overall deadline (~5s, named constant).
    On expiry/rejection: resolve into DEGRADED MODE
    (default flags, localStorage username, navigator.language, no ads),
    fire new analytics event (add to enum + analytics-event-reference.md),
    and continue. The existing 1s race keeps its analytics-only role.

Phase 3 — await import("./Main"):
    component modules evaluate, all ~46 tags upgrade —
    with every init guarantee already settled.
    Then Client construction + initialize() (direct call, no DOMContentLoaded listener).
    Only after this resolve the public gate promise.
```

Key property: ordering becomes **structural instead of conventional** — components *cannot* race the init because their code has not been evaluated yet. HTML templates keep their static markup (tags sit inert as unknown elements until upgrade); webpack code-splits the `Main` chunk automatically; `@customElement` decorators keep working unchanged.

### FlashistFacade restructure

- Constructor becomes cheap; explicit `initialize()` split into the two parts above, called by bootstrap.
- The lazy `.instance` getter **stays** for compatibility — but by the time any component code runs, construction + init are guaranteed done.
- `flashist_waitGameInitComplete` becomes an alias for the bootstrap gate promise (resolving after Phase 3): no DOM dereference, no `lang-selector` coupling. The `window.flashist_waitGameInitComplete` global is kept — the yandex template's inline load handler depends on it; its contract ("resolves when the game is fully ready") is preserved and strengthened.

### LangSelector simplification

- Translations are **bundled, not fetched** (`LangSelector.loadLanguage` reads an in-memory `languageMap`) — only the language *code* is SDK-gated. Phase 2 resolves the code; `LangSelector` consumes the already-resolved value.
- Delete the `langReadyPromise` / `langReadyPromiseResolve` latch machinery entirely.
- This also kills the `translateText` raw-key flash: language is ready before any component renders.

### Templates (both files, kept in sync)

- `yandex-games_iframe.html`: `sdk.js` switches from parse-blocking sync script to `async` with an explicit readiness promise (onload/onerror hook). **Required** for the degraded-mode policy to be complete — otherwise a hung Yandex CDN stalls parsing before any timeout logic can run.
- Inline load handler: unchanged contract (still awaits `window.flashist_waitGameInitComplete()`, then `yandexGamesReadyCallback()`, then removes `flashist-preload`).
- **Gotcha:** `yandex-games_iframe-parent.html` must get a `chunks: []`-style exclusion in its `HtmlWebpackPlugin` instance. Today the wrapper page receives the full bundle but never constructs the facade (no custom tags → lazy getter never touched). With an *explicit* bootstrap it would double-fire `Session:Start` and SDK init.

### Known fallout to handle in the same PR

- `Main.ts`'s `DOMContentLoaded` listener → direct call (the event will have long fired when the `Main` chunk evaluates after the async gate).
- Per-component re-gates (`PublicLobby`, `CitizenshipCard`) become awaits on an already/soon-resolved promise — harmless; simplify where trivial.
- Anything relying on "upgrade happens before DOMContentLoaded": the fire-once `userMeResponse` dispatch ordering, `instanceof` checks in `Client.initialize` (`Main.ts:269-271` hard-throws on un-upgraded `gutter-ads`).
- Loading UX: no new blank screen — the existing `flashist-preload` overlay (Loading_Icon.gif) stays up during the gate, which is also what Yandex expects until `LoadingAPI.ready()`.

---

### Discovery made during implementation: the `load`-event coupling

The yandex template's reveal handler (remove `flashist-preload`, call `LoadingAPI.ready()`) was bound to `window` `load`. The `load` event **waits for the async SDK script** — so with a stalled Yandex CDN, the bootstrap deadline would let the game start in degraded mode, but the loading overlay would stay up indefinitely anyway (verified live with a stalled-route test: `page.goto` never reached `load`). Fixed by binding the handler to `DOMContentLoaded` instead, which fires after the deferred bundle evaluates (so the `window.flashist_waitGameInitComplete` global is guaranteed to exist) but does NOT wait for pending async scripts. Minor side effect: the overlay now lifts at gate-resolve time without waiting for all images/styles — acceptable vs. an infinite overlay.

## 5. Verification plan

1. `npm run dev` + Playwright: assert full boot sequence order — Phase 1 analytics → gate → component upgrades → `Client.initialize` → preload removal / `LoadingAPI.ready()`.
2. Degraded path: simulate SDK absence (standalone `index.html` route) and SDK hang (block `sdk.js`) — app must boot within the deadline with fallbacks active and the new analytics event fired.
3. Yandex iframe path on dev: normal boot, language from SDK, flags loaded, username from SDK.
4. Confirm `yandex-games_iframe-parent.html` no longer evaluates the app bundle.
5. Both HTML templates updated in sync; `npm test`; `npm run lint`.
6. Watch for analytics funnel shifts after release: `Session:Start` timing moves slightly earlier and becomes deterministic; `Player:Yandex:*` login-status events' relation to the 1s window may shift.

---

## 6. Verification results (2026-06-12, local dev server + Playwright)

All paths verified on the implemented refactor:

1. **Yandex template, normal local boot** (sdk.js loads but defines no `YaGames` outside a real iframe): exact designed sequence observed in console — Phase 1 analytics (`Session:MatchesPlayed` → `Device` → `Platform` → `Player:Returning/New` → `Player:DaysPlayed`) → `Player:YandexGuest` → degraded language → app chunk loads → Client wires → gate resolves → overlay lifts. 779 translations loaded, UI in Russian, no raw keys.
2. **First-time player**: tutorial auto-launched through the new bootstrap — `Player:New` → `Tutorial:Started` → lobby join → `Worker:InitSuccess` → `Game:Start` → first tooltip rendered.
3. **Standalone `index.html`** (no SDK script, no globals): instant degraded boot, `yaGamesAvailable: false`, start screen interactive.
4. **SDK CDN stalled forever** (Playwright route interception): overlay lifted at **5.3s** (the 5s deadline + app load); `Session:PlatformInitTimeout` fired at exactly +5001ms; `Player:YandexUnknown` (correct "slow Yandex" status); start screen fully interactive in degraded mode.
5. **Parent wrapper template**: receives no scripts (no double init).
6. `npm test`: 66 suites / 485 tests pass. `eslint` clean on all changed files. `build-prod` compiles; minified inline handshake scripts verified intact in prod HTML.

NOT yet verified (requires real Yandex iframe / dev VPS): real `YaGames.init()` path — SDK language, player name, experiment flags, `LoadingAPI.ready()` timing under Yandex moderation.

### Adversarial review findings (all fixed same day)

A 4-lens multi-agent review with adversarial verification confirmed 6 real issues in the first implementation; all were fixed and re-verified live:

1. **[major] App-chunk load failure stranded the overlay forever.** The dynamic `import("./Main")` is a new network fetch seconds after page load; a redeploy swapping content-hashed chunks (or a network blip) rejected it and nothing resolved the gate. Fixed in `Bootstrap.ts`: one import retry (webpack 5 allows re-attempting failed chunk loads), then a one-shot `location.reload()` guarded by a sessionStorage latch (cleared on successful boot); post-gate failures (e.g. tutorial launch) only log. Verified live: 404 → retry 404 → self-reload → boot.
2. **[major] `LoadingAPI.ready()` never reached Yandex when the SDK settled after the gate** (degraded-then-recovered path; the template's reveal handler runs once, guarded on `yandexGamesSDK`). Fixed: `yandexSdkInit` chains `flashist_waitGameInitComplete().then(() => yandexGamesReadyCallback())` after the late SDK assignment, with a once-latch in `yandexGamesReadyCallback` so ready() fires exactly once.
3. **[minor] Worst-case blocking was ~10s, not the documented 5s** (two sequential 5s races). Fixed: one shared `deadlinePromise` across both stages.
4. **[minor] Experiment cohort events permanently suppressed when flags settled after the deadline** (`hasLoggedExperimentEvents` latched while the fetch was in flight, while late flags were still applied to the UI — silently excluding the slow-network cohort from experiment analytics). Fixed: latch only sets once flags exist + cohort logging chained on the actual settle.
5. **[minor] `Player:YandexGuest` could be logged for an authorized player** when `getPlayer()` outlasted the deadline (status read off the force-resolved deferred). Fixed: login-status analytics awaits the real `initPlayer()` promise (non-blocking, analytics-only).
6. **[minor] The 1s `Player:Yandex*` window included sdk.js download time** after the sync→async script change, skewing the metric toward `Unknown` on slow CDNs. Fixed: the 1s window now starts after script readiness, restoring the pre-refactor meaning (YaGames.init latency only); a never-loading script falls through to the deadline race → `Unknown`.

Post-fix verification: lint clean, 485 tests pass, normal boot + stalled-SDK boot (5.3s) + chunk-404 recovery all verified live with Playwright.

### External (Codex) review findings (both confirmed and fixed, 2026-06-13)

7. **[medium] Fast SDK failures were classified as `Player:YandexGuest`.** sdk.js `onerror` or a fast `YaGames.init()` rejection landed in the `sdkReady && !yandexGamesSDK` branch, which logged Guest even on the Yandex platform — platform failures indistinguishable from real guests. Fixed: the branch now logs `yaGamesAvailable ? "unknown" : "guest"`, reserving Guest for standalone/non-Yandex contexts (the line-501 slow-failure pattern applied consistently). Note: the `onerror` sub-case was misclassified pre-refactor too (the old code had no platform flag and couldn't tell); the init-rejection sub-case previously crashed the boot entirely.
8. **[medium] A no-SDK experiment-flags result was memoized as final.** On the deadline path, `loadExperimentFlags` memoized a fetch that ran before the SDK arrived; a late-recovered SDK then delivered `LoadingAPI.ready()` but flags stayed `undefined` all session (gated surfaces checked at `show()`-time stayed disabled; cohort events never fired). Fixed: `loadExperimentFlags` no longer memoizes when `yandexGamesSDK` is absent, and the late-recovery chain in `yandexSdkInit` also calls `initExperimentFlags()` (no-op on the normal path; the `logExperimentEvents` latch dedupes). Decision: player data is NOT refetched on late recovery — `openYandexAuthDialog` already re-fetches the player itself, and boot-time consumers resolved with the localStorage fallback and never re-ask.

Verified live with Playwright: aborted sdk.js → `Player:YandexUnknown` (no Guest); stub SDK with `init()` resolving at 6.5s → degraded boot at 5.3s, then `LoadingAPI.ready()` delivered, `getFlags()` called, and `Experiment:test_flag:enabled` cohort event fired on recovery.

### External (Codex) review, second round (both confirmed and fixed, 2026-06-13)

9. **[medium] Hung `getPlayer()` suppressed the `Player:Yandex*` status event.** A regression introduced by the item-5 fix: `resolveYandexLoginStatus` awaited the real `initPlayer()` promise with no bound, so a never-settling `getPlayer()` meant a booted session emitted zero login-status events (pre-refactor, a booted session guaranteed a settled `getPlayer()`). Fixed — and simplified relative to the item-5 fix: await only the deadline-bounded deferred and map "no player object" → `Player:YandexUnknown`. Trade-offs accepted: a slow-but-settling `getPlayer()` tail now logs `Unknown` at the deadline instead of an accurate value later (guaranteed exactly-one honest event beats sometimes-missing accurate one), and a *rejected* `getPlayer()` now logs `Unknown` instead of the historical `Guest`.
10. **[medium, partially correct] Late SDK recovery did not rehydrate the player object** — revising item 8's "no player refetch" decision. The reviewer's impact claim was overstated (the citizenship card is hidden by the boot-time *flag* check on this path regardless of player state, and the only post-boot caller self-heals via `openYandexAuthDialog`), and their "non-final player contract" suggestion would hang boot-time consumers (`UsernameInput` awaits `getCurPlayerName` at upgrade). But with the Player Profile Store (s4) about to multiply post-recovery callers, and flags already self-healing, the asymmetry was hard to justify. Fixed minimally: the late-recovery chain in `yandexSdkInit` rehydrates `yandexSdkPlayerObject` (chained on the boot `initPlayer()` settle so the normal path structurally never duplicates `getPlayer()`) + sets the OTEL user. No consumer notifications; boot-rendered UI (username input) intentionally keeps its degraded values; the status event is not re-logged (latched).

Verified live with Playwright: hung `getPlayer()` → boot at 5.3s, exactly one `Player:YandexUnknown`; late SDK (6.5s) with authorized player → boot at 5.3s with the single `Unknown` event, then post-recovery `isYandexAuthorized() === true` and `getCurPlayerName() === "TestUser"`, with `ready()` + flags recovery intact.

### External (Codex) review, third round (confirmed and fixed, 2026-06-13)

11. **[medium] Hung `getFlags()` was memoized unboundedly.** With the SDK ready but `getFlags()` never settling, the gate proceeded at the deadline but `loadExperimentFlags` had memoized the pending fetch — every later `checkExperimentFlag()` awaited it forever (hung `show()`-paths; `CitizenshipCard` reached neither its enabled nor its hidden branch, leaving an empty flex child / layout gap). Fixed: the `getFlags()` call inside `fetchExperimentFlags` is raced against `PLATFORM_INIT_DEADLINE_MS`; on timeout it rejects into the existing catch (error logged to analytics), flags stay `undefined` (defaults), and the memoized promise settles. Deliberately NOT clearing the memo for a refetch — one bounded attempt, then the session lives with defaults.

**Product stance confirmed by Mark (2026-06-13):** if the SDK fails (script load rejected, or `YaGames.init()` rejected), the session plays as if there is no SDK, permanently — no retries, no reload. The code already implements this: both failure paths exit `yandexSdkInit` with no recovery. The late-recovery chain (ready()/flags/player) triggers ONLY when `YaGames.init()` eventually *succeeds* (slow network), never on failure.

## 7. Suggested task split (for the producer)

- **Main task:** the bootstrap refactor as described in §4 (one PR — agreed).
- **Separate small tasks (independent bugs, §2.6):**
  1. Remove dead `initializeFuseTag` polling loop (or restore fuse.js if it is supposed to be active).
  2. Fix `GutterAds` permanently unsubscribing from `userMeResponse` after first `hide()`.
  3. (Optional) Add in-flight dedup to `getServerConfigFromClient`.
  4. (Optional, absorbed by main task) `userMeResponse` replay-for-late-subscribers — re-check whether still needed after the bootstrap lands.
