# Design spec — the shared purchase flow (guest logs in, then goes straight into the purchase)

**Task:** [`0484`](../../tasks/backlog/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md)
**Author:** fkit-architect, spawned as a consult by `fkit-lead` (Sprint 9 ship loop). **No owner channel.**
**Date:** 2026-10-24
**Status:** DRAFT. Next: producer review, coder review, then owner approval (brief, *Review and approval*).
**Writes:** this file only. No source files, no stubs in `src/`, no wiki edits, no commits.

> ⚠️ **One owner decision is built into this design. It must be ruled before build task B3 starts.** The
> recommended flow continues into the purchase **without a page reload**. Today's owner ruling **D3** (task `0273`,
> 2026-09-16) says a login from the guest card **reloads the page**. This spec asks for a **narrow exception** to D3
> for logins that start from a Buy tap. See §9, decision **OD-1**. If the owner says no, use Alternative B (§8).

---

## 0. In plain words

- Every paid item uses one flow. A guest taps **"Log in and buy"**. The Yandex login opens. After it, the game keeps
  going on the same page: it logs in to our profile server, reads the player's profile, checks they don't already own
  the item, and opens the Yandex payment window **without another tap**.
- After the payment, our server grants the item **and** makes the buyer a full paid citizen, in one step. The card and
  popup update at once, without a reload. Then the existing "restart to apply" popup (`0303`) appears, as it does
  after every purchase today.
- If anything goes wrong (login cancelled, our login fails, the profile doesn't load, the item is already owned), the
  player gets a clear message. No silent dead end.
- A new item plugs in by adding: its catalog id, one server grant branch, its "already owned?" rule, and a Buy
  button that calls the shared flow.

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
| Inside the Yandex iframe, a browser popup blocker cannot block a `purchase()` call made after `await`s (it is a Yandex overlay, not `window.open`). | ❓ **UNVERIFIED** (an inference) | — needs the live check in the verify task |

**What the platform forces at the least:** one player tap to start the login (requirement 1.2.1). The design gives
exactly that one tap. **What still needs a live test** (in the verify task, §11, B5): the payment window opens after
login with no second tap; the purchase is billed to and granted to the account that just logged in.

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

**Success criteria:**
- S1. A guest's purchase takes **one tap from the game** (Log in and buy) plus Yandex's own windows (login, payment).
  Nothing of ours sits between them. A short status line is allowed.
- S2. Every product's grant also sets paid citizenship. This is enforced **structurally** (the shared code does it), not
  left to each branch to remember.
- S3. Unknown products are still refused, by the type system and at runtime (`0019` R2).
- S4. No double charge for something already owned. A paid citizen **can** buy an item.
- S5. The UI updates without a reload after the grant. The existing `0303` restart offer stays.
- S6. Every failure ends in a visible state the player can act on. No silent dead end (the lesson of `0070`).
- S7. Funnel analytics cover each step, per product.

## 3. Constraints and scope

**Hard constraints (existing decisions this must fit):**
- `0019` R2 guard (owner, 2026-08-14 *"guard now"*): `grantPaidPurchase` throws for any product but citizenship
  (`src/profile-server/PaymentsRepository.ts:132-139`).
- Grant only after an HMAC-verified `/complete` or `/reconcile`. Consume only after the grant
  (`src/client/CitizenshipPurchase.ts`; `Routes.ts:1040-1121`). Reconcile runs on every session start (Yandex
  moderation, `sprint4-yandex-payments-findings.md`).
- ADR-103 / `0273` S4: `/intent` names its caller by the Bearer session. The grant is bound to the signed payload
  through `developerPayload` → intent row (`src/core/profile/PaymentsContract.ts:5-17`).
- ADR-116 Decision 4 / `0409`: an **unverified** read can never say "paid". A citizen may be offered citizenship only
  on a **verified** "not paid" read (`src/client/CitizenshipOffer.ts:14-17`).
- D3 (`0273`): a **failed** profile login is final for the page load (`ProfileSession.ts:28-33`). No in-page login
  retry. ⚠️ This spec keeps that part unchanged. OD-1 touches only the **reload after a successful Yandex login**.
- The card is the page's only profile reader (`0302`, `0321`; `CitizenshipCard.ts:357-397`).
- Kill switch `0236`: with the citizenship surfaces off, the card is hidden and reconciliation does nothing
  (`PaymentsReconciliation.ts:51-63`).
- Analytics naming: `Category:Action[:Value]`, PascalCase, at most 5 colon parts (GameAnalytics limit;
  `analytics-event-reference.md`). Strings come from the enum only.
- Every visible string goes through `translateText`, in `en.json` and `ru.json`. New HTML elements go in both
  templates.

**In scope:** the client flow, the client and server contracts, the grant registry, a generic entitlement store for
items you buy once, the analytics, the failure handling, and the build split.

**Out of scope:** any specific item's rendering or shop UI (`0486` and others). Prices. Consumables and coins (`0480`
is on hold, and whether a coin purchase counts as "a purchase" under Q2 is open). Packs (`0483`; a pack is one more
product id under this design). The account-switch detector itself (`0394`). The fix for the 2–3 % login timeouts
(`0474`). The Discord token-login modal (`0070`).

