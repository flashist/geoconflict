# Coder handoff — s4-postgres-backup-routine (PR #129, Round 4)

**This is a fix SPEC, not applied code.** It describes one review-confirmed change for a separate
coder run. The finding is a recommendation verified against the code; honest impact carried forward.

Ledger: `ai-agents/reviews/s4-postgres-backup-routine.md` (read **Accepted residuals R1–R7** before
touching anything — do NOT reintroduce settled tradeoffs).

## Context

PR #129 is the T8 **encrypted off-box daily Postgres backup routine** for the player-profile store
(PII + paid-citizenship entitlements → recoverability is a monetization gate). Several review rounds
are DONE and verified: `profile-backup.sh` does `pg_dump -Fc` (in the postgres container) → `age`
encrypt → `rclone` S3 upload → size-verify → delete local temp → Sunday weekly copy → prune →
`last-backup.json` marker; a fail-closed-by-default restore guard (N1) blocks live/loopback targets.
`setup-profile.sh` installs it (0700) + `backup.env` (0600) + cron, pins the box clock to UTC, and
runs a deploy-time smoke backup that fails the deploy closed if the pipeline can't prove itself.
`tests/profile-backup-dryrun.sh` is a dockerized end-to-end harness (Postgres + restore-target +
MinIO), TESTs 1–5.

**Round-4 status:** N1 (restore guard) and N3 (test date-shim) are implemented and VERIFIED CORRECT
by both reviewers — done, do not touch. One new actionable item remains: **N5**. **In scope:** N5
in `setup-profile.sh`. **Out of scope:** everything else, and the "Do NOT change" list below.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| N5 | medium | **yes** | `setup-profile.sh` off-box branch (install :791 / env :815 / smoke :827 / cron :852) | A failed redeploy overwrites the working backup config before proving the new one, silently breaking the previously-working nightly backup. Make the install atomic around the smoke gate. |

---

### N5 — A failed redeploy silently breaks the previously-working backup (medium; Codex rated high)

**Location / current ordering in `setup-profile.sh` off-box branch:**
1. `:791` `install -m 700 "$PROFILE_BACKUP_SRC" "$PROFILE_DIR/backup.sh"` — overwrites the live script.
2. `:815`/`:817` write + `chmod 600 "$PROFILE_DIR/backup.env"` — overwrites the live env with the
   NEW (possibly bad) creds.
3. `:827` `if "$PROFILE_DIR/backup.sh" backup; then BACKUP_MODE=offbox; else … exit 1; fi` — smoke gate.
4. `:852` `cat > "$CRON_FILE"` — (re)writes `/etc/cron.d/profile-backups`; only reached if the smoke passed.

