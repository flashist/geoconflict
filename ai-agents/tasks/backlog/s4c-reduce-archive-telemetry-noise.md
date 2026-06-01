# Task — Reduce Archive Endpoint Telemetry Noise

## Sprint
Sprint 4c — Stabilization

## Priority
Medium-high — the archive path emits ~26.6 errors/min, the 3rd-largest telemetry
noise source in the 2026-05-07 Uptrace review. The data has **no consumer today**
(match history is a citizen-only feature and citizenship is not implemented yet), so
the feature can be safely turned off to clear the noise without losing anything a user
can reach.

This is the "stop the noise NOW" half of the archive task split. The real S3-backed
archival is assigned to Sprint 4 (`s4-archive-s3-backed-citizen-gated.md`), after the
player profile store + citizenship land.

---

## Context

The match-archiving path is a leftover from the upstream openfront.io fork. Upstream
archived completed matches to a **separate external service**; this fork kept the code
that *sends* records but never stood up the service that receives them. As a result
every finished game POSTs to a host that returns 404.

Three error groups, all from the archive path (2026-05-07 telemetry window):

| Error | Rate | Cause |
|---|---|---|
| `error archiving game record (gameID: ...): Not Found` | 16.29/min | `src/server/Archive.ts` POSTs to `${config.jwtIssuer()}/game/{gameID}`, a route that does not exist on the geoconflict server (404). Affects multiplayer **and** singleplayer. |
| `TypeError: Failed to archive singleplayer game: Failed to fetch` | 9.64/min | `src/client/LocalServer.ts` singleplayer upload fails in the browser — larger games exceed the hard 64 KB `keepalive` request limit. |
| `Error in POST /api/archive_singleplayer_game: PayloadTooLargeError` | 0.64/min | A handful of singleplayer uploads exceed the Express JSON body limit on the `/api/archive_singleplayer_game` route in `src/server/Worker.ts`. |

The archive is *intended* to be the authoritative historical store (see
[[systems/match-logging]]), but nothing reads it today. We are spending the noisiest
archive error budget in telemetry to populate a store that has no consumer.

Sources:
- `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`
- `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`
- `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

Goal: drop all three archive error groups to ~0 **without building any storage**,
since archival is intentionally inactive until citizenship ships.

1. **Server-side multiplayer archive (`src/server/Archive.ts` / `GameServer.ts`):**
   short-circuit the call so completed games no longer POST to the non-existent
   endpoint. At minimum, demote the failure log so it stops flooding telemetry — but
   prefer not making the doomed request at all.

2. **Singleplayer client archive (`src/client/LocalServer.ts`):** stop or quiet the
   singleplayer upload while archival is inactive. A disabled fire-and-forget path
   must not surface as an uncaught rejection or a `console.error`.

3. **Mark the disable clearly.** Whatever guard turns the feature off (a single
   constant / config flag is ideal) must be obvious and centralized, so Task 2 can
   re-enable the path with a one-line change. Add a short comment pointing to
   `s4-archive-s3-backed-citizen-gated.md`.

### Out of scope
- No S3 / object storage.
- No new endpoints or routes.
- No body-limit or infrastructure changes.
- Do not delete the archive code — disable it so it can be re-enabled cleanly.

---

## Verification

1. After deploy, the `Not Found`, `Failed to fetch`, and `request entity too large`
   archive error groups disappear or drop sharply in Uptrace (this is the delivery
   gate — code-complete is not done).
2. No storage, routes, or infra were introduced.
3. The disable is centralized and clearly marked so Task 2 re-enable is trivial.
4. Existing tests pass; the singleplayer match-end flow still completes normally with
   archival off.

---

## Notes
- This is a telemetry-driven stabilization task. "Done" = the error groups actually
  drop in production, not just that the code shipped.
- Removing this noise also improves signal quality for the lower-rate clusters in the
  same Uptrace review (lobby/map fetch, null-id) — sequence this before re-triaging
  those.
- Do not change archive fire-and-forget semantics beyond disabling the path.
