# Approved Plan — 0019 Yandex Payments: Catalog Fetch & Purchase Infrastructure

> Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-08-14, during a
> `/fkit-sprint-ship-loop` run. Owner rulings at the gate: (1) plan approved including the three
> technical recommendations (inbox no-op seam; raw client-asserted id at `/intent` per ADR-103;
> `/complete` returns `purchaseToken`); (2) endpoints live on the **profile server**; (3) **infra
> only** — no visible Buy CTA in 0019 (0018 wires the flow); (4) live verifications (real catalog,
> real test purchase, live reconciliation) **deferred to a written checklist** until 0014's Yandex
> catalog approval + secret-key issuance.
> Plan body below is the coder plan-worker's returned text, copied verbatim by the driver.

# Implementation Plan — 0019 Yandex Payments: Catalog Fetch & Purchase Infrastructure

## Grounding (what the plan is based on)

- Brief: `ai-agents/tasks/done/0019-yandex-payments-impl/brief.md`
- Findings: `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md` (Investigation B — treated as ground truth for SDK behavior)
- ADR-103 (identity-trust seam): paid entitlements are verified server-side via signed payloads; the raw client-asserted Yandex id stays confined to `getCreditableYandexId()`. The Yandex per-game secret key is only issued once IAP is enabled — coupled to blocked task 0014.
- Existing code: `src/client/flashist/FlashistFacade.ts` (bounded platform init, late-SDK recovery), `src/profile-server/{Routes,PlayerProfileRepository,migrate}.ts`, `src/core/profile/CreditContract.ts` (the contract idiom to mirror), `migrations/001_player_profiles.sql` (paid-flag CHECK constraints already in DB), `src/client/PlayerProfileView.ts` (client→profile-API fetch pattern, `profileApiUrl` from config).

## Honesty up front — what CANNOT be verified in this task

- **Task 0014 is Blocked (awaiting Yandex catalog approval)** and per ADR-103 the **per-game secret key does not exist until Yandex enables IAP**. Therefore brief verifications **1 (live catalog `ready`), 3 (real test purchase), 4 (live reconciliation)** cannot be run now. They ship as a written live-verification checklist to execute once 0014 unblocks.
- What CAN be verified now: all unit/route tests with a **synthetic secret key** (HMAC verification is deterministic), the outside-Yandex degraded path (verification 2), UI-gating logic (verification 6, at helper level), idempotency (verification 5, route+repo tests), and the paid-flags-only-from-payment invariant (verification 7, regression tests + existing DB CHECK constraints).
- The exact signature encoding ("`<signature>.<json>` base64 pair", presumed HMAC-SHA256) comes from the findings doc; the build step includes re-verifying the algorithm/encoding against the current Yandex docs before finalizing the verifier, and encoding that in fixtures.

## Architecture decisions embedded in this plan (each is also an open question below)

1. **Endpoints live on the profile server** (`api.geoconflict.ru`), as `POST /v1/payments/yandex/{intent,complete,reconcile}` — not on the game server. The DB, the paid-flag columns, and the `TODO(payments)` comments are all there; the secret stays on one box; no game-server proxy hop; client already reaches it cross-origin (CORS pattern exists). This deviates from the brief's literal `/api/payments/...` paths (those match the game-server convention).
2. **`/intent` accepts the client-asserted `yandexPlayerId`** (raw, same trust level ADR-103 accepted). Safe because the *grant* is bound to the Yandex-HMAC-signed payload: `developerPayload` → intent row → player id. Worst abuse case is an attacker paying real money to gift citizenship to an id he chose at his own intent-creation time. Rate-limited per-IP.
3. **`/complete` returns `{ success, purchaseToken }`** (brief says `{ success: true }` only). With `signed: true`, `purchase()` returns `ISign { signature }` — no plain token — so the server (which parsed the verified payload) must hand the token back for the client's `consumePurchase()`. Findings §consume-flow flags exactly this gap.
4. **Idempotency check runs BEFORE the intent-open check** in `/complete` (brief lists intent check first). Reason: interrupted-consume retry — grant done, intent marked used, consume failed, client retries/reconciles the same token — must return success + token, not "intent used".
5. **No visible CTA is built in 0019.** The "Buy Citizenship" button, purchase-flow UX, and funnel analytics are 0018's Part A/B; building the button here without 0018's flow creates a dead button (a class of bug this project has already shipped and reverted once). 0019 delivers the gating primitives + tests.
6. **Inbox trigger (brief step 7) becomes a documented no-op seam.** Personal inbox (0012) is backlog — there is nothing to call. The grant function exposes a single post-grant hook point with a TODO referencing 0012/0018.

## Step-by-step

### Step 1 — Shared contract: `src/core/profile/PaymentsContract.ts` (new)

Mirrors `CreditContract.ts`: Zod schemas + inferred types for the three endpoints:
- `PurchaseIntentRequest { yandexPlayerId (1–128), productId (enum: "citizenship" for now — one exported const list) }` → `PurchaseIntentResponse { intentId }`
- `PurchaseCompleteRequest { signature (1–16384) }` → `PurchaseCompleteResponse { success: true, purchaseToken } | error`
- `PurchaseReconcileRequest { signature }` → `PurchaseReconcileResponse { processedTokens: string[] }`

