# Sprint 4 Investigation — Yandex Payments Findings

**Date:** 2026-04-18
**Status:** Complete — gates Sprint 4 payment catalog and paid-citizenship implementation

## Executive Recommendation

- **SDK mode:** initialize Yandex payments once per session with `await ysdk.getPayments({ signed: true })`, then fetch catalog with `await payments.getCatalog()`.
- **Entitlement model:** treat citizenship and future cosmetics as **durable server-owned entitlements**. Verify the signed purchase on the server, persist the entitlement there, then call `consumePurchase()` only after the server grant succeeds. Keep `getPurchases()` startup reconciliation for interrupted flows before consumption.
- **Client architecture:** add a memoized payments/catalog service alongside the existing `FlashistFacade` startup flow. Outside Yandex Games, or on any payments failure, return an empty/unavailable catalog so purchase UI hides gracefully.
- **Server completion path:** do **not** rely on a webhook. The current official Yandex Games flow is signed client response -> your server verifies HMAC signature -> your server grants entitlement idempotently.
- **Operational action:** register the catalog items in the Yandex dashboard immediately. The public Yandex console docs say moderation usually takes **3-5 business days** after submission.

## Sources Reviewed

- Yandex Games SDK purchases docs, reviewed 2026-04-18:
  - https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases
- Yandex Games console purchases docs, reviewed 2026-04-18:
  - https://yandex.ru/dev/games/doc/ru/console/purchases
- Yandex Games developer agreement, reviewed 2026-04-18:
  - https://yandex.ru/legal/licensegames/ru/
- Codebase:
  - `src/client/flashist/FlashistFacade.ts`
  - `src/client/Cosmetics.ts`
  - `src/client/Main.ts`
  - `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`

## Codebase Findings That Matter

### 1. The game already has a single Yandex bootstrap point

`FlashistFacade` is already the right integration anchor:

- It detects Yandex availability via `window.YaGames` and only initializes the SDK when present (`src/client/flashist/FlashistFacade.ts`).
- It exposes `initializationPromise`, which is the existing session-start synchronization point.
- It already initializes player identity and experiment flags in parallel, with best-effort failure handling.

This is the correct place to add payment initialization and session catalog caching.

### 2. Payments are not integrated anywhere today

There is **no** `getPayments()`, `payments`, `getCatalog()`, `purchase()`, or `consumePurchase()` usage in `src/`.

The current cosmetics purchase path is still Stripe-based:

- `src/client/Cosmetics.ts` posts to `/stripe/create-checkout-session`
- `src/client/Main.ts` handles `#purchase-completed` hash redirects from the current web checkout flow

Sprint 4 Yandex payments work is therefore a new integration, not an incremental extension of an existing Yandex purchase path.

### 3. The identity trust gap from Investigation A still applies

The player-store investigation already established that the game server does **not** currently receive a verified Yandex player ID. That is still the main security gap for paid citizenship:

- paid entitlement should not be granted from an unverified raw client identity
- signed purchase verification proves the purchase payload came from Yandex, but the entitlement still needs to be bound to the correct in-game player profile

For Sprint 4, the safest path is:

1. add a verified Yandex identity claim into the join/auth path
2. use a server-issued purchase intent ID in `developerPayload`
3. grant citizenship only after the server verifies the signed purchase and maps it back to that verified identity

## 1. Yandex Payments SDK Integration

## Current API

The current official docs support two ways to access payments:

```ts
const ysdk = await YaGames.init();

const paymentsA = ysdk.payments;
const paymentsB = await ysdk.getPayments();
```

`ysdk.payments` works directly, but the docs explicitly say `ysdk.getPayments()` preloads the data required for payments methods, so the first call is not slower. For Geoconflict, `getPayments()` is the better integration point.

If purchases are processed on the server, initialize payments with `signed: true`:

```ts
const ysdk = await YaGames.init();
const payments = await ysdk.getPayments({ signed: true });
```

The docs state that `signed: true` changes the return shape of `purchase()` and `getPurchases()` to a signed payload. `getCatalog()` remains a normal product list.

## Catalog fetch

The current catalog API is:

```ts
const ysdk = await YaGames.init();
const payments = await ysdk.getPayments({ signed: true });
const catalog = await payments.getCatalog();
```

The official product shape is:

