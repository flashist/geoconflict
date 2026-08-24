# Task — Paid Citizenship: Live Verification & Go-Live Tail

## ID
0065

## Sprint
Sprint 4

## Priority
High — the go-live gate for the monetization milestone. Everything buildable was split into `0018`
(mock scope); this task is what remains once Yandex delivers.

## Status
🚧 Blocked — two external/prod conditions: Yandex catalog approval + per-game secret-key issuance
(`0014`) **and** `0062` (`PROFILE_INTERNAL_TOKEN` not forwarded to prod — no profile row is ever
created there). Both must clear; neither alone unblocks.

## Owner
fkit-coder

## Origin

Split out of [`0018-citizenship-paid`](../0018-citizenship-paid/brief.md) on 2026-08-23 by owner
ruling ("maximize work that can proceed without anything real from Yandex; don't block on external
turnaround"). `0018` now carries the mock-buildable scope (client flow, grant, reconciliation UI —
all against a mocked SDK catalog); this task carries **everything that genuinely needs Yandex or
production**. Modeled on the `0019` precedent
([`live-verification-checklist.md`](../../done/0019-yandex-payments-impl/live-verification-checklist.md)
— owner-ruled deferral at the `0019` plan gate, 2026-08-14). This task **absorbs `0019`'s deferred
checklist**: running it is part of this scope, so it is not left stranded in a `done/` folder.

## Dependencies

- **`0014`** — catalog item `citizenship` registered + purchases enabled + **per-game secret key
  issued** and provisioned on the profile VPS as `YANDEX_PAYMENTS_SECRET` (0600 env file, via
  `setup-profile.sh`). Never committed, never logged.
- **`0062`** — `PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end (its own
  verifications 2–3). Without it no profile row exists to attach a purchase to.
- **`0018`** — mock scope done: the UI and flow this checklist drives must exist.
- `migrations/002_yandex_payments.sql` applied in prod (`npm run migrate` runs at deploy).
- A test-purchase Yandex login added in the dashboard (In-App Purchases → Settings).

## What to Do

Execute the live checklist below in the production/draft Yandex iframe context. This is
verification-driving plus whatever small fixes fall out — any non-trivial defect found becomes its
own task, not silent scope growth here.

### 1. HMAC-construction confirmation (first real signed payload)
`src/profile-server/YandexSignature.ts` deliberately accepts **two** HMAC-SHA256 constructions
(over the base64 payload string, and over the decoded JSON) because Yandex's docs don't pin one
down (`0019` decision).
- [ ] With the first REAL signed payload, confirm `/v1/payments/yandex/complete` returns 200.
- [ ] Determine which construction matched; file a small follow-up task to drop the other.

### 2. Live catalog fetch
- [ ] Open the game as an authenticated Yandex player. `getPaymentsCatalogStatus()` → `'ready'`;
      `hasCatalogProduct('citizenship')` → `true`.
- [ ] Displayed price on the Buy CTA comes from the real catalog response (not the mock's fake
      price, not hardcoded).

### 3. Real test purchase (through the `0018` UI)
- [ ] Under the test-purchase login, complete the flow end to end via the real button.
- [ ] Prod profile shows `is_paid_citizen = true` + `citizenship_purchased_at` set (psql on the box;
      the public `GET /v1/profile` strips paid fields by design).
- [ ] The purchase is consumed (a second `getPurchases()` no longer lists it).
- [ ] Card transitions to State 3. Inbox message: N/A until `0012` exists (documented no-op seam).
- [ ] Funnel analytics observed live: `UI:Tap:PurchaseCitizenship`, `Purchase:Started:Citizenship`,
      `Purchase:Completed:Citizenship`.

### 4. Live reconciliation
- [ ] Interrupt a purchase after Yandex processes it but before the client posts the signature
      (block `/complete` in devtools or kill the tab). Restart. Confirm `/reconcile` grants,
      the token is consumed, and the card shows State 3.
- [ ] Second restart: `getSignedPurchases()` goes null once consumed (no network call).

### 5. Catalog moderation behavior
- [ ] Record observed behavior of the catalog item pre- vs post-moderation (test purchases are
      documented to work before moderation completes — confirm) and whether moderation state ever
      hides the product from `getCatalog()`. This is the empirical check the mock could not provide.

### 6. Flip-ON (go-live)
- [ ] Flip `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` to `true` in
      `src/client/flashist/FlashistFacade.ts` (`0054` coupling) — **only after** 1–4 pass, and skip
      if `0017`'s live tail already flipped it.

## Verification

The checklist above IS the verification. Close only when every box is checked or explicitly
owner-waived, and the follow-up task from step 1 is filed.

## Notes

- **No secrets in any artifact** — the per-game secret key and `PROFILE_INTERNAL_TOKEN` must never
  appear in briefs, worklogs, logs, or deploy output.
- `0025` (licensing asset audit) completed 2026-08-23 and found a confirmed violation: the go-live
  prerequisite is now **`0066` (remediation — proprietary-music purge, V1) deployed to prod**.
  Confirm `0066`'s prod redeploy checks passed (or owner-waived) before executing step 6. See
  [`0066-licensing-remediation-proprietary-purge`](../../done/0066-licensing-remediation-proprietary-purge/brief.md).
- Do not modify `0019`'s folder; its deferred checklist is superseded by this brief (noted here, not
  edited there — done-task artifacts are finished outputs).
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
