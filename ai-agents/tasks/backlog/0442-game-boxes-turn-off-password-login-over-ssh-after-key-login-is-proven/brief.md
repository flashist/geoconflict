# Game and telemetry boxes: turn off password login over SSH, after key login is proven

> 🔁 **Scope widened 2026-10-12 to the TELEMETRY box** — see the 📌 ruling under *Sprint*. Title updated; the folder
> slug predates the widening and is kept so no link breaks. **The title is the scope.**

## ID
0442

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Allocated with `0441` in one run, in dependency order (`0440`
> was the highest existing ID).

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"File it to the
> current sprint, and it should be our top priority to work on."* Second half of the producer's split; first half is
> [`0441`](../0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md).

> 📌 **OWNER RULING, 2026-10-12 (later the same day), given live via `AskUserQuestion` in the `fkit lead` session**,
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim selection: **"Yes, add telemetry (Recommended)"** — option text: *"Same steps: key first, check it works, then
> password off. Same top priority."* ⇒ **The telemetry box is IN SCOPE here**, after `0441` proves key login on it.

## Priority
39

🚨 **TOP PRIORITY BY OWNER RULING (2026-10-12), second in line after `0441`.** **Priority 39 is append rank, NOT a merit
ranking — flagged for owner confirmation.** ADR-035 append position after `0441` (38). **On merit this belongs directly
below `0441`** — where it sits — because it cannot start until `0441` has proven key login on every in-scope box.

## Status
🔲 Backlog

## Owner
fkit-coder — ⚠️ **every change on a live box is EXECUTED OR APPROVED BY THE OWNER (human).** The coder writes the
hardening step (script or exact commands), its guards and rollback, and the runbook. The owner runs it, with a second
terminal and the hosting provider's web console ready.

## Context

**In plain terms.** Once `0441` proves we can log in with a key, we switch password login off. After that, guessing the
password is useless — bots can keep knocking but there is nothing to guess. The danger is locking **ourselves** out, so
this task is mostly about doing it in a safe order with a way back.

**Facts on filing:** see `0441`'s *Context* (the production game box allows password and root password login; ~260 bot
guesses an hour; fail2ban running; dev box not yet checked). **Telemetry, 2026-10-12:** same pattern — root and
password login on, 0 root keys, ~2,182 failed logins a day, fail2ban running, ufw off, and every recent accepted login
was root by password (details in `0441`).

**Model to copy:** the profile box was hardened the same way in task `0221` — `setup-profile.sh`, section *HARDENING
SSHD*. Read it before planning. It already solves the traps:
- a drop-in file named `00-…` in `/etc/ssh/sshd_config.d/` so it wins over the cloud image's own files;
- a `Match all` block, because cloud images ship `Match User root` blocks that turn password login back on for root
  (seen on the profile box);
- guards that **refuse** to switch off passwords if the deploy itself came in by password, or if no key is installed;
- reload, then check the **effective** settings (`sshd -T`, also for the root user); if not in effect, restore the
  previous file and reload;
- the check is made **from a new session while the first one stays open** (weekend-deploy runbook, step W4).

## What to build

1. **Gate:** `0441` closed, its verification shows a key-only login and a full deploy over the key on every in-scope box
   (game boxes **and telemetry**).
   If not, stop.
2. **Choose how the change is applied** (open question 1): baked into `setup.sh` — and `setup-telemetry.sh` for the
   telemetry box — the way `0221` did it for the profile box (repeatable, re-applied if the box is rebuilt), or a one-off owner-run step written in the runbook. Either way,
   the same guards and rollback as `0221`.
3. **The settings:** password login off, keyboard-interactive off, empty passwords off, key login on; root login per
   `0441` open question 2 (recommended: `prohibit-password`, key-only). Keep `MaxAuthTries` as is unless the plan shows a
   reason.
4. **Rollback path, written before the change:** (a) the open first session can restore the previous file and reload;
   (b) if every session is lost, the hosting provider's web console (VNC) still logs in with the root password —
   **check that this console works and the owner can reach it, before the change**. Note: the console login is not SSH,
   so this change does not affect it.
5. **Apply** — game dev first, then game prod and telemetry, in the owner's weekend slot unless the owner rules sooner.
   (Telemetry has no dev twin; it goes after game dev has proven the steps.)
6. **fail2ban still fine** after the change: the jail is up and still counting failed attempts (failures will now read
   as key failures).
7. **Retire the password fallback for these boxes:** remove the game-box password values from the operator env file once
   both boxes pass, and note in `deploy.sh`'s fallback message that the game boxes no longer accept passwords (as the
   profile script already says for its box). **Telemetry:** remove its password value(s) from the operator env file and
   say the same in `build-deploy-telemetry.sh`'s fallback message. Rotating the root password is not needed for safety once SSH ignores it,
   but it is still the console login — owner decides (open question 2).
8. **Runbook:** the steps above, the rollback, and how to get back in through the provider console.

**Out of scope:** the profile box (already done in `0221`); ~~the telemetry box (see `0441` open question 4)~~ **now in
scope, owner ruling 2026-10-12**; changing fail2ban or `MaxStartups` settings; login alerts (`0443`).

## Verification steps

1. Before the change: worklog records that the provider console was opened and logged into for each box (date only).
2. After the change, from a **new** terminal, for each box: a password login is refused (`Permission denied
   (publickey)`), for the deploy user **and** for root; a key login succeeds.
3. `sshd -T` and `sshd -T -C user=root,…` show password login off and the chosen root setting.
4. A full game deploy to each game box, and a telemetry deploy, completes over the key.
5. `fail2ban-client status sshd` shows the jail up; the failed-attempt counter still grows over a few hours.
6. If done in `setup.sh` / `setup-telemetry.sh`: the deploy hardening harness covers the new section in each (as it does
   for `setup-profile.sh`) and `npm test` is green.
7. Runbook names no host, address, key contents or password.

## Notes
- **Depends on:** 0441
- **Blocks:** nothing
- **Open questions for the owner** (recommended default first):
  1. **How to apply.** *Recommended: in `setup.sh`, copying `0221`'s section, so a rebuilt box comes back hardened and the
     deploy test checks it.* Alternative: a one-off command list in the runbook — quicker, but a rebuilt box would come
     back with passwords on.
  2. **Root password after the change.** *Recommended: keep it, stored in the password manager, as the provider-console
     way in; SSH will ignore it.* Alternative: rotate it at the same time.
- Root-login policy and which boxes: decided in `0441`'s open questions 2 and 3; this task follows them. Telemetry is in
  scope by owner ruling 2026-10-12.
