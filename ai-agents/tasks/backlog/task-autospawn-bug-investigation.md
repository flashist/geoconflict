# Task — Auto-Spawn Failure Investigation

## Priority
Critical. If auto-spawn places a player on an invalid tile or enters a broken state, the player cannot interact with the map at all — they are stuck watching the match with no ability to participate. This is especially severe in the tutorial where the first thing that happens is auto-spawn, meaning a broken auto-spawn breaks the tutorial entirely for that player.

## Symptoms

- Player is not visually placed on the map at match start
- Manual click/tap to place manually does not work either — clicks are silently ignored
- The match continues running around the player with no way to recover

## Context

Task 4a (auto-spawn) places the player automatically the moment they join a match. The player retains the ability to manually reposition during the spawn phase. The reported bug breaks both the auto-placement and the manual fallback simultaneously, suggesting the issue may be in shared spawn state rather than just the auto-placement logic itself.

This is an investigation task — identify the root cause before any fix is written.

---

## Part A — Investigate Auto-Spawn Placement Logic

The most likely cause is that auto-spawn selects an invalid tile, the placement attempt fails silently, and the player is left in a broken intermediate state where the game believes they have been placed but they have not.

**Check the tile selection logic:**
- What criteria does auto-spawn use to select a tile? Is it purely random from all tiles, or filtered?
- Are water tiles explicitly excluded from the candidate pool? If not, placing on water would fail silently
- Are there minimum distance constraints from map edges? If the selected tile is at or beyond the edge boundary, placement may fail
- Are there minimum distance constraints from other players' spawn locations? If all valid tiles near other players are excluded and the remaining candidates are invalid, the selection could return null or an invalid tile
- What happens when the candidate pool is empty — is there a fallback, or does the function return without placing?

**Check the failure path:**
- If `SpawnExecution` (or equivalent) receives an invalid tile, does it throw, return silently, or set a partial state?
- Is there any error logged to console or Sentry when placement fails?
- After a failed auto-placement, what is the player's spawn state — are they marked as "spawned" even though no territory was assigned?

**Check the manual override interaction:**
- After auto-spawn runs (even if it fails), does it modify any state flag that the manual spawn path checks before allowing a click?
- Is there a flag like `hasSpawned` or `spawnLocked` that gets set to `true` by the auto-spawn attempt regardless of whether placement succeeded?
- If auto-spawn sets `hasSpawned = true` on failure, the manual click handler would see the player as already spawned and ignore subsequent clicks — this would explain both symptoms simultaneously

---

## Part B — Investigate the Spawn Phase Interaction

**Check spawn phase timing:**
- Is auto-spawn triggered before the spawn phase has fully initialised on the client?
- Could there be a race condition where auto-spawn fires before the map is ready to accept placements?
- In the tutorial specifically, does the tutorial setup sequence interact with the spawn timing in a way that could cause the spawn phase to be skipped or misconfigured?

**Check multiplayer vs singleplayer:**
- Does the bug reproduce in both multiplayer and singleplayer/tutorial matches, or only one?
- In multiplayer, are other players' spawn locations finalised before auto-spawn runs for this player? If so, could a crowded map leave no valid tiles?

**Check the `Match:SpawnAuto` event:**
- Does `Match:SpawnAuto` fire in GameAnalytics at the moment the bug occurs?
- If it fires, auto-spawn believed it succeeded — the problem is in what tile it selected
- If it does not fire, auto-spawn did not run at all — the problem is in the trigger condition

---

## Part C — Reproduce Locally

Attempt to reproduce the bug in a controlled local environment:

1. **Water tile test:** temporarily modify the tile selection to always return a water tile — does the player end up unspawned with broken manual clicks?
2. **Edge tile test:** force selection of a tile at the map boundary — same test
3. **Null tile test:** force the selection function to return `null` — what happens to game state?
4. **Full lobby test:** join a match where all good spawn locations are already taken — does auto-spawn fail gracefully?

The goal is to find the condition that reproduces both symptoms — no auto-placement AND broken manual clicks.

---

## Investigation Output

A short written summary covering:
- What tile selection logic auto-spawn currently uses and what its failure modes are
- Whether a failed auto-spawn can corrupt the spawn state in a way that blocks manual placement
- Which of the reproduction attempts above triggered both symptoms
- The specific code path that causes the broken state
- A proposed fix direction (but not the fix itself — that comes after the investigation is confirmed)

---

## Analytics Signal to Check

Before investigating code, check GameAnalytics for the following signal:

```
Match:SpawnAuto fired but Match:SpawnChosen never fired in the same session,
AND Session:Heartbeat:05 never fired
```

This pattern — auto-spawn fired, player never manually repositioned, session ended within 5 minutes — is a proxy for sessions where auto-spawn may have failed and the player abandoned. If this pattern appears at a non-trivial rate (above 5% of sessions where `Match:SpawnAuto` fires), the bug is not isolated and is actively affecting players at scale.

