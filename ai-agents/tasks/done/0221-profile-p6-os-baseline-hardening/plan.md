# Plan — 0221 P6: OS baseline hardening, restart-policy divergence, graceful shutdown

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q5 — SIGTERM shape:** **yes, including the `Dockerfile.profile` exec-form `node` CMD change and compose
>   `init: true`** (the probe proved `npm run` swallows the signal). Handler drains in-flight + closes the pool,
>   8 s deadline.
> - **Q8 — non-root deploy user:** **split into its own brief** (Part C; the producer files it at close). Land
>   `PermitRootLogin prohibit-password` now; `no` waits for that brief.
> - **Q1 — unattended-upgrades auto-reboot:** **off, plus one line in `checks.sh` (0219's script) warning when
>   `/var/run/reboot-required` exists.** 0219 is `🚧 Blocked` on the owner's live tail — the same deploy carries
>   both; edit `profile-checks.sh` minimally and extend `tests/profile-checks.sh` with one case.
> - **Q2 / Q3 / Q4 / Q6 / Q7 / Q9 — not separately ruled; take the plan's recommendations:** the sshd list as
>   recommended (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitEmptyPasswords no`,
>   `PermitRootLogin prohibit-password`, `MaxAuthTries 6`, `X11Forwarding no`, `LoginGraceTime 30`; ciphers/KEX
>   at distro defaults); fail2ban `maxretry 5 / findtime 10m / bantime 1h` incremental to 1d, `backend systemd`,
>   `ignoreip` loopback only; restart value `unless-stopped`, telemetry's 5× `on-failure` → separate brief
>   (producer at close); fail the deploy if the fail2ban jail is not up; `-o IdentitiesOnly=yes` on the deploy's
>   key branch; distro-neutral plan, B0 confirms the OS.
> - **Working tree / HEAD:** `6822210` carries 0219/0220/0241/0232/0231/0253; a small uncommitted 0220
>   process-review diff sits in `setup-profile.sh` + the hardening harness. **Do not disturb any of it** — insert
>   only in regions those tasks did not touch (after the ufw section; harness tail).
> - **Build scope for the Build spawn:** Part A in full (A1–A7) plus the **read-only** B0 SSH check. **No deploy**
>   — B1–B6 are the owner's; list them as the hand-off in the worklog.

## plan

### Summary — worst news first

- **G8 as briefed cannot work without a `Dockerfile.profile` change.** Probed in a throwaway `node:24-slim` container (scratchpad only, removed): with the image's current `CMD ["npm","run","start:profile-server"]`, `docker stop` never delivers SIGTERM to node — the handler never ran, with or without `--init` (container exit 1 / 143, stop in ~1 s). With `node` as PID 1 (or `--init` + `node`), the handler ran, drained, exit 0. So the SIGTERM fix is *handler + exec-form `node` CMD (+ `init: true`)*, not the handler alone.
- **Non-root deploy user (item 4): recommend SPLIT OUT.** Every op in `setup-profile.sh` is privileged; `/root/...` is hardcoded in 5 places across both scripts; harness T1–T11 assume `root@`. The realistic cost (1–2 days) exceeds the whole task's 0.5–1 day estimate, and a `sudo`+`docker`-group user is root-equivalent anyway. Land `PermitRootLogin prohibit-password` now; `no` needs the user first.
- **OS evidence disagrees with the spawn prompt.** `0182` spec: Ubuntu 22.04; `0219` B1: "Ubuntu's global `create`"; the "Debian" in `0219` refers to the *certbot package*, not the OS. Plan is written distro-neutral; confirm with `/etc/os-release` in B0.
- Auto-reboot: recommend **off** (single box = unattended outage), with a `reboot-required` warning surfaced by `checks.sh`.
- Restart policy: `unless-stopped` on both services, harness-asserted. Same `on-failure` hole exists 5× in `setup-telemetry.sh` — out of scope, needs its own brief.
- `fail2ban` can ban the *operator* (multi-key agents: `0215` noted `~/.ssh/openfront_vps` is not the key) — mitigated by `-o IdentitiesOnly=yes` on the deploy's ssh/scp when a key is given (2-line, harness-safe) + `ignoreip` loopback.
- sshd lock-out guards: `00-` drop-in name (sshd: *first* value wins, cloud-init ships `50-cloud-init.conf` — the likely source of the `PasswordAuthentication yes` `0215` found), `sshd -t` before reload, `sshd -T` effective-value gate, refuse to disable passwords if `/root/.ssh/authorized_keys` is empty (the operator may be on the password fallback).
- Credit-ledger PK untouched: `migrations/001_player_profiles.sql` `primary key (game_id, yandex_player_id)` — G8 stays LOW.
- Uncommitted `0220` hunks (`setup-profile.sh` ~405–549, harness ~455–668) are not touched; my insertions land after the ufw section and at the harness tail — no textual overlap.
- Brief's `setup-profile.sh:405`/`:427` citations are stale; the two `restart: on-failure` lines are inside the `docker-compose.yml` heredoc (working tree ~572/~602) — cite by content.

---

### Part A — buildable + testable locally

**A1. Restart policy — `setup-profile.sh`, compose heredoc.**
- Both `restart: on-failure` → `restart: unless-stopped` (postgres + profile-api).
- Add `init: true` to `profile-api` (see A2; verified variant D).
- Systemd nuance to record, not change: `profile.service` is `ExecStart=docker compose up` (foreground) + `Restart=always`. When dockerd restarts, that attached `compose up` dies and systemd re-runs it after 15 s — so recovery today *partly* depends on whether the unit is active (deploy starts the stack with `compose up -d`, unit is only `enable`d → inactive until next boot). `unless-stopped` is correct in **both** unit states; that is the argument for it. `ExecStop=docker compose down` removes containers, so no fight with `unless-stopped`.
- Compose recreates both containers on the next deploy (config diff) — brief Postgres restart, volume persists.

**A2. Graceful shutdown.**
- New `src/profile-server/Shutdown.ts`: `createGracefulShutdown({ server, pool, log, timeoutMs, exit })` → `{ shutdown(signal), install(proc) }`. On first signal: log; `server.close(cb)` (Node 24 closes idle keep-alive connections itself; in-flight requests finish); after close → `await pool.end()` → log → `exit(0)`. Deadline timer (`unref`): on expiry log warn, `server.closeAllConnections()`, best-effort `pool.end()`, `exit(1)`. Second signal during drain → logged, ignored. `install` registers SIGTERM + SIGINT (local dev).
- `Server.ts`: call `.install(process)` after `listen`. `Db.ts` unchanged.
- **`Dockerfile.profile`**: `CMD ["node","--loader","ts-node/esm","--experimental-specifier-resolution=node","src/profile-server/Server.ts"]` — same flags as `package.json`'s `start:profile-server`; comment both sides "keep in sync" (deliberate duplication; `npm run` swallows the signal — probe result above). `scripts/check-docker-secret-boundary.sh` asserts nothing on `CMD` — checked.
- Deadline **8 s** — under Docker's default `stop_grace_period` 10 s, so SIGKILL never races the drain; no compose grace change needed.
- Test `tests/profile-server/Shutdown.test.ts` (new suite): real `http.createServer` on port 0, handler parked on a deferred; fake pool `{ end: jest.fn() }`, fake logger, fake `exit`. Cases: (1) in-flight request completes 200 after `shutdown("SIGTERM")`, `pool.end` called **after** server `close`, `exit(0)`; (2) new connection after shutdown → ECONNREFUSED; (3) request never completes → after `timeoutMs` (~200 ms) `exit(1)`, `pool.end` still called; (4) second signal ignored — `pool.end` once; (5) `install` on a fake `EventEmitter` wires SIGTERM + SIGINT. Raw `http.get`, no supertest (known flake family). Counts become 114 suites / ~1190 tests — deliberate.

**A3. `unattended-upgrades` — new section in `setup-profile.sh`, after ufw, before Directories** (after flock/apt anchor, so the harness's `flock < apt-get upgrade` awk stays green).
- `apt-get install -y unattended-upgrades`.
- Write `/etc/apt/apt.conf.d/20auto-upgrades` (`Update-Package-Lists "1"; Unattended-Upgrade "1";`).
- Write drop-in `/etc/apt/apt.conf.d/52geoconflict-unattended-upgrades` (>50 overrides the package file): `#clear Allowed-Origins;` + `"${distro_id}:${distro_codename}-security";` (works on Ubuntu *and* Debian — both name the suite `<codename>-security`); `Automatic-Reboot "false"` (Q1); `Remove-Unused-Kernel-Packages "true"`, `Remove-Unused-Dependencies "true"` (disk hygiene).
- In-script: `systemctl is-enabled apt-daily-upgrade.timer` (warn if not) + `unattended-upgrades --dry-run --debug 2>&1 | grep -i 'allowed origins'` printed into the deploy log — that is verification step 1's evidence, produced by the deploy itself.
- Docker is not auto-upgraded (Docker's repo has no `-security` suite) — good: a dockerd restart is the exact G7 scenario.
- Residual: apt lock contention if `apt-daily-upgrade` runs during a deploy's `apt-get upgrade`. Not mitigable without editing the harness-anchored `apt-get update -y && apt-get upgrade -y` line — recorded, not fixed.
- **Q1 ruling addendum:** `profile-checks.sh` gains one check — `[ -e /var/run/reboot-required ]` → a FAIL-class line "reboot required (unattended-upgrades)" (names only), so the dead-man's-switch body carries it; `tests/profile-checks.sh` gains one case for it.

**A4. `fail2ban` — new section.**
- `apt-get install -y fail2ban`; write `/etc/fail2ban/jail.d/geoconflict-sshd.local` (never edit `jail.conf`): `[DEFAULT] backend = systemd` (Debian 12 has no `auth.log`; harmless on Ubuntu), `ignoreip = 127.0.0.1/8 ::1`; `[sshd] enabled = true`, `port = <every port from sshd -T>` (reuse the ufw section's detection), `maxretry = 5`, `findtime = 10m`, `bantime = 1h`, `bantime.increment = true`, `bantime.maxtime = 1d` (Q3 — recorded policy). Default `banaction` (iptables-multiport; independent of `ufw --force reset`).
- `systemctl enable --now fail2ban && systemctl restart fail2ban` (after ufw, so bans re-apply from its DB), then `fail2ban-client status sshd` — **fail the deploy** if the jail is not up (fail-closed like ufw; Q6).
- `build-deploy-profile.sh`: add `-o IdentitiesOnly=yes` to `SSH_CMD`/`SCP_CMD` in the key branch (self-ban guard; harness stubs only log argv — T1–T11 unaffected).

**A5. sshd hardening — new section.**
- Guard first: `/root/.ssh/authorized_keys` missing/empty → **exit 1** with a clear message (never disable passwords for a box that has no key path).
- Write `/etc/ssh/sshd_config.d/00-geoconflict-hardening.conf` (Ubuntu 22.04 / Debian 12 both `Include sshd_config.d/*.conf`; `00-` wins over cloud-init's `50-`): `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitEmptyPasswords no`, `PubkeyAuthentication yes`, `PermitRootLogin prohibit-password`, `MaxAuthTries 6` (multi-key agents), `X11Forwarding no`, `LoginGraceTime 30`. Ciphers/KEX left at distro defaults (a custom list is a lock-out vector; Q2).
- `sshd -t` → on failure `rm` the drop-in and `exit 1` (never leave a config that blocks the next sshd start). Then `systemctl reload ssh 2>/dev/null || systemctl reload sshd` (reload: the deploy's own session survives), then gate on **effective** config: `sshd -T | grep -qx 'passwordauthentication no'` and `permitrootlogin prohibit-password` else exit 1.
- Consequence to document (comment in `build-deploy-profile.sh` password-fallback block + `example.env.profile`): `ALLOW_PROFILE_SSH_PASSWORD_FALLBACK` is dead against this box by design after this lands.
- Banner: add one hardening line (unattended-upgrades mode, fail2ban jail, sshd password auth off).

**A6. Harness — `tests/scripts/profile-deploy-hardening.test.sh`, new section before the `ALL PASS` line**, in the 0219 idiom (awk-scoped heredoc extraction, values not presence, false-RED-never-false-green):
- compose: `restart: unless-stopped` count == `n_services`; zero `restart: on-failure`; `init: true` under profile-api.
- unattended: both apt.conf.d writes present; `Automatic-Reboot "false"` (or the ruled value); `Unattended-Upgrade "1"`; the `-security` origin line.
- fail2ban: jail.d heredoc has `[sshd]`, `enabled = true`, `backend = systemd`, `maxretry`, `bantime`; `enable --now fail2ban`; `fail2ban-client status sshd` gate present.
- sshd: drop-in path under `sshd_config.d/00-`; `PasswordAuthentication no`, `PermitRootLogin prohibit-password`; awk order `authorized_keys guard < sshd -t < systemctl reload < sshd -T gate`; section sits after `ufw --force enable` and before `print_header "CONFIGURING SYSTEMD AUTO-START"`.
- build-deploy: `IdentitiesOnly=yes` in the key branch. `Dockerfile.profile`: `^CMD \["node"` (harness has no Dockerfile assertions today — a one-liner grep).
- Negative control: run the new block against HEAD's script first (RED), then green. Marker `ALL PASS` unchanged → `ShellHarnesses.test.ts` unchanged.

**A7. Task folder** (`worklog.md`, brief status/notes). No wiki writes; no task moves.

**Sequence:** A2 (code+test) → A1 → A3–A5 → A6 (RED then green) → `bash tests/scripts/profile-deploy-hardening.test.sh`, `npm test`, `npm run lint` → stateful review → Part B.

### Part B — live box / owner

- **B0 (read-only, I run):** `/etc/os-release`; `ls /etc/ssh/sshd_config.d/`; `sshd -T | grep -Ei 'passwordauthentication|permitrootlogin'`; `wc -l /root/.ssh/authorized_keys`; `systemctl is-active profile`; `docker compose ps`.
- **B1 deploy (owner runs `build-deploy-profile.sh`)** from a second terminal while a first SSH session stays open. Deploy log carries the dry-run "Allowed origins" and the `fail2ban-client status sshd` output.
- **B2 sshd, from a NEW session:** key login works; `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password root@host` → `Permission denied (publickey)`. Only then close the first session.
- **B3 fail2ban:** deliberate failed-auth burst from a *throwaway* source (game VPS or phone hotspot — never the operator's only path) → `fail2ban-client status sshd` shows the ban + `Ban` line in `/var/log/fail2ban.log`; unban line observed after 1 h (or `set sshd unbanip` after recording it — say which).
- **B4 unattended-upgrades:** `/var/log/unattended-upgrades/unattended-upgrades.log` after the first timer run, or the dry-run from B1.
- **B5 daemon restart:** record `systemctl is-active profile` first; `systemctl restart docker` (live-restore is off → brief stop of the stack; 0 rows, not wired — harmless now); `docker compose ps` → both up. Then `reboot` → both up. Record both unit states' outcomes.
- **B6 SIGTERM:** `docker compose stop profile-api` with a `curl /ready` loop running → logs show received/drained/pool-closed, `docker inspect` exit code **0** (today: 1/143), stop time < 10 s.
- **B7:** `npm test` + harness locally (Part A).

### Part C — non-root deploy user: split out (recommend) → **Owner ruled: split out; producer files the brief at close.**

Touch list that makes it its own brief: `build-deploy-profile.sh` `REMOTE_USER` default + `REMOTE_SCRIPT`/`REMOTE_BACKUP_SCRIPT`/`REMOTE_CHECKS_SCRIPT`/`REMOTE_ENV` all `/root/...`; `setup-profile.sh` `PROFILE_BACKUP_SRC`/`PROFILE_CHECKS_SRC` defaults `/root/...` + every op is privileged (apt, ufw, systemd, `/etc`, `/opt/profile` 0700 root-owned, cron.d) → the script would run under `sudo -n` end to end; docker group = root-equivalent; harness fixtures T1–T11 assume `root@`; `0182` runbook (done, not editable in place); `PermitRootLogin no` only after the user is proven end to end. A half-migrated user is worse than none (brief). Producer files the brief; this task records the split reason in the worklog and lands `prohibit-password`.

### Edge cases / failure modes accounted for

sshd first-value-wins precedence · broken drop-in blocking next sshd start · password-fallback operator locked out · self-ban via multi-key agent · Debian-without-rsyslog fail2ban backend · security-pocket naming across distros · apt lock contention (residual) · SIGKILL racing the drain (8 s < 10 s) · second SIGTERM · `npm run` swallowing the signal (probed) · unit active/inactive changing B5's result · compose recreate on the deploy · harness extraction coupled to formatting (accepted class) · supertest flake avoided by raw `http`.

## openQuestions (returned by the coder; answered by the owner — see the approval record at the top)

1. **Q1 auto-reboot** — (a) off, nothing surfaces `reboot-required` (residual); (b) **off + one `checks.sh` line warning when `/var/run/reboot-required` exists (Rec — small, but touches `0219`'s in-progress script)**; (c) on at a fixed UTC hour = accepted unattended outage. → **Owner ruled (b).**
2. **Q2 sshd list** — Rec: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitEmptyPasswords no`, `PermitRootLogin prohibit-password` (not `no` — root is the deploy user), `MaxAuthTries 6`, `X11Forwarding no`, `LoginGraceTime 30`; ciphers/KEX at distro defaults. Drop `MaxAuthTries`/`LoginGraceTime` if you want the minimal set. → **Recommendation stands.**
3. **Q3 fail2ban policy** — Rec: `maxretry 5 / findtime 10m / bantime 1h`, incremental to 1d, `backend systemd`, default `banaction`, `ignoreip` loopback only (no operator-IP env var — avoids a new staged variable + harness allow-list change). → **Recommendation stands.**
4. **Q4 restart value** — Rec `unless-stopped`. Telemetry's 5× `on-failure`: file a separate brief (Rec) or fold in? → **Recommendation stands; producer files the telemetry brief at close.**
5. **Q5 SIGTERM shape** — Rec: drain in-flight + close pool, 8 s deadline, **plus** `Dockerfile.profile` exec-form `node` CMD and compose `init: true` — the CMD change is required (probe) and alters image behaviour, so it needs your ack. → **Owner ruled: yes, including the CMD change.**
6. **Q6** — fail the deploy if the fail2ban jail is not up after install? Rec yes (fail-closed, like ufw). → **Recommendation stands.**
7. **Q7** — add `-o IdentitiesOnly=yes` to the deploy's ssh/scp key branch? Rec yes. → **Recommendation stands.**
8. **Q8 non-root deploy user** — Rec split into its own brief (Part C); alternative: keep in and accept 1–2 days over estimate. → **Owner ruled: split out.**
9. **Q9** — the spawn prompt says Debian; evidence says Ubuntu 22.04. Plan is distro-neutral; confirm in B0 — any reason to believe the box was re-imaged? → **Not ruled; B0 confirms; plan stays distro-neutral.**
