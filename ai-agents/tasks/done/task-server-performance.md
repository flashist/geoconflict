# Task — Server Performance Investigation & Uptrace Instrumentation

## Context

Several desktop players on Windows with decent hardware have reported lag. The client devices are not the bottleneck, which points toward server-side causes or network issues. The lag appears to be infrequent — not a constant problem, but occasional spikes that are noticeable enough for players to report.

This task has two parts that should be done in order:

1. **Investigation** — map out where server-side performance problems can theoretically originate, identify the most likely candidates given what we know, and produce a short written findings document
2. **Instrumentation** — extend the existing OTEL setup with threshold-based per-turn tracing so that when lag spikes occur in production, we have diagnostic data to work with

---

## Part A — Investigation

Before adding any instrumentation, produce a written analysis of where server-side lag can originate. This gives us a structured list of candidates to instrument and watch rather than measuring blindly.

**Areas to investigate:**

**Turn processing budget**
The server runs at ~67ms per tick (Flashist 1.5× speed). The server must collect intents, execute game state, and broadcast the turn message within this window. Identify: how long does `processTurn()` actually take in practice? Are there code paths within turn execution that could occasionally take significantly longer — for example, pathfinding on large maps, unit collision resolution in late-game states with many units, or win condition checking?

**Intent queue pressure**
If a burst of client intents arrives simultaneously — common at match start when many players spawn — the server processes them sequentially before broadcasting the turn. Identify: is there a queue depth limit? What happens when the queue is unusually large? Could this cause a turn to be delayed by one or more ticks?

**Node.js garbage collection pauses**
Node.js GC can cause pauses in the 50–300ms range on a loaded heap. At 67ms per tick, a 150ms GC pause means two full ticks of freeze for all players in all active matches simultaneously. Identify: what objects are being allocated and discarded at high frequency during turn processing? Are there obvious allocation hotspots — arrays rebuilt each tick, objects created and immediately discarded in execution classes — that could be contributing to GC pressure?

**Worker process architecture**
The server uses a master-worker architecture (master on port 3000, workers on 3001, 3002, …). Identify: how are matches distributed across workers? Could one worker become overloaded if it happens to host several large concurrent matches while others are idle? Is there any rebalancing mechanism, or is routing purely `hash(gameID) % numWorkers`?

**WebSocket broadcast cost**
Each turn broadcast sends a message to every connected client in the match. Identify: for a full lobby, how large is the typical turn message? Is serialization cost a factor at high player counts? Could a match with many simultaneous intents produce an unusually large broadcast payload?

**External I/O during turn processing**
Identify: does the turn processing loop do any I/O — database writes, S3 calls, logging — synchronously or in a way that could block the event loop? Any blocking I/O during a turn would delay the broadcast.

**Output of the investigation:**
A short written document (can be inline comments, a markdown file, or a message) covering:
- Which of the above areas are most likely to cause the reported lag based on code inspection
- Which can be ruled out quickly
- A ranked list of suspects to instrument first
- Any quick fixes identified during the investigation (e.g. obvious allocation hotspots that can be cleaned up without instrumentation)

---

## Part B — Uptrace Server-Side Instrumentation

