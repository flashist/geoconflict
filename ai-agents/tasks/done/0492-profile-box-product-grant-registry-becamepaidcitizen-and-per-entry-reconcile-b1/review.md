# Review — 0492

Task: ai-agents/tasks/done/0492-profile-box-product-grant-registry-becamepaidcitizen-and-per-entry-reconcile-b1/brief.md
File(s) under review: src/core/profile/PaymentsContract.ts, src/profile-server/PaymentsRepository.ts, src/profile-server/Routes.ts (payments hunks only — 0491's rewarded-match-xp hunks excluded), tests/core/profile/PaymentsContract.test.ts, tests/profile-server/{PaymentsRepository,PaymentsRoutes,InboxHooks}.test.ts, tests/integration/{PaymentsRepository,Routes,PaidStateEqualization}.it.test.ts (working tree, 2026-10-24)
Status: closed-out
Coverage: reasoning-only second opinion — Codex (codex-cli 0.157.1, exit 0) returned a usable pass but measured nothing: its one run, `npx jest --runInBand --no-cache <4 B1 suites>`, exited 1 on `EPERM` (sandbox blocked jest's haste-map write), so no test ran. Execution evidence is the Claude reviewer's: `npm test -- <PaymentsContract, PaymentsRepository, PaymentsRoutes, InboxHooks>` 4 suites 104/104 pass; `npx tsc --noEmit -p tsconfig.json` exit 0. Integration suite not re-run by the reviewer (test container stopped); coder's record says 193/193.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

Round 1 (2026-10-24): **no confirmed findings.** Checked and holding:
- 0019 R2 guard: `productGrantFor` (`PaymentsRepository.ts:65-72`) is an own-property lookup that runs before `inTransaction`/`pool.connect()` (`:170`); `premium_skin`/`constructor`/`__proto__`/`toString` are each tested to throw with zero `connect` calls.
- Lock: `FOR NO KEY UPDATE` (`:76-78`, SQL at `:77`) does not conflict with `createIntent`'s FK `FOR KEY SHARE`; it conflicts with itself, so two grants for one player queue and the second re-reads the committed row under READ COMMITTED → exactly one `becamePaidCitizen: true`. Lock order (receipt → players → intent) is unchanged from before B1, so no new deadlock.
- `applyEntitlement` (`:200`) runs inside `inTransaction`; a throw reaches the ROLLBACK branch (`:262`); unit-tested.
- `/reconcile` (`Routes.ts:1172-1219`): each entry in its own try/catch; error line carries `token.slice(0, 8)` + `formatError` (stack/message only, `Logger.ts:23-28` — no pg `detail`, same leak level as the removed outer catch); `failedCount` counts thrown entries only, omitted at 0.
- `/complete` (`Routes.ts:1087-1091` early replay; `:1124-1132` grant `already_processed`): both omit `becamePaidCitizen`.
- Test changes: return-shape only, plus new cases. No removed test asserted the old reconcile 500 (HEAD had none). `PaidStateEqualization` helper's `toMatchObject({status:"granted"})` keeps the old "granted" meaning.

Disproven this round (not a row; do not chase): Codex X1 "a 200 `{processedTokens: [], failedCount: 1}` is read by the live client as nothing pending → second-charge risk". Pre-B1 the same case was a 500 → `reconcilePurchases` returned `null` → `PaymentsReconciliation.ts:70` returned without consuming. Post-B1 `tokens` is `[]` → the same line returns the same way. Live behaviour is identical for all-fail and strictly better for partial-fail (successful tokens now consumed). Acting on `failedCount` is 0495's scope by the OQ-1 ruling.

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

Round 1 (2026-10-24, fkit-coder, Process-review worker under the ADR-055 marker from `fkit-lead`): **no rows — the
reviewer filed no findings, so the novel set is empty.** Nothing matched an accepted residual or ADR (none were
loaded that cover this scope beyond ADR-112/ADR-125, neither touched). Spot-checked, holding:
- Own-property lookup before `connect()` — `PaymentsRepository.ts` `productGrantFor` (`hasOwnProperty.call(PRODUCT_GRANTS, …)`).
- `/reconcile` per-entry `try/catch`, `failedCount` sent only when > 0 — `Routes.ts` `reconcile entry failed: token=`.
- Codex X1 disproof — `PaymentsReconciliation.ts` `if (tokens === null || tokens.length === 0) { return; }`: an
  all-fail `200 []` returns without consuming, exactly as the pre-B1 500 → `null` did.
- Additive contract — both response schemas are plain (non-`.strict()`) `z.object`s at HEAD and now, so old clients
  drop `becamePaidCitizen` / `failedCount`.

Reviewer suggestions (deterministic concurrency test, per-entry failure counter, DB-down latency) are not defects —
per the skill's "a missing test is a suggestion" rule and no written key list naming them. No row, no residual, no
code change.

**Convergence call: closeout.** No defects, no re-litigation, nothing blocking. Header set to `Status: closed-out`.

## Accepted residuals (shared, do-not-re-litigate)
