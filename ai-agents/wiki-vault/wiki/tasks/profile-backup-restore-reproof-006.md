# Profile Backup Restore Re-proved on the `006` Schema — the "never tested" alarm is closed

**Source**: `ai-agents/tasks/done/0275-profile-backup-restore-reproof-on-006-schema/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0275`

## Goal

**Re-prove the restore path against the schema the box actually runs.**

The only proof that a profile backup restores was `0218`, made on the **pre-`006`** schema. Migration
`006` ([[tasks/profile-identity-s1-database-rekeying]], deployed 2026-09-15) **dropped every old table**
and re-keyed every child table to `player_id`. **The restore path had never run against that shape**, and
nothing turned red when the schema changed:

- `tests/profile-backup-dryrun.sh` still applied only migration `001` and seeded the dropped tables — and
  it is **not in `npm test`** (it needs Docker plus `age`, `rclone`, `curl`, `jq`).
- The runbook's behavioural check inserted into a **column that no longer exists**, and its pass criteria
  said *"all eight tables"* when `006` has more.
- The drill's `verify.sql` lived in `0218`'s plan, against the old table list.

🚩 **Why "the command exited 0" is not the deliverable:** `0218` had already established that the value is
in **counts, content digests, constraint/index shape and the behavioural checks** — and those were written
against names that no longer exist, so they would now **fail or silently check nothing**.

⏱️ **Timing risk, flagged and acted on:** the drill seeds synthetic rows **into the live database**. That
is free only while the tables hold 0 rows. **Part B had to run before `0273` deployed**, or the plan would
have needed to seed somewhere else.

## Key Changes

- **Part A (local, no box):** `tests/profile-backup-dryrun.sh` rebuilt to construct its source DB on the
  **current** schema (`001–004` + `006`, recorded the way the real runner records them), seed a
  representative set (a bigint `xp` above int4 range, a NULL and a non-ASCII display name, linked
  identities, and at least one keyed child row per re-keyed relationship), and assert on the **new**
  tables — per-table counts, one spot-checked row by content, and that the key constraints survived. Every
  other test in the script kept working.
- **The runbook's drill section updated** (`profile-backup-restore-runbook.md`) so the verify step, table
  list, behavioural checks and pass criteria name the `006` tables and columns.
- **Part B (on the box, owner-executed):** seed prefixed synthetic data → source fingerprint → backup
  (encrypt + upload) → restore into a **throwaway** target → compare → behavioural checks → tear down.

## Outcome

### 🎉 The headline: **`IDENTICAL`.**

Part B ran on the live profile box **2026-09-16 and passed completely**. The restore path is proven end to
end on the `006` schema **with non-empty data**: **all 10 tables, both sequences, and the constraint- and
index-DEFINITION digests matched** (source and restored comparison files byte-identical); **all eight
behavioural lines printed verbatim**; teardown clean — live tables back to 0 rows, `MIGRATIONS UNCHANGED`,
throwaway container and volume gone, the `age` identity shredded, `/ready` 200. Restore wall clock
**`real 0m1.252s`**.

### 🚨 This closes the standing "never tested" alarm

The claim carried in `0218` and in project memory — ***"NOT proven — THE RESTORE PATH HAS NEVER BEEN
TESTED"*** — **is closed by evidence as of 2026-09-16.** `0218`'s brief was annotated in place; its
pre-work *"restore is still unproven"* statements are **struck and marked superseded, not deleted**.

### ⚠️ What this close does NOT say — none of it may be softened when quoting the result

1. **The marker is `(agent-closed — not owner-verified)`** — a spawned producer with no owner channel. **And
   in the other direction: the OWNER personally executed every writing command of Part B and reported the
   output**, with the lead running only read-only checks. **Both facts are true. Quoting either one alone
   misleads.**
2. 🚨 **`real 0m1.252s` is NOT a usable RTO.** It is a **24 KB** dump. **It proves the path works and is
   not pathologically slow; it says NOTHING about restore time at real data volume.** That is `0218`
   residual 2 and **it survives this task unchanged.**
3. **One comparison file was reconstructed, not produced by the drill's own `tee`** — rebuilt from captured
   read-only output. Recorded as a residual; **a future drill should produce it in-line, from the same
   command that produces the values.**
4. **The drill's synthetic rows are inside that day's daily backup object** and stay for its full **14-day**
   retention. **Owner-accepted.** The next night's run writes the next date's key and does not replace it.

⛔ **Still NOT closed by this task:** `0218`'s residual 1 — **a cron-produced backup of REAL data**. Every
cron-produced object ever written is a dump of an empty database and the only non-empty backups were
hand-run. **The schedule and the data are still proven separately, never together.** That stays with
`0217` / `0219`.

**Key custody** was deliberately **not** carried here — the item the drill surfaced is filed as its own
task, `0281` (move the backup `age` identity into the owner's password manager).

## Related

- [[tasks/profile-durability-restore-drill]] — task `0218`, the original drill this re-proves and annotates
- [[tasks/profile-identity-s1-database-rekeying]] — task `0270`, the `006` schema this proves against
- [[decisions/adr-113-internal-player-id]] — the decision behind that schema
- [[tasks/postgres-backup-routine]] — the backup script and schedule this exercises
- [[systems/player-profile-store]] — the store being backed up
- [[decisions/profile-storage-strategy]] — the storage shape the digests compare
- [[decisions/sprint-4]] — the sprint that owns it
- [[tasks/profile-weekly-backup-copy-verified]] — task `0241`: the weekly-copy half, proven separately
- [[tasks/profile-p2-wire-game-server]] — task `0217`, which required this re-proof before `PROFILE_INTERNAL_TOKEN` was set
