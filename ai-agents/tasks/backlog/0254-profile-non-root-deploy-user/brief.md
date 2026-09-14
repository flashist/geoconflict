# Non-root deploy user for the profile box — then `PermitRootLogin no`

## ID
0254

> ℹ️ **ID allocation, checked 2026-09-13 before filing. `0254` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0254-*/` — no matches (highest ID on disk across all three boards was
> `0253`). **2.** `grep -rn "^0254$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.**
> `grep -rn "0254" .claude/` — zero hits. **4.** repo-wide (`node_modules`, `.git`, `static` excluded,
> `.svg`/`.json`/binaries filtered) — zero hits. Duplicate-ID check (`sort | uniq -d` over folder
> prefixes) — empty.

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — not owner-ruled. Medium and not High because
[`0221`](../0221-profile-p6-os-baseline-hardening/brief.md) already lands `PermitRootLogin
prohibit-password` plus password auth off, so root is reachable by key only; the remaining exposure is
"the deploy path runs with full privilege by default", which is real on an internet-facing box that
will hold personal data, but is not a live hole today (the profile DB holds 0 rows; the game server is
not wired — `0217`). Medium and not Low because the cost is 1–2 days and it only gets more expensive
once more scripts, runbooks and cron entries assume `root`.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-13 on an owner ruling given live in the lead session during `0221`'s plan approval
(`0221` plan Q8: "split into its own brief").** `0221` was the task that carried "a non-root deploy
user" as its item 4, with the standing instruction to split it out rather than absorb an overrun. The
coder's plan recommended the split; the owner ruled it. **This brief is that split.** It is filed now
rather than at `0221`'s close because `0221` is currently `🚧 Blocked` on the owner's live tail
(B1–B6) and the reason for the split should not wait on that.

### Why it was split — the recorded reason (from `0221`'s `worklog.md` Part C and `plan.md` Part C)

- **Every operation in `setup-profile.sh` is privileged**: apt, ufw, systemd, writes under `/etc`,
  `/opt/profile` (`chmod 700`, root-owned), `/etc/cron.d/profile-backups`. Under a non-root user the
  whole script would run under `sudo -n` end to end — a rewrite of the invocation shape, not a
  one-line user swap.
- **`/root/...` is hardcoded on both sides of the deploy.** `build-deploy-profile.sh` sets
  `REMOTE_SCRIPT`, `REMOTE_BACKUP_SCRIPT`, `REMOTE_CHECKS_SCRIPT` and `REMOTE_ENV` to `/root/...`
  paths; `setup-profile.sh` defaults `PROFILE_BACKUP_SRC` and `PROFILE_CHECKS_SRC` to `/root/...`;
  the sshd section's key guard reads `/root/.ssh/authorized_keys`. *(Cited by content, not by line —
  both files carry uncommitted `0220`/`0221` hunks in the working tree on 2026-09-13; re-derive by
  reading.)* The user-side half of the seam already exists: `REMOTE_USER` reads
  `PROFILE_SSH_USER` and defaults to `root` (`example.env.profile` documents it commented out). The
  box-side half does not exist at all.
- **A `docker`-group user is root-equivalent.** Membership in the `docker` group gives full control
  of the daemon, which is full control of the host. A non-root user that is in the `docker` group
  reduces *accidental* blast radius, not *adversarial* blast radius. The brief must say which of the
  two it is buying; do not present it as the latter.
- **The deploy harness's fixtures run as root implicitly.** ⚠️ Correction to how this was relayed:
  `tests/scripts/profile-deploy-hardening.test.sh` contains **no literal `root@`** (checked
  2026-09-13). T1–T11 exercise root only because `PROFILE_SSH_USER` is unset in the fixtures, so the
  default applies. Any change to the default, or to the `/root/...` paths the stubs log, reaches those
  assertions.
