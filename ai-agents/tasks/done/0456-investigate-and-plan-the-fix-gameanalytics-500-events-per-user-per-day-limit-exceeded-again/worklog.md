# 0456 — worklog

## Pre-pass (plan §2.0) — 2026-10-14, fkit-coder (Build worker, part A, spawned by `fkit-sprint-ship-loop`)

All code read at production tag **`0.0.164`** via `git show 0.0.164:<path>` (working tree was clean; the
plan's §2.0 line numbers were working-tree numbers and are corrected to tag numbers below). Labels:
**[code]** = code fact at the tag, file:line · **[prior obs]** = a dashboard figure recorded earlier by
`0224`/`0230`, *not* re-read here · **[inference]** = my reading, not proven. No secrets: the GameAnalytics
keys are cited by location only.

### Corrections / confirmations of the plan's §2.0 facts
- **[code] Send path** is `src/client/flashist/FlashistFacade.ts:543-566` at the tag (plan said `:578-600`, a
  working-tree number). One `GameAnalytics.addDesignEvent` per call, gated on `DEPLOY_ENV === "prod"`.
- **[code] Keys** are literals at `FlashistFacade.ts:898-901` at the tag (plan: `:933-936`, working tree).
- **[code] Session block** `initializeImmediate()` is `FlashistFacade.ts:868-966`, latched per page load by
  `hasInitializedImmediate` (`:868-871`). It calls `GameAnalytics.initialize` (SDK session start = GA `user`
  event, `:897-901`) then emits, unconditionally and once each: `Session:Start` (`:902-904`), `Device:*`
  (`:928`), `Platform:*` (`:947`); then, only if `localStorage` works, `Player:New` or `Player:Returning`
  (`:950-963`) and `Player:DaysPlayed` (`:964`). Also `Session:MatchesPlayed` if a previous page left a pending
  count (`:878-883`). **Confirmed: only a page load repeats it.**
- **[code] `Platform` ≡ `Device` per page load** — both fire exactly once, back to back, with no storage or
  network condition (`:928`, `:947`). This upgrades `0230`'s "expected identity" from inference to code fact
  **at 0.0.164** (0.0.141 not re-read).
- **[code] `Player:DaysPlayed` fires on every page load, not once per day** (`src/client/DaysPlayedAnalytics.ts:34-38`:
  the stored count is sent whenever it is > 0; only the *increment* is once per day). So a normal load emits
  ~3 `Player` events: New/Returning + DaysPlayed + one of `Player:YandexLoggedIn/Guest/Unknown`
  (`FlashistFacade.ts:1161-1162` latch, once per load).
- **[code] Experiment latch holds across re-init.** `hasLoggedExperimentEvents` (`:802`) is set at `:1581`
  before the loop and checked at `:1575`; every path (`:1090` after platform settle, `initExperimentFlags`
  `:1587-1590` called from `checkExperimentFlag`, the recovery path `:1428-1432`) goes through
  `logExperimentEvents()` and returns early. It does not latch while flags are null (`:1576-1580`), so it emits
  once per page load, **one event per Yandex flag**: `Experiment:{name}:{value}` (`:2113-2114`). No flags (no SDK
  / web) ⇒ no Experiment events.
- **[code] Reload sites at the tag** (`git grep` over `src/client`): `Bootstrap.ts:86` (pre-gate failure, sessionStorage
  latch `:84-85`, cleared on success `:62`); `StaleBuildModal.ts:113` (user click; the plan's `:121` does not exist —
  the second button is `:121` `reloadAppWithoutHash`, the long-session popup); `AccountModal.ts:319`;
  `TokenLoginModal.ts:90` (after a 3 s retry interval `:55`); `FlashistFacade.ts:1254` (`changeHref`), `:1265`
  (`reloadApp`), `:1278` → `:507` (`reloadWithoutHash`); `Main.ts:209`, `Main.ts:368`, `CitizenshipCard.ts:845`
  (all `reloadApp`); `jwt.ts:178` (Discord).
- **[code] Correction: `LongSessionRefresh.ts` does NOT force a reload.** At 23 h page age (visible tab) it shows a
  popup once (`:126-156`); the reload happens only on the player's click (`StaleBuildModal.ts:116-122`). The page
  age resets on reload, so it cannot loop (comment `:8-10`, logic `:131-145`).
- **[code] Missed by the brief AND the plan: every match exit is a full page navigation.** `changeHref(rootPathname)`
  sets `window.location.href` (`FlashistFacade.ts:1240-1255`), called from `MatchExit.ts:19` (in-match exit
  buttons), `WinModal.ts:346`, `TutorialLayer.ts:318`, and `Main.ts:796-800` (a URL carrying `#refresh`). So **one
  match ≈ one extra run of the session block** for a normal player. This is the baseline multiplier, not a bug.
- **[code] Timers seen:** `PerformanceMonitor.ts:6,29` — every 5 visible minutes emits 2 FPS events + 1 memory event
  (Chromium only), **started only at match start** (`Main.ts:909` → `:1151-1153`), no cap. `Main.ts:667-683`
  `Session:Heartbeat:05..60` — every 5 visible minutes, max 12 per page load. `BuildVersionChecker.ts:9,52-56` — polls
  `/api/version` every 5 min + on visibility; emit latched by `staleDetected` (`:27-28`), once per load.
  `LongSessionRefresh.ts:34` — 60 s check, emits once.
- **[code] Deploy timing confirmed from tags:** 0.0.157–0.0.164 dated 2026-10-08 → 10-13 (plus `0.0.161-profile.1`,
  `0.0.163-telemetry.1`); 0.0.142–0.0.151 all on 2026-09-12; 0.0.140 on 08-29, then `0.0.140-dev.1..5` and 0.0.141 on
  09-05. **Nothing tagged on 3–4 Sep.**
- **[code] Dev builds carry their own build string** (`package.json` version at tag `0.0.140-dev.1` is
  `"0.0.140-dev.1"`; `src/version.ts` reads it; `configureBuild(version)` at `FlashistFacade.ts:897`). `Dockerfile:23`
  defaults `ARG DEPLOY_ENV=prod`, `webpack.config.js:336-337` defaults to `prod` in production mode (the `0226`
  channel). ⇒ **[inference] the GA build split can tell dev-deploy traffic apart** (`*-dev.N` builds) — unless a dev
  build ever shipped with a plain version.

### Stale-build reload-loop candidate — checked
- **[code] HTML is no-store on every path at the tag.** Container nginx: `location ~* \.html$` (`nginx.conf:262-287`,
  `Cache-Control: no-store…` `always`, upstream header hidden, 1 s server cache) and `location = /` (`:290-314`, same,
  1 s). Express: `.html` statics get `no-store` + empty ETag (`src/server/Master.ts:85-98`). The SPA fallback
  (`Master.ts:739-741`, `sendFile index.html` for unknown paths) has **no** explicit no-store — express defaults
  (`max-age=0` + validators), so revalidated, not stale. JS/CSS are `[contenthash]` (`webpack.config.js:188`) with
  1-year immutable. `/api/version` is no-store (`Master.ts:201-209`) and reads the server's `package.json`
  (`Master.ts:71-74`). No service worker in `src` (grep). `yandex-games_iframe.html` has no cache meta.
- **[inference] A stale-refresh loop needs an HTML cache outside the repo** (a Yandex-side copy/CDN, or a proxy). How
  Yandex Games loads the game (iframe URL to geoconflict.ru vs an uploaded archive) **is not determinable from the
  repo** — `yandex-games_iframe-parent.html` (a test wrapper that iframes `./yandex-games_iframe.html`) hints at the
  iframe-URL model. **Open; the Yandex console setting would settle it.**
- **[inference, from prior obs] The September spike was NOT a click-driven stale-refresh loop.** Each iteration needs a
  click that logs `UI:ClickStaleBuildRefresh`; `0230`'s table has `UI` flat (6.66 → 8.35/user, 2 → 4 Sep) while
  `Platform` (= page loads/user) went 4.00 → 122.41. That refutes it for September unless the click event was lost.

### What September's own table says about the extra page loads (arithmetic on [prior obs] from `0230`'s brief)
`Platform` = page loads/user (code fact above). 2 Sep → 4 Sep, per user: `Platform` +118.41 · `Player` +393.42 ·
`Experiment` +351.10 · `Session` +114.68 · `Performance` +69.89 · `Match` +5.92 · `UI` +1.69. Per **extra** page load:
- `Player` 3.32 (normal 2.99) · `Experiment` 2.97 (normal 2.00) · `Session` **0.97** (normal 3.18) · `Match` 0.05 · `UI` 0.014.
- **[inference]** Each extra load ran the session block in full (Session:Start, Device, Platform, ~3 Player, ~3
  Experiment) but almost nothing after it: no `Session:FirstAction` / `Session:Heartbeat` / `Session:MatchesPlayed`
  (Session ≈ 1 = Start only), no clicks, no matches. ⇒ **short, non-interactive page loads (< 5 visible minutes), on
  Yandex (they got flags), seeing ~1 more experiment flag than normal loads**, by users whose GA identity persisted
  (otherwise DAU would have risen and the ratio would not). That is the shape of an automatic reload loop or of
  automated/bot loads — not of players playing more.
- **[inference]** At DAU ~4.2K–5.5K (a 7-day range, not 4 Sep's own DAU) that is ~0.50M–0.65M extra page loads that
  day. Ten looping clients would each need one load every ~1.3–1.7 s for 24 h; a pre-gate failure loop is bounded by
  the boot time (5 s platform deadline `FlashistFacade.ts:661`, applied `:1005`, 1 s chunk retry `Bootstrap.ts:34`), so it would take
  **tens to hundreds** of looping clients, or many users each with ~118 loads. The sitting's sessions-per-user and
  splits decide which.
- **[code] A boot-failure loop fits that per-load profile exactly:** the session block + experiments run *before* the
  `import("./Main")` gate (`Bootstrap.ts:41-54`); a failure there logs an Error event `ERROR! Bootstrap failed: …`
  (`Bootstrap.ts:71`) and reloads once (`:84-86`); FirstAction, Heartbeat, the version checker, matches and
  Performance all live in `Main` (post-gate). The sessionStorage latch is meant to stop the loop after one reload —
  **[inference]** it would fail to only if sessionStorage does not survive the reload in some embedding. Not shown.

### New candidate the plan did not list: an Error-event storm (not a Design event)
- **[code]** `window.onerror` (`FlashistFacade.ts:615-637`, severity `Error`) and `unhandledrejection`
  (`:639-653`, severity `Debug`) send **every** uncaught error to `GameAnalytics.addErrorEvent` (`:606`) with **no
  de-duplication or rate cap** in game code; 17 call sites of `flashist_logErrorToAnalytics` in total.
- **[code] The SDK does not cap them either.** In `gameanalytics` 4.4.7 (`node_modules/gameanalytics/dist/GameAnalytics.debug.js`)
  `GAEvents.addErrorEvent` (`:2742-2780`) has no counter; the only `MAX_ERROR_COUNT = 10`/hour (`:2517`, `:3154`)
  applies to the SDK's own custom-field validation warnings (`customEventFieldsErrorCallback`, `:2500-2528`), and
  `SdkErrorTask.MaxCount = 10` (`:2117`) to SDK-internal errors.
- **[code]** The render loop self-limits (`GameRenderer.ts:392-403`: `requestAnimationFrame` is requested *after* the
  layers, so a throwing layer stops the loop after one error). Repeating error sources would be intervals / per-update
  callbacks (e.g. the 1 s connection check `ClientGameRunner.ts:647-650`, per-game-update handlers).
- **[inference]** Error events live in GA's **Error** category, outside the Design categories in `0230`'s split —
  one candidate for `0224`'s "categories do not sum to the daily total" caveat. **Whether Error (and SDK `user` /
  `session_end`) events count toward the 500 limit is unknown** — plan step 6 must read it.
- **[code] SDK persistence:** the SDK stores its event queue and sessions in `localStorage` (`ga_event`, `ga_session`,
  `GameAnalytics.debug.js:1358-1361`, `:1460-1461`) and repairs missing `session_end` on the next start
  (`fixMissingSessionEndEvents`, `:2933-2955`). Replay behaviour is for the full read (§2.3).

### Decision log
- 2026-10-14 — Pre-pass only. **No fix applied, no obvious-winner call: none.** Files written: this `worklog.md` only.
  No source, `plan.md`, report, status or wiki touched.

### Targeted sitting list
Carried in the Build-worker hand-off to the lead (to be copied into the sitting record below once the sitting runs).

## Sitting record (plan Part 1)
_Run 2026-10-14 — recorded below under **## Sitting record (2026-10-14)**, after the full code read._

## Full code read (plan §2.1–2.6) — 2026-10-14, fkit-coder (Build worker, part B, spawned by `fkit-sprint-ship-loop`)

Everything read at production tag **`0.0.164`** (`git archive 0.0.164`, commit `d798adb`) unless a line says
otherwise. Same labels as the pre-pass: **[code]** file:line at the tag · **[prior obs]** a figure from
`0224`/`0230`, not re-read · **[inference]**. No secrets: keys by location only, no IDs, no URLs with IDs, no
env-file values (env files were checked for the *presence* of a key name only). The GA SDK is cited in
`node_modules/gameanalytics/dist/GameAnalytics.node.js` — the file webpack bundles (`package.json` `"main"`,
no `browser` field); `package-lock.json` at the tag pins **4.4.7**. The pre-pass cited the same logic in
`GameAnalytics.debug.js` (different line numbers).

### Headline
- **[code] No automatic reload loop exists at 0.0.164.** Every reload site is a user click, a one-shot, or
  latched (table below). The only built-in page-load multiplier is **one full page load per match exit**
  (pre-pass). So a high page-load count per user must come from outside the code's own logic: players
  reloading by hand, many tabs, the Yandex host reloading the iframe, or automated traffic — the sitting's
  sessions-per-user and build/country splits decide which.
- **[code] No Design event fires on a timer, poll or retry without a cap.** The only timer-driven Design
  events are `Performance:*` (2–3 per 5 visible minutes of a match) and `Session:Heartbeat:*` (max 12 per
  page). Every other emitter is latched once per page, once per match, or needs a click.
- **[code] The uncapped path is Error events, not Design events** (pre-pass finding, now extended): this read
  found **four code shapes that can fire one Error event per second or faster for as long as the fault lasts**
  (§2.1 c). None is shown to be happening. Whether Error events count toward the 500 limit is still unknown
  (sitting step 6).
- **[code] SDK replay is bounded, not an amplifier** — but it can **duplicate** events on slow connections
  (§2.3). Each event carries an `event_uuid`; whether GameAnalytics removes duplicates on its side is unknown.
- **[code] 0226 is unchanged at HEAD** and the sanctioned deploy path is still safe (§2.4).
- **[code] Since 0.0.141 (5 Sep), no new timer/poll/retry Design emitter was added**; the one timer change
  *cut* volume (`Performance` 60 s → 300 s) (§2.6).

### 2.1 Inventory of emitters at 0.0.164
**116** `flashist_logEventAnalytics(` call sites in `src/client` at the tag (83 at 0.0.141), plus 4 wrapper
methods (`logExperimentEvent` `FlashistFacade.ts:2113-2115`, `logUiTapEvent` `:2117-2121` — 13 callers, all
click handlers, `logLockedFeatureTapEvent`, `logCitizenshipExplainerOpenedEvent`). Each call =
one `GameAnalytics.addDesignEvent` (`FlashistFacade.ts:543-566`), prod builds only.

**(a) Once per page load (latched per load, or run once from `startClient`)** — [code]
| Event(s) | Where | Condition |
|---|---|---|
| `Session:MatchesPlayed` | `FlashistFacade.ts:878-883` | only if the previous page left a pending count |
| `Session:Start`, `Device:*`, `Platform:*` | `:902-904`, `:928`, `:947` | always (prod) |
| `Player:New` / `Player:Returning`, `Player:DaysPlayed` | `:950-963`, `DaysPlayedAnalytics.ts:34-38` | if `localStorage` works |
| `Player:YandexLoggedIn` / `Guest` / `Unknown` | `:1160-1174` (latch `:1161-1162`) | once |
| `Experiment:{name}:{value}` × flags | `:1574-1584` → `:2113-2115` | once; one per Yandex flag; none without the SDK |
| `Session:PlatformInitTimeout` | `:1011` (latch `:1009-1010`) | only when the 5 s deadline hits |
| `Session:PlatformDegraded:{cause}` / `Session:PlatformRecovered` | `:1213`, `:1233` (latches) | Yandex template only, when degraded |
| `Session:SdkLoaderRetry:{outcome}` | `:1376-1384` | at most once per page (comment + latch `:1377`) |
| `Profile:Login:Succeeded` (+`Created` first time) or `Failed:*` | `ProfileSession.ts:190-208` | logged-in Yandex players; one login per page (`Main.ts:1209`); failure latched (`loginFailed`) |
| `Profile:Login:SignatureAge:*` + `Signature:Ready`/`Waited`/`Failed`/`Timeout` (+ rare `Refetch:*`) | `FlashistFacade.ts:2242-2298`, `:2340`, `:2375` | with that login |
| `Session:FirstAction` | `Main.ts:214-220` | first interaction |
| `Build:StaleDetected` | `BuildVersionChecker.ts:37` (latch `:27-28`) | once |
| `Session:LongSessionRefresh:*` | `LongSessionRefresh.ts:102` | once, at 23 h page age |
| `Citizenship:SurfaceSeen`, `Citizenship:Status:Unverified`/`ReadFailed`, `Citizenship:EarnedXp`, `TenureGrant:*` | `CitizenshipCard.ts:474-482`, `CitizenshipNotice.ts:64-93`, `PlayerProfileView.ts:198-213`, `TenureGrantClaim.ts:58/112/133` | each latched or transition-only |
| `Reconnect:*` | `ReconnectModal.ts:140-202` | only with a saved reconnect session; user-driven after the prompt |

**(b) Per match (latched per match)** — [code] `UI:ClickMultiplayer`/`SinglePlayer`/`Mission`
(`PublicLobby.ts:282`, `Main.ts:419`, `:1040`); `Match:Preload*` (`ClientGameRunner.ts:179-378`, 2 per match);
`Worker:InitSuccess`/`InitFailed*` (`:434-457`); `Game:Start` + `Game:Mode:*` (`MatchStartAnalytics.ts:46-52`);
`Match:Spawn*` (`ClientGameRunner.ts:1072-1103`, `PlayerActionHandler.ts:67`), `Match:SpawnedConfirmed`
(`:1019-1036`, latched), `Match:SpawnMissed:*` (`:682-697`, latched); `Match:WinCondition:*` (`:740-753`, double
latch, multiplayer only); `Player:Eliminated`/`Game:Win`/`Game:Loss`/`Match:LossOpponentWon`
(`WinModal.ts:355-361`, `:395-471`, `:546-548`, latched); `Game:End` + `Match:Duration`
(`MatchStartAnalytics.ts:73-90`); `Match:Leaderboard:Award:*` (`LeaderboardReporter.ts:96`, solo only);
`Ad:Interstitial` (`FlashistFacade.ts:2532`, only when an ad was really shown; called from 6 sites, ≤2 per
match); `Tutorial:*` (`TutorialLayer.ts:214-313`, `WinModal.ts:576-577`, bounded by the tooltip count).
Per-tick code paths that emit are all latched (`WinModal.ts:355-361`, `ClientGameRunner.ts:682-697`, `:740-753`).

**(c) Timers, polls, retry and reconnect loops** — all 24 `setInterval` sites in `src/client` checked [code]:
| Timer | Interval | Design events | Error-event risk |
|---|---|---|---|
| `PerformanceMonitor.ts:29-67` | 300 s, visible only | 2 + 1 (Chromium) per tick, **no cap**; started per match (`Main.ts:909`), restart stops the old one first (`Main.ts:1151-1154`) | none seen |
| `Main.ts:667-683` heartbeat | 300 s | 1 per tick, max 12 per page | none |
| `BuildVersionChecker.ts:54` | 300 s | ≤1 per page (latched) | none |
| `LongSessionRefresh.ts:152` | 60 s | ≤1 per page | none |
| `PublicLobby.ts:68-71` | 1 s, start screen | none | none — try/catch, warns once per outage (`:91-117`) |
| `HostLobbyModal.ts:723` | 1 s, in lobby | none | none — try/catch, `console.warn` |
| **`JoinPrivateLobbyModal.ts:402`** → `pollPlayers` `:481-499` | 1 s, in the join window | none | ⚠️ `await getServerConfigFromClient()` (`:483`) is **outside** any catch → an **unhandled rejection every second** while `/api/env` fails and is not yet cached (`ConfigLoader.ts:29-37`). Needs a network fault. |
| `Matchmaking.ts:102` → `checkGame` `:105-117` | 3 s | none | unguarded fetch, **but unreachable**: `enableMatchmaking()` returns `false` (`DefaultConfig.ts:309-311`), the button renders nothing (`Matchmaking.ts:167`) |
| **`MultiTabDetector.ts:20-23`** → `heartbeat` `:40-57` | 1 s, multiplayer after spawn (`MultiTabModal.ts:30-44`) | none | ⚠️ `localStorage.getItem/setItem` with **no try/catch** (`:90-99`) → if storage throws (blocked storage, or full: `QuotaExceededError`), an **uncaught error every second** of a multiplayer match |
| `ClientGameRunner.ts:647-650` connection check | 1 s | none | none; on silence it calls `transport.reconnect()` every 5 s (`:1316-1329`), which emits nothing |
| `Transport.ts:273` ping | 5 s | none | none; message handler is wrapped (`:349-361`) |
| `TokenLoginModal.ts:55` | 3 s | none | max 4 attempts (`:63-67`) |
| `LocalServer.ts:68`, `InputHandler.ts:221`, `TransformHandler.ts:183/197/206`, `MultiTabModal.ts:76`, `Main.ts:1190` | various | none | none seen |

**Error-event sources that repeat** — [code] for the shape, [inference] for whether it happens:
1. **Per game update.** The worker's update callback (`ClientGameRunner.ts:661-790`) runs `gameView.update(gu)`
   (`:680`) and `renderer.tick()` → every layer's `tick()` (`:785`, `:790`, `GameRenderer.ts:415-417`) with no
   try/catch, called straight from the worker's `onmessage` (`WorkerClient.ts:70-71`). A fault that throws there
   throws **once per game update — about 15 per second at the 66.7 ms turn, far more during catch-up** — and each
   one reaches `window.onerror` → `addErrorEvent` (`FlashistFacade.ts:615-637`, `:606`). ⚠️ This corrects the
   pre-pass line *"the render loop self-limits"*: that holds for the rAF draw (`renderLayer`), **not** for the
   per-update `tick()` path. Size, if it happens: ~9,000 Error events per affected 10-minute match.
2. **`MultiTabDetector`** storage throw — ~600 per affected 10-minute multiplayer match.
3. **`JoinPrivateLobbyModal`** `/api/env` rejection — 1 per second in the join window during a network fault.
4. **Third-party scripts** (Yandex SDK, ads) run in the same window, so their uncaught errors also reach
   `window.onerror`. Rate unknown.
- [code] No de-duplication or rate cap in game code; the SDK's only Error-path checks are severity validity and an
  8,192-character message limit (`GameAnalytics.node.js:3018-3030`, `validateErrorEvent`); the string severities
  the facade passes (`"Error"`, `"Debug"`) are accepted (`errorSeverityToString`, `:3337-3355`).
  `unhandledrejection` is sent as severity **`Debug`** (`FlashistFacade.ts:652`).
- [inference] **The same errors are already recorded in Uptrace**: `OtelBrowserInit.ts:109-158` listens to the
  same `error` / `unhandledrejection` events (`unhandled_error` / `unhandled_rejection` spans, with
  `error.cross_origin_or_worker` set for third-party "Script error."). Counting those spans per session would show
  whether an Error storm exists, with no GameAnalytics access needed. Not done here (no telemetry access in this
  step).

### 2.2 Can the session block repeat? Reload sites at 0.0.164
The session block repeats only by a page load (pre-pass). Every navigation site [code]:
| Site | Trigger | Can it fire without the player? | Can it loop? |
|---|---|---|---|
| `Bootstrap.ts:84-86` | boot failure before the gate | **yes** | **no** — sessionStorage latch (`:84-85`); if storage throws, no reload (`:88-90`). [inference] Only a storage that works but loses its value on reload could loop; no such browser behaviour is known to me, and storage is not wiped by a same-tab reload. |
| `MatchExit.ts:19`, `WinModal.ts:346` (`_handleExit`, `@click` `:126`), `TutorialLayer.ts:318` (two skip buttons `:132`, `:270`) | player's exit click | no | no (1 load per exit) |
| `Main.ts:796-800` `#refresh` | a URL that carries `#refresh` | yes, once | no — `changeHref` drops the hash (`FlashistFacade.ts:1240-1255`); **nothing at the tag writes `#refresh`** (`Main.ts:921-924`: removed) |
| `StaleBuildModal.ts:113` / `:121` | click | no | no (pre-pass: HTML is `no-store`) |
| `TokenLoginModal.ts:90` | `#token-login` hash, stripped first (`Main.ts:772-773`) | after a link | no |
| `AccountModal.ts:319` | logout click | no | no |
| `Main.ts:209` / `CitizenshipRestartOffer.ts:125-128` | "restart" click on a prompt | no | no |
| `Main.ts:361-370` → `GameRestart.ts:63-98` | after the guest-login dialog | no (needs the dialog) | no — sessionStorage latch (`:80-88`); no storage ⇒ no reload (`:89-95`) |
| `CitizenshipCard.ts:845` → `ProfileReadRestart.ts:43-61` | click | no | no |
| `Cosmetics.ts:74` | purchase click | no | no |
| `jwt.ts:178` | Discord login click | no | no |
**Verdict [code]: no reload site fires on its own more than once per page, and none loops.**

### 2.3 Double SDK init, two bundles, offline replay
- **[code] One SDK instance per page.** One webpack entry (`webpack.config.js:179`) with `runtimeChunk: "single"`
  (`:370`); `GameAnalytics.initialize` sits inside the per-page latch (`FlashistFacade.ts:868-871`, `:897-901`). The
  three HTML templates load no other GameAnalytics script (grep), and the test wrapper
  `yandex-games_iframe-parent.html` gets **no** bundle (`webpack.config.js:311-317`, `chunks: []`). Two tabs or two
  iframes = two independent page loads, each with its own session block — expected, not a double init.
- **[code] Custom dimension 02** is `"yandex"` when the Yandex template set `flashist_isYandexPlatform`
  (`yandex-games_iframe.html:19`, read in the constructor `FlashistFacade.ts:844-848`), else `"web"`. So in the
  sitting, dim 02 = which HTML template was served, not whether the SDK worked.
- **[code] Queue persistence.** The SDK keeps its event queue in `localStorage`, saving after every insert
  (`GameAnalytics.node.js:1656`, save on insert inside `addEventToStore`), loads it on initialize (`:2118`), caps it
  at 2,000 entries (`:1754`; over the cap, everything except `user`/`session_end`/`business` is dropped).
- **[code] Re-send behaviour.** Every 8 s (`:3581`, `:3570`) the queue job calls `processEvents("", true)`, whose
  clean-up step sets **every** queued event back to `"new"` (`cleanupEvents`, `:3206-3208`) and then sends them. A
  failed send with no response is retried (`:3179`); any other answer deletes the batch. **No request timeout was
  found.** ⇒ [inference] An event whose upload is still waiting for an answer after 8 s is **sent again**; events
  left in storage when a page closes are sent by the next page. So duplicates are possible on slow connections and
  at page close (every match exit is one); each event has an `event_uuid` (`:2017`, `:2059`), and whether
  GameAnalytics drops duplicates is unknown. This can at most multiply a slow client's events by a small factor; it
  cannot produce `0230`'s 30× jump in page loads (`Platform` 4 → 122/user is a count of page loads, not of resends).
- **[code] One `session_end` per page**: on `beforeunload` (`:3661`), plus at most one repair per orphaned earlier
  session (`fixMissingSessionEndEvents`, `:3209`). With the SDK's `user` event that is **2 non-Design SDK events per
  page load**.
- [code] Minor: production turns on SDK info and verbose logging (`FlashistFacade.ts:888-889`) — console noise, not
  extra events.

### 2.4 `0226` status
- **[code] Unchanged at HEAD (`daa1bcc`):** `Dockerfile:23` `ARG DEPLOY_ENV=prod`; `webpack.config.js:336-337`
  `process.env.DEPLOY_ENV ?? (isProduction ? "prod" : "dev")`; `git diff 0.0.164 HEAD` touches neither file.
- **[code] The sanctioned path is safe:** `build.sh:104` passes `--build-arg DEPLOY_ENV="$DEPLOY_ENV"` and
  `build.sh:30` allows only `prod`/`staging`/`dev`. The same arg is present at tags 0.0.140, 0.0.140-dev.1, 0.0.141
  and 0.0.164. The env files `build.sh` sources (`:58-64`) contain **no** `DEPLOY_ENV` line today (key-name count
  only; values not read). ⇒ [inference] A dev build made through `build.sh` sends **nothing** to GameAnalytics, so a
  `*-dev.N` build string in the sitting's build split would itself prove a build bypassed `build.sh`.
- **[code] Builds live on each candidate day** (tag dates, Moscow time; GA days are probably UTC): **3–4 Sep →
  0.0.140** (tagged 08-29; nothing tagged until 0.0.140-dev.1…5 and 0.0.141 on 09-05); 12 Sep → 0.0.142–0.0.151
  (10 in one hour); 8–13 Oct → 0.0.157–0.0.164 (0.0.158–0.0.160 within 6 minutes on 10-08); today → 0.0.164. A tag
  marks a version bump, not proof the deploy finished. ⇒ [inference] The September spike ran on a build that had
  been live for 5–6 days, so no deploy that day explains it.

### 2.5 Event budget (estimate)
Assumptions [inference]: logged-in Yandex player, tab visible, `F` = 2 Experiment flags per load (from `0230`'s
2 Sep ratio `Experiment`/`Platform` = 7.99/4.00 [prior obs]), multiplayer matches of ~10 minutes, one page load per
match exit [code].
| Block | Events | Notes |
|---|---|---|
| Page load, start screen (`L`) | **~15** logged-in / **~11** guest | Session:Start, Device, Platform, Player ×3, Experiment ×F, Profile login ×3 (logged-in only), FirstAction, MatchesPlayed (after a match), SurfaceSeen, 1–3 UI taps |
| Match, fixed (`M`) | **~13–17** | click, Preload ×2, Worker, Game:Start + Mode, Spawn ×1–2, SpawnedConfirmed, WinCondition, result ×1–3, Game:End, Duration, exit tap, Ad ×0–2 |
| Match, time-based | **~5 per 10 min** | Performance 2–3 per 5 visible min; Heartbeat 1 per 5 min (≤12 per page) |
| SDK, non-Design | 2 per load | `user` + `session_end`; whether counted toward 500 unknown |
| Error events | **0 on a healthy load** | each repeating source in §2.1 c adds 600–9,000+ per affected match |
| 0451 `PrivateLobby:*` (working tree, not deployed) | ≤~6 per host lobby cycle, ≤~3 per guest | 16 new names, all user-driven (HEAD `FlashistFacade.ts:382-410`) |
| 0299 | not built | needs room in the budget |

| Player day | Matches | Page loads | Design events (≈ loads×15 + matches×20) | + SDK events |
|---|---|---|---|---|
| Light | 2 | 3 | **~85** | ~91 |
| Normal | 5 | 6 | **~190** | ~200 |
| Heavy | 15 (~2.5 h) | 16 | **~540** ⚠️ over 500 alone | ~570 |
| Very heavy | 30 (~5 h) | 31 | **~1,065** | ~1,130 |
- [inference] The model runs above what was measured: `0230` puts a normal September day at ~62–81 events/user
  after `0224`'s Performance cut, at ~4 page loads/user [prior obs]. Many players are guests, play solo or leave
  without a match. Read the table as an upper estimate.
- [inference] **An average of 500 needs roughly 25+ page loads per average active user per day** — about 6× a
  normal September day's ~4. Heavy players can pass 500 on their own, but they can only push the *average* past 500
  if they are a large share of DAU — the sitting's per-user distribution (step 3) is the check. (Whether
  GameAnalytics applies the limit to the average or per user is itself unknown — step 6.)
