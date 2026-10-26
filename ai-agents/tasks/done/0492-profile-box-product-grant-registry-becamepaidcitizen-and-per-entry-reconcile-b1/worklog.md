# Worklog — 0492 (B1)

## 2026-10-24 — Build (fkit-coder, spawned Build worker)

**Mode.** Spawned by `fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9, under the ADR-055 declared-approval
marker. Plan approved by the owner 2026-10-24 via `AskUserQuestion` in the lead session ("Approve (Recommended)");
OQ-1 "Yes, add it now (Recommended)" (build `failedCount`); OQ-2 "Leave it out (Recommended)". Plan carried verbatim;
`plan.md` blob `bdbfac689fa992e5de2e2e4d9ec8d4a7c2e6f022` matched on disk. Nothing committed or pushed.

**Correction to `plan.md`** (relayed by the lead, a fact not a scope change): 0491's integration run was not skipped in
the end — its Verify step ran `npm run test:integration` green, 188/188, migration `009` included.

### What changed
- `src/core/profile/PaymentsContract.ts` — `ProductKind`, `PRODUCT_DEFINITIONS` (`Record<PaymentProductId, …>`);
  `PurchaseCompleteResponseSchema.becamePaidCitizen` optional; `PurchaseReconcileResponseSchema.failedCount` optional
  (OQ-1).
- `src/profile-server/PaymentsRepository.ts` — `ProductGrant`, `PRODUCT_GRANTS` (citizenship: no-op entitlement,
  `itemInboxTemplate: null`), own-property lookup before `connect()` (same error text as before), `GrantOutcome`
  discriminated union (replaces `GrantStatus`, now unreferenced and removed). Transaction: receipt INSERT → `SELECT
  is_paid_citizen … FOR NO KEY UPDATE` → flags UPDATE (row-count guard kept) → `applyEntitlement` → intent used →
  COMMIT. Post-commit inbox unchanged.
- `src/profile-server/Routes.ts` (payments hunks only; 0491's hunks untouched) — `PaymentsRepo.grantPaidPurchase`
  returns `GrantOutcome`. `/complete` adds `becamePaidCitizen` on a fresh grant only; both replay paths leave it out.
  `/reconcile`: per-entry `try/catch`, one `reconcile entry failed: token=<8 chars>… <error>` line per failure, always
  `200` for a verified payload; outer 500 branch removed.
- Tests: `tests/core/profile/PaymentsContract.test.ts`, `tests/profile-server/{PaymentsRepository,PaymentsRoutes,
  InboxHooks}.test.ts`, `tests/integration/{PaymentsRepository,Routes,PaidStateEqualization}.it.test.ts`. No new test
  files. `SessionRoutes.test.ts` needed no change.

### Checks
| Check | Result |
|---|---|
| Targeted: PaymentsContract, PaymentsRepository, PaymentsRoutes, InboxHooks, SessionRoutes | 5 suites, 228/228 pass |
| `npx tsc --noEmit -p tsconfig.json` (includes `tests/**`) | exit 0 |
| `npm run lint`; `npx prettier --check` on the 10 changed files | clean |
| `npm run test:integration` (container `gc-0012-it-pg` started for it, stopped after — it was stopped before) | 14 suites, **193/193** pass (0491's 188 + 5 new) |
| `npm test` (full, npm script + project lock) | 234 suites, **4885/4885** pass, 108 s, no skips, no flake seen |
| Skipped: `check:config-parity`, webpack build, `test:scripts:docker` | per plan — no env var, client or deploy-script change |

### Decision log (choices made without asking — ADR-019 §4 / ADR-055)
1. **`failedCount` is left out of the reconcile body when it is 0** (sent only when > 0). Answers: the plan's
   "plus `failedCount` if OQ-1 is approved", which does not say whether a zero is sent. Why it qualified (obvious winner
   within intent): absent reads the same as 0 for the B3 rule `failedCount > 0 → failed`, on an old box (which 500s
   instead) and a new one alike; and every existing reconcile test keeps its exact `{ processedTokens }` body, closer to
   the brief's "existing tests pass unchanged". Contract test covers both shapes.
2. **`PaidStateEqualization.it.test.ts`'s `pay()` helper asserts `toMatchObject({ status: "granted" })`**, not a full
   `toEqual`. Answers: plan step 4 "update the return assertions". Why it qualified (mechanical, in plan): the helper is
   called for players whose paid state varies by test, and it only ever asserted "granted"; the status-only match keeps
   exactly that meaning.
3. **No other fix or obvious-winner call.**

### Caveats
- The integration concurrency test (`Promise.all` of two grants) proves the result (exactly one `true`), but it cannot
  force the two transactions to overlap; on a fast run the second may start after the first commits. The row lock is
  what makes the result hold when they do overlap.
- Deploy order and the 0493 knock-ons are as in `plan.md` §Deploy notes; nothing deployed.

## 2026-10-24 — Process review, round 1 (fkit-coder, spawned Process-review worker)

**Mode.** Spawned by `fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9, under the ADR-055 declared-approval
marker (same plan, blob `bdbfac689fa992e5de2e2e4d9ec8d4a7c2e6f022`, re-checked on disk). Ran
`fkit-process-stateful-review` steps 0–7 on `review.md`. Nothing committed or pushed.

**Result.** Reviewer filed no findings → no *Coder response* rows. Spot-checked the reviewer's holding claims and its
disproof of Codex X1 against the code; all hold. Convergence call: closeout. `review.md` header set to
`Status: closed-out`. No code or test change; no checks re-run (nothing changed since the Build entry's checks).

### Decision log (choices made without asking — ADR-019 §4 / ADR-055)
- none — no fix applied and no obvious-winner call made this round.

