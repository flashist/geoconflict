# Task — Profile Backend Infra: Server skeleton (/health-only) + standalone logger/port (T4a)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D ops). One of **7 sub-tasks** split from `s4-profile-04-backend-infra.md` after the first attempt bounced — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`. Each sub-task merges independently and shrinks the review surface.

## Sprint
Sprint 4

## Priority
High — smallest unit, zero deploy surface, unblocks the image (T4c). Verified entirely on the dev host (no VPS, no Docker).

## Depends on
None.

## Blocks
T4c.

## Context
The whole T4 merge (PR #112, merge commit `4e56fbf`) was reverted; `src/profile-server/` is empty on `dev`. This slice re-lays the liveness-only HTTP skeleton — nothing reads the DB, the service token, or the allowlist (those are absent consumers; hardening for them is what bounced the first attempt).

## Scope
- `src/profile-server/Server.ts`: `dotenv.config()`, Express app, `express.json()`, single route `GET /health` → 200 `{status:"ok"}`, listen on `profileHttpPort()`.
- `src/profile-server/ProfileEndpoints.ts`: `DEFAULT_PROFILE_HTTP_PORT=8080` + `profileHttpPort()` (parses `PROFILE_PORT`, validates positive int, falls back to 8080).
- `src/profile-server/Logger.ts`: standalone winston JSON logger (`defaultMeta {service:"profile"}`, Console transport) + `formatError`. **Deliberately NOT** `src/server/Logger.ts` — that pulls the game-config chain + OTEL + `resources/` the image does not ship.
- `package.json`: add `start:profile-server` (ts-node ESM on `Server.ts`). **Do NOT add a `pg` dependency.**
- A comment in `Server.ts` naming `/ready`, `GET /v1/profile`, `POST /internal/v1/credit`, and the `pg` repository as **T5**.

## Out of scope
- `/ready` readiness check and any DB-touching route → **T5** (now explicitly owned: `s4-profile-05-backend-db-api.md` Scope item 4 + Acceptance — DB-backed `SELECT 1`, distinct from this slice's liveness-only `/health`).
- `GET /v1/profile`, `POST /internal/v1/credit`, `pg` / `PlayerProfileRepository` → T5.
- Dockerfile / build / deploy → T4c/T4e/T4f/T4g.
- The full-stack `https://api.geoconflict.ru/health` 200-over-TLS assertion → **integration milestone owned by T4e**, not asserted here.

## Acceptance criteria (defined up front — termination is here, never "reviewer returns clean")
- `npm run start:profile-server` boots and `curl localhost:8080/health` returns HTTP 200 body `{"status":"ok"}` (this slice's own terminating criterion).
- `profileHttpPort()` returns 8080 for unset/invalid `PROFILE_PORT` and the parsed integer for a valid positive value (unit-tested).
- `Logger.ts` imports resolve without pulling `src/server/Logger.ts`, `src/core` game config, OTEL, or any `resources/` file (grep proof: zero import of `src/server/Logger`).
- No `src/` file added here reads `DATABASE_URL`, `PROFILE_INTERNAL_TOKEN`, or `PROFILE_INTERNAL_ALLOW_IPS` (grep = 0 hits); `pg` is not in `package.json` dependencies.
- `npm run lint` and `npm test` pass.

## Threat model
n/a (no security surface). Liveness-only HTTP, no DB, no auth, no secrets, no outbound calls. Only failure modes: a misparsed port (handled by fallback) and accidentally importing the heavy game-config logger (guarded by the grep check). All runtime-certifying hardening (DB-URL validity, `/internal/` boundary) is for absent consumers and excluded.

## Review budget
1 round.

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:src/profile-server/Server.ts`
- `git show 4e56fbf:src/profile-server/ProfileEndpoints.ts`
- `git show 4e56fbf:src/profile-server/Logger.ts`
- `git show 4e56fbf:package.json` (the `start:profile-server` script line)

## Independent test
Run `npm run start:profile-server` locally and curl `/health`; run the port-parsing unit test; grep `src/profile-server` to prove zero secret consumers. Fully verified on the dev host.
