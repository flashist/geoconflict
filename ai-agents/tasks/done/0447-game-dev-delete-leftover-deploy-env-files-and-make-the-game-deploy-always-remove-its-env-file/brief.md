# Game dev: delete the leftover deploy env files, and make the game deploy always remove its env file — even when it fails

## ID
0447

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0446`. Allocated with `0448` in one run. No reference to
> `0447` in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0447*` path in any branch's history.

## Sprint
Sprint 8 *(was ~~Backlog~~ — moved 2026-10-12, see below)*

> ➡️ **MOVED TO [SPRINT 8](../../../sprints/plan-sprint-8.md) ON 2026-10-12 — OWNER RULING given in the `fkit lead`
> session**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
> precedent. Verbatim: *"Move it to the Sprint 8"*. Appended to Sprint 8 at rank 43 (ADR-035 append position, **not** a
> merit rank). Status unchanged (`🔲 Backlog`); scope unchanged. The Backlog-board row is kept as `➡️ Moved`. The filing
> note's *"Why the Backlog board, not Sprint 8"* paragraph below is history. Open question 1 (fold into `0444` or keep
> separate) is **not** decided by this move — `0444` stays on the Backlog board.

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer
> precedent.** Question: *"The 21 leftover deploy files with secrets on game dev: what do we do?"* Verbatim selection:
> **"File a task (Recommended)"** — option text: *"Producer files a task: delete them, and make the deploy always clean
> up, even when it fails. You approve any box change."*
>
> **Why the Backlog board, not Sprint 8:** the ruling names no sprint (for the sibling question, `0448`, the owner said
> "backlog" outright). Nothing in it implies Sprint 8, so the producer did not add it there. Pulling it into a sprint is
> a producer act on an owner word.

## Priority
43 on Sprint 8 *(append rank, not a merit rank; was ~~Unscheduled~~)*

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder — ⚠️ **every change on a live box is EXECUTED OR APPROVED BY THE OWNER (human)** (owner ruling above: *"You
approve any box change"*). The coder writes the repo change and the exact one-off delete step; the owner runs or
approves the delete. A read-only listing on the box (file names, sizes, modes, dates — **never contents**) may be run by
an agent session with the owner's OK given in-session.

## Context

**In plain terms.** Each game deploy writes a small file of server settings and secrets onto the box, starts the game
with it, then deletes it. But it deletes it **only if everything went well**. When a deploy fails part-way, the file
stays behind. On game dev, 21 such files have piled up. This task (1) removes those 21 files, with the owner's OK, and
(2) changes the deploy so the file is removed **every** time, success or failure.

**Facts on filing** (read-only inventory for `0443`, 2026-10-12, recorded in
[`0443`'s worklog](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/worklog.md)
§ *Step 1*, *Surprises* 1 — names only, nothing touched, not re-checked by the producer):
- **Game dev has ~21 leftover deploy env files** named `dev-*.env` in the deploy's update directory (seen under
  `/root/`). **At least 12** hold the feedback Telegram setting names; by what the deploy writes, they very likely hold
  the other deploy secrets too (only some setting names were listed).
- **Game prod has none.**

**Cause, read in the code 2026-10-12:**
- `deploy.sh` writes the file on the box with `cat >` (then `chmod 600`) inside one ssh command, and runs `update.sh`
  with the file's path.
- `update.sh` removes the file **only on its success branch**, after `docker run` (the `rm -f "$ENV_FILE"` near
  `update.sh:107`). Every earlier exit — `docker run` failing, a missing argument, the ssh session dropping mid-run —
  leaves the file. `update.sh` has no `EXIT` trap.
- Docker reads `--env-file` only when it **creates** the container, so removing the file afterwards on any path is safe
  — today's success path already does it.

**Risk level, honestly.** Hygiene, not an incident. The files sit in root's home on the box, and anyone with root there
can already read the same values from the running container. The point is that old secrets should not pile up on disk.
⚠️ **Whether every file is 0600 and root-owned is not recorded** — `deploy.sh` makes the file 0600 only *after* writing
it (see `0444`), so a deploy that failed between the two steps could have left one with default permissions. Step 1
checks.

**Conflicts and overlaps — flagged, not resolved here:**
- ⚠️ **[`0444`](../../backlog/0444-game-deploy-move-secrets-off-the-ssh-command-line/brief.md) overlaps.** Its *What to build*
  item 5 (optional, plan decides) is *"remove the box-side env file on a failed deploy too"*, and it rewrites the very
  `deploy.sh` block that writes this file (staging + scp instead of a heredoc). After `0444`, the file is copied in one
  connection and used in the next, so there is **more** room for a failure to strand it. See open question 1 — one task
  may fold into the other; the owner decides.
- **[`0443`](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md)**
  (Sprint 8, in progress) adds a single `deploy_cleanup()` `EXIT` trap to `deploy.sh` (its plan, *A7 (1)*). If this task
  touches `deploy.sh` at all, it **reuses that function** — never a second trap (bash traps replace each other) — and
  lands **after** `0443`.
- [`0047`](../../backlog/0047-deploy-transport-secret-hygiene/brief.md) covers the same leftover-file class for the **profile and
  telemetry** pipelines. Not this task.

## What to build

1. **Read-only check on game dev, then on game prod** (owner OK in-session): list the leftover deploy env files — name,
   size, mode, owner, date — **never their contents**. Confirm prod still has none. Record counts and modes in the
   worklog (no host, no address, no file contents, no setting values). If any file is **not** 0600 root-only, stop and
   tell the owner before deleting (it changes whether anything needs rotating — see open question 2).
2. **`update.sh` removes its env file on every exit.** Arm the removal as soon as the script knows the path (before it
   loads the file), so a failure at **any** later step — `docker pull`, the container stop/remove, `docker run`, an
   interrupt or a dropped ssh session — still removes it. The success path behaves exactly as today. The plan states
   plainly which exits **cannot** be covered (e.g. the box losing power, or the process being killed with no chance to
   clean up) and records them as known residuals.
3. **`deploy.sh` side — only if needed, and only per open question 1.** If the plan finds a failure path that the
   `update.sh` change cannot cover in today's single-ssh-command shape (for example, the file written but `update.sh`
   never started), add a remote removal on failure — reusing `0443`'s `deploy_cleanup()`, after `0443` lands. Otherwise
   leave `deploy.sh` alone and say why in the worklog.