```ts
interface IProduct {
  id: string;
  title: string;
  description: string;
  imageURI: string;
  price: string;
  priceValue: string;
  priceCurrencyCode: string;
  getPriceCurrencyImage(size: "small" | "medium" | "svg"): string;
}
```

Important detail: the docs use `priceCurrencyCode`, not `currencyCode`.

For Sprint 4 UI gating, these fields matter most:

- `id`: stable product ID to match in code
- `title`: display name
- `price`: formatted price string for UI
- `priceValue`: raw numeric string
- `priceCurrencyCode`: currency code
- `imageURI`: product image if needed later

## Purchase flow

### Recommended Geoconflict flow: signed + server handled

```ts
const ysdk = await YaGames.init();
const payments = await ysdk.getPayments({ signed: true });

const purchase = await payments.purchase({
  id: "citizenship",
  developerPayload: purchaseIntentId,
});

await fetch("/api/payments/yandex/complete", {
  method: "POST",
  headers: { "Content-Type": "text/plain" },
  body: purchase.signature,
});
```

Officially:

- `payments.purchase({ id, developerPayload? })` opens the Yandex payment frame
- on success, the promise resolves
- if the user closes the payment window or the purchase fails, the promise rejects
- with `signed: false`, success returns:

```ts
interface IPurchase {
  productID: string;
  purchaseToken: string;
  developerPayload: string;
}
```

- with `signed: true`, success returns:

```ts
interface ISign {
  signature: string;
}
```

The docs also state that the signed payload sent to the server is a base64 pair:

```text
<signature>.<purchase-json>
```

and that `developerPayload` is included inside the signed JSON. That makes it the right place for a server-issued purchase intent ID.

## Consume flow

The official docs split products into two groups:

- **Permanent purchases**: handled via `getPurchases()`
- **Consumable purchases**: handled via `consumePurchase(purchaseToken)`

`consumePurchase()` removes the purchase after processing, so it must happen only after entitlement data is safely persisted.

For Geoconflict, the product requirement is slightly different from the simple SDK examples:

- citizenship and cosmetics are durable entitlements
- the source of truth is planned to live on our server
- once the server has verified the signed purchase, granted the entitlement, and stored the purchase token idempotently, consuming the purchase is reasonable so it does not remain in the unprocessed purchase list forever

So the recommended Geoconflict flow is:

1. `purchase()` returns a signed payload
2. client sends the signature to the server
3. server verifies signature and writes the entitlement transactionally
4. server responds success
5. client calls `consumePurchase(purchaseToken)` for that processed purchase, or the purchase is consumed immediately after the successful grant path during reconciliation

Important nuance:

- before the entitlement is durably stored on our side, the purchase must remain recoverable
- after the entitlement is durably stored on our side, keeping it unconsumed adds noise rather than value

Implementation note:

- with `signed: true`, the documented `purchase()` response is `ISign`, not `IPurchase`, so the plain `purchaseToken` is not returned directly by that call
- this means Sprint 4 implementation must add an explicit token-retrieval step before consumption, for example by locating the processed purchase through `getPurchases()` after the server confirms grant, or by extracting the token from the signed payload in a controlled way

## Unprocessed purchase check

The official docs make this mandatory for moderation: call `getPurchases()` regularly, for example at every game start, so interrupted purchases can still be applied.

For Geoconflict that means:

- after session start, run signed `getPurchases()`
- POST the returned signature to a reconciliation endpoint
- let the server apply any still-unprocessed durable entitlement idempotently
- after the server confirms grant, consume the processed purchases so they do not keep reappearing

This is not optional if Sprint 4 wants Yandex moderation to pass cleanly.

## Call timing / restrictions

Official docs reviewed on 2026-04-18 do **not** explicitly state a browser-style "must be triggered by user gesture" rule for `payments.purchase()`.

Inference from the docs and platform behavior:

- `purchase()` opens a payment frame
- it should be triggered from a direct click/tap on a purchase button, not automatically during startup or modal open

That is the safe implementation pattern even though the docs do not spell out a formal gesture requirement.

## 2. Current SDK Integration State

## What exists already

- `FlashistFacade` checks for `window.YaGames` before initializing the SDK.
- `yandexSdkInit()` initializes the SDK only when Yandex is present.
- `initPlayer()` waits on SDK init, then calls `getPlayer()`.
- `initExperimentFlags()` waits on SDK init, fetches flags once, and memoizes the result.
- `initializationPromise` is already the safe external contract for "SDK-dependent startup work is finished".

