# Geoconflict — Uptrace Knowledge Base

**Last updated:** 2026-04-09
**Status:** Draft — contains `[TO VERIFY]` and `[TO FILL]` placeholders that require confirmation against the live Uptrace instance after 5d-A/5d-B are deployed and stable.

## Changelog

| Date | Change |
|---|---|
| 2026-04-09 | Initial document — code-confirmed content, awaiting post-deploy verification |

---

## 1. Overview

Uptrace is the server observability tool for Geoconflict. It receives data from the production server only.

**Uptrace IS used for:**
- Investigating lag spikes (slow turn spans)
- Debugging server errors (error logs with stack traces)
- Monitoring server resource usage (CPU, memory, event loop)
- Correlating incidents across workers

**Uptrace is NOT used for:**
- Player behaviour analytics — use GameAnalytics (see `analytics-event-reference.md`)
- Cross-session funnels, cohort analysis, or A/B test evaluation
- Tutorial completion rates or player progression

**Important:** The dev server does not send data to Uptrace. `OTEL_EXPORTER_OTLP_ENDPOINT` is absent in dev, so all Uptrace data reflects production only.

---

## 2. What Flows to Uptrace

### 2a. Server Logs

Source: `src/server/Logger.ts` — Winston with `OpenTelemetryTransportV3`.

All logs are JSON-formatted with these metadata fields on every entry:
- `service`: `"openfront"`
- `environment`: `"prod"` (or the value of `GAME_ENV`)
- `severity`: log level (`info`, `warn`, `error`)
- `timestamp`: ISO timestamp

All `console.warn()` calls from anywhere in the server process (including `src/core/`) are forwarded to Winston and appear in Uptrace via global interception in `Logger.ts`.

> **Note on structured fields:** Many log calls in `GameServer.ts` pass a plain object as the second argument (e.g. `log.info("msg", { clientID, persistentID })`). Whether these fields appear as attributes in Uptrace depends on how `OpenTelemetryTransportV3` handles Winston metadata. [TO VERIFY: confirm whether structured metadata fields arrive as attributes in Uptrace, or only the message string is delivered.]

**Key log events from `GameServer.ts`:**

| Event | Level | Message contains | Structured fields passed |
|---|---|---|---|
| Client (re)joins | info | — | `clientID`, `persistentID`, `clientIP`, `isRejoin` |
| Lobby creator joined | info | — | `gameID`, `creatorID` |
| Client disconnected | info | — | `clientID`, `persistentID` |
| Prestart message sent | info | — | `clientID`, `persistentID` |
| Start message sent | info | — | `clientID`, `persistentID` |
| Ending game | info | `turns.length` (inline) | — |
| Game archived | info | — | `gameID`, winner |
| Game past max duration | warn | — | `gameID` |
| Winner determined | info | vote ratio (inline) | `winnerKey` |
| Client kicked | info | — | `clientID`, `persistentID` |
| Failed to parse client message | error | `clientID`, error detail (inline) | — |

**Key log events from other server files (`Worker.ts`, `Master.ts`, `Archive.ts`):**

All error-level entries in these files embed the full stack trace directly in the message body via `formatError()` — no structured fields needed.

---

### 2b. System Metrics

Source: `src/server/WorkerMetrics.ts` — exported every **15 seconds** via `PeriodicExportingMetricReader`.

All metrics carry a `worker.id` attribute identifying which worker process reported them, enabling per-worker breakdown in Uptrace dashboards.