---

## 4. Proposed design

### 4.1 Components

```
 ┌────────────── any Buy surface (card, explainer popup, future style shop …) ──────────────┐
 │ renders derivePurchaseOffer(product, …) ; on tap → PurchaseCoordinator.requestPurchase()  │
 └───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                             ▼
 ┌───────────────────────── PurchaseCoordinator (NEW, client, one per page) ────────────────┐
 │ one in-flight latch for ALL products · guest→login→continue · progress events            │
 │   uses: PurchaseProfileSource (implemented by CitizenshipCard — still the only reader)   │
 │         FlashistFacade (auth dialog, payments re-init) · PaymentsReconciliation (now)    │
 │         runProductPurchase() (generalized CitizenshipPurchase.ts)                         │
 └───────────────┬──────────────────────────────────────────────┬───────────────────────────┘
                 ▼                                              ▼
   ProfileSession.ensureSession()                  PaymentsApiClient: /intent /complete /reconcile
   (unchanged; a guest boot never latched)                         │
                                                                   ▼
                              profile server  Routes.ts  ──►  PaymentsRepository.grantPaidPurchase
                                                               └─ PRODUCT_GRANTS registry (NEW)
                                                                  shared: receipt + PAID CITIZEN flags
                                                                  per product: its own entitlement write
```

| Component | New / changed | Responsibility |
|---|---|---|
| `src/core/profile/PaymentsContract.ts` | changed | `PAYMENT_PRODUCT_IDS` stays the single list (`:22`). Adds a `PRODUCT_DEFINITIONS` table: kind (`citizenship` \| `durable_item`) and analytics name. Shared by client and server. |
| `src/client/PurchaseOffer.ts` | **new**; generalizes `CitizenshipOffer.ts` | A pure rule: what may be offered for **this** product now. `deriveCitizenshipOffer` becomes a thin wrapper, so the existing tests stay as the spec. |
| `src/client/ProductPurchase.ts` | **new**; generalizes `CitizenshipPurchase.ts` | intent → frame → `/complete` → consume, for any product. The per-product analytics are built from the definition. `runCitizenshipPurchase()` delegates to it, and its event strings do not change. |
| `src/client/PurchaseCoordinator.ts` | **new** | The shared flow: the latch, guest → login → continue, reconcile-then-read, the owned check, progress states, the D3 hand-off on a non-granted end. |
| `CitizenshipCard.ts` | changed | Implements `PurchaseProfileSource` (snapshot + re-read). Its login gains a "for purchase" mode that does **not** dispatch `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` on its own (§4.3). `buyCitizenship` → coordinator. |
| `CitizenshipExplainerModal.ts` | changed | Buy and Log in go through the coordinator. Shows the progress line. |
| `PaymentsReconciliation.ts` | changed | Adds `reconcilePurchasesNow()`, which ignores the once-per-session latch (`:26-41`). Used after an in-page login. |
| `FlashistFacade.ts` | changed | Adds `refreshPaymentsAfterLogin()`, which re-runs `getPayments({signed:true})` and the catalog. The old object stays until the new one is ready. |
| `PaymentsRepository.ts` | changed | `PRODUCT_GRANTS` registry. The shared transaction always writes the paid-citizen flags. |
| `Routes.ts` (payments) | changed | `/intent` refuses an already-owned **durable item** with 409 `already_owned`. `/reconcile` isolates each entry's failure (§6). |
| migration `009_player_entitlements.sql` | **new** (with the first item) | Generic ownership for durable items. |
| Profile read (owner and public view) | changed (with the first item) | Carries the `entitlements` owned by the player (§5). |

### 4.2 How an item build plugs in (the checklist each build follows)

A new product supplies **exactly** these, and reuses everything else:
1. **A catalog id:** one string added to `PAYMENT_PRODUCT_IDS`, plus its `PRODUCT_DEFINITIONS` entry (kind, analytics
   name). The owner also creates it in the Yandex console with its price.
2. **A grant branch:** one `PRODUCT_GRANTS[id]` entry. The registry's type is
   `Record<PaymentProductId, ProductGrant>`, so adding an id **without** a branch **does not compile**. The branch
   writes only the product's own entitlement. Paid citizenship is written by the shared code (S2).
3. **An ownership rule:** for `durable_item`, the generic `player_entitlements` row (nothing to write). A product with
   special needs supplies its own `isOwned(snapshot)`.