- **The `0182` runbook is `✅ Done` and not editable in place.**
  [`0182`](../../done/0182-profile-04i-server-bring-up-runbook/brief.md) and
  `ai-agents/knowledge-base/profile-backup-restore-runbook.md` both describe a root-user flow. A
  successor document (or a dated addendum in the knowledge-base, not the closed brief) is part of the
  work, or the runbooks will teach the old path.
- **Realistic cost 1–2 days** against `0221`'s 0.5–1 day whole-task estimate.
- **A half-migrated user is worse than none** (`0221` brief, verification step 4) — a deploy path
  that works for the person who built it and for nobody else.

### The dependency on `0221`, stated precisely

`0221` lands `PermitRootLogin prohibit-password` — deliberately **not** `no`, because root is still
the deploy user. **`PermitRootLogin no` is this task's last step and may only land after the non-root
user has completed a full deploy end to end.** Landing `no` before that locks the deploy out. `0221`'s
harness block asserts the drop-in does **not** say `PermitRootLogin no` for exactly this reason; this
task flips that assertion when it flips the value, in the same change.

`0221` also introduced things this task must not undo: the sshd drop-in with its `Match all` pin and
the `sshd -T -C user=root,…` effective-config gate (that gate's `user=` argument becomes the new user,
or both), the password-mode deploy refusal (guard 0), the fail2ban jail, and `-o IdentitiesOnly=yes`
on the key branch.

### Prior art in this repo

- [`tasks/vps-access-hardening`](../../../wiki-vault/wiki/tasks/vps-access-hardening.md) (wiki) —
  the host-audit checklist from the leaked-credentials incident covers users and sudo; nothing there
  provisions a deploy user.
- [`tasks/deployment-credential-hardening`](../../../wiki-vault/wiki/tasks/deployment-credential-hardening.md)
  (wiki) — SSH-key-first deploy contract; assumes root.
- The **game** box (`setup.sh`, `update.sh`) also deploys as root. **Out of scope here** — this brief
  is the profile box only; if the pattern works, file the game-box version separately.

## What to build

Investigation-first is **not** required — the shape is known from `0221`'s Part C. But the plan must
choose and record the privilege model before touching a script:

1. **Decide and record the privilege model** (plan step, owner-approved before build):
   - (a) a named non-root user with passwordless `sudo` for the provisioning script, **not** in the
     `docker` group — every `docker` call in the deploy also goes through `sudo`; or
   - (b) the same user **in** the `docker` group — simpler, but root-equivalent, and the brief says
     so out loud.
   The producer's input, not a decision: **(a)** — the only version that actually reduces adversarial
   blast radius. The owner rules it.
2. **Provision the user on the box** from `setup-profile.sh` (idempotent): create the user, install
   the operator's public key into its `authorized_keys` (**copied from root's, never typed into a
   script**), sudoers drop-in scoped as narrowly as the model allows, home directory for the staged
   files.
3. **Move every `/root/...` path** in `build-deploy-profile.sh` and `setup-profile.sh` to the new
   user's home (or a neutral staging directory the user owns), keeping the 0600 env-file semantics
   `0220` relies on.
