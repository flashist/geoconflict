# Worklog — 0221 P6: OS baseline hardening, restart-policy divergence, graceful shutdown

Build step of `/fkit-sprint-ship-loop` (lead session driver), 2026-09-13. Executed by a spawned
`fkit-coder` under the declared-approval marker (plan approved by the owner via `AskUserQuestion` in
the lead session; `plan.md` blob `5d5c057d…`, 18753 bytes — verified at start). **No commit, no
deploy, no wiki write, no task move.** Part A (A1–A7) built and gated locally; B0 run read-only;
B1–B6 are the owner's (hand-off below).

## Worst news first

- **The approved plan's sshd drop-in, as written, would NOT have disabled password auth for root
  on this box.** B0 found `/etc/ssh/sshd_config.d/99-qemu.conf` shipping a `Match User root` block
  (`PermitRootLogin yes`, `PasswordAuthentication yes`). Match-block values override the global
  section, so a globals-only `00-` drop-in leaves root-effective password auth ON while a plain
  `sshd -T` reads "no" — the plan's gate would have passed green on a box that was not hardened.
  Reproduced locally (Docker, `ubuntu:26.04` = the box's release, and `debian:12`): plan-as-written
  → root-effective `passwordauthentication yes / permitrootlogin yes`; with a `Match all` pin in the
  same drop-in → `no / prohibit-password`. **Built the pin + a `sshd -T -C user=root,…` gate.**
  Recorded as an obvious-winner call within the plan's intent (decision log, entry 1) — the driver
  should re-verify; it is inside the one file the plan already writes and changes nothing else.
- **The box is Ubuntu 26.04.1 LTS, not 22.04** (`0182`'s spec is stale). Plan was distro-neutral;
  the sections were probed on `ubuntu:26.04` and `debian:12` images.
- **`/var/run/reboot-required` is present on the box right now.** The first `checks.sh` run after
  B1 will FAIL on the new check and page — correct by the Q1 ruling, and B5's reboot clears it.
- **`unattended-upgrades` and `fail2ban` are already installed on the box** (Ubuntu defaults;
  `20auto-upgrades` already `1/1`, both apt timers enabled). The sections are idempotent over that:
  they add the security-only origin list, the jail policy, and the fail-closed gate.
- **A second read-only B0 pass was denied by the session's permission classifier** ("production
  reads"). Not worked around. The facts it would have read (live jail status, `python3-systemd`
  presence, the box's fail2ban filter) were instead checked on the `ubuntu:26.04` image carrying the
  same `fail2ban 1.1.0-9` the box reports — see B3 residual.

## Change surface

| File | Change |
|---|---|
| `src/profile-server/Shutdown.ts` | **new** — `createGracefulShutdown({server,pool,log,timeoutMs,exit})` → `{shutdown, install}`; drain → pool close → exit 0; 8 s deadline (< Docker's 10 s grace) → `closeAllConnections` + best-effort pool close → exit 1; second signal logged + ignored; pool closed once |
| `src/profile-server/Server.ts` | wires `.install(process)` after `listen` (4-line comment) |
| `Dockerfile.profile` | `CMD ["node", …]` exec form, same flags as `package.json` `start:profile-server` (deliberate duplication, documented; harness asserts equality). `package.json` untouched — JSON carries no comment, so the "both sides" note lives in the Dockerfile + the harness assertion |
| `setup-profile.sh` | header list item 3b; **three new sections after `ufw status verbose`, before Directories**: unattended security upgrades (`20auto-upgrades`, `52geoconflict-unattended-upgrades` with `#clear` + `-security` only, `Automatic-Reboot "false"`, timer check, `apt-config dump` + dry-run evidence), fail2ban (`jail.d/geoconflict-sshd.local`, `python3-systemd`, enable + restart after ufw, fail-closed `fail2ban-client status sshd` gate, banned-IP list redacted in the deploy log), sshd (authorized_keys key-prefix guard, `Include` guard, `00-geoconflict-hardening.conf` globals + `Match all` pin, `sshd -t` → rm on reject, reload, effective-config gate global + `-C user=root`, rm + reload + abort on gate failure). Compose heredoc: `restart: unless-stopped` ×2, `init: true` on profile-api. Banner line. **0220's uncommitted hunks (`persist_or_reuse_secret`, `report_config_values`) untouched** — verified by grep after the edit |
| `build-deploy-profile.sh` | `-o IdentitiesOnly=yes` on `SCP_CMD` + `SSH_CMD` in the key branch; comment on the password-fallback branch (dead against a provisioned box) |
| `example.env.profile` | fallback comment updated |
| `profile-checks.sh` (0219's, minimal per Q1) | `REBOOT_REQUIRED_FILE` (env-overridable) + check 8 `check_reboot_required` (FAIL-class, names only) |
| `tests/profile-checks.sh` | fixture path for the marker; counts 7→8 ok in C1/C9/C13/C18; **new C19** (marker present → `/fail` ping naming `reboot-required`; absent → OK) |
| `tests/scripts/profile-deploy-hardening.test.sh` | **new 0221 block before `ALL PASS`** (+44 assertions): compose restart/init, Dockerfile CMD exec-form + equality with `package.json`, both apt.conf.d heredocs (values), jail heredoc (every policy value, `${SSH_PORTS_CSV}` port), enable + fail-closed gate + `python3-systemd`, drop-in path/values/no `PermitRootLogin no`/no custom ciphers/`Match all` pin after globals, guard<test<reload<gate order, reload-never-restart, rm-on-`sshd -t`-failure, section placement, flock<install, IdentitiesOnly ×2, checks.sh wiring. `ALL PASS` marker unchanged → `ShellHarnesses.test.ts` unchanged |
| `tests/profile-server/Shutdown.test.ts` | **new suite**, raw `http` on port 0 (no supertest): drain + order + exit 0; ECONNREFUSED after shutdown; idle keep-alive closed; deadline → exit 1 with pool closed; second signal ignored; failing `pool.end` logged, exit 0; `install` wires SIGTERM+SIGINT, default deadline < 10 s |

Not touched: `package.json`, `migrations/` (credit-ledger PK `primary key (game_id, yandex_player_id)`
still there — G8 stays LOW), `setup-telemetry.sh` (5× `on-failure` — producer brief, below),
`ai-agents/wiki-vault/`, any task file location.

## Evidence — red then green, gates

| Gate | Before | After |
|---|---|---|
| `tests/profile-server/Shutdown.test.ts` | — | **7/7** (two first-draft assertion mistakes of mine fixed: a log substring that also matched the "draining (deadline …)" line; a cross-realm `toBeInstanceOf(Error)`) |
| Hardening harness, **negative control** (new harness vs a pre-change snapshot of every file it reads) | — | **40 ❌, all inside the new 0221 block; 164 ✅ everywhere else** (no prior section moved) |
| Hardening harness, repo | 160 ✅ / 0 ❌ `ALL PASS` | **204 ✅ / 0 ❌ `ALL PASS`** |
| `tests/profile-checks.sh`, **negative control** (new test vs old `profile-checks.sh`) | — | **9 ❌ / 64 ✅** (C19 + the four count assertions) |
| `tests/profile-checks.sh`, repo | 68 / 0 | **73 / 0** |
| `npm test` | 120 suites / 1253 tests (measured this session, before any edit) | **121 suites / 1260 tests, all passed** (+1 suite, +7 tests — the new Shutdown suite, deliberate; harness wrapper included, 34 s) |
| `npm run lint` | — | rc 0 |
| `npx tsc --noEmit -p tsconfig.json` | — | rc 0 |
| `npx prettier --check` (3 TS files) | — | clean |
| `bash -n` setup-profile.sh, build-deploy-profile.sh, profile-checks.sh, tests/profile-checks.sh, harness | — | all OK |

Docker probes (local, throwaway containers, images removed):

- **sshd precedence** — `ubuntu:26.04` (OpenSSH 10.2p1) and `debian:12` (9.2p1), the box's three
  drop-ins reproduced byte-for-byte. Baseline root-effective `permitrootlogin yes; passwordauthentication yes`.
  Plan-as-written drop-in (variant A): global `no`, **root-effective still `yes/yes`**. With the
  `Match all` pin (variant B): root-effective `no / prohibit-password` (`without-password` on 9.2 —
  the gate normalises the old spelling). `sshd -t` OK in both; globals after the Match block in the
  main `sshd_config` (`UsePAM`, `Subsystem`) unaffected — included files do not leak Match state.
- **fail2ban** — `ubuntu:26.04` ships `fail2ban 1.1.0-9` (the version B0 saw on the box): filter
  `_daemon = sshd(?:-session)?`, `journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd + _COMM=sshd-session`
  (OpenSSH ≥ 9.8's `sshd-session` process is matched), `python3-systemd` present, distro default
  `banaction = nftables`. `debian:12` ships 1.0.2 with `_daemon = sshd` only.
- **apt `#clear`** — both distros: `apt-config dump` shows `Allowed-Origins ""` then only
  `"${distro_id}:${distro_codename}-security"`; dry run on Ubuntu: `Allowed origins are: o=Ubuntu,a=resolute-security`.
  On Debian the dry run additionally lists the package's `Origins-Pattern` entries (`label=Debian`
  base pocket + `Debian-Security`) — `#clear Allowed-Origins` does not touch that list (residual).
- **SIGTERM on the real image — NOT verified here.** I tried to build `Dockerfile.profile` locally
  and `docker stop` it; the build failed at `npm ci` because `canvas` has no prebuilt binary for
  linux/**arm64** and `node:24-slim` has no Python for `node-gyp` — a host-architecture artifact of
  the probe (the deploy builds `--platform linux/amd64`, where the prebuild exists; the box has run
  this Dockerfile for 3 days). Pre-existing, unrelated to this change, not fixed. What stands
  instead: the plan step's `node:24-slim` probe (node as PID 1 / `--init` + node → handler ran,
  exit 0; `npm run` → never), the 7-case Shutdown suite, and the harness assertion that the CMD
  equals `package.json`'s `start:profile-server` byte for byte. **B6 is the live proof.**

## B0 — read-only box check (sanitized: no hostname, no IP)

Route to the box: `en0` (no VPN tunnel in the path). Key file present. One SSH pass, exit 0.

- `/etc/os-release`: **Ubuntu 26.04.1 LTS (resolute)**, kernel 7.0.0-28-generic.
- `sshd_config` line 24 `Include /etc/ssh/sshd_config.d/*.conf`; drop-ins: `50-cloud-init.conf`
  (`PasswordAuthentication yes`), `60-cloudimg-settings.conf` (`PasswordAuthentication no`),
  `99-qemu.conf` (`Match User root` → `PermitRootLogin yes`, `PasswordAuthentication yes`).
- `sshd -T` (global): `passwordauthentication yes`, `permitrootlogin prohibit-password`,
  `kbdinteractiveauthentication no`, `pubkeyauthentication yes`, `port 22`, `maxauthtries 6`,
  `logingracetime 120`, `x11forwarding yes`, `permitemptypasswords no`.
- `/root/.ssh/authorized_keys`: 1 line (the guard passes).
- Packages installed: `unattended-upgrades 2.12ubuntu9`, `fail2ban 1.1.0-9`, `openssh-server 1:10.2p1-2ubuntu3.6`,
  `ufw 0.36.2`, `rsyslog`. `20auto-upgrades` already `Update-Package-Lists "1"` / `Unattended-Upgrade "1"`;
  `apt-daily.timer` + `apt-daily-upgrade.timer` enabled. `52geoconflict-…` absent (expected).
- `/var/run/reboot-required`: **present**.
- `profile.service`: **inactive**, enabled (as the plan predicted — deploy starts the stack with
  `compose up -d`, the unit only runs after a boot). Docker 29.8.0, `live-restore=false`.
- `docker compose ps`: postgres + profile-api both `running (healthy)`, up 3 days; live restart policy
  `on-failure` on both, `init` unset.
- ufw active.
- Second pass (fail2ban live status, filter file, `python3-systemd`, `sshd -T -C user=root`) — **denied
  by the permission classifier; not run.**

## Decision log (ADR-019 / ADR-032 audit — what was done unattended)

Fixes applied without asking under a review's standing approval: **none** (no review has run yet;
this is the Build step). Obvious-winner calls inside the approved plan's intent, each one file the
plan already touches:

1. **sshd `Match all` pin + `-C user=root` gate + restore-on-gate-failure** (`setup-profile.sh`
   sshd section). Answers: the plan's own "sshd first-value-wins precedence" edge case, extended to
   Match-block precedence that B0 surfaced. Why it qualified: the plan's stated outcome (password
   auth off, root `prohibit-password`, gated on the effective config) is unreachable without it on
   this box — proven by the variant-A probe on the box's own release; the alternative (write the plan
   literally) ships a green gate over an unhardened box, which no reading of the plan intends. Same
   file, same drop-in, four repeated keywords + one Match line. The gate now also removes the drop-in
   and reloads when it fails (state exactly as before) — the plan removed it only on `sshd -t`.
2. **`python3-systemd` installed alongside fail2ban.** The plan's ruled `backend = systemd` needs it;
   without it the ruled gate would fail the deploy on a box where it is absent. One package name.
3. **`without-password` → `prohibit-password` normalisation in the gate.** OpenSSH ≤ 9.2 prints the
   old name; the plan is distro-neutral and a Debian 12 box would otherwise abort every deploy. One
   parameter expansion.
4. **`Include` guard** before writing the drop-in (abort if `sshd_config` does not include
   `sshd_config.d/*.conf`). Fail-closed on the exact condition that would make the drop-in inert.
5. **Banned-IP list redacted** in the deploy-log `fail2ban-client status sshd` output (brief rule 9:
   no IPs in artifacts — deploy logs get pasted into task files). One `sed`.
6. **`package.json` not annotated** (JSON has no comments); the "keep in sync" note is in the
   Dockerfile and the harness asserts CMD == `start:profile-server`, which is stronger than a comment.
7. **`profile-checks.sh` marker path env-overridable** (`PROFILE_CHECKS_REBOOT_REQUIRED_FILE`) — the
   0219 idiom every other input uses; needed for the off-box test.

Frontier moves, regressions, out-of-plan changes: **none**. Nothing outside the plan's file list was
edited.

## Residuals (recorded, not fixed)

- **apt lock contention**: `apt-daily-upgrade.timer` (enabled on the box) can hold the apt lock while
  a deploy's `apt-get update -y && apt-get upgrade -y` runs; that line is harness-anchored and was
  not changed. Such a deploy fails loud under `set -e` and is re-run.
- **First `checks.sh` run after B1 pages** on `reboot-required` (present now) until B5's reboot.
- **B3 unknowns not read from the box** (second B0 pass denied): live jail state, whether the box's
  fail2ban filter matches the image's (same package version `1.1.0-9`, so expected identical). If B3
  shows no ban, the first thing to check is `grep sshd-session /etc/fail2ban/filter.d/sshd.conf`.
- Debian only: `#clear Allowed-Origins` leaves the package's `Origins-Pattern` list (base + security
  pockets, no `-updates`) — effectively still security-only; the box is Ubuntu.
- `needrestart` (Ubuntu default) may restart services after an unattended upgrade — including
  `docker.service`: exactly the G7 case `unless-stopped` now covers; B5 tests it directly.
- `sshd -T -C addr=127.0.0.1` probes a loopback connection; a future `Match Address` block for another
  range would not be seen by the gate. The `Match all` block sits first, so it wins over any later Match.
- `LoginGraceTime`/`MaxAuthTries`/`X11Forwarding`/`PubkeyAuthentication` are global-only in the drop-in
  (`LoginGraceTime` is not permitted in a Match block); a later Match block could re-raise the others.
- Compose config diff recreates both containers on the next deploy (brief Postgres restart; volume
  persists).
- B5's outcome differs by unit state (inactive today): `unless-stopped` is correct in both; record both.
- Structural assertions are awk/grep-coupled to formatting (same accepted class as 0219/0220): a
  reformat reds them — false RED, never false green.
- The harness's CMD-equality assertion needs `node` on PATH (fails loud, never silently passes,
  if absent).

## Owner hand-off — Part B (NOT run here; each needs the owner's terminal)

- **B1 deploy** — `./build-deploy-profile.sh` from a second terminal **while a first SSH session stays
  open**. Deploy log carries: `Effective Unattended-Upgrade::Allowed-Origins` + the dry-run
  `Allowed origins are: o=Ubuntu,a=resolute-security` line; `fail2ban-client status sshd`; the four
  `✅ sshd: … (global + root-effective)` lines. Expect `⚠️ Reusing persisted …` lines from 0220 as usual.
- **B2 sshd, from a NEW session**: key login works;
  `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password root@<host>` →
  `Permission denied (publickey)`. Only then close the first session.
- **B3 fail2ban**: 5+ failed auths from a *throwaway* source (game VPS / phone hotspot — never the
  operator's only path) → `fail2ban-client status sshd` shows the ban and `/var/log/fail2ban.log` (or
  `journalctl -u fail2ban`) has the `Ban` line; unban after 1 h observed, or `fail2ban-client set sshd
  unbanip <ip>` after recording it — say which.
- **B4 unattended-upgrades**: `/var/log/unattended-upgrades/unattended-upgrades.log` after the first
  timer run, or the B1 dry-run line.
- **B5 daemon restart**: record `systemctl is-active profile` (inactive today); `systemctl restart docker`
  (live-restore off → brief stack stop; 0 rows, not wired); `docker compose ps` → both up. Then `reboot`
  → both up; `reboot-required` gone; next `checks.sh` run green on that check.
- **B6 SIGTERM**: `docker compose stop profile-api` with a `curl /ready` loop running → logs show
  `SIGTERM received — draining`, `http server closed — in-flight requests drained`, `pg pool closed`;
  `docker inspect --format '{{.State.ExitCode}}'` → **0** (today 1/143); stop < 10 s.

## Part C — non-root deploy user: split out (owner ruling Q8)

Reason recorded for the producer's brief: every operation in `setup-profile.sh` is privileged (apt,
ufw, systemd, `/etc`, `/opt/profile` 0700 root-owned, cron.d) → the whole script would run under
`sudo -n`; `/root/...` is hardcoded in `build-deploy-profile.sh` (`REMOTE_SCRIPT`,
`REMOTE_BACKUP_SCRIPT`, `REMOTE_CHECKS_SCRIPT`, `REMOTE_ENV`) and `setup-profile.sh`
(`PROFILE_BACKUP_SRC`, `PROFILE_CHECKS_SRC`); a `docker`-group user is root-equivalent; harness T1–T11
assume `root@`; the `0182` runbook is done and not editable in place. Realistic cost 1–2 days against
this task's 0.5–1 day. A half-migrated user is worse than none (brief). This task lands
`PermitRootLogin prohibit-password`; `no` waits for that brief, after the user is proven end to end.

## Note for the producer — telemetry restart policy

`setup-telemetry.sh` has the same `restart: on-failure` hole **five times** (lines ~461, 484, 500,
509, 527 at HEAD `6822210`): its containers do not come back after a Docker daemon restart, only
after a reboot. Out of 0221's scope (owner ruling Q4); needs its own brief — same fix
(`unless-stopped`), same harness idiom, same B5-style daemon-restart verification.

## Process-review step (2026-09-13) — `/fkit-sprint-ship-loop`, spawned `fkit-coder` under the declared-approval marker

Ledger: `review.md` round 1, seven findings (R1–R7), all verified **CORRECT**, all defects, all
**✅ done**; header `Status: closed-out`. Owner rulings relayed by the driver: **R1 FIX NOW**,
**R3 FIX (restore, not delete)**, **Q3 → page daily until rebooted, as built (no warn-only class)**.
No commit, no deploy, no wiki write, no task move. 0220's uncommitted hunks in `setup-profile.sh`
and the harness: untouched (same hunk shapes, offsets only — checked via `git diff` headers).

### Change surface this step

| File | Change |
|---|---|
| `src/profile-server/Shutdown.ts` | R2: deadline armed until `exit(0)`; `exit(1)` at the deadline no longer waits on `pool.end()`; distinct warn text when the pool (not the drain) is what hung |
| `tests/profile-server/Shutdown.test.ts` | R2: new case (never-settling `pool.end` → exit 1); case 4's `pg pool closed` assertion dropped (held only because the fake `exit` does not exit) — 8 cases |
| `setup-profile.sh` (0221 sections only) | R1 guard 0 (`PROFILE_DEPLOY_SSH_AUTH=password` → abort); R3 backup + `sshd_rollback()` (restore-else-remove) on every failure path, backup discarded after the gate; R4 `sshd_reload()` with stderr shown on failure, rollback before abort; R5 fail2ban enable/restart non-fatal, gate decides; R6 dry run captured to a file, no `head`; guard 1's comment claims only what it checks |
| `build-deploy-profile.sh` | R1: `DEPLOY_SSH_AUTH=key|password` set in the branch taken; staged as `export PROFILE_DEPLOY_SSH_AUTH`; password-branch comment states the fallback now cannot complete a provision |
| `example.env.profile` | R1: fallback comment — dead, aborts at the sshd section, bootstrap via `ssh-copy-id` |
| `tests/scripts/profile-deploy-hardening.test.sh` (0221 block only) | R7a tight fail2ban gate; R5/R6/R3/R4/R7b assertions; order awk moved to call sites; **T12** (R1) drives the real deploy in both auth modes and RUNS guard 0. `ALL PASS` marker unchanged |

### Evidence

| Gate | Result |
|---|---|
| `bash -n` on `setup-profile.sh`, `build-deploy-profile.sh`, the harness | OK |
| Hardening harness, repo | **221 ✅ / 0 ❌ `ALL PASS`** (was 204) |
| Hardening harness, **negative control** (new harness vs pre-fix snapshots of the five files it reads, other inputs symlinked) | **15 ❌ — all in the new/changed 0221 assertions; 206 ✅ elsewhere** |
| `tests/profile-checks.sh` | 73 / 0 |
| `npx jest tests/profile-server/Shutdown` ×3 | **8/8** each (~0.4 s) |
| R2 **negative control** (new test vs the pre-fix `clearTimeout`-on-close shape, scratch copy) | the new case **hangs to jest's 5 s timeout**; 7/8 |
| `npm test`, first run | rc 1 — one jest worker `signal=SIGSEGV` (`tests/client/ClientGameRunnerTeardown.test.ts`, untouched); crash report `node-2026-09-13-211814.ips` stack starts at `ClearStaleLeftTrimmedPointerVisitor` ⇒ **`0197`**, not this change. **Re-ran.** |
| `npm test`, re-run | **121 suites / 1261 tests, all passed** (+1 test, the R2 case), 40 s |
| `npm run lint` · `npx tsc --noEmit` · `prettier --check` (2 TS files) | rc 0 · rc 0 · clean |
| `npm run check:config-parity` | report-only, nothing new for `PROFILE_DEPLOY_SSH_AUTH` |

### Decision log — process-review step (ADR-019 / ADR-032 audit)

Fixes applied **without asking**, under the loop's standing approval (each verified CORRECT against
the code, mechanical/localized, inside the approved plan's file list):

1. **R2** — `Shutdown.ts` deadline covers the pool close. Why it qualified: the plan promised "SIGKILL never races the drain"; the code kept the promise for the HTTP drain only. One file the plan writes; behaviour change is strictly "exit 1 at the deadline instead of hang to SIGKILL".
2. **R4** — reload failure rolls back and shows stderr. Same section, same rollback helper R3 introduces.
3. **R5** — fail2ban enable/restart non-fatal so the gate's diagnostic is reachable. Two `|| echo` suffixes; outcome (fail-closed abort) unchanged.
4. **R6** — dry run captured to a file. One reporting step; no gate touched.
5. **R7** — harness tightened (gate scope, rollback assertions). Test-only.

Owner-ruled fixes (relayed by the driver, not unattended decisions): **R1** (guard 0 + staged auth
mode + T12) and **R3** (restore-not-delete rollback).

Obvious-winner calls within the rulings' intent: (a) **R1 — unset `PROFILE_DEPLOY_SSH_AUTH` is
treated as "not the password fallback"** (only `password` refuses): the deploy always stages it, and
refusing on unset would break a hand-run of `setup-profile.sh` from a key session for no safety
gain; recorded here so it is findable. (b) **R2 — no wait on the pool at the deadline** (the ruling
said "a hung pool must hit the deadline path, not SIGKILL"; any further wait re-opens the gap
inside the 10 s grace). (c) **R3 — backup path `/etc/ssh/geoconflict-hardening.conf.previous`**,
outside `sshd_config.d/` (a `.conf` inside it would be Included as live config).

Frontier moves, regressions, out-of-plan changes: **none.** Nothing outside the plan's file list was
edited.

### Owner rulings recorded

- **Q3 — reboot-required check pages daily until rebooted, as built.** No warn-only class. Added to
  `review.md` *Accepted residuals*; no code change.

### New residuals (this step)

- **The password fallback cannot complete a first provision any more** — a direct consequence of the
  R1 ruling (abort at the sshd section). Bootstrap a fresh password-only box with `ssh-copy-id`
  first. Documented in `build-deploy-profile.sh` and `example.env.profile`; in `review.md` residuals.
- `unattended-upgrades --dry-run` still downloads pending packages (inherent to the evidence line);
  deploy time on a box with pending updates. Not fixed — the evidence was ruled worth having.
- Hand-run of `setup-profile.sh` on the box (no staged `PROFILE_DEPLOY_SSH_AUTH`) is not refused by
  guard 0; guard 1 still applies.
