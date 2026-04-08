Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Server System Metrics via OpenTelemetry (Task 5d-A)

 Context

 Player-reported lag is under investigation. Task 5d-B already ships slow turn spans to Uptrace, but without system-level context (CPU, memory,
 event loop), those spans are ambiguous. This task adds continuous server resource metrics flowing to the same Uptrace instance, enabling
 correlation between slow turns and system state.

 The existing metrics pipeline is confirmed working — WorkerMetrics.ts already exports 3 gauges (active_games, connected_clients, memory_usage)
 every 15 seconds via OTEL to Uptrace. This task extends that file with 7 new metrics.

 Changes

 1. src/server/WorkerMetrics.ts — Add system metrics (primary change)

 Add the following gauges/counters to the existing initWorkerMetrics() function, using the same pattern as the existing 3 gauges:

 CPU usage — geoconflict.server.cpu.usage (percent)
 - Use os.cpus() to compute CPU utilization as a delta between samples
 - Store previous CPU snapshot in a closure; on each callback compute (idle_delta / total_delta) * 100

 Memory metrics — expand the existing openfront.memory_usage.bytes into 3 separate gauges:
 - geoconflict.server.memory.heap.used — process.memoryUsage().heapUsed
 - geoconflict.server.memory.heap.total — process.memoryUsage().heapTotal
 - geoconflict.server.memory.rss — process.memoryUsage().rss
 - Keep the existing openfront.memory_usage.bytes gauge for backwards compatibility

 Event loop lag — geoconflict.server.eventloop.lag (milliseconds)
 - Use perf_hooks.monitorEventLoopDelay({ resolution: 20 }) — built into Node.js
 - Call .enable() at init time
 - On each callback, read .mean (nanoseconds), convert to ms, then .reset()

 Network I/O — observable counters (cumulative bytes):
 - geoconflict.server.network.bytes_sent — read from GameManager.totalBytesSent()
 - geoconflict.server.network.bytes_recv — read from GameManager.totalBytesReceived()
 - Use meter.createObservableCounter() instead of gauge (these are monotonically increasing)

 Active turns — geoconflict.server.turns.active (count)
 - Read from GameManager.activeMatches() — counts games that have started but not ended

 All metrics include getPromLabels() as attributes (already contains openfront.component: "Worker N").

 Export interval: Keep the existing 15 seconds (task spec says 60s but 15s is already established and provides better resolution).

 2. src/server/GameManager.ts — Add aggregation methods

 Add 3 new methods:

 activeMatches(): number
 Count games where game.hasStarted() is true (excludes lobby-phase games). Differs from existing activeGames() which counts all games including
 lobbies.

 totalBytesSent(): number
 totalBytesReceived(): number
 Sum bytesSent and bytesReceived across all active GameServer instances.

 3. src/server/GameServer.ts — Track network bytes

 Add two public counters:
 public bytesSent: number = 0;
 public bytesReceived: number = 0;

 - Increment bytesSent += msg.length in endTurn() broadcast loop (line 707-709) — this already has msg computed
 - Increment bytesReceived += data.length in the WebSocket message handler

 4. Part C — Dashboard (manual, not code)

 The Uptrace dashboard creation is a manual step done via the Uptrace UI at telemetry.geoconflict.ru. After metrics are flowing, create 6 panels as
 specified in the task. This is not a code change.

 Files modified

 ┌─────────────────────────────┬─────────────────────────────────────────────────────────────────┐
 │            File             │                             Change                              │
 ├─────────────────────────────┼─────────────────────────────────────────────────────────────────┤
 │ src/server/WorkerMetrics.ts │ Add 7 new metrics (gauges + counters)                           │
 ├─────────────────────────────┼─────────────────────────────────────────────────────────────────┤
 │ src/server/GameManager.ts   │ Add activeMatches(), totalBytesSent(), totalBytesReceived()     │
 ├─────────────────────────────┼─────────────────────────────────────────────────────────────────┤
 │ src/server/GameServer.ts    │ Add bytesSent/bytesReceived counters, increment in send/receive │
 └─────────────────────────────┴─────────────────────────────────────────────────────────────────┘

 Key decisions

 - No new npm packages — all metrics use Node.js built-ins (os, perf_hooks, process)
 - Keep existing openfront.memory_usage.bytes — don't break existing dashboards that may reference it
 - Application-level network tracking — track bytes at the WebSocket layer rather than OS-level /proc/net/dev (portable, and captures exactly the
 game traffic we care about)
 - 15s export interval — keep the existing cadence rather than changing to 60s as task suggests

 Verification

 1. npm run lint and npm test — no regressions
 2. Start with npm run dev (no OTEL_EXPORTER_OTLP_ENDPOINT) — confirm no metrics are sent, no errors
 3. After deploy: confirm all 7 new metrics appear in Uptrace with openfront.component per-worker breakdown
 4. Event loop lag test: add a temporary setTimeout(() => { const end = Date.now() + 150; while (Date.now() < end); }, 5000) in dev to verify the
 metric registers the spike