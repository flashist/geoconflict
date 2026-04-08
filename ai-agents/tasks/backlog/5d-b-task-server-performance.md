# Task 5d-B — Server Performance Investigation & Uptrace Instrumentation

## Status

**Largely complete.** Parts A and B shipped together by the technical specialist on 2026-04-07. What remains is verification, error tracking confirmation, and ongoing data reading once 5d-A system metrics are flowing.

---

## What Was Done

### Part A — Investigation ✅ Complete

Full findings in `server-performance-investigation.md`. Key conclusions:

**Architecture clarification:** the server does not execute game logic. `executeNextTick()` runs on the client in a Web Worker. The server's entire per-tick work inside `endTurn()` is:
1. Assemble a `Turn` object and push to `this.turns`
2. Reset `this.intents = []`
3. `handleSynchronization()` every 10 turns — hash comparison across all clients
4. `checkDisconnectedStatus()` every 5 turns — ping timeout sweep
5. `JSON.stringify()` the turn message
6. `ws.send()` to every active client

This means lag cannot come from game logic execution — only from the above steps or from Node.js GC pauses affecting the event loop.

**Suspects ranked:**

| Rank | Suspect | Likelihood | Notes |
|---|---|---|---|
| 1 | Worker overload | HIGH | Hash-based routing — no load balancing. Multiple large late-game matches on one worker invisible until now |
| 2 | GC pauses from heap accumulation | HIGH | `this.turns` retains ~162,000 Turn objects in a 3-hour match. GC pauses 50–300ms possible on loaded heap |
| 3 | Turn broadcast serialization | MEDIUM | `JSON.stringify()` cost scales with intent count — match-start bursts and late-game high-activity turns produce large payloads |
| 4 | `handleSynchronization()` cost | LOW-MEDIUM | Runs every 10 turns, iterates all clients. Bounded by client count |
| 5 | Intent queue burst | LOW | No queue depth limit, but cost manifests in broadcast not collection |
| 6 | External I/O during turn | RULED OUT | `endTurn()` contains no synchronous I/O. Archiving happens at game end only |

### Part B — Instrumentation ✅ Shipped

`endTurn()` in `src/server/GameServer.ts` is now wrapped with threshold-based OTEL spans. Spans emit to Uptrace only when total turn duration exceeds `SLOW_TURN_THRESHOLD_MS` (100ms). Zero overhead on normal turns.

**Span structure:**
```
server.turn.process
  attributes: game.id, turn.number, intents.count,
              clients.active, message.size_bytes, turn.duration_ms
  │
  ├── turn.assembly       — build Turn object, push to this.turns, reset this.intents
  ├── synchronization     — handleSynchronization() + checkDisconnectedStatus()
  └── turn.broadcast      — JSON.stringify + ws.send to all clients
```

**Note:** `intents` are collected continuously via WebSocket handlers throughout the tick interval. `turn.assembly` only assembles and resets the accumulated array — intent collection time is not captured in any span.

---

## Part C — What Remains

### C1 — Verify error tracking is working

Unhandled exceptions and promise rejections flow to Uptrace via the OTEL Winston transport. Verify this is actually working in production before considering error tracking complete:

1. Check Uptrace for any existing unhandled exception logs from the production server
2. Trigger a deliberate non-critical error in a dev environment and confirm it appears in Uptrace with a full stack trace
3. If gaps are found (e.g. promise rejections not appearing):
   - Add explicit OTEL error capturing for unhandled promise rejections
   - Ensure `gameID`, player count, and map name are attached as span attributes where available — crashes correlated with specific match states are far more actionable than bare stack traces
   - Tag with current build number (consistent with HF-7) so errors are segmentable by release

### C2 — Verify slow turn spans are flowing correctly

