# Verify 0441 on the boxes — install the SSH keys, prove key-only login, and deploy game dev, game prod and telemetry over the key

## ID
0445

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0444`. `0445`: no task folder, no `## ID` hit, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0445*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Verbatim selection: **"Close; verify task in Sprint 8 (Recommended)"** — option text:
> *"0441 closes now (agent-closed, not owner-verified). A producer files one verify task at the top of Sprint 8: install
> keys, key-only login check, proof deploys (mid-week is fine). 0442 then waits on that verify task. Bends your 'next
> sprint' rule because you plan to deploy this week."*
>
> ⚠️ **This explicitly bends, for this case only, the standing build/verify-split rule (owner ruling 2026-09-29)** that a
> verify task goes to the top of the **next** sprint. Reason given in the option: the owner plans to deploy this week
> (plan Q6, verbatim: *"We probably will do deployed in the middle of the week, if ready to do so."*). Not a change to the
> standing rule.

## Priority
41

🚨 **FIRST OPEN WORK ON THE BOARD, BY OWNER RULING (2026-10-12).** ⚠️ **Priority 41 is append rank, NOT a merit ranking —
flagged for owner confirmation.** **On merit — and by the owner's ruling, "at the top of Sprint 8" — this belongs directly
above `0442`, as the first open row to pick up**, because `0442` (password login off) now waits on it, and `0442` + `0443`
are the owner's top priority. ADR-035 forbids inserting a new row above closed rows, so it appends after the highest
(`0443`).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** Creating the keys, installing the public halves, the key-only login
checks, the commit, every deploy and the fallback check are the owner's hands. The **read-only** checks (step 1 box
inventory, the local env-name inventory, the post-deploy auth-log check) may be run by an agent session **with the
owner's OK given in-session** (standing rule: read-only checks are run, not handed over). Until a key is installed the
only way into a box is a password; if the agent session has no approved way in, the owner runs the same batch and pastes
the address-free output.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0387` /
`0439`.)*

## Context

**In plain terms.** `0441` built the repo side of key login: the deploy scripts now offer only the one configured key
(`IdentitiesOnly=yes`) and never put a password on the command line, and the runbook explains how to make and install
the keys. It closed without anything done on the boxes. This task does the box side: make the two keys, put them on the
boxes, prove a key alone gets in, then prove a real deploy uses the key. Only after this passes may `0442` turn password
login off. **Password login stays ON throughout this task** — it is the way back if a key fails.

**The build:** [`0441`](../../done/0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md) —
its `plan.md` §(b) steps 2–8 and §(c) are the source of this brief; its `worklog.md` records the build, the decision log
and the checks; the runbook is `docs/vps-deployment-guide.md` **§7 *SSH Keys for Deploys (game dev/prod, telemetry)***.

**Owner rulings that shape this task** (2026-10-12, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session,
recorded in `0441`'s `plan.md`):
- **Q1 — two new keys:** one `ed25519` key for the game boxes (dev **and** prod), one for telemetry, each with a passphrase
  in the Mac keychain. Runbook names: `~/.ssh/geoconflict-game`, `~/.ssh/geoconflict-telemetry`.
- **Q2 — root by key only (after `0442`):** ⇒ the game key is installed for **root** on both game boxes too, not only for
  the deploy user. Telemetry already logs in as root.
- **Q3 — game prod + dev** are both in scope. Telemetry is in scope by the earlier ruling (`0441` *Sprint*).
- **Q6 / close ruling — timing:** mid-week deploys are fine (*"mid-week is fine"*); the weekend slot is not required here.

**Traps the plan found — keep them in view:**
- **A typed password hides a rejected key.** The key path does not switch off password prompts. If the box rejects the
  key, ssh asks for a password; typing it makes the deploy succeed with **no** fallback line. So "no fallback line" alone
  proves nothing. Proof needs **no fallback line AND no password prompt AND `Accepted publickey for <user>` in the box's
  auth log**. If a prompt appears: Ctrl-C, do not type the password.
- **`ps` output carries game secrets.** `deploy.sh` still puts every game secret on the ssh command line (follow-up
  `0444`, not fixed here). The fallback check's `ps` step must print **counts only — never a line**. Pasting a `ps` line
  leaks secrets.
- **Uncommitted 0441 work breaks or pollutes deploys.** `build-deploy-telemetry.sh` refuses to deploy when a shipped file
  is dirty, and `0441` edited one. `./build-deploy.sh prod` commits and pushes the **whole** working tree, so uncommitted
  `0441` changes would be swept into a release commit. **Commit `0441`'s changes before any proof deploy** (owner's call
  and owner's commit — no agent commits unprompted).
- **Fallback needs BOTH key variables off.** `deploy.sh` falls back to the shared `SSH_KEY` when `SSH_KEY_<ENV>` is
  empty, and `example.env` sets `SSH_KEY`. Commenting out only `SSH_KEY_DEV` keeps the key path (`0441` worklog decision
  6; runbook §7 *Fall back to the password*).
- **Self-ban risk.** `MaxAuthTries 6` plus fail2ban. Install with `ssh-copy-id -o IdentitiesOnly=yes`; one ssh session per
  box for the inventory; never hammer a box after a refusal (runbook §7 *If you get banned*).
- **The intermittent "Permission denied" with the correct password** (2026-10-10, cause unproven) may recur during the
  installs. Wait, retry **once**, and record it. Do not assume the key fixes it.
- The telemetry box is unreachable while a full-tunnel VPN is on.

## What to build

*(Nothing in the repo. Every step is a check or an owner action on the boxes / the owner's Mac.)*

1. **Box inventory, read-only (`0441` plan §(c), brief step 1)** — game prod, game dev, telemetry. **One ssh session per
   box**, all commands in one batch: OS name; `sshd -T` filtered to `permitrootlogin`, `passwordauthentication`,
   `kbdinteractiveauthentication`, `pubkeyauthentication`, `authenticationmethods`, `maxauthtries`, `maxstartups`,
   `authorizedkeysfile`, `allowusers`/`allowgroups`/`denyusers`, `usepam`; the same with `-C user=root,…` and
   `-C user=<deploy user>,…` using a documentation address (record the limit: a `Match Address` for the owner's real
   address would not show); the `Match` lines in `sshd_config` and `sshd_config.d/*`; for root and the deploy user,
   whether `authorized_keys` exists, its line count, and the modes of the home dir, `.ssh` and the file (`StrictModes`
   silently ignores a key under a group-writable home); `id <deploy user>`; `systemctl is-active fail2ban` and the jail's
   **count lines only** (the full status lists banned addresses); accepted logins reduced to `method user` with
   `uniq -c` (no addresses).
2. **Local env-name inventory, read-only, names only** (owner's Mac): the `SSH|VPS_LOGIN|VPS_PASSWORD|ALLOW_` variable
   **names** in `.env`, `.env.secret`, `.env.dev*`, `.env.prod*`, `.env.telemetry*` — never values. It shows which path
   each deploy takes today, and whether a default `~/.ssh/id_rsa` key is already set (the 65 "password for root"
   telemetry logins could be a typed prompt after a rejected key).
3. **Create the two keys** (owner) per runbook §7 *Create the keys*; load them into the agent/keychain; `.pub` next to each
   private key.
4. **Install the public halves** (owner), one `ssh-copy-id -o IdentitiesOnly=yes` per box and user: game prod and game dev
   — the deploy user (default `openfront`; step 1 confirms) **and root** (Q2); telemetry — root.
5. **Key-only login check** (owner, fresh terminal) for every box and user in step 4, per runbook §7 *Check the key alone
   works* (`-o IdentitiesOnly=yes -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no`).
6. **Point the env files at the keys** (owner): `SSH_KEY_DEV`, `SSH_KEY_PROD` → the game key; `TELEMETRY_SSH_KEY` → the
   telemetry key. **Leave every password value in place** until `0442`.
7. **Commit `0441`'s changes** before the first proof deploy (owner).
8. **Proof deploys over the key** (owner) — game dev first, then game prod, then telemetry. Mid-week is fine by ruling.
   - Game dev: `./deploy.sh dev <tag running now>` (same version, no product change).
   - Game prod: ride a normal game release if one is going out; otherwise `./deploy.sh prod sha256:<running digest>`.
   - Telemetry: one `npm run deploy:telemetry` (creates its normal `-telemetry.N` tag).
   - For each: no fallback line, **no password prompt**, and the box's auth log (reduced as in step 1 — `method user`
     counts, no addresses) shows `Accepted publickey for <user>` around the deploy time. Record date and version.
9. **Fallback still works** (owner, on dev — `0441` verification 4): comment out **both** `SSH_KEY_DEV` and the shared
   `SSH_KEY`, make sure `SSH_PASS_DEV` is set, set `ALLOW_SSH_PASSWORD_FALLBACK_DEV=1`, deploy dev. While the remote step
   runs, in a second terminal count `sshpass` processes using `-p` (must be **0**) and using `-f` (must be **≥ 1**) —
   ⚠️ **counts only, never print or paste the matching lines.** Then restore both key variables and remove the flag.

**Out of scope:** turning password login off (`0442`); moving the game secrets off the ssh command line (`0444`); login
alerts (`0443`); the profile box (already key-only); any repo change — a defect found here is filed as its own task.

## Verification steps

1. Worklog records step 1 for each of the three boxes (every setting listed there, the `Match` limit, `authorized_keys`
   presence/count/modes, the deploy user, fail2ban active + counts, accepted-login `method user` counts) and step 2's
   variable names — **no addresses, no values, no secrets**.
2. The key-only login check (step 5) succeeds, from a fresh terminal, for: game prod deploy user, game prod root, game dev
   deploy user, game dev root, telemetry root. Recorded per box and user (date only).
3. Worklog records that `0441`'s changes were committed **before** the first proof deploy (the commit id).
4. Game dev, game prod and telemetry deploys each completed over the key: **no** `Using deprecated password-based SSH
   fallback` line, **no** password prompt, and `Accepted publickey for <user>` in that box's auth log at the deploy time.
   Date and version recorded for each.
5. The dev fallback deploy (step 9) succeeded; the recorded `ps` counts are `-p` = 0 and `-f` ≥ 1 (counts only); both key
   variables restored and the flag removed afterwards.
6. Worklog says whether the intermittent "Permission denied" with the correct password was seen again — during the key
   installs, the login checks or the deploys — and if so, when and on which box (no address).
7. Nothing written for this task names a host, address, key contents or password, and no `ps` line is pasted anywhere.

## Notes
- **Depends on:** 0441
- **Blocks:** 0442
- `0442`'s dependency was re-pointed from `0441` to this task on 2026-10-12 by the same owner ruling (see *Sprint*).
- Covers `0441`'s verification steps 1–4 and 7, which `0441` closed without (`✅ Done (agent-closed — not owner-verified)`);
  steps 5 and 6 (`npm test` green, runbook exists and names no host) were met at `0441`'s close.
- If a key-only check or a proof deploy fails, **stop**: do not start `0442`. Fix forward as a new task, or ask the owner.
- Sources: `0441` `brief.md`, `plan.md` (§(b) steps 2–8, §(c), owner decisions appended), `worklog.md` (decision 6),
  `review.md`; `docs/vps-deployment-guide.md` §7 — all read 2026-10-12.
