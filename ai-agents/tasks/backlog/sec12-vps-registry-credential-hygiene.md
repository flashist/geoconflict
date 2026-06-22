# Task — VPS Registry Credential Hygiene

## Type
Security hardening follow-up.

## Origin
Raised as finding **X2** in the `s4-profile-04e3` stateful-review (PR 121) — see
`ai-agents/reviews/s4-profile-04e3.md` accepted residual "Broad `DOCKER_TOKEN`
persisted on the VPS (X2)". Recorded there as a frontier-move (out of that slice's
scope); homed here as its own task. Related: `sec11-secret-management-beyond-env-files.md`.

## Purpose

Stop a broad container-registry credential from persisting on the profile (and
telemetry) VPS after image pulls.

## Why This Matters

`setup-profile.sh:398-401` runs `docker login --password-stdin` so `docker compose
pull` can fetch a private `PROFILE_IMAGE`. The token is delivered securely (on stdin,
via a 0600 staged env_file that is sourced and `rm`'d — never in argv), **but there is
no `docker logout` and no isolated `DOCKER_CONFIG`**, so the credential persists in
`/root/.docker/config.json` (base64, not encrypted) on a public box. The runbook reuses
the **game's existing registry credentials**, so compromise of the profile VPS could
expose a credential capable of reading — and potentially pushing to — unrelated
production images.

Note: the *persistence across redeploys* was itself an accepted design choice in
`s4-profile-04e2` ("token is reuse-persisted"), so this task is **hardening, not a
regression fix** — it narrows the blast radius rather than fixing broken behavior.

## Actions

1. Confirm whether `PROFILE_IMAGE` actually requires authenticated pulls (private repo)
   on the box — if it can be public/pull-only-anonymous, the login may be droppable
   entirely.
2. Issue a **repository-scoped, pull-only** registry token for the VPS instead of
   reusing the game's broad credential.
3. In `setup-profile.sh` (and the telemetry equivalent), either:
   - run `docker compose pull` under an **isolated `DOCKER_CONFIG`** (temp dir, removed
     after the pull), or
   - `docker logout` immediately after the pull so no long-lived credential remains in
     `/root/.docker/config.json`.
4. Apply the same treatment **repo-wide** to `build-deploy-telemetry.sh` /
   `setup-telemetry.sh` if they persist a registry credential the same way.
5. Update deploy docs/runbook to specify the scoped pull-only token (not the game's
   creds) for VPS deploys.

## Out of scope

- The secure *delivery* of `DOCKER_TOKEN` to the box (already correct: stdin + 0600
  staged file, sourced + `rm`'d, never in argv — do not re-litigate).
- General secret-management architecture (vault/KMS) → `sec11`.
- Password-deploy fallback removal → `sec10`.

## Done Criteria

- the VPS uses a repository-scoped, pull-only registry token (or no login, if the image
  is pullable without auth)
- no long-lived registry credential remains in `/root/.docker/config.json` after a
  deploy (assert: inspect the file post-deploy → no token, or an isolated `DOCKER_CONFIG`
  that was removed)
- the same hygiene is applied to the telemetry deploy if it shares the pattern
- runbook/docs specify the scoped token

## Outputs

- registry credentials on the VPS are pull-only and non-persistent
