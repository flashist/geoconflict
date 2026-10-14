# Game and telemetry boxes: install an SSH key and switch their deploys to key login

> 🔁 **Scope widened 2026-10-12 to the TELEMETRY box** — see the 📌 ruling under *Sprint*. Title updated; the folder
> slug predates the widening and is kept so no link breaks. **The title is the scope.**

## ID
0441

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) is `0440`. `0441` and `0442` allocated in this run, in dependency
> order. No `tasks/*/0441*` or `tasks/*/0442*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"File it to the
> current sprint, and it should be our top priority to work on."* The producer split the request into two briefs (the
> standing smallest-shippable-unit rule): this one (key login works) and [`0442`](../0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md)
> (password login turned off). The split is the ordering: **0442 must never start before this one is proven.**

> 📌 **OWNER RULING, 2026-10-12 (later the same day), given live via `AskUserQuestion` in the `fkit lead` session**,
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim selection: **"Yes, add telemetry (Recommended)"** — option text: *"Same steps: key first, check it works, then
> password off. Same top priority."* ⇒ **The telemetry box is IN SCOPE of this task and of `0442`**, same order, same top
> priority. This **answers open question 4** below (struck there). The alert follow-up the same session asked for is
> [`0443`](../0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md).

## Priority
38

🚨 **TOP PRIORITY BY OWNER RULING (2026-10-12).** **Priority 38 is append rank, NOT a merit ranking — flagged for owner
confirmation.** ADR-035 forbids inserting a new row above closed rows, so it appends after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (37, `0440`). **On merit — and by the owner's ruling — this is
the first open work to pick up on the board**, directly above `0440`, because the game box takes ~260 password guesses an
hour and our own password logins already failed a production deploy.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder — ⚠️ **the box-side steps are EXECUTED BY THE OWNER (human)**: creating the key pair, putting the public half
on each box, and every deploy. The coder changes the deploy script and the runbook, and plans the order. A read-only
check over SSH (step 1) may be run by an agent session with the owner's OK given in-session.

## Context

**In plain terms.** Today we log into the game servers with a password. Bots are guessing that password all day. We
want to log in with a key file instead (much harder to guess, and it was the plan already). This task makes key login
work and proves it with a real deploy. **Password login stays ON in this task** — turning it off is `0442`, and only
after this task proves the key works, so we can never lock ourselves out.

**Facts on filing** (read-only check by `fkit-lead`, 2026-10-10; not re-checked by the producer):
- The game **production** box accepts password logins, including for root (`PermitRootLogin yes`,
  `PasswordAuthentication yes`). `MaxAuthTries 6`, `MaxStartups 10:30:100`.
- fail2ban is running there (installed by hand: `setup.sh` has no fail2ban section). That day: 3 addresses banned,
  226,875 failed attempts in total, 131 failed logins in 30 minutes (≈ 260 an hour of bot guessing).
- **Our own password logins were refused intermittently** — "Permission denied" with the correct password, accepted
  3 seconds earlier. This broke the first game deploy attempt on 2026-10-10 (the copy step). **Cause unproven.** Do not
  assume key login fixes it; record whether it recurs.
- **The dev box was not checked.** Whether it shares the pattern is step 1 of this task — check, don't assume.
- **Re-checked 2026-10-12** (read-only, `fkit-lead`, relayed; not re-checked by the producer): game production **3,151
  failed logins in the last 24 h**, **0 `authorized_keys`**, ufw inactive.
- **Telemetry box, 2026-10-12** (read-only, `fkit-lead`, relayed; not re-checked by the producer): `permitrootlogin yes`,
  `passwordauthentication yes`, **0 root `authorized_keys`**; fail2ban running (19,069 failed / 3,129 banned in total);
  **2,182 failed logins in the last 24 h**; ufw inactive. **All 65 accepted logins in the last 7 days were "password for
  root"** — so the telemetry deploy logs in as **root**, by password, today.
- **Profile box, for contrast:** already key-only (`prohibit-password`, password login off, 1 key) — the model to copy.
- Background: game, dev and telemetry box passwords were treated as leaked in April 2026
  (`ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md`).

**What already exists — reuse it, don't build a parallel path:**
- `deploy.sh` already supports key login: `SSH_KEY_<ENV>` (or `SSH_KEY`) in the env file; the user is `SSH_USER_<ENV>`
  (or `SSH_USER`), default `openfront`. Password login is already an opt-in fallback
  (`ALLOW_SSH_PASSWORD_FALLBACK[_<ENV>]`) that prints "deprecated, prefer SSH keys". `build-deploy.sh` calls `deploy.sh`
  and does no SSH of its own.
- Two gaps in `deploy.sh`'s auth block (around line 320–340), both already solved in `build-deploy-profile.sh`
  (~lines 485–545) — mirror that file:
  1. the password fallback passes the password **on the command line** (`sshpass -p`), where other local processes can
     read it; the profile and telemetry scripts use a 0600 password file (`sshpass -f`);
  2. the key path does not set `IdentitiesOnly=yes`, so the local SSH agent may offer other keys first — each counts
     as a failed try against `MaxAuthTries` and fail2ban, and can **ban the operator**. The profile script sets it for
     exactly this reason.
- `setup.sh` creates the `openfront` user and copies root's `authorized_keys` to it **only if** root has one and the
  user has none yet.
- The profile box already runs key-only (task `0221`, `setup-profile.sh` section *HARDENING SSHD*, key in
  `PROFILE_SSH_KEY`). That is the model for `0442`.
- **Telemetry deploy (`build-deploy-telemetry.sh`) already supports key login:** `TELEMETRY_SSH_KEY` (user
  `TELEMETRY_SSH_USER`); it warns *"TELEMETRY_VPS_PASSWORD is deprecated. Prefer TELEMETRY_SSH_KEY."*; password needs
  `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1`. Its password path **already** uses a 0600 file (`sshpass -f`) — gap 1 above
  does not apply. **Gap 2 does:** its key path (around line 299–301, read 2026-10-12) passes `-i` but **not**
  `IdentitiesOnly=yes`, so the same operator-ban risk exists there. Fix it the same way.

## What to build

1. **Check each box, read-only** — game prod, game dev, **and telemetry** (added 2026-10-12): effective sshd settings (`sshd -T`, including for the root user,
   since a `Match` block can override the global values), whether `authorized_keys` exists for root and for the deploy
   user, which user `deploy.sh` (or, for telemetry, `build-deploy-telemetry.sh`) logs in as, whether fail2ban runs. Record in the worklog, no
   addresses or secrets. This decides which boxes are in scope (open question 3).
2. **Key pair** (owner, on the owner's machine): one new key, type per open question 1. Private half never leaves the
   owner's machine and never enters the repo or any task file.
3. **Install the public half** on each in-scope box for the user the deploy logs in as (and for root if root logins are
   kept — open question 2). Prefer one owner-run command per box; the runbook gives it.
4. **Script fixes in `deploy.sh`** (and, for telemetry, `IdentitiesOnly=yes` on `build-deploy-telemetry.sh`'s key
   path — its password path is already file-based), mirroring `build-deploy-profile.sh`: `IdentitiesOnly=yes` on the key path; the
   password fallback moved from `sshpass -p` to a 0600 file (`sshpass -f`) removed on exit. Behaviour otherwise
   unchanged: key first, password only with the explicit fallback flag.
5. **Point the env file at the key**: `SSH_KEY_<ENV>` for each in-scope game environment, `TELEMETRY_SSH_KEY` for
   telemetry (operator-local `.env`, never
   committed). Leave the password values in place until `0442` is done — they are the way back if the key fails.
6. **Prove it with a real deploy over the key** — dev first, then prod in the owner's weekend slot (standing rule),
   unless the owner rules prod sooner given the risk. The deploy log must show no password-fallback warning.
   **Telemetry:** one real `build-deploy-telemetry.sh` run over the key, with no *"Using deprecated password-based SSH
   fallback"* line. Telemetry deploys log in as root today — root stays the user unless the plan shows a reason.
7. **Runbook**: write down how to deploy with the key, how to add/replace a key, and where the private half lives
   (place, not contents), for the game boxes **and telemetry**. Put it where each deploy is documented today (the plan finds it; if none exists, a short
   section in the weekend-deploy runbook).

**Out of scope:** turning password login off (`0442`); the profile box (already key-only); ~~the telemetry box (open
question 4)~~ **now in scope, owner ruling 2026-10-12**; changing fail2ban or `MaxStartups` settings; login alerts
(`0443`).

## Verification steps

1. Worklog records step 1 for each box: the settings listed there, plus which boxes are in scope and why.
2. `ssh` with **only** the new key (`-o IdentitiesOnly=yes -o PasswordAuthentication=no`) logs into each in-scope box
   as the deploy user — run from a fresh terminal.
3. A full game deploy to dev, then to prod — **and one telemetry deploy** — completes over the key; its log has **no** "password-based SSH fallback"
   line. Record date and version.
4. Running `deploy.sh` with the fallback flag and no key still works, and the password does not appear in the local
   process list during the run (check with `ps` while it runs). Cheapest test: dev.
5. `npm test` green (the deploy hardening harness greps several deploy scripts — if `deploy.sh` is added to its
   checks, keep it green).
6. Runbook section exists and names no host, address, key contents or password.
7. Worklog says whether the intermittent "Permission denied" was seen again during these deploys.

## Notes
- **Depends on:** nothing
- **Blocks:** 0442
- **Never lock ourselves out:** this task only ADDS a way in. Password login and the password values stay until `0442`.
- **Open questions for the owner** (recommended default first; plain-language context for whoever relays them):
  1. **Key type.** *Recommended: one new `ed25519` key used only for the game boxes, protected by a passphrase held in
     the macOS keychain/ssh-agent.* `ed25519` is the modern default: short, fast, strong. A separate key from the profile
     box means losing one does not open the other. A passphrase means a stolen laptop file alone is not enough to log
     in. Alternative: reuse the profile box's key (one less thing to manage, wider blast radius).
     **Telemetry (added 2026-10-12):** same choice applies. *Recommended: its own separate key, same type*, so one lost
     key opens one box role only.
  2. **Root login after `0442`.** *Recommended: key-only for root (`prohibit-password`), same as the profile box.* Root
     keeps working with the key; no password can ever log in as root. Alternative: no root login at all — safer, but
     needs a check that the deploy user can do everything `update.sh` needs without root. Asked here because it decides
     whether step 3 also installs the key for root. ⚠️ **Telemetry deploys log in as root today**, so for telemetry the
     recommended answer keeps working as-is; "no root login at all" would also mean moving its deploy to another user.
  3. **Which game boxes.** *Recommended: production and dev, if step 1 shows dev also allows passwords.* Dev is the cheap
     place to prove the steps first. Alternative: production only. (Telemetry is in scope regardless — owner ruling
     2026-10-12.)
  4. ~~**Telemetry box.** It has the same "password is deprecated, prefer keys" fallback. *Recommended: not in this task;
     file a follow-up after `0442`, once the steps are proven.*~~ ✅ **ANSWERED 2026-10-12 by owner ruling: telemetry is
     IN this task and `0442`** (*"Yes, add telemetry (Recommended)"*). The recommendation printed here was overruled by
     the owner's later, recommended option.
- Sources: `fkit-lead` read-only check 2026-10-10 (relayed); `deploy.sh`, `build-deploy-profile.sh`, `setup.sh`,
  `setup-profile.sh` read 2026-10-12; `fkit-lead` read-only check of game prod, telemetry and profile 2026-10-12
  (relayed); `build-deploy-telemetry.sh` read 2026-10-12.
