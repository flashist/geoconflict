# 0019 — Live Verification Checklist (deferred)

> Owner ruling at the plan gate (2026-08-14): brief verifications 1, 3, 4 cannot run until
> task 0014 unblocks (Yandex catalog approval + per-game secret-key issuance, ADR-103).
> Execute this checklist then. Verifications 2, 5, 6, 7 are already covered by automated
> tests (see worklog.md).

## Prerequisites (all must hold first)
- [ ] Yandex dashboard: `citizenship` product exists under In-App Purchases → Inaps
      (moderation may still be pending — test purchases work before moderation).
- [ ] Yandex has enabled purchases for the game (unified-license email flow, 0014).
- [ ] Per-game secret key issued; provisioned on the profile VPS as
      `YANDEX_PAYMENTS_SECRET` in `/opt/profile/profile.env` (0600, via setup-profile.sh)
      and the stack restarted. NEVER commit or log the key.
- [ ] `migrations/002_yandex_payments.sql` applied (`npm run migrate` runs at deploy).
- [ ] A test-purchase Yandex login added under In-App Purchases → Settings.

## 0. Signature-construction confirmation (first live payload)
The verifier accepts two HMAC-SHA256 constructions (over the base64 payload string, and
over the decoded JSON) because the docs don't pin one down. With the first REAL signed
payload:
- [ ] Confirm `/complete` returns 200 (verification passes at all).
- [ ] (Optional hardening) Determine which construction matched and drop the other from
      `src/profile-server/YandexSignature.ts` — file a small follow-up task.

## 1. Live catalog fetch (brief verification 1)
- [ ] Open the game as an authenticated Yandex player (draft or prod build).
- [ ] In the console: `FlashistFacade.instance.getPaymentsCatalogStatus()` → `'ready'`.
- [ ] `FlashistFacade.instance.hasCatalogProduct('citizenship')` → `true`.

## 3. Real test purchase (brief verification 3)
- [ ] Under the test-purchase login, run the flow (0018 UI once wired; before that, drive
      via console: `createPurchaseIntent` → `purchaseCatalogItem('citizenship', intentId)`
      → POST `/complete` with the returned signature).
- [ ] Server profile shows `is_paid_citizen = true` + `citizenship_purchased_at` set
      (psql on the box; the public `GET /v1/profile` strips paid fields by design).
- [ ] The purchase is consumed (a second `getPurchases()` no longer lists it).
- [ ] Inbox message: N/A until 0012 exists (hook seam is a documented no-op).

## 4. Live reconciliation (brief verification 4)
- [ ] Start a purchase, close the payment frame AFTER Yandex processes it but BEFORE the
      client posts the signature (kill the tab at the right moment, or block the
      `/complete` request in devtools).
- [ ] Restart the session. Confirm `POST /v1/payments/yandex/reconcile` fires, the grant
      lands (`is_paid_citizen = true`), and the token is consumed.
- [ ] Run a second restart: reconcile returns the token only while unconsumed; after
      consumption `getSignedPurchases()` goes null (no network call).
