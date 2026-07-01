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
Status: RESOLVED — Round-8 fix (2026-07-01) validated backup retention values (C-ret); all Rounds 1–8
items implemented and verified, NO open T8 defects. Round-5 (2026-07-01) implemented the **N5** atomic backup-config install fix and
adversarially re-verified it. `setup-profile.sh` now stages the candidate `backup.sh.new`/`backup.env.new`
and promotes them over the live files ONLY after a passing deploy-time smoke check (new
`promote_offbox_backup()` helper, `PROFILE_BACKUP_ENV_FILE` candidate override); a failed redeploy leaves
the last-known-good script/env/cron intact, so a previously-working nightly backup can no longer be
silently de-activated. A 4-lens adversarial panel (regression / correctness / test-soundness / edge)
returned **correct-no-regression** — no new defect, no regression; B2/[R6]/[R4]/missing-src-fallback
invariants preserved. The panel found one weakness in the NEW regression test (TEST 4 could false-green:
matched the first `exit 1` after the `if`, not bound to the smoke-failure branch) — FIXED (anchored on the
distinctive failure message + whole-line `exit 1`; mutant-proven to reject a removed smoke-failure exit).
The two promotion `mv`s were made fail-loud (`&&`-guarded) so an (unreachable) torn promotion surfaces as a
loud deploy failure instead of a silent torn-success (covered by TEST 5).
**Round-6 fix (2026-07-01):** implemented **6a** (default-deny restore guard) + **N6** (deploy-smoke marker
isolation) and adversarially re-verified both. 6a replaces the restore-guard BLOCKLIST with DEFAULT-DENY:
`do_restore` refuses EVERY target unless the host equals an operator-declared `PROFILE_RESTORE_REMOTE_HOST`
(distinct remote) OR `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>` (in-place recovery) — closing the
Docker-local-alias bypass (container name/IP) AND the whole loopback tail in one structural move →
**[R7] RETIRED**. N6 makes the deploy smoke write its own `last-smokecheck.json` (via
`PROFILE_BACKUP_MARKER_FILE`) so a failed redeploy no longer clobbers the nightly `last-backup.json`.
A 4-lens adversarial panel (6a bypass-hunt / 6a regression / N6 correctness / test+edge) returned
**correct-no-regression** on all four. One bounded residual surfaced: the guard extracts the host textually
while libpq also honors `?host=`/multi-host/key=value-conninfo forms — but default-deny REFUSES all of them
on the naive path (now TEST-5-covered), so the only gap is an operator self-allowlisting their remote AND
typing a live-host override (self-inflicted, ≡ the dated confirm) → accepted **[R9]**. **6b**
(migration-failure rollback) stays out-of-scope / tracked-separately per [R6]; **6c** stays settled **[R8]**.
Validation: dockerized harness 21/21, redeploy suite 22/22, `bash -n` clean.
**Round-7 fix (2026-07-01):** implemented + adversarially re-verified both new gaps. **7a** — new
`guard_offbox_downgrade()` (setup-profile.sh) + caller `exit 1` BEFORE the cron rewrite: a missing/partial
`PROFILE_BACKUP_*` redeploy of an already-off-box box (live `backup.sh`+`backup.env`, or a `Mode: offbox`
cron) now FAILS CLOSED instead of silently rewriting the cron to same-disk local; `PROFILE_BACKUP_DISABLE_OFFBOX=1`
opts into an intentional downgrade; first-deploy [R4] unchanged. **7b** — added `--single-transaction` to the
in-place `pg_restore` so a mid-restore failure rolls back all-or-nothing (target unchanged). A 4-lens
adversarial panel (7a correctness / 7a regression / 7b correctness / test+edge) returned **correct-no-regression**
on all four (the only note — a partial single-file off-box state — is [R8]-unreachable and protects no working
backup; the stale missing-SRC warning text was tightened). Validation: redeploy suite **27/27** (new TEST 7),
dockerized harness **21/21** (TEST 2 confirms `--single-transaction` is regression-free), `bash -n` clean.
**6b** stays out-of-scope / tracked-separately per [R6].
**Round-8 stateful re-review (2026-07-01):** fresh two-reviewer pass (Codex adversarial + Claude code-reviewer)
on the current diff after the Round-7 fix landed. Both confirm 7a/7b correct (Claude mutation-tested TEST 7 +
checked `--single-transaction` against `migrations/001`; neither re-raised R1–R9). ONE genuinely-new low/med
defect surfaced — **C-ret** (retention values are unvalidated; a literal `PROFILE_BACKUP_RETENTION_*=0` →
`rclone delete --min-age 0d` wipes the just-uploaded backup while a success marker is still written). **Round-8
fix (2026-07-01):** `do_backup` now validates both retention vars as positive integers and `die`s BEFORE any
dump/upload/prune — so a poison value fails the B2 deploy smoke closed AND fails a directly-misconfigured nightly
run loud, deleting nothing. Harness TEST 8 added; a 2-lens adversarial panel returned **correct-no-regression**
(incl. the all-zero `00`/`000` + leading-zero cases). Codex's restore-guard URL-parse re-raise was suppressed
as settled **[R9]**; **O-dg** (fail-safe, optional) + **Cl-txn** (settled) → no action.
Reviewers: Codex + Claude code-reviewer (Round-4) → fix (Round-5) → panel (Round-5) → Codex + Claude
code-reviewer (Round-6) → owner-approved fix (Round-6) → 4-agent adversarial panel (Round-6, all correct-no-regression).

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
  worse signal. `--min-age` can never delete the just-uploaded object — an invariant now GUARANTEED by
  the C-ret retention validation (Round 8: retention is forced ≥ 1 day, so the fresh <1d-old object is
  always excluded from the prune). Before C-ret a literal `PROFILE_BACKUP_RETENTION_*=0` broke this.
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

