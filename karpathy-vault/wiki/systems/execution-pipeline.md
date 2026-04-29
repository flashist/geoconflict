# Execution Pipeline

**Layer**: core
**Key files**: `src/core/Schemas.ts`, `src/client/Transport.ts`, `src/core/execution/ExecutionManager.ts`, `src/core/game/GameImpl.ts`, `src/core/game/GameUpdates.ts`

## Summary

The execution pipeline is the deterministic path from player action to state mutation. A client-side UI event becomes a typed `Intent`, the shared core converts that intent into an `Execution`, and `GameImpl.executeNextTick()` advances those executions to emit `GameUpdate`s for rendering and UI.

## Architecture

### 1. Input to intent
- Client UI code emits domain events such as `SendAttackIntentEvent`, `SendSpawnIntentEvent`, or `BuildUnitIntentEvent`
- `Transport` converts those events into typed intent payloads and wraps them in `ClientIntentMessage`
- `src/core/Schemas.ts` defines the discriminated-union intent schema shared by client and server

### 2. Intent to execution
- The server stores intents inside `Turn.intents`
- During replay, `Executor.createExecs()` maps each intent to an execution class
- Examples:
  - `attack` → `AttackExecution`
  - `spawn` → `SpawnExecution`
  - `build_unit` → `ConstructionExecution`
  - `mark_disconnected` → `MarkDisconnectedExecution`

### 3. Execution to state changes
- `GameRunner` adds the new executions to the game before the tick runs
- `GameImpl.executeNextTick()` initializes newly-added executions, ticks all active executions, and lets them mutate players, alliances, units, tiles, and messages
- Executions call back into game/state objects, which emit structured `GameUpdate`s such as `Tile`, `Unit`, `Player`, `AllianceRequestReply`, `Win`, and `Hash`

### 4. State changes to view updates
- `GameRunner` packages the emitted updates into `GameUpdateViewData`
- Tile updates are packed into a `BigUint64Array` for cheaper transfer to the main thread
- `GameView` applies those updates and the rendering/UI layers consume them on the next frame

## Gotchas / Known Issues

- The pipeline depends on shared schemas; adding a new action means updating schema, transport, execution dispatch, and usually UI trigger code
- Some execution names are historical: AI players currently reuse `FakeHumanExecution` through `ExecutionManager.aiPlayerExecutions()`
- `player.setHasActed(true)` is applied for most gameplay intents inside `ExecutionManager`, so changing that rule affects win-condition and ghost-player behavior
- `GameUpdate`s are the supported downstream contract; bypassing them for ad hoc UI state would break replay/catch-up assumptions

## Related

- [[systems/game-overview]] — broader architecture context
- [[systems/game-loop]] — where the pipeline is scheduled per tick
- [[systems/networking]] — how intents enter the system
- [[tasks/solo-win-condition-fix]] — win-condition execution now surfaces solo opponent victories to the client
