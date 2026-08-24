# Plan — 0018 Citizenship Paid (mock-buildable scope)

**Status:** awaiting owner approval (ADR-031 orchestrated plan gate — no source written).
**Scope ruling honored:** mock-buildable only (owner-ruled 2026-08-23). No real Yandex anywhere;
everything live is 0065. `CITIZENSHIP_CARD_ENABLED` is **not** flipped here (0065/0017 live tail).

## 0. What the code already provides (verified 2026-08-24)

The brief's Parts B(server)/C are **already implemented by 0019** — do not rebuild:

- `src/core/profile/PaymentsContract.ts` — wire schemas for `/intent`, `/complete`, `/reconcile`.
- `src/client/PaymentsApiClient.ts` — `createPurchaseIntent` / `completePurchase` /
  `reconcilePurchases`, never-throw, null-on-failure.
- `src/client/PaymentsReconciliation.ts` — session-start reconciliation, scheduled by the facade
  when the catalog reaches `ready`.
- `src/client/flashist/FlashistFacade.ts` — catalog cache (`hasCatalogProduct`,
  `getCatalogProduct`, `purchaseCatalogItem`, `getSignedPurchases`, `consumePurchase`,
  `getPaymentsCatalogStatus`), `IProduct` shape matching the 0019 findings doc;
  `uiElementIds.purchaseCitizenship` already registered (event `UI:Tap:PurchaseCitizenship`).
