# Shared Purchase Flow

**Layer**: shared
**Key files**: `src/client/PurchaseCoordinator.ts`, `src/client/PurchaseOffer.ts`, `src/client/ProductPurchase.ts`, `src/client/ProductClientConfig.ts`, `src/client/PaymentsApiClient.ts`, `src/client/PaymentsReconciliation.ts`, `src/client/CitizenshipExplainerModal.ts`, `src/client/CitizenshipCard.ts`, `src/client/CitizenshipRestartOffer.ts`, `src/client/GameRestart.ts`, `src/client/flashist/FlashistFacade.ts`, `src/core/profile/PaymentsContract.ts`, `src/core/profile/PlayerProfile.ts`, `src/profile-server/PaymentsRepository.ts`, `src/profile-server/Routes.ts`, `src/profile-server/PublicProjection.ts`, `migrations/010_player_entitlements.sql`

> 🚀 **2026-10-28 sync (`7a2ef92`) — DEPLOYED 2026-10-27**: profile **`0.0.165-profile.1`** (B1/B4/S1, `0491`,
> migrations `009`–`012`) then live game **`0.0.167`** (B2/B3/S2, `0488`). First live evidence: a guest's "Log in and buy"
> opened the payment window with **no second tap** ([[tasks/guest-log-in-and-buy-live-check]]); a live citizenship
> purchase was granted; held reconciles answer quietly ([[tasks/stop-consuming-profile-box-live-check]]). The four
> hand-run checks `0493`, `0498`, `0499`, `0512` were **cancelled** 2026-10-28 for a GameAnalytics read `0516` (on or after
> 2026-11-03); never proven live: `becamePaidCitizen` in the reply, a stray-purchase grant, T2, T4, the restart popup
> after a guest purchase. The "committed, NOT deployed" notes below are history.