---

## Notes

- Do not write a fix until the root cause is confirmed. The fix for "wrong tile selected" looks completely different from the fix for "spawn state corrupted on failure."
- If the investigation confirms that a failed auto-spawn sets `hasSpawned = true` regardless of outcome, the fix is to make state updates conditional on successful placement — but verify this is actually the case before implementing it.
- The tutorial is the highest-risk context for this bug — if auto-spawn fails in the tutorial, the player has no way to proceed and will abandon. Prioritise reproducing in tutorial context if possible.
- Once the root cause is identified, add a Sentry breadcrumb at the auto-spawn execution point logging the selected tile type and coordinates — this will catch future regressions in production without requiring player reports.

---

## Investigation Findings (March 2026)

### Root Cause Identified: Timing Race (Failure Mode 1)

The bug is a **timing race between the client catch-up and the server spawn phase**. It is not caused by an invalid tile selection.

**Mechanism:**
1. Player joins a game mid-match (reconnect or late join). Client enters catch-up mode, replaying old turns at high speed (20 heartbeats/frame).
2. During catch-up, `tryAutoSpawn()` fires at tick 1 — the client's local game view still shows `inSpawnPhase() = true` because it hasn't caught up yet.
3. The spawn intent travels: client → server → next turn broadcast → worker queue.
4. By the time `SpawnExecution.tick()` runs, the game has advanced past `numSpawnPhaseTurns` → `!inSpawnPhase()` → early return, player never added to game.
5. `_autoSpawnSent = true` was already set on the client at step 2, blocking all retries.
6. Spawn phase ends on the client view → manual `inputEvent()` spawn branch is skipped (requires `inSpawnPhase()`) → falls to attack branch → `myPlayer === null` (never added to game) → **all clicks silently ignored**.

**Key files and lines:**
- `src/client/ClientGameRunner.ts:594–613` — `tryAutoSpawn()`: sets `_autoSpawnSent = true` optimistically before server confirmation
- `src/client/ClientGameRunner.ts:609` — the critical line: `_autoSpawnSent = true` fires before knowing if spawn succeeded
- `src/core/execution/SpawnExecution.ts:29–33` — silent early return when `!inSpawnPhase()`, no state written, no error surfaced to client
- `src/core/configuration/DefaultConfig.ts:713–715` — spawn phase duration: 100 ticks singleplayer, 300 ticks multiplayer

**Confirmed by:** Forcing `SpawnExecution.tick()` to always reject spawns (regardless of spawn phase) reliably reproduced both symptoms — no auto-spawn and manual clicks silently ignored.

**Secondary failure mode (not the primary bug):** `getSpawnTiles()` can return `[]` for a coastal/isolated tile. In this case `setHasSpawned(true)` is still called but the player owns 0 tiles. This does NOT block manual clicks (manual respawn during spawn phase still works), so it does not explain both symptoms simultaneously. Already caught by existing Jest tests.

---

### Two Distinct Sub-Problems

Investigation revealed the bug is actually two problems that compound each other:

**Problem 1 — Premature send (timing race):** `_autoSpawnSent = true` is set before server confirmation. Fix: guard `tryAutoSpawn()` with `if (this.catchingUp) return;` so the intent is only sent after catch-up ends, when the server's spawn phase is still active.

**Problem 2 — No recovery path when spawn phase expires:** If catch-up lasts longer than the spawn phase (player joins very late), even the Problem 1 fix does not help — spawn phase ends during catch-up, and after catch-up the player has no way to spawn at all (spawn branch requires `inSpawnPhase()`, attack branch requires `myPlayer !== null`). This requires a separate, more involved fix.

The one-line fix (`if (this.catchingUp) return;`) addresses Problem 1 only and is safe to ship. Problem 2 requires further design.

---

### Fix Phase Requirements

**Before writing the fix:**
1. **Create a clean, stable reproduction** that triggers both symptoms simultaneously (no auto-spawn AND manual clicks ignored). The current simulation (50-tick fake catch-up + reject at `ticks < 50`) only partially reproduces the bug — manual clicks still work because spawn phase (100 ticks) outlasts the catch-up window. A full reproduction requires catch-up to outlast the spawn phase, but that also requires a more complete fix (Problem 2 above). Resolve this tension before implementing anything.
2. Only proceed to the fix once the reproduction is confirmed to show both symptoms reliably and cleanly.

**After the fix is applied:**
1. Add an analytics event to measure how often the fix actually saves players in production. Suggested event: fire a new `Match:SpawnRetryAfterCatchup` event (or similar name, following the `Category:Action` convention) whenever auto-spawn is **blocked** by the catch-up guard and then fires successfully after catch-up ends. This makes the fix's real-world impact visible in GameAnalytics without requiring player reports.
2. Check the analytics signal described in the "Analytics Signal to Check" section above to measure before/after rates of broken sessions.
