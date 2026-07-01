# Review ledger — s4-postgres-backup-routine

Task: ai-agents/tasks/backlog/s4-postgres-backup-routine.md (T8 — child slice 8/8 of
`s4-player-profile-store-impl.md`; implements Part D step 7, off-box encrypted DB backups)
PR: #129 (branch `s4-profile-06-match-end-crediting` → `dev`)

> **Scope note:** PR #129 rides the T6 branch name, but the T6 crediting code is already
> merged into `dev`. The actual #129 diff is this T8 backup routine. The T6 ledger
> (`s4-profile-06-match-end-crediting.md`) is a DIFFERENT scope — its residuals
> (C1/A3/A5/P1-bound: identity/crediting) do NOT apply here. Nothing was suppressed as settled.

File(s) under review: profile-backup.sh (new), setup-profile.sh, build-deploy-profile.sh,
example.env.profile (new), tests/profile-backup-dryrun.sh (new), .gitignore, plus docs/wiki.
Status: RESOLVED — Round-1 review (2026-07-01) + Round-2 implementation & adversarial
re-verification (2026-07-01). All six findings (B1–B6) implemented; a 5-agent adversarial pass
confirmed B1/B2/B4/B5/B6 correct-and-safe and CAUGHT that the Round-2 B3 fix was wrong (see
Round 2 below) — corrected. No open defects. Not merge-blocking.
Reviewers: Codex (adversarial, verdict needs-attention) + Claude (code-reviewer agent, 0 high) —
both ran, full coverage.

## Accepted residuals (do-not-re-litigate)

- **Age recipient-only on the box; backups are NOT decryptable on-box [R1]** —
  What: the box holds only the age PUBLIC recipient (`PROFILE_BACKUP_AGE_RECIPIENT` in
  `backup.env`); the private identity is kept off-box. A stolen S3 object or a compromised box
  cannot decrypt any backup.
  Why (structural): deliberate blast-radius reduction — the whole point of encrypting before
  upload. Restore (`do_restore`) requires the operator to supply the off-box identity as an arg.
  Re-raise only if: an RTO requirement demands on-box decryption capability (then the tradeoff
  changes) — not because "the box can't read its own backups" (that is the design).

- **Weekly-copy and retention-prune failures are non-fatal [R2]** —
  What: on Sunday the weekly server-side copy, and the daily/weekly `rclone delete --min-age`
  prune, log a WARNING and continue; the run still reports SUCCESS (marker exit_status 0).
  Why (structural): both run AFTER the daily object is uploaded AND size-verified off-box, so the
  match's data is already safe; failing the whole backup over a best-effort prune/copy would be a
  worse signal. `--min-age` can never delete the just-uploaded object.
  Re-raise only if: a prune/weekly failure can cause actual data loss or unbounded cost/growth
  that matters in prod.

- **Active alerting on `last-backup.json` is deferred to monitoring phase-2 [R3]** —
  What: `profile-backup.sh` always writes a machine-readable marker (`last-backup.json`) and
  exits non-zero on any failure, but nothing on the box consumes/alerts on it yet.
  Why (structural): consuming the marker is `monitoring-alert-bot-phase2.md` item 5 (a separate,
  scoped task). The backup is fail-loud (marker + non-zero + `/var/log/profile-backup.log`); the
  alerting is intentionally a follow-up. (Note: B2's deploy-time smoke check — being added — is a
  DIFFERENT, complementary gate; it does not replace phase-2 runtime alerting.)
  Re-raise only if: phase-2 monitoring is descoped, leaving the marker with no consumer at all.

- **Interim LOCAL weekly pg_dump until PROFILE_BACKUP_* is fully configured [R4]** —
  What: off-box daily backup installs ONLY when endpoint+bucket+access+secret+age-recipient are
  all present; otherwise `setup-profile.sh` keeps the interim weekly LOCAL pg_dump skeleton.
  Why (structural): the box is never left with zero backup; adding creds + redeploying flips it
  on. The local skeleton is explicitly labelled "dies with the box — not a real backup".
  Re-raise only if: the local skeleton is ever presented/relied on as a real off-box backup.

