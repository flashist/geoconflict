# Sprint 4b Mini Mode Compatibility Findings

## Summary

Compact maps can be added to the full public map rotation, but six current public-rotation maps have at least one halved nation coordinate that lands on water. This is not a hard blocker: affected nations may still spawn on nearby land through the existing local spawn search, or may fail to spawn if the search does not find land. The expected impact is uneven or geographically shifted nation distribution, not a crash.

Duos/Trios/Quads are not fixed team-count modes. They are team-size modes: the game derives the number of teams from the number of started players, using teams of 2, 3, or 4. AI Players can participate because they are passed through the same `PlayerInfo` path as humans and are assigned by the same team balancing logic. The original "too few people" failure is still reachable if one of these string modes starts with too few player-like participants, but normal public matchmaking with AI Players enabled should avoid it by filling to about 10 visible participants before start.

Recommended implementation changes:

- Do not exclude compact maps solely because some nation coordinates land on water.
- Track Asia, Black Sea, Europe, Mena, North America, and Pangaea as maps where compact nations may spawn shifted from their intended locations or fail to spawn.
- A deterministic land-snap for compact nation coordinates would improve fidelity, but is not required for Sprint 4b.
- Compact public matches should consider a lower `maxPlayers` cap or at least staging validation at high human fill. Compact land area is about 24-25% of normal area, while public `maxPlayers` is unchanged.
- Duos/Trios/Quads can be re-enabled for public matchmaking with AI Players, but add tests for low participant counts and for AI Players in string team-size modes.
- The Duos/Trios/Quads localization keys already exist in both locale files; the re-enable brief's localization step is already satisfied unless wording changes.

## Source Files Checked

- `ai-agents/tasks/backlog/sprint4b-mini-mode-investigation.md`
- `ai-agents/tasks/backlog/sprint4b-compact-map-rotation.md`
- `ai-agents/tasks/backlog/sprint4b-duos-trios-quads.md`
- `ai-agents/sprints/plan-sprint-4b.md`
- `karpathy-vault/wiki/decisions/sprint-4b.md`
- `karpathy-vault/wiki/features/ai-players.md`
- `karpathy-vault/wiki/systems/game-overview.md`
- `src/server/MapPlaylist.ts`
- `src/server/GameServer.ts`
- `src/core/GameRunner.ts`
- `src/core/game/TerrainMapLoader.ts`
- `src/core/game/GameImpl.ts`
- `src/core/game/Game.ts`
- `src/core/Schemas.ts`
- `src/core/configuration/DefaultConfig.ts`
- `src/core/game/TeamAssignment.ts`
- `src/core/execution/ExecutionManager.ts`
- `src/core/execution/BotSpawner.ts`
- `src/core/execution/SpawnExecution.ts`
- `src/core/execution/FakeHumanExecution.ts`
- `src/client/ClientGameRunner.ts`
- `src/client/PublicLobby.ts`
- `resources/lang/en.json`
- `resources/lang/ru.json`
- `resources/maps/*/manifest.json`
- `resources/maps/*/map4x.bin`
- Git history commit `9812f03` (`Porting (disabling some game modes to avoid few-people problems, removing some openfront related texts)`)

## Method

I audited all maps with positive frequency in `MapPlaylist.ts`; `Yenisei` is frequency 0 and was not considered part of the current public rotation. For each map, I loaded the manifest and `map4x.bin`, then applied the same compact coordinate transform used by `TerrainMapLoader.ts`:

```ts
Math.floor(nation.coordinates[0] / 2)
Math.floor(nation.coordinates[1] / 2)
```

I checked whether each compact coordinate is in bounds and on a land tile. I also checked duplicate coordinates, nearest-neighbor distance, compact land-tile ratio, current player density, and whether compact bot spawning can still place the configured 400 generic bots with the existing `BotSpawner` spacing rule.

## Findings by Question

### 1. Compact Nation Coordinate Validity

Non-blocking issue found.

Six public-rotation maps have compact nation coordinates that land on water:

| Map | Water coordinates | Notes |
|---|---:|---|
| Asia | 1 | The affected coordinate's nearest land by Manhattan distance is 28 tiles away. There is some land inside the nation spawn search square, but the exact center fails the land check. |
| Black Sea | 1 | Nearest land is 1 tile away. |
| Europe | 1 | Nearest land is 1 tile away. |
| Mena | 1 | Nearest land is 16 tiles away. |
| North America | 8 | Worst map in the audit. Nearest land distances range from 2 to 15 tiles. |
| Pangaea | 2 | Both are 1 tile from land. |

