# Host Start Stops Once the Host Window Closes (task 0334)

**Source**: `ai-agents/tasks/done/0334-host-start-still-sends-start-game-after-the-window-closed-during-the-settings-save/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 11 (append rank) / task `0334`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `9cb8ee4`; **not in any deploy yet**
> (latest game tag `0.0.155`). Client-only.

## Goal

`0327`'s review finding **R1** (owner: *"Create a brief, add it to the end of the next sprint."*). The host
presses **Start**, then closes the host window while the lobby settings are still being saved. `0327` made the
close really leave — but `attemptStart` checked "is this still the same opening?" only **once, after the ad**,
then awaited the settings save and the server config and **still POSTed `start_game`**. Measured by the reviewer:
`start_game POSTed after close: true`. On the server that is either a silent 403, or — where the citizen gate is
bypassed (dev) — **the friends are started into a match without the host**.

## Key Changes

- **`src/client/HostLobbyModal.ts` — `attemptStart` only:** four generation checks
  (`generation !== this.openGeneration`, the same check `0302`'s existing guard uses):
  - **(A)** after the settings save, before its `!ok` branch → stop, no failure line;
  - **(B)** after the Start's own config read, before the `start_game` fetch → stop;
  - **(C)** after `start_game` answers → do not close or show a failure line in a **reopened** window
    (owner ruling Q1, *"include the after-send guard"*);
  - **(D)** in the `catch`, keep the `console.error` but skip the failure line.
- Not touched: `open()` (`0333`'s catch intact), `createLobby()`, `pollPlayers()`, the `isStarting` handling
  (that is `0335` case 4).

## Outcome

- **Tests:** a new block in `tests/client/HostLobbyModalLeave.test.ts` — red 6 failed / 9 passed before, green
  15/15 after; review R2 added a "save throws" row. Each check removed alone turns at least one test red
  (reviewer's mutation run).
- **Live check (local dev, two browser contexts):** save held, ✕ during the hold → before the fix the friend was
  started into a match; after, **0 `start_game` requests** and the friend not started **PASS**. Reopened-window
  cases (late 200 / synthetic 403 / synthetic network error) all reproduced before, **PASS** after. ⚠️ The
  config-read hold was **NOT RUN live** (the config is cached after the first fetch, so there is no request to
  hold) — test 2 only.
- ⚠️ **Expected residual, seen live (out of scope):** a `start_game` that already **left the page** cannot be
  recalled — the server still starts the old lobby and the friend is pulled in. Recalling it needs a server-side
  cancel, which the brief excluded.
- Full `npm test` was left to the loop's Verify step; no full-run result is recorded in this task's worklog.

## Related

- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, whose review R1 this fixes
- [[tasks/host-create-leaves-public-lobby]] — task `0333`, the sibling fix in the same file
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`; its case 4 (`isStarting`) lives in this function
- [[tasks/private-lobby-citizen-perk]] — task `0302`: the Start failure line and the citizen-only 403
- [[decisions/sprint-7]] — the board
