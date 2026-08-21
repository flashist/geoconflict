# Map Labels: Troops/Max + Attacking Troops

**Source**: `ai-agents/tasks/done/0041-map-population-army-labels/brief.md` (plus `plan.md`, `worklog.md`, `review.md`, `evidence/` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0041 / independent client enhancement

## Goal

Make the on-map country label carry the same troop information as the hover panel (`PlayerInfoOverlay`): the troops line becomes `current / max` (e.g. `10K / 100K`), and countries with outgoing attacks show their total attacking troops on a new red line below it.

Terminology note carried from the brief: the request said "population", but the on-map number is **troops** (`player.troops()`), capped by `config.maxTroops(player)` — the same values the hover panel shows. Workers-sense population is not involved.

## Key Changes

Single file — `src/client/graphics/layers/NameLayer.ts` (no `src/core/` change; all data already exists client-side on `PlayerView` + config):

- Troops line at both the create and refresh sites: `` `${renderTroops(player.troops())} / ${renderTroops(config.maxTroops(player))}` `` — `renderTroops` used for both values, consistent with the rest of the UI.
- New `div.player-attack-troops` line after the troops div: red `#f87171` (matching the overlay's `text-red-400`), dark text-shadow halo for legibility, hidden by default. Refresh sums `outgoingAttacks().map(a => a.troops)`; shows `renderTroops(total)` at label font size when ≥ 1, hides otherwise. Color deliberately not theme-driven — stays red.
- Zoom/visibility gating unchanged — both new pieces live inside the existing label element, so `updateElementVisibility()` covers them.
- **Review fix R1** (the round's only finding, verified CORRECT): the label lays out at min-content inside a zero-width fixed container, so the new spaced text wrapped onto two lines for narrow names — fixed with `white-space: nowrap` on the troops div (and defensively on the attack line).

## Outcome

Shipped to all players (no A/B). Verified: lint/tsc clean, full suite green (87 suites / 691 tests), and a live singleplayer run with 8 evidence screenshots covering the `current / max` format, hover-panel parity spot check, the red attack line's appear→update→disappear lifecycle, a DOM probe of all 217 labels, the 360×430 Yandex-iframe viewport, and the post-fix nowrap proof.

**Carried caveats (agent-closed, not owner-verified):**

- Live validation was **singleplayer-only** — multiplayer parity, the exact-zero attacking-troops case, and red-line legibility over dark territory colors were not demonstrated live (same code path in all cases; unit-level risk judged low).
- The 360×430 HUD density observed is **pre-existing**, not introduced here; the final clutter judgment is the owner's, with a cheap follow-up available (gate the max/attack lines to a higher zoom) if mid-zoom reads as cluttered.
- Accepted residuals: zero-troop labels show `0 / max` (owner-approved — the map label is always-shown, unlike the overlay); stale-while-hidden refresh (~500ms throttle) is pre-existing NameLayer behavior.

## Related

- [[systems/rendering]] — NameLayer is one of the layered client rendering surfaces
- [[decisions/sprint-4]] — carried as an independent Sprint 4 enhancement outside the citizenship/payments track
