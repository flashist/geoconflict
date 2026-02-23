# Feature Spec — AI Players (Standalone, Reset)

This is the single source of truth for implementing AI Players from scratch, including product requirements, architecture constraints, and decisions made during prior iterations.

## 1) Goal
Introduce AI Players that join public multiplayer lobbies during the preparation countdown to simulate healthy player presence and reduce perceived waiting/emptiness. AI Players must be indistinguishable from real players in UI/flow, while remaining server-labeled for analytics and safeguards. AI Players are distinct from nations and must NOT replace nations.

## 2) Scope
### In
- Inject AI Players into public lobbies during preparation countdown.
- Show lobby population as humans + AI.
- Humans always have priority for slots.
- Match start timing unchanged (existing countdown rules).
- AI Players participate in match as real players using AI logic (new entity type).
- AI Player difficulty: MEDIUM.
- Deterministic AI name assignment and join jitter.

### Out
- Changing core nation AI logic or balancing.
- Adding explicit AI markers in client UI.
- Persistent profiles/progression/chat personalization.
- New chat/emote behaviors beyond existing default capability.

## 3) Explicit Decisions (From Discussion)
- AI Players are public-lobby only.
- Do not rename or repurpose nations; nations must behave and appear exactly as before.
- AI Players must be a new player type (not FakeHuman).
- AI Players must appear in leaderboard when “Players only” is checked.
- AI Player names should look random, not sequential.
- Anon range change: Humans use Anon1000–Anon9999; AI Players use Anon0000–Anon0999.
- Deterministic shuffle seeded by lobbyId for AI selection/names.

## 4) Current Architecture (Constraints)
- Server does NOT simulate gameplay; it only relays intents, pings, and winner votes.
- Clients simulate the game locally (deterministic lockstep).
- Nations are created from map manifest data on each client and are `PlayerType.FakeHuman` with `clientID === null`.
- The in-game leaderboard and overlays read from the client simulation; any entity not in the simulation cannot appear there.
- Winner flow: `GameImpl.makeWinner()` returns undefined if `clientID === null`, so AI Players MUST have clientIDs to allow match end reporting.

## 5) New Entity Type
Add a new player type:
- `PlayerType.AiPlayer = "AIPLAYER"` (name can vary, but must be distinct).
- AI Players must have real `clientID` values (synthetic but deterministic).
- Nations remain `PlayerType.FakeHuman`.

## 6) Data Model / Schema Changes
Extend `GameStartInfo` to carry AI Players into the simulation:
```ts
aiPlayers?: { clientID: ClientID; username: string }[];
```
This list must be deterministic and identical on all clients.

## 7) Lobby Algorithm (Public Only)
Definitions:
- `TIMEOUT_SEC`: preparation countdown duration (defaults to `gameCreationRate / 1000`).
- `tickMs`: lobby AI management cadence.
- `t_passed`: seconds elapsed since countdown start.
- `coef = clamp01(t_passed / TIMEOUT_SEC)`.
- `capacity`: lobby/map max players.
- `N_humans`: current human players in lobby.
- `N_ai`: current AI Players in lobby.
- `N_total = N_humans + N_ai`.

Target curve:
- `targetTotalByTimeout`: desired total players visible by end of countdown.
- `targetTotal(t) = floor(min(capacity, targetTotalByTimeout) * coef)`.

Hard constraints:
- Human priority: never block a human join when AI can be removed.
- Reservation: keep at least `minHumanSlots` available for humans when feasible.
- AI cap: `N_ai <= aiPlayersMax`.

Core loop (each tick during preparation):
1. Compute `target = targetTotal(t)`.
2. Compute `maxAiAllowedNow = clamp(0, aiPlayersMax, capacity - max(0, minHumanSlots - N_humans))`.
3. Enforce reservation and capacity:
   - If `N_total > capacity`: remove AI until `N_total == capacity`.
   - If `N_ai > maxAiAllowedNow`: remove AI until `N_ai == maxAiAllowedNow`.
4. Inject AI to meet target (within caps):
   - `requiredTotal = max(N_humans, target)`.
   - `desiredAi = clamp(0, maxAiAllowedNow, requiredTotal - N_humans)`.
   - If `N_ai < desiredAi`: add `desiredAi - N_ai` AI Players using jitter scheduling.
5. Never remove AI merely because `N_total > target`.

Human join handler:
- If `N_total < capacity`: accept.
- If `N_total == capacity` and `N_ai > 0`: remove 1 AI (last joined) then accept.
- If `N_total == capacity` and `N_ai == 0`: apply existing lobby behavior.

