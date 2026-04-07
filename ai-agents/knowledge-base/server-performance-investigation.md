# Server Performance Investigation

**Date:** 2026-04-07
**Context:** Players on Windows with decent hardware report occasional lag spikes. Client devices are not the bottleneck. This document maps server-side lag candidates based on code inspection.

---

## Architecture Clarification

The server does **not** execute game logic. `GameImpl.executeNextTick()` runs on the **client** (in a Web Worker). The server's entire per-tick work is inside `endTurn()` (`src/server/GameServer.ts:681`):

1. Build a `Turn` object (`{ turnNumber, intents }`) and push to `this.turns`
2. Reset `this.intents = []`
3. Call `handleSynchronization()` — every 10 turns: compare client hash values to detect desync
4. Call `checkDisconnectedStatus()` — every 5 turns: sweep all clients for ping timeout
5. `JSON.stringify()` the turn message
6. `ws.send()` to every active client

Tick interval: ~67ms (`turnIntervalMs()` = 100ms / 1.5× speed coefficient, `DefaultConfig.ts:233`).

---

## Suspects — Ranked by Likelihood

### 1. Worker Overload (HIGH)

**Where:** `src/server/Master.ts`, `src/core/configuration/DefaultConfig.ts:249`

Game routing is hash-based: `simpleHash(gameID) % numWorkers()`. There is no load balancing or rebalancing — a worker that happens to receive multiple large late-game matches simultaneously will handle more turn processing load than idle workers. The existing OTEL metrics expose `openfront.active_games.gauge` and `openfront.connected_clients.gauge` per worker, but no turn-duration metric. This means an overloaded worker is invisible in current dashboards until players report lag.

A single late-game match with 30+ active clients means `ws.send()` fires 30+ times per tick, plus `JSON.stringify()` of a potentially large Turn. Multiple such matches on one worker compounds this.

**What to watch:** Per-worker `turn.broadcast` span duration correlated with connected client count.

---

### 2. GC Pauses from Heap Accumulation (HIGH)

**Where:** `src/server/GameServer.ts:54,686-687`

Two main sources of allocation pressure:

- **`this.turns` grows indefinitely.** A 3-hour match at 15 turns/second ≈ 162,000 Turn objects retained in memory for the match lifetime. Each Turn holds a reference to the intents array for that turn. The `archiveGame()` call at match end eventually releases them, but during the match this is a large, live heap.
- **`this.intents = []` runs every ~67ms.** This allocates a new empty array (and discards the previous one) 15 times per second. Over a long session, this is ~54,000 empty array allocations per hour of gameplay, adding steady minor-GC pressure. See **Quick Fix** below.
- **`JSON.stringify()` per broadcast** allocates a transient string proportional to the Turn's intent count. At high activity (match start burst, late game) this string can be significant.

Node.js GC pauses in the 50–300ms range are possible on a loaded heap. At 67ms per tick, a 150ms pause causes two full ticks of delay simultaneously affecting all matches on that worker.

**What to watch:** `game.execute` (actually `synchronization` + `turn.broadcast`) spans slow together uniformly — a sign of a GC pause rather than a specific code path.

---

### 3. Turn Broadcast Serialization (MEDIUM)

**Where:** `src/server/GameServer.ts:692-698`

`JSON.stringify()` cost is O(payload size). The Turn payload includes every intent accumulated since the previous tick. Match-start bursts (many players spawning simultaneously) or late-game high-activity turns can produce unusually large payloads. No current measurement of message size or serialize time exists.

**What to watch:** `turn.broadcast` span slow while `intent.collection` is fast; check `message.size_bytes` attribute.

---

### 4. handleSynchronization() Cost (LOW-MEDIUM)

**Where:** `src/server/GameServer.ts:949`

Runs every 10 turns. Calls `findOutOfSyncClients()` which iterates all active clients to compare hash values. Bounded by client count (max ~50). Likely fast in practice, but worth measuring in the span breakdown.

---

### 5. Intent Queue Burst (LOW)

**Where:** `src/server/GameServer.ts:54,658`

No queue depth limit — `this.intents` grows unbounded until `endTurn()` clears it. A burst of simultaneous intents (common at match start) increases JSON payload size for that one turn but doesn't block intent collection itself. The cost materialises in `turn.broadcast`, not `intent.collection`.

---

### 6. External I/O During Turn Processing (RULED OUT)

`endTurn()` contains no synchronous I/O. Archiving happens at game end via `archiveGame()`, not during turns. Winston logging is buffered and async. This can be definitively ruled out as a lag cause.

---

## Quick Fix

**File:** `src/server/GameServer.ts:687`

```typescript
// Before (allocates new array every ~67ms):
this.intents = [];

// After (clears in place, no new allocation):
this.intents.length = 0;
```

This eliminates ~15 empty array allocations per second per active match, reducing minor-GC pressure over long matches. Low risk, zero behavior change.

---

## Instrumentation Priorities

Based on the above, instrument in this order:

1. **`server.turn.process`** root span with child spans for `intent.collection`, `synchronization`, `turn.broadcast` — threshold-based (emit only when > 100ms)
2. **`message.size_bytes`** attribute on broadcast span — reveals serialization cost spikes
3. **`intents.count`** on root span — correlates bursts with slow turns
4. **`clients.active`** on root span — correlates player count with broadcast cost

If `turn.broadcast` is consistently the slow span → serialization/WebSocket pressure.
If `synchronization` spikes every 10 turns → hash comparison scaling issue.
If all spans slow together → GC pause (no single phase to blame).
If slow turns cluster on specific workers → worker overload from hash routing.
