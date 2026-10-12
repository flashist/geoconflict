# 0436 — worklog

## 2026-10-11 — phase 2 (build + one run)

**Approval:** owner ruling, 2026-10-11, live `AskUserQuestion` in the `fkit lead` session, selection
"pgsty/minio (Recommended)". Approved plan: `plan.md` in this folder, blob
`442acf56f0eb4dfc7c83cb281efdcd439109ea86` (re-hashed before editing; unchanged).

### Change

`tests/profile-backup-dryrun.sh`, compose block, MinIO service only:

- `image: minio/minio` → `image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z@sha256:b6bfe7239bfc83fb90d31612d9704d86039dd714f7904b3f1ad68f211e602372`
  (registry: Docker Hub; pinned by tag **and** multi-arch index digest).
- Two-line comment above it: why (`minio/minio` gone from Docker Hub and quay.io) and what the replacement is.
- Nothing else changed: `command:`, health path, published port, credentials, `rclone` provider (`Minio`),
  bucket setup. `tests/scripts/ShellHarnesses.test.ts`, `package.json`, `jest.config.ts`, drill SQL untouched.

### Run

`npm run test:scripts:docker` once, 2026-10-11, owner's Mac (Docker 28.5.1, arm64). **Exit 0.**

- Image pulled with no login; all three containers came up (`ready: postgres`, `ready: restore-target`,
  `ready: minio`).
- `✅ verify.sql covers every source table (uncovered_tables: none)` — so `tester_role_snapshots` (`008`) is in
  the fingerprint.
- `✅ fingerprint IDENTICAL (11 tables, sequences, constraint/index definitions, spot checks)`
- `✅ cleanup returned all 9 data tables to 0 rows`
- **`RESULT: 55 passed, 0 failed`** — no ❌ line anywhere in the output.
- Sections run: source schema checks, TEST 1 (backup), 2 (restore + fingerprint), 2b (behaviour), 2c (cleanup),
  3 (forced failure — the `403 Forbidden` lines in its output are the intended bad-secret failure), 4 (Sunday
  weekly copy), 5 (restore guard), 6 (marker isolation), 8 (retention=0). There is no TEST 7 in the harness
  (pre-existing numbering, not a skipped test).

This is the first end-to-end run of the real `profile-backup.sh` chain since migration `008`.

### Findings carried from the plan

- **Cause confirmed:** Docker Hub API returns 404 for repository `minio/minio`; neither `docker.io/minio/minio`
  nor `quay.io/minio/minio` resolves at `latest` or 4 pinned `RELEASE.*` tags; control images on both
  registries resolve. Full probe table in `plan.md`.
- **"9 data tables" vs "11 tables":** wording is accurate. 11 = the 9 seeded/cleaned tables +
  `schema_migrations` (bookkeeping, checked separately) + `tester_role_snapshots` (not seeded, not counted by
  cleanup; would cascade from `players`). The run confirms it: per-table "count matches" lines cover the 9
  data tables + `schema_migrations`, none for `tester_role_snapshots`.
- **Gap — follow-up filed:** no `tester_role_snapshots` row is seeded, so the run proves the table's presence,
  schema, constraints and indexes survive restore, but **not** a snapshot row's data. Owner ruled "File it,
  backlog"; filed as task `0438`. Not fixed here.

### Decision log (unattended fixes / obvious-winner calls)

none — the only edit is the approved plan's step 1–2, applied as written.

### Not done / not verified

- Not committed (owner commits).
- `npm test` not run (not required: this harness is not part of it, and the jest wrapper was not touched).

## 2026-10-11 — stateful review round 1

Reviewer: ✅ Ready to merge, no findings (`review.md`). Nothing to answer, no code change; ledger `Status` set to `closed-out`.
