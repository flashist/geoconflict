## 0328 plan: `Session:PlatformDegraded:{Cause}` (PLAN ONLY, nothing written)

**Summary**
- Plan is ready. I wrote no source or files and created no `plan.md`. Spawned consult, so there was no `EnterPlanMode`; I kept to planning by my own rule.
- **No overlap with 0326.** 0326 touches `CitizenshipCard.ts` and `PlayerProfileView.ts`. This plan touches neither. Its files: `FlashistFacade.ts`, `yandex-games_iframe.html`, one new module, tests, and the analytics reference doc.
- **Three places where I refine the brief. Each is stated below for the owner to approve:**
  1. When the check runs. It runs at the card's own decision point, so the event means "the card really lost its data".
  2. Cause list. The brief's five causes are not complete: one real no-SDK case matches none of them. → **NEEDS-DECISION 1**.
  3. `Session:PlatformRecovered`. I propose tying it to *flags* arriving late, not to the SDK arriving. → **NEEDS-DECISION 2** (keep or drop).
- **Verification trap.** A plain `npm run build-prod` bakes in `DEPLOY_ENV=prod`, so a local test sends **real GameAnalytics events to production**. Use `DEPLOY_ENV=dev npm run build-prod` instead. That sends nothing and still prints the event to the console. Local browser check with the loader blocked: I have not yet confirmed a way to automate it (Playwright MCP is down). It may need the owner.

---

### 1. Facts checked in the code (working tree, 2026-09-28)
- The brief's line references match the working tree. That includes the uncommitted 0303 changes: `changeHref` `:785`, `reloadApp` `:796`, deadline branch `:642`, `YaGames.init()` `:821`, catch `:867`.
- **The card waits for flags that are still loading.** `CitizenshipCard.connectedCallback` → `flashist_waitGameInitComplete()` → `isCitizenshipUiEnabled()` → `checkExperimentFlag` → `initExperimentFlags` → `loadExperimentFlags()`. That last call awaits the stored `getFlags()` call, which gives up after 5 s. So if flags are merely slow when the gate opens, the card is **not** hidden. It is hidden only if `getFlags()` fails or times out, or if there is no SDK. A naive "flags missing at gate time" check would overcount `NoFlags`.
- **`changeHref` callers:**
  - The 4 match exits: `WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160`, `TutorialLayer.ts:318`. All pass `rootPathname`.
  - `Main.ts:728` (`#refresh` hash). Also `rootPathname`, but it is not a match exit. It is nearly unreachable: the `#refresh` push was removed (`Main.ts:840-843`).
  - `Cosmetics.ts:74` (Stripe checkout URL, not `rootPathname`).
- **A no-SDK case outside the brief's list:** the loader script *loaded*, but `YaGames` is still undefined. Per the 0318 report §2.3, the loader does nothing when the page is not inside a frame. `yandexSdkInit` returns early (`:814-817`): no `init()`, no rejection, no deadline hit. None of the five causes matches, yet the card is hidden.
- **`InitTimeout` as written in the brief covers two things:** "the loader script is still downloading at 5 s" and "`init()` hangs" (trigger B). Both go through `sdkOutcome === "deadline"`, because `yandexSdkInit` first awaits the script.
- `index.html` (the standalone web page) has no SDK script, so `yaGamesAvailable` is false there and the event will never fire. The template flag is needed only in `yandex-games_iframe.html`; `index.html` needs no change.
- `GAME_ENV === "dev"` forces flags on only inside `checkExperimentFlag`. The new check reads the facade's state directly, so it behaves the same in dev. In dev, `flashist_logEventAnalytics` only writes to the console.

### 2. Design

**New module `src/client/PlatformDegradedAnalytics.ts`.** Pure and testable, following the `SessionMatchAnalytics.ts` / `DaysPlayedAnalytics.ts` pattern.
- `type PlatformDegradedCause`: a closed list of strings (final list per NEEDS-DECISION 1).
- `classifyPlatformDegradedCause(state)` → cause or `null`. `state` = `{ scriptFailed, scriptTimedOut, initFailed, initTimedOut, hasSdk, hasPlayer, hasFlags }`.
  - Returns `null` when SDK, player and flags are all present.
  - Otherwise the first match wins, in this order: **ScriptFailed → [ScriptTimeout] → InitFailed → InitTimeout → [NoSdk] → NoPlayer → NoFlags**. Bracketed entries depend on decision 1.
