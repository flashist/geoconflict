# Verify 0377 Live — an Abandoned Private Lobby Ends After 30 Minutes, an Occupied One Does Not (task 0390)

**Source**: `ai-agents/tasks/done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 7 / task `0390`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling **"Close 0390 + file task for (A)
> (Recommended)"**. PASS on cases 1 and 3 and on "no collateral". Follow-up `0434` filed (Backlog, low).

## Goal

The live check for `0377` ([[tasks/private-lobby-idle-end]]): the game server ends a private lobby that has not started
and has had nobody connected for **30 minutes** (clock from the last leave, or from creation if nobody joined), with one
log line `private lobby ended, no client connected`. By owner ruling 2026-10-09 this check **must pass** before the
private-lobby everyone-flag (`0428`) is set — it is how gate item 4 is met ([[tasks/private-lobby-citizen-perk]]).

## Key Changes

None — a live check on game `0.0.161` (live since 2026-10-09). The owner did the clicks in the Yandex Games page with a
paid citizen tester account; `fkit-lead` read the game container's log **read-only over SSH in the owner's session**,
each command owner-approved. A spawned coder's earlier attempt had been refused by the permission filter ("Production
Reads") and was **not** worked around.

## Outcome

| Check | Result |
|---|---|
| Case 1 — abandoned after a join | **PASS** — the idle-end line came ~30 min after the host left: `anyClientJoined: true`, `idleMs` just over 1,800,000 |
| Step 2 — join the ended lobby | ⏭️ not run — what a player sees is not recorded |
| Case 3 — occupied (a second tab left open) | **PASS** — no idle-end line; the lobby lasted until the old **3-hour cap** ended it (expected, outside this check) |
| Case 2 — never joined | ⏭️ not run (optional) — the "from creation" rule stays unit-tested only |
| No collateral | **PASS** — over ~6 hours of log, the only idle-end line was case 1's |

- ⚠️ Case 3 was proved with a connection that kept dropping: the hidden tab reconnected every 2–3 min from ~36 min in
  (likely Chrome throttling, **not confirmed**); each rejoin reset the idle clock.
- **Side finding (A) → `0434`** (Backlog, owner `fkit-coder`, low): after case 3's lobby ended, its host window kept
  polling it **once a second, 404 every time, for 2 h 44 min+**, never noticing it was gone (what the window showed was
  not checked). The *after* case of `0353` ([[tasks/host-window-poll-before-lobby]]). **Side finding (B)** — the
  hidden-tab reconnect churn: noted only, no task (owner ruling).
- `0428`'s dependency on this check is met; `0428`'s own status is unchanged.

## Related

- [[tasks/private-lobby-idle-end]] — task `0377`, the build this checks
- [[tasks/private-lobby-citizen-perk]] — release gate item 4
- [[tasks/private-lobby-tester-default]] — task `0354`, the gate table
- [[tasks/host-window-poll-before-lobby]] — task `0353`, the *before* case of side finding (A)
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, which found the 3-hour leftover lobbies
- [[decisions/sprint-8]] — the board (rank 7)
- [[decisions/sprint-backlog]] — `0434`
