# Verify 0441 on the Boxes — SSH Keys Installed, Key-Only Login Proven, Deploys Over the Key (task 0445)

**Source**: `ai-agents/tasks/done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 41 (ADR-035 append rank; 🚨 first open work on the board by owner ruling 2026-10-12) / task `0445`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-13 by a spawned `fkit-producer` on the owner ruling
> *"Yes, mark it finished (Recommended)"* (relayed by `fkit-lead`; ⛔ not producer precedent). **Every box step was run by
> the owner in their own terminal and confirmed in session**; the close itself was made by an agent with no owner
> channel, hence the marker.
>
> 🚦 **KEY LOGIN IS NOW IN EFFECT on game prod, game dev and telemetry (2026-10-13).** Password login is **still on**
> on all three — switching it off is `0442` (built, [[tasks/ssh-password-login-off]]) and its live step `0452` (open).

> 📌 *2026-10-15 sync:* password login is **off on telemetry and game dev since 2026-10-15** (`0452`: V2–V4 passed on both — key login works, a password-only login gets `Permission denied (publickey)`, effective `sshd -T` shows `passwordauthentication no`). **Game prod still accepts passwords** until its weekend-slot step (`0452`, [[tasks/ssh-password-login-off]]); its fail2ban re-check is `0462`.

## Goal

The box side of [[tasks/deploy-ssh-key-login]] (`0441`, repo work only): make the two keys, install them, prove a key
alone gets in, and prove a real deploy uses the key — on every in-scope box — before `0442` may switch password login
off. **Password login stayed on throughout** as the way back if a key failed. Filed in Sprint 8 rather than the next
sprint by owner ruling *"Close; verify task in Sprint 8 (Recommended)"* — a one-off bend of the standing 2026-09-29
build/verify-split rule, because the owner planned a mid-week deploy.

Traps the brief carried (from `0441`'s plan), worth keeping:
- **A typed password hides a rejected key.** Proof needs **no fallback line AND no password prompt AND
  `Accepted publickey for <user>` in the box's auth log** — "no fallback line" alone proves nothing.
- **`ps` output carries game secrets** (`deploy.sh` still puts them on the ssh command line — follow-up `0444`), so the
  fallback check counts processes and never prints a line.
- **The password fallback needs BOTH key variables off** (`SSH_KEY_<ENV>` and the shared `SSH_KEY`).

## Key Changes

Nothing in the repo. Owner actions and read-only checks, 2026-10-13 (worklog):

- **Finding — the deploy user is `root` on both game boxes** (`VPS_LOGIN`), so "deploy user" and "root" are one login;
  the brief's default `openfront` did not apply.
- **Before this task every deploy took the password path** (local env-name inventory, names only).
- **Box inventory (read-only, owner-run, address-free):** Ubuntu 24.04 on all three; `sshd -T` identical global and for
  root — `passwordauthentication yes`, `permitrootlogin yes`, `pubkeyauthentication yes`, `kbdinteractiveauthentication
  no`, `maxauthtries 6`, `strictmodes yes`, no `Match` lines anywhere. `sshd_config.d/` holds one file,
  `50-cloud-init.conf` — **contents not read**; carried to `0442` as a likely `PasswordAuthentication yes` source
  (**unverified**). Root `authorized_keys` modes are strict (nothing group-writable). fail2ban active on all three.
- **Keys:** `~/.ssh/geoconflict-game` (game dev + prod) and `~/.ssh/geoconflict-telemetry`, ed25519, passphrase in the
  keychain; installed for root with `ssh-copy-id -o IdentitiesOnly=yes`. Env files pointed at them (`SSH_KEY_DEV`,
  `SSH_KEY_PROD`, `TELEMETRY_SSH_KEY`); **every password value left in place** for `0442`.
- **Key-only login** (`IdentitiesOnly`, password and keyboard-interactive off, `BatchMode`): **KEY-OK** on all three.
- **`0441` was already committed** (`779ddc2`) before the first proof deploy.

## Outcome

**Proof deploys over the key — no password prompt, no fallback line, `publickey root` in each auth log, 0 `password`:**

| Box | What ran | Result |
|---|---|---|
| game dev | `./deploy.sh dev 20261003-122424` (same build already running) | completed |
| telemetry | `npm run deploy:telemetry` → tag `0.0.163-telemetry.1` | completed (two earlier local failures: Docker down, then a Docker Hub pull `EOF` — likely VPN off, **unproven**; fixed by pre-pulling) |
| game prod | `./build-deploy.sh prod` → **game `0.0.164`** (commit `d798adb`, image `20261013-200604`) | completed |

- 🚦 **Game prod was a REAL release, not a same-version redeploy** — owner ruling *"Real release now"* (option text: ship
  `0437` + `0443` code to prod today, accept `0437` goes out unseen and the weekend rule bends). Full `npm test` before
  it: 225/225 suites, 4611 tests green. ⇒ **`0437` (exit confirm popup) is LIVE on prod since 2026-10-13** —
  [[tasks/exit-confirm-popup]]; its live check `0439` is still open. Game dev still runs the older `20261003-122424`.
- **Every game deploy ended exit 3** with `GAME HOST SETUP SKIPPED: PROFILE_SSH_ALERT_TOKEN is empty` — expected, it
  belongs to `0443`/`0449` ([[tasks/ssh-security-alerts]]); the game was live each time.
- **Dev password fallback still works:** with both key variables off, a dev deploy completed; process counts sampled
  every 0.2 s: `sshpass -p` max **0**, `sshpass -f` max **1** (counts only). Key variable restored and the dev fallback
  switch commented out afterwards. The prod and telemetry fallback switches were left for `0442`.
- **The intermittent "Permission denied" with the correct password** (2026-10-10, cause unproven): **not reported** —
  recorded as "not reported", not "proven absent" (nobody asked explicitly).
- **Carried to `0442`:** `50-cloud-init.conf`; the leftover fallback switches in the prod and telemetry secret files;
  password values still in the env files. Local helper scripts in the owner's home directory (outside the repo) to be
  deleted by the owner.
- Unlocked: `0442` (now built), `0449`, `0450`.

## Related

- [[tasks/deploy-ssh-key-login]] — task `0441`, the repo half this task verified
- [[tasks/ssh-password-login-off]] — task `0442`, password login off — waited on this task
- [[tasks/ssh-security-alerts]] — task `0443`; its root step now logs in by key, but skips (exit 3) until `0449` sets the token
- [[tasks/game-deploy-env-file-cleanup]] — task `0447`; its verify `0450` was unblocked by the game key
- [[tasks/exit-confirm-popup]] — task `0437`, shipped to prod in the `0.0.164` proof release
- [[tasks/vps-access-hardening]] — task `0132`, the April 2026 key-based target, finally reached for logins (passwords still on)
- [[tasks/deployment-credential-hardening]] — task `0134`, the key-first deploy contract, now exercised
- [[systems/weekend-deploy-window]] — the mid-week `0.0.164` release, a bend of the weekend rule
- [[decisions/sprint-8]] — the board (rank 41)
- [[tasks/game-deploy-env-file-cleanup-verified]] — task `0450`, unblocked by this task's game key; closed 2026-10-15
