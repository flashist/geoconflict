# VPS Deployment Guide

This project now targets per-environment VPS instances (dev, staging, prod) that are reachable via IP address without Cloudflare tunnels or DNS subdomains. Each server runs the same Docker image and is configured through environment variables that describe the public endpoint and upstream API host.

## 1. Prepare Environment Variables

1. Copy `example.env` to `.env` and fill in values that are shared across every environment (`SSH_KEY`, `SSH_USER`, `DOCKER_USERNAME`, `DOCKER_TOKEN`, `ADMIN_TOKEN`, `API_KEY`, optional storage/telemetry keys, default `PUBLIC_PROTOCOL` / `PUBLIC_PORT`, etc.).
2. Create one file per environment (`.env.dev`, `.env.staging`, `.env.prod`). Each file should at minimum define:
   - `VPS_IP` or `SERVER_HOST_<ENV>` – SSH hostname or IP of the VPS you are deploying to.
   - `DOCKER_REPO` – image repository/tag suffix for that environment (e.g. `geoconflict-dev`, `geoconflict-prod`).
   - Optional overrides such as `SSH_USER`, `SSH_KEY_<ENV>`, `PUBLIC_HOST`, `PUBLIC_PROTOCOL`, `PUBLIC_PORT`, `DEPLOYMENT_ID`, `API_BASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `BASIC_AUTH_*`.
3. Keep high-value secrets in gitignored overlay files such as `.env.secret`, `.env.prod.secret`, and `.env.telemetry.secret`.
4. Deployment scripts load `.env`, `.env.secret`, `.env.<env>`, and `.env.<env>.secret` in that order, so environment-specific values override shared defaults.

Password-based SSH is no longer the normal deploy path. If you temporarily need it for emergency recovery, keep the password only in a gitignored secret file and opt in explicitly with `ALLOW_SSH_PASSWORD_FALLBACK=1`.

## 2. Provision a VPS

Run the setup helper once per server to install Docker, create the `openfront` user, configure telemetry, provision a swap file, **and** set up a host-level Nginx reverse proxy that forwards `:80` to the container on `127.0.0.1:3000`:

```bash
scp setup.sh root@<server-ip>:/tmp/setup-openfront.sh
ssh root@<server-ip> "chmod +x /tmp/setup-openfront.sh && /tmp/setup-openfront.sh"
```

Ensure the deploy user can log in via SSH with the key referenced by `SSH_KEY` or `SSH_KEY_<ENV>` (how to create and install that key: section 7). **The first deploy completes the host setup:** after the game container is up, every game deploy logs in once more as `root`, by the same key, and runs `setup-game-host.sh` (task 0443 — today it installs the SSH security alert agent, section 8). That needs the game key installed for `root` too (section 7); until it is, every game deploy ends with a "game IS deployed — host setup NOT done" banner and exit code 3. After the script finishes, `swapon --show` should list `/swapfile` and `systemctl status nginx` should report a listener on port 80 that proxies to the container.

## 3. Build & Deploy

All build artifacts are published to Docker Hub (or your configured registry). Use the wrapper to build and deploy in a single step:

```bash
./build-deploy.sh dev
./build-deploy.sh staging
./build-deploy.sh prod --enable_basic_auth
```

The script generates a timestamped tag, pushes the image, uploads `update.sh`, and restarts the container on the target VPS. Internally it populates an environment file with:

- `GAME_ENV`, `DEPLOYMENT_ID`, `PUBLIC_HOST`, `PUBLIC_PROTOCOL`, `PUBLIC_PORT`
- API credentials (`API_BASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`)
- Storage & telemetry settings (`STORAGE_*`, `OTEL_*`)

That file is written into the deploy user's home on the box and made `0600`. `update.sh` removes it on **every** exit, success or failure — including an interrupt or a dropped ssh session (task 0447). It can still be left behind only if the deploy is hard-killed or the box loses power mid-deploy, or in the small window on the `deploy.sh` side before `update.sh` starts (to be closed by task 0444). If the new image cannot be pulled and is not already on the box, `update.sh` stops before touching the running container, so a failed pull leaves the running game as it is.

To deploy an existing image without rebuilding, run:

```bash
./deploy.sh staging 20240301-120501
```

The tag accepts either a version string or a `sha256:` digest.

For `prod`, prefer deploying by digest when you have the trusted digest recorded:

```bash
./deploy.sh prod sha256:<trusted-digest>
```

Registry trust and retention rules are documented in [docs/security/registry-image-policy.md](docs/security/registry-image-policy.md).

If `deploy.sh` sees only a password and no SSH key, it now fails by default with an explicit message. That is intentional. The supported happy path is SSH-key-based deploy.

## 4. Runtime Behaviour

- `/api/env` now exposes `gameEnv`, `deploymentId`, `publicHost`, `publicProtocol`, `publicPort`, `apiBaseUrl`, `jwtIssuer`, and `jwtAudience`. The browser client uses these values to resolve the correct API base URL even when the game runs behind a raw IP address.
- Authentication cookies omit the `Domain` attribute when served from an IP, preventing invalid cookie scopes.
- The Docker image no longer bundles `cloudflared`; Nginx proxies requests directly to the workers.

## 5. Verification Checklist

1. `curl http://<public-ip>/api/env` returns the environment metadata above.
2. `curl http://<public-ip>/api/public_lobbies` responds (may be empty but should not error).
3. Visit `http://<public-ip>` in a browser and confirm static assets load.
4. Verify authentication flows:
   - Login
   - Logout (cookie cleared, redirect issued)
   - Discord login redirect (if configured in API)

