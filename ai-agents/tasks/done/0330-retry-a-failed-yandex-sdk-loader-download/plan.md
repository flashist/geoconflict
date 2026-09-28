**Plan-only. No source, no files, no `plan.md` written.** (Spawned, so there is no plan-mode tool. I followed the planning-only rule by hand.)

- **Brief path:** the spawn's path does not exist. The real folder is `ai-agents/tasks/backlog/0330-retry-a-failed-yandex-sdk-loader-download/brief.md`, and `0049`'s dated note already links there.
- **Shape:** we retry only the loader **download**, and only after its `onerror` fired, meaning none of its code ran. `YaGames.init()` is never retried or called again. A retry that succeeds after the 5 s deadline flows into the existing late-recovery branch, which already fires 0328's `Session:PlatformRecovered` and 0329's `whenPlatformRecoveredLate()`.
- **A retried-then-OK load must NOT log `ScriptFailed`.** Today's classifier would mislabel one case, so a one-line fix is included (§4).
- **2 decisions for the owner:** D-A (whether the boot waits the full 5 s once the quick retries have failed) and D-B (whether to add a small retry-outcome event). Both are below.
- **Size:** ~1 day. The 0328 and 0329 work this builds on is uncommitted and agent-closed, so this task layers onto a dirty tree in `FlashistFacade.ts`, `yandex-games_iframe.html`, `analytics-event-reference.md` and `tests/client/PlatformDegradedFacade.test.ts`.

---

# Plan — 0330 Retry a failed Yandex SDK loader download (download only, never `init()`)

## 1. Ground truth (read this session)

- **Template** `src/client/yandex-games_iframe.html:23-25`:
  - one `async` loader tag;
  - `onload` resolves `flashist_sdkScriptReadyPromise`;
  - `onerror` sets `window.flashist_sdkScriptLoadFailed = true` (0328) and resolves the same promise.
  - `index.html` has no loader tag and no promise, so `waitForSdkScript()` resolves instantly there and the flag stays unset.
- **`yandexSdkInit()`** (`FlashistFacade.ts:907-998`):
  1. awaits the template promise;
  2. sets `sdkScriptSettled = true`;
  3. if `YaGames` is undefined, returns (a failed download ends here, never recovered);
  4. otherwise calls `YaGames.init()` once. On success it runs the late-recovery block. That block chooses the "late" path only when `this.playerInitResultPromise` is already set, i.e. stage 2 of platform init has run. It then re-fetches flags, calls `logPlatformRecoveredIfDegraded()`, re-primes the badge, inits payments, recovers the player, and calls `markPlatformRecoveredLate()`, which resolves the 0329 signal the card subscribes to at `CitizenshipCard.ts:198`.
- **`runPlatformInit()`** (`:647-`):
  - one 5 s `deadlinePromise`;
  - races `sdkInitDone` against it; on deadline it sets `platformInitTimeoutStage = sdkScriptSettled ? "init" : "script"` and logs `Session:PlatformInitTimeout`;
  - the 1 s login-status window (`sdkReadyForSessionPromise`) starts from the **template** promise.
- **0328 classifier** (`PlatformDegradedAnalytics.ts`):
  - returns `null` when SDK, player and flags are all present;
  - otherwise the first match wins: `ScriptFailed` (raw window flag) → `ScriptTimeout` → `InitFailed` → `InitTimeout` → `NoSdk` → `NoPlayer` → `NoFlags`.
  - It runs once, at the game-init gate (`logPlatformDegradedEvent`, `:828`).
- **Facade tests use `Object.create(FlashistFacade.prototype)`**, so class-field initialisers do not run. All new state must be optional or lazy (the 0329 pattern, `:1243-1246`).
- **Local build rule:** `DEPLOY_ENV=dev npm run build-prod`. `GAME_ENV` stays `prod`, so flag gating is real, but no analytics reach production (`webpack.config.js:335-337`). This overrides the brief's plain `npm run build-prod`.

## 2. Design

### 2a. Where the retry lives
- **New module `src/client/SdkLoaderRetry.ts`**, next to `PlatformDegradedAnalytics.ts`. Mostly pure, unit-testable:
  - `SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS = [500, 1500]` and `SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS = [5000, 15000, 45000]`. Cap: 5 retries, so at most 6 downloads per page.
  - `runSdkLoaderRetries(delaysMs, attemptDownload, sleep)`. For each delay: sleep, then try once. It stops on the first `"load"` and returns `{ loaded, retriesMade }`. It also stops (never inserts) if `YaGames` is already defined before an attempt.
  - `reinsertSdkLoaderScript(doc)`:
    - finds the tag by id (next bullet);
    - reads its resolved `.src`, so the host stays only in the template;
    - removes the failed tag, then appends a fresh `async` `<script>` with the same id and src;
    - resolves `"load"` / `"error"` from that tag's own handlers;
    - resolves `"missing"` if no tag is found, which means no retry and today's behaviour;
    - never throws, and never puts the src into a log or an analytics string.
