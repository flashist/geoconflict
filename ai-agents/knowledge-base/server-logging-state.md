# Server-Side Match Logging — Current State

*Investigated 2026-04-07. Based on codebase at this date.*

---

## 1. What is recorded per match?

**Match ID**
- 8-character Base57 string, generated in `src/server/Master.ts` via `generateID()` (`src/core/Util.ts:249`)
- No explicit "match created" log line. Appears implicitly in join, start, end, and archive log events.

**What is logged to stdout/OTEL during a match:**

| Event | File:line | Data |
|---|---|---|
| Client (re)joins | GameServer.ts:172 | `gameID, clientID, persistentID` |
| Game start sent | GameServer.ts:466 | `clientID, persistentID` |
| Game ends | GameServer.ts:717 | `gameID, turns.length` |
| Game archived | GameServer.ts:911 | `gameID, winner` (tuple: `["player", clientID]` or `["team", teamName]`) |
| Client disconnects | GameServer.ts:365 | `clientID, persistentID` |
| Max duration exceeded | GameServer.ts:777 | `gameID` |
| Winner determined | GameServer.ts:1083 | `gameID`, winner, vote counts |

**What is written to the archive (external endpoint, not logs):**
Full `GameEndInfo` record: map config, game mode, player list with stats, match start/end timestamps, duration, turn count, winner. Sent via POST to `${config.jwtIssuer()}/game/${gameID}` (`src/server/Archive.ts:26`).

**Player eliminations / outcomes:** Captured in `allPlayersStats` per clientID (sent by clients at game end), included in the archive record. Not logged to stdout individually.

**Ghost players:** No dedicated tracking. Disconnections produce a `mark_disconnected` intent in the turn log, but no aggregated ghost count is computed or logged.

---

## 2. Where does logging go?

- **stdout** — Winston JSON logger, always active (`src/server/Logger.ts:52`)
- **OTEL/Uptrace** — `OpenTelemetryTransportV3` transport, active only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. In prod, all logs flow to Uptrace at `https://telemetry.geoconflict.ru`.
- **No local database or file writes** in this codebase.
- **Archive endpoint** — full game records POSTed to an external server (`config.jwtIssuer()`). This is the authoritative historical store. Retention policy unknown — managed by the external service.

**Retrieving match data:**
- Active/in-memory games: `GET /api/game/:id` (`Worker.ts:224`) — only works while the game is in RAM.
- Completed games: query the external archive via `/game/{gameID}`.

---

## 3. What is NOT recorded?

- **Player intents/action sequence** — stored in turns and sent to the archive, but NOT emitted to logs. Not queryable from Uptrace.
- **Tick-by-tick game state** — not stored anywhere.
- **Win condition evaluations** — only the final result is logged/archived.
- **Ghost player counts** — no aggregated count. Disconnection intents are in turns but not surfaced separately.
- **Match start timestamp in logs** — no explicit log line with `start` time; only the archive record has it.

---

## 4. Observability coverage

Sentry has been replaced by Uptrace (OTEL). Server logs flow to Uptrace when the endpoint is configured. No custom per-match spans or breadcrumbs are emitted — only the Winston log lines listed above. Error tracking covers unhandled exceptions via the OTEL transport.

---

## 5. External match identification

The game ID is the same on client and server. It is passed to the client in `GameStartInfo` (`Schemas.ts:448`) and stored as `lobbyConfig.gameID`. When a player submits feedback with a match ID attached:

**What you can look up today given a match ID:**
- In **Uptrace logs**: join events, game end, winner, turn count — available for recent matches
- In the **external archive** (`/game/{gameID}`): full game record — map, mode, players, stats, duration, winner

**What you cannot look up:** The sequence of player actions (intents), ghost player counts, or any intermediate game state.

---

## Conclusion

Attaching match IDs to feedback is useful today — the archive endpoint gives full match context (who played, what map/mode, who won, player stats). For deeper debugging (what sequence of actions led to a bug), intent log retrieval from the archive would be needed, which is a separate infrastructure decision.
