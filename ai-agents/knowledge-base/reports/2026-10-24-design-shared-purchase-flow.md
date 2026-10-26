# Design spec — the shared purchase flow (guest logs in, then goes straight into the purchase)

**Task:** [`0484`](../../tasks/done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md)
**Author:** fkit-architect, spawned as a consult by `fkit-lead` (Sprint 9 ship loop). **No owner channel.**
**Date:** 2026-10-24
**Status:** **APPROVED (2026-10-24)** — REVISION 2, approved as written. The owner ruled **OD-1 to OD-4** and
**RP-1** (§9.1, verbatim). The OD-1 ADR is recorded:
[ADR-125](../decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md).
Every review finding and how it was handled: §16.
**Writes:** this file only (plus ADR-125). No source files, no stubs in `src/`, no wiki edits, no commits.

> **Approval, 2026-10-24** (live via `AskUserQuestion` in the lead's Claude Code session, relayed verbatim by
> `fkit-lead`). Question: *"Approve the shared purchase-flow design (0484, revision 2)?"* → **"Approve
> (Recommended)"**. Option text: *"As written, with your answers; also confirms keeping the restart popup and 'switch
> off = no sales'. Tasks get filed."* This confirms OQ-2 and OQ-3 (§9.2). **RP-1 = Guide (keep "Later")** (§9.1).
> No owner decision on this spec is still open.

### Revision log

- **R2, 2026-10-24.** Owner rulings folded in (§9.1). **OD-1** = option 1 (skip the reload, only for "Log in and buy"),
  **plus** the owner's refinement: every completed purchase ends in a restart prompt. So the `0303` popup now shows
  after **every** completed purchase, for every product and buyer, in that product's own wording. The R1 rule that
  showed it only when the buyer became paid, or the item opted in, is dropped, with the `restartOfferWhenAlreadyPaid`
  flag (§4.1, §4.2, §4.3 step 11, §5, §7, §10). Its strength is **RP-1** (open). **OD-2** = private (the R1 default
  stands). **OD-3** = item builds wait on B3 + B4. **OD-4** = B1–B5, B1v, B4v all on **Sprint 9**, overriding the
  usual "verify goes at the top of the next sprint" rule for these tasks (§11). ADR-125 recorded. OQ-2 is settled by
  the OD-1 answer (keep the popup); OQ-3 is unchanged (§9.2).

- **R1, 2026-10-24.** Item ownership is private by default: only a confirmed (verified) login reads it, and the
  server's "already owned" refusal answers only a verified caller (coder F1 → OD-2). The auto-continue window is a
  deadline across all steps, with a timeout on every step (F4). A failed or slow reconcile stops the auto-continue
  (F5). New state `cannot_verify` (F10). The D3 hand-off shows the end message first, then reloads (F3). The restart
  popup fires from one place, and only when needed (F7). Analytics come from the client enum only (F9). The
  migration number is the next free one at build time (F2). New verify tasks for both profile-box deploys, and B4
  stands alone (P9). The item checklist gains the price floor, per-item texts and the UI switch slot (P6). Coins
  dropped from the owner list: already settled (P3). §15 split into owner items and build items (P10).

---

## 0. In plain words

- Every paid item uses one flow. A guest taps **"Log in and buy"**. The Yandex login opens. After it, the game keeps
  going on the same page: it logs in to our profile server, reads the player's profile, checks they don't already own
  the item, and opens the Yandex payment window. **Expected** without another tap. This is documented only and gets
  proven live in B5. If Yandex turns out to need a fresh tap, the player taps **Buy** once more.
- After the payment, our server grants the item **and** makes the buyer a full paid citizen, in one step. The card and
  popup update at once, without a reload. Then the existing "restart to apply" popup (`0303`) appears **after every
  completed purchase**, worded for what was bought (owner, OD-1: the buy itself is never interrupted, but once it is
  done the game guides the player through a restart). How strong that prompt is: RP-1 (§9.1).
- If anything goes wrong (login cancelled, our login fails, the profile doesn't load, the item is already owned, the
  account can't be confirmed), the player sees a clear message. No silent dead end. A guest who logged in but did not
  buy then gets today's reload, a few seconds later than today.
- A new item plugs in through a fixed checklist (§4.2): catalog id and price, one server grant branch, texts, an
  optional UI switch, and a Buy button that calls the shared flow.

---

## 1. Part 1 — fact-check

### (a) Can a Yandex Games purchase start right after login, on the same page, with no reload and no extra tap?

**Answer: probably yes. Nothing in the Yandex docs forbids it, and nothing in the platform forces a reload. This is
DOCUMENTED-ONLY. Nobody has tried it live.** Today's reload after login is **our own choice** (owner ruling D3), not
something Yandex requires.

| Claim | Status | Source |
|---|---|---|
| Yandex lets a player buy **without** logging in. It recommends asking them to log in first or at purchase: *"Пользователь может совершить покупку без авторизации, но мы рекомендуем предлагать ему войти в аккаунт заранее или при совершении покупки."* | documented-only | `yandex.ru/dev/games/doc/ru/sdk/sdk-purchases`, read 2026-10-24 |
| After `auth.openAuthDialog()`, the docs' own sample calls `getPlayer()` again on the **same page**. No reload is mentioned anywhere. | documented-only | `yandex.ru/dev/games/doc/ru/sdk/sdk-player`, read 2026-10-24 |
| Our code already does that re-fetch, on the same page: `openAuthDialog()` and then `getPlayer()`. | **verified (code)** | `src/client/flashist/FlashistFacade.ts:2426-2444` |
| The docs give **no** rule that `purchase()` must come straight from a tap. The moderation requirements give no rule that the payment window may open only on a user action. | documented-only (the rule is absent, not stated) | `sdk-purchases`; `yandex.ru/dev/games/doc/ru/concepts/requirements`, read 2026-10-24. Same finding in `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md` §"Call timing" (2026-04-18) |
| Requirement **1.2.1**: login only after a deliberate player action, *"нажатия специальной кнопки внутри игры"*, and the login offer must say what the player gets. A **"Log in and buy"** button meets this. | documented-only | `concepts/requirements` 1.2.1 |
| A payment object fetched while the player was a **guest** (`getPayments({signed:true})` runs at boot for everyone) still works after login, and the purchase is billed to the account that just logged in. | ❓ **UNVERIFIED.** The docs say nothing about it. | `FlashistFacade.ts:1882-1910` fetches it once per page. The design re-fetches it after login (§4.3, step 4) to be safe. |
| The signed purchase payload carries the **buyer's Yandex id**, so the server could cross-check it. | ❓ **No, as documented.** `IPurchase` = `productID`, `purchaseToken`, `developerPayload`. | `sprint4-yandex-payments-findings.md` (IPurchase shape) |
| Inside the Yandex iframe, a browser popup blocker cannot block a `purchase()` call made after `await`s (it is a Yandex overlay, not `window.open`). | ❓ **UNVERIFIED** (an inference) | — needs the live check in B5 |

**What the platform forces at the least:** one player tap to start the login (requirement 1.2.1). The design gives
exactly that one tap. **What still needs a live test** (B5, §11): the payment window opens after login with no second
tap; the purchase is billed to and granted to the account that just logged in.

### (b) What does today's `0301` citizenship popup do after a guest logs in from it?

**Answer: it reloads the whole page. The purchase does not continue. On the new page the popup is gone, and the player
has to find it and tap Buy again.** **VERIFIED by code trace and unit tests, NOT live.** The live check `0401` check 2
only confirmed the Yandex login dialog **opens**. What happened after it was not recorded
(`ai-agents/tasks/done/0401-…/worklog.md:24`).

The trace:
1. Popup **Log in** → `CitizenshipExplainerModal.onLoginTap` → `card.logIn("CitizenshipLoginExplainer")`
   (`src/client/CitizenshipExplainerModal.ts:302-306`). The popup **stays open**. It has no login handling of its own.
2. `CitizenshipCard.logIn` (`src/client/CitizenshipCard.ts:537-583`) → `openYandexAuthDialog()`.
   - **Cancelled or failed** → `false` → `Profile:Login:Restart:Cancelled` fires and nothing else happens. The player
     stays a guest and the popup still shows Log in. Cancel and failure look the same: the facade catches both
     (`FlashistFacade.ts:2438-2440`).
   - **Success** → `Profile:Login:Restart:Requested` → the card dispatches `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT`.
3. `Main.ts:361-370` → `requestGameRestart` (`src/client/GameRestart.ts:57-99`):
   - **Normal case:** writes the once-per-page latch and calls `reloadApp()` = `window.location.reload()`
     (`FlashistFacade.ts:1299`). The popup disappears with the page, and **no purchase intent is kept**.
   - **Fallback**, used when a match is live, the latch is already set, or sessionStorage is missing or throws: no
     reload. The card calls `refreshProfile()` instead, on the same page. Code trace in `0391` plan §2a: a guest boot
     never latched the D3 failure, so `ensureSession()` logs in fresh (`src/client/ProfileSession.ts:137-160`). The
     popup stays open and re-renders through `CITIZENSHIP_OFFER_CHANGED_EVENT` (`CitizenshipCard.ts:520-524`). It
     then shows **Buy**, and the player must **tap Buy again**. ⚠️ Gap: during that read the card does **not** switch
     to "checking". Only the late-auth path does that (`CitizenshipCard.ts:248`). So the guest **Log in** button stays
     on screen until the read lands.
4. **How long "checking" lasts after the reload** (code timeouts; ⚠️ real durations were **never measured**): platform
   init can take up to 5 s (`PLATFORM_INIT_DEADLINE_MS`, `FlashistFacade.ts:696`). Next comes the signed player data.
   The boot pre-fetch usually has it ready; if not, the wait is up to 60 s (`SIGNED_PLAYER_HANG_MS`, `:704`). Then
   `POST /v1/login` (up to 5 s, `ProfileSession.ts` `LOGIN_TIMEOUT_MS`) and `GET /v1/profile` (up to 5 s,
   `PlayerProfileView.ts:68`). Worst case is about 75 s. The typical case is a few seconds, but that is unmeasured.
   In the fallback path, the same login and read timeouts apply, with a **fresh** signed call (no boot pre-fetch for a
   guest).

Tests behind this: `tests/client/GameRestart.test.ts` (reload once, never mid-match, latch, no-storage),
`tests/client/CitizenshipCard.test.ts:356-410` (the login-succeeded event and its fallback), and
`tests/client/CitizenshipExplainerModal.test.ts:478-491` (the guest popup logs in through the card).

---

## 2. Goal and success criteria

**Goal:** one flow, built once, used by every paid item. It enforces the owner's four rules (`0477` batch 1,
answer 2; `0343` Q2):
1. **Anyone may buy:** guest, non-citizen, unpaid (earned) citizen, paid citizen.
2. **Every purchase makes the buyer a full paid citizen.** That includes no interstitial ads (`0248`).
3. **A guest logs in with Yandex first.** There is no guest-only purchase.
4. **After the login, the player goes straight into the purchase**, with no extra popup or tap, *"if possible"*.

