# Restore drill seeds no `tester_role_snapshots` row, so a snapshot row's data is never compared

## ID
0438

> ℹ️ **ID allocation, checked 2026-10-11 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0437` (folder names and `## ID` fields agree). `0438`: no task folder, no
> `## ID` hit, nothing in `.claude/`, no repo-wide hit outside `node_modules`/`.git`, no branch or path in git history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-11, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead`
> to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim:
> **"File it, backlog (Recommended)"**. Filed on the Backlog board.

## Priority
Unscheduled — **low**

## Status
🔲 Backlog

## Owner
fkit-coder

*(Task type: routine-fix — model routing in `CLAUDE.md` sends routine fixes to Codex; the accountable fkit seat is the
coder.)*

## Context

**Found by `0436`'s coder, 2026-10-11.**

**What the gap is.** The profile backup restore drill uses four shared SQL files in
`tests/testdata/profile-restore-drill/`: `seed.sql`, `verify.sql`, `behaviour.sql`, `cleanup.sql`. They are run by the
local full dry-run, `tests/profile-backup-dryrun.sh` (`npm run test:scripts:docker`), **and** by the owner on the live
profile box, per [`profile-backup-restore-runbook.md`](../../../knowledge-base/profile-backup-restore-runbook.md)
(§ *Restore TEST drill*). `seed.sql`'s header says why they are shared: "so every SQL step the owner runs was run
locally first".

`tester_role_snapshots` (migration `008`, task
[`0425`](../../done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md))
is covered by `verify.sql`'s fingerprint, but **`seed.sql` writes no row to it**. The runbook records this ("the seed
writes no rows to it"; expected count `tester_role_snapshots 0`). So a drill run proves:
- ✅ the table and its structure survive dump → encrypt → upload → download → restore;
- ❌ **not** that a snapshot row's **data** survives — the `jsonb` `tenure_evidence`, the `timestamptz` columns, and
  the `chk_tenure_snapshot_complete` CHECK (all three tenure columns set exactly when `tenure_grant_present`) are never
  exercised. Fingerprinting an empty table compares nothing.

**Why it matters, and why low.** A snapshot row is what `restore` uses to put a tester's account back exactly. If a
restored backup mangled one, the tester could not be restored. Low priority because snapshot rows are rare (one
allowlisted tester, only while a role is applied), and `pg_dump` / `pg_restore` round-trip `jsonb` and `timestamptz`
routinely — this closes a coverage gap; it is not a suspected defect.

## What to build

1. **`seed.sql`: add one synthetic `tester_role_snapshots` row** for one of the existing drill players (the
   `00000275-0000-4000-8000-…` uuid block), with `tenure_grant_present = true` so every tenure column, including a
   non-trivial `jsonb` `tenure_evidence`, holds a value, and explicit `timestamptz` values (not only `now()`).
   Synthetic values only.
2. **`cleanup.sql`: make sure the row is deleted and counted.** `players` delete cascades to it (`on delete cascade`),
   but add `tester_role_snapshots` to the printed `drill cleanup counts:` line so a leftover is visible. Update the
   harness's exact expected line and its "all 9 data tables" message to match.
3. **`verify.sql` / expected counts:** the fingerprint already includes the table; update any expected per-table count
   (`tester_role_snapshots 0` → `1`) in the harness and in the runbook's expected-output block.
4. **`behaviour.sql` (optional, coder's call, recorded in the worklog):** a check that the restored DB still rejects a
   snapshot row breaking `chk_tenure_snapshot_complete`, in the same rejected-insert style as checks (a)–(a3), and
   that check (b)'s cascade also removes the snapshot row. If added, update the harness's `expect_line`s.
5. **Consider (not required):** `seed.sql`'s refuse-if-any-rows guard does not list `tester_role_snapshots`. A row there
   implies a `players` row, which the guard already checks, so this is likely harmless — confirm and say so.
6. **Keep the SQL usable on the live box.** The owner runs these files on the live profile box by hand. Nothing in
   them may assume the local harness (no harness-only variables, no Docker names). After the change, **update the
   runbook's expected outputs** (counts, the cleanup line, any new behaviour lines) so the owner's drill still matches
   line for line.

## Verification steps

1. `npm run test:scripts:docker` passes end to end with the new row: **`fingerprint IDENTICAL (11 tables, …)`** and
   **`RESULT: N passed, 0 failed`**, exit 0. The worklog records N and the date.
2. On the source DB after `seed.sql`, `tester_role_snapshots` holds exactly 1 row; after `cleanup.sql` it holds 0 and
   the printed cleanup line shows `tester_role_snapshots=0`.
3. **Prove the check can fail:** change one value in the seeded snapshot row on the restored DB only (a throwaway
   edit, reverted) and show the fingerprint compare then reports a difference for `tester_role_snapshots`. Record it in
   the worklog.
4. The runbook's expected-output lines match what the harness actually printed (diff them; record in the worklog).
5. `npm test` is unchanged — this harness stays outside it (`tests/scripts/ShellHarnesses.test.ts` not edited to add
   it).

## Notes

- **Depends on:** [`0436`](../../done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md)
  — the dry-run cannot start until it has a pullable MinIO image. The SQL edits can be written before that, but the
  task cannot be verified until `0436` lands.
- **Blocks:** nothing.
- ⚠️ **Live-box drill timing:** if the owner runs the restore drill on the box between this change and its review, the
  new seed row must be cleaned up like every other drill row — the runbook's abort path must still cover it.
- Needs a Mac with Docker running (Docker Desktop cannot be started headlessly — ask the owner to start it) and `age`,
  `age-keygen`, `rclone`, `curl`, `jq` installed.
- No hosts, ids, keys or secrets in the brief, the SQL or the worklog. Synthetic ids only.
- Filed 2026-10-11 by a spawned `fkit-producer` on the owner ruling above. ⛔ Not producer precedent.