If browser testing needs to be delegated, share the public IP, protocol, and any basic auth credentials with the testing agent.

## 6. Troubleshooting

- **Wrong API host:** Ensure the per-environment env file sets `API_BASE_URL` / `JWT_ISSUER` (or the legacy `*_ENV` variants) to the correct service. The client falls back to the container’s `PUBLIC_*` values only when runtime overrides are missing.
- **Cookie domain warnings:** Check that `JWT_AUDIENCE_<ENV>` contains a hostname (without protocol). For IP-only deployments it can be the IP or omitted—the client handles IP-based cookies.
- **Container not restarting after reboot:** The deploy script defaults to `--restart=always` for `prod` and `--restart=no` otherwise. Adjust logic in `update.sh` if you prefer different semantics.

## 7. SSH Keys for Deploys (game dev/prod, telemetry)

The game deploy (`deploy.sh`, also run by `build-deploy.sh`), the telemetry deploy (`build-deploy-telemetry.sh`, `npm run deploy:telemetry`) and the telemetry tunnel (`npm run telemetry:tunnel`) log in with an SSH key. Each passes `-o IdentitiesOnly=yes`, so ssh offers **only** the configured key, never the other keys in your agent: every rejected key counts as a failed login, and enough of them gets your own address banned by fail2ban.

This section names no host, address, key or password. Those live only in your gitignored env files and in `~/.ssh/`.

### Create the keys (once, on the operator's Mac)

One key for the game boxes (dev and prod), a separate one for the telemetry box, so losing one opens one box role only:

```bash
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/geoconflict-game -C geoconflict-game-deploy
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/geoconflict-telemetry -C geoconflict-telemetry-deploy
ssh-add --apple-use-keychain ~/.ssh/geoconflict-game
ssh-add --apple-use-keychain ~/.ssh/geoconflict-telemetry
```

Give each a passphrase. In `~/.ssh/config` set `UseKeychain yes` and `AddKeysToAgent yes` (under `Host *` is fine), so the agent reloads the keys from the keychain after a restart. **Do not set `IdentitiesOnly` globally** — the deploy scripts set it for themselves.

Keep each `.pub` file next to its private key. ssh uses it to match the key already loaded in the agent; without that match it can ask for the passphrase on every connection (2 per game deploy, about 4–5 per telemetry deploy).

⚠️ **The game deploy's third login — `root`, for the host setup step (task 0443) — never asks for anything.** It runs with `BatchMode=yes`, so a key that is not loaded in the agent (or not installed for `root` on the box) fails at once instead of prompting, and the deploy ends with `GAME HOST SETUP FAILED: the root login was refused …` (exit 3; the game itself is already live). Fix: `ssh-add --apple-use-keychain ~/.ssh/geoconflict-game`, and install the key for `root` (below).

