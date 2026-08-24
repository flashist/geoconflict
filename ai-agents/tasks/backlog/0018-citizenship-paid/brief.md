# Task — Citizenship Core: Paid Citizenship (99 Rubles Path)

## ID
0018

## Sprint
Sprint 4

## Priority
High — the monetization milestone of the sprint.

## Status
🔲 Backlog

*(Re-scoped 2026-08-23 by owner ruling — "maximize work that can proceed without anything real from
Yandex; don't block on external turnaround." This task is now the **mock-buildable scope only**:
client purchase flow, entitlement grant, and reconciliation UI built against a **mocked SDK catalog
with fake product data**, verified by tests + local runs. Everything that genuinely needs Yandex
(real signed payloads / secret key, catalog moderation behavior, HMAC-construction confirmation) or
prod config (`0062`) is **split out into
[`0065-citizenship-paid-live-verification`](../0065-citizenship-paid-live-verification/brief.md)**,
which stays blocked on `0014` + `0062`. Neither of the two former blockers gates THIS brief anymore.)*

## Owner
fkit-coder

## Dependencies

*(Restated 2026-08-23, owner-ruled. Nothing on this list requires anything real from Yandex.)*

- **Yandex Payments (`0019-yandex-payments-impl`)** — ✅ Done. The infrastructure this brief builds on
  is merged: `src/core/profile/PaymentsContract.ts` (shared Zod contracts) and
  `src/client/PaymentsApiClient.ts` (+ `src/client/PaymentsReconciliation.ts`) are **the seam** —
  build against them, do not re-derive Yandex response shapes. `0019`'s investigation
  (`ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`) and its test fixtures document
  Yandex's response shapes; the mocked catalog/purchase data in this task must match those shapes.
- **Player Profile Store** — available **locally** (profile server + Postgres via Docker;
  `RUN_DB_TESTS=1` integration path), and that is sufficient for this brief. The prod side (`0062`:
  no profile row is ever created there) gates `0065`, not this build.
- **Analytics:** this task owns `Purchase:Started:Citizenship`, `Purchase:Completed:Citizenship`, and `Purchase:Abandoned:Citizenship`. Read `0021-analytics-p1-citizenship-funnel` before starting — events must be wired during implementation, not added later.
- **Personal Inbox (8d-B, `0012`)** — not live. The inbox trigger already exists as `0019`'s
  documented post-grant no-op seam (owner-approved at the `0019` plan gate, 2026-08-14); keep it a
  seam, do not block on `0012`.
- ~~**Yandex catalog item** approved in the dashboard~~ — **moved to `0065`.** Not a dependency of
  the mock build.

## Context

Players who do not want to grind 1,000 XP can purchase citizenship directly for 99 rubles. The purchase path uses the Yandex Payments infrastructure established in `0019-yandex-payments-impl`. The earned path and paid path produce the same citizenship state — `is_citizen = true` — with an additional `is_paid_citizen = true` flag for the paid path.

---

## What to Build

> **Mock-first ground rule (owner-ruled 2026-08-23).** Everything below is built and verified against
> a **mocked Yandex SDK catalog** carrying fake product data (e.g. a `citizenship` product with a
> fake price string) whose shapes match `0019`'s documented findings and fixtures. The seam is
> `0019`'s work: `PaymentsContract` + `PaymentsApiClient` + the `FlashistFacade` payments helpers
> (`hasCatalogProduct` / `getCatalogProduct` / `purchaseCatalogItem` / `getSignedPurchases` /
> `consumePurchase`) — mock at the facade/SDK boundary, never fork the contract. Server-side grant
> and reconciliation are exercised against the **local** profile stack with a **synthetic secret key**
> (HMAC verification is deterministic — same technique `0019` shipped with). No real catalog, no real
> purchase, no real signed payload is required anywhere in this brief; those are `0065`.

### Part A — Client: paid CTA in the citizenship card

In the citizenship card component (`s4-citizenship-xp-progress-ui.md`), add a "Buy Citizenship" button in **State 2 only** (authorized, not yet a citizen):

- Render the button **only when** `FlashistFacade.hasCatalogProduct('citizenship')` returns `true`
- Do not show a disabled/greyed-out button when the catalog item is absent — hide entirely
- Button label: "Купить гражданство — 99 ₽" / "Buy Citizenship — 99 ₽" (price from `getCatalogProduct('citizenship').price` — do not hardcode)
- Tapping the button fires `UI:Tap:PurchaseCitizenship` analytics event, then initiates the purchase flow

### Part B — Client: purchase flow

On button tap:

1. Call `POST /api/payments/yandex/intent` with `productId: 'citizenship'` to get a `purchaseIntentId` from the server
2. Call `FlashistFacade.purchaseCatalogItem('citizenship', purchaseIntentId)`
3. On success: POST `{ signature }` to `POST /api/payments/yandex/complete`
4. On server success response: call `FlashistFacade.consumePurchase(purchaseToken)` (token extracted from signed payload)
5. Re-fetch player profile; citizenship card transitions to State 3