- **B1 restore guard covers realistic hosts only; exotic loopback spellings pass through [R5]** —
  What: the B1 live-DB guard blocks `postgres|localhost|127.0.0.1` (case-insensitively, per the
  Round-2 hardening). It does NOT block IPv6 loopback `[::1]`, numeric loopback (`2130706433`,
  `0x7f000001`), or a target whose password literally contains `@` (naive `#*@` split).
  Why (structural): `restore` is a manual drill; the runbook pastes literal lowercase service
  names / `127.0.0.1`. The `@`-in-password case is already system-wide breakage — `setup-profile.sh`
  builds the live `DATABASE_URL` with the same naive `:PASSWORD@host` scheme, so an `@`-password
  breaks the deployment independently. Guarding these adds real bash-URL-parsing complexity for
  inputs no operator produces. The guard is defense-in-depth over usage text + a comment, not the
  sole safety.
  Re-raise only if: restore is ever wired into an automated/unattended path (then the input is no
  longer operator-typed and exotic spellings matter), or POSTGRES_PASSWORD is allowed to contain `@`.

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **B1** `restore` runs `pg_restore --clean --if-exists -d "$target"` against any URL; only a comment guards against the live DB (profile-backup.sh:178-209, :206) — Codex high | CORRECT → **medium** (downgraded: OFF the automated path — daily cron runs `backup` only; requires manual invocation + the off-box identity present + operator pasting a live URL; documented) | **Open/actionable** (owner decision 2026-07-01). Add a safety-rail: refuse when `$target` resolves to the live compose `postgres`/live DB name unless an explicit confirm env (e.g. `PROFILE_RESTORE_CONFIRM_LIVE=<dated phrase>`) is set; keep default throwaway-only. Cover with a shell-level test. Sub-note (very-low): the target URL may embed a password → visible in `ps` during a manual drill (inherent to `pg_restore -d <url>`). |
| 1 | **B2** `setup-profile.sh` declares off-box backups "active" + schedules cron with NO deploy-time smoke test of age recipient / S3 creds / bucket (setup-profile.sh:762-803, :891) — Codex high | CORRECT → **medium** (impact tempered: backup.sh IS fail-loud at runtime — non-zero + failure marker + log; active alerting is scoped to phase-2 [R3]. Gap = no DEPLOY-time proof of recoverability for paid/PII data) | **Open/actionable** (owner decision 2026-07-01). Add a deploy-time smoke check that fails the deploy closed: validate age-encrypt with the configured recipient + rclone create/list/write/delete a tiny probe object in the target prefix (ideally one full backup+verify) BEFORE printing off-box mode active. Distinct from R3 (deploy-time gate ≠ runtime alerting). |
| 1 | **B3** Weekly-copy gate `date -u +%u == 7` (UTC) vs local-time cron `30 2 * * *`; box TZ ≠ UTC shifts the weekly copy to the wrong local day (profile-backup.sh:157) — Claude low | CORRECT → **low** (latent; harmless on today's effectively-UTC box; weekly cadence preserved, only the day drifts) | **Open/actionable** (owner decision 2026-07-01). Fix: `date +%u` (local, matches the local-time cron) OR anchor the cron with `TZ=UTC`. |
| 1 | **B6** `tests/profile-backup-dryrun.sh` never exercises the Sunday `+%u == 7` weekly-copy branch — Claude low | CORRECT → **low** (test-coverage gap; matters more given B3) | **Open/actionable** (owner decision 2026-07-01). Add a weekly-branch case: force the Sunday path (mock `date`/wrapper) and assert a `weekly/` object appears in MinIO. |
| 1 | **B4** `rsize="$(remote_size …)"` non-`local` assignment: under `set -e`+`pipefail` a missing-object verify-failure aborts before the descriptive `die`, so the marker reads "unexpected failure" not "upload verify failed" (profile-backup.sh:99-102, :152) — Claude low (corroborated by orchestrator trace) | CORRECT → **very low** (cosmetic/observability only; still fails non-zero + writes a marker; provider-dependent — rclone returning exit 0 with `bytes:0` makes the descriptive die fire) | **Recorded nit** (owner decision 2026-07-01) — optional. Trivial fix: append `|| true` to the `remote_size` pipeline so the explicit check always reaches its informative `die`. Not required. |
| 1 | **B5** The "Fail closed" comment (setup-profile.sh:768) reads as if the whole off-box path is fail-closed, but the missing-`$PROFILE_BACKUP_SRC` case intentionally warns + falls back to local — Claude low | CORRECT → **very low** (comment-only; the CODE is correct — tool-install IS fail-closed, missing-script IS a deliberate warn+fallback) | **Recorded nit** (owner decision 2026-07-01) — optional. Tighten the comment to scope "fail closed" to tool-installation only. Not a code change. |

## Round 2 — implemented + adversarially re-verified (2026-07-01)

All six implemented (owner: "implement all six"). A 5-agent adversarial workflow then tried to
break each fix (edge cases, regressions, residual violations):

| # | Implemented as | Adversarial verdict |
|---|----------------|---------------------|
| B1 | `do_restore` refuses live-DB **host** (`postgres`/`localhost`/`127.0.0.1`, case-insensitive) unless `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC date>`. Keyed on HOST not db-name — a throwaway drill DB is also named `profile`, so a name check would block every drill. | **correct-and-safe.** Allows drill hosts, blocks live, confirm-escape works, no marker corruption, fails before decrypt. Exotic-input residual → [R5]. |
| B2 | `setup-profile.sh` runs one real `backup.sh backup` and **fails the deploy closed** (`exit 1` before any cron is written) unless it verifies off-box; only then prints active. | **correct-and-safe.** Stack up+migrated first; if-cond suppresses `set -e`; both LOCAL fallbacks [R4] intact; no runtime alerting added [R3]. |
| B3 | **CORRECTED.** Round-2's first attempt (`TZ=UTC` in the crontab) was WRONG — Debian/Ubuntu Vixie cron ignores `TZ`/`CRON_TZ` for *scheduling*. Adversarial agent caught it. Real fix: **pin the box clock to UTC** (`timedatectl set-timezone UTC`, `/etc/localtime` fallback) so cron schedule + `date -u` weekday check + UTC-dated names all agree. `TZ=UTC` kept only to render bare `date` in cron jobs as UTC. | first attempt **concern → fixed**; box-TZ pin is the reliable, cron-implementation-independent anchor. |
| B4 | `\|\| true` on the `remote_size` pipeline. | **correct-and-safe** (reproduced: descriptive "upload verify failed" die now reached). |
| B5 | Comment scoped: tool-install is fail-closed; missing-`$PROFILE_BACKUP_SRC` labelled a deliberate warn+fallback. | **correct-and-safe.** |
| B6 | `tests/profile-backup-dryrun.sh` TEST 4 forces the Sunday branch via a `date` PATH-shim + asserts a `weekly/` object; `weekly/` purged first so it isn't a tautology on a real Sunday. | **correct-and-safe** — agent ran the FULL harness end-to-end (real Docker + MinIO): **10 passed, 0 failed**. |

Validation: `bash -n` clean on all changed scripts; full dry-run harness green (10/10, incl. TEST 4).

## Open / actionable

None — all six resolved (Round 2). No open defects; not merge-blocking.

## Convergence note (Round 1)

Fresh, first-round review with full two-reviewer coverage — NOT a loop. Both reviewers
independently praised the same strengths (clean secrets handling via `%q` + 0600 `backup.env`,
keys never on argv/logs, public-recipient-only on the box; correct verify-then-delete-local
ordering; fail-loud `on_exit` trap; `--min-age` retention that can't wipe fresh backups; a
dry-run that drives the REAL script, not a reimplementation). Both Codex "highs" verified as
real gaps but downgraded to medium — neither is a runtime bug or remotely triggerable. No
high/critical → not merge-blocking. Coder handoff: `s4-postgres-backup-routine-coder-handoff.md`.

## Validation gate (post-fix / pre-merge)

- `tests/profile-backup-dryrun.sh` green (dockerized: dump→encrypt→upload→verify→prune→restore
  round-trip + forced-failure marker), now including the B6 Sunday-branch assertion.
- `bash -n` clean on all four scripts.
- B2 deploy-time smoke check exercised on the box (or in the dry-run harness against MinIO):
  bad cred → deploy fails closed; good cred → probe object written+deleted before "active".
- B1 guard: attempt to restore into a live-looking target without the confirm env → refused.
