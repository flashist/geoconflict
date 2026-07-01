# Coder handoff — s4-postgres-backup-routine (PR #129, Round 3)

**This is a fix SPEC, not applied code.** It describes review-confirmed changes for a separate
coder run. Findings are recommendations verified against the code; honest impact carried forward
from the review.

Ledger: `ai-agents/reviews/s4-postgres-backup-routine.md` (read **Accepted residuals R1–R6** before
touching anything — do NOT reintroduce settled tradeoffs).

## Context

PR #129 is the T8 **encrypted off-box daily Postgres backup routine** for the player-profile store
(PII + paid-citizenship entitlements → recoverability is a monetization gate). Two prior review
rounds are DONE: six findings (B1–B6) were implemented and adversarially verified. `profile-backup.sh`
does `docker compose exec -T postgres pg_dump -Fc` → `age` encrypt → `rclone` S3 upload → size-verify
→ delete local temp → Sunday weekly copy → `rclone delete --min-age` prune → `last-backup.json`
marker; subcommands `backup` (daily cron) and `restore` (manual drill). `setup-profile.sh` installs
it (0700) + `backup.env` (0600) + cron, pins the box clock to UTC, and runs a deploy-time smoke
backup that fails the deploy closed if the pipeline can't prove itself. `tests/profile-backup-dryrun.sh`
is a dockerized end-to-end harness (Postgres + restore-target + MinIO).

**Round-3 status:** all B1–B6 fixes verified correct/regression-free. This handoff covers the TWO
remaining actionable items found in Round 3. **In scope:** N1 (`profile-backup.sh`) and N3
(`tests/profile-backup-dryrun.sh`). **Out of scope:** everything else in the PR, and the
"Do NOT change" list below.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| N1 | medium | **yes** | `profile-backup.sh` `do_restore` guard (:197-220), host-parse (:204) | The live-DB restore guard is bypassed by empty-host / Unix-socket targets → `pg_restore --clean` drops the live DB. Replace the blocklist with a fail-closed-by-default check. |
| N3 | low | optional | `tests/profile-backup-dryrun.sh:197` | The B6 date-shim hardcodes `exec /bin/date`; make it portable. |

---

### N1 — Restore guard bypassed by empty-host / Unix-socket targets (medium; Codex rated high)

**Location:** `profile-backup.sh` `do_restore`. The current guard (:204) extracts the host with:
```bash
tgt_host="${target#*://}"; tgt_host="${tgt_host#*@}"; tgt_host="${tgt_host%%[:/]*}"
```
then (case-insensitively) refuses `postgres|localhost|127.0.0.1` unless `PROFILE_RESTORE_CONFIRM_LIVE`
equals today's UTC date; otherwise it proceeds to `docker compose exec -T postgres pg_restore
--clean --if-exists --no-owner -d "$target"` (:237).

**Problem (empirically verified under bash):** targets with no host extract `tgt_host=""`, which is
NOT in the blocked set, so the guard is skipped:
- `postgresql:///profile` → `host=""`
- `postgresql://:5432/profile` → `host=""`
- `postgresql://profile@/profile` → `host=""`

Because `pg_restore` runs **inside** the `postgres` container, an empty host makes libpq connect
over the container's **local Unix socket → the LIVE profile DB**, and `--clean --if-exists` drops
live tables (paid entitlements). `postgresql:///db` is a natural libpq "local" shorthand an
operator might type during a drill.

**Honest impact (tempered from high → medium):** NOT reachable by automation (the daily cron runs
`backup` only); requires a manual `restore` drill + the off-box age identity + typing an empty-host
URL. Same reachability class as the base risk the guard was added to mitigate — but it defeats the
guard's own stated goal ("refuse a target whose HOST reaches the running profile DB") for a trivial
cost.

**Recommended fix — STRUCTURAL, fail-closed-by-default (owner-selected; this RETIRES R5):**
Do not keep extending the blocklist (that invites a new round per exotic spelling — `[::1]`,
`2130706433`, …). Instead invert the check: **require the dated confirm for ANYTHING that isn't a
provably distinct remote host.** Concretely, refuse (unless `PROFILE_RESTORE_CONFIRM_LIVE=<today
UTC>`) when `tgt_host` is:
- empty (`""`) — omitted host / Unix-socket, OR
- a local name/loopback: `postgres` (the compose service), `localhost`, or any loopback literal —
  `127.0.0.1` (and the whole `127.0.0.0/8` range if cheap), `::1`/`[::1]`, `0.0.0.0`, and the
  numeric/hex loopback forms if you want to be thorough.

