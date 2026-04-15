# Telemetry System (OTEL / Uptrace)

**Layer**: server
**Key files**: `src/server/Logger.ts`, `src/server/WorkerMetrics.ts`, `src/server/OtelTracing.ts`, `src/server/GameServer.ts`

## Summary

OpenTelemetry-based server observability. Production server emits logs, metrics, and traces to Uptrace at `https://telemetry.geoconflict.ru`. The dev server sends nothing to Uptrace — all Uptrace data is production only.

**Uptrace is for:** lag spikes, server errors, resource usage, per-worker correlation.
**Uptrace is NOT for:** player behaviour, funnels, A/B tests, tutorial completion — use GameAnalytics for those (see [[systems/analytics]]).

Source: `ai-agents/knowledge-base/uptrace-knowledge-base.md`

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

## Gotchas / Known Issues

- `BasicTracerProvider` v2 has no `.register()` — use `trace.setGlobalTracerProvider(provider)` instead
- Winston OTEL transport silently drops extra arguments — embed all error details in the message string
- Structured fields passed as second arg to `log.info()` may not arrive as attributes in Uptrace — verify in live instance
- `OTEL_EXPORTER_OTLP_ENDPOINT` absent in dev → no telemetry data for dev environments

## Related

- [[systems/game-overview]] — overall project context
- [[systems/analytics]] — player behaviour tracking (GameAnalytics), complementary
- [[systems/server-performance]] — performance investigation using these spans
- [[systems/match-logging]] — what is and isn't logged per match