- **Template:** add **one attribute**, `id="flashist-yandex-sdk-loader"`, to the loader tag. No new inline script, `onerror` unchanged. `index.html` is untouched because it has no loader, so the "both templates" rule does not apply.

### 2b. The two phases (see D-A)

Recommended "split" form:

1. **Memoised `waitForSdkLoader()`** (lazy field). It:
   - awaits the template promise;
   - if `flashist_sdkScriptLoadFailed === true` **and** `YaGames` is undefined, runs the **in-deadline** retries;
   - on success sets `sdkLoaderRecoveredByRetry = true`.
   - It replaces `waitForSdkScript()` in **both** callers: `yandexSdkInit` and `sdkReadyForSessionPromise`.
2. **`yandexSdkInit()`** awaits `waitForSdkLoader()`, then sets `sdkScriptSettled = true`.
   - `YaGames` present: call the **extracted** `initLoadedYandexSdk()`, which is today's body from `this.yaGamesAvailable = true` to the end, **moved unchanged**.
   - Still absent **and** the download failed: start the **background** phase detached, then return. This keeps today's "failed download → degraded now" timing, only about 2 s later instead of instantly.
     - On a background `"load"`: set `sdkLoaderRecoveredByRetry = true`, then call `void this.initLoadedYandexSdk()`.
     - The background phase is started once per page (latched).
   - Absent after a **successful** load (not in a frame): today's `NoSdk` return. No retry.
3. **Deadline semantics unchanged.** `PLATFORM_INIT_DEADLINE_MS` is not touched and no other stage's timing changes.
   - An attempt still downloading at 5 s simply loses the race, exactly like today's slow first download: stage `"script"` and the timeout event.
   - If that attempt then loads, `yandexSdkInit` continues into `initLoadedYandexSdk()` on the late path.

