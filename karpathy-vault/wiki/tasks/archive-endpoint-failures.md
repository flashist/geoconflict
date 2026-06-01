# Archive Endpoint Telemetry Noise

**Source**: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`
**Status**: backlog
**Sprint/Tag**: Sprint 4c / stabilization

## Goal

Reduce the production archive error groups without building storage yet. Match history is intended for citizen users, but citizenship is not implemented, so no live feature can consume archived records in the near term.

## Key Changes

The archive work was split on 2026-06-01:

- **Sprint 4c now:** short-circuit or quiet the dead server archive path in `src/server/Archive.ts` so completed games no longer POST to the non-existent inherited endpoint. Also skip or quiet the singleplayer upload in `src/client/LocalServer.ts` while archival is inactive.
- **Out of scope now:** no S3, no disk storage, no new `Master.ts` archive routes, and no body-limit increase just to accept data the server will not store.
- **Later with citizenship:** implement S3-compatible archive read/write through `DefaultConfig.storageEndpoint()` / `storageBucket()` / `storageAccessKey()` / `storageSecretKey()`, and gate archival to citizen games only.
- Keep the code shape easy to re-enable for the later S3 implementation, and keep richer archive failure logging available for that future path.

## Outcome

Not implemented yet. The investigation found three production archive failure groups, totaling about 26.6 logs/min in the 2026-05-07 Uptrace window:

- Server archive 404s from `archive()` POSTing to `${config.jwtIssuer()}/game/:id`, which resolves to the game host and has no matching route.
- Browser-side singleplayer `Failed to fetch` errors caused by `keepalive: true` hitting the browser's roughly 64 KB body cap before the request leaves the client.
- Server-side singleplayer 413s because Express's default `express.json()` limit is enforced on the decompressed gzip body.

The earlier disk-on-master approach is rejected. It would create unbounded single-VPS disk growth, require extra route/body-limit/auth surface, and diverge from the S3-compatible storage config that already exists. The accepted path is documented in [[decisions/archive-archival-strategy]].

## Related

- [[decisions/archive-archival-strategy]]
- [[decisions/sprint-4]]
- [[decisions/sprint-4c]]
- [[systems/telemetry]]
- [[systems/match-logging]]
