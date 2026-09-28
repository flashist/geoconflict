# Worklog — 0329: citizenship card re-checks its gate when the platform recovers late

## 2026-09-28 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`14518b851443efce75ea588a092b5bc052c3d3ee` — re-hashed this turn with `git hash-object`, matches); owner
approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28.

### Owner rulings — verbatim, as relayed by fkit-lead (from the end of the approved plan)

- **Q1 (when the hidden card listens):** "Always when hidden (Recommended)" ⇒ **option A**: the card
  subscribes to `whenPlatformRecoveredLate()` whenever the flag check hides it; on the signal it re-reads
  the flag and reveals only if it is really on.
- **Stated assumptions** (player wait capped at 5 s; "after the gate" implemented as "after stage 2 ran"):
  approved with the plan.
- **§7 step 4 amendment:** local check uses `DEPLOY_ENV=dev npm run build-prod` only.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

### What changed

- `src/client/flashist/FlashistFacade.ts`
  - Late-recovery branch in `yandexSdkInit()`: the player-recovery statement is now
    `const playerRecovery = this.playerInitResultPromise?.catch(...).then(...)` (body unchanged).
  - New statement right after it: when `playerRecovery` is defined (stage 2 had run ⇒ degraded boot),
    `Promise.all([loadExperimentFlags(), race(playerRecovery, 5 s PLATFORM_INIT_DEADLINE_MS)])` →
    `markPlatformRecoveredLate()`, errors swallowed.
  - New block next to `whenPaymentsCatalogSettled`: `hasPlatformRecoveredLate?`,
    `platformRecoveredLateResolvers?` (lazy, `Object.create`-safe), public `whenPlatformRecoveredLate()`,
    private `markPlatformRecoveredLate()` (no-op unless flags exist; fires once).
  - 0328's `.then(() => this.logPlatformRecoveredIfDegraded())` line, its fields and methods: untouched.
- `src/client/CitizenshipCard.ts`
  - Lines that showed the card moved verbatim into `private async revealCard()`; `connectedCallback`
    calls it on `enabled`.
  - `!enabled` branch: after adding `hidden`, calls `recheckWhenPlatformRecovers()` (option A).
  - `recheckWhenPlatformRecovers()`: waits on the signal; checks still wanted (same
    `connectionGeneration`, `isConnected`, `!isEnabled`); re-reads `isCitizenshipUiEnabled()`; checks
    still wanted again; `await revealCard()`. Own `.catch` → `console.warn`.
  - `connectionGeneration` counter, bumped in `disconnectedCallback`.
  - Task-0329 note on the flag-gate comment. `startTenureClaim` doc unchanged.
- `tests/client/CitizenshipCard.test.ts` — `whenPlatformRecoveredLate` added to the facade mock (default:
  never settles); new `describe("late platform recovery (task 0329)")`, 9 tests (plan tests 1–8; test 7 is
  two tests).
- `tests/client/FlashistFacade.test.ts` — new `describe("FlashistFacade.whenPlatformRecoveredLate (task
  0329)")`, 6 tests driving the real `yandexSdkInit()` on an `Object.create` facade, fake timers.

Other tasks' uncommitted edits in these files (0303, 0314, 0321, 0326, 0328) untouched. Prettier run only
on the four files above (all four were Prettier-clean at `HEAD`).

### Red run — unchanged source, new card tests only

```
      ✕ reveals the card when the flag is on after a late recovery (4 ms)
      ✕ publishes the citizenship status once revealed (perk no longer unknown) (2 ms)
      ✕ stays hidden when the flag is still off after recovery
      ✕ stays hidden when the platform never recovers (1 ms)
      ✕ reads the profile once across a recovery; reconciliation reads only after the reveal (1 ms)
      ✓ does nothing extra for a card already shown at the gate (4 ms)
      ✓ does not reveal a card disconnected before the signal
      ✕ does not reveal a card disconnected while the second flag read is pending
      ✓ never subscribes when the local CITIZENSHIP_CARD_ENABLED flag is off (1 ms)
Tests:       6 failed, 104 skipped, 3 passed, 113 total
```

Test 1 failed on the defect itself: `expect(card.classList.contains("hidden")).toBe(false)` — received
`true` (the card stays hidden after recovery). The other red tests fail because today's card never
subscribes / never re-reads the flag. The 3 green ones assert things that are already true today (no
extra work) and guard the new code.

### Green run

- `CitizenshipCard.test.ts`: 113/113 pass. `FlashistFacade.test.ts`: 36/36 pass.
- Related suites (`CitizenshipCard`, `FlashistFacade`, `CitizenshipStatus`, `CitizenshipPurchase`,
  `CitizenBadge`, `CitizensOnlyModal`, `PlatformDegradedFacade`, `PlatformDegradedAnalytics`,
  `TenureGrantClaim`, `PaymentsReconciliation`): 10 suites, 285/285 pass.
- Facade tests mutation-checked (each mutation made, run, reverted): dropping the flags-present guard →
  "never resolves when the flag fetch fails" fails; not waiting for the player → "waits for the player"
  and "5 s deadline" fail; ignoring the stage-2 marker → "never resolves on the normal path" fails.
- `npx tsc --noEmit -p .`: clean. `eslint` on the four edited files: clean.

### Full runs

- **Full `npm test`: 172/172 suites, 3055/3055 tests pass, first run. No re-run, no flake seen.**
- **`npm run lint`: exit 1, one error, not from this task.** It is a parsing error in 0325's untracked
  `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` ("not found by the project service"). The four files
  this task edits lint clean (run directly). Left alone: it belongs to another task's folder.

### Local browser check (§7 step 4, amended): build done, page NOT opened

