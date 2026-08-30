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
- **Worker crash recovery never worked until 2026-08-27** (2026-08-22 outage finding): `Master.ts`'s exit handler read `worker.process.env.WORKER_ID`, which does not exist on a `ChildProcess`, so no crashed worker had ever been restarted since the fork's first commit — and the scheduling gate required all 20 workers ready, so one worker death at startup silently killed all public lobbies. Task `0055` made the empty lobbies body parseable and logged `code`/`signal`/id/pid on exit; task `0056` shipped the repair (see below).

  > 🔧 **CORRECTED 2026-08-30 — this bullet previously ended "All of it is on `dev` and agent-closed; none of it is confirmed deployed to production."** The outage track **is** now in production: `WorkerSupervisor.ts` landed in `dc90719`, an ancestor of release `362a2f9`, which is live. **And it was observed working**: on the release the quorum gate reached **18/20 ready workers and then 20/20 within 80 ms**, with **zero readiness-deadline and zero give-up markers** across the pass — i.e. the gate opened on quorum, not on its 90 s fallback deadline, and no worker exhausted its restart cap. Each task's own post-deploy checklist is still unrun, and all six tasks remain agent-closed and not owner-verified.

  See [[decisions/incident-2026-08-22-public-lobbies-outage]].
- **Master-side worker coordination now lives in `src/server/WorkerSupervisor.ts`** (task `0056`): a worker-index map populated at fork and at every restart, `markReady` / `markDead`, a restart cap of **5 per index per rolling 10 minutes** with backoff 1 s → 30 s then give up at `error` level, and a scheduling gate that opens at a quorum of `ceil(n × 9/10)` ready workers — **18 of 20 in prod, 2 of 2 in dev** — or a **90 s deadline**, whichever comes first, guarded so the lobby-fetch interval installs exactly once. See [[tasks/worker-crash-recovery-and-quorum-gate]].
- **The worker index is a fixed placement contract**: `workerIndex(gameID) = simpleHash(gameID) % numWorkers()`, computed independently by client, worker, nginx and master with **no game→worker registry anywhere**. To place a game on a particular worker you change the **ID**, never the index — see [[decisions/adr-109-worker-index-placement-contract]]. `schedulePublicGame` therefore rejection-samples the game ID onto a ready index (`pickGameID`, cap 1000 draws, unfiltered fallback with a warn so it can never stall) and bounds the create call at **5 s** via `AbortController` (task `0192`).
- **The 100 ms lobby poll is guarded against overlap** (`lobbyPollTick`, task `0193`): at most one `fetchLobbies` outstanding, so a late-aborting poll can never overwrite the published body with a stale empty list. The 5 s per-request abort still bounds duration; the guard bounds concurrency.
- **A `create_game` whose requester has already gone away is refused** (`requesterGone` / `awaitRequesterSettled`, task `0194`): a 10 ms bounded settle wait re-checks the request/response sockets, answers `503`, and skips creation — for public **and** private creates, after the existing 400/401 checks. This is what stops a recovered wedged worker from creating games the master already dropped.
- **A wedged-but-alive worker is still eligible for placement.** `readyWorkers` tracks liveness, never responsiveness — Node's cluster primary owns the listening socket and keeps accepting connections for a stopped worker. The 5 s create timeout bounds the cost; it does not remove it. A responsiveness signal is an open future item.
- **The worker's rate limiter counts the master as one IP** — 20 req/s per IP applies to every route including `create_game` and `/api/game/:id` from loopback. Normal cadence is ~10 req/s per lobby, so a burst can 429 the master. Known, not fixed; whether the limiter should exempt loopback or the admin header is an open question for the owner.
- **Private lobbies bypass all of the above.** The host picks the game ID client-side and POSTs `create_game` straight to `/w<N>/`, so a dead or wedged index costs the host one failed click and a retry. Accepted as-is by the owner 2026-08-26 — no master-only fix reaches it without publishing worker health to the client.
- 🔧 **Two of the private-lobby HTTP calls never reached the worker on Yandex Games** (task `0198`, measured 2026-08-28). **Fix deployed 2026-08-29 in release `362a2f9`** — the shipped code uses bare root-absolute `` `/${config.workerPath(id)}/api/…` `` paths at all three sites. ⚠️ **The production proof is unreachable, not merely unrun**: the private-lobby buttons are inside a `display: none` row on the Yandex template, so the symptom cannot be reproduced there. What follows is the mechanism, kept because the *rule* is the durable part. `HostLobbyModal`'s `putGameConfig()` (PUT `/api/game/:id`) and `startGame()` (POST `/api/start_game/:id`) built their URLs by concatenating onto `FlashistFacade.windowOrigin`, which carries the document pathname. On the production Yandex entry point the path becomes `/yandex-games_iframe.html/w1/api/…`, never matches nginx's `^/w(\d+)`, and falls through to `app.get("*")` → **404**. Neither call checks `response.ok`, so nothing surfaces: the lobby is created, the player list keeps refreshing, the modal closes, and the game never starts — with the host's map/difficulty/bots/mode silently lost too. `pollPlayers()` and `createLobby()` use bare root-absolute paths and are unaffected, which is exactly why the lobby *looks* healthy. See [[decisions/windoworigin-url-join-defect]].
- ⚠️ **The lobby-poll payload `GET /api/game/:id` is unauthenticated and now carries `isCitizen`** (task `0068`). Accepted **only while that flag stays purely cosmetic, and void the moment anything of value is gated on it.** See [[tasks/citizen-verified-icon]].

## Related

- [[systems/game-overview]] — high-level architecture context
- [[systems/game-loop]] — what happens after turns arrive
- [[systems/execution-pipeline]] — how validated intents are turned into executions
- [[systems/configuration]] — worker path, port, public host, and API base URL selection
- [[tasks/yandex-identity-plumbing]] — Yandex unique ID carried through the join payload into the server-side client
- [[tasks/profile-match-end-crediting]] — winner-message participation payload and late identity refresh used for XP crediting
- [[systems/architecture-overview]] — worker sharding, the HTTP surface, and the three auth layers
- [[decisions/adr-102-privilege-refresher-fails-open]] — the fail-open entitlement checker each worker holds
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the outage that exposed the dead crash-recovery path and the all-20 scheduling gate
- [[tasks/master-lobbies-worker-exit-diagnostics]] — task 0055's parseable lobbies body and worker-exit logging in `Master.ts`
- [[decisions/adr-109-worker-index-placement-contract]] — why the index is fixed and the game ID moves instead
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task 0056's `WorkerSupervisor`, restart cap, and quorum-or-deadline gate
- [[tasks/schedule-public-games-onto-ready-workers]] — task 0192's `pickGameID` rejection sampling and bounded create call
- [[tasks/fetchlobbies-in-flight-guard]] — task 0193's single-poll-in-flight guard on the 100 ms lobby tick
- [[tasks/worker-reject-departed-requester-create]] — task 0194's departed-requester guard on the `create_game` route
- [[tasks/worker-routing-dead-worker-investigation]] — task 0057, the investigation behind all four
- [[decisions/windoworigin-url-join-defect]] — task 0198's URL-join defect that makes two private-lobby routes 404 in production
- [[decisions/yandex-invite-portal-boundary]] — task 0199's open question about which host the private-lobby invite should point at
- [[tasks/citizen-verified-icon]] — task 0068's `isCitizen` flag on the frozen roster and the lobby-poll payload