4. **The one-off delete** — a short, exact step for the owner to run (or approve) on game dev: remove only the leftover
   deploy env files found in step 1, matched by the deploy's own naming, nothing else; then list again to show none are
   left. Not a deploy, so it needs no weekend slot unless the owner says otherwise. Written into the worklog as run, with
   counts only.
5. **Docs:** where `docs/vps-deployment-guide.md` describes the game deploy's env file, say that it is now removed on
   every exit, not only on success.

**Out of scope:** moving secrets off the ssh command line (`0444`); the profile and telemetry pipelines (`0047`); a
sweep that deletes old leftover files on every deploy (see open question 3); rotating any secret unless step 1 finds a
non-private file and the owner rules on it.

## Verification steps

1. **Harness — failure paths:** in `tests/scripts/profile-deploy-hardening.test.sh` (which already checks `update.sh`'s
   `docker run` line), run `update.sh` against a stubbed `docker` that fails at each step in turn (`pull`, `run`) and on
   an interrupt. After each run, the env file is gone and the exit code is non-zero.
2. **Harness — success path:** with a `docker` stub that succeeds, the env file is gone and the existing log-option
   assertions still pass.
3. **Harness — no stray deletion:** the removal touches only the path `update.sh` was given — another file next to it
   survives every case above.
4. If `deploy.sh` was changed (step 3): `deploy_cleanup` is still the **only** `EXIT` trap, and the existing T60/T61 and
   `0443` cases stay green.
5. `bash -n update.sh` (and `deploy.sh` if touched) clean; `npm test` green (one full run — the project lock applies),
   harness success marker printed. Any **new** harness is registered in `tests/scripts/ShellHarnesses.test.ts`.
6. **Box, owner-run:** step 1's listing recorded (counts and modes only); after the one-off delete, a fresh listing shows
   **zero** leftover deploy env files on game dev, and prod still has none.
7. **Live proof of the new behaviour — NOT in this task.** By the build/verify split rule (owner ruling 2026-09-29),
   when this task closes the producer files a verify task at the top of the next sprint: one ordinary dev deploy leaves
   no env file behind, and (owner's choice) one deliberately failed dev deploy — e.g. a nonexistent image tag — leaves
   none either. That verify task must not block the build sprint's deploy.
8. Nothing written for this task names a host, address, secret value or file contents.

## Notes
- **Depends on:** nothing
- **Blocks:** nothing
- **Ordering, not a dependency:** the `update.sh` change and the one-off delete can ship any time. **Only** a `deploy.sh`
  change (step 3) must land after `0443` and reuse its `deploy_cleanup()`.
- **Related:** `0444` (same remote env file — open question 1); `0443` (`deploy_cleanup()`); `0047` (same class, other
  pipelines); `0446` (game boxes rebuilt from scripts — not this task).
- ⚠️ **Build/verify split (owner ruling 2026-09-29):** see verification 7.
- **Open questions for the owner** (recommended default first; plain-language context so whoever relays them needs
  nothing more):
  1. **This task or `0444` — who makes the box clean up after a failed deploy?** `0444` (Backlog, waits on `0441`)
     changes how the file gets to the box and already lists "remove it on a failed deploy too" as an *optional* item.
     *Recommended: keep this task small and separate — it fixes `update.sh` now (that is where the 21 files came from)
     and does the one-off delete; and make `0444`'s item 5 **required** rather than optional, since `0444` is the change
     that opens a new gap (file copied first, used in a second login).* Alternative: fold the code part of this task into
     `0444` and keep only the one-off delete here — one change to the deploy instead of two, but the fix then waits for
     `0441` → `0444`, and dev keeps collecting files until then.
  2. **Rotate anything?** *Recommended: no, if step 1 shows every file is private to root* — root on that box can
     already read the same values from the running game container, so deleting the files removes the pile-up without
     anyone new having seen them. If a file turns out readable by others, the owner decides whether to rotate the
     secrets it held.
  3. **Should every deploy also sweep away old leftover files**, as a safety net for the rare crash the new cleanup
     cannot catch? *Recommended: no, not in this task* — a sweep deletes files by name pattern in root's home on every
     deploy; a wrong pattern, or two deploys at once, could delete the wrong file. The new cleanup plus the one-off
     delete covers the real cause. Alternative: add a narrow sweep (only this deploy's own file-name pattern, only files
     older than a day).
- Sources: owner ruling 2026-10-12 (relayed); `0443` worklog § *Step 1* (relayed inventory); `update.sh`; `deploy.sh`
  (remote env file write and `update.sh` call); `0443` plan *A7*; `0444` and `0047` briefs — all read 2026-10-12.
- **No secrets, hostnames or addresses** in the plan, worklog, harness fixtures or commit messages — fake values only.