Keep the case-insensitive match (Docker DNS resolves `POSTGRES`==`postgres`) and keep the confirm
comparison an exact `[ ]` string test (unaffected by `nocasematch`). Fail BEFORE `RESTORE_TMP` is
created / any decrypt or restore. Update the usage text + comments to describe the remote-only
default. **After this lands, delete the [R5] residual from the ledger** (its exotic cases are now
blocked, not merely accepted).

**Tests (add to `tests/profile-backup-dryrun.sh` or a sibling):**
- `restore` into `postgresql:///profile` WITHOUT the confirm → **refused** (non-zero, no
  `pg_restore` run, no data touched).
- `restore` into `[::1]`/loopback WITHOUT the confirm → **refused**.
- `restore` into the legitimate throwaway remote host (`restore-target`) → **proceeds** (this is
  the existing TEST 2 round-trip — keep it green).
- `restore` into a live-looking target WITH `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>` → proceeds.

---

### N3 — Portable `date` in the B6 test shim (low, optional)

**Location:** `tests/profile-backup-dryrun.sh:197` — `exec /bin/date "$@"`.
**Problem:** hardcodes `/bin/date`; correct on Debian/Ubuntu (the VPS) and macOS (dev), but breaks
on a host where `date` is only `/usr/bin/date`.
**Recommended fix (optional):** `exec "$(command -v date)" "$@"`. Non-blocking.

## Do NOT change (accepted residuals — see ledger R1–R6)

- **[R1]** Box holds only the age PUBLIC recipient; backups intentionally NOT decryptable on-box.
- **[R2]** Weekly-copy and retention-prune failures are intentionally non-fatal (run still SUCCESS).
- **[R3]** Active alerting on `last-backup.json` is monitoring phase-2, not this PR.
- **[R4]** The interim LOCAL weekly pg_dump fallback (when `PROFILE_BACKUP_*` unset) stays.
- **[R5]** *(being retired by the N1 structural fix — delete it once N1 lands.)* Until then, do NOT
  add ad-hoc per-spelling blocklist patches; do the structural N1 fix instead.
- **[R6]** The deploy-time smoke check runs AFTER the API/nginx/migrations are live, and on failure
  `exit 1`s (fail closed) leaving the already-migrated API serving. This ordering is INTENTIONAL
  (a real backup needs the DB up; redeploy API was already exposed; failure is loud). Do NOT add a
  stack/nginx rollback or a pre-migration backup gate here — that's separate scope.
- **N4 (informational):** the smoke check writing a real `profiles/daily/profile-YYYY-MM-DD.dump.age`
  object to prod S3 is the intended first backup — do not "suppress" it.
- **Verified-correct B1–B6, do not churn:** the realistic-host guard + `nocasematch`/`[ ]` split;
  the `if backup.sh backup; then … else exit 1` fail-closed smoke ordering; the UTC box-clock pin
  (+ `TZ=UTC` crontab line for bare `date`); the `|| true` on `remote_size`; the TEST 4 `+%u`-only
  shim + `rclone purge` de-tautology.

## Validation & acceptance criteria

- `bash -n profile-backup.sh tests/profile-backup-dryrun.sh` clean.
- `./tests/profile-backup-dryrun.sh` green (dockerized; needs Docker + `age`/`age-keygen`/`rclone`/
  `curl`/`jq`) — existing TESTs 1–4 still pass PLUS the new N1 restore-guard cases.
- N1: empty-host (`postgresql:///profile`) and loopback targets are refused without the dated
  confirm and NEVER reach `pg_restore`; a legit remote throwaway host still restores.
- Do not commit unless the user explicitly asks (repo workflow rule).

**Test-harness caveat:** the dockerized dry-run needs a running Docker daemon; on this environment
Docker Desktop can't be started headlessly — run where Docker is already up, or on the box against
MinIO/loopback.
