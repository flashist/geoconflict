# ADR-105: Compact maps are out of the public rotation until the `map4x.bin` binaries are regenerated

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; decision made **2026-06-03**, commit `80f4cf4`
  "s4c-disable-compact-public-maps")
- **Deciders:** Owner (Mark Dolbyrev). The preceding runtime-workaround task was **cancelled** by the
  owner after live testing (`ai-agents/tasks/cancelled/0160-fix-compact-map-boat-attack/brief.md`).

## Context

Compact ("Mini") maps are a half-resolution variant — `map4x.bin` at 1000×500 for World instead of the
full 2000×1000 binary (`src/core/game/TerrainMapLoader.ts:87`). They were added to the public rotation
as a match modifier to give shorter, smaller-scale matches.

They carry a **data defect introduced at map-generation time**, confirmed by debug logging on
2026-05-11 (`../compact-map-click-interaction-findings.md`):

Half-resolution downsampling merges narrow coastal features — thin peninsulas, narrow bays, 1-tile
water channels — into land. Territories that **visually** border water end up with the `isShore` bit
cleared on every one of their border tiles. `closestShoreFromPlayer` filters border tiles by
`isShore`, finds zero, and returns `null` — so `targetTransportTile` fails and the **transport-boat
radial action is disabled on coasts that plainly look like coasts.**

This is not a rendering glitch. The binary asserts something false about the terrain, and every
consumer of `isShore` inherits the lie. Boat attacks are a core mechanic, so on affected maps the
match is materially broken for the affected players.

## Decision

**Remove `MINI_MAP_MODIFIER` from the public `MATCH_MODIFIERS` list** — commented out, not deleted —
so no public match is scheduled with `gameMapSize: GameMapSize.Compact`. The modifier definition is
**kept in place** so that re-enabling after the map fix is a one-line change:

```
src/server/MapPlaylist.ts:37-50
  // DISABLED 2026-06-03 (s4c-disable-compact-public-maps): ...
  export const MINI_MAP_MODIFIER: MatchModifier = { id: "mini_map", ... };

  export const MATCH_MODIFIERS: MatchModifier[] = [
    // MINI_MAP_MODIFIER,   // re-enable after 0026-fix-compact-map-shore-generation
    { id: "weird_setting", ... },
  ];
```

The real fix is **regenerating all 30 `map4x.bin` binaries** so downsampling preserves `isShore`,
scoped in `ai-agents/tasks/backlog/0026-fix-compact-map-shore-generation/brief.md`
(`map-generator/map_generator.go`).

Compact maps remain selectable in **single-player and custom/host lobbies**
(`src/client/SinglePlayerModal.ts:336, 558`; `src/client/HostLobbyModal.ts:465, 747`). This decision
governs the **public rotation only** — where the player did not choose the map and cannot avoid it.

## Options considered

- **Take compact maps out of the public rotation until the binaries are fixed (chosen)** — the defect
  is in the data, so the only honest options are "don't serve the bad data" or "fix the data". Serving
  it to players who did not opt in was the part that had to stop immediately; regenerating 30 binaries
  is a real task that could not ship the same day.
- **Runtime fallback in `targetTransportTile`** — relax the `isShore` filter and pick a nearby water
  tile when no shore tile is found (Option 2 in `../compact-map-click-interaction-findings.md`).
  **Tried, then cancelled** (`ai-agents/tasks/cancelled/0160-fix-compact-map-boat-attack/brief.md`). It
  passed synthetic-map unit tests and was **semantically wrong on real maps** — it sent boats to
  coasts the player never targeted. A workaround that guesses at missing terrain data is least
  trustworthy exactly where the data is most degraded. This is the origin of the standing rule that
  spatial gameplay changes must be validated on real maps, not synthetic fixtures.
- **Fix the `bestShoreDeploymentSource` diagonal miss** (Option 3 in the same findings) — a real but
  *separate* defect. It does not address the missing `isShore` bits and would not have restored boat
  attacks on compact maps.
- **Regenerate the maps first and never disable** — rejected on timing. It leaves broken matches live
  in the public rotation for the duration of a map-generation task, an unbounded wait for players who
  cannot opt out.
- **Delete compact-map support entirely** — rejected. The mode is wanted; only its data is wrong.

## Consequences

- **Positive:** no public match can land on the broken mechanic. Players in single-player and custom
  lobbies keep the mode by explicit choice. Re-enabling is one line, with the intent recorded at the
  exact site.
- **Negative / costs:** the public rotation lost a variety lever, and the "Mini" match modifier is
  effectively shipped-but-dark. Compact maps remain reachable in single-player and custom lobbies
  **with the defect still present** — an accepted asymmetry, on the grounds that those players chose
  the map.
- **The defect is not fixed, only avoided.** Every `map4x.bin` still carries wrong `isShore` data, and
  any *other* consumer of `isShore` on a compact map is affected in ways not enumerated here.
- **Stale-doc hazard:** `resources/announcements.json` still contains a player-facing announcement
  saying compact maps are in the public rotation, from before the disable. Player communications, not
  code — but do not treat it as evidence of current state.
- **Residual risks / "re-raise only if":**
  - **`0026-fix-compact-map-shore-generation` lands** and the regenerated binaries preserve `isShore`
    — then re-add `MINI_MAP_MODIFIER` and supersede this ADR. This is the expected exit.
  - **A second `isShore` consumer is found to be broken on compact maps** in single-player or custom
    lobbies badly enough to justify disabling those paths too.
  - **A runtime fix is proposed that is validated on real maps** (not synthetic fixtures) and
    demonstrably targets the correct coast — the cancelled workaround failed *that* bar specifically,
    not the idea of a runtime fix in principle.

  Absent those, a review finding of the form "`MINI_MAP_MODIFIER` is defined but unused", "dead
  commented-out code in `MATCH_MODIFIERS`", or "compact maps are missing from the rotation" is
  **closeout of this ADR, not a new defect.**

## Related

- `src/server/MapPlaylist.ts:37-50` — the disable and its comment, which this ADR formalizes
- `../compact-map-click-interaction-findings.md` — root cause and the three fix options
- `../sprint4b-mini-mode-findings.md` — the mode's original investigation
- `ai-agents/tasks/cancelled/0160-fix-compact-map-boat-attack/brief.md` — the cancelled runtime workaround
- `ai-agents/tasks/backlog/0026-fix-compact-map-shore-generation/brief.md` — the real fix
- `../architecture.md` §9 ("Two features that are present but switched off")
