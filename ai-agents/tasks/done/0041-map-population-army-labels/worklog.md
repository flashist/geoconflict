# Worklog — 0041 Map Labels: Troops/Max + Attacking Troops

Build executed 2026-08-14 by the fkit-coder Build worker under `/fkit-sprint-ship-loop`
(declared owner approval of `plan.md` in the lead session, 2026-08-14).

## Changes

One source file, exactly as planned — `src/client/graphics/layers/NameLayer.ts`:

1. **Troops line → `current / max`** at both sites:
   - `createPlayerElement()`: `troopsDiv.textContent` now
     `` `${renderTroops(player.troops())} / ${renderTroops(this.game.config().maxTroops(player))}` ``
   - `renderPlayerInfo()` refresh path: same format with `render.player`; `maxTroops` recomputed
     each refresh.
2. **New red attacking-troops line** (`div.player-attack-troops`) appended after `troopsDiv` in
   `createPlayerElement()`: `translate="no"`, `color: #f87171`,
   `textShadow: "0 0 2px rgba(0,0,0,0.7)"` (owner-approved default), theme font, `zIndex 3`,
   `marginTop -5%`, initial `display: none`.
3. **Refresh logic** in `renderPlayerInfo()`: queries `.player-attack-troops` alongside the other
   selectors; sums `render.player.outgoingAttacks().map(a => a.troops)`; at `>= 1` shows
   `renderTroops(total)` at `render.fontSize`, else hides and clears. Color deliberately NOT set
   from `render.fontColor` — stays red per plan.

Signatures re-verified before coding: `Config.maxTroops(player: Player | PlayerView)`
(`Config.ts:142`, `DefaultConfig.ts:915`), `PlayerView.outgoingAttacks(): AttackUpdate[]`
(`GameView.ts:291`), `renderTroops` (`Utils.ts:26`).

No other files touched. Pre-existing working-tree changes (0019/0046/0049 closes etc.) left as-is.

## Verification

- `npm run lint` — clean.
- `npm test` — **87 suites / 691 tests, all pass** (no core change; NameLayer has no test file).
- **Live validation** (`npm run dev`, Playwright at localhost:9000, singleplayer custom game on
  Europe (classic), 400 bots, Free-for-All, Balanced). Evidence in `evidence/`:
  - `01-spawn-phase-labels-current-max.png` — spawn phase: bot labels already show `current / max`
    (Nianbos Republic 677 / 7.09K; Luzu Province 1.24K / 6.27K).
  - `02-game-labels-current-max.png` — in-game: all labels `current / max`; bot red attack lines
    visible (e.g. 349 under Luzu Province).
  - `03-own-label-current-max.png` — own label "Anon7621 13.7K / 16.1K"; hover panel parity spot
    check (Antiash Region label 10.2K/11.1K vs panel Troops 10.2K / Max 11.1K at capture tick).
  - `04-red-attack-line-visible.png` — **own attack in flight**: red "215" under own label while
    events panel shows the outgoing attack on Antiash Region; huge bot attack "52.4K" red line
    under Landfin M — legible over light terrain thanks to the shadow.
  - `05-red-attack-line-gone-after-attack.png` — 3s later: own red line gone (attack ended);
    Landfin M's line updated 52.4K → 48.4K. Appear→update→disappear lifecycle confirmed.
  - DOM probe (browser_evaluate): 217 label elements all carry `.player-attack-troops`; 6 visible
    at probe time; all `rgb(248,113,113)` + shadow; fontSize scales with label (4px at min);
    troops siblings all `current / max` format.
  - `06/07-small-viewport-360x430-*.png` — Yandex-iframe-size sanity check: labels render
    `current / max` legibly (Neseiapa Queendom 7.57K / 12.9K); HUD (leaderboard + control panel)
    occupies most of the 360×430 viewport — **pre-existing density issue, not introduced by this
    change**; final clutter judgment left to the owner per plan.

### Honest coverage gaps

- **Multiplayer parity not demonstrated** — validated in singleplayer only (bots + own player).
  The label layer is identical client code in both modes, but no live multiplayer session was run.
- **Zero-troop `0 / max` case not directly observed** — no player was at exactly 0 troops while
  visible; behavior is the same code path as any other value.
- **Dark territory colors** — red line was verified over light/tan and pink terrain; no very dark
  territory happened to attack near the viewport. Shadow is a halo, so risk is low, but not shown.
- **Alliance/team modes** untested (out of plan scope).
- Screenshots are from the standalone `index.html` entry, not the Yandex iframe template (both
  load the same bundle; NameLayer builds DOM at runtime — no template edit involved).

Dev server killed after validation; ports 9000/3001/3002 freed (verified via lsof).
Port 3001 was free before start (no squatters).

## Decision log (unattended fixes / obvious-winner calls)

none — the implementation followed the approved plan exactly; no review findings processed, no
out-of-plan decisions made.

### 2026-08-14 — process-review round 1 (sprint-ship-loop Process-review worker)

- **R1 (unattended fix, standing approval):** Reviewer's R1 — troops line wraps into two lines
  when the player name is narrower than the `current / max` string. Verified CORRECT in code:
  label container is zero-width `position:fixed` (NameLayer.ts:113-119), label element
  `position:absolute` (:215) → min-content layout; `nameDiv` had `white-space: nowrap` (:256)
  but `troopsDiv`/`attackTroopsDiv` did not, and the new text's spaces are break opportunities.
  Confirmed in build's own evidence/04 (Landfin M, Arusbel M, Anon7621 all wrapped).
  **Change:** `troopsDiv.style.whiteSpace = "nowrap"` (:275) + defensively
  `attackTroopsDiv.style.whiteSpace = "nowrap"` (:287), creation-time, NameLayer.ts only.
  **Why it qualified:** verified-CORRECT + mechanical/localized (two static style lines) +
  in-plan (makes the plan's intended single-line rendering correct; adds no behavior).
  **Verified:** lint clean; `tsc --noEmit` clean; 87/87 suites, 691/691 tests pass; live
  re-check in singleplayer — evidence/08-nowrap-fix.png shows short-named "Anon7621" with
  "12.1K / 12.1K" on one line (troops string wider than name — the previously-wrapping
  geometry). Dev server killed after; ports 9000/3001 verified free.
- No other findings this round; no obvious-winner calls beyond R1.
