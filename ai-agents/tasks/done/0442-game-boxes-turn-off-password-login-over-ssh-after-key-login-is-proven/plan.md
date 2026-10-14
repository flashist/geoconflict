# Plan — 0442: turn off SSH password login on game prod, game dev and telemetry

This is a plan only. Nothing was written: no source files, no plan.md, no change to any status.

## Summary (most important first)
- 🚨 **Blocker found: as the code stands, the sshd section would never reach the game boxes.** `deploy.sh`'s `run_game_host_setup` (`deploy.sh:162-171`) returns SKIPPED **before any root login** when `PROFILE_SSH_ALERT_TOKEN` or `PROFILE_API_URL` is blank. The token is blank today: all three 0445 proof deploys ended `GAME HOST SETUP SKIPPED: PROFILE_SSH_ALERT_TOKEN is empty`. Setting the token is 0449's job, and 0449 is still in the backlog. **Owner question Q1** chooses between a small `deploy.sh` change (recommended) and doing 0449 step 1 first.
- Where the hardening goes, as ruled 2026-10-12:
  - game boxes: a new section in `setup-game-host.sh`, which 0443 has landed, so this task writes it directly and 0446 no longer needs to move it;
  - telemetry: a new section in `setup-telemetry.sh`.
  - Both copy 0221's guards and its restore-not-delete rollback.
- `50-cloud-init.conf` is handled in three ways:
  - by design: the drop-in is named `00-…`, and sshd keeps the first value it reads;
  - by the effective-config gate (`sshd -T`, global and `-C user=root`). If the setting is not in effect, the change is rolled back.
  - by a read-only check that reads the file first, as pre-check P4.
- Order of the live steps: game dev → telemetry → game prod. Every live step is run by the owner, with a second session kept open and the reg.ru web console already proven to work. Game prod needs a game deploy, which restarts the game container, so its timing is **Q2**.
- The password values and fallback flags in the env files are removed only after all three boxes pass **and** the owner has saved the root passwords in the password manager. Those passwords stay the web-console login. See **Q3**.

## Grounding (read this session)
- Brief 0442: 7 build items, 7 verification steps, and the struck Q1 ruling: every-deploy root step `setup-game-host.sh` for the game boxes, `setup-telemetry.sh` for telemetry.
- 0445 worklog:
  - key-only login proven on all three boxes;
  - deploy user = `root` on both game boxes;
  - on all three: Ubuntu 24.04, `passwordauthentication yes`, `permitrootlogin yes`, `maxauthtries 6`, no `Match` lines, `sshd_config.d/` holds only `50-cloud-init.conf` (not read);
  - root `authorized_keys` modes are fine;
  - fail2ban is up on all three.
- The model to copy: `setup-profile.sh:511-651` (HARDENING SSHD), with these parts:
  - guard 0, auth mode: refuse on a deploy that came in by password;
  - guard 1: a key line must be in `/root/.ssh/authorized_keys`;
  - an `Include sshd_config.d/*.conf` check;
  - back up the existing drop-in to a path outside `sshd_config.d/`;
  - write `00-geoconflict-hardening.conf`, with a `Match all` pin;
  - `sshd -t`, then reload (never restart), then the effective-config gate for global and root;
  - rollback = restore the backup, or remove the drop-in if there was none.
- `setup-game-host.sh`:
  - Sections report OK, SKIPPED or FAILED and are independent of each other. A SKIPPED alerts section does **not** stop a later section.
  - Exit codes: 0 = OK, 1 = FAILED, 3 = SKIPPED.
  - The contract: idempotent; "never restarts a service unless its config changed"; "MUST NEVER LOCK OUT SSH"; test seam `GAME_HOST_SETUP_ROOT`; Bash 3.2 compatible.
  - There is a placeholder for this section: `# (0442: sshd hardening — copy 0221's guarded section)`.
