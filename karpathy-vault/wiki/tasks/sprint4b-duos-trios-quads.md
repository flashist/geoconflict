# Re-enable Duos/Trios/Quads Modes

**Source**: `ai-agents/tasks/done/sprint4b-duos-trios-quads.md`
**Status**: done
**Sprint/Tag**: Sprint 4b

## Goal

Re-enable Duos, Trios, and Quads as public matchmaking team-size modes after the Sprint 4b mini-mode investigation confirmed AI Players can fill these lobbies through the normal public match flow.

## Key Changes

Restored the string team-size constants in `src/core/game/Game.ts` and allowed them through `src/core/Schemas.ts` as valid `TeamCountConfig` values.

Restored the runtime team derivation in `src/core/game/GameImpl.ts`:

| Mode | Derived teams |
|---|---:|
| Duos | `Math.ceil(players / 2)` |
| Trios | `Math.ceil(players / 3)` |
| Quads | `Math.ceil(players / 4)` |

Restored capacity rounding in `src/core/configuration/DefaultConfig.ts` so generated lobby capacities remain divisible by the intended team size.

Added Duos, Trios, and Quads to public server rotation in `src/server/MapPlaylist.ts` while keeping `REGULAR_TEAM_COUNTS` unchanged as `[2, 3, 4]`.

Follow-up: exposed the same modes in `src/client/SinglePlayerModal.ts` and `src/client/HostLobbyModal.ts` for manual singleplayer and private lobby testing. This follow-up intentionally did not add a start guard, change `disableNPCs`, force Nations on, or alter core team assignment.

Added test coverage in `tests/server/MapPlaylist.test.ts` and `tests/core/game/GameImpl.test.ts` for public rotation, AI-filled team-size derivation, and the known too-few-participants guardrail.

## Outcome

Public matchmaking can now generate Duos, Trios, and Quads lobbies alongside regular 2/3/4-team matches and Humans vs Nations. Singleplayer and private lobby creators can also select these modes manually. AI Players are compatible in public lobbies because `GameRunner` passes them into `createGame()` as `PlayerType.AiPlayer` entries and `GameImpl.addPlayers()` assigns them through the same team balancing path as human players.

Known limitation: Duos with 1 participant, Trios with 1-2 participants, and Quads with 1-3 participants still throw `Too few teams: 1`. This is acceptable for public matchmaking with AI fill; singleplayer and private lobby exposure is currently for manual testing and may need a later start guard.

## Related

- [[decisions/sprint-4b]]
- [[features/ai-players]]
- [[tasks/sprint4b-mini-mode-investigation]]
- [[tasks/teams-mode-max-teams]]