**Problem:** on an **already-configured** box (off-box backups working), a **redeploy with bad creds**
(rotated/typo'd S3 key, wrong endpoint) overwrites `backup.sh` + `backup.env` at steps 1–2 BEFORE the
smoke gate. The smoke then fails → `exit 1` at step 3 → step 4 is never reached, so the **old**
`/etc/cron.d/profile-backups` (from the prior deploy) is left in place. That old cron line runs
`$PROFILE_DIR/backup.sh`, which now sources the just-overwritten **bad** `backup.env` → every nightly
backup fails from here on. The deploy "failed closed" for *activation* but silently **de-activated a
working backup**.

**Honest impact (tempered from high → medium):** requires an already-working box + a redeploy + bad
creds (a misconfiguration); not first-deploy, not runtime, not remote. The deploy fails LOUDLY (exit 1
+ error text + a failure `last-backup.json` marker + `/var/log/profile-backup.log`), so the operator
knows the *deploy* failed — the trap is that they may assume "deploy failed ⇒ prior state preserved,"
which is exactly wrong here. Active alerting on the marker is monitoring phase-2 (residual R3), not
live yet — so the broken nightly backup is not proactively surfaced until then. For a paid-data
recovery system, a silently-broken backup is a real regression worth closing.

**Recommended fix — atomic install around the smoke gate:**
- Stage the candidate `backup.sh` and `backup.env` under **temp paths** (e.g. `$PROFILE_DIR/backup.sh.new`,
  `$PROFILE_DIR/backup.env.new`, 0700/0600), NOT over the live files.
- Run the deploy-time smoke check against the **candidate**: invoke the candidate script with
  `PROFILE_BACKUP_ENV_FILE=$PROFILE_DIR/backup.env.new` (the script already honors this override), so
  the probe backup exercises the new creds without disturbing the live env.
- **Only after the smoke check succeeds**, atomically move the candidates into place
  (`mv -f …new backup.sh` / `mv -f …new backup.env`) and (re)write the cron.
- **On smoke failure**, `exit 1` as today but leave the prior working `backup.sh`, `backup.env`, and
  `/etc/cron.d/profile-backups` **untouched** (clean up the `.new` temp files). Print that the prior
  working backup config was preserved.
- Keep the existing fail-closed behavior for a FIRST configured deploy (no prior config → nothing to
  preserve → failing without writing a cron is still correct).

**Test:** add a dry-run/regression case (extend `tests/profile-backup-dryrun.sh` or a sibling) that
simulates a bad-cred redeploy over a working config and asserts the previous working
`backup.env`/cron survive (the good config still runs), while the deploy exits non-zero.

## Do NOT change (accepted residuals — see ledger R1–R7)

- **[R1]** Box holds only the age PUBLIC recipient; backups intentionally NOT decryptable on-box.
- **[R2]** Weekly-copy / retention-prune failures are intentionally non-fatal (run still SUCCESS).
- **[R3]** Active alerting on `last-backup.json` is monitoring phase-2, not this PR.
- **[R4]** The interim LOCAL weekly pg_dump fallback (when `PROFILE_BACKUP_*` unset) stays.
- **[R5]** RETIRED — do NOT re-add a per-spelling restore blocklist residual; the guard is fail-closed
  for realistic/common forms.
- **[R6]** The smoke check runs AFTER API/nginx/migrations are live and `exit 1`s on failure — the
  ORDERING is intentional (a real backup needs the DB up). N5 is about the config being clobbered,
  NOT about this ordering — do NOT add a stack/nginx rollback or a pre-migration backup here.
- **[R7]** The restore guard blocks realistic + common loopback forms but NOT truly-exotic encodings
  (`::ffff:127.0.0.1`, bare `0177`, decimal `2130706434`, `localhost.localdomain`). This is accepted
  (manual drill; no operator types these). Do NOT extend the loopback blocklist — that's whack-a-mole
  on a settled Pareto frontier.
- **Verified-correct, do not churn:** the N1 fail-closed restore guard (empty-host + common loopback
  blocked, remote proceeds, `nocasematch` scope, guard-before-`RESTORE_TMP`); the N3 baked-`REAL_DATE`
  shim; the UTC box-clock pin; `|| true` on `remote_size`; TEST 4/5.

## Validation & acceptance criteria

- `bash -n setup-profile.sh` clean; `bash -n` clean on all changed scripts.
- `./tests/profile-backup-dryrun.sh` green (dockerized; needs Docker + `age`/`age-keygen`/`rclone`/
  `curl`/`jq`) — TESTs 1–5 still pass PLUS the new N5 bad-redeploy regression case.
- N5: after a simulated bad-cred redeploy over a working config, the previous `backup.env`/cron are
  intact and the good config still runs; the deploy exits non-zero; on a good redeploy the candidate
  is promoted atomically and the cron is (re)written.
- Do not commit unless the user explicitly asks (repo workflow rule).

**Test-harness caveat:** the dockerized dry-run needs a running Docker daemon; on this environment
Docker Desktop can't be started headlessly — run where Docker is already up, or on the box against
MinIO/loopback.