This means the codebase already has a robust pattern for "Yandex-specific capability that may not exist locally".

## What does not exist yet

- no payment object initialization
- no catalog fetch
- no session cache for Yandex products
- no wrapper helpers like `getPaymentsCatalog()`, `hasCatalogProduct()`, or `purchaseCatalogItem()`
- no signed purchase verification endpoint
- no reconciliation call for unprocessed purchases
- no explicit reusable helper for Yandex authorization mode / unique ID

## Robustness outside Yandex Games

Outside Yandex Games today:

- `window.YaGames` is absent
- `yaGamesAvailable` stays `false`
- `yandexSdkInit()` becomes a no-op
- `initPlayer()` resolves without failing

So local dev and direct URL runs already tolerate "no Yandex SDK" reasonably well.

One gap remains: if `YaGames.init()` exists but rejects, `FlashistFacade` currently has no dedicated fallback path around that failure. That is not specific to payments, but payments code should be added in a way that does not make startup more brittle.

## Existing availability pattern

There are already three patterns worth reusing:

- `FlashistFacade.instance.initializationPromise`
- `FlashistFacade.yaGamesAvailable`
- `checkIfSdkMethodAvailable()`

Payments integration should follow the same pattern instead of introducing a second startup service with different semantics.

## 3. Catalog Fetch Architecture

## Recommendation

Add payments/catalog caching to `FlashistFacade` as another memoized startup capability:

```ts
private paymentsInitPromise?: Promise<any>;
private paymentsCatalogPromise?: Promise<IProduct[]>;
private paymentsCatalog: IProduct[] = [];
private paymentsCatalogById = new Map<string, IProduct>();
private paymentsCatalogStatus: "idle" | "ready" | "failed" | "unavailable" = "idle";
```

Recommended helpers:

- `getPayments(): Promise<any | null>`
- `getPaymentsCatalog(): Promise<IProduct[]>`
- `getCatalogProduct(id: string): Promise<IProduct | null>`
- `hasCatalogProduct(id: string): Promise<boolean>`

## Where the fetch should happen

Fetch once per session during startup, but do **not** block the entire game on it.

The right place is inside `FlashistFacade._initialize()`, alongside player init and experiment flag init, using `Promise.allSettled`.

Reasoning:

- it is early enough that all later UI sees a stable session cache
- it reuses the existing startup pattern
- failure can stay non-fatal
- the rest of the app already understands `FlashistFacade` as the Yandex-specific service hub

## Failure behavior

If catalog fetch fails for any reason:

- store an empty catalog
- mark status as `failed` or `unavailable`
- never throw into normal UI rendering paths
- hide paid purchase buttons / cards that depend on catalog presence

This matches the task requirement: purchase UI should be hidden, not broken.

## Behavior outside Yandex Games

Outside Yandex Games:

- `getPayments()` should resolve to `null`
- `getPaymentsCatalog()` should resolve to `[]`
- `hasCatalogProduct(id)` should resolve to `false`

This keeps local dev safe and predictable.

## Recommended UI contract

Use catalog presence as the single source of truth for whether a paid button is rendered:

- if catalog contains `citizenship`, show paid CTA
- if it does not, hide paid CTA

But keep the broader citizenship feature surface separate from the purchase CTA:

- guest players can still see a locked citizenship card
- earned-citizenship progress can still exist independently
- only the paid purchase affordance depends on the catalog entry

That matches both this task and the earlier player-store recommendation.

## 4. Yandex Dashboard Setup

## Required setup before testing

The current official console flow is:

1. Ensure monetization is connected and RSYA payment details are filled in.
2. Ensure the offer status is accepted.
3. If unified license scheme is not already enabled, email `games-partners@yandex-team.ru` with:
   - game name
   - game ID
4. Wait for confirmation that purchases are enabled.
5. Add the payments code / updated build to the draft.
6. Add products under `In-App Purchases -> Inaps`.
7. Publish / submit the new version for moderation.

## Product fields

Console docs require these product fields:

- `id`
- integer price in Yandex portal currency
- icon (`256x256`, PNG)
- Russian title
- English title
- Russian description
- English description

Operational limits from the docs:

- max 500 products total
- max 100 products per CSV import batch

## Suggested first Sprint 4 products

- `citizenship` — 99 YAN target price point
- reserve Sprint 5 cosmetic IDs early so moderation lead time does not block later work