4. **Make `setup-profile.sh` run correctly under `sudo -n`** from the new user — including the cron
   entries (which name `root` as the running user — decide whether they stay root or move), the
   `chmod 700` directories, and the sshd key guard (read the **deploy user's** `authorized_keys`, not
   root's).
5. **Flip `PROFILE_SSH_USER`'s default** in `build-deploy-profile.sh` and `example.env.profile` to the
   new user, **only after step 6 has passed once against the real box**.
6. **Prove a full deploy end to end as the new user** (`build-deploy-profile.sh` → provision → stack
   up → `/health` + `/ready` 200) with the first SSH session left open, as `0221` B1 did.
7. **Only then `PermitRootLogin no`** in the `0221` drop-in, with the harness assertion flipped in the
   same change and the `-C user=` gate widened to the new user.
8. **Harness**: update T1–T11's expectations and add assertions in the `0219`/`0221` idiom — user
   provisioning present, no `/root/` path left in either script's staging variables, `PermitRootLogin
   no` present, key copied not embedded. Negative control first (RED against the pre-change script).
9. **Documentation**: a successor to the root-user runbook flow — a dated addendum in
   `ai-agents/knowledge-base/` (the `0182` brief is closed and is not edited), and the backup-restore
   runbook's `root@` lines updated.

### 🚫 Not in scope

- The game box's deploy user (`setup.sh`, `update.sh`, `build-deploy.sh`).
- The telemetry box (see [`0255`](../0255-telemetry-compose-restart-policy-unless-stopped/brief.md)
  for the sibling brief from the same ruling; it has nothing to do with users).
- Any change to fail2ban, unattended-upgrades or the nginx allow-list.

## Verification steps

1. **A full deploy completes as the non-root user against the real box**, from a clean local shell
   with `PROFILE_SSH_USER` set to the new user — provision, stack up, `/health` + `/ready` 200. 🚨 **Run
   it with a first SSH session already open**, exactly as `0221` B1/B2, and verify the new login from
   a second, new session before closing the first.
2. **`ssh root@<host>` is refused** after step 7 (`Permission denied`), from a new session; the new
   user's key login still works. **Observe both; assert neither.**
3. **`sudo -n true` succeeds for the new user and `sudo -n` on an unlisted command is refused** (if
   model (a) was chosen); `id <user>` shows the group membership the plan recorded and nothing more.
4. **No `/root/` string remains** in `build-deploy-profile.sh`'s or `setup-profile.sh`'s staging
   variables, and the harness asserts it.
5. **A second deploy is a no-op on the user** (idempotent: no "user exists" failure, key not
   duplicated in `authorized_keys`).
6. **The `0221` sections still pass their own gates** under the new user: the sshd effective-config
   gate, the fail2ban jail gate, `0220`'s persisted-secret reuse (the 0600 files are readable by the
   process that needs them and by nobody else — `ls -l` shown).
7. **Backups and checks still run**: the next `profile-backup.sh` cron run uploads (backup marker
   updated) and `profile-checks.sh` runs green, whichever user the cron entries ended up under.
8. **`bash tests/scripts/profile-deploy-hardening.test.sh`** → `ALL PASS`, with the new assertions
   shown RED against the pre-change scripts first; **`npm test`** green (counts unchanged unless
   deliberately changed and said so).
9. 🔒 **No key material, no hostnames, no IPs in any artifact** — the user's name is fine; nothing
   else about the box is.

## Notes

- **Depends on:** 0221 — hard. This task edits the sshd drop-in, the key guard and the harness block
  `0221` introduced, and must not land `PermitRootLogin no` before `0221`'s own live tail (B1–B6) has
  proven the box is reachable by key. **Do not start until `0221` is `✅ Done`.**
- **Blocks:** nothing filed. (The game-box equivalent, if ever filed, would want this as its
  precedent.)
- **Why filed now, not at `0221`'s close:** `0221` is `🚧 Blocked` on the owner's live tail B1–B6 as of
  2026-09-13; the owner ruled the split during plan approval, and the split's reason (above) was
  recorded in `0221`'s worklog Part C at build time. Filing at close would have left the ruling
  un-actioned for as long as the tail stays open.
- **Effort: 1–2 days** (the coder's estimate in `0221`'s plan — the reason it was split). **Risk:
  Medium — lock-out.** Two lock-out paths: landing `PermitRootLogin no` before the new user is proven,
  and a sudoers drop-in with a syntax error (use `visudo -cf` on the file before installing it, and
  keep the root session open). Both are guarded by ordering, not by code — the plan must sequence
  them explicitly.
- **The `docker`-group point is the one most likely to be glossed over.** If the plan picks model (b),
  the brief's "why" changes from *security boundary* to *hygiene*, and the status text must say so.
- **Source of the split:** `ai-agents/tasks/backlog/0221-profile-p6-os-baseline-hardening/worklog.md`
  (Part C) and `plan.md` (Part C, Q8). Read both before planning — they carry the touch list.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
