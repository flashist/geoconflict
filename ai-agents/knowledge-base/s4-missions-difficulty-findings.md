# Sprint 4 Missions Difficulty Findings

## Summary

Missions mode does not use a finite list of authored mission configs. It is a generated, sequential level system backed by localStorage. Each mission level starts from one shared singleplayer config, then `LocalServer.buildMissionConfigIfNeeded()` derives the map and per-nation difficulties from the mission level.

The original structure created a steep difficulty curve early because nations were enabled, maps were ordered by `mapMaxPlayers()`, and the nation difficulty mix ramped directly from the level number. Follow-up implementations now prebuild map nation counts into `src/core/game/MapNationCounts.json`, exclude maps with zero nation slots, order mission maps by nation count instead of max players, and slow the Medium nation ramp to one Medium nation per five levels.

This document is findings only. It does not implement or recommend a specific tuning choice.

## Source Files Checked

- `src/client/Main.ts`
- `src/client/LocalServer.ts`
- `src/client/SinglePlayMissionStorage.ts`
- `src/core/game/SinglePlayMissions.ts`
- `src/core/game/MapNationCounts.json`
- `src/core/game/MapPlayers.ts`
- `src/core/configuration/DefaultConfig.ts`
- `src/core/Schemas.ts`
- `src/core/GameRunner.ts`
- `src/core/execution/BotExecution.ts`
- `src/core/execution/FakeHumanExecution.ts`
- `src/core/execution/utils/BotBehavior.ts`
- `src/client/graphics/layers/WinModal.ts`
- `src/client/flashist/FlashistFacade.ts`
- `resources/maps/*/manifest.json`
- `ai-agents/tasks/backlog/s4-missions-difficulty-investigation.md`
- `ai-agents/tasks/done/s4-solo-win-condition-fix.md`

## Mission Structure

Missions are numbered sequentially by `geoconflict.sp.nextMissionLevel` in localStorage. `getNextMissionLevel()` defaults to mission 1 when the value is missing, invalid, or below 1. On win, `WinModal.handleMissionProgress()` advances the stored next level to at least the completed level plus one.

There is no fixed count of missions in source. Levels are effectively unbounded because map selection wraps through the available maps:

```ts
const index = (level - 1) % sorted.length;
```

There are currently 32 maps in `GameMapType`, but one map (`Baikal (Nuke Wars)`) has zero nation slots and is excluded from missions. The first playable map cycle is therefore missions 1-31, then mission 32 returns to the first map with a higher level number and therefore harder nation difficulty counts.

Map order is deterministic:

1. Generate `MapNationCounts.json` from `resources/maps/*/manifest.json` at build/test time.
2. Exclude maps where `mapNationCount(map) <= 0`.
3. Sort remaining maps by `mapNationCount(map)`.
4. Break ties by the display string.
5. Pick `(level - 1) % mapCount`.

Each mission starts from the shared config in `Main.startSinglePlayMission()`:

| Parameter | Current mission value |
|---|---:|
| `gameType` | `Singleplayer` |
| `gameMode` | `FFA` |
| `gameMap` | `World`, then overwritten by `LocalServer` |
| `gameMapSize` | `Normal` |
| `difficulty` | `Medium` default nation difficulty fallback |
| `bots` | `400` |
| `disableNPCs` | `false` |
| `playerTeams` | `2` |
| `infiniteGold` | `false` |
| `infiniteTroops` | `false` |
| `instantBuild` | `false` |
| `maxTimerValue` | unset |

`LocalServer` overwrites mission fields after the join config is created:

- `gameMap` becomes the selected mission map.
- `disableNPCs` is forced to `false`.
- `nationDifficulties` is generated from level and nation count.
- `singlePlayMission.seed` is set from map and level.

There is no formal mission `difficulty` property. Difficulty is emergent from shared config, selected map, nation count, generated nation difficulties, map land area, and the global win threshold.

## Difficulty Formula

`computeTierCounts(level, nationCount)` currently uses:

| Tier | Count formula |
|---|---:|
| Impossible | `min(nationCount, floor(level / 50))` |
| Hard | `min(remaining, floor(level / 10))` |
| Medium | `min(remaining, floor(level / 5))` |
| Easy | remaining nations |

`assignNationDifficulties()` randomly assigns those tier counts to nation indices using a deterministic seed derived from map and level.

The global nation AI behavior changes materially by difficulty:

- Easy and Medium discourage attacks on human players who are not traitors.
- Hard and Impossible do not apply that protection.
- Generic bots do not have a public per-mission difficulty setting; their behavior uses randomized attack cadence and troop ratios.
- Product read: generic bots are not considered a meaningful mission difficulty driver after tutorial completion. They are passive enough that competent players mostly use them as food for growth; the difficulty pressure comes from nations, nation difficulty, map shape/scale, and win/loss conditions.