Plus the standing price rule: **every item costs more than paid citizenship alone**, today above 249 Yan (`0343` Q2;
`0477` batch 1, answer 3).

**Success criteria:**
- S1. A guest's purchase takes **one tap from the game** (Log in and buy) plus Yandex's own windows (login, payment).
  Nothing of ours sits between them. A short status line is allowed. (If B5 shows Yandex needs a fresh tap: one extra
  tap, through a one-constant switch, §7.)
- S2. Every product's grant also sets paid citizenship. This is enforced **structurally** (the shared code does it), not
  left to each branch to remember.
- S3. Unknown products are still refused, by the type system and at runtime (`0019` R2).
- S4. No double charge for something already owned, on this page. A paid citizen **can** buy an item. (Two tabs or two
  devices at once: a named residual, §7.)
- S5. The UI updates without a reload after the grant. Then the `0303` restart offer shows after **every** completed
  purchase (OD-1 refinement, §9.1), once per page, never mid-match.
- S6. Every failure ends in a visible state the player can act on. No silent dead end (the lesson of `0070`).
- S7. Funnel analytics cover each step, per product, with every string from the analytics enum.
- S8. Paid status stays private (ADR-116 Decision 4). Because of rule 2, **owning any item means the player paid**, so
  item ownership gets the same privacy as paid status (OD-2, ruled private).

## 3. Constraints and scope

**Hard constraints (existing decisions this must fit):**
- `0019` R2 guard (owner, 2026-08-14 *"guard now"*): `grantPaidPurchase` throws for any product but citizenship
  (`src/profile-server/PaymentsRepository.ts:132-139`). This design keeps the throw for any id without a grant
  branch.
- Grant only after an HMAC-verified `/complete` or `/reconcile`. Consume only after the grant
  (`src/client/CitizenshipPurchase.ts`; `Routes.ts:1040-1121`). Reconcile runs on every session start (Yandex
  moderation, `sprint4-yandex-payments-findings.md`).
- ADR-103 / `0273` S4: `/intent` names its caller by the Bearer session. The grant is bound to the signed payload
  through `developerPayload` → intent row (`src/core/profile/PaymentsContract.ts:5-17`). Anyone can mint a
  `vfy:false` session for an id they merely claim (`src/profile-server/PublicProjection.ts:3-12,55-62`).
- ADR-116 Decision 4 / `0409`: an **unverified** read can never say "paid". A citizen may be offered citizenship only
  on a **verified** "not paid" read (`src/client/CitizenshipOffer.ts:14-17`). Under rule 2 this extends to items:
  an unverified read must not say "owns item X" either (S8, OD-2).
- D3 (`0273`): a **failed** profile login is final for the page load (`ProfileSession.ts:28-33`). No in-page login
  retry. ⚠️ This spec keeps that part unchanged. OD-1 touches only the **reload after a successful Yandex login**
  (ruled: ADR-125).
- The card is the page's only profile reader (`0302`, `0321`; `CitizenshipCard.ts:357-397`).
- Kill switch `0236`: with the citizenship surfaces off, the card is hidden and reconciliation does nothing
  (`PaymentsReconciliation.ts:51-63`).
- Analytics: `Category:Action[:Value]`, PascalCase, at most 5 colon parts (`analytics-event-reference.md`). **Every
  string comes from the `flashistConstants.analyticEvents` enum (`src/client/flashist/FlashistFacade.ts`); none is
  built inline.** `src/core` cannot import the client facade, so the shared contract carries no analytics.
- Every visible string goes through `translateText`, in `en.json` and `ru.json`. New HTML elements go in both
  templates.
- TypeScript target is ES2020 (`tsconfig.json:5`): no `Object.hasOwn`; use
  `Object.prototype.hasOwnProperty.call` (as `src/profile-server/TesterRoles.ts:119` does).

**In scope:** the client flow, the client and server contracts, the grant registry, a generic entitlement store for
items you buy once, the analytics, the failure handling, and the build split.

**Out of scope:** any specific item's rendering or shop UI (`0486` and others). Prices. Packs (`0483`; a pack is one
more product id under this design). Consumables: **buying** coins for Yan makes the buyer a paid citizen like any
purchase (settled: `0477` batch 1 answer 2; `0343` Q2); only **spending** coins is `0480`'s open question, and `0480`
is on hold. A `consumable` kind is not designed here. The account-switch detector itself (`0394`). The fix for the
2–3 % login timeouts (`0474`). The Discord token-login modal (`0070`).

---

## 4. Proposed design

### 4.1 Components

```
 ┌────────────── any Buy surface (card, explainer popup, future style shop …) ──────────────┐
 │ renders derivePurchaseOffer(product, …) ; on tap → coordinator.requestPurchase()          │
 │ on close/hide → coordinator.surfaceClosed(productId)                                       │
 └───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                             ▼
 ┌───────────────────────── PurchaseCoordinator (NEW, client, ONE per page, wired in Main.ts) ┐
 │ purchase latch for ALL products · guest→login→continue under ONE deadline · progress events │
 │ D3 hand-off on a non-granted end                                                            │
 │   uses: PurchaseProfileSource (implemented by CitizenshipCard — still the only reader)     │
 │         FlashistFacade (single-flight auth dialog, payments refresh) · reconcileNow         │
 │         runProductPurchase() (generalized CitizenshipPurchase.ts) · PRODUCT_CLIENT_CONFIG   │
 └───────────────┬──────────────────────────────────────────────┬─────────────────────────────┘
                 ▼                                              ▼
   ProfileSession.ensureSession()                  PaymentsApiClient: /intent /complete /reconcile
   (unchanged; a guest boot never latched)         (CHANGED: result enums, not bare null)
                                                                   ▼
                              profile server  Routes.ts  ──►  PaymentsRepository.grantPaidPurchase
                                                               └─ PRODUCT_GRANTS registry (NEW)
                                                                  shared: receipt + PAID CITIZEN flags
                                                                  + "was already paid?" read
                                                                  per product: its own entitlement write
```

| Component | New / changed | Task | Responsibility |
|---|---|---|---|
| `src/core/profile/PaymentsContract.ts` | changed | B1 | `PAYMENT_PRODUCT_IDS` stays the single list (`:22`). Adds `PRODUCT_DEFINITIONS` (`kind` only: `citizenship` \| `durable_item`). **No analytics here** (F9). `PurchaseCompleteResponseSchema` gains optional `becamePaidCitizen`. |
| `src/client/ProductClientConfig.ts` | **new** | B2 | `PRODUCT_CLIENT_CONFIG: Record<PaymentProductId, …>`: per product, the analytics **enum entries** (restart-popup events included), the text keys (restart-popup text included), and the optional UI switch (§5). A missing product is a compile error. |
| `src/client/PurchaseOffer.ts` | **new**; generalizes `CitizenshipOffer.ts` | B2 | A pure rule: what may be offered for **this** product now. `deriveCitizenshipOffer` becomes a thin wrapper, so the existing tests stay as the spec. |
| `src/client/ProductPurchase.ts` | **new**; generalizes `CitizenshipPurchase.ts` | B2 | intent → frame → `/complete` → consume, for any product. **The only place that dispatches the `0303` restart offer** (F7). `runCitizenshipPurchase()` delegates to it; its event strings do not change. |
| `src/client/PurchaseCoordinator.ts` | **new** | B2 (logged-in path), B3 (guest path) | The shared flow: the latch, guest → login → continue, the deadline, reconcile-then-read, the owned check, progress states, the D3 hand-off. **B2 builds it; `Main.ts` creates the one instance and wires its deps** (next to the card and restart-offer wiring); surfaces get it from a module getter. |
| `src/client/PaymentsApiClient.ts` (+ `tests/client/PaymentsApiClient.test.ts`) | **changed** (F6) | B2 | `createPurchaseIntent` returns `ok \| already_owned \| failed` instead of collapsing every non-200 to `null` (`:78-80`). `reconcilePurchases` returns a result enum (§5). |
| `CitizenshipCard.ts` | changed | B2, B3, B4 | Implements `PurchaseProfileSource` (snapshot incl. `xp` and, from B4, `entitlements`). Its login gains a "for purchase" mode that does **not** dispatch `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` on its own. `buyCitizenship` → coordinator. |
| `CitizenshipExplainerModal.ts` | changed | B2, B3 | Buy and Log in go through the coordinator. Shows the progress line. Closes on `PURCHASE_GRANTED_EVENT` for citizenship (today it closes on the mid-session event, `:207-211`). Calls `surfaceClosed` on close. |
| `CitizenshipPurchase.ts` | changed | B2 | Delegates to `ProductPurchase`; its own dispatch of the mid-session event (`:104`) moves there. |
| `CitizenshipRestartOffer.ts` + modal | changed | B2 | The event detail gains `{ productId, becamePaidCitizen }`; the popup text and its analytics follow the product (§12). Citizenship's text and events are unchanged. Its strength (keep **Later**, or a required restart) follows **RP-1** (§9.1). |
| `PaymentsReconciliation.ts` | changed | B3 | Adds `reconcilePurchasesNow(timeoutMs)`, which ignores the once-per-session latch (`:26-41`), keeps the kill-switch check, and returns a result. |
| `FlashistFacade.ts` | changed | B2, B3 | B2: `openYandexAuthDialog()` becomes **single-flight** (a second call while one is open gets the same promise), so every caller is covered, the card's plain login and `0488`'s WinModal guest login included (F15). B3: adds `refreshPaymentsAfterLogin(timeoutMs)`, a **separate** method that does **not** reuse the memoized `fetchPaymentsCatalog` (`:1878-1910`): it swaps in the new payments object and catalog only on success, never sets the catalog status to `failed`, and never schedules reconciliation. |
| `PaymentsRepository.ts` | changed | B1, B4 | `PRODUCT_GRANTS` registry. The shared transaction always writes the paid-citizen flags and reads whether the player was already paid. |
| `Routes.ts` (payments) | changed | B1, B4 | B1: `/reconcile` isolates each entry's failure (§6); `/complete` returns `becamePaidCitizen`. B4: `/intent` refuses an already-owned **durable item** with 409 `already_owned`, **only for a verified caller** (OD-2). |
| migration `<next free>_player_entitlements.sql` | **new** | B4 | Generic ownership for durable items. **Number = the next free one at build time.** `009` is taken by `0491` (`009_player_rewarded_match_xp.sql`, building now), so **`010` today** (F2). |
| `src/core/profile/PlayerProfile.ts` | changed (src/core: tests required) | B4 | The **owner (verified) view** schema gains optional `entitlements: string[]`. The unverified schema does **not** (OD-2). |
| `PublicProjection.ts` | changed | B4 | Never puts `entitlements` on the unverified view. Drops item-purchase inbox messages from the unverified view, like the L4 paid messages today (a "your style is ready" message also means "paid"). |
| `PlayerProfileView.ts` | changed | B4 | Parses `entitlements`; missing = `null` (unknown). |

