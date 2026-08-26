# Profile Server Skeleton

**Source**: `ai-agents/tasks/done/0173-profile-04a-server-skeleton/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4a

## Goal

Restore the smallest independently deployable profile-service foundation after the monolithic T4 backend-infrastructure change was reverted: a liveness-only HTTP server with no database, authentication, secret, or deploy surface.

## Key Changes

- Added `src/profile-server/Server.ts` with Express JSON middleware, `GET /health`, and startup through the validated profile HTTP port.
- Added `src/profile-server/ProfileEndpoints.ts`, including `DEFAULT_PROFILE_HTTP_PORT = 8080` and positive-integer `PROFILE_PORT` parsing with a safe fallback.
- Added a standalone JSON Winston logger in `src/profile-server/Logger.ts`; it deliberately avoids the game server logger and its configuration, OTEL, and resource dependencies.
- Added the `start:profile-server` package script and focused port-parsing coverage without adding `pg` or any database-backed endpoint.

## Outcome

The profile service now boots independently and returns `200 {"status":"ok"}` from `/health`. Database readiness, profile reads, internal crediting, repository code, and secret consumers remain explicitly assigned to T5. This slice unblocked the profile Docker image while preserving the bounded-review split established after the T4 reset.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — reason T4 was split into independently shippable slices
- [[tasks/profile-docker-image]] — T4c image that runs this server skeleton