No compact coordinate was out of bounds. No duplicate compact nation coordinates were found.

There are a few close compact nation pairs, but not enough to call them a standalone blocker:

| Map | Minimum compact nation distance |
|---|---:|
| Pangaea | 5.0 |
| East Asia | 5.8 |
| World | 7.3 |

The water-coordinate maps can still be included in compact FFA. Public FFA keeps nations enabled, and `FakeHumanExecution.randomSpawnLand()` searches randomly around the configured spawn cell for nearby unowned land. If that search succeeds, the nation spawns shifted from its intended center. If the search misses nearby land, the nation logs `cannot spawn <name>` and never receives starting territory.

Implementation brief change: do not add `COMPACT_EXCLUDED_MAPS` for this issue. Instead, note that Asia, Black Sea, Europe, Mena, North America, and Pangaea may have uneven or shifted nation distribution in compact mode. If fidelity becomes important later, add deterministic compact-coordinate land-snapping as a polish/fix task.

### 2. Compact Player Capacity

Problem found, but it is a tuning risk rather than a direct crash path.

Every compact map has about one quarter of the normal land area:

- Lowest compact/normal land ratio: North America at 23.8%.
- Typical compact/normal land ratio: 24-25%.
- Highest compact/normal land ratio in the public rotation: Strait of Gibraltar at 24.9%.

`DefaultServerConfig.lobbyMaxPlayers()` does not receive `gameMapSize`, and `MapPlaylist.gameConfig()` computes `maxPlayers` before any compact modifier can be applied. Keeping the same max player count therefore makes compact matches roughly 4x denser at full human fill.

Most crowded compact full-lobby cases by land per player:

| Map | Compact land | Current large FFA cap | Compact land/player |
|---|---:|---:|---:|
| World | 158,550 | 50 | 3,171 |
| Italia | 192,915 | 50 | 3,858 |
| Falkland Islands | 208,351 | 50 | 4,167 |
| North America | 295,689 | 70 | 4,224 |
| Halkidiki | 428,074 | 100 | 4,281 |
| East Asia | 215,238 | 50 | 4,305 |
| Britannia | 228,988 | 50 | 4,580 |

The current AI Player fill softens this in normal public traffic because `targetTotalByTimeout` is 10 and `minHumanSlots` is 1, so public lobbies tend to start around 10 participants unless real users fill more slots. It does not protect against genuinely full human lobbies.

Bot spawning also becomes constrained on small compact maps. With the current 400 generic bot target and the `BotSpawner` 30-tile Manhattan spacing rule, a five-seed simulation found these compact maps often cannot place 400 bots before the retry limit:

| Map | Compact bot spawn average |
|---|---:|
| Pangaea | 145 |
| Japan | 154 |
| Faroe Islands | 160 |
| World | 248 |
| Italia | 268 |
| East Asia | 285 |
| Falkland Islands | 304 |
| Britannia | 308 |

This is not a crash because `BotSpawner.spawnBots()` gives up and returns the bots it placed, but it means compact public matches on small maps may have much lower generic-bot density than expected.

Implementation brief change: either accept compact maps as faster, denser matches and validate the experience on staging, or cap compact `maxPlayers` separately. A conservative cap would scale current map player counts down for compact maps rather than leaving them unchanged.

### 3. Other Compact Rendering or Gameplay Issues

No hard rendering blocker found from source inspection.

Compact mode already uses `map4x.bin` as the main map and `map16x.bin` as the minimap in `TerrainMapLoader.ts`. Camera, minimap, and auto-spawn paths use the loaded map dimensions and should adapt to compact dimensions.

Gameplay risks to validate on staging:

- Nation spawn centers on the six affected maps are not valid land; affected nations may spawn shifted or may not spawn.
- Player auto-spawn tries 1000 random land tiles. This should be fine on all audited compact maps because even the smallest compact maps have over 100k land tiles.
- Generic bot spawning may place far fewer than 400 bots on small compact maps because of the existing 30-tile spacing rule.
- The compact loader mutates `manifest.nations` in place after loading. Because the binary loader caches manifest promises, verify switching between Normal and Compact for the same map in one client session does not leave normal map nations with already-halved coordinates. This risk predates Sprint 4b, but public compact rotation will exercise it more often.

