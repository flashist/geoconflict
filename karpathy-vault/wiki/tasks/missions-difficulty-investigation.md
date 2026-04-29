# Missions Difficulty Investigation

**Source**: `ai-agents/knowledge-base/s4-missions-difficulty-findings.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Understand why missions mode feels too difficult before making any tuning changes. The investigation maps how missions are generated, which parameters affect difficulty, which levers are currently editable, what analytics exists, and how missions compare with the recently simplified tutorial path.

## Key Changes

No runtime code or tuning was changed. The investigation traced the mission entrypoint in `src/client/Main.ts`, mission generation in `src/client/LocalServer.ts`, level/map/difficulty helpers in `src/core/game/SinglePlayMissions.ts`, map capacity data in `src/core/game/MapPlayers.ts`, win threshold logic in `src/core/configuration/DefaultConfig.ts`, bot/nation behavior in `src/core/execution/`, and mission-related analytics in `src/client/flashist/FlashistFacade.ts`.

The main finding is that missions are not a finite authored list. They are an unbounded generated sequence stored in `geoconflict.sp.nextMissionLevel`. Originally, the first 32 missions cycled through all maps sorted by `mapMaxPlayers()` and map name. Follow-up implementations now prebuild map nation counts from map manifests into `src/core/game/MapNationCounts.json`, exclude zero-nation maps from the mission rotation, sort remaining mission maps by nation count and map name, and slow the Medium nation ramp.

Every mission currently starts with the same shared config: Singleplayer FFA, Normal map size, 400 generic bots, nations enabled, no time limit, default Medium nation difficulty fallback, and the global FFA 80% territory win threshold. `LocalServer` then overwrites the map, forces nations on, generates `nationDifficulties`, and records a deterministic mission seed.

Difficulty is emergent rather than a formal per-mission property. It comes from selected map and land area, nation count, generated nation difficulty counts, global win threshold, and normal singleplayer economy/spawn rules. Generic bots are not considered a meaningful mission difficulty driver after tutorial completion; they are passive enough that competent players mostly use them as food for growth.

The nation difficulty formula is:

| Tier | Formula |
|---|---:|
| Impossible | `min(nationCount, floor(level / 50))` |
| Hard | `min(remaining, floor(level / 10))` |
| Medium | `min(remaining, floor(level / 5))` |
| Easy | remaining nations |

Medium nations now begin at mission 5 and increase every five levels. Hard nations still begin at mission 10, and Impossible nations begin at mission 50.

Current analytics is too coarse for mission-level drop-off analysis. `UI:ClickMission`, `Game:Win`, `Game:Loss`, and `Match:Loss:OpponentWon` exist, but mission level, map, seed, and generated difficulty mix are not attached. Live GameAnalytics dashboard access was not available from the repo, and source instrumentation does not expose enough per-mission detail to compute fail or abandon rates.

## Outcome

The findings document provides the full first-cycle mission table and identifies available tuning levers:

- Global mission bot count can be changed with a small config edit, but bots are not the main difficulty lever; after tutorial completion they mostly act as growth food rather than pressure.
- Nation difficulty ramp can be changed in `computeTierCounts()`, but it is a code formula rather than data.
- Nation enablement can be changed globally or with new level-aware logic in `LocalServer`.
- Map order is code-derived from prebuilt map nation counts, excludes zero-nation maps, and is not authored.
- Win threshold is a global FFA value, not mission-specific.
- Time limits are schema-supported but currently unused by missions.
- Player starting resources, spawn location, and nation starting territory are not current per-mission levers.

Tutorial-style tuning does not directly apply to missions because tutorial is special-cased: it uses 100 bots, Compact map size, Iceland, `isTutorial: true`, and `disableNPCs = true`. Missions use a separate start path with 400 bots, Normal map size, generated maps, and nations enabled.

The findings menu for later decision-making listed four candidate implementation directions without choosing one: reduce mission bot count globally, slow the nation difficulty ramp, add early-mission safety rules, or introduce authored mission config for the first N missions. Follow-ups have now implemented two of those narrower levers: replacing `mapMaxPlayers()` ordering with generated nation-count ordering while excluding maps without nation slots, and slowing the Medium nation ramp from every level to every five levels.

## Related

- [[features/tutorial]] — tutorial comparison and recent bot/nation simplification
- [[systems/analytics]] — GameAnalytics event conventions and current mission analytics gap
- [[decisions/sprint-4]] — sprint context for tutorial follow-ups and active player complaints
