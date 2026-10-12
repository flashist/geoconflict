# Game boxes (prod + dev): rebuild from scripts alone — move the hand-set-up parts into the every-deploy root step

## ID
0446

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0445`. `0446`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0446*` path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer
> precedent.** While planning `0443`, the owner wrote, verbatim: *"I can run it, but what I am worried is that if in the
> future we need to re-deploy the server or to restore it from backup, this procedure (and maybe other manual procedures)
> can be forgotten, ideally, everything should be set-up out of the install/update scripts, is it possible?"* — then
> selected for `0443` **"Way A: every deploy, root step (Recommended)"**: *"deploy.sh makes one extra root login (by key)
> and runs a light, safe-to-repeat setup step that installs or updates the watcher. Fully automatic, nothing to
> remember."* On the follow-ups the owner multi-selected only **"Game box setup from scripts only"** — option text:
> *"Move the hand-installed bits (fail2ban, later 0442's sshd settings) into the new every-deploy root step, so a rebuilt
> box needs no manual steps. Your concern from Q6."* ⇒ this brief, on the **Backlog board** (no sprint was named).
>
> **Not filed, by the same selection** (the owner did not tick them): a separate fail2ban + ufw item, and an
> `example.env.profile` address cleanup.

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder — ⚠️ **every change on a live box is EXECUTED OR APPROVED BY THE OWNER (human)**, in the weekend deploy slot
unless the owner rules sooner. The read-only survey (step 1) may be run by an agent session **with the owner's OK given
in-session** (standing rule: read-only checks are run, not handed over).

## Context

**In plain terms.** Some of what protects the game boxes today was put there by hand and is written down nowhere a
script can repeat it. The clearest case: **fail2ban** (the guard that bans password guessers) runs on game prod, but
`setup.sh` has no fail2ban section — so if we rebuild the box, or restore it from a provider backup onto a fresh image,
it comes back **unguarded**, and nothing reminds us. `0443` adds a small root setup step that runs on **every** game
deploy and is safe to repeat. This task moves the hand-made parts into that step, so that **one `setup.sh` run + one
normal deploy** brings a rebuilt box to the full intended state, with nothing to remember.

**Facts on filing** (relayed or read 2026-10-12; not re-checked on the boxes by the producer):
- **fail2ban on game prod was installed by hand** — `setup.sh` has no fail2ban section (`0441`, `0443` *Context*).
  Whether game **dev** has it at all is not recorded.
- **`setup.sh` is one-time provisioning and no deploy re-runs it** (its own header comment, and `0262` *Context*). So a
  setting added there reaches a box only when the box is set up from scratch — not an existing box, and not a fix later.
- **The game deploy logs in as the deploy user (default `openfront`), not root** (`deploy.sh`, `REMOTE_USER`). `update.sh`
  only swaps the container. Today nothing that runs on every deploy has root.
- **`0443` introduces the every-deploy root step** (owner ruling above): one extra root login by key, then a light,
  safe-to-repeat setup. This task **adds to that step; it does not build it.**
- **Root login by key** comes from `0441` (repo side, done) and `0445` (keys installed on the boxes, incl. for root, by
  `0441` Q2). After `0442`, root is key-only.
- **ufw is inactive on game prod** (`0442`/`0443` *Context*). That is not a hand-made setting — it is simply not on. See
  open question 2.
- **The profile box is the model.** `setup-profile.sh` (task `0221`) already does all of this on every deploy:
  `unattended-upgrades` (security only, auto-reboot off), a fail2ban sshd jail with a fail-closed check, the sshd
  hardening drop-in with its guards and rollback, and ufw. Read it before planning; copy, don't reinvent.
- **Container log retention already ships per deploy** (`update.sh`, task `0060`); the old untracked
  `/etc/docker/daemon.json` on the game box is the kind of hand-made file this task looks for
  (`container-log-retention.md`).

**Conflicts and overlaps — flagged, not resolved here:**
- ⚠️ **`0443`'s brief still lists "adding fail2ban to `setup.sh`" as out of scope and flags it in its Notes.** That flag is
  now this task. `0443`'s brief was not edited by this filing (instruction) — a producer should point that line here.