On any failure at steps 2–4:
- Show a non-blocking error message to the player
- Do not leave the UI in a broken state — the player should be able to retry

### Part C — Server: grant `is_paid_citizen`

The `/api/payments/yandex/complete` endpoint (defined in the Yandex Payments brief) grants paid citizenship:

```sql
UPDATE player_profiles
SET
  is_citizen = true,
  is_paid_citizen = true,
  citizenship_purchased_at = now()
WHERE yandex_player_id = $1
```

After successful grant, trigger a personal inbox message:

| Field | Value |
|---|---|
| Title | "Welcome, Citizen!" / "Добро пожаловать, Гражданин!" |
| Body | "Your citizenship purchase was successful. You now have access to citizen benefits." / "Ваша покупка гражданства прошла успешно. Вам теперь доступны привилегии граждан." |

### Part D — Already-citizen handling

If a player is already a citizen (via earned path) and the catalog item is present, do not show the purchase CTA. State 3 of the citizenship card has no purchase button.

---

## Localization

Add to both `en.json` and `ru.json`:

```json
"citizenship_paid": {
  "buy_cta": "Buy Citizenship",
  "inbox_title": "Welcome, Citizen!",
  "inbox_body": "Your citizenship purchase was successful. You now have access to citizen benefits.",
  "purchase_error": "Something went wrong. Please try again."
}
```

Russian:
```json
"citizenship_paid": {
  "buy_cta": "Купить гражданство",
  "inbox_title": "Добро пожаловать, Гражданин!",
  "inbox_body": "Ваша покупка гражданства прошла успешно. Вам теперь доступны привилегии граждан.",
  "purchase_error": "Что-то пошло не так. Попробуйте ещё раз."
}
```

The price string (e.g. "99 ₽") must come from `getCatalogProduct('citizenship').price` — never hardcoded.

---

## Analytics

Add to `ai-agents/knowledge-base/analytics-event-reference.md`:
- `UI:Tap:PurchaseCitizenship` — fires when player taps the "Buy Citizenship" button, before the payment frame opens

---

## Verification

> **All steps run mocked/local** (owner-ruled 2026-08-23): mocked SDK catalog + fake product data on
> the client; local profile stack + synthetic secret key on the server. The live equivalents of
> steps 3 and 4 (real test purchase, real interrupted-purchase reconciliation) are **repeated for
> real in `0065`** — a mocked pass here does not retire them.

1. **CTA visibility:** with the mocked catalog reporting the `citizenship` product, confirm the "Buy Citizenship" button appears for a non-citizen account. Mock a catalog failure/absence — confirm the button is hidden entirely.
2. **Price from catalog:** confirm the displayed price is read from the (mocked) catalog response, not hardcoded — change the fake price and see the UI follow.
3. **Purchase flow (mocked):** drive the full client flow with the mocked SDK resolving a synthetically-signed payload. Confirm `is_paid_citizen = true` lands in the local profile DB, the inbox seam is invoked (no-op), and the card transitions to State 3.
4. **Reconciliation recovery (mocked):** simulate the interrupted purchase (mock `getSignedPurchases()` returning an unprocessed synthetic purchase at session start). Confirm `/reconcile` grants citizenship and the card shows State 3.
5. **Already-citizen:** verify no purchase CTA is shown to a player who has already earned citizenship via the XP path.
6. **Analytics:** confirm `UI:Tap:PurchaseCitizenship` fires on button tap.

## Notes

- **Blocker record superseded 2026-08-23 (owner-ruled: "don't block on Yandex externals").** The two
  former blockers — `0062` (no profile row is ever created in prod: `ProfileApiClient.isConfigured()`
  false → `upsertProfile()` no-ops at `GameServer.ts:1217`; profile server fails closed on the empty
  token) and Yandex catalog approval (`0014`) — are both real and both **still stand for going
  live**, but they now gate [`0065-citizenship-paid-live-verification`](../0065-citizenship-paid-live-verification/brief.md),
  not this mock build. ⚠️ Unchanged truth from the old note: catalog approval arriving does **not**
  make the feature live on its own — both conditions must clear, and `0065` records both.
  See [`0062-forward-profile-internal-token-in-deploy`](../0062-forward-profile-internal-token-in-deploy/brief.md).
- **Flip-ON coupling (2026-08-21) — execution moved to `0065`:** the launch must flip
  `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` to `true` in `src/client/flashist/FlashistFacade.ts`
  (card hidden behind this client flag, default OFF, until launch; see
  [`0054-hide-citizenship-card-behind-client-flag`](../../done/0054-hide-citizenship-card-behind-client-flag/brief.md)).
  **Do NOT flip it in this mock-scope task** — flipping belongs to the live tail (`0065`, or `0017`'s
  live tail if the earned path launches first).
- **This mock build does not make paid citizenship live.** Go-live is `0065`'s close-out. The earned
  path (`0017`) can go live independently.
- Do not hardcode the price. If the price changes in the Yandex dashboard, the UI must reflect it automatically.
- The Yandex per-game secret key used for HMAC verification must live in an environment variable — never in git.
