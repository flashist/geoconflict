# Spawn UX: Zoom-to-Territory & Spawn Indicator (Tasks 4b + 4e)

**Source**: `ai-agents/tasks/done/task-zoom-to-territory.md`, `ai-agents/tasks/done/task-04e-spawn-indicator.md`
**Status**: done
**Sprint/Tag**: Sprint 2

## Goal

Solve the "can't find myself on spawn" problem from two directions: zoom the camera to the player's territory on spawn (Task 4b), and make the spawn indicator unmissable when the camera arrives (Task 4e).

## Key Changes

### Task 4b — Zoom to Territory

Single reusable `zoomToTerritory()` function used in three places:
1. Any player name clicked in the player table (pan + zoom, not just pan)
2. "Find me" button press (targets own territory)
3. Auto-zoom once on first spawn (manual or auto-spawn)

Zoom level is territory-size-aware: small territory → close-up, large territory → fit with cap (labels must remain readable). Uses `TransformHandler` for world↔screen coordinate transforms.

**Critical (HF-12):** auto-zoom fires at *confirmed placement time* (server confirms spawn), not at *intent-send time*. Manual tap spawn still responds immediately (intentional immediate feedback for manual placement only).

### Task 4e — Spawn Indicator

Expanding ring pulse animation at spawn point:
- Expands outward 2–3 times over ~3–4 seconds, then fades
- Uses player's own territory color (not white)
- Purely visual — no changes to `src/core/`
- Lives in `FxLayer` (`GameRenderer.ts`)

**Critical (HF-12):** indicator fires at confirmed placement time, same as camera zoom.

## Related

- [[decisions/sprint-2]] — sprint where these shipped
- [[decisions/sprint-3]] — HF-12 fixes the camera/animation timing (intent-send vs confirmed-placement)
- [[decisions/autospawn-late-join-fix]] — HF-6 fixed spawn intent timing; HF-12 fixes visual timing