- `markMatchExit()` / `consumeMatchExitMarker(): boolean`.
  - Key: `geoconflict.session.afterMatchExit`, value `"1"`. No ids.
  - **Every access sits inside try/catch, including reading `window.sessionStorage` itself**, which can throw in a sandboxed iframe. A missing or throwing storage makes consume return `false` and makes mark do nothing.
  - Both take an optional storage argument (the `StorageLike` pattern) for tests.

**`FlashistFacade.ts`**
1. Enum:
   - `SESSION_PLATFORM_DEGRADED_FIRST_PART: "Session:PlatformDegraded:"`. The cause is appended at the call site, like `MATCH_LEADERBOARD_AWARD` / `LOCKED_FEATURE_TAP_FIRST_PART`. The cause comes only from the module's closed list, never from free text.
   - If kept: `SESSION_PLATFORM_RECOVERED: "Session:PlatformRecovered"`.
   - ⚠️ The brief names the key `SESSION_PLATFORM_DEGRADED`. I propose the `_FIRST_PART` suffix because the value is a prefix, which matches the enum's existing naming. Easy to revert if the owner prefers the brief's exact name.
2. State fields, recorded where each thing happens:
   - `sdkScriptSettled`: set in `yandexSdkInit` right after `await this.waitForSdkScript()`.
   - `platformInitTimeoutStage: "script" | "init" | undefined`: set in the `sdkOutcome === "deadline"` branch (`:642`) from `sdkScriptSettled`. This is separate from `deadlineEventLogged`, which also covers the stage-2 player/flags deadline. That stage-2 case is correctly reported as `NoPlayer` or `NoFlags`, not as a timeout.
   - `sdkInitRejected`: set in the `yandexSdkInit` catch (`:867`).
   - `scriptFailed`: read at check time from `window.flashist_sdkScriptLoadFailed === true`.
3. **After-match marker.**
   - Read and remove it in `initializeImmediate()` on **every** boot, healthy ones included, so an old marker never carries over to a later boot. Store the result in `bootFollowsMatchExit`.
   - Write it in `changeHref(value)` **only when `value === this.rootPathname`**, before `location.href`. This leaves out the Stripe URL.
   - `reloadApp()` is untouched and never writes it.
   - Accepted edge case: the near-dead `#refresh` path (`Main.ts:728`) also marks. The alternative is editing the 4 upstream exit sites, which costs more for almost no gain.
4. **When the check runs.**
   - `initializePlatform()` registers once: `void flashist_waitGameInitComplete().then(() => this.logPlatformDegradedEvent())`.
   - `logPlatformDegradedEvent()`:
     - latched to once per page;
     - wrapped entirely in try/catch;
     - returns if `!yaGamesAvailable`;
     - `await this.loadExperimentFlags()`, the **same wait the card does**;
     - classifies;
     - if there is a cause: `flashist_logEventAnalytics(prefix + cause, bootFollowsMatchExit ? 1 : 0)`, and records whether flags were missing at that moment.
   - Why the card's gate and not the end of platform init: that is exactly when the card decides. The trade-off is that the event goes unsent if the app chunk never loads, but then no card exists either.
5. **`Session:PlatformRecovered`** (if kept):
   - In the late-recovery code, change `void this.initExperimentFlags()` (`:836`) to `void this.initExperimentFlags().then(() => this.logPlatformRecoveredIfDegraded())`.
   - It fires once, same after-match value, **only if** the degraded event already fired *with flags missing* and flags have now arrived.
   - It does nothing on a healthy boot, and when flags recovered before the check (the card showed, so nothing to recover).
   - Handles either order of "flags arrive" and "check runs".

**`yandex-games_iframe.html:26`.** `onerror` becomes `window.flashist_sdkScriptLoadFailed = true; window.flashist_sdkScriptReadyResolve()`. The template only records the failure; all logic stays in TS.

**Docs, `analytics-event-reference.md`** (the file has uncommitted 0250/0303 edits elsewhere; edit on top without touching them):
- Session Events table, new rows for both events: enum key, string, when it fires, value meaning (0/1 = after a match exit), cause list and order, and that it is measured at the card's decision point.
- Fix the `SESSION_PLATFORM_INIT_TIMEOUT` wording: "at most once per stage" → "at most once per boot (latched)".
- Add a pointer from the `PLAYER_YANDEX_UNKNOWN` row: "for the cause, see `Session:PlatformDegraded:*`".
- English only; no `en.json` / `ru.json` change.
- `wiki/systems/analytics.md:67` has the same drift. That is a wiki write, so the fix goes to fkit-wiki after close; I will not touch it.

