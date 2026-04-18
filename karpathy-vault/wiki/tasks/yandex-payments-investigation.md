# Yandex Payments Investigation

**Source**: `ai-agents/tasks/done/sprint4-investigation-yandex-payments.md`, `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`
**Status**: done
**Sprint/Tag**: Sprint 4 investigation

## Goal

Determine the correct Yandex Games payments integration for Sprint 4: SDK API shape, current client readiness, session catalog architecture, dashboard setup requirements, and the safest purchase-to-server completion flow for paid citizenship.

## Key Changes

- Reviewed the current Yandex Games purchases SDK docs and confirmed the current API shape: `getPayments()`, `getCatalog()`, `purchase()`, `getPurchases()`, and `consumePurchase()`.
- Confirmed the current client already has a Yandex bootstrap hub in `FlashistFacade`, but no payment initialization or catalog caching yet.
- Confirmed there is no payment integration anywhere in `src/`; current cosmetics purchases still go through the Stripe checkout flow.
- Recommended adding a memoized payments/catalog session cache in `FlashistFacade`, with empty-catalog graceful fallback outside Yandex or on fetch failure.
- Recommended signed purchase verification on the game server plus startup reconciliation through `getPurchases()`, not a raw client success callback and not a webhook.
- Recommended treating citizenship and future cosmetics as durable server-owned entitlements: after the server verifies and persists the grant, consume the purchase so it does not stay in the unprocessed queue.

## Outcome

The investigation concludes that Sprint 4 should use `ysdk.getPayments({ signed: true })`, fetch the catalog once per session, and gate purchase UI strictly on catalog presence. The secure server path is signed Yandex purchase verification with idempotent token storage, startup reconciliation via `getPurchases()`, and post-grant consumption once the entitlement has been durably stored on the game server. Official public docs reviewed on 2026-04-18 do not document a Yandex Games purchase webhook for this flow.

The main non-SDK risk remains identity binding: paid citizenship should not ship until the verified Yandex identity work from [[tasks/player-profile-store-investigation]] is in place, so a successful signed purchase can be attached to the correct long-lived player profile.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and dependencies for citizenship and payments
- [[tasks/player-profile-store-investigation]] — the parallel Sprint 4 investigation that identified the verified Yandex identity gap
- [[systems/flashist-init]] — existing client startup hub where payments/catalog caching should be added
