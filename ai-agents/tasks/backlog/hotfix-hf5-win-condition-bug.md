# HF-5 — Win Condition Detection Bug Fix

## Priority
Critical. Players are reporting that after 30–60 minutes of play — primarily in singleplayer missions — the win dialogue does not appear after eliminating all opponents. This is a direct retention killer: a player who completes a long match and receives no victory screen has a strongly negative final experience and is unlikely to return.

## Root Cause (Investigation Complete)

`WinCheckExecution.checkWinnerFFA()` only triggers a win under two conditions:
1. The leading player owns >80% of non-fallout tiles
2. The optional game timer expires

There is no "last player standing" check. In singleplayer FFA missions, a player can eliminate all active bots — but ghost bots (spawned, `hasActed() === false`, holding their spawn territory) remain in `players()` as living opponents. The human player may own only 50–70% of the map, never reaching 80%, so the win condition never fires. The game stalls indefinitely.

All singleplayer missions use `GameMode.FFA` (confirmed `Main.ts:797,869`). `hasActed()` is available on the `Player` interface (`Game.ts:555`).

---

## Part A — Core Fix (`WinCheckExecution.ts`)

Add a last-meaningful-player-standing check to `checkWinnerFFA()`. Ghost bots — bots that spawned but never acted — do not count as real opponents.

Place this **after** the existing tile%/timer block so the fast tile% path still fires first (important for multiplayer FFA where no ghost bots exist):

```typescript
// Last meaningful player standing:
// ghost bots (spawned but never acted) do not count as real opponents
const meaningfulPlayers = sorted.filter(
  (p) => p.type() !== PlayerType.Bot || p.hasActed(),
);
if (meaningfulPlayers.length === 1) {
  this.mg.setWinner(meaningfulPlayers[0], this.mg.stats().stats());
  this.active = false;
}
```

Add `PlayerType` to imports.

---

## Part B — Analytics (`WinModal.ts` + `FlashistFacade.ts`)

Fire `Game:WinDetected` at the top of the `winUpdates.forEach` callback in `WinModal.ts`, before the modal renders:

```typescript
flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_WIN_DETECTED);
```

Add to `flashistConstants.analyticEvents` in `FlashistFacade.ts`:

```typescript
GAME_WIN_DETECTED: "Game:WinDetected",
```

Add to the analytics event reference under Game Events:

| Enum Key | Event String | When Fired |
|---|---|---|
| `GAME_WIN_DETECTED` | `Game:WinDetected` | Win condition evaluates to true — fires at detection, before WinModal renders |

**Why this matters:** if `Game:WinDetected` appears in GameAnalytics without a subsequent `Game:Win`, the modal is failing to render. If neither appears, detection is failing. After the fix, the ratio of `Game:WinDetected` to `Game:Win` in singleplayer sessions should move toward 1:1.

---

## Part C — Archive Additions

The server-side investigation revealed two gaps in the match archive that directly affect validating this fix and debugging future win condition issues. Both are small additions to the archive schema — check whether `GameRecordSchema` validation requires a version bump before implementing.

**1. Add `winReason` to `GameRecord.info`**

Currently the archive records who won but not how. After the fix ships, there is no way to confirm from archive data whether wins are triggering via the new last-standing path vs the existing tile% path.

Add a `winReason` field populated when `setWinner()` is called:

```typescript
winReason: "tilePercentage" | "timer" | "lastStanding"
```

Set the appropriate value at each call site in `WinCheckExecution.ts`.

**2. Add `hasActed` to `PlayerRecord`**

`PlayerImpl._hasActed` exists server-side but is currently excluded from `PlayerRecord` and therefore absent from the archive. Without it, ghost player counts at match end are invisible — making it impossible to confirm from archive data how often ghost bots were blocking the win condition.

Add `hasActed: boolean` to `PlayerRecord` and populate it from `player.hasActed()` when the record is built at match end.

---

## Part D — Tests (`WinCheckExecution.test.ts`)

Add to the existing describe block:

```typescript
it("should set winner when only human remains, ghost bots hold spawn tiles", () => {
  const human = {
    numTilesOwned: jest.fn(() => 50),
    name: jest.fn(() => "Human"),
    type: jest.fn(() => PlayerType.Human),
    hasActed: jest.fn(() => true),
  };
  const ghostBot = {
    numTilesOwned: jest.fn(() => 50),
    name: jest.fn(() => "GhostBot"),
    type: jest.fn(() => PlayerType.Bot),
    hasActed: jest.fn(() => false),
  };
  mg.players = jest.fn(() => [human, ghostBot]);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  winCheck.checkWinnerFFA();
  expect(mg.setWinner).toHaveBeenCalledWith(human, expect.anything());
});

it("should not set winner when active bots still remain", () => {
  const human = {
    numTilesOwned: jest.fn(() => 50),
    name: jest.fn(() => "Human"),
    type: jest.fn(() => PlayerType.Human),
    hasActed: jest.fn(() => true),
  };
  const activeBot = {
    numTilesOwned: jest.fn(() => 50),
    name: jest.fn(() => "ActiveBot"),
    type: jest.fn(() => PlayerType.Bot),
    hasActed: jest.fn(() => true),
  };
  mg.players = jest.fn(() => [human, activeBot]);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  winCheck.checkWinnerFFA();
  expect(mg.setWinner).not.toHaveBeenCalled();
});
```

---

## Files to Modify

| File | Change |
|---|---|
| `src/core/execution/WinCheckExecution.ts` | Add last-meaningful-player-standing check |
| `src/client/graphics/layers/WinModal.ts` | Fire `Game:WinDetected` before modal renders |
| `src/client/flashist/FlashistFacade.ts` | Add `GAME_WIN_DETECTED` enum entry |
| `src/server/Archive.ts` (or equivalent) | Add `winReason` and `hasActed` to archive schema |
| `tests/core/executions/WinCheckExecution.test.ts` | Add ghost-bot and last-player-standing tests |
| `analytics-event-reference.md` | Document `Game:WinDetected` |

---

## Verification

1. **Singleplayer — standard completion:** eliminate all active bots → win screen appears immediately
2. **Singleplayer — with ghost bots:** some bots never expand; eliminating active bots still triggers win
3. **Tile% path preserved:** if player reaches 80% while bots are still alive, win fires as before
4. **Multiplayer — no regression:** tile% win condition unchanged; last-standing fires if truly one player left
5. **`Game:WinDetected` fires before `Game:Win`** in GameAnalytics for all winning matches
6. **Archive:** `winReason` and `hasActed` fields present in archived match records after fix deployment
7. **Tests:** `npm test` — all existing + new tests pass
8. **Sentry:** no new errors introduced

## Notes

- Parts A and D are the critical fix — Parts B and C are additive improvements that close measurement and archive gaps. If time is short, ship Part A + D first and follow with B + C immediately after.
- The `winReason` and `hasActed` archive additions may require a schema migration or version bump depending on how `GameRecordSchema` validation is structured — check this before implementing Part C.