### 3. Order of work
1. Module plus its unit tests.
2. Facade enum, state fields, marker read/write, check method, recovery hook.
3. Template `onerror`.
4. Facade tests.
5. Docs.
6. `npm run lint`, focused tests, then full `npm test` (for the known `supertest` flake, follow CLAUDE.md: rule out the 0197 SIGSEGV first, re-run, and say so).
7. Local browser check.

### 4. Tests
**`tests/client/PlatformDegradedAnalytics.test.ts`** (new):
- each cause on its own;
- first match wins when several apply (e.g. ScriptFailed + NoPlayer + NoFlags → ScriptFailed; InitFailed + InitTimeout → InitFailed);
- `null` when healthy;
- mark → consume is true → a second consume is false;
- setItem, getItem or removeItem throwing → no throw, consume false;
- null storage → false;
- the `window.sessionStorage` getter throwing (`Object.defineProperty`) → false, no throw.

**Facade tests.** Prototype-instance pattern, `jest.mock("gameanalytics")`, `DEPLOY_ENV=prod`, as in `InterstitialAnalytics.test.ts`:
- each cause fires exactly one `Session:PlatformDegraded:<Cause>` with value 0, or 1 when the marker was set;
- a second call fires nothing;
- a healthy boot fires nothing;
- `yaGamesAvailable=false` fires nothing;
- **flags still loading, then arriving → no event** (the refinement from §1);
- flags still loading, then failing → `NoFlags`;
- `changeHref(rootPathname)` writes the marker; `changeHref(otherUrl)` does not; `reloadApp` does not;
- storage throwing in `changeHref` → navigation still happens;
- `initializeImmediate` consumes the marker;
- `yandexSdkInit` with `init()` rejecting sets `sdkInitRejected`;
- the deadline branch sets the script/init stage (fake timers; heavy stubbing, see risk 3);
- Recovered: fires once after a degraded-without-flags check plus late flags; not when flags were present at the check; not without a degraded event.

**Template text check** (a read-file assertion): `onerror` sets the flag **and** still resolves the ready promise, so boot can never hang.

All of these fail on today's code, because the symbols and behaviour do not exist yet.

### 5. Verification
1. The tests above; lint clean; full `npm test` (report any flake re-run).
2. **Local:** `DEPLOY_ENV=dev npm run build-prod`, serve `static/`, open `yandex-games_iframe.html`, block the SDK loader URL in DevTools.
   - Expected: `Session:PlatformDegraded:ScriptFailed`, value 0, logged once.
   - Then from the console run `FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname)`, or skip the tutorial. The next boot should log value 1.
   - ⚠️ **Never use plain `npm run build-prod` for this** (`webpack.config.js:336-338`: `DEPLOY_ENV` defaults to `prod`, so events go to live GameAnalytics).
   - `npm run dev` also works for *this event*, because the flag override does not affect it.
   - Needs manual URL blocking in DevTools. If I cannot drive it, it falls to the owner and I will say it is unverified.
3. Owner baseline pulls M1–M7 before release (brief step 5). Informational only, not a gate.

### 6. Risks and edge cases
1. **A page that has not yet booted in the same tab** (the reload after a pre-gate chunk failure, `Bootstrap.ts:73-86`): the first boot already consumed the marker, so the reloaded boot reads 0. Slight undercount of after-match boots; accepted.
2. **"Duplicate tab"** copies sessionStorage. The marker only exists in the milliseconds between the write and the navigation. Negligible.
3. **The deadline-branch test needs heavy stubbing** of `runPlatformInit`, which no current test drives. If it gets brittle, fall back to testing a small helper the deadline branch calls, and say that in the report.
4. **Coordination with 0331.** It changes `changeHref` to keep the query. The marker check compares the *input* value against `rootPathname`, so it stays correct as long as 0331 changes the URL inside `changeHref` and not at the call sites.
5. **Coordination with 0329.** It adds a "platform recovered" signal at the same recovery site (`:836`). The Recovered hook here is small and 0329 can reuse or replace it.
6. **Privacy.** Event values are only 0/1. Causes come from a closed list. The marker holds `"1"`. No ids, hosts or query values anywhere.
7. The event fires on the Yandex template even at top level (for example, the page opened directly). That is what `NoSdk` is for; see decision 1.

### 7. Out of scope
What the card shows (0329), any retry (0330), the match-exit URL (0331), the wiki, commits.

---

## Open questions

When relaying, add the owner's standing "Explain more, then ask again" option to each.

