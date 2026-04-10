# HF-12 — Spawn Camera/Animation Fires Before Confirmed Placement

## Priority
Sprint 3. Visual bug affecting multiplayer matches on slow connections — player sees camera zoom and spawn indicator animation pointing at a location where they are not actually placed.

## What the Player Sees

1. Joins a multiplayer match (more likely on slower connections)
2. Camera moves to a position on the map as if showing their spawn location
3. Spawn indicator animation plays (expanding ring pulse) at that position
4. Player is actually spawned at a different location — or not spawned at all
5. Camera is pointing at the wrong place; player has to manually find themselves on the map

## Root Cause

The camera zoom (Task 4b) and spawn indicator animation (Task 4e) are firing at **intent-send time** — the moment the auto-spawn intent is dispatched to the server — rather than at **confirmed placement time** — when the server acknowledges the placement and the client receives the confirmation.

On fast connections this difference is imperceptible. On slow connections, or when catch-up (fast-forward replay after late join) is involved, the server may place the player at a different tile than the one targeted by the client's intent. By that point the camera has already committed to the wrong position and the animation has already played there.

This is related to but distinct from the HF-6 fix. HF-6 ensured auto-spawn waits for catch-up to complete before *sending* the intent. This task ensures the camera and animation wait for *confirmation* before firing.

---

## Part A — Investigation

Before making changes, confirm exactly where in the client code the camera zoom and spawn indicator animation are triggered.

**Questions to answer:**

1. Where is the camera zoom called — is it in the same function that sends the spawn intent, or is it triggered by a spawn-related event/callback?
2. Where is the spawn indicator animation triggered — same place as the zoom, or separately?
3. What event or callback fires when the server confirms a spawn placement on the client side? Is there an existing "spawn confirmed" signal the client already handles, or does one need to be identified/added?
4. Does the `Match:SpawnRetryAfterCatchup` flow (HF-6) have its own camera/animation call, or does it share the same call site as the normal auto-spawn path?

**Output:** a short note identifying the exact call sites and the confirmed-placement signal to hook into. Determines what Part B changes.

---

## Part B — Fix

Move the camera zoom and spawn indicator animation trigger from intent-send time to confirmed-placement time.

**The principle:** the client must not visually commit to a spawn position until the server has confirmed the player is actually there.

**Implementation:**
- Identify the point in the client where the server's spawn confirmation is received — this is where the player's position on the map becomes authoritative
- Move `zoomToTerritory()` (Task 4b) and the spawn indicator animation (Task 4e) to fire at this point, not at intent-send
- The existing `Match:SpawnAuto` and `Match:SpawnChosen` analytics events should also fire at confirmed placement time if they don't already — verify this as part of the change

**What must NOT change:**
- The spawn intent dispatch timing (already correctly gated by HF-6 catch-up logic) — do not touch this
- Manual spawn placement — if the player taps a tile manually, the camera should still respond promptly to their tap (this is intentional immediate feedback). Only the auto-spawn camera behaviour needs to wait for confirmation.

**Edge case — `Match:SpawnRetryAfterCatchup`:**
The HF-6 retry path fires the spawn intent after catch-up completes. Ensure the camera/animation for this path also waits for confirmation, not just for the intent to be sent.

---

## Verification

1. Join a multiplayer match on a simulated slow connection (browser DevTools → Network → throttle to Slow 3G)
2. Confirm camera does not move until spawn placement is confirmed by the server
3. Confirm spawn indicator animation does not play until spawn placement is confirmed
4. Confirm camera moves to the correct position — the position where the player is actually placed
5. Manual spawn tap: confirm camera still responds immediately to the player's tap (no regression on manual placement UX)
6. Fast connection: confirm no perceptible delay introduced — on fast connections confirmation arrives quickly enough that the behaviour feels identical to before
7. `Match:SpawnRetryAfterCatchup` path: join a match already in progress on slow connection, confirm the camera/animation fires at confirmed placement, not at retry intent-send

## Dependencies

- Task 4b (zoom-to-territory) and Task 4e (spawn indicator) must be live — this task modifies when they are triggered, not what they do
- HF-6 (auto-spawn catch-up fix) must be deployed — this task builds on the correct intent-send timing established by HF-6

## Notes

- **Do not change manual spawn camera behaviour.** The camera responding immediately to a player's tap on the map is correct and intentional — it provides responsive feedback. Only auto-spawn needs to wait for server confirmation.
- **Problem 2 (no spawn on very slow connections)** is a separate known issue tracked as `Match:SpawnMissed:CatchupTooLong`. It is not addressed here. This task only fixes the visual mismatch when spawn does eventually succeed.
- If Part A reveals that no "spawn confirmed" signal currently exists on the client, creating one is part of this task — it is likely a necessary architectural addition regardless.
