# Task — Defense Post Range: Show Faint Area for Already-Built Posts

## Sprint
Backlog (unsprinted) — independent client-side feature, no dependency on the citizenship/payments track. Ships to all players.

## Priority
Low–Medium — map-readability/polish enhancement. Self-contained, no blockers.

## Experiments
❌ Excluded — passive visual enhancement, ships to all players.

## Scope
`src/client/` only. **No `src/core/` changes** — the range value (`config().defensePostRange()`) and all unit data are already available client-side (the build-ghost preview already uses them). Desync-safe: rendering-only, no game-state mutation.

---

## Context

When a player is **planning** to build a Defense Post, the game shows its coverage area: `StructureDrawingUtils.createRange()` (`src/client/graphics/layers/StructureDrawingUtils.ts:427`) draws a translucent circle (white, fill α≈0.2, stroke α≈0.5) of radius `config().defensePostRange()` at the cursor ghost.

Once the post is **built**, that area disappears — there is no persistent indicator of a built Defense Post's defensive radius. (Compare SAM Launchers, which have a dedicated `SAMRadiusLayer.ts` that outlines the union of all built SAM ranges — but even that only strokes while the player is hovering the build option or placing a ghost.)

**The ask:** show the Defense Post coverage area *faintly and always-on* for posts that are already built, so players can see defensive coverage at a glance without planning a build.

> **Note — existing Defense Post visual is different.** `TerritoryLayer.ts` (lines ~108, ~525) already uses `defensePostRange()` to **thicken the territory border** inside a post's range (the "defended border" emphasis). That is a border treatment, not a range circle. This task adds the circular coverage area; the two should coexist without fighting visually — verify together.

---

## Locked decisions (with Mark, 2026-06-20)

| Decision | Choice |
|---|---|
| **Which buildings** | **Defense Posts only.** SAM Launchers are out of scope (they already have hover/ghost-gated coverage; not changing that here). |
| **Whose posts** | **All players, including enemies.** Every visible built Defense Post shows its area, regardless of owner. |
| **Display mode** | **Always-on, faint.** Persistent low-opacity area for every built post. Not hover-gated, not a toggle. |

---

## What to build (implementation guidance)

Add an always-on layer that renders a faint coverage area for every active Defense Post on the map, for all owners. **Model it on `SAMRadiusLayer.ts`** — that layer already solves the same shape of problem (track units of one type via `GameUpdateType.Unit`, collect circle centers, draw a per-owner *union* outline, redraw on transform change). Do **not** invent a parallel approach.

1. **New layer** `src/client/graphics/layers/DefensePostRangeLayer.ts` (or extend the SAM layer's pattern):
   - Track `UnitType.DefensePost` units the same way `SAMRadiusLayer` tracks `SAMLauncher` (`tick()` consumes `updatesSinceLastTick()[GameUpdateType.Unit]`, filtering `isActive()`).
   - Circle radius = `this.game.config().defensePostRange()`, centered on each post's tile (`game.x(tile)/game.y(tile)`).
   - `shouldTransform(): true` (world-space).

2. **Always-on faint styling** — unlike `SAMRadiusLayer` (which gates the stroke on `showStroke`), this layer renders unconditionally. "Faint" must be tuned **live** — start fainter than the 0.2 build-ghost preview, since many posts render at once (suggested starting point: fill α≈0.06–0.10, thin stroke α≈0.2–0.3). No animation (the dashed/rotating treatment is reserved for the active-planning state).

3. **Reuse the per-owner union merge** from `SAMRadiusLayer.drawCirclesUnion()` to keep overlapping same-owner circles readable as one combined shape rather than a tangle of rings. This is the main clutter mitigation — it matters more here than for SAMs because posts are far more numerous.

4. **Register the layer** in `GameRenderer.ts` (mirror the `samRadiusLayer` construction ~line 208 and its placement in the layer array ~line 251). Mind layer order — it should sit under structure icons/units so it reads as ground coverage, not on top of pieces.

### Open tuning decisions (resolve during implementation + live QA, not blocking)
- **Owner tinting:** neutral faint fill for everyone, or tint each owner's area by their territory color (the SAM union already separates segments by owner)? A subtle owner-color tint helps tell whose coverage it is; neutral is cleaner but ambiguous. Try owner-tint first, fall back to neutral if it's noisy.
- **Zoom behavior:** consider fading the area out at far zoom-out if the all-players view becomes a wash (optional; only if live QA shows it's needed).

---

## Verification (live, on real maps)

This is a passive visual; **verification is live visual QA, not analytics** — there is no user interaction or state change to instrument, so no analytics event is warranted (call this out so the "analytics shipping gate" isn't mistakenly applied here).

- Build a Defense Post → its faint area appears immediately and persists (no hover/ghost needed).
- Enemy and allied posts also show their areas (all-players requirement).
- **Clutter check — the #1 risk:** join a busy public match where many players have multiple posts. Confirm the all-players always-on areas are still readable and don't wash out the map, especially at mid/low zoom. Tune opacity / union / tinting until acceptable.
- **Coexistence:** confirm the new circle reads cleanly alongside the existing `TerritoryLayer` defended-border thickening.
- **Performance:** watch redraw cost at high post counts + low zoom (many circles re-unioned per transform change). `SAMRadiusLayer` redraws on `transformHandler.hasChanged()` / `needsRedraw`; keep the same gating — do not redraw every frame.
- Post destroyed/captured → its area updates (removed, or re-tinted to the new owner).

---

## Notes
- Pure `src/client/` rendering change; no schema, no server, no core simulation — low risk, no desync surface.
- `SAMRadiusLayer.ts` is the reference implementation for the layer pattern and the union-outline math; reuse it rather than rewriting.
- Scope is intentionally Defense-Post-only — do not touch SAM behavior in this task.