**Where the private half lives:** in `~/.ssh/` on the operator's Mac, its passphrase in the macOS keychain. Never in the repo, a task file, a worklog or a wiki page.

### Install the public half (once per box and login user)

Password login is still on, so `ssh-copy-id` can use it this one time:

```bash
ssh-copy-id -i ~/.ssh/geoconflict-game.pub -o IdentitiesOnly=yes <deploy-user>@<game-box>
ssh-copy-id -i ~/.ssh/geoconflict-telemetry.pub -o IdentitiesOnly=yes root@<telemetry-box>
```

The game deploy user is `SSH_USER_<ENV>` / `SSH_USER` (default `openfront`); the telemetry deploy logs in as `TELEMETRY_SSH_USER` (default `root`). **The game boxes also need the game key for `root`** (`ssh-copy-id -i ~/.ssh/geoconflict-game.pub -o IdentitiesOnly=yes root@<game-box>`; task 0445 does this): every game deploy's host setup step logs in as `root` by key, never by password. `-o IdentitiesOnly=yes` keeps it to one failed key try instead of one per agent key.

### Check the key alone works (from a fresh terminal)

```bash
ssh -i ~/.ssh/geoconflict-game -o IdentitiesOnly=yes -o PasswordAuthentication=no \
    -o KbdInteractiveAuthentication=no <deploy-user>@<game-box> true && echo KEY-OK
```

This cannot fall back to a password, so `KEY-OK` proves the key works. Same for the telemetry box with its key and `root`.

### Point the deploys at the key

In your gitignored env files:

- game: `SSH_KEY_DEV=~/.ssh/geoconflict-game` and `SSH_KEY_PROD=~/.ssh/geoconflict-game` (they beat a shared `SSH_KEY` in `.env`);
- telemetry: `TELEMETRY_SSH_KEY=~/.ssh/geoconflict-telemetry` in `.env.telemetry`.

Leave the password values in place until password login is turned off on the boxes — they are the way back if the key fails. With a key set, the key always wins.

### How to tell a deploy used the key

- No `Using deprecated password-based SSH fallback` line in the output, **and**
- **no password prompt**. ⚠️ If ssh asks for a password, the box rejected the key and ssh fell back to asking. Press Ctrl-C and **do not type the password** — the deploy would succeed and hide that the key is broken. Re-run the check above to see why.

### Fall back to the password (emergency only, until password login is turned off)

Game: comment out **both** `SSH_KEY_<ENV>` and any shared `SSH_KEY` (either one makes the key path win), make sure `SSH_PASS_<ENV>` is set, and set `ALLOW_SSH_PASSWORD_FALLBACK_<ENV>=1`. Telemetry: comment out `TELEMETRY_SSH_KEY` and set `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1` with `TELEMETRY_SSH_PASSWORD`. The scripts hand the password to `sshpass` as a 0600 temporary file (never on the command line) and delete it when they exit. Undo all of this as soon as the key works again.

⚠️ On the password path a game deploy still ships the game, but its host setup step is **skipped** — it never logs in as `root` by password — so the deploy ends with `GAME HOST SETUP SKIPPED: no SSH key …` and exit code 3 (owner ruling, task 0443). That is expected in an emergency; the next key deploy completes the step.

### Replace or rotate a key

Box by box: install the new key (`ssh-copy-id` as above), run the check with the new key, point the env file at it and deploy once. Only then remove the old key's line from `~/.ssh/authorized_keys` on the box — keep a second session open while you edit that file.

### If you get banned (fail2ban)

Too many failed logins from your address in a short time bans it: ssh then fails at once with `Connection refused`, or hangs and times out, even with the right key. Recover by waiting out the jail's ban time, or by unbanning yourself from another session or the hosting provider's web console: `fail2ban-client set sshd unbanip <your-address>`. Do not keep retrying while banned.

## 8. SSH Security Alerts (all boxes — task 0443)

