# Worklog — 0495 (B3)

## 2026-10-26 — Build (fkit-coder, spawned Build worker)

**Mode.** Spawned by `fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9, under the ADR-055 declared-approval
marker. Plan approved by the owner 2026-10-25 via `AskUserQuestion` in the lead session: "Approve (Recommended)"
(includes the 9 deviations, the copy, 15 s auto-continue, 5 s hand-off delay); OP-1 "Both buttons (Recommended)";
OP-3 "Yes, commit first (Recommended)" — done as local commit `a3c32b49` (0488/0491/0492/0494/0496), so the diff against
HEAD is B3 alone. Plan carried verbatim; `plan.md` re-hashed on disk: blob `6b24b08c6e4b5a7b46892a5bae56cb4475a8d00a`,
33605 bytes — matched. `plan.md` not edited. Nothing committed or pushed.

**Preconditions (plan step 0).**
- B2 is closed and committed. B2's shapes are as the plan relies on: coordinator deps
  (`profileSource`/`runProductPurchase`/`catalogPrice`/`logUiTap`), `reread()` with no "checking", the result unions,
  `getProductClientConfig` lazy getter.
- OP-2 changed: **B4 (0496) was built first.** Its card hunk (`snapshot()` fills `entitlements` after
  `toPurchaseProfileSnapshot()`) is untouched by B3; B3's card edits (`reread` option, `requestLoginRestart`) sit
  beside it. Rebase was mechanical — nothing B4 changed alters what this plan relies on.
- `npx tsc --noEmit -p tsconfig.json` clean on HEAD before any edit.

### What changed (all as the plan's steps 1–13)
- `flashist/FlashistFacade.ts` — 7 enum entries (`Purchase:Login:{Requested,Succeeded,Cancelled,ProfileFailed}`,
  `Purchase:Continue:{Ready,NeedsTap}`, `Purchase:Blocked:AlreadyOwned`, all `:Citizenship`); tap id
  `purchaseLoginCitizenshipExplainer`; `refreshPaymentsAfterLogin(timeoutMs)` (swap on success, keep old object on
  failure/timeout/late answer, never sets status, never schedules reconcile, never throws); `SignedPurchasesResult` +
  `getSignedPurchasesResult()` (`none`/`signed`/`failed`); `getSignedPurchases()` is now a thin wrapper (same results as
  before: `signed` → `{signature}`, else `null`).
- `PaymentsApiClient.ts` — `ReconcileResult.ok.failedCount` (`?? 0`).
- `PaymentsReconciliation.ts` — `reconcilePurchasesNow(timeoutMs)` → `processed | none | failed | timeout`; kill switch
  off → `failed`; `failedCount > 0` → `failed` (OQ-1) with processed tokens still signalled and consumed; late finish
  still signals/consumes. Boot pass unchanged.
- `ProductPurchase.ts` — optional `{ mayOpenPaymentWindow }`, asked after `/intent`, before the frame → `not_opened`.
  `CitizenshipPurchase.ts` comment updated (folds it into `error`).
- `ProductClientConfig.ts` — 8 new analytics fields (`blockedCannotVerify: null` for citizenship) and
  `alreadyOwnedLineKey`.
- `PurchaseCoordinator.ts` — the guest path: `AUTO_CONTINUE_DEADLINE_MS = 15_000`, `HANDOFF_DELAY_MS = 5_000`
  (§15.2 items 1–2); new states/results `logging_in`, `login_cancelled`, `needs_tap`; new deps; `surfaceClosed()`
  (§15.2 item 3); guest-flow memory; deadline race; hand-off rules per the plan's table. Logged-in path unchanged in
  behaviour (moved into `runLoggedIn`; `not_opened` cannot arrive there and maps to `error`).
- `CitizenshipCard.ts` — `reread({showChecking})`; public `requestLoginRestart()` (one copy, used by `logIn()`'s success
  block); event doc comment names the hand-off.
- `CitizenshipOffer.ts` — `guest` carries `price`.
- `CitizenshipExplainerModal.ts` — OP-1a: "Log in and buy — {price}" primary + plain "Log in with Yandex" secondary
  (no price → today's area exactly); flow-state view per the plan's table; Restart game on `profile_unavailable`;
  `close()` → `surfaceClosed("citizenship")`; closes on `PURCHASE_GRANTED_EVENT` for citizenship; the mid-session
  listener ignores another product's purchase.
- `Main.ts` — the new coordinator deps; listener comment names the hand-off.
- Comment-only: `GameRestart.ts` header, `ProfileSession.ts` D3 block.
- Lang `en.json` + `ru.json` — `citizenship_paid.login_and_buy_cta` + `purchase_flow.*` (8 keys), the plan's copy.
- `analytics-event-reference.md` — 7 Citizenship rows, the UI:Tap row, the guest funnel + "no
  `Blocked:CannotVerify:Citizenship`" note, the `Profile:Login:Restart:Requested` amendment; and the routed follow-up:
  `LONG_SESSION_REFRESH_SHOWN` row now names `runProductPurchase`.

Not changed (as the plan): `PurchaseOffer.ts`, `src/core`, server, migrations, both HTML templates,
`GameRestart`/`ProfileSession` logic, restart offer/modal, `WinModal.ts`, the guest card's render.

### Tests (existing files only; no new test file)
- `PurchaseCoordinator.test.ts` — setup gains the new deps; new `guest path (task 0495)` describe (38 tests: happy path,
  login cancel / no-login, deadline in each step incl. after `/intent`, deadline 0, reconcile outcomes, no session,
  offer after login, hand-off timing, continuation, `needs_tap`, surface closing in each phase, latch).
- `ProductPurchase.test.ts` (guard false/true/not asked on intent failure), `PaymentsReconciliation.test.ts`
  (`reconcilePurchasesNow`, 11 tests), `PaymentsApiClient.test.ts` (`failedCount`), `FlashistFacade.test.ts`
  (`refreshPaymentsAfterLogin` ×4, `getSignedPurchasesResult`), `CitizenshipCard.test.ts` (`reread` checking on/off,
  `requestLoginRestart`, guest-offer `price` ×2), `CitizenshipOffer.test.ts`, `CitizenshipExplainerModal.test.ts`
  (19 new), `CitizenshipExplainerLang.test.ts` (+10 keys), `ProductClientConfig.test.ts`.

### Decision log (calls made without asking — Build worker; no review fixes applied)
1. **Closed-surface flag is per run, not on the flow memory.** `surfaceClosed()` during any in-flight run of that
   product sets it, so a close while the login dialog is still open (before the memory exists) also stops the payment
   window and hands off at once. Why it qualified: obvious winner inside deviation 4's intent ("no payment window
   opens over a closed popup"); the memory-only version would miss the `logging_in` phase. Test: "during the login
   dialog".
2. **A tap that continues the flow (no deadline) does not stop on a failed/timed-out reconcile.** Plan step 2 says
   "await `prepare` … then go to step 6", i.e. the F5 stop applies to the automatic path only; the player's own tap
   goes on, as the logged-in path does. A `profile_unavailable` prepare still ends `profile_unavailable` on that path
   (step 7's `read_failed` would give the same end). Why: in-plan, literal reading. Test: "a tap after a failed
   reconcile's needs_tap goes on".
3. **One B2 assertion changed, necessarily.** The logged-in `it.each` row `guest (canLogIn: true) → error` was removed:
   B3 deliberately changes that behaviour (such a guest now logs in). The no-login guest → `error` is covered in the
   new describe. Why: in-plan (the plan's own "`!canLogIn` → `error` with no dialog" test).
4. **The guest branch is chosen before the logged-in path's `preparing`**, so the guest sequence is exactly
   `logging_in → preparing → paying → granted` as the plan's test names; the logged-in sequence is unchanged.
5. **`Continue:NeedsTap` is logged once per stop** (each end at `needs_tap`), reading the plan's "once" as "not twice
   for one stop".
6. **`citizenship_status.restart` added to the lang test's `REQUIRED_KEYS`** — the popup now uses it (deviation 8).
7. **The facade's catalog-map rebuild became one private `applyPaymentsCatalog()`** shared by the boot fetch and the
   refresh, instead of a second copy. Mechanical.
8. **`FlashistFacade.test.ts` mocks `PaymentsReconciliation`** (only `schedulePaymentsReconciliation`) so "the refresh
   schedules no reconcile" is observable; the assertion checks the boot fetch did schedule one first.
9. **Analytics doc:** the explainer section's "the two `UI:Tap:*Explainer` rows" was already wrong (three rows since
   0409); made it unnumbered. The `.md` file was not Prettier-clean at HEAD; it was not reformatted.

### Checks
- Targeted runs (no lock), all green: `PurchaseCoordinator` 54, `CitizenshipCard` 208, `CitizenshipExplainerModal` 78,
  `FlashistFacade` 109, `PaymentsApiClient` + `PaymentsReconciliation` + `ProductPurchase` 59, `CitizenshipOffer` +
  `ProductClientConfig` + `CitizenshipExplainerLang` 130.
- `npx tsc --noEmit -p tsconfig.json` — clean. `npm run lint` — clean. `npx prettier --check` on every changed
  `.ts`/`.json` — clean (after `--write` on 5 files).
- Full `npm test` (npm script, project lock), **run twice — a re-run**:
  - Run 1: **red** — 1 failed / 5151 passed (238 suites, 101 s). The failure was
    `tests/profile-server/SshAlerts.test.ts` › "a PASSWORD login never hides inside a KEY group" (expected 2 messages,
    got 1). That is task 0443's SSH-alert grouping; B3 touches nothing it covers. Run on its own 5 times → 46/46 green
    each time. Read as a timing flake under full-suite load. **Not traced, not fixed** (outside scope). It is a
    different suite from the `MasterFeedbackRoutes` flake the brief names.
  - Run 2: **green** — 238/238 suites, 5152/5152 tests, 96 s, exit 0; `ShellHarnesses` passed; nothing skipped.
- Local headless check (`npm run dev` + Playwright), **limited as the plan says**: no Yandex SDK locally, so the
  guest's offer is `{guest, canLogIn: false, price: null}`. The card renders the guest state; the popup opens and shows
  the hint only (no "Log in and buy", no login button), the same as before; `close()` with the coordinator registered
  throws nothing. Console errors: only the intentional `/flags/*.svg` 404s. **The guest "Log in and buy" path was not
  checked locally** — it cannot appear without the SDK; that is B5 (`0498`).
- Skipped (as the plan): `test:integration` and profile-server suites (no server change); `test:scripts:docker`,
  `check:config-parity` (no infra/env change); a real login and purchase (needs the Yandex SDK — B5, `0498`).

### Residuals / notes for B5 (`0498`)
- **Gesture:** on both the automatic path and a tap after `needs_tap`, `purchase()` runs after async work (prepare /
  re-read), not synchronously inside a tap. Whether Yandex's payment window needs a fresh gesture is exactly what B5
  measures; the fallback is `AUTO_CONTINUE_DEADLINE_MS = 0` — but note a tap after `needs_tap` is still not
  synchronous (it awaits the re-read), so if Yandex needs a gesture, `0` alone may not be enough. Flagged, not changed.
- The "Profile Login Restart Events" intro in the analytics doc still says the card's guest CTA is the only surface
  that opens the auth dialog — already stale since 0301/0488; left as is.

## 2026-10-26 — Review round 1 fixes (fkit-coder, spawned Process-review worker)

Spawned by `fkit-lead` under the ADR-055 declared-approval marker. Both fixes go beyond the approved plan; they were
applied on the owner's own rulings of 2026-10-26 (relayed verbatim by the lead), not as in-plan obvious winners.

### Decision log (fixes applied without a per-fix owner gate)
1. **R1 → fixed.** Finding: a tap after `needs_tap`/`error` reused the stored `prepare` result and never re-ran the
   reconcile, so a known-ungranted paid purchase did not stop one tap from opening the payment window. What changed:
   `ReconcileNowResult` gains `pending_ungranted` (`failedCount > 0`; HTTP/SDK failure stays `failed`); a continuation
   tap in `continueGuestFlow` re-runs `reconcileNow` before the read; `pending_ungranted` → new end
   `earlier_purchase_pending` (state, result, popup line `purchase_flow.earlier_purchase_pending` en+ru, event
   `Purchase:Blocked:EarlierPurchasePending:Citizenship` + analytics reference row); a re-check that fails or times out
   goes on to payment as before; the automatic path's F5 stop is unchanged. Why it qualified: owner ruling Q1 →
   "Check again on the tap (Recommended)" — *"Tap re-runs the server check. Undelivered purchase found → 'still
   processing, restart later', no payment. Check fails again → payment opens."*
2. **R2 → fixed.** Finding: `refreshPaymentsAfterLogin` returned `void`, so a failed/timed-out refresh still let the
   flow auto-open the payment window off the guest-time payments object. What changed: it now resolves `boolean`
   (`true` only when the new object is in place); `prepareAfterLogin` is `ready` only when the refresh succeeded and
   the reconcile answered `processed`/`none`, else `not_ready` → `needs_tap`; a later tap follows R1. Why it
   qualified: owner ruling Q2 → "Stop and ask for a tap (Recommended)" — *"One extra tap in a rare case; removes the
   risk. Small code change."*
3. **Obvious-winner call (inside R1's intent): `earlier_purchase_pending` hands off like the other end lines** —
   `settleGuestFlow` arms the `HANDOFF_DELAY_MS` timer for it (no code change there; it falls in the
   "not `needs_tap`" branch), and the popup shows the line with no button. Why: it is a terminal "not bought" end like
   `cannot_verify` ("closing and reopening helps"), the guest still owes the ADR-125 login restart, and that restart's
   boot reconcile is exactly the retry the line asks for; a Buy button would contradict the ruling's "no payment".
   Test: "a tap whose re-check finds an ungranted purchase → earlier_purchase_pending …" asserts the restart at 5 s.
4. **Obvious-winner call: the refresh's no-op case (catalog not ready / no SDK) resolves `false`.** Fail-closed,
   consistent with R2; unreachable in practice ("Log in and buy" needs a catalog price).
5. **Obvious-winner call: the reconcile still runs in `prepare` when the refresh failed** — the result is `not_ready`
   either way, but running it can still grant a pending purchase before the tap.


### Checks (review round 1 fixes)
- Targeted (no lock): `PurchaseCoordinator`, `PaymentsReconciliation`, `FlashistFacade`, `CitizenshipExplainerModal`,
  `CitizenshipExplainerLang`, `ProductClientConfig`, `CitizenshipCard`, `ProductPurchase`, `PaymentsApiClient`,
  `CitizenshipOffer` — 10/10 suites, 651/651 tests green.
- `npx tsc --noEmit -p tsconfig.json` clean; `npm run lint` clean; `npx prettier --check` on every changed `.ts`/`.json` clean.
- Full `npm test` (npm script, project lock), once: green — 238/238 suites, 5165/5165 tests, exit 0. No flake seen; no re-run.
- Ledger `Status:` left `in-review` (code changed; round 2 follows).

## 2026-10-26 — Review round 2 fix: R3 (fkit-coder, spawned Process-review worker)

Spawned by `fkit-lead` (sprint ship loop, Sprint 9) under the ADR-055 declared-approval marker. Owner ruling on R3,
2026-10-26, via `AskUserQuestion` in the lead session: picked **"Fix it (Recommended)"** — *"If a join or match is
underway, skip the reload and just refresh the profile (same as mid-match). Small change."* The related ruling
("File a task for it" — a re-check on the logged-in Buy) is not this task's work; the logged-in path is untouched.

### Decision log (fix applied without a per-fix owner gate)
1. **R3 → fixed.** Finding: the 5 s hand-off timer → `requestLoginRestart` → Main's D3 listener → `requestGameRestart`,
   whose only guard was `matchActive` (`Client.gameStop !== null`); `gameStop` is still null while a join is being set
   up (task 0336), so the timer could reload the page and drop that join. Verified at `GameRestart.ts`
   (`if (matchActive) {`, before the fix) and `Main.ts` (`matchActive: this.gameStop !== null`). Changed:
   `requestGameRestart` now also refuses when `!isOnStartScreen()` (`StartScreenPresence.ts`, the same check 0397's
   `ProfileReadRestart.ts` uses), taking the existing fallback (profile re-read) and the existing
   `Profile:Login:Restart:Suppressed:InMatch` event, with no latch written. Why it qualified: verified `CORRECT`,
   owner-ruled fix, one-condition guard, localized.
   **Where, and why there:** in `requestGameRestart` itself, not in the coordinator or the hand-off dep. It is the one
   place every D3 requester goes through (the card's own login and the hand-off), so both are covered by one check;
   and it is unit-testable there (`Main.ts` is not). `isOnStartScreen()` is a superset of `gameStop !== null` (lobby
   or match) plus joins being set up; unregistered (tests) it reads "on the start screen", so existing tests are
   unchanged. Importing `StartScreenPresence` directly matches `CitizenshipCard.ts` / `LongSessionRefresh.ts`.
   **Side effect, within the ruling's words:** the card's plain login that succeeds during a join being set up now
   re-reads instead of reloading. The ruling says "if a join … is underway, skip the reload"; it does not limit itself
   to the hand-off, and the change only removes reloads.
2. **Obvious-winner call: no new analytics event.** A join being set up reports `Suppressed:InMatch` (which already
   covers a lobby, since `gameStop` is set there). The reference row now says so. A new event would be an analytics
   change the ruling did not ask for.
3. **Comments fixed in the same edit** (made incomplete by the fix): `GameRestart.ts` field and function docs,
   `Main.ts` D3 listener ("Never out of a lobby, a join being set up or a match"), `CitizenshipCard.requestLoginRestart`
   doc. The plan's "not reachable" claim was not mirrored in any code comment (grep of B3's diff), so nothing to fix
   there.

### Tests
- `tests/client/GameRestart.test.ts`: new "NEVER reloads while a join is being set up, and can restart once it has
  ended" (`beginJoiningLobby()` → no reload, fallback once, no latch, `Suppressed:InMatch`; after `endJoining()` → one
  reload). `resetStartScreenPresenceForTests()` added to `beforeEach`. Mutation-checked: with the
  `!isOnStartScreen()` condition removed, this test fails (1 failed / 9 passed); restored.

### Checks (R3 fix)
- Targeted: `GameRestart`, `CitizenshipCard`, `PurchaseCoordinator` — 3/3 suites, 281/281 tests green.
- `npx tsc --noEmit -p tsconfig.json` clean; `npm run lint` clean; `npx prettier --check` clean on the 4 changed `.ts`
  files. `analytics-event-reference.md` fails `prettier --check`, but so does HEAD's copy (many tables unaligned
  before this task); not reformatted (would be a large unrelated diff).
- Full `npm test` run 1: **red** — 1 failed / 5165 passed (237/238 suites): `tests/profile-server/InternalPathCase.test.ts`
  "/Internal is 404 and never runs the handler", expected 404, got **401**. A supertest suite; the `401` shape is in
  CLAUDE.md's flake table ("seen historically, mechanism unknown"). No `SIGSEGV`, no `node-*.ips` report. No file under
  `src/profile-server` or `tests/profile-server` is changed. The suite alone: 5/5 runs green (27/27).
  **Re-ran the full suite:** run 2 green — 238/238 suites, 5166/5166 tests, exit 0. Judged a flake, not proven.
- Ledger `Status:` → `closed-out` (R1–R3 all done; nothing blocking).
