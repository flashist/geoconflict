
# 0443 — SSH security alerts to Telegram: implementation plan, REVISED for Way A (PLAN ONLY, nothing written, nothing run remotely)

## Summary
- **Owner rulings applied (2026-10-12):**
  - R2: alerts go through the profile-box relay.
  - Source shown as a masked address plus a provider hint.
  - A new narrow token.
  - Daily counts as their own message in the Alerts topic.
  - First login sent at once plus one follow-up.
  - Game dev included.
  - The "last sent" marker now, the page check later.
  - The read-only inventory runs now.
  - **Way A:** every game deploy runs a root setup step.
- **Way A design:** a new, light, safe-to-repeat root script **`setup-game-host.sh`**. `deploy.sh` ships it and runs it over ONE extra **root login by key**, after the game container is up. It installs or updates the SSH alert watcher. Nothing is done by hand on a game box, and a rebuilt or restored box is fixed by its next deploy.
- **The root login never uses a password.** Before 0445 installs the root key, the step is **skipped with a loud warning** and the game deploy still succeeds.
- **The token travels in a tar stream on stdin**, never in any argv. On the box it is 0600 from creation and deleted on every exit.
- **Recommended failure policy (new Q-A1): warn loudly, never fail the game deploy**, because the game is already live when this step runs.
- **Coordination with 0444:** this task creates the single cleanup function that 0444 must reuse. The two tasks change different lines, listed in A8.
- `setup-game-host.sh` is laid out to be the home for the filed follow-up "game box setup from scripts only" (fail2ban, 0442's sshd settings). **None of that work is done here.**
- Q9 (the build/verify split) is still open; the driver asks it at close.
- The previous A7 is **dropped:** no owner-run install per game box, and no `setup.sh` change (reasons in A7).

## Constraints and facts (read 2026-10-12)
- **Game deploy:** `deploy.sh` → `update.sh` logs in as `SSH_USER_<ENV>` (default `openfront`, non-root), with 2 logins (scp + ssh). `update.sh` deletes its env file after `docker run`, so the game host keeps no secret today. `setup.sh` is one-time provisioning that no deploy re-runs (heavy: apt upgrade, nginx rewrite, `certbot --nginx`).
- **0441 (closed on the repo side, uncommitted):** the key branch `elif [ -n "$SSH_KEY_PATH" ]` sets `SCP_CMD`/`SSH_CMD` with `-o IdentitiesOnly=yes -i`. The password branch uses `sshpass -f` with a 0600 file, an `EXIT` trap `rm -f "$SSH_PASSWORD_FILE"`, and `trap 'exit 130' INT` / `trap 'exit 143' TERM`.
  - The 0441 harness asserts **exactly 2** `IdentitiesOnly=yes` inside that key branch. **The new root command must therefore be defined OUTSIDE that branch.**
  - `run_game_deploy` drives the real `deploy.sh` with the shared stubs.
- **0441 Q2:** root login stays allowed, **by key only**. 0445 installs the game key for root on both game boxes. **It is not installed yet.**
- **Profile deploy** (`setup-profile.sh`, root, every deploy) ships extra files by scp and persists secrets with `persist_or_reuse_secret`. The API is on `127.0.0.1:${PROFILE_PORT}`.
- **Telemetry deploy** (`setup-telemetry.sh`, root, every deploy) already POSTs to the profile relay hourly (0284). Its `TELEMETRY_SHIPPED_PATHS` has a dirty-tree guard.
- **Profile `/internal/` allow list:** game prod (0217) and telemetry (0284) are on it. **Game dev must be added (owner step).**
- **`TelegramNotifier.ts`** retries once on a connection failure (0277/0061). R2 adds no new Telegram sender (ADR-114 Decision 6).
- **Hardening harness** (`tests/scripts/profile-deploy-hardening.test.sh`):
  - awk ranges over `setup-profile.sh` (e.g. `CONFIGURING FAIL2BAN` → `HARDENING SSHD`) — new code goes outside them;
  - compose-heredoc (0282), cron (0219), value-parity (0220) and `setup.sh` `DEBIAN_FRONTEND` (0286) checks;
  - the 0371 rule: stubs are written once, with no per-test executables;
  - it is close to its 150 s deadline.
- **0219:** owner drills on `profile-checks.sh` are in progress. **This task does not edit `profile-checks.sh`** (Q8 ruling: the marker now, the check later).
- **0444 (Backlog, depends on 0441):** moves the game secrets off the ssh command line and requires "one unconditional EXIT-trap cleanup… fold any existing trap into the one cleanup function".

## (a) Coder repo work — in order

**A1. New `ssh-alerts.sh` (repo root): the agent plus its own installer.** Plain bash, curl, journalctl and fail2ban-client: no jq, no new packages.
- **`install`** (root, idempotent). Arguments: `--box <game-prod|game-dev|game-staging|profile|telemetry>` and `--url <base>`. The token is read from **stdin**, never argv. It writes:
  - `/etc/geoconflict-ssh-alerts/ssh-alerts.env` (0600, persist-or-reuse; the box never generates a token);
  - the script itself as `/usr/local/sbin/geoconflict-ssh-alerts` (0700);
  - the `geoconflict-ssh-alerts.service` unit (`Restart=always`);
  - `/etc/cron.d/geoconflict-ssh-alerts` (0644): the 5-min fail2ban check plus spool retry, and the daily report at 08:00 UTC;
  - the state and spool directory `/var/lib/geoconflict-ssh-alerts` (0700).

  **The service is restarted only when the installed script actually changed** (cmp), so every-deploy installs cause no gaps. It refuses bad input. A test seam, `SSH_ALERTS_ROOT`, prefixes every path.
- **`uninstall`:** the emergency off switch. It stops and disables the unit and removes the cron file; config and state are kept.
- **`watch`** (the service): `journalctl -f -o short-unix SYSLOG_IDENTIFIER=sshd SYSLOG_IDENTIFIER=sshd-session --cursor-file=…`. The cursor means a restart resumes instead of losing logins; the first run starts from now.
  - It parses only `Accepted <method> for <user> from <addr> port <n>`. publickey → "key"; password or keyboard-interactive → "password".
  - **It never emits anything for Failed or Invalid lines.** The "no per-guess messages" rule is enforced by the parser.
  - Fields are checked against strict patterns before going into JSON.
  - Sends run in the background with a hard timeout.
  - **Login alerting cannot block or slow a login:** there is no PAM hook and no sshd change. The agent reads the journal after the fact.
- **Source (Q1 ruling):** masked on the box before sending — the first two parts of an IPv4 address, or the first two groups of IPv6 — plus a provider hint from reverse DNS (`getent hosts`, 2 s timeout, last two name labels only). **The full address never leaves the box.**
- **`f2b-check`** (cron, every 5 min): `systemctl is-active fail2ban` plus `timeout 20 fail2ban-client status <jail>` (default `sshd`). The state is `up`, `down`, `jail-missing` or `not-installed`.
  - **"down" needs 2 failed checks in a row**, which absorbs the fail2ban restart on every profile deploy.
  - "back" is sent once on recovery.
  - **While it stays down, a reminder is sent every 12 h** (the plan sets this per the brief; the owner may change it at approval).
  - The same run retries the spool.
- **`daily`** (08:00 UTC): today's change in fail2ban's `Total failed` and `Total banned` counters against a state file. Status is `ok`, `partial` (the counter reset because fail2ban restarted), `first-day` or `unreadable`.
- **`test`:** a clearly marked test event, for the runbook.
- **Delivery:** POST JSON to `<url>/internal/v1/ssh-alerts/events`. The bearer header and the body go through `curl --config -` on stdin, so the token is never in argv. What the agent does with each answer:
  - **2xx:** delivered.
  - **400:** logged on the box and dropped (it can never succeed).
  - **Anything else** (network error, 401, 403, 404, 429, 5xx): spooled and retried every 5 min, so a fixed token or allow list, or a profile route deployed later, still delivers.
  - **Spool limits:** events are dropped after 24 h, with at most 500 files. One "N alerts dropped" event is sent when delivery works again.
- `SSH_ALERTS_AGENT_VERSION` is sent with every event.

**A2. Profile route `POST /internal/v1/ssh-alerts/events`** — new `src/profile-server/SshAlerts.ts`, a small mount region in `Routes.ts`, and wiring in `Server.ts`.
- A zod schema; the box name must come from the fixed list.
- **Authentication:** a bearer token checked against the NEW `PROFILE_SSH_ALERT_TOKEN` with the existing exported `tokensMatch`. `internalAuth` is not reused, because it is tied to `PROFILE_INTERNAL_TOKEN`.
- **Answers:** ordinary status codes, deliberately NOT the Uptrace never-401 contract. 401 for a bad token, 400 for a bad body, 429 from the route's own limiter, 503 when the token is not configured, 202 when accepted.
- It sends to the Alerts topic with `TelegramNotifier`, HTML-escaped.
- **Grouping (Q3 ruling):** the key is **box + source + method**. Users are listed rather than used as part of the key, so a game deploy's `openfront` and `root` logins form ONE group. A password login never hides inside a key group.
  - The first login is sent at once. Matching logins in the next 2 minutes become ONE follow-up ("+N more logins, users: …").
  - The group lives in memory; losing it on a restart is acceptable (architect).
- **No source address in server logs or in any response body.**
- `daily` events are written atomically to `/var/lib/profile/ssh-alerts/daily-<box>.json`. A box that has reported once is known from then on.
- `PROFILE_SSH_ALERT_TOKEN` is read with a literal `process.env` read (the config-parity rule).

**A3. Daily digest:** `src/profile-server/SshSecurityDigest.ts` + `sendSshSecurityDigest.ts`, npm script `digest:ssh-security`, in the `sendNameChangeDigest.ts` shape (never import `Server`, `Routes` or `Telemetry`).
- At 08:10 UTC it sends **one** Alerts-topic message with a line per known box.
- A box with no report in 26 h shows **"NO REPORT since <date>"**, never 0. `unreadable`, `partial` and `first-day` are spelled out. A box on an outdated agent version is flagged.
- **On success it writes the marker `last-ssh-digest.json`** (Q8 ruling: the page check comes later, after 0219). It exits non-zero on a failed send.

**A4. `setup-profile.sh`.** All additions sit outside the fail2ban and sshd awk ranges:
- persist `PROFILE_SSH_ALERT_TOKEN` (persist-or-reuse, never generated) and add it to the `profile.env` heredoc;
- add a value-report line;
- add `mkdir ssh-alerts/` (0700) and the compose bind mount `./ssh-alerts:/var/lib/profile/ssh-alerts`;
- add the digest cron line `10 8 * * *` next to the 0283 digest line;
- add a new section "SSH SECURITY ALERTS (0443)" that runs `install --box profile --url http://127.0.0.1:${PROFILE_PORT}`, with the token on stdin. It is non-fatal with a loud warning.

**A5. `build-deploy-profile.sh`:** scp `ssh-alerts.sh` the same way as `CHECKS_SCRIPT`, add it to `PROFILE_SHIPPED_PATHS`, and forward `PROFILE_SSH_ALERT_TOKEN` in the staged env.

**A6. `setup-telemetry.sh` + `build-deploy-telemetry.sh`:**
- ship `ssh-alerts.sh` (scp, plus `TELEMETRY_SHIPPED_PATHS`);
- forward and persist `PROFILE_SSH_ALERT_TOKEN`;
- run `install --box telemetry` with the URL **derived from `TELEMETRY_ALERT_PROBE_URL`** by removing the exact path `/internal/v1/alerts/webhook`. If the URL does not match that shape, the install is skipped with a loud warning. No new owner config.

**A7. NEW `setup-game-host.sh` (repo root): the game box's every-deploy root step.** I searched first: there is no existing root-run, every-deploy script for game boxes. `setup.sh` is one-time and heavy, `update.sh` runs as non-root, and `startup.sh` is the container's supervisord entry. So this is a new file, and it mirrors `setup-profile.sh`/`setup-telemetry.sh` by name and shape.
- **Contract, written in its header** — this is what makes it the home for the follow-up:
  - runs as root on EVERY game deploy;
  - **every section is idempotent and safe to repeat**;
  - **light:** no apt upgrade, no certbot, no nginx or container changes, target under 30 s;
  - never restarts a service unless its config actually changed;
  - each section is a `print_header` block that reports OK, SKIPPED (with a reason) or FAILED, and the script exits non-zero if any section FAILED;
  - reads its inputs from the staged `host.env` passed by path, sourced and then deleted, never from argv;
  - **must never lock out SSH**: a future sshd section must validate with `sshd -t` before any reload, like 0221.
- **Sections in this task:**
  1. preconditions — root, bash, the `/etc/geoconflict-deploy-role` marker written as `game`, like the telemetry and profile role markers;
  2. **SSH SECURITY ALERTS** — `bash ssh-alerts.sh install --box game-$GAME_ENV --url "$PROFILE_API_URL"`, with the token from `host.env` on stdin. `PROFILE_API_URL` is the value the game deploy already forwards to the container, so no new URL variable is needed. If the token or URL is blank, the section reports SKIPPED with a loud reason.
- **Placeholder comments only** for the follow-up's sections: `# (follow-up: fail2ban sshd jail — copy 0221)` and `# (0442: sshd hardening — copy 0221's guarded section)`. **No code for them in this task.**
- **`setup.sh`: not changed.** Under Way A a fresh box gets this step on its first deploy, so a second call from `setup.sh` would be a parallel path that nothing re-runs. `docs/vps-deployment-guide.md` §2 gains one line: "the first deploy completes host setup (needs the root key, §7)".

**A8. `deploy.sh`: the new step.** Exact touch points:
- **(1) Cleanup** — replace the password branch's inline `trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT` with ONE function, `deploy_cleanup()`, installed with `trap deploy_cleanup EXIT` early, right after `SSH_PASSWORD_FILE=""`. It removes `$SSH_PASSWORD_FILE` and `$HOST_SETUP_STAGE_DIR` when they are set. The existing `trap 'exit 130' INT` / `trap 'exit 143' TERM` lines stay byte-identical, because the harness asserts them.
- **(2) New function `run_game_host_setup()`**, defined next to `run_config_value_guard`. It is self-contained, uses explicit `return` (it is called from an `||` list, where `set -e` is off), and never touches `SSH_CMD`/`SCP_CMD`:
  - **Skip with a loud warning and return 0 when:**
    - there is no `SSH_KEY_PATH` — the password path: **never a root login by password**, see below;
    - `PROFILE_SSH_ALERT_TOKEN` or `PROFILE_API_URL` is blank;
    - `GAME_HOST_SETUP=skip` is set — only if the owner accepts Q-A2.
  - **Root command**, defined here and so outside the key branch the harness counts: `ROOT_SSH_CMD=(ssh -o BatchMode=yes -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")`. It uses the same game key, which 0445 installs for root.
    - `BatchMode` means **no prompt of any kind**. A rejected key fails at once instead of falling back to a typed password, which is the 0445 trap.
    - A rejected key costs **one** failed auth per deploy. IdentitiesOnly and a single login keep it to one, far below any fail2ban threshold.
  - **Staging:** `HOST_SETUP_STAGE_DIR=$(mktemp -d)` (0700). Then `host.env` is written under `umask 077` — `printf '%s=%q\n'` builtins for `PROFILE_SSH_ALERT_TOKEN`, `PROFILE_API_URL` and `GAME_ENV`; the token never appears in any argv. `setup-game-host.sh` and `ssh-alerts.sh` are copied in.
  - **ONE root login:** `COPYFILE_DISABLE=1 tar --format=ustar -C "$HOST_SETUP_STAGE_DIR" -cf - . | "${ROOT_SSH_CMD[@]}" root@"$SERVER_HOST" 'umask 077; d=$(mktemp -d /root/.gc-host-setup.XXXXXX) || exit 1; trap "rm -rf \"$d\"" EXIT; tar -xf - -C "$d" && bash "$d/setup-game-host.sh" "$d/host.env" </dev/null'`.
    - ustar format avoids macOS extended headers.
    - The remote copy is 0600 from creation and removed on every exit.
    - `</dev/null` stops the setup consuming stdin.
    - One login rather than scp + ssh halves the failed attempts when the key is missing, and adds one login alert per deploy instead of two.
  - On a non-zero result it prints a loud **"⚠️ GAME HOST SETUP FAILED — the game IS deployed; SSH alerts on this box may be missing or stale"** banner naming the cause class (root key rejected or not loaded in the agent / setup section failed). Policy per Q-A1.
- **(3) One call line** `run_game_host_setup || HOST_SETUP_RESULT=failed`, placed **after** the existing update block's `if [ $? -ne 0 ]` check and **before** `print_header "DEPLOYMENT COMPLETED SUCCESSFULLY"`. The game is live before root is touched, so a broken root step can never block a release.
- **(4) The final banner** reports the host-setup result: OK, SKIPPED (with reason) or FAILED.
- **0444 coordination — exact overlap:**
  - **0444 rewrites** the final `"${SSH_CMD[@]}" … cat > ${ENV_FILE} << 'EOL' … EOL … ${REMOTE_UPDATE_SCRIPT} ${ENV_FILE}"` block and its `$?` check, and adds a staged local file.
  - **0443 touches** none of those lines except the call line placed directly below that block's `$?` check.
  - **The single shared point is `deploy_cleanup()`.** 0443 creates it; 0444 adds its staged file to it instead of writing a second trap (0444 requires exactly that fold).
  - **Recommend: 0443 lands first** (0444 is on the Backlog), and the producer adds a one-line note to 0444's brief: "reuse `deploy_cleanup()` from 0443; insert the staged-file scp above 0443's `run_game_host_setup` call". The producer writes that, not the coder.
- **No new deploy env variables besides `PROFILE_SSH_ALERT_TOKEN`**, which is loaded by the existing `load_env_file` calls (`.env.secret` / `.env.<env>.secret`). The container heredoc is unchanged, so the game config-parity and value guards are unaffected. This is verified with `npm run check:config-parity`.

**A9. Tests**
- **Jest** `tests/profile-server/SshAlerts.test.ts`: schema, auth (401/400/429/503), formatting, grouping (fake timers: first at once, one follow-up; openfront and root in one group; password never folded into a key group), no address in logs, the daily store. It uses supertest, which carries the known flake family; judge any failure by the CLAUDE.md flake rule.
- **Jest** `tests/profile-server/SshSecurityDigest.test.ts`: ok, unreadable, missing more than 26 h, partial, first-day, outdated agent, no boxes, marker only on a successful send.
- **New harness `tests/ssh-alerts.sh`**, registered in `tests/scripts/ShellHarnesses.test.ts` with its success marker, plus one row in CLAUDE.md's harness table. ⚠️ CLAUDE.md is already dirty, so the edit is additive only.
  - Stubs (`journalctl`, `fail2ban-client`, `systemctl`, `curl`, `timeout`, `getent`) are written ONCE into one stub folder, with per-case state through a pointer file (0371).
  - Covers:
    - the agent: parsing, no event for Failed/Invalid, token never in curl's argv, the spool rules, f2b transitions with a fake clock, daily changes, `install`/`uninstall` into a fake root, restart only on change;
    - **`setup-game-host.sh`:** reads and deletes `host.env`; installs the agent with `--box game-dev`; a blank token reports SKIPPED; a failed section exits non-zero; a second run is a no-op (idempotent).
- **Hardening harness, `deploy.sh` step** — reuses `run_game_deploy` and the shared stubs. **No new executable:** the existing ssh stub learns two flag-file behaviours, saving stdin when `$WORK/ssh.capture_stdin` exists and exiting 255 for `root@` when `$WORK/ssh.root_fail` exists.
  - **Key path with token and URL:** exactly ONE `root@` ssh call, carrying `BatchMode=yes`, `PasswordAuthentication=no`, `KbdInteractiveAuthentication=no` and `-o IdentitiesOnly=yes -i <key>`. The fake token appears in **no** argv. The captured stdin is a tar listing `host.env`, `setup-game-host.sh` and `ssh-alerts.sh`, with `host.env` mode 0600 and holding the token with spaces and specials intact. The remote command has `umask 077`, the `trap … rm -rf`, and `</dev/null`. It runs after the update call (call order in `calls.log`). The deploy exits 0, and the local stage dir is gone.
  - **Password path:** no `root@` call at all, and sshpass is never used for root. The loud SKIPPED line is printed, and the deploy exits 0.
  - **Blank token, or blank `PROFILE_API_URL`:** SKIPPED, no root call, exit 0.
  - **Root ssh fails:** the FAILED banner is printed; the exit code follows the Q-A1 policy (Rec: 0); the stage dir is removed.
  - The existing T60/T61 cases stay green: the root call also carries `-o IdentitiesOnly=yes -i <key>`, and the password-file removal now goes through `deploy_cleanup`.
  - **Structural:** the count of `IdentitiesOnly=yes` in the key branch is still 2; `ROOT_SSH_CMD` never contains `sshpass`; `deploy_cleanup` is the only `EXIT` trap; the call line sits between the update block and the "DEPLOYMENT COMPLETED" header.
- **Hardening harness, profile and telemetry (grep-only):** both pipelines ship and install `ssh-alerts.sh`, which is in both shipped-path lists; the token is forwarded, persisted 0600 and never generated; the compose mount equals the TS constant (drift guard); the digest cron line exists. Existing assertions broken by the new scp or forwarded var are updated (0220 parity lists, scp argv expectations).
- **Also:** `npm run check:config-parity` clean; `bash -n` on every touched script; `npm run lint`.
- **Test runs:** targeted runs while building. **Exactly one full `npm test` at the end** (project lock), and the hardening harness's run time is recorded against its 150 s deadline. Not testable here: GNU tar extraction and the real journalctl/systemd on the boxes — those are the verify task's job.

**A10. Runbook:** `docs/vps-deployment-guide.md` new §8 "SSH security alerts", plus §2 and §7 notes and a pointer from `ai-agents/knowledge-base/alert-delivery-runbook.md`. It covers:
- what each message means and what to do;
- that the game root step needs the root key (§7 / 0445), and what each SKIPPED/FAILED banner means;
- `ssh-alerts.sh test`, a test login, and stopping and starting fail2ban;
- the off switches (`uninstall`; blank the token on the profile box; `GAME_HOST_SETUP=skip` if Q-A2 is accepted);
- that the daily message proves nothing about the Uptrace relay route (ADR-114 A3.3);
- that deploy logins show up as alerts (one group per deploy).

It names no host, address, token or chat id.

## (b) Owner by-hand steps
1. Create the token once (`openssl rand -hex 32`). Put it in the gitignored `.env.secret` (game), `.env.profile.secret` and `.env.telemetry.secret`. Never anywhere tracked.
2. Add game dev's egress address to `PROFILE_INTERNAL_ALLOW_IPS`. It goes live with the next profile deploy.
3. Commit (0441's pending changes plus this task) — the owner's commit.
4. Deploy in this order:
   1. `npm run deploy:profile` — the route, the profile agent and the digest;
   2. `npm run deploy:telemetry`;
   3. a game dev deploy;
   4. a game prod deploy.

   A game deploy that runs before the profile route exists still installs the agent; its events spool and arrive once the route is up (within 24 h).
5. **0445 (root key on the game boxes) is the prerequisite for the game step.** Until it is done, every game deploy prints "HOST SETUP SKIPPED: root key rejected/not loaded" and the game deploys normally. The step needs no other order with 0445 or 0442.
6. Observation (verify task; the split is still Q9):
   - a test login per box;
   - a "Telegram unreachable" test on game dev — point its stored URL at nothing, log in, time it, restore;
   - fail2ban stop/start on game dev or profile;
   - two days of digests;
   - 24 h with no per-guess messages;
   - no tracked file holds an address, token or chat id;
   - a game deploy's banner reads "HOST SETUP OK".

   No new bot, topic or proxy allow-list change is needed: only the profile box talks to Telegram, and it is already allowed.

## (c) Read-only, agent-run with the owner's OK
The brief step 1 inventory is **running now** in the driver's separate worker; results go to the worklog, with names and counts only. Its findings may change three things: the jail name (the agent default is `sshd`), the journal persistence note, and the sshd/sshd-session identifier (both are already handled).

## Edge cases and failure modes
- **journald rate limiting** under a flood could drop an Accepted line (the default burst is far above the observed ~3k/day). Runbook note.
- **Volatile journal:** a reboot loses the cursor, so logins in the seconds before the agent starts are missed.
- **Profile box down:** every box spools for up to 24 h, and that day's digest is missing. Nothing pages until the Q8 follow-up.
- **The deploy-time fail2ban restart** is absorbed by the two-check rule. The counter reset makes that day "partial".
- **Root key not loaded in the Mac agent:** BatchMode suppresses the passphrase prompt, so the step reports SKIPPED/FAILED (Q-A1 policy). The runbook says to run `ssh-add`.
- **A box restored from a provider backup** keeps its old agent until its next deploy. The digest flags an outdated version, or NO REPORT.
- **`deploy.sh` with `REMOTE_USER=root`** still makes the separate root call: one extra login, grouped into the same alert.
- **Staging:** `game-staging` is allowed in the box list.

## Residuals (stated, not fixed)
- Nothing pages if the digest stops arriving, until the Q8 follow-up after 0219.
- In-memory grouping is lost on a profile container restart, which means at most one extra message.
- **The game root step runs only on a deploy:** a game box that is rebuilt or restored but not deployed is uncovered until its next deploy. The digest shows that box as NO REPORT.
- With policy Q-A1 = warn, a silently failing root step is caught by the banner and by the digest's NO REPORT / outdated-version line, not by a failed deploy.
- fail2ban and ufw on the game boxes stay unmanaged here; that is the filed follow-up "game box setup from scripts only".

---

## Owner decisions (2026-10-12, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver) — appended by the driver, not part of the plan text above. ⚠️ Where a decision below differs from the plan text above, THE DECISION WINS.

- **Plan (revised, Way A):** *"Approve (Recommended)"*.
- **Q4 route:** *"Approve with R2 (Recommended)"*. **Q1 source:** *"Masked address + provider (Recommended)"*. **Q5 token:** *"Yes, new narrow token (Recommended)"*. **Q2 daily:** *"Own message in Alerts (Recommended)"*. **Q3 bundling:** *"First now + one follow-up (Recommended)"*. **Q7 game dev:** *"Yes, include dev (Recommended)"*. **Q8:** *"Marker now, check later (Recommended)"*. **Q10 inventory:** *"Run it now (Recommended)"* — done; results in `worklog.md` § "Step 1 — read-only box inventory (2026-10-12)".
- **Q6 game install:** owner's free-text concern, verbatim: *"I can run it, but what I am worried is that if in the future we need to re-deploy the server or to restore it from backup, this procedure (and maybe other manual procedures) can be forgotten, ideally, everything should be set-up out of the install/update scripts, is it possible?"* → selected *"Way A: every deploy, root step (Recommended)"*.
- **Q-A2 skip switch:** *"No switch (Recommended)"* ⇒ **no `GAME_HOST_SETUP=skip`**; drop every mention of it (A8 skip list, A10 off switches).
- **Q-A1 failure policy — OVERRIDES the plan's "warn, never fail" recommendation:** *"Always fail the deploy"*, then clarified as *"After swap; skip also fails (Recommended)"* — option text: *"Game updates first. Then the root step runs; if it fails OR is skipped, the deploy exits with an error and a banner says 'game IS deployed, host setup NOT done'. Game releases still go out before 0445."* ⇒
  - the root step stays **after** the game swap (A8 (3) placement unchanged);
  - **any result other than OK — FAILED or SKIPPED (no key / password path, blank token, blank `PROFILE_API_URL`, root key rejected) — makes `deploy.sh` exit non-zero** after printing a loud banner that says the game IS deployed and host setup is NOT done, with the reason;
  - A9 tests change accordingly: password path, blank token/URL and root-ssh-fail cases assert a **non-zero** exit (and the banner), not exit 0; the key-path-with-token-and-URL case still exits 0;
  - the plan's "skip with a loud warning and return 0" (A8 (2)) and "never fail the game deploy" (Summary, residuals) are superseded.
  - ⚠️ Consequence the coder must check and report: what `build-deploy.sh` (and anything else calling `deploy.sh`) does when `deploy.sh` exits non-zero AFTER the game is live (e.g. version bump/commit/push/tag ordering), so a "game live, host setup not done" deploy is not mistaken for, or handled as, a deploy that never happened. If that needs a judgment call, return NEEDS-DECISION.
- **Q9 (build/verify split):** not yet asked — the driver asks at close.
- **Follow-ups filed by producers:** `0446` (game boxes rebuild from scripts alone — moves fail2ban / 0442 sshd settings into `setup-game-host.sh`); a task for the game-dev leftover deploy env files and always-cleanup (owner: *"File a task (Recommended)"*); a task for the profile Postgres container seeing app secrets (owner: *"File a task (Recommended)"*). None of that work is in 0443.

### Read-only inventory findings (driver relay of `worklog.md` Step 1) the build must honour
- Login lines are under `SYSLOG_IDENTIFIER=sshd` on Ubuntu 24.04 / OpenSSH 9.6 boxes and under `sshd-session` on the profile box (Ubuntu 26.04 / OpenSSH 10.2) — match both (already planned).
- fail2ban logs to `/var/log/fail2ban.log` (backend systemd); its own journal is empty; "Total" counters reset on restart. Prefer counting the last 24 h of `fail2ban.log` lines (or another restart-proof method) for the daily numbers over diffing the totals — the coder decides and records the choice in the decision log.
- Game prod, game dev and telemetry run on **Europe/Moscow** time; the profile box on **UTC**. `/etc/cron.d` schedules use the box's local time, and `fail2ban.log` timestamps are local — the "08:00 UTC" daily report and the 24 h windows must be correct on every box (e.g. `CRON_TZ=UTC` or equivalent; verify what the box's cron supports).
- Jail name is `sshd` on all four boxes. Journal is persistent on all four. `curl`, `getent`, `journalctl`, `systemctl` present on all four.
- Game dev answers **403** on the profile `/internal/` path (not on the allow list — owner step (b)2); game prod and telemetry get through.

### Later owner decision (2026-10-12, live `AskUserQuestion`, same driver session) — appended by the driver

- **Review R1 (Telegram send that still fails after its one retry is only logged — ADR-114 Decision 6):** *"Fix it (Recommended)"* — option text: *"Count failed sends and show the count in the next daily SSH message (e.g. '⚠️ 2 SSH alerts could not be sent since yesterday'), or record a failure metric like the Uptrace relay does. Small change. Matches ADR-114 Decision 6."*
