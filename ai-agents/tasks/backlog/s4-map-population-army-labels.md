# Task — Map Labels: Show Troops/Max + Attacking Troops

## Sprint
Sprint 4

## Priority
Medium — player-facing readability/feature enhancement. Independent, no dependencies on the citizenship/payments track. Ships to all players.

## Experiments
❌ Excluded — informational UI enhancement, ships to all.

## Scope
`src/client/graphics/layers/NameLayer.ts` only. **No `src/core/` changes** — all required data is already available client-side (proven by `PlayerInfoOverlay`, which displays the same values today).

---

## Context

On the map, each country renders a name + a single number underneath it (visible only at certain zoom levels — this is existing, intentional behaviour). That number is the player's **troops** (army), rendered by `NameLayer.ts`:

```ts
troopsDiv.textContent = renderTroops(player.troops());   // NameLayer.ts:272 (create) and :368 (refresh)
```

> **Terminology note:** the user request calls this "population," but in the codebase the on-map number — and the value the hover panel shows — is **troops** (`player.troops()`), with the cap being **maxTroops** (`config.maxTroops(player)`). This task mirrors the hover panel exactly, so it uses those same values. (Total "population" = workers + troops is a different concept and is **not** what is shown here.)

We want the map label to carry more of the same information already shown in the hover info panel (`PlayerInfoOverlay`, the small panel that appears top-right when the mouse is over a country):

1. **Current + max on the troops line** — e.g. `10K / 100K` instead of just `10K`.
2. **Attacking troops on a new line, in red** — when the country has outgoing attacks, show the total attacking troop count below the troops line, in red.

The behaviour and data must match `PlayerInfoOverlay` — same numbers, same red treatment for attacking troops.

---

## Reference: the data already exists (reuse it verbatim)

`PlayerInfoOverlay.renderPlayerInfo()` (`src/client/graphics/layers/PlayerInfoOverlay.ts:225-352`) already computes all three values from the client `PlayerView` + config:

```ts
const attackingTroops = player
  .outgoingAttacks()
  .map((a) => a.troops)
  .reduce((a, b) => a + b, 0);
const maxTroops = this.game.config().maxTroops(player);
// current troops: player.troops()
// formatting: renderTroops(...)
// attacking troops are rendered with class "text-red-400" (red)
```

`NameLayer` already imports `renderTroops` from `../../Utils` and holds a `GameView` (`this.game`) and per-player `PlayerView` (`render.player`), so every accessor above is directly available — no new imports beyond what's present.

---

## What to build (implementation guidance)

All changes are in `NameLayer.ts`. The on-map label is a DOM element built in `createPlayerElement()` (column flexbox: icons → name → troops) and refreshed in `renderPlayerInfo()`.

### 1. Troops line → `current / max`

- In `createPlayerElement()` (~line 272) and the refresh path in `renderPlayerInfo()` (~line 368), change the troops text from `renderTroops(player.troops())` to a `current / max` form:
  - `` `${renderTroops(player.troops())} / ${renderTroops(this.game.config().maxTroops(player))}` ``
- Keep using `renderTroops` for **both** values (consistent formatting/scaling with the rest of the UI). Do not hand-roll number formatting.

### 2. New red "attacking troops" line

- In `createPlayerElement()`, add a new line element (e.g. `.player-attack-troops`) **after** the troops div. Because the container is `flex-direction: column`, it naturally renders on the next line. Start it hidden.
  - Style it red — match the overlay's `text-red-400` (≈ `#f87171`). Use the same `fontFamily` as the troops div. Consider a subtle dark text-shadow/outline for legibility over light territory colours (recommended, not required).
- In `renderPlayerInfo()`, in the same block that updates `troopsDiv` font size/colour (~lines 366-368):
  - Compute `attackingTroops` exactly as the overlay does (`render.player.outgoingAttacks().map((a) => a.troops).reduce((a, b) => a + b, 0)`).
  - If `attackingTroops >= 1`: set the line's `textContent = renderTroops(attackingTroops)`, set `display`, and scale its `fontSize` to `render.fontSize` (like the troops div). Keep the colour red regardless of theme.
  - Else: hide the line (`display = "none"` / empty text) so non-attacking countries show nothing extra.

### 3. Zoom / visibility — no change

The whole label element is already shown/hidden by `updateElementVisibility()` based on zoom scale and on-screen tests ("only at certain scale"). Both new pieces live **inside** that element, so they inherit the existing visibility gating automatically. Do **not** change the zoom thresholds.

---

## Out of scope

- No `src/core/` / game-model / view-data changes — the data is already on `PlayerView` and `config`.
- Do not modify `PlayerInfoOverlay` (the hover panel) or `PlayerPanel` (the click panel).
- No change to when labels appear / disappear (zoom thresholds stay as-is).
- "Population" in the workers-sense is not introduced — this is the troops/maxTroops values only, matching existing UI.

---

## Verification (visual / live — no unit tests required, client-only change)

1. **Troops line:** at zoom levels where country labels are visible, the troops line shows `current / max` (e.g. `10K / 100K`). The max matches the hover overlay's `maxTroops` value for the same country.
2. **Attacking line:** observe a country with an active outgoing attack — a **red** number appears on the line below the troops line, equal to the overlay's attacking-troops total. It disappears when the attack ends. Non-attacking countries show no extra line.
3. **Parity:** numbers match `PlayerInfoOverlay` for the same country (same data source).
4. **Legibility:** red attack number is readable over both light and dark territory colours; lines don't overflow or visually collide at small label sizes / mid zoom.
5. **Small viewport:** sanity-check on the 360×430 Yandex iframe size — labels remain legible, not overly cluttered.
6. `npm run lint`; `npm test` (existing suite stays green; no new `src/core/` tests since there is no core change).

---

## Notes

- **Feasibility is confirmed** — `PlayerInfoOverlay` already renders all three values from identical client-side accessors, so no investigation task and no server/view plumbing is needed. This is a contained client rendering change.
- **No new localization strings** — the label is numeric (`current / max` and a red number), no label text. If any text label is added during implementation, it must go through `translateText()` and be added to **both** `en.json` and `ru.json`.
- **No analytics** — this is a passive display change with no new user action to instrument. (Conscious decision, not an omission — there is no funnel/event to gate the release on.)
- **Visual-density watch:** this adds up to a few extra characters plus a possible second line to every visible country label. Verify it doesn't overwhelm the map at mid zoom. If it reads as cluttered live, a cheap follow-up is to gate the max/attack lines to a slightly higher zoom than the base troops line — flag for Mark after seeing it in-game, not pre-emptively.
- **Performance:** per-refresh per-player computation is trivial and `NameLayer` already throttles refreshes (~500ms); no concern.
- **No template changes:** `NameLayer` builds its own DOM at runtime, so the "update both HTML templates" rule does not apply here.
