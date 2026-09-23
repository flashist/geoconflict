# Yandex Payments Implementation

**Source**: `ai-agents/tasks/done/0019-yandex-payments-impl/brief.md` (plus `plan.md`, `worklog.md`, `review.md`, `live-verification-checklist.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0019 / payments track

> 🔴 **CORRECTED 2026-09-19 — THE PAYMENTS ROUTES ARE NOT 503ING ON THE BOX.** Verified **read-only**
> by `fkit-lead` on an owner ruling that day: a `POST` to a deliberately **non-existent sub-path** under
> `/v1/payments/` on the box's **loopback** answered **404, not 503**, so the `paymentsEnabled`
> middleware — mounted across the whole prefix ahead of every handler — **passed**;
> `YANDEX_PAYMENTS_SECRET` is **present in the running container, length 32** (⛔ **length only — the
> value was never read into any log, file or transcript**); and the startup warning
> `payments endpoints disabled` appears **0 times** in that container's logs.
>
> 🚨 **THE LIMIT OF THAT EVIDENCE, STATED EXACTLY: it settles "is a non-empty value there" and NOTHING
> MORE.** It does **NOT** show the value is *correct*, and **no real purchase was exercised**.
> ⛔ **Reading this page as "payments work" would be as wrong as the claim it replaces.**
>
> ~~⚠️ **Provenance UNVERIFIED — nothing observed shows `0014` issued a per-game key**; a 32-character
> placeholder would present identically.~~
> ✅ **PROVENANCE ANSWERED 2026-09-20 — struck, not deleted; the placeholder worry was the right
> question and it was PUT TO THE OWNER. OWNER-ATTESTED: the owner set the real Yandex per-game key
> themselves** (*"that's the real Yandex key, I set it."*, given live via `AskUserQuestion`) ⇒ the key
> **was issued** and **the owner performed the profile-box redeploy with it populated**.
> 🚨 **OWNER-ATTESTED, *NOT* REPO-VERIFIED — a deploy leaves NO artifact in git**, so nothing in this
> repository can confirm it. ⛔ **It settles *"is it there, and where did it come from"* and NOTHING
> MORE — correctness is still unproven, there is still no signed payload and no real purchase, so the
> paragraph directly above stands in full.** Source: `0014`'s brief, `## Verification` item 3 — search
> for `CORRECTED 2026-09-20`.
>
> ⛔ **The fail-closed CODE below is unchanged and still correct** — an empty secret still 503s the whole
> prefix and `verifySignedPayload()` still returns null on an empty secret. Only the claim about **this
> box** is corrected.

## Goal

Build the full Yandex Games payments infrastructure recommended by [[tasks/yandex-payments-investigation]]: client catalog fetch and purchase helpers in `FlashistFacade`, plus server-side signed purchase verification, idempotent entitlement grants, and startup reconciliation — everything needed for paid citizenship except the visible purchase UI (task 0018) and the Yandex catalog registration (task 0014).

## Key Changes

**Server — endpoints live on the profile server** (owner ruling 2026-08-14, deviating from the brief's game-server `/api/payments/...` paths; the DB, paid-flag columns, and secret all stay on one box):

- `src/core/profile/PaymentsContract.ts` — shared Zod wire contracts for the three endpoints plus `PAYMENT_PRODUCT_IDS` (`["citizenship"]` today), mirroring `CreditContract.ts`.
- `migrations/002_yandex_payments.sql` — `purchase_intents` (uuid pk, single-use via `used_at`, deliberately no expiry) and `processed_purchases` (purchase-token pk = the idempotency ledger; `intent_id` FK is `ON DELETE SET NULL` so a 152-ФЗ erasure cascade cannot destroy the receipt row — review fix R1).
- `src/profile-server/YandexSignature.ts` — `verifySignedPayload()`: `<signature>.<json>` split, HMAC-SHA256 with `timingSafeEqual`, fail-closed (null on any failure, never throws; empty secret ⇒ null). Accepts **both** plausible HMAC constructions (over the transmitted base64 string and over the decoded JSON) because Yandex docs don't pin the message down — the first live payload narrows it (checklist step 0). Normalizes flat `IPurchase`, the docs' envelope shape, and array payloads.
- `src/profile-server/PaymentsRepository.ts` — `createIntent` (ensure-profile-row first: a start-screen buyer may predate the match-join upsert), `grantPaidPurchase` in one transaction (receipt insert `ON CONFLICT DO NOTHING` ⇒ already-processed short-circuit; sets `is_paid_citizen` + `is_citizen`; `citizenship_purchased_at` COALESCEd). A productId guard throws on any non-`citizenship` product before touching the DB (review fix R2). Post-grant inbox hook is a documented no-op seam until task 0012, fired **after** commit so an inbox failure can never roll back a money grant.
- `src/profile-server/Routes.ts` — `POST /v1/payments/yandex/{intent,complete,reconcile}`; scoped CORS on `/v1/payments/*` only (never `/internal/*`); per-IP limiter 20/min; **fail closed** — missing/empty `YANDEX_PAYMENTS_SECRET` ⇒ 503 `payments_unavailable` on all three. `/complete` checks idempotency before intent state (an interrupted-consume retry must return success, not `intent_used`) and returns `{ success, purchaseToken }` because signed `purchase()` gives the client no plain token. `/reconcile` grants mapped purchases in any intent state (interrupted purchases must land), echoes already-processed tokens, and skips unmapped payloads.
- `setup-profile.sh` — plumbs `YANDEX_PAYMENTS_SECRET` (env var, empty default = payments disabled fail-closed) into the 0600 `profile.env`. The secret value is never committed or logged; ~~it does not exist yet — issuance is coupled to task 0014~~ 🔴 **CORRECTED 2026-09-19 — a NON-EMPTY value (length 32, content never read) IS present in the running container on the box.** ~~⚠️ **Its PROVENANCE is UNVERIFIED: nothing observed shows `0014` issued a per-game key, and a 32-character placeholder would present identically.**~~ ✅ **PROVENANCE ANSWERED 2026-09-20 — OWNER-ATTESTED, NOT repo-verified: the owner set the real Yandex per-game key themselves and performed the redeploy** (*"that's the real Yandex key, I set it."*). 📌 **And `0014` itself CLOSED 2026-09-22** `✅ Done (agent-closed — not owner-verified)` — see [[tasks/yandex-catalog-registration]]. ⛔ **Still do not read it as payments working** — correctness unproven, no real purchase exercised.

**Client:**

- `src/client/flashist/FlashistFacade.ts` — `initPayments()` joined the `Promise.allSettled` boot batch (shared 5s deadline, never throws; `unavailable` outside Yandex, `idle` on degraded boot so the late-SDK recovery re-inits). Helpers: `getPaymentsCatalogStatus()`, sync `hasCatalogProduct`/`getCatalogProduct` (false/null unless `ready`), `purchaseCatalogItem`, `getSignedPurchases`, `consumePurchase`. On catalog `ready` it schedules reconciliation via dynamic import.
- `src/client/PaymentsApiClient.ts` — intent/complete/reconcile calls in the `PlayerProfileView` pattern: empty `profileApiUrl` ⇒ no-op null, 10s timeout, Zod-validated, never throws.
- `src/client/PaymentsReconciliation.ts` — once-per-session latch after game-init completes: signed `getPurchases()` → `/reconcile` → consume each returned token (failures retry next session). Required for Yandex moderation compliance.

**No UI built** (owner ruling): gating primitives plus the `UI:Tap:PurchaseCitizenship` analytics constant only — task 0018 wires the Buy CTA and flow. The CTA rule stands: render only when `hasCatalogProduct('citizenship')` and the player is not already a citizen; hide entirely, never grey out.

## Outcome

All plumbing for paid citizenship is in place and tested (87 suites / 690 tests green at build; 5 new unit-test files). The **sole-authority invariant** holds: `is_paid_citizen` / `citizenship_purchased_at` can be produced only by a verified purchase token via `/complete` or `/reconcile`; `upsertProfile` and `/internal/v1/credit` never touch paid state.

**Not verified yet — carried caveats:**

- **Agent-closed, not owner-verified** (closed 2026-08-14 in a sprint-ship-loop run).
- **Live verifications deferred** — real catalog fetch, real test purchase, and live reconciliation are blocked on task 0014 (Yandex catalog approval + secret-key issuance). A written checklist sits in the task folder (`live-verification-checklist.md`); it must be executed before payments are enabled. **Update 2026-08-23:** that checklist is now absorbed into task `0065` (Paid Citizenship — Live Verification & Go-Live Tail, split out of 0018 on this task's deferred-checklist precedent), which owns executing it; 0065 is blocked on `0014` AND `0062`. See [[decisions/sprint-4]].
- **Integration tests written but not run** (`tests/integration/PaymentsRepository.it.test.ts`, gated by `RUN_DB_TESTS`) — Docker was down on the build machine. Run before ship/deploy.
- **HMAC dual-construction** stays until the first live payload confirms which construction Yandex uses.

**Owner-ruled accepted residuals** (full re-raise conditions in the folder's `review.md`): client-asserted `yandexPlayerId` at `/intent` (safe under [[decisions/adr-103-identity-trust-seam]] — the grant is bound to the Yandex-HMAC-signed payload, so a forged id only lets an attacker pay real money to gift citizenship); any-state reconcile vs `/complete`'s `intent_used` refusal (intent single-use is a per-route refusal, not a system guarantee — fine while every grant is idempotent); non-atomic intent `used_at` (coupled to the previous residual — fix both or neither); no intent expiry.

## Related

- [[tasks/yandex-payments-investigation]] — the Sprint 4 investigation this implements
- [[decisions/adr-103-identity-trust-seam]] — the identity-trust seam the `/intent` residual leans on; the secret key that exits that ADR is the same one this task awaits
- [[systems/player-profile-store]] — the profile API/Postgres stack now hosting the payments endpoints and paid flags
- [[systems/flashist-init]] — the bounded boot gate `initPayments()` joined
- [[decisions/sprint-4]] — sprint context; paid citizenship (0018) remains
- [[tasks/yandex-catalog-registration]] — task `0014`, the catalog registration that gates this task's go-live; **CLOSED 2026-09-22** `(agent-closed — not owner-verified)`, every deliverable owner-attested
- [[decisions/personal-data-152fz-compliance]] — the erasure-cascade concern behind the receipt-FK fix
- [[decisions/config-parity-failure-class]] — task `0195`: ~~`YANDEX_PAYMENTS_SECRET` has never reached the profile box, so **every** endpoint this task shipped has answered 503 there since it shipped~~ 🔴 **CORRECTED 2026-09-19 — the variable HAS reached the box** (present in the running container, length 32) **and the prefix no longer 503s**; the middleware passes. ⚠️ **Presence only — correctness unproven, no real purchase exercised;** ~~provenance unverified~~ ✅ **provenance ANSWERED 2026-09-20, owner-attested, not repo-verified.** ⛔ The fail-closed code is unchanged
- [[tasks/yandex-payments-secret-forwarding]] — task `0195` itself: the deploy-script fix shipped 2026-09-01, but the key does not exist yet, so these endpoints ~~still answer 503 on the real box~~ 🔴 **CORRECTED 2026-09-04: what these endpoints answer on the box is UNVERIFIED** — owner-ruled; ⚠️ *this withdraws an earlier same-day annotation here reading "there IS no real box"*. **The profile VPS exists and is reused in place; what is running on it is unknown.** With an empty key, wherever the service runs, they correctly 503. ⛔ **The `0195` code fix stands** — 🔴 **AND AS OF 2026-09-19 THE BOX NO LONGER CARRIES AN EMPTY KEY:** verified read-only, a `POST` to a non-existent sub-path under `/v1/payments/` on the loopback answered **404, not 503** (so `paymentsEnabled` passed), the variable is **present, length 32** (content never read), and `payments endpoints disabled` appears **0 times** in the container logs. 🚨 **That settles presence and NOTHING ELSE** — not that the value is *correct*, and no real purchase was exercised. ⚠️ **Provenance unverified — this is NOT evidence `0014` issued the key.**
- [[tasks/analytics-p1-citizenship-funnel]] — task `0021`, the funnel spec whose purchase-event constants this task registered; none has ever fired
- [[tasks/personal-inbox]] — task `0012`, which filled this task's post-grant inbox seam and wrapped its call site
