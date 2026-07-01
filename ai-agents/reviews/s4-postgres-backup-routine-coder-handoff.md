# Coder handoff — s4-postgres-backup-routine (PR #129)

**This is a fix SPEC, not applied code.** It describes review-confirmed changes for a separate
coder run to implement. Findings are recommendations verified against the code; honest impact is
carried forward from the review (some reviewer severities were tempered — noted per finding).

Ledger: `ai-agents/reviews/s4-postgres-backup-routine.md` (read the **Accepted residuals** before
touching anything — do NOT reintroduce settled tradeoffs).

## Context

PR #129 adds an **encrypted, off-box, daily Postgres backup routine** for the player-profile store
(task T8, `ai-agents/tasks/backlog/s4-postgres-backup-routine.md`). The profile DB holds PII +
paid-citizenship entitlements, so recoverability is a hard gate on monetization.

Shape:
- **`profile-backup.sh`** (new, host-run on the reg.ru profile VPS): `docker compose exec -T
  postgres pg_dump -Fc` → `age -r <recipient>` encrypt → `rclone copyto` to RU-resident S3 →
  verify (remote size == local) → delete local temp → Sunday weekly copy → `rclone delete
  --min-age` retention prune → write `last-backup.json` marker. Subcommands: `backup` (default,
  the daily cron) and `restore <s3-key> <age-identity> <target-db-url>` (manual drill only).
- **`setup-profile.sh`**: installs `backup.sh` (0700) + `backup.env` (0600) + `/etc/cron.d/
  profile-backups` when `PROFILE_BACKUP_*` is fully configured; else keeps an interim LOCAL
  weekly pg_dump.
- **`build-deploy-profile.sh`**: SCPs `profile-backup.sh` and threads `PROFILE_BACKUP_*` deploy
  vars through the existing 0600-staged env channel.
- **`tests/profile-backup-dryrun.sh`**: dockerized end-to-end (Postgres + restore-target +
  MinIO) that drives the REAL `profile-backup.sh`. Run manually (needs Docker + age + rclone).

**In scope:** the six findings below (`profile-backup.sh`, `setup-profile.sh`,
`tests/profile-backup-dryrun.sh`). **Out of scope:** the T6 crediting code (already merged), the
docs/wiki changes, and anything in the "Do NOT change" list.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| B1 | medium | **yes** | `profile-backup.sh` `do_restore` (:178-209, :206) | Guard the destructive `restore` against pointing at the live DB. |
| B2 | medium | **yes** | `setup-profile.sh` off-box branch (:762-803, :891) | Deploy-time smoke check; fail the deploy closed if the backup pipeline can't prove it works. |
| B3 | low | yes | `profile-backup.sh:157` | Weekly-copy weekday check uses UTC (`date -u +%u`) but the cron is local time → wrong-day drift if box TZ ≠ UTC. |
| B6 | low | yes | `tests/profile-backup-dryrun.sh` | Add a test for the Sunday weekly-copy branch (currently unexercised). |
| B4 | very low | optional | `profile-backup.sh` `remote_size` (:99-102) + call site (:152) | `set -e` aborts before the descriptive verify-failure `die`, degrading the marker's error message. |
| B5 | very low | optional | `setup-profile.sh:768` | "Fail closed" comment over-broad; scope it to tool-install. Comment-only. |

---

### B1 — Restore can destructively target the live DB (medium; Codex rated high)

**Location:** `profile-backup.sh` `do_restore()` :178-209, destructive call at :206:
```bash
docker compose exec -T postgres pg_restore --clean --if-exists --no-owner -d "$target" < "$RESTORE_TMP"
```
**Problem:** `--clean --if-exists` drops existing objects before recreating. `$target` is an
operator-supplied URL; the ONLY thing stopping it from being the live DB
(`postgresql://profile:...@postgres:5432/profile`, or a copied live `DATABASE_URL`) is the usage
text + a comment. A fat-fingered drill wipes live XP/citizenship data.

**Honest impact (tempered from high → medium):** NOT reachable by automation — the daily cron
runs `backup` only; `restore` is manual, requires the off-box age identity to be present, and
requires the operator to paste a live URL. Real footgun on a periodic manual drill; not a runtime
or remotely-triggerable bug.

