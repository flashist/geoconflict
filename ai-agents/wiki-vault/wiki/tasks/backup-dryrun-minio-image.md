# Backup Dry-Run Harness — Fetch the MinIO Image From a Source That Works, Then Run It Once (task 0436)

**Source**: `ai-agents/tasks/done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md` (`plan.md`, `worklog.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 36 (ADR-035 append rank; moved in from the Backlog board 2026-10-11) / task `0436`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-11 on the owner ruling *"Close both (Recommended)"*.
> One run, owner's Mac: **`RESULT: 55 passed, 0 failed`**, fingerprint `IDENTICAL` over **11 tables**, exit 0 — the
> **first end-to-end run of the real `profile-backup.sh` chain since migration `008`**. Code committed in `5449571`
> (test harness only; nothing to deploy).

## Goal

`tests/profile-backup-dryrun.sh` (run with `npm run test:scripts:docker`) is the only test that runs the real backup
script end to end — dump → encrypt (`age`) → upload (`rclone`) → download → restore → compare. It died about 2 s in
because its local S3 stand-in asked Docker Hub for `minio/minio`, which is refused. That blocked the last unproven item
of `0425` and `0430` ([[tasks/tester-roles-command]], [[tasks/tester-roles-live]]). Filed on the owner ruling *"Close
0430, file a fix task (Recommended)"*; moved to Sprint 8 by owner ruling *"0436 backup test fix"* — work to do while
waiting on Yandex infrastructure. Out of scope by design: this harness stays **outside** `npm test`.

## Key Changes

- **Cause confirmed** (plan probes): Docker Hub answers 404 for the `minio/minio` repository; neither Docker Hub nor
  quay.io resolves it at `latest` or at four pinned release tags, while control images on both registries resolve.
- **The fix:** one line in the harness's compose block — the MinIO service now uses `pgsty/minio`, pinned by an exact
  release tag **and** a multi-arch digest (owner ruling *"pgsty/minio (Recommended)"*), plus a two-line comment saying
  why. Nothing else changed: command, health path, port, the throwaway local credentials, the `rclone` provider
  (`Minio`), bucket setup. `ShellHarnesses.test.ts`, `package.json` and `jest.config.ts` untouched.

## Outcome

- **One run, 2026-10-11:** image pulled with no login; all three containers ready; `verify.sql covers every source
  table (uncovered_tables: none)` — so `tester_role_snapshots` is in the fingerprint; `fingerprint IDENTICAL (11
  tables, …)`; cleanup returned the 9 data tables to 0 rows; `RESULT: 55 passed, 0 failed`. (There is no TEST 7 in the
  harness — old numbering, not a skipped test. The `403 Forbidden` lines in TEST 3 are the intended bad-secret
  failure.)
- **"9 data tables" vs "11 tables" is correct wording:** 11 = the 9 seeded tables + `schema_migrations` (checked
  separately) + `tester_role_snapshots` (not seeded).
- ⚠️ **Gap → `0438`** (Backlog, low): no `tester_role_snapshots` row is seeded, so the run proves the table's
  structure (schema, constraints, indexes) survives a restore, **not** a snapshot row's data. Owner ruling *"File it,
  backlog"*.
- Review: no findings (round 1). The second opinion read the source only; the reviewer re-ran the harness once (same
  result). Also settled: `rclone` provider `Minio` here vs `Other` in production — pre-existing, kept.
- 📌 Follow-up ruling 2026-10-12: the review's note that the dry-run tests against the moving `postgres:16-alpine` label
  is covered by `0384` (pin Postgres by digest) — no separate task (*"No new task, 0384 covers it (Recommended)"*).
- `npm test` was not run (not required: this harness is not part of it).

## Related

- [[tasks/tester-roles-live]] — task `0430`, whose step (f) this ran
- [[tasks/tester-roles-command]] — task `0425`, migration `008`
- [[tasks/profile-backup-restore-reproof-006]] — the restore proof on the earlier 10-table schema
- [[tasks/postgres-backup-routine]] — the backup script this harness exercises
- [[systems/player-profile-store]] — the profile database and its backups
- [[decisions/sprint-8]] — the board (rank 36)
- [[decisions/sprint-backlog]] — `0438`, `0384`
