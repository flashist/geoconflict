# Task 5d-A — Server System Metrics via OpenTelemetry

## Priority
Sprint 3. Ships before reading 5d-B slow turn data — system metrics are needed to correctly interpret why a turn was slow. A slow `turn.broadcast` span on an overloaded worker tells a different story than the same span on an idle server.

## Context

Player-reported lag is under active investigation. Task 5d-B has already shipped threshold-based turn timing spans to Uptrace — slow turns (>100ms) are now being captured with full span breakdowns. However, span data alone is ambiguous without system-level context. This task adds the missing layer: continuous server resource metrics flowing into the same Uptrace instance so slow turn spans can be correlated with CPU, memory, and event loop state at the moment they occurred.

**What is already known from the server performance investigation:**

The server does not execute game logic — `executeNextTick()` runs on the client. The server's per-tick work is turn assembly, optional sync check (every 10 turns), and WebSocket broadcast. The two highest-ranked lag suspects are:

1. **Worker overload** — hash-based routing (`simpleHash(gameID) % numWorkers()`) can concentrate multiple large late-game matches on one worker with no rebalancing. Currently invisible in any dashboard.
2. **GC pauses from heap accumulation** — `this.turns` retains all Turn objects for the entire match lifetime (~162,000 objects in a 3-hour match). GC pauses in the 50–300ms range are possible on a loaded heap and would affect all matches on that worker simultaneously.

`openfront.active_games.gauge` and `openfront.connected_clients.gauge` are already emitted per worker. This task extends that existing instrumentation — it does not introduce a new monitoring approach.

**What is already confirmed:**
- OTEL is active in production — logs flow to `https://telemetry.geoconflict.ru` (Uptrace) when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- The Uptrace backend is live and operational
- Existing metrics (`active_games`, `connected_clients`) confirm the metrics pipeline works

**Important:** the OTEL exporter must only be initialised when `OTEL_EXPORTER_OTLP_ENDPOINT` is set in the environment. The dev server must not send metrics to the production Uptrace instance. This is already the pattern for logs — follow the same gate for metrics.

---

## Part A — Confirm Existing Metrics Pipeline

Before adding new metrics, verify what is already flowing to Uptrace.

1. **Check Uptrace for existing metrics:** open the Uptrace dashboard and confirm `openfront.active_games.gauge` and `openfront.connected_clients.gauge` are present and updating. If they are, the metrics pipeline is confirmed working and Part B can proceed immediately.

2. **Check OTEL initialisation code:** find where metrics are currently initialised in the server codebase. Identify:
   - Which `MeterProvider` and exporter are configured
   - Whether `@opentelemetry/host-metrics` is already in `package.json` (if so, CPU/memory/network I/O are available for free with one call)
   - Whether `@opentelemetry/sdk-node` auto-instrumentation is active

3. **Check per-worker metric labelling:** confirm whether existing metrics include a `worker.id` attribute. If not, add it to all new metrics — per-worker breakdowns are essential for detecting worker overload, which is the top lag suspect.

---

## Part B — Add System Metrics

Extend the existing metrics setup with the following. Use `@opentelemetry/sdk-metrics` with `ObservableGauge` — the same pattern as existing metrics. Sample every 60 seconds.

| Metric | Unit | Why it matters |
|---|---|---|
| `geoconflict.server.cpu.usage` | percent | Is a worker compute-bound during peak hours? |
| `geoconflict.server.memory.heap.used` | bytes | Is heap growing toward the GC pressure threshold? |
| `geoconflict.server.memory.heap.total` | bytes | Heap ceiling for context |
| `geoconflict.server.memory.rss` | bytes | Total process memory including outside-heap allocations |
| `geoconflict.server.eventloop.lag` | milliseconds | **Most critical.** A 50–200ms event loop block means simultaneous tick delays for all matches on that worker. Captures GC pauses and blocking I/O that CPU metrics miss entirely. |
| `geoconflict.server.network.bytes_sent` | bytes (counter) | Is outbound bandwidth saturating during peak broadcasts? |
| `geoconflict.server.network.bytes_recv` | bytes (counter) | Inbound baseline |
| `geoconflict.server.turns.active` | count | How many matches are currently mid-turn on this worker — direct load indicator |

**Implementation notes:**