- ⚠️ **`0442` open question 1 ("how to apply": bake into `setup.sh` the way `0221` did, or a one-off runbook step) is
  overtaken** by the owner's selection above, whose option text says `0442`'s sshd settings go into the every-deploy root
  step. `setup.sh` alone would not reach the existing boxes (it is never re-run). See open question 1 for the order.
- `0262` (game box otel-collector: wrong exporter target, unrotated log) and `0290` (`setup.sh` uses `apt`) also touch
  game-box setup. Not in scope; the root step may become their natural home — note it in the plan, do not fix them here.

## What to build

1. **Survey first, read-only — on BOTH game boxes (prod and dev).** Compare each box against what `setup.sh`,
   `update.sh` and `0443`'s root step would produce, and list everything that is present on the box but made by no
   script. At least: fail2ban (installed? which jail? its settings — ban time, retry count, find time — **values of
   settings only; never the `ignoreip` list or any address**); the sshd config and its drop-ins (setting names and
   values, as `sshd -T` reports them); `unattended-upgrades` (installed? configured how?); ufw state; any
   `/etc/docker/daemon.json`; root and deploy-user crontabs and `/etc/cron.d/` entries; logrotate files outside the
   package defaults; systemd units or timers not from a package; sysctl settings that should survive a reboot (note:
   `setup.sh` sets swap tuning with `sysctl -w`, which does not survive one — confirm on the box). Record in the
   worklog — **names, states and setting values only; no host, address, user list or secret.**
2. **Decide the list with the owner, before planning.** For each survey finding: (a) move into the root step,
   (b) leave as is and write it down in the runbook, or (c) remove from the box. **If the survey finds more than a few
   small items, the producer splits the extra ones into their own briefs** — this task keeps fail2ban, the sshd
   settings and anything small.
3. **Plan (`/fkit-plan-task`), owner approves before any edit.**
4. **fail2ban into the root step.** Install if missing; write the sshd jail from the repo so it **matches what game prod
   runs today** (same ban behaviour — not a new policy); enable and start it; check the jail is up. Any address the jail
   must never ban (an allow list) comes from the operator env file, **never a tracked file**. What happens when the
   check fails follows open question 3.
5. **sshd settings in the root step** — per open question 1 (either `0442` builds them there, or this task moves them
   there). Same guards and rollback as `0221`/`0442`: drop-in named `00-…`, a `Match all` block, refuse when the deploy
   itself came in by password or no key is installed, check the **effective** settings, restore the previous file if
   not in effect.
6. **Every other item the owner chose in step 2** — the same way: safe to run twice, no change when already right, and
   says plainly in the deploy output what it changed.
7. **`setup.sh` and the runbook.** A rebuilt box: run `setup.sh` once, then one normal deploy. Write that as the
   documented rebuild path (`docs/vps-deployment-guide.md`), and list the **few steps that cannot be scripted** (making
   the box at the provider, installing the first key, DNS) so nothing else is left to memory. Names no host, address,
   key contents or secret.
8. **Tests.** The deploy hardening harness (`tests/scripts/profile-deploy-hardening.test.sh`) gets structural checks
   for each new root-step section, as it has for `setup-profile.sh`. Any new shell harness is registered in
   `tests/scripts/ShellHarnesses.test.ts`. `npm test` green.

**Out of scope:** the profile and telemetry boxes (their deploys already run a root setup every time); building the root
step itself (`0443`); the login/fail2ban alerts (`0443`); key install and proof (`0441`/`0445`); turning password login
off as a security change in its own right (`0442` — this task only gives its settings a home that a rebuild repeats);
changing fail2ban's ban policy; `0262` and `0290`; making the box itself at the provider (no Terraform/cloud-init — by
design, as for the profile box).

## Verification steps

1. Worklog records the step 1 survey for **both** game boxes and the owner's step 2 decision for every finding — names,
   states and setting values only, no address or secret.
2. **Safe to repeat:** two deploys in a row to game dev; the second reports no change in any root-step section, and
   the game comes up as normal.
3. **Puts it back:** on game dev, the owner removes fail2ban (package and jail) and, if `0442`'s settings are in the
   step, removes the sshd drop-in; one normal deploy restores both; `fail2ban-client status sshd` shows the jail up and
   `sshd -T` (also for root) shows the intended settings. Repeat for each other item moved in step 6.
