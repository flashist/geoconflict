# Re-check fail2ban on telemetry and game dev a few hours after password login was turned off (0452 V5)

## ID
0462

> ℹ️ **ID allocation, checked 2026-10-15 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0461`. `0462`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0462*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING given live on 2026-10-15 in the main session** (the owner's own words), relayed by the main session
> to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037); ⛔ **not producer precedent.** Verbatim:
> *"I think we need to create a task to the current sprint, to keep track of it."* — "it" being the fail2ban re-check
> after password login was turned off. "Current sprint" resolved with `dashboard.sh select-active` → Sprint 8 (the only
> `🔄 In progress` board).

## Priority
53

⚠️ **Priority 53 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~. ✅ **Merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion` in the main session, relayed by the main session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Rank number unchanged (ADR-035). See the 2026-10-15 four-rulings addendum on the [Sprint 8 board](../../../sprints/done/plan-sprint-8.md).
**On merit this belongs directly below `0452`**, because it is one of `0452`'s own verification steps (V5) for two of
its three boxes, and it is time-gated, so it cannot run before `0452`'s game dev and telemetry steps anyway. ADR-035
forbids inserting a new row above closed rows, so it appends after the highest (52, `0350`).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** **Agent SSH to the boxes was DENIED by the permission classifier
in `0445`**, so the owner runs the two read-only commands from the Mac and pastes the count lines. An agent gives the
owner the exact commands in-session, reads the pasted output, and writes it into this task's `worklog.md` and `0452`'s
`worklog.md`.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0452` /
`0445`.)*

## Context

**In plain terms.** On 2026-10-15 (around 12:15 MSK, per the main session) task `0452` turned SSH password login off on
the **telemetry** box and the **game dev** box. Its worklog records V2, V3 and V4 as passed on both. One check is left
for those two boxes: `0452`'s verification step 6 (**V5**) — a few hours after the change, fail2ban's SSH jail should
still be up and its "Total failed" count should have kept rising. That shows the jail still sees the login attempts
that the internet keeps throwing at the boxes, now that they are refused. This task exists so that check is not
forgotten while `0452` stays open for game prod.

**Relationship to `0452` — read this so nobody counts it twice.** This task **is** `0452`'s V5 for game dev and
telemetry. It is not an extra check. When it passes, `0452`'s worklog records V5 as passed for those two boxes, and
`0452`'s V5 then remains open **only for game prod**, which gets its own change and its own V5 in the weekend slot under
`0452`. `0452`'s brief is not edited by this filing.

**Baselines — P4 in `0452`'s worklog, 2026-10-15, counts only:**

| Box | "Total failed" at P4 |
|---|---|
| Telemetry | 25430 |
| Game dev | 160736 |

**Source:** [`0452`](../../backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md)
— its brief (verification step 6, V5) and `worklog.md` (P4 table; telemetry and game dev sections, each ending
*"V5 — pending"*). The change itself was built by
[`0442`](../../done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md).

**Out of scope:** game prod (its change and its V5 belong to `0452`'s weekend-slot half); the profile box; changing any
fail2ban setting (same as `0452`); any repo change.

## What to build

Nothing. Owner check only.

1. **Time gate.** Run no earlier than a few hours after the change (~12:15 MSK, 2026-10-15) — the later the better
   within the day, so the counts have had time to move.
2. **Telemetry.** From the Mac, one key session on the telemetry box, with the telemetry key
   (`~/.ssh/geoconflict-telemetry`, `IdentitiesOnly=yes`, user `root`), running `fail2ban-client status sshd` and keeping
   only the `Currently` and `Total` lines. The agent gives the owner the exact command, with the box address, in the
   session.
3. **Game dev.** The same, on the game dev box, with the game key (`~/.ssh/geoconflict-game`).
4. **Paste** both outputs (count lines only — no addresses, no banned-IP list).
5. **Record** in this task's `worklog.md` **and** in `0452`'s `worklog.md` (under each box's section, replacing
   *"V5 — pending"* with the result): date, time of the check (MSK), currently failed / total failed / currently banned /
   total banned per box, and pass or stalled.

⛔ **Nothing written here names a host, address, key contents or password.** Box names, dates, times and counts only.

## Verification steps

1. **Pass — telemetry:** `fail2ban-client status sshd` answers (the jail is up), and "Total failed" is **higher than
   25430**.
2. **Pass — game dev:** `fail2ban-client status sshd` answers (the jail is up), and "Total failed" is **higher than
   160736**.
3. Both results, with the date and time of the check, are written in this task's `worklog.md` and in `0452`'s
   `worklog.md`, and `0452`'s *Where 0452 stands* list shows V5 passed (or stalled) for these two boxes.
4. Nothing written for this task names a host, address, key contents or password.

**If a box fails** (jail does not answer, or "Total failed" did not rise): record exactly what was seen and file a
follow-up task — do **not** change fail2ban settings under this task (out of scope, same as `0452`). One possible
reason to note for whoever looks into it, not a conclusion: with passwords off, the refused attempts may be logged
differently and fail2ban's SSH filter may no longer count them.

## Notes
- **Depends on:** 0452's game dev and telemetry box steps only — done 2026-10-15 (V2–V4 passed on both), so this is satisfied; NOT on 0452's close (0452 stays open for game prod). Time-gated: run no earlier than a few hours after ~12:15 MSK 2026-10-15.
- **Blocks:** nothing formally — its result is 0452's V5 for game dev and telemetry, which 0452 needs before it can close.
- **Game prod is not here.** Its V5 is part of `0452`'s weekend-slot half.
- Sources read 2026-10-15: `0452` `brief.md` (verification steps, *Out of scope*) and `worklog.md` (P4 table, telemetry
  and game dev sections, *Where 0452 stands*).
