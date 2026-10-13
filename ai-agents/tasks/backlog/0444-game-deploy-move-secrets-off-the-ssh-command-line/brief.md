# Game deploy: move the secrets off the ssh command line (stage a private 0600 file, like profile and telemetry)

## ID
0444

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0443`. No `tasks/*/0444*` path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by
> `fkit-sprint-ship-loop` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Question: *"The game deploy puts all server secrets on the ssh command line (an old problem, not from this task). What
> do we do with it?"* Verbatim selection: **"File backlog follow-up (Recommended)"** — option text: *"A producer files a
> separate task. 0441 stays small."* ⇒ filed on the **Backlog board**, not Sprint 8.

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder — ⚠️ the one real deploy that proves it is **run by the owner (human)**, in a weekend deploy slot.

## Context

**In plain terms.** When we deploy the game, `deploy.sh` builds one long ssh command that contains every server
secret in plain text, and runs it on the operator's Mac. While that command runs, any other program on the Mac can
see it with `ps`. The profile and telemetry deploys already avoid this: they write the secrets into a private file
(readable only by its owner), copy the file to the box, and use it there. The game deploy never got that fix. This task
gives it the same fix.

**What the code does today** (read 2026-10-12, `deploy.sh` transport section, near the end of the file):
- The final ssh call carries a heredoc of **every** game env value inside its command string — among them
  `DOCKER_TOKEN`, `ADMIN_TOKEN`, `API_KEY`, `PROFILE_INTERNAL_TOKEN`, `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`,
  `OTEL_PASSWORD` / `OTEL_AUTH_HEADER`, `BASIC_AUTH_PASS`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_WEBHOOK_URL`.
- **The script says so itself:** the comment above `run_config_value_guard` reads *"No value lands in any process's
  argv; the ssh command below already carries them all."* That guard was built argv-safe on purpose; the transport
  under it was not.
- The same string is also the **remote shell's** command line on the box for the length of the deploy (the profile
  script's own comment names this exposure: *"inlining them in the SSH command … would expose them in ps aux /
  /proc/<pid>/cmdline on the box"*).
- On the box the env file is written by `cat >` and only **then** `chmod 600`'d — a short window with default
  permissions (the game-side twin of `0047`'s "A2").
- `update.sh` deletes that env file **only on success**. A failed deploy leaves a file with every secret on the box.

**Where this came from.** Found while planning [`0441`](../../done/0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md)
(its plan's Q8). **Not caused by `0441` and not fixed by it** — `0441` only makes its own `ps` check print counts, never
lines, so it does not leak these values while it runs.

**Relationship to `0047` — checked, NOT a duplicate.**
[`0047-deploy-transport-secret-hygiene`](../0047-deploy-transport-secret-hygiene/brief.md) (still `🔲 Backlog`, listed as
`sec13` on [`sprint-backlog.md`](../../../sprints/sprint-backlog.md)) covers **only** `build-deploy-profile.sh` and
`build-deploy-telemetry.sh`: a staged env file left on the Mac after a failed copy, and the remote "0600 from creation"
window. It never mentions `deploy.sh`, and the game pipeline does not stage a file at all — so `0047`'s fixes have
nothing to attach to there. This task is its **game-pipeline sibling**. Build it so the game pipeline does **not** inherit
the two gaps `0047` exists to close (see *What to build*, items 2 and 3).

**Risk level, honestly.** Hardening, not an incident. The exposure needs a process already running on the operator's Mac
(or on the box) during the few seconds of a deploy, and the same secrets already sit in `.env.*.secret` files on the Mac.
It is still the one deploy path that puts them in `ps`, and the fix is a known pattern already in this repo.

## What to build

1. **Stage the env block in a private local file, not in the ssh command.** Create it with `mktemp` and make it 0600
   **before** writing any secret into it; copy it to the box with the existing `SCP_CMD`; the ssh command then names
   only the file path and `update.sh`. **No secret value may appear in any local or remote process's command line.**
   Mirror `build-deploy-profile.sh`'s staging and `finalize_deploy` — do not invent a parallel mechanism.
2. **One unconditional EXIT-trap cleanup from the start** (the lesson `0047` F-NEW-1 learned the hard way on
   telemetry): the local staged file is removed on **any** exit, including a failed copy. Bash traps replace each other —
   fold any existing trap into the one cleanup function.
3. **The remote file is 0600 from creation** (`0047` A2): no window where it has default permissions. Pre-create it
   0600, or write it under `umask 077`, before any secret lands in it.
4. **`update.sh` still gets a real env file** — it passes the file to `docker run --env-file`, so the file must exist on
   the box while the container starts. Keep its current contract (path as first argument, deleted on success) unless the
   plan shows a cleaner one.
5. ~~**Optional — the plan decides, and flags it to the owner:**~~ **REQUIRED (since 2026-10-12, see the note below):**
   remove the box-side env file on a **failed** deploy too
   (today only success removes it). Profile's `finalize_deploy` already does a remote `rm` on any exit; the same shape
   fits here. ~~If the plan leaves it out, say so in the worklog as a known residual.~~

   > 📌 **Made required — OWNER RULING, 2026-10-12, given live via `AskUserQuestion` at
   > [`0447`](../../done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md)'s
   > plan gate in the `fkit lead` session**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
   > (ADR-021/037); ⛔ not producer precedent. Q1 verbatim: **"Leave it to 0444 (Recommended)"**. Recorded 2026-10-13 at
   > `0447`'s close. `0447` made `update.sh` remove the env file on **every** exit once it runs (repo work; deployed with
   > the next game deploy from a tree that contains it) and left `deploy.sh` untouched. What `update.sh` cannot cover is
   > this item's job: the file is written on the box but `update.sh` never arms its cleanup — `chmod 600` fails, the ssh
   > session drops between the write and `update.sh` starting, or `update.sh` cannot start at all — plus the bigger gap
   > this task opens (file copied in one login, used in the next). See `0447`'s `worklog.md` § *Why `deploy.sh` was left
   > alone* and § *Known residuals* (residual 2).

Keep the existing guards working exactly as they do now: config parity guard, `run_config_value_guard` (still fed on
stdin, still before anything runs on the box), the key-first / password-fallback branch, basic-auth handling.

## Verification steps

1. **Harness, argv:** extend `tests/scripts/profile-deploy-hardening.test.sh` (its argv-recording `ssh`/`scp`/`sshpass`
   stubs; `0441`'s plan adds a `run_game_deploy` driver there — reuse it, write no new per-test executables) with a
   `deploy.sh` run using fake secret values that contain
   spaces and shell-special characters. Assert **no** fake secret value appears in any recorded ssh/scp argv, and the
   staged file reached the stubbed `scp`.
2. **Harness, failed copy:** force the `scp` stub to fail. Assert the deploy exits non-zero **and** no staged env file
   is left in the local temp location.
3. **Harness, remote permissions:** assert the remote write path creates the file 0600 before any secret is in it (by
   the structure the plan chooses — e.g. the recorded remote command sets `umask 077` / pre-creates 0600 ahead of the
   copy).
4. **Content parity:** the staged file holds **exactly** the same keys, in a form `update.sh` reads to the same values,
   as today's heredoc — including values with spaces, `=`, quotes and `$`. The config parity guard
   (`npm run check:config-parity`) still finds every forwarded key.
5. `bash -n deploy.sh` clean; `npm test` green (one full run — the project lock applies), harness success marker printed.
6. **Live proof — NOT in this task.** By the build/verify split rule (owner ruling 2026-09-29), when this task closes the
   producer files a **verify task at the top of the next sprint**: one real dev deploy by the owner, the game comes up
   healthy, and the box's env file is gone afterwards. That verify task must not block the build sprint's deploy.

## Notes

- **Depends on:** 0441
- **Blocks:** nothing
- **Why `0441`:** not a technical prerequisite — both tasks change the same `deploy.sh` transport lines (`SSH_CMD` /
  `SCP_CMD`), and `0441` adds the `deploy.sh` argv-recording harness coverage this task's verification reuses. Landing
  after it avoids a conflict and a second copy of the stubs. If `0441` stalls, the owner may lift this gate.
- **Coordination with [`0443`](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md) (added 2026-10-12, from `0443`'s plan):** reuse `deploy_cleanup()` from 0443; insert the staged-file scp above 0443's `run_game_host_setup` call; 0443 lands first.
- **Related, not dependencies:** [`0047`](../0047-deploy-transport-secret-hygiene/brief.md) (same fix, profile +
  telemetry pipelines); [`0045`](../0045-vps-registry-credential-hygiene/brief.md) (`sec12`, `DOCKER_TOKEN` persisting on
  the box after `docker login` — a different leak, out of scope here).
- **Out of scope:** the SSH **password** on the command line in the password-fallback branch (`sshpass -p`) — `0441`'s
  plan (§A3/A4, read 2026-10-12, not yet built) already moves it to `sshpass -f` with a 0600 file, and `0442` turns
  password login off; `known_hosts` pinning; secret management architecture (`sec11`); changing
  which variables are forwarded.
- **No secrets, hostnames or addresses** in the plan, worklog, harness fixtures or commit messages — fake values only.