- `DEPLOY_ENV=dev npm run build-prod`: exit 0, "compiled with 2 warnings" (only the usual asset and
  entrypoint size warnings). The new code is in the bundle (`static/js/main.*.js`, `static/js/app.*.js`).
- **The page was not served or opened.** The only browser tool in this spawn would drive the owner's own
  Chrome, which the spawn prompt forbids. Playwright was not connected. So the "hang → 5 s deadline → card
  hidden" check is **not done**.
- Even if it were done, that harness never recovers. **The reveal after a late recovery is proven by the
  unit tests only, never live.**

### Single read path (brief item 3)

`grep -rn loadPlayerProfileView src/` outside `PlayerProfileView.ts`: one call, inside
`CitizenshipCard.refreshProfile()`; the rest are the import and comments. Plan test 5 proves one
`loadProfile` call across a recovery and one tenure claim. `Citizenship:Earned:XP` is dormant (fires zero
times, 0250 S1 / D4); per 0326's owner ruling Q2 the read count stands in for it — not a new question.

### Not added

A combined real-facade + real-card test: the card suite mocks the facade module entirely; joining them
needs a new harness for one assertion. Each side of the handoff is covered by its own suite (as planned).

### Decision log (fixes applied without asking / obvious-winner calls)

none

## 2026-09-28 — Process review, round 1 (fkit-coder, Process-review worker, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Method: `fkit-process-stateful-review` Steps 0–7 on `review.md`, findings R1, R2. Per-round owner gate
skipped per the spawn; both findings carry owner rulings given live 2026-09-28 (relayed by fkit-lead):
R1 "Fix before closing (Recommended)"; R2 "Record as accepted (Recommended)".

### R1 — late reveal waits for the start screen

- New `src/client/StartScreenPresence.ts`: `setStartScreenPresenceSource(isAway)`,
  `reportBackOnStartScreen()`, `whenOnStartScreen()` (loops while away), test reset. Unregistered reads as
  "on the start screen" = the behaviour before this fix.
- `src/client/Main.ts` (two added lines + import, none inside 0303's hunks): registers
  `() => this.gameStop !== null` after the join/leave/kick listeners; calls `reportBackOnStartScreen()` in
  `handleLeaveLobby` right after `this.gameStop = null`.
- `src/client/CitizenshipCard.ts`: `recheckWhenPlatformRecovers()` awaits `whenOnStartScreen()` after the
  flag re-read, re-checks `isStillWanted()`, then `revealCard()`. Doc comment extended. Gate reveal untouched.
- Choice: defer the **whole** late reveal, not only claim + popup. One wait fixes both halves of R1 —
  `Citizenship:Seen` then fires from the existing `maybeReportSeen()` once the card is on screen; deferring
  only the claim would leave the Seen undercount and need a second retry path.
- Not closed (shared with 0303 R3 and normal boots): a reveal that starts while `handleJoinLobby` is still
  awaiting its setup (before `gameStop` is set) can still open the gift popup as the player enters a lobby.

Red run (card wait not yet wired, module + tests present):
```
  ● … recovery while away from the start screen (review R1) › waits for the start screen: no reveal, gift popup or Seen during a lobby or match
    Expected: true / Received: false   (card.classList.contains("hidden"))
  ● … › does not reveal a card disconnected while it waits for the start screen
    Expected: true / Received: false
Tests:       2 failed, 113 skipped, 2 passed, 117 total
```
Green: `CitizenshipCard.test.ts` 117/117; `StartScreenPresence.test.ts` 5/5; related suites (card, facade,
StartScreenPresence, CitizenshipStatus, CitizenshipPurchase, CitizenBadge, CitizensOnlyModal,
PlatformDegradedFacade, PlatformDegradedAnalytics, TenureGrantClaim, PaymentsReconciliation,
CitizenshipRestartOffer) 12 suites, 306/306. Mutation: dropping the post-wait `isStillWanted()` reds the
disconnect test (reverted). `eslint` on the 5 edited/new files and `tsc --noEmit`: clean. Prettier run on
the two new files only; the three edited files were already Prettier-clean.

Full `npm test`: **173/173 suites, 3064/3064 tests, first run** — no re-run, no flake. `npm run lint`: same
single pre-existing error in 0325's untracked `s0-hmac-check.mjs`, not this task's.

Unverified: no live browser check of the lobby/match case (no harness recovers late; see Build entry).

### R2 — recorded as accepted residual

No code change. Residual "Disconnect lifecycle of the late reveal" added to `review.md`, naming the future
fix (`newestAppliedProfileRead = ++profileReadsIssued` in `disconnectedCallback` + a generation check inside
`revealCard()` + dropping the parked resolver) and superseding 0326's "Late read after disconnect"
re-raise condition for 0329.

### Decision log (fixes applied without asking / obvious-winner calls)

- **R1 fix** — answers review R1 (late reveal can open the tenure popup over a live match; Seen skipped).
  What changed: new `StartScreenPresence.ts`; `Main.ts` register + report; card awaits
  `whenOnStartScreen()` before the late `revealCard()`. Why it qualified: **not** under the plan's standing
  approval — it is outside the approved plan and was **explicitly owner-authorized** ("Fix before closing
  (Recommended)", 2026-09-28, relayed). The one call I made unattended inside that authorization:
  **whole-reveal deferral over claim-only deferral** — obvious winner within the ruling's intent (the ruling
  offered both; whole-reveal is the smaller change that also fixes the Seen half, and leaves the gate path
  and `startTenureClaim()` untouched).
- **R2** — no code change (owner-ruled residual).
- **R3 (round 2)** — no code change: owner ruling 2026-09-28 "Accept + file own bug (Recommended)", placed "End of Sprint 7 (Recommended)"; a producer files the bug. Coder response row written; reviewer's residual and `Status: closed-out` left as they were.
