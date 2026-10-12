# 0436 — plan (phase 1, for owner approval)

Written 2026-10-11 by `fkit-coder`. No source or test file has been edited yet.

## What the investigation found

**1. The cause is confirmed: MinIO no longer publishes its server image anywhere we can pull from.**

| Probe (2026-10-11, owner's Mac, Docker 28.5.1, arm64) | Result |
|---|---|
| Docker Hub API, repository `minio/minio` | **HTTP 404** — the repository is gone, not just the untagged pull |
| `docker manifest inspect minio/minio` and `:latest` | denied |
| `docker.io/minio/minio` at 4 pinned `RELEASE.*` tags (2024-10 … 2025-05) | all fail |
| `quay.io/minio/minio` at `:latest` and the same 4 pinned tags | all "no such manifest" (quay's tag API answers 401 — not anonymously readable) |
| Control: `quay.io/prometheus/busybox:latest`, `postgres:16-alpine` | both OK — so the registries are reachable; it is the MinIO repos that are gone |

So the brief's first preference (the same project's image on another registry) is **not available**. The
"likely cause — unverified" in the brief is now verified.

**2. Two pullable stand-ins were found and smoke-tested** (pulled locally, started with the harness's
throwaway credentials on a spare loopback port, health check + `rclone` with `provider=Minio`: make bucket,
upload, list, read back, `check`; containers removed afterwards).

| | **A. `pgsty/minio`** (Rec) | **B. `bitnamilegacy/minio`** |
|---|---|---|
| What it is | Community-maintained fork of MinIO (the Pigsty project), still building release images | Bitnami's MinIO image, moved to a "legacy, no longer updated" repo in 2025 |
| Publisher size | ~1.7 M pulls, small project | ~7 M pulls, Bitnami/Broadcom |
| Pinned ref | `pgsty/minio:RELEASE.2026-08-04T00-00-00Z@sha256:b6bfe7239bfc83fb90d31612d9704d86039dd714f7904b3f1ad68f211e602372` | `bitnamilegacy/minio:2025.7.23-debian-12-r5@sha256:6dabb4a2088c9a79908de3bc05f4586c23ad2182c8908e7e3acbf61c1467fb20` |
| Platforms | linux/amd64 + linux/arm64 | linux/amd64 + linux/arm64 |
| Drop-in? | **Yes.** Same entrypoint as the old image; the harness's `command: server /data --address ':9000'` works unchanged. Health `live` in 2 s; rclone round-trip OK. | **No.** With the harness's `command:` line it exits at once (`FATAL Unable to initialize backend: file access denied` — it runs as uid 1001 and `/data` is not writable). With the `command:` line **removed** it works: health `live` in 2 s; rclone round-trip OK. |
| Future | Still updated, but we pin by digest, so updates never reach us unasked | Frozen; Broadcom could remove the legacy repo later |

Not chosen: Chainguard's free MinIO image (only a floating `latest`, so it cannot be pinned to a tag as the
brief requires); a non-MinIO S3 stand-in (would change the `rclone` provider and the health path — the brief
asks to avoid that while a MinIO-compatible image exists).

**Trust note, in plain words:** either way, the harness would run an image from a publisher other than MinIO
on the owner's Mac. It only ever sees throwaway test data and throwaway credentials, and it is bound to
`127.0.0.1` only. Pinning by digest (the `@sha256:` part) means the exact bytes tested today are what runs
later — a re-pushed tag cannot change it.

**3. "9 data tables" vs "11 tables" — the wording is accurate; one coverage gap found.**

The fingerprint (`verify.sql`) covers 11 tables = the 9 tables the drill seeds and cleans **+**
`schema_migrations` (bookkeeping; cleanup deliberately leaves it alone and checks it separately) **+**
`tester_role_snapshots` (migration `008`, task `0425`). `seed.sql` writes **no** `tester_role_snapshots`
rows and `cleanup.sql` does not count it (it would be emptied anyway: `on delete cascade` from `players`).
So "cleanup returned all 9 data tables to 0 rows" is true for what it checks.

⚠️ **Gap (report only, not fixed here):** because no snapshot row is seeded, a run proves that
`tester_role_snapshots` is **present, empty and structurally identical** after restore (its constraints and
indexes are in the schema digests, and `uncovered_tables: none` will pass), but it does **not** prove a
snapshot row's *data* (jsonb, timestamps, the tenure CHECK) survives dump → restore. Closing that means
editing `seed.sql`/`cleanup.sql`/`behaviour.sql`, which are the same files the owner runs on the live box in
the restore drill — out of this task's scope. Owner may want a follow-up task.

Also noted, not changed: the harness uses `rclone` provider `Minio`; production (`setup-profile.sh`) uses
`Other`. Pre-existing; the brief says keep `Minio`.

## Plan (after approval)

1. **`tests/profile-backup-dryrun.sh`, compose block** — replace `image: minio/minio` with the approved
   pinned reference (tag + digest).
   - Option A: one-line change; nothing else moves.
   - Option B: same line **plus** delete the `command: server /data --address ':9000'` line (Bitnami's own
     start script serves on `:9000` from its own data directory). Health path, port `59000`, credentials,
     `rclone` provider and bucket setup unchanged.
2. **Harness comments** — add a one-line comment above the `image:` line saying why: the `minio/minio` repo
   was removed from Docker Hub and quay.io (checked 2026-10-11), and what the replacement is. The file's
   other comments say "MinIO" generically and stay correct for either option.
3. **Run it once:** `npm run test:scripts:docker` (not part of `npm test`; no full jest run). Expect
   `fingerprint IDENTICAL (11 tables, …)`, `uncovered_tables: none`, and `RESULT: N passed, 0 failed`, exit 0.
4. **Write `worklog.md`** in this task folder: date, exact image reference used, N, the full PASS/FAIL list
   summary, the 9-vs-11 finding and the gap above, and the probe table. No hosts, ids or secrets (the
   harness's `minioadmin` values are local throwaway test values already in the file and will not be
   repeated).
5. **If the run fails for a reason other than the image** (a real defect in `profile-backup.sh`, the drill
   SQL, or `008` coverage): stop, record the exact failing line in the worklog, report it — no fix here.
6. **Not touched:** `tests/scripts/ShellHarnesses.test.ts`, `package.json`, `jest.config.ts`, the drill SQL,
   `CLAUDE.md`'s harness table (its wording about this harness stays correct). Nothing committed.

## Verification mapping (brief → how)

1. New image pulls without login, 3 containers start → step 3 output (compose pulls on `up -d`).
2. `fingerprint IDENTICAL (11 tables, …)` + `RESULT: N passed, 0 failed`, exit 0 → step 3; recorded in step 4.
3. `uncovered_tables: none` check passes → step 3.
4. Exact tag pin → step 1 (tag **and** digest).
5. `npm test` unchanged → `git diff --stat` shows only the harness file (+ task-folder docs).

## Risks

- **Port 55433 / 59000 busy** on the Mac → the harness fails at start; I would report it, not change ports.
- **Third-party image** (see trust note) — mitigated by the digest pin; accepted only with owner approval.
- **Option B only:** the Bitnami image runs as non-root with its own data path; smoke test passed, but the
  full harness has not run against it yet.

## Open question for the owner

**Which replacement image?** — **A. `pgsty/minio` (Rec)**: drop-in, one-line change, still maintained,
smaller publisher. **B. `bitnamilegacy/minio`**: larger publisher but frozen and needs the `command:` line
removed. **C. Neither** — stop here and look at a non-MinIO stand-in (would change the rclone provider and
health check; a bigger change).
