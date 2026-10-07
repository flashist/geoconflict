# Worklog — 0404: "Please refresh the game" popup after 23 hours (start screen only)

## 2026-10-07 — BUILD (fkit-coder, spawned by `fkit-sprint-ship-loop`, declared-approval marker)

Implemented the approved `plan.md` (blob `df92b5a3…`, verified by `git hash-object` before starting) including
§2.9 (owner ruling Q2 = "#1"), the §2.7 wording as drafted (owner ruling Q1), and four extra analytics events under
the owner's Q2 authorization ("also add any other analytic metrics that can be useful here"). Nothing committed.

### Change surface

New:
- `src/client/PlatformDialogPresence.ts` — counter for open Yandex payment/login dialogs.
- `src/client/LongSessionRefresh.ts` — 23 h constant, pure `decideLongSessionRefresh`, injectable
  `startLongSessionRefreshChecker`.
- `tests/client/PlatformDialogPresence.test.ts`, `tests/client/LongSessionRefresh.test.ts`,
  `tests/client/StaleBuildModal.test.ts`, `tests/client/LongSessionRefreshLang.test.ts`.

Changed:
- `src/client/StaleBuildModal.ts` — `reason` state, `showLongSession()`, long-session render branch, `.title` style.
  Stale path unchanged in behavior (`show()` now also sets `reason = "staleBuild"`).
- `src/client/BuildVersionChecker.ts` — `PAGE_LOAD_TIMESTAMP` exported (one word).
- `src/client/CitizenshipPurchase.ts` — whole flow wrapped in `beginPlatformDialog()` / `finally`.
- `src/client/flashist/FlashistFacade.ts` — 6 `Session:LongSessionRefresh:*` + 10
  `Profile:Login:SignatureAge:AfterRefreshPopup:*` enum keys; `SIGNATURE_AGE_EVENTS.AfterRefreshPopup`; exported
  `reloadWithoutHash()` helper; `reloadAppWithoutHash()`; `bootFollowsLongSessionRefresh` + consume at boot + boot-kind
  choice; auth-dialog marker in `openYandexAuthDialog()`.
- `src/client/PlatformDegradedAnalytics.ts` — `markLongSessionRefresh` / `consumeLongSessionRefreshMarker`
  (key `geoconflict.session.afterLongSessionRefresh`, value `"1"`).
- `src/client/Main.ts` — `startLongSessionRefreshChecker()` after `client.initialize()`.
- `resources/lang/en.json`, `resources/lang/ru.json` — `long_session_refresh_modal.{title,message,refresh_button}`.
- `ai-agents/knowledge-base/analytics-event-reference.md` — 6 Session rows, 10 SignatureAge rows, `<BootKind>` gloss.
- Tests extended: `CitizenshipPurchase.test.ts`, `FlashistFacade.test.ts`, `PlatformDegradedAnalytics.test.ts`,
  `PlatformDegradedFacade.test.ts`, `SignedPlayerFacade.test.ts`.

Not touched: `index.html`, `yandex-games_iframe.html`, `ProfileSession.ts`, `Transport.ts`, `src/core/`, the brief,
`plan.md`, ADRs, sprint boards, the wiki.

### Decision log

**Extra analytics events (owner Q2 authorization; 4 events, no server change, no ids/PII, all via
`flashistConstants.analyticEvents`, all documented, all tested):**

