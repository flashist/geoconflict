# 0506 worklog — S1 (profile box) build

## 2026-10-26 — Build worker (fkit-coder, spawned by fkit-lead under the ADR-055 marker)

Built `plan.md` (blob `7348ba9d`, verified unchanged before starting) as amended by the owner's typed
direction on Q2 (2026-10-26, quoted in the spawn): *"I am not sure it should be connected to deploys. I
should be some settings that we can change in the source files and when the redeploy happens, this
settings is taken into account"*. Nothing committed or pushed. 0507's client files untouched.

### Change surface

- `src/core/profile/PaymentsContract.ts` — `isPermanentProductKind` (exhaustive switch, `never`
  default); `consume` on the complete response; `grantedTokens` / `consumeTokens` / `heldElsewhere` on
  the reconcile response; the stale "every token safe to consume" doc comment rewritten.
- `src/profile-server/YandexSignature.ts` — `VerifiedPurchase.status`, `VerifiedPayload.issuedAt` and
  `issuedAtPresent`.
- `src/profile-server/Telemetry.ts` — four counters (reconcile entries, reconcile caller, payload
  issuedAt bracket, entry status), `payloadIssuedAtBracket`, `entryStatusLabel`, no-op methods.
- `src/profile-server/ConsumePermanentSetting.ts` (new) — `CONSUME_PERMANENT_PURCHASES = false` with the
  one-way-door comment, and the boot line text.
- `src/profile-server/Server.ts` — boot log line (`warn` when ON, `info` when OFF); passes the setting
  as `PaymentsConfig.consumePermanent`.
- `src/profile-server/PaymentsRepository.ts` — `HolderSighting`, `plausibleIssuedAt`,
  `recordHolderSighting` (upsert).
- `src/profile-server/Routes.ts` — `mayConsume`, `classifyHeld`, `resolveOptionalCaller`, `consume` on
  every `/complete` 200, the new `/reconcile` lists, sightings, shadow counters and one labels-only line
  per request on each route.
