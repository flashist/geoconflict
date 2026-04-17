# AI Players Feature

**Status**: active
**Source files**: `src/server/GameServer.ts`, `src/core/GameRunner.ts`, `src/core/execution/ExecutionManager.ts`, `src/core/configuration/DefaultConfig.ts`

## Summary

AI Players join public lobbies during the preparation countdown to simulate healthy player presence. They appear indistinguishable from real humans in UI and leaderboard (no bot/nation label), participate in the match using AI logic, and yield priority to human players who join. They are a new entity type (`PlayerType.AiPlayer`) distinct from existing `PlayerType.FakeHuman` nations.

Source: `ai-agents/tasks/done/feature_spec_ai_players_standalone.md`

> **Note:** `PlayerType.AiPlayer` is confirmed active in production across 10+ files. `ExecutionManager.aiPlayerExecutions()` drives AI behaviour via `BotBehavior`. The spec was written as "standalone reset" — the prior iteration was discarded and this is the canonical implementation.

## Scope

**In:** public lobbies only, lobby population display includes AI players, AI participates in match with `BotBehavior` logic, `PlayerType.AiPlayer` appears in "Players only" leaderboard filter, MEDIUM difficulty, deterministic name/ID assignment.

**Out:** explicit AI disclosure in UI, nations renamed/repurposed, persistent AI profiles, new chat behaviors.

## Implementation

### Entity Type

New `PlayerType.AiPlayer = "AIPLAYER"` — must have real synthetic `clientID` values (8-char `[a-zA-Z0-9]`, deterministic from `simpleHash(lobbyId) + joinIndex`). Nations remain `PlayerType.FakeHuman`.

`GameStartInfo` is extended with `aiPlayers?: { clientID: ClientID; username: string }[]`. This list is identical on all clients.

### Name Allocation

- Humans use `Anon1000–Anon9999`
- AI Players use `Anon0000–Anon0999`
- Selection: `PseudoRandom(simpleHash(lobbyId))` shuffle, consumed in join order

### Lobby Algorithm (public lobbies only)

During preparation countdown:
1. Target curve: `targetTotal(t) = floor(min(capacity, targetTotalByTimeout) * clamp01(t_passed / TIMEOUT_SEC))`
2. Human priority: if lobby is full and a human joins, remove the last-joined AI player to make room
3. AI cap: `N_ai <= aiPlayersMax`
4. Inject AI to meet target using jitter delays (deterministic RNG per `lobbyId + joinIndex`)

### In-Match Behavior

AI Players are created in `GameRunner` from `gameStartInfo.aiPlayers`. A new `AiPlayerExecution` drives them using `BotBehavior` (preferred) or refactored `FakeHumanExecution` logic. AI execution randomness is seeded by `gameID + playerID` for determinism.

### Winner Flow

AI Players need a valid `clientID` so `GameImpl.makeWinner()` returns a real winner. Win modal resolves winner via `playerByClientID` normally.

### Config (`ServerConfig` extension)

```ts
aiPlayersConfig(): AiPlayersConfig
// {
//   enabled, timeoutSec, tickMs, targetTotalByTimeout,
//   aiPlayersMax, humanPriority, minHumanSlots,
//   joinJitterMs, name, difficulty
// }
```

Default config is behind a feature flag in prod.

## UI Rules

AI Players are indistinguishable from humans:
- No "nation" or "bot" label
- Included in "Players only" leaderboard filter
- Affected files: `Leaderboard.ts`, `PlayerPanel.ts`, `PlayerInfoOverlay.ts`

## Determinism / Desync Safety

All AI names, IDs, and execution randomness must be seeded deterministically. Any nondeterministic AI behavior risks desync across clients.

## Implementation Order

1. Add `PlayerType.AiPlayer`
2. Extend `GameStartInfoSchema` with `aiPlayers`
3. Server AI lobby injection → include in `GameStartInfo`
4. Create AI Player entities in `GameRunner`
5. Add `AiPlayerExecution` or refactor `FakeHumanExecution`
6. Update UI to treat `AiPlayer` as human
7. Verify winner flow

## Intent → Execution Flow

There is no direct player-facing intent for AI creation. The server and shared core synthesize the flow:

1. Public-lobby server logic decides whether to inject AI joiners into `gameStartInfo.aiPlayers`
2. `GameRunner` materializes those entries as `PlayerType.AiPlayer`
3. `ExecutionManager` includes them in automated execution scheduling
4. `BotBehavior`-driven AI actions emit the same normal game `Intent` objects and downstream `GameUpdate`s as any other player

## Related

- [[systems/game-overview]] — overall game architecture; `PlayerType.AiPlayer` documented in player types table
- [[features/tutorial]] — tutorial also uses bot-filled lobbies for context
- [[decisions/sprint-4]] — planning pages now explicitly treat AI Players as already-live context