**Recommended fix:** before running `pg_restore`, refuse targets that look like the live DB unless
an explicit confirmation is set. Concretely:
- Parse/inspect `$target`; if its host is the live compose service (`postgres`) OR its database
  name equals the live `POSTGRES_DB` (from the sourced `backup.env`), abort with a clear message
  UNLESS `PROFILE_RESTORE_CONFIRM_LIVE` is set to a required dated phrase (e.g. today's date), so
  live recovery is possible but never accidental.
- Keep the default path throwaway/staging-only. Preserve the existing usage text.
- (Very-low sub-note, optional) the target URL may embed a password → visible in `ps` on the box
  during the drill (inherent to `pg_restore -d <url>`). If cheap, prefer discrete connection
  params or `PGPASSWORD` env over an inline-password URL; otherwise document it. Not required.

**Test:** add a shell-level case (extend `tests/profile-backup-dryrun.sh` or a small sibling)
asserting that `restore` into a live-looking target WITHOUT the confirm env is refused
(non-zero, no `pg_restore` run), and that the confirm env allows it.

---

### B2 — Deploy declares off-box backups "active" without proving they work (medium; Codex rated high)

**Location:** `setup-profile.sh` off-box install branch (:762 header, install/env-write through
`BACKUP_MODE="offbox"` at :803, "active" print at :891).
**Problem:** when `PROFILE_BACKUP_*` is fully set, setup installs `age`/`rclone`, writes
`backup.env`, schedules the cron, and prints "Backups: DAILY encrypted off-box to S3 ... active"
— WITHOUT ever validating the age recipient, the S3 endpoint/credentials, or bucket
write/list/delete permission. A bad secret/endpoint/bucket-policy ships and isn't proven broken
until the first 02:30 cron.

**Honest impact (tempered from high → medium):** `profile-backup.sh` IS fail-loud at RUN time —
any failure exits non-zero, writes a `last-backup.json` failure marker, and logs to
`/var/log/profile-backup.log`. Active alerting on that marker is a SEPARATE scoped task
(`monitoring-alert-bot-phase2` item 5 — an accepted residual, do not fold it in here). So the real
gap is the absence of DEPLOY-time proof of recoverability for paid/PII data + the window before
phase-2 alerting exists. Worth closing because "never once proven to write to S3" is a poor state
for a data-recovery system.

**Recommended fix:** add a deploy-time smoke check inside the off-box branch, BEFORE printing
active, that **fails the deploy closed** (`exit 1`) on any failure:
- age: encrypt a tiny probe with the configured `PROFILE_BACKUP_AGE_RECIPIENT` (proves the
  recipient parses).
- rclone: write a small probe object into `<bucket>/<prefix>/.deploy-probe-<ts>`, list it, read
  back / size-check, then delete it (proves endpoint + creds + bucket read/write/delete).
- Optionally run one real `backup.sh backup` + assert the marker's `exit_status == 0` for an
  end-to-end proof.
- On any failure: print a precise error and `exit 1` (do NOT print "active", do NOT leave the cron
  claiming a working backup). Keep it consistent with the existing "fail closed" tool-install
  posture.
- Make it exercisable in `tests/profile-backup-dryrun.sh` against MinIO (bad cred → fail; good
  cred → probe written+deleted).

---

### B3 — UTC weekday check vs local-time cron (low, latent)

**Location:** `profile-backup.sh:157`: `if [ "$(date -u +%u)" = "7" ]; then` (Sunday weekly copy).
**Problem:** the daily cron is local-time (`30 2 * * *`) and `setup-profile.sh` never sets the box
TZ. On today's effectively-UTC box this is correct. If the box is ever set to Moscow (UTC+3),
local Sunday 02:30 = UTC Saturday 23:30 → `date -u +%u` returns 6 → the weekly copy fires on the
wrong local day (cadence preserved, day drifts).
**Recommended fix:** use `date +%u` (local, matching the local-time cron) — lowest friction. OR
anchor the cron line with `TZ=UTC` if you want the backup UTC-pinned regardless of box TZ. Pick
one and keep the weekday check and the cron schedule consistent with each other.

---

### B6 — Dry-run never exercises the Sunday weekly-copy branch (low, test gap)

**Location:** `tests/profile-backup-dryrun.sh` (Tests 1-3 cover backup/restore/forced-failure).
**Problem:** the `+%u == 7` weekly branch in `do_backup` is never hit, so a bug there (path
construction, rclone args) passes the dry-run. Matters more given B3.
**Recommended fix:** add a case that forces the Sunday path — e.g. run `backup` with a `date`
wrapper/shim on `PATH` that returns `7` for `+%u` (leave other formats intact), then assert a
`weekly/` object appears in the MinIO bucket alongside the `daily/` one. If B3 switches to
`TZ=UTC` in cron, test accordingly.

---

### B4 — `remote_size` pipefail degrades the verify-failure marker message (very low, OPTIONAL)

**Location:** `profile-backup.sh` `remote_size()` :99-102; call site `rsize="$(remote_size …)"` :152.
**Problem:** the pipeline can exit non-zero (missing object / grep no-match); the non-`local`
assignment propagates that under `set -e`+`pipefail`, aborting before the informative
`die "upload verify failed (local=X remote=missing)"` at :153. Failure is STILL caught (the
`on_exit` trap writes a marker + non-zero exit) but the marker's `error` reads
"unexpected failure (rc=1)". Provider-dependent: if rclone returns exit 0 with `{"bytes":0}` for
absent objects, the descriptive `die` already fires.
**Recommended fix (optional):** append `|| true` to the `remote_size` pipeline so a non-zero
status is benign; `${rsize:-0}` then drives the explicit check and the informative `die` always
reaches the marker.

---

### B5 — "Fail closed" comment scope is over-broad (very low, comment-only, OPTIONAL)

**Location:** `setup-profile.sh:768`.
**Problem:** the comment reads as if the entire `BACKUP_OFFBOX_ENABLED=1` path is fail-closed, but
the missing-`$PROFILE_BACKUP_SRC` case (outer `else`) deliberately WARNS and falls back to the
local pg_dump. The CODE is correct — only the comment is ambiguous.
**Recommended fix (optional):** scope the wording to tool-installation ("a box with creds but no
age/rclone must not proceed"), and note the missing-script case is a separate, deliberate
warn+fallback. No code change.

## Do NOT change (accepted residuals — see ledger)

- **[R1]** Box holds only the age PUBLIC recipient; backups are intentionally NOT decryptable
  on-box. Do not add on-box decryption/private-identity storage.
- **[R2]** Weekly-copy and retention-prune failures are intentionally non-fatal (WARNING, run
  still SUCCESS) because the daily object is already verified off-box first. Do not make them
  fail the backup.
- **[R3]** Active alerting on `last-backup.json` is a separate task (`monitoring-alert-bot-phase2`
  item 5). B2 is a DEPLOY-time gate, NOT runtime alerting — do not build a monitor here.
- **[R4]** The interim LOCAL weekly pg_dump fallback (when `PROFILE_BACKUP_*` is unset) stays.
- **Verified-correct, do not "fix":** verify-then-delete-local ordering; plaintext dump deleted
  immediately post-encrypt; `on_exit` trap armed before `load_env`; `%q` + 0600 `backup.env`; keys
  never on argv/logs; `--min-age` retention (can't wipe the fresh backup); `wc -c < file` byte
  count; server-side `rclone copyto` for the weekly copy.

## Validation & acceptance criteria

- `bash -n profile-backup.sh setup-profile.sh build-deploy-profile.sh tests/profile-backup-dryrun.sh`
  clean.
- `./tests/profile-backup-dryrun.sh` green — existing round-trip + forced-failure PLUS the new B6
  Sunday-branch assertion (needs a running Docker daemon + `age`/`age-keygen`/`rclone`/`curl`/`jq`;
  NOT part of the Jest suite).
- B1: restore into a live-looking target without `PROFILE_RESTORE_CONFIRM_LIVE` → refused
  (non-zero, no `pg_restore`); with the confirm phrase → proceeds.
- B2: smoke check exercised against MinIO (or on-box) — bad cred → deploy fails closed (`exit 1`,
  no "active" printed); good cred → probe object written+listed+deleted before "active".
- B3/B6 kept consistent (weekday check ↔ cron schedule).
- Do not commit unless the user explicitly asks (repo workflow rule).

**Test-harness caveat:** the dockerized dry-run needs a Docker daemon; on this environment Docker
Desktop can't be started headlessly (interactive admin prompt) — run the harness where Docker is
already up, or on the box against MinIO/loopback.