- `deploy.sh`:
  - The root step runs only on the key path, with `BatchMode=yes`, `IdentitiesOnly`, and password and keyboard-interactive auth off. It runs after the game update has succeeded with the same key. So the deploy user's and root's key logins are already proven when the section runs: guard 0 holds by construction.
  - Banner texts are at `:536-549`.
  - The fallback messages are at `:435-446`.
- `build-deploy-telemetry.sh`:
  - The fallback is at `:325-346`.
  - It stages its env in a single-quoted heredoc (`:507-530`) and does not yet stage the auth mode.
  - `TELEMETRY_SHIPPED_PATHS` refuses to deploy files with uncommitted changes, so this task's changes must be committed before the telemetry live step.
  - It ships `ssh-alerts.sh` by scp (`:472`).
- `scripts/telemetry-tunnel.sh`: has the same password fallback (`:71-90`).
- Harnesses:
  - `tests/ssh-alerts.sh` drives the real `setup-game-host.sh` into a fake root with stub binaries (G1–G5).
  - `tests/scripts/profile-deploy-hardening.test.sh` asserts the profile sshd structure (`:1726-1850`), the T67 tar listing (exactly 3 files), the telemetry shipped paths ("exactly four", `:2921`, `:3127`), T68 and T69 (blank token: no root call), and the banner greps.
- `docs/vps-deployment-guide.md` §7 and §8: "Password login is still on, so ssh-copy-id…" and "Fall back to the password (emergency only, until password login is turned off)" both become wrong after this task.
- `ssh-alerts.sh` daily count: "failed" = `^Failed ` lines and "invalid" = `^Invalid user ` lines (`:476-477`).

## Design decisions in this plan (the owner can change any of them)
1. **One shared helper, `sshd-hardening.sh`** (pending **Q4**). It defines one function, `harden_sshd`. It returns 0 when the hardening is in effect, and 1 after it has rolled back (or never touched anything), printing the reason. It is shipped next to the setup scripts, the same way 0443 ships `ssh-alerts.sh`, and used by both `setup-game-host.sh` and `setup-telemetry.sh`.
   - **`setup-profile.sh` is left untouched**: it is proven live and owner-verified, and its harness greps are tied to its inline text.
   - The alternative is to paste the block inline into both scripts, which means three copies that can drift apart.
