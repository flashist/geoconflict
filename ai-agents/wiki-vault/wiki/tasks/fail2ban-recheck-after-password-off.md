# Re-check fail2ban on Telemetry and Game Dev After Password Login Was Turned Off (task 0462 — 0452's V5)

**Source**: `ai-agents/tasks/done/0462-re-check-fail2ban-on-telemetry-and-game-dev-a-few-hours-after-password-login-was-turned-off/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 53 (ADR-035 append rank; on merit directly below `0452`, owner-confirmed 2026-10-15) / task `0462`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-15. Filed the same day on the owner's words *"I think we
> need to create a task to the current sprint, to keep track of it."* **Run by `fkit-lead` over SSH from the Mac with
> the owner's in-session OK** — not by the owner by hand, as the brief's *Owner* field expected (agent SSH had been
> denied by the permission classifier during `0445`). Read-only: `fail2ban-client status sshd`, count lines only.
> Re-verified by me: nothing — no box access.
>
> ⛔ No host, address, key contents or password on this page — box names, times and counts only.

## Goal

This task **is** `0452`'s verification step 6 (**V5**) for two of its three boxes — not an extra check. On 2026-10-15
(~12:15 MSK) `0452` turned SSH password login off on **telemetry** and **game dev**
([[tasks/ssh-password-login-off]]). A few hours later, fail2ban's sshd jail should still answer and its "Total failed"
count should have kept rising — proof the jail still sees the internet's login attempts now that they are refused.
Game prod's V5 stays with `0452`'s weekend-slot half.

**Baselines (`0452`'s P4, 2026-10-15):** telemetry 25430, game dev 160736 total failed.

## Key Changes

Nothing in the repo or on any box. One read-only check per box, 2026-10-15 **16:01 MSK** (~3 h 45 min after the change):

| Box | Jail answers | Currently failed | Total failed | Currently banned | Total banned | Result |
|---|---|---|---|---|---|---|
| Telemetry | yes | 3 | **25627** (P4 25430) | 0 | 4180 | ✅ PASS — rose by 197; fail2ban running since 2026-10-03, so directly comparable |
| Game dev | yes | 2 | **9** (P4 160736) | 1 | 1 | ✅ PASS **with a note**, by owner ruling |

## Outcome

- **V1 passed** (telemetry).
- **V2 passed per owner ruling** *"Pass, with the note (Recommended)"*. Its literal test (> 160736) **could not apply**:
  fail2ban on game dev had been stopped and started at 15:47–15:55 MSK by `0449`'s step 7 test (fail2ban down / back,
  [[tasks/ssh-security-alerts]]), and a restart resets fail2ban's in-memory counters. In the ~6 minutes since the
  restart the jail counted 9 failures and banned 1 attacker with password login off, and the sshd journal showed 553
  refused / invalid-auth lines since 12:15 MSK — showing the filter still counts refused attempts.
- **V3 passed** — results written in this task's worklog and in `0452`'s (both box sections and *Where 0452 stands*).
  **V4 passed** — no host, address, key or password in either.
- **No follow-up task** — no box stalled. ⚠️ Lesson worth keeping: **a fail2ban restart voids a "Total failed"
  before/after comparison**; order such tests after the re-check, or take a new baseline.
- `0452` stays `🔄 In progress` for game prod (weekend slot, V5 still pending there) and the Q3 switch removal.

## Related

- [[tasks/ssh-password-login-off]] — task `0442` / verify `0452`, whose V5 this is for telemetry and game dev
- [[tasks/ssh-security-alerts]] — task `0443` / verify `0449`, whose fail2ban down/back test reset game dev's counters
- [[decisions/sprint-8]] — the board (rank 53)