- [code] **`Experiment:*` grows with no deploy:** one event per Yandex flag per load (`FlashistFacade.ts:1582-1584`),
  and flags are set in the Yandex console.
- [code] Cheap cuts the code allows (for the fix plan, not decided): `Platform` duplicates `Device` once per load
  (`:928`, `:947`); `Player:DaysPlayed` is sent on every load though it changes once a day
  (`DaysPlayedAnalytics.ts:34-38`); the whole session block could be sent once per day or per first load instead of
  per match exit.

### 2.6 What changed between 0.0.141 (5 Sep) and 0.0.164
- **[code] Enum `analyticEvents`: 85 → 158 constants (+73, none removed)** — extracted from `FlashistFacade.ts` at
  both tags. All 158 values at 0.0.164 appear in `analytics-event-reference.md` at the same tag (checked one by one).
- **[code] Call sites: 83 → 116.**
- **Added groups and their triggers** [code]: `Profile:Login:*` (Succeeded/Created/Failed ×3/Restart ×6/Signature
  ×9/SignatureAge ×30) and `Profile:Session:Relogin` — once per page login, or click, or once per rejected token;
  `Citizenship:*` (RestartPrompt ×3, Status ×3, TenureGrant ×3, Explainer) — click / latched / transition;
  `Session:LongSessionRefresh:*` ×6 — once at 23 h; `Session:PlatformDegraded:*`, `PlatformRecovered`,
  `SdkLoaderRetry:*` — latched once per page; `Ad:Interstitial`, `Ad:InterstitialSuppressed:PaidCitizen` — per ad
  shown or suppressed; `LockedFeature:Tap:*` — click; `Worker:InitFailedCause:*` — per failed match start.
