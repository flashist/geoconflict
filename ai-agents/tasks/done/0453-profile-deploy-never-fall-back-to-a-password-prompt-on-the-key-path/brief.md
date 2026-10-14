# Profile deploy: never fall back to a password prompt on the key path (same gap as 0442 R1)

## ID
0453

> ℹ️ **ID allocation, checked 2026-10-13 before filing.** Allocated with `0452` in one run, in this order (`0451` was the
> highest existing ID). No task folder, no reference in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/` (other
> than `0442`'s close note, written in the same run), and no `tasks/*/0453*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-13, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** The question: *"The profile box's deploy script has the same gap as R1 (key path could
> fall back to a password prompt). Harmless today because that box already refuses passwords. File a small follow-up
> task?"* Verbatim selection: **"File it in Sprint 8"** — option text: *"Same task, but in this sprint."*

## Priority
47

⚠️ **Priority 47 is append rank, NOT a merit ranking — flagged for owner confirmation.**
**On merit this belongs directly below `0452`**, because it is the same lesson as `0442`'s R1 (fresh in mind) but far
less urgent: it is harmless while the profile box refuses passwords (`0221`), and it blocks nothing. ADR-035 forbids
inserting a new row above closed rows, so it appends after the highest (46, `0452`).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**In plain terms.** When the profile deploy uses a key and the box rejects it, ssh quietly asks for a password instead.
If the operator types it, the deploy carries on — but it still tells the box "I came in by key". The box's safety check
trusts that label. Today this cannot hurt: the profile box refuses passwords, so there is nothing to type. It would
matter only if passwords were ever turned back on (for example through the provider console during a recovery). The fix
is to tell ssh "key only, never ask for a password" on the key path, as `0442` just did for telemetry.

**What the code does today (read 2026-10-13):**
- `build-deploy-profile.sh`'s key branch (around `:518-527`) adds only `-o IdentitiesOnly=yes -i <key>` to both its
  `SCP_CMD` and `SSH_CMD`. It does **not** pass `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no`, so a
  rejected key falls back to a typed password prompt.
- It sets `DEPLOY_SSH_AUTH=key` because a key is **configured**, and stages it as `PROFILE_DEPLOY_SSH_AUTH` (`:766`).
- `setup-profile.sh`'s guard 0 (around `:539`) refuses the sshd hardening only on `PROFILE_DEPLOY_SSH_AUTH=password`. A
  password typed at the prompt still reads `key`.

**Where it was found:** by the `0442` process-review coder, while fixing `0442`'s review finding R1 (medium) — the same
gap in the telemetry deploy. That fix (`build-deploy-telemetry.sh:330-337`) added
`-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` to every ssh/scp call of the key branch, and
deliberately **no `BatchMode`** (a passphrase prompt for this key is still key auth). See
[`0442`](../../done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md) `review.md` R1.

**Model to copy:** `0442`'s R1 fix in `build-deploy-telemetry.sh` and its harness checks. The profile box's own
hardening is `0221`'s (`setup-profile.sh` § *HARDENING SSHD*) — not changed by this task.

## What to build

1. **Key branch of `build-deploy-profile.sh`:** add `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` to
   both `SCP_CMD` and `SSH_CMD`, next to the existing `IdentitiesOnly`. No `BatchMode`, mirroring `0442` R1 — the plan
   confirms or argues otherwise.
2. **Comment** at the key branch: why (a rejected key must fail at once, never become a typed password that still reads
   `key` to guard 0), citing this task and `0442` R1.
3. **Harness:** in `tests/scripts/profile-deploy-hardening.test.sh`, a structural check that both options sit on both
   `SCP_CMD` and `SSH_CMD` in the key branch, and a driven check that the key-mode ssh argv carries them (beside the
   existing `IdentitiesOnly` checks). Update any existing count that the change moves.
4. **Docs**, only where they describe the profile key path's behaviour (e.g. the runbook's profile section, if it says a
   rejected key falls back to a prompt).

**Out of scope:** the password branch of the profile deploy (already refused by the box); `setup-profile.sh`'s sshd
section and guard 0 (unchanged); game and telemetry deploys (done in `0441`/`0442`); any change on the box.

## Verification steps

1. `build-deploy-profile.sh`'s key branch passes `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` on both
   ssh and scp (read the diff).
2. The new harness checks pass, and fail if either option is removed from either command (show one deliberate red run,
   then revert).
3. `bash tests/scripts/profile-deploy-hardening.test.sh` prints `ALL PASS`; full `npm test` green (judge a single
   `Exceeded timeout of 5000 ms` in a supertest suite by `CLAUDE.md`'s flake rule); `npm run lint` clean.
4. The password branch's behaviour is unchanged (its existing harness checks still pass).
5. **Live proof** — one ordinary profile deploy over the key completes with no password prompt. Needs a deploy and the
   owner, so per the standing build/verify-split rule (2026-09-29) it goes to a verify task filed at close, or rides the
   next profile deploy — the owner decides at close.
6. Nothing written names a host, address, key contents or password.

## Notes
- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** `0442` (R1 — the same gap, fixed for telemetry); `0221` (the profile box's sshd hardening and guard 0);
  `0441` (`IdentitiesOnly` on the key paths).
- ⚠️ Editing `build-deploy-profile.sh` can turn `npm test` red through the hardening harness's structural assertions —
  that is the gate working (`CLAUDE.md` § *Shell harnesses*).
- Sources: `0442` `review.md` (R1 and its coder response); `build-deploy-profile.sh` key branch and staged env line;
  `setup-profile.sh` guard 0; `build-deploy-telemetry.sh:330-337`; `tests/scripts/profile-deploy-hardening.test.sh`
  key-branch checks — all read 2026-10-13.
