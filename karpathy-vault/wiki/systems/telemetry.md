# Telemetry System (OTEL / Uptrace)

**Layer**: server
**Key files**: `src/server/Logger.ts`, `src/server/WorkerMetrics.ts`, `src/server/OtelTracing.ts`, `src/server/GameServer.ts`, `src/server/PrivilegeRefresher.ts`, `src/server/Archive.ts`, `src/client/LocalServer.ts`

## Summary

OpenTelemetry-based server observability. Production server emits logs, metrics, and traces to Uptrace at `https://telemetry.geoconflict.ru`. The dev server sends nothing to Uptrace — all Uptrace data is production only.

**Uptrace is for:** lag spikes, server errors, resource usage, per-worker correlation.
**Uptrace is NOT for:** player behaviour, funnels, A/B tests, tutorial completion — use GameAnalytics for those (see [[systems/analytics]]).

Sources: `ai-agents/knowledge-base/uptrace-knowledge-base.md`, `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md`, `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`, `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md`, `ai-agents/knowledge-base/telemetry-clickhouse-system-log-retention-2026-05-08.md`, `ai-agents/knowledge-base/telemetry-clickhouse-file-log-hardening-2026-05-10.md`, `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`

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
| 3 | Archive endpoint/body-limit failures | 26.6/min | Medium-high | Low for noise cleanup; medium-large for future S3 archival | `src/server/Archive.ts`, `src/server/Worker.ts`, `src/client/LocalServer.ts` |
| 4 | Public lobby/map fetch failures | 9.3/min | Medium | Medium | `src/client/PublicLobby.ts`, `src/core/game/TerrainMapLoader.ts` |
| 5 | Minified client null-id/null-object errors | 1.8/min | Medium | Medium-high | Needs source maps/context |
| 6 | Mobile memory/WebGL rendering failures | 0.4/min | Medium-high for affected users | High | `src/client/graphics/**` |

Recommended order: fix cosmetics serving and `PrivilegeRefresher` failure handling first to remove the largest telemetry noise source; guard `LocalServer` hash assignment next because it is a direct client crash; then reduce archive noise by disabling or quieting the dead archive path. The archive cleanup is implemented through `archiveEnabled() === false`; after deploy, Uptrace should be checked to confirm the three archive error groups drop. Real S3-backed archival waits for citizenship because match history has no live consumer yet.

## Retention Control

Uptrace `2.0.2` must keep the `ch_cluster`-based config shape generated by `setup-telemetry.sh`; the old top-level `ch:` retention block can crash startup. Retention is controlled through project-level PostgreSQL TTL fields instead: `spans_ttl`, `logs_ttl`, `events_ttl`, and `metrics_ttl`.

`UPTRACE_RETENTION_DAYS` defaults to 7 for spans, logs, and events. `UPTRACE_METRICS_RETENTION_DAYS` defaults to 90 because metrics are comparatively small and useful for performance trend analysis. `setup-telemetry.sh` writes both values to the `geoconflict` project as nanoseconds, runs `uptrace retention check` once, and installs a daily cron entry that reruns the retention check. A live review on 2026-05-07 found the Uptrace 2.x default project TTL was 28 days for all four data classes, which is too high for high-volume trace/log/event data on the 59 GB telemetry VPS at the previously observed 3-4 GB/day ingest rate.

`build-deploy-telemetry.sh` must require real `UPTRACE_PROJECT_TOKEN`, `UPTRACE_SECRET_KEY`, and `UPTRACE_ADMIN_PASSWORD` values before uploading to the VPS. Dry-run config validation uses separate placeholder variables and must never mutate the real deploy environment.

## ClickHouse System and File Log Retention

On 2026-05-08, the live telemetry VPS disk increase was traced to ClickHouse internal system logs rather than Uptrace telemetry data. The `uptrace_clickhouse_data` Docker volume was about 44 GB while active Uptrace application tables were under 1 GB. The largest tables were `system.trace_log` (about 30 GB) and `system.text_log` (about 7 GB).

`setup-telemetry.sh` now writes ClickHouse config files that keep internal log tables short-lived, lower `text_log` to warning level, and disable default query/memory profiler sampling so `system.trace_log` does not grow rapidly on the small VPS. During setup it also discovers existing ClickHouse system log tables, applies TTLs to them, and truncates those diagnostic tables by default. Discovery includes numeric suffix tables such as `system.trace_log_0` and `system.text_log_0`, which ClickHouse can leave behind when system log table definitions change. This cleanup must only target ClickHouse `system.*_log` tables; never truncate `uptrace.*` tables and never delete the ClickHouse Docker volume.

On 2026-05-10, a follow-up check found the system-table retention fix was working (`uptrace_clickhouse_data` stayed around 500 MB), but ClickHouse filesystem logs under `/var/log/clickhouse-server` grew to about 933 MB from repeated `MEMORY_LIMIT_EXCEEDED` background-merge stack traces. This was container writable-layer growth, not telemetry table growth.

`setup-telemetry.sh` now also writes `clickhouse-logger.xml`, caps filesystem log rotation, truncates existing ClickHouse file logs on setup/redeploy by default, and writes `clickhouse-memory.xml` so ClickHouse applies the memory headroom setting through server config. The setup recreates ClickHouse/Uptrace/otelcol during redeploy because ClickHouse and Uptrace read mounted config at process startup. `build-deploy-telemetry.sh` propagates these settings to remote redeploys and clean setups.

Default ClickHouse log and memory settings:

| Variable | Default | Purpose |
|---|---:|---|
| `CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS` | 1 | Retention for high-volume internal logs such as `trace_log`, `text_log`, `metric_log`, and `processors_profile_log` |
| `CLICKHOUSE_QUERY_LOG_RETENTION_DAYS` | 3 | Retention for query/part diagnostic logs |
| `CLICKHOUSE_TRUNCATE_SYSTEM_LOGS` | 1 | Clears existing ClickHouse system log tables during setup to recover disk space |
| `CLICKHOUSE_TRUNCATE_FILE_LOGS` | 1 | Clears existing `/var/log/clickhouse-server` file logs during setup/redeploy |
| `CLICKHOUSE_FILE_LOG_LEVEL` | `warning` | Suppresses debug/trace filesystem log spam |
| `CLICKHOUSE_FILE_LOG_SIZE` | `50M` | Rotates each ClickHouse filesystem log at a bounded size |
| `CLICKHOUSE_FILE_LOG_COUNT` | 2 | Keeps a small number of rotated ClickHouse filesystem logs |
| `CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO` | `0.75` | Written to ClickHouse `max_server_memory_usage_to_ram_ratio`; gives background merges more headroom than the earlier `0.6` cap that triggered repeated merge failures |

## Gotchas / Known Issues

- `BasicTracerProvider` v2 has no `.register()` — use `trace.setGlobalTracerProvider(provider)` instead
- Winston OTEL transport silently drops extra arguments — embed all error details in the message string
- Structured fields passed as second arg to `log.info()` may not arrive as attributes in Uptrace — verify in live instance
- `OTEL_EXPORTER_OTLP_ENDPOINT` absent in dev → no telemetry data for dev environments
- `setup-telemetry.sh` must not generate top-level `ch:` config for Uptrace `2.0.2`; that config shape crashes Uptrace on startup and can surface externally as nginx `502 Bad Gateway`
- Do not rely on Uptrace 2.x default retention. On 2026-05-07 the live project default was 28 days; repo-managed setup should keep `UPTRACE_RETENTION_DAYS=7` for spans/logs/events unless the VPS disk size or ingest volume changes, and keep `UPTRACE_METRICS_RETENTION_DAYS=90` for longer performance trends.
- Uptrace project TTL fields are nanoseconds. Dividing by `86400000000000.0` should show `7.000...` for a 7-day TTL; `0.007` means the script used microseconds and is wrong.
- If `/var/lib/docker/volumes/uptrace_clickhouse_data` grows while active `uptrace.*` tables are small, check ClickHouse `system.*_log` tables first. `system.trace_log`, `system.text_log`, and suffixed variants such as `system.trace_log_0` can dominate disk if query profiling and verbose text logging are left at defaults.
- If `docker system df -v` shows ClickHouse container writable-layer growth while the `uptrace_clickhouse_data` volume is small, check `/var/log/clickhouse-server` inside the container. Repeated ClickHouse errors can create large filesystem logs even when telemetry tables are healthy.
- `uptrace retention check` can fail from ClickHouse memory exhaustion even when project TTL fields are correct. The warning `ch.max_execution_time can't be empty` means the Uptrace `ch_cluster` replica config is missing `max_execution_time`, but that warning is separate from the memory failure.
- Local ClickHouse filesystem tar backups are disabled because they can fill the 59 GB telemetry VPS disk. Preserve the `uptrace_clickhouse_data` Docker volume; do not use `docker compose down --volumes`, `docker volume prune`, or manual volume deletion as a recovery step.
- Weekly PostgreSQL backups remain enabled and are pruned after 14 days, preserving two weekly metadata restore points while keeping local backup storage conservative on the 59 GB telemetry VPS. The disk warning cron only writes to `/var/log/disk-warnings.log`; it is not an active notification.
- Current telemetry noise is dominated by cosmetics fetch failures, `LocalServer` hash assignment crashes, and archive failures; see "Current Error Priorities (2026-05-07)" before choosing telemetry cleanup work.
- Sprint 4c turns the current error-priority list into a short stabilization sprint before the May 15, 2026 travel pause.
- Archive failures should not be fixed by adding local disk storage. The accepted split is to clear telemetry noise now by no-oping archive writes through `archiveEnabled()`, then defer S3-backed citizen archival until the player profile and citizenship track exists; see [[decisions/archive-archival-strategy]].

## Related

- [[systems/game-overview]] — overall project context
- [[systems/project-operations]] — environment and operational boundaries for production-only observability
- [[systems/configuration]] — OTEL endpoint/auth and environment config gates
- [[decisions/sprint-3]] — sprint where OTEL metrics and slow-turn spans were implemented (5d-A/B)
- [[decisions/sprint-4c]] — production stabilization sprint based on the current Uptrace error priorities
- [[decisions/archive-archival-strategy]] — archive noise cleanup and deferred S3 archival decision
- [[decisions/vps-credential-leak-response]] — incident response that also repaired telemetry setup drift
- [[systems/analytics]] — player behaviour tracking (GameAnalytics), complementary
- [[systems/server-performance]] — performance investigation using these spans
- [[systems/match-logging]] — what is and isn't logged per match
- [[tasks/cosmetics-serving]] — Sprint 4c fix for the highest-rate cosmetics error family
- [[tasks/local-server-hash-guard]] — Sprint 4c guard for the singleplayer/local hash crash family
- [[tasks/archive-endpoint-failures]] — Sprint 4c archive telemetry noise cleanup