### 4.2 How an item build plugs in (the checklist each build follows)

A new product supplies **exactly** these, and reuses everything else:
1. **A catalog id:** one string added to `PAYMENT_PRODUCT_IDS`, plus its `PRODUCT_DEFINITIONS` entry (`kind`). The owner
   creates it in the Yandex console.
2. **A price above the floor:** above 249 Yan today, i.e. more than paid citizenship alone (`0343` Q2; `0477` batch 1,
   answer 3). The final price is confirmed by the owner before the build ships.
3. **A grant branch:** one `PRODUCT_GRANTS[id]` entry. The registry's type is `Record<PaymentProductId, ProductGrant>`,
   so adding an id **without** a branch **does not compile**. The branch writes only the product's own entitlement.
   Paid citizenship is written by the shared code (S2).
4. **An ownership rule:** for `durable_item`, the generic entitlement row (nothing to write).
5. **Client config:** one `PRODUCT_CLIENT_CONFIG[id]` entry (compile error if missing):
   - **analytics:** its enum entries (new `flashistConstants.analyticEvents` keys, §12) and rows in
     `analytics-event-reference.md`;
   - **texts, en + ru:** the state lines if they differ from the generic ones, the post-purchase line, the
     **restart-popup text** for this item, and the **inbox welcome text** for this item (server template + lang keys).
     The restart popup shows after **every** completed purchase of the item (OD-1, §9.1), so its text is required,
     not optional. Suggested shape, from the owner's own words: *"reload to start using the new features"*;
   - **UI switch slot (optional):** a per-item switch that hides the item's own UI, Buy button included. Styles must
     have one (`0477` batch 2 answer 4; batch 3 answer 2).
6. **A UI entry point:** a button that renders `derivePurchaseOffer(productId, …)`, calls
   `coordinator.requestPurchase({ productId, tapElementId })`, calls `coordinator.surfaceClosed(productId)` when it
   closes or hides, and listens to `PURCHASE_OFFER_CHANGED_EVENT` and `PURCHASE_GRANTED_EVENT`.
7. **Tests:** add the id to the table-driven grant test (§10). It then proves "grants the item **and** paid
   citizenship" with no new test code.
8. **Verify task:** its live check proves **"item granted AND buyer is a paid citizen"** (no ads), not just the item.

