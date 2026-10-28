# Client: Stop Consuming Permanent Purchases — Consume Only What the Server Lists, Quiet Reloads, "Held Elsewhere" Offer (task 0510, S2)

**Source**: `ai-agents/tasks/done/0510-client-stop-consuming-permanent-purchases-held-elsewhere-offer-and-coordinator-end-state-s2/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified) — committed `f7ce268`, **deployed 2026-10-27** (live game `0.0.167`; ~~not deployed~~)
**Sprint/Tag**: Sprint 9 — live player incident (rank 37, append rank flagged)

> 🚀 **2026-10-28 sync (`7a2ef92`) — DEPLOYED 2026-10-27**: live game **`0.0.167`** (read 2026-10-28 by `0511`; a `0.0.166`
> bump came minutes earlier the same day). ⚠️ **The pre-release T3 gate did not run** — the owner skipped the dev deploy;
> T3 and T1 passed **on live, after the deploy**, and the owner ruled *"Count the live checks (Recommended)"*. S2v `0512`
> was then **cancelled** 2026-10-28 → [[tasks/stop-consuming-client-live-check]]: T2 and T4 stay unproven; the client
> side moves to the GameAnalytics read `0516` (on or after 2026-11-03). The "not deployed" text below is history.

## Goal

The **client half** of the `0505` design ([[tasks/stop-consuming-design]], row S2): consume only what the server
names, keep reloads quiet now that a kept purchase is in `getPurchases()` on every load, and — under ruling D1 — show
no Buy button, only a "write to us" line, when the purchase is held by **another** profile of this verified login.
Hub: [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- `ProductPurchase` consumes only on `consume === true`; `PaymentsReconciliation` consumes only `consumeTokens`.
  New client + old box → consumes nothing (safe default).
- `PURCHASES_RECONCILED_EVENT` fires only on a fresh grant (`grantedTokens`); old-box fallback is today's
  `processedTokens` rule.
- `/reconcile` gets an optional Bearer, only when a session is already held; the boot pass awaits `ensureSession()`
  once, never starts a login.
- A per-page held-elsewhere store announced on `PURCHASE_OFFER_CHANGED_EVENT`; `derivePurchaseOffer` gains
  `held_elsewhere`, ranked after `owned` and before `buy`, for both product kinds; a `held_elsewhere` end state in
  `PurchaseCoordinator` for the guest auto-continue, the tap re-check and the logged-in path — **no payment window**.
- Citizenship card and explainer show the line with **Telegram + VK links** (owner: *"Telegram + VK links
  (Recommended)"*); keys `purchase_flow.held_elsewhere`, `.contact_telegram`, `.contact_vk` in both `en.json` and
  `ru.json` (wording owner-approved).
- Analytics: `Purchase:HeldOnOtherProfile:Citizenship`, `Purchase:Blocked:OtherProfile:Citizenship`,
  `UI:Tap:TelegramLinkHeldElsewhere`, `UI:Tap:VkLinkHeldElsewhere`; `Purchase:Completed:Citizenship` and
  `Continue:NeedsTap` descriptions updated — see [[systems/analytics]].
- **Review (owner rulings):** R1 *"Fix it now in 0510"* — an earned citizen held elsewhere had lost "already a citizen"
  and seen "get it free" in the explainer; fixed. R2 — an analytics row over-claimed; docs fixed. R3 — the logged-in
  tap before the boot pass answers is a residual, *"Note it in 0501"* (no code change here).

## Outcome

- **Tests (worklog):** full `npm test` 241 suites / 5356 tests after review; targeted suites green; a mutation check
  proved the card's re-render loop guard. Run by the coder; **not re-run by the wiki**.
- **Not deployed** (`git tag --contains f7ce268` → none, 2026-10-27). Any game deploy from `dev` now ships this plus
  the held client code (`0494`, `0495`, `0488`) and `0507`.
- **Release gate:** the game deploy waits for `0512` part (a), the owner's T1–T3 on the Yandex-side test copy against
  the live profile box; **T3 failing blocks it**. Until this ships, the box's consume-permanent setting protects
  nothing (every live client still consumes).

## Related

- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]]
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, the server contract this reads
- [[tasks/stop-consuming-design]] — task `0505`
- [[tasks/one-player-message-popup]] — task `0507`, built just before; ships in the same game deploy
- [[tasks/purchase-core-client]] — task `0494`, the client core it edits
- [[tasks/guest-log-in-and-buy]] — task `0495`, the guest path it edits
- [[systems/shared-purchase-flow]] · [[systems/analytics]]
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] · [[decisions/sprint-9]]
