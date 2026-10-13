# Worklog — 0445

## 2026-10-13 — Verification run (owner-executed; guided by `fkit-lead`; recorded by a spawned `fkit-producer`)

**Who did what.** Every box step — key creation, key installs, key-only login checks, env-file edits, every deploy, the
fallback check, and the read-only box inventory — was **executed by the owner (human) in their own terminal**. `fkit-lead`
guided the session, wrote local helper scripts in the owner's home directory (**outside the repo**), and ran only local
read-only checks. `fkit-lead`'s own attempt to run the read-only SSH inventory was **denied by the Claude Code permission
classifier**, so — per the brief's own fallback (*Owner*) — the owner ran it and pasted address-redacted output. This
worklog was written by a spawned `fkit-producer` (no owner channel) from `fkit-lead`'s relay of those results.

**Hygiene.** Nothing below names a host, an IP address, key contents or a password value, and no `ps` line appears
anywhere. Boxes are named by role only (game prod, game dev, telemetry).

### Brief step 2 — local env-name inventory (names only; run by `fkit-lead`, 2026-10-13)

State **before** this task (variable names only, never values):

| File | Names found |
|---|---|
| `.env` | `VPS_LOGIN` (set), `VPS_PASSWORD` (empty), `#SSH_KEY` (commented out) |
| `.env.dev` | `VPS_LOGIN`, `VPS_PASSWORD` (empty) |
| `.env.dev.secret` | `ALLOW_SSH_PASSWORD_FALLBACK` (set), `VPS_PASSWORD` (set) |
| `.env.prod` | `VPS_LOGIN` |
| `.env.prod.secret` | `ALLOW_SSH_PASSWORD_FALLBACK`, `VPS_PASSWORD` |
| `.env.telemetry` | `TELEMETRY_VPS_LOGIN`, `#TELEMETRY_SSH_KEY` (commented out) |
| `.env.telemetry.secret` | `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK`, `TELEMETRY_VPS_PASSWORD` |
| `.env.secret` | none of the patterns |

- ⇒ **Every deploy took the password path** before this task.
- `~/.ssh` held only `id_rsa`; no `~/.ssh/config`; the ssh agent had no identities loaded.
- **Finding: on BOTH game boxes the deploy user resolves to `root`** (`VPS_LOGIN`), so "deploy user" and "root" are the
  same login. The brief's default (`openfront`) does not apply here. Brief step 4 / Verification 2's separate
  "deploy user" and "root" checks are therefore one login per game box.

### Brief step 1 / Verification 1 — box inventory (read-only; owner-run 2026-10-13; one ssh session per box, over the new keys)

Identical on game prod, game dev and telemetry except where noted.

- **OS:** Ubuntu 24.04.3 LTS (game prod, game dev); Ubuntu 24.04.5 LTS (telemetry).
- **`sshd -T`**, global and with `-C user=root,…` from a documentation address (the two outputs were identical):

  | Setting | Value |
  |---|---|
  | `authenticationmethods` | `any` |
  | `authorizedkeysfile` | `.ssh/authorized_keys .ssh/authorized_keys2` |
  | `kbdinteractiveauthentication` | `no` |
  | `maxauthtries` | `6` |
  | `maxstartups` | `10:30:100` |
  | `passwordauthentication` | `yes` |
  | `permitrootlogin` | `yes` |
  | `pubkeyauthentication` | `yes` |
  | `strictmodes` | `yes` |
  | `usepam` | `yes` |
  | `allowusers` / `allowgroups` / `denyusers` | no lines |

  The deploy user is `root` on every box, so the `-C user=<deploy user>` run is the `user=root` run.
- **`Match` limit (recorded as required):** a `Match Address` block for the owner's real address would not show in a
  documentation-address `sshd -T`. **But there are no `Match` lines at all** in `sshd_config` or `sshd_config.d/*`, so the
  limit has no effect here.
- **`sshd_config.d/`:** holds one file, `50-cloud-init.conf`. Its contents were **not read**.
  📌 **Note for `0442`:** on Ubuntu cloud images this drop-in often sets `PasswordAuthentication yes` and is read before the
  main config (first value wins), so `0442` must handle it — **unverified**, not read on these boxes.