- **⇒ [code] None of the added events fires on a timer, poll or retry.** What they add is (1) **~3 events per page
  load for logged-in Yandex players** (Profile login) and (2) **cardinality**: 30 `SignatureAge` buckets alone, plus
  dynamic names. That matters for step 8's distinct-name count (~103–118 in September [prior obs]), not much for
  volume.
- **[code] The only timer change cut volume:** `PerformanceMonitor` sample 60 s at 0.0.141 → 300 s at 0.0.164
  (commit `35afc64`, 2026-09-07; first tag carrying it is 0.0.142). Heartbeat (`Session:Heartbeat:*`) and
  Performance both already existed at 0.0.141.

### What the sitting should add to its list (from this read)
- **Error category**: Error events per user per day on the breach day vs a normal day, and their top messages
  (look for a single repeating message — a game-update throw, a storage `SecurityError`/`QuotaExceededError`, a
  `Failed to fetch server config`, or a third-party `Script error.`). Copy the message text only if it has no
  user data in it.
- **Build split for `*-dev.N` strings** (would prove a `0226` leak — §2.4).
- **`session_end` / `user` counts** next to the Design total (2 per page load if they count).

### Decision log
- 2026-10-14 — Full read only. **No fix applied, no obvious-winner call: none.** Files written: this
  `worklog.md` only (this section appended). No source, `plan.md`, report, status or wiki touched; no SSH, no
  deploy, no GameAnalytics access. Scratch copies of the two tags were exported to the session scratchpad,
  outside the repo.

