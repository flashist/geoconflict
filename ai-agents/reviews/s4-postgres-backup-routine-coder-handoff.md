# Coder handoff — s4-postgres-backup-routine (PR #129, Round 6)

**This is a fix SPEC, not applied code.** It describes two review-confirmed changes for a separate coder
run. Findings are recommendations verified against the code; honest impact carried forward.

Ledger: `ai-agents/reviews/s4-postgres-backup-routine.md` (read **Accepted residuals R1–R8** before
touching anything — do NOT reintroduce settled tradeoffs).

## Context

PR #129 is the T8 **encrypted off-box daily Postgres backup routine** for the player-profile store (PII +
paid-citizenship entitlements → recoverability is a monetization gate). `profile-backup.sh` does
`pg_dump -Fc` (in the postgres container) → `age` encrypt → `rclone` S3 upload → size-verify → delete local
temp → Sunday weekly copy → prune → `last-backup.json` marker; a `restore` subcommand (manual drill only)
is guarded against dropping the live DB. `setup-profile.sh` installs it + cron, pins the box clock to UTC,
and runs a deploy-time smoke backup that **atomically promotes** a staged candidate config only on success.

**Round-6 status:** the N5 atomic-install fix is implemented and VERIFIED CORRECT (redeploy test 19/19).
Two actionable items remain. **In scope:** 6a (`profile-backup.sh` restore guard) and N6
(`profile-backup.sh` / `setup-profile.sh` smoke marker). **Out of scope / do NOT do here:** the "Do NOT
change" list, and finding **6b** (migration-failure rollback) — that is a PRE-EXISTING, out-of-scope
deploy-pipeline concern for a SEPARATE task, not this PR.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| 6a | medium | **yes** | `profile-backup.sh` `do_restore` guard (:197-220) | The live-DB restore guard is a blocklist that misses Docker-local aliases (container name/IP). Replace it with default-deny. |
| N6 | low | **yes** | `profile-backup.sh` marker (`MARKER`, `on_exit` :35/:77-82) + `setup-profile.sh` smoke call | The deploy-time smoke overwrites the nightly `last-backup.json` with a failure marker on a bad-cred redeploy. Give the smoke its own marker. |

---

### 6a — Restore guard is a blocklist that misses Docker-local aliases (medium; Codex rated critical)

**Location:** `profile-backup.sh` `do_restore` (host-extract ~:204; `case` blocklist ~:216-219; destructive
`pg_restore --clean --if-exists -d "$target"` ~:237).

**Problem:** the guard extracts `$tgt_host` and refuses only a blocklist —
`postgres|localhost|0.0.0.0|::1|2130706433|0x7f*|0177.*` and `127.*` (plus empty-host). Because `pg_restore`
runs **inside** the live `postgres` container, other identifiers for that same container also reach the live
DB and are NOT blocked: the compose **container name** (e.g. `profile-postgres-1`, resolvable via Docker DNS),
the **container IP** (e.g. `172.18.0.2`), the container hostname/ID, and any compose network alias. A drill
operator who pastes one of these (e.g. copied from `docker ps`) gets `--clean` dropping live tables.

