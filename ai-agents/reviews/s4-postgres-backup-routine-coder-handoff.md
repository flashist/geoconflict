# Coder handoff — s4-postgres-backup-routine (PR #129, Round 7)

**This is a fix SPEC, not applied code.** It describes two review-confirmed changes for a separate coder
run. Findings are recommendations verified against the code; honest impact carried forward.

Ledger: `ai-agents/reviews/s4-postgres-backup-routine.md` (read **Accepted residuals R1–R9** before
touching anything — do NOT reintroduce settled tradeoffs).

## Context

PR #129 is the T8 **encrypted off-box daily Postgres backup routine** for the player-profile store (PII +
paid-citizenship entitlements → off-box recoverability is a monetization gate). `profile-backup.sh` does
`pg_dump -Fc` (in the postgres container) → `age` encrypt → `rclone` S3 upload → size-verify → prune →
marker; a `restore` subcommand (manual drill) is **default-deny** guarded. `setup-profile.sh` installs it +
cron, pins the box clock to UTC, and runs a deploy-time smoke backup that atomically promotes a staged
candidate only on success.

**Round-7 status:** the 6a default-deny restore guard and the N6 smoke-marker isolation are VERIFIED CORRECT
by both reviewers (redeploy 22/22, dryrun 21/21 live). Two new actionable gaps remain, both in adjacent
paths. **In scope:** 7a (`setup-profile.sh`) and 7b (`profile-backup.sh`). **Out of scope / do NOT do here:**
the "Do NOT change" list, and finding **6b** (migration-failure rollback) — a PRE-EXISTING deploy-pipeline
concern for a SEPARATE task.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| 7a | medium | **yes** | `setup-profile.sh` off-box gate (:86-90) + cron write (:892) | A redeploy missing any `PROFILE_BACKUP_*` var silently downgrades a working off-box backup to local same-disk. Don't silently downgrade a configured box. |
| 7b | medium | **yes** | `profile-backup.sh` `do_restore` (:245) | The in-place live restore isn't transactional; a mid-restore failure half-drops the live DB. Make it all-or-nothing. |

---

### 7a — Missing-vars redeploy silently downgrades off-box → local (medium; Codex rated high)

**Location:** `setup-profile.sh` — `BACKUP_OFFBOX_ENABLED=1` only if all 5 of endpoint/bucket/access/secret/
age-recipient are present (:86-90); otherwise the `else` (:884) + the unconditional `cat > "$CRON_FILE"`
(:892) rewrite `/etc/cron.d/profile-backups` to the local-only weekly pg_dump (:917).

**Problem:** on an **already off-box-configured** box, a redeploy that is missing any `PROFILE_BACKUP_*` value
(e.g. run without `.env.profile.secret`, or a rotated var dropped) sets `BACKUP_OFFBOX_ENABLED=0`, falls to
local mode, and **rewrites the cron to same-disk weekly pg_dump** — silently dropping the daily encrypted
off-box schedule for paid/PII data. It **exits 0** (success), so the operator gets no signal. The N5
preservation logic only guards the offbox branch (:805), so it does NOT cover this path. This is the
*missing-vars* mirror of the N5 *bad-creds* case.

