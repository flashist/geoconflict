# 0019 — Worklog (Build step, 2026-08-14)

Built by the fkit-coder Build worker under the `/fkit-sprint-ship-loop` declared-approval
marker (plan approved by the owner via AskUserQuestion in the lead session, 2026-08-14).
Implements `plan.md` in this folder. No commits made; nothing pushed; wiki untouched.

## What changed

### Server (profile server — owner ruling 2: endpoints live here)
- **`src/core/profile/PaymentsContract.ts` (new)** — shared Zod wire contracts for the
  three endpoints + `PAYMENT_PRODUCT_IDS` (`["citizenship"]`). Mirrors CreditContract.ts.
- **`migrations/002_yandex_payments.sql` (new)** — `purchase_intents` (uuid pk,
  single-use via `used_at`, no expiry by design) + `processed_purchases` (token pk =
  idempotency ledger). Idempotent DDL, applied by the existing migrate.ts runner.
- **`src/profile-server/YandexSignature.ts` (new)** — `verifySignedPayload()`:
  `<signature>.<json>` split, HMAC-SHA256 + timingSafeEqual, fail-closed (null on any
  failure, never throws; empty secret ⇒ null). Normalizes flat IPurchase, the docs'
  envelope shape, and array payloads (see decision log 1–2).
- **`src/profile-server/PaymentsRepository.ts` (new)** — `createIntent` (ensure-profile-row
  first — start-screen buyer may predate match-join upsert), `findIntent`,
  `getProcessedPurchase`, `grantPaidPurchase` (one tx: receipt insert ON CONFLICT DO
  NOTHING ⇒ `already_processed` short-circuit; paid flags + `is_citizen` (CHECK
  `chk_paid_implies_citizen`); `citizenship_purchased_at` COALESCEd; intent `used_at`
  COALESCEd). Post-grant inbox seam = documented no-op (owner ruling 1 / plan decision 6),
  fired AFTER commit.
- **`src/profile-server/Routes.ts` (extended)** — `createApp(repo, payments?)`;
  `POST /v1/payments/yandex/{intent,complete,reconcile}`. Scoped CORS (`*`, POST,
  Content-Type, OPTIONS 204) on `/v1/payments/*` only — never `/internal/*`; per-IP
  limiter 20/min; **fail closed**: missing config or empty `YANDEX_PAYMENTS_SECRET` ⇒ 503
  `payments_unavailable` on all three. `/complete`: idempotency check BEFORE intent
  checks (plan decision 4); 400 `invalid_signature`; 409 `unknown_intent` /
  `product_mismatch` / `intent_used`; success returns `{ success, purchaseToken }` (plan
  decision 3). `/reconcile`: grants mapped purchases any-intent-state, echoes
  already-processed tokens, logs+skips unmapped payloads (token prefix only).
- **`src/profile-server/Server.ts`** — wires `PaymentsRepository` + reads
  `YANDEX_PAYMENTS_SECRET` (warn-on-unset, value never logged).

### Client
- **`src/client/flashist/FlashistFacade.ts` (extended)** — payments state + `initPayments()`
  (memoized, never throws; `unavailable` outside Yandex; `idle` on degraded Yandex boot so
  the late-SDK recovery in `yandexSdkInit()` re-inits — wired there too); joined the
  `Promise.allSettled` boot batch (shares the 5s deadline). Helpers:
  `getPaymentsCatalogStatus()`, sync `hasCatalogProduct`/`getCatalogProduct` (false/null
  unless `ready`), `purchaseCatalogItem` (rejects when not ready — 0018 owns UX),
  `getSignedPurchases` (null when unavailable/empty), `consumePurchase`. Exported
  `IProduct` (docs shape, `priceCurrencyCode`). `uiElementIds.purchaseCitizenship` added.
  On catalog `ready`, schedules reconciliation via dynamic import (breaks module cycle).
- **`src/client/PaymentsApiClient.ts` (new)** — `createPurchaseIntent`, `completePurchase`,
  `reconcilePurchases`; PlayerProfileView pattern: empty `profileApiUrl` ⇒ no-op null,
  10s timeout, Zod-validated responses, never throws.
- **`src/client/PaymentsReconciliation.ts` (new)** — once-per-session latch; waits for
  `flashist_waitGameInitComplete()`; signed `getPurchases()` → `/reconcile` → consume each
  returned token (each individually caught; failures retry next session).

### Docs / deploy
- **`ai-agents/knowledge-base/analytics-event-reference.md`** — `UI:Tap:PurchaseCitizenship`
  row (marked: wired in 0018, does not fire yet).
- **`setup-profile.sh`** — `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}` plumbed into
  the 0600 `profile.env` + header doc line. Empty default = payments disabled (fail-closed).
  No deploy performed (owner-gated).
- **`live-verification-checklist.md` (this folder, new)** — the deferred verifications
  1/3/4 (owner ruling 4), plus the signature-construction confirmation step.

### No UI built (owner ruling 3) — gating primitives + analytics constant only; 0018 wires
the CTA and flow.

## Verification evidence

| Command | Result |
|---|---|
| `npm run lint` | clean (exit 0) |
| `npx tsc --noEmit` | clean |
| `npm test` (full suite) | **87 suites / 690 tests passed, 0 failed** (includes the 5 new unit-test files + extended FlashistFacade tests) |
| `npx prettier --check` on all touched files | clean after `--write` pass |
| `npm run test:integration` | **NOT RUN** — needs dockerized Postgres; Docker Desktop requires a manual interactive start on this machine (per project memory, not attempted). `tests/integration/PaymentsRepository.it.test.ts` is written and gated by `RUN_DB_TESTS`; run it once Docker is up. |