- **Event loop lag:** use `perf_hooks.monitorEventLoopDelay()` — built into Node.js, no package needed. Sample the `mean` value every 60 seconds.
- **CPU and memory:** if `@opentelemetry/host-metrics` is in `package.json`, use `new HostMetrics({ meterProvider }).start()` — it provides CPU, memory, and network I/O automatically with correct OTEL semantic naming. If not, use `os.cpus()` and `process.memoryUsage()` from Node.js built-ins. Do not add a new npm package if built-ins suffice.
- **`geoconflict.server.turns.active`:** this is a game-level metric, not a system metric. It counts matches currently in their `endTurn()` execution window. Requires a lightweight counter in `GameServer.ts`, not a system call.
- **All metrics must include `worker.id` as an attribute** — without per-worker breakdown, worker overload is still invisible even with metrics flowing.

---

## Part C — Uptrace Dashboard

Create a dashboard in Uptrace with the following panels. The goal is a single screen that answers: **which worker is under pressure, and why?**

**Panel layout:**

1. **Event loop lag per worker** — line chart, all workers overlaid. Spikes here are the direct signal of player-visible lag.
2. **CPU usage per worker** — line chart. Correlate with event loop lag to distinguish compute-bound vs GC-bound problems.
3. **Heap used per worker** — line chart. Watch for gradual growth across a server session — steady growth without GC recovery indicates the `this.turns` accumulation problem.
4. **Active matches + connected players per worker** — bar or line chart. Shows which workers are load-heavy. Combined with event loop lag, confirms worker overload.
5. **Network I/O (bytes sent/sec)** — aggregate across all workers. Detects broadcast saturation at peak hours. Server bandwidth is confirmed at 350 Mbps — watch for sustained outbound approaching this limit.
6. **Turns active per worker** — snapshot of in-flight turn processing per worker at any moment.

---

## How to Read the Data (for 5d-B Correlation)

Once both 5d-A metrics and 5d-B slow turn spans are flowing, this is the diagnostic workflow:

| Slow turn pattern | Likely cause | Action |
|---|---|---|
| `turn.broadcast` slow, event loop lag spike, high connected clients | Worker overload — too many large matches on one worker | Consider worker count increase or match redistribution |
| All spans slow together, event loop lag spike, normal CPU | GC pause — heap accumulated to pressure point | Investigate `this.turns` growth; consider periodic archiving |
| `turn.broadcast` slow, high `message.size_bytes`, normal event loop | Serialization cost at high intent count | Optimise Turn payload or compress |
| `synchronization` spikes every 10 turns, correlates with lag reports | Hash comparison cost at high player count | Profile `findOutOfSyncClients()` |
| Slow turns cluster on one worker, others idle | Hash routing imbalance | Add load-aware routing |

---

## Verification

1. All metrics appear in Uptrace with correct names, units, and `worker.id` attributes
2. Metrics update every 60 seconds without gaps — confirm over a 2-hour window
3. Event loop lag test: artificially block the event loop for 150ms in a local test build and confirm the metric registers the spike within the next 60-second sample
4. Per-worker breakdown confirmed: if the server runs 3 workers, all 3 appear separately in Uptrace for each metric
5. Dev server produces no metrics in Uptrace — confirm `OTEL_EXPORTER_OTLP_ENDPOINT` absence correctly disables collection on dev
6. No measurable tick duration increase after deployment — 60-second sampling overhead should be negligible; verify with a before/after comparison of normal turn durations in Uptrace

## Dependencies

- Uptrace server live and operational (`task-uptrace-setup.md`) ✅ confirmed
- 5d-B turn timing spans shipping and flowing to Uptrace ✅ confirmed
- `OTEL_EXPORTER_OTLP_ENDPOINT` set in prod environment, absent in dev

## Notes

- **`this.turns` memory accumulation:** the performance investigation flagged this as the most likely GC pressure source. After metrics are live, watch the heap chart over a full server session (several hours). Steady heap growth that does not recover between GC cycles confirms this is the problem. A dedicated cleanup task will be needed — out of scope here but the metrics from this task are what will prove it.
- **Bandwidth:** the server's confirmed bandwidth is 350 Mbps. The network bytes_sent counter will show whether peak broadcasts are approaching this. At current scale this is expected to be well within limits, but the metric establishes a baseline for capacity planning as DAU grows.
- **Worker count:** the current worker count is unknown to this brief. The per-worker metrics will immediately reveal whether load is evenly distributed or whether one worker is consistently hotter than others.
