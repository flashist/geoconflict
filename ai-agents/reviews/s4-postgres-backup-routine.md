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
Status: IN-REVIEW — Round-4 re-review (2026-07-01) of the N1/N3 fixes. Both reviewers + an
orchestrator URL-battery trace confirm the **N1** fail-closed guard and **N3** date-shim are
CORRECT on every realistic input, no regression. One NEW substantive regression found: **N5** —
a redeploy with bad creds overwrites `backup.env` before the smoke gate, so on smoke-failure the
OLD cron keeps running the now-broken config → a previously-working nightly backup silently breaks.
Open/actionable (atomic-install fix). **L1** (exotic loopback encodings still proceed) → narrowed
residual **[R7]**, boundary documented, frontier loop STOPPED. R5 remains retired (its realistic +
common cases are blocked; the exotic tail is [R7]). ⚠️ Changes requested — N5 is a real data-safety
regression on redeploys worth fixing; not strictly merge-blocking (needs a misconfigured redeploy +
fails loudly).
Reviewers: Codex (adversarial, verdict needs-attention) + Claude (code-reviewer agent, N1/N3 CORRECT) —
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

- **[R5] — RETIRED (Round 3, 2026-07-01).** Was: "B1 guard blocks realistic hosts only; exotic
  loopback spellings (`[::1]`, `2130706433`/`0x7f000001`, `@`-in-password) pass through — accepted
  as defense-in-depth." The **N1** structural fix (fail-closed-by-default + IPv6-aware host
  extraction) now REFUSES empty-host/Unix-socket, `[::1]`/`::1`, `0.0.0.0`, the `127.0.0.0/8` range,
  and numeric/hex loopback — so these are blocked, not merely accepted. Do NOT re-add a
  per-spelling residual here; the guard is now structural (require the dated confirm for anything
  that isn't a provably-distinct remote host).
  > **Round-4 refinement (2026-07-01):** the "structural" claim is imprecise for NON-empty hosts —
  > those still go through a (broadened) blocklist, so a handful of truly-exotic loopback encodings
  > (`::ffff:127.0.0.1`, bare `0177`, decimal range beyond `2130706433`, `localhost.localdomain`)
  > still PROCEED. Realistic + common forms ARE blocked (and TEST-5-covered); the exotic tail is
  > documented + accepted in **[R7]**. R5 stays retired for the realistic/common set.

- **Deploy-time backup smoke check runs AFTER the API/nginx/migrations are live [R6]** —
  What: `setup-profile.sh` brings the stack up + migrates (`:491`, `:561`) and configures nginx
  (`:571`) BEFORE the off-box backup smoke check (`:826`). On smoke failure it `exit 1`s (fail
  closed — no cron written, off-box not declared active), but the profile API is already serving.
  Why (structural): the smoke check MUST run after stack-up + migrate — a real end-to-end backup
  needs a running, migrated DB, so backups cannot be proven before the DB exists. On a redeploy
  the API was already exposed, so rolling the whole stack back over a backup-config typo trades a
  backup problem for an availability outage. The failure is loud (exit 1 + error + `last-backup.json`
  marker). A pre-migration backup as a rollback boundary is a DIFFERENT concern (migration safety),
  separate from T8's daily-backup routine. Owner decision 2026-07-01: accepted, not a T8 defect.
  Re-raise only if: the profile box serves real user traffic during first provisioning (not just a
  redeploy of an already-exposed service), OR a migration-safety rollback boundary is brought into
  T8's scope.

- **B1 guard blocks realistic + common loopback forms; truly-exotic encodings remain accepted [R7]** —
  What: the N1 fail-closed guard REFUSES (unless `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>`)
  empty-host/Unix-socket, `postgres`/`POSTGRES`, `localhost`, the `127.0.0.0/8` range, `::1`/`[::1]`,
  `0.0.0.0`, and the common numeric/hex loopback spellings (`2130706433`, `0x7f*`, `0177.*`). It does
  NOT block a few truly-exotic loopback encodings that still resolve to the live DB: IPv4-mapped IPv6
  `::ffff:127.0.0.1`, bare octal `0177` (no dot), the rest of the decimal loopback range
  (`2130706434`…=127.0.0.2+), and `localhost.localdomain`.
  Why (structural): `restore` is a MANUAL drill; the realistic dangerous inputs (empty-host,
  localhost, 127.0.0.1, postgres, ::1) are ALL blocked and TEST-5-covered. The remaining forms are
  inputs no operator types by hand; fully closing them means either an ever-growing per-spelling
  blocklist (whack-a-mole on a Pareto frontier — the exact loop this ledger has resisted since
  Round 3) or resolve-the-host-and-check-loopback, disproportionate for a manual drill already
  guarded by a dated confirm + usage text. This SUPERSEDES the Round-3 [R5]-retirement's over-broad
  "all exotic cases now blocked" wording: realistic + common are blocked; the exotic tail is accepted.
  Re-raise only if: `restore` is wired into an automated/unattended path (the target is no longer
  operator-typed), OR a real drill runbook is found to emit one of these encodings.

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

## Round 3 — re-review of the implemented fixes (2026-07-01)

Full two-reviewer coverage (Codex adversarial + Claude code-reviewer agent) + an empirical
orchestrator bash trace of the B1 guard. Both reviewers independently confirmed B1 (realistic
hosts), B2 (ordering / `set -e` `if`-suppression / cron-never-written-on-fail), B3, B4, B6 are
correct and regression-free. One novel gap surfaced.

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 3 | **N1** B1 guard bypassed by empty-host / Unix-socket targets — `postgresql:///db`, `postgresql://:5432/db`, `…@/db` extract `host=""`, miss the `postgres\|localhost\|127.0.0.1` block, and `pg_restore --clean` reaches the LIVE DB via the container's local socket (profile-backup.sh:204, guard :197-220, restore :237) — Codex high | PARTIALLY CORRECT → **medium** (empty-host case CORRECT & NOVEL, outside R5, empirically verified under bash; the IPv6/numeric-loopback framing = R5, suppressed. Downgraded from high: manual-drill reachability — cron never restores — same class as the base risk B1 mitigates, but it defeats B1's own stated goal for a one-token cost) | **Open/actionable** (owner decision 2026-07-01) — fix STRUCTURALLY: invert to fail-closed-by-default (require the dated `PROFILE_RESTORE_CONFIRM_LIVE` unless `$target` is a provably distinct REMOTE host — non-empty AND not local/socket). Closes empty-host AND subsumes R5's exotic cases → **retires [R5]**. Add restore-guard tests for `postgresql:///profile` and `[::1]`. |
| 3 | **N2** deploy-time smoke check runs after API + nginx + migrations are already live (setup-profile.sh:571 nginx vs :826 smoke); a smoke failure leaves the API serving without proven off-box backups — Codex medium | CORRECT (factual) → **low/med**; classified **frontier-move** (smoke MUST run post stack-up+migrate — can't prove a DB backup with no DB; redeploy API already exposed; failure is loud; pre-migration backup = separate scope) | **Accepted residual [R6]** (owner decision 2026-07-01) — deploy ordering intentional; not a T8 defect. |
| 3 | **N3** B6 test date-shim hardcodes `exec /bin/date` (tests/profile-backup-dryrun.sh:197) — Claude low | CORRECT → **low** (portability nit; works on Debian/macOS — the two target platforms) | **Open/actionable** (owner decision 2026-07-01) — optional one-liner: `exec "$(command -v date)" "$@"`. |
| 3 | **N4** B2 smoke check writes a real dated encrypted object to PROD S3 (`profiles/daily/profile-YYYY-MM-DD.dump.age`) — Claude informational | CORRECT → **informational** (intended first backup; documented in the inline comment) | **No action** — expected behavior; operators should expect the object after the initial deploy. |
| 3 | Exotic-spelling guard bypasses — IPv6 `[::1]`, numeric loopback `2130706433`/`0x7f000001`, `@`-in-password — Codex (the other half of R3-1) | `isReal` but **matches [R5]** | **Suppressed as settled** — R5; re-raise condition (automated restore path / `@`-password) not met. Moot once the N1 structural fix lands and retires R5. |

## Round-3 fix — implemented (2026-07-01)

- **N1 — RESOLVED.** Replaced the blocklist guard with a fail-closed-by-default, IPv6-aware guard in
  `profile-backup.sh` `do_restore`: extract the host (IPv6-bracket aware so `[::1]`→`::1`), and
  unless it is a provably-distinct REMOTE host, require `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>`.
  Empirically validated — every empty/loopback form (`postgresql:///profile`, `://:5432/`, `@/`,
  `[::1]`, `2130706433`, `127.*`, `0.0.0.0`, `localhost`, `postgres`/`POSTGRES`) REFUSED, while
  `restore-target` + real remote hosts proceed (no drill regression). Added TEST 5 to
  `tests/profile-backup-dryrun.sh` (empty-host + `[::1]` + `localhost` refused, asserted by
  exit-code + guard message). → **[R5] retired.**
- **N3 — RESOLVED (NOT as the handoff recommended).** `exec "$(command -v date)"` was empirically
  shown to **infinitely recurse** — the shim is first on PATH, so `command -v date` re-resolves to
  the shim itself (reproduced: 4× re-entry before a depth guard stopped it). Fixed instead by baking
  the harness-resolved real `date` path into the shim at generation time (`REAL_DATE="$(command -v
  date)"` captured BEFORE `$WORK/bin` shadows `date`).

## Round 4 — re-review of the N1/N3 fixes (2026-07-01)

Full two-reviewer coverage (Codex adversarial + Claude code-reviewer agent) + an orchestrator
empirical URL-battery trace. Both reviewers independently verified the N1 guard + N3 shim are
CORRECT on every realistic input, no regression (TEST 2 remote host still proceeds). Codex did NOT
re-poke the loopback frontier — it converged onto a substantive NEW regression (N5).

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 4 | **N1 fix verified** — fail-closed guard REFUSES every realistic dangerous form (empty-host/socket, `postgres`/`POSTGRES`, `localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`) and PROCEEDS for every legit remote (incl. `postgres-staging.example.com` — no false-positive); guard fires before `RESTORE_TMP`; `nocasematch` scope clean; TEST 5 added | CORRECT (both reviewers + trace) | **Closed** — N1 confirmed correct. |
| 4 | **N3 fix verified** — `REAL_DATE` baked in before `$WORK/bin` shadows PATH; no recursion; shim intercepts only `+%u` (object-name date + ISO timestamps pass through) | CORRECT (both reviewers + trace) | **Closed** — N3 confirmed correct. |
| 4 | **N5** redeploy-with-bad-creds overwrites `backup.sh`+`backup.env` (setup-profile.sh:791, :815) BEFORE the smoke gate; smoke fails → `exit 1` (:836) before the cron rewrite (:852), so the OLD `/etc/cron.d/profile-backups` persists and now runs the overwritten BAD config → a previously-working nightly backup silently breaks — Codex high | CORRECT → **medium** (downgraded: needs a misconfigured REDEPLOY to an already-working box; deploy fails LOUDLY — exit 1 + marker + log; but genuinely DE-ACTIVATES a working backup — a real regression, distinct from [R6]) | **Open/actionable** (owner decision 2026-07-01) — make the backup-config install ATOMIC around the smoke gate (see Open/actionable). |
| 4 | **L1** truly-exotic loopback encodings still PROCEED — `::ffff:127.0.0.1` (IPv4-mapped IPv6), bare `0177`, decimal `2130706434` (=127.0.0.2), `localhost.localdomain` — Claude informational | CORRECT → **very low**, **frontier-move** (R5-class: reach the live DB but no operator types them in a manual drill; the R5-retirement "exotic cases blocked" wording was slightly overstated) | **Accepted residual [R7]** (owner decision 2026-07-01) — boundary documented + STOP; do NOT chase more spellings. |

## Open / actionable

Actionable this round (owner decision 2026-07-01):

- **N5** — make the deploy-time backup-config install **atomic** around the smoke gate so a failed
  redeploy (bad creds) preserves the last-known-good `backup.sh`/`backup.env`/cron instead of
  leaving the old cron pointed at the just-overwritten bad config. Stage the candidate `backup.sh`
  + `backup.env` under temp paths, run the smoke check against the candidate
  (`PROFILE_BACKUP_ENV_FILE=<candidate>`), and install `/opt/profile/backup.sh`, `backup.env`, and
  (re)write the cron ONLY after the smoke check succeeds; on failure leave the prior working
  script/env/cron untouched. Add a bad-redeploy regression test (previous working config preserved).

N1 + N3 fixes are verified CORRECT and closed. L1 → accepted residual [R7]. No other open defects.
Validation carried forward: `bash -n` clean on all changed scripts; guard classification
re-validated against the full URL battery (empty/loopback → refuse, remote → proceed); TEST 5 green.

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
