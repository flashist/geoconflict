# Sprint 6 — More Content

**Date**: planned
**Status**: proposed

## Context

Goal: expand the game with historical and thematic map content. The commercial thesis is content-led conversion: use free historical multiplayer maps to validate demand, then sell paid campaign map packs once the Sprint 4 payment infrastructure and Sprint 5 cosmetics/store work are in place.

Source: `ai-agents/sprints/plan-sprint-6.md`

## Decision

| Task | Status | Description |
|---|---|---|
| 5b — Server restart UX | Backlog | Moved from Sprint 3; pre-restart warning plus blocking auto-refresh when the server returns |
| 5c — Mobile warning screen | Backlog | Moved from Sprint 3; one-time mobile warning with a "Continue anyway" path |
| Historical multiplayer maps | Backlog | Add 1–2 free historical maps to the normal multiplayer rotation |
| Paid campaign map packs | Backlog | Sell themed map bundles, starting with WW2, after payments infrastructure is live |

## Key Decisions

**Dependencies are explicit:** Sprint 4 and Sprint 5 must ship first. Paid map packs depend on Yandex catalog/payment flow and likely reuse the cosmetics-store surface.

**Server restart UX is now part of Sprint 6:** the task moved from Sprint 3 because the product is functional without it, releases now happen less aggressively, and deployment risk outweighed the current player benefit.

**Free maps ship before paid packs:** historical multiplayer maps are the demand-validation step. They test whether players actually engage with themed content before the project invests in paid campaign production.

**Campaign maps and multiplayer maps are separate products:** multiplayer maps must stay fair under standard rules and support the lobby's player-count range. Campaign maps can be asymmetric, scripted, and historically constrained because they are sold as singleplayer or co-op content.

**Citizenship can absorb map-pack value:** one open product decision is whether paid citizens receive one free map pack, turning citizenship into a stronger content perk rather than a purely cosmetic/status tier.

**Mobile warning moved here intentionally:** it is no longer a Sprint 3 retention task. In Sprint 6 it becomes expectation-setting for mobile users arriving because of new content marketing.

## Consequences

- Sprint 6 is gated by monetization infrastructure, not just map-design capacity
- Content production becomes a first-class delivery constraint alongside engineering work
- The "1–2 free maps per pack" split needs to be locked before any paid map pack launches
- A store/UI reuse path from Sprint 5 should be considered when Sprint 6 implementation briefs are written

## Related

- [[decisions/product-strategy]] — overall sequencing rationale
- [[decisions/sprint-3]] — original home of the mobile warning task before it was moved
- [[decisions/sprint-4]] — payments and citizenship infrastructure Sprint 6 depends on
- [[decisions/sprint-5]] — likely source of reusable store UI and cosmetics infrastructure