## Current Mission Parameters: First Map Cycle

Shared values for every row below: 400 generic bots, FFA, Normal map size, no time limit, nations enabled, 80% territory win threshold.

| Mission | Map | Land tiles | Nations | Easy | Medium | Hard | Impossible |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | Achiran | 1,149,943 | 4 | 4 | 0 | 0 | 0 |
| 2 | Faroe Islands | 424,994 | 6 | 6 | 0 | 0 | 0 |
| 3 | Mars | 1,354,047 | 6 | 6 | 0 | 0 | 0 |
| 4 | Yenisei | 3,371,389 | 6 | 6 | 0 | 0 | 0 |
| 5 | Australia | 1,319,763 | 7 | 6 | 1 | 0 | 0 |
| 6 | Strait of Gibraltar | 1,941,359 | 7 | 6 | 1 | 0 | 0 |
| 7 | Halkidiki | 1,729,369 | 8 | 7 | 1 | 0 | 0 |
| 8 | Iceland | 1,098,655 | 8 | 7 | 1 | 0 | 0 |
| 9 | Black Sea | 1,153,632 | 9 | 8 | 1 | 0 | 0 |
| 10 | Deglaciated Antarctica | 1,079,790 | 9 | 6 | 2 | 1 | 0 |
| 11 | Baikal | 2,181,746 | 11 | 8 | 2 | 1 | 0 |
| 12 | Falkland Islands | 859,274 | 12 | 9 | 2 | 1 | 0 |
| 13 | Italia | 780,495 | 12 | 9 | 2 | 1 | 0 |
| 14 | Japan | 488,183 | 12 | 9 | 2 | 1 | 0 |
| 15 | Montreal | 1,954,940 | 12 | 8 | 3 | 1 | 0 |
| 16 | Between Two Seas | 1,478,803 | 15 | 11 | 3 | 1 | 0 |
| 17 | Pluto | 1,987,279 | 16 | 12 | 3 | 1 | 0 |
| 18 | East Asia | 879,264 | 22 | 18 | 3 | 1 | 0 |
| 19 | Britannia | 933,860 | 23 | 19 | 3 | 1 | 0 |
| 20 | South America | 1,411,064 | 24 | 18 | 4 | 2 | 0 |
| 21 | Asia | 1,079,855 | 25 | 19 | 4 | 2 | 0 |
| 22 | Pangaea | 420,336 | 29 | 23 | 4 | 2 | 0 |
| 23 | Gateway to the Atlantic | 2,239,818 | 30 | 24 | 4 | 2 | 0 |
| 24 | Europe Classic | 1,008,469 | 31 | 25 | 4 | 2 | 0 |
| 25 | Oceania | 194,648 | 32 | 25 | 5 | 2 | 0 |
| 26 | Mena | 1,621,317 | 35 | 28 | 5 | 2 | 0 |
| 27 | Africa | 2,183,186 | 36 | 29 | 5 | 2 | 0 |
| 28 | Europe | 2,311,229 | 49 | 42 | 5 | 2 | 0 |
| 29 | North America | 1,243,623 | 49 | 42 | 5 | 2 | 0 |
| 30 | World | 651,609 | 61 | 52 | 6 | 3 | 0 |
| 31 | Giant World Map | 2,333,974 | 97 | 88 | 6 | 3 | 0 |

Representative later levels:

| Mission | Map | Nations | Easy | Medium | Hard | Impossible |
|---:|---|---:|---:|---:|---:|---:|
| 32 | Achiran | 4 | 0 | 1 | 3 | 0 |
| 33 | Faroe Islands | 6 | 0 | 3 | 3 | 0 |
| 50 | Britannia | 23 | 7 | 10 | 5 | 1 |
| 62 | Giant World Map | 97 | 78 | 12 | 6 | 1 |
| 100 | Halkidiki | 8 | 0 | 0 | 6 | 2 |

## Available Tuning Levers