Every box — game prod, game dev, profile, telemetry — runs a small agent, `ssh-alerts.sh` (installed as `/usr/local/sbin/geoconflict-ssh-alerts`, a `geoconflict-ssh-alerts` systemd service and a 5-minute cron job). It reports to the profile box, which is the only box that talks to Telegram, and the messages land in the operator group's **Alerts** topic. **There is no message per failed guess** — failed guesses are only counted, once a day.

This section names no host, address, token or chat id.

### What each message means, and what to do

| Message | Meaning | What to do |
|---|---|---|
| `🔑 SSH login · <box>` — user, `by key`, masked source + provider, UTC time | Someone logged in successfully with a key. | If it was you or a deploy, nothing. If not: treat the box as compromised — rotate its keys and check `last` / the journal on the box. |
| `⚠️ SSH login by PASSWORD · <box>` | A successful **password** login. After task 0442 this should never happen. | Same as above, with more urgency. |
| `🔑 +N more SSH logins · <box>` | Further logins from the same source, to the same box, by the same method, within 2 minutes of the first. | Read the user list. |
| `🚨 fail2ban DOWN · <box>` (`not running` / `jail missing` / `not installed`) | Two checks in a row (5 minutes apart) found fail2ban not guarding SSH. One bad check alone (a restart during a deploy) never alerts. | `systemctl status fail2ban` and `fail2ban-client status sshd` on the box. A rebuilt game box with no fail2ban reads `not installed` (task 0446 will install it from the scripts). |
| `🚨 fail2ban STILL DOWN · <box>` | Reminder, every 12 h while it stays down. | As above. |
| `✅ fail2ban back · <box>` | It is running again. | Nothing. |
| `🛡 SSH security · daily` (08:10 UTC) | One line per box: failed logins, unknown-user tries and fail2ban bans over the 24 h before that box's 08:00 UTC report, plus fail2ban's state. | Read it. **`NO REPORT` means the numbers are unknown, never zero** — that box's agent is not reporting (not deployed yet, root step not done, box down, or its spool cannot reach the profile box). `UNREADABLE` means that count could not be read. `ban log covers less than 24 h` means fail2ban's log was rotated or is new. `agent vN is outdated` means the box has not been deployed since the agent changed. `⚠️ OLD numbers from <time>` means that box's report for today has not arrived (yet) — the numbers shown are the previous report's. An unknown-user try that also sent a password counts in both of the first two numbers. |
| `⚠️ N SSH alert message(s) could not be sent to Telegram since the last digest` (a line in the daily message) | The profile box accepted those alerts but Telegram (or its proxy) refused or was unreachable even after one retry. **They are lost** — the box that sent them already counts them as delivered. | Look at the profile box's container log (`ssh alerts: … NOT delivered`) for the result code; check the Telegram proxy. |
| `⚠️ SSH alerts · <box>: N alert(s) could not be delivered within 24 h` | The box kept alerts it could not deliver and gave up after 24 h. | Look at that box's `/var/log/geoconflict-ssh-alerts.log` for the HTTP code (meanings under *Test it on purpose*). |
| `🧪 SSH alerts test · <box>` | You ran the test. | Nothing. |

**Deploy logins show up as alerts — that is expected.** A game deploy logs in as the deploy user and then as `root` (the host setup step): usually one login message plus at most one `+N more` follow-up, and a second group if the deploy takes longer than 2 minutes. A profile or telemetry deploy logs in as `root` several times. The source shown is masked (first two parts of the address only) plus the provider name from reverse DNS; the full address never leaves the box.

**What the daily message proves:** that Telegram delivery from the profile box works, and that each box with a fresh line can reach the profile box. It proves **nothing** about the monitoring alert webhook route (ADR-114 A3.3) — the hourly alert-path probe (task 0284) guards that.

### How it is installed — by each box's own deploy, never by hand