## Sitting record (2026-10-14)

**Who / how:** `fkit-lead` drove the clicks with claude-in-chrome in the **owner's Chrome, owner present and logged
in**, 2026-10-14. **Read-only:** ad-hoc Explore queries only — no Save, Export, Share, alert or report; no game or
organisation setting changed; the banner was not dismissed. Figures were passed back to the coder (Build worker,
part C) as a plain table and are copied here unaltered. **Every figure in this section is an observation read off the
GameAnalytics UI on 2026-10-14**; lines marked *(inference)* are arithmetic on those figures. 🔒 No game ID, dashboard
URL, user id or key is recorded (the dashboard URL carries the numeric game ID); screenshots stayed in the lead session.

### Before the numbers
- **S0.1 Timezone: NOT captured** — the dashboard's timezone setting was not read. Dates below are as GameAnalytics
  labels them. GA days are usually UTC — **unverified**.
- **S0.2 Demo mode:** every page's text includes "You're viewing data in Demo mode / Exit Demo", but **no banner was
  visible on screen** (screenshots show none). Figures are consistent with real traffic (DAU 4.7–6.7K, the game's
  scale). Sitting continued; **open caveat, same as `0418`.**
- **S0.3 Banner:** Game Home → Overview, Integration panel: *"Limit Exceeded: Total number of events per active user
  (per day) has exceeded the limit of 500. Review integration here. Learn more."* and *"Status: Collecting events…"*.
  The Integration tab chart titled *"Total number of events per active user (per day)"* carries a **"Limit reached"**
  badge.

