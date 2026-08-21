# Review — 0041

Task: ai-agents/tasks/done/0041-map-population-army-labels/brief.md
File(s) under review: src/client/graphics/layers/NameLayer.ts (vs 6462e59)
Status: closed-out

## Reviewer findings
| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | med  | src/client/graphics/layers/NameLayer.ts:269-277 | Troops line wraps onto two lines for any player whose name is narrower than the `current / max` string: the label element is `position:absolute` inside a zero-width `position:fixed` container, so it lays out at min-content, and `troopsDiv` sets no `white-space: nowrap` (unlike `nameDiv`, :256). Pre-change the text was a single token and could never wrap; the new text contains spaces, so it breaks at them — visible in the task's own evidence (`evidence/04-red-attack-line-visible.png`: "Landfin M" shows "39.1K /" then "115K" stacked; same for "Arusbel M" and the own label "Anon7621"; `evidence/02` left edge too). Also pushes the red attack line a row further down. Fix: set `troopsDiv.style.whiteSpace = "nowrap"` at creation (defensively also on `attackTroopsDiv`, though its content is a single token today). |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect | Added `whiteSpace = "nowrap"` to `troopsDiv` (NameLayer.ts:275) and defensively to `attackTroopsDiv` (:287) at creation. Verified in code (container is zero-width `position:fixed`, label is `position:absolute` → min-content layout; only `nameDiv` had nowrap) and live: evidence/08-nowrap-fix.png shows short-named label "Anon7621" with "12.1K / 12.1K" on one line, wider than the name — the exact geometry that wrapped in evidence/04. Severity confirmed medium (visual-only, but hits most labels). Lint clean, tsc clean, 87/87 suites (691 tests) pass. Applied under the sprint-ship-loop standing approval (verified-CORRECT, mechanical, in-plan). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- Zero-troop label shows `0 / max` — What: label stays visible with `0 / max` at zero troops (overlay hides its row at 0; the map label never did) · Why (structural): owner-approved plan default 2026-08-14; preserves the label's always-shown behavior · Re-raise only if: it produces an actual rendering error or a wrong number.
- Dark text-shadow on red attack line — What: static `0 0 2px rgba(0,0,0,0.7)` halo for legibility · Why (structural): owner-approved plan default 2026-08-14 · Re-raise only if: it demonstrably breaks rendering.
- Stale-while-hidden refresh (~500ms throttle, early-return when hidden) — What: new lines inherit the label layer's pre-existing staleness on re-entering view · Why (structural): pre-existing NameLayer behavior, unchanged by this task; declared in plan edge cases · Re-raise only if: the throttle itself regresses.