> ⛔ **2026-10-27 sync (`5f93b96`) — "consume after grant" is SUPERSEDED for permanent products** by
> [[decisions/adr-126-permanent-purchases-not-consumed]] (owner-approved 2026-10-26), after a paying player lost his
> profile to a Yandex player-ID change ([[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]).
> - **Citizenship and durable items are never consumed**; a future consumable still is. The **server** names what to
>   consume (`/complete` → `consume`; `/reconcile` → `consumeTokens`); the client consumes nothing else — so the
>   `ProductPurchase.ts` row below ("→ consume (not awaited)") is history for permanent products.
> - Reconcile now separates `grantedTokens` (fires the refresh event) from held purchases (quiet), and returns
>   **`heldElsewhere`** for a verified caller whose purchase sits on another profile → a new offer and coordinator end
>   state **`held_elsewhere`**: no Buy, a "write to us" line with Telegram + VK links, **no payment window**.
> - Built: S1 server `0506` ([[tasks/stop-consuming-profile-box-s1]], `baaf2f8`), S2 client `0510`
>   ([[tasks/stop-consuming-client-s2]], `f7ce268`) — **committed, NOT deployed**. The held B1–B4 deploy now ships
>   **with** them (owner: *"Hold it"*). The game half waits on the owner's pre-release checks T1–T3 (`0512`; **T3 blocks**).
> - The one way a purchase can change profile is the owner-run merge's `transferPurchase`
>   ([[decisions/adr-128-owner-run-profile-merge]]).

> 🏗️ **State on 2026-10-26 (`4e9160a`) — BUILT AND COMMITTED, NOT DEPLOYED, NOTHING CHECKED LIVE.** B1–B4
> (`0492`, `0494`, `0495`, `0496`) are closed `(agent-closed — not owner-verified)`; B1/B2/B4 are in commit `a3c32b4`,
> B3 in `4e9160a`. `git tag --contains` → **none** for both (newest tags: game `0.0.165`, profile `0.0.164-profile.2`).
> The four live checks — `0493` (B1v), `0497` (B4v), `0498` (B5, inside Yandex) and `0499` (rewarded ad) — are
> `🔲 Backlog` on [[decisions/sprint-9]]. **Citizenship is still the only product** (`PAYMENT_PRODUCT_IDS` =
> `["citizenship"]`); no item is sold yet.

## Summary

One purchase flow, built once, that every paid item reuses. It enforces the owner's four rules for all purchases
([[decisions/paid-items-purchase-rules]]): anyone may buy; every purchase makes the buyer a full paid citizen; a guest
logs in with Yandex first; and after that login the purchase continues **on the same page**, with no extra popup or
tap, *"if possible"* ([[decisions/adr-125-log-in-and-buy-skips-reload]]). After every completed purchase the existing
"restart to apply" popup appears, worded for what was bought, with **Restart now** and **Later**.

Designed in task `0484` ([[tasks/shared-purchase-flow-design]]); spec
`ai-agents/knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md` (REVISION 2, approved by the owner
2026-10-24).

## Architecture

**Client (one `PurchaseCoordinator` per page, created in `Main.ts`):**

| Piece | Job | Built by |
|---|---|---|
| `PurchaseOffer.ts` — `derivePurchaseOffer()` | Pure rule: what may be offered for this product now (`checking`, `guest`, `owned`, `cannot_verify`, `read_failed`, `no_product`, `buy`). `deriveCitizenshipOffer()` became a thin wrapper, so the old citizenship tests still hold. | B2 |
| `ProductPurchase.ts` — `runProductPurchase()` | intent → Yandex payment frame → `/complete` → consume (not awaited). **The only place that dispatches the restart-offer event**, after every grant. `runCitizenshipPurchase()` delegates to it. | B2 |
| `ProductClientConfig.ts` | Per product: analytics enum entries, text keys, an optional UI switch. A product with no entry does not compile. | B2 |
| `PurchaseCoordinator.ts` | One purchase latch for **all** products; the guest path (login → continue) under one deadline; progress states; the D3 hand-off. | B2 (logged-in), B3 (guest) |
| `FlashistFacade.openYandexAuthDialog()` | **Single-flight**: a second call while the dialog is open gets the same promise — covers every caller, including `0488`'s end-of-match login. | B2 |
| `FlashistFacade.refreshPaymentsAfterLogin()` | Re-fetches the payments object after a guest login; on failure keeps the old one and returns `false`. | B3 |
| `PaymentsReconciliation.reconcilePurchasesNow()` | Reconcile now, ignoring the once-per-session latch: `processed` / `none` / `failed` / `timeout` / `pending_ungranted`. | B3 |

**The guest path** (`AUTO_CONTINUE_DEADLINE_MS = 15_000`, `HANDOFF_DELAY_MS = 5_000` in `PurchaseCoordinator.ts`):
tap **"Log in and buy — {price}"** → Yandex login → deadline starts → payments refresh → profile login
(`ensureSession`) → reconcile → re-read the profile ("checking" shown) → decide → `/intent` → re-check the deadline →
payment window → `/complete` → grant → restart popup. A failed payments refresh, a failed/timed-out/`pending` reconcile,
or a passed deadline stops at **`needs_tap`** (a plain Buy) — the flow never opens a payment window by itself on a read
that may be stale. A continuing tap re-runs the reconcile; a paid-but-ungranted earlier purchase ends at
**`earlier_purchase_pending`** with no payment (review R1, owner ruling 2026-10-26). A guest who logged in but did not
buy gets D3's reload after the end line (ADR-125). The plain **Log in** button still reloads at once.

**Server (profile box):**

- **`PRODUCT_GRANTS`** (`PaymentsRepository.ts`) — a `Record<PaymentProductId, ProductGrant>`, so an id without a
  grant branch does not compile; an unknown string at runtime still **throws** (the `0019` R2 guard, kept). One
  transaction: receipt (`ON CONFLICT DO NOTHING`) → read `is_paid_citizen FOR UPDATE` → **always** write the
  paid-citizen flags → the product's own entitlement write → mark the intent used.
- **`/complete`** returns `becamePaidCitizen` on a fresh grant (omitted on a replay — owner OQ-2). It drives the inbox
  rule: the `citizenship_paid` welcome goes out for a citizenship buy or when the buyer was not yet paid.
- **`/reconcile`** isolates each entry: one failing purchase no longer makes the whole pass 500; it reports
  `failedCount` (owner OQ-1). ⚠️ A **live behaviour change** — hence its own verify task `0493`.
- **Durable items (B4):** table `player_entitlements` (`migrations/010_player_entitlements.sql`, PK
  `(player_id, product_id)`), `durableItemGrant()` branch factory, `listEntitlements()`. Ownership is **private**
  (owner OD-2): `entitlements` appears only on the **verified owner view** of the profile; the unverified view never
  carries it and drops item-purchase inbox messages. `/intent` answers **409 `already_owned`** only to a verified caller
  who owns the item (`intentRefusal()`); citizenship never reads ownership.

**How a new item plugs in (spec §4.2):** one id in `PAYMENT_PRODUCT_IDS` + its `PRODUCT_DEFINITIONS` kind; a price
above 249 Yan, confirmed by the owner; one `PRODUCT_GRANTS` entry; one `PRODUCT_CLIENT_CONFIG` entry (enum analytics,
en + ru texts incl. the restart-popup and inbox texts, an optional UI switch); a Buy button calling
`coordinator.requestPurchase()`; the table-driven grant test; and a live check proving **"item granted AND buyer is a
paid citizen"**. A per-item UI switch hides **UI only** — grants, reconcile and reads never check it. The citizenship
kill switch (`0236`) is different: off ⇒ nothing can be bought or reconciled.

## Gotchas / Known Issues

- ⚠️ **Not checked live.** Whether Yandex opens the payment window after the login with no fresh tap, and whether the
  purchase is billed and granted to the account that just logged in, are **documented-only / unverified** (spec §1a).
  B5 (`0498`) proves them. Fallback: `AUTO_CONTINUE_DEADLINE_MS = 0` (always one extra tap). ⚠️ `0495`'s worklog notes
  a tap after `needs_tap` still awaits a re-read before `purchase()`, so the `0` fallback may not be enough if Yandex
  needs a synchronous gesture.
- **Guest-booted page after an in-page purchase:** until the player restarts (or, with "Later", until the next match or
  open), the name box, inbox dot and tenure gift act as for a guest. Matches and XP are correct.
- **Named residuals (spec §7):** an account switched *outside* the game between intent and payment would be billed to
  one account and granted to another (`0394`'s to close); two tabs or devices buying the same thing at once are both
  charged (refund by hand); `Purchase:Abandoned` is logged for a real payment whose `/complete` failed.
- **Tester residual:** a `0425` tester reset to non-citizen keeps owned items; on an unverified login they could be
  offered the item again (Yandex test purchases are free).
- **The `/intent` 409 route path** is first exercised end to end by the first real item build (B4 accepted residual).
- **Deploy order:** profile box `0491` (migration `009`) **before** B4 (`010`). The restore drill must not run on a box
  missing either migration ([[tasks/profile-backup-restore-reproof-006]]).
- **Follow-up filed:** `0501` (Backlog board) — a **logged-in** Buy should also re-check for an earlier
  paid-but-not-granted purchase before opening the payment window (B3 fixed this only for the guest path).
- **Analytics** (all `:Citizenship` today): `Purchase:Login:{Requested,Succeeded,Cancelled,ProfileFailed}`,
  `Purchase:Continue:{Ready,NeedsTap}`, `Purchase:Blocked:{AlreadyOwned,EarlierPurchasePending}`, tap id
  `UI:Tap:PurchaseLoginCitizenshipExplainer`; `Purchase:Started/Completed/Abandoned:Citizenship` unchanged. There is
  deliberately no `Purchase:Blocked:CannotVerify:Citizenship` (the citizenship rule never answers "cannot verify"). See
  [[systems/analytics]].

## Related

- [[decisions/paid-items-purchase-rules]] — the four rules this flow enforces
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — no reload on "Log in and buy"; restart prompt after every purchase
- [[tasks/shared-purchase-flow-design]] — task `0484`, the design
- [[tasks/purchase-grant-registry]] — task `0492` (B1), server grant registry
- [[tasks/purchase-core-client]] — task `0494` (B2), client core
- [[tasks/guest-log-in-and-buy]] — task `0495` (B3), the guest path
- [[tasks/durable-items-entitlements]] — task `0496` (B4), item ownership
- [[tasks/yandex-payments-implementation]] — task `0019`, the payment pipeline and its R2 guard
- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup whose Buy and Log in now go through the coordinator
- [[tasks/citizenship-restart-prompt]] — task `0303`, the popup shown after every purchase
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, the switch that stops all sales
- [[tasks/paid-citizen-ad-free]] — task `0248`, what "full paid citizen" includes
- [[decisions/adr-116-verified-login]] — Decision 4, why ownership is private
- [[systems/player-profile-store]] — the profile box that grants
- [[systems/analytics]] — the purchase-funnel events
- [[tasks/rewarded-video-double-match-xp]] — task `0488`: **not** a purchase, does not use this flow; shares the single-flight login
- [[decisions/sprint-9]] — the board carrying B1–B5
- [[decisions/sprint-backlog]] — the Backlog board: follow-up `0501`, and the item builds `0486`, `0010`, `0011` that will plug in
- [[systems/project-brief]] — `PROJECT.md`: citizenship as the monetization spine
- [[tasks/nickname-styling-talk]] — task `0477`: where the all-purchases rule and this flow were asked for; `0486` will be the first item
- [[tasks/stop-consuming-design]] — task `0505`, 2026-10-26: the design that supersedes "consume after grant" for permanent products
- [[tasks/stop-consuming-profile-box-s1]] · [[tasks/stop-consuming-client-s2]] — tasks `0506` (S1) and `0510` (S2), the build (committed, not deployed)
- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]] — 2026-10-26
- [[decisions/adr-128-owner-run-profile-merge]] — `transferPurchase`, the one way a purchase changes profile
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — why consuming was reversed
- [[tasks/purchase-grant-registry-live-check]] — task `0493` (B1v, cancelled 2026-10-28)