### Overview and Integration
- **Overview tiles (as shown 2026-10-14):** DAU 5.95K (−4.6%), Playtime 2h 56m, New Users 2.93K, Sessions 25.84K.
- **Integration tab, "Total events sent yesterday" (13 Oct):** Design events **668.66K**; Resource / Progression /
  Health / Business / Ad / Impression all "Not tracking".
- **Events per active user per day** (Integration chart, past 7 days, hovered): 11 Oct **106.2861**; **12 Oct
  1,822.3173**; 13 Oct **121.4939**; 7–10 Oct visually ~110 each (not hovered).
- **Design cardinality** (Integration chart, 7–13 Oct): ~170–190 distinct per day, flat; no dropped events shown.

### DAU (Explore, predefined DAU table)
| 7 Oct | 8 Oct | 9 Oct | 10 Oct | 11 Oct | **12 Oct** | 13 Oct |
|---|---|---|---|---|---|---|
| 6.12K | 6.37K | 6.70K | 5.29K | 4.71K | **5.82K (5,822 hovered)** | 5.94K |

### Design "Custom event count per user", aggregation "Mean count per event user", split Event id 01 (category), 7–13 Oct
⚠️ "Mean count per event user" divides each category by **the users who sent that category**, not by DAU.

| Category | 7 Oct | 8 Oct | 9 Oct | 10 Oct | 11 Oct | **12 Oct** | 13 Oct |
|---|---|---|---|---|---|---|---|
| Player | 11.91 | 12.13 | 12.14 | 11.99 | 10.63 | **499.16** | 12.26 |
| Experiment | 11.89 | 11.91 | 11.95 | 11.87 | 10.58 | **479.72** | 13.48 |
| Profile | 15.37 | 15.83 | 15.48 | 15.33 | 14.56 | **268.35** | 16.22 |
| Session | 12.98 | 13.19 | 13.05 | 12.85 | 12.20 | **164.04** | 13.49 |
| Device | 3.97 | 4.01 | 4.01 | 4.00 | 3.58 | **166.65** | 4.08 |
| Platform | 3.97 | 4.01 | 4.01 | 4.00 | 3.58 | **166.65** | 4.08 |
| Match | 27.72 | 28.12 | 28.51 | 28.05 | 25.48 | 28.04 | 28.87 |
| Citizenship | 4.03 | 4.18 | 4.19 | 4.11 | 3.72 | **166.25** | 4.26 |
| Performance | 22.77 | 21.80 | 21.50 | 23.78 | 24.21 | 23.08 | 22.99 |
| Game | 8.97 | 9.15 | 9.07 | 8.96 | 8.23 | 9.11 | 9.34 |
| UI | 6.14 | 6.20 | 6.55 | 6.68 | 6.62 | 6.42 | 7.22 |
| Tutorial | 6.00 | 5.81 | 5.92 | 5.95 | 6.05 | 5.96 | 5.79 |
| Reconnect | 4.51 | 4.32 | 4.27 | 4.50 | 4.42 | 4.40 | 4.34 |
| Worker | 3.64 | 3.70 | 3.74 | 3.70 | 3.35 | 3.68 | 3.76 |
| Ad | 2.28 | 2.35 | 2.38 | 2.46 | 2.28 | 2.30 | 2.43 |
| Inbox | 1.65 | 2.73 | 2.84 | 2.46 | 3.20 | 3.57 | 2.78 |
| Purchase | 2.31 | 2.11 | 2.39 | 2.31 | 2.25 | 2.22 | 2.29 |
| Announcements | 2.39 | 2.20 | 2.24 | 2.40 | 2.09 | 2.14 | 2.34 |
| Feedback | 1.52 | 1.48 | 1.42 | 2.10 | 1.82 | 1.49 | 1.61 |
| Build | 1.00 | 1.23 | 1.28 | 1.17 | 1.16 | 1.14 | 1.17 |
| LockedFeature | N/A | 1.00 | 2.00 | 1.00 | N/A | N/A | 1.31 |
| GAME_START | 1.00 | 2.00 | 1.00 | 1.00 | N/A | N/A | N/A |
| UI_CLICK_SINGLE_MISSION_BUTTON | 1.00 | 1.00 | 1.00 | N/A | N/A | N/A | N/A |
| UI_CLICK_SINGLE_PLAYER_BUTTON | N/A | 1.00 | N/A | 1.00 | N/A | N/A | N/A |

