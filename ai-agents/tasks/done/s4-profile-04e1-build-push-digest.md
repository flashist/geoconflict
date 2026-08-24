# Task — Profile Backend Infra: Local build + push + @sha256 digest pinning (T4e1)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D). **Decomposed from `s4-profile-04e-deploy-mechanics.md` (T4e)** — the first of three slices that split T4e along the test-assertion boundary (local / on-box / wiring). See postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — the purely-local build artifact; unblocks the scan gate (T4f) and the wiring slice (T4e3).

## Depends on
T4c (Dockerfile/image).

## Blocks
T4e3 (wiring needs the resolved digest); T4f (the secret byte-scan inserts **before push**, which this slice owns).

## Runs in parallel with
T4e2 — different file (`build-deploy-profile.sh` vs `setup-profile.sh`), zero shared lines.

## Context
The purely-**LOCAL** half of `build-deploy-profile.sh` — everything that runs on the dev machine and needs no VPS: layered env load + validation, an amd64 build, the registry push, and resolving an immutable `@sha256` digest from the **built image ID** (fail-closed if none). Carries keepers **K2** (digest, source half) and **K7** (amd64). The deploy/transport half (SSH/SCP, remote setup invocation) is **stubbed** so the script is syntactically whole and `npm run deploy:profile` exits cleanly with a clear "transport/deploy lands in T4e3" message — T4e3 un-stubs it. This is the only fully box-independent, fully isolation-testable surface in T4e, so it goes first and carries the two local-half keepers cleanly.

## Scope
- **`build-deploy-profile.sh` skeleton** — layered env load (`.env` → `.env.secret` → `.env.profile` → `.env.profile.secret`, allexport); validate the **local** preconditions only: `DOCKER_USERNAME`/`DOCKER_REPO`, `POSTGRES_PASSWORD`, and that the script + `Dockerfile.profile` exist. (`PROFILE_SERVER_HOST` validation is deferred to T4e3 — only the SSH step needs it.)
- **Build + push** — `VERSION_TAG=$(git rev-parse --short HEAD)`; `PROFILE_IMAGE=user/repo:profile-<tag>`; `docker buildx build --platform linux/amd64 --load` (**K7**, not plain `docker build`); registry login via `DOCKER_TOKEN` on stdin `--password-stdin`; `docker push`.
- **Digest pin (K2)** — resolve `PROFILE_DIGEST` from the **built image ID** (not the tag); **fail closed** if no canonical `@sha256` digest resolves.
- **Deploy half stubbed** — after push, echo "transport/deploy stage lands in T4e3" and exit 0 (no box contacted). Keep the file structured so T4e3 drops the SSH/SCP wiring in without rework.
- `package.json`: add `deploy:profile` script.

## Out of scope
- SSH/SCP secret-staging, remote `setup-profile.sh` invocation, the integration milestone → **T4e3**.
- The secret byte-scan gate between build and push → **T4f**.
- `sshpass` argv hardening, concurrency lock, atomic deploy record → **T4g**.
- Everything on-box (compose, `profile.env`, systemd, cron, health-gate, rollback) → **T4e2**.

## Acceptance criteria (defined up front)
- `npm run deploy:profile` builds a **linux/amd64** image (assert via `docker inspect` / `docker buildx imagetools inspect` on the pushed digest) and pushes it.
- `PROFILE_DIGEST` resolves to a canonical `@sha256` from the built image ID; if no digest resolves, the script **FAILS CLOSED** (assert by mangling the inspect output).
- Registry login uses `--password-stdin` — no token in any process argv.
- With the deploy half stubbed, the script exits **0** after push with a clear "transport/deploy lands in T4e3" message — **no VPS is contacted** and the T4d box state is unchanged (still 502).

## Threat model
K2 (deploy by immutable digest, never a mutable tag — a concurrent retag can't swap the image past T4e2's gate) and K7 (amd64 so the reg.ru box can execute it) both originate here. Registry token via `--password-stdin`, never argv. No box is touched, so the T4d baseline (nginx/TLS terminating with a 502) is untouched — this slice can only leave the system equal-or-better.

## Review budget
Max 2 rounds; round 2 ends in a flat residual bullet list.

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:build-deploy-profile.sh` — env load; build/push; `--password-stdin` login. **Keep the deploy/SSH half stubbed** (do NOT bring SSH/SCP here — that's T4e3).
- Postmortem §14 **K2** (digest resolve from `BUILT_IMAGE_ID`, fail-closed), **K7** (`buildx --platform linux/amd64`).

## Independent test
On an arm64 dev host with registry creds, run `npm run deploy:profile`: assert the pushed image is amd64 (`docker inspect` on the digest), `PROFILE_DIGEST` is an `@sha256`, mangling the inspect output makes it **fail closed**, and the run exits **0** without contacting any VPS. Fully isolation-testable — no box, no stack, no TLS.
