# Verify the FIRST-EVER weekly backup copy after Sunday 2026-09-13 — an observed object, not an inferred one

## ID
0241

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity, and a decorated value is reported as drift. **Do not decorate it.** Any
qualifier goes in prose below the field, never in the field.

⛔ **This is NOT Sprint 4.** 🔴 **Owner ruling 2026-09-11, given live in the lead session and relayed
through the spawning session: FILE IT AS A TASK.** The owner **declined** two cheaper alternatives —
*"just check it on Monday"* and *folding it into [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)* — and ruled that it be **tracked**.
⚠️ **The owner ruled that it be TRACKED. The owner did NOT rule where it sits, what it is worth, or
when it runs.** It is filed on the unranked Backlog board.

## Priority
**Low** — *(producer's rank, NOT owner-ruled)*

⚠️ **State the authority before the label, because they differ here.** The **owner** ruled only that
this be filed as a task rather than checked ad hoc. The **`Low`** rank is the **producer's**
judgement: the check itself is a few minutes of looking, nothing is blocked on it *today*, and the
object it looks for will not exist until Sunday. ⛔ **Do not cite this rank as an owner ruling.**

🔴 **`Low` is a rank, not an assessment of consequence.** The consequence if the weekly path is broken
is **not** low — see *Context*. It is ranked `Low` because it is **cheap and small**, and because its
only real deadline is *"before `0219` builds its consumer."*

🔒 **ADR-035 — this row was APPENDED at the bottom of [`backlog.md`](../../../sprints/backlog.md).**
No row moved, nothing was renumbered, no closed row was touched. **Bottom-of-board means "added last",
and nothing more** — it is not a ranking statement.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
⏳ **Wall-clock only — no task dependency.** The object this task looks for **cannot exist** before
**Sunday 2026-09-13, 02:30 UTC**. ⛔ **Nothing can be verified before then, and starting early proves
nothing** — an empty `weekly/` prefix on Saturday is the *expected* state, not a finding.

## Context

### 🚨 Sunday 2026-09-13, 02:30 UTC is the FIRST EVER weekly-copy attempt against the current bucket — and nothing is watching it

`profile-backup.sh:171-177` writes the **weekly** copy of the nightly dump. It fires **only on a
Sunday**. The current bucket was created on **2026-09-10** (a brand-new bucket, owner ruling
2026-09-08), and **the last Sunday predates it** — so that code path has **never executed against this
bucket**.

**Observed by [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
on 2026-09-11: the `weekly/` prefix is EMPTY.** That is `0218`'s residual 3.

### 🔴 Why this is not busywork — it GATES `0219`

[`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (P4)
builds the **freshness monitor** that reads the backup signals on that box.

🚨 **If the weekly path silently fails, `0219` would build a monitor for a path that does not work** —
and a monitor built on a broken producer is worse than no monitor, because it manufactures confidence.
⛔ **This check must happen BEFORE `0219` builds its consumer.**

### ⚠️ Two things the verifier must already know, or they will misread what they find

1. **Sunday's run will capture an EMPTY database.** `0218`'s drill data (76 synthetic rows) was
   **deliberately removed on 2026-09-11**, and [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
   — the task that wires the game server and creates real rows — **has not run.** So a weekly object of
   roughly the empty-dump size is **correct and expected**, not a failure. ⛔ **Do not read "small
   object" as "broken backup."**
2. **Retention: a Sunday weekly copy is retained ~56 days.** So this particular object — a dump of an
   empty database — occupies the weekly slot for roughly two months. **That is a known, accepted
   consequence of proving the path now rather than later**, and it is recorded here so nobody later
   reads a two-month-old empty weekly object as evidence of a stalled backup.

### ⛔ What this task is NOT

- **Not** the freshness monitor — that is `0219`.
- **Not** a proof that a *scheduled* backup captures *real data*. 🚨 **`0218` residual 1 stands:
  THE SCHEDULE AND THE DATA ARE PROVEN SEPARATELY, NEVER TOGETHER.** This task does not close that gap
  and must not be reported as closing it.
- **Not** a restore drill. Restoring the weekly object is out of scope; `0218` proved the restore path
  against the **daily** object.

## What to build

Nothing is built. This is a **single verification, plus a written record of what was found.**

1. **After Sunday 2026-09-13, 02:30 UTC**, list the `weekly/` prefix in the current backup bucket and
   record whether an object is there, its **key** and its **size in bytes**.
2. **Read the box-side evidence for that same run** — the scheduler record for 02:30 on 2026-09-13,
   the `backup.sh` script log for that run, and `last-backup.json`.
3. **If the weekly object is ABSENT:** record the failure **as observed**, capture whatever the script
   log says, and ⛔ **stop — do not fix it in this task.** Diagnosing or repairing the weekly path is
   new scope and needs its own brief. **Say so and hand it back.**
4. **Write the result into a worklog** in this task folder, and **flag the outcome to `0219`** — it is
   the consumer that was waiting on this answer.

🔒 **No secrets in any artifact** — no bucket name, no endpoint, no credentials, no key material, no
public IP. **Object file names, byte sizes and table names only.**

## Verification steps

1. **An object in the `weekly/` prefix was OBSERVED** — its key and byte size are recorded. 🚨 **The
   acceptance is an OBSERVED object, NOT an inferred one.** ⛔ **A log line saying the copy was made is
   NOT acceptance** — `0218` established that four of five nightly log lines corresponded to objects in
   a bucket that no longer exists. **A log line is not a retrievable object.**
2. **The 2026-09-13 02:30 UTC scheduler record and the script log for that run are recorded**, so the
   weekly object is tied to the run that produced it.
3. **The finding is written down** — in this task's worklog — whether it is a pass or a failure. ⚠️ **A
   failure is a complete result for this task, not an unfinished one.**
4. **`0219` has been told the answer**, since its consumer work was gated on it.
5. 🔒 **No values anywhere** — no bucket, no endpoint, no credential, no key material.

## Notes

- **Depends on:** nothing
- **Blocks:** 0219

⚠️ **The `Blocks` line above is a GATE, not a hard technical block.** `0219` has other work it can do;
what it must not do is **build or ship the freshness monitor's weekly-path handling before this
answer exists.**

- **Effort: minutes, plus waiting for Sunday.** The waiting is the whole schedule.
- **Discovered by [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)**
  (residual 3), which proved the restore path and the nightly schedule but **never exercised the weekly
  path.**
- ⚠️ **If [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) lands before this runs,
  the premise in *Context* changes** — the database would no longer be empty, and the expected object
  size changes with it. **Re-read the context before acting; do not assume "empty" still holds.**
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
