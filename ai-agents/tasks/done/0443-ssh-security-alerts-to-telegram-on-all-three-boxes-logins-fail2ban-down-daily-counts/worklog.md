# 0443 — worklog

## Step 1 — read-only box inventory (2026-10-12)

Run by a spawned `fkit-coder` for `fkit-sprint-ship-loop`, with the owner's OK given live in the driver session
(2026-10-12, *"Run it now (Recommended)"*). Scope by owner ruling: **4 boxes** — game prod, game dev, profile, telemetry.

**How it was run.** One ssh session per box, every command in one batch piped to `bash -s`. Read-only: no installs, no
restarts, no file writes on any box, no config edits, no unbans. Credentials came from the same `.env*` files the deploy
scripts read, never printed. Profile: key login (`IdentitiesOnly=yes`, the `PROFILE_SSH_KEY` key, password auth off).
Game prod, game dev, telemetry: password login through `sshpass -f` with a 0600 file in the session scratchpad, public-key
auth switched off so no agent key was offered as a failed try; the file was removed after each run (checked).
Output was masked for IPv4 patterns before anyone saw it. Names, counts and versions only below.

**Login problems / retries / skips: none.** Every box logged in on the first try. No `Permission denied` on game prod
this time, so no retry was used. Telemetry: the route to it went out the normal network interface (not the VPN tunnel)
and tcp/22 answered, so it was not skipped.

⚠️ **Every "accepted in 24 h" count below includes this inventory's own login** (1 per box).

### Game prod

