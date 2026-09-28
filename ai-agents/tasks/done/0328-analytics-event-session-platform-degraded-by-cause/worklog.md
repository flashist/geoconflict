# 0328 worklog

Build worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (fkit-lead), 2026-09-28. Built against the
approved `plan.md` (`git hash-object` `bf7f610…`, verified unchanged before starting) and its owner rulings:
7 causes (option (a)), `Session:PlatformRecovered` kept and tied to late flags, enum key
`SESSION_PLATFORM_DEGRADED_FIRST_PART`, no browser driving by the coder.

## Red run (tests written first)

1. Both new suites before any source existed — both fail to load:
   `Cannot find module '../../src/client/PlatformDegradedAnalytics'` (2 suites failed, 0 tests ran).
2. After adding only `src/client/PlatformDegradedAnalytics.ts` (facade, template, enum untouched):
   `PlatformDegradedAnalytics.test.ts` PASS; `PlatformDegradedFacade.test.ts` **FAIL — 32 failed, 9 passed**.
   Every positive assertion failed (enum strings, all 7 causes, value 1, once-latch, flags-wait,
   marker write in `changeHref`, marker consume in `initializeImmediate`, `sdkInitRejected`, deadline
   stage `script`/`init`, Recovered, template `onerror`, gate wiring). The 9 that passed are "must not
   happen" guards that today's code satisfies trivially (other URL / `reloadApp` write no marker,
   navigation survives storage throwing, init resolving / post-init throw is not a rejection, stage-2
   deadline leaves stage unset, no Recovered without a degraded event, `onload` sets no failure flag).

## Change surface

- **New** `src/client/PlatformDegradedAnalytics.ts` — closed `PlatformDegradedCause` list (7),
  `classifyPlatformDegradedCause()` (first match wins: ScriptFailed → ScriptTimeout → InitFailed →
  InitTimeout → NoSdk → NoPlayer → NoFlags; `null` when SDK + player + flags present), `markMatchExit()` /
  `consumeMatchExitMarker()` over `sessionStorage` key `geoconflict.session.afterMatchExit` = `"1"`, every
  access (including the `window.sessionStorage` getter) in try/catch.