**Honest impact (tempered from high → medium):** requires a missing-secret redeploy (operator error), not
runtime/remote. But it is **silent** (worse signal than N5's loud `exit 1`) and strips the off-box/152-FZ
protection that is T8's entire purpose. Distinct from residual [R4] (which accepts "local skeleton until
first configured" — a first-deploy/monotonic case, NOT a downgrade of an already-configured box).

**Recommended fix (preserve/block):** before rewriting the cron in local mode, detect whether the box is
already off-box-configured (a live `$PROFILE_DIR/backup.sh` + `$PROFILE_DIR/backup.env`, or an existing
offbox-mode `/etc/cron.d/profile-backups`). If so and `PROFILE_BACKUP_*` is now missing/partial:
- **Fail the deploy closed** with a clear error ("refusing to downgrade an existing off-box backup to
  same-disk local — PROFILE_BACKUP_* is missing/partial; fix the env or set PROFILE_BACKUP_DISABLE_OFFBOX=1
  to intentionally downgrade"), OR preserve the existing off-box cron/config untouched.
- Only perform the local-mode cron rewrite when there is NO existing off-box config (true first deploy /
  never-configured — the [R4] case) OR the explicit `PROFILE_BACKUP_DISABLE_OFFBOX=1` opt-out is set.
Keep first-deploy behavior unchanged (no prior off-box config → local skeleton is fine).

**Test:** add a regression case (extend `tests/profile-backup-redeploy.sh` or a sibling) — simulate an
off-box-configured box (existing `backup.sh`/`backup.env`/offbox cron) + a redeploy with a missing
`PROFILE_BACKUP_*` var → assert the deploy is blocked (or the off-box cron is preserved), NOT silently
rewritten to local; and that `PROFILE_BACKUP_DISABLE_OFFBOX=1` allows the intentional downgrade.

---

### 7b — In-place live restore is not transactional (medium; Codex rated high)

**Location:** `profile-backup.sh` `do_restore` — `docker compose exec -T postgres pg_restore --clean
--if-exists --no-owner -d "$target" < "$RESTORE_TMP"` (:245).

**Problem:** `--clean` drops existing objects; without `--single-transaction`/`--exit-on-error`, a mid-restore
failure (lock conflict, dropped connection, incompatible dump) leaves the target with **some objects dropped
and others not restored** — a partially-destroyed DB. During a *confirmed in-place live recovery*
(`PROFILE_RESTORE_CONFIRM_LIVE`), that's the live profile DB.

**Honest impact (tempered from high → medium):** only bites during an explicit in-place live restore (a rare
DR op, and the DB is likely already compromised — that's why you're restoring). The normal throwaway-remote
drill just leaves a messy throwaway on failure. But the fix is a cheap one-flag hardening.

**Recommended fix:** add `--single-transaction` (which implies `--exit-on-error`) so the entire restore —
including the `--clean` drops — runs in one transaction and **rolls back on any error, leaving the target
unchanged**. Keep `--clean --if-exists --no-owner`. Optionally document (usage text / runbook) that the
preferred DR path is restore-into-a-fresh-DB-then-cutover, with in-place as the fallback.
Caveat to verify: `--single-transaction` requires the restore to be a single `pg_restore` invocation (it is)
and is incompatible with `--jobs` parallel restore (not used here) — so it's a safe addition.

**Test:** if practical in the dockerized harness, assert a forced mid-restore failure leaves the target DB's
pre-existing objects intact (rolled back). Otherwise cover by inspection + the existing restore round-trip.

## Do NOT change (accepted residuals — see ledger R1–R9)

- **[R1]** age PUBLIC-recipient-only; not decryptable on-box. **[R2]** weekly-copy/prune non-fatal.
  **[R3]** marker alerting is monitoring phase-2. **[R4]** interim LOCAL pg_dump on a NEVER-configured box
  stays (7a is about not DOWNGRADING an already-configured box — different).
- **[R5]/[R7]** RETIRED — the blocklist era is over; do NOT reintroduce a restore-guard blocklist. The guard
  is **default-deny** now — do not weaken it.
- **[R6]** the smoke runs after API/nginx/migrations live and fails closed — intentional ordering; **6b
  (migration-failure rollback) is out-of-scope here** (separate deploy-pipeline task).
- **[R8]** two-`mv` promotion is fail-loud, not symlink-atomic — accepted; do NOT re-implement as symlink.
- **[R9]** the conninfo/`?host=`/multi-host textual-parse divergence is accepted (self-inflicted-only —
  refused under pure default-deny); do NOT add a blunt `?`/`=` reject (it false-rejects `?sslmode=require`).
- **Verified-correct, do not churn:** the 6a default-deny guard; the N6 marker override; the N5 atomic
  `promote_offbox_backup`; the UTC box-clock pin; TEST 4/5/6 and the redeploy suite.

## Validation & acceptance criteria

- `bash -n profile-backup.sh setup-profile.sh` clean.
- `./tests/profile-backup-redeploy.sh` still passes (plus the new 7a regression case); `./tests/profile-backup-dryrun.sh`
  green (dockerized — Docker + `age`/`age-keygen`/`rclone`/`curl`/`jq`).
- 7a: an off-box-configured box + missing-var redeploy → deploy blocked (or off-box cron preserved), never
  silently local; `PROFILE_BACKUP_DISABLE_OFFBOX=1` allows the intentional downgrade; first deploy unchanged.
- 7b: `pg_restore` runs with `--single-transaction`; a failed in-place restore leaves the target unchanged.
- Do not commit unless the user explicitly asks (repo workflow rule).

**Test-harness caveat:** the dockerized dry-run needs a running Docker daemon; on this environment Docker
Desktop can't be started headlessly — run where Docker is already up, or on the box against MinIO/loopback.
The redeploy test needs only bash + coreutils and runs anywhere.
