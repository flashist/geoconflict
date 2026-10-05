# Verify 0391 live — stale login share at most 5% over 7 days (the S2-exit re-check)

## ID
0392

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0390`. `0391`–`0393` allocated in this run, in dependency order.

## Sprint
Sprint 8

## Priority
8

> ⚠️ **Priority 8 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner placed it at the top of Sprint 8 (*"Fix: Sprint
> 7, check: Sprint 8 (Recommended)"*, 2026-10-05, applying the 2026-09-29 build/verify rule), and `0370` holds rank 1
> by an earlier ruling. Among the open verify rows it is also the one with the most work waiting behind it (`0340` and
> six tasks after that).
>
> **"Top" conflicts with ADR-035, stated plainly.** On the [Sprint 8 board](../../../sprints/plan-sprint-8.md), ranks
> 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would
> renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always appends, and a spawned
> producer never re-ranks. So it was **appended at 8** — the same branch taken for `0390`. **Read it as top group,
> worked first among the open verify rows, whatever the number says.** Owner decision: keep 8, or rule a placement
> that renumbers no closed row.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **MAY BE EXECUTED BY THE OWNER, or by an agent session with the owner's approval for read-only
SSH.** The reading is read-only (`SELECT` only, `--readonly=1`). The owner approved read-only SSH for `0373`'s reads on
2026-10-05 (*"Regarding reading only ssh to a server: I give you my approve."*); confirm that approval still covers
this task before an agent runs it. **The pass/fail call is recorded against the owner's threshold; the next step on a
fail is the owner's.**

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.
Verbatim:
- Good-enough threshold: **"At most 5% (Recommended)"** — stale share on the server, over 7 days after the fix ships.
  It gates starting `0340`.
- Placement: **"Fix: Sprint 7, check: Sprint 8 (Recommended)"** — this is the check: the 7-day S2-exit re-check after
  deploy, at the top of Sprint 8 per the 2026-09-29 build/verify rule.

**What this verifies.** [`0391`](../0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
widens the login-signature freshness window from 15 min to 24 h and checks the player id before the age. `0373`
predicts the server stale share falls from ≈34% to **~2.5%** (only notes over 24 h old stay stale). This task reads
the real share over 7 days and compares it with the owner's threshold.

**What "stale" means now.** Since `0391` the id is checked first, so `stale` = "right player, note too old". Before
it, `stale` also hid any id mismatch on an old note. `id_mismatch` was ~0.04% (6 of ~16.6K) in `0373`'s window, so the
two readings stay comparable; record both anyway.

### Preconditions
- `0391` is **committed** (the owner commits) and shipped in a **profile deploy** (target weekend slot 10/11 Oct).
  Record the deploy date and the first post-deploy point. If `0391`'s client part shipped too, record the game deploy
  date as well.
- **7 full days** of data since the first post-deploy point. Earliest read if it ships 10/11 Oct: 17/18 Oct (UTC).
- Read-only access to the telemetry box. ⚠️ Unreachable while a full-tunnel VPN is on (project memory note).

## What to build

Nothing — this is a check. Same method as `0373`'s Step 1 (its worklog, *INTERIM Step 1 (server)*).

1. **Outcome counter** (`geoconflict_profile_login_verification`, label `outcome`), summed over the 7 days from the
   first post-deploy point: counts of every outcome (`ok`, `stale`, `id_mismatch`, `absent`, `bad_*` if any).
   **Stale share = stale ÷ all outcomes** — the same denominator as `0339`/`0373`.
2. **Per day and per hour of day (UTC)**, the stale share — to see that no day or evening hides a problem. Informational;
   the pass rule is the 7-day share.
3. **Stale-age brackets** (as reworked by `0391`) over the same window.
4. **`id_mismatch` share** over the same window, next to the ~0.04% baseline.
5. ⚠️ **The profile deploy restarts the counters.** Read only inside the post-deploy window; never subtract or compare
   a cumulative value across a restart. If another profile deploy lands inside the 7 days, say so and treat the window
   as two pieces.

## Verification steps

1. The worklog records the deploy date, the window (UTC start and end), the source, and every count and share above.
2. **Pass = the 7-day server stale share is at most 5%.** The worklog states the verdict in one line: `PASS` or
   `FAIL`, with the number.
3. **On PASS:** `0340` may start — **but it still needs the owner's explicit OK to enforce**, which is gate item 2 in
   [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md)'s brief. **Meeting the ≤5% gate does not approve
   enforcing on its own** — [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
   Decision 4 keeps ADR-116's separate, explicit owner approval for S3a. This task closing does not give that OK.
4. **On FAIL:** no fix is chosen here. Record the readings and put the next step to the owner (`0340` stays blocked).
5. The per-day / per-hour table and the bracket split are recorded, with any day above 5% called out.
6. No secret, key, real player id, signature, token, host, IP or connection string in any artifact.

## Notes

- **Depends on:** [`0391`](../0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  (hard — committed, shipped in a profile deploy, plus 7 days of data).
- **Blocks:** [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — its S2 exit; plus the owner's
  separate OK to enforce).
- **Related:** [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (the decision and the baseline
  readings), [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (the first S2
  reading), `0366` (the brackets),
  [`0393`](../0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md) (the
  watch task on the >24 h residue), [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) (Decision 4: the gate).
- **Does not block Sprint 7's deploy** (the build/verify rule).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
