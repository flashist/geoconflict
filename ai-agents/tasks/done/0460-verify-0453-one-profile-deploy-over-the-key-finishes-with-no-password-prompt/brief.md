# Verify 0453: one profile deploy over the key finishes with no password prompt

## ID
0460

> ℹ️ **ID allocation, checked 2026-10-14 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (working tree, including untracked folders) was `0459`. `0460`: no task folder, no reference in `ai-agents/tasks/`,
> `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0460*` path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING 2026-10-14: goes to the TOP of Sprint 9 when Sprint 9 is planned.** Given live via
> `AskUserQuestion` in the `fkit lead` session (driver of `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim selection: **"Verify task,
> top of Sprint 9 (Recommended)"** — option text: *"Your standing build/verify rule; nothing in Sprint 8 waits on it."*
>
> This is the standing build/verify-split rule (owner ruling 2026-09-29) applied as written — **not** bent. It sits on
> the Backlog board only because **no Sprint 9 board exists yet**; the producer did not create one. Whoever plans
> Sprint 9 must pull this task in as its **first** row.
>
> ℹ️ **Information only, not a change of the ruling:** the check is one ordinary profile deploy, so it could also ride
> the next profile deploy the owner makes anyway (for example `0449`'s, whose first deploy step is
> `npm run deploy:profile`) — if the owner prefers that. Nothing here moves it there.

## Priority
—

(Backlog board, unranked by design. On the ruling above, it becomes priority 1 of Sprint 9.)

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** The deploy is the owner's hands. Agents do not SSH to the boxes
(agent SSH was denied by the permission classifier in `0445`).

## Context

**In plain terms.** `0453` changed the profile deploy so that, when it logs in with a key, ssh is told "key only —
never ask for a password". Before, a rejected key made ssh quietly ask for the root password; if typed, the deploy
carried on while still telling the box "I came in by key", which the box's safety check (guard 0) trusts. `0453` is
proven by tests only (harness ALL PASS, full `npm test` green, `ssh -G` locally). It has **not** run against the real
profile box. This task is that one live run.

**What `0453` shipped (repo only):** `build-deploy-profile.sh`'s key branch passes
`-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` before `-o IdentitiesOnly=yes -i <key>` on every
ssh/scp — preflight, scps, remote run and cleanup trap, all through `SSH_CMD` / `SCP_CMD`. No `BatchMode` (a passphrase
prompt for the key itself is still key login, and is allowed). Password branch untouched. See
[`0453`](../../done/0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path/brief.md) and its
`worklog.md` / `review.md`.

**Prerequisite:** `0453`'s change is in the code the owner deploys from (committed or in the working tree the deploy
runs from). Committed ≠ deployed; this task is the deploy.

## What to build

Nothing. Verification only.

1. **The deploy (owner):** run one ordinary profile deploy over the key: `npm run deploy:profile`.
2. **Watch for:** no password prompt and no keyboard-interactive prompt at any point (a passphrase prompt for the key
   itself is fine — that is still key login).
3. **Optional negative check — the owner's call.** Point the deploy at a wrong key once. If done, it must **fail at the
   preflight** with its "… unreachable or key rejected. Aborting before any secret transfer or mutation." message
   (`build-deploy-profile.sh`, read 2026-10-14) and **change nothing** on the box (no upload, no remote run). Skip it if
   the owner prefers; the positive run is the pass condition.
4. **Record** the result in this task's `worklog.md`: date, pass/fail per check, and the relevant output lines **with
   hosts, addresses and key paths removed**.

## Verification steps

1. **Pass:** the deploy completes over the key, with no password or keyboard-interactive prompt.
2. **Pass:** guard 0 in `setup-profile.sh` sees `PROFILE_DEPLOY_SSH_AUTH=key` (the deploy is not refused by guard 0,
   and its output or the staged value shows `key`).
3. **If the optional negative check was run:** it failed at preflight with the "key rejected … Aborting" message, with no password prompt, and nothing on the box
   changed.
4. Nothing written names a host, address, key contents, key path or password.

**If step 1 fails** (a password prompt appears, or the key is refused): do **not** type the password. Stop, record what
was seen, and route it to the producer — that is a defect in `0453`, not a reason to finish the deploy by password.

## Notes
- **Depends on:** `0453` (done, agent-closed — not owner-verified).
- **Blocks:** nothing.
- **Related:** `0442` (R1 — same fix for the telemetry deploy; its live check is in `0452`); `0221` (the profile box's
  sshd hardening and guard 0); `0449` (its deploy order starts with a profile deploy — see the information note under
  *Sprint*).
- Accepted residual from `0453`'s review, for context only: `key-path-comment-overstates-auth-lockdown` — a comment says
  "no way in but the key", but GSSAPI/host-based login are not blocked by these options (both off everywhere; no
  lock-out possible). Owner ruling 2026-10-14: accept, no change. Not part of this check.
- Sources: `0453` `brief.md`, `worklog.md`, `review.md` — read 2026-10-14.