| Event | Question it answers |
|---|---|
| `Session:LongSessionRefresh:Due` (value = minutes since page load) | How many page loads reach the 23 h threshold at all — and, with `Shown` and `PreemptedByStaleBuild`, how many never got the popup (a match exit reloaded the page first, or the tab closed while it waited). |
| `Session:LongSessionRefresh:Waited` (value = whole minutes `Due` → `Shown`; only when it could not show at once) | How long players waited between the threshold and the popup actually appearing (owner's example 1). |
| `Session:LongSessionRefresh:DeferredByDialog` (once per page) | How often a payment/login dialog deferred it (owner's example 2). |
| `Session:LongSessionRefresh:PreemptedByStaleBuild` (once per page) | Whether the popup was pre-empted by the stale-build popup (owner's example 3). |

**Obvious-winner / within-intent calls made unattended (each mechanical, inside the plan's intent):**
1. `runCitizenshipPurchase()` wraps a private `purchaseCitizenship()` in `try/finally` instead of re-indenting the whole
   body — same semantics as the plan's "wrap the whole body", much smaller diff.
2. The deferred wait loop reuses `decideLongSessionRefresh` with `isTabVisible: true` (plan §2.3: visibility gated only
   before the trigger) so the order of checks lives in one place.
3. `addVisibilityListener` returns its own remover (the plan listed the dependency, not its shape) — needed for the
   one-shot listener removal.
4. `showWhenClear(...)` is called with `.catch(() => {})`: a missing `<stale-build-modal>` can never surface as an
   unhandled rejection. Tested.
5. No immediate check at startup — only the 60 s interval and visibility, as the plan's bullets list. Page age is ~0 at
   startup, so an immediate check could never fire.
6. `Main.ts` import placed in the file's alphabetical import order (next to `./LanguageModal`), not physically beside
   the `startBuildVersionChecker` import as the plan worded it; the call site is beside the other start calls.
7. `bootFollowsLongSessionRefresh` feeds only the SignatureAge boot kind, never the `Session:PlatformDegraded` /
   `PlatformRecovered` 0/1 value (plan §2.9 scopes it to the boot kind). Tested (a degraded boot after the popup logs
   value 0).
8. `reloadWithoutHash` tests live in `FlashistFacade.test.ts` (plan named no file), plus one jsdom test of
   `reloadAppWithoutHash()` on the real `window.history` (hash dropped, query kept, marker written, no match-exit
   marker).
9. `StaleBuildModal.test.ts`: jsdom cannot stub `window.location.reload` (non-configurable), so the stale REFRESH test
   asserts the event and that the hash-dropping reload was **not** used, rather than asserting `reload()` itself. The
   stale click handler is unchanged code.

**Plan finding corrected, no action:** plan §2.8 says `Build:StaleDetected` has no row in the analytics reference. It
does (section *Build Version Events*). Nothing to fix.

**Left as found:** `StaleBuildModal.ts` (two missing trailing commas) and `CitizenshipPurchase.ts` (one wrapped call)
were already not Prettier-clean at `HEAD`; those pre-existing lines were not reformatted (minimal diff). lint-staged
will format them at commit. All lines this task added are Prettier-clean; `npm run lint` is clean.

**Review fixes applied unattended:** none (this is the build step; no review has run yet).

### Verification

- Targeted suites: `PlatformDialogPresence`, `LongSessionRefresh`, `StaleBuildModal`, `LongSessionRefreshLang`,
  `CitizenshipPurchase`, `FlashistFacade`, `PlatformDegradedAnalytics`, `PlatformDegradedFacade`, `SignedPlayerFacade` —
  all green.
- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — exit 0, no findings.
- `npm test` — exit 0, **211/211 suites, 4183/4183 tests passed**, first run, no re-run; no `Exceeded timeout`, no
  `SIGSEGV`; the Docker-probed harness did not report skipped. (The run includes the uncommitted `0332` work in the
  tree.)
- Pinned-constant test (`LONG_SESSION_REFRESH_AFTER_MS === 82_800_000`) green. The threshold was **never** edited
  locally.
- **§5.3 local manual browser checks: NOT RUN.** This build ran as a spawned worker with no owner present; the checks
  need a dev server plus a driven browser session and a temporary threshold edit, and the only browser available is
  the owner's own Chrome. Not done unattended. Still owed before the owner trusts the UI: popup on the start screen
  (RU + EN), refresh inside `yandex-games_iframe.html` keeping the query with `#join=TEST` / `#refresh` not replayed, no
  popup mid-match, popup after a lobby left with in-page Back, exactly one popup with a forced stale build.
- ⚠️ The Yandex payment and login dialog deferral cannot be exercised locally at all (real SDK only) — covered by unit
  tests only.

## 2026-10-07 — PROCESS-REVIEW round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop`, declared-approval marker)

Ran `fkit-process-stateful-review` steps 0–7 on `review.md` (finding R1). No accepted residuals; no ADR in scope
(none covers modal stacking or the start screen). No per-fix owner gate (standing approval of the plan).

### Decision log

**Fix applied unattended — R1** (popup can open under a later-DOM 9999 window, then be revealed over a match).
- Answers: R1, plus a sibling path found while verifying it — a join already in flight when the popup appears
  (Mission awaits an interstitial ad before `join-lobby`; Start / Tutorial await cosmetics) is not marked as a join,
  so it can start a match under the popup even with the popup topmost.
- What changed:
  1. `src/client/StaleBuildModal.ts` — long-session overlay gets class `long-session` → `z-index: 10002` (above every
     z-index in `src/client`; highest was the tutorial layer's 10001). Stale overlay unchanged (9999, same markup).
     Getter `isShowingLongSession`.
  2. `src/client/LongSessionRefresh.ts` — `isLongSessionRefreshShowing()`.
  3. `src/client/Main.ts` — `handleJoinLobby` drops a join while the long-session popup is up, before
     `beginJoiningLobby`.
  4. `tests/client/StaleBuildModal.test.ts` — 7 tests (see `review.md` R1 row).
- Why it qualified: verified `CORRECT`; localized (3 source files, ~25 lines); inside the approved plan's intent —
  plan §6 already states the popup "covers the screen at z-index 9999, so nothing underneath can be clicked" and
  accepts that it covers any open start-screen window (owner ruling 2, "Force"); this makes that statement true. The
  join drop acts only while a forced popup with no close control is up, whose only exit is a reload; the alternative
  is the owner-forbidden outcome (match starts, then is lost to the reload). Stale-build path (0113, locked) untouched:
  its z-index, markup and behavior are unchanged, and the guard reads `false` once a stale message has replaced the
  long-session one.
- Consequence, stated: in the narrow race (popup's 60 s tick lands while a Mission ad plays), the player watches the ad
  and then gets the popup instead of the mission. Not raised as a decision: it is the forced-popup ruling applied, and
  no option keeps both the match and the forced refresh.
- Considered and rejected: raising the shared `.modal-overlay` z-index / moving the element (would restack the stale
  popup — locked); force-closing open start-screen windows (behavior change, unnecessary once the popup is topmost);
  marking every pre-join await as "joining" (whack-a-mole, misses key presses).

**Obvious-winner calls:** none beyond the above.

### Verification
- `StaleBuildModal` + `LongSessionRefresh` suites: 39/39 pass. Mutation check: long-session z-index set to 10001 →
  the topmost test fails; restored.
- `npx tsc --noEmit` exit 0. `npm run lint` exit 0.
- `npm test` exit 0 — 211/211 suites, 4190/4190 tests, first run, no re-run, no `Exceeded timeout`, no `SIGSEGV`, no
  skipped harness. (Includes the uncommitted 0332 work in the tree.)
- ⚠️ Not verified: actual paint order and hit-testing (jsdom does not paint). Owed in the §5.3 browser checks: with the
  single-player, join-private-lobby and reconnect windows each open, force the popup and confirm it is on top and
  takes the click.
- `StaleBuildModal.ts` still has its two pre-existing non-Prettier lines (unchanged); all new lines are Prettier-clean.


## 2026-10-07 — PROCESS-REVIEW round 2 (fkit-coder, spawned by `fkit-sprint-ship-loop`, declared-approval marker)

Ran `fkit-process-stateful-review` steps 0–7 on `review.md`. One novel finding: R2. No accepted residuals, and no ADR
in scope. No per-fix owner gate: the plan's standing approval covers it. The reviewer's optional question (should
round-1 Codex point X2 become an accepted residual?) was left alone, as the driver instructed: not relayed, not recorded.

### Decision log

**Fix applied unattended — R2** (the z-index scan in `StaleBuildModal.test.ts` missed the d3 / string-property forms).
- Answers: R2.
- What changed: `tests/client/StaleBuildModal.test.ts` only.
  - The scan's patterns become a shared list plus a `zIndexValuesIn` helper.
  - One new pattern covers `.style("z-index", …)` (quoted value or number), `setProperty("z-index", …)`,
    `style["z-index"] = …` and a quoted object key `{ "z-index": … }`.
  - One new test checks the scanner against fixed strings, one per form; each must give exactly `[10003]`.
- Why it qualified: verified `CORRECT` (`RadialMenu.ts` sets `.style("z-index", "9999")`, and none of the old patterns
  match it). Mechanical and localized: one test file, no source change. Inside the approved plan: the plan's §4 asks
  for a `StaleBuildModal` jsdom test, and this scan is round 1's R1 guard.
- Non-brittle by design: the scanner's own test uses fixed strings, not a specific source file. So `RadialMenu`
  changing or being removed cannot break it.
- Considered and rejected: a sanity assertion that the scan sees `RadialMenu.ts`'s 9999. It would tie the test to that
  file.

**Obvious-winner calls:** none.

### Verification
- Mutation check, run without touching `src/`: `src/client` was copied to the scratchpad, the copy's `RadialMenu.ts`
  set to `.style("z-index", "10003")`, and the scan pointed at the copy for one run.
  - With the new patterns the topmost test went **red** (`Expected: > 10003, Received: 10002`).
  - With only the old three patterns it stayed **green**.
  - The test file was then restored from backup and the copy deleted.
- `StaleBuildModal` suite: 16/16.
- `npm test` exit 0: 211/211 suites, 4191/4191 tests (+1). First run, no re-run, no `Exceeded timeout`, no `SIGSEGV`,
  no skipped harness. The run includes the uncommitted 0332 work in the tree.
- `npm run lint` exit 0. `npx tsc --noEmit` exit 0. `prettier --check` on the test file is clean.
- Ledger header `Status:` set to `closed-out`; nothing blocking remains. ⚠️ The §5.3 browser checks (including R1's
  paint order and click handling) are still owed. They are not a review finding.