### 2c. Hard rule: never run the loader twice, never re-init
- A retry is only ever triggered by a recorded `onerror`, and an errored script never executed.
- The next attempt starts only after the previous one reported `"error"`, and the old tag is removed first.
- There is never a retry after `"load"`. The `onload` path never sets the flag, so it never enters retry code.
- `YaGames.init()` is still called at most once per page: `initLoadedYandexSdk()` is reached once, either from the in-deadline path or from the background path, never both.
- An `init()` that rejects or hangs behaves exactly as today. The retry scope ends at the loader.
- Trigger C (inner SDK file failing after Yandex's own 3 retries) is untouched. That is an `init()` rejection, and 0049's reasoning holds.

## 3. How a late (background) success reaches 0329 — requested

The background phase starts only after `yandexSdkInit` has returned, and stage 2 runs straight after that. So by the time a background download succeeds (at least 5 s later), `playerInitResultPromise` is already set. `initLoadedYandexSdk()` then takes the **existing** late branch unchanged:
- `yandexGamesReadyCallback()` after the gate;
- flags re-fetch → `logPlatformRecoveredIfDegraded()` (0328);
- badge re-prime and `initPayments()`;
- player recovery;
- `markPlatformRecoveredLate()` → `whenPlatformRecoveredLate()` resolves → the card re-checks its gate (0329) and reveals only on a real `enabled` flag (0291 fail-closed kept).

No new signal and no second reveal path. The same holds for an in-deadline attempt that finishes after the deadline.

## 4. Interaction with 0328's classification and analytics — requested

| Case | Today, without a change | Planned |
|---|---|---|
| Retried in the deadline, then SDK, player and flags all OK | classifier returns `null` (no event) | same, `null` |
| Retried in the deadline, loader OK, but player or flags missing | **`ScriptFailed`** (raw flag, first match) — **mislabel** | `NoPlayer` / `NoFlags` / `InitFailed` etc. The facade passes `scriptFailed: flag === true && !this.sdkLoaderRecoveredByRetry` |
| Every in-deadline retry failed | `ScriptFailed` | `ScriptFailed`, now meaning "`onerror` ran **and** the in-deadline retries did not recover it by the check" |
| Background success after the gate | — | `ScriptFailed` already fired at the gate (true at that moment). Then `Session:PlatformRecovered` fires when flags arrive: the existing `platformDegradedWithoutFlags` path, same value 0/1 |
| Attempt still downloading at 5 s | `ScriptFailed` + `Session:PlatformInitTimeout` | same (the raw flag is still set and not yet recovered) |

**Should a retried-then-OK load log `ScriptFailed`? No.** The event answers "why is this page degraded". If the retry fixed the script, the script is not the reason.

The cost: in-deadline saves become **invisible** in 0328's events. The only trace is `ScriptFailed` going down, and traffic changes can hide that. D-B offers a small event to count saves directly.

**Also fixed:** the 1 s `Player:Yandex*` window now starts from the loader that actually loaded (step 1 in §2b). Without this, every retried-then-OK boot would log `Player:YandexUnknown` for a logged-in player, which would grow M3's upper bound.

**`Session:PlatformInitTimeout` (M2):** with the split design this is unchanged. A loader that fails fast and stays down still produces no timeout event, as today. Under D-A's alternative it would start firing for every such boot.

## 5. Files

| File | Change |
|---|---|
| `src/client/yandex-games_iframe.html` | Add `id="flashist-yandex-sdk-loader"` to the loader tag. Nothing else. |
| `src/client/SdkLoaderRetry.ts` (new) | Delay constants, `runSdkLoaderRetries`, `reinsertSdkLoaderScript`. |
| `src/client/flashist/FlashistFacade.ts` | Memoised `waitForSdkLoader()` used by both callers; extract `initLoadedYandexSdk()` (a move, no edits); background kick-off (latched); lazy `sdkLoaderRecoveredByRetry`; classifier input `scriptFailed`; comments. If D-B is approved: enum key + one fire site. |
| `src/client/PlatformDegradedAnalytics.ts` | Comment only: the `ScriptFailed` meaning. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | `ScriptFailed` wording (after the in-deadline retries); `PlatformRecovered` can now follow `ScriptFailed` via a background retry; `Player:YandexUnknown` window note; plus the new row if D-B is approved. English only, no UI text, so no `en.json`/`ru.json` change. |
| `tests/client/SdkLoaderRetry.test.ts` (new, jsdom) | Helper tests (§6). |
| `tests/client/SdkLoaderRetryFacade.test.ts` (new, jsdom) | Facade integration (§6). A separate file keeps 0328's suite and its "last on purpose" gate test untouched. |
| `tests/client/PlatformDegradedFacade.test.ts` | Add: the template loader tag carries the id. Existing tests are unaffected: they never set the new field, and the ones that set the flag call only `logPlatformDegradedEvent`. |

## 6. Tests (brief item 6, plus the classification cases)

Fake timers throughout. The download attempt is stubbed on the `Object.create` facade; the stub sets `win.YaGames` when it returns `"load"`.

1. **Fail → retry → success in the deadline.** `YaGames.init` called once; normal path (`whenPlatformRecoveredLate` never resolves); no degraded event; no timeout event; 1 retry made at +500 ms.
2. **Fail ×3 → degraded → background success → late recovery.** The gate check logs `ScriptFailed`; the background attempt at +5 s loads; `init` called once; `whenPlatformRecoveredLate()` resolves; `Session:PlatformRecovered` fires.
3. **Cap.** Always `"error"` → exactly 5 retries (+0.5, +1.5, +5, +15, +45 s), and none after advancing another 10 min.
4. **The `onload` path never retries.** Flag unset → zero attempts.
5. **An `init()` rejection is never retried.** Loader OK, `init` rejects → `init` called once, zero reinserts, `sdkInitRejected` set.
6. **Exactly one loader tag.** In the helper test (jsdom, events dispatched by hand), exactly one `script#flashist-yandex-sdk-loader` exists after each reinsert, the failed tag is removed first, and no insert happens after `"load"`. The test uses a fake `.invalid` src, never the real host.
7. **Missing tag** → `"missing"`, no retry, no throw, today's behaviour.
8. **Classification.** Retried-then-OK with no player → `NoPlayer`, not `ScriptFailed`. All in-deadline retries failed → `ScriptFailed`.
9. **Login window.** Retried-then-OK with a fast `init` and an authorised player → `Player:YandexLoggedIn`, not `Unknown`.
10. **Standalone.** No template promise and no flag → zero attempts.
11. **Existing suites stay green:** `FlashistFacade.test.ts` (0329 recovery suite), `PlatformDegradedFacade.test.ts`, `PlatformDegradedAnalytics.test.ts`, `CitizenshipCard.test.ts`.

## 7. Verification

1. Targeted suites, then `npm run lint`, then full `npm test`. For the known `supertest` flake, follow the CLAUDE.md procedure: rule out the SIGSEGV first, re-run, and say that I re-ran.
2. **Local browser**, if a browser tool is available. Playwright MCP failed to connect this session; claude-in-chrome may work, otherwise hand this step to the owner.
   - Build with `DEPLOY_ENV=dev npm run build-prod`, serve `static/`, open the iframe harness, and in DevTools block the loader request (Disable cache on).
   - Unblock within about 1 s → Network shows a second loader request succeed and exactly one executed loader.
   - Unblock after about 10 s → retries at about +0.5 / +2 s fail, then a background request at about +5 s succeeds.
   - ⚠️ The harness parent never answers the loader, so `init()` hangs there. "Boot not degraded" and "card reappears" are therefore **not observable locally**; the unit tests prove them. The worklog must state exactly what was and was not seen: counts and yes/no only, no URLs, hosts or query values.
3. **Worklog decision log** (ADR-020): record any obvious-winner call, or `none`.
4. **Owner, after release (informational):**
   - `Session:PlatformDegraded:ScriptFailed` before and after the release;
   - `Session:PlatformRecovered`;
   - M3 and M6 against M1;
   - the D-B event, if added.

## 8. Risks / unverified

- **Dynamically re-inserting Yandex's loader** has not been checked against Yandex moderation rules or the loader's own logic. It is the same URL and the same async tag, and the loader should see a normal `document.currentScript`. Low risk, **unverified**.
- **Whether a retry really succeeds for players is unmeasured.** The report's evidence is circumstantial.
- **An `online`-event trigger is not added** (outside the brief). A player offline for longer than about 67 s total gets no recovery.
- **The wiki page `systems/flashist-init` will be stale** ("Rejected SDK init does not retry"). That is still true for `init()`, but download retry is new. A wiki ingest follows the close; that is not my write.

---

## Open questions

**NEEDS-DECISION D-A**
- **Question:** once the quick retries inside the 5 s window have all failed, should the game start right away in "no Yandex" mode, or wait out the rest of the 5 s?
- **Options:**
  1. **(Rec) Start right away and keep retrying in the background.** When the loader is truly down, the menu appears after about 2 s. Today that boot is instant, so this adds about 2 s. The "start-up took too long" counter (`Session:PlatformInitTimeout`) keeps its current meaning.
  2. **Wait the full 5 s every time.** One simpler retry loop. But a player whose Yandex script is truly down always waits 5 s, and every such boot starts counting as "start-up took too long". That blurs a number the owner already reads.
  3. Explain more, then ask again.
- **Recommendation:** option 1.
- **Context (plain words):** the owner ruled "a couple of retries within the 5 s start-up limit, then quiet background retries". Both options obey that ruling. They differ only in what happens in the gap between "quick retries used up" and "5 s reached": either the game starts now, or it sits on the loading screen doing nothing. The 5 s limit itself does not change either way.

**NEEDS-DECISION D-B**
- **Question:** add one small analytics event that counts what the retry did on each page (`Session:SdkLoaderRetry:{Recovered|RecoveredLate|GaveUp}`, value = number of retries)?
- **Options:**
  1. **(Rec) Yes.** About 20 lines, tests and one row in the analytics reference. It fires only when the first download failed, at most once per page, and carries no ids, hosts or URLs. It directly shows how many loads the retry saved inside the 5 s, how many it saved later, and how many it gave up on.
  2. **No.** Keep to the brief's scope. The effect can only be guessed from `ScriptFailed` dropping after release, which traffic changes can hide, and saves inside the 5 s leave no trace at all.
  3. Explain more, then ask again.
- **Recommendation:** option 1.
- **Context (plain words):** once the retry works, a saved page load looks exactly like a page load that never had a problem. The existing events from task 0328 then cannot tell us the retry helped. The owner ruled to measure this area (D-2), and this event is the cheapest way to see the retry's own effect. It is outside the brief's literal list, so it needs the owner's yes.

---

## What's next?

The driver relays D-A and D-B to the owner along with this plan. Once the owner approves, the Build worker implements §2–§7. Nothing is written until then.

---

## Owner rulings (recorded by the driver, `fkit-sprint-ship-loop` / fkit-lead, 2026-09-28)

Given live in the `fkit lead` session via `AskUserQuestion` (ADR-021/037). Verbatim answers:

- **NEEDS-DECISION D-A (after the in-window retries fail):** "Start now, retry quietly (Recommended)" ⇒ option 1, the split design of §2b: degrade after the in-deadline retries (~2 s), background retries continue; `Session:PlatformInitTimeout` keeps its meaning.
- **NEEDS-DECISION D-B (retry-outcome event):** "Yes, add it (Recommended)" ⇒ build `Session:SdkLoaderRetry:{Recovered|RecoveredLate|GaveUp}`, value = number of retries; fires only when the first download failed, at most once per page; enum only; no ids/hosts/URLs; one row in `analytics-event-reference.md`; tests.
- **Local browser check (§7 step 2):** "You run it later (Recommended)" ⇒ the coder does NOT drive any browser (not Playwright, not claude-in-chrome); exact steps go in the worklog (`DEPLOY_ENV=dev npm run build-prod` only); listed as owner-owed at close.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
