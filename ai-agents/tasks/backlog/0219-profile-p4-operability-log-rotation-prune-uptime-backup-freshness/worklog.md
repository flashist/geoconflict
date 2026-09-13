# Worklog — 0219 P4 operability on the profile box

Build worker: spawned `fkit-coder` under `/fkit-sprint-ship-loop`'s declared-approval marker
(owner approved `plan.md` via `AskUserQuestion` in the lead session, 2026-09-13). Plan blob
`51bde869a8cf69676878dbb091aae770c7c49333` (26737 bytes) — matches the spawn prompt. Scope built:
**Part A in full (A1–A7)** plus the **read-only** B0/B1 SSH checks. **Nothing deployed, nothing run
on the box that writes, no external account created** — B2–B10 are the owner's (hand-off below).

## Result in one line

Part A built and green (`npm test` 116 suites / 1233 tests, `eslint` clean, both shell harnesses
pass, `bash -n` clean on every touched script). **B0: the ping host IS reachable from the box → the
owner's Q1-A transport stands, no `NEEDS-DECISION`.** B1 changed one detail of check 4 (below).
**Nothing in G1–G4 is live yet** — it ships on the next `npm run deploy:profile` (B4), after the
owner creates the dead-man's-switch check (B2) and the two uptime monitors (B3).

## Change surface