### 4. What Duos/Trios/Quads Mean

They are team-size modes, not fixed team-count modes.

Original upstream logic, removed by commit `9812f03`, did this in `GameImpl.populateTeams()`:

- `Duos`: `numPlayerTeams = Math.ceil(players / 2)`
- `Trios`: `numPlayerTeams = Math.ceil(players / 3)`
- `Quads`: `numPlayerTeams = Math.ceil(players / 4)`

`DefaultServerConfig.lobbyMaxPlayers()` also rounded capacity down to a multiple of 2, 3, or 4 for these modes.

So regular `playerTeams: 2 | 3 | 4` means "exactly 2, 3, or 4 teams." `playerTeams: "Duos" | "Trios" | "Quads"` means "as many teams as needed so each team has at most about 2, 3, or 4 players." It does not require fixed human players per team.

### 5. AI Player Compatibility

No AI-specific blocker found.

AI Players are added to `GameStartInfo.aiPlayers` by `GameServer.start()`, then `GameRunner.createGameRunner()` converts them into `PlayerInfo` entries with `PlayerType.AiPlayer` and passes them into `createGame()` in the same player list as humans. `GameImpl.addPlayers()` then calls `assignTeams()` for ordinary team modes. `assignTeams()` treats AI Players as non-nation players, so they are distributed with humans before FakeHuman nations.

There is no team-assignment branch that assumes Duos/Trios/Quads are human-only. The important condition is total participant count at game creation, not whether each participant is real or AI.

### 6. Original Failure Mode

The concrete failure is still visible in the disabled `GameImpl.populateTeams()` logic:

- If a string team-size mode derives fewer than 2 teams, `populateTeams()` throws `Too few teams: 1`.
- That can happen with `Duos` at 1 participant, `Trios` at 1-2 participants, or `Quads` at 1-3 participants.

With current production public AI fill, the normal path should avoid this. Production and dev configs enable AI Players. Public lobby fill targets 10 total participants by the end of the creation timeout, with one slot reserved for humans. A one-human lobby should therefore start with roughly 1 human plus 9 AI Players, which derives enough teams for Duos, Trios, and Quads.

Remaining reachable cases:

- AI Players disabled in a non-prod config or test config.
- AI fill failing before start because of a config regression.
- Private or singleplayer surfaces exposing Duos/Trios/Quads without equivalent fill.
- A public game starting with fewer than the required participant count due to lifecycle changes.

Implementation brief change: add unit coverage for low participant counts and AI-filled string team-size modes. If re-enabling these modes outside public matchmaking, add a guard that prevents starting Duos/Trios/Quads unless enough player-like participants exist.

### 7. Compact + Duos/Trios/Quads Interaction

No unique crash path found for the combination, but it compounds the player-density risk.

Duos/Trios/Quads derive team count from actual participants. With AI fill's target of about 10 participants, expected derived team counts are:

| Mode | 10 participants produces |
|---|---:|
| Duos | 5 teams |
| Trios | 4 teams |
| Quads | 3 teams |

That is compatible with compact maps at normal AI-filled public lobby sizes. It becomes questionable if a compact lobby fills close to the current normal `maxPlayers`; Duos on a 100-player compact match would derive 50 teams, which is technically supported by the generic `Team 1`, `Team 2`, ... path but is likely overcrowded and hard to read.

Implementation brief change: compact + Duos/Trios/Quads can ship without compact map exclusions, but staging should explicitly validate a compact Duos/Trios/Quads match and inspect whether nation distribution remains acceptable on the affected maps. If compact `maxPlayers` is not reduced, include a high-fill staging test or be ready to lower compact caps after release.

## Validation Performed

- Ran the required wiki/context check before implementation work.
- Audited all 28 positive-frequency public maps from `MapPlaylist.ts`.
- Checked compact nation coordinates against real `map4x.bin` land bits.
- Compared compact vs normal land-tile counts and current public player caps.
- Simulated current generic bot placement constraints on compact `map4x.bin` terrain for five deterministic seeds per map.
- Traced Duos/Trios/Quads disabled code in git history and current source.
- Traced AI lobby fill, AI materialization, team assignment, and public lobby badge localization.

No runtime implementation code was changed.