Jitter scheduling:
- Add AI join events with delay sampled from `joinJitterMs`.
- Use deterministic RNG keyed by `lobbyId` and `joinIndex`.

Removal ordering:
- Remove last-joined AI first.

Lobby payload:
- `numClients` should reflect `humans + AI`.
- Avoid sending AI client list to public lobby list (keep existing payload shape).

## 8) AI Players in Match (New Work)
Because AI Players must appear in leaderboard, they must exist as real players in the simulation.
Approach:
- Create AI Player entities in `GameRunner` from `gameStartInfo.aiPlayers`.
- Add a new execution (e.g., `AiPlayerExecution`) that drives AI Players using `BotBehavior` or refactored FakeHuman logic.
- Do NOT modify nation creation logic.
- Ensure AI Players are added to the game before execution loop starts.

### Suggested Execution Strategy
Option A (preferred): new `AiPlayerExecution` that uses `BotBehavior` directly.
Option B: refactor `FakeHumanExecution` into shared decision modules to reuse logic.
The AI should:
- Spawn if needed
- Expand, build units, attack, ally, embargo similar to FakeHuman
- Use deterministic RNG seeded by gameID + playerID

## 9) Names and IDs
### Names
- AI names: `Anon0000`–`Anon0999`.
- Human anon names: `Anon1000`–`Anon9999`.
- AI name selection must be deterministic but look random:
  - Shuffle the reserved indices using `PseudoRandom(simpleHash(lobbyId))`.
  - Consume from this shuffled list in join order.
  - Pass names to `gameStartInfo.aiPlayers`.

### Client IDs
- Must satisfy schema: 8-char [a-zA-Z0-9].
- Use `PseudoRandom.nextID()` seeded by `simpleHash(lobbyId) + joinIndex` (or similar).
- Must be stable across clients.

## 10) UI Rules
AI Players must be indistinguishable from humans:
- No “nation” or “bot” label.
- No nation relation pill.
- Included in “Players only” filter.
Affected files:
- `src/client/graphics/layers/Leaderboard.ts`
- `src/client/graphics/layers/PlayerPanel.ts`
- `src/client/graphics/layers/PlayerInfoOverlay.ts`

## 11) Config (ServerConfig Extension)
Extend `ServerConfig`:
```ts
aiPlayersConfig(): AiPlayersConfig
```
Suggested schema:
```json
{
  "enabled": true,
  "timeoutSec": 120,
  "tickMs": 500,
  "targetTotalByTimeout": 10,
  "aiPlayersMax": 10,
  "humanPriority": true,
  "minHumanSlots": 1,
  "joinJitterMs": { "min": 300, "max": 2000 },
  "name": { "prefix": "Anon", "start": 0, "reserve": 1000 },
  "difficulty": "MEDIUM"
}
```
Notes:
- `targetTotalByTimeout` and `aiPlayersMax` are separate: target is perceived fullness; cap is injection limit.
- Default config should be safe and behind a feature flag in prod.

## 12) Determinism / Desync Safety
- AI list, names, and IDs must be identical across clients for the same lobby.
- AI execution randomness must be seeded deterministically (gameID + playerID).
- Any randomized behavior must be deterministic to avoid desyncs.

## 13) Winner Flow
If AI Players can win, their `clientID` must be valid so:
- `GameImpl.makeWinner()` returns a real winner.
- Win modal can resolve the winner via `playerByClientID`.
- Server receives winner votes and archives normally.

## 14) Testing
Unit:
- AI name allocation and deterministic shuffle.
- AI clientID determinism.
Integration:
- Lobby AI injection + removal on human join.
- AI players injected into `gameStartInfo`.
E2E:
- “Players only” includes AI players in leaderboard.
- AI player info overlay does not show nation/bot.
- Nations still appear with map names + difficulty labels.
Win:
- AI Player win resolves properly (winner is set, server archives).

## 15) Risks / Mitigations
- Performance: extra AI in simulation increases client load. Keep cap reasonable.
- Desync: any nondeterministic AI behavior risks divergence.
- UX: ensure no explicit AI disclosure in UI.

## 16) Suggested Implementation Order
1. Add PlayerType.AiPlayer.
2. Extend GameStartInfoSchema with aiPlayers.
3. Implement server AI lobby injection + include aiPlayers in GameStartInfo.
4. Create AI Player entities in GameRunner from GameStartInfo.
5. Add AiPlayerExecution or refactor FakeHuman logic for reuse.
6. Update UI to treat AiPlayer as human.
7. Verify winner flow.