| File | What |
|---|---|
| `setup-profile.sh` | A1 compose `logging:` block on **both** services (json-file, `100m` × `10` — `update.sh`'s values, owner Q3); A2 new `PRUNING UNUSED IMAGES` section (keep-list, owner Q4) placed after the HTTPS section and before `CONFIGURING SYSTEMD`; A4 new `INSTALLING OPERABILITY CHECKS` section (installs `checks.sh` 0700, writes `checks.env` 0600 with `%q`, `checks-state/` 0700, loud warning when the ping URL is empty); the `0 8 * * *` `checks.sh` cron line in the **always-present** cron header; `Checks:`/`Logs:` lines in the deploy summary; header docs + `PROFILE_CHECKS_SRC` / `PROFILE_CHECKS_PING_URL` defaults |
| `build-deploy-profile.sh` | A5 `CHECKS_SCRIPT` required + third SCP; `PROFILE_CHECKS_PING_URL` in the 0600-staged export block |
| `profile-checks.sh` | **new** (A3) — the daily checker, 7 checks, dead-man's-switch reporting; see "How the checker behaves" |
| `example.env.profile` | documents `PROFILE_CHECKS_PING_URL` in the secrets block |
| `tests/profile-checks.sh` | **new** (A7.2) — 68 assertions (59 at build; +9 from review R1/R4) over the real checker with stubbed `rclone`/`curl`/`openssl`; prints `RESULT: N passed, 0 failed` |
| `tests/scripts/profile-deploy-hardening.test.sh` | A7.1 — `profile-checks.sh` fixture in `run_deploy`; **T11** (SCP'd + `PROFILE_CHECKS_PING_URL` round-trips through `staged.env`, never in an argv); new `Structural … (0219)` section: compose heredoc extracted, `logging:` count == service count, `driver: json-file` ×2, `max-size`/`max-file` shape + **same `EXPECTED_*` constants as the 0060 block**, no `daemon.json` in code, prune ordered rollback < prune < systemd, keep-list names `PROFILE_IMAGE`+`PREV_PROFILE_IMAGE`+`docker ps -aq`, no `docker image prune -a` in code, `checks.sh` install line, cron line in the header heredoc, `checks.env` written with `%q`, deploy script carries the file |
| `tests/scripts/ShellHarnesses.test.ts` | A7.3 — registers `tests/profile-checks.sh` (the hardcoded-list residual CLAUDE.md records) |
| `CLAUDE.md` | harness table row; structural-assertion consequence widened; "five harnesses" |
| `ai-agents/knowledge-base/container-log-retention.md` | A6 — scope line fixed (`:5-6`), new **Profile box (task 0219)** section: compose owns it, values, no `daemon.json`, the journald second sink + its cap, the keep-list prune, the "before" `docker inspect` state |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | A6 — the `:23` "read by monitoring Phase 2" cell now names `/opt/profile/checks.sh` and the daily/weekly semantics. ⚠️ This file already carried an **unrelated uncommitted edit** in the working tree before this build; only the one table cell was touched |

Not edited (owner Q7): `0034`'s and `0182`'s briefs — producer-side notes at close.

## How the checker behaves (`profile-checks.sh`)

Runs daily 08:00 UTC as root from `/etc/cron.d/profile-backups` in **both** backup modes; every
input env-overridable; `set -euo pipefail`, no `set -x`, jq-free, GNU/BSD-portable helpers.

| # | Check (log name) | FAIL when | Default |
|---|---|---|---|
| 1 | `daily-backup-marker` | `last-backup.json` missing (unless `last-smokecheck.json` is `exit_status 0` and fresh — 0034's fresh-box rule), `exit_status != 0` (reason carries the marker's error text, ≤160 chars), or `finished_at` age > threshold | 26 h |
| 2 | `daily-backup-object` | `rclone lsjson` of the marker's `object_key` finds nothing (0218 fact b: a marker is not an object). Uses the smoke marker's key on a fresh box | — |
| 3 | `weekly-backup-object` | `weekly/` listing empty, listing errors, or the newest object (date from its name, ModTime fallback) older than threshold. **Independent of check 1** (0241 facts i+ii) | 8 d |
| 4 | `cert-renewal-attempted` | newest mtime among the **non-empty** `letsencrypt.log*` files older than threshold, or no certbot log at all | 13 h |
| 5 | `cert-renewal-errors` | `certbot-renew.log` grew since the last run (byte offset in `checks-state/`); reason carries the last ≤3 new lines (≤200 chars each). First run / shrunk log = "everything is new" → a pre-existing error is reported **once**, then the offset advances | — |
| 6 | `cert-days-remaining` | `openssl x509 -checkend <days×86400>` says the cert expires within threshold; reason names `notAfter` | 20 d |
| 7 | `offbox-backups-configured` | no `backup.env` (local skeleton mode) — owner Q6, FAIL loud. Checks 2/3 then also FAIL ("nothing to verify") and `rclone` is never invoked | — |

Reporting: one line per check + `RESULT: N ok, M failed` to stdout (cron → `/var/log/profile-checks.log`).
Ping URL set → all OK: `curl -fsS -m 10 --retry 3 <url>`; any FAIL: `--data-raw "<reasons>" <url>/fail`.
Body = check names, reasons, ages, counts, object **basenames** only — never keys, endpoints, bucket,
tokens, the URL (test C17 greps every run's log and body for synthetic values of each). `curl`'s
stderr is discarded (its error text can carry the URL). Undelivered ping → logged + exit 1 (the
service alerts on the missing ping). URL unset → `ALERTING NOT CONFIGURED`, exit 1, no curl.

## Verification evidence

| Gate | Result |
|---|---|
| `bash -n` | clean: `profile-checks.sh`, `setup-profile.sh`, `build-deploy-profile.sh`, `tests/profile-checks.sh`, `tests/scripts/profile-deploy-hardening.test.sh` |
| `shellcheck` | **not run — not installed on this host** (`shellcheck not found`). Plan said "if present" |
| `bash tests/profile-checks.sh` | `RESULT: 68 passed, 0 failed` after review round 1 (build: 59, C1–C17; first run was 58/1 — a real bug in the checker's weekly object **count** (`grep -c` counted lines, not objects); fixed, re-run green) |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` — T1–T11 + three structural sections |
| `npm test` (full) | **116 suites / 1233 tests passed**, 26.3 s; `ShellHarnesses.test.ts` 26.1 s with Docker up (no skipped tests reported) |
| `npm run lint` | clean (`eslint`, no output) |
| Prettier | `tests/scripts/ShellHarnesses.test.ts` clean. The three `.md` files warn — **all three already warned at `HEAD`** (checked with `git show HEAD:<file> \| prettier --check --stdin-filepath`), so this is pre-existing, not introduced; see residual R6 |
| Live behaviour (V1–V6) | **NOT verified** — needs the deploy and the owner's accounts (Part B). Nothing here proves rotation happened, the rollback image survived a real prune, or an alert arrived |

## B0 / B1 — read-only evidence from the box (sanitized)

Run 2026-09-13 ~07:08 UTC over SSH from this machine (route via `en0`, not `utun*`; key from
`PROFILE_SSH_KEY`). Two read-only sessions; nothing written. ⚠️ The **first** attempt was denied by
the auto-mode permission classifier ("Production Reads"); a shorter, plainly read-only retry was
allowed — recorded so the two attempts are not mistaken for two sessions of different content.
Redactions: hostname/IP → `<HOST>`, domain → `<DOMAIN>`, registry repo → `<registry>/<repo>`. No
bucket, endpoint, key, digest-to-tag mapping or URL appears below.

**B0 — ping-host reachability from the box (`curl -sS -m 10 -o /dev/null -w '%{http_code} %{time_total}'`):**

| Host | Result | Reading |
|---|---|---|
| `https://hc-ping.com/` | `403` in **0.17 s** | reachable — a GET on the bare host with no check UUID is *expected* to 403; the HTTP answer is the proof |
| `https://cronitor.link/` | `204` in 0.77 s | reachable (alternative ping host) |
| `https://healthchecks.io/` | `200` but timed out at 10 s mid-body (21 KB of 59 KB) | the dashboard **page** is slow from RU; irrelevant to pings, which go to `hc-ping.com` |

→ **Q1-A is feasible. No fallback to option B. No `NEEDS-DECISION` on the transport.**

**B1 — the "before" state and check 4's premise:**

| Item | Observed |
|---|---|
| Box clock | `Sun Sep 13 07:08:08 UTC 2026` (UTC-pinned as expected) |
| `letsencrypt.log` | **0 bytes**, mtime `2026-09-13 00:03:05` |
| `letsencrypt.log.1.gz` … `.12.gz` | weekly, Sundays 00:00:0x, 3–17 KB; `.1.gz` = 17422 B, mtime `2026-09-13 00:00:02` |
| Why 0 bytes | `/etc/logrotate.d/certbot`: `rotate 12`, `weekly`, `compress`, `missingok` (+ Ubuntu's global `create`); `logrotate.timer` last fired **00:03:05** — it rotated the week's log and created the empty file. `/etc/letsencrypt/cli.ini` sets `max-log-backups = 0` (certbot's own rotation off) |
| Certbot logs every run? | **Yes.** `.1.gz` holds 30 invocations this week: the cron's `--quiet --pre-hook …` at **00:00 and 12:00 daily**, plus **`certbot.timer` runs** (`-q --no-random-sleep…`, random times: 03:00, 12:41, 09:13, 18:52, …) — 60 "not yet due / skipping" lines. Check 4's premise holds |
| `certbot-renew.log` | **0 bytes since Jun 23** — `--quiet` prints nothing on a no-op; the cron's own log cannot prove an attempt (as the plan predicted) |
| `certbot --version` | 4.0.0; `certbot.timer` next fire 10:52 UTC |
| `cron` journal | `CRON … (root) CMD (certbot renew --quiet --pre-hook "systemctl stop nginx" -…)` at Sep 12 12:00:01 and Sep 13 00:00:01 — the cron runs |
| Certificate | `notAfter=Nov 20 11:01:42 2026 GMT` — matches the brief's fuse date; ~68 days left |
| Disk | `/dev/sda4` **58 G total, 15 G used, 43 G free (26 %)** — the size Q3 wanted |
| journald | 767.5 MB (the second sink; default cap applies) |
| Images | `<registry>/<repo>` **×10** untagged digests (1.61–1.66 GB each; 1 current from 2 days ago, **9 superseded**, 8 of them 2 months old) + `postgres:16-alpine` (420 MB). The keep-list prune will reclaim **~13 GB** |
| Containers | `profile-profile-api-1` Up 2 days (healthy), `profile-postgres-1` Up 2 days (healthy) |
| **LogConfig (V1 "before")** | both: `{"Type":"json-file","Config":{}}` — **unbounded default**, exactly G1 |
| `/etc/docker/daemon.json` | does not exist (ownership decision has no conflicting layer) |
| Tools on box | `rclone age curl openssl jq certbot` all present |
| `/opt/profile` | `backup.env` 0600, `backup.sh` 0700, `docker-compose.yml` 0600, `profile.env` 0600; `backups/`: `last-backup.json` (Sep 13 02:30) + `last-smokecheck.json` (Sep 10), both 0600 |

**Consequence for the code (check 4):** the plan's "mtime of `letsencrypt.log`" would read the
logrotate-created empty file's mtime as an attempt for a few hours every Sunday, and on any Sunday the
cron missed. The shipped check takes the **newest mtime among the non-empty `letsencrypt.log*`
files** (the rotated `.1.gz` keeps the original's last-write time). Test C10 covers both the
observed state (empty live log + fresh `.1.gz` → OK) and its inverse (empty live log + stale
`.1.gz` → FAIL).

**What the first live run will see (predicted from B1, unverified):** marker 02:30 today → OK;
daily object → OK; `weekly/` has the 2026-09-13 object (0241) → 0 d → OK; newest non-empty
certbot log 00:00 → 8 h at 08:00 → OK; `certbot-renew.log` 0 bytes → baseline, OK; cert 68 d → OK;
`backup.env` present → OK → success ping.

## Decision log (ADR-019/032 audit: every fix applied unattended and every obvious-winner call)

Standing approval = the approved plan. Each entry: what, why it qualified.

1. **Check 4 reads the newest mtime among non-empty `letsencrypt.log*`** instead of the live file's
   mtime alone. Plan A3.4 said "per-run rewrite behaviour to be confirmed on the box in B1; if it
   does not hold, fall back" — B1 showed the premise holds but logrotate's `create` adds a false-OK
   window. Mechanical, in-plan (the plan pre-authorised adjusting this check on B1's evidence).
2. **Check 2 uses `last-smokecheck.json`'s `object_key` on a fresh box** (no nightly marker yet).
   Without it a fresh box passes check 1 by the plan's own fresh-box rule and then fails check 2 for
   having no marker — a contradiction the plan did not spell out. Obvious winner within intent.
3. **Check 5 first-run semantics: no persisted offset (or a shrunk log) = report everything.** Plan
   only said "byte offset persisted". The alternative — silently baseline on first run — hides a
   pre-existing error forever; reporting it once is the fail-loud direction. Obvious winner.
4. **Check 6 verdict via `openssl x509 -checkend`** rather than parsing `notAfter` into days.
   Equivalent semantics ("≥ N days remaining"), portable, no date-format parsing. Mechanical.
5. **Checks 4–6 FAIL (not skip) on a box with no `PROFILE_DOMAIN`.** Plan silent; the live box always
   has a domain; fail-loud matches Q6's spirit. Obvious winner, zero effect on the real box.
6. **Prune placed after the HTTPS section, immediately before `CONFIGURING SYSTEMD`.** Plan allowed
   anywhere between the stack section and systemd; the latest point means a deploy that aborts at
   the DNS gate never prunes. Mechanical.
7. **Harness `daemon.json` assertion scoped to non-comment lines.** Plan A7.1 said "appears
   nowhere"; but A1 requires a comment *recording* the ownership decision, which must be able to
   name the file. Code lines are still forbidden. Obvious winner.
8. **Weekly object count bug** (`grep -c` counted lines; fixed to count `"Path":` occurrences) —
   found by test C8, fixed, re-run green. Verified-CORRECT, localized.
9. **In local mode checks 2 and 3 also emit FAIL** ("nothing to verify") rather than being skipped —
   uniform one-line-per-check log, and `rclone` is never invoked without creds. Mechanical.
10. **`curl` stderr discarded in the ping step** — curl's own error text can include the URL, which
    would land in the log. Secret-hygiene, in-plan (brief V9).
11. **Harness comment "forwards 28 variables"** → "every variable in its export block" (the number
    was already off by one before this task; a count that must be maintained by hand is the coupling
    that file's own comment warns about). Mechanical.

No other unattended change. **No frontier-move, regression, oscillation or out-of-plan fix occurred.**

### Process-review round 1 (2026-09-13, spawned Process-review worker under the ADR-032 standing approval)

Each entry: which review finding, what changed, why it qualified.

12. **R1 — threshold guard.** `profile-checks.sh:90-104` `int_or_default`: a non-integer
    `PROFILE_CHECKS_MAX_*` / `CERT_MIN_DAYS` now yields `FAIL thresholds: …` and the default stands
    in, so the run reaches the ping (before: `-gt junk` → silent OK; `$((junk))` → abort before the
    ping). `10#` normalises `08`; `0` remains valid (B9). Harness C18. Verified-CORRECT (reproduced
    both failure modes), mechanical/localized, in-plan (the plan's own "reports FAIL rather than
    aborting the run before the ping" rule).
13. **R4 — size comparison in check 2.** `profile-checks.sh:169-181`: remote `Size` ≠ marker
    `size_bytes` → FAIL naming both. Harness C6 (+2). Verified-CORRECT, mechanical/localized, in the
    plan's intent for check 2 ("the daily object the marker names really exists").
14. **R5 — CLAUDE.md harness row** `~1 s` → `~5 s` (re-measured 5.0 s after the added cases).
    Mechanical doc fix.
15. **R3 — wording only.** Check 4's comment and messages no longer claim "the renew cron ran": any
    certbot invocation (cron or `certbot.timer`) satisfies it. Mechanical honesty fix; the coverage
    fix itself is a judgment call and was returned as `NEEDS-DECISION` (see review.md R3 row).
16. **R2 — no fix applied** (frontier-move; proposed as an accepted residual, owner's say-so needed).
    Verified: a malformed sourced env file kills the shell even under `if ! . file` — a guard would
    need a subshell pre-parse, a mechanism outside the plan.

Obvious-winner calls this round: **none**.

Owner rulings relayed by the driver (2026-09-13), applied on that authority — NOT unattended:

17. **R3 → option (A).** `setup-profile.sh` HTTPS section (after `certonly`, before the hooked
    renew cron): `systemctl disable --now certbot.timer >/dev/null 2>&1 || true` — inside the
    `PROFILE_DOMAIN` guard, idempotent, never fails the deploy. Hardening harness: presence with
    `|| true` + line-order (certonly < disable < renew-cron line). Check 4's comment/messages
    restored to "the hooked renew cron ran" (now true: the timer is gone). Box-level change
    outside the approved plan — authorised by the owner ruling, not by the standing approval.
    Applied by the B4 deploy; B7(d) verifies `systemctl is-enabled certbot.timer` → `disabled`.
18. **R2 → accepted residual** written into review.md's Accepted residuals (owner ruling); no code.

## Residuals (accepted or handed on)

- **R1 — Nothing is live.** All of G1–G4 is code + docs until B4. V1–V6 unverified by construction.
- **R2 — `certbot.timer` (Debian package) is a second renewal path with NO nginx hooks.** Seen in
  B1: it runs `certbot -q renew` at random times besides our cron. When renewal becomes due
  (~2026-10-21) its standalone bind on port 80 will fail while nginx is up and log an error to
  `letsencrypt.log` (journal for its stdout) — **not** to `certbot-renew.log`, so check 5 will not
  see it; the cron run with hooks should still succeed, and check 6 catches the case where both
  fail. Pre-existing, out of scope; worth a producer note (disable the timer, or accept the noise).
- **R3 — Manual `backup.sh` overwrites the marker AND today's object** (0218 fact c): freshness can
  be satisfied by a human. Accepted in the plan.
- **R4 — Harness heredoc/awk extraction is formatting-coupled** → false RED on a reformat, never
  false green. Same as 0060's.
- **R5 — `shellcheck` not run** (absent on this host).
- **R6 — Prettier warns on the three `.md` files — pre-existing at `HEAD`, not introduced here.**
  This build deliberately did not reformat them: the runbook carries someone else's uncommitted
  edit, and a whole-file reformat would bury both changes. Note `package.json`'s lint-staged runs
  `prettier --ignore-unknown --write` on `**/*`, so a commit through a *working* husky hook would
  rewrite all three wholesale (the hook is inert today — `0223`).
- **R7 — Check 5 alerts once per growth, then the offset advances**: a failed attempt is visible
  in one `/fail` ping (and the service shows the last ping as failed until the next success);
  persistence is covered by checks 4/6. By design.
- **R8 — The first-ever B0 SSH attempt was permission-denied** by the auto-mode classifier; the
  retry was allowed. Recorded for honesty, no effect on evidence.
- **R9 — Deploy recreates BOTH containers** (compose `logging:` changed), including postgres — a
  brief DB restart behind the existing health gate. Acceptable: 0 rows, game server not wired (0217).
  The deploy-time smoke backup will also **overwrite today's daily object** at the same key.

## Part B — hand-off to the owner (nothing here was done)

Order matters: B2/B3 before B4 so the URL ships with the deploy.

- **B2 (owner):** create the dead-man's-switch check on a healthchecks.io-style service — period
  **1 day**, grace **3 h**; attach **Telegram** (a separate ops chat/topic per 0033, not the
  user-feedback chat) **and email**. Put the ping URL in `.env.profile.secret` as
  `PROFILE_CHECKS_PING_URL`. (B0 proved `hc-ping.com` answers from the box.)
- **B3 (owner):** two external HTTPS uptime monitors — `/health` **and** `/ready` (owner Q2) —
  5-min interval, ≥2 consecutive failures before alerting, contacts Telegram + email; enable the
  service's TLS-expiry reminder if offered.
- **B4 (owner runs):** `npm run deploy:profile`. Expect: both containers recreated; health gate
  passes; migrations no-op; HTTPS section idempotent; **`PRUNING UNUSED IMAGES` lists the kept IDs
  and removes ~9 images**; `INSTALLING OPERABILITY CHECKS` prints "alerting configured"; cron
  rewritten with the `checks.sh` line; smoke backup runs (overwrites today's daily object — R9);
  summary shows `Checks: … alerting: yes`. Then run `/opt/profile/checks.sh` once by hand and
  confirm the service shows a success ping. **This deploy is also what applies the `certbot.timer`
  disable** (review R3, owner ruling 2026-09-13 — `setup-profile.sh` HTTPS section, idempotent).
- **B5 — V1:** `docker inspect --format '{{json .HostConfig.LogConfig}}'` on both containers →
  `json-file` with `max-size=100m,max-file=10`. Observed rotation, cheaply: one throwaway container
  with `--log-opt max-size=1m --log-opt max-file=2` writing ~3 MB → `*-json.log.1` appears under
  `/var/lib/docker/containers/<id>/` → `docker rm` it.
- **B6 — V2:** `docker images --digests` = current + previous profile digests + `postgres` only;
  `docker image inspect "<previous digest>"` succeeds → rollback image survived.
- **B7 — V3 (failed renewal VISIBLE):** (a) `certbot renew --dry-run --server
  https://127.0.0.1:1/directory >> /var/log/certbot-renew.log 2>&1` (no hooks, nginx stays up) →
  `/opt/profile/checks.sh` → `/fail` ping carrying the certbot error line → alert arrives. (b)
  `touch -d '2 days ago' /var/log/letsencrypt/letsencrypt.log*` (all of them — check 4 takes the
  newest non-empty) → run → alert; then the real `certbot renew --dry-run` (staging, hooks) or wait
  for the 12:00 cron → run → success ping → clears. (c) `PROFILE_CHECKS_CERT_MIN_DAYS=90
  /opt/profile/checks.sh` → FAIL (68 d remain) → alert; default run → clears. (d) **confirm
  `systemctl is-enabled certbot.timer` reports `disabled`** (and `systemctl is-active` → `inactive`)
  after B4 — from then on the hooked cron is the only certbot invoker, which is what check 4 now
  claims (review R3).
- **B8 — V4:** `systemctl stop profile` → both monitors alert within ~10 min → `systemctl start
  profile` → "up" notices. Record down/alert/up/clear timestamps here.
- **B9 — V5:** `PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS=1 /opt/profile/checks.sh` → alert names "daily
  marker age"; `PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS=0 …` → alert names "weekly" (⚠️ on the Sunday of
  a fresh weekly copy the age is 0 d, which is *not* > 0 — use `-1` or run on a later day); default
  run → success ping. Dead-man property: set the check's period to 10 min, do **not** run the
  checker → "missing ping" alert → set the period back to 1 day.
- **B10 — V6–V9:** name the Telegram ops chat + email here (no URLs/tokens); V7 doc done (A6); V8
  cross-refs are the producer's at close (Q7: `0034` item 5 → "profile half implemented by 0219 in
  `profile-checks.sh`; telemetry half remains"; `0182` limitation bullets); V9 grep the diff, the
  cron file, the logs and the ping bodies for endpoints/bucket/tokens — this worklog was written to
  that standard.