| Lever | Current value/path | Can tune per mission now? | Notes |
|---|---|---|---|
| Generic bot count | `bots: 400` in `Main.startSinglePlayMission()` | No, global mission edit only | Schema allows 0-400. Per-mission counts require code/config schema changes. |
| Generic bot behavior | `BotExecution` randomized attack cadence and ratios | No | No mission-specific aggression setting exists for generic bots. |
| Nation enabled/disabled | `disableNPCs = false` in `LocalServer` for missions | No, global mission edit only | Could be made level-aware in code. |
| Nation difficulty mix | `computeTierCounts(level, nationCount)` | Yes, but only by code formula | No data file. Ranges constrained by nation count. |
| Specific nation difficulty assignment | deterministic shuffle by seed | No direct config | Could be made explicit per mission or weighted by nation strength, but needs code/data design. |
| Map order | `selectMissionMap()` excludes zero-nation maps, then sorts by prebuilt nation count and name | Yes, but code/generated data only | No authored mission list. |
| Map size | `GameMapSize.Normal` | No, global mission edit only | Tutorial uses Compact, missions use Normal. |
| Player starting resources | default game economy | No | No mission-specific player head start found. |
| Player starting location | player chooses/auto-spawns normally | No | No mission-specific spawn location found. |
| Nation starting territory | map manifest nation spawn coordinates and strength | No practical per-mission lever | Requires map data edits or separate spawn/strength override logic. |
| Win threshold | `DefaultConfig.percentageTilesOwnedToWin()` returns 80 for FFA | No | Global FFA threshold, not mission-specific. |
| Time limit | unset in mission config | No, but supported by `maxTimerValue` schema | Could be added per mission with code/config; not currently used. |
| Disabled units | empty array | No, global mission edit only | Per-mission unit restrictions would need generated/authored mission config. |

## Analytics Signal

Source instrumentation provides only coarse mission signals:

- `UI:ClickMission` fires when the mission button is clicked.
- `Game:Start` fires at game start with the number of human players as value.
- `Game:Win` and `Game:Loss` fire at match end.
- `Match:Loss:OpponentWon` fires for solo loss when an opponent reaches the win threshold.

No mission level, mission map, seed, or difficulty tier mix is attached to those events. GameAnalytics Design Events in this code path use only one optional numeric value, and existing mission events do not pass the mission level. I do not have live GameAnalytics dashboard access from the repo, but the source does not currently expose enough per-mission event data to compute mission-specific fail or abandon rates.

Analytics gap: add mission-level instrumentation if tuning decisions need production evidence. Candidate events could track mission start, win, loss, opponent-win loss, and abandon with mission level as the numeric value, plus a naming/dimension strategy for map if GameAnalytics constraints allow it.

## Tutorial Comparison

Tutorial and missions share the local singleplayer runtime, but their configuration paths diverge before the match starts.

| Parameter | Tutorial | Missions |
|---|---|---|
| Entry point | `Main.startTutorial()` | `Main.startSinglePlayMission()` |
| Bot count | 100 | 400 |
| Map size | Compact | Normal |
| Map | Iceland | Generated by mission level |
| Nations | Disabled by `LocalServer` | Enabled by `LocalServer` |
| Nation difficulties | all Easy, but irrelevant because nations disabled | generated by level |
| Tutorial UI | `isTutorial: true`, `TutorialLayer` active | none |
| Mission progress | tutorial completion localStorage | next mission level localStorage |

Tutorial-style tuning does not apply as a simple config copy because tutorial is explicitly special-cased before mission generation. However, the same kinds of levers exist in adjacent code: bot count can be changed in the start config, and nation participation can be changed in `LocalServer`.

## Candidate Tuning Options

These are implementation options for Mark and the technical specialist to evaluate. This findings task does not choose one.

| Option | Concrete change | Effort | Tradeoff |
|---|---|---:|---|
| Reduce mission bot count globally | Change `bots: 400` in `startSinglePlayMission()` to a lower value. | Low | Technically small, but likely the wrong lever unless playtests show very early players are overwhelmed before understanding expansion. Bots mostly serve as growth food after tutorial completion. |
| Slow the nation difficulty ramp | Change `computeTierCounts()` divisors, for example Medium starting slower than every level and Hard later than level 10. | Low-Medium | Keeps generated mission structure, but requires playtesting because later missions shift too. |
| Add early-mission safety rules | In `LocalServer`, special-case early levels to reduce or disable nations and/or keep all nations Easy. | Medium | Directly targets first-session difficulty, but adds more generated-mission rules. |
| Introduce authored mission config | Add a mission config table/schema for at least the first N missions with map, bots, nation policy, and optional win/time settings. | Medium-High | Gives best tuning control, but is a larger data/model change and needs tests plus analytics naming decisions. |

## Validation Performed

- Read wiki context before implementation planning.
- Traced mission entry, mission generation, win/loss, and analytics paths in source.
- Generated the first mission-cycle table from current `GameMapType`, `MapPlayers`, and map manifests.
- Follow-up implementation added `scripts/generate-map-nation-counts.js`, `src/core/game/MapNationCounts.json`, nation-count-based mission sorting, zero-nation map exclusion, and the slower `floor(level / 5)` Medium nation ramp.

No game tuning or runtime code changes were made.
