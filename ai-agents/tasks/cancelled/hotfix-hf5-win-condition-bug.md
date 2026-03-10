# HF-5 — Win Condition Detection Bug Investigation & Fix

## Priority
Critical. Players are reporting that after 30–60 minutes of play — primarily in singleplayer missions — the win dialogue does not appear after eliminating all opponents. This is a direct retention killer: a player who completes a long match and receives no victory screen has a strongly negative final experience and is unlikely to return.

## Context

Multiple players have reported via the feedback system that completing a mission (eliminating all bots) does not trigger the win screen. The match continues running with no apparent opponents remaining. Reports are concentrated in singleplayer missions but may also affect multiplayer.

The root cause is unknown. This task is structured as investigation first, fix second — the fix approach depends entirely on what the investigation finds.

---

## Part A — Investigation

Before writing any fix, identify exactly why the win condition is not triggering. The developer should work through the following in order:

**Step 1 — Trace the win condition check**

Find where the game evaluates whether a player has won. Key questions:
- Is the win condition checked on every tick, or only when an elimination event fires?
- What exactly does the check evaluate — number of living players, number of players with territory, something else?
- Is there a code path where the check can be skipped or short-circuited?

**Step 2 — Check for ghost players blocking the win condition**

The confirmed ghost rate is ~20% on both platforms. A ghost player who spawned but never took any action may still have a registered presence in the game state even after the match has effectively ended.

Specifically check:
- Does the win condition check count ghost players (spawned, zero territory, no actions taken) as living opponents?
- Is there a player state that represents "present but eliminated" vs "present and alive" — and are ghost players correctly assigned to the eliminated state when their territory reaches zero?
- In singleplayer missions, are bot players correctly marked as eliminated when their last territory is captured?

**Step 3 — Check for race conditions**

- Is there a tick where the last territory capture is processed but the elimination event has not yet fired?
- If the win condition runs at that exact tick, does it see zero opponents (correct) or one opponent with zero territory (incorrect — never gets re-checked)?
- Is `WinModal` being triggered but failing silently, or is it genuinely not being triggered at all?

Add a temporary Sentry breadcrumb or console log at the win condition evaluation point that records:
- How many players remain according to the game state
- The state of each remaining player (territory count, alive flag, elimination status)
- Whether the win condition check returned true or false

This log should fire every time the win condition is evaluated. Reproduce the bug locally using a singleplayer mission and inspect the log at the moment all bots should be eliminated.

**Step 4 — Check WinModal specifically**

If logs show the win condition is evaluating correctly (returning true) but the modal still doesn't appear:
- Is `WinModal.show()` or equivalent being called?
- Is there a z-index or DOM ordering issue where the modal is rendering behind other elements?
- Is there a condition on `WinModal` that prevents it from showing in certain game states?

**Investigation output:** a short written summary of the root cause — which of the above explains the bug, with evidence from logs or code inspection. This output determines what Part B implements.

---

## Part B — Fix

Implement the fix based on Part A findings. Expected fix directions depending on root cause:

**If ghost players are blocking the win condition:**
Modify the win condition check to exclude players who have zero territory and have never taken any action (ghost players). A ghost player who was never meaningfully in the match should not count as a living opponent for win condition purposes. This may require adding a `hasEverActed` flag or similar to the player state — check whether this already exists before adding it.

**If bot elimination is not registering:**
Find where bot elimination events are fired and ensure the event fires correctly when the bot's last territory is captured, including edge cases — bot territory captured in the same tick as another event, bot with exactly one territory remaining, etc.

**If it is a race condition:**
Ensure the win condition check runs after all elimination events for a tick have been processed, not during processing. The check should be the last thing evaluated in the tick, not interleaved with territory capture processing.

**If WinModal is not rendering:**
Fix the rendering or display condition. Ensure the modal appears on top of all other UI elements and is not blocked by any active game state condition.

---

## Analytics

Add the following event to measure win condition detection after the fix ships:

| Event String | When Fired |
|---|---|
| `Game:WinDetected` | Win condition evaluates to true — fires at detection, before WinModal renders |

This event fires slightly before the existing `Game:Win` event (which fires on the modal). If `Game:WinDetected` appears in analytics without a subsequent `Game:Win`, it confirms the modal is failing to render. If neither appears, the detection itself is failing.

Add to the analytics event reference under Game Events.

---

## Verification

