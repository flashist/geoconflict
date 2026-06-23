# Task — Deploy Transport Secret Hygiene (telemetry EXIT-trap parity + remote env-file 0600 window)

## Type
Security hardening follow-up (deploy transport).

## Priority / release timing
**Low — post-release; NOT a citizenship/profile-server go-live blocker.** F-NEW-1 is in the
*telemetry* pipeline (unrelated to the profile release); A2 touches the profile pipeline but its
exposure is ≈nil (the remote `/root` is 0700 on a single-root VPS, so the brief scp-perms window
is unreachable by any other principal, and the secret is already plaintext in `.env.profile.secret`
on the dev host + source-and-`rm`'d on the box). The release-relevant profile secret-handling
(argv-safety, 0600 staged env, source-and-`rm`, wrong-host preflight, concurrency lock) already
shipped in **T4g**; digest-pin + byte-scan in **T4e/T4f**. This task also builds on T4g's transport
code, so it should land **after** T4g merges — naturally a later deploy-hygiene pass (alongside
`sec12`). (`sec12` — the broad `DOCKER_TOKEN` persisting on the live public box — is the more
release-adjacent of the two, though still hardening, not a blocker.)

## Origin
Two un-homed deferred items surfaced while reviewing `s4-profile-04g` (PR 125):
- **F-NEW-1** — `ai-agents/reviews/s4-profile-04g.md` Forward notes / Decision-log R3:
  telemetry `LOCAL_TMPENV` (a 0600 secret env_file) is `rm`'d **inline** after the SCP,
  so a failed SCP leaks it on the dev host. Confirmed **pre-existing in `dev`** (not a 04g
  regression); 04g only *added* the profile `finalize_deploy` + a telemetry
  `SSH_PASSWORD_FILE` EXIT trap, leaving telemetry's main env_file uncovered.
- **A2** — `ai-agents/reviews/s4-profile-04e3.md` Forward notes ("remote env-file perm
  window"): after the SCP, the remote `/root/.profile-deploy-env-$$` briefly holds
  scp-default perms before the in-session `chmod 600`. 04e3 homed this in T4g "when it
  touches transport", but 04g's scope (argv/concurrency/preflight) did not, so it slipped.

Frontier-moves / pre-existing hygiene, not regressions — homed here as one bounded task.
Related: `sec12-vps-registry-credential-hygiene.md` (sibling cross-cutting deploy-security task).

## Purpose

Close two transport-layer secret-exposure windows in the deploy scripts, repo-wide
(profile + telemetry), so a secret env_file can neither leak on a failed transfer nor
exist world-readable on the box even briefly.

## Why This Matters

1. **Local leak on SCP failure (F-NEW-1).** `build-deploy-telemetry.sh:357` SCPs the
   0600 `LOCAL_TMPENV` (Uptrace project token, secret key, admin password) and `:358`
   removes it with an **inline** `rm -f "$LOCAL_TMPENV"`. Under `set -e`, an SCP failure
   aborts **before** `:358`, leaving the plaintext secret file on the dev host. The only
   EXIT trap (`:244`) is set in the password-fallback branch and covers `SSH_PASSWORD_FILE`
   only. `build-deploy-profile.sh` already solved this with `finalize_deploy` (single
   unconditional EXIT writer); telemetry never got the equivalent.
2. **Remote 0600 window (A2).** `build-deploy-profile.sh:491` SCPs the env_file to
   `${REMOTE_ENV}` and only `:497` (inside the next SSH session) runs `chmod 600
   ${REMOTE_ENV}`; the telemetry equivalent is `:357`→`:361`. Between the SCP and the
   chmod the remote file holds scp-default perms. Negligible today (`/root` is mode 0700,
   so no other-user traversal), but the secret should be 0600 from creation.

Marginal exposure is low (the same secrets already live in `.env.*.secret` on the dev
host; `/root` is 0700 on the box) — so this is **hardening, not a regression fix**.

## Actions

1. **F-NEW-1 — telemetry EXIT-trap finalize.** Give `build-deploy-telemetry.sh` a single
   **unconditional** EXIT-trap cleanup (mirroring profile's `finalize_deploy`) that removes
   **both** `LOCAL_TMPENV` and `SSH_PASSWORD_FILE`. Bash traps are **non-additive** — fold
   the existing password-branch `trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT` (`:244`) into the
   consolidated trap; set it early (before the staging) and replace the inline
   `rm -f "$LOCAL_TMPENV"` (`:358`) with the trap (or keep the happy-path rm and let the
   trap cover the failure path, as profile does with `REMOTE_ENV_STAGED`).
2. **A2 — close the remote 0600 window, both scripts.** Make the remote staging file 0600
   **from creation**: either pre-create it 0600 on the box before the SCP, or pipe the
   env block via stdin into a `umask 077`-guarded remote write instead of SCP-then-chmod.
   Apply in **both** `build-deploy-profile.sh` (`:491`/`:497`) and `build-deploy-telemetry.sh`
   (`:357`/`:361`).
3. **(Optional, C2 parity)** Align telemetry transport to profile's TOFU posture:
   `StrictHostKeyChecking=no → accept-new` in `build-deploy-telemetry.sh` (it currently uses
   `no`; profile uses `accept-new`). Cheap, one-line; do **not** add `known_hosts` pinning
   (that is a separate hard-requirement item — see 04g C2 residual).

## Out of scope

- Profile's `finalize_deploy` (already shipped in T4g — do not re-litigate).
- The persisted `DOCKER_TOKEN` / registry-credential hygiene → `sec12`.
- `known_hosts` host-key pinning (04g C2 residual; re-raise only if pinning becomes a hard
  requirement).
- Password-deploy fallback removal → `sec10`.
- On-disk `docker-compose.yml` atomicity after a failed pull (#4, `s4-profile-04e2` residual
  — left as a documented residual, low + pull-before-recreate-mitigated).

## Done Criteria

- An injected SCP failure in `build-deploy-telemetry.sh` leaves **no** `LOCAL_TMPENV`
  secret file on the dev host (assert: file gone after a forced-fail run — extend
  `tests/scripts/profile-deploy-hardening.test.sh` or a telemetry equivalent).
- The remote staging env_file is **0600 from creation** (no SCP-default-perms window) in
  both `build-deploy-profile.sh` and `build-deploy-telemetry.sh`.
- (If taken) telemetry uses `StrictHostKeyChecking=accept-new`, matching profile.
- `bash -n` clean on both scripts; existing argv-safety/concurrency assertions still pass.

## Outputs

- Deploy secret env_files are 0600 end-to-end (creation → transfer → box) and never leak on
  a failed transfer, across both the profile and telemetry pipelines.
