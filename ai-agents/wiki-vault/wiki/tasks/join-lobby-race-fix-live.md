# Verify 0228 Live — Quick Leave, Double Join, and Close During a Lobby Join (task 0433)

**Source**: `ai-agents/tasks/done/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 34 (ADR-035 append rank; on merit directly above `0428`) / task `0433`

> 📌 *2026-10-13 sync: `0428` ran — private lobbies are on for everyone since about 17:09–17:12 MSK, 2026-10-13 ([[tasks/private-lobbies-everyone-flag-flip]]). The "status unchanged" line under Outcome is history.*

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-11 on the owner ruling, verbatim: *"I checked the main and
> easy points, but I didn't do something that I am thinking an overkill for us (phone join-close, etc.). Let's consider
> this check to be done and everything is ok"*. ⚠️ **Partial coverage:** this shows **no regression on the main
> paths**, not that the `0228` fix works live under the conditions it targets.

## Goal

The live check of `0228` ([[tasks/join-lobby-race-fix]]) — the join race where a second click during the short
network wait of a lobby join was mishandled: **S1** a quick leave from a public lobby was lost; **S2** a double-tap on
Join listed the joiner twice; **S3** closing the join window right away left the joiner in the host's list. `0228` is
item 3 of the private-lobby release gate, so by owner ruling (2026-10-10, *"File it, before 0428 (Recommended)"*)
`0428`, the everyone-flag, waited on this check. The brief asked for tries on a slow network after **more than 5
minutes** on the start screen (the cosmetics file's 5-minute browser cache is what widens the window); without those
conditions a pass shows no regression, not that the fix works.

## Key Changes

None — a live check on game `0.0.163` (deployed 2026-10-10 ~18:43 UTC; includes `0228`).

## Outcome

| Check | Result |
|---|---|
| (a) quick leave, public lobby | **not itemized** — covered by "main and easy points" per the owner |
| (b) double-tap Join, private lobby | **not itemized** |
| (c) join then close (phone) | **not run** — named by the owner as skipped |
| (d) normal paths | **not itemized** |
| Device, network, 5-minute wait, console lines | **not recorded** |

- `0228`'s three unproven points: (1) a pass on the deployed code — partly, per the owner's report; (2) phone / Yandex
  page — not recorded; (3) the joiner stays connected — not recorded.
- Server side (read-only, after the deploy): 0 error lines, match credits 0 errors.
- **`0428` is unblocked** — all five of its dependencies (`0376`, `0228`, `0381`, `0390`, `0433`) are closed, all
  agent-closed. Its status is unchanged: the console flip is still the owner's to do, and on 2026-10-12 it was put
  behind a Yandex Games outage checklist (`0440`, [[decisions/sprint-8]]).

## Related

- [[tasks/join-lobby-race-fix]] — task `0228`, the build this checks
- [[tasks/private-lobby-citizen-perk]] — the release gate (item 3)
- [[tasks/private-lobby-tester-default]] — task `0354`, the gate table
- [[systems/client-game-teardown]] — the client teardown page that records `0228`
- [[decisions/sprint-8]] — the board (rank 34)
- [[systems/weekend-deploy-window]] — the 2026-10-10 game deploy that carried `0228`
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`, the everyone-flag flip, 2026-10-13