4. **A UI entry point:** a button that renders `derivePurchaseOffer(productId, …)` and calls
   `PurchaseCoordinator.requestPurchase({ productId, tapElementId })`. It listens to `PURCHASE_OFFER_CHANGED_EVENT`
   and `PURCHASE_GRANTED_EVENT`.
5. **Tests:** add the id to the table-driven grant test (§10). It then proves "grants the item **and** paid
   citizenship" with no new test code.
6. **Analytics:** add a row per new tap id to `analytics-event-reference.md`. The `Purchase:*:<Product>` events come
   from the definition.

Reused unchanged: intent / complete / reconcile, HMAC verification, the idempotent receipt ledger, consume-after-grant,
the platform-dialog presence (`0404`), the coordinator, the login continuation, the `0303` restart offer, and the
`0248` ad gate.

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
    C->>Y: openAuthDialog() + getPlayer()
    Y-->>C: authorized / not
    C->>Y: refreshPaymentsAfterLogin()
    C->>S: ensureSession()  (fresh signed call, POST /v1/login)
    C->>PS: reconcilePurchasesNow()  (bounded)
  end
  C->>UI: re-read profile (via PurchaseProfileSource)
  C->>C: derivePurchaseOffer(productId) — owned? read failed? verified?
  C->>PS: POST /v1/payments/yandex/intent {productId}
  C->>Y: payments.purchase({id, developerPayload: intentId})
  Y-->>C: {signature}
  C->>PS: POST /complete {signature} → grant (item + PAID CITIZEN)
  C->>Y: consumePurchase(token)  (not awaited)
  C->>UI: re-read → citizen + item; PURCHASE_GRANTED_EVENT; 0303 restart offer
```

**Step by step (guest path; a logged-in buyer starts at step 6):**

1. **Tap.** A guest sees **"Log in and buy — {price}"**, which meets requirement 1.2.1. The price comes from the
   catalog, which loads for guests too (`FlashistFacade.ts:1882-1910`). Logged-in buyers see "Buy — {price}". Fires
   `UI:Tap:<surface tap id>`.
2. **Latch.** One in-flight purchase per page, for **all** products. A second request answers `busy`. This replaces
   the card-only `isPurchaseInFlight` (`CitizenshipCard.ts:1012-1056`), so a style shop and the citizenship popup can
   never open two payment windows.
3. **Login (guest only).** `openYandexAuthDialog()` (`FlashistFacade.ts:2426`). It already counts as a platform
   dialog (`0404`) and re-fetches the player.
   - Cancelled or failed → state `login_cancelled`. The surface stays on "Log in and buy" with a quiet line: "Login
     didn't finish — try again". No reload. Same as today otherwise.
4. **Payments re-init (guest only).** `refreshPaymentsAfterLogin()`. This removes the unknown "a payment object from
   guest time" (§1a). If it fails, keep the old object; the live check tells us whether the old one ever fails.
5. **Profile login + reconcile (guest only).** `ensureSession()`. A guest boot never latched D3, so this logs in once
   (`ProfileSession.ts:137-160`, trace `0391` §2a). Then `reconcilePurchasesNow()`, bounded at 10 s, **before** the
   read. A newly logged-in account may hold an unprocessed earlier purchase, and the read must see its grant, or we
   risk a second charge.
6. **Read.** Through `PurchaseProfileSource.reread()` (the card's existing `refreshProfile()`). Publish "checking"
   first, which fixes the gap in §1b step 3. The card stays the only reader.
7. **Decide.** `derivePurchaseOffer(productId, snapshot)`:
   - `buy` → continue.
   - `owned` → state `already_owned`. Show "You already own this". No intent, no charge.
   - `read_failed` (no profile, the `0474` case) → state `profile_unavailable`. Show the existing "couldn't load your
     profile" line with its **Restart game** button (`0397`). No intent.
   - `checking` that lasts past the **auto-continue window** → stop and show a plain **Buy** button (one tap). A
     payment window must not pop up long after the player's tap. Proposed value: `AUTO_CONTINUE_WINDOW_MS = 15 000`,
     counted from the moment the auth dialog closes. Tuned in the verify task.
8. **Intent.** `POST /intent`. `409 already_owned` → state `already_owned`. Any other failure → `error` (retryable).
   The frame never opened, so no Started event (the existing contract, `CitizenshipPurchase.ts:6-9`).
9. **Pay.** `purchase()`. `Purchase:Started:<P>`; on reject → `Purchase:Abandoned:<P>`. This step is the same code as
   today, with the product as a parameter.
10. **Grant.** `/complete` → shared grant transaction (§5). Success → `Purchase:Completed:<P>`; consume, not awaited
    (`CitizenshipPurchase.ts:89-97`).
11. **UI.** `paidGrantConfirmed` (existing) plus a re-read. Dispatch `PURCHASE_GRANTED_EVENT {productId}` (new,
    generic) **and** `CITIZENSHIP_GRANTED_MID_SESSION_EVENT` (existing, so the `0303` restart offer and the popup's
    close still run, `CitizenshipExplainerModal.ts:207-211`). The ad gate updates through the read
    (`CitizenshipCard.ts:328-334`).
12. **D3 hand-off (guest path only, after OD-1).** If the flow logged the player in but ended **without** a grant
    (cancelled payment, error, already owned, read failed), the coordinator now dispatches the existing
    `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT`. `requestGameRestart` then does exactly what it does today right after a login:
    a reload once, never mid-match, with the existing fallback. Net effect: a guest who **doesn't** finish buying ends
    in the same state as today, only later. A guest who **does** buy never reloads until the `0303` offer, which is
    their choice. One exception: for `profile_unavailable` the reload is the player's own **Restart game** tap, not
    automatic (the `0397` rule).

**Login from the plain card button (not a purchase):** unchanged. It reloads at once (D3).

### 4.4 Progress states (what a surface shows)

`PurchaseFlowState` (event `PURCHASE_FLOW_STATE_EVENT`, carrying `{ productId, state }`):
`idle → logging_in → preparing → paying → granted` or a terminal state from `login_cancelled`, `profile_unavailable`,
`already_owned`, `needs_tap` (the window passed), `error`. The surfaces render one short line per state. `preparing` =
"Getting your purchase ready…", which is the only thing on screen between login and payment. New lang keys go into
`en.json` and `ru.json`.

---

## 5. Interfaces and contracts (stubs in the spec only — nothing in `src/`)

```ts
// src/core/profile/PaymentsContract.ts — extended (single list stays the one place)
export const PAYMENT_PRODUCT_IDS = ["citizenship" /* , item ids added by item builds */] as const;
export type PaymentProductId = (typeof PAYMENT_PRODUCT_IDS)[number];

