# Client: Shared Purchase Core — Offer Rule, Product Purchase, Coordinator, Per-Product Restart Popup — B2 (task 0494)

**Source**: `ai-agents/tasks/done/0494-client-shared-purchase-core-offer-product-purchase-coordinator-and-per-product-restart-popup-b2/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 23 (ADR-035 append rank; on merit directly below `0493`) / task `0494` / build B2 of the shared purchase flow

> ✅ Closed 2026-10-25. Plan owner-approved 2026-10-24; full `npm test` 4981/4981, tsc and lint clean; a local headless
> check showed the restart popup with both buttons; stateful review closed (R1, a stale comment, fixed).
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `a3c32b4`; `git tag --contains` → none ⇒ NOT deployed.** No visible
> change for players. Its live behaviour is checked through `0498` (B5) after `0495`.

## Goal

The client core of the shared purchase flow ([[systems/shared-purchase-flow]]): one offer rule, one purchase runner,
one coordinator (logged-in path) and a per-product restart popup — with **no visible change for citizenship**.

## Key Changes

- **New:** `PurchaseOffer.ts` (`derivePurchaseOffer`, incl. `cannot_verify` and `xp`; `deriveCitizenshipOffer` is now a
  wrapper), `ProductPurchase.ts` (`runProductPurchase`, the **single** dispatch site of the restart-offer event, after
  **every** grant incl. `becamePaidCitizen === false`), `ProductClientConfig.ts`, `PurchaseCoordinator.ts` (one latch
  for all products), all wired in `Main.ts`.
- **Changed:** `PaymentsApiClient.ts` returns result enums (`ok | already_owned | failed`) instead of `null` for every
  non-200; `FlashistFacade.openYandexAuthDialog()` is single-flight; `CitizenshipRestartOffer.ts` + modal take
  `{ productId, becamePaidCitizen }` and show the product's own text and events — citizenship keeps *"Citizenship is
  active!"* and both buttons (**RP-1**, guide).
- `CitizenshipPurchase.test.ts` passes unchanged (same event strings).

## Outcome

- Waited on B1's **build**, not its deploy (owner OP-1, 2026-10-24); tolerates a box without `becamePaidCitizen`.
- Follow-up routed to B3: `analytics-event-reference.md`'s `LONG_SESSION_REFRESH_SHOWN` row named the old
  `runCitizenshipPurchase` — B3 fixed it to `runProductPurchase`.
- Blocks `0495` (B3).

## Related

- [[systems/shared-purchase-flow]] — the flow
- [[tasks/shared-purchase-flow-design]] — task `0484`, the spec
- [[tasks/purchase-grant-registry]] — task `0492` (B1), built first
- [[tasks/guest-log-in-and-buy]] — task `0495` (B3), which extends this coordinator
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — point 4: restart prompt after every purchase
- [[tasks/citizenship-restart-prompt]] — task `0303`, the popup made per-product here
- [[tasks/citizenship-explainer-popup]] — task `0301`, whose Buy now goes through the coordinator
- [[decisions/sprint-9]] — the board (rank 23)
- [[tasks/stop-consuming-client-s2]] — task `0510`, 2026-10-26: the client consumes only what the server lists; new offer `held_elsewhere`