| Item | Value |
|---|---|
| OS / OpenSSH | ubuntu 24.04 / OpenSSH_9.6p1 Ubuntu-3ubuntu13.14 |
| Login user / root | `root`, uid 0 |
| Journal | persistent (`/var/log/journal`); 831.9M; oldest boot 2026-07-15 |
| Other SSH log | `/var/log/auth.log` present; rsyslog active |
| SSH units | `ssh.service`, `ssh.socket` |
| Accepted 24 h, `SYSLOG_IDENTIFIER=sshd` | **4** (password 4, publickey 0) |
| Accepted 24 h, `SYSLOG_IDENTIFIER=sshd-session` | 0 (identifier not used on this OpenSSH) |
| Failed password / invalid user 24 h (`sshd`) | 1992 / 597 |
| sshd -T | usepam yes; passwordauthentication yes; pubkeyauthentication yes; permitrootlogin yes; maxauthtries 6; loglevel INFO; syslogfacility AUTH |
| Existing PAM session hooks | 0 `pam_exec` session lines in `/etc/pam.d/sshd`; no `/etc/ssh/sshrc` |
| fail2ban | 1.0.2; active; enabled |
| Jails | `sshd` only |
| sshd jail counters | currently failed 4; total failed 231598; currently banned 1; total banned 22223 |
| sshd jail journal matches | `_SYSTEMD_UNIT=sshd.service + _COMM=sshd` |
| Backend | `jail.d/defaults-debian.conf [DEFAULT] backend = systemd` (jail.conf default `auto`) |
| logtarget | `/var/log/fail2ban.log` |
| fail2ban.log 24 h | Ban 319, Unban 321, Found 2589 |
| Timezone | **Europe/Moscow** |
| Tools | curl, getent, journalctl, systemctl, jq, python3, logger, flock, wget, docker — all present |
| ufw | inactive |
| Env var names on box | container `geoconflict-prod`: `FEEDBACK_TELEGRAM_CHAT_ID FEEDBACK_TELEGRAM_TOKEN FEEDBACK_WEBHOOK_URL PROFILE_API_URL PROFILE_INTERNAL_TOKEN TELEGRAM_PROXY_URL`; `/root/.build.env`: none matching |
| Telegram direct | blocked (curl timeout, rc 28) |
| Telegram via proxy (box's own `TELEGRAM_PROXY_URL`) | **CONNECT 200, HTTP 302 — works** |
| Profile `/internal/` probe | **404 — gets through the allow list** |

### Game dev

| Item | Value |
|---|---|
| OS / OpenSSH | ubuntu 24.04 / OpenSSH_9.6p1 Ubuntu-3ubuntu13.14 |
| Login user / root | `root`, uid 0 |
| Journal | persistent; 1.3G; oldest boot 2026-02-22 |
| Other SSH log | `/var/log/auth.log` present; rsyslog active |
| SSH units | `ssh.service`, `ssh.socket` |
| Accepted 24 h, `sshd` | **1** (password 1) — likely this inventory's own login |
| Accepted 24 h, `sshd-session` | 0 |
| Failed password / invalid user 24 h | 1559 / 506 |
| sshd -T | same as game prod (password auth yes, root login yes, maxauthtries 6) |
| Existing PAM session hooks | 0; no `/etc/ssh/sshrc` |
| fail2ban | 1.0.2; active; enabled |
| Jails | `sshd` only |
| sshd jail counters | currently failed 2; total failed 155468; currently banned 3; total banned 20406 |
| sshd jail journal matches | `_SYSTEMD_UNIT=sshd.service + _COMM=sshd` |
| Backend | `jail.d/defaults-debian.conf [DEFAULT] backend = systemd` |
| logtarget | `/var/log/fail2ban.log` |
| fail2ban.log 24 h | Ban 304, Unban 304, Found 2065 (= failed 1559 + invalid 506 exactly) |
| Timezone | **Europe/Moscow** |
| Tools | all present (same list as prod) |
| ufw | inactive |
| Env var names on box | container `geoconflict-dev`: same 6 names as prod. ⚠️ Plus **21 leftover `/root/dev-*.env` deploy files**, 12 of them holding `FEEDBACK_TELEGRAM_CHAT_ID FEEDBACK_TELEGRAM_TOKEN FEEDBACK_WEBHOOK_URL` (see notes); `/root/geoconflict-dev.env`, `/root/.build.env`: none matching |
| Telegram direct | blocked (rc 28) |
| Telegram via proxy (box's own value) | **CONNECT 200, HTTP 302 — works** |
| Profile `/internal/` probe | **403 — NOT on the allow list** |

### Profile

| Item | Value |
|---|---|
| OS / OpenSSH | **ubuntu 26.04 / OpenSSH_10.2p1** Ubuntu-2ubuntu3.6 |
| Login user / root | `root`, uid 0 (key login) |
| Journal | persistent; 951.2M; oldest boot 2026-06-23 |
| Other SSH log | `/var/log/auth.log` present; rsyslog active |
| SSH units | `ssh.service`, `ssh.socket`, `sshd-unix-local.socket`, keygen units |
| Accepted 24 h, `sshd` | 0 |
| Accepted 24 h, `sshd-session` | **5** (publickey 5, password 0) |
| Failed password / invalid user 24 h (`sshd-session`) | 0 / 396 |
| sshd -T | usepam yes; **passwordauthentication no**; kbdinteractive no; permitrootlogin prohibit-password; maxauthtries 6; loglevel INFO |
| Existing PAM session hooks | 0; no `/etc/ssh/sshrc` |
| fail2ban | **1.1.0**; active; enabled |
| Jails | `sshd` only |
| sshd jail counters | currently failed 0; total failed 673; currently banned 3; total banned 62 |
| sshd jail journal matches | `_SYSTEMD_UNIT=ssh.service + _COMM=sshd` |
| Backend | `jail.d/defaults-debian.conf [sshd] backend = systemd`; `jail.d/geoconflict-sshd.local [DEFAULT] backend = systemd` |
| logtarget | `/var/log/fail2ban.log` |
| fail2ban.log 24 h | Ban 45, Unban 42, Found 406 |
| Timezone | **UTC** |
| Tools | all present |
| ufw | active |
| Env var names on box | `/opt/profile/profile.env`: `FEEDBACK_TELEGRAM_CHAT_ID FEEDBACK_TELEGRAM_TOKEN PROFILE_ALERT_WEBHOOK_TOKEN PROFILE_INTERNAL_TOKEN PROFILE_LOGIN_CREATE_ENABLED PROFILE_PORT PROFILE_SESSION_SECRET TELEGRAM_PROXY_URL TELEGRAM_TOPIC_ALERTS TELEGRAM_TOPIC_NAME_CHANGES`; `/opt/profile/checks.env`: `PROFILE_CHECKS_PING_URL PROFILE_DOMAIN`; `/opt/profile/backup.env`: backup/rclone names only; containers `profile-profile-api-1` and `profile-postgres-1`: the `profile.env` names (see notes) |
| Telegram direct | blocked (rc 28) |
| Telegram via proxy (box's own value) | **CONNECT 200, HTTP 302 — works** |
| Profile `/internal/` probe (from itself, via its public name) | 403 |

### Telemetry

| Item | Value |
|---|---|
| Reachability | route via the normal interface (not the VPN tunnel); tcp/22 open — not skipped |
| OS / OpenSSH | ubuntu 24.04 / OpenSSH_9.6p1 Ubuntu-3ubuntu13.19 |
| Login user / root | `root`, uid 0 |
| Journal | persistent; 2.7G; oldest boot 2026-04-26 |
| Other SSH log | `/var/log/auth.log` present; rsyslog active |
| SSH units | `ssh.service`, `ssh.socket` |
| Accepted 24 h, `sshd` | **4** (password 4) |
| Accepted 24 h, `sshd-session` | 0 |
| Failed password / invalid user 24 h | 1350 / 358 |
| sshd -T | same as game boxes (password auth yes, root login yes, maxauthtries 6) |
| Existing PAM session hooks | 0; no `/etc/ssh/sshrc` |
| fail2ban | 1.0.2; active; enabled |
| Jails | `sshd` only |
| sshd jail counters | currently failed 0; total failed 19385; currently banned 1; total banned 3186 |
| sshd jail journal matches | `_SYSTEMD_UNIT=sshd.service + _COMM=sshd` |
| Backend | `jail.d/defaults-debian.conf [DEFAULT] backend = systemd` |
| logtarget | `/var/log/fail2ban.log` |
| fail2ban.log 24 h | Ban 306, Unban 312, Found 1709 |
| Timezone | **Europe/Moscow** |
| Tools | all present |
| ufw | inactive |
| Env var names on box | `/opt/uptrace/alert-probe.env`: `ALERT_PROBE_SECRET ALERT_PROBE_URL`; no `TELEGRAM_*` anywhere; uptrace containers: none matching |
| Telegram direct | blocked (rc 28) |
| Telegram via proxy (box has no proxy setting; tested with the local `.env` `TELEGRAM_PROXY_URL`) | **CONNECT 403 — NOT on the proxy allow list** |
| Profile `/internal/` probe | **404 — gets through the allow list** |

### What this means for the plan (facts, no decisions)

- **Route reach today:** game prod — proxy ✓, profile relay ✓. Game dev — proxy ✓, profile relay ✗ (403).
  Profile — proxy ✓ (it is the relay). Telemetry — proxy ✗ (403), profile relay ✓.
  ⇒ the **profile relay** reaches 3 of 4 boxes with no allow-list change (dev needs adding to nginx's
  `/internal/` allow list); **direct-to-proxy** reaches 3 of 4 (telemetry needs adding to the proxy's allow list).
  Either way one box needs an owner allow-list step.
- **Login records:** all four keep a persistent journal and also `auth.log`. ⚠️ **The journal identifier differs by
  OpenSSH version:** Ubuntu 24.04 / OpenSSH 9.6 boxes write `Accepted ...` under `sshd`; the profile box (Ubuntu 26.04 /
  OpenSSH 10.2) writes it under **`sshd-session`**. A login detector must match both.
- **fail2ban** is installed, active and enabled on all four, jail named `sshd` everywhere, systemd backend everywhere,
  file logtarget `/var/log/fail2ban.log` everywhere (fail2ban's own journal is empty, so the daily ban count must come
  from the log file or `fail2ban-client`). Profile runs 1.1.0, the other three 1.0.2.
- **Timezones differ:** three boxes are Europe/Moscow, profile is UTC. `fail2ban.log` timestamps are local time.
- Every box has the needed tools (curl, journalctl, systemctl, jq, python3, logger, flock). No box has an existing
  `pam_exec` session hook or `sshrc`. All run sshd with `UsePAM yes`.

### Surprises (flagged, nothing changed)

1. 🚨 **Game dev: 21 leftover deploy env files `/root/dev-*.env`; 12 of them carry the feedback Telegram token names**
   (and, by the deploy heredoc, other deploy secrets — only TELEGRAM/PROFILE/PROXY/ALERT/FEEDBACK names were listed).
   `update.sh` removes its env file only at its end (`update.sh:107`), so a deploy that fails earlier leaves one behind.
   Game prod has none. Not touched — read-only run. Owner's call whether to clean up / file a task.
2. **Profile: `profile-postgres-1` has the whole `profile.env` set in its environment** (Telegram token, internal token,
   session secret, ...) — the API and Postgres containers appear to share one `env_file`. Names only seen. Not touched.
3. Game dev is **not** on the profile `/internal/` allow list (403); game prod and telemetry are (404).
4. Telemetry is **not** on the Telegram proxy allow list (CONNECT 403) and has no `TELEGRAM_*` settings at all.
5. fail2ban counters reset on restart: profile's "total failed 673" is far below its 24 h `Found 406` pace, so its
   service likely restarted within the last couple of days (inference, not checked). "Total" counters are since-restart, not lifetime — the daily count should use 24 h log
   lines, not totals.

## Step 2 — Build (A1–A10), 2026-10-12

Run by a spawned `fkit-coder` as the **Build worker** of `fkit-sprint-ship-loop`, under the driver's
declared-approval marker (owner approved the revised Way A plan via `AskUserQuestion` in the driver
session, 2026-10-12). Built to `plan.md` **as amended by its "Owner decisions" section** — Q-A1
"always fail; after swap; skip also fails" and Q-A2 "no switch" win over the plan text. No SSH, no
remote command, no `.env*` read, no deploy, no commit. Briefs, boards and `plan.md` untouched.

### What was built

| Plan item | Files |
|---|---|
| A1 agent + installer | `ssh-alerts.sh` (new): `install` (token on stdin, 0600 config, 0700 agent, unit, cron, restart only when the agent/unit changed), `uninstall`, `watch`, `tick`, `f2b-check`, `daily`, `retry`, `test` |
| A2 route | `src/profile-server/SshAlerts.ts` (new), mount in `Routes.ts`, wiring + literal `process.env.PROFILE_SSH_ALERT_TOKEN` in `Server.ts` |
| A3 digest | `src/profile-server/SshSecurityDigest.ts`, `src/profile-server/sendSshSecurityDigest.ts` (new), npm script `digest:ssh-security` |
| A4 profile box | `setup-profile.sh`: persist-or-reuse token (never generated), `profile.env` line, value-report row, `ssh-alerts/` 0700 + compose mount, `10 8 * * *` digest cron, non-fatal "SSH SECURITY ALERTS (0443)" section (after the fail2ban/sshd ranges) |
| A5 | `build-deploy-profile.sh`: ships `ssh-alerts.sh` (precondition, scp, `PROFILE_SHIPPED_PATHS`), stages the token |
| A6 telemetry | `setup-telemetry.sh` (persist-or-reuse, URL derived from `TELEMETRY_ALERT_PROBE_URL` minus the exact path, non-fatal install), `build-deploy-telemetry.sh` (ship + `TELEMETRY_SHIPPED_PATHS` + staged token) |
| A7 game root step | `setup-game-host.sh` (new): contract header, preconditions (root, `GAME_ENV`, role marker `game`), SSH SECURITY ALERTS section, placeholder comments only for 0446/0442. Exit 0 OK / 1 FAILED / 3 SKIPPED. `setup.sh` not changed |
| A8 deploy.sh | one `deploy_cleanup()` + `trap deploy_cleanup EXIT` (0444 folds into it); `run_game_host_setup()` (ONE root login by key, `BatchMode=yes`, tar stream on stdin); call line after the update block's check; final banner. **Any result but OK → "GAME IS DEPLOYED — HOST SETUP NOT DONE" banner, exit 3** (Q-A1). No skip switch (Q-A2) |
| A9 tests | `tests/ssh-alerts.sh` (new, 93 checks, registered in `ShellHarnesses.test.ts` + CLAUDE.md row), `tests/profile-server/SshAlerts.test.ts`, `tests/profile-server/SshSecurityDigest.test.ts` (new); hardening harness T60/T61/T11/T15/T44 updated + new T67–T70 and two 0443 structural blocks; `ConfigParityCallSites.test.ts` updated |
| A10 runbook | `docs/vps-deployment-guide.md` §2 + §7 notes + new §8; pointer in `ai-agents/knowledge-base/alert-delivery-runbook.md`; token documented in `example.env`, `example.env.profile`, `example.env.telemetry` |

### Evidence (targeted checks only — the driver's Verify step owns the one full `npm test`)

| Command | Result |
|---|---|
| `bash -n` on all 9 touched/new shell scripts | all OK |
| `npx tsc --noEmit -p tsconfig.json` | OK |
| `bash tests/ssh-alerts.sh` | `RESULT: 93 passed, 0 failed`, 5.1 s wall |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` (870 ✅), **20.1 s wall vs the 150 s deadline** (baseline before this task: 18.5 s, 796 ✅) |
| `npm test -- tests/profile-server/SshAlerts.test.ts tests/profile-server/SshSecurityDigest.test.ts tests/scripts/ShellHarnesses.test.ts tests/scripts/ConfigParityCallSites.test.ts` | 4 suites, **73 passed, 0 skipped** (Docker was up, so the secret-boundary harness ran too); ShellHarnesses suite 47.7 s; run 52.6 s |
| `npm run check:config-parity` | REQUIRED 0 in all three pipelines |
| `npm run lint` | clean |

**Red first, where practical:**
- Before the test updates, the 0441 cases T60/T61/T64/T65 failed with `exit 3` and the two deploy.sh
  cases in `ConfigParityCallSites.test.ts` failed `Expected 0, Received 3` — the old "exit 0" was
  pinned; T15's clean value report failed on the new `PROFILE_SSH_ALERT_TOKEN` FINDING. All updated to
  the Q-A1 behaviour, not loosened.
- `tests/ssh-alerts.sh` found two real agent bugs before they shipped: (1) `{16,512}` in the token
  regex exceeds macOS's `RE_DUP_MAX` (255) → every install refused under bash 3.2 (fixed to 255);
  (2) `IFS='=' read` stripped a trailing `=` from a base64 token (fixed: split on the first `=`).
- `SshAlerts.test.ts` "400 to a FULL address" failed first: the source pattern accepted
  `203.0.113.57`. Tightened to the masked forms only.
- Mutation check: `exit 3`→`exit 0` and `BatchMode=yes` removed in deploy.sh → 9 harness failures;
  file restored byte-for-byte (`cmp`).

### build-deploy.sh (and other callers) when deploy.sh exits non-zero after the game is live

`build-deploy.sh` is the only caller (no CI, no npm script). It bumps, commits, tags and pushes the
version in STEP 0/0.5 **before** STEP 1 (build) and STEP 2 (`./deploy.sh`). Under `set -e`, a
deploy.sh exit 3 stops it right there with status 3: its own "BUILD AND DEPLOY COMPLETED
SUCCESSFULLY" is not printed, and deploy.sh's "GAME IS DEPLOYED — HOST SETUP NOT DONE" banner is the
last thing on screen. Nothing runs after STEP 2, so there is no version/commit/push/tag ordering to
change: the tag already names the image that is live, exactly as for any other deploy.sh failure
today. **No judgment call needed; build-deploy.sh is unchanged.** Exit 3 (not 1) lets a script tell
"game live, host setup not done" from "stopped before the game went live".

### Not verified (and why)

- No full `npm test` — the driver's Verify step runs the one full run (project lock).
- On a real box (verify task): GNU tar extraction with `--no-same-owner`; `journalctl -f` with
  `--since @<epoch>` / `-n 0`; systemd unit + cron; the `fail2ban.log` line format beyond the
  inventory's; real Telegram delivery; the profile route behind nginx's `/internal/` allow list.
- `shellcheck` is not installed here — not run.
- Unknown from here: game dev's `PROFILE_API_URL` value. If it is blank, **every game dev deploy
  exits 3** (SKIPPED) until it is set — that is Q-A1 working, but worth knowing before the first one.

### Decision log (choices made unattended; owner decisions are not listed here)

1. **Daily counts = a 24 h window, not fail2ban's Totals** (inventory finding; driver said "coder
   decides and records"): failed/unknown-user from the journal's `Failed …` / `Invalid user …` sshd
   lines (`--since @now-24h --until @now`); bans from `[<jail>] Ban ` lines in `fail2ban.log` (+ `.1`),
   compared in the box's LOCAL time because that is what the log writes. Restart-proof by
   construction. Statuses became `journal: ok|unreadable`, `banLog: ok|partial|unreadable`; the plan's
   `first-day` status is gone (meaningless for a window). `Restore Ban` and other jails are not counted.
2. **Daily schedule = the 5-minute `tick`, at the first tick ≥ 08:00 UTC, once per UTC day** (state
   file) — not an `08:00` cron line. Why: Vixie cron ignores `CRON_TZ` (setup-profile.sh documents
   this) and three boxes run Moscow time; the decision is made in UTC inside the agent, so it is right
   on every box and survives a missed tick or a restart. The digest stays a fixed `10 8 * * *` on the
   profile box, which is pinned to UTC.
3. **Exit code 3** for "game deployed, host setup not done" — distinct from deploy.sh's 1. Within
   Q-A1's "exits with an error".
4. **`trap 'exit 130' INT` / `trap 'exit 143' TERM` moved** from the password branch up beside
   `trap deploy_cleanup EXIT`, lines unchanged except indentation, so a Ctrl-C on the KEY path also
   removes the staging dir. The plan said "stay byte-identical"; the harness's check is
   whitespace-tolerant and still passes. Recorded as a deviation.
5. **tar lists the three files by name, and the box extracts with `--no-same-owner`** — otherwise the
   archive's "." entry and file owners (the Mac's uid) would be restored onto the box's token file.
6. **setup-game-host.sh refuses a box already marked as another role** (and never overwrites that
   marker) — a game deploy pointed at the wrong box must not stamp `game` onto it.
7. **The digest always lists the four expected boxes** (`game-prod`, `game-dev`, `profile`,
   `telemetry`), reading `NO REPORT — never reported` before a first report; the plan said "known once
   it has reported". Stricter version of the brief's "a missing box must not look like 0".
8. **Spool files are claimed by rename with the sending process's own pid** (`sh -c 'echo $PPID'` —
   bash 3.2 has no `$BASHPID`), so the watcher and the cron retry can never deliver one event twice;
   a claim whose process is gone is released.
9. **`persist_or_reuse_probe_value` got an optional 3rd argument** (the "what stays off" wording) so
   the telemetry box reuses it for the SSH token instead of a parallel function.
10. Review fixes applied unattended: **none** — no review has run yet (the fixes above are build-time
    fixes found by this task's own tests).

## Verify (driver step) — 2026-10-12

Spawned by `fkit-sprint-ship-loop` as a run-and-diagnose step; no source written, nothing fixed.

- No other jest run was going before the run (`ps` check empty), so the project lock did not wait.
- `npm test` (one full run, via the npm script): **exit 0** — `Test Suites: 225 passed, 225 total`,
  `Tests: 4602 passed, 4602 total`, jest `Time: 90.515 s` (92 s wall). `tests/scripts/ShellHarnesses.test.ts`
  PASS (53.2 s) — it now includes `tests/ssh-alerts.sh`; `tests/profile-server/SshAlerts.test.ts` PASS
  (its `disk full` error log line is the test's own injected fault). No `Exceeded timeout`, `did not exit`
  or `SIGSEGV` in the log; no re-run needed.
- `npm run lint`: exit 0, no output.
- `npm run check:config-parity`: `REQUIRED 0` on game, profile and client (report-only, exit 0).
- `npx tsc --noEmit`: exit 0, no output.
- `bash tests/ssh-alerts.sh` standalone: exit 0, 5 s, final line `==== RESULT: 93 passed, 0 failed ====`.
- `bash tests/scripts/profile-deploy-hardening.test.sh` standalone: exit 0, **22 s** wall (vs the 150 s
  wrapper deadline), final line `ALL PASS`.
- Not verified here: anything on a real box (deploy, Telegram delivery) — that needs a deploy.

## Review round 1 — process-review (coder), 2026-10-12

Spawned by `fkit-sprint-ship-loop` as the Process-review worker, under the owner-approved plan
(standing approval). Ledger: this folder's `review.md`, findings R1–R10.

### Decision log — review round 1 (fixes applied unattended)

Each entry: finding → what changed → why it qualified.

1. **R1** (failed Telegram send only logged) → `SshAlerts.ts` bumps a running total in
   `failed-sends.json` (the bind-mounted state dir) on every send that still fails after
   TelegramNotifier's retry; the digest shows `⚠️ N SSH alert message(s) could not be sent to Telegram
   since the last digest` and keeps the total it reported in its marker (`failedSendsTotal`), showing
   the difference next time. A total below the marker's (file lost) counts as all new. Why this form:
   **owner ruling "Fix it"**; the digest line is the smallest form the owner actually sees — a metric
   (AlertRelay's way) has no alert rule reading it, so it would still be "only logged" in practice.
   A running total, not a reset counter, because the digest is a separate process (`docker compose
   exec`): resetting from there would race the server's writes.
2. **R2** (failed config/cron write read as "installed") → `write_if_changed` returns 2 on any
   failed write; every call site in `install` dies on 2 (so `setup-game-host.sh` reports FAILED).
   Why: verified CORRECT (`|| true` + unconditional `return 0`), mechanical, in plan (A1 "refuses bad
   input", A7 "FAILED if any section failed").
3. **R3** (resume marker moved before the login was spooled) → `handle_line` spools in the foreground
   first, then moves the marker; only the send stays in the background. Cost: the reverse-DNS lookup
   (≤ 2 s) now runs in the foreground — later journal lines wait in the pipe, none is lost. Why:
   verified CORRECT; in plan (A1 "a restart resumes instead of losing logins"); the send is still
   backgrounded as A1 requires. Obvious winner: a kill now costs at worst one duplicate, never a loss.
4. **R4a** (grouping by arrival time) → a login joins a group only if its own `at` is within the
   window of the group's first login (arrival window still paces the timer). **R4b** (replaced group
   lost its follow-up; old timer flushed the new group) → `flushGroup(key, group)` flushes its own
   group once (`flushed` flag) and deletes the map entry only if it is still that group; a replaced
   group with pending logins is flushed first. Why: verified CORRECT, localized to `handleLogin` /
   `flushGroup`, in plan (A2 grouping, "every login still reaches you").
5. **R5** → (a) the spool cap check + write and the dropped counter (add / take-and-reset) run under
   one `flock` on `spool.lock` (`with_spool_lock`; unlocked where flock is missing, i.e. the macOS
   harness); a dropped event that cannot be spooled puts its count back. (b) `tick` takes
   `flock -n` on `tick.lock` and skips if the previous tick still runs. (c) the claim pid is
   `${BASHPID:-$$}` expanded in the sending shell; the old `my_pid` / `sh -c 'echo $PPID'` is gone
   (**supersedes Step 2 decision 8's mechanism**). Why: verified CORRECT (bash 3.2 measurement is the
   reviewer's; flock present on all four boxes per the inventory); localized to `ssh-alerts.sh`; in
   plan (A1 spool limits, two-check rule, one send per event).
6. **R7** (yesterday's numbers unmarked) → a report older than `SSH_DAILY_FRESH_MS` (12 h) is shown
   as `⚠️ OLD numbers from <time>, today's report has not arrived · …`. Why: verified CORRECT
   (26 h stale threshold vs a 24 h cadence); in plan (A3 / brief: a missing number must never look
   current). 12 h chosen because today's report is minutes old at 08:10 UTC and any late one leaves
   a ~24 h-old report — anything between is unambiguous.
7. **R8** (unrotated agent log) → `install` also writes `/etc/logrotate.d/geoconflict-ssh-alerts`
   (weekly or 10 MB, 4 kept, compressed) via `write_if_changed`; uninstall leaves it so the existing
   log still rotates. Why: verified CORRECT (no rotation anywhere; the project's nginx disk-full
   incident); mechanical; obvious winner within the plan's intent. ⚠️ Assumes `logrotate` is installed
   (Ubuntu default) — the inventory did not check it; the verify task should.
8. **R9** (an unknown-user password try counted in both numbers) → wording only: the digest footer
   now says so. Counting unchanged (both numbers stay true to what they name). Why: verified CORRECT
   (nit); mechanical.
9. **R10** (a `'` in the token breaks the telemetry env source) → `build-deploy-telemetry.sh`
   refuses a `PROFILE_SSH_ALERT_TOKEN` containing `'` under *Validate*, before anything is sent;
   the value is never printed. Only the new variable — the pre-existing pattern for the others is
   untouched. Why: verified PARTIALLY CORRECT (real for the new value; not a trust-boundary issue);
   mechanical, localized, in plan (A6 forwards this token).
10. **Agent version not bumped** (stays 1 in `ssh-alerts.sh` and `SshAlerts.ts`): no agent has been
    deployed anywhere yet, so there is no older box for the digest to flag.
11. **R6 — NOT applied; returned NEEDS-DECISION.** Adding a `_UID=0` (or `_COMM`) journal match is
    unverifiable from here, and a wrong match silences every login alert on that box; keeping the
    current filter as a residual needs an owner ruling.

### Evidence (targeted only — the driver re-verifies with the one full run)

- `bash -n` OK: `ssh-alerts.sh`, `build-deploy-telemetry.sh`, `tests/ssh-alerts.sh`,
  `tests/scripts/profile-deploy-hardening.test.sh`.
- `bash tests/ssh-alerts.sh`: `RESULT: 102 passed, 0 failed` (was 93), ~6 s. New: I1 logrotate, I4b
  (unwritable file → FAILED), W2b (spool-before-marker order), S1b (dead claim released, live kept,
  `$BASHPID`), D4 (busy tick skipped, `flock -n 9`). Mutation check: disabling the tick lock turns
  D4 red (2 failures).
- `bash tests/scripts/profile-deploy-hardening.test.sh`: `ALL PASS`, **20 s** wall (vs 150 s). New T71
  (quoted token refused before the box, value never printed).
- `npm test -- tests/profile-server/SshAlerts.test.ts tests/profile-server/SshSecurityDigest.test.ts
  tests/scripts/ShellHarnesses.test.ts tests/scripts/ConfigParityCallSites.test.ts`: 4 suites,
  **82 passed**, 0 skipped (SshAlerts + Digest alone: 61, was 52).
- `npm run check:config-parity`: `REQUIRED 0`. `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0.
  Prettier applied to the two TS files (only the new lines moved).

- **R6 closed (2026-10-12):** owner ruled "Accept as known limit" (driver relay) → recorded as an accepted residual in `review.md`; no source change. Ledger `Status: closed-out`.
- **For the verify task:** check `logrotate` is installed on each box (R8 assumes it).

## Re-verify after review round 1 (driver step) — 2026-10-12

Run and diagnose only; no source touched. No other jest run was going beforehand (`ps` empty).

- **`npm test` (one full run, npm script):** exit 0, **88 s**. `Test Suites: 225 passed, 225 total`;
  `Tests: 4611 passed, 4611 total`; 0 skipped (Docker-probed harness ran). `SshAlerts.test.ts`,
  `SshSecurityDigest.test.ts`, `ShellHarnesses.test.ts` (49.6 s; includes `tests/ssh-alerts.sh`),
  `ConfigParityCallSites.test.ts` all PASS. No flake, no SIGSEGV, no re-run needed.
- **`npm run lint`:** exit 0. **`npx tsc --noEmit`:** exit 0.
- **`npm run check:config-parity`:** `REQUIRED 0` on game / profile / client (report-only, exit 0).
- **`bash tests/ssh-alerts.sh`:** exit 0, ~5 s, `==== RESULT: 102 passed, 0 failed ====`.
- **`bash tests/scripts/profile-deploy-hardening.test.sh`:** exit 0, **19 s** wall (deadline 150 s),
  `ALL PASS`.
