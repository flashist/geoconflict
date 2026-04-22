# Task — Yandex Payments: Catalog Fetch & Purchase Infrastructure

## Sprint
Sprint 4

## Priority
High — blocks paid citizenship path. Independent of the earned citizenship path.

## Dependencies
- **Player Profile Store (Part A)** must be live — verified Yandex identity in the join/auth path is required before paid entitlements are safe to grant.
- **Yandex catalog registration** must be submitted — testing requires the item to exist in the dashboard (test purchases can be made before moderation completes).

## Context

Investigation B is complete (`ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`). Key findings:

- Payments are not integrated anywhere in the current codebase — this is a new integration.
- `FlashistFacade` is the correct anchor: it already handles Yandex SDK detection, initialization, and startup sequencing.
- The secure purchase path is: `signed: true` initialization → client-side `purchase()` → server HMAC verification → server grants entitlement → client consumes.
- No Yandex purchase webhook exists — signed client→server verification is the only documented secure path.
- Startup reconciliation via `getPurchases()` is required for Yandex moderation compliance.
- Outside Yandex Games, all payments methods must degrade gracefully to empty/null — never throw.

---

## Part A — FlashistFacade: Payments Init and Session Catalog Cache

Extend `src/client/flashist/FlashistFacade.ts` with a memoized payments and catalog service. Follow the existing pattern used for `initExperimentFlags()` — startup capability that resolves even on failure.

### New private state
```ts
private paymentsObject: any | null = null;
private paymentsCatalog: IProduct[] = [];
private paymentsCatalogById = new Map<string, IProduct>();
private paymentsCatalogStatus: 'idle' | 'ready' | 'failed' | 'unavailable' = 'idle';
```

### New startup method: `initPayments()`

Called inside `_initialize()` alongside `initPlayer()` and `initExperimentFlags()` using `Promise.allSettled` — must not block game boot on failure.

```ts
private async initPayments(): Promise<void> {
  if (!this.yaGamesAvailable) {
    this.paymentsCatalogStatus = 'unavailable';
    return;
  }
  try {
    this.paymentsObject = await this.yandexGamesSDK.getPayments({ signed: true });
    const catalog = await this.paymentsObject.getCatalog();
    this.paymentsCatalog = catalog;
    catalog.forEach((p: IProduct) => this.paymentsCatalogById.set(p.id, p));
    this.paymentsCatalogStatus = 'ready';
  } catch {
    this.paymentsCatalogStatus = 'failed';
  }
}
```

### New public helpers

```ts
hasCatalogProduct(id: string): boolean
getCatalogProduct(id: string): IProduct | null
async purchaseCatalogItem(id: string, developerPayload: string): Promise<{ signature: string }>
async getSignedPurchases(): Promise<{ signature: string } | null>
async consumePurchase(purchaseToken: string): Promise<void>
```

`hasCatalogProduct` and `getCatalogProduct` are synchronous — catalog is available after init. Return `false` / `null` when status is not `'ready'`.

---

## Part B — Server: Purchase Intent, Verification, and Reconciliation Endpoints

Three new server endpoints. All require a verified Yandex player identity (from the join/auth path established in the Player Profile Store task).

### `POST /api/payments/yandex/intent`

Creates a server-side purchase intent before the client opens the payment frame. Prevents replay attacks.

- Input: `{ productId: string }` with authenticated Yandex player identity from session
- Creates a `purchase_intents` record: `{ id, yandex_player_id, product_id, created_at, used: false }`
- Returns: `{ intentId: string }`

### `POST /api/payments/yandex/complete`

Called by client immediately after `purchase()` resolves. Verifies and grants the entitlement.

- Input: `{ signature: string }` (the raw signed payload from Yandex)
- Server steps:
  1. Verify HMAC signature using the Yandex per-game secret key
  2. Parse signed JSON — extract `productId`, `purchaseToken`, `developerPayload`
  3. Confirm `developerPayload` matches an open, unused purchase intent for this player
  4. Check `purchaseToken` has not been processed before (idempotency)
  5. Grant entitlement in a transaction: set `is_paid_citizen = true`, `citizenship_purchased_at = now()`, store `purchaseToken` + raw payload
  6. Mark purchase intent as used
  7. Trigger personal inbox message: "Welcome, Citizen!" (see Citizenship Paid brief)
- Returns: `{ success: true }` on grant, error with reason otherwise
- After client receives success: client calls `consumePurchase(purchaseToken)`

### `POST /api/payments/yandex/reconcile`

Called at every session start to catch interrupted purchases. Required for Yandex moderation compliance.

- Input: `{ signature: string }` — signed output of `getPurchases()`
- Server verifies signature, iterates unprocessed purchase tokens
- For each unprocessed token: apply entitlement idempotently (same logic as `/complete`)
- Returns list of processed token IDs so client can consume them

---

## Part C — UI Gating

Purchase CTA (the "Buy Citizenship" button) must only render when:
1. `FlashistFacade.hasCatalogProduct('citizenship')` is `true`
2. Player is not already a citizen (`is_citizen === false`)

Do not show a disabled/greyed-out button when the catalog item is absent — hide entirely.

---

## Analytics

Add to `ai-agents/knowledge-base/analytics-event-reference.md`:
- `UI:Tap:PurchaseCitizenship` — fires when player taps the "Buy Citizenship" button (before payment frame opens)

---

## Verification

1. **Catalog fetch:** open the game as an authenticated Yandex player. Confirm `paymentsCatalogStatus` is `'ready'` and `hasCatalogProduct('citizenship')` returns `true` (requires catalog item to be registered in dashboard).
2. **Outside Yandex Games:** open in local dev. Confirm `paymentsCatalogStatus` is `'unavailable'`, `hasCatalogProduct` returns `false`, no errors thrown.
3. **Purchase flow:** complete a test purchase using a test-purchase Yandex account. Confirm `is_paid_citizen` is set on the server profile, inbox message is received, and the purchase is consumed.
4. **Reconciliation:** interrupt a purchase mid-flow (close the payment frame after Yandex processes it but before the client posts the signature). Restart the session. Confirm `/reconcile` picks up the purchase and grants the entitlement.
5. **Idempotency:** submit the same `purchaseToken` twice to `/complete`. Confirm entitlement is granted only once.
6. **UI gating:** with an empty catalog (simulate failure), confirm the "Buy Citizenship" button is absent from the UI.

## Notes

- Do not start this task until Player Profile Store Part A (verified Yandex identity in join path) is live.
- The Yandex per-game secret key used for HMAC verification must be stored as an environment variable — never committed to git.
- `consumePurchase()` must only be called after the server confirms the entitlement grant. Consuming before server confirmation can result in lost purchases.
