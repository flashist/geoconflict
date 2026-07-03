# Archive Telemetry Noise and S3 Archival Strategy

**Date**: 2026-06-01
**Status**: accepted

## Context

The inherited archive path is fully broken in production and generated about 26.6 logs/min in the 2026-05-07 Uptrace review. `src/server/Archive.ts` POSTs completed game records to `${config.jwtIssuer()}/game/:id`; in production this points at the game host, which has no `/game/:id` route. Singleplayer also attempts to upload compressed records from `src/client/LocalServer.ts`, where `keepalive: true` hits browser body-size limits and the worker route can still 413 after gzip decompression.

The archived data has no current product consumer. Match history is intended as a citizen-user feature, but the player profile store and citizenship implementation have not shipped.

Sources: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`

## Decision

Split archive work into two phases:

- **Now, in Sprint 4c:** reduce telemetry noise by disabling, short-circuiting, or demoting the dead archive calls. Do not build storage, add archive routes, or raise body limits for an inactive feature.
- **Later, with citizenship:** implement proper S3-compatible archival using the existing `DefaultConfig` storage slots, gate archival to citizen games, and re-enable read/write paths when match history has a live consumer.

The disk-on-master alternative is rejected. It creates unbounded disk growth on a single VPS, adds retention/auth/body-limit surface, and conflicts with the existing S3-compatible storage direction.

## Consequences

- The Sprint 4c archive task becomes a low-risk telemetry cleanup rather than a storage implementation.
- Match history remains unavailable until the player profile store, citizenship entitlement, and S3 infrastructure exist.
- The future archival task is mostly infrastructure, but still requires code for S3 read/write, citizen gating, upload limits, and retention.
- Documentation and task language should avoid re-proposing local disk archive storage unless the storage architecture decision changes.

## Related

- [[tasks/archive-endpoint-failures]]
- [[decisions/sprint-4]]
- [[decisions/sprint-4c]]
- [[systems/match-logging]]
- [[systems/telemetry]]
