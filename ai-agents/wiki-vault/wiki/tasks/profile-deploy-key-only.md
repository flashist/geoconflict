# Profile Deploy — Never Fall Back to a Password Prompt on the Key Path (task 0453)

**Source**: `ai-agents/tasks/done/0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 47 (ADR-035 append rank; on merit directly below `0452`) / task `0453`

> ✅ **2026-10-26 sync (`4e9160a`) — the live check `0460` is CLOSED** (agent-closed — not owner-verified). The
> 2026-10-16 profile deploy (`0.0.164-profile.2`, owner-run) ran to completion over the key; the owner confirmed live on
> 2026-10-20: *"No password prompt"*. ⚠️ The guard's own `PROFILE_DEPLOY_SSH_AUTH=key` line was not in the pasted
> output — the completed deploy is the evidence. The optional negative check was not run.

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-14. Filed 2026-10-13 on the owner ruling *"File it in
> Sprint 8"*. **Repo work only, no live step**; code committed in `2d2ab4a` (2026-10-14), `git tag --contains` →
> **none** ⇒ not used for a real profile deploy yet. Live check: **`0460`** (Backlog board; owner ruling *"Verify task,
> top of Sprint 9 (Recommended)"*).

## Goal

The same gap `0442`'s review R1 found in the telemetry deploy ([[tasks/ssh-password-login-off]]): when the profile
deploy uses a key and the box rejects it, ssh quietly asks for a password; if the operator types it, the deploy goes on
**still labelled `key`**, and `setup-profile.sh`'s guard 0 trusts that label. **Harmless today** — the profile box
refuses passwords since `0221` ([[tasks/profile-os-baseline-hardening]]) — it would matter only if passwords were ever
turned back on (e.g. through the provider console during a recovery).

## Key Changes

- **`build-deploy-profile.sh`, key branch:** `SCP_CMD` and `SSH_CMD` add `-o PasswordAuthentication=no -o
  KbdInteractiveAuthentication=no` before `-o IdentitiesOnly=yes -i <key>` — same order as the telemetry fix. **No
  `BatchMode`** (a key passphrase prompt is still key auth). A comment explains why; `key` is now "true by
  construction". Password branch untouched.
- **`tests/scripts/profile-deploy-hardening.test.sh`:** a structural count (the option pair exactly twice in the key
  branch, comments excluded) and a driven check that every key-mode ssh and scp call carries it.
- **Docs:** no change — no doc described the profile key path's prompt behaviour.

## Outcome

- **Red first:** with the harness edited and the script unchanged → exactly 3 failures; scp-only removal → 2 failures
  (the scp side is guarded on its own). After the fix: `ALL PASS`, password-branch checks unchanged. `ssh -G` locally
  (dummy host) shows `passwordauthentication no`, `kbdinteractiveauthentication no`, `batchmode no`. Full `npm test`
  green (227 suites, 4684 tests); lint clean. **shellcheck not installed — not run.**
- **Review R1 (low) — accepted residual `key-path-comment-overstates-auth-lockdown`** (owner: *"Accept as known, no
  change (Recommended)"*): the comment's "no way in but the key" overstates — GSSAPI and host-based auth are not turned
  off client-side (both default `no`; no repo file enables them). Covers both the profile and telemetry scripts.
- **Not verified:** a live login with no prompt — `0460`.

## Related

- [[tasks/ssh-password-login-off]] — task `0442`, whose review R1 found the gap (telemetry fix is the model)
- [[tasks/profile-os-baseline-hardening]] — task `0221`, the profile box's sshd hardening and guard 0 (unchanged)
- [[tasks/deploy-ssh-key-login]] — task `0441`, `IdentitiesOnly` on the key paths
- [[decisions/sprint-8]] — the board (rank 47)
- [[decisions/sprint-backlog]] — verify task `0460`, flagged for the top of Sprint 9
