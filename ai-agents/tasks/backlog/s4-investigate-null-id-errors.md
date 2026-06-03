# Task — Investigate & Fix Client Null-ID/Null-Object Errors

## Sprint
Sprint 4 — In-App Monetization & Citizenship (carried in as a stabilization follow-up).
This is the triage + fix half of the null-id investigation split (2026-06-03). It is
scheduled for Sprint 4 because both its prerequisites land at the Sprint 4c→4 boundary:
source maps (`s4c-enable-client-source-maps.md`) and a deployed archive fix that quiets
the telemetry stream.

## Priority
Medium — ~1.8 errors/min. Real client-side state errors. Not urgent relative to the
citizenship/payments track, but cheap to triage once the prerequisites are in place.

---

## Dependencies (both must be live before triage)
1. **Source maps available in Uptrace** — `s4c-enable-client-source-maps.md` (Sprint 4c).
   With resolved stack traces this task may collapse to a direct, targeted fix.
2. **Archive telemetry-noise fix deployed** — `s4c-reduce-archive-telemetry-noise.md`
   (Sprint 4c). The null-id cluster (~1.8/min) is ~15× quieter than the archive family
   (~26.6/min); reliable co-occurrence/pattern analysis needs that noise gone **in
   production**, not just merged.

---

## Context

A cluster of null-access errors is visible in Uptrace, present across Chrome, Safari, and
Firefox — suggesting a real runtime state issue, not a browser-specific quirk. Error
groups observed (2026-05-07 window):

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

Investigation-first. **Do not write defensive null guards speculatively** — identify the
actual source first.

### Step 1 — Resolve via source maps (preferred path)
With `s4c-enable-client-source-maps.md` live, use the minified column/line numbers in the
Uptrace stack traces to identify the original file and function. Document them. If this
pinpoints the location, skip to the fix — the steps below are the fallback.

### Step 2 — If source maps still don't resolve the location
- The `a.id` / `.id` null-access pattern suggests a player/unit/game-object lookup that
  returns null where a live object is expected. Common sources: `PlayerView`, `UnitView`,
  player-ID lookups in the radial menu or chat, and Yandex/profile identity flows.
- Add **structured logging** (not generic guards) around the highest-risk flows: the radial
  menu's player-selection path, `PlayerPanel`, `ChatModal` player reference, and any
  leaderboard/profile lookup that uses `.id` after an async fetch.

### Step 3 — Confirm the triggering user flow
- Correlate with events: match start, player elimination, alliance formation, chat send.
  Check Uptrace for surrounding trace context or co-occurring events (now reliable, with
  the archive noise gone).

---

## What to Build

Conditional on findings:
- **Source maps expose the location:** fix the specific null-access with a targeted guard
  or null check at the identified site.
- **Flow identified without a precise line:** add structured error context (`console.warn`
  with player/match state) at the risky path so the next observation pinpoints the cause.
  Do not add speculative null guards across the codebase.

---

## Verification

1. Either: the specific null-access location is identified and fixed, and the error group
   disappears from Uptrace.
2. Or: structured logging is added at the identified risky flow, giving the next Uptrace
   observation enough context to pinpoint the cause.

---

## Notes
- The `a.id` minified pattern is a strong hint but not conclusive — `.id` is used on many
  object types. Do not over-scope the guard.
- If source maps (Task `s4c-enable-client-source-maps.md`) fully resolve the traces, this
  task likely collapses to a small targeted fix and the Step 2/3 fallback is unnecessary.