Brief-verification coverage now:
- V2 (outside Yandex ⇒ unavailable, no errors) — `tests/client/FlashistFacade.test.ts`.
- V5 (idempotency) — `tests/profile-server/PaymentsRoutes.test.ts` (replayed token ⇒
  success without re-grant) + `PaymentsRepository.test.ts` (short-circuit) + the .it test.
- V6 (UI gating, helper level) — hasCatalogProduct false unless `ready` (empty/failed catalog).
- V7 (paid flags only from payment) — `tests/integration/PaymentsRepository.it.test.ts`
  (upsert/credit never produce OR clear paid state; **pending a Docker run**); route-level:
  no client-facing write path touches paid fields outside the verified grant.
- V1/V3/V4 — deferred to `live-verification-checklist.md` (blocked on 0014).

## Decision log (unattended calls under the standing approval)

All building was inside the approved plan; the entries below are the shape-level calls
made without asking, each verified by tests:

1. **Verifier accepts BOTH HMAC constructions** (over the transmitted base64 payload
   string AND over the decoded JSON text). The plan mandated re-checking the encoding
   against current Yandex docs; the docs confirm HMAC-SHA256 and `<sig>.<json>` base64 but
   do NOT pin down the HMAC message. Accepting both deterministic constructions with the
   same key loses no security and makes live day work under either; checklist step 0
   confirms + optionally narrows. Obvious winner within the plan's "encode what the docs
   say" intent. (`YandexSignature.ts`; both constructions fixture-tested.)
2. **Payload normalization covers the docs' envelope shape.** The docs re-check (plan
   step 3 build-time action) showed the signed JSON example is
   `{ algorithm, issuedAt, data: { token, status, product: { id }, developerPayload } }` —
   not the flat `IPurchase` the findings doc implied. Verifier normalizes envelope, flat,
   and array forms to one `VerifiedPurchase`. Directly executes the plan's mandated
   re-check. (Fixtures for each form.)
3. **Repo exposes `findIntent(intentId)` instead of the plan's
   `findOpenIntent(intentId, yandexPlayerId, productId)`.** `/complete` has no independent
   yandexPlayerId — the player id COMES FROM the intent row (plan decision 2's trust
   model), and `/reconcile` needs any-state intents. Open/product checks moved to the
   route, where each mismatch maps to its own 409 reason. Mechanical shape adjustment,
   same checks enforced (route tests cover all three 409s).
4. **Reconcile signature bound 65,536 vs /complete's plan-specified 16,384** — the
   reconcile payload carries an ARRAY of purchases. Localized bound choice.
5. **Post-grant hook fires after COMMIT** (plan places it "post-grant" inside the repo) —
   a future inbox failure must never roll back a real money grant.
6. **Added public `getPaymentsCatalogStatus()`** — the brief keeps the field private, but
   verification 1/2 observe it and 0018 will need it; a read-only getter is the minimal
   exposure.
7. **Payments handlers registered inside an `if (paymentsRepo !== undefined)` block** —
   TS strict-null can't see the 503 middleware guard; behavior identical (`tsc` was
   failing without it).
8. **Reconciliation scheduled via dynamic `import()` from the facade** — the module
   imports the facade back; a static import would be a cycle. Plan specified "kicked off
   from the facade after initPayments resolves ready"; this is just the mechanism.

## Decision log — Process-review step (2026-08-14, fixes applied under standing approval)

Owner ruled on all four review findings via AskUserQuestion in the lead session; fixes below
applied without further per-fix asking under the sprint-ship-loop standing approval. Each was
verified CORRECT against the code before acting.

1. **R1 fix** (`migrations/002_yandex_payments.sql`): added `on delete set null` to the
   `processed_purchases.intent_id` FK + comment extended. Answers R1 (erasure cascade would
   fail on the bare FK, contradicting the receipt-survives comment). Qualified:
   owner-ruled disposition ("fix in place") + verified-CORRECT + mechanical one-line DDL edit
   to an unapplied migration, inside the plan's step-2 schema.
2. **R2 fix** (`src/profile-server/PaymentsRepository.ts`): productId guard at the top of
   `grantPaidPurchase` — non-`citizenship` throws before any DB touch; unit test added in
   `tests/profile-server/PaymentsRepository.test.ts` (throws + zero queries). Answers R2
   (citizenship-flag grant was product-agnostic). Qualified: owner-ruled ("guard now") +
   verified-CORRECT + localized, behavior-preserving for every currently-valid input (enum
   has one entry).
3. **R3 comment fix** (`src/profile-server/Routes.ts`, `/complete` intent_used branch):
   rewrote the comment to stop claiming a system-wide single-use guarantee; points at the
   review.md residual. No behavior change. Answers R3. Qualified: owner-ruled ("keep
   behavior + fix the misleading comment") + comment-only.
4. **R4**: no code change (owner-ruled: residual alongside R3). Recorded in review.md
   Accepted residuals; no unattended call needed.

No obvious-winner calls beyond the rulings; nothing applied outside the four dispositions.

## Residuals
- Integration tests not executed (Docker down — see table). Everything else verified.
- The HMAC-message ambiguity (decision 1) is a KNOWN unverifiable until the real secret
  exists; tracked as checklist step 0.
- `processed_purchases.raw_payload` stores the decoded purchase JSON (receipt trail); it
  contains no secrets (the payload is what Yandex hands the client).