**Honest impact (tempered from critical → medium):** manual-drill-only (the daily cron runs `backup`, never
`restore`); requires the off-box age identity present + the operator pasting a live container identifier;
backstopped by the dated `PROFILE_RESTORE_CONFIRM_LIVE` override and the usage text ("distinct throwaway
REMOTE host"). But a container name is a plausible paste, and the consequence is catastrophic.

**Why NOT another blocklist patch:** this is the 3rd poke of the same Pareto frontier (empty-host → loopback
encodings → container aliases). Adding `container-name`/IP patterns guarantees a Round-7 finds the next
live-reaching name (host LAN IP if published, container ID, another alias…). Owner decision: fix it
**structurally, once.**

**Recommended fix — default-deny (owner-selected; this RETIRES [R7]):**
Invert the guard so ANY target requires the dated confirm UNLESS it is provably a distinct remote. Options,
best-first:
- **Resolve-and-compare (strongest):** from inside the postgres container, resolve `$tgt_host` and compare
  against the live postgres container's own hostname/IP(s) and loopback/socket; if it resolves to the live
  container (or is empty/loopback), require `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>`. This catches every
  alias for the container without enumerating names.
- **Explicit remote allowlist (simpler):** proceed WITHOUT confirm only if `$tgt_host` matches an operator-set
  allowlist (e.g. `PROFILE_RESTORE_REMOTE_HOST`/an allowlist var) of the intended drill target; everything else
  requires the dated confirm. Default-deny by construction.
Keep the dated-confirm exact-match `[ ]` test (unaffected by `nocasematch`), keep the guard BEFORE any
decrypt/`RESTORE_TMP`, and update the usage text/comments to the default-deny model. **After it lands, delete
the [R7] residual.**

**Tests (extend `tests/profile-backup-dryrun.sh` TEST 5 or `tests/profile-backup-redeploy.sh`):** a container-name
target (e.g. `postgresql://u@profile-postgres-1:5432/profile`) and a container-IP target → **refused** without
confirm; a legit distinct remote (`restore-target`) → **proceeds** (keep the TEST 2 round-trip green); the
dated confirm → allows a live target.

---

### N6 — Deploy-time smoke pollutes the nightly `last-backup.json` (low)

**Location:** `profile-backup.sh` `MARKER="$BACKUP_DIR/last-backup.json"` (:35) written by the `on_exit` trap
(:77-82) on any non-zero exit; the `setup-profile.sh` deploy-time smoke runs the candidate `backup.sh` which
writes to that same shared marker path.

**Problem:** on a bad-cred redeploy over a working box, the candidate smoke FAILS and its `on_exit` writes a
**failure** entry to `last-backup.json` — the same file the nightly cron uses. So after a failed redeploy the
marker reads "failure" even though the live (old) config is intact and will succeed at the next 02:30 run
(self-heals within ~24h). This contradicts the N5 fix's operator message ("previously-working backup … left
untouched") and would mislead a future phase-2 monitor (R3) for up to a day.

**Honest impact:** low — observability only, self-healing, no monitor is live yet (R3). But it's a cheap,
in-scope inconsistency worth closing.

**Recommended fix:** give the deploy-time smoke its own marker so `last-backup.json` stays owned by the
nightly cron. Either:
- have `profile-backup.sh` honor a marker-path override (e.g. `PROFILE_BACKUP_MARKER_FILE`, defaulting to
  `$BACKUP_DIR/last-backup.json`) and have the `setup-profile.sh` smoke set it to `last-smokecheck.json`; or
- (minimum) print a one-line note in the smoke-failure output that the shown marker reflects THIS smoke, not
  the last nightly run — so the operator isn't misled (does not fix the pollution, but removes the confusion).

## Do NOT change (accepted residuals — see ledger R1–R8)

- **[R1]** age PUBLIC-recipient-only on the box; not decryptable on-box.
- **[R2]** weekly-copy / prune failures are non-fatal (run still SUCCESS).
- **[R3]** marker alerting is monitoring phase-2, not this PR.
- **[R4]** interim LOCAL weekly pg_dump fallback stays.
- **[R5]** RETIRED — no per-spelling restore blocklist residual.
- **[R6]** the smoke runs AFTER API/nginx/migrations are live and fails closed — intentional ordering.
  **6b (migration-failure rollback) is out-of-scope here** — do NOT add stack/nginx rollback or a
  pre-migration backup to this PR; it's a separate deploy-pipeline task.
- **[R7]** PENDING-RETIREMENT: being replaced by the 6a default-deny fix. Do NOT patch the loopback blocklist
  per-spelling; do the default-deny fix and then delete R7.
- **[R8]** the two-`mv` promotion is fail-loud, not symlink-atomic — accepted. Do NOT re-implement it as a
  versioned-dir/symlink switch (intra-dir rename can't fail; TEST 5 proves fail-loud; torn state is benign).
- **Verified-correct, do not churn:** the N5 atomic `promote_offbox_backup` staging/promotion; the UTC
  box-clock pin; `|| true` on `remote_size`; the N3 baked-`REAL_DATE` shim; TEST 4/5 and the redeploy test.

## Validation & acceptance criteria

- `bash -n profile-backup.sh setup-profile.sh` clean; all changed scripts `bash -n` clean.
- `./tests/profile-backup-redeploy.sh` still 19/19; `./tests/profile-backup-dryrun.sh` green (dockerized —
  Docker + `age`/`age-keygen`/`rclone`/`curl`/`jq`).
- 6a: container-name + container-IP restore targets are REFUSED without the dated confirm and never reach
  `pg_restore`; a legit distinct remote still restores; then remove [R7] from the ledger.
- N6: a failed deploy-time smoke does NOT overwrite `last-backup.json` (or the operator is clearly told the
  marker is the smoke's).
- Do not commit unless the user explicitly asks (repo workflow rule).

**Test-harness caveat:** the dockerized dry-run needs a running Docker daemon; on this environment Docker
Desktop can't be started headlessly — run where Docker is already up, or on the box against MinIO/loopback.
The redeploy test (`tests/profile-backup-redeploy.sh`) needs only bash + coreutils and runs anywhere.