`src/core/` change ⇒ tested (CLAUDE.md hard rule): `tests/core/profile/PaymentsContract.test.ts`.

### Step 2 — DB: `migrations/002_yandex_payments.sql` (new)

Postgres 16 (`setup-profile.sh` pins `postgres:16-alpine`), so `gen_random_uuid()` is built-in. Idempotent DDL, same style as 001:

- `purchase_intents(id uuid pk default gen_random_uuid(), yandex_player_id text not null references player_profiles on delete cascade, product_id text not null, created_at timestamptz default now(), used_at timestamptz)` + index on `(yandex_player_id)`.
- `processed_purchases(purchase_token text pk, yandex_player_id text not null, product_id text not null, intent_id uuid references purchase_intents(id), raw_payload text not null, processed_at timestamptz default now())`.

No intent expiry (reconcile may legitimately arrive days later); single-use + token PK are the replay guards.

### Step 3 — Verifier: `src/profile-server/YandexSignature.ts` (new)

- `verifySignedPayload(signed: string, secret: string): ParsedPurchasePayload | null` — split on first `.`, HMAC-SHA256 over the payload part with the secret, `crypto.timingSafeEqual`, then JSON.parse + Zod-shape the interesting fields (`productId`/`productID`, `purchaseToken`, `developerPayload`; also an array form for `getPurchases` output). Returns `null` on any failure — never throws.
- Build-time action: re-check the exact field names and encoding against the current Yandex SDK docs (the findings note the docs use e.g. `productID` in `IPurchase`); fixtures encode whatever the docs say.
- Secret from `process.env.YANDEX_PAYMENTS_SECRET` — read in `Server.ts`, injected into routes. **Fail closed:** all three payments routes return `503 { error: "payments_unavailable" }` when unset. Never logged, never committed (hard rule).

### Step 4 — Repository: `src/profile-server/PaymentsRepository.ts` (new class, shared `Pool`)

- `createIntent(yandexPlayerId, productId)` — inside a transaction: ensure profile row (`INSERT ... ON CONFLICT DO NOTHING` with only the id — a start-screen buyer may have no row yet since upsert happens at match join), insert intent, return id.
- `getProcessedPurchase(token)` — for the idempotent-retry path.
- `grantPaidPurchase({token, productId, intentId?, yandexPlayerId, rawPayload})` — one transaction: insert `processed_purchases` `ON CONFLICT DO NOTHING` (concurrency-safe: conflict ⇒ treat as already-processed success), `UPDATE player_profiles SET is_citizen = true, is_paid_citizen = true, citizenship_purchased_at = coalesce(citizenship_purchased_at, now()), updated_at = now()` (satisfies the `chk_paid_implies_citizen` CHECK; ensure-row first), mark intent `used_at`. Post-grant hook point (inbox seam, no-op).
- `findOpenIntent(intentId, yandexPlayerId, productId)`.

### Step 5 — Routes: extend `src/profile-server/Routes.ts`

`createApp` gains `paymentsRepo` + `yandexPaymentsSecret` params (structural interfaces, mocked in tests — existing seam style).

- Shared per-IP rate limiter for payments routes (stricter than the profile read, e.g. 20/min).
- CORS: these are cross-origin JSON POSTs from the game origin ⇒ preflight. Scoped middleware on `/v1/payments/*` only: `Access-Control-Allow-Origin: *`, `-Methods: POST`, `-Headers: Content-Type`, and an `OPTIONS` 204 handler. Never on `/internal/*`.
- `POST /v1/payments/yandex/intent` — validate body, create intent, `{ intentId }`.
- `POST /v1/payments/yandex/complete` — verify signature (fail ⇒ 400 `invalid_signature`); token already processed ⇒ 200 `{ success, purchaseToken }` (idempotent, per decision 4); else resolve intent by `developerPayload` — missing/used/product-mismatch ⇒ 409 with reason; else grant transactionally ⇒ 200 `{ success, purchaseToken }`.
- `POST /v1/payments/yandex/reconcile` — verify signed `getPurchases` payload; for each purchase whose `developerPayload` maps to a known intent (any state) for a known product: grant idempotently, collect token; unmapped entries are logged (token prefix only) and skipped — never granted off an unmapped payload. Return `{ processedTokens }` (already-processed tokens included, so the client can consume strays).
- `Server.ts`: construct `PaymentsRepository`, read secret, wire in.

### Step 6 — Client facade: `src/client/flashist/FlashistFacade.ts`

