# Sprint 4b Mini Mode Investigation

**Source**: `ai-agents/tasks/done/sprint4b-mini-mode-investigation.md`, `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md`
**Status**: done
**Sprint/Tag**: Sprint 4b

## Goal

Investigate whether compact maps and Duos/Trios/Quads can safely ship together in public matchmaking before implementation begins. The investigation checks compact nation spawn coordinates, compact player density, public lobby AI-fill behavior, the real meaning of Duos/Trios/Quads, and the original low-player failure mode.

## Key Changes

No runtime code was changed. The investigation audited all 28 positive-frequency public maps from `src/server/MapPlaylist.ts` against `resources/maps/*/manifest.json` and `resources/maps/*/map4x.bin`. It applied the same compact coordinate transform used by `src/core/game/TerrainMapLoader.ts` and checked whether halved nation coordinates land on valid compact land tiles.

The compact coordinate audit found six public-rotation maps with at least one compact nation coordinate landing on water:

| Map | Water coordinates |
|---|---:|
| Asia | 1 |
| Black Sea | 1 |
| Europe | 1 |
| Mena | 1 |
| North America | 8 |
| Pangaea | 2 |

This is not a map-exclusion blocker. `FakeHumanExecution.randomSpawnLand()` searches around each nation spawn cell for nearby unowned land. Affected nations may therefore spawn shifted from their intended centers, or may fail to spawn if the local search does not find land. The expected impact is uneven or geographically less faithful nation distribution, not a crash.

The investigation also found that compact map land area is consistently about 24-25% of the normal map's land area, while `DefaultServerConfig.lobbyMaxPlayers()` does not receive `gameMapSize` and public `maxPlayers` remains unchanged. At full human fill, compact public matches therefore become roughly 4x denser than normal public matches. AI Players soften normal traffic because public AI fill targets about 10 visible participants, but that does not protect a genuinely full human lobby.

Generic bot placement is also constrained on small compact maps. With the current 400 bot target and `BotSpawner`'s 30-tile spacing rule, compact Pangaea, Japan, Faroe Islands, World, Italia, East Asia, Falkland Islands, and Britannia often place fewer than 400 bots before the retry limit. This is not a crash because `BotSpawner.spawnBots()` returns the bots it successfully placed.

Duos/Trios/Quads were confirmed to be team-size modes, not fixed team-count modes. The disabled upstream logic derives the number of teams from started participants:

| Mode | Derived team count |
|---|---|
| Duos | `Math.ceil(players / 2)` |
| Trios | `Math.ceil(players / 3)` |
| Quads | `Math.ceil(players / 4)` |

AI Players are compatible with these modes because `GameRunner` converts `gameStart.aiPlayers` into `PlayerInfo` entries with `PlayerType.AiPlayer`, passes them into `createGame()` with humans, and `GameImpl.addPlayers()` assigns them through `assignTeams()` like other non-nation players.

## Outcome

Compact public rotation can include the full current map list. Do not add a compact exclusion list solely for water-centered nation coordinates. Asia, Black Sea, Europe, Mena, North America, and Pangaea should instead be treated as maps where compact nation placement may be shifted or uneven. Deterministic land-snapping for compact nation coordinates remains an optional later fidelity improvement, not a Sprint 4b prerequisite.

Compact `maxPlayers` is a product/tuning risk. The investigation recommends either accepting compact maps as intentionally faster and denser after staging validation, or adding compact-specific caps that scale current map player counts down.

Duos/Trios/Quads can be re-enabled for public matchmaking with AI Players, but the original failure mode remains reachable if a string team-size mode starts with too few player-like participants:

- Duos fails with 1 participant.
- Trios fails with 1-2 participants.
- Quads fails with 1-3 participants.

Current production public AI fill should avoid that path by filling to about 10 participants before game start. Follow-up implementation should add tests for low participant counts and AI-filled string team-size modes. If these modes are exposed outside public matchmaking, add a start guard or equivalent fill path.

The public-lobby localization keys for Duos/Trios/Quads already exist in `resources/lang/en.json` and `resources/lang/ru.json`; the implementation brief's localization step is already satisfied unless wording changes.

## Related

- [[decisions/sprint-4b]]
- [[features/ai-players]]
- [[tasks/sprint4b-duos-trios-quads]]
- [[tasks/teams-mode-max-teams]]