| Metric name | Type | Unit | What it measures |
|---|---|---|---|
| `geoconflict.server.games.total` | Gauge | — | All games on this worker (lobby + started) |
| `geoconflict.server.games.started` | Gauge | — | Games actively processing turns (excludes lobby) |
| `geoconflict.server.clients.connected` | Gauge | — | WebSocket clients connected to this worker |
| `geoconflict.server.cpu.usage` | Gauge | ratio 0.0–1.0 | CPU utilization — multiply ×100 for percentage display |
| `geoconflict.server.memory.heap.used` | Gauge | bytes | V8 heap currently in use |
| `geoconflict.server.memory.heap.total` | Gauge | bytes | V8 heap total allocated |
| `geoconflict.server.memory.rss` | Gauge | bytes | Resident set size (total process memory) |
| `geoconflict.server.eventloop.lag` | Gauge | ms | Event loop lag (mean over the last export interval) |
| `geoconflict.server.network.bytes_sent` | Counter | bytes | Cumulative bytes sent via WebSocket since process start |
| `geoconflict.server.network.bytes_recv` | Counter | bytes | Cumulative bytes received via WebSocket since process start |

[TO VERIFY: Confirm these names appear exactly as listed in Uptrace. The OTEL collector may add a prefix or rename metrics.]

---

### 2c. Slow Turn Spans

Source: `src/server/GameServer.ts` (`endTurn()` method) + OTEL tracer setup in `src/server/OtelTracing.ts`.

Spans are emitted **only** when a single game turn takes longer than `SLOW_TURN_THRESHOLD_MS`. Normal turns produce zero spans — there is no noise from fast turns.

**Current threshold:** 100ms [TO VERIFY: update after first-week calibration — may be adjusted to 80–150ms based on production data]

**Root span:** `server.turn.process`

Attributes on the root span:
| Attribute | Type | Description |
|---|---|---|
| `game.id` | string | Game ID |
| `turn.number` | number | Which turn number triggered the slow span |
| `intents.count` | number | Number of player intents in this turn |
| `clients.active` | number | Active WebSocket clients at time of broadcast |
| `message.size_bytes` | number | Serialised turn message size in bytes |
| `turn.duration_ms` | number | Total time for this turn in milliseconds |

**Child spans** (sequential, cover the three phases of `endTurn()`):

| Child span | What it measures |
|---|---|
| `turn.assembly` | Building the Turn object, pushing to `this.turns`, resetting `this.intents` |
| `synchronization` | `handleSynchronization()` (hash comparison) + `checkDisconnectedStatus()` (ping timeout sweep) |
| `turn.broadcast` | `JSON.stringify()` the turn message + `ws.send()` to all active clients |

Note: Intent *collection* time is not captured. Intents arrive continuously via WebSocket handlers throughout the tick interval; only the assembly/reset step is measured.

[TO VERIFY: Confirm spans appear in Uptrace with correct child spans and attributes by running the artificial delay test: add `await new Promise(r => setTimeout(r, 150))` to `endTurn()` locally and check Uptrace.]

---

### 2d. Error Tracking

Source: all `log.error()` calls in `src/server/` — all embed full stack traces in the message body via `formatError()` in `src/server/Logger.ts`.

**Server-side coverage:**
- Uncaught exceptions (`process.on("uncaughtException")`) — both `Worker.ts` and `Master.ts`
- Unhandled promise rejections (`process.on("unhandledRejection")`) — both `Worker.ts` and `Master.ts`
- WebSocket message parse failures (`GameServer.ts`)
- Game archive failures (`Archive.ts`)
- Game start/end errors (`GameManager.ts`)
- HTTP request errors (`Worker.ts`, `Master.ts`)
- Scheduling and lobby polling errors (`Master.ts`, `Worker.ts`)
- Feedback webhook/Telegram delivery failures (`Master.ts`)
- Privilege/cosmetics refresh failures (`PrivilegeRefresher.ts`)

**Client-side errors:** [TO VERIFY: confirm whether client-side errors are tracked in Uptrace or not yet implemented]

---

## 3. Key Workflows

### Workflow A — Investigating a lag spike

*Use when players report that the game was sluggish or turns were slow.*

1. Open Uptrace → **Tracing**
2. Search for span name: `server.turn.process`
3. Filter by the approximate time range of the reported spike
4. Open a span — check `turn.duration_ms` and identify which child span dominated:

| Slow child span | System metric pattern at the same time | Likely cause |
|---|---|---|
| `turn.broadcast` slow | High `clients.connected`, large `message.size_bytes` | Serialization cost or WebSocket backpressure — large late-game match |
| All spans slow | `eventloop.lag` spike | GC pause — check `memory.heap.used` chart for steady growth leading up to the spike |
| All spans slow | Normal event loop lag, high `cpu.usage` | Worker overload — check `games.started` per worker to see if one worker has too many matches |
| `synchronization` slow on every 10th turn | High `clients.connected` | Hash comparison cost scaling with player count |
| Slow turns on one worker only, others idle | Normal metrics on other workers | Hash-based routing imbalance — one worker has all the large games |
| `turn.assembly` slow | Everything normal | Unexpected — should not happen; investigate separately |

5. To correlate with system metrics: open Uptrace → **Metrics**, select `geoconflict.server.eventloop.lag` and `geoconflict.server.memory.heap.used`, set the same time range, group by `worker.id`

---

### Workflow B — Investigating an error

*Use when an error is reported or suspected in production.*

1. Open Uptrace → **Logs**
2. Filter by severity: `error`
3. Set the time range to when the error likely occurred
4. Search by partial message text (e.g. `"uncaught exception"`, `"Failed to parse"`, `"error archiving"`) or by `gameID` if known
5. Open the log entry — the full stack trace is in the message body
6. Note the `worker.id` metadata to identify which worker process was affected
7. To find related match events: keep the same time range, remove the `error` filter, search for the `gameID` from the error — this shows the full match lifecycle (joins, start, end) around the error

---

### Workflow C — Looking up a specific match

*Use when a player reports an issue and provides a game ID (e.g. from the feedback form).*

1. Open Uptrace → **Logs**
2. Search for the `gameID` string (exact match or substring)
3. All logged events for that match appear: client joins, game start, end, archive result, any errors during the match
4. Sort by timestamp ascending to reconstruct the lifecycle
5. To find any slow turns during this match: open Uptrace → **Tracing**, filter by attribute `game.id = <gameID>`

---

## 4. What Uptrace Cannot Answer

Some questions come up during incidents but Uptrace has no data for them. Use these alternatives instead:

| Question | Why Uptrace cannot answer | Where to look |
|---|---|---|
| What intents did players send during a match? | Intent sequences are stored in the turn archive only, not emitted to Uptrace | Turn archive |
| How many ghost (disconnected) players were in a match? | No aggregated ghost count exists; only raw `mark_disconnected` intents in the turn archive | Turn archive |
| What was the game state at tick N? | Tick-by-tick state is not stored anywhere | N/A |
| How many players completed the tutorial? | Player behaviour — not server observability | GameAnalytics (see `analytics-event-reference.md`) |
| What is the retention rate after first session? | Cross-session player behaviour | GameAnalytics |
| Why did the win condition fire? | Only the final result is logged; vote counts are in the log but not per-player detail | Log event "Winner determined" gives vote ratio only |
| Did a specific client experience lag? | Lag data is per-turn on the server side; client-perceived latency is not measured | N/A (no client-side latency instrumentation) |

---

## 5. Retention & Data Availability

**Data retention:** No custom TTL is configured in `uptrace.yml` — the deployment uses ClickHouse defaults. [TO VERIFY: check the actual retention period in the live Uptrace admin panel under Settings → Retention]

**Historical data:**
- System metrics (`geoconflict.server.*`): available from [TO FILL: date 5d-A deployed to production]
- Slow turn spans (`server.turn.process`): available from [TO FILL: date 5d-B deployed to production]
- Error tracking (stack traces in log body): available from [TO FILL: date 5d-B error tracking fix deployed]
- Data before these dates: not available

**Dev data:** None — the dev server does not have `OTEL_EXPORTER_OTLP_ENDPOINT` configured and sends nothing to Uptrace.