**The per-item UI switch hides UI only.** The coordinator, the grant, reconcile and the profile read **never** check an
item's UI flag. With a style's switch off, a pending style purchase is still granted and reconciled, and ownership is
kept (the owner's words: *"the backend implementations should not be affected by it"*). The **citizenship kill switch**
(`0236`) is different and does stop everything (§7, §9 "settled").

Reused unchanged: HMAC verification, the idempotent receipt ledger, consume-after-grant, the platform-dialog presence
(`0404`), the login continuation, `GameRestart.ts`, `ProfileSession.ts`, and the `0248` ad gate.

### 4.3 The flow, end to end

```mermaid
sequenceDiagram
  actor P as Player
  participant UI as Buy surface
  participant C as PurchaseCoordinator
  participant Y as Yandex SDK
  participant S as ProfileSession
  participant PS as Profile server
  P->>UI: tap "Buy" / "Log in and buy"
  UI->>C: requestPurchase(productId, tapId)
  C->>C: latch (busy → return "busy")
  alt guest
    C->>Y: openAuthDialog() + getPlayer()  (single-flight)
    Y-->>C: authorized / not
    Note over C: deadline starts (AUTO_CONTINUE_DEADLINE_MS)
    C->>Y: refreshPaymentsAfterLogin()  (bounded by deadline)
    C->>S: ensureSession()  (bounded by deadline)
    C->>PS: reconcilePurchasesNow()  (bounded; fail/timeout → needs_tap)
  end
  C->>UI: re-read profile (via PurchaseProfileSource)
  C->>C: derivePurchaseOffer(productId)
  C->>PS: POST /v1/payments/yandex/intent {productId}
  C->>C: deadline still open? (guest path) else needs_tap
  C->>Y: payments.purchase({id, developerPayload: intentId})
  Y-->>C: {signature}
  C->>PS: POST /complete {signature} → grant (item + PAID CITIZEN) → becamePaidCitizen
  C->>Y: consumePurchase(token)  (not awaited)
  C->>UI: re-read; PURCHASE_GRANTED_EVENT; 0303 restart offer if needed
```

**Step by step (guest path; a logged-in buyer starts at step 6, with no deadline):**

1. **Tap.** A guest sees **"Log in and buy — {price}"**, which meets requirement 1.2.1. The price comes from the
   catalog, which loads for guests too (`FlashistFacade.ts:1882-1910`). Logged-in buyers see "Buy — {price}". Fires
   `UI:Tap:<surface tap id>`.
2. **Latch.** One in-flight purchase per page, for **all** products. A second request answers `busy`. This replaces
   the card-only `isPurchaseInFlight` (`CitizenshipCard.ts:1012-1056`), so a style shop and the citizenship popup can
   never open two payment windows. The **auth dialog** has its own single-flight guard in the facade (§4.1), which also
   covers callers outside the coordinator.
3. **Login (guest only).** `openYandexAuthDialog()` (`FlashistFacade.ts:2426`). It already counts as a platform
   dialog (`0404`) and re-fetches the player.
   - Cancelled or failed → state `login_cancelled`. The surface stays on "Log in and buy" with a quiet line: "Login
     didn't finish — try again". No reload (the player is still a guest).
   - Success → **the deadline starts**: `AUTO_CONTINUE_DEADLINE_MS` (proposed 15 000) from the moment the dialog closes.
     It covers steps 4–8 together. Each step below gets **at most the time left**; when the time is up, the flow stops
     at state `needs_tap` (a plain **Buy** button). Work already started keeps running in the background; the tap
     awaits it.
4. **Payments refresh (guest only).** `refreshPaymentsAfterLogin(min(5 000, time left))`. Removes the unknown "a
   payment object from guest time" (§1a). On failure or timeout, keep the old object and go on; B5 tells us whether the
   old one ever fails.
5. **Profile login + reconcile (guest only).** `ensureSession()`, bounded by the time left. A guest boot never latched
   D3, so this logs in once (`ProfileSession.ts:137-160`, trace `0391` §2a). Then `reconcilePurchasesNow(min(10 000,
   time left))`, **before** the read: a newly logged-in account may hold an unprocessed earlier purchase, and the read
   must see its grant, or we risk a second charge.
   - `ensureSession()` → `null` → `profile_unavailable` (step 7).
   - Reconcile `processed` or `none` → go on.
   - Reconcile **`failed` or `timeout` → do NOT auto-continue: `needs_tap`** (F5). If a late result arrives, the
     existing `PURCHASES_RECONCILED_EVENT` makes the card re-read, so a granted earlier purchase flips the offer to
     owned before the player taps.
   - Note: the boot reconcile pass (`PaymentsReconciliation.ts:26-41`) may run at the same time. Harmless: the server
     is idempotent by token (`Routes.ts:1179-1186`) and a second consume of the same token fails silently.
6. **Read.** `PurchaseProfileSource.reread()` (the card's existing `refreshProfile()`). Publish "checking" first, which
   fixes the gap in §1b step 3. The card stays the only reader. Bounded by the time left on the guest path.
7. **Decide.** `derivePurchaseOffer(productId, snapshot)`:
   - `buy` → continue.
   - `owned` → `already_owned`. "You already own this". No intent, no charge.
   - `cannot_verify` (a citizen whose ownership can't be read on an unconfirmed login, §5) → `cannot_verify`. "We
     couldn't confirm your account this time. Closing and reopening the game usually helps." No intent. **Never** mapped
     to `already_owned` (F10).
   - `read_failed` (no profile, the `0474` case) → `profile_unavailable`. The existing "couldn't load your profile"
     line with its **Restart game** button (`0397`). No intent.
   - still `checking` when the deadline ends → `needs_tap`.
8. **Intent.** `POST /intent`, bounded by its own 10 s (`PaymentsApiClient.ts:17`). `already_owned` (409) →
   `already_owned`. `failed` → `error` (retryable). The frame never opened, so no Started event (the existing contract,
   `CitizenshipPurchase.ts:6-9`). **Guest path: re-check the deadline right before `purchase()`.** If it has passed,
   do not open the frame → `needs_tap` (the unused intent row is harmless; the tap creates a fresh one).
9. **Pay.** `purchase()`. `Purchase:Started:<P>`; on reject → `Purchase:Abandoned:<P>` → `error`. Same code as today,
   with the product as a parameter.
10. **Grant.** `/complete` → shared grant transaction (§5). Success → `Purchase:Completed:<P>`; consume, not awaited
    (`CitizenshipPurchase.ts:89-97`).
11. **UI.** `markGranted(productId)` plus a re-read. The coordinator dispatches `PURCHASE_GRANTED_EVENT {productId}`.
    `ProductPurchase` — **the only dispatch site** — dispatches `CITIZENSHIP_GRANTED_MID_SESSION_EVENT
    {source:"purchase", productId, becamePaidCitizen}` after **every** granted purchase, for every product and every
    buyer (OD-1 refinement, owner 2026-10-24: *"as soon as the purchase is done we're find to force/guide them through
    restart"*). The popup's text and analytics come from that product's config, so a paid citizen buying an item does
    not get a popup titled "Citizenship is active!" (`en.json:114`). `becamePaidCitizen` no longer gates the popup; it
    still drives the server's inbox rule (§5) and may shape the item's wording. The existing offer rules stay: at most
    once per page, behind the citizenship kill switch, held until the start screen if a lobby is open, dropped when a
    match starts (`CitizenshipRestartOffer.ts`, `onGranted` / `onBackOnStartScreen` / `onMatchStarting`). Why every
    purchase: on the guest path the page **booted as a guest** (§8 A), and D3's own goal — *"to be sure the start
    sequence is done the right way"* (`GameRestart.ts:1-11`) — is met by the restart. The ad gate updates through the
    read (`CitizenshipCard.ts:328-334`).
12. **D3 hand-off (guest path only; OD-1 ruled option 1, ADR-125).** Applies when the flow **logged the player in** and then
    ended **without** a grant. The hand-off dispatches the existing `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT`;
    `requestGameRestart` then does exactly what it does today right after a login (reload once, never mid-match, with
    the existing fallback). **The end message is shown first** (F3):

    | End state | Hand-off |
    |---|---|
    | `already_owned`, `cannot_verify`, `error` (incl. a cancelled payment) | Show the line. Hand off when the surface closes **or** `HANDOFF_DELAY_MS` (proposed 5 000) after the line appears, whichever comes first. A **Buy** tap inside that window (for `error`) cancels the timer and re-runs from step 6; the hand-off re-arms when that run ends without a grant. |
    | `needs_tap` | **No timer** (the player is being asked to tap). Tap → continue from step 6 (the rules above then apply to its end). Surface closes or hides without a buy → hand off. |
    | `profile_unavailable` | **No automatic hand-off.** The reload is the player's own **Restart game** tap (`0397` rule). |
    | `login_cancelled` | Not logged in → nothing to hand off. |
    | `granted` | No login hand-off. The `0303` restart popup takes over (step 11): today it is the player's choice (Restart now / Later); RP-1 decides whether it stays so. |

    "Hides" covers the card leaving the start screen for a lobby or a match; the hand-off then meets
    `requestGameRestart`'s match guard (`GameRestart.ts:63-73`) and takes its fallback. Net effect: a guest who
    **doesn't** finish buying ends in the same state as today, a few seconds later.

**Login from the plain card button (not a purchase):** unchanged. It reloads at once (D3).

### 4.4 Progress states (what a surface shows)

`PurchaseFlowState` (event `PURCHASE_FLOW_STATE_EVENT`, carrying `{ productId, state }`):
`idle → logging_in → preparing → paying → granted`, or an end state from `login_cancelled`, `profile_unavailable`,
`already_owned`, `cannot_verify`, `needs_tap` (the deadline passed, or reconcile didn't finish), `error`. The surfaces
render one short line per state. `preparing` = "Getting your purchase ready…", the only thing on screen between login
and payment. New lang keys go into `en.json` and `ru.json`.

---

## 5. Interfaces and contracts (stubs in the spec only — nothing in `src/`)

```ts
// src/core/profile/PaymentsContract.ts — extended (single list stays the one place). NO analytics here.
export const PAYMENT_PRODUCT_IDS = ["citizenship" /* , item ids added by item builds */] as const;
export type PaymentProductId = (typeof PAYMENT_PRODUCT_IDS)[number];

export type ProductKind = "citizenship" | "durable_item";

/** Compile error if an id has no definition. */
export const PRODUCT_DEFINITIONS: Record<PaymentProductId, { kind: ProductKind }> = {
  citizenship: { kind: "citizenship" },
};

// PurchaseCompleteResponseSchema gains (additive; zod strips it for old clients):
//   becamePaidCitizen: z.boolean().optional()   // false = buyer was ALREADY a paid citizen
// New error body on /intent (409): { error: "already_owned" } — durable items, verified caller only (see 5.3).
```

```ts
// src/client/ProductClientConfig.ts — new (client only; may import the facade enum)
type AnalyticEvent = (typeof flashistConstants.analyticEvents)[keyof typeof flashistConstants.analyticEvents];

export interface ProductAnalytics {
  loginRequested: AnalyticEvent; loginSucceeded: AnalyticEvent; loginCancelled: AnalyticEvent;
  loginProfileFailed: AnalyticEvent; continueReady: AnalyticEvent; continueNeedsTap: AnalyticEvent;
  blockedAlreadyOwned: AnalyticEvent; blockedCannotVerify: AnalyticEvent;
  started: AnalyticEvent; completed: AnalyticEvent; abandoned: AnalyticEvent;  // citizenship: today's entries
  // Required: the popup follows every completed purchase (OD-1). `later` exists only if RP-1 keeps the Later button.
  restartPrompt: { shown: AnalyticEvent; restart: AnalyticEvent; later: AnalyticEvent };
}

export interface ProductClientConfig {
  analytics: ProductAnalytics;
  /** translateText key prefix for state lines, post-purchase line, restart-popup text (required). */
  textKeyPrefix: string;
  /** Per-item UI switch (hides UI only). null = none. Never read by coordinator/grant/reconcile/read. */
  isUiEnabled: (() => Promise<boolean>) | null;
}

/** Compile error if a product has no config. Citizenship entries point at the EXISTING enum keys. */
export const PRODUCT_CLIENT_CONFIG: Record<PaymentProductId, ProductClientConfig> = /* TODO(coder) */ {} as never;
```

```ts
// src/client/PurchaseOffer.ts — new, pure
export type PurchaseOffer =
  | { kind: "checking" }
  | { kind: "guest"; canLogIn: boolean; price: string | null } // "Log in and buy — {price}"
  | { kind: "owned" }
  | { kind: "cannot_verify" }   // ownership unknowable on this read — NOT "owned"
  | { kind: "read_failed" }
  | { kind: "no_product"; xp: number }   // catalog has no such id (xp kept: CitizenshipOffer.ts:39-40)
  | { kind: "buy"; price: string; xp: number };

export interface PurchaseProfileSnapshot {
  isRevealed: boolean;
  isChecking: boolean;
  /** null = guest */
  profile: {
    isCitizen: boolean;
    isAuthoritative: boolean;
    isVerifiedRead: boolean;
    isPaidCitizen: boolean;
    xp: number;
    /** Owned durable product ids; null = not known from this read (always null on an unverified read, OD-2). */
    entitlements: readonly PaymentProductId[] | null;
  } | null;
  paidGrantConfirmed: boolean;
  /** Product ids granted THIS page load (server-confirmed), so a stale read cannot re-offer them. */
  grantedThisPage: ReadonlySet<PaymentProductId>;
  canLogIn: boolean;
}

/** One rule for every product; deriveCitizenshipOffer() becomes a wrapper over it. */
export function derivePurchaseOffer(
  productId: PaymentProductId,
  snapshot: PurchaseProfileSnapshot,
  catalogPrice: string | null,
): PurchaseOffer {
  throw new Error("not implemented"); // TODO(coder)
}
```

**The owned rule, by kind** (this is the double-charge guard, written once):
- `citizenship`: exactly today's order (`CitizenshipOffer.ts:59-89`). A paid citizen → `owned`. An earned citizen →
  `buy` only on a verified "not paid" read. Any unknown → `owned` (fail closed, as `citizen` is today — unchanged
  behaviour for citizenship; the wrapper maps it to today's `citizen`).
- `durable_item`, in this order:
  1. granted this page → `owned`;
  2. non-authoritative read → `read_failed`;
  3. `entitlements` **known** → `owned` if listed, else `buy` (**a paid citizen may buy an item**, S4). This holds
     for every buyer type whenever the list is known (F11);
  4. `entitlements` unknown, **non-citizen** → `buy`. A real player cannot own an item without being a citizen (every
     grant sets `is_citizen`, `PaymentsRepository.ts:51-58`). ⚠️ Not true for testers: a `0425` role can set a player
     back to non-citizen while their entitlement rows stay. Accepted residual (§7);
  5. `entitlements` unknown, **citizen** → `cannot_verify` (no button, a clear line). Same posture as `0409`.

```ts
// src/client/PurchaseCoordinator.ts — new. B2 builds it; Main.ts creates ONE instance and wires the deps.
export type PurchaseFlowState =
  | "idle" | "logging_in" | "preparing" | "paying" | "granted"
  | "login_cancelled" | "profile_unavailable" | "already_owned" | "cannot_verify" | "needs_tap" | "error";

export type PurchaseRequestResult =
  | "granted" | "busy" | "login_cancelled" | "profile_unavailable"
  | "already_owned" | "cannot_verify" | "needs_tap" | "error";

export const PURCHASE_FLOW_STATE_EVENT = "geoconflict-purchase-flow-state";   // detail: { productId, state }
export const PURCHASE_GRANTED_EVENT = "geoconflict-purchase-granted";         // detail: { productId }
export const PURCHASE_OFFER_CHANGED_EVENT = "geoconflict-citizenship-offer-changed"; // SAME string as today's CITIZENSHIP_OFFER_CHANGED_EVENT

/** Implemented by CitizenshipCard — it stays the page's only profile reader. */
export interface PurchaseProfileSource {
  snapshot(): PurchaseProfileSnapshot;
  /** The card's refreshProfile(), publishing "checking" first. Resolves when the read is applied. */
  reread(): Promise<void>;
  /** Mark a server-confirmed grant so the offer flips to owned before the re-read lands. */
  markGranted(productId: PaymentProductId): void;
}

export type ReconcileNowResult = "processed" | "none" | "failed" | "timeout";

export interface PurchaseCoordinatorDeps {
  profileSource: () => PurchaseProfileSource | null;
  openAuthDialog: () => Promise<boolean>;                         // FlashistFacade.openYandexAuthDialog (single-flight)
  refreshPaymentsAfterLogin: (timeoutMs: number) => Promise<void>; // FlashistFacade (new, separate from fetchPaymentsCatalog)
  ensureSession: () => Promise<string | null>;                    // ProfileSession
  reconcileNow: (timeoutMs: number) => Promise<ReconcileNowResult>;
  runProductPurchase: (productId: PaymentProductId) => Promise<ProductPurchaseResult>;
  requestLoginRestart: () => void;                                // dispatches CITIZENSHIP_LOGIN_SUCCEEDED_EVENT (D3 hand-off)
  now: () => number;
  setTimer: (fn: () => void, ms: number) => () => void;           // returns cancel
  autoContinueDeadlineMs: number;                                 // proposed 15_000; 0 ⇒ always needs_tap
  handOffDelayMs: number;                                         // proposed 5_000
}

export interface PurchaseCoordinator {
  requestPurchase(request: { productId: PaymentProductId; tapElementId: string }): Promise<PurchaseRequestResult>;
  currentState(productId: PaymentProductId): PurchaseFlowState;
  /** A surface closed or hid (card leaving the start screen, popup closed). Triggers a pending D3 hand-off. */
  surfaceClosed(productId: PaymentProductId): void;
}

export function createPurchaseCoordinator(deps: PurchaseCoordinatorDeps): PurchaseCoordinator {
  throw new Error("not implemented"); // TODO(coder)
}
```

```ts
// src/client/ProductPurchase.ts — new (CitizenshipPurchase.ts generalized; same sequencing)
export type ProductPurchaseResult = "granted" | "already_owned" | "error";
/** intent → frame → /complete → consume (not awaited). Wraps beginPlatformDialog like today.
 *  The ONLY dispatch site of CITIZENSHIP_GRANTED_MID_SESSION_EVENT for purchases (rule: step 11). */
export async function runProductPurchase(productId: PaymentProductId): Promise<ProductPurchaseResult> {
  throw new Error("not implemented"); // TODO(coder)
}

// src/client/PaymentsApiClient.ts — changed result shapes
export type CreateIntentResult = { kind: "ok"; intentId: string } | { kind: "already_owned" } | { kind: "failed" };
export type ReconcileResult = { kind: "ok"; processedTokens: string[] } | { kind: "failed" };
```

```ts
// src/profile-server/PaymentsRepository.ts — grant registry
export interface ProductGrant {
  /** The product's OWN entitlement write, inside the shared transaction. Never touches the paid flags. */
  applyEntitlement(client: PoolClient, grant: PaidPurchaseGrant): Promise<void>;
  /** Item welcome inbox template sent after commit; null for citizenship (citizenship_paid covers it). */
  itemInboxTemplate: string | null;
}

/** Record over the id union: an id without a branch is a compile error. */
export const PRODUCT_GRANTS: Record<PaymentProductId, ProductGrant> = {
  citizenship: { applyEntitlement: async () => {}, itemInboxTemplate: null },
};

export interface GrantOutcome {
  status: "granted" | "already_processed";
  /** Fresh grants only: the buyer was NOT a paid citizen before this grant. */
  becamePaidCitizen: boolean;
}

// grantPaidPurchase(grant): Promise<GrantOutcome>, in ONE transaction:
//   1. lookup via Object.prototype.hasOwnProperty.call(PRODUCT_GRANTS, id) — miss ⇒ THROW (R2 kept for unknown strings)
//   2. INSERT processed_purchases … ON CONFLICT DO NOTHING (miss ⇒ "already_processed", touch nothing)
//   3. SELECT is_paid_citizen FROM players WHERE id = $1 FOR UPDATE  → wasPaid (no row ⇒ throw, as today)
//   4. GRANT_FLAGS_SQL — ALWAYS, for every product (Q2: full paid citizen)
//   5. lookup.applyEntitlement(client, grant)
//   6. mark intent used
// after commit (never throws, as today):
//   - citizenship product, OR !wasPaid  ⇒ "citizenship_paid" welcome (citizenship: today's behaviour unchanged)
//   - lookup.itemInboxTemplate !== null ⇒ that item's welcome
```

```sql
-- migrations/<NEXT FREE>_player_entitlements.sql — B4. 010 today (0491 takes 009). Check at build time.
create table player_entitlements (
  player_id      uuid not null references players(id) on delete cascade,
  product_id     text not null,
  purchase_token text not null,
  granted_at     timestamptz not null default now(),
  primary key (player_id, product_id)
);
-- durable_item branch: INSERT … ON CONFLICT (player_id, product_id) DO NOTHING
```

### 5.3 `/intent` already-owned refusal

- **Durable items, verified caller** (`caller.verified`, `Routes.ts:353-363`): `/intent` checks the entitlement table
  and answers `409 already_owned`. A second guard behind the client rule.
- **Durable items, unverified caller:** **no check** (OD-2, ruled private). Anyone can mint a `vfy:false` session for
  any claimed id, so a 409 there would tell a stranger "this id owns X", which under rule 2 means "this id paid". The
  client rule covers this case: a citizen on an unverified read gets `cannot_verify`; a non-citizen owns nothing (tester
  residual aside).
- **Citizenship:** unchanged (no refusal), for the same reason. The client rule stays the guard, as `0409` decided.

---

## 6. Data and state

- **New table** `player_entitlements` (B4). Citizenship keeps the `players` flags; no data migration. The tester-role
  command (`0425`) does not touch it: a tester "paid citizen" owns no items (correct), and a tester reset to
  non-citizen keeps their items (the §5 rule handles it by reading the list whenever it is known).
- **The receipt ledger** `processed_purchases` stays the source of idempotency. It is **not** the ownership source:
  it has no FK and outlives erasure (`PaymentsRepository.ts:160-165`).
- **Profile read:** only the **owner (verified) view** gains `entitlements: string[]` (OD-2, ruled private). The unverified
  view never carries it, and drops item-purchase inbox messages. The client treats a missing field as `null`.
  ⚠️ This is separate from **showing** a bought style in a match (`0486` ruling 6: shown to every player). Seeing a
  style on a name in a match does not let a stranger look up an arbitrary Yandex id; reading the profile view does.
- **Client state:** the coordinator holds the latch, the deadline, the hand-off timer and the per-product state **in
  memory** only. A reload clears it on purpose. Nothing is stored in sessionStorage in the recommended path.
- **`/reconcile` hardening (B1):** today one throwing entry makes the whole pass return 500 (`Routes.ts:1148-1188`, one
  try around the loop), so **every** pending purchase stays stuck until a later session. Isolate each entry: log it
  (token prefix only), skip it, continue; return only the tokens that succeeded. ⚠️ **This changes the live box's
  behaviour** (a partial success now returns 200 with fewer tokens), so B1 gets its own verify task.

## 7. Failure and edge cases

| Case | What happens | Why it is safe |
|---|---|---|
| **Login cancelled or failed** (`0070` lesson) | `login_cancelled` → "Login didn't finish — try again". The Buy button stays. `Purchase:Login:Cancelled:<P>`. | No intent, nothing charged. Yandex reports cancel and failure the same way (`FlashistFacade.ts:2438`), so one message covers both. `0070`'s Discord modal is not on this path. |
| **Two callers open the auth dialog** (card, coordinator, `0488` WinModal) | The facade's single-flight guard returns the same promise. | One Yandex dialog at a time, for every caller. |
| **Logged in, profile login fails or times out** (`0474`, 2–3 % of loads) | `ensureSession()` → null and latched (D3) → `profile_unavailable` → "couldn't load your profile" plus **Restart game** (`0397`). `Purchase:Login:ProfileFailed:<P>`. | `/intent` needs a session, so the flow **cannot** charge without a profile (`CitizenshipPurchase.ts:46-55`). No in-page retry (D3 kept). |
| **Logged in at boot but no profile** (`0474`, no login step) | `read_failed` → the same line plus Restart. Never a live Buy. | Today's rule already refuses a buy on a failed read (`CitizenshipOffer.ts:78-80`). |
| **Reconcile after login fails or times out** | `needs_tap`. A late result re-reads through `PURCHASES_RECONCILED_EVENT`. | The flow never auto-opens a payment window on a read that may predate an earlier grant. |
| **Slow chain after login** (signed call up to 60 s, `/intent` up to 10 s) | One deadline across steps 4–8, re-checked right before `purchase()` → `needs_tap`. | No surprise payment window long after the tap. |
| **Account switch** (`0394`) | Guest path: the account is the one `openAuthDialog` just returned, re-fetched (`FlashistFacade.ts:2436`). `ensureSession()` drops a token minted for another id (`ProfileSession.ts:144-151`). Logged-in path: unchanged. ⚠️ **Residual:** a switch made **outside** the game, between the intent and `purchase()`, would be billed to account B and granted to account A. Nothing in the signed payload names the buyer (§1a). `getYandexUniqueId()` reads the cached player object (`FlashistFacade.ts:2467-2477`), so the game cannot detect such a switch either. | Same residual as today; `0394`'s to close. This design adds no new exposure. |
| **Two tabs or two devices buy the same item at once** | Both create an intent before either grant lands; both payments go through. The second grant writes nothing new (`ON CONFLICT DO NOTHING`), but the money is taken twice. | ⚠️ **Named residual.** Same as citizenship today. The 409 only stops a second intent **after** a grant. Refunds are manual. |
| **Purchase cancelled** (frame closed) | `Purchase:Abandoned:<P>` → `error` → "Purchase not completed". Guest path → D3 hand-off after the line (§4.3 step 12). | No charge. Exactly one of Completed or Abandoned per Started. |
| **Paid, but `/complete` failed or is slow** | `error`. The purchase stays unconsumed → the next session's reconcile grants it. | Grant-before-consume (`CitizenshipPurchase.ts:89-97`). Reconcile is idempotent by token (`Routes.ts:1179-1186`). ⚠️ Known residual stays: Abandoned is logged for a real payment whose `/complete` failed (`analytics-event-reference.md`, `PURCHASE_ABANDONED_CITIZENSHIP`). |
| **Already owns the item** | Client: `owned`, no button. Server: `/intent` 409 for a verified caller. | Two guards on verified sessions; the client rule otherwise. |
| **Paid citizen buys an item** | Allowed. The grant writes the item; the paid flags are a no-op (`COALESCE`, `PaymentsRepository.ts:51-58`); `becamePaidCitizen = false` → no second `citizenship_paid` inbox message. The restart popup still shows, with the **item's** text, never "Citizenship is active!" (OD-1). | S4. |
| **Item buy that first makes the player paid** | `becamePaidCitizen = true` → `citizenship_paid` welcome **and** the item's welcome; the restart popup shows with the item's text. | Rule 2. |
| **Earned citizen on an unverified login** (inherited `0409` / ADR-116 D4 exception) | **Citizenship:** can't buy (today's rule). **Item:** can't buy either (OD-2 ruled private) → `cannot_verify` ("couldn't confirm your account, reopen the game"). | Keeps "an unverified read never reveals paid". |
| **Non-citizen on an unverified login** | `buy` (owns nothing). | A real player owning an item is a citizen. |
| **Tester reset to non-citizen who owns an item, on an unverified login** | `buy` is offered again; the server 409 does not fire (unverified). | ⚠️ Accepted residual: testers only, and Yandex test purchases are free. |
| **Unknown product id** | Wire: `PurchaseIntentRequestSchema` refuses it (zod enum). Server grant: registry miss → throw. Reconcile: entry skipped, the others continue (§6). | R2 kept. |
| **Two surfaces tap at once** | The second gets `busy`. | One latch for all products. |
| **Login lands mid-match** | Impossible from the start-screen surfaces. The D3 hand-off keeps `requestGameRestart`'s match guard (`GameRestart.ts:63-73`). | Unchanged. |
| **Payment frame refuses to open without a fresh tap** (unverified, §1a) | It rejects → Abandoned → `error`. B5 detects it. The fix is **one constant**: `autoContinueDeadlineMs = 0` → always `needs_tap`. One extra tap, no other code change. | Degrades to "one extra tap" rather than breaking. |
| **Citizenship kill switch off** (`0236`) | The card is hidden → no profile source → **no product can be bought**. Reconcile is suspended for **every** product, so a paid-but-not-granted item purchase waits until the switch is on again (nothing lost; it stays in `getPurchases()`). | Every purchase grants citizenship, so selling items with citizenship off would be wrong. Settled as a recommendation (§9). |
| **A per-item UI switch off** (e.g. styles) | That item's Buy entry is hidden. Coordinator, grant, reconcile, read: unaffected. | `0477` batch 2 answer 4: *"the backend implementations should not be affected by it"*. |
| **Catalog not ready / degraded SDK** | `no_product` or `guest{canLogIn:false}` → no button (today's rule). | Unchanged. |

## 8. Alternatives considered

- **A — continue on the same page, then hand off to D3 on a non-grant end (RECOMMENDED).** Meets the owner's "no extra
  popups or steps", built from paths that already ship: the fallback branch of `requestGameRestart` already logs a
  guest in on the same page today. Trade-off: a guest who just bought plays on a page that **booted as a guest**. Until
  they accept the `0303` restart popup (or the next load), the name box, the inbox dot and the tenure gift behave as
  for a guest. Matches and XP are correct: matches read identity on every join (`Main.ts:950-957`;
  `Transport.ts:395-450` sends the session token late). The same posture `0303` already accepted for every purchase.
- **B — keep D3's reload, then resume the purchase.** Store `{productId, at}` in sessionStorage, reload, and after boot
  open the payment window by itself (or reopen the popup with Buy, one tap). Keeps D3 unchanged. Costs: a full reload
  (seconds, unmeasured: §1b), a payment window that opens on its own after a page load (riskier for moderation and
  trust), a dependence on sessionStorage (missing in the very population D3's NoStorage branch exists for), and the
  boot catalog race. **Not chosen:** the owner ruled OD-1 option 1 (ADR-125).
- **C — today's behaviour for every item** (reload, then the player finds Buy again). Zero build. Fails rule 4 and
  loses guests, who are 58.2 % of match starts (`0405`).
- **Server-side "already owned" for citizenship, or for unverified callers:** rejected. It would leak paid status
  (ADR-116 D4; §5.3).
- **Each branch writes the paid flags itself** (the brief's literal wording): rejected in favour of the shared step.
  Same outcome; no branch can forget it.
- **Analytics built from the product definition:** rejected (F9). It breaks the enum-only rule and would make
  `src/core` depend on the client.

**ADR recorded:** [ADR-125](../decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md)
(2026-10-24) — "Log in and buy" skips the login reload and continues on the same page; the D3 reload moves to a
non-grant end; every completed purchase ends in the restart prompt. It amends D3 (`0273`, widened by `0397` Q3) and
meets **B3's entry gate**. OD-2 was ruled private, so ADR-116 Decision 4 needs no amendment.

## 9. Owner decisions

### 9.1 Owner rulings (2026-10-24)

All four were answered **2026-10-24, live via `AskUserQuestion` in the lead's Claude Code session, relayed verbatim by
`fkit-lead`** (Sprint 9 ship loop). Quoted exactly, typos kept.

- **OD-1 — after a guest logs in to buy, may the game skip the reload?** The owner typed:
  > *"I think we can skip it, but after buying we would need to show something like "reload to start using the new
  > features" or something like that. I even think we might already have something like that in the game. The point
  > is that we're trying not to interrupt the buy-flow of the user, but as soon as the purchase is done we're find to
  > force/guide them through restart."*

  **Read as:** option 1 (skip the reload, only for "Log in and buy"; Alternative A, §8), **plus** a refinement: after
  **any** completed purchase, the game guides the player through a restart. The thing he remembers exists: the `0303`
  "restart to apply" popup (`CitizenshipRestartOffer.ts`, `CitizenshipRestartModal.ts`; `en.json`
  `citizenship_restart_modal`: *"Restart the game to finish applying it. If you tap "Later", it will apply after your
  next match or the next time you open the game."*). **Applied:** the popup now follows every completed purchase
  (§4.3 step 11), not only when the buyer became paid or the item opted in (the R1 rule, dropped). Recorded as
  **ADR-125**. Meets B3's entry gate.
- **OD-2 — who may see which items a player owns?** → **"Private (Recommended)"**. Only a confirmed (verified) login of
  that player; the same rule as paid status. The R1 default (§5.3, §6) stands; ADR-116 Decision 4 unchanged. Meets
  B4's entry gate.
- **OD-3 — what do the item builds (`0486`, later `0010`/`0011`) wait on?** → **"Full flow, B3 + B4 (Recommended)"**.
  Replaces the wording of `0477` batch 2 answer 1 (*"Sprint 9, builds wait (Recommended)"*, which said "wait on 0484").
- **OD-4 — where do B1–B5 (and the verify tasks) go?** The owner typed: *"All should move to the current sprint"*.
  Sprint 9 is the only active sprint, so **B1, B1v, B2, B3, B4, B4v and B5 all go on Sprint 9.** This overrides, for
  these tasks only, the usual rule that a verify task goes at the top of the **next** sprint.

**RP-1 — how strong is the post-purchase restart prompt? Ruled 2026-10-24: Guide (keep "Later").** Asked live via
`AskUserQuestion` in the lead's Claude Code session, relayed verbatim by `fkit-lead`. Question: *"After a purchase, how
strongly should the game push the restart?"* → **"Guide: keep 'Later' (Recommended)"**. Option text: *"Today's popup:
Restart now / Later. Later loses nothing; it applies after the next match or reopen."* **Applied:** the `0303` popup
keeps both buttons, "Restart now" and "Later"; the `Later` analytics event stays; citizenship's popup does not change
visibly in B2. Recorded on ADR-125 (dated note). The options as they were put (kept for the record):

The owner wrote *"force/guide"*. Those are two different things, and his words didn't choose between them:
- **Guide (recommended): keep today's popup as is** — "Restart now" and "Later". Nothing closes it but those two
  buttons (`CitizenshipRestartModal.ts`: no outside click, no Esc). "Later" is safe: everything catches up after the
  next match (leaving a match reloads the page) or the next open. What a player who taps Later lives with until then,
  on a page that booted as a guest: the name box, the inbox dot and the tenure gift still act as for a guest; matches
  and XP are already correct (§8 A).
- **Force: a required restart** — the popup keeps only "Restart now" (no Later). Every buyer reloads straight after
  paying (a few seconds; never mid-match, since buying happens on the start screen and the offer already waits for
  it). Cost: one more forced wait right after paying; the popup and its analytics change (`Later` event retired);
  citizenship's popup changes too, a visible change in B2.

Recommendation: **guide**. It is the popup the owner picked himself in `0303` (Q1, 2026-09-28: *"'Restart to apply'
popup"*), "Later" loses nothing for good, and it already meets *"guide them through restart"*. **The owner chose guide** (above). RP-1 no longer gates any part of
B2.

### 9.2 Settled in this design — both confirmed by the owner's spec approval (2026-10-24)

Both were confirmed by the approval quoted in the header: *"also confirms keeping the restart popup and 'switch off
= no sales'."*

- **OQ-2 → keep the `0303` "restart to apply" popup. Settled by the owner's OD-1 answer** (*"after buying we would need
  to show something like "reload to start using the new features""*), which asks for exactly this popup and widens it
  to every purchase. It shows **after** the payment, so it is not between login and purchase, and does not break
  rule 4. What changes: **per-product wording** (an item buy says what was bought; citizenship keeps *"Citizenship is
  active!"*) and **every** completed purchase shows it. Its strength is RP-1 (§9.1): guide, "Later" kept.
  **Confirmed by the spec approval, 2026-10-24.**
- **OQ-3 → with the citizenship kill switch off, nothing can be bought and nothing is reconciled.** Every purchase
  grants citizenship, so selling an item with citizenship switched off would contradict rule 2. Consequence, in plain
  words: a player who paid for any item but whose grant never landed waits until the switch is back on (nothing is
  lost). This is separate from an item's own UI switch, which hides only that item's screens and never stops a grant.
  Why not asked: it extends the owner-accepted `0236` consequence to items with no new trade-off; each item build's
  plan approval re-states it. **Confirmed by the spec approval, 2026-10-24** (*"'switch off = no sales'"*).

## 10. Testing strategy

- **Pure rule** `derivePurchaseOffer`: the existing `CitizenshipOffer` cases unchanged through the wrapper, plus an
  item matrix across buyer type (guest, non-citizen, earned citizen verified and unverified, paid citizen), ownership
  (owned, not owned, unknown), catalog (ready, missing). Must include: citizen + unknown list → `cannot_verify` (never
  `owned`); non-citizen + known list containing the item → `owned` (tester case).
- **Coordinator** with fake deps and a fake clock (no DOM): every row of §7. Especially: guest buy → granted with no
  `requestLoginRestart`; deadline passes during `ensureSession`, during reconcile, and **after `/intent` but before
  `purchase()`** → `needs_tap` and no `purchase()` call; reconcile `failed`/`timeout` → `needs_tap`; `ensureSession`
  null → `profile_unavailable`, no intent; `error` → hand-off after `handOffDelayMs`, or at once on `surfaceClosed`;
  a Buy tap inside the delay cancels the hand-off; `needs_tap` → no timer, hand-off only on `surfaceClosed`;
  `profile_unavailable` → never a hand-off; latch → `busy`.
- **`ProductPurchase`**: `CitizenshipPurchase.test.ts` passes unchanged (same event strings); the mid-session event is
  dispatched **exactly once** per grant, for **every** product, **including** `becamePaidCitizen === false` (OD-1), and
  carries `productId` so the popup uses that product's text and events. Never on `already_owned` or `error`.
- **Restart offer** (`CitizenshipRestartOffer` tests): an item grant shows the item's popup, not "Citizenship is
  active!"; once per page across products; kill switch, lobby-pending and match-drop rules unchanged; the RP-1 outcome
  (Later kept, or Restart only).
- **`PaymentsApiClient.test.ts`**: 409 → `already_owned`; other non-200 → `failed`; reconcile result enum.
- **Facade**: `openYandexAuthDialog` single-flight (two calls → one SDK call); `refreshPaymentsAfterLogin` failure
  keeps the old object and the `ready` status.
- **`src/core` rule:** `PlayerProfile.ts` schema tests for `entitlements` (present on the owner view, absent on the
  unverified schema).
- **Server, table-driven over `PAYMENT_PRODUCT_IDS`**: each product → receipt + `is_paid_citizen` + its entitlement;
  `becamePaidCitizen` true then false on a second product; idempotent re-grant; an unknown string → throws; a
  compile-time check that `PRODUCT_GRANTS` covers the union. `/reconcile` with one failing entry still grants the
  others. `PublicProjection` tests: no `entitlements`, no item inbox message on the unverified view.
- **B4 standalone (no real item id yet).** The durable branch is a factory, `durableItemGrant()`, unit-tested directly
  and run against real Postgres (`npm run test:integration`) with a test-only product string passed to the repository
  — **not** added to `PAYMENT_PRODUCT_IDS`. The `/intent` 409 decision is a pure function
  `intentRefusal(kind, isOwned, callerVerified)`, unit-tested over a durable kind. ⚠️ The **route** path of the 409 is
  first exercised end to end by the first item build, when a real id exists. Named, accepted.
- **Harness caveats:** run full tests through `npm test` (project lock; `maxWorkers:1`). The supertest flake rule
  applies to the route suites (CLAUDE.md).
- **Live** — see the verify tasks in §11.

## 11. Proposed build split (for the producer to file with `/fkit-task-brief`)

Board placement (**OD-4**, ruled): **all seven tasks on Sprint 9**, the only active sprint. What the item builds wait
on (**OD-3**, ruled): **B3 + B4**.

| # | Task | Ships | Depends on | Entry gate |
|---|---|---|---|---|
| **B1** | Server: `PRODUCT_GRANTS` registry with the paid flags in the shared step (citizenship only); `becamePaidCitizen` on `/complete`; `/reconcile` per-entry isolation (**a live behaviour change**); table-driven grant tests. | profile-box deploy | 0484 | spec approved |
| **B1v** | Verify B1 live: a test purchase of citizenship still grants and is consumed; `/complete` carries `becamePaidCitizen`; a normal reconcile still grants a stray; box logs show no reconcile 500s. | — | B1 | B1 deployed |
| **B2** | Client: `PurchaseOffer` (incl. `cannot_verify`, `xp`), `ProductPurchase` (single restart-offer dispatch, after **every** grant), `ProductClientConfig`, `PurchaseCoordinator` (logged-in path, global latch), wired in `Main.ts`; facade single-flight auth dialog; `PaymentsApiClient` result enums + tests; `PURCHASE_GRANTED_EVENT`; per-product restart popup, keeping "Restart now" / "Later" (RP-1 = guide, ruled 2026-10-24). No visible change for citizenship. Tolerates a box without `becamePaidCitizen`. | game deploy | 0484 | spec approved — **met** (2026-10-24); RP-1 ruled — **met** (guide), so the restart-popup part no longer waits |
| **B3** | Client: guest → login → continue (§4.3 steps 3–8, 12), the deadline, `refreshPaymentsAfterLogin`, `reconcilePurchasesNow`, progress states and strings (en+ru), "Log in and buy" label, "checking" during the read, analytics. Applied to citizenship first. | game deploy | **B2 (sequential)** | OD-1 ruled + ADR recorded — **met** (ADR-125) |
| **B4** | Durable items base, standalone: migration (`<next free>`, 010 today), `durable_item` branch factory, `becamePaidCitizen` inbox rule, `entitlements` on the owner view (`PlayerProfile.ts` + tests, `PublicProjection`, `PlayerProfileView` parse, card snapshot), item inbox messages hidden on the unverified view, `/intent` 409 for verified callers. Tested as in §10. ⚠️ Deploy after `0491`'s migration `009`. | profile-box deploy + game deploy (client parse) | **B1** | OD-2 ruled — **met** (private) |
| **B4v** | Verify B4 live: the migration applied; a verified profile read carries `entitlements: []`; an unverified read carries none; a citizenship test purchase still grants. | — | B4 | B4 deployed |
| **B5** | Verify B3 live (owner, inside Yandex, test purchase list): the §1a unverified items; a guest's "Log in and buy" opens the payment window with no second tap; the grant lands on the account that just logged in; **the restart popup appears after the purchase** (as RP-1 ruled) and a restart from it boots logged in; cancel → message, then one reload; the 15 s deadline holds (measure the real login-to-payment time). | — | B3 | B3 deployed |

Order: **B2 → B3** sequential; **B1 → B4**; B1 and B2 can run in parallel. Verify tasks stay **separate tasks**, each
gated on its build's deploy, but per **OD-4** they are filed **on Sprint 9 now**, not at the top of the next sprint
(owner override for these tasks only).

**Knock-ons for the producer** (from OD-3 and OD-4; the producer owns the briefs and boards):
- `0486` (and later `0010`/`0011`): depends on **B3 + B4**, replacing "wait on 0484".
- Sprint 9 gains seven rows. Three of them ship by deploy (B1, B4 to the profile box; B2, B3, B4 to the game), and
  three verify tasks can only close after those deploys land. If a deploy misses the sprint, its verify task cannot
  close in Sprint 9 either; the producer handles that roll-over, not this spec.
- Profile-box deploy order: `0491` (migration `009`) before B4 (`010`).

**Each item build** (`0486`, later `0010`/`0011`) follows §4.2 and its own verify checks **"item granted AND paid
citizen"** and **"restart popup shown with the item's text"**.

## 12. Analytics (proposed; the build adds them to the enum and to `analytics-event-reference.md`)

**Every string is a `flashistConstants.analyticEvents` entry**, referenced from `PRODUCT_CLIENT_CONFIG` (§5). Never
built from the product id. `<P>` below is a naming pattern for the people adding enum entries (one per product
**family**, e.g. `Citizenship`, `NicknameStyle`, to keep the event count low). All have at most 5 parts.

| Event | When |
|---|---|
| `UI:Tap:<SurfaceTapId>` | existing pattern, one id per Buy surface (e.g. existing `PurchaseCitizenshipExplainer`) |
| `Purchase:Login:Requested:<P>` | guest tapped "Log in and buy"; auth dialog about to open |
| `Purchase:Login:Succeeded:<P>` | auth dialog reported success |
| `Purchase:Login:Cancelled:<P>` | auth dialog closed or failed |
| `Purchase:Login:ProfileFailed:<P>` | logged in to Yandex, but `ensureSession()` came back null |
| `Purchase:Continue:Ready:<P>` | after login, the offer said `buy` inside the deadline; value = ms from dialog close |
| `Purchase:Continue:NeedsTap:<P>` | deadline passed, or reconcile failed/timed out → plain Buy shown |
| `Purchase:Blocked:AlreadyOwned:<P>` | owned (client rule or server 409) |
| `Purchase:Blocked:CannotVerify:<P>` | citizen whose ownership can't be read on an unconfirmed login |
| `Purchase:Started:<P>` / `Purchase:Completed:<P>` / `Purchase:Abandoned:<P>` | existing contract. **The citizenship strings are unchanged.** |
| `Purchase:RestartPrompt:Shown\|Restart\|Later:<P>` | the `0303` popup after **every** **item** buy (`Later` only if RP-1 keeps the button). A citizenship buy keeps `Citizenship:RestartPrompt:*` (`FlashistFacade.ts:204-206`). An item buy that made the player paid also uses the item's events, so item buys are never counted as citizenship prompts. |

The existing `Profile:Login:Restart:*` events still fire from `requestGameRestart` on the D3 hand-off. Funnel:
`Login:Requested → Login:Succeeded → Continue:Ready → Started → Completed`.

## 13. Reuse map

| Reused as is | Changed | New |
|---|---|---|
| HMAC verify, the receipt ledger, `/complete` logic (bar one response field), `PlatformDialogPresence.ts`, `GameRestart.ts`, `ProfileSession.ts`, `0248` ad gate, `0397` Restart button | `PaymentsApiClient.ts` + its test (result enums), `CitizenshipOffer.ts` (wrapper), `CitizenshipPurchase.ts` (delegates), `CitizenshipCard.ts` (profile source, login mode, latch moves out), `CitizenshipExplainerModal.ts`, `CitizenshipRestartOffer.ts` + modal (per-product text/events), `PaymentsReconciliation.ts` (+now), `FlashistFacade.ts` (single-flight auth, payments refresh), `PaymentsRepository.ts` (registry), `Routes.ts` (409, reconcile isolation, `becamePaidCitizen`), `PaymentsContract.ts` (definitions), `PlayerProfile.ts`, `PublicProjection.ts`, `PlayerProfileView.ts`, `Main.ts` (wiring) | `PurchaseOffer.ts`, `ProductPurchase.ts`, `PurchaseCoordinator.ts`, `ProductClientConfig.ts`, entitlements migration, lang keys, enum entries |

## 14. Impact and risks

- **D3 amendment** (OD-1). Ruled by the owner and recorded as ADR-125; no longer silent.
- **Privacy of ownership** (OD-2, ruled private). Under rule 2, item ownership is paid status. ADR-116 D4 stays intact.
- **Partial-guest page** after an in-page purchase: the restart popup now follows every purchase (OD-1), so this lasts
  only until the player restarts — or, if RP-1 keeps "Later", until the next match or open (§8 A, §9.1).
- **Unverified platform behaviour** (the payment window without a fresh tap, the guest-era payment object). Contained:
  the payments refresh, and the one-constant fallback to `needs_tap`.
- **Latency between login and payment** is unmeasured. The deadline caps the surprise; B5 measures it.
- **Double charge across two tabs/devices:** named residual, manual refunds (§7).
- **Profile-box deploy ordering:** B4's migration must follow `0491`'s `009`.
- **Security:** no new trust surface. `/intent` stays Bearer-only; the grant stays bound to the signed payload; the 409
  answers only verified callers; `becamePaidCitizen` reaches only the holder of a valid signed purchase (the buyer).
- **Debt:** the card stays the profile reader. A separate profile store would be cleaner but is out of scope. Note it
  if a third surface type appears.

## 15. Open questions

### 15.1 For the owner

None open. OD-1 to OD-4 and RP-1 (guide, keep "Later"): ruled 2026-10-24 (§9.1). Spec approved 2026-10-24,
confirming OQ-2 and OQ-3 (§9.2).

### 15.2 Settled in the build or in B5

1. `AUTO_CONTINUE_DEADLINE_MS`: 15 s is a proposal; set it from B5's measured login-to-payment time.
2. `HANDOFF_DELAY_MS`: 5 s is a proposal; B3 tunes it against how long the end lines take to read.
3. Which existing hook marks the card "hidden" for `surfaceClosed` (the restart offer's `isAwayFromStartScreen` /
   `onMatchStarting` seams, `CitizenshipRestartOffer.ts`, are candidates). B3's plan names it.
4. Should `Purchase:Abandoned` be split from a "paid but `/complete` failed" outcome? An existing residual, not new.
5. A `consumable` kind (coins): designed only if `0480` comes off hold.
6. Each item's texts (restart-popup text included) and UI switch: that item build's plan (§4.2).

## 16. Review response (revision 1)

All findings were checked against the code or the recorded rulings this turn. **None rejected outright**; one is
accepted with a different placement (F15), one is accepted as an owner question rather than applied (F1).

| Finding | Verdict | What changed |
|---|---|---|
| F1 ownership leaks paid status | **Accepted → OD-2.** Confirmed: `PublicProjection.ts:3-12,55-62`; every grant sets paid (`PaymentsRepository.ts:51-58`). | Default is private: `entitlements` on the verified owner view only; 409 only for `caller.verified`; item inbox messages hidden on the unverified view (an extra leak the review didn't name). §3, §5.3, §6, §7. |
| F2 migration `009` clash | Accepted. Confirmed in `0491` plan line 130. | "Next free number at build time, 010 today"; deploy after `0491`. |
| F3 hand-off wipes the message | Accepted. | §4.3 step 12 table: line first, hand off on surface close or after `HANDOFF_DELAY_MS`. OD-1 option 1 text updated. |
| F4 `needs_tap` and the window | Accepted. | One deadline across steps 4–8, every step bounded, re-check before `purchase()`, timeout on step 4; `needs_tap` has no timer and hands off only on surface close. |
| F5 reconcile failure | Accepted. | Fail/timeout → `needs_tap`; late result via `PURCHASES_RECONCILED_EVENT`; double reconcile noted harmless. |
| F6 `PaymentsApiClient` not reused as is | Accepted. Confirmed `:78-80`. | Listed as changed with its test, result enums in §5, in B2. |
| F7 wrong popup for a paid citizen | Accepted. Confirmed `en.json:114`, `CitizenshipPurchase.ts:104`. | One dispatch site (`ProductPurchase`), gated on `becamePaidCitizen` (from the server) or an item opt-in; per-product text. **R2:** the gate is dropped by the OD-1 ruling (popup after every purchase); the single dispatch site and per-product text stay. |
| F8 no owner for client `entitlements`; `xp` missing | Accepted. | B4 owns `PlayerProfile.ts` (with tests), `PlayerProfileView` parse, card snapshot; `xp` added to snapshot and offers. |
| F9 analytics built inline | Accepted. | `PaymentsContract` analytics-free; client `PRODUCT_CLIENT_CONFIG` points at enum entries. |
| F10 `cannot_verify` | Accepted. | New offer kind, flow state, event and line. |
| F11 tester non-citizen owns items | Accepted. Confirmed `TesterRoles.ts` roles. | Rule uses the list whenever known; tester residual named. |
| F12 "re-checks id" claim | Accepted. Confirmed cached player object, `FlashistFacade.ts:2467-2477`. | Claim dropped; residual stays with `0394`. |
| F13 two-tab double charge | Accepted. | Named residual row in §7 and §14. |
| F14 `Object.hasOwn`; inbox for first-paid item buy | Accepted. Confirmed `tsconfig.json:5`, `TesterRoles.ts:119`. | `hasOwnProperty.call`; transaction reads `is_paid_citizen FOR UPDATE`; inbox rule in §5. |
| F15 coordinator wiring and auth latch | **Accepted in part — different placement.** | B2 builds the coordinator, `Main.ts` wires it. The auth-dialog latch goes **in the facade's `openYandexAuthDialog`**, not the coordinator: `0488`'s WinModal calls the facade directly and would bypass a coordinator-owned latch, so only the facade covers every caller. `refreshPaymentsAfterLogin` is a separate method, not the memoized `fetchPaymentsCatalog`. |
| Split: B2 → B3 sequential; B4 → B1 | Accepted. | §11 order line. |
| P1 wait changed without asking | Accepted. | OD-3, with the OD-1-option-3 fallback (B2 + B4). |
| P2 OD-1 too optimistic | Accepted. | "Expected; proven live in B5; one extra tap if Yandex needs it"; plain cost; when a non-buyer reloads. |
| P3 coins reopened | Accepted. Confirmed `0477` batch 1 answer 2. | Removed from the owner list; §3 states it is settled; only spending stays with `0480`. |
| P4 inherited `0409` exception | Accepted. | §7 row, outcome tied to OD-2. |
| P6 checklist gaps | Accepted. | §4.2 items 2, 5, 8 and the "UI switch hides UI only" rule; `Citizenship:RestartPrompt:*` no longer used for item buys (§12). |
| P7 OQ-2 framing | Accepted. Confirmed `0303` worklog line 11. | §9.2 confirm, "keep it", per-product wording. |
| P8 OQ-3 framing | Accepted. | §9.2: also stops reconcile for every item; the UI switch is separate. |
| P9a verify tasks for box deploys | Accepted. | B1v, B4v; B1 described as a live behaviour change. |
| P9b B4 standalone + test | Accepted. | Factory + pure refusal function + integration test; route path residual named. |
| P9c B3 gate | Accepted. | "OD-1 ruled + ADR recorded". |
| P9d placement | Accepted. Confirmed: `ai-agents/sprints/` has no Sprint 10 board. | OD-4. |
| P9e item verify | Accepted. | §4.2 item 8; §11 closing line. |
| P10 split §15 | Accepted. | §15.1 / §15.2. |

### Revision 2 changes (owner rulings, 2026-10-24)

| Item | What changed |
|---|---|
| OD-1 | Ruled option 1 + refinement. Restart popup after **every** completed purchase (§0, S5, §4.1, §4.2 item 5, §4.3 steps 11–12, §5 `ProductClientConfig`, §7, §10, §11 B2/B5, §14). `restartOfferWhenAlreadyPaid` removed. ADR-125 recorded; §8 Alternative B marked not chosen. |
| RP-1 | **New, open.** Guide vs force, from *"force/guide"* (§9.1). Gates B2's restart-popup part. |
| OD-2 | Ruled private. Conditional wording removed (§7). |
| OD-3 | Ruled B3 + B4 (§9.1, §11 knock-ons). |
| OD-4 | Ruled Sprint 9 for all seven tasks; verify-in-next-sprint rule overridden for these (§11). |
| Date fix | `0303` Q1 is dated **2026-09-28** (its worklog, *Round 1*). R1 said 2026-09-26: wrong. |

---

**Written:** this file and ADR-125. **Wiki:** once the owner approves, `fkit-wiki` should ingest this spec and
ADR-125.