- `migrations/011_purchase_holder_sightings.sql` (new) — spec §6.2 DDL.
- Restore drill / helpers: `tests/testdata/profile-restore-drill/verify.sql` (14 tables, coverage +
  digest), `tests/profile-backup-dryrun.sh` (text 13→14), `tests/integration/support/db.ts`,
  `tests/integration/Migration006.it.test.ts`, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`
  (inventory, STOP-if-011-missing note, expected counts and migration list).
- Tests: `PaymentsContract.test.ts`, `YandexSignature.test.ts`, `Telemetry.test.ts`,
  `PaymentsRepository.test.ts`, `PaymentsRoutes.test.ts` (existing `toEqual`s gain the new fields; new
  0506 block), new `ConsumePermanentSetting.test.ts`, metrics/payments mocks in `AlertRoutes`,
  `InternalPathCase`, `RouteMetrics`, `Routes`, `SessionRoutes`; integration
  `PaymentsRepository.it.test.ts` and `Routes.it.test.ts`.

### Decision log

Every call made without asking, which plan item or finding it answers, what changed, and why it
qualified.

1. **Amendment applied — the switch is a source setting, not an env var.** Answers the owner's Q2
   direction. Changed: no `PAYMENTS_CONSUME_PERMANENT` anywhere; plan step 7 dropped whole
   (`build-deploy-profile.sh`, `setup-profile.sh`, `example.env.profile`, the deploy-hardening harness
   are all untouched); `Server.ts` reads no env var for it. `ConsumePermanentSwitch.ts` became
   `ConsumePermanentSetting.ts`: a typed `boolean` constant (typed, not literal `false`, so flipping it
   needs no other edit), nothing to parse. Kept per the amendment: the one-way-door WHY comment next to
   the value, the boot log line, `PaymentsConfig.consumePermanent` (tests flip it), `mayConsume`, the
   switch on/off route tests. Config parity stays `REQUIRED 0` (checked). Qualified: inside the amended
   approved scope.
2. **Obvious winner — a test pins the shipped value to OFF** (`ConsumePermanentSetting.test.ts`). The
   plan named a new switch test file; with no parsing left, the risk a source setting adds is someone
   committing `true` by accident (a one-way door). Cost: a deliberate flip also edits one expectation;
   the test's comment says so. Qualified: same file the plan named, same intent (guard the switch).
3. **Obvious winner — `issuedAtPresent` on `VerifiedPayload`.** Deviation 1's approved bracket set has
   both `absent` and `not_numeric`, but the plan's `issuedAt: number | null` alone cannot tell them
   apart. Added one boolean; `issuedAt` keeps the spec's contract. Qualified: needed to implement an
   approved item exactly; additive.
4. **Obvious winner — `classifyHeld` with a `vfy:false` caller who IS the holder counts `held`, not
   `held_no_caller`.** Counter label only; no answer depends on it (only `held_elsewhere_verified`
   reaches the response). Qualified: within the plan's intent (G8 concerns answers, not aggregates).
5. **Obvious winner — the deviation-3 path counts the entry as `granted` only** (one outcome per
   entry); the sighting row is its evidence. Qualified: keeps the counter's total equal to the entry
   count; in plan.
6. **Obvious winner — a `/complete` shadow log line too** (`issued_at=… statuses=…`), not only
   `/reconcile`. Plan step 6 says one shadow line per request; `/complete` is where the `consume:false`
   purchases happen, so it is the payload the measurement most needs. Labels only, leak-guard tested.
7. **Obvious winner — `plausibleIssuedAt` lives in `PaymentsRepository.ts` and the route passes a
   `Date | null`**, matching the spec's `HolderSighting.payloadIssuedAt: Date | null` stub.
8. **A `consumeTokens` edge noted, not changed:** with the setting ON, a ledger token whose product is
   no longer in the catalogue is in `processedTokens` but not `consumeTokens` (unknown ⇒ never consume,
   the plan's `mayConsume` rule). So "ON ⇒ equals `processedTokens`" holds for every catalogue product.
9. **Local test DB container started and stopped again.** `gc-0012-it-pg` was stopped; `docker start`
   for the integration run, `docker stop` after. Docker Desktop itself was already running.

No review fix was applied (this is a Build spawn; no review has run yet).

### Checks

See the hand-off report for counts. `npx tsc`, `npm run lint`, targeted suites, `npm run
test:integration`, config parity (report + `--enforce --block-on=profile`) and one full `npm test`.
Not run: `npm run test:scripts:docker` (the backup dry run that exercises the `verify.sql` change).

## 2026-10-26 — Process-review worker, round 1 (fkit-coder, spawned by fkit-lead under the ADR-055 marker)

Standing approval: the approved `plan.md` plus the owner's ADR-127 rulings. No commit, no push.

### Decision log

1. **R1 — applied as an obvious winner (docs only).** Finding: no runbook carries the one-way-door warning.
   Verified true; the reviewer's ADR-127 quote is not in the ADR (Decision 4 leaves the runbook entry open,
   spec §14 item 7), and brief item 4's runbook line is struck. Changed: one new section at the end of
   `ai-agents/knowledge-base/profile-backup-restore-runbook.md` (no profile deploy runbook exists) — location,
   ships OFF, boot-line check, ONE-WAY warning, flip procedure, silent turn-OFF on older commit / image
   rollback / health-gate rollback. Qualified: spec §14 item 7 recommends exactly this "as part of `0506` or
   its close. Not an owner decision"; it restores the plan's runbook line that went with the env var.
2. **R2 — applied, verified `CORRECT`, mechanical.** Finding: the `held_elsewhere_verified` doc in
   `Telemetry.ts` says every such entry is answered and sighted, but `noteHeldElsewhere` returns early for an
   unknown or non-permanent product after the count. Changed: that doc comment only (counting untouched — one
   outcome per entry is decision-log item 5 above). Qualified: comment-only, localized, in plan.
3. **Reviewer suggestion — seed a sighting row in the drill seed: NOT applied.** Not an obvious winner: plan
   step 8 named the coverage list and digest row, not seed data; it would move the runbook's expected counts and
   need `npm run test:scripts:docker` (Docker + age/rclone/jq) to prove. Left as a possible follow-up.
4. **Reviewer suggestion — log the SQLSTATE `code` next to `error.name` on a failed sighting write: NOT
   applied.** The approved plan says the failure is *"logged by error name only"*; adding a field departs from
   that wording, so it is outside the standing approval. Harmless and useful (it would tell an FK violation for
   an erased player from other failures); left for the owner/producer.

### Checks
`npx tsc --noEmit -p tsconfig.json` clean · `npm run lint` clean (eslint on `Telemetry.ts` exit 0) ·
`npm test -- tests/profile-server/Telemetry.test.ts tests/profile-server/ConsumePermanentSetting.test.ts`
2 suites / 55 tests green · full `npm test` 241 suites / 5297 tests green, 95 s, no skips. Not run:
`npm run test:integration`, `npm run test:scripts:docker` (nothing they cover changed).

## 2026-10-26 — Process-review worker, round 2 (fkit-coder, spawned by fkit-lead under the ADR-055 marker)

### Decision log

1. **R3 — applied, verified `CORRECT`, docs only.** Finding: the runbook section implies OFF protects purchases
   now, but no client before `0510` reads `consume`/`consumeTokens`. Verified in `PaymentsApiClient.ts`
   (`reconcilePurchases` keeps only `processedTokens`/`failedCount`), `PaymentsReconciliation.ts` (consumes every
   processed token) and `ProductPurchase.ts` (consumes after every `/complete`). Changed: one ⚠️ bullet in
   `profile-backup-restore-runbook.md` § *Payments safety setting* saying the setting has no effect until the
   `0510` game deploy, and the flip bullet narrowed to pages running an `0510`+ client. Qualified: mechanical,
   localized, inside R1's in-plan runbook entry; makes it match spec §7 row 12.

### Checks
Docs only: this round wrote only the runbook, `review.md` and this worklog; no source or test file was
touched, so no test run.
