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
- **Archive endpoint** — full game records POSTed to external server (`config.jwtIssuer()/game/{gameID}`) at match end — this is the **authoritative historical store**
- No local database or file writes

### What Is Logged (stdout/OTEL)

| Event | File:line | Data |
|---|---|---|
| Client (re)joins | `GameServer.ts:172` | `gameID, clientID, persistentID` |
| Game start sent | `GameServer.ts:466` | `clientID, persistentID` |
| Game ends | `GameServer.ts:717` | `gameID, turns.length` |
| Game archived | `GameServer.ts:911` | `gameID, winner` (tuple: `["player", clientID]`, `["team", teamName]`, or `["opponent", opponentName]` for clientless winners) |
| Client disconnects | `GameServer.ts:365` | `clientID, persistentID` |
| Max duration exceeded | `GameServer.ts:777` | `gameID` |
| Winner determined | `GameServer.ts:1083` | `gameID`, winner, vote counts |

### What Is Archived (external endpoint)
Full `GameEndInfo`: map config, game mode, player list with stats, start/end timestamps, duration, turn count, winner.

## What Is NOT Recorded

- **Player intents/action sequence** — stored in turns and sent to archive, but NOT emitted to logs
- **Tick-by-tick game state** — not stored anywhere
- **Win condition evaluations** — only final result logged
- **Ghost player counts** — no aggregated count (only raw `mark_disconnected` intents in turns)
- **Match start timestamp in logs** — only the archive record has it

## Retrieving Match Data

Given a game ID, you can look up:
- **In Uptrace logs:** join events, game end, winner, turn count (recent matches only)
- **In external archive** (`/game/{gameID}`): full record — map, mode, players, stats, duration, winner

You **cannot** look up: player intent sequence, ghost player counts, intermediate game state.

For active/in-memory games: `GET /api/game/:id` (`Worker.ts:224`) — only works while game is in RAM.

## Gotchas / Known Issues

- Structured fields passed as second argument to `log.info()` (e.g. `{ clientID, persistentID }`) may not appear as attributes in Uptrace — only the message string is guaranteed. See [[systems/telemetry]].

> **LINT WARNING:** Line numbers in the log events table (e.g. `GameServer.ts:172`) were verified against the 2026-04-07 snapshot. They may have drifted. Re-verify with `grep` if using for code navigation.
- 140 returning users reported `null` build version (as of 2026-04-09) — likely sessions before `configureBuild()` was wired, unrelated to logging

## Related

- [[systems/game-overview]] — overall project context
- [[systems/telemetry]] — OTEL/Uptrace infrastructure this logging flows into
- [[systems/server-performance]] — performance context for `endTurn()` / turn logging