- **root `authorized_keys`:** exists, **1** key line (the newly installed key). Modes: `/root` `700 root:root`,
  `/root/.ssh` `700 root:root`, `authorized_keys` `600 root:root` — nothing group-writable, so `StrictModes` will not ignore
  the key.
- **`id root`:** `uid=0 gid=0 groups=0`.
- **fail2ban:** active on all three. `sshd` jail, count lines only:

  | Box | Currently failed | Total failed | Currently banned | Total banned |
  |---|---|---|---|---|
  | game prod | 1 | 234371 | 3 | 22534 |
  | game dev | 2 | 157437 | 0 | 20688 |
  | telemetry | 4 | 21696 | 4 | 3588 |

- **Accepted logins, last 30 days** (reduced to `method user`, `uniq -c`, no addresses):

  | Box | password root | publickey root |
  |---|---|---|
  | game prod | 70 | 4 |
  | game dev | 6 | 4 |
  | telemetry | 140 | 2 |

  The `publickey` logins are this session's same-day key checks.

### Brief steps 3–4 — keys created and installed (owner, 2026-10-13)

- Created `~/.ssh/geoconflict-game` and `~/.ssh/geoconflict-telemetry`: `ed25519`, with a passphrase, stored in the
  keychain, `.pub` alongside each. `~/.ssh/config` created with `UseKeychain` / `AddKeysToAgent` under `Host *`.
- Installed the public halves with `ssh-copy-id -o IdentitiesOnly=yes`:
  - game key → `root` on game prod and on game dev (deploy user = `root`, so this covers both Q2 targets);
  - telemetry key → `root` on telemetry.
- The owner was advised to back up **both private keys AND their passphrases** in a password manager.

### Brief step 5 / Verification 2 — key-only login (owner, fresh terminal, 2026-10-13)

Options: `-o IdentitiesOnly=yes -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o BatchMode=yes`.

| Box | User | Result |
|---|---|---|
| game prod | `root` (= deploy user) | KEY-OK |
| game dev | `root` (= deploy user) | KEY-OK |
| telemetry | `root` | KEY-OK |

Owner's summary: *"ALL check OK (2026-10-13)"*.

### Brief step 6 — env files pointed at the keys (owner, 2026-10-13)

- `SSH_KEY_DEV` (`.env.dev`) and `SSH_KEY_PROD` (`.env.prod`) → the game key; `TELEMETRY_SSH_KEY` (`.env.telemetry`) → the
  telemetry key.
- **Every password value left in place** (until `0442`).
- The owner ran the append twice; `fkit-lead` removed the duplicate lines — one line of each remains.

### Brief step 7 / Verification 3 — `0441` committed before any proof deploy

`0441`'s changes were already committed before the first proof deploy: commit **`779ddc2`** (*"Sprint 8: SSH key login
(0441) + SSH security alerts to Telegram (0443)"*). Working tree clean at the start of the session.

### Brief step 8 / Verification 4 — proof deploys over the key (owner, 2026-10-13)

On all three, the owner confirmed in-session (*"No, never asked"*): **no password prompt and no
`Using deprecated password-based SSH fallback` line**.

| Box | Command / version | Time (MSK) | Auth log, last 15 min | Result |
|---|---|---|---|---|
| game dev | `./deploy.sh dev 20261003-122424` (same version already running) | ~19:29 | 5 `publickey root`, 0 `password` | completed |
| telemetry | `npm run deploy:telemetry` → `0.0.163-telemetry.1` | ~19:50 | 6 `publickey root`, 0 `password` | completed (git tag created and pushed — the script creates it only after the remote step succeeds) |
| game prod | `./build-deploy.sh prod` → version `0.0.164`, commit `d798adb`, tag pushed, image `20261013-200604` | ~20:06–20:13 | 3 `publickey root`, 0 `password` | completed |