Per the brief's Part A, adapted to the real init structure:
- New private state exactly as briefed (`paymentsObject`, `paymentsCatalog`, `paymentsCatalogById`, `paymentsCatalogStatus`), plus a local `IProduct` type (findings shape — `priceCurrencyCode`, not `currencyCode`).
- `initPayments()`: guard on `yaGamesAvailable` ⇒ `'unavailable'`; `getPayments({ signed: true })` then `getCatalog()`; `'ready'`/`'failed'`; never throws. Added to the `Promise.allSettled` batch in `runPlatformInit()` (shares the 5s deadline — a late catalog still flips to `'ready'` late, matching the flags pattern) **and** to the late-SDK recovery chain in `yandexSdkInit()` (mirrors the flags/player recovery so a degraded boot that recovers still gets a catalog).
- Public helpers per brief: sync `hasCatalogProduct(id)` / `getCatalogProduct(id)` (false/null unless `'ready'`), `purchaseCatalogItem(id, developerPayload)` (rejects when payments not ready — 0018 handles UX), `getSignedPurchases()` (null when unavailable/empty), `consumePurchase(token)`.
- `uiElementIds.purchaseCitizenship = "PurchaseCitizenship"` (the `UI:Tap:` + elementId pattern) so 0018 fires it via the enum, never inline.

### Step 7 — Client API module + session reconciliation

- `src/client/PaymentsApiClient.ts` (new): `createPurchaseIntent`, `completePurchase`, `reconcilePurchases` — base URL via `getServerConfigFromClient().profileApiUrl()` (exact `PlayerProfileView.ts` pattern: empty base ⇒ no-op, bounded timeout, Zod-validate responses, never throw). This is also 0018's building block.
- Session-start reconciliation (brief Part B/reconcile, moderation-compliance requirement): after `flashist_waitGameInitComplete()` and only when catalog status is `'ready'`, fire-and-forget: `getSignedPurchases()` → non-null ⇒ `POST /reconcile` → `consumePurchase()` each returned token (each consume individually caught — a failed consume retries next session). Small module `src/client/PaymentsReconciliation.ts`, kicked off from the facade after `initPayments()` resolves ready (no `Bootstrap.ts` ordering changes).

### Step 8 — Analytics reference

Add `UI:Tap:PurchaseCitizenship` to `ai-agents/knowledge-base/analytics-event-reference.md`, marked "wired in 0018" (per the memory rule: reference doc updated whenever events are added).

### Step 9 — Deploy wiring (code only; no deploy performed)

`setup-profile.sh` writes `profile.env` — add `YANDEX_PAYMENTS_SECRET` plumbing (empty default = payments disabled, fail-closed). Migration 002 applies via the existing `npm run migrate` deploy step. Actual deploy + secret provisioning is an owner-gated ship step, out of this task's hands.

## Test plan

- `tests/core/profile/PaymentsContract.test.ts` — schema accept/reject boundaries.
- `tests/profile-server/YandexSignature.test.ts` — valid payload (synthetic key), tampered payload, wrong key, malformed input (`no dot`, non-JSON, empty), array payload for reconcile.
- `tests/profile-server/PaymentsRoutes.test.ts` (supertest + mocked repos, real verifier with test secret) — per endpoint: happy path; bad body 400; missing secret ⇒ 503 all three; `/complete`: invalid signature, replayed token ⇒ idempotent success, used intent + new token ⇒ 409, product mismatch ⇒ 409, unknown intent ⇒ 409; `/reconcile`: mixed processed/unprocessed, unmapped payload skipped, empty list; CORS headers present on payments routes, absent on `/internal/*`.
- `tests/profile-server/PaymentsRepository.test.ts` (+ `tests/integration/*.it.test.ts` following the existing dockerized-PG pattern — noting Docker Desktop needs a manual start on this machine) — intent create for missing profile row, grant idempotency under repeat, CHECK constraints satisfied, intent used-marking.
- **Verification 7 regression**: assert `upsertProfile` and `creditMatchXp` leave `is_paid_citizen=false` / `citizenship_purchased_at=null` on rows they touch (writer-side sole-authority guard).
- `tests/client/FlashistFacade.test.ts` additions — `'unavailable'` outside Yandex (verification 2), `'ready'` with mocked SDK, `'failed'` on catalog throw, helpers false/null when not ready (verification 6 at helper level), late-recovery triggers payments init.
- `tests/client/PaymentsApiClient.test.ts` — empty base no-op, timeout, malformed response ⇒ null, never throws.
- `npm run lint` + full `npm test` before reporting done.

## Edge cases accounted for

Player closes payment frame (`purchase()` rejects — surfaced to 0018's caller); consume fails after grant (reconcile + idempotent `/complete` recover); concurrent double `/complete` (token PK + transaction); buyer with no profile row (ensure-row); secret unset (503, fail-closed); SDK present but `getPayments` rejects (`'failed'`, UI hides); oversized/garbage signature (schema bound + verifier null); reconcile with zero purchases (no network call); non-Yandex context (all helpers inert, no errors — verification 2).

## Sequencing

1 (contract) → 2 (migration) → 3 (verifier) → 4 (repo) → 5 (routes) → 6 (facade) → 7 (client API + reconcile) → 8 (analytics doc) → 9 (deploy wiring) → tests continuously, full suite + lint last. Estimated: the largest single task of the sprint so far; profile-server side and client side are independently testable halves.
