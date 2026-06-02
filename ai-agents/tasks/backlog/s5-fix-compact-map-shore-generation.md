# Task — Fix Compact Map Shore Generation (Map Generator)

## Sprint
Sprint 5 — Backlog (high effort, requires full map regeneration)

## Priority
Low — the Sprint 4c runtime fallback (`s4c-fix-compact-map-boat-attack.md`) restores boat-attack functionality. This task corrects the underlying data defect and should ship when map regeneration is practical.

---

## Context

Compact maps (`map4x.bin`) lose `isShore` and `isOceanShore` designations for coastal tiles during the half-resolution downsampling step in the Go map generator. Narrow peninsulas, thin bays, and 1-tile-wide water channels can be merged into land at 4× downscale, causing border tiles that clearly touch water in the full-resolution map to have no water-adjacent neighbor in the compact binary.

`isOceanShore` uses 4-directional (`N/S/E/W`) neighbor checks only, which makes the downsampling loss worse:

```go
// GameMap.ts equivalent — the check that fails on compact maps
isOceanShore(ref: TileRef): boolean {
  return this.isLand(ref) && this.neighbors(ref).some((tr) => this.isOcean(tr));
}
```

All 30 compact map binaries are potentially affected. World is confirmed broken by live debugging on 2026-05-11 despite not appearing in the earlier Sprint 4b audit. The audit list should not be treated as exhaustive.

Full investigation: `ai-agents/knowledge-base/compact-map-click-interaction-findings.md`
Earlier terrain audit: `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md`

---

## What to Build

### 1. Fix shore-bit preservation in the Go map generator

In `map-generator/map_generator.go`, update the compact-map generation step so that when a compact tile is written:

- If **any** tile in the corresponding 2×2 block of the full-resolution map is `isShore` or `isOceanShore`, the compact tile inherits that designation.

This ensures no coastal information is silently lost during downsampling. The fix should be applied to both `isShore` and `isOceanShore` bit fields.

Verify the fix is correct by sampling a few known-broken maps (World, Asia, Europe) before regenerating everything.

### 2. Regenerate all 30 compact map binaries

Run `npm run gen-maps` to regenerate all `map4x.bin` files after the generator fix is confirmed correct. The 30 affected maps are listed in the investigation findings.

Spot-check the regenerated binaries:
- Pick 3–5 maps from the list of known-worst maps (Asia, Black Sea, Europe, Mena, North America, Pangaea, World).
- In a compact game on each, right-click a visually coastal territory and confirm the boat-attack icon is active without the runtime fallback.

### 3. Remove or demote the runtime fallback

Once the regenerated binaries are deployed and confirmed correct in production, the runtime fallback added by `s4c-fix-compact-map-boat-attack.md` can be removed (or demoted to a defence-in-depth guard with a lower search radius). Decide at implementation time based on the confidence level of the generator fix.

**Exactly what s4c added (cleanup checklist).** All in `src/core/game/TransportShipUtils.ts`:

1. **`closestShoreFallback(gm, tile, searchDist)`** — a module-private helper (sits just below `closestShoreTN`). It runs an ownership-agnostic BFS bounded only by Manhattan distance and returns the nearest `isShore` tile, or `null`. Delete this function when removing the fallback.
2. **The fallback wiring in `targetTransportTile`** — inside the `if (dst.isPlayer())` branch, immediately after `dstTile = closestShoreFromPlayer(...)`, there is a comment block plus the line:
   ```typescript
   dstTile ??= closestShoreFallback(gm, tile, 50);
   ```
   To fully remove: delete that line and its comment block, leaving the branch as just `dstTile = closestShoreFromPlayer(gm, dst as Player, tile);` (the original pre-s4c behavior). The `else` (neutral-target) branch was never touched by s4c — leave it alone.
3. **Tests** — `tests/TransportShipUtils.test.ts`:
   - `"falls back to a nearby shore when the target player's border tiles have no isShore"` is the fallback-specific regression test. If the fallback is **removed**, delete this test (it asserts the fallback behavior). If the fallback is **kept** as defence-in-depth, keep it (and update the asserted radius if you lower it).
   - `"returns null when no shore exists within range (genuinely landlocked)"` and `"is unchanged when the target player has shore tiles (fallback not taken)"` assert general `targetTransportTile` behavior that holds with or without the fallback — keep both regardless.

**Verification after removal:** with the regenerated binaries in place, the new `tests/TransportShipUtils.test.ts` landlocked/unchanged cases and the existing `tests/Attack.test.ts` must still pass, and a compact World game must show the boat-attack icon active on coastal territories *without* the fallback (i.e. `closestShoreFromPlayer` now succeeds because the data is correct).

> Note: do **not** remove the fallback until the regenerated binaries are confirmed in production. Removing it first re-opens the live boat-attack bug that s4c closed.

---

## Verification

1. In a compact World game, right-click a coastal territory — boat-attack icon is active (no runtime fallback needed to make it work).
2. `isShore` returns true for tiles that border water in the compact binary, for at least the confirmed-broken maps.
3. No shore designations are removed from tiles that were correct before the fix (regression check on a full-resolution map game).
4. Existing transport-ship tests pass.
5. Confirm in Uptrace (or local testing) that no new map loading or tile classification errors appear after the binary update.

---

## Notes

- The immediate boat-attack fix for players is covered by `s4c-fix-compact-map-boat-attack.md`. Do not block that task on this one.
- Regenerating all 30 binaries takes time (`npm run gen-maps` runs the Go generator for each map). Budget for this in sprint planning — it is not a quick code change.
- The Sprint 4b audit flagged six worst-case maps (Asia, Black Sea, Europe, Mena, North America, Pangaea). World is confirmed broken but was not on that list — treat all 30 as potentially affected.
- Secondary issue — `bestShoreDeploymentSource` diagonal miss in `TransportShipUtils.ts` — is a separate low-severity defect. If this task is in scope, it can be fixed alongside (change `neighbors()` to 8-directional for that one call). Not required to ship this task.