- **[R7] — RETIRED (Round-6 fix, 2026-07-01).** Was: "the N1 guard blocks realistic + common loopback
  forms but a few truly-exotic loopback encodings (`::ffff:127.0.0.1`, bare `0177`, `2130706434`,
  `localhost.localdomain`) — and later (6a) the Docker-local aliases (compose container name / container
  IP) — still PROCEED." The **6a** default-deny conversion INVERTED the guard: `do_restore` now REFUSES
  EVERY target unless the host equals an operator-declared `PROFILE_RESTORE_REMOTE_HOST` OR
  `PROFILE_RESTORE_CONFIRM_LIVE=<today UTC>`. So the whole enumerated tail (exotic loopback + container
  name/IP + any future live-reaching spelling) is blocked STRUCTURALLY — the host-enumeration Pareto
  frontier is CLOSED, not merely accepted. Do NOT re-add a per-spelling loopback/alias residual. (The one
  bounded gap that remains is a DIFFERENT axis — URL-parse divergence — tracked as [R9], not R7.)

- **Guard/executor URL-parse divergence on restore — bounded, self-inflicted-only [R9]** —
  What: the 6a guard extracts `$tgt_host` by TEXTUAL parse of the target URL, but libpq (the pg_restore
  executor) parses more richly — it honors a `?host=`/`hostaddr=` query override, comma-separated multi-host
  lists, and space-separated `key=value` conninfo strings — any of which can connect to a DIFFERENT host than
  the guard extracted (e.g. `postgresql://remote-good/db?host=postgres` extracts `remote-good` but libpq
  connects to the live `postgres` container).
  Why (structural): under DEFAULT-DENY every one of these forms is REFUSED on the naive path (extracted host
  isn't allowlisted, no dated confirm) — verified + TEST-5-covered (`?host=`, multi-host, conninfo cases). The
  only way one reaches the live DB is if the operator BOTH sets `PROFILE_RESTORE_REMOTE_HOST` to the exact
  extracted string AND types a live-host override into the same URL — a deliberate, self-inflicted act
  equivalent to using the dated confirm. A precise code fix (block only `?host=`/multi-host/conninfo while
  allowing legit params like `?sslmode=require`) is fiddly and risks false-rejecting valid URLs; a blunt
  `?`/`=` reject false-rejects `?sslmode=`. The Round-6 adversarial panel (all 4 lenses) classified it
  non-issue. `restore` is a MANUAL drill.
  Re-raise only if: `restore` is wired into an automated/unattended path (target no longer operator-typed), OR
  a real drill runbook is found to emit a `?host=`/multi-host/conninfo target.

- **Two-`mv` backup-config promotion is fail-loud, not symlink-atomic [R8]** —
  What: `promote_offbox_backup` promotes the candidate `backup.sh` then `backup.env` with two
  sequential `mv -f` (`&&`-chained). It is not a single atomic switch; a (near-impossible) script-mv-success
  + env-mv-fail leaves new-script + old-env and returns non-zero.
  Why (structural): both are intra-directory `rename(2)`s on the same filesystem, which do not fail on a
  working box; the `&&`-chain is fail-loud (any mv failure → return 1 → deploy `exit 1`), and TEST 5
  proves it. The realistic torn state (new script + old **working** env) still functions — the old env is
  the last-known-good config. A versioned-dir + single-symlink-switch would be truly atomic but adds real
  complexity for a failure mode that cannot occur with intra-dir renames. Round-5 deliberately chose
  fail-loud-two-mv; Codex-6c (Round 6) re-proposed the symlink approach — a re-litigation of that settled
  choice, impact overstated ("can break nightly backups" only under cred-rotation-with-revoked-old-creds +
  the impossible mv failure).
  Re-raise only if: promotion is ever moved across filesystems (rename no longer atomic/reliable), OR a
  real torn promotion is observed in prod.

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

## Round-5 fix — implemented + adversarially verified (2026-07-01)

- **N5 — RESOLVED.** Made the deploy-time off-box backup-config install **atomic** around the smoke
  gate (owner-approved, Option A). `setup-profile.sh`:
  - New `promote_offbox_backup() { cand_sh cand_env live_sh live_env; }` helper (defined just before
    the "Backup + maintenance cron jobs" section): runs the smoke against the CANDIDATE via
    `PROFILE_BACKUP_ENV_FILE="$cand_env" "$cand_sh" backup`; on success `mv -f` both candidates over
    the live files (`&&`-chained, fail-loud); on failure `rm -f` the candidates and `return 1`.
  - The off-box branch now `install -m 700 … backup.sh.new` and writes the `printf` env block to
    `backup.env.new` (0600), then `if promote_offbox_backup …; then BACKUP_MODE=offbox; else …; exit 1; fi`.
    So a bad-cred REDEPLOY to an already-working box no longer clobbers the last-known-good
    `backup.sh`/`backup.env`; the `exit 1` fires before the cron (re)write, so the old working cron is
    preserved and the existing nightly backup keeps running. First-deploy stays fail-closed (nothing
    to preserve → nothing activated). [R6] ordering, B2 fail-closed gate, [R4] local fallback, and the
    missing-`$PROFILE_BACKUP_SRC` warn+fallback are all unchanged.
  - New Docker-free regression test `tests/profile-backup-redeploy.sh` drives the REAL
    `promote_offbox_backup()` (extracted from `setup-profile.sh` via `awk`, so it can't drift) with
    stub candidates. **19/19 pass**; a mutation check confirms it FAILS under the old
    clobber-before-proof behavior (not tautological).
- **Adversarial verification (4-lens panel):** regression / correctness / test-soundness / edge all
  returned **correct-no-regression**. Recurring "candidate smoke writes marker to the LIVE
  `last-backup.json`" and "torn `mv`" notes were classified pre-existing / unreachable / non-issue.
- **Panel-found test weakness — FIXED.** The test-soundness lens showed TEST 4 could false-green (it
  matched the first `exit 1` after the `if`, unbound to the smoke-failure branch; a mutant that removed
  the real smoke-failure `exit 1` still passed). Hardened: anchor on the distinctive failure message
  (`refusing to promote the new`) + match a whole-line `exit 1` statement; re-proven that the mutant is
  now rejected. Added **TEST 5** for the fail-loud `&&`-guarded promotion (env `mv` failure → non-zero,
  no torn success).

## Round 6 — re-review of the N5 fix (2026-07-01)

Full two-reviewer coverage. Codex's FIRST Round-6 job HUNG ~10min on its final synthesis turn (log
frozen; captured only a partial "data-loss hazard in the restore" hint) → cancelled + re-run; the retry
completed in 1m49s → full coverage (reported loudly, not a partial review). The N5 atomic-install fix is
verified CORRECT: redeploy regression test **19/19** (drives the real extracted `promote_offbox_backup()`),
`bash -n` clean, both reviewers agree on correct promotion sequencing, sound `set -e`/`&&` handling, and
`exit 1` before the cron write.

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 6 | **N5 fix verified** — candidate staged to `.new`, smoke runs against the candidate env, promote (`mv -f` both) only on pass, prior config preserved on failure; first-deploy stays fail-closed | CORRECT (both reviewers + local 19/19 test run) | **Closed** — N5 confirmed correct. |
| 6 | **6a** the restore guard is STILL a blocklist (`postgres\|localhost\|127.*\|::1\|…`) and misses NON-loopback Docker-local aliases — the compose **container name** (`profile-postgres-1`) and **container IP** reach the live DB from inside the `postgres` container → `pg_restore --clean` can drop live tables (profile-backup.sh:206-220) — Codex critical | CORRECT → **medium** (downgraded: manual-drill-only — cron never restores; backstopped by the dated confirm + "distinct throwaway REMOTE host" usage text; but container-name is grab-from-`docker ps` plausible). Same restore-guard **Pareto frontier** as [R7] — 3rd poke | **Open/actionable** (owner decision 2026-07-01) — adopt the loop-ending **default-deny** fix (Codex's own recommendation): require the dated confirm unless the target is an explicit allowlisted remote, or resolve-and-compare against the live container. Closes empty-host + loopback + container-alias + any future name → **retires [R7]**. Add tests for container-name + container-IP targets (must refuse). |
| 6 | **6b** migration failure leaves the new `profile-api` build serving old/partial schema behind the already-live nginx, no rollback (setup-profile.sh migrate `dev:524`, recreate `dev:455/483`) — Codex high | CORRECT but **PRE-EXISTING** (already in `dev`, NOT in this PR's diff) and **out-of-scope per [R6]** (migration-safety rollback boundary explicitly deferred from T8) | **Suppressed for T8 + tracked separately** (owner decision 2026-07-01) — valid deploy-pipeline concern; belongs to a SEPARATE profile-deploy/migration-safety task, not this backup PR. Not a T8 blocker. |
| 6 | **6c** `promote_offbox_backup` two sequential `mv`s are not a single atomic switch (torn script-mv-success + env-mv-fail) — Codex medium | PARTIALLY CORRECT → **very low**; **re-litigates** the Round-5 fail-loud-two-mv decision (TEST 5 covers it); impact overstated (torn state = new-script + old-working-env still functions; intra-dir rename can't fail) | **Accepted residual [R8]** (owner decision 2026-07-01) — fail-loud two-mv is sufficient; do NOT re-propose the symlink approach. |
| 6 | **N6** on a bad-cred redeploy the candidate smoke overwrites the shared `last-backup.json` with a FAILURE marker, contradicting the fix's "previously-working backup left untouched" message; self-heals at the next nightly run (profile-backup.sh `on_exit` :77-82, setup smoke) — Claude low/warning | CORRECT → **low** (novel, in-scope; observability inconsistency, not data-loss; no monitor live yet per [R3]) | **Open/actionable** (owner decision 2026-07-01) — write the deploy-time smoke's marker to a SEPARATE path (e.g. `last-smokecheck.json`) so `last-backup.json` stays owned by the nightly cron; or (min) a one-line note in the failure output that the marker reflects the smoke, not the last nightly. |
| 6 | Test-polish nits — TEST 2 `grep` vs `cmp`; TEST 4 cron-grep portability; TEST 5 doesn't assert `backup.sh`'s torn state — Claude suggestions | CORRECT → **very low** (non-defects; Linux-target) | **Optional** — nice-to-have test tightening; not required. |

## Round-6 fix — implemented + adversarially verified (2026-07-01)

- **6a — RESOLVED (retires [R7]).** Replaced the restore-guard blocklist with **default-deny** in
  `profile-backup.sh` `do_restore`: refuse EVERY target unless (a) `$tgt_host` is non-empty AND equals
  `PROFILE_RESTORE_REMOTE_HOST` (operator-declared distinct remote), OR (b) `PROFILE_RESTORE_CONFIRM_LIVE`
  = today UTC (in-place recovery); otherwise `die` with a `default-deny` message BEFORE any
  decrypt/`pg_restore`. The whole blocklist + `shopt nocasematch` were removed; usage text updated. Closes
  the Docker-local-alias bypass (container name/IP) AND the loopback tail structurally. Dockerized TEST 5 now
  asserts refusal for empty-host, `[::1]`, `localhost`, `profile-postgres-1`, container-IP, `evil.example`,
  `?host=` override, multi-host, and `key=value` conninfo; TEST 2 sets `PROFILE_RESTORE_REMOTE_HOST=
  restore-target` and round-trips (allow path). → **[R7] retired**, **[R9]** added for the bounded URL-parse
  divergence.
- **N6 — RESOLVED.** `MARKER` is overridable via `PROFILE_BACKUP_MARKER_FILE` (`profile-backup.sh:37`);
  `promote_offbox_backup` (setup-profile.sh) takes a 5th arg and runs the deploy smoke with
  `PROFILE_BACKUP_MARKER_FILE=$BACKUP_DIR/last-smokecheck.json`, and the failure-branch `cat` points there —
  so a failing deploy smoke never clobbers the nightly `last-backup.json`. The monitoring task
  (`monitoring-alert-bot-phase2.md` item 5) was updated to note the new marker ownership (a fresh box has no
  `last-backup.json` until its first nightly run; deploy health is proven by `last-smokecheck.json`).
- **Adversarial verification:** a 4-lens panel (6a bypass-hunt / 6a regression / N6 correctness / test+edge)
  returned **correct-no-regression** on all four — no new defect, no regression. Confirmed default-deny closes
  empty-host + every loopback/alias spelling, the legit allow paths still work (TEST 2 round-trip + dated
  confirm exact-match, stale date refused), the guard fires before decrypt, and the N6 override is
  `set -u`-safe with correct empty-fallback. The `?host=`/multi-host/conninfo divergence → **[R9]** (non-issue,
  TEST-5-covered).
- **Validation:** dockerized harness **21/21**, Docker-free redeploy suite **22/22**, `bash -n` clean on all
  four scripts, guard-decision trace re-run across the URL/env battery.

## Round 7 — re-review of the 6a/N6 fixes (2026-07-01)

Full two-reviewer coverage. Claude code-reviewer (scoped to the 6a/N6 diff) LIVE-RAN both suites
(redeploy 22/22, dryrun 21/21 with real Docker+MinIO) and independently confirmed default-deny closes the
frontier (no bypass under pure default-deny; multi-`@` authority confusion → fail-safe over-refusal) and
N6 marker isolation is correct → **clean on 6a/N6**. Codex ranged the WHOLE diff and found two new gaps.
Orchestrator: default-deny URL battery + redeploy 22/22 reproduced locally; both Codex claims verified
against the code. Codex `--background` streamed inline (poller logged `NO_JOB_ID`) but the full report was
captured — full coverage, not partial.

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 7 | **6a fix verified** — default-deny REFUSES every target (container name/IP, empty-host, `?host=`/multi-host/conninfo) unless host==`PROFILE_RESTORE_REMOTE_HOST` or dated confirm; blocklist plumbing (`shopt`/`is_local`) fully removed; guard before `RESTORE_TMP` | CORRECT (both reviewers + trace) | **Closed** — restore-guard frontier CLOSED; [R7] retirement justified. |
| 7 | **N6 fix verified** — `MARKER` override applies to success + `on_exit` failure writes; smoke → `last-smokecheck.json`, nightly → `last-backup.json` (TEST-6 live-verified, cksum unchanged) | CORRECT (both reviewers + trace) | **Closed** — N6 confirmed correct. |
| 7 | **7a** a redeploy MISSING any `PROFILE_BACKUP_*` var → `BACKUP_OFFBOX_ENABLED=0` (setup-profile.sh:86-90) → the unconditional `cat > "$CRON_FILE"` (:892) rewrites the cron to local-only weekly pg_dump → SILENTLY downgrades a working off-box backup for paid data, exit 0. N5's preservation only covers the offbox branch (:805) — Codex high | CORRECT → **medium** (downgraded: needs a missing-secret redeploy — operator error; but genuinely serious because SILENT + strips paid-data off-box protection; the missing-vars mirror of N5, distinct from [R4] which is the first-deploy/not-yet-configured case, not a downgrade of a configured box) | **Open/actionable** (owner decision 2026-07-01) — if a live off-box `backup.sh`/`backup.env`/offbox cron already exists, treat missing/partial `PROFILE_BACKUP_*` as a deploy-BLOCKING error (or preserve the existing off-box cron) instead of silently rewriting to local; require an explicit `PROFILE_BACKUP_DISABLE_OFFBOX=1` flag for an intentional downgrade. |
| 7 | **7b** the confirmed in-place live restore runs `pg_restore --clean --if-exists --no-owner` (profile-backup.sh:245) with NO `--single-transaction`/`--exit-on-error`, so a mid-restore failure (lock/conn/incompatible dump) leaves the live DB with some objects dropped and others not restored — Codex high | CORRECT → **medium** (downgraded: only bites during an explicit `PROFILE_RESTORE_CONFIRM_LIVE` in-place recovery — a rare DR op where the DB is likely already compromised; the throwaway-remote drill is unaffected) | **Open/actionable** (owner decision 2026-07-01) — add `--single-transaction` (implies `--exit-on-error`) so a failed restore rolls back all-or-nothing, leaving the target unchanged; optionally document restore-into-fresh-then-cutover as the preferred DR path. |

## Round-7 fix — implemented + adversarially verified (2026-07-01)

- **7a — RESOLVED.** New `guard_offbox_downgrade(mode, cron_file, profile_dir)` in `setup-profile.sh` (beside
  `promote_offbox_backup`) + a caller that `exit 1`s BEFORE the `cat > "$CRON_FILE"` rewrite. On a redeploy
  where `BACKUP_OFFBOX_ENABLED=0` (missing/partial `PROFILE_BACKUP_*`), the guard BLOCKS the deploy if the box
  is already off-box-configured — detected by a live `backup.sh`+`backup.env` OR a `Mode: offbox` marker in the
  existing cron — leaving the off-box cron/config untouched. A true first deploy (no prior off-box config) still
  installs the [R4] local skeleton; `PROFILE_BACKUP_DISABLE_OFFBOX=1` allows an intentional downgrade. The
  missing-`$PROFILE_BACKUP_SRC` warning text was tightened to note the guard blocks on an already-off-box box.
  Regression test: `tests/profile-backup-redeploy.sh` TEST 7 (5 cases — both-files→block, disable-flag→allow,
  offbox-cron-marker→block, first-deploy→allow, offbox-mode→allow).
- **7b — RESOLVED.** Added `--single-transaction` to the in-place `pg_restore` (`profile-backup.sh` `do_restore`)
  so the whole restore — including the `--clean` DROPs — runs in one transaction that rolls back on any error,
  leaving the target unchanged. Regression-guarded by dockerized harness TEST 2 (restore round-trip still green —
  `--single-transaction` doesn't break the success path). A discriminating forced-rollback test was considered
  but deemed fragile to construct reliably; the rollback property is standard pg_restore behavior, inspection-verified.
- **Adversarial verification (4-lens panel):** 7a correctness / 7a regression / 7b correctness / test+edge all
  returned **correct-no-regression**. Confirmed: the guard blocks every realistic already-off-box state, allows
  first-deploy [R4] + off-box (re)activation + explicit disable, and fires before the cron rewrite; the new
  `exit 1` does not break TEST 4 (which anchors on the smoke-failure message); `--single-transaction` is atomic
  without breaking the empty-target round-trip. The partial single-file off-box state → [R8]-unreachable
  (torn-mv only) and protects no working backup — accepted, no code change.
- **Validation:** redeploy suite **27/27**, dockerized harness **21/21**, `bash -n` clean on all changed scripts.

## Round 8 — stateful re-review of the Round-7 fix (2026-07-01)

Full two-reviewer coverage on the current diff (`dev...HEAD`) after the Round-7 (7a/7b) fix landed. Codex
adversarial (`--base dev`) + Claude code-reviewer agent (review-only, primed with R1–R9). Orchestrator
independently traced C-ret against the code and verified C-guard = [R9]. Claude found NO new defects: it
mutation-tested TEST 7 (forced `guard_offbox_downgrade`→`return 0`; the two "should block" assertions correctly
failed 25/27 — the test genuinely binds), verified `--single-transaction` is safe against `migrations/001` (no
`CREATE INDEX CONCURRENTLY`; pg_dump never emits `CONCURRENTLY`), confirmed the provisioning `flock` spans the
`.new` staging/promotion (no TOCTOU), and confirmed the guard runs before the cron rewrite. Both reviewers full
coverage — NOT a partial review.

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 8 | **7a/7b verified** — `guard_offbox_downgrade` blocks every already-off-box state, allows first-deploy/reactivation/explicit-disable, and fires before the cron write; `--single-transaction` wraps the whole in-place restore atomically, regression-free (dryrun TEST 2) | CORRECT (both reviewers + mutation test + schema check) | **Closed** — Round-7 fix confirmed correct. |
| 8 | **C-ret** retention values unvalidated → `PROFILE_BACKUP_RETENTION_*=0` makes `rclone delete --min-age 0d` wipe the just-uploaded backup while `write_marker 0` records success (profile-backup.sh:120-121, :173-174, :178) — Codex medium | CORRECT → **low/med** (blast radius = exactly the value `0`: empty→safe default, non-numeric→rclone rejects the duration→non-fatal prune failure/nothing deleted, `≥1`→fresh object safely under 1d; realistic via the `0`="keep forever/disable" mental model; severe when triggered — local temp already `rm`'d so NO surviving copy + a false success marker). Distinct axis from [R2] (prune *failure* non-fatal vs prune *success* with a poison value) — genuinely novel, NOT a re-litigation | **Open/actionable** (owner decision 2026-07-01: "fix now") — validate both retention vars as positive integers, fail closed before any prune; optional post-prune re-verify + regression test. NON-blocking (safe defaults 14/56 ship). **Review-only: the fix is NOT applied here — separate user-initiated step.** See Open/actionable. |
| 8 | **C-guard** restore guard textual host-parse vs libpq `?host=`/multi-host/conninfo divergence (`postgresql://remote-good/profile?host=postgres` → guard sees `remote-good`, pg_restore connects to live `postgres`) (profile-backup.sh:213-249) — Codex high | `isReal: true` but **matches [R9]** — reachable only if the operator BOTH sets `PROFILE_RESTORE_REMOTE_HOST` to the extracted host AND types the live-host override (self-inflicted ≡ the dated confirm); default-deny refuses it on the naive path, TEST-5-covered | **Suppressed as settled** ([R9]) — re-raise condition (restore wired into an automated/unattended path, or a real drill runbook emitting such a target) NOT met. Codex over-rated it "high" by ignoring the default-deny framing. |
| 8 | **O-dg** intentional downgrade (`PROFILE_BACKUP_DISABLE_OFFBOX=1`) leaves stale `backup.sh`/`backup.env`, so a later *plain* local redeploy that omits the flag is blocked by `guard_offbox_downgrade`'s file-existence branch (setup-profile.sh:808-809) — orchestrator | CORRECT → **very low**, **fail-safe** (refuses rather than silently downgrading; a non-issue when the flag is persisted in `.env.profile`) | **Optional / no action required** (owner decision 2026-07-01) — optional cleanup noted in Open/actionable; not a blocker. |
| 8 | **Cl-txn** `--single-transaction` rollback property has no forced-rollback test — Claude informational | Not novel — matches the ledger's Round-7 note (forced-rollback test deemed too fragile; inspection-verified); Claude re-confirmed the conclusion holds | **No action** — settled optional gap. |

## Round-8 fix — implemented + adversarially verified (2026-07-01)

- **C-ret — RESOLVED.** `profile-backup.sh do_backup` now validates `PROFILE_BACKUP_RETENTION_DAILY_DAYS` and
  `_WEEKLY_DAYS` (right after the `${VAR:-14}`/`${VAR:-56}` resolution, before any dump/upload/prune): two `case`
  guards reject empty/non-numeric and two `[ -ge 1 ]` guards reject `0`, each `die`-ing with a clear message.
  A poison value (`0`/non-numeric) fails closed BEFORE the destructive `rclone delete --min-age` — the B2 deploy
  smoke fails the deploy closed (a poison value can't ship) and a directly-edited `backup.env` fails the nightly
  run loud (failure marker + non-zero), deleting nothing. Corrects [R2]'s "`--min-age` can never delete the
  just-uploaded object" claim (now GUARANTEED by validation, not merely asserted).
- **Test:** dockerized harness **TEST 8** — `retention=0` → non-zero + a RETENTION error + a failure marker
  (on a scratch `PROFILE_BACKUP_MARKER_FILE`) + the pre-existing daily object UNCHANGED (died before the prune).
  Non-tautological (would fail on revert).
- **Adversarial verification (2-lens panel — correctness+bypass, regression+test):** both **correct-no-regression**.
  Confirmed every dangerous value is rejected (incl. the all-zero `00`/`000` forms — pass the digit-only `case`
  but caught by `-ge 1`; no leading-zero octal footgun in `[ ]`), every legit value (1/14/56/365) passes, the
  die fires before any object is created/deleted, weekly is validated symmetrically, and [R2]'s non-fatal
  prune-failure path is untouched. Informational-only: a >18-digit value emits stderr noise but still fails
  closed (non-issue, unrealistic config).
- **Validation:** dockerized harness **24/24**, Docker-free redeploy suite **27/27**, `bash -n` clean.

## Open / actionable

**No open T8 defects.** C-ret (Round 8), 7a + 7b (Round 7), 6a + N6 (Round 6), N5 (Round 5), N1 + N3 (Round 4),
B1–B6 (Rounds 1–2) are all implemented and verified. [R5]/[R7] retired; [R8]/[R9] accepted.

Tracked separately (NOT a T8 blocker):
- **6b** — migration-failure rollback for `profile-api` (pre-existing in `dev`, out-of-scope per [R6]).
  Recommend a separate profile-deploy / migration-safety task.

Settled / no action: **C-guard** → [R9]; **O-dg** → fail-safe (optional cleanup — `rm -f` the off-box artifacts
on the `PROFILE_BACKUP_DISABLE_OFFBOX=1` path — not required); **Cl-txn** / 7b forced-rollback test → optional;
6c + partial single-file off-box state → [R8]; test-polish nits → optional.

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