The legacy names `GAME_START`, `UI_CLICK_SINGLE_MISSION_BUTTON`, `UI_CLICK_SINGLE_PLAYER_BUTTON` appear as Event id 01
values — old-build event strings.

### `Platform` category only (filter Event id 01 = Platform), split Build, 7–13 Oct
**Aggregation Count** (= page loads, since `Platform:*` fires once per page load — code fact, see the pre-pass):

| Build | 7 Oct | 8 Oct | 9 Oct | 10 Oct | 11 Oct | **12 Oct** | 13 Oct |
|---|---|---|---|---|---|---|---|
| 0.0.154 | 40 | 27 | 24 | 27 | 19 | **365.27K** | 46 |
| 0.0.163 | N/A | N/A | N/A | 2.28K | 14.17K | **132.95K** | 17.61K |
| 0.0.151 | 56 | 61 | 97 | 27 | 25 | **121.78K** | 24 |
| 0.0.136 | 31 | 23 | 28 | 76 | 31 | **121.76K** | 27 |
| 0.0.140 | 4 | 14 | 7 | 37 | 8 | **121.75K** | 4 |
| 0.0.161 | N/A | N/A | 18.73K | 15.45K | 176 | 148 | 101 |
| 0.0.156 | 20.84K | 3.57K | 197 | 126 | 68 | 100 | 43 |
| 0.0.157 | N/A | 17.90K | 236 | 51 | 24 | 59 | 29 |
| 0.0.160 | N/A | 1.05K | 4.35K | 46 | 10 | 17 | 28 |
| 0.0.164 | N/A | N/A | N/A | N/A | N/A | N/A | 3.37K |
| 0.0.155 | 70 | 78 | 37 | 38 | 12 | 19 | 39 |
| 0.0.135 | 53 | 12 | 6 | 21 | 8 | 7 | 6 |
| 0.0.141 | 29 | 10 | 10 | 7 | 1 | 7 | 3 |
| 0.0.139 | 6 | 6 | N/A | 7 | 12 | 3 | 2 |
| 0.0.102 | N/A | N/A | N/A | 4 | 1 | 3 | 2 |
| 0.0.125 | 1 | N/A | 5 | N/A | 1 | N/A | 1 |
| 0.0.130 | 1 | N/A | N/A | 3 | N/A | N/A | 3 |
| 0.0.152 | 2 | N/A | N/A | N/A | 1 | N/A | 4 |
| null | 1 | 1 | 1 | N/A | N/A | 2 | 1 |
| 0.0.104 | 1 | 2 | N/A | N/A | 1 | 1 | 1 |
| 0.0.131 | 1 | 1 | N/A | 3 | N/A | 1 | N/A |
| 0.0.118 | N/A | N/A | 1 | 3 | 1 | N/A | N/A |
| 0.0.129 | 1 | N/A | N/A | N/A | N/A | N/A | 2 |
| 0.0.99 | 2 | N/A | N/A | N/A | N/A | 1 | N/A |
| 0.0.126 | N/A | 1 | N/A | N/A | N/A | N/A | 1 |
| 0.0.121 | N/A | N/A | N/A | 1 | N/A | N/A | N/A |
| 0.0.127 | N/A | 1 | N/A | N/A | N/A | N/A | N/A |
| 0.0.128 | N/A | N/A | N/A | 1 | N/A | N/A | N/A |

**Aggregation Unique users**, same filter and split (11–13 Oct in full):

| Build | 11 Oct | **12 Oct** | 13 Oct |
|---|---|---|---|
| 0.0.163 | 4.04K | **5.17K** | 4.54K |
| 0.0.161 | 145 | 114 | 39 |
| 0.0.156 | 50 | 45 | 29 |
| 0.0.157 | 17 | 24 | 14 |
| 0.0.160 | 8 | 12 | 9 |
| 0.0.164 | N/A | N/A | 1.14K |
| 0.0.155 | 12 | 15 | 15 |
| 0.0.151 | 17 | **21** | 15 |
| 0.0.136 | 18 | **14** | 15 |
| 0.0.154 | 9 | **10** | 5 |
| 0.0.135 | 7 | 6 | 6 |
| 0.0.141 | 1 | 7 | 3 |
| 0.0.140 | 6 | **3** | 4 |
| 0.0.139 | 8 | 3 | 2 |
| 0.0.102 | 1 | 3 | 2 |
| 0.0.125 | 1 | N/A | 1 |
| null | N/A | 1 | 1 |
| 0.0.104 | 1 | 1 | 1 |
| 0.0.131 | N/A | 1 | N/A |
| 0.0.118 | 1 | N/A | N/A |
| 0.0.130 | N/A | N/A | 2 |
| 0.0.152 | 1 | N/A | 1 |
| 0.0.129 | N/A | N/A | 2 |
| 0.0.99 | N/A | 1 | N/A |
| 0.0.126 | N/A | N/A | 1 |

7–10 Oct rows were also captured in summary: 0.0.136 had 16–23 users/day, 0.0.154 13–20, 0.0.151 22–30, 0.0.140 3–8.

*(inference — arithmetic on the figures above)* 12 Oct page loads per user: 0.0.154 ≈ 365.27K / 10 ≈ **36.5K**
(one load every ~2.4 s for 24 h); 0.0.151 ≈ 121.78K / 21 ≈ **5.8K** (~15 s); 0.0.136 ≈ 121.76K / 14 ≈ **8.7K**
(~10 s); 0.0.140 ≈ 121.75K / 3 ≈ **40.6K** (~2.1 s); 0.0.163 (live) 132.95K / 5.17K ≈ **25.7** (vs 11 Oct
14.17K / 4.04K ≈ 3.5).

### Other `Platform` splits
- **Custom 02 (yandex/web), Count:** every day only `null` — dimension not populated in GA. Totals 7–13 Oct: 21.14K,
  22.76K, 23.73K, 18.21K, 14.57K, **863.89K**, 21.35K.
- **Country, Count, 7–13 Oct:** RU 13.00K, 14.11K, 14.92K, 11.79K, 9.65K, **856.82K**, 13.41K. Every other country flat
  on 12 Oct (e.g. DE 1.31K / 1.69K / 1.60K / 745 / 664 / 1.22K / 1.22K; UZ ~350–575; SE 149–764; US ~350–613). **No
  country other than RU moved.**
- **No split, past 90 days (16 Jul–13 Oct):** total 5.72M, mean 63.54K/day; normal days ~11.8K–28.4K. Top 10 days:
  26 Sep **1.52M**; 12 Oct **863.89K**; 4 Sep **573.88K**; 9 Sep **518.81K**; 19 Sep **248.47K**; 28 Sep 124.97K;
  3 Oct 124.75K; 3 Sep 115.48K; 25 Aug 93.73K; 29 Aug 37.54K.

### September, `Platform`, split Build (for `0230`)
**Count** — 3 Sep: 0.0.136 77.26K, 0.0.140 38.10K, 0.0.141 N/A, 0.0.139 72, 0.0.135 27, 0.0.126 11, 0.0.102 2,
null 5, 0.0.131 2, … · **4 Sep: 0.0.136 279.56K, 0.0.140 294.24K**, 0.0.141 N/A, 0.0.139 51, 0.0.135 19, 0.0.126 N/A,
0.0.102 2, null N/A, 0.0.131 1, … · 5 Sep: 0.0.136 110, 0.0.140 4.20K, 0.0.141 10.09K, 0.0.139 50, 0.0.135 21,
0.0.126 1, 0.0.102 4, null 1, … (further columns 0.0.125, 0.0.104, 0.0.111, 0.0.122, 0.0.127, 0.0.129, 0.0.130 not
carried).
**Unique users** — 3 Sep: 0.0.140 4.40K, 0.0.141 N/A, 0.0.136 43, 0.0.139 41, 0.0.135 10, … · **4 Sep: 0.0.140 4.68K,
0.0.141 N/A, 0.0.136 45**, 0.0.139 32, 0.0.135 17, … · 5 Sep: 0.0.140 1.48K, 0.0.141 2.74K, 0.0.136 45, 0.0.139 29,
0.0.135 14, …
*(inference)* 4 Sep: 0.0.136 ≈ 279.56K / 45 ≈ **6.2K loads/user**; 0.0.140 (live then) ≈ 294.24K / 4.68K ≈ **63/user**.

