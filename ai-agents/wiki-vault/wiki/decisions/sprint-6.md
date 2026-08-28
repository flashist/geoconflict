# Sprint 6 — More Content

**Date**: 2026-04-17
**Status**: proposed

## Context

Goal: expand the game with historical and thematic map content. The commercial thesis is content-led conversion: use free historical multiplayer maps to validate demand, then sell paid campaign map packs once the Sprint 4 payment infrastructure is in place.

> ⚠️ **Corrected 2026-08-09 — there is no "Sprint 5 cosmetics store".** The plan and this page both previously named one as a Sprint 6 dependency. It does not exist. The purchasable-cosmetics foundation is **Task 9 / `0010` (re-enable flags)** and **Task 9a / `0011` (territory patterns)**, which `plan-index.md:87-88` assigns to Sprint 4 but which appear in **no** sprint plan document — both sit unsprinted and blocked. Sprint 5's own cosmetics item (Task 15, custom uploaded flags/patterns) *also* depends on 9 and 9a. So the real prerequisite for paid map packs is **Tasks 9/9a, which are not scheduled anywhere.** See [[decisions/sprint-backlog]].
>
> ⚠️ **A further prerequisite surfaced 2026-08-09:** cosmetic entitlements (`flares`) currently come from the **upstream OpenFront API**, not Geoconflict's own infrastructure. Selling anything gated by the privilege checker likely requires that to move first — task `0009`. See [[decisions/adr-102-privilege-refresher-fails-open]].

Source: `ai-agents/sprints/plan-sprint-6.md`

## Decision

| Task | Status | Description |
|---|---|---|
| 5b — Server restart UX | Backlog | Moved from Sprint 3; pre-restart warning plus blocking auto-refresh when the server returns |
| 5c — Mobile warning screen | Backlog | Moved from Sprint 3; one-time mobile warning with a "Continue anyway" path |
| Historical multiplayer maps | Backlog | Add 1–2 free historical maps to the normal multiplayer rotation |
| Paid campaign map packs | Backlog | Sell themed map bundles, starting with WW2, after payments infrastructure is live |

## Key Decisions

**Dependencies are explicit:** Sprint 4 (payment infrastructure, citizenship) must ship first. Paid map packs depend on the Yandex catalog and purchase flow being in place — **not** on a Sprint 5 cosmetics store, which does not exist (see the correction above). Whatever purchase UI ships with Tasks 9/9a is the reusable surface.

**Server restart UX is now part of Sprint 6:** the task moved from Sprint 3 because the product is functional without it, releases now happen less aggressively, and deployment risk outweighed the current player benefit.

**Free maps ship before paid packs:** historical multiplayer maps are the demand-validation step. They test whether players actually engage with themed content before the project invests in paid campaign production.

**Campaign maps and multiplayer maps are separate products:** multiplayer maps must stay fair under standard rules and support the lobby's player-count range. Campaign maps can be asymmetric, scripted, and historically constrained because they are sold as singleplayer or co-op content.

**Citizenship can absorb map-pack value:** one open product decision is whether paid citizens receive one free map pack, turning citizenship into a stronger content perk rather than a purely cosmetic/status tier.

**Mobile warning moved here intentionally:** it is no longer a Sprint 3 retention task. In Sprint 6 it becomes expectation-setting for mobile users arriving because of new content marketing.

## Consequences

- Sprint 6 is gated by monetization infrastructure, not just map-design capacity
- Content production becomes a first-class delivery constraint alongside engineering work
- The "1–2 free maps per pack" split needs to be locked before any paid map pack launches
- ~~A store/UI reuse path from Sprint 5 should be considered when Sprint 6 implementation briefs are written~~ — **corrected 2026-08-09: there is no cosmetics store.** Whatever purchase UI ships with Tasks 9/9a (`0010` flags, `0011` territory patterns) is the reusable surface; flag it to the coder when Sprint 6 briefs are written

## Related

- [[decisions/product-strategy]] — overall sequencing rationale
- [[decisions/sprint-3]] — original home of the mobile warning task before it was moved
- [[decisions/sprint-4]] — payments and citizenship infrastructure Sprint 6 depends on
- [[decisions/sprint-5]] — Task 15 (custom uploaded flags/patterns), itself dependent on Tasks 9/9a; **not** a source of store UI
- [[decisions/sprint-backlog]] — tasks `0009`, `0010`, `0011`: the real, unscheduled prerequisites for the paid map-pack purchase surface
- [[decisions/adr-102-privilege-refresher-fails-open]] — the upstream entitlement-origin dependency behind any purchasable cosmetic
- [[decisions/adr-108-active-sprint-pointer]] — this pre-scoped plan is the one `select-active` wrongly returned while all work was on Sprint 4