4. **Rebuild proof** — per open question 4. Recommended: game dev rebuilt from a clean provider image, then `setup.sh`
   once and one deploy, and the survey from step 1 re-run shows **no difference** from the intended state. Date and
   version recorded.
5. Game prod: one normal deploy carries the root step; the survey re-run on prod matches the intended state, and the
   jail's ban behaviour is unchanged from before (same settings as recorded in step 1).
6. Failure path, per open question 3: on dev, make the fail2ban check fail on purpose (owner); the deploy behaves as
   chosen (stops before the container swap, leaving the old game running — or warns loudly and continues).
7. `npm test` green; the hardening harness covers each new section; any new harness is registered.
8. Nothing written for this task names a host, address, key contents, password or the jail's allow list.

## Notes
- **Depends on:** 0443
- **Blocks:** nothing
- **Related:** `0442` (its sshd settings land in the root step — see open question 1); `0445` and `0441` (root login by
  key, which the root step needs); `0221` (the profile box model); `0262`, `0290` (other game-box setup gaps, not in
  scope); `0060` / `container-log-retention.md` (why a hand-made `daemon.json` matters).
- ⚠️ **Build/verify split (owner ruling 2026-09-29):** verification 3–6 need a deploy and the owner's hands. When the
  build is done, close it and file a verify task at the top of the next sprint, as for `0441` → `0445`.
- ⚠️ **One task, not split up front**, because the owner selected one item and the list beyond fail2ban and the sshd
  settings is unknown until the survey. Step 2 is the split point: extra findings become their own briefs.
- **Open questions for the owner** (recommended default first; plain-language context so whoever relays them needs
  nothing more):
  1. **Who puts the sshd settings into the root step — `0442` or this task?** `0442` turns password login off. It is
     queued after `0445`; this task waits on `0443`. Whichever ships first decides where the code lives.
     *Recommended: if `0443`'s root step exists when `0442` is planned, `0442` writes its settings straight into that
     step (one move, no rework), and this task only checks they are there. If `0442` goes first, it does its change the
     way its plan chooses and this task moves it into the step later.* Alternative: always do it here — simpler to
     describe, but `0442`'s work gets moved twice.
  2. **ufw (the box's own firewall) — turn it on in this task?** It is off on game prod today. It was never set up by
     hand, so it is not really "a forgotten step" — it is a new protection, and turning on a firewall on the live game
     box can cut off players if one port is missed. The owner did not tick a separate fail2ban + ufw item.
     *Recommended: not in this task; the survey records ufw's state, and the owner can file it later.* Alternative: add
     it here, copying the profile box's rules (allow SSH, 80, 443 only).
  3. **If the root step fails (for example fail2ban will not start), does the game deploy stop?** `0221` made the
     profile deploy refuse to finish. On the game box a stop means a release does not go out. *Recommended: follow
     whatever `0443`'s plan sets for its root step; if it set nothing, stop the deploy **before** the container swap, so
     the old game keeps running and the problem is loud.* Alternative: warn loudly and continue — releases never block,
     but a box can stay unguarded until someone reads the output.
  4. **How do we prove "nothing to remember"?** Only a real rebuild tests it: anything we forgot to script shows up as
     missing. *Recommended: rebuild game **dev** from a clean provider image (owner, any day — dev has no players), run
     `setup.sh` once and one deploy, re-run the survey.* Cost: some downtime on dev, one new TLS certificate, and the key
     must be installed again (that is one of the few steps listed as not scriptable). Alternative: only the
     remove-and-restore check (verification 3) — cheaper, but it only proves the parts we already thought of.
- Sources: owner rulings 2026-10-12 (relayed); `0441`, `0442`, `0443`, `0445` briefs; `setup.sh` header and sections;
  `update.sh`; `deploy.sh` (`REMOTE_USER`, ssh/scp lines); `docs/vps-deployment-guide.md` §2 and §7;
  `container-log-retention.md`; wiki `profile-os-baseline-hardening.md` (`0221`); `0262` *Context* — all read
  2026-10-12.