### Other observations
- **No `*-dev.N` build** appeared in any build split read (7–13 Oct, 3–5 Sep) — only `0.0.x` and `null`.
- **Hourly granularity greyed out** ("Hour(s)" disabled) — the time-of-day pattern on 12 Oct **could not be
  determined**.
- **GA docs** ("Learn more" → "Event Tracking and Cardinality Limits", read from screen; the page text was not
  machine-readable): thresholds table — *"Total number of events per active user (per day) 500"*, *"Cardinality of
  Design Events (per day) 15000"*, *"Cardinality of Progression Events (per day) 8000"*, *"Cardinality of Resource
  Events (per day) 4000"*. *"What happens when limits are exceeded"*: *"When your event tracking limits are exceeded,
  GameAnalytics will alert you via the Game Overview → Integrations page."* *"Starting October 1st, 2025 …"*:
  Design/Progression/Resource events exceeding daily **cardinality** limits are still collected but identifiers set to
  "null"; *"any metrics derived from these events will not be accurate in the AnalyticsIQ interface"*; *"No data will
  be lost. The full event payload will still be included in Data Warehouse and Data Export for PipelineIQ users."*;
  *"There is no penalty or cost associated with exceeding the limits, however we strongly advise avoiding breaching
  cardinality limits…"*. **The doc does not say the per-user 500 limit drops or throttles events — only that an alert
  is shown.**

### NOT done in the sitting (gaps)
- The **Error** category per user and its top messages — not read.
- SDK `user` / `session_end` counts — not read.
- Plan step 7 (`0224`'s two unreconciled figures) — only partly: the 12 Oct category means were not formally
  reconciled with 1,822; the 7-day mean (581.97 vs 378.86) was not re-read.
- Per-event-name breakdown inside Player / Experiment / Profile / Session — not read.
- Dashboard timezone; browser / OS splits; Custom 01 split — not read.
- A per-user distribution / top users — not read (only per-build unique users, above).

### Addendum — second short read: sessions (2026-10-14)
**Who / how:** `fkit-lead` drove it in the **owner's Chrome, owner present**, 2026-10-14, read-only (ad-hoc Explore
only; nothing saved, exported, shared or changed). Owner ruling 2026-10-14, verbatim **"Yes, now (Recommended)"** to a
~5-minute Sessions check. Figures passed to the coder (Build worker, part D) and copied here unaltered; every figure is
an observation off the GameAnalytics UI; *(inference)* lines are arithmetic. 🔒 No ID, URL, user id or key recorded.

GameAnalytics Explore → predefined **"Session Count (started)"** (event category Session Start, aggregation Count):

| 7 Oct | 8 Oct | 9 Oct | 10 Oct | 11 Oct | **12 Oct** | 13 Oct |
|---|---|---|---|---|---|---|
| 22.64K | 24.26K | 25.47K | 19.86K | 16.05K | **21.75K** | 23.07K |

- **Past 90 days (16 Jul–13 Oct):** total 1.85M, mean 20.58K/day, range ~12.99K (2 Aug) to **40.86K (19 Sep, the
  max)**.
- **Top days:** 19 Sep 40.86K; 3 Oct 37.15K; 3 Sep 30.91K; 14 Sep 30.47K; 28 Sep 30.23K; 5 Oct 28.36K; 19 Aug 26.98K;
  9 Oct 25.47K; 25 Sep 25.25K; 2 Oct 25.07K; 31 Aug 24.88K; 8 Oct 24.26K; … 13 Oct 23.07K; 21 Sep 22.84K (the top-20
  list ends there).
- **26 Sep, 4 Sep, 9 Sep and 12 Oct are NOT in the top 20** (all ≤ 22.84K), although they are the four biggest
  `Platform` days (1.52M / 574K / 519K / 864K).
- **Not read:** sessions split by build; the Profile / Citizenship / Experiment build split the reviewer also suggested.

*(inference)* Sessions ÷ `Platform` on 7–11 and 13 Oct = 1.07–1.10 (one session per real page load); on 12 Oct =
0.025. Against the 20.58K 90-day mean: 19 Sep ~+20.3K sessions vs ~+228K `Platform`; 3 Oct ~+16.6K vs ~+104K; 3 Sep
~+10.3K vs ~+95K; 28 Sep ~+9.7K vs ~+105K. Reading and caveats: report §2, §7, §10.

## Findings report (plan Part 3) — 2026-10-14, fkit-coder (Build worker, part C, spawned by `fkit-sprint-ship-loop`)

- **Written:** [`ai-agents/knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md`](../../../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md),
  all 13 sections of plan §3, from the pre-pass, the full code read and the sitting record above.
- **Headline [inference on obs]:** breach day 12 Oct (1,822.3/user). The excess is page loads with no play from a
  few dozen persistent clients on old builds (`0.0.136`/`0.0.140`/`0.0.151`/`0.0.154`, 48 GA users, ~86.6 % of the
  extra loads), RU only, with machine-equal per-build counts. Consistent with automated traffic; not a loop in our
  code; source not identified. Same shape on 4 Sep. `0230`: H1 refuted, H2 refuted as the cause (channel still open),
  H3 refuted, H4 confirmed (what, not who). Caveat 1 likely explained; caveat 2 unresolved.
- **Small extra code reads done in this part** (to support the report, read-only, at the named tags): reload sites in
  `0.0.136`/`0.0.140`/`0.0.151`/`0.0.154` (grep only); presence of Profile/Citizenship events per build; custom
  dimensions never registered (`FlashistFacade.ts:894-895` at `0.0.164`; SDK `GameAnalytics.node.js:1126-1143`,
  `:4040-4060`); SDK per-event OS/platform annotations (`:2021-2025`); HTML `no-store` already at `0.0.136`
  (`nginx.conf:232-238`); `webpack.config.js:167` at `0.0.140`; client OTEL `service.version` (`OtelBrowserInit.ts:40-41`).
  A scratch copy of `FlashistFacade.ts` at `0.0.164` was written to the session scratchpad (outside the repo) and deleted.
- **Not done here (by the driver's instruction):** the required `@fkit-reviewer` pass over the report (the driver runs
  it), and the fix decision put to the owner (plan §4).

### Decision log
- 2026-10-14 — Report + sitting record only. **No fix applied, no obvious-winner call: none.** Files written: this
  `worklog.md` (placeholder line under *Sitting record (plan Part 1)* replaced by a pointer; *Sitting record
  (2026-10-14)* and this section appended) and the findings report. No source, `plan.md`, status, `0230` or wiki
  touched; no commit.

## Revision (post-review) — 2026-10-14, fkit-coder (Build worker, part D, spawned by `fkit-sprint-ship-loop`)

Input: the reviewer's ephemeral pass over the report (R1–R10; coverage: reasoning-only second opinion; secrets check
PASS) and the sessions read (addendum above). Edited: the findings report and this worklog only.

### Extra code reads done in this part (read-only)
- **[code] SDK re-send path re-read** (`node_modules/gameanalytics/dist/GameAnalytics.node.js`, 4.4.7): clean-up
  re-marks every queued row `"new"` each 8-s tick (`:3105-3114`, `:3206-3208`, `:3570-3581`); OK deletes only rows
  still tagged with that request id (`:3168-3175`); an empty-body answer = NoResponse (`:2606-2609`) → reset to
  `"new"` (`:3176-3181`); ≤ 500 per send, oldest first when more (`:3131-3143`, `:3428`); no request timeout in the
  bundle.
- **[code] Re-sent queues can include session events:** the SDK's session start (`user`) goes into the same queue
  (`:2801-2815`), sent at once (`:2814`) but re-sent with the rest if that request stalls; `session_end` likewise.
- **[code] New for this revision — the queue is shared across builds.** Storage key = game key + `ga_event`
  (`:1661`, `:1672`, `:1763`); the build string is stamped on each event at creation and stored with it (`:2052`,
  `:3245-3256`). The key literals are identical at `0.0.136`, `0.0.140`, `0.0.151`, `0.0.154`, `0.0.164` (compared by
  shasum of the literals; values never printed), and `package-lock.json` pins SDK 4.4.7 at all five tags. ⇒
  [inference] a current page can re-send events queued by an old-build page, with the old build string.
