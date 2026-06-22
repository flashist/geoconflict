# Coder handoff — s4-profile-04e3 (C1: signal-trap fix)

> **Scope: one small fix to `build-deploy-profile.sh`.** This is a *spec*, not an applied
> change. It came out of a stateful review (`ai-agents/reviews/s4-profile-04e3.md`); every
> other reviewer finding was verified as an intentional design or a non-defect and must NOT
> be touched (see **Do NOT change** below). Verify the claim against the code before editing
> (CLAUDE.md Review Notes) — it has already been verified once, but confirm.

## Context

`build-deploy-profile.sh` is the local build+deploy driver for the player-profile backend
(`npm run deploy:profile`). It builds the profile API image, pushes it, pins an immutable
`@sha256` digest, then **transports the deploy** over SSH/SCP: it stages all secrets into a
local 0600 temp env_file (`LOCAL_TMPENV`), SCPs it to a 0600 remote file (`REMOTE_ENV`), then
in one SSH session sources it, `rm`s it, and runs `setup-profile.sh` — so no secret ever hits
the box's process argv. A cleanup trap is meant to remove **both** staging files on any exit.

The transport block lives at roughly `build-deploy-profile.sh:282-341`. The relevant trap setup:

```bash
REMOTE_ENV="/root/.profile-deploy-env-$$"
LOCAL_TMPENV=$(mktemp)
REMOTE_ENV_STAGED=0
cleanup_secrets() {
    rm -f "$LOCAL_TMPENV"
    if [ "$REMOTE_ENV_STAGED" = "1" ]; then
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_ENV}" >/dev/null 2>&1 || true
    fi
}
trap cleanup_secrets EXIT INT TERM        # <-- the bug is here
chmod 600 "$LOCAL_TMPENV"
```

**In/out of scope:** in scope = the trap/signal handling for the secret-cleanup block only.
Out of scope = everything else in the file and all of `setup-profile.sh`.

## Changes to make

| severity | required? | location | summary |
|----------|-----------|----------|---------|
| medium | recommended (non-blocking) | `build-deploy-profile.sh:~302` | Split the trap so `INT`/`TERM` exit (cleanup runs once via `EXIT`); stop the script continuing after Ctrl-C. |

### C1 — `INT`/`TERM` trap never exits → false "DONE" on an aborted deploy

- **Where:** `build-deploy-profile.sh:295-302` (the `cleanup_secrets` definition + the
  `trap cleanup_secrets EXIT INT TERM` line).
- **Problem:** In bash, a trap handler for `INT`/`TERM` that does **not** call `exit` returns
  control to where execution was interrupted and the script **continues** with the next
  command (this differs from the default signal behavior, which terminates the script).
  `cleanup_secrets` has no `exit`, so:
  - **Primary (correctness) symptom:** pressing **Ctrl-C during the remote SSH phase**
    (`:334-339`) kills the `ssh` child, runs `cleanup_secrets`, then **falls through** to
    `:341` (`REMOTE_ENV_STAGED=0`) and `:343` (`print_header "DONE"` +
    "Profile backend setup completed") — i.e. the script reports **success on a deploy the
    operator just aborted.**
  - **Secondary (low-impact security) symptom:** if the signal lands in the narrow window
    between `chmod 600` (`:303`) and the secret-writing redirect `> "$LOCAL_TMPENV"` (`:311`),
    `cleanup_secrets` unlinks the temp file, and the resumed `>` **re-creates** it fresh at
    the operator's umask (e.g. 0644) before writing secrets and SCPing it.
- **Honest impact:** **Medium**, and *not merge-blocking*. The reviewers rated this "high";
  that is overstated. The security sub-case is low — the same secrets already sit in plaintext
  in `.env.profile.secret` on the same dev host, and it requires a sub-millisecond timing race.
  The real value of the fix is the **false-"DONE"-on-abort** correctness bug for the milestone
  owner. (`mktemp` is 0600 on the dev host, so there is no exposure on the *normal* path — this
  sub-case only exists *because* of the signal-continuation; fixing the trap closes it.)
- **Recommended fix** (standard idiom — `EXIT` cleans up exactly once; `INT`/`TERM` just exit
  with the conventional 128+signal status, which triggers the `EXIT` trap):

  ```bash
  trap cleanup_secrets EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  ```

  Replace the single `trap cleanup_secrets EXIT INT TERM` line at `:302` with the three lines
  above. Keep `cleanup_secrets` as-is (idempotent `rm -f` / best-effort remote `rm`). No other
  change is needed: on Ctrl-C the `INT` trap exits 130 → the `EXIT` trap runs `cleanup_secrets`
  once → the script stops before `:343`, so no false "DONE".

- **Optional belt-and-suspenders** (not required): add `umask 077` immediately before
  `LOCAL_TMPENV=$(mktemp)` so even a re-created temp file is 0600. Harmless; the trap fix alone
  already removes the race.

## Do NOT change (accepted residuals — settled in the review; re-introducing churn here is wrong)

- **Do not require `PROFILE_DOMAIN`.** Domain-unset is the intentional standalone/no-TLS mode
  (`setup-profile.sh:486,734`); requiring it breaks a supported path.
- **Do not "fix" the `/root/` remote paths vs `PROFILE_SSH_USER`.** Root is the deploy contract
  and this mirrors the in-production `build-deploy-telemetry.sh`. (An early `[ "$REMOTE_USER" =
  root ]` guard is *optional* only and must be done repo-wide with telemetry if at all — not here.)
- **Do not remove the `sshpass -p "$SSH_PASSWORD"` form.** Its `-p`→`-f` hardening is **T4g**, deliberately retained here.
- **Do not change the `CERTBOT_EMAIL` owner-email default.** Intentional.
- **Do not touch** the iidfile→secret-cleanup trap handoff logic (verified correct), the
  `REMOTE_ENV_STAGED` set-before-SCP ordering (verified correct), the local `chmod +x` (trivial),
  or the digest/`DATABASE_URL` passthrough (DATABASE_URL is inert → T5).

## Validation + acceptance criteria

- **Syntax:** `bash -n build-deploy-profile.sh` must stay clean.
- **Behavioral (no box needed):** in a scratch copy, reproduce the handler with a `sleep` in
  place of the SSH call and send `SIGINT` — confirm the script **exits non-zero** and does
  **not** print "DONE", and that both staging files are removed (the local `EXIT` cleanup runs
  exactly once; the remote `rm` is best-effort).
- **Acceptance:** Ctrl-C during the remote phase aborts with a non-zero status and no
  "Profile backend setup completed" line; the happy path is unchanged (still prints "DONE",
  cleanup runs once, `REMOTE_ENV_STAGED=0` skips the remote cleanup).
- **Test-harness caveat:** there is **no** bash test harness for deploy scripts in this repo
  (accepted residual, 04e1) — validate by `bash -n` + the manual signal reproduction above, not
  by adding a harness.
- The milestone gate (`https://api.geoconflict.ru/health` 200 over TLS) is the separate on-box
  *Independent test* in the task file — unaffected by this fix.
