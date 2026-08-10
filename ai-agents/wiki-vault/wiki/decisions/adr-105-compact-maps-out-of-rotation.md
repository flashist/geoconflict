# ADR-105 — Compact maps out of the public rotation until the map binaries are regenerated

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-105 — see [[decisions/adr-numbering-two-series]].
> Retro-recorded 2026-08-08; decision made **2026-06-03**. The preceding runtime-workaround task was **cancelled** by the owner after live testing.
>
> Source: `ai-agents/knowledge-base/decisions/adr-105-compact-maps-out-of-public-rotation.md`

## Context

Compact ("Mini") maps are a half-resolution variant — the map binary at 1000×500 for World instead of the full 2000×1000. They were added to the public rotation as a match modifier to give shorter, smaller-scale matches.

They carry a **data defect introduced at map-generation time**, confirmed by debug logging on 2026-05-11. Half-resolution downsampling merges narrow coastal features — thin peninsulas, narrow bays, 1-tile water channels — into land. Territories that **visually** border water end up with the `isShore` bit cleared on every one of their border tiles. The shore lookup filters border tiles by `isShore`, finds zero, returns null, and the **transport-boat radial action is disabled on coasts that plainly look like coasts.**

This is not a rendering glitch. The binary asserts something false about the terrain, and every consumer of `isShore` inherits the lie. Boat attacks are a core mechanic, so on affected maps the match is materially broken for the affected players.

## Decision

**Remove the mini-map modifier from the public match-modifier list** — commented out, not deleted — so no public match is scheduled at compact size. The modifier definition is **kept in place** so re-enabling after the map fix is a one-line change.

The real fix is **regenerating all 30 map binaries** so downsampling preserves `isShore`, scoped as a Sprint 5 backlog task against the Go map generator.

Compact maps remain selectable in **single-player and custom/host lobbies**. This decision governs the **public rotation only** — where the player did not choose the map and cannot avoid it.

**Options rejected:** a runtime fallback that relaxes the `isShore` filter and picks a nearby water tile — **tried, then cancelled**. It passed synthetic-map unit tests and was **semantically wrong on real maps**, sending boats to coasts the player never targeted. A workaround that guesses at missing terrain data is least trustworthy exactly where the data is most degraded. *This is the origin of the standing rule that spatial gameplay changes must be validated on real maps, not synthetic fixtures.* Also rejected: fixing a separate diagonal-miss defect in shore deployment (real, but it would not restore boat attacks); regenerating the maps first and never disabling (leaves broken matches live for the duration of a map-generation task, an unbounded wait for players who cannot opt out); and deleting compact-map support (the mode is wanted, only its data is wrong).

## Consequences

- **Positive** — no public match can land on the broken mechanic. Single-player and custom-lobby players keep the mode by explicit choice. Re-enabling is one line, with the intent recorded at the exact site.
- **Negative** — the public rotation lost a variety lever, and the "Mini" modifier is effectively shipped-but-dark. Compact maps remain reachable in single-player and custom lobbies **with the defect still present** — an accepted asymmetry, on the grounds that those players chose the map.
- **The defect is not fixed, only avoided.** Every map binary still carries wrong `isShore` data, and any *other* consumer of `isShore` on a compact map is affected in ways not enumerated here.
- **Stale-doc hazard:** `resources/announcements.json` still contains a player-facing announcement saying compact maps are in the public rotation, from before the disable. Player communications, not code — but do not treat it as evidence of current state.
- **Re-raise only if:** the map-regeneration task lands and the new binaries preserve `isShore` (the expected exit); a second `isShore` consumer is found broken badly enough to justify disabling single-player too; or a runtime fix is proposed that is **validated on real maps** and demonstrably targets the correct coast — the cancelled workaround failed *that* bar specifically, not the idea of a runtime fix in principle. Absent those, a finding of the form *"the mini-map modifier is defined but unused"*, *"dead commented-out code in the modifier list"*, or *"compact maps are missing from the rotation"* is **closeout of this ADR, not a new defect**.

## Related

- [[tasks/disable-compact-public-maps]] — the Sprint 4c task that shipped the disable
- [[tasks/compact-map-click-interaction]] — the investigation that found the missing shore bits
- [[tasks/sprint4b-compact-map-rotation]] — the Sprint 4b task that added compact maps to the rotation
- [[tasks/sprint4b-mini-mode-investigation]] — the mode's original investigation
- [[decisions/cancelled-tasks]] — the cancelled runtime workaround
- [[decisions/sprint-5]] — where the map-regeneration fix is scheduled
- [[systems/architecture-overview]] — §features switched off
- [[decisions/adr-numbering-two-series]] — the ADR number bands