1. Artificially delay `endTurn()` beyond 100ms in a local test build (e.g. `await new Promise(r => setTimeout(r, 150))`)
2. Confirm the `server.turn.process` span appears in Uptrace with correct child spans and attributes
3. Confirm normal turns (under 100ms) produce no spans — check that Uptrace is not receiving noise from fast turns
4. Confirm `SLOW_TURN_THRESHOLD_MS` constant is in place and adjustable without a code search

### C3 — Threshold calibration (after first week of production data)

After 5d-A system metrics are live and the first slow turns have appeared in Uptrace:

- If too many borderline turns (100–120ms) are coming through and creating noise → raise threshold to 120–150ms
- If players are still reporting lag but no spans are appearing → lower threshold to 80ms
- Document the final threshold value and the reasoning

---

## How to Read Slow Turn Data

Once 5d-A system metrics are flowing alongside these spans, use the following to identify root cause:

| Span pattern | System metrics at same time | Likely cause |
|---|---|---|
| `turn.broadcast` slow | High `clients.active`, high `message.size_bytes` | Serialization cost or WebSocket pressure — large late-game matches |
| All spans slow together | Event loop lag spike | GC pause — check heap chart for growth leading up to the spike |
| All spans slow together | Normal event loop lag, high CPU | Worker overload — check active matches per worker |
| `synchronization` slow every 10 turns | High `clients.active` | Hash comparison cost scaling with player count |
| Slow turns cluster on one worker | Other workers idle | Hash routing imbalance — uneven match distribution |
| `turn.assembly` slow | Normal everything | Should not happen — flag as unexpected and investigate |

**The `this.turns` memory problem:** if the heap chart from 5d-A shows steady growth over a server session without GC recovery, this confirms the `this.turns` accumulation is causing periodic pressure. A dedicated cleanup task will be needed — the fix is non-trivial because `pastTurn.intents` holds a reference to the same array, so clearing in place would corrupt the turn before broadcast. Options include periodic archiving of old turns or changing the retention strategy. Out of scope for this task but the 5d-A heap metric is what proves it.

---

## Verification Checklist

- [ ] Slow turn test confirmed — artificial 150ms delay in dev produces a span in Uptrace with correct child spans and attributes
- [ ] Normal turns confirmed silent — no spans in Uptrace for turns under threshold
- [ ] `SLOW_TURN_THRESHOLD_MS` is a named constant, adjustable without code search
- [ ] Unhandled exceptions appear in Uptrace with full stack traces (C1)
- [ ] At least one real slow turn observed in production Uptrace — confirms end-to-end pipeline works under real conditions (may require waiting for a natural lag event)
- [ ] Threshold reviewed and adjusted after first week of data (C3)

## Dependencies

- Uptrace live and operational ✅ confirmed (`https://telemetry.geoconflict.ru`)
- OTEL Winston transport active in production ✅ confirmed
- Task 5d-A system metrics — needed to correlate slow spans with resource state. 5d-B spans are already flowing; 5d-A provides the context to interpret them

## Notes

- **Intent-level diagnostic ceiling:** spans show which phase was slow (`turn.assembly`, `synchronization`, `turn.broadcast`) but not which specific player intents caused it. Intent sequences are stored in the turn archive but not emitted to Uptrace. If intent-level diagnosis is ever needed, that is a separate infrastructure decision.
- **Ghost player tracking gap:** no aggregated ghost player count exists in logs or Uptrace — only raw `mark_disconnected` intents in the turn archive. This was the suspected root cause of the cancelled HF-5 win condition bug. If that bug resurfaces, diagnosing it from Uptrace data alone will be difficult. Adding a per-match ghost count as a logged metric is worth considering if HF-5 is reopened.
- **Network latency:** if slow turns are not visible in Uptrace but players still report lag, the cause is network path between players and the server — outside server-side control and a separate investigation.
- **Production data only:** confirm `OTEL_EXPORTER_OTLP_ENDPOINT` is absent on the dev server so dev turn spans do not pollute the production Uptrace instance.