- **Profile box:** `setup-profile.sh` (every `npm run deploy:profile`) — agent, the route `POST /internal/v1/ssh-alerts/events`, and the 08:10 UTC digest cron line.
- **Telemetry box:** `setup-telemetry.sh` (every `npm run deploy:telemetry`). Its relay address is derived from `TELEMETRY_ALERT_PROBE_URL` (the path `/internal/v1/alerts/webhook` removed); a value of any other shape skips the install with a warning.
- **Game boxes:** every game deploy's root step, `setup-game-host.sh`, after the game container is up. Needs the game key installed for `root` (section 7). The final banner says `GAME HOST SETUP OK`, or — exit code 3, the game is live either way — `SKIPPED` (no key / password path, blank `PROFILE_SSH_ALERT_TOKEN`, blank `PROFILE_API_URL`) or `FAILED` (root login refused or box unreachable → section 7's `ssh-add` / root key; or a setup section failed → its output is just above the banner). A rebuilt or restored game box gets the agent back on its next deploy; until then the digest shows it as `NO REPORT` or `outdated`.

**The token.** One value, `PROFILE_SSH_ALERT_TOKEN` (create it once with `openssl rand -hex 32`), in all three gitignored secret files: `.env.secret` (game), `.env.profile.secret`, `.env.telemetry.secret`. Each box stores it 0600 and reuses it on a deploy that does not supply it. **No box ever generates it** — a value only one box knew would make the profile box reject that box's alerts. To rotate: change it in all three files and deploy the profile box first, then the others (their alerts wait in the spool, up to 24 h, until they are redeployed).

**The game dev box** must be on the profile box's `/internal/` allow list (`PROFILE_INTERNAL_ALLOW_IPS`), like game prod and telemetry; without it its events get 403 and wait in its spool.

### Test it on purpose

- On a box, as root: `geoconflict-ssh-alerts test` → `OK: test event delivered` and a `🧪` message within a minute. Otherwise it prints the HTTP code: `401` token mismatch · `403` box not on the `/internal/` allow list · `404` profile route not deployed yet · `503` the profile box has no token · `000` unreachable.
- A login: `ssh` into the box → one `🔑` message within a minute.
- fail2ban (game dev or the profile box): `systemctl stop fail2ban`, wait up to 10 minutes for `🚨 fail2ban DOWN`, then `systemctl start fail2ban` and wait up to 5 minutes for `✅ fail2ban back`.
- With Telegram unreachable (on game dev: point the box's stored URL in `/etc/geoconflict-ssh-alerts/ssh-alerts.env` at nothing, log in, time it, restore): the login is not slowed at all — the agent reads the journal after the fact; there is no PAM hook and no sshd change.

### Switch it off in an emergency

- **One box, now:** as root, `bash /usr/local/sbin/geoconflict-ssh-alerts uninstall` — stops the watcher and removes its cron job; config and state are kept. ⚠️ **That box's next deploy installs it again.**
- **Every box, and it stays off across deploys:** blank `PROFILE_SSH_ALERT_TOKEN` on the profile box — `rm /opt/profile/.ssh_alert_token` there and redeploy it with the value removed from `.env.profile.secret`. The route then answers 503 to everything and nothing is delivered (each box keeps its alerts for up to 24 h, then drops them). There is deliberately no switch that skips the game deploy's root step (owner ruling).

### Known limits

- A login in the few seconds before the agent starts after a reboot can be missed; a restart otherwise resumes from the last login it handled.
- Under a flood, journald's rate limit could in principle drop an `Accepted` line (its default burst is far above the ~3,000 lines a day seen).
- If the profile box is down, every box keeps its alerts for up to 24 h and that day's digest is missing. **Nothing pages when the digest stops arriving** — the digest marker (`/opt/profile/ssh-alerts/last-ssh-digest.json`) is written, but no check reads it yet (a follow-up after task 0219).
- Login grouping lives in the profile server's memory: a restart of it costs at most one extra message. Grouping uses the time each login happened, so logins delivered late from a spool are never shown as "within 2 minutes" of each other unless they were.
- Each box's `/var/log/geoconflict-ssh-alerts.log` is rotated weekly (or at 10 MB) by `/etc/logrotate.d/geoconflict-ssh-alerts`, which the install writes.

Refer back to `docs/vps-migration-plan.md` for the architectural intent behind these changes.
