# Task — Investigate Client Null-ID/Null-Object Errors

## Sprint
Sprint 4c — Stabilization

## Priority
Medium — ~1.8 errors/min. Real client-side state errors, but source is unidentifiable without source maps.

---

## Context

A cluster of null-access errors is visible in Uptrace but unresolvable due to minified client output. All error messages are minified (e.g., `TypeError: e is null`, `null is not an object (evaluating 'a.id')`) with no source mapping to original file/function names. The errors are present across browser vendors (Chrome, Safari, Firefox) suggesting a real runtime state issue, not a browser-specific quirk.

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `TypeError: e is null` (multiple groups) | ~1.02/min |
| `TypeError: null is not an object (evaluating 'a.id')` (multiple groups) | ~0.40/min |
| `TypeError: Cannot read properties of null (reading 'id')` (multiple groups) | ~0.36/min |
| `Unhandled rejection: null is not an object (evaluating 'a.id')` | 0.15/min |
| `null has no properties` (multiple groups) | ~0.16/min |

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## Investigation

This task is an investigation-first task. **Do not write defensive null guards speculatively** — identify the actual source first.

### Step 1 — Source maps

- Determine whether production client source maps are uploaded to Uptrace or available for correlation.
- Check whether the webpack production build generates source maps and whether they are deployed alongside the JS bundle (or uploaded separately to Uptrace's source map endpoint).
- If source maps are available, use the minified column/line numbers in Uptrace stack traces to identify the original source location. Document the file and function.

### Step 2 — If source maps are not available

- Look at the error message pattern: `a.id` and `.id` property access on null suggests a player, unit, or game-object lookup that returns null where a live object is expected.
- The most common sources of `.id` access on potentially-null objects in the client are: `PlayerView`, `UnitView`, lookups by player ID in radial menu or chat, and Yandex/profile identity flows.
- Add structured logging (not generic guards) around the highest-risk flows: the radial menu's player-selection path, `PlayerPanel`, `ChatModal` player reference, and any leaderboard/profile lookup that uses `.id` after an async fetch.

### Step 3 — Confirm which user flow triggers this

- Are the errors correlated with a specific event (match start, player elimination, alliance formation, chat send)? Check Uptrace for surrounding trace context or co-occurring events.
- Do any of these appear alongside the cosmetics/archive errors, or are they an independent failure?

---

## What to Build

Conditional on investigation findings:

**If source maps expose the file and function:** fix the specific null-access at the identified location with a targeted guard or null check.

**If source maps are not available and flow is identified:** add structured error context (`console.warn` with player/match state) at the identified risky paths so future instances are diagnosable. Do not add speculative null guards across the whole codebase.

**Source map upload (if not already done):** if production source maps are not uploaded to Uptrace, add that step to the deploy pipeline. This unblocks future triage for all minified error clusters.

---

## Verification

1. Either: the specific null-access location is identified and fixed, and the error group disappears from Uptrace.
2. Or: structured logging is added at the identified risky flow, giving the next Uptrace observation enough context to pinpoint the cause.
3. Source maps are either confirmed available in Uptrace or a ticket/task exists to add them to the deploy pipeline.

---

## Notes

- Do not triage this before Priority 1–3 tasks are shipped. The telemetry is currently too noisy for reliable pattern analysis on lower-rate clusters.
- The `a.id` minified pattern is a strong hint but not conclusive — `.id` is used on many object types. Do not over-scope the guard.