## Test mode

There is no separate "sandbox environment" described in the public docs. Instead, Yandex provides **test purchases**:

- add specific Yandex logins to the test-purchase list in `In-App Purchases -> Settings`
- open the game in draft mode or prod
- test purchases under those logins become free after a short propagation delay

That is the official testing path.

## Approval / moderation timeline

What the docs explicitly say:

- moderation after submission usually takes **3-5 business days**
- purchases can be tested before moderation/publication

What the docs do **not** publish:

- a formal SLA for the initial email approval step that enables purchases

Recommendation: assume "email enablement + moderation" can take multiple working days and should start immediately.

## Revenue split

The current Yandex developer agreement says:

- developer remuneration is **50% of Yandex revenue from license payments**, excluding VAT
- Yandex revenue itself is defined after applicable taxes, acquiring fees, store commissions, intermediary fees, fraudulent payments, and chargebacks/reversals

So the plan's "~50% to Yandex" shorthand is directionally right, but the precise public formulation is:

- **developer gets 50% of Yandex's net license-payment revenue**
- actual payout can be lower than a naive 50/50 gross split once taxes and platform/payment deductions are accounted for

Also, the console has a `Prices in countries and regions` view with a `Your share` column. That is the practical place to confirm the real per-region numbers before launch.

## 5. Purchase Completion -> Server Notification

## Recommendation

Use **signed client -> server verification**, not a client-reported success flag and not a webhook.

### Why not client-reported

`purchase()` resolving on the client is not enough for a paid entitlement:

- the client could fake its own completion call
- network drops can leave a real purchase unprocessed
- the server needs idempotency and receipt history anyway

### Why not webhook

As of the official docs reviewed on 2026-04-18, I found **no documented Yandex Games purchase webhook / server-to-server callback** for HTML5 in-app purchases.

The documented secure path is:

1. initialize payments with `signed: true`
2. send the returned `signature` to your server
3. verify it with the per-game secret key
4. apply the entitlement server-side

So the practical answer is: **no documented webhook; use signed payload verification instead**

## Recommended Geoconflict server flow

1. Client requests a server purchase intent for `citizenship`.
2. Server creates `purchase_intent_id`, linked to the current verified Yandex identity / player profile.
3. Client calls:

```ts
await payments.purchase({
  id: "citizenship",
  developerPayload: purchaseIntentId,
});
```

4. Client posts the returned `signature` to `/api/payments/yandex/complete`.
5. Server:
   - verifies HMAC signature with the Yandex secret key
   - parses the signed JSON
   - checks purchase token has not been used before
   - validates `developerPayload` against an open server purchase intent
   - validates expected `product.id`
   - grants `is_paid_citizen = true` in a transaction
   - stores the purchase token / raw payload / completion timestamp
6. Client consumes the processed purchase only after the server confirms grant.
7. Client refreshes player profile state.
8. On every startup, client also sends signed `getPurchases()` output to `/api/payments/yandex/reconcile` so interrupted purchases still land; once the server confirms they were granted, those purchases should also be consumed.

## Security implications

This is the strongest flow available in the currently documented platform model because:

- the purchase receipt is signed by Yandex
- tokens can be deduplicated server-side
- the entitlement is granted only on the server
- startup reconciliation covers interrupted or half-completed flows

But one security prerequisite remains from Investigation A:

- the server still needs a verified Yandex identity claim in the auth/join path before paid citizenship is truly safe long-term

Without that, the server can verify "this purchase exists" but cannot safely attach it to the intended persistent player profile.

## Final Recommendation

If Sprint 4 implementation started now, the implementation brief should be:

1. Extend `FlashistFacade` with memoized Yandex payments init + session catalog cache.
2. Fetch catalog once at session start, without blocking game boot, and degrade to an empty catalog on failure.
3. Gate paid UI strictly on catalog presence.
4. Handle citizenship and cosmetics as durable server-owned entitlements: verify, grant, persist, then consume.
5. Implement signed purchase verification on the server, plus signed startup reconciliation via `getPurchases()`.
6. Ship paid citizenship only after the verified Yandex identity work from Investigation A is in place.

## Main Open Risk

The main unresolved risk is not the SDK API. It is identity binding.

The current server still needs a verified Yandex identity to attach a successful purchase to the correct long-lived player profile. Until that exists, Geoconflict should not grant permanent paid citizenship off a client-selected identity alone.