2. **The drop-in content is copied from 0221 exactly**: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitEmptyPasswords no`, `PubkeyAuthentication yes`, `PermitRootLogin prohibit-password`, `MaxAuthTries 6`, `X11Forwarding no`, `LoginGraceTime 30`, plus the `Match all` pin of the four auth keywords.
   - `MaxAuthTries 6` equals the value already on all three boxes, so it stays as is, as the brief asks.
   - `X11Forwarding no` and `LoginGraceTime 30` are kept so that all boxes share one known-good file.
   - No custom cipher list (a lock-out risk). Root stays `prohibit-password`, per 0441 Q2; it is not set to `no`, because root is the deploy user.
   - Only the header line changes. It names `sshd-hardening.sh` / 0442, and is the same text on every run so the unchanged-file check below works.
3. **Idempotence, per `setup-game-host.sh`'s contract.** The new content is written to a temporary file and compared with the existing drop-in.
   - **Unchanged:** no write and no reload. The effective-config gate still runs, read-only. If the gate fails while the file is unchanged, report FAILED and leave the file in place, because removing it would re-open password login. The outcome matches 0221's "restore the previous file", since the previous file is the same.
   - **Changed:** the full 0221 sequence (back up → write → `sshd -t` → reload → gate → roll back on any failure).
4. **Guards, in order:**
   - guard 0, auth mode: telemetry only (see 7). On the game boxes the root step cannot run over a password (`deploy.sh` skips it before any login), so this guard is documented there as holding by construction, and the existing T68 assertion covers it.
   - guard 1: `$ROOT/root/.ssh/authorized_keys` holds a line starting `ssh-`, `ecdsa-` or `sk-`.
   - `sshd_config` Includes `sshd_config.d/*.conf`.
   - `sshd -t`.
   - reload: `systemctl reload ssh || systemctl reload sshd`, never restart, with stderr shown.
   - gate: `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` for the four keywords, mapping `without-password` to `prohibit-password`.
5. **Paths go through the `$ROOT` test seam:**
   - `$ROOT/etc/ssh/sshd_config.d/00-geoconflict-hardening.conf`
   - backup `$ROOT/etc/ssh/geoconflict-hardening.conf.previous`, outside `sshd_config.d/` so it is never read as config
   - `$ROOT/etc/ssh/sshd_config`
   - `$ROOT/root/.ssh/authorized_keys`

   On the box `$ROOT` is empty. In tests `sshd` and `systemctl` are stubs. The helper is Bash 3.2 compatible, and every step checks its own result explicitly, because `set -e` is off inside an `if` condition in `setup-telemetry.sh`.
6. **Game: a new `print_header "SSHD HARDENING (0442)"` section** in `setup-game-host.sh`, after the alerts section, replacing the placeholder comment. It reports `report sshd OK "password login off, root key-only"` or `report sshd FAILED "<reason>"`. A failure there means the game is live, the host setup is not done, and the deploy exits 3, all through the existing code. It runs only when the preconditions pass.
7. **Telemetry: a new section in `setup-telemetry.sh`.**
   - Placement: after the backup cron jobs and just before the version marker. The containers are already up when it runs, so a failure never takes telemetry down.
   - It stops the deploy on failure (exit 1, matching 0221's profile behaviour). The version marker is then not written, and `build-deploy-telemetry.sh` pushes no tag, so the failure is loud.
   - Guard 0: `build-deploy-telemetry.sh` stages `export TELEMETRY_DEPLOY_SSH_AUTH='key'` or `'password'` (set in its two auth branches). `setup-telemetry.sh` refuses to harden when the value is `password`. Unset (a hand run) is allowed through, as in profile.
   - `build-deploy-telemetry.sh` must also scp `sshd-hardening.sh`, check that it exists, and add it to `TELEMETRY_SHIPPED_PATHS`.
8. **`deploy.sh` changes:**
   - Add `sshd-hardening.sh` to the staged tar and to the missing-file check.
   - Banner text: the OK line becomes "root step: SSH security alerts + sshd hardening up to date". The not-OK line names both.
   - The fallback branch prints an extra line: game boxes refuse password login since 0442; recovery is the provider console (runbook §7). The existing strings that harness T-tests grep ("disabled by default", "Using deprecated password-based SSH fallback") are kept.
   - **Q1 (recommended A):** move the blank token / blank URL checks out of `run_game_host_setup`. `setup-game-host.sh` already reports both as SKIPPED. The root step then runs on every key deploy, the sshd section applies, and the deploy still exits 3 until 0449 sets the token. The owner's Q-A1 rule, "any skip fails the deploy", is unchanged, and so is Q-A2, "no switch". This reverses only the 0443 *plan* detail "no root call on blank token" (harness T69), which was a coder design choice, not an owner ruling.
9. **Same fallback note** in `build-deploy-telemetry.sh` and `scripts/telemetry-tunnel.sh`. The tunnel is not named in the brief, but it has the same fallback that is now dead, so it is within the brief's intent. The fallback **code** stays, as profile's did.

## Steps — repo work (coder, after approval)
1. Write `sshd-hardening.sh` (decisions 1–5), with a header explaining the contract and the seam.
2. `setup-game-host.sh`: source the helper from `$HERE` (if the file is missing, FAILED with that reason) and add the section (decision 6). Update the header comment.
3. `deploy.sh`: ship the helper, update the banners and the fallback note, and make the Q1 change if A is chosen.
4. `setup-telemetry.sh`: add the section (decision 7) and update the "What this script does" list.
5. `build-deploy-telemetry.sh`: stage `TELEMETRY_DEPLOY_SSH_AUTH`, scp the helper, add it to the shipped paths, add the fallback note. `scripts/telemetry-tunnel.sh`: the fallback note.
6. Tests:
   - **`tests/ssh-alerts.sh`** (already registered in `ShellHarnesses.test.ts`, so no new harness):
     - Add `sshd` and `systemctl reload` stubs. `sshd -t` returns the code in a fixture file. `sshd -T` prints values that reflect whether the fake-root drop-in exists, with fixture overrides that simulate "another file wins" and `without-password`.
     - Seed `CASE`'s fake root by default: `sshd_config` with the Include line, and `authorized_keys` with one key. This keeps G1–G5 green.
     - New cases:
       - H1 fresh box → drop-in written (content checked), `sshd -t`, one reload, gate OK, `OK sshd`, exit 0.
       - H2 second run → no write, no reload, still OK.
       - H3 no key → FAILED, no drop-in, no reload.
       - H4 no Include → FAILED, nothing written.
       - H5 `sshd -t` fails → drop-in removed, no reload, FAILED.
       - H6 reload fails → rollback, re-reload, FAILED.
       - H7 gate fails on a fresh box → removed, reloaded, FAILED.
       - H8 an earlier drop-in with different content plus a failing gate → the earlier file is restored byte-for-byte.
       - H9 `without-password` is accepted.
       - H10 blank token (alerts SKIPPED) → sshd still applied, exit 3.
       - H11 wrong-role precondition → sshd untouched.
       - H12 unchanged file plus a failing gate → FAILED, file kept, no reload.
       - Extend the leak and `set -x` guards to the helper.
   - **`tests/scripts/profile-deploy-hardening.test.sh`:**
     - T67: the tar listing gains `sshd-hardening.sh`, plus a byte-identical check of it.
     - T69: if Q1=A, blank token/URL → **one** root call, `GAME HOST SETUP SKIPPED`, exit 3, the token is not in host.env as a value (blank), and the URL case likewise. If Q1=B, T69 is unchanged.
     - Telemetry shipped paths: "exactly five".
     - The helper is scp'd.
     - `TELEMETRY_DEPLOY_SSH_AUTH` is staged as `key` on the key path and `password` on the password path.
     - Structural checks on `setup-telemetry.sh`: the auth-mode guard sits before the helper call, the call is inside `if !` with `exit 1`, and it is placed before `write_deploy_version_marker`.
     - Structural checks on the helper, mirroring `:1726-1800`: the `00-` path, the backup outside `sshd_config.d/`, `Match all`, no cipher list, reload only, the order of steps, restore-else-remove.
     - Update the banner greps if the wording changes.
7. Docs, `docs/vps-deployment-guide.md`. None of this may name a host, address, key or password.
   - §7:
     - "Install the public half": a new key is now added from a working key session or the console, not by password.
     - Replace "Fall back to the password…" with **"Password login is off (task 0442)"**: what changed; the next deploy re-applies the hardening, so any emergency re-enable lasts only until then; rollback A (from the session kept open); rollback B (the provider web console: log in as root with the root password, which is not SSH and so is unaffected); the exact commands; and an advisory `~/.ssh/config` `Host` block per box with `IdentityFile` + `IdentitiesOnly yes`, so ad-hoc logins do not spend fail2ban tries on agent keys.
     - Fix "default `openfront`" with a note that on our boxes the deploy user is `root`.
   - §8:
     - After 0442 the daily "failed logins" number will drop sharply (password guesses no longer reach a password check). The unknown-user count continues. This is expected, not a fault.
     - Add `sshd` to the list of causes behind `GAME HOST SETUP`.
8. Run, one at a time: `bash tests/ssh-alerts.sh`; `bash tests/scripts/profile-deploy-hardening.test.sh`; `shellcheck` on the touched scripts if it is installed; then one full `npm test` through the npm script (project lock). Report results faithfully. A `supertest` timeout is judged by the known-flake rule.
9. Review via `@fkit-reviewer` (stateful, task-id 0442), per the loop.

## Steps — live (owner executes; agent guides; no agent SSH, which the permission classifier denied in 0445)
**Pre-checks, before anything is changed. All must pass; record dates only:**
- P1: the reg.ru web console (VNC) was opened **and logged into as root** for each of the 3 boxes (verification 1).
- P2: both private keys **and** their passphrases are backed up in the password manager.
- P3: each box's root password is in the password manager. It is the console login and must survive the env-file clean-up.
- P4, read-only, one key session per box, output pasted with addresses removed:
  - `cat /etc/ssh/sshd_config.d/50-cloud-init.conf`
  - `ls -la /etc/ssh/sshd_config.d/`
  - `grep -n '^Include' /etc/ssh/sshd_config`
  - `systemctl is-active ssh.service ssh.socket`
  - `sshd -T | grep -E '^(passwordauthentication|permitrootlogin|kbdinteractiveauthentication|maxauthtries) '`
  - `fail2ban-client status sshd | grep -E 'Currently|Total'`

  Expected: the Include line is present; `ssh.service` is active; `50-cloud-init.conf` most likely sets `PasswordAuthentication yes`, which the `00-` file beats. **Stop** if there is any `Match` line, or any file that sorts before `00-`.
- P5: this task's changes are committed by the owner (the telemetry deploy refuses uncommitted shipped files, and the game deploy ships the working tree). Telemetry: VPN off, or the `/32` bypass route.

**Per box: game dev → telemetry → game prod (Q2 decides prod's timing):**
1. Terminal A: `ssh -i <key> -o IdentitiesOnly=yes root@<box>`. **Leave it open** until step 4 passes.
2. Terminal B: the deploy. Game: `./deploy.sh dev|prod <image tag>`; a redeploy of the same version is fine. Telemetry: `npm run deploy:telemetry`.
   - Expected: `✅ sshd: … (global + root-effective)` lines and `OK sshd` / the telemetry "sshd hardened" line.
   - Game exit code: 0 if the token is set; otherwise exit 3, with `SKIPPED ssh-alerts` and `OK sshd`.
3. Terminal C, **new**:
   - key login works: the `KEY-OK` check from §7;
   - password refused: `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password,keyboard-interactive root@<box>` → `Permission denied (publickey)`. On the game boxes root is the deploy user, so this is one check, not two.
   - From A: `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` show `passwordauthentication no` and `permitrootlogin without-password`/`prohibit-password` (verification 3).
4. Only then close A.
   - **If C fails:** from A, run `rm -f /etc/ssh/sshd_config.d/00-geoconflict-hardening.conf && systemctl reload ssh` and re-check `sshd -T`.
   - **If every session is lost:** do the same from the reg.ru console.
   - **Do not deploy that box again until the cause is fixed**: the next deploy re-applies the hardening.
5. A few hours later: `fail2ban-client status sshd` shows the jail up and "Total failed" higher than the P4 value (verification 5). If it has stalled, record it and file a follow-up; changing fail2ban settings is out of scope.

**After all 3 pass:**
- The proof deploy over the key is the step-2 deploy (verification 4).
- Retire the env-file passwords per Q3. Delete these lines by **variable name**, never printing values:
  - `VPS_PASSWORD` and `ALLOW_SSH_PASSWORD_FALLBACK` from `.env.prod.secret` and `.env.dev.secret`;
  - the empty `VPS_PASSWORD` lines from `.env` and `.env.dev`;
  - `TELEMETRY_VPS_PASSWORD` and `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK` from `.env.telemetry.secret`.

  The owner does this, or an agent with the owner's OK given in the session, then confirms with a names-only inventory.
- Worklog: names, dates and counts only (verification 7). Grep the tracked files for hosts, addresses and key contents.

## Risks and failure modes taken into account
- **Lock-out:** covered by the guards, rollback, the kept-open session, the console proven before the change (P1), and the keys backed up (P2). After this task a lost key or passphrase means console-only access, which is why P2 and P3 are required.
- **Cloud-image overrides** (`50-cloud-init.conf`; a `Match User root` like the profile box's `99-qemu.conf`): covered by the `00-` name, the `Match all` pin and the root-effective gate. P4 confirms them before any change.
- **Ubuntu 24.04 socket activation:** `systemctl reload ssh` reaches the running `ssh.service`, and our own session keeps it active. If the reload fails, the change is rolled back and the deploy stops; it never locks anyone out. P4 checks that the service is active.
- **The game root step needs the Mac agent to hold the key** (BatchMode): a key that is not loaded → FAILED/255, the hardening is not applied, and nothing is harmed.
- **Game prod's deploy restarts the game container** (players in matches drop) — hence Q2.
- **Fallback deploys after this task:** the box refuses them at the first scp, before anything changes. The messages say so.
- **Ad-hoc owner logins with several agent keys** could use up fail2ban tries. The runbook advises a `Host` block with `IdentitiesOnly`.
- **The daily alert count drops** after this task: expected, documented in §8.
- **Harness coupling:** editing `deploy.sh`, `setup-telemetry.sh` or `build-deploy-telemetry.sh` can turn `npm test` red. The plan updates T67, T69 and the shipped-paths assertions in the same change.

## Out of scope
- The profile box (0221).
- fail2ban and `MaxStartups` settings.
- Login alerts (0443/0449).
- `setup.sh`: one-time setup, which the ruling excludes.
- Removing the fallback code paths.
- For 0446: the producer should note at close that the sshd item has landed in `setup-game-host.sh` directly.

## Verification mapping
- V1 = P1.
- V2 and V3 = live step 3.
- V4 = live step 2. On the game boxes it reads exit 3 rather than 0 until 0449 sets the token. Record that `OK sshd` and the key-only login were seen, or treat 0449 as the gate for exit 0 (see Q1).
- V5 = live step 5.
- V6 = repo step 6 + `npm test` green.
- V7 = the docs pass plus the grep.

## Owner decisions (2026-10-13, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session, relayed by fkit-lead)

These answer the plan's open questions and **override any conflicting text above**.

- **Q1 — verbatim selection: "Change deploy.sh (Recommended)".** Option A: the root step always runs when a key is set; only the alerts part is skipped while the token is empty. Password-off does not wait on 0449. Game deploys still end with exit 3 until the token is set. (T69 is rewritten per repo step 6.)
- **Q2 — verbatim selection: "Dev+telemetry now, prod weekend (Recommended)".** Game dev and telemetry as soon as the code is committed; game prod in the owner's weekend slot, with the next release or a same-version redeploy.
- **Q3 — verbatim selection: "Keep passwords, drop switches".** Option text: "Password lines stay in the env files; only the 'allow password fallback' switches are removed, so no deploy can even try the password path. Password manager copy still required." ⇒ **This replaces the "Retire the env-file passwords" bullet under *After all 3 pass*:** delete **only** `ALLOW_SSH_PASSWORD_FALLBACK` (from `.env.prod.secret`; the `.env.dev.secret` one was already commented out by 0445) and `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK` (from `.env.telemetry.secret`), by variable name, never printing values. **Keep** `VPS_PASSWORD` and `TELEMETRY_VPS_PASSWORD` lines. Root passwords are **not** rotated. Pre-check P3 (root passwords saved in the password manager) still applies. The runbook text should not say the env-file passwords were removed.
- **Q4 — verbatim selection: "One shared script (Recommended)".** Decision 1 stands: one shared `sshd-hardening.sh`; `setup-profile.sh` untouched.
