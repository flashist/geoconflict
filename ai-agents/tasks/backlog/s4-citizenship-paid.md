# Task — Citizenship Core: Paid Citizenship (99 Rubles Path)

## Sprint
Sprint 4

## Priority
High — the monetization milestone of the sprint. Blocked on Yandex catalog approval.

## Dependencies
- **Yandex Payments (s4-yandex-payments-impl.md)** must be live — purchase flow and server verification infrastructure is defined there.
- **Player Profile Store** must be live — `is_paid_citizen` is stored there.
- **Personal Inbox (8d-B)** must be live — paid citizenship triggers an inbox message.
- **Yandex catalog item** (`citizenship` at 99 rubles) must be approved in the Yandex Games dashboard.

## Context

Players who do not want to grind 1,000 XP can purchase citizenship directly for 99 rubles. The purchase path uses the Yandex Payments infrastructure established in `s4-yandex-payments-impl.md`. The earned path and paid path produce the same citizenship state — `is_citizen = true` — with an additional `is_paid_citizen = true` flag for the paid path.

---

## What to Build

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

1. **CTA visibility:** log in with a non-citizen account. Confirm "Buy Citizenship" button appears when catalog item is available. Simulate catalog failure — confirm button is hidden.
2. **Price from catalog:** confirm the displayed price is read from the catalog response, not hardcoded.
3. **Purchase flow:** complete a test purchase using a Yandex test-purchase account. Confirm `is_paid_citizen = true` on the server, inbox message received, card transitions to State 3.
4. **Reconciliation recovery:** interrupt the purchase after Yandex processes it but before the server grants the entitlement. Restart the session. Confirm `/reconcile` grants citizenship and the card shows State 3.
5. **Already-citizen:** verify no purchase CTA is shown to a player who has already earned citizenship via the XP path.
6. **Analytics:** confirm `UI:Tap:PurchaseCitizenship` fires on button tap.

## Notes

- This task cannot ship until the Yandex catalog item is approved. The earned path can go live independently.
- Do not hardcode the price. If the price changes in the Yandex dashboard, the UI must reflect it automatically.
- The Yandex per-game secret key used for HMAC verification must live in an environment variable — never in git.