- **Telemetry:** two earlier attempts failed **locally, before touching the box** — first the Docker daemon was down; then
  a Docker Hub pull of `uptrace/uptrace:2.0.2` broke with `EOF` (likely VPN off — **unproven**). Fixed by pre-pulling the
  image.
- **Game prod was a REAL release, not a same-version redeploy.** 📌 **OWNER RULING, 2026-10-13, live `AskUserQuestion`**,
  verbatim selection **"Real release now"** — option text: *"Ship current code (0437 + 0443 code) to prod today. I'd first
  run the full test suite (~5 min), and you'd accept that 0437 goes out without ever being seen live and bends the weekend
  rule."* Before it: full `npm test` on `f51a845` — **225/225 suites, 4611/4611 tests green, 93 s**.
- **Every game deploy ended exit 3** with `GAME HOST SETUP SKIPPED: PROFILE_SSH_ALERT_TOKEN is empty`. Expected — it
  belongs to `0443` / `0449`; the game was live each time.

### Brief step 9 / Verification 5 — dev password fallback still works (owner, 2026-10-13)

- Set-up: `SSH_KEY_DEV` commented out (the shared `SSH_KEY` in `.env` was already commented out); password and
  `ALLOW_SSH_PASSWORD_FALLBACK=1` present. *(The brief named `SSH_PASS_DEV` / `ALLOW_SSH_PASSWORD_FALLBACK_DEV`; the
  repo's actual variables are `VPS_PASSWORD` / `ALLOW_SSH_PASSWORD_FALLBACK` in `.env.dev.secret`, per step 2.)*
- `./deploy.sh dev 20261003-122424` → `✅ SERVER UPDATE COMPLETED SUCCESSFULLY`, ended
  `GAME HOST SETUP SKIPPED: no SSH key for dev — the root step never logs in by password` (expected on the password path,
  per runbook §7).
- Process watcher, sampling every 0.2 s (419 samples), **counts only**: max `sshpass -p` = **0**; max `sshpass -f` =
  **1**. ✅ meets `-p` = 0 and `-f` ≥ 1.
- Afterwards `fkit-lead` restored `SSH_KEY_DEV` and commented out `ALLOW_SSH_PASSWORD_FALLBACK` in `.env.dev.secret`.
- **Not changed:** the fallback flags in `.env.prod.secret` and `.env.telemetry.secret` — harmless while a key is set; left
  for `0442` to clean up.

### Verification 6 — intermittent "Permission denied" with the correct password

**Not reported** by the owner during the key installs, the login checks or the deploys this session. `fkit-lead` did not
ask about it explicitly, so this is recorded as **"not reported" — not as "proven absent"**.

### Verification 7 — no secrets

Nothing written for this task names a host, an address, key contents or a password, and no `ps` line was pasted.

### Side effects to carry forward

- **`0437` (leave-match confirm popup) is now LIVE ON PROD** since 2026-10-13 in `0.0.164` — relevant to its verify task
  `0439`. Game dev still runs the older `20261003-122424` build.
- Local helper scripts `~/geoconflict-0445*.sh` (outside the repo) should be deleted by the owner once no longer needed
  (the auth-log one may help `0449` / `0450`).
- For `0442`: `50-cloud-init.conf` in `sshd_config.d/` (above); the leftover fallback flags in `.env.prod.secret` and
  `.env.telemetry.secret`; password values still in the env files.

### Decision log

None of the coder kind. The decisions are the two owner rulings: **"Real release now"** (game prod proof deploy, above) and
the close ruling below.

### Close

📌 **OWNER RULING, 2026-10-13, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`.**
Verbatim selection **"Yes, mark it finished (Recommended)"** — option text: *"All of 0445 is done and confirmed. Mark it
finished? A helper agent writes every result into the task's notes (no addresses), then moves it to the done folder. That
unlocks 0442 (turn off password login), 0449 and 0450. Nothing gets committed."* Closed by a spawned `fkit-producer` via
`/fkit-task-done` as `✅ Done (agent-closed — not owner-verified)` (ADR-033 §5): the owner executed and confirmed every
step in-session, but the close itself was performed by an agent with no owner channel. No commit.
