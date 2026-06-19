# Task — Profile Backend Infra: Propagate `PROFILE_API_URL` into the game-server deploy env (T4h)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` (Part D, config/secrets). Follow-up to `s4-profile-04b-client-api-url-config.md` (T4b) — closes a decomposition gap surfaced in review: T4b wired `profileApiUrl` through the config chain into `/api/env` with **zero deploy surface**, so nothing propagates the value to the game-server container in a real deploy.

## Sprint
Sprint 4 (mergeable any time; **must land before** the later-sprint client UI that consumes `profileApiUrl`).

## Priority
Low — single-line plumbing, no behavior change until a consumer exists. **Hard prerequisite** for the later-sprint profile client UI: without it, `/api/env.profileApiUrl` is `""` in every real game-server deploy.

## Depends on
T4b (the `profileApiUrl` config + `/api/env` field + `example.env` doc must exist first). T4b is merge-independent of this.

## Blocks
The later-sprint client UI that reads `profileApiUrl` (that consumer is broken in prod until this lands).

## Context
The game server is deployed by `deploy.sh` → `update.sh`, which is a **separate pipeline** from the profile box (`build-deploy-profile.sh` / `setup-profile.sh`, owned by T4e). `deploy.sh` sources the layered env files (`.env` → `.env.secret` → `.env.$ENV` → `.env.$ENV.secret`, `deploy.sh:72-75`) but then writes the container's runtime env as an **explicit allowlist heredoc** (`deploy.sh:279-308`) — every var the container gets is named there (`API_BASE_URL`, `JWT_ISSUER`, `STORAGE_*`, `OTEL_*`, …). `update.sh:73` starts the container with `--env-file "$ENV_FILE"` **exclusively** (no bulk passthrough). `PROFILE_API_URL` is absent from that heredoc, so `process.env.PROFILE_API_URL` is unset in the container and `DefaultConfig.profileApiUrl()` falls back to `""`.

This is harmless today (T4b's value is consumer-less by design) but becomes a silent prod bug the moment the client UI ships. No existing sub-task owns the game-server `deploy.sh` (T4c–T4g all confirmed to not touch it; T4e is the profile-box pipeline only).

## Scope
- `deploy.sh`: add one line to the runtime-env heredoc (`deploy.sh:279-308`), mirroring the existing `API_BASE_URL=${API_BASE_URL}` pattern:
  ```
  PROFILE_API_URL=${PROFILE_API_URL}
  ```
  The value is already sourced from the layered env files by `deploy.sh:72-75`; this just forwards it into the generated container env file.
- Set the actual value per-environment in the relevant `.env.<env>` (operator config; not committed). `PROFILE_API_URL` is a **public URL, not a secret** → `.env.<env>`, never `.env.secret`. (`example.env` already documents the key, added in T4b.)

## Out of scope
- The profile-box env (`example.env.profile`, `profile.env`, `docker-compose.yml`) → T4d/T4e.
- `DATABASE_URL` / `PROFILE_INTERNAL_TOKEN` propagation → T4e.
- Any change to `DefaultConfig.profileApiUrl()` / `/api/env` / config plumbing → already done in T4b.
- The client UI that reads `profileApiUrl` → later sprint.

## Acceptance criteria (defined up front)
- After a deploy with `PROFILE_API_URL` set in `.env.<env>`, the generated remote env file contains a `PROFILE_API_URL=<value>` line and the running container's environment has it set (`docker exec <container> printenv PROFILE_API_URL` == the configured value).
- `https://<game-host>/api/env` returns `profileApiUrl` equal to the configured `PROFILE_API_URL` (no longer `""`).
- With `PROFILE_API_URL` unset in `.env.<env>`, the line resolves to `PROFILE_API_URL=` and `/api/env.profileApiUrl` is `""` (the documented default; no crash).
- No secret is added to the heredoc; `PROFILE_API_URL` stays in non-secret env (it is a public subdomain URL).

## Threat model
Negligible. `PROFILE_API_URL` is a public URL (no secret). Only failure mode is a typo'd var name in the heredoc (caught by the `printenv` / `/api/env` assertion). Mirrors the long-standing handling of `API_BASE_URL`.

## Review budget
1 round (single-line change).

## Salvage (reuse — do not re-derive)
- Existing `deploy.sh:279-308` heredoc + the `API_BASE_URL=${API_BASE_URL}` line as the exact pattern to copy.
- T4b's `example.env` `PROFILE_API_URL=` documentation block (already in repo).

## Independent test
Requires a real (or VM-simulated) game-server deploy — not dev-host unit-testable (it's an SSH deploy path). Set `PROFILE_API_URL` in a test `.env.<env>`, run `deploy.sh <env> <tag>`, then assert `docker exec` `printenv` and `curl https://<host>/api/env` both show the value; unset it and assert `""`.
