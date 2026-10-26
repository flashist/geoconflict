# Worklog — 0496 (B4), durable items base

## 2026-10-25 — Build (fkit-coder, Build worker, spawned by fkit-lead under the ADR-055 marker)

Approved plan: `plan.md` in this folder (blob `52e7c3fb…`, 21101 bytes, checked with `git hash-object`
at build start). Owner approval 2026-10-24, `AskUserQuestion` in the fkit-lead session: "Approve
(Recommended)"; OP-1 "After B2 is done", OP-2 "Leave it alone", OP-3 "Accept it". Nothing committed.

### Preconditions (plan step 0) — checked at build start
- 0494 (B2) `review.md`: `Status: closed-out`.
- `CitizenshipCard.snapshot()` exists (B2). Its shape differs from the plan's guess — see decision 1.
- `migrations/`: 001–004, 006–009 present; `010` was free.

### What changed
- `migrations/010_player_entitlements.sql` (new): the spec §5 table, primary key `(player_id, product_id)`.
- `src/profile-server/PaymentsRepository.ts`: `itemInboxTemplate: InboxTemplateKey | null`;
  `durableItemGrant()`; registry seam (3rd constructor param, default `PRODUCT_GRANTS`);
  `listEntitlements()`; `welcomeTemplatesFor()`; post-grant sends now go in order.
- `src/profile-server/PublicProjection.ts`: `entitlements` on the owner view only (type-forbidden on the
  unverified one); `ITEM_PURCHASE_INBOX_TEMPLATE_KEYS` (empty); item messages dropped from the
  unverified inbox and counted in `hiddenInboxMessageIds`.
- `src/profile-server/Routes.ts`: `PaymentsRepo.listEntitlements`; soft `readEntitlements` on
  `GET /v1/profile` (every caller) and login (existing players); `/intent` 409 `already_owned` via the
  pure `intentRefusal()`; two comments fixed.
- `src/core/profile/PaymentsContract.ts`: header comment only.
- `src/core/profile/PlayerProfile.ts`: `PublicPlayerProfileSchema.entitlements` (optional string array).
- `src/client/PlayerProfileView.ts`: `entitlements` (known ids, owner view only; else null).
- `src/client/CitizenshipCard.ts`: `snapshot()` fills `entitlements`. `src/client/CitizenshipOffer.ts`:
  one comment made wrong by that, fixed.
- Restore drill: `verify.sql` (13 tables), `profile-backup-dryrun.sh` message, `support/db.ts`,
  runbook (13 tables, `010` in the list, `player_entitlements 0`, `schema_migrations 9`, "only after
  `010`" note).
- Tests, all in existing files: `PlayerProfile.test.ts` (core), `PaymentsRepository.test.ts`,
  `InboxHooks.test.ts`, `PaymentsRoutes.test.ts`, `PublicProjection.test.ts`, `SessionRoutes.test.ts`,
  `Routes.test.ts`, `PlayerProfileView.test.ts`, `CitizenshipCard.test.ts`, `CitizenshipStatus.test.ts`
  (fixture), `PaymentsRepository.it.test.ts`, `Migration006.it.test.ts`,
  `PaidStateEqualization.it.test.ts`.

### Checks
- `npx tsc --noEmit -p tsconfig.json`: clean (whole tree, other tasks' hunks included).
- `npm run lint`: clean. Prettier `--check` on every touched TS file: clean after `--write` on four
  test files (my hunks only — previewed with a diff first).
- Targeted `npm test -- <file>` runs: all green while building.
- `npm run test:integration` (container `gc-0012-it-pg` started for the run, stopped after): 14 suites,
  203 tests, green; the 0496 cases confirmed run (`--verbose`), `010` applied by globalSetup.
- `npm run test:scripts:docker`: `RESULT: 55 passed, 0 failed`; `fingerprint IDENTICAL (13 tables …)`,
  `uncovered_tables: none`, `schema_migrations count matches (9)`. (Ran twice; the second time only to
  grep those lines.)
- Full `npm test` run 1: **1 failed** — `tests/server/MasterFeedbackRoutes.test.ts` › "falls back to
  stdout, and 200, when Telegram is not configured" (captured info log was empty). Not the supertest
  timeout shape, not a SIGSEGV; the file and `src/server/` are untouched by B4 or any uncommitted task.
  It passed 3/3 run alone. **Re-ran the full run:** 238 suites, 5042 tests, green (92 s). Cause not
  traced.
- Skipped: `check:config-parity` (no env change); a local game run (no visible change, no item exists).

### Accepted residual (spec §10)
- The `/intent` route's 409 `already_owned` path is first exercised end to end by the first item build
  (no sellable durable item exists, so wire validation refuses every non-citizenship id). B4 pins the
  rule as the pure `intentRefusal()` (8 cases) and shows citizenship never reads ownership. Not a gap of
  B4.

### Decision log (choices made without asking, under the standing approval)
1. **Card hunk, adapted to B2's real shape.** B2's `snapshot()` maps through
   `toPurchaseProfileSnapshot()` (which sets `entitlements: null`), not an inline literal, so the plan's
   one-line swap had no line to swap. I override `entitlements` after the mapping inside
   `CitizenshipCard.snapshot()` and left the mapping (and so `deriveCitizenshipOffer`) passing null —
   exactly the plan's intent ("`CitizenshipOffer.ts` stays `null`"). Its comment "Not read from the
   profile until task 0496" became wrong, so I reworded it (comment only). Qualified as: obvious winner
   within the plan's intent; localized.
2. **Login for a brand-new player → `[]` only when payments are wired, else null (key left out).** The
   plan says `[]` with no query. Taken literally, a new verified player with payments unwired would get
   `entitlements: []` on login but no key on `GET /v1/profile`, breaking the plan's own "one owner-view
   shape" reason. Qualified as: obvious winner within intent; one line.
3. **`hiddenInboxMessageIds` takes the same `itemKeys` parameter (default the shipped set)** as
   `toPublicInboxMessages`, so the plan's "hidden ids include item messages" test can inject a key.
   Mechanical; in plan.
4. **Ordered sends run on a promise chain.** "Item send after the welcome send settles" means the first
   send now starts on a microtask instead of synchronously. Still after COMMIT, still before
   `grantPaidPurchase`'s caller resumes, still never throws (each send has its own catch and logs under
   its own key). Existing InboxHooks cases unchanged and green. In plan (step 2e).
5. **Two extra tests in existing files** beyond the plan's list: the injected registry still refuses an
   inherited key (`constructor`, R2); a citizenship purchase writes no entitlement row (integration).
   They pin plan statements ("own-property lookup … R2", "citizenship stays on the flags"). In plan.
6. **Test stand-ins:** `name_change_approved` stands in for an item's own inbox template in the unit
   tests (no item key exists), and `"citizenship"` stands in for a known id in the client parse test
   (the only id the bundle knows). Test-only.
7. **Review R1 (stateful review round 1), applied without asking.** Runbook § "Pass criteria (`006`
   schema)" said "across all **12** tables"; changed to **13**, matching the inventory, step 5,
   `verify.sql` and the dry-run. Verified first: grep showed it was the only remaining 12-table count.
   Qualified as: verified `CORRECT` + mechanical (one word, docs) + in plan (step 9, "13 tables").
   No obvious-winner calls in this review round.
