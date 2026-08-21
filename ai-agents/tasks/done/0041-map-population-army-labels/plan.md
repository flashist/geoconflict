# Approved Plan — 0041 Map Labels: Troops/Max + Attacking Troops

> Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-08-14, during a
> `/fkit-sprint-ship-loop` run. Owner ruling at the gate: plan approved including the two defaults —
> zero-troop labels show `0 / max`, and the red attacking-troops line carries a subtle dark
> text-shadow.
> Plan body below is the coder plan-worker's returned text, copied verbatim by the driver.

# Implementation Plan — 0041 Map Labels: Troops/Max + Attacking Troops

## Grounding (verified against current working tree)

- `src/client/graphics/layers/NameLayer.ts` is the real label layer; brief's line refs are accurate: troops text set at `:272` (create) and `:368` (refresh). Label element is a column flexbox (`:216-218`), so appended children stack as new lines.
- `config.maxTroops(player)` accepts a `PlayerView` directly (`DefaultConfig.ts:915` — `maxTroops(player: Player | PlayerView)`), so no core change needed.
- `PlayerView.outgoingAttacks(): AttackUpdate[]` with `.troops` exists (`GameView.ts:291`).
- `renderTroops` = `renderNumber(troops / 10)` (`src/client/Utils.ts:26`) — used for all three values, matching `PlayerInfoOverlay` (which uses identical accessors and `text-red-400` for attacking troops).
- Visibility gating (`updateElementVisibility`, `:132-154`) hides the whole element — new children inherit it for free. Refresh path is throttled per-player at ~500ms and early-returns while hidden (`:335-343`).

## Changes — one file only: `src/client/graphics/layers/NameLayer.ts`

**Step 1 — troops line becomes `current / max`** (two sites):
- `createPlayerElement()` `:272` and `renderPlayerInfo()` `:368`:
  `` `${renderTroops(player.troops())} / ${renderTroops(this.game.config().maxTroops(player))}` ``
  (`render.player` on the refresh path). `renderTroops` for both values — no hand-rolled formatting. `maxTroops` recomputed each refresh, so it tracks city/structure growth correctly.

**Step 2 — new red attacking-troops line** in `createPlayerElement()`, appended **after** `troopsDiv`:
- `div.player-attack-troops`, `translate="no"` (same as troops div), `color: #f87171` (≈ Tailwind `text-red-400`, matching the overlay), `fontFamily: this.theme.font()`, `zIndex: 3`, `marginTop: "-5%"` (matches troops div spacing), initial `display: "none"`.
- Legibility (brief-recommended): `textShadow: "0 0 2px rgba(0,0,0,0.7)"` — a subtle dark halo so red reads over light territory colors. Static style, set once at creation.

**Step 3 — refresh logic** in `renderPlayerInfo()`, in the same block that updates `troopsDiv` (`:366-368`):
- Query `.player-attack-troops` once alongside the other querySelectors.
- `const attackingTroops = render.player.outgoingAttacks().map((a) => a.troops).reduce((a, b) => a + b, 0);` — verbatim the overlay's computation.
- `attackingTroops >= 1` (overlay's exact threshold): `textContent = renderTroops(attackingTroops)`, `fontSize = render.fontSize px`, `display = "block"`.
- Else: `display = "none"` and clear `textContent`.
- **Deliberately do NOT set its color from `render.fontColor`** — the troops div gets theme text color per refresh; the attack line stays red regardless of theme (brief requirement).

## Edge cases accounted for

- **Stale-while-hidden:** refresh early-returns when the element is display-none, so a label re-entering view can show up-to-500ms-stale numbers. Pre-existing behavior for the troops number; the new lines inherit it identically. Not a defect; no change.
- **`troops() === 0`:** map label currently shows `0`; it will show `0 / <max>`. The overlay hides its troops row at 0, but the map label never did — keeping always-shown preserves existing label behavior. (Flagging as a chosen default, not a question.)
- **Attack ends between refreshes:** line disappears on next per-player refresh (≤ ~600ms incl. jitter). Matches existing label latency.
- **Tiny fontSize (min 4px):** attack line scales with `render.fontSize` exactly like the troops div; no separate minimum.
- **No leaks:** element removal on death (`:314-317`) removes children with it.

## Explicit non-changes

- No `src/core/` edits → no new unit tests mandated. No zoom-threshold changes. No `PlayerInfoOverlay`/`PlayerPanel` edits. No localization strings (numeric-only content; `translate="no"` set). No HTML template edits (NameLayer builds DOM at runtime). No analytics (brief: conscious decision).

## Performance

Added per-refresh cost: one `maxTroops()` call + one map/reduce over `outgoingAttacks()` (typically 0–3 entries) per player per ~500ms refresh — negligible against the existing icon-diffing work in the same function. `npm run perf` exists but exercises core sim, not this DOM layer; not planned to run. No per-frame cost added (per-frame path only moves the container transform).

## Verification plan

1. `npm run lint`; `npm test` (suite stays green — no core change; NameLayer has no existing test file).
2. **Live validation (mandatory — spatial/visual changes have bitten before when only tested synthetically):** `npm run dev`, join a game:
   - labels show `current / max` at label-visible zooms; max matches hover overlay for same country;
   - trigger/observe an outgoing attack → red line appears below troops, equals overlay's attacking total, disappears when attack ends; non-attacking countries show nothing extra;
   - legibility over light + dark territory colors; no overflow/collision at small label sizes;
   - 360×430 viewport sanity-check (Yandex iframe size) — clutter judgment per brief's visual-density watch, flagged to owner after seeing it in-game, not pre-emptively.

## Sequencing

Single small change set: Step 1+2+3 in one edit pass, then lint/test, then live check. No dependencies, no blockers; does not touch anything 0019/0046 landed.
