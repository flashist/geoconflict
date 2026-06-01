# Match Logging

**Layer**: server
**Key files**: `src/server/GameServer.ts`, `src/server/Archive.ts`, `src/server/Logger.ts`, `src/server/Master.ts`

## Summary

What is recorded per match, where it goes, and what cannot be retrieved. Investigated 2026-04-07.

Source: `ai-agents/knowledge-base/server-match-logging-state.md`

## Architecture

### Match ID
8-character Base57 string generated in `Master.ts` via `generateID()` (`src/core/Util.ts`). Same ID used on client and server — passed in `GameStartInfo` → stored as `lobbyConfig.gameID`.

### Where Logs Go
- **stdout** — Winston JSON logger (`src/server/Logger.ts`), always active
- **OTEL/Uptrace** — active only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (prod only)
- **Archive endpoint** — inherited full-game-record POST to `config.jwtIssuer()/game/{gameID}` at match end. Sprint 4c found this route is broken in production, so `archiveEnabled()` is currently `false` and archive writes no-op until S3-backed, citizen-gated archival exists.
- No local database or file writes

### What Is Logged (stdout/OTEL)

| Event | File:line | Data |
|---|---|---|
| Client (re)joins | `GameServer.ts:177` | `clientID, persistentID, clientIP, isRejoin` |
| Game start sent | `GameServer.ts:471` | `clientID, persistentID` |
| Game ends | `GameServer.ts:774` | `turns.length` in message; `gameID` from logger context |
| Game archived | `GameServer.ts:969` | `gameID, winner` (tuple: `["player", clientID]`, `["team", teamName]`, or `["opponent", opponentName]` for solo clientless winners) |
| Client disconnects | `GameServer.ts:370` | `clientID, persistentID` |
| Max duration exceeded | `GameServer.ts:834` | `gameID` |
| Winner vote received | `GameServer.ts:1128` | winner vote and ratio in message; `clientID` as structured field |
| Winner determined | `GameServer.ts:1141` | winner ratio in message; `winnerKey` as structured field |

### What Would Be Archived
Full `GameEndInfo`: map config, game mode, player list with stats, start/end timestamps, duration, turn count, winner. The current inherited external endpoint is not a reliable retrieval source in production.

## What Is NOT Recorded

- **Player intents/action sequence** — stored in turns and sent to archive, but NOT emitted to logs
- **Tick-by-tick game state** — not stored anywhere
- **Win condition evaluations** — only final result logged
- **Ghost player counts** — no aggregated count (only raw `mark_disconnected` intents in turns)
- **Match start timestamp in logs** — only the archive record has it

## Retrieving Match Data

Given a game ID, you can look up:
- **In Uptrace logs:** join events, game end, winner, turn count (recent matches only)
- **In archive storage:** no reliable production lookup exists until S3-backed archival is implemented

You **cannot** look up: player intent sequence, ghost player counts, intermediate game state.

For active/in-memory games: `GET /api/game/:id` (`Worker.ts:226`) — only works while game is in RAM.

## Gotchas / Known Issues

- Structured fields passed as second argument to `log.info()` (e.g. `{ clientID, persistentID }`) may not appear as attributes in Uptrace — only the message string is guaranteed. See [[systems/telemetry]].
- File-line references in the log events table were re-verified against `src/server/GameServer.ts` on 2026-04-30; the active-game lookup reference was re-verified against `src/server/Worker.ts` on 2026-04-30.
- Sprint 4c archive investigation found production `Not Found` errors because the geoconflict server does not currently expose the inherited `/game/:gameID` route used by `Archive.ts`; singleplayer archive uploads also hit body-size and browser `keepalive` limits. The accepted and implemented short-term path is to no-op archive writes through `archiveEnabled()`, then defer S3-backed citizen archival until match history has a consumer. See [[tasks/archive-endpoint-failures]] and [[decisions/archive-archival-strategy]].
- 140 returning users reported `null` build version (as of 2026-04-09) — likely sessions before `configureBuild()` was wired, unrelated to logging

## Related

- [[systems/game-overview]] — overall project context
- [[systems/telemetry]] — OTEL/Uptrace infrastructure this logging flows into
- [[systems/server-performance]] — performance context for `endTurn()` / turn logging
- [[tasks/solo-win-condition-fix]] — solo opponent winners can be archived as explicit opponent winners
- [[tasks/archive-endpoint-failures]] — Sprint 4c archive telemetry cleanup
- [[decisions/archive-archival-strategy]] — deferred S3-backed citizen archival decision