1. **Singleplayer mission — standard completion:** play a mission to completion, eliminate all bots — win screen appears immediately
2. **Singleplayer mission — with ghost bots:** if any bots never expand or act, eliminating all active bots still triggers the win screen
3. **Multiplayer — last player standing:** eliminate all other players in a multiplayer match — win screen appears
4. **No false positives:** win screen does not appear while opponents with territory still exist
5. **`Game:WinDetected` fires before `Game:Win`** in GameAnalytics for all winning matches after fix deployment
6. **Sentry:** no new errors introduced by the fix

## Notes

- Treat Part A as blocking — do not write a fix until the root cause is confirmed. A fix written against the wrong hypothesis will not resolve the bug and may introduce new ones.
- If the investigation reveals multiple simultaneous causes (e.g. ghost players AND a race condition both contribute), fix both in the same task rather than shipping a partial fix.
- Given the volume of player feedback, consider adding a temporary server-side log (in addition to Sentry) that records game state at match end for any match where `Game:WinDetected` does not fire within a reasonable time after the last bot elimination. This would capture production instances without requiring players to reproduce locally.

---

## Investigation Results (Part A Complete)

**Status: Root cause confirmed. Ready to implement Part B.**

### Root Cause

`WinCheckExecution.checkWinnerFFA()` (`src/core/execution/WinCheckExecution.ts`) only triggers a win under two conditions:
1. The leading player owns **>80% of non-fallout tiles** (`percentageTilesOwnedToWin()` returns `80` for FFA)
2. The optional game timer expires

**There is no "last player standing" check.** This is the bug.

In singleplayer FFA missions (all singleplayer missions use `GameMode.FFA`, confirmed in `src/client/Main.ts:797,869`):
- Player eliminates all *active* bots
- Ghost bots — bots that spawned (own spawn tiles, `hasSpawned() === true`) but never acted (`hasActed() === false`) — remain alive in `mg.players()` with their spawn territory
- Ghost rate is ~20%, so a typical mission has 1–2 ghost bots holding 20–30% of the map
- Human player owns 50–70%, below the 80% threshold
- Win condition never fires, game stalls indefinitely

`hasActed()` is on the `Player` interface (`src/core/game/Game.ts:555`) — accessible in `WinCheckExecution`. `PlayerType` is also available for filtering bots.

### Key Files

| File | Finding |
|------|---------|
| `src/core/execution/WinCheckExecution.ts` | The bug: `checkWinnerFFA()` has no last-player-standing check (lines 39–62) |
| `src/core/game/PlayerImpl.ts` | `_hasActed = false` (line 107), `isAlive() = _tiles.size > 0` (line 341) |
| `src/core/game/Game.ts` | `hasActed()` on Player interface (line 555); `PlayerType` enum available |
| `src/core/game/GameImpl.ts` | `players()` returns only alive players (line 426) — ghost bots included if they have tiles |
| `src/core/configuration/DefaultConfig.ts` | `percentageTilesOwnedToWin()` returns `80` for FFA (line 704–709) |
| `src/client/graphics/layers/WinModal.ts` | `GAME_WIN` analytics fires on win update received (lines 283–285, 325–327) |
| `tests/core/executions/WinCheckExecution.test.ts` | Existing test file — add new cases here |

### Implementation Plan (Part B)

**1. `src/core/execution/WinCheckExecution.ts`** — Add `PlayerType` import. In `checkWinnerFFA()`, after the existing tile%/timer `if` block, add:

```typescript
// Last meaningful player standing:
// ghost bots (spawned but never acted) do not count as real opponents
const meaningfulPlayers = sorted.filter(
  (p) => p.type() !== PlayerType.Bot || p.hasActed(),
);
if (meaningfulPlayers.length === 1) {
  this.mg.setWinner(meaningfulPlayers[0], this.mg.stats().stats());
  console.log(`${meaningfulPlayers[0].name()} wins as last player standing`);
  this.active = false;
}
```

**2. `src/client/flashist/FlashistFacade.ts`** — Add to `flashistConstants.analyticEvents`:

```typescript
GAME_WIN_DETECTED: "Game:WinDetected",
```

**3. `src/client/graphics/layers/WinModal.ts`** — At the top of `winUpdates.forEach`, before `if (wu.winner === undefined)`, fire:

```typescript
flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_WIN_DETECTED);
```

**4. `ai-agents/knowledge-base/analytics-event-reference.md`** — Add to Game Events table:

| Enum Key | Event String | When Fired |
|---|---|---|
| `GAME_WIN_DETECTED` | `Game:WinDetected` | Win condition evaluates to true — fires at detection, before WinModal renders |

**5. `tests/core/executions/WinCheckExecution.test.ts`** — Add two tests:
- Human + ghost bots (hasActed=false) → human wins with <80% tiles
- Human + active bot (hasActed=true) → no win at <80% tiles