export type ProductKind = "citizenship" | "durable_item";

export interface ProductDefinition {
  kind: ProductKind;
  /** PascalCase segment for `Purchase:<Step>:<AnalyticsName>`; one per product FAMILY, not per variant. */
  analyticsName: string;
}

/** Compile error if an id has no definition. */
export const PRODUCT_DEFINITIONS: Record<PaymentProductId, ProductDefinition> = {
  citizenship: { kind: "citizenship", analyticsName: "Citizenship" },
};

// New error body on /intent (409): { error: "already_owned" } — durable items only (see 5.3).
```

```ts
// src/client/PurchaseOffer.ts — new, pure
export type PurchaseOffer =
  | { kind: "checking" }
  | { kind: "guest"; canLogIn: boolean; price: string | null } // "Log in and buy — {price}"
  | { kind: "owned" }
  | { kind: "read_failed" }
  | { kind: "no_product" }      // catalog has no such id
  | { kind: "buy"; price: string };

export interface PurchaseProfileSnapshot {
  isRevealed: boolean;
  isChecking: boolean;
  /** null = guest */
  profile: {
    isCitizen: boolean;
    isAuthoritative: boolean;
    isVerifiedRead: boolean;
    isPaidCitizen: boolean;
    /** Owned durable product ids; null = not known from this read. */
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
  `buy` only on a verified "not paid" read. Any unknown → `owned` (fail closed, as `citizen` is today).
- `durable_item`: granted this page → `owned`. Authoritative **non-citizen** → owns nothing → `buy`. This is safe on
  any session: every purchase makes the buyer a citizen, so a non-citizen cannot own an item. Citizen with
  `entitlements` known → `owned` if listed, else `buy` (**a paid citizen may buy an item**, S4). Citizen with
  `entitlements === null` → `owned`, i.e. no button (fail closed, same posture as `0409`). Non-authoritative →
  `read_failed`.

```ts
// src/client/PurchaseCoordinator.ts — new
export type PurchaseFlowState =
  | "idle" | "logging_in" | "preparing" | "paying" | "granted"
  | "login_cancelled" | "profile_unavailable" | "already_owned" | "needs_tap" | "error";

export type PurchaseRequestResult =
  | "granted" | "busy" | "login_cancelled" | "profile_unavailable"
  | "already_owned" | "needs_tap" | "error";

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

export interface PurchaseCoordinatorDeps {
  profileSource: () => PurchaseProfileSource | null;
  openAuthDialog: () => Promise<boolean>;            // FlashistFacade.openYandexAuthDialog
  refreshPaymentsAfterLogin: () => Promise<void>;    // FlashistFacade (new)
  ensureSession: () => Promise<string | null>;       // ProfileSession
  reconcileNow: (timeoutMs: number) => Promise<"processed" | "none" | "failed">;
  runProductPurchase: (productId: PaymentProductId) => Promise<ProductPurchaseResult>;
  requestLoginRestart: () => void;                   // dispatches CITIZENSHIP_LOGIN_SUCCEEDED_EVENT (D3 hand-off)
  now: () => number;
  autoContinueWindowMs: number;                      // proposed 15_000
}

export interface PurchaseCoordinator {
  requestPurchase(request: {
    productId: PaymentProductId;
    tapElementId: string;
  }): Promise<PurchaseRequestResult>;
  currentState(productId: PaymentProductId): PurchaseFlowState;
}

export function createPurchaseCoordinator(deps: PurchaseCoordinatorDeps): PurchaseCoordinator {
  throw new Error("not implemented"); // TODO(coder)
}
```

```ts
// src/client/ProductPurchase.ts — new (CitizenshipPurchase.ts generalized; same sequencing)
export type ProductPurchaseResult = "granted" | "already_owned" | "error";
/** intent → frame → /complete → consume (not awaited). Wraps beginPlatformDialog like today. */
export async function runProductPurchase(productId: PaymentProductId): Promise<ProductPurchaseResult> {
  throw new Error("not implemented"); // TODO(coder)
}
```

```ts
// src/profile-server/PaymentsRepository.ts — grant registry
export interface ProductGrant {
  /** The product's OWN entitlement write, inside the shared transaction. Never touches the paid flags. */
  applyEntitlement(client: PoolClient, grant: PaidPurchaseGrant): Promise<void>;
  /** Inbox welcome template sent after commit (today: "citizenship_paid"). */
  inboxTemplate: string;
}

/** Record over the id union: an id without a branch is a compile error. */
export const PRODUCT_GRANTS: Record<PaymentProductId, ProductGrant> = {
  citizenship: { applyEntitlement: async () => {}, inboxTemplate: "citizenship_paid" },
};

// grantPaidPurchase(grant), in ONE transaction:
//   1. lookup = PRODUCT_GRANTS[grant.productId] via Object.hasOwn — miss ⇒ THROW (R2 kept for unknown strings)
//   2. INSERT processed_purchases … ON CONFLICT DO NOTHING (miss ⇒ "already_processed", touch nothing)
//   3. GRANT_FLAGS_SQL — ALWAYS, for every product (Q2: full paid citizen). rowCount 0 ⇒ throw (as today)
//   4. lookup.applyEntitlement(client, grant)
//   5. mark intent used
// after commit: inbox template (never throws, as today)
```

```sql
-- migrations/009_player_entitlements.sql — filed with the first durable item (B4)
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

- **Durable items:** `/intent` checks `player_entitlements` and answers `409 already_owned`. That makes the server a
  second guard for items, where today the client rule is "the only guard" (`CitizenshipOffer.ts:16-17`). It leaks
  nothing: ruling 6 of `0486` says a bought style shows to every player.
- **Citizenship:** **unchanged** (no refusal). Paid status is private (ADR-116 D4). A 409 on a `vfy:false` session for
  an asserted id would reveal it. The client rule stays the guard, as `0409` decided.

---

## 6. Data and state

- **New table** `player_entitlements` (B4). Citizenship keeps the `players` flags; no data migration. The tester-role
  command (`0425`) is unaffected. ⚠️ It sets paid flags with no receipt, so a tester "paid citizen" owns no items.
  That is correct.
- **The receipt ledger** `processed_purchases` stays the source of idempotency. It is **not** used as the ownership
  source: it has no FK and outlives erasure (`PaymentsRepository.ts:160-165`).
- **Profile read:** the owner view **and** the public view gain `entitlements: string[]`, because items are public
  (`0486` ruling 6). The client treats a missing field as `null` (unknown → fail closed for citizens).
- **Client state:** the coordinator holds the latch and the per-product state **in memory** only. A reload clears it on
  purpose. Nothing is stored in sessionStorage in the recommended path.
- **`/reconcile` hardening:** today one throwing entry makes the whole pass return 500 (`Routes.ts:1148-1188`, one
  try around the loop), so **every** pending purchase stays stuck until a later session. With several products that
  risk grows. Isolate each entry: log it (token prefix only), skip it, continue. Return only the tokens that
  succeeded. Low cost, done in B1.

## 7. Failure and edge cases

| Case | What happens | Why it is safe |
|---|---|---|
| **Login cancelled or failed** (`0070` lesson) | `login_cancelled` → visible line "Login didn't finish — try again". The Buy button stays. `Purchase:Login:Cancelled:<P>`. | No intent, nothing charged. Yandex reports cancel and failure the same way (`FlashistFacade.ts:2438`), so one message covers both. `0070`'s Discord modal is not on this path. The flow uses only the Yandex dialog (the `0273` plan confirms no second login path). |
| **Logged in, profile login fails or times out** (`0474`, 2–3 % of loads) | `ensureSession()` → null and latched (D3) → `profile_unavailable` → the existing "couldn't load your profile" line plus the **Restart game** button (`0397`). `Purchase:Login:ProfileFailed:<P>`. | `/intent` needs a session, so the flow **cannot** charge without a profile (`CitizenshipPurchase.ts:46-55`). The player has a visible way forward. No in-page retry (D3 kept). |
| **Logged in at boot but no profile** (`0474`, no login step) | The offer is `read_failed` → the Buy surface shows the same line plus Restart. Never a live Buy. | Same as above. Today's rule already refuses a buy on a failed read (`CitizenshipOffer.ts:78-80`). |
| **Account switch** (`0394`) | Guest path: the account is the one `openAuthDialog` just returned, re-fetched (`FlashistFacade.ts:2436`). `ensureSession()` drops a token minted for another id (`ProfileSession.ts:144-151`). Logged-in path: unchanged from today. ⚠️ **Residual:** a switch made **outside** the game, between the intent and `purchase()`, would be billed to account B and granted to account A. Nothing in the signed payload names the buyer (§1a). | The window is seconds wide and needs the player to switch accounts mid-purchase. It is the same residual as today and is `0394`'s to close. This design adds no new exposure, and it re-checks the id (`getYandexUniqueId()` against the session) right before `/intent`. |
| **Purchase cancelled** (frame closed) | `Purchase:Abandoned:<P>`, then `error` → "Purchase not completed". Guest path → D3 hand-off (reload, as today after a login). | No charge. Exactly one of Completed or Abandoned per Started (existing contract). |
| **Paid, but `/complete` failed or is slow** | `error`. The purchase stays unconsumed → the next session's reconcile grants it. After an in-page login, `reconcilePurchasesNow()` also covers an older stray. | Grant-before-consume ordering (`CitizenshipPurchase.ts:89-97`). Reconcile is idempotent by token (`Routes.ts:1179-1186`). ⚠️ Known residual stays: Abandoned is logged for a real payment whose `/complete` failed (`analytics-event-reference.md`, `PURCHASE_ABANDONED_CITIZENSHIP`). |
| **Already owns the item** | Client: `owned`, no button. Server: `/intent` 409 `already_owned` for durable items. | Two guards for items. For citizenship, the client rule as today. |
| **Paid citizen buys an item** | Allowed. The grant writes the item, and the paid flags are a no-op (`COALESCE` keeps `citizenship_purchased_at`, `PaymentsRepository.ts:51-58`). | S4. |
| **Earned citizen on an unverified session buys an item** | Item ownership comes from the public view → `buy` if not owned. | Items are public, so no paid-status leak. Paid status itself is never derived from it. |
| **Unknown product id** | Wire: `PurchaseIntentRequestSchema` refuses it (zod enum). Server grant: registry miss → throw. Reconcile: entry skipped, the others continue (§6). | R2 kept. |
| **Two surfaces tap at once** | The second gets `busy`. | One latch for all products. |
| **Login lands mid-match** | Impossible from the start-screen surfaces. The D3 hand-off keeps `requestGameRestart`'s match guard (`GameRestart.ts:63-73`). | Unchanged. |
| **Slow chain after login** (signed call up to 60 s) | Past `AUTO_CONTINUE_WINDOW_MS` → `needs_tap` → a plain Buy button. | No surprise payment window long after the tap. |
| **Payment frame refuses to open without a fresh tap** (unverified, §1a) | It rejects → Abandoned → `error`. The verify task (B5) detects it. The fix is a **one-constant switch**: `autoContinueWindowMs = 0` → always `needs_tap`. That gives one extra tap and no other code change. | The design degrades to "one extra tap" rather than breaking. |
| **Citizenship kill switch off** (`0236`) | The card is hidden → no profile source → no product can be bought. Reconcile is suspended (existing). | Every purchase grants citizenship, so selling items while citizenship is switched off would be wrong. ⚠️ Owner to confirm (OQ-3). |
| **Catalog not ready / degraded SDK** | `no_product` or `guest{canLogIn:false}` → no button (today's rule). | Unchanged. |

## 8. Alternatives considered

- **A — continue on the same page, then hand off to D3 on a non-grant end (RECOMMENDED).** This meets the owner's
  "no extra popups or steps". It is built from paths that already ship: the fallback branch of `requestGameRestart`
  already logs a guest in on the same page today. Trade-off: a guest who just bought plays on a page that **booted as
  a guest**. The things read once at load (the name box, the inbox dot, the tenure gift) catch up only after the
  `0303` restart offer or the next load. That is the same posture `0303` already accepted for every purchase. Matches
  read identity on every join (`Main.ts:950-957`; `Transport.ts:395-450` sends the session token late), so XP
  credit is right.
- **B — keep D3's reload, then resume the purchase.** Store `{productId, at}` in sessionStorage, reload, and after boot
  open the payment window by itself (or reopen the popup with Buy, which is one tap). This keeps D3 unchanged. Costs:
  a full reload (seconds, and unmeasured: §1b), a payment window that opens on its own after a page load (riskier for
  moderation and for player trust), a dependence on sessionStorage (which is missing in the very population D3's
  NoStorage branch exists for), and the boot catalog race. **The fallback if the owner rejects OD-1.**
- **C — today's behavior for every item** (reload, then the player finds Buy again). Zero build. It fails rule 4 and
  loses guests, who are 58.2 % of match starts (`0405`).
- **Server-side "already owned" for citizenship too:** rejected. It would leak paid status on unverified sessions
  (ADR-116 D4).
- **Each branch writes the paid flags itself** (the brief's literal wording): rejected in favor of the shared step. It
  gives the same outcome, and no branch can forget it.

**Recommend an ADR** after the owner rules: "Purchase-initiated login continues on the same page; D3 reload deferred
to a non-grant end" (via `fkit-record-decision`). It amends D3 (`0273`, widened by `0397` Q3).

## 9. Owner decisions needed (plain words, for relay)

**OD-1 — after a guest logs in to buy, may the game skip the reload and go straight to the payment window?**
*Context:* today, logging in from the guest card or the popup reloads the whole game page. You ruled that in
September (D3), so the game is sure to start up "the right way" as a logged-in player. A reload throws away the
purchase the player was making. They land on the start screen and must find the Buy button again. Many may not. To go
"straight into the purchase", the game must **not** reload at that moment.
- **(1) Recommended — skip the reload only for "log in and buy".** The payment window opens right after login. If the
  player buys, the usual "restart to apply" popup shows afterwards, as for every purchase. If they don't buy (they
  cancel, or something fails), the game reloads as it does today. The plain login button still reloads at once.
  *Changes:* rule D3 gets one exception; an ADR records it.
- **(2) Keep the reload, then reopen the purchase by itself after the reload.** D3 is untouched. The player waits for
  a full reload, then the payment window pops up by itself (or the popup comes back with Buy, which is one more tap).
  It needs browser storage, which some players don't have; for them it falls back to today's behavior.
- **(3) Keep today's behavior.** Login reloads and the player taps Buy again. No build.
*Knock-on:* none for sprint placement (checked: B1–B5 are new tasks for the producer to file, and `0010`/`0011`/`0486`
already wait on `0484`). Option 2 adds sessionStorage and moderation risk. Option 3 makes build task B3 unnecessary.

**OQ-2 — the "restart to apply" popup after a purchase.** It stays (`0303`). It shows **after** the payment, so it is
not between login and purchase. Flagged in case the owner's "no extra popups" was meant to cover it too.

**OQ-3 — with the citizenship kill switch off, nothing can be bought** (every purchase grants citizenship). Confirm.

## 10. Testing strategy

- **Pure rule** `derivePurchaseOffer`: the existing `CitizenshipOffer` cases unchanged through the wrapper, plus an
  item matrix across buyer type (guest, non-citizen, earned citizen verified and unverified, paid citizen), ownership
  (owned, not owned, unknown) and catalog (ready, missing).
- **Coordinator** with fake deps (no DOM): every row of §7. Especially: guest buy → granted with no
  `requestLoginRestart` call; guest cancel → exactly one `requestLoginRestart`; `ensureSession` null → state
  `profile_unavailable`, no intent call; window elapsed → `needs_tap`, no `purchase()`; reconcile awaited before the
  read; latch → `busy`.
- **`ProductPurchase`**: the existing `CitizenshipPurchase.test.ts` passes unchanged (same event strings), plus one
  item product's event names.
- **Server, table-driven over `PAYMENT_PRODUCT_IDS`**: each product → receipt + `is_paid_citizen` + its entitlement;
  idempotent re-grant; an unknown string → throws; a compile-time check that `PRODUCT_GRANTS` covers the union.
  Integration (`npm run test:integration`, real Postgres) for the entitlement table and the 409. `/reconcile` with one
  failing entry still grants the others.
- **Harness caveats:** run full tests through `npm test` (project lock; `maxWorkers:1`). The supertest flake rule
  applies to the route suites (CLAUDE.md).
- **Live** (B5, the owner, inside Yandex, test purchase list): a guest's "Log in and buy" opens the payment window
  with no second tap; the grant lands on the account that just logged in; cancel → one reload; and the 15 s window
  holds.

## 11. Proposed build split (for the producer to file with `/fkit-task-brief`)

| # | Task | Ships | Depends on |
|---|---|---|---|
| **B1** | Server: `PRODUCT_GRANTS` registry, with the paid-citizen flags in the shared step (citizenship only, no behavior change); table-driven grant tests; `/reconcile` per-entry isolation. | profile-box deploy | 0484 |
| **B2** | Client refactor, no behavior change: `PurchaseOffer`, `ProductPurchase`, `PurchaseCoordinator` with the global latch (logged-in path only); card and popup go through it; `PURCHASE_GRANTED_EVENT`. | game deploy | 0484 |
| **B3** | Client: guest → login → continue (§4.3 steps 3–7, 12), `refreshPaymentsAfterLogin`, `reconcilePurchasesNow`, progress states and strings, "Log in and buy" label, "checking" during the read, analytics. Applied to citizenship first. **Needs OD-1 ruled (option 1) and its ADR.** | game deploy | B2 |
| **B4** | Durable items base: migration 009, the `durable_item` grant branch type, `entitlements` in the profile read, `/intent` 409 `already_owned`. No product yet, or folded into the first item build. | profile-box deploy | B1 |
| **B5** | Verify B3 live (owner, inside Yandex): the fact-check (a) items marked unverified, plus §10 Live. Top of the next sprint (build/verify split rule). | — | B3 |

`0486` (and `0010`/`0011` later) then depend on **B3 + B4**, not on 0484 directly.

## 12. Analytics (proposed; the build adds them to `analytics-event-reference.md`)

`<P>` = `ProductDefinition.analyticsName` (one per product **family**, e.g. `Citizenship`, `NicknameStyle`, to keep
the event count low). All have at most 5 parts.

| Event | When |
|---|---|
| `UI:Tap:<SurfaceTapId>` | existing pattern, one id per Buy surface (e.g. existing `PurchaseCitizenshipExplainer`) |
| `Purchase:Login:Requested:<P>` | guest tapped "Log in and buy"; auth dialog about to open |
| `Purchase:Login:Succeeded:<P>` | auth dialog reported success |
| `Purchase:Login:Cancelled:<P>` | auth dialog closed or failed |
| `Purchase:Login:ProfileFailed:<P>` | logged in to Yandex, but `ensureSession()` came back null (the `0474` case inside this funnel) |
| `Purchase:Continue:Ready:<P>` | after login, the offer said `buy` inside the window; value = ms from dialog close |
| `Purchase:Continue:NeedsTap:<P>` | the window elapsed → plain Buy shown |
| `Purchase:Blocked:AlreadyOwned:<P>` | owned (client rule or server 409) |
| `Purchase:Started:<P>` / `Purchase:Completed:<P>` / `Purchase:Abandoned:<P>` | existing contract, product as a parameter. **The citizenship strings are unchanged.** |

The existing `Profile:Login:Restart:*` events still fire from `requestGameRestart` on the D3 hand-off. Funnel:
`Login:Requested → Login:Succeeded → Continue:Ready → Started → Completed`.

## 13. Reuse map

| Reused as is | Changed | New |
|---|---|---|
| `PaymentsApiClient.ts` (all three calls), HMAC verify, the receipt ledger, `/complete` and `/reconcile` logic, `PlatformDialogPresence.ts`, `CitizenshipRestartOffer.ts` (`0303`), `GameRestart.ts`, `ProfileSession.ts`, `0248` ad gate, `0397` Restart button | `CitizenshipOffer.ts` (wrapper), `CitizenshipPurchase.ts` (delegates), `CitizenshipCard.ts` (profile source, login mode, latch moves out), `CitizenshipExplainerModal.ts`, `PaymentsReconciliation.ts` (+now), `FlashistFacade.ts` (+payments refresh), `PaymentsRepository.ts` (registry), `Routes.ts` (409, reconcile isolation), `PaymentsContract.ts` (definitions) | `PurchaseOffer.ts`, `ProductPurchase.ts`, `PurchaseCoordinator.ts`, migration 009, lang keys |

## 14. Impact and risks

- **D3 amendment** (OD-1). This is the main risk if it is done silently, so it goes to the owner and an ADR.
- **Partial-guest page** after an in-page purchase: accepted under `0303`'s posture. The name box and inbox catch up
  on restart.
- **An unverified platform behavior** (the payment window without a fresh tap, the guest-era payment object). Both
  are contained by design: the payments re-init, and the one-constant fallback to `needs_tap`.
- **Latency between login and payment** is unmeasured. The 15 s window caps the surprise.
- **Security:** no new trust surface. `/intent` stays Bearer-only, and the grant stays bound to the signed payload.
  The 409 is only for publicly visible items.
- **Debt:** the card stays the profile reader. A separate profile store would be cleaner but is out of scope. Note it
  if a third surface type appears.

## 15. Open questions

1. **OD-1** (above): the owner's call, and it blocks B3.
2. **OQ-2**: does "no extra popups" include the post-purchase `0303` restart offer?
3. **OQ-3**: confirm that with the citizenship kill switch off, all purchases are off.
4. Consumables (coins, `0480` on hold): does a consumable purchase make the buyer a paid citizen? The registry shape
   allows a `consumable` kind (no owned check, no entitlement row), but it is not designed here.
5. Should `Purchase:Abandoned` be split from a "paid but `/complete` failed" outcome? That is an existing residual,
   not a new one.
6. The value of `AUTO_CONTINUE_WINDOW_MS`: 15 s is a proposal; set it from B5's measurements.
