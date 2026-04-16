# Server Performance

**Layer**: server
**Key files**: `src/server/GameServer.ts`, `src/server/Master.ts`, `src/core/configuration/DefaultConfig.ts`

## Summary

Investigation of server-side lag candidates. The server does **not** run game logic — `GameImpl.executeNextTick()` runs on the **client** in a Web Worker. The server's per-tick work is entirely inside `endTurn()` in `GameServer.ts`.

Source: `ai-agents/knowledge-base/server-performance-investigation.md` (dated 2026-04-07)

## Architecture

Tick interval: ~67ms (`turnIntervalMs = 100 / 1.5`, `DefaultConfig.ts:233`)

`endTurn()` pipeline:
1. Build `Turn` object (`{ turnNumber, intents }`) → push to `this.turns`
2. Reset `this.intents = []`
3. `handleSynchronization()` — every 10 turns: compare client hashes to detect desync
4. `checkDisconnectedStatus()` — every 5 turns: sweep clients for ping timeout
5. `JSON.stringify()` the turn message
6. `ws.send()` to every active client

## Performance Suspects (Ranked)

### 1. Worker Overload — HIGH
Game routing is hash-based: `simpleHash(gameID) % numWorkers()`. No load balancing or rebalancing. A worker receiving multiple large late-game matches simultaneously handles far more load than idle workers.

Current OTEL metrics expose active games and connected clients per worker, but no turn-duration metric — an overloaded worker is invisible in dashboards until players report lag.

**Watch for:** Slow turns clustered on one worker while others are idle.

### 2. GC Pauses from Heap Accumulation — HIGH
Two main allocation sources:
- `this.turns` grows indefinitely during a match (3-hour match ≈ 162,000 Turn objects retained in RAM until `archiveGame()`)
- `this.intents = []` allocates a new array every ~67ms (~54,000/hour). Cannot safely use `this.intents.length = 0` because `pastTurn.intents` holds a reference to the same array
- `JSON.stringify()` per broadcast allocates a transient string proportional to intent count

Node.js GC pauses of 50–300ms are possible on a loaded heap. At 67ms/tick, a 150ms pause causes two full ticks of delay for all matches on that worker.

**Watch for:** All spans slow simultaneously (vs. one child span dominating) — characteristic of GC pause.

### 3. Turn Broadcast Serialization — MEDIUM
`JSON.stringify()` is O(payload size). Match-start bursts and late-game high-activity turns produce unusually large payloads. No current measurement of message size or serialize time.

**Watch for:** `turn.broadcast` slow, `turn.assembly` fast; correlate with `message.size_bytes`.

### 4. handleSynchronization() Cost — LOW-MEDIUM
Runs every 10 turns, iterates all active clients to compare hash values. Bounded by client count (max ~50).

### 5. Intent Queue Burst — LOW
No queue depth limit. Match-start bursts increase JSON payload for that one turn but don't block intent collection.

### 6. External I/O — RULED OUT
`endTurn()` has no synchronous I/O. Archiving is at match end only. Winston is buffered/async.

## Instrumentation

`endTurn()` is wrapped with threshold-based OTEL spans (emitted only when turn > 100ms). See [[systems/telemetry]] for span structure and investigation workflows.

## Gotchas / Known Issues

- Worker overload is currently invisible in Uptrace dashboards — no per-worker turn-duration metric exists
- `this.intents = []` (vs. `length = 0`) is a deliberate trade-off to avoid corrupting the previous turn reference — cannot be naively optimized

## Related

- [[systems/telemetry]] — OTEL instrumentation for observing these issues
- [[systems/match-logging]] — what match data is captured
- [[systems/game-overview]] — overall architecture context
- [[decisions/sprint-3]] — sprint where this investigation and instrumentation were done (5d-B)
