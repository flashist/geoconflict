# Telemetry System (OTEL / Uptrace)

**Layer**: server
**Key files**: `src/server/Logger.ts`, `src/server/WorkerMetrics.ts`, `src/server/OtelTracing.ts`, `src/server/GameServer.ts`, `src/server/PrivilegeRefresher.ts`, `src/server/Archive.ts`, `src/client/LocalServer.ts`

## Summary

OpenTelemetry-based server observability. Production server emits logs, metrics, and traces to Uptrace at `https://telemetry.geoconflict.ru`. The dev server sends nothing to Uptrace — all Uptrace data is production only.

**Uptrace is for:** lag spikes, server errors, resource usage, per-worker correlation.
**Uptrace is NOT for:** player behaviour, funnels, A/B tests, tutorial completion — use GameAnalytics for those (see [[systems/analytics]]).

Sources: `ai-agents/knowledge-base/uptrace-knowledge-base.md`, `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md`, `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`, `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md`

## Architecture

### Logs
- Winston JSON logger (`src/server/Logger.ts`) with `OpenTelemetryTransportV3`
- Active when `OTEL_EXPORTER_OTLP_ENDPOINT` env var is set (prod only)
- All `console.warn()` from anywhere in the process is forwarded to Winston via global interception
- Every log entry carries: `service: "openfront"`, `environment`, `severity`, `timestamp`
- Stack traces embedded directly in message body via `formatError()` (Winston OTEL transport silently drops extra args — details must be in the message string)

### System Metrics (`WorkerMetrics.ts`)
Exported every **15 seconds** via `PeriodicExportingMetricReader`. All metrics carry `worker.id`.

| Metric | Type | Description |
|---|---|---|
| `geoconflict.server.games.total` | Gauge | All games (lobby + started) on this worker |
| `geoconflict.server.games.started` | Gauge | Games actively processing turns |
| `geoconflict.server.clients.connected` | Gauge | WebSocket clients on this worker |
| `geoconflict.server.cpu.usage` | Gauge (0.0–1.0) | CPU utilization ratio (×100 for %) |
| `geoconflict.server.memory.heap.used` | Gauge (bytes) | V8 heap in use |
| `geoconflict.server.memory.heap.total` | Gauge (bytes) | V8 heap total allocated |
| `geoconflict.server.memory.rss` | Gauge (bytes) | Resident set size |
| `geoconflict.server.eventloop.lag` | Gauge (ms) | Event loop lag mean |
| `geoconflict.server.network.bytes_sent` | Counter (bytes) | Cumulative WebSocket bytes sent |
| `geoconflict.server.network.bytes_recv` | Counter (bytes) | Cumulative WebSocket bytes received |

### Slow Turn Spans (`OtelTracing.ts` + `GameServer.ts`)
Emitted only when a turn exceeds `SLOW_TURN_THRESHOLD_MS` (100ms). Zero overhead on normal turns.

Root span: `server.turn.process`
Attributes: `game.id`, `turn.number`, `intents.count`, `clients.active`, `message.size_bytes`, `turn.duration_ms`

Child spans:
- `turn.assembly` — build Turn object, push to history, reset intents array
- `synchronization` — `handleSynchronization()` + `checkDisconnectedStatus()`
- `turn.broadcast` — `JSON.stringify()` + `ws.send()` to all clients

## Key Investigation Workflows

### Lag spike
1. Uptrace → Tracing → search `server.turn.process`
2. Filter by time range → open slow span → identify which child dominated:
   - `turn.broadcast` slow + high clients → serialization / WebSocket backpressure
   - All spans slow + `eventloop.lag` spike → GC pause (check heap growth)
   - All spans slow + high CPU → worker overload (check `games.started` per worker)
   - Every 10th turn `synchronization` slow → hash comparison at high player count

### Error investigation
1. Uptrace → Logs → severity `error` → search by message text or `gameID`
2. Full stack trace is in the message body

### Match lookup by game ID
1. Uptrace → Logs → search `gameID` string → shows join/start/end/archive events
2. Uptrace → Tracing → filter `game.id = <gameID>` → shows any slow turns for that match

## Current Error Priorities (2026-05-07)

A 1-hour Uptrace review on 2026-05-07 (14:57-15:57 Moscow time) found the most actionable production error families:

| Priority | Error family | Approx. rate | Severity | Likely fix difficulty | Primary paths |
|---|---:|---:|---|---|---|
| 1 | Cosmetics fetch/config failures | 138.6/min | Medium-high | Low-medium | `src/client/Cosmetics.ts`, `src/server/PrivilegeRefresher.ts` |
| 2 | Singleplayer/local hash crash | 31.0/min | High | Low-medium | `src/client/LocalServer.ts` |
| 3 | Archive endpoint/body-limit failures | 26.6/min | Medium-high | Medium | `src/server/Archive.ts`, `src/server/Worker.ts`, `src/client/LocalServer.ts` |
| 4 | Public lobby/map fetch failures | 9.3/min | Medium | Medium | `src/client/PublicLobby.ts`, `src/core/game/TerrainMapLoader.ts` |
| 5 | Minified client null-id/null-object errors | 1.8/min | Medium | Medium-high | Needs source maps/context |
| 6 | Mobile memory/WebGL rendering failures | 0.4/min | Medium-high for affected users | High | `src/client/graphics/**` |

Recommended order: fix cosmetics serving and `PrivilegeRefresher` failure handling first to remove the largest telemetry noise source; guard `LocalServer` hash assignment next because it is a direct client crash; then fix archive routing/body limits to preserve match history and replay/debug data.

## Retention Control

Uptrace `2.0.2` must keep the `ch_cluster`-based config shape generated by `setup-telemetry.sh`; the old top-level `ch:` retention block can crash startup. Retention is controlled through project-level PostgreSQL TTL fields instead: `spans_ttl`, `logs_ttl`, `events_ttl`, and `metrics_ttl`.

`UPTRACE_RETENTION_DAYS` defaults to 7. `setup-telemetry.sh` writes that value to the `geoconflict` project as nanoseconds, runs `uptrace retention check` once, and installs a daily cron entry that reruns the retention check. A live review on 2026-05-07 found the Uptrace 2.x default project TTL was 28 days for all four data classes, which is too high for the 59 GB telemetry VPS at the previously observed 3-4 GB/day ingest rate.

`build-deploy-telemetry.sh` must require real `UPTRACE_PROJECT_TOKEN`, `UPTRACE_SECRET_KEY`, and `UPTRACE_ADMIN_PASSWORD` values before uploading to the VPS. Dry-run config validation uses separate placeholder variables and must never mutate the real deploy environment.

## Gotchas / Known Issues

- `BasicTracerProvider` v2 has no `.register()` — use `trace.setGlobalTracerProvider(provider)` instead
- Winston OTEL transport silently drops extra arguments — embed all error details in the message string
- Structured fields passed as second arg to `log.info()` may not arrive as attributes in Uptrace — verify in live instance
- `OTEL_EXPORTER_OTLP_ENDPOINT` absent in dev → no telemetry data for dev environments
- `setup-telemetry.sh` must not generate top-level `ch:` config for Uptrace `2.0.2`; that config shape crashes Uptrace on startup and can surface externally as nginx `502 Bad Gateway`
- Do not rely on Uptrace 2.x default retention. On 2026-05-07 the live project default was 28 days; repo-managed setup should keep `UPTRACE_RETENTION_DAYS=7` unless the VPS disk size or ingest volume changes.
- Uptrace project TTL fields are nanoseconds. Dividing by `86400000000000.0` should show `7.000...` for a 7-day TTL; `0.007` means the script used microseconds and is wrong.
- Local ClickHouse filesystem tar backups are disabled because they can fill the 59 GB telemetry VPS disk. Preserve the `uptrace_clickhouse_data` Docker volume; do not use `docker compose down --volumes`, `docker volume prune`, or manual volume deletion as a recovery step.
- Weekly PostgreSQL backups remain enabled and are pruned after 14 days. The disk warning cron only writes to `/var/log/disk-warnings.log`; it is not an active notification.
- Current telemetry noise is dominated by cosmetics fetch failures, `LocalServer` hash assignment crashes, and archive failures; see "Current Error Priorities (2026-05-07)" before choosing telemetry cleanup work.

## Related

- [[systems/game-overview]] — overall project context
- [[systems/project-operations]] — environment and operational boundaries for production-only observability
- [[decisions/sprint-3]] — sprint where OTEL metrics and slow-turn spans were implemented (5d-A/B)
- [[decisions/vps-credential-leak-response]] — incident response that also repaired telemetry setup drift
- [[systems/analytics]] — player behaviour tracking (GameAnalytics), complementary
- [[systems/server-performance]] — performance investigation using these spans
- [[systems/match-logging]] — what is and isn't logged per match
