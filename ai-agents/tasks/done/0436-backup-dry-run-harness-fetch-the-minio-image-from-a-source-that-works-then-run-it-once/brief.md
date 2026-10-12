# Backup dry-run harness: fetch the MinIO image from a source that works, then run it once

## ID
0436

> ℹ️ **ID allocation, checked 2026-10-11 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0435` (folder names and `## ID` fields agree). `0436`: no task folder, no
> `## ID` hit, nothing in `.claude/`; the one repo-wide hit is inside a git blob hash in `0327`'s worklog (not a task
> reference).

## Sprint
Sprint 8 *(was ~~Backlog~~ — moved 2026-10-11, see below)*

> ➡️ **MOVED TO [SPRINT 8](../../../sprints/plan-sprint-8.md) ON 2026-10-11 — OWNER RULING given live via
> `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Verbatim selection: **"0436 backup test fix"** (same question as
> `0437`'s move — work to do while waiting on Yandex infrastructure). Appended to Sprint 8 at rank 36 (ADR-035 append
> position, not a merit rank). The Backlog-board row is kept as `➡️ Moved`. The filing note below (*"not Sprint 8"*)
> is history.

> 📌 **OWNER RULING, 2026-10-11, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead`
> to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim: **"Close
> 0430, file a fix task (Recommended)"** — option text: *"The producer closes 0430 and notes the dry run couldn't run. A
> small backlog task fixes the test to fetch MinIO from a source that works, then runs it once."* Filed on the Backlog
> board, **not** Sprint 8.

## Priority
36 on Sprint 8 *(append rank, not a merit rank; was ~~Unscheduled~~)*

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

*(Task type: routine-fix — model routing in `CLAUDE.md` sends routine fixes to Codex; the accountable fkit seat is the
coder.)*

## Context

**What is broken.** The full backup dry-run, `tests/profile-backup-dryrun.sh` (run with `npm run test:scripts:docker`),
starts a local MinIO container to stand in for the real S3 storage. Its compose block asks for the image
`minio/minio` from Docker Hub with no tag. Docker Hub now refuses it: *"pull access denied for minio/minio, repository
does not exist or may require 'docker login'"*. The run dies about 2 seconds in, at container start, before anything is
tested.

- Seen twice: in [`0425`](../../done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md)
  (2026-10-09) and in [`0430`](../../done/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md)
  step (f) (2026-10-11), on the owner's Mac with Docker up and every other tool present.
- **Likely cause — unverified:** the image is no longer published there under that name. Confirm before relying on it.

**Why it matters.** This is the only test that runs the real `profile-backup.sh` end to end: dump → encrypt (`age`) →
upload (`rclone`) → download → restore → compare. Since migration `008` (`tester_role_snapshots`, from `0425`) that
chain has **never** run — only the restore drill's SQL part was proven, against a throwaway Postgres. Running this once
closes the last unproven item of `0425` and `0430`.

**Not in `npm test`, on purpose.** `CLAUDE.md`'s shell-harness table lists this harness as deliberately outside
`npm test` (it needs Docker plus `age`, `age-keygen`, `rclone`, `curl`, `jq`). This task does **not** change that.

## What to build

1. **Point the MinIO service at an image that can be pulled, pinned to an exact tag** (never a floating `latest`).
   Candidates, in order of preference: the same project's image on another registry (for example `quay.io/minio/minio`
   at a pinned release tag), or another S3-compatible stand-in if MinIO is not available anywhere suitable. Keep
   the swap minimal: the health check (`/minio/health/live`), the published port, the `rclone` provider setting
   (`Minio`) and the bucket setup must still work — adjust them only if the chosen image requires it, and say so.
2. **Update the harness's own comments** that name the image, if any, so they match.
3. **Run it once**: `npm run test:scripts:docker`. Record the result in this task's `worklog.md`.
4. If the run **fails for a reason other than the image** — a real defect in `profile-backup.sh`, the drill SQL, or
   the `008` coverage — **do not fix it here**: record the exact failing line and report it, so a separate task can
   be filed.

## Verification steps

1. `npm run test:scripts:docker` pulls the new image with no login and starts all three containers.
2. The run prints **`fingerprint IDENTICAL (11 tables, …)`** and ends with **`RESULT: N passed, 0 failed`**, exit 0.
   The worklog records N, the date, and the exact image reference used (registry + tag).
3. The run's "verify.sql covers every source table (uncovered_tables: none)" check passes — so `tester_role_snapshots`
   is covered.
4. The image reference in the harness is pinned to an exact tag (no tag, or `latest`, fails this step).
5. `npm test` is unchanged — this harness is still not part of it (`tests/scripts/ShellHarnesses.test.ts` not edited
   to add it).

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing. It completes the last unproven item of `0425` and `0430`, both already closed.
  *(2026-10-11: also blocks [`0438`](../../backlog/0438-restore-drill-seeds-no-tester-role-snapshot-row-so-the-snapshot-data-is-never-compared/brief.md) — the drill-seed follow-up found by this task's coder; it needs the working image from this task.)*
- Needs a Mac with Docker running (Docker Desktop cannot be started headlessly — ask the owner to start it) and `age`,
  `age-keygen`, `rclone`, `curl`, `jq` installed.
- ⚠️ Worth a look while in there, not a required change: the harness's cleanup check reads *"returned all 9 data tables
  to 0 rows"* while the fingerprint covers 11 tables. It may be right (bookkeeping tables are not seeded); confirm
  rather than assume, and report what you found.
- No hosts, ids, keys or secrets in the brief or worklog. The harness's MinIO credentials are local throwaway test
  values, already in the file.
- Filed 2026-10-11 by a spawned `fkit-producer` at `0430`'s close, on the owner ruling above. ⛔ Not producer precedent.
