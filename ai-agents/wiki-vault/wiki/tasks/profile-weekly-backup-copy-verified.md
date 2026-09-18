# The First-Ever Weekly Backup Copy — OBSERVED, not inferred

**Source**: `ai-agents/tasks/done/0241-profile-verify-first-weekly-backup-copy/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Backlog board / task `0241`

## Goal

**Watch the weekly backup path execute for the first time ever against the current bucket, and see the
object it produces.**

`profile-backup.sh` writes a **weekly** copy of the nightly dump, and it fires **only on a Sunday**. The
current bucket was created **2026-09-10** (a brand-new bucket by owner ruling), and the last Sunday
predated it — so **that code path had never executed against this bucket**, and `0218` had observed the
`weekly/` prefix **empty** (its residual 3).

🔴 **Why it is not busywork — it GATES `0219`.** `0219` builds the **freshness monitor** that reads the
backup signals on that box. 🚨 **If the weekly path silently failed, `0219` would build a monitor for a
path that does not work — and a monitor built on a broken producer is worse than no monitor, because it
manufactures confidence.**

**Authority, stated before the label because they differ:** the **owner** ruled only that this be **filed
as a task** (declining both *"just check it on Monday"* and folding it into `0219`). The **`Low` rank is
the producer's**. ⛔ **`Low` is a rank, not an assessment of consequence** — it is cheap and small, and its
only real deadline is *before `0219` builds its consumer*.

⏳ **Dependency was wall-clock only.** ⛔ **An empty `weekly/` prefix before the window is the EXPECTED
state, not a finding.**

## Key Changes

**No code.** The deliverable is an observation, taken read-only.

## Outcome

✅ **PASS — the weekly object was OBSERVED in the bucket**, 2026-09-13, from the **scheduled** 02:30 UTC
run. ⛔ **The backup script was NOT run by hand** — the evidence is the untouched cron run, gathered in one
read-only SSH session with nothing written on the box.

Four independent signals agree: the **weekly object key for that date exists**, the **weekly object, the
same day's daily object and the freshness marker's recorded size are all the identical byte count**, the
marker's exit status is `0` with start and finish timestamps inside the window, the **cron record ties it
to the scheduled run**, and the script log shows the **Sunday branch firing with no `WARNING` line**.

### ⚠️ Two things a reader must already know, or they will misread this

1. **That Sunday's run captured an EMPTY database.** `0218`'s drill rows were deliberately removed on
   2026-09-11 and `0217` has not wired crediting, so **a small object is the CORRECT result here** — not a
   sign of a truncated dump.
2. ⛔ **This proves the weekly COPY path, and nothing about restorability of real data.** The
   schedule-and-data gap stands: **every cron-produced object ever written is a dump of an empty database**,
   and the only non-empty round-trips were hand-run — see [[tasks/profile-backup-restore-reproof-006]].

## Related

- [[tasks/profile-durability-restore-drill]] — task `0218`, whose residual 3 this closes
- [[tasks/postgres-backup-routine]] — the script and schedule this observes
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, the restore half, proven separately
- [[systems/player-profile-store]] — the store being backed up
- [[decisions/sprint-backlog]] — the board this row sits on