- `src/client/flashist/FlashistFacade.ts` (0303's uncommitted enum block left as is):
  - enum `SESSION_PLATFORM_DEGRADED_FIRST_PART: "Session:PlatformDegraded:"`,
    `SESSION_PLATFORM_RECOVERED: "Session:PlatformRecovered"`;
  - state fields `bootFollowsMatchExit`, `sdkScriptSettled`, `platformInitTimeoutStage`, `sdkInitRejected`,
    plus latches;
  - `initializeImmediate()` consumes the marker on every boot;
  - `initializePlatform()` registers `flashist_waitGameInitComplete().then(logPlatformDegradedEvent)` once;
  - deadline branch records stage `script`/`init` from `sdkScriptSettled`;
  - `yandexSdkInit` sets `sdkScriptSettled` after the script wait and `sdkInitRejected` in the catch;
  - late-recovery site: `initExperimentFlags().then(logPlatformRecoveredIfDegraded)`;
  - `changeHref(value)` marks only when `value === this.rootPathname`; `reloadApp()` untouched.
- `src/client/yandex-games_iframe.html` — loader `onerror` now
  `window.flashist_sdkScriptLoadFailed = true; window.flashist_sdkScriptReadyResolve()` (0303's title and
  modal-tag edits left as is). `index.html` unchanged (no SDK script there).
- `ai-agents/knowledge-base/analytics-event-reference.md` — two Session rows, a *Platform degraded causes*
  note, `PlatformInitTimeout` wording "once per stage" → "once per boot (latched)", pointer from
  `Player:YandexUnknown`. 0250/0303 edits elsewhere left as is. Prettier **not** run over the doc (per the
  driver's instruction), so the two new rows are not column-aligned — same as the Citizenship table.
- **New tests** `tests/client/PlatformDegradedAnalytics.test.ts` (20),
  `tests/client/PlatformDegradedFacade.test.ts` (45).
- Not touched: `CitizenshipCard.ts` (0326 in flight), `tests/client/FlashistFacade.test.ts`, wiki.

## Verification

- Focused: the 2 new suites + `FlashistFacade`, `InterstitialAnalytics`, `CitizenshipCard` suites —
  **211/211 pass**.
- `npx tsc --noEmit -p .` — 0 errors.
- `npx prettier --check` on the 4 edited/new TS files — clean (prettier `--write` run only on the 2 new
  test files).
- `npx eslint src tests` — exit 0. ⚠️ `npm run lint` (whole repo) reports **1 error, not from this task**:
  `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` "was not found by the project service" — an
  untracked 0325 file outside the tsconfig. Left alone.
- Full `npm test` — **172/172 suites, 3039/3039 tests pass, first run.** No `supertest` flake, no
  SIGSEGV, so no re-run was needed.
- **Not verified by me: the local browser check** (owner ruling "You run it later"). Steps below.

## Owner-owed: local browser check (plan §5 step 2)

⚠️ **Never plain `npm run build-prod`** — `webpack.config.js` defaults `DEPLOY_ENV` to `prod` for a
production build, so the page would send **real events to live GameAnalytics**. With `DEPLOY_ENV=dev`
`flashist_logEventAnalytics` only prints `flashist_logEventAnalytics | logEvent __ event: …` to the console.

1. `DEPLOY_ENV=dev npm run build-prod`
2. Serve `static/` with any local static file server and open `yandex-games_iframe.html` from it.
3. DevTools → Network → *Block request URL* on the SDK loader (the `sdk.js` URL in
   `yandex-games_iframe.html`), then reload.
   - **Expect:** exactly one console line with event `Session:PlatformDegraded:ScriptFailed`, value `0`,
     after the loading screen lifts. The card is absent.
4. In the console: `FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname)` (or finish /
   skip the tutorial, which exits through the same call).
   - **Expect:** on the next load, `Session:PlatformDegraded:ScriptFailed` with value `1`.
5. Optional: reload once more normally (no match exit) → value back to `0` (marker consumed).
6. Optional: unblock the loader, keep the page top-level (not in Yandex's frame) → the loader runs but
   leaves no SDK → expect `Session:PlatformDegraded:NoSdk`, value `0`.

`npm run dev` also shows this event (the `GAME_ENV` flag override does not affect it), but the steps above
match the production build.

## Decision log

Build worker under the declared-approval marker; everything below is inside the approved plan. No review
fixes were applied (this was the build step, not a review round).

1. **`sdkInitRejected` is set in the `yandexSdkInit` catch only when no SDK was assigned.** Finding
   answered: none (build detail). What changed: `if (!this.yandexGamesSDK) this.sdkInitRejected = true;`
   in the catch. Why it qualified (obvious winner within intent): that catch also catches a throw from the
   post-`init()` recovery steps, when the SDK *is* assigned; the brief defines `InitFailed` as
   "`YaGames.init()` rejected", so the guard keeps the cause honest. Tested
   ("a post-init step throwing is not an init() rejection").
2. **Facade tests live in a sibling file** `tests/client/PlatformDegradedFacade.test.ts`, as the plan
   allows. Why: the gate-wiring test opens the module-level game-init gate for the rest of its file;
   isolating it keeps `FlashistFacade.test.ts` untouched.
3. **Plan risk 3 fallback not needed:** the deadline-branch tests drive the real `runPlatformInit` with
   stubs and fake timers (stage `script`, stage `init`, and a stage-2-only deadline that leaves the stage
   unset).
4. **`consumeMatchExitMarker` returns `false` if `removeItem` throws** after reading `"1"` — the plan's
   test list; conservative (a marker that cannot be removed could otherwise count twice).

## Decision log — review round 1 (Process-review worker)

Process-review worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (fkit-lead), 2026-09-28, under the
approved plan (`bf7f610…`). Both findings were dispositioned by **live owner rulings** relayed by the driver,
not by the unattended fix path — so no fix below was applied on my own verified-`CORRECT` judgment alone, and
no obvious-winner call was made.

1. **R1 (doc over-claims "card lost its data")** — owner ruling "Reword the doc". What changed (wording
   only, no behaviour change): `analytics-event-reference.md` — the `SESSION_PLATFORM_DEGRADED_FIRST_PART`
   row now says "Yandex platform degraded: SDK, player or flags missing" with a ⚠️ "not a count of hidden
   citizenship cards" clause; the *Platform degraded causes* note says the card hides only on missing
   flags, and that `NoPlayer` / a flags-present timeout fire with the card shown. Same claim removed from
   three code comments: the enum comment and the `initializePlatform()` comment in `FlashistFacade.ts`, and
   the header comment of `PlatformDegradedAnalytics.ts`. Why it qualified: verified `CORRECT` (card gates on
   flags only) + owner-directed + comment/doc-only. Checked: 3 suites 95/95, eslint and prettier clean on
   the two TS files; Prettier not run over the doc.
2. **R2 (empty / keyless flags object)** — owner ruling "Accept as known". No change. Recorded as an accepted
   residual in `review.md`, including the kill-switch trap (test the key is missing, never `!== "enabled"`).
