# Geoconflict — Comprehensive Overview

> **Audience**: AI agents and human contributors working cold on this codebase.
> This document is self-contained. After reading it you should know what the game is, how it plays, how it is built, and where to find things in the code.

---

## 1. Project Overview

**Geoconflict** is a fork/adaptation of [OpenFront.io](https://openfront.io/), a real-time territorial strategy browser game. Players expand territory, build structures, form alliances, and deploy weapons to dominate a map.

### Fork context

Every intentional divergence from upstream OpenFront.io is marked with:

```ts
// Flashist Adaptation
```

Treat all such comments as deliberate customizations. Key examples:
- Game modes Duos, Trios, Quads are commented out (too few players would cause errors).
- Server turn interval is accelerated 1.5× (`turnIntervalMs = 100 / 1.5 ≈ 67ms`).

### License

AGPL-3.0 with attribution requirements.

### Technology stack

| Layer | Technologies |
|-------|-------------|
| Frontend | TypeScript, Pixi.js (canvas rendering), Lit (web components) |
| Shared logic | TypeScript (deterministic, runs on both client and server) |
| Backend | Node.js, WebSocket (`ws`), Express, Zod (message validation) |
| Build | webpack, SWC (Jest transforms) |
| Auth | EdDSA JWT (JWK) |
| Storage | S3-compatible (replays) |

---

## 2. Game Design

### 2.1 Core Concepts

- **Tick-based deterministic execution**: both client and server run identical game logic. Each "turn" is a tick. All state changes are reproducible from the same initial seed + intent sequence.
- **Territory as resource**: owning more land increases max troops, troop regen, and trade income.
- **Intent pipeline**: every player action becomes a serialized, Zod-validated "intent" that is broadcast by the server and replayed identically on every client. No action bypasses this pipeline.

### 2.2 Game Types & Modes

| Dimension | Values |
|-----------|--------|
| GameType | `Singleplayer`, `Public`, `Private` |
| GameMode | `Free For All (FFA)`, `Team` |
| Disabled modes | ~~Duos~~, ~~Trios~~, ~~Quads~~ (Flashist Adaptation) |

Source: `src/core/game/Game.ts` (`GameType`, `GameMode` enums).

### 2.3 Maps

Maps are grouped into three categories (source: `src/core/game/Game.ts`, `mapCategories`):

**Continental** (9): World, Giant World Map, North America, South America, Europe, Europe Classic, Asia, Africa, Oceania

**Regional** (17): Black Sea, Britannia, Gateway to the Atlantic, Between Two Seas, Iceland, East Asia, Mena, Australia, Faroe Islands, Falkland Islands, Baikal, Halkidiki, Strait of Gibraltar, Italia, Japan, Yenisei, Montreal

**Fantasy** (6): Pangaea, Pluto, Mars, Deglaciated Antarctica, Achiran, Baikal (Nuke Wars)

Total: **32 maps** (enum `GameMapType`).

### 2.4 Players & Spawn

#### Player types

| Type | Description |
|------|-------------|
| `PlayerType.Human` | Real human player |
| `PlayerType.Bot` | Simple bot spawned by server config |
| `PlayerType.AiPlayer` | In-development AI player (indistinguishable from human in UI) |
| `PlayerType.FakeHuman` | NPC nation (seeded from map data, `clientID === null`) |

Source: `src/core/game/Game.ts` (`PlayerType` enum).

#### Spawn phase

- **Multiplayer**: 300 ticks
- **Singleplayer**: 100 ticks
- **Spawn immunity** (after phase ends): 50 ticks (5 seconds at 10 ticks/s)

Source: `src/core/configuration/DefaultConfig.ts` — `numSpawnPhaseTurns()`, `spawnImmunityDuration()`.

#### Starting troops

| Player type | Starting troops |
|-------------|----------------|
| Human | 25,000 |
| Bot | 10,000 |
| FakeHuman (nation) | `2,500–50,000 × nation.strength` (scales with difficulty) |

Source: `DefaultConfig.startManpower()`.

### 2.5 Economy

#### Gold income (per tick)

| Player type | Gold/tick |
|-------------|-----------|
| Human / AiPlayer | 100 |
| Bot | 50 |

Source: `DefaultConfig.goldAdditionRate()`.

#### Troop regeneration

```
toAdd = 10 + (troops^0.73) / 4
toAdd *= (1 - troops / maxTroops)   // ratio modifier
```

Bots regenerate at 60% of the base rate. FakeHumans scale with difficulty (0.9× to 1.2×).

Source: `DefaultConfig.troopIncreaseRate()`.

#### Max troops formula

```
maxTroops = 2 × (tiles^0.6 × 1000 + 50000) + sum(city.level()) × 250,000
```

- **Bots**: capped at `maxTroops / 3`
- **FakeHumans**: scaled by difficulty (0.5× Easy → 2× Impossible)

Source: `DefaultConfig.maxTroops()`.

#### Trade ships

Income formula:
```
baseGold = 100,000 / (1 + exp(-0.03 × (dist - 200))) + 100 × dist
bonus    = 1 + 2 × (numPorts - 1) / (numPorts - 1 + 5)   // up to 3×
income   = floor(baseGold × bonus)
```

The sigmoid heavily penalizes short-distance trades (under 200 tiles). More ports give up to a 3× multiplier via hyperbolic decay.

Source: `DefaultConfig.tradeShipGold()`.

### 2.6 Structures & Units

All 18 unit types (enum `UnitType` in `src/core/game/Game.ts`):

#### Cost scaling rule

Structures that use `Math.pow(2, n) × baseCost` scaling (City, Port, Factory):
- 1st: 125,000 gold
- 2nd: 250,000 gold
- 3rd: 500,000 gold
- 4th+: capped at 1,000,000 gold

Cost is counted across combined types (e.g., Port and Factory share a pool for cost purposes).

#### Offensive units

| Unit | Cost | Notes |
|------|------|-------|
| Transport Ship | Free | Naval invasion; max **3 per player**; attack = troops/5 (human) or troops/20 (bot) |
| Warship | 250k–1M (linear, +250k/unit) | Max health 1000; targeting range **130 tiles**; fires 250-dmg shells every 20 ticks |
| Shell | Free (projectile) | Damage 250; lifetime **50 ticks** |
| Atom Bomb | 750,000 | Inner destroy radius **12 tiles**, outer **30 tiles** |
| Hydrogen Bomb | 5,000,000 | Inner **80 tiles**, outer **100 tiles** |
| MIRV | 35,000,000 | Multi-warhead missile; does NOT break alliances |
| MIRV Warhead | Free (spawned by MIRV) | Inner **12 tiles**, outer **18 tiles** |
| SAM Missile | Free (projectile) | Launched by SAM Launcher |

#### Defensive / support structures

| Unit | Cost | Notes |
|------|------|-------|
| City | 125k–1M (2^n scaling) | Upgradable; each level +250k max troops; spawns train stations |
| Port | 125k–1M (2^n scaling, shared pool with Factory) | Upgradable; spawns trade ships + train stations |
| Factory | 125k–1M (2^n scaling, shared pool with Port) | Experimental; upgradable; spawns trains |
| Defense Post | 50k–250k (linear, +50k/unit) | +5× mag bonus, +3× speed bonus in **30-tile radius**; territory-bound |
| Missile Silo | 1,000,000 | Upgradable; fires nukes; **75-tick cooldown** |
| SAM Launcher | 1.5M–3M (linear, +1.5M/unit) | Upgradable; **80% hit chance on nukes**, **50% on warheads**; range **70 tiles**; 75-tick cooldown |

#### Logistics units

| Unit | Cost | Notes |
|------|------|-------|
| Trade Ship | Free | Port-to-port gold generation; auto-spawned |
| Train | Free (spawned by Factory) | Cargo logistics on railroad network |
| Construction | Free | Placeholder during build (territory-bound) |

Source: `src/core/configuration/DefaultConfig.ts` — `unitInfo()`.

### 2.7 Combat System

#### Land combat

The attack pipeline:
1. Attacker sends troops (default: `troops / 5` for humans, `troops / 20` for bots).
2. Tiles are conquered one at a time from a priority queue (border tiles near attacker territory).
3. Per tile, `attackLogic()` returns troop losses for both sides.

**Terrain base values:**

| Terrain | Magnitude (mag) | Speed |
|---------|-----------------|-------|
| Plains | 80 | 16.5 |
| Highland | 100 | 20 |
| Mountain | 120 | 25 |

`mag` scales attacker troop loss per tile. `speed` scales tiles-per-tick consumed.

**Combat modifiers:**

| Modifier | Effect |
|----------|--------|
| Defense Post (owner's) | mag ×5, speed ×3 (makes tile much harder to take) |
| Fallout on tile | mag × (5 − falloutRatio×2), speed × same factor |
| Large defender (sigmoid at 150k tiles) | Defender gets slower attack speed and weaker attack (gradual debuff) |
| Traitor (defender) | 0.5× defense (mag), 0.8× speed debuff |
| Human/AiPlayer vs Bot | 0.8× mag (bots easier to fight) |

**Retreat**: ordered retreat incurs **25% troop casualty**. Retreat is countered if opposing attacks exist.

#### Naval combat

- Transport Ship attack = `troops / 5` (human) or `troops / 20` (bot).
- Warships automatically target: transports > warships > trade ships (by priority).
- Warship firing rate: every 20 ticks; shell damage 250; shell lifetime 50 ticks.
- Warship targeting range: 130 tiles.

Source: `src/core/configuration/DefaultConfig.ts` — `attackLogic()`, `boatAttackAmount()`.

#### Alliance break on attack

When an attack is initiated:
- **Relation penalty**: −80 applied to target's relation with attacker.
- **Auto-embargo**: temporary 3000-tick embargo added.
- **Pending requests**: incoming alliance requests from the target are rejected automatically.

Nukes destroy tiles; after **100 tiles destroyed** alliance breaks (except MIRV, which does not break alliances).

Source: `AttackExecution.init()`, `DefaultConfig.nukeAllianceBreakThreshold()`.

### 2.8 Alliance & Diplomacy

#### Alliance lifecycle

1. Player sends `allianceRequest` intent.
2. Recipient can `allianceRequestReply` (accept/reject).
3. If both players send requests simultaneously → auto-accept.
4. Alliance lasts **3000 ticks** (5 minutes at base 10 ticks/s; ~3.3 min at Flashist 15 ticks/s).
5. Extension prompt shown **300 ticks before expiry**.

Source: `DefaultConfig.allianceDuration()` = 3000 ticks, `allianceExtensionPromptOffset()` = 300 ticks.

#### Relations

Relations scale 0–3:
- 0 = Hostile, 1 = Distrustful, 2 = Neutral, 3 = Friendly

Relations decay over time; attacks apply −80 delta.

#### Donations

- Gold and troops can be donated between players.
- **Cooldown**: 100 ticks.

#### Embargo

- Manual embargo or auto-embargo on attack.
- "Embargo All": single action embargoes all current traders; **100-tick cooldown**.
- Temporary embargo duration: 3000 ticks.

Source: `DefaultConfig.donateCooldown()`, `embargoAllCooldown()`, `temporaryEmbargoDuration()`.

### 2.9 Win Conditions

| Mode | Win condition |
|------|--------------|
| FFA | Own **>80%** of non-fallout land tiles |
| Team | Team owns **>95%** of non-fallout land tiles |
| Timer (either) | Timer expires → player/team with most tiles wins |

Timer max: 120 minutes (configurable via `GameConfig.maxTimerValue`). Win is checked every 10 ticks by `WinCheckExecution`.

Source: `src/core/execution/WinCheckExecution.ts`, `DefaultConfig.percentageTilesOwnedToWin()`.

### 2.10 Bot / AI Behavior

Bots are driven by `BotExecution` → `BotBehavior`.

| Parameter | Value |
|-----------|-------|
| Attack rate | Random interval 40–80 ticks (seeded per bot) |
| `triggerRatio` | 50–60% of troops (when to send attack) |
| `reserveRatio` | 30–40% of troops (hold in reserve) |
| `expandRatio` | 10–20% of troops (expand into empty land) |

**Attack priority:**
1. Neighbor traitors (chance: 1-in-3 normally, 1-in-6 if friendly ally).
2. Terra Nullius (unclaimed land) — always first priority if adjacent.
3. Random enemy neighbor (selected after enemies are "forgotten" over time).

Bots handle alliance requests and extensions automatically via `BotBehavior`.

Source: `src/core/execution/BotExecution.ts`, `src/core/execution/utils/BotBehavior.ts`.

### 2.11 Single-Player Missions

Players face progressively harder groups of NPC nations.

#### Mission system

- **Difficulty tiers**: Easy (1×), Medium (3×), Hard (9×), Impossible (18×) — troop multipliers for nations.
- **Tier distribution per mission level**:
  - Impossible nations: `floor(level / 50)`
  - Hard nations: `floor(level / 10)`
  - Medium nations: `floor(level / 1)`
  - Easy: remainder
- **Map selection**: cycled round-robin from sorted maps (by max player count).
- **Deterministic seeding**: `FNV-1a hash("spm:v1:{mapId}:{level}")`.

Source: `src/core/game/SinglePlayMissions.ts`.

---

## 3. Key Numbers Reference

| Constant | Value | Source |
|----------|-------|--------|
| Turn interval (base) | 100ms | `DefaultConfig.turnIntervalMs()` |
| Turn interval (Flashist 1.5× speed) | ≈67ms | `flashist_gameSpeedCoef = 1.5` |
| Spawn phase turns (multi) | 300 | `numSpawnPhaseTurns()` |
| Spawn phase turns (single) | 100 | `numSpawnPhaseTurns()` |
| Spawn immunity | 50 ticks | `spawnImmunityDuration()` |
| Starting troops (human) | 25,000 | `startManpower()` |
| Starting troops (bot) | 10,000 | `startManpower()` |
| Gold/tick (human) | 100 | `goldAdditionRate()` |
| Gold/tick (bot) | 50 | `goldAdditionRate()` |
| FFA win threshold | 80% tiles | `percentageTilesOwnedToWin()` |
| Team win threshold | 95% tiles | `percentageTilesOwnedToWin()` |
| Max timer | 120 minutes | `GameConfigSchema.maxTimerValue` |
| Alliance duration | 3000 ticks | `allianceDuration()` |
| Alliance extension prompt | 300 ticks before expiry | `allianceExtensionPromptOffset()` |
| Temporary embargo duration | 3000 ticks | `temporaryEmbargoDuration()` |
| Donate cooldown | 100 ticks | `donateCooldown()` |
| Embargo all cooldown | 100 ticks | `embargoAllCooldown()` |
| Relation penalty on attack | −80 | `AttackExecution.init()` |
| Retreat casualty | 25% | `malusForRetreat = 25` |
| Max transport ships/player | 3 | `boatMaxNumber()` |
| City troop increase/level | 250,000 | `cityTroopIncrease()` |
| Defense post range | 30 tiles | `defensePostRange()` |
| SAM range | 70 tiles | `defaultSamRange()` |
| Warship targeting range | 130 tiles | `warshipTargettingRange()` |
| Warship shell damage | 250 | `UnitType.Shell` damage |
| Shell lifetime | 50 ticks | `shellLifetime()` |
| SAM/Silo cooldown | 75 ticks | `SAMCooldown()`, `SiloCooldown()` |
| SAM hit chance (nuke) | 80% | `samHittingChance()` |
| SAM hit chance (warhead) | 50% | `samWarheadHittingChance()` |
| Atom Bomb inner/outer | 12 / 30 tiles | `nukeMagnitudes()` |
| Hydrogen Bomb inner/outer | 80 / 100 tiles | `nukeMagnitudes()` |
| MIRV Warhead inner/outer | 12 / 18 tiles | `nukeMagnitudes()` |
| Nuke alliance break threshold | 100 tiles | `nukeAllianceBreakThreshold()` |
| Bot attack rate | 40–80 ticks | `BotExecution` constructor |
| Large player sigmoid midpoint | 150,000 tiles | `DEFENSE_DEBUFF_MIDPOINT` |
| Structure minimum distance | 15 tiles | `structureMinDist()` |
| Train station range | 15–100 tiles | `trainStationMinRange/MaxRange()` |
| Max railroad size | 120 segments | `railroadMaxSize()` |

---

## 4. Technical Architecture

### 4.1 Three-Tier Structure

```
src/client/   → Browser frontend (Pixi.js rendering, Lit components, input handling)
src/core/     → Shared deterministic game logic (runs on both client and server)
src/server/   → Node.js backend (game lifecycle, WebSocket, load balancing)
```

The core layer is the most critical: **never introduce randomness or side-effects that would produce different results on different machines**.

### 4.2 Server: Master-Worker Architecture

- **Master process** (port 3000): routes incoming connections by `hash(gameID) % numWorkers`, forks N worker processes, restarts crashed workers.
- **Workers** (ports 3001, 3002, …): each runs WebSocket + Express, handles multiple `GameServer` instances.
- Routing is deterministic: `workerIndex(gameID) = simpleHash(gameID) % numWorkers`.
- Worker path prefix in WebSocket URL: `/w{workerIndex}/`.

Source: `src/core/configuration/DefaultConfig.ts` — `workerIndex()`, `workerPortByIndex()`.

### 4.3 Game Tick System

Each server turn:
1. Collect all intents received since last turn.
2. Broadcast `turn` message (intents + turn number + optional hash).
3. Client receives turn → `GameRunner.addTurn()` → `executeNextTick()`.
4. `Executor.createExecs(turn)` converts intents to `Execution` objects.
5. `game.executeNextTick()` ticks all active executions → emits `GameUpdates`.
6. `WinCheckExecution.tick()` checks win condition every 10 ticks.

Source: `src/core/GameRunner.ts`.

### 4.4 Networking Protocol

Messages are Zod-validated JSON over WebSocket.

**Client → Server:**

| Message | Purpose |
|---------|---------|
| `join` | Join game (contains clientID, token, gameID, cosmetics) |
| `intent` | Game action |
| `ping` | Latency keepalive |
| `hash` | Client reports state hash for desync detection |
| `winner` | Client reports game winner + stats |

**Server → Client:**

| Message | Purpose |
|---------|---------|
| `prestart` | Map info sent before game start |
| `start` | Game start (includes missed turns for late joiners) |
| `turn` | Broadcast turn (intents + hash) |
| `desync` | Desync detected, client out of sync |
| `error` | Server error |

Source: `src/core/Schemas.ts`.

### 4.5 Client Game Runner

- `Transport.ts`: WebSocket abstraction; also accepts `LocalServer` for singleplayer/replay.
- **Dual-thread architecture**:
  - **Main thread**: rendering (60fps), input, WebSocket networking.
  - **Web Worker**: tick simulation, pathfinding, hash computation (off-main-thread for responsiveness).
- Game state flows: Worker → serialized updates → Main thread renderer.

Source: `src/client/Transport.ts`, `src/client/ClientGameRunner.ts`.

### 4.6 Intent → Execution Pipeline

```
User input
  → InputHandler.ts (captures event)
  → EventBus (e.g. SendAttackIntentEvent)
  → Transport.ts (serializes + sends over WebSocket)
  → GameServer.ts (collects, batches)
  → Broadcast "turn" message
  → ClientGameRunner.ts (receives turn)
  → Executor.createExec(intent)
  → Execution.init() + .tick()
  → GameUpdates emitted
  → Renderer updates
```

**Registered execution classes** (source: `src/core/execution/ExecutionManager.ts`):

`AttackExecution`, `RetreatExecution`, `BoatRetreatExecution`, `MoveWarshipExecution`, `SpawnExecution`, `TransportShipExecution`, `AllianceRequestExecution`, `AllianceRequestReplyExecution`, `AllianceExtensionExecution`, `BreakAllianceExecution`, `TargetPlayerExecution`, `EmojiExecution`, `DonateGoldExecution`, `DonateTroopsExecution`, `BuildUnitExecution` (via `ConstructionExecution`), `UpgradeStructureExecution`, `EmbargoExecution`, `EmbargoAllExecution`, `QuickChatExecution`, `MarkDisconnectedExecution`, `DeleteUnitExecution`, `FakeHumanExecution`, `BotExecution`, `WinCheckExecution`.

### 4.7 Desync Detection

- Client computes a state hash each tick.
- Every 10 ticks, client sends `hash` message to server.
- Server finds consensus (most common hash across active clients).
- Minority clients are sent a `desync` message and shown an error modal.
- The `desync` message includes: correct hash, client's hash, count of clients with correct hash.

Source: `src/core/Schemas.ts` — `ServerDesyncSchema`.

### 4.8 Rendering Architecture

Built on Pixi.js canvas with ~35 DOM-based Lit components and canvas layers.

**Canvas layers** (rendered in order):
`TerrainLayer`, `TerritoryLayer`, `RailroadLayer`, `StructureLayer`, `StructureIconsLayer`, `UnitLayer`, `FxLayer`, `NameLayer`

**DOM overlay components (Lit)**:
`Leaderboard`, `ControlPanel`, `PlayerPanel`, `BuildMenu`, `AlertFrame`, `EventsDisplay`, `ChatDisplay`, `ChatModal`, `SpawnTimer`, `HeadsUpMessage`, `WinModal`, `NukePlanningLayer`, `SAMRadiusLayer`, `MainRadialMenu`, `EmojiTable`, `SettingsModal`, `MultiTabModal`, `FPSDisplay`, `AdTimer`, `ReplayPanel`, `TeamStats`, `GameLeftSidebar`, `GameRightSidebar`, `PlayerInfoOverlay`, `UnitDisplay`, `UILayer`

`TransformHandler` handles world↔screen coordinate transforms for zoom/pan. Frame budget warning fires if frame exceeds 50ms.

Source: `src/client/graphics/GameRenderer.ts`.

### 4.9 Map System

**Data structures:**
- `Uint8Array terrain` (immutable): encodes `isLand`, `isShoreline`, `isOcean`, `magnitude` in bits.
- `Uint16Array state` (mutable): encodes `playerID` (12 bits), `fallout` (bit 13), `defenseBonus` (bit 14).

**Tile types**: Plains, Highland, Mountain, Ocean, Lake.

**Lookup tables**: pre-computed `refToX`, `refToY`, `yToRef` for O(1) coordinate conversion without division at runtime.

**Distance functions**: Manhattan, Euclidean (squared), BFS (flood-fill).

Source: `src/core/game/GameMap.ts`.

### 4.10 Pathfinding

- **Land**: A\* with incremental/lazy computation (`PathFinder`, `MiniAStar`).
- **Air (missiles)**: `AirPathFinder` — line-of-sight with `PseudoRandom` for trajectory variation.
- **Projectiles**: `ParabolaPathFinder` for shell arc trajectories.

### 4.11 Configuration System

Three-level hierarchy:
1. `src/core/configuration/Config.ts` — full `Config` and `ServerConfig` interfaces (canonical contract).
2. `src/core/configuration/DefaultConfig.ts` — base `DefaultConfig` and `DefaultServerConfig` implementations.
3. `src/core/configuration/DevConfig.ts`, `PreprodConfig.ts`, `ProdConfig.ts` — environment overrides.

Selected at runtime via the `GAME_ENV` environment variable.

### 4.12 Authentication

- EdDSA JWT tokens (Ed25519 curve).
- Server fetches JWK public key from `{jwtIssuer}/.well-known/jwks.json` at startup.
- Client submits token in the `join` WebSocket message.
- Persistent player UUID (`persistentID`) links sessions to accounts.
- Client auto-refreshes token at a 3-day threshold.

Source: `src/core/configuration/DefaultConfig.ts` — `jwkPublicKey()`.

### 4.13 Replay System

- On game end, server archives: `GameStartInfo` + all turns + player stats to S3-compatible storage.
- Client replays from archive using `LocalServer` (same execution pipeline as live game).
- `ReplayPanel` controls: 0.5×, 1×, 2×, fastest speed.

### 4.14 Stats Tracking

Per-player stats tracked throughout game:
- Attacks sent/received, betrayals, boat invasions, bombs deployed.
- Gold earned (breakdown by source), unit counts, conquests.
- Uses `BigInt` for overflow safety on gold amounts.

Source: `src/core/game/Stats.ts`, `src/core/StatsSchemas.ts`.

---

## 5. AI Players Feature (In Development)

**Spec**: `ai-agents/tasks/feature_spec_ai_players_standalone.md`

### Purpose

Inject AI Players into public lobbies during the preparation countdown to simulate healthy player presence. AI Players are indistinguishable from real players in the UI.

### Key design decisions

| Decision | Details |
|----------|---------|
| Player type | `PlayerType.AiPlayer = "AIPLAYER"` (new, distinct from FakeHuman) |
| Names | `Anon0000`–`Anon0999` (human anons use `Anon1000`–`Anon9999`) |
| Client IDs | Synthetic but deterministic; valid 8-char `[a-zA-Z0-9]` IDs |
| Lobby scope | Public lobbies only |
| Difficulty | Medium |
| Name seeding | `PseudoRandom(simpleHash(lobbyId))` shuffled then consumed in join order |
| Determinism | All AI list, names, IDs must be identical on all clients to prevent desync |

### In-match behavior

- AI Player entities created in `GameRunner` from `gameStartInfo.aiPlayers`.
- `AiPlayerExecution` drives them using `BotBehavior` logic.
- Must have real `clientID` values so winner flow resolves correctly.
- Leaderboard "Players only" filter includes `AiPlayer` type.

### Lobby injection algorithm

Target curve fills lobby gradually over countdown. Hard constraints:
- Human join always evicts the most-recently-joined AI if lobby is full.
- AI cap: `aiPlayersMax = 10` (default).
- Human reservation: `minHumanSlots = 1`.

Source: `ai-agents/tasks/feature_spec_ai_players_standalone.md`.

---

## 6. Internationalization

- 30+ languages supported via JSON files in `resources/lang/`.
- Flashist/Yandex SDK override for Russian-platform users.
- API: `translateText(key, params)` with dot-notation keys and `{param}` substitution.

---

## 7. Project Layout Quick Reference

### Critical files

| File | Purpose |
|------|---------|
| `src/core/Schemas.ts` | All intent, message, and data schemas (Zod) |
| `src/core/GameRunner.ts` | Client-side tick execution + game initialization |
| `src/core/game/Game.ts` | All core enums, interfaces, Player/Unit/Game contracts |
| `src/core/game/GameImpl.ts` | Game state container implementation |
| `src/core/game/GameMap.ts` | Tile/map data structures |
| `src/core/execution/ExecutionManager.ts` | Intent → Execution dispatch |
| `src/core/execution/AttackExecution.ts` | Land combat logic |
| `src/core/execution/WinCheckExecution.ts` | Win condition evaluation |
| `src/core/execution/BotExecution.ts` | Bot AI behavior |
| `src/core/game/SinglePlayMissions.ts` | Singleplayer mission generation |
| `src/core/configuration/Config.ts` | Full Config + ServerConfig interfaces |
| `src/core/configuration/DefaultConfig.ts` | Base config implementation with all defaults |
| `src/server/GameServer.ts` | Game lifecycle, WebSocket handling, AI lobby injection |
| `src/client/ClientGameRunner.ts` | Client game orchestration |
| `src/client/Transport.ts` | WebSocket communication + event definitions |
| `src/client/graphics/GameRenderer.ts` | Rendering layer orchestration |
| `ai-agents/tasks/feature_spec_ai_players_standalone.md` | AI Players feature specification |
| `src/core/CosmeticSchemas.ts` | Pattern, ColorPalette, Product Zod schemas |
| `src/core/PatternDecoder.ts` | Binary pattern decoder (base64url → bitmap) |
| `src/core/ApiSchemas.ts` | User profile and flare schemas |
| `src/server/Privilege.ts` | Server-side flare/privilege checker |
| `src/server/PrivilegeRefresher.ts` | Loads + caches `cosmetics.json` every 3 min |
| `src/client/Cosmetics.ts` | Client cosmetics fetcher + Stripe purchase handler |
| `src/client/TerritoryPatternsModal.ts` | Shop UI modal (Patterns tab + Colors tab) |
| `src/client/components/PatternButton.ts` | Pattern preview canvas component |
| `src/client/GutterAds.ts` | Fuse network ad integration |
| `resources/cosmetics/cosmetics.json` | Master cosmetics definitions (35+ patterns, 40+ flag layers, 30+ colors) |

### Execution classes directory

All execution classes live in `src/core/execution/`. Alliance-related ones are in `src/core/execution/alliance/`. Bot utility in `src/core/execution/utils/BotBehavior.ts`.

### Rendering layers directory

All rendering layers: `src/client/graphics/layers/`.

### Configuration directory

Environment configs: `src/core/configuration/` (`DevConfig.ts`, `PreprodConfig.ts`, `ProdConfig.ts`).

---

## 8. Development Workflow

### Commands

```bash
npm run dev              # Client + server with hot reload
npm run dev:staging      # Client + server, API → api.openfront.dev
npm run dev:prod         # Client + server, API → api.openfront.io
npm run dev:remote       # Client only, proxies WS/API to remote dev VPS
npm run start:client     # Client only
npm run start:server-dev # Server only (dev settings)
npm test                 # Run all tests
npm test -- path/to/test # Run specific test
npm run lint             # Check lint errors
npm run lint:fix         # Auto-fix lint errors
npm run format           # Format with Prettier
npm run gen-maps         # Regenerate maps (Go tool in map-generator/)
npm run perf             # Performance benchmarks (tests/perf/)
```

### Adding a new game feature

1. **Define intent schema** in `src/core/Schemas.ts` (Zod, add to `Intent` union).
2. **Create execution class** in `src/core/execution/` implementing the `Execution` interface.
3. **Register** in `Executor.createExec()` in `src/core/execution/ExecutionManager.ts`.
4. **Add UI trigger** in `src/client/InputHandler.ts` (emit an event on `EventBus`).
5. **Add Transport handler** in `src/client/Transport.ts` if a new event type is needed.
6. **Add rendering layer** if needed in `src/client/graphics/layers/` (register in `GameRenderer.ts`).

### Testing requirements

- All changes to `src/core/` **must be tested**.
- Tests live in `tests/` using Jest + SWC.
- Run: `npm test -- tests/YourFeature.test.ts`

### Code style rules

- Use `===` (eqeqeq enforced by ESLint).
- Use `??` (nullish coalescing) over `||` for defaults.
- TypeScript strict null checks enabled.
- Pre-commit hooks: husky + lint-staged (runs ESLint + Prettier).

### Fork divergence convention

Any intentional deviation from upstream OpenFront.io must be marked:

```ts
// Flashist Adaptation
// <explanation of why>
```

---

## 9. Common Pitfalls & Notes

1. **Determinism is sacred**: any nondeterministic code in `src/core/` will cause desyncs. Use `PseudoRandom` (seeded) instead of `Math.random()`.
2. **BigInt for gold**: all gold amounts are `bigint`. Do not mix with `number`.
3. **TileRef is a number**: not an object. Use the `GameMap` interface methods to get coordinates.
4. **`// Flashist Adaptation` zones**: do not "fix" commented-out code (Duos/Trios/Quads modes) without understanding the rationale.
5. **FakeHuman vs AiPlayer**: nations are `FakeHuman` with `clientID === null`. AI Players are `AiPlayer` with real synthetic `clientID`. Never conflate them.
6. **Cost pool sharing**: Port and Factory share the same `unitsOwned` pool for cost purposes — building one raises the price of the other.
7. **Turn interval is Flashist-overridden**: the base is 100ms but this fork runs at ≈67ms (1.5× speed). Any time-based reasoning must account for this.

---

## 10. Cosmetics, Shop & Monetization

### 10.1 Overview

Players can customize their territory appearance with **patterns** and **colors**. These cosmetics are purely visual. A **flare**-based access system controls which cosmetics each player can use. Cosmetics are purchased via Stripe checkout.

**Status summary:**

| System | Status |
|--------|--------|
| Patterns | Active — 35+ patterns, purchasable via Stripe |
| Pattern color palettes | Active — per-pattern color variants |
| Territory base color | Active — custom hex colors |
| Flags | **Disabled** (Flashist Adaptation — defined but not served to clients) |
| Ads | Active — Fuse network gutter ads; hidden if user owns any pattern |

### 10.2 Cosmetics Data Model

**PlayerCosmetics** (sent during game join, stored by server per player):
```ts
{
  flag?: string;          // Country code OR "!" prefix for custom; CURRENTLY DISABLED
  pattern?: {
    name: string;         // Alphanumeric + underscore, max 32 chars
    patternData: string;  // Base64url-encoded binary bitmap (see §10.3)
    colorPalette?: {
      name: string;
      primaryColor: string;   // Hex
      secondaryColor: string; // Hex
    };
  };
  color?: { color: string };  // Hex territory color
}
```

The client sends only **refs** (names) in the join message; the server resolves them to full data via `Privilege.ts` + `cosmetics.json`.

Schema sources: `src/core/Schemas.ts` (`PlayerCosmeticsSchema`, `PlayerCosmeticRefsSchema`), `src/core/CosmeticSchemas.ts`.

### 10.3 Pattern Binary Format

Patterns are stored as base64url-encoded binary in `cosmetics.json` and sent to clients. The `PatternDecoder` class (`src/core/PatternDecoder.ts`) decodes them:

| Byte | Contents |
|------|----------|
| 0 | Version (must be 0) |
| 1 | Scale (bits 0–2) + width high bits (bits 3–7) |
| 2 | Height (bits 0–5) + width low bits (bits 6–7) |
| 3+ | Bitmap data (1 bit per pixel, row-major) |

Max dimensions: 130 × 66 tiles. Scale encodes the rendered size multiplier.

### 10.4 Cosmetics Database (`resources/cosmetics/cosmetics.json`)

Loaded by `PrivilegeRefresher.ts` and refreshed every 3 minutes (with jitter).

Structure:
```json
{
  "role_groups": {
    "donor": ["Discord_ID_..."],
    "creator": ["Discord_ID_..."]
  },
  "patterns": {
    "<base64url_key>": {
      "name": "pattern_name",
      "role_group": "donor" | "creator" | null,
      "colorPalettes": [{ "name": "...", "isArchived": false }],
      "product": { "productId": "...", "priceId": "...", "price": 4.99 },
      "affiliateCode": null
    }
  },
  "flag": {
    "layers": { "<id>": { "name": "...", "role_group": "..." } },
    "color": { "<id>": { "color": "#xxxxxx", "name": "..." } }
  }
}
```

Current contents: 35+ patterns (stripes, checkerboard, symbols, etc.); 40+ flag layers; 30+ flag colors including special effects (rainbow, gold-glow, lava, neon, water).

### 10.5 Flare / Privilege System (`src/server/Privilege.ts`)

A **flare** is a string stored in the user's API profile that grants access to specific cosmetics. The server validates flares on every game join; clients only receive cosmetics they are entitled to.

**Flare format:**

| Flare string | Grants |
|--------------|--------|
| `pattern:*` | All patterns (unlocked) |
| `pattern:{name}` | Specific pattern (no color palette) |
| `pattern:{name}:{colorPaletteName}` | Specific pattern + specific color palette |
| `color:{hexcode}` | Specific territory base color (6-digit hex without `#`; `#` is prepended during comparison) |

**Validation flow:**
1. Client sends `PlayerCosmeticRefs` (names only) in the `join` message.
2. Server calls `Privilege.getPlayerCosmetics(refs, flares)`.
3. Checker verifies: pattern exists in `cosmetics.json`, data is valid base64url, user has required flare(s), color palette not archived.
4. Returns resolved `PlayerCosmetics` or an error.

### 10.6 Purchase Flow (Stripe)

1. User opens `TerritoryPatternsModal`, sees patterns marked `purchasable` (not owned, has `product`, not archived, matching `affiliateCode`).
2. User clicks **Purchase** on a `PatternButton`.
3. `Cosmetics.handlePurchase()` in `src/client/Cosmetics.ts` calls:
   ```
   POST /stripe/create-checkout-session
   Headers: Authorization (JWT), X-Persistent-Id
   Body: { priceId, hostname, colorPaletteName }
   ```
4. API (external, hosted separately) returns a Stripe checkout URL.
5. Client redirects to Stripe checkout.
6. Post-payment: Stripe webhook updates user's flares in the API database.
7. Next game join, the server resolves the new flare and the cosmetic is available.

The Stripe publishable key is exposed via `Config.stripePublishableKey()` (env var `STRIPE_PUBLISHABLE_KEY`).

### 10.7 Ads System (`src/client/GutterAds.ts`)

- Uses **Fuse network** ad platform.
- Shown only on main site (not in iframes), only on screens ≥ 1400px wide.
- **Hidden automatically** if the user owns `pattern:*` flare (i.e., any pattern owner is ad-free).
- Two side-by-side gutter ad slots.

### 10.8 Flags (Disabled)

Flags are defined in `cosmetics.json` with 40+ layer definitions and 30+ colors, and the schema (`FlagSchema`) supports country codes (2-letter ISO) and `"!"` prefix for custom flags. However:

```ts
// Flashist AdaptatioN: disabling flags
// cosmetics.flag = result.data;   ← this line is commented out in Privilege.ts
```

Flag data is never sent to clients. Do not build features relying on flags without re-enabling this.

### 10.9 External API Endpoints

The cosmetics and auth endpoints are served by a separate API server (not in this repo):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/cosmetics.json` | Fetch cosmetics definitions |
| GET | `/users/@me` | Get user profile including flares |
| POST | `/login/discord` | Discord OAuth login |
| POST | `/refresh` | Refresh JWT |
| POST | `/stripe/create-checkout-session` | Initiate Stripe checkout |

API base URL: determined by `getApiBase()` in `src/client/jwt.ts` (defaults to `https://api.{domain}`, overridable via localStorage on localhost).
