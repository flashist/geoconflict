# Verify 0442 on the boxes — pre-checks, then turn password login off on game dev and telemetry now, game prod in the weekend slot

## ID
0452

> ℹ️ **ID allocation, checked 2026-10-13 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0451`. `0452`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/` (other than `0442`'s close note, written in the same run), and no
> `tasks/*/0452*` path in any branch's history. Allocated with `0453` in one run, in this order.

## Sprint
Sprint 9

> 📌 **2026-10-16 — was Sprint 8, now Sprint 9.** Relocated by `/fkit-sprint-done` at the Sprint 8 close (agent-closed — not owner-verified), on the OWNER RULINGS given 2026-10-16 in a Claude Code session, relayed by it to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Typed by the owner, verbatim *"Can we move all the tasks tha require wait for certain time to Sprint 9?"*; then live `AskUserQuestion`: *"Move all 5 waiting tasks (0452, 0449, 0385, 0219, 0213) to Sprint 9 — and close Sprint 8?"* → **"Move all + close Sprint 8 (Recommended)"**; *"Where should the 5 go on Sprint 9?"* → **"At the top (Recommended)"** — option text: *"They finish within about 24 hours, so they go first: 0385 → 0219 → 0213, then 0452, 0449, then 0469, 0343, 0455."*. The [Sprint 8](../../../sprints/done/plan-sprint-8.md) row stays as a `➡️ Moved` pointer. Not a close of this task.

*(Earlier value, kept as history — true until 2026-10-16:)* ~~Sprint 8~~

> 📌 **OWNER RULING, 2026-10-13, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Verbatim selection: **"Sprint 8 (Recommended)"** — option text: *"Same as 0445: you
> already ruled dev + telemetry go out now, so the verify task sits in this sprint. Bends the 'next sprint' rule for this
> case only."*
>
> ⚠️ **This explicitly bends, for this case only, the standing build/verify-split rule (owner ruling 2026-09-29)** that a
> verify task goes to the top of the **next** sprint — as the same kind of ruling did for `0441` → `0445`, `0443` →
> `0449` and `0447` → `0450`. Not a change to the standing rule.

## Priority
4

> 📌 **2026-10-16 — was 46 (Sprint 8), now 4 (Sprint 9).** ✅ **OWNER-RULED placement** — *"At the top (Recommended)"* (order `0385` → `0219` → `0213` → `0452` → `0449`, then `0469`, `0343`, `0455`); the mover had appended it at 7 (ADR-035). The text below is Sprint 8 history, kept as written.

~~46~~ *(Sprint 8 rank — history)*

🚨 **On merit this is the FIRST OPEN WORK on the board** (`0442` was the owner's top priority, ruling 2026-10-12).
⚠️ **Priority 46 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~. ✅ **Merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion` in the main session, relayed by the main session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Rank number unchanged (ADR-035). See the 2026-10-15 four-rulings addendum on the [Sprint 8 board](../../../sprints/done/plan-sprint-8.md).
**On merit this belongs directly above `0449`**, because `0449` and `0450` both deploy the game boxes (and `0449` the
telemetry box too), and once `0442`'s code is committed any such deploy turns password login off — so this task's
pre-checks must come first. ADR-035 forbids inserting a new row above closed rows, so it appends after the highest
(45, `0451`).

## Status
✅ Done (agent-closed — not owner-verified)

*(Status until 2026-10-15, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** Every box step, the commit, every deploy and the env-file edits are
the owner's hands. **Agent SSH to the boxes was DENIED by the permission classifier in `0445`**, so the read-only batches
(pre-check P4, the `sshd -T` checks, the fail2ban counts) are run by the owner, who pastes the output **with addresses
removed**. An agent guides, reads the pasted output and writes the worklog.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0445` /
`0450`.)*

## Context

**In plain terms.** `0442` built the code that switches SSH password login off on the two game boxes and the telemetry
box. It closed with nothing done on any box. This task does the box side: first the safety checks (a way back in if
something goes wrong), then one deploy per box, which applies the change, then proof from a fresh terminal that a
password is refused and the key still works. Game dev and telemetry go now; game prod waits for the weekend slot because
its deploy restarts the game and drops players in matches.

**The build:** [`0442`](../../done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md) —
its `plan.md` § *Steps — live* (P1–P5, per-box steps 1–5, *After all 3 pass*) is the source of this brief, **with its
§ *Owner decisions* overriding it** (below). Runbook: `docs/vps-deployment-guide.md` §7 *Password login is off (task
0442)* and §8. Key login itself was proven on all three boxes by
[`0445`](../../done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md).

**Owner rulings that shape this task** (2026-10-13, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session,
recorded in `0442`'s `plan.md` § *Owner decisions*):
- **Q1 — "Change deploy.sh (Recommended)":** the game root step runs whenever a key is set; only its alerts part is
  skipped while `PROFILE_SSH_ALERT_TOKEN` is blank. ⇒ **A game deploy ends with exit 3 until `0449` sets the token —
  that is expected here.** Record that `OK sshd` was printed (and `SKIPPED ssh-alerts`).
- **Q2 — "Dev+telemetry now, prod weekend (Recommended)":** game dev and telemetry as soon as the code is committed;
  game prod in the owner's weekend slot, with the next release or a same-version redeploy.
- **Q3 — "Keep passwords, drop switches":** the password lines stay in the env files. Delete **only**
  `ALLOW_SSH_PASSWORD_FALLBACK` from `.env.prod.secret` and `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK` from
  `.env.telemetry.secret` — **by variable name, never printing a value**. (`.env.dev.secret`'s switch was already
  commented out by `0445`; confirm with a names-only check.) **Keep** `VPS_PASSWORD` and `TELEMETRY_VPS_PASSWORD`.
  **No root-password rotation.** Pre-check P3 is still required: the root password is the provider-console login.
  ⚠️ This **replaces** the plan's *"Retire the env-file passwords"* bullet, which named more variables.

🚨 **Once `0442`'s code is committed, ANY key deploy applies the hardening — password login off — including a deploy made
for another task.** Game boxes: `deploy.sh`'s root step runs `setup-game-host.sh`'s sshd section on every key deploy.
Telemetry: `setup-telemetry.sh`'s sshd section (checked 2026-10-13, `setup-telemetry.sh:1311-1337`) runs on every key
deploy. ⇒ **Pre-checks P1–P4 must be done before the first game or telemetry deploy after the commit** — whichever task
that deploy is for. This touches:
- [`0449`](../../backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md) —
  deploys profile → telemetry → game dev → game prod;
- [`0450`](../../done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md)
  — deploys game dev.

  A `0449`/`0450` deploy **may double as this task's step 2 for that box**, but only if P1–P4 passed first and terminal A
  (step 1) is open. The profile box is not affected (its own hardening is `0221`'s, and `setup-profile.sh` is untouched).

**Traps — keep them in view:**
- **Telemetry is unreachable while the full-tunnel VPN is on** (turn it off, or add the `/32` bypass route). Docker Hub
  pulls may need the VPN **on** — do any pulls first, then turn the VPN off for the box steps.
- **Do not deploy a box again after a failed step 3 until the cause is fixed** — the next deploy re-applies the hardening.
- **A dropped session is not a lock-out yet:** the reg.ru web console (VNC) logs in as root with the root password, and
  it is not SSH, so this change does not affect it. That is why P1 must be proven first.
- **Self-ban:** ad-hoc logins with several keys in the agent use up fail2ban tries — use `-i <key> -o IdentitiesOnly=yes`
  (runbook §7 advises a `Host` block).
- **The daily alert "failed logins" count will drop sharply** after this change — expected, not a fault (runbook §8).

## What to build

*(Nothing in the repo. Every step is a check or an owner action on the boxes / the owner's Mac.)*

**Pre-checks — all must pass before anything changes. Record dates only.**
- **P1** — the reg.ru web console was opened **and logged into as root** for each of the three boxes.
- **P2** — both private keys (game, telemetry) **and** their passphrases are backed up in the password manager.
- **P3** — each box's root password is in the password manager (it is the console login).
- **P4** — read-only, **one key session per box**, owner runs, output pasted with addresses removed:
  `cat /etc/ssh/sshd_config.d/50-cloud-init.conf`; `ls -la /etc/ssh/sshd_config.d/`; `grep -n '^Include'
  /etc/ssh/sshd_config`; `systemctl is-active ssh.service ssh.socket`; `sshd -T` filtered to
  `passwordauthentication|permitrootlogin|kbdinteractiveauthentication|maxauthtries`; `fail2ban-client status sshd`
  filtered to the `Currently|Total` count lines. **Expected:** the `Include` line is present; `ssh.service` is active;
  `50-cloud-init.conf` most likely sets `PasswordAuthentication yes` (the `00-` drop-in beats it). **STOP** if there is
  any `Match` line, or any file that sorts before `00-`.
- **P5** — `0442`'s changes are committed by the owner (the telemetry deploy refuses uncommitted shipped files; the game
  deploy ships the working tree). Record the commit id.

**Per box — game dev, then telemetry (now); game prod (weekend slot):**
1. **Terminal A:** `ssh -i <key> -o IdentitiesOnly=yes root@<box>`. **Leave it open** until step 4.
2. **Terminal B — the deploy.** Game: `./deploy.sh dev|prod <image tag>` (a same-version redeploy is fine). Telemetry:
   `npm run deploy:telemetry`. Expected: the `✅ sshd: … (global + root-effective)` lines, then `OK sshd` (game) / the
   telemetry "sshd hardened" line. Game exit code: 0 if the token is set, otherwise **3** with `SKIPPED ssh-alerts` and
   `OK sshd` (Q1 — expected).
3. **Terminal C, new:** the key login works (runbook §7 `KEY-OK` check); a password is refused —
   `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password,keyboard-interactive root@<box>` →
   `Permission denied (publickey)`. From A: `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` show
   `passwordauthentication no` and `permitrootlogin without-password` (= `prohibit-password`).
4. **Only then close A.** If C fails: from A, `rm -f /etc/ssh/sshd_config.d/00-geoconflict-hardening.conf && systemctl
   reload ssh`, re-check `sshd -T`. If every session is lost: the same from the reg.ru console. Then stop and file the
   cause as a task.
5. **A few hours later:** `fail2ban-client status sshd` (count lines only) shows the jail up and "Total failed" higher than
   the P4 value. If it has stalled, record it and file a follow-up (changing fail2ban settings is out of scope).

**After all three boxes pass — the Q3 switch removal** (owner, or an agent with the owner's OK given in-session), as the
plan orders it: delete `ALLOW_SSH_PASSWORD_FALLBACK` from `.env.prod.secret` and `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK`
from `.env.telemetry.secret`. By variable name, never printing values; confirm with a **names-only** inventory that also
shows `VPS_PASSWORD` / `TELEMETRY_VPS_PASSWORD` still present and `.env.dev.secret`'s switch not active. *(The plan puts
this after all three; since prod waits for the weekend, the telemetry switch stays until then. Removing it earlier is
the owner's call, not this brief's.)*

**Out of scope:** any repo change (a defect found here is filed as its own task); the profile box (`0221`; its key-path
gap is `0453`); setting the alert token (`0449`); fail2ban and `MaxStartups` settings; removing the fallback code paths;
rotating any password.

## Verification steps

*(These are `0442`'s verification steps 1–5 and 7, which `0442` closed without; its step 6 — harness + `npm test` — was
met at close.)*

1. **(V1)** Worklog records P1 for each of the three boxes (console opened and logged into as root — date only), and P2 /
   P3 confirmed (date only).
2. Worklog records P4 for each box (address-free), and that no STOP condition was hit; and P5's commit id **before** the
   first deploy.
3. **(V2)** For each box, from a **new** terminal: password login refused with `Permission denied (publickey)` for root
   (on the game boxes root is the deploy user — if step 3 shows otherwise, check the deploy user too); key login
   (`KEY-OK`) succeeds. Date recorded per box.
4. **(V3)** `sshd -T` and `sshd -T -C user=root,…` show `passwordauthentication no` and `permitrootlogin
   without-password` / `prohibit-password`, per box.
5. **(V4)** A full deploy over the key completed on game dev, telemetry and game prod (date and version each). Game:
   `OK sshd` seen; exit 0, or exit 3 with `SKIPPED ssh-alerts` while `0449`'s token is unset — say which.
6. **(V5)** Per box, `fail2ban-client status sshd` shows the jail up and "Total failed" higher a few hours after the change
   than at P4 (counts only).
7. Names-only inventory after the Q3 removal: `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK` gone from `.env.telemetry.secret`,
   `ALLOW_SSH_PASSWORD_FALLBACK` gone from `.env.prod.secret`, `.env.dev.secret`'s switch not active, password lines still
   present. No value printed anywhere.
8. **(V7)** Nothing written for this task names a host, address, key contents or password; a grep of the tracked files
   finds none.

## Notes
- **Depends on:** 0442
- **Blocks:** 0449 (its telemetry and game deploys only — its profile-box steps may run first), 0450 — only until this task's pre-checks P1–P4 pass, not until it closes (added 2026-10-13; `0449` narrowed 2026-10-13)
- **`0449` profile-box carve-out (2026-10-13):** `0449`'s profile-box steps may run before P1–P4 — this task never
  touches the profile box (*Context*). OWNER RULING 2026-10-13, live `AskUserQuestion` in the `fkit lead` session,
  relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel); ⛔ not producer precedent. Verbatim:
  *"Let the profile step go first (Recommended)"* — option text: *"Only 0449's profile-box step may run before 0452's
  checks; its game and telemetry deploys still wait. Small brief edit."*
- ⚠️ **~~Ordering, not a formal block~~ — now a formal block (2026-10-13):** `0449` and `0450` deploys after `0442`'s
  commit apply this hardening (see *Context*). The open owner question raised at `0442`'s close is **answered**: both
  briefs now list `0452` in *Depends on* — for **pre-checks P1–P4 only**, not for this task's close (the game prod half
  waits for the weekend slot, and `0449`/`0450` must not be stuck behind it). A `0449`/`0450` deploy may still count as
  this task's step 2 for that box once P1–P4 passed and terminal A is open (*Context*). OWNER RULING 2026-10-13, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned
  `fkit-producer` (no owner channel); ⛔ not producer precedent. Verbatim: *"Yes, make them wait (Recommended)"* —
  option text: *"Add 0452 to 0449's and 0450's 'Depends on'. Tiny edit, easy to undo. Their deploys can still count
  as 0452's deploy for that box once the checks pass."*
- **Game prod is time-gated** (weekend slot, Q2): this task stays open between the dev/telemetry half and the prod half.
  If the owner prefers, the prod half can be split into its own task then.
- If a pre-check fails or step 3 fails on any box, **stop**: do not continue to the next box. Fix forward as a new task,
  or ask the owner.
- For `0446`: the sshd item already landed in `setup-game-host.sh` (by `0442`), so `0446` only checks it is there.
- Sources: `0442` `brief.md`, `plan.md` (§ *Steps — live*, § *Verification mapping*, § *Owner decisions* Q1–Q4),
  `review.md` (closed out); `0445`, `0449`, `0450` briefs; `setup-telemetry.sh` §*SSHD HARDENING (0442)*;
  `docs/vps-deployment-guide.md` §7–§8 headings — all read 2026-10-13.
- **No secrets, hostnames or addresses** in the worklog or any note — names, dates and counts only.
