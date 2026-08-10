# Task — Profile Backend Infra: Deploy wiring + secret-staging + integration milestone (T4e3)

## Parent / Epic
`ai-agents/tasks/backlog/0013-player-profile-store-impl/brief.md` (Part D). **Decomposed from `s4-profile-04e-deploy-mechanics.md` (T4e)** — the final slice of the three-way split; owns the single end-to-end milestone. See postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — owns the **integration milestone** (`https://api.geoconflict.ru/health` 200 over TLS), the one end-to-end criterion no earlier slice can assert.

## Depends on
T4e1 (build/push + resolved `@sha256` digest), T4e2 (on-box stack + gate), and transitively **T4a** (route), **T4c** (image), **T4d** (nginx/TLS) — all merged.

## Blocks
T4g (argv + concurrency hardening of the now-assembled `build-deploy-profile.sh`).

## Context
Un-stubs the deploy/transport half of `build-deploy-profile.sh` and **wires the local digest (T4e1) to the on-box stack (T4e2)**: SSH auth + secret-staging over SCP + remote `setup-profile.sh` invocation, passing the `@sha256` digest and domain through. Owns the ONE end-to-end criterion no earlier slice can assert — a clean `npm run deploy:profile` ending in `https://api.geoconflict.ru/health` 200 over valid TLS. New surface is only wiring (all trap-guarded), so it ships functional; a bad SSH path errors before mutating the box. The milestone test legitimately needs T4e1+T4e2 merged — correct by construction, not a defect.

## Scope
- **Validate `PROFILE_SERVER_HOST`** (now needed for the SSH step).
- **SSH auth** — key path preferred and **default**; password fallback gated behind `ALLOW_PROFILE_SSH_PASSWORD_FALLBACK`, `StrictHostKeyChecking=accept-new`. **Keep the vulnerable `sshpass -p "$SSH_PASSWORD"` form verbatim** — the `-p`→`-f` 0600-file replacement is **T4g's net-new** (do NOT treat the seed's `-p` form as already-hardened).
- **Secret-staging over SCP with cleanup trap** — stage secrets in `LOCAL_TMPENV` (mktemp 0600) via `printf %q`, SCP to a 0600 `REMOTE_ENV`, EXIT/INT/TERM trap removing both staging files; SSH sources env, `rm`s it, runs `setup-profile.sh` (no secrets on box argv).
- **Digest + domain passthrough** — pass the `@sha256` `PROFILE_DIGEST` (T4e1) + `PROFILE_DOMAIN=api.geoconflict.ru` through so T4e2's healthy loopback upstream resolves the T4d nginx **502 → 200**.

## Out of scope
- Build/push/digest → **T4e1**. On-box stack/gate/systemd/cron → **T4e2**.
- `sshpass` `-p`→`-f` argv hardening, concurrency lock, atomic deploy record → **T4g**.
- Secret byte-scan gate → **T4f**.

## Acceptance criteria (defined up front)
- **INTEGRATION MILESTONE (single-owned):** a clean `npm run deploy:profile` ends with all services healthy and `https://api.geoconflict.ru/health` returns **200 over valid TLS** (requires T4e1 + T4e2 + T4a/T4c/T4d merged first via the dependency chain).
- The deployed image is referenced by the `@sha256` digest **end-to-end** — the box deploys by digest, not a mutable tag (closes the temporary mutable-tag window a per-keeper split would have opened).
- **No secret** appears in any process argv on the box during deploy (staged env_file sourced + `rm`'d) — verified by the staging trap + a `ps`-during-deploy spot check. (SSH password-path argv hardening is T4g; key path is default here.)
- A bad SSH target **errors before mutating the box**, and the EXIT/INT/TERM trap removes both staging files.

## Threat model
Closes the loop: secrets staged in a 0600 temp env_file, SCP'd 0600, sourced and immediately `rm`'d — never on box argv. The `@sha256` digest is propagated end-to-end so the box deploys by digest (closes the temporary mutable-tag window). The key path is default; the vulnerable `sshpass -p` form is **deliberately retained** for T4g to harden (must NOT be re-derived as done). The milestone test legitimately needs T4e1+T4e2 merged — correct by construction.

## Review budget
Max 2 rounds; round 2 ends in a flat residual bullet list.

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:build-deploy-profile.sh` — SSH key path; the **vulnerable** `sshpass -p` path (keep key-path default, leave `-p`→`-f` to T4g); secret-staging trap.
- Mirror: `build-deploy-telemetry.sh` 0600 env_file secret staging.

## Independent test
Deploy end-to-end against a reg.ru box (or VM playing the box) with T4e1 + T4e2 merged: assert `https://api.geoconflict.ru/health` **200 over valid TLS** (the milestone); no secret in any box argv (`ps` during deploy); staging files removed on EXIT. Force a bad SSH target → assert it errors **before** mutating the box and cleans up both staging files.