**NEEDS-DECISION 1**
- **question:** Which list of reasons ("causes") should the new event report?
- **options, recommended first:**
  - (a) **The brief's five plus `ScriptTimeout` and `NoSdk` (Rec).** Every hidden-card boot gets a reason. "The SDK file was still downloading at 5 s" is kept apart from "Yandex's init hung" (the after-match problem 0331 is about).
  - (b) **The brief's five plus `NoSdk` only.** Every boot gets a reason, but a slow download and a hung init are both reported as `InitTimeout`.
  - (c) **Exactly the brief's five.** Boots where the SDK script loaded but did nothing (for example, the game page opened outside Yandex's frame) fit none of the five and are **not counted at all**, even though the card is hidden.
- **recommendation:** (a)
- **context:**
  - The event says why the citizenship card was hidden on a page load. The brief lists five reasons, but the code has a sixth: the Yandex script downloads fine yet does nothing, which happens when the game is not inside Yandex's frame. With only five reasons those page loads go uncounted.
  - Separately, the brief's "InitTimeout" lumps together "the Yandex file was still downloading after 5 seconds" (a network problem) and "Yandex's setup call hung" (the suspected after-match problem 0331 would fix). Splitting them costs a few lines and one test, and makes the 0331 decision cleaner.
  - Nothing changes for players either way; this only affects what the numbers can tell us.

**NEEDS-DECISION 2**
- **question:** Keep the optional companion event `Session:PlatformRecovered`?
- **options, recommended first:**
  - (a) **Keep it, meaning "the flags arrived late after the card was already hidden" (Rec).** It counts exactly the page loads the 0329 fix (card re-checks when Yandex recovers late) would save. Fires at most once per page, same 0/1 after-match value.
  - (b) **Drop it.** Less code. We cannot size 0329's benefit until after 0329 ships.
- **recommendation:** (a)
- **context:**
  - The main event counts page loads where the card lost its data. This second event counts how many of those got the data back a few seconds later, which are exactly the ones fix 0329 would rescue.
  - The brief says to fire it "when the SDK arrives late". I suggest "when the flags arrive late" instead, because the SDK arriving without flags still leaves the card hidden, so it would overcount.
  - Cost: about 10 lines plus 3 tests. No player-visible change.

---

**Relevant files**
- `/Users/mark.dolbyrev/Workspace/geoconflict/ai-agents/tasks/backlog/0328-analytics-event-session-platform-degraded-by-cause/brief.md`
- `/Users/mark.dolbyrev/Workspace/geoconflict/ai-agents/knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md`
- `/Users/mark.dolbyrev/Workspace/geoconflict/src/client/flashist/FlashistFacade.ts` (to edit)
- `/Users/mark.dolbyrev/Workspace/geoconflict/src/client/yandex-games_iframe.html` (to edit, line 26)
- `/Users/mark.dolbyrev/Workspace/geoconflict/src/client/PlatformDegradedAnalytics.ts` (new)
- `/Users/mark.dolbyrev/Workspace/geoconflict/tests/client/PlatformDegradedAnalytics.test.ts` (new)
- `/Users/mark.dolbyrev/Workspace/geoconflict/tests/client/FlashistFacade.test.ts` (or a sibling facade test file)
- `/Users/mark.dolbyrev/Workspace/geoconflict/ai-agents/knowledge-base/analytics-event-reference.md` (to edit)
- Read only, not touched: `/Users/mark.dolbyrev/Workspace/geoconflict/src/client/CitizenshipCard.ts` (0326 is editing it)

**What's next?** Put NEEDS-DECISION 1 and 2 to the owner along with plan approval. Once approved, the build worker implements; nothing is committed.

---

## Owner rulings (recorded by the driver, `fkit-sprint-ship-loop` / fkit-lead, 2026-09-28)

Given live in the `fkit lead` session via `AskUserQuestion` (ADR-021/037). Verbatim answers:

- **NEEDS-DECISION 1 (cause list):** "Brief's 5 + 2 more (Recommended)" ⇒ option (a): the brief's five plus `ScriptTimeout` and `NoSdk`; order ScriptFailed → ScriptTimeout → InitFailed → InitTimeout → NoSdk → NoPlayer → NoFlags.
- **NEEDS-DECISION 2 (`Session:PlatformRecovered`):** "Keep it, on late flags (Recommended)" ⇒ option (a): build it, tied to flags arriving late after a degraded-without-flags check.
- **Local browser check (§5 step 2):** "You run it later (Recommended)" ⇒ the coder does NOT drive a browser; the check is listed as owner-owed at close, with exact steps (DEPLOY_ENV=dev only).
- **Enum key name:** `SESSION_PLATFORM_DEGRADED_FIRST_PART` as planned (shown in the approval preview).
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