Uptrace is already receiving server logs via the OTEL Winston transport (confirmed by server logging investigation — logs flow to https://telemetry.geoconflict.ru when OTEL_EXPORTER_OTLP_ENDPOINT is set). This task extends that existing OTEL setup with structured per-turn tracing — no new monitoring infrastructure required.

**Error tracking (verify first):**
Unhandled exceptions and promise rejections already flow to Uptrace via the OTEL Winston transport. Before adding any new instrumentation, verify this is working correctly in production — check Uptrace for existing exception logs. If error tracking is confirmed working, this step is already done.

If gaps are found (e.g. unhandled promise rejections not appearing), add explicit OTEL error capturing:
- Attach match context to errors where available (`gameID`, player count, map name) so crashes can be correlated with specific match states
- Tag spans with `environment: "production"` and the current build number (consistent with HF-7 build tracking)

**Performance monitoring — threshold-based transaction capturing:**

Wrap the turn processing loop in an OTEL span with child spans for each phase. Only emit the span to Uptrace if the total duration exceeds the threshold — discard it silently if the turn completed within budget. Use the existing `@opentelemetry/api` tracer already initialised in the server.

Suggested transaction structure:
```
OTEL Span: server.turn.process
  Span: intent.collection       — time to gather intents since last tick
  Span: game.execute            — time for game.executeNextTick()
  Span: turn.broadcast          — time to serialize and send to all clients
  Span: hash.check (if applicable) — desync hash computation if on this tick
```

**Threshold:** capture the transaction only if total duration exceeds **100ms** (approximately 1.5× the tick budget of 67ms). This filters out normal turns entirely and only captures genuine lag spikes. The threshold should be a named constant so it can be adjusted easily.

This approach means:
- Zero performance overhead on normal turns — no Sentry calls, no serialization
- Zero noise in Sentry on days when the server is healthy
- Rich diagnostic data when a real lag spike occurs — exactly which phase was slow, how many intents were queued, what the server state was

**What a captured slow transaction tells you:**
- If `game.execute` is always the slow span → GC pressure or expensive execution logic
- If `turn.broadcast` is slow → serialization cost or WebSocket pressure at high player count
- If `intent.collection` is slow → queue processing bottleneck
- If all spans are slow together → likely a GC pause affecting the entire event loop

**Note on Uptrace volume:** threshold-based capturing keeps span volume very low — only genuine lag spikes are emitted. At current scale this adds negligible storage overhead to ClickHouse.

---

## What "Done" Looks Like

**Part A:**
- Written findings document identifying the most likely server-side lag candidates
- Ranked list of what to instrument and watch
- Any quick fixes noted

**Part B:**
- Error tracking verified — unhandled exceptions appear in Uptrace with full stack traces
- Turn processing wrapped in threshold-based OTEL spans — slow turns (>100ms) appear in Uptrace with full span breakdown
- At least one simulated slow turn verified end-to-end: artificially delay turn processing beyond threshold, confirm the span appears in Uptrace with correct child span data

## Dependencies

- Uptrace is already live (task-uptrace-setup.md) and receiving server logs — OTEL endpoint and DSN must be confirmed working before this task begins
- Task 5d-A (server metrics monitoring) should complete first so slow turn spans can be correlated with system resource data in the same Uptrace dashboard
- Part A should complete before Part B begins — the investigation findings should inform which spans are worth adding beyond the basic turn processing structure

## Notes

- The threshold of 100ms is a starting point. After the first week of data, adjust based on what's being captured — if too many borderline turns are coming through, raise it; if genuine lag spikes are being missed, lower it.
- If the investigation finds an obvious quick fix (e.g. a per-tick allocation that can be moved outside the loop), implement it immediately without waiting for instrumentation data. Instrumentation confirms the fix worked.
- This task does not address network latency between players and the server — that is outside server-side control. If Uptrace shows turns consistently processing within budget but players still report lag, network path is the next thing to investigate.
- **Intent-level diagnostic ceiling:** the OTEL span structure (`intent.collection → game.execute → turn.broadcast`) will show *which phase* of a turn was slow, but not *which specific player intents* caused it. Player intents are stored in the turn log and sent to the archive, but are not emitted to Uptrace. This means a slow `game.execute` span tells you the execution phase was the bottleneck but not which intent triggered it. If deeper intent-level diagnosis is ever needed, that requires a separate decision to emit intent data to Uptrace — not in scope for this task.
- **Ghost player tracking gap:** the server logging investigation confirmed there is no aggregated ghost player count in logs or Uptrace — only raw `mark_disconnected` intents buried in the turn archive. Ghost players holding spawn tiles was the suspected root cause of the cancelled HF-5 win condition bug. If that bug resurfaces, diagnosing it from Uptrace data alone will still be difficult. Surfacing a ghost player count per match as a logged metric is a separate task worth considering if the win condition bug reappears.