- **[code] `gameanalytics@5.0.0`** (newest on npm, `npm view`, 2026-10-14): tarball fetched into an isolated scratch
  directory, grepped only (not run), then deleted — same `cleanupEvents`, same 8-s interval, no request timeout.
  Changelog not read. `GameAnalytics.setEventProcessInterval` exists in 4.4.7 (`:4078-4080` → `:3516-3519`).
- **[code]** `CITIZENSHIP_CARD_ENABLED` false at `0.0.140:FlashistFacade.ts:182`, `0.0.151:…:184`, true at
  `0.0.154:…:232`; early return `0.0.140:CitizenshipCard.ts:76-79`. `0.0.140:src/version.ts` reads `package.json`.
  `DEPLOY_ENV` prod default also at `0.0.136:webpack.config.js:331-332`; `build-prod` = `webpack --mode production`
  at `0.0.136`/`0.0.140`/`0.0.164`. `gh repo view` → `PUBLIC`. Tags `0.0.137`–`0.0.139` dated 2026-08-22.
- Checked and **dropped** (not written into the report, to avoid over-fitting): an idea that the 3× `0.0.154` count
  matched three spike days in `0.0.154`'s live window — it had two (26 Sep 14:33 → 29 Sep 22:05 Moscow), and 9 Sep
  (`0.0.141` live) / 25 Aug (`0.0.139` live) do not appear in 12 Oct's set.

### Changes by review item
- **R1 (medium)** — §3: column relabelled "indicative only, upper bound per category", with why (each category's own
  senders) and the Citizenship proof (absent at `0.0.136`; compiled off at `0.0.140`/`0.0.151`; on from `0.0.154`).
  "Matching what one load is observed to send" → code-based estimate (~9 Design per load on the three oldest builds,
  ~12–13 on `0.0.154`+, ~11 weighted for 12 Oct, +2 SDK) and 11.8 "consistent with" it. ⚠️ note corrected. "The start
  screen renders" removed. "Nothing after the load" kept, resting on UI/Match/Performance/Game flat.
- **R2 (medium)** — §7 reversed: SDK re-send is "a real amplifier, and the leading explanation for the big spike days",
  with the old wording named as circular. Summary, §4 (two readings of the equal counts), §10 (mechanism, verdict,
  what would settle it) and §12 (two-branch key fact; D/I demoted for re-sends; SDK guard C added) updated. Session
  events in re-sent queues: answered (yes, can be) with what it implies for the flat session count.
- **R3 (medium)** — §4: old-build sources now list (1) re-sent queued events and (2) old code running, with
  "anyone's production build of an old public commit" as its most direct candidate (build string = `package.json`
  version; `build-prod` with no `DEPLOY_ENV` → prod); note that a GA build string spans every commit between bumps
  (`0.0.136`: 6 Jun–22 Aug). §8: unsanctioned path open to anyone; "no evidence `0226` used" → "not determinable".
  §11 H1: the "no dev checkout would run it" reason dropped. H2 "refuted only in `0230`'s narrow wording". §12 E:
  not mere hygiene — stops future third-party builds; old commits stay fail-open.
- **R4 (medium)** — §11 H4: "confirmed only in that the excess lies outside 1–3, given those refutations; mechanism
  open, leaning re-send; source open; 3–5 Sep described, not explained". §10: 3 Sep disclosed as breaking the
  equal-counts pattern (77.26K vs ~20.5K).
- **R5 (low)** — §10/§11: `0.0.136` superseded 22 Aug by `0.0.137`–`0.0.139`, not "three months".
- **R6 (low)** — §10: 4 Sep DAU "≥ 4.77K lower bound" → "estimate ~4.77K", with why and the 12 Oct check
  (863.89K ÷ 166.65 ≈ 5.18K `Platform` senders vs DAU 5,822).
- **R7 (low)** — §9: ≈ 114 ÷ 3.6 ≈ 32 events per load ⇒ ~16 loads ≈ 4.4× to reach 500; 25+ named as the model's upper
  figure.
- **R8 (low)** — §4 table/§10: "all day" removed; the per-user interval is stated as assuming an even spread (hourly
  view unavailable).
- **R9 (nit)** — report header: SDK citations tied to `0.0.164:package-lock.json` pinning 4.4.7 = installed version.
- **R10 (nit)** — §4: custom-dimension gap credited to task `0212` (linked); §12 F: also unblocks `0212`'s
  segmentation question.
- **Lead's step 3 (`0230` verdicts)** — §11 rewritten; H3's two readings and the close-condition judgment point stated
  plainly, recommendation "put H3's reading to the owner".
- **Lead's step 4 (fix options)** — §12 re-lettered A–K with estimates; coder's suggestion marked as a suggestion.
- **Lead's step 5** — §13 owner note: the numeric GA game ID is in `ai-agents/sprints/backlog.md`, `0212`'s
  `brief.md:58` and `0439`'s `brief.md:9` (presence confirmed by digit-run count only; value not repeated); repo
  public; files not edited.
- **One point where this revision departs from the lead's brief:** the brief said "old-build clients still have to
  exist somewhere — that part stands". The shared-queue code fact above means old build strings do **not** by
  themselves prove old code is running; the report says so (§4) and keeps old copies as the weaker, not-excluded
  reading. Smaller-day extra sessions: computed as ~+10–20K against the 90-day mean (the brief said ~+8–18K).

### Decision log
- 2026-10-14 — Report revision only. **No fix applied, no obvious-winner call: none.** No source code written, so no
  approval marker was needed. Files written: the findings report and this `worklog.md` (sessions addendum + this
  section). No `plan.md`, `brief.md`, status, `0230`, `0212`, `0439`, sprint board or wiki touched; no commit.

## Plan gate and close — 2026-10-14, fkit-producer (spawned by `fkit-sprint-ship-loop`, no owner channel)

**Plan gate (plan §4, acceptance criterion 4) — the owner's rulings, verbatim.** Given live via `AskUserQuestion` in
the `fkit lead` session on 2026-10-14 and relayed by `fkit-lead` to this spawned producer (ADR-021/037); ⛔ not
producer precedent.

1. **Fix path.** The owner wrote, in the "Other" field: *"Do I understand correctly that you're saying that the problem
   is not going to be repeated in tegular situations? If yes, I suggest adding a task to the backlog sprint about
   monitoring the spikes in the future, but don't mention the proposed solutions there: to be honest, I don't like the
   options of us "intruding" into the GameAnalytics logic of deduplication and filtering events from not latest builds
   (the last one is a no-no, because we need to collect the events from all builds to be able to spot any problems
   during releases)"*. `fkit-lead` answered: normal days are fine (~114 events per user); spikes will very likely recur
   (~10 since late August); GameAnalytics' docs say alert only, no data loss. The owner then chose **"Yes, file it in
   Backlog (Recommended)"** — *"Monitoring only; no proposed solutions; nothing dropped or filtered."* — and **"Yes,
   close with the report (Recommended)"** — *"A producer closes 0456 (agent-closed marker); I put the 0230/0226/game-ID
   questions to you then."* ⇒ **build here vs follow-up brief: neither — no code fix.** The report's §12 options stay
   analysis only.
2. **`0230`:** **"Not answered: keep 0230 open (Recommended)"** — *"0230 stays on Backlog, noting the re-send
   explanation as its open lead; the new monitoring task covers future spikes."* ⇒ not cancelled.
3. **`0226` in or out:** **"Leave it where it is (Recommended)"** — *"You prefer not to change analytics now; it stays
   a separate Backlog task, with this new reason noted on it."* ⇒ out; dated note added to `0226`.
4. **Game ID:** question *"The numeric GameAnalytics game ID is written in 3 task files (backlog.md, 0212 brief, 0439
   brief) of a public repo, against the 'no IDs in files' rule. File a small task to remove it?"* → **"File in
   Sprint 8"**.

**Acts taken by this producer:** filed `0458` (Backlog board — monitoring only, per ruling 1) and `0459` (Sprint 8 —
remove the game ID, per ruling 4); dated notes on `0230` (ruling 2) and `0226` (ruling 3); closed this task via
`/fkit-task-done` as `✅ Done (agent-closed — not owner-verified)`. No source code changed in this task. No verify task
filed: there is no fix to verify. Nothing committed.
