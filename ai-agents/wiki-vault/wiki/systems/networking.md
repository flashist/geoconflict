# Networking

**Layer**: shared
**Key files**: `src/client/Transport.ts`, `src/server/Worker.ts`, `src/server/GameServer.ts`, `src/core/Schemas.ts`, `src/core/WorkerSchemas.ts`

## Summary

Geoconflict networking is a worker-routed WebSocket plus HTTP system. Clients connect to the correct backend worker for a game, validate all runtime messages through Zod schemas, and exchange a small set of typed messages: join, ping, intent, turn, start, desync, and error.

## Architecture

### Worker routing
- `ServerConfig.workerPath(gameID)` maps a game ID to a worker path such as `/wX`
- `src/server/Worker.ts` strips the `/wX` prefix, verifies that the request hit the correct worker, and hosts both HTTP endpoints and WebSocket connections for that shard
- `src/server/Master.ts` handles cross-worker coordination and top-level endpoints such as `/api/version` and worker scheduling

### Client transport
- `Transport` chooses local mode for singleplayer/replay and WebSocket mode for multiplayer
- In remote mode it opens `ws(s)://<host>/<workerPath>` and validates all inbound server payloads with `ServerMessageSchema`
- Outbound client messages are serialized from typed objects such as `ClientJoinMessage`, `ClientIntentMessage`, `ClientHashMessage`, and `ClientSendWinnerMessage`

### Server message flow
- `Worker.ts` accepts the initial socket and requires the first meaningful message to be `join`
- It validates that join with `ClientMessageSchema`, verifies token/auth, and hands the socket to `GameServer`
- `GameServer` then processes subsequent `intent`, `ping`, `hash`, and `winner` messages and sends `prestart`, `start`, `turn`, `desync`, and `error` responses

### HTTP side channels
- Lobby creation and updates use REST endpoints such as `/api/create_game/:id`, `/api/start_game/:id`, and `/api/game/:id`
- Presence/status checks use `/api/game/:id`, `/exists`, and `/active`
- Some UX and recovery flows deliberately use HTTP outside the main socket path, for example stale-build checks and reconnection validation

## Gotchas / Known Issues

- Schema validation is strict by design; malformed payloads are rejected and often closed with code `1002`
- `Transport` buffers only stringified outbound messages when the socket is closed; this is a lightweight reconnect aid, not a full reliable-delivery queue
- The worker-path contract is critical: wrong-worker requests are rejected instead of forwarded silently
- Singleplayer and replay use `LocalServer`, so not every transport code path implies a real socket
- `ClientJoinMessage.yandexPlayerId` is optional and nullable for backward compatibility. It is transported and retained for profile work but remains untrusted and unsigned; paid identity verification is a separate boundary. See [[tasks/yandex-identity-plumbing]].

## Related

- [[systems/game-overview]] — high-level architecture context
- [[systems/game-loop]] — what happens after turns arrive
- [[systems/execution-pipeline]] — how validated intents are turned into executions
- [[systems/configuration]] — worker path, port, public host, and API base URL selection
- [[tasks/yandex-identity-plumbing]] — Yandex unique ID carried through the join payload into the server-side client
- [[tasks/profile-match-end-crediting]] — winner-message participation payload and late identity refresh used for XP crediting
- [[systems/architecture-overview]] — worker sharding, the HTTP surface, and the three auth layers
- [[decisions/adr-102-privilege-refresher-fails-open]] — the fail-open entitlement checker each worker holds