- `src/profile-server/Routes.ts` + `PaymentsRepository.ts` — HMAC verify (`YandexSignature.ts`,
  synthetic-secret-friendly), intent binding, idempotent `grantPaidPurchase` executing exactly the
  brief's grant SQL (`is_citizen = true, is_paid_citizen = true, citizenship_purchased_at =
  coalesce(...)`), plus the `afterPaidPurchaseGranted` **no-op inbox seam** (TODO(0012/0018)).
- 0017 (merged, e15bac7): `CreditOutcome.citizenshipNewlyGranted`, `GRANT_EARNED` SQL
  (`is_citizen = false OR citizenship_earned_at IS NULL` arm), `afterCitizenshipEarned` seam,
  `PlayerProfileView.reportEarnedCitizenshipTransition` keyed on `citizenship_earned_at` (so a paid
  grant can NEVER fire `Citizenship:Earned:XP` falsely — public projection strips paid fields).

So the remaining 0018 build is **client flow + UI + analytics + lang + tests**, plus compose-proof
integration tests. 0066 licensing ruling: no art is touched (text button + existing shield icon) —
not applicable.

## 1. Files to change

| File | Change |
|---|---|
| `src/client/flashist/FlashistFacade.ts` | Add 3 `analyticEvents` keys (`PURCHASE_STARTED_CITIZENSHIP: "Purchase:Started:Citizenship"`, `PURCHASE_COMPLETED_CITIZENSHIP`, `PURCHASE_ABANDONED_CITIZENSHIP`). Add `whenPaymentsCatalogSettled(): Promise<PaymentsCatalogStatus>` — resolves when `paymentsCatalogStatus` leaves `"idle"` (immediately if already settled; also fires on the late-SDK recovery path). Internal: tiny resolver list notified at every status assignment. |
| `src/client/CitizenshipPurchase.ts` (**new**) | Purchase-flow orchestration (see §2). Separate module (PaymentsReconciliation style) for testability. |
| `src/client/CitizenshipCard.ts` | Buy CTA in the logged-in **non-citizen** branch only (Part A/D); error line; in-flight guard; subscribe to `whenPaymentsCatalogSettled` → `requestUpdate`; listen for the reconciliation-refresh event (§2c); on flow success force citizen presentation even if the profile re-fetch fails (§3, double-charge guard). |
| `src/client/PaymentsReconciliation.ts` | After consuming ≥1 token, dispatch a `window` CustomEvent (e.g. `geoconflict-purchases-reconciled`) so the card re-fetches the profile (brief verification 4: card must show State 3 after `/reconcile`). |
| `resources/lang/en.json` + `ru.json` | New `citizenship_paid` section: `buy_cta`, `inbox_title`, `inbox_body`, `purchase_error` — exact strings from the brief. Both files, in sync. |
| `src/profile-server/PaymentsRepository.ts` | **Comment-only**: point the `afterPaidPurchaseGranted` TODO at `citizenship_paid.inbox_title/body` (mirrors 0017's earned-seam comment). No behavior change — inbox stays the 0012 no-op seam (owner-approved shape). |
| `ai-agents/knowledge-base/analytics-event-reference.md` | Document the 3 purchase events; update the `purchaseCitizenship` row ("fires from 0018's CTA" — now real). |
| Tests | `tests/client/CitizenshipCard.test.ts` (extend), `tests/client/CitizenshipPurchase.test.ts` (new), `tests/integration/PaymentsRepository.it.test.ts` (compose additions). |

Not changed: `PaymentsContract.ts`, `PaymentsApiClient.ts`, `Routes.ts` grant logic, any schema/SQL.
No commits, no task-file moves, no wiki writes.

## 2. Design

### a. CTA (Part A + D)
In `renderLoggedIn`, non-citizen branch only:
- Render **only when** `FlashistFacade.instance.hasCatalogProduct("citizenship")` — hidden entirely
  otherwise (no disabled state). Guest and citizen branches never render it (Part D by construction).
- Label: `` `${translateText("citizenship_paid.buy_cta")} — ${product.price}` `` with `product =
  getCatalogProduct("citizenship")` — price string straight from the (mock) catalog, never hardcoded.
- Catalog timing: the platform-init `Promise.allSettled` can settle the catalog **after** the card
  renders (deadline race, late-SDK recovery). The card does
  `void facade.whenPaymentsCatalogSettled().then(() => this.requestUpdate())` after the init gate,
  so a late `ready` reveals the CTA; `failed`/`unavailable` keeps it hidden. No polling.

### b. Purchase flow (`CitizenshipPurchase.ts`)
`runCitizenshipPurchase(): Promise<"granted" | "error">`, guarded by an in-flight latch:

1. Card tap handler first fires `logUiTapEvent(uiElementIds.purchaseCitizenship)`
   (→ `UI:Tap:PurchaseCitizenship`), then calls the flow.
2. `getYandexUniqueId()` → null ⇒ `"error"` (state 2 is reachable with a null id — zero-state path).
3. `createPurchaseIntent(id, "citizenship")` → null ⇒ `"error"`. (No `Purchase:Started` yet — the
   payment frame never opened; 0021 §3 fires it at `purchase()` time.)
4. Fire `Purchase:Started:Citizenship`; `await facade.purchaseCatalogItem("citizenship", intentId)`.
   Reject (player closed frame / SDK error / not-ready) ⇒ fire `Purchase:Abandoned:Citizenship`,
   return `"error"`.
5. `completePurchase(signature)` → null (network, 4xx, 5xx) ⇒ `Purchase:Abandoned:Citizenship`,
   return `"error"`. The purchase stays unconsumed — next-session reconciliation recovers it
   (0019's shipped behavior). Funnel counts it abandoned per 0021 §5's definition (noted residual:
   money captured but grant deferred still logs Abandoned — follows the spec as written).
6. Server success ⇒ fire `Purchase:Completed:Citizenship` (server-confirmed, per 0021 §4), then
   `consumePurchase(purchaseToken)` in try/catch — a failed consume is swallowed (reconciliation
   consumes it next session; grant already committed). Return `"granted"`.

Invariant: exactly one of Started→{Completed, Abandoned} per flow that reaches step 4; nothing
after a step-2/3 failure.

### c. Card UX around the flow
- `"error"` ⇒ show `citizenship_paid.purchase_error` inline under the button (non-blocking), button
  stays enabled for retry; message clears on next attempt.
- `"granted"` ⇒ clear error, `refreshProfile()`. **Even if the re-fetch fails**, set a local
  `paidGrantConfirmed` state that renders the citizen presentation / hides the CTA — the server
  confirmed the grant, and leaving the Buy button up invites a second real charge.
- Reconciliation event (§1) ⇒ `refreshProfile()` — covers "grant landed via `/reconcile` after the
  card already rendered State 2" (same double-charge concern + brief verification 4).
- Residual (accepted, note in worklog): a stale-UI window where a player granted milliseconds ago
  taps Buy — grant is idempotent, charge is real; unavoidable without a pre-purchase profile
  round-trip. Same class as 0019's accepted `/reconcile` any-state-intent residual.

### d. Mock design (matches 0019 fixtures — never forks the contract)
- **Client tests**: mock at the SDK boundary exactly as `FlashistFacade.test.ts` does today —
  fake `sdk.getPayments({signed:true})` → `paymentsObject` with:
  `getCatalog()` → `[{ id: "citizenship", title: "Citizenship", price: "99 ₽", priceValue: "99",
  priceCurrencyCode: "RUB", ... }]` (full `IProduct` shape from the findings doc);
  `purchase({id, developerPayload})` → resolves `{ signature }` / rejects (cancel);
  `getPurchases()` → array-with-`signature` property or `[]`; `consumePurchase()` resolve/reject.
- **Server-side**: no new routes — existing `PaymentsRoutes.test.ts` `sign()` helper (real
  HMAC-SHA256 with a synthetic secret) is the documented technique; reused only if a route test
  needs extending (none expected).

## 3. Sequencing (Docker front-loaded out, like 0017)

**Phase 1 — Docker-free (all of the build):**
1. Facade: analytics keys + `whenPaymentsCatalogSettled` (+ unit tests).
2. `CitizenshipPurchase.ts` + `CitizenshipPurchase.test.ts` (flow ordering, every branch of §2b).
3. Card CTA + error UX + settle/reconcile subscriptions + `CitizenshipCard.test.ts` additions.
4. Reconciliation event dispatch + test.
5. Lang keys (en+ru), analytics reference doc, seam comment.
6. `npm test`, `npm run lint`.

**Phase 2 — Docker (verification only):**
7. Reuse `gc-0017-it-pg` (5433) **only after** `docker ps` + `pg_isready` prove it healthy — it is
   not assumed mine; otherwise start `gc-0018-it-pg` on a free port. Fresh DB.
8. Compose it-tests in `PaymentsRepository.it.test.ts`:
   - **earned→paid**: credit to threshold (earned grant) → `grantPaidPurchase` → both flags true,
     `citizenship_earned_at` preserved, `citizenship_purchased_at` set, constraints hold.
   - **paid→earned**: `grantPaidPurchase` → `creditMatchXp` past threshold →
     `citizenshipNewlyGranted === false` (no double earned-inbox), `citizenship_earned_at` stamped
     by the `GRANT_EARNED` null-arm, `citizenship_purchased_at` untouched.
9. `RUN_DB_TESTS=1 npx jest --runInBand` (known virgin-DB migration race across suites —
   serialization is the 0017-documented mitigation).
10. Local end-to-end server drive (0019's technique): run the profile server locally with a
    synthetic `YANDEX_PAYMENTS_SECRET`; script-sign a fake purchase payload; `POST /intent` →
    `/complete` → psql shows `is_paid_citizen = true`; then a signed fake `getPurchases()` payload
    through `/reconcile` → token returned. Nothing real-Yandex anywhere.

## 4. Verification mapping (brief §Verification)

| Brief step | How |
|---|---|
| 1 CTA visibility | Card tests: mocked catalog present ⇒ button; absent/failed/unavailable ⇒ hidden |
| 2 Price from catalog | Card test: change fake `price` ⇒ label follows; no "99" literal in component |
| 3 Full mocked flow | `CitizenshipPurchase.test.ts` (client half) + Phase-2 step 10 (server half: `is_paid_citizen` in local DB); inbox seam = no-op (comment verified); card→State 3 via card test + `paidGrantConfirmed` |
| 4 Reconciliation recovery | Reconciliation test (mocked `getSignedPurchases` → unprocessed synthetic purchase ⇒ consume + refresh event) + Phase-2 `/reconcile` drive + card refresh test |
| 5 Already-citizen | Card test: citizen state renders no CTA |
| 6 Analytics | Card/flow tests assert `UI:Tap:PurchaseCitizenship` + Started/Completed/Abandoned ordering |

Limit stated plainly: client "local run" verification is jsdom-level (0019's precedent) — there is
no in-browser fake `window.YaGames`, so a live-browser click-through of the mocked flow needs a new
dev-only harness (see open question 2). The real-frame E2E is 0065's job regardless.

## 5. Open questions (to the lead — NEEDS-DECISION)

1. **0021 event-name drift.** 0021 specifies `UI:Tap:CitizenshipBuy`; the 0018 brief, the registered
   `uiElementIds.purchaseCitizenship` constant (0019), and the analytics reference all say
   `UI:Tap:PurchaseCitizenship`. Plan implements **PurchaseCitizenship** (three sources vs one,
   reference doc is source of truth). 0021's row needs a producer-side correction — not mine to edit.
2. **Dev-browser mock harness — in scope?** Verification steps 1–4 say "local runs"; a dev-only
   `window.YaGames` stub (fake catalog + purchase resolving a synthetically-signed payload) would
   allow a real-browser click-through against the local profile stack. **Recommendation: OUT** —
   0019 shipped on jest + scripted server drive, and 0065 repeats the flow for real. Say the word
   and I'll add it as an explicit step (+~half a phase).
3. **Error message on explicit cancel?** The player closing the Yandex frame rejects `purchase()`
   indistinguishably from an SDK error. Plan shows the single `purchase_error` message in both
   cases (brief: "any failure at steps 2–4"). Recommendation: keep as planned; flagging because a
   deliberate cancel seeing "Something went wrong" is mildly off — a silent return on rejection is
   the one-line alternative.

## 6. Risks / edge cases carried into the build

- Late-settling catalog → CTA appears via settle hook (never a disabled button).
- Double-tap / re-entrant purchase → in-flight latch (pattern: `isAuthDialogOpen`).
- `/complete` failure after real charge → unconsumed purchase, next-session reconcile (shipped);
  Abandoned fired (0021-as-written).
- Failed consume after grant → swallowed; reconcile retries; UI still transitions.
- Failed profile re-fetch after grant → `paidGrantConfirmed` forces citizen UI (double-charge guard).
- Paid+earned compose → proven by Phase-2 it-tests both directions; client earned-transition
  analytics already immune (keys on `citizenship_earned_at`).
- `getYandexUniqueId()` null in State 2 → clean error path, no intent created.
