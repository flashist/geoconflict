# AI Player Lobby Slot Bug — AI Players Must Yield to Real Players

**Source**: `ai-agents/tasks/done/s4-ai-lobby-slot-bug.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Prevent public lobbies from getting stuck in a mixed real-plus-AI 10/10 state where humans cannot join but the match also does not start.

## Key Changes

- `src/server/GameServer.ts` now removes one AI player immediately after a new real client is accepted if a public lobby has reached capacity and human-priority mode is enabled.
- The same server keeps the lobby in `GamePhase.Lobby` while AI placeholders remain: a public game only auto-starts early when `activeClients === maxPlayers` and `aiPlayers.length === 0`; otherwise timeout-based start still applies.
- `tickAiLobby()` continues trimming active and pending AI joins against `minHumanSlots`, so the periodic AI fill logic does not immediately recreate the stuck full-lobby state after a human join.

## Outcome

Real players displace AI placeholders instead of being locked out by them. Public lobbies still fill with AI to look healthy, but mixed lobbies preserve at least one human-joinable slot until the last AI has been replaced or the timer expires.

## Related

- [[features/ai-players]] — AI Players feature and human-priority lobby rules
- [[decisions/sprint-4]] — sprint that scheduled this lobby fix
