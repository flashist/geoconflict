# Map Label Density Tuning at Mid-Zoom

## ID
0071

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Follow-up to `0041-map-population-army-labels` (done, agent-closed): the enriched on-map labels (`current / max` troops line, red attacking-troops line) shipped and were live-validated, but the owner judged the result **too cluttered at mid-zoom** (open-questions interview ruling, 2026-08-24). The clutter risk was flagged in `0041`'s own scope ("watch label clutter at mid zoom") — this task is the tuning pass that flag anticipated. Evidence screenshots: `ai-agents/tasks/done/0041-map-population-army-labels/evidence/` (current max-zoom states, red-attack-line before/after).

Pure `src/client/` rendering concern (`NameLayer.ts`), no `src/core/` work.

## What to build

Reduce mid-zoom label clutter without losing the information at close zoom. Candidate levers (coder's plan picks, owner approves):

- Zoom-threshold the enriched lines: below a zoom level, collapse to the pre-`0041` single-line label (or name only), showing the full `current / max` + attack line only near/at max zoom.
- And/or scale/fade secondary lines with zoom; and/or suppress the attack line below a threshold.

Smallest shippable: one tuned threshold behavior in `NameLayer.ts`, judged live by the owner.

## Verification steps

1. Live (or local multi-bot) match: at mid-zoom, labels are visibly less dense than the `0041`-shipped state — compare against the evidence screenshots.
2. At max zoom, the full `0041` information (troops `current / max`, red attacking line) is unchanged.
3. No regression at spawn phase and far zoom (label legibility, no overlap artifacts).
4. Owner eyeballs the result live and accepts the density — this is a judgment-call feature; owner sign-off is the gate.

## Notes

- **Depends on:** nothing (`0041` is done).
- **Blocks:** nothing.
- `0041`'s live validation was singleplayer-only (multiplayer parity, exact-zero case, dark-territory legibility not demonstrated live — per its close note); if this tuning pass happens to run in multiplayer, those residuals could be opportunistically observed, but they are not this task's scope.
