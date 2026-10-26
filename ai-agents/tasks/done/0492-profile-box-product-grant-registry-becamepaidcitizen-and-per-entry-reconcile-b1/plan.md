# Plan — 0492 (B1): product-grant registry, `becamePaidCitizen` on `/complete`, `/reconcile` per-entry isolation

**Planning only. No files written.** I was spawned, so I had no plan-mode tool; I followed the written "write nothing" rule instead. Plan review: OFF for this run.

## Summary
- **Small, profile-box-only change.** 3 source files: `PaymentsContract.ts`, `PaymentsRepository.ts`, `Routes.ts`. **No migration** (F2 holds, so `009` stays 0491's), **no client change**, **no analytics or lang keys**.
- **One gap the spec does not cover (OQ-1, below).** Per-entry isolation turns "one entry failed" from a 500 into a 200 with fewer tokens. The live client is fine with that. But B3's planned rule "reconcile failed → needs_tap" will then never see a single failed grant. So it could auto-open a second payment window for a player whose first purchase was paid but never granted. My recommendation: add one optional response field now, in this same box deploy.
- **Some existing tests have to change.** The spec makes `grantPaidPurchase` return an object, not a string, so about 15 `.resolves.toBe("granted")` assertions in 6 test files change to the new shape. That is a mechanical edit: no test's expected behaviour changes. I read the brief's step 2 ("existing tests pass unchanged") as "existing behaviour unchanged". Flagged as OQ-3.
- **Deploy order: 0491 first, then B1.** The deploy builds `HEAD` and refuses a dirty tree. 0491 is still uncommitted in the same files (`Routes.ts`, `Server.ts`, migration `009`). So whatever part of 0491 is committed when B1 deploys goes out with it.
- **`npm run test:integration` must run this time,** because the grant SQL changes. When 0491 ran it, the test container was stopped and the run was skipped. This run also runs 0491's migration `009` against Postgres for the first time, so a red run could be 0491's fault.

## Scope (spec §4.1 B1 rows, §5, §6, §7 server rows, §10 server tests, §11 B1)

### Step 1 — `src/core/profile/PaymentsContract.ts` (src/core, so tests are required)
- Add `export type ProductKind = "citizenship" | "durable_item";` and
  `export const PRODUCT_DEFINITIONS: Record<PaymentProductId, { kind: ProductKind }> = { citizenship: { kind: "citizenship" } };`. The `Record` type makes a missing id a compile error. Nothing reads `kind` in B1; B2 and B4 will.
- `PurchaseCompleteResponseSchema` gains `becamePaidCitizen: z.boolean().optional()`. Old game clients built from the old schema drop the field, because a zod object discards keys it does not know. So the box can deploy before any client.
- `PAYMENT_PRODUCT_IDS` stays the single list. No analytics here (F9).
- *(Only if OQ-1 is approved)* `PurchaseReconcileResponseSchema` gains an optional `failedCount: z.number().int().nonnegative().optional()`.

### Step 2 — `src/profile-server/PaymentsRepository.ts`
- Add `ProductGrant` `{ applyEntitlement(client, grant): Promise<void>; itemInboxTemplate: string | null }`.
- Add `export const PRODUCT_GRANTS: Record<PaymentProductId, ProductGrant> = { citizenship: { applyEntitlement: <no-op>, itemInboxTemplate: null } }`. This follows the §5 stub exactly, so B4 adds a branch without reshaping the interface.
- Add a private lookup helper using `Object.prototype.hasOwnProperty.call(PRODUCT_GRANTS, id)` (ES2020 target, F14).
  - A miss throws the **same message** as today: `no grant defined for productId "<id>"`.
  - The check stays **before** `pool.connect()`, as today, so an unknown id touches no database. That keeps the `0019` R2 guard for any unknown string, including prototype keys like `constructor` or `__proto__`.
  - This replaces today's `!== "citizenship"` hard check.
- `GrantOutcome` as a discriminated union: `{ status: "granted"; becamePaidCitizen: boolean } | { status: "already_processed" }`.
  - This tightens the spec's flat interface: `becamePaidCitizen` cannot exist on a replay, so no caller can read a meaningless `false`.
  - `GrantStatus` stays exported if it is still referenced; otherwise it is removed.
- New transaction order (§5):
  1. `BEGIN`.
  2. `INSERT processed_purchases … ON CONFLICT DO NOTHING`. A conflict returns `already_processed` and touches nothing (unchanged).
  3. **New:** `SELECT is_paid_citizen FROM players WHERE id = $1 FOR NO KEY UPDATE`. This gives `wasPaid`; a missing row reads as `false`.
  4. `GRANT_FLAGS_SQL`, **always**, for every product. Its existing `rowCount === 0 → throw "no player row"` guard stays, so "no row ⇒ throw, as today" holds. It also keeps the existing mocked tests valid, since their SELECT returns no rows.
  5. `lookup.applyEntitlement(client, grant)` (citizenship: no-op).
  6. Mark the intent used (unchanged).
  7. `COMMIT`.
  - Return `{ status: "granted", becamePaidCitizen: !wasPaid }`.
- **Lock choice:** `FOR NO KEY UPDATE` rather than the spec's `FOR UPDATE`.
  - Same effect for this purpose. Two grants for one player queue on that row, and under READ COMMITTED the second one re-reads `is_paid_citizen = true`, so it gets `becamePaidCitizen: false`.
  - It is the same lock level the existing `UPDATE` already takes. So it adds no new blocking against a concurrent `createIntent`, whose foreign-key check takes a `KEY SHARE` lock that `FOR UPDATE` would conflict with.
  - Coder's call; stated here so the approval covers it.
- **Post-commit inbox: unchanged.** Every fresh citizenship grant sends `citizenship_paid`, as today. The spec's "citizenship OR !wasPaid" rule is identical to today while citizenship is the only product. The item-inbox branch (`itemInboxTemplate`) is **B4's** (§11 B4 "`becamePaidCitizen` inbox rule"), so B1 does not use it yet.
- Comments: rewrite the guard comment at `:132-134` and the `grantPaidPurchase` doc to describe the registry and the shared paid step. They state why, never what, and stay at most 2 lines each.

### Step 3 — `src/profile-server/Routes.ts` (payments section only)
- `PaymentsRepo.grantPaidPurchase` returns `Promise<GrantOutcome>`.
- **`/complete`:**
  - On `status === "granted"`, add `becamePaidCitizen: outcome.becamePaidCitizen` to the 200 body.
  - On the early replay path (`getProcessedPurchase` found the token), and when the grant itself returns `already_processed` (a race with a parallel `/reconcile`), **leave the field out**. The server cannot honestly know it there, and the field is optional. This is my recommendation; see OQ-2.
  - Every other branch is unchanged.
- **`/reconcile` (§6, the live behaviour change):**
  - Each entry's whole body (`getProcessedPurchase`, intent checks, `grantPaidPurchase`) goes in its own `try/catch`.
  - On a throw: one `log.error` line, `reconcile entry failed: token=<first 8 chars>… <formatError(error)>`. That is a single string, the token prefix only, the same as the existing `skip` lines and the same leak level as today's outer catch.
  - Then skip the entry and carry on.
  - The response is always `200 { processedTokens }` for a verified payload, holding only the tokens that succeeded (plus `failedCount` if OQ-1 is approved).
  - The outer try and its 500 branch become dead code and are removed.
  - The route comment is updated: failed entries are now skipped too.
- `/intent` is untouched. Its 409 is B4's.

### Step 4 — tests (no new test files; all go into existing suites)
- **`tests/core/profile/PaymentsContract.test.ts`** (src/core rule):
  - `PRODUCT_DEFINITIONS`' own keys equal `PAYMENT_PRODUCT_IDS` exactly; citizenship has `kind: "citizenship"`.
  - `PurchaseCompleteResponseSchema` parses with `becamePaidCitizen` true, with false, and without it (the old box shape), and rejects a non-boolean.
  - (OQ-1) Reconcile schema with and without `failedCount`; rejects a negative or non-integer value.
- **`tests/profile-server/PaymentsRepository.test.ts`** (mocked pool), table-driven with `describe.each(PAYMENT_PRODUCT_IDS)`:
  - Fresh grant, `wasPaid = false`, returns `{granted, true}`. Statement order: `BEGIN` → receipt INSERT → `SELECT … FOR NO KEY UPDATE` → flags UPDATE → intent UPDATE → `COMMIT`.
  - Fresh grant, `wasPaid = true` (a second purchase, or a `0425` tester), returns `{granted, false}`, and the flags are **still** written.
  - A replay returns `{already_processed}` with no SELECT and no flags.
  - `applyEntitlement` is called once, inside the transaction before `COMMIT`. If it throws, the grant rolls back (`ROLLBACK`, no `COMMIT`), so no receipt is left without the grant behind it.
  - Unknown ids `premium_skin`, `constructor`, `__proto__` and `toString` all throw before any `connect`.
  - Runtime key-set check: `PRODUCT_GRANTS` own keys equal `PAYMENT_PRODUCT_IDS`. The compile-time half is the `Record` type, enforced by `tsc` (SWC-jest does not type-check).
  - Existing return assertions: `toBe("granted")` becomes `toEqual({status:"granted", becamePaidCitizen:true})`.
- **`tests/profile-server/InboxHooks.test.ts`:** update the return assertions only. Add one test: a fresh citizenship grant to an already-paid player still sends `citizenship_paid` (today's behaviour kept).
- **`tests/profile-server/PaymentsRoutes.test.ts`:**
  - The mock default becomes `{status:"granted", becamePaidCitizen:true}`.
  - `/complete` fresh returns a body with `becamePaidCitizen: true`, or `false` when the mock says so.
  - The grant returning `already_processed` gives a body **without** the field. The existing replay test's exact `{success, purchaseToken}` body stays as it is.
  - `/reconcile` with 3 entries where the middle one's `grantPaidPurchase` rejects: 200 with the other two tokens, and an error line holding the 8-char prefix but not the full token.
  - An entry whose `getProcessedPurchase` rejects: the others are still processed.
  - All entries failing: `200 { processedTokens: [] }`, the documented change from 500.
  - The leak guard gains a failing-entry case.
- **`tests/integration/PaymentsRepository.it.test.ts`** (real Postgres), table-driven over `PAYMENT_PRODUCT_IDS`:
  - First grant: `becamePaidCitizen: true`, `is_paid_citizen` set, receipt recorded.
  - A second token for the same player: `granted, false`.
  - A replay: `already_processed`.
  - A pre-paid player (flags set by SQL, like a tester): `false`.
  - **Concurrency:** two grants with different tokens via `Promise.all` give exactly one `true` and one `false`. This proves the row lock.
  - Update the return assertions in `Routes.it.test.ts` and `PaidStateEqualization.it.test.ts`.
- `tests/profile-server/SessionRoutes.test.ts`: its bare `jest.fn()` mock still type-checks; no change expected.

### Step 5 — worklog
Record the checks and anything skipped in the task folder's `worklog.md`.

## Checks to run
| Check | Why |
|---|---|
| `npm test -- tests/core/profile/PaymentsContract.test.ts tests/profile-server/PaymentsRepository.test.ts tests/profile-server/PaymentsRoutes.test.ts tests/profile-server/InboxHooks.test.ts tests/profile-server/SessionRoutes.test.ts` | targeted runs while working (no lock) |
| `npx tsc --noEmit -p tsconfig.json` | the compile-time coverage check of the `Record` types; also type-checks the integration files. jest/SWC does not type-check, and the container runs ts-node |
| `npm run lint` + `npx prettier --check <changed files>` | project style |
| `npm test` (full, through the npm script and project lock) | brief step 3. Supertest flake rule applies to `PaymentsRoutes`: re-run and say so, never retry in code |
| `npm run test:integration` | **required:** the grant SQL changes (brief step 3). Needs `TEST_DATABASE_URL` from `.env.test` and the `gc-0012-it-pg` container (port 5433). If the container is stopped, I start it with `docker start gc-0012-it-pg`; the plan approval covers that local action. If Docker Desktop is down, I ask (it cannot start headlessly). The run also runs 0491's never-exercised migration `009`; a red result there is reported as 0491's, not hidden |
| Skipped: `npm run check:config-parity` | no env vars touched |
| Skipped: webpack build | no client code changed; the contract change is covered by tsc |
| Skipped: `npm run test:scripts:docker` | no deploy or backup script touched |

## Deploy notes
- **Ships by a profile-box deploy** (`build-deploy-profile.sh`), in a **weekend slot** unless urgent. Committed is not deployed. Nothing is committed without the owner's explicit ask.
- **Order relative to 0491: deploy 0491 first, then B1.**
  - The deploy builds `HEAD` and refuses a dirty tree for the files it ships. 0491's changes are still uncommitted in the same files (`Routes.ts`, `Server.ts`, `PlayerProfileRepository.ts`, `Telemetry.ts`, `migrations/009_…`), and 0491's brief already orders its own deploy before the 0488 client.
  - B1's `Routes.ts` edits sit in the payments section, separate hunks from 0491's route, so the two can be committed separately (`git add -p`).
  - If the owner instead commits both and deploys once: one image ships both, migration `009` applies, and B1 cannot be rolled back on its own.
- **No schema change, so rolling back the image is safe.**
- **No game deploy needed, and no ordering with 0494/0488.** Old clients drop `becamePaidCitizen`, and 0494 must handle a box without it (its brief, check 3).
- **Live verify is 0493.** Two knock-ons for the producer, who owns that brief:
  - (a) After B1, a failing reconcile entry no longer produces a 500. So 0493 step 4 ("no reconcile 500s") is a weaker check than it sounds; the verifier should also search the box logs for `reconcile entry failed`.
  - (b) The wiki records that live `/reconcile` has **never been observed** (`0297`). So 0493 step 3 is probably the first live reconcile ever.

## Edge cases covered
- Prototype-key product ids: the own-property lookup refuses them.
- Two grants for one player at the same moment: the row lock gives exactly one `becamePaidCitizen: true`.
- A tester whose paid flags were set without a purchase: `false`, flags rewritten harmlessly (`COALESCE` keeps the date).
- `/complete` racing `/reconcile` on the same token: the field is left out.
- `applyEntitlement` throwing: full rollback, no receipt left behind.
- The whole database down during reconcile: one error line per entry, `200 []`. The live client already treats `[]` like a failure (returns, consumes nothing).
- Large reconcile payloads: one error line per failed entry. The payload is capped at 64 KB, so the log volume is bounded.

## Open points — my recommendations (owner-facing)
- **OQ-1 — should `/reconcile` tell the client that some entries failed?**
  - Today a single failing entry gives a 500. B3 (0495) maps a failed reconcile to `needs_tap`, so it never auto-opens the payment window on that path.
  - After B1 as written, the same case is `200` with fewer tokens. B3 would read it as `none` or `processed` and could auto-open a payment window for a player whose earlier purchase was paid but not granted. That is a second-charge path the spec's §7 row ("never auto-opens a payment window…") meant to block.
  - **My rec: add an optional `failedCount` to the reconcile response in B1** (additive; old clients drop it), and have 0495 map `failedCount > 0` to `failed`. That avoids a second box deploy later.
  - Alternative: build exactly as the spec says, and flag the gap to 0495's planner, which then needs another box change.
  - Either way it is a contract addition outside the spec's literal text, so it needs the owner's (or architect's) OK. Knock-on: none for placement (checked); it adds one line to 0495's scope.
- **OQ-2 — `becamePaidCitizen` on a replay: leave it out (my rec) or send `false`?** Leaving it out is honest ("not known"). `false` would wrongly claim the buyer was already paid, when the earlier grant may be what made them paid. Low stakes, because B2 shows the popup after every grant anyway.
- **OQ-3 — the brief's "existing citizenship payment tests pass unchanged".** My reading: behaviour unchanged. About 15 return-value assertions change shape mechanically, because the spec changes the return type. Asserting the old strings unchanged would mean not following §5.
