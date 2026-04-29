# Game Loop

**Layer**: shared
**Key files**: `src/core/GameRunner.ts`, `src/core/game/GameImpl.ts`, `src/core/worker/Worker.worker.ts`, `src/client/ClientGameRunner.ts`

## Summary

The game loop is a deterministic turn replay system. The server accumulates player intents into ordered `Turn` objects, and the client replays those turns in a Web Worker via the shared `src/core/` simulation. Rendering and input stay on the main thread while authoritative game state progression happens in the worker-backed core loop.

## Architecture

### Turn production
- `src/server/GameServer.ts` gathers incoming intents into `this.intents`
- On each `endTurn()`, it snapshots them into a `Turn { turnNumber, intents }`, appends to history, and broadcasts the turn to connected clients
- Every 10 turns, hash comparison runs as a desync check

### Turn consumption
- `ClientGameRunner` receives `start` and `turn` messages, queues missed turns during late join/catch-up, and forwards them to `WorkerClient`
- `WorkerClient` sends `init`, `turn`, and `heartbeat` messages into `Worker.worker.ts`
- On each worker `heartbeat`, `GameRunner.executeNextTick()` consumes exactly one queued turn and advances the shared simulation

### Core simulation
- `GameRunner` converts the current turn into executions through `Executor.createExecs()`
- `GameImpl.executeNextTick()` initializes pending executions, ticks all active executions, emits `GameUpdate`s, optionally adds a `Hash` update, then increments `_ticks`
- `GameRunner` packs tile updates, refreshes player-name placement caches, and emits `GameUpdateViewData` back to the main thread

### Catch-up model
- Late joiners receive historical turns in the server `start` message
- `ClientGameRunner` may enter catch-up mode when too many turns are queued and temporarily drives the worker faster via multiple heartbeats per animation frame
- Auto-spawn and some UX flows explicitly guard against acting during catch-up

## Gotchas / Known Issues

- The server is authoritative for turn ordering, but the actual game-state replay runs on the client worker, so determinism is mandatory across environments
- `GameRunner.executeNextTick()` processes one queued turn per heartbeat; if the main thread stops sending heartbeats, simulation stalls even though turns may already be queued
- Desync detection is hash-based and sampled, not continuous per-update verification
- Catch-up is a UX-sensitive state: features that act too early can send valid intents at the wrong game moment

## Related

- [[systems/game-overview]] — high-level project architecture and tick-system context
- [[systems/execution-pipeline]] — how a turn’s intents become concrete executions and updates
- [[systems/networking]] — how turns reach the client and worker
- [[systems/rendering]] — main-thread consumer of the worker-produced update stream
- [[tasks/solo-win-condition-fix]] — win-condition execution behavior for solo opponent victories
