# Geoconflict — Architecture

> **Status: initiation survey.** This is a first evidence-first pass over the codebase written during
> project initiation by the fkit-architect. It is deliberately broad rather than deep. Deepen any
> section later with `/fkit-inspect`.
>
> **Method.** Every claim below is grounded in a `path:line` reference or an observed command result.
> Nothing here is inferred from the older docs — where an existing document disagreed with the code,
> the code won and the disagreement is recorded in [§12 Documented-but-stale](#12-documented-but-stale).
> Unresolved items are in [§13 Open questions](#13-open-questions), not guessed at.
>
> **No secrets.** Only environment-variable *names* and public hostnames appear here.
>
> Survey date: 2026-08-08. Repo state: branch `dev`, `c8a2041`.

---

## 1. What this is

Geoconflict is a real-time territorial-strategy browser game — a fork of
[OpenFront.io](https://openfront.io/) adapted for the Russian market and shipped primarily through
**Yandex Games**. Players expand territory, build structures, form alliances, and fight over maps
derived from real-world geography. Sessions are short; matches are public (matchmade lobbies),
private (invite), or singleplayer/tutorial.

The fork's own divergences from upstream are marked in-source with the comment `// Flashist Adaptation`
— 79 occurrences across `src/`, plus 154 identifiers carrying a `flashist_` prefix. Treat both as
deliberate local customization, not drift.

Licensing: AGPL-3.0 with an attribution clause (`LICENSE`, `LICENSING.md`), assets CC BY-SA 4.0
(`LICENSE-ASSETS`), plus a small non-redistributable music set under `proprietary/`.

### Scale

| Area | TypeScript LOC |
|---|---|
| `src/client/` | 34,365 |
| `src/core/` | 20,915 |
| `src/server/` | 3,922 |
| `src/profile-server/` | 687 |
| `tests/` | 13,261 |

---

## 2. System context

```
                    ┌──────────────────────────────┐
                    │  Yandex Games platform       │
                    │  (SDK: auth, ads, flags,     │
                    │   leaderboards, i18n)        │
                    └──────────────┬───────────────┘
                                   │ iframe + sdk.js
                                   ▼
   player ─────────────►  geoconflict.ru  (game VPS: nginx + node master/workers)
                                   │
                    ┌──────────────┼───────────────────────┐
                    │              │                       │
                    ▼              ▼                       ▼
        api.geoconflict.ru   telemetry.geoconflict.ru   api.openfront.io *
        (profile backend:    (Uptrace + ClickHouse +    (upstream OpenFront
         Postgres, XP,        Postgres + Redis +         identity / archive /
         citizenship)         otelcol)                   matchmaking service)

   * see §13 open question 1 — the game server still points its JWT issuer, archive,
     and matchmaking calls at an external OpenFront-style API.
```

External dependencies that matter:

- **Yandex Games SDK** — loaded from a Yandex CDN by the iframe template
  (`src/client/yandex-games_iframe.html:19-27`). Supplies auth, interstitial ads, A/B experiment
  flags, language, and leaderboards.
- **GameAnalytics** — client analytics, initialized **only when `DEPLOY_ENV === "prod"`**
  (`src/client/flashist/FlashistFacade.ts:352-369`).
- **Uptrace / OpenTelemetry** — logs, metrics, traces from both the server and the browser.
- **Docker Hub** — deploy artifact registry for all three fleets.
- **Telegram / webhook** — feedback and email-subscribe relays (`src/server/Master.ts:214`, `:326`).

---

## 3. Three-tier code structure

```
src/client/          browser frontend — Lit web components + Canvas 2D rendering
src/core/            shared deterministic game logic (runs identically on client & in the web worker)
src/server/          Node master + worker game servers (lobby, relay, telemetry)
src/profile-server/  standalone profile/XP backend (Express + Postgres) — its own image, own VPS
```

`src/core/` is the contract between the other tiers: `Schemas.ts` (Zod wire types), `game/`
(state + rules), `execution/` (the ~40 intent executions), `configuration/` (env-specific config),
`profile/` (shared XP/citizenship rules and the service-to-service wire contract).

A notable coupling wart: `src/core/GameRunner.ts:1` imports `placeName` from
`../client/graphics/NameBoxCalculator`, and `src/core/game/GameImpl.ts:1` imports `renderNumber` from
`../../client/Utils` — so "shared core" reaches back into the client tier in two places.

---

## 4. The tick model — how a game actually runs

The game is **tick-based and deterministic**: the same initial seed plus the same ordered intent
stream produces byte-identical state on every participant. The server is a *relay*, not a simulator —
it never runs the simulation (`src/core/profile/MatchQualification.ts:5-7`).

### Intent → execution pipeline

1. **Input** — `src/client/InputHandler.ts` captures the action.
2. **Intent event** — a `GameEvent` class in `src/client/Transport.ts:33-178` (e.g.
   `SendAttackIntentEvent`) is emitted on the `EventBus`.
3. **Transport** — `Transport` translates it to a Zod-shaped intent and sends
   `{type:"intent", …}` over the WebSocket (`src/client/Transport.ts:191-264`).
4. **Server buffer** — `GameServer` accumulates intents for the current turn
   (`src/server/GameServer.ts:274-390`).
5. **Turn broadcast** — every `turnIntervalMs` the server snapshots the buffer into a `Turn` and
   sends it to every active client (`src/server/GameServer.ts:715-781`).
6. **Execution** — each client's web worker feeds the turn to
   `Executor.createExecs()` → `createExec()` (`src/core/execution/ExecutionManager.ts:43-133`), which
   maps each intent type to an `Execution` object.
7. **Tick** — `GameImpl.executeNextTick()` (`src/core/game/GameImpl.ts:349-387`) ticks every active
   execution, collects `GameUpdate` objects, and every 10th tick emits a state `hash`.
8. **Render** — the worker posts `game_update` to the main thread; `ClientGameRunner` applies it to
   `GameView` and calls `renderer.tick()` (`src/client/ClientGameRunner.ts:461-534`).

**Turn interval is ~66.7 ms**, not the stock 100 ms — `DefaultConfig.turnIntervalMs()` returns
`100 / flashist_gameSpeedCoef` with the coefficient at `1.5`
(`src/core/configuration/DefaultConfig.ts:240-247`). This is a marked Flashist adaptation; the stock
100 ms line is commented out directly above it.

### Desync detection

Clients send a state hash every 10 turns. The server takes a majority vote; minority clients get a
one-shot `desync` message, and if at least half disagree everyone is flagged out of sync
(`src/server/GameServer.ts:1032-1129`). Out-of-sync clients cannot vote on the winner.

### Threading on the client

```
main thread                                  web worker
───────────                                  ──────────
Transport  ──ws──► server                    Worker.worker.ts
    │                                            │
ClientGameRunner ──postMessage──► WorkerClient ──┤ createGameRunner()
    │  ◄──── game_update ─────────────────────────┘ GameImpl.executeNextTick()
    ▼
GameView ──► GameRenderer ──► 32 layers ──► <canvas>
```

- The worker is created with webpack's native worker support:
  `new Worker(new URL("./Worker.worker.ts", import.meta.url))` (`src/core/worker/WorkerClient.ts:27`).
  Initialization has a 5,000 ms timeout (`WorkerClient.ts:66-96`).
- The main thread drives the worker with a `requestAnimationFrame` **heartbeat pump** — one
  `sendHeartbeat()` (= one tick) per frame normally, and `CATCHUP_BATCH_SIZE = 20` per frame while
  catching up (`src/client/ClientGameRunner.ts:359`, `:536-546`).
- Catch-up threshold is 30 queued turns (`ClientGameRunner.ts:355`); beyond it an overlay shows and
  rendering is suppressed until the queue drains.

### Singleplayer / tutorial / replay

There is no server in these modes. `src/client/LocalServer.ts` emulates one in-browser: it runs its
own turn timer at `turnIntervalMs() * replaySpeedMultiplier` on a 5 ms poll
(`LocalServer.ts:67-80`) and feeds the same `Turn` objects to the same worker. `Transport.isLocal`
selects this path for replays and `GameType.Singleplayer` (`src/client/Transport.ts:199-201`).

---

## 5. Client tier

### Entry point — a deliberately staged bootstrap

`src/client/Bootstrap.ts` is the sole webpack entry (`webpack.config.js:179`). It implements a
three-phase start documented in its own header (`Bootstrap.ts:1-15`):

| Phase | What | Blocking? |
|---|---|---|
| 1 — immediate | analytics bootstrap, device/OS/session detection | no external waits |
| 2 — platform init ("THE GATE") | Yandex SDK init, player data, experiment flags, language | bounded by a **5,000 ms** deadline (`FlashistFacade.ts:280`) |
| 3 — app start | `await import("./Main")`, then `startClient()` | after the gate settles |

The point of the split: every custom-element registration lives behind the dynamic `import("./Main")`,
so components *structurally cannot* race platform initialization. On SDK failure or timeout the app
continues in **degraded mode** rather than hanging — all three platform deferreds always resolve and
never reject (`FlashistFacade.ts:316-330`, `:432-449`).

The visible loading overlay is removed by the gate `flashist_waitGameInitComplete()`
(`FlashistFacade.ts:1195-1206`), awaited by the iframe template
(`src/client/yandex-games_iframe.html:481-495`) and by deferred consumers such as `PublicLobby.ts:63`
and `CitizenshipCard.ts:53`.

Failure handling: a chunk-load failure retries once after 1 s (`Bootstrap.ts:26-37`); a pre-gate
bootstrap failure reloads the page once, latched via `sessionStorage`
(`Bootstrap.ts:23`, `:69-91`).

### Three HTML templates, one bundle

`webpack.config.js` registers three `HtmlWebpackPlugin` instances:

| Template | Output | Bundle injected? |
|---|---|---|
| `src/client/index.html` | `static/index.html` | yes (`webpack.config.js:280-294`) |
| `src/client/yandex-games_iframe.html` | `static/yandex-games_iframe.html` | yes (`:295-309`) — **this is the production entry for geoconflict.ru** |
| `src/client/yandex-games_iframe-parent.html` | `static/yandex-games_iframe-parent.html` | **no** (`chunks: []`, `:310-328`) — a 12-line wrapper that iframes the real page; injecting the bundle would run the whole bootstrap twice |

The two bundled templates carry an identical set of custom elements (verified by diffing their tag
sets). They differ in the Yandex layer: the iframe template adds the SDK script tag plus
`window.flashist_isYandexPlatform` / `flashist_sdkScriptReadyPromise`
(`yandex-games_iframe.html:19-27`), the preload overlay, and the gate-aware reveal; `index.html` uses a
plain `load` handler (`index.html:351-358`) and additionally carries `<account-button>` and
`<gutter-ads>`, which the Yandex build does not.

> **Convention:** when adding a custom element or modal, update **both** bundled templates.

### Rendering — Canvas 2D, with one Pixi/WebGL layer

`createRenderer()` (`src/client/graphics/GameRenderer.ts:46-303`) is a single hand-written factory. It
does two distinct things: it `querySelector`s ~20 already-declared **Lit custom elements** and injects
`game` / `eventBus` / `transformHandler` / `uiState` into them, and it `new`s the pure-canvas layers.
The result is one ordered `Layer[]` with **32 entries** (`GameRenderer.ts:246-288`) plus a conditional
33rd `TutorialLayer` (`:290-292`). `src/client/graphics/layers/` holds 43 files.

Order is load-bearing: the array is grouped by `shouldTransform()` so the renderer does not thrash
`context.save()`/`restore()` (comment at `GameRenderer.ts:243-245`). Nine layers render in world space;
the rest are screen space.

**Rendering is `CanvasRenderingContext2D`, not Pixi.** Pixi.js appears in exactly two files —
`layers/StructureIconsLayer.ts:4` and `layers/StructureDrawingUtils.ts:1`. `StructureIconsLayer`
keeps its own offscreen canvas and a `PIXI.WebGLRenderer` (`StructureIconsLayer.ts:71`, `:109-112`) for
structure icons/labels, then composites the result into the main 2D canvas with
`drawImage(this.renderer.canvas, 0, 0)` (`:228`). This is why it declares `shouldTransform() === false`.

Camera/zoom live in `src/client/graphics/TransformHandler.ts` (355 lines). The render loop throttles to
30 FPS when mobile rendering is enabled (`GameRenderer.ts:361`) and warns on frames over 50 ms.

### The Flashist / Yandex layer

`src/client/flashist/FlashistFacade.ts` (1,208 lines) is a singleton owning everything
platform-specific: GameAnalytics, the Yandex SDK, experiment flags, auth, ads, leaderboards, language,
and the init gate.

- **Analytics events** — ~70 constants in `flashistConstants.analyticEvents`
  (`FlashistFacade.ts:16-119`), all `Category:Action` or `Category:Subcategory:Value` in PascalCase.
  Never write an event string inline; always go through the enum key. The reference doc is
  `ai-agents/knowledge-base/analytics-event-reference.md` and must be updated whenever events change.
- **Experiment flags** — `email_subscribe_button`, `telegram_link`, `vk_link`, `citizenship_ui`
  (`FlashistFacade.ts:141-153`). `checkExperimentFlag()` returns `true` unconditionally when
  `GAME_ENV === "dev"` (`:785-806`).
- **Degraded mode** — `isYandexDegraded()` (`:843-849`). Features gated on a flag generally still
  render in degraded mode, because the flag is unknowable without the SDK
  (e.g. `CitizenshipCard.ts:55-58`).
- **Late-SDK recovery** — three paths handle an SDK that resolves *after* the gate: deliver
  `LoadingAPI.ready()`, refetch flags, refetch the player (`FlashistFacade.ts:566-635`, `:652`).
- **Language** — Yandex `i18n.lang` is mapped to a supported locale, and only `en` / `ru` are ever
  produced (`be/kk/uk/uz → ru`, everything else → `en`) (`FlashistFacade.ts:1010-1049`).

### Localization

33 language files under `resources/lang/`, **statically bundled** (imported one by one at
`src/client/LangSelector.ts:5-36`), not fetched. `translateText(key)` (`src/client/Utils.ts:103-157`)
reads the active table from the `<lang-selector>` element, falls back to the English default table,
then to the raw key, and formats with ICU `IntlMessageFormat` behind a per-locale formatter cache.
Selection precedence is `localStorage["lang"]` > Yandex-resolved language > `navigator.language`
(`LangSelector.ts:120-142`).

> **Convention:** all user-visible text goes through `translateText`. Any text change must be applied
> to **both** `resources/lang/en.json` and `ru.json`; the other 31 files are not hand-maintained.

### Two client-side backends

They are easy to confuse:

| Concern | Base URL | Files |
|---|---|---|
| Profile / XP / citizenship | `profileApiUrl()` → `api.geoconflict.ru` | `PlayerProfileView.ts` (the only caller), consumed by `CitizenshipCard.ts` |
| Account, Discord/email login, player stats | `getApiBase()` → upstream OpenFront-style API | `AccountModal.ts`, `jwt.ts` |

`PlayerProfileView.loadPlayerProfileView()` (`src/client/PlayerProfileView.ts:34-77`) is written so the
**only** null (= guest) result is "not Yandex-authorized"; every other failure resolves to a
logged-in zero-state so a real citizen is never misrendered as a guest. The fetch is
`GET {base}/v1/profile?yandexPlayerId=…` with a 5,000 ms abort and Zod validation (`:84-105`).

`AccountModal` / `<account-button>` exists only in `index.html` — the Yandex build uses Yandex auth
exclusively.

---

## 6. Game server tier

### Process model

`src/server/Server.ts:12-19` is one binary: `cluster.isPrimary` → `startMaster()` (`Master.ts`),
otherwise `startWorker()` (`Worker.ts`).

| | Port | Count |
|---|---|---|
| Master (HTTP/API/static) | 3000 (`ServerEndpoints.ts:1`) | 1 |
| Worker *i* (HTTP + WebSocket) | `3001 + i` (`DefaultConfig.ts:305-307`) | prod **20** (`ProdConfig.ts:6-8`), dev/preprod **2** (`DevConfig.ts:40-42`, `PreprodConfig.ts:9-11`) |

Master forks with `WORKER_ID=i`, waits for a `WORKER_READY` IPC message, and re-forks on exit
(`Master.ts:93-153`).

**Game placement is deterministic sharding, not load balancing.**
`workerIndex(gameID) = simpleHash(gameID) % numWorkers()`
(`src/core/configuration/DefaultConfig.ts:296-298`; hash at `src/core/Util.ts:64-72`). The **client
computes the same index independently** to pick its `/wN` URL (`src/client/Transport.ts:317-320`), so
client and server must ship the same `numWorkers()`. Both ends re-check the shard and reject a
mismatch (`Worker.ts:81-103`, `:148-155`, `:340-347`).

### Game lifecycle

- **Public lobby scheduling** is master-side: once workers are ready, a **100 ms** interval polls
  lobbies and, if none is open, posts `POST /api/create_game/<randomID>` to the owning worker with the
  admin header (`Master.ts:119-127`, `:490-517`). A lobby is evicted from the public list at
  `msUntilStart <= 250` or when human clients hit `maxPlayers` (`Master.ts:458-478`).
- **Lobby window** = `gameCreationRate()` = **120,000 ms** (`DefaultConfig.ts:244-246`).
- **Per-worker housekeeping** ticks every 1,000 ms (`GameManager.ts:26`); an `Active` game that has not
  started gets `prestart()` then `start()` after a 2,000 ms delay (`GameManager.ts:112-147`).
- **Join** (`GameServer.addClient()`, `GameServer.ts:168-441`): rejects kicked clients, caps **3
  concurrent clients per IP** on public games, in prod kicks a pre-existing client with the same
  `persistentID`, supports reconnect by replacing the stale instance, and upserts the player's profile.
- **Start** freezes the roster into `gameStartInfo` and broadcasts `start` (`GameServer.ts:461-503`);
  `prestart` broadcasts the map first so clients can preload (`:429-458`).
- **End conditions**: hard cap `maxGameDuration` = 3 h (`GameServer.ts:56`, `:858-863`); per-client ping
  timeout 60 s; "no recent pings" 20 s; public games need a 30 s warm-up before they can finish empty.
- **Winner** is decided by a vote counted **by unique IP**, accepted at `votes*2 >= activeUniqueIPs`
  (`GameServer.ts:1131-1187`). Out-of-sync and kicked clients cannot vote.
- **Disconnect** is checked every 5 turns with a 60 s timeout and broadcast as a synthetic
  `mark_disconnected` intent (`GameServer.ts:961-991`).
- **Slow turns** (over `SLOW_TURN_THRESHOLD_MS = 100`) emit a retro-timed OTEL span tree
  `server.turn.process` → `turn.assembly` / `synchronization` / `turn.broadcast`.

### HTTP surface

**Master (port 3000)** — `src/server/Master.ts`:

| Method | Path | Line |
|---|---|---|
| GET | `/api/env` | 161 |
| GET | `/api/public_lobbies` | 180 |
| GET | `/api/version` | 184 |
| POST | `/api/feedback` (5/min) | 214 |
| POST | `/api/subscribe` (3/min) | 326 |
| POST | `/api/kick_player/:gameID/:clientID` (admin) | 380 |
| GET | `/api/game/:id/active` | 519 |
| GET | `/cosmetics.json` | 539 |
| GET | `*` → SPA fallback | 552 |

Plus a `.map`-file 404 blocker (`Master.ts:35-41`), static serving of `static/`, `trust proxy 3`, and a
global 20 req/IP/s rate limit (`Master.ts:70-76`).

**Worker (port 3001+i, mounted under `/wN`)** — `src/server/Worker.ts`:
`POST /api/create_game/:id` (116), `POST /api/start_game/:id` (167), `PUT /api/game/:id` (185),
`GET /api/game/:id/exists` (220), `GET /api/game/:id/active` (227), `GET /api/game/:id` (232),
`POST /api/archive_singleplayer_game` (241), `POST /api/kick_player/...` (284, admin), and the
WebSocket upgrade at `/` (303).

> **Dev note:** any new `/api/*` route must also be added to the `context` array in
> `createLocalProxyConfig` in `webpack.config.js`, or it will not work in local dev.

### Auth — three independent layers

1. **Player identity** (`src/server/jwt.ts:19-47`). If the token parses as a `PersistentIdSchema`
   UUID it is accepted **as an anonymous persistent ID with `claims: null` and no cryptography**
   (`jwt.ts:23-25`). Otherwise `jwtVerify` with **EdDSA only**, against `jwtIssuer()`/`jwtAudience()`
   and a JWKS fetched once from `{issuer}/.well-known/jwks.json` (`DefaultConfig.ts:188-200`).
   Anonymous play is allowed because `allowedFlares()` is `undefined` by default
   (`DefaultConfig.ts:58-60`).
2. **Cosmetic entitlements** — `Privilege.ts` / `PrivilegeRefresher.ts`. The refresher refetches
   `cosmetics.json` from the master every ~3 min and **fails open**: until a valid config loads,
   `FailOpenPrivilegeChecker` allows everything (`PrivilegeRefresher.ts:45-47`, `Privilege.ts:112-116`).
   Flags are parsed then deliberately dropped — `// Flashist AdaptatioN: disabling flags`
   (`Privilege.ts:53-54`).
3. **Admin / service** — header `x-admin-key` compared to `ADMIN_TOKEN` with a plain `!==`;
   the default value is the literal `"dummy-admin-token"` (`DefaultConfig.ts:231-236`).
   Separately `x-api-key: API_KEY` authenticates archive and matchmaking calls to the external issuer.

### Two features that are present but switched off

- **Archiving.** `archiveEnabled()` returns `false` (`DefaultConfig.ts:311-318`), so `Archive.archive()`
  returns immediately (`Archive.ts:17-23`). When enabled, the destination is an HTTP
  `POST {jwtIssuer}/game/{gameID}` — **not** S3. There *are* `storageEndpoint/AccessKey/SecretKey/Bucket`
  config accessors (`DefaultConfig.ts:213-225`) with **zero consumers in `src/`**. Pending task:
  `ai-agents/tasks/backlog/s4-archive-s3-backed-citizen-gated.md`.
- **Matchmaking.** `enableMatchmaking()` returns `false` (`DefaultConfig.ts:308-310`). The worker-side
  check-in poll against `{jwtIssuer}/matchmaking/checkin` exists at `Worker.ts:484-541`.
- **Compact maps in the public rotation.** `MINI_MAP_MODIFIER` is commented out of `MATCH_MODIFIERS`
  (`src/server/MapPlaylist.ts:37-50`) because half-resolution downsampling drops coastal `isShore`
  data and breaks boat attacks. The real fix is regenerating the `map4x.bin` binaries
  (`ai-agents/tasks/backlog/s5-fix-compact-map-shore-generation.md`).

### Telemetry

- **Resource**: `service.name = "openfront"`, `service.version = "1.0.0"` (`OtelResource.ts:12-14`),
  plus `openfront.environment / .host / .deployment / .component` labels.
- **Logs** — Winston + `OpenTelemetryTransportV3` → OTLP `/v1/logs` (`Logger.ts:20-67`). `console.warn`
  is globally monkey-patched into Winston so `src/core/` warnings reach the collector
  (`Logger.ts:69-76`).
- **Traces** — OTLP `/v1/traces`, only consumer is the slow-turn span tree (`OtelTracing.ts:10-31`).
- **Metrics** — OTLP `/v1/metrics`, 15 s export interval, namespace **`geoconflict.server.*`**
  (`WorkerMetrics.ts:37-52`): `games.total`, `games.started`, `clients.connected`, `cpu.usage`
  (ratio 0–1, unit `"1"`), `memory.heap.used/.heap.total/.rss`, `eventloop.lag`,
  `network.bytes_sent/.bytes_recv`.
- **Init is worker-only and conditional** (`Worker.ts:69-72`) — the **master exports no metrics and no
  traces**, only logs.
- Browser-side OTEL initializes first thing in the bootstrap (`Bootstrap.ts:16` →
  `OtelBrowserInit.ts`). Source maps are `hidden-source-map`, uploaded to Uptrace at build time keyed
  by `GIT_COMMIT` and deleted from the image; the master 404s `.map` requests as defence in depth
  (`webpack.config.js:180-183`, `Dockerfile:52-56`, `Master.ts:35-41`).

---

## 7. Profile backend tier

A standalone service — own image (`Dockerfile.profile`), own VPS, own Postgres. The game server never
touches the database.

`src/profile-server/Server.ts:25-33` is thin wiring: dotenv → `createPool()` →
`new PlayerProfileRepository(pool)` → `createApp(repo)` → listen. Default port **8080**
(`ProfileEndpoints.ts:6`), validated strictly so `PROFILE_PORT="3000abc"` is rejected rather than
silently truncated (`:10-22`). It uses its **own minimal Winston logger** (`profile-server/Logger.ts`),
deliberately not `src/server/Logger.ts`, because that pulls in the whole game config chain plus OTEL —
**so this tier exports no telemetry**.

### Routes (`src/profile-server/Routes.ts`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | liveness, dependency-free, never rate-limited |
| GET | `/ready` | none | `repo.ping()` → 200 / 503 |
| GET | `/v1/profile?yandexPlayerId=` | **none** | 60 req/min/IP; CORS applied before the limiter so even a 429 is readable (`:106-109`) |
| POST | `/internal/v1/profile/upsert` | internal | 200 / 400 / **409 persistent_id_conflict** / 500 |
| POST | `/internal/v1/credit` | internal | **always 200**, one `results[]` entry per input item |

`toPublicProfile()` (`Routes.ts:55-62`) strips `is_paid_citizen`, `citizenship_purchased_at`, and
`persistent_id` from every response — because the read is unauthenticated, a guessed `yandexPlayerId`
must not reveal who paid or leak the cross-device linkage token.

### Service-to-service auth — two layers

1. **Network** — nginx `location /internal/` with an IP allowlist built from
   `PROFILE_INTERNAL_ALLOW_IPS` plus `deny all` (`setup-profile.sh:707-715`), validated to reject
   `0.0.0.0/0`-style entries.
2. **Application** — `InternalAuth.ts:14-19`: `Bearer` compared to `PROFILE_INTERNAL_TOKEN` with
   `crypto.timingSafeEqual` behind a length guard, and **fails closed** — an unset expected token
   rejects everything.

### Data model — `migrations/001_player_profiles.sql`

```
player_profiles
  yandex_player_id   text PK
  persistent_id      text UNIQUE          -- text, not uuid, on purpose
  xp                 bigint  default 0  check (xp >= 0)
  is_citizen         bool
  is_paid_citizen    bool
  citizenship_earned_at / citizenship_purchased_at  timestamptz
  display_name       text
  schema_version     integer default 1
  extra              jsonb   default '{}'   -- typed columns + overflow
  created_at / updated_at
  CHECK chk_paid_implies_citizen / chk_purchased_implies_paid / chk_earned_implies_citizen

player_match_xp_credits          -- the idempotency ledger
  PK (game_id, yandex_player_id), FK → player_profiles ON DELETE CASCADE
  xp_awarded integer default 10, credited_at

player_name_history              -- defined, no application logic yet
player_cosmetic_ownership        -- defined, no application logic yet
```

A partial unique index on `lower(display_name)` gives case-insensitive name uniqueness for set names
only (`001_player_profiles.sql:45-47`).

`CREDIT_SQL` (`PlayerProfileRepository.ts:67-88`) is a **single statement**: a CTE inserts into the
ledger with `ON CONFLICT DO NOTHING`, a second CTE increments `xp` and flips `is_citizen` /
`citizenship_earned_at` gated on `EXISTS(ins)`, and the final `SELECT count(*)` distinguishes
`credited` from `duplicate`. One statement means no read-modify-write race. `UPSERT_SQL` (`:95-103`)
only writes back when `persistent_id` actually changed **and** `schema_version <=
CURRENT_PROFILE_SCHEMA_VERSION`, so a stale build cannot clobber a newer row.

`migrate.ts` is a dependency-free runner: creates `schema_migrations`, applies every `migrations/*.sql`
once in lexical order, each file in one transaction. Single-process by design; the comment at `:10-11`
notes an advisory lock would be needed if that changes.

### The match-end XP flow

```
match ends
  └─ GameServer.handleWinner()            GameServer.ts:1131-1187   (unique-IP vote)
      └─ creditMatchXp()                  GameServer.ts:1218-1279
          ├─ getCreditableYandexId()      GameServer.ts:1189-1202   ◄── the identity-trust seam
          └─ selectMatchCredits()         core/profile/MatchQualification.ts:74-99  (pure)
              └─ ProfileApiClient.creditMatch()   server/ProfileApiClient.ts:84-118
                  └─ POST /internal/v1/credit ──► PlayerProfileRepository.CREDIT_SQL
```

Shared, pure rules live in `src/core/profile/` so client and server cannot drift:
`XP_PER_MATCH = 10`, `CITIZENSHIP_XP_THRESHOLD = 1000` (`Citizenship.ts:15-18`);
`qualifiesForMatchXp` = spawned AND (alive at end OR killed) (`MatchQualification.ts:43-45`);
`selectMatchCredits` additionally gates on the frozen start roster, not-kicked, not-disconnected, a
non-null Yandex id, and dedupes by Yandex id.

**`getCreditableYandexId()` is the single identity-trust seam** (`GameServer.ts:1189-1202`). Today it is
a pass-through returning the *client-asserted* `client.yandexPlayerId` — an explicitly accepted and
documented risk, scoped to earned XP only, because server-side signed-payload verification is blocked
until the Yandex secret key is issued. The design intent is that verification lands **inside this one
function** with no change to its two callers. The client-side value is marked untrusted at
`Client.ts:23-27` and can only go null→value (`Client.ts:37-43`).

`ProfileApiClient` is **fail-soft with no durable queue** (`ProfileApiClient.ts:23-36`): 3 attempts,
250 ms × attempt backoff, 10 s per-attempt timeout, retries transport/5xx/429 only. A hard outage past
the retry budget silently drops that match's XP. This is safe against retries because
`(game_id, yandex_player_id)` is the primary key. It no-ops entirely unless both `PROFILE_API_URL` and
`PROFILE_INTERNAL_TOKEN` are set.

---

## 8. Runtime topology and deployment

**There is no CI/CD.** Every deploy is a local shell script run from the developer's machine: build an
image locally, push to Docker Hub, SSH to the target box, run a remote script. There is no `.github/`
directory in the repo.

Three independent fleets, all on **reg.ru VPS in Moscow, Russia** (152-FZ data residency is therefore
already satisfied — note the `Hetzner` comments in `setup.sh` are stale, see §12).

### A. Game servers — `geoconflict.ru`

```
./build-deploy.sh [dev|staging|prod]
   ├─ scripts/bump-version.js, git commit + tag + push       build-deploy.sh:45-53
   ├─ ./build.sh   docker buildx --platform linux/amd64 --load, secret scan, push
   └─ ./deploy.sh  scp update.sh + a 0600 env file → ssh → ./update.sh
                      └─ docker run -p 127.0.0.1:3000:80  geoconflict-${DEPLOYMENT_ID}
```

Env layering, in order: `.env` → `.env.secret` → `.env.$ENV` → `.env.$ENV.secret` (`build.sh:59-64`).

Secret hygiene is a **hard gate** in the build: a name check (`build.sh:110`), then an authoritative
per-layer **byte scan of the built image** (`build.sh:157`), then a re-tag + identity assert, and only
then `docker push` (`build.sh:163-171`). A baked secret blocks the push. There is also
`npm run check:docker-secret-boundary`.

The container runs **nginx and node together under supervisord** (`Dockerfile:88-113`,
`supervisord.conf`). Three nginx/proxy tiers exist on a game box:

| Tier | Listens | Proxies to | Config |
|---|---|---|---|
| Host nginx | `:80` / `:443`, Let's Encrypt TLS | `127.0.0.1:3000` | written by `setup.sh:185-243` |
| Container nginx | container `:80` (published as host `127.0.0.1:3000`) | node master/workers | repo `nginx.conf` — **baked into the image**, so edits ship via `build-deploy.sh`, not `setup.sh` |
| Node | master `:3000`, workers `:3001+` | — | `Master.ts`, `Worker.ts` |

Container nginx (`nginx.conf`) does the caching and the worker fan-out: two cache zones (`STATIC`,
`API_CACHE`), a `map $uri $port` block for `/w0…/w40` → `3001…3041` (`:1-45`), plus per-route policy —
`/api/public_lobbies` cached **1 s**, `/api/env` 1 h, `/commit.txt` 5 s, `/maps/*.json` 24 h with
stale-on-error, `.js`/`.css`/`.bin` immutable for a year in the browser, `.html` `no-store`.
Access logs go to stdout/stderr deliberately: a comment at `nginx.conf:69-72` records that an
unrotated log file once grew to 32 G and filled the disk (2026-07-15).

Box provisioning (`setup.sh`, one-time) also runs two host containers: `prom/node-exporter` on
`localhost:9100` and an `otel/opentelemetry-collector-contrib` that scrapes it and forwards OTLP
to the telemetry fleet.

### B. Profile backend — `api.geoconflict.ru`

`./build-deploy-profile.sh` → build amd64 → push → resolve the canonical **`@sha256` digest**
(fail-closed) → role-guard the target box → stage secrets in a local 0600 file, SCP it, source-and-`rm`
in one SSH session so no secret reaches remote argv → run `setup-profile.sh`, which refuses any image
that is not digest-pinned.

On the box, `/opt/profile/docker-compose.yml` runs two containers:

| Service | Image | Binding |
|---|---|---|
| `postgres` | `postgres:16-alpine`, tuned for low RAM (`shared_buffers=128MB`, `max_connections=25`) | `127.0.0.1:5432` only |
| `profile-api` | the digest-pinned app image | `127.0.0.1:${PROFILE_PORT}` (default 8080) |

Plus: `ufw` default-deny with only SSH/80/443 open, a swapfile, the clock pinned to UTC, a `profile`
systemd unit for reboot, a **120 s health gate** requiring both services `healthy`, and **digest-pinned
automatic rollback** to the previous image which must itself pass the same gate. Migrations run only
after the gate passes (`docker compose exec -T profile-api npm run migrate`).

Backups (`profile-backup.sh`): `pg_dump -Fc` → **`age` encryption before it leaves the box** →
`rclone` to RU-resident S3 (`daily/`, with a server-side copy to `weekly/` on Sundays), default
retention 14 daily / 56 weekly days. Off-box mode installs only when every S3 + age variable is set;
otherwise a weekly local-dump fallback is installed. Runbook:
`ai-agents/knowledge-base/profile-backup-restore-runbook.md`.

TLS here is `certbot certonly --standalone`, so the renew cron must stop and restart nginx.

### C. Telemetry — `telemetry.geoconflict.ru`

`./build-deploy-telemetry.sh` builds no image; it SCPs and runs `setup-telemetry.sh`. Before touching
the box it does a **local dry-run config validation** by running the Uptrace image against a candidate
config. Five containers:

| Service | Image | Exposure |
|---|---|---|
| `clickhouse` | `clickhouse/clickhouse-server:25.8.15.35` | internal; memory cap 0.6, `metric_log` disabled, system-log retention tuned |
| `postgres` | `postgres:17-alpine` | internal — **Uptrace metadata only** |
| `redis` | `redis:7-alpine` | internal |
| `uptrace` | `uptrace/uptrace:2.0.2` | `127.0.0.1:14318` (UI) / `127.0.0.1:14317` — **loopback only, reach via SSH tunnel** |
| `otelcol` | `otel/opentelemetry-collector-contrib:0.123.0` | `4317` gRPC public; `4318` HTTP behind nginx |

nginx here maps `/v1/` → the OTLP HTTP ingest and `/` → the Uptrace UI. HTTPS is mandatory because
Yandex Games serves the game over HTTPS and browsers refuse mixed-content OTLP POSTs.

> **Two Postgres instances exist and are easy to confuse:** the *application* DB
> (`postgres:16-alpine`) on the profile VPS, and Uptrace's *metadata* DB (`postgres:17-alpine`) on the
> telemetry VPS. **Only the former is backed up.**

> **Access note:** the Russian telemetry VPS is unreachable while a full-tunnel VPN is on — add a `/32`
> bypass route or turn the VPN off.

### Cross-fleet wiring (variable names only)

- Game → profile: `PROFILE_API_URL` is injected at deploy and surfaced to the browser via `/api/env`;
  service calls use `PROFILE_INTERNAL_TOKEN` over the IP-allowlisted `/internal/` route.
- Game → telemetry: `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_AUTH_HEADER`, also baked as build args so the
  browser bundle knows where to send traces; `UPTRACE_SOURCEMAP_DSN` + `PUBLIC_ORIGIN` symbolicate
  client stack traces.

---

## 9. Build, run, test — the actual commands

```bash
# develop
npm run dev                  # client (webpack-dev-server :9000) + server, GAME_ENV=dev
npm run start:client         # client only, hot reload
npm run start:server-dev     # server only, GAME_ENV=dev
npm run dev:remote           # client only, proxying WS/API to a remote dev VPS
npm run start:profile-server # the profile backend locally

# build
npm run build-dev            # webpack development → static/
npm run build-prod           # webpack production  → static/
npm run gen-maps             # regenerate map binaries via the Go tool in map-generator/

# test
npm test                     # jest, unit suite (excludes tests/integration/)
npm test -- tests/Attack.test.ts
npm run test:integration     # RUN_DB_TESTS=1 → ONLY tests/integration/*.it.test.ts, needs a real Postgres
npm run test:coverage
npm run perf                 # tsx tests/perf/*.ts

# quality
npm run lint / lint:fix / format
npm run check:docker-secret-boundary

# database
npm run migrate              # profile-server migrations

# deploy
./build-deploy.sh [dev|staging|prod]
npm run deploy:profile       # ./build-deploy-profile.sh
npm run deploy:telemetry     # ./build-deploy-telemetry.sh
```

**Observed on this survey (2026-08-08, `npx jest`):** `82 passed, 82 total; 621 tests passed;
2.57 s`. The two `tests/integration/*.it.test.ts` files are excluded from that run by design and were
**not** exercised — they need a live Postgres via `TEST_DATABASE_URL`.

Test tooling: Jest 30 with `@swc/jest`, one config file in two modes flipped by `RUN_DB_TESTS`
(`jest.config.ts`). Coverage thresholds are set deliberately low — statements 21%, branches 16%,
lines 21%, functions 20.5% (`jest.config.ts:53-58`).

TypeScript is ESM (`"type": "module"`), target ES2020, `strictNullChecks` on but **not full `strict`**
(`tsconfig.json`). ESLint 9 flat config + Prettier, enforced pre-commit by husky + lint-staged.
`eqeqeq` is enforced; prefer `??` over `||` for defaults.

---

## 10. Conventions and deliberate decisions

- **`// Flashist Adaptation`** marks every intentional divergence from upstream OpenFront. Do not
  "fix" one back to upstream behaviour without checking why it exists.
- **Both bundled HTML templates** (`index.html`, `yandex-games_iframe.html`) get every new custom
  element. `yandex-games_iframe.html` is the one that runs in production.
- **All user-visible text via `translateText(key)`**; every change applied to both `en.json` and
  `ru.json`.
- **Analytics event strings only via the `flashistConstants.analyticEvents` enum**, and
  `analytics-event-reference.md` updated alongside.
- **All changes in `src/core/` must be tested** (per `CLAUDE.md`).
- **New `/api/*` routes must be added to `createLocalProxyConfig` in `webpack.config.js`** or local dev
  will not reach them.
- **Shared rules live in `src/core/profile/`** precisely so client and server cannot drift on XP and
  citizenship.
- **Flags are intentionally suppressed**, not broken: `/flags/*.svg` 404s by design (the directory was
  renamed to `flags_source`), the picker is hidden, and `Privilege.ts:53-54` drops flag entitlements.
  They are a planned paid cosmetic, non-country designs only (Yandex bans real-country flags/names).
- **Docker Desktop cannot be started headlessly** on the dev machine — `open -a Docker` blocks on an
  interactive admin prompt, and `docker info` can exit 0 while the daemon is unreachable. Ask the
  owner rather than polling.
- **Never commit unprompted**; task files move between `backlog/`/`done/`/`cancelled/` only via the
  producer's skills.

### Existing knowledge base

`ai-agents/knowledge-base/` already holds ~45 documents — notably `geoconflict-overview.md` (the
deepest game-design reference), `geoconflict-producer-knowledge-base.md`,
`tutorial-technical-description.md`, `uptrace-knowledge-base.md`, `analytics-event-reference.md`,
`profile-backup-restore-runbook.md`, and a long tail of investigation/incident findings. The
`conventions/` folder holds 7 working agreements. `decisions/`, `history/`, `incidents/`, and
`reports/` are **empty** (`.gitkeep` only) — there are currently **no ADRs**. Sprint plans live in
`ai-agents/sprints/`, and the task board holds **38 backlog / 111 done / 8 cancelled** briefs.
The Karpathy-style wiki is at `ai-agents/wiki-vault/` (write access belongs to the wiki role only).

---

## 11. Risks and technical debt

Ordered roughly by expected cost.

### R1 — Client-asserted Yandex identity is the basis for XP crediting
`getCreditableYandexId()` returns the value the client sent (`GameServer.ts:1189-1202`). Anyone able to
craft a join message can claim another player's Yandex id and earn XP toward free citizenship on their
behalf. This is a **known, documented, deliberately scoped** acceptance — blocked on the Yandex IAP
secret key needed for `getPlayer({signed:true})`. The seam is well-placed (one function, two callers),
so the fix is cheap once the key exists. The risk grows the moment citizenship carries paid value.

### R2 — No CI, and the game deploy has no health gate or rollback
There is no `.github/` workflow: lint, tests, and type-checks run only pre-commit and only on staged
files. The **profile** pipeline is well hardened (digest-pinned, 120 s health gate, automatic
rollback). The **game** pipeline is not: it deploys by mutable timestamp tag, has no health gate, no
rollback, and `--restart=always` only in prod (`update.sh:63-67`), so a dev-box reboot leaves the game
down. The asymmetry is the debt, not the profile side.

### R3 — Mobile rendering fragility
Rendering is Canvas 2D with one WebGL (Pixi) layer composited in. Production telemetry shows recurring
`Failed to execute 'getImageData': Out of memory` and `This browser does not support WebGL` errors on
low-memory devices (`ai-agents/tasks/backlog/mobile-webgl-rendering.md`). These crashes are likely
correlated with silent mobile abandonment — a crashed user generates no further events, so the
measured rate understates the impact.

### R4 — `ADMIN_TOKEN` defaults to a literal placeholder and is compared non-constant-time
`DefaultConfig.ts:231-236` returns `"dummy-admin-token"` when the env var is unset, and the comparison
is a plain `!==`. This token gates `POST /api/create_game` for public games and `POST /api/kick_player`.
The profile server's `InternalAuth` does both correctly (fail-closed + `timingSafeEqual`) and is the
model to copy. Related open backlog items: `sec10`–`sec13` on deploy/secret hygiene.

### R5 — `PrivilegeRefresher` fails open
Until a valid `cosmetics.json` loads, every worker allows every cosmetic
(`PrivilegeRefresher.ts:45-47`). A master outage silently grants unrestricted cosmetics. **Accepted by
the owner 2026-08-09 while the project sells nothing** (ADR-102) — and that acceptance **expires at the
first paid entitlement of any kind**, checker-gated or not (paid citizenship, Task 9 flags, Task 9a
patterns), at which point the fail-closed migration is due and this becomes a revenue leak, not an
accepted risk. No alerting exists for "currently serving fail-open"; that gap is accepted, not covered.
**Dependency:** the `flares` this checker consumes come from the **upstream OpenFront user API**
(`Worker.ts:377`, `ApiSchemas.ts:53`), not from Geoconflict — so the migration depends on task `0009`.
Whether that upstream call is live in production is **unverified**.

### R6 — XP crediting has no durable queue
`ProfileApiClient` is fail-soft by design: 3 retries, then the match's XP is dropped
(`ProfileApiClient.ts:23-36`). Correct for availability, but there is no dead-letter path, so a
profile-backend outage is silent, unrecoverable XP loss. Worth an explicit product decision on whether
that is acceptable.

### R7 — Coupling and consistency papercuts
- `src/core/` imports from `src/client/` in two places (`GameRunner.ts:1`, `GameImpl.ts:1`), breaking
  the tier boundary.
- OTEL `service.name` is `"openfront"` while all metric names are `geoconflict.server.*`
  (`OtelResource.ts:12` vs `WorkerMetrics.ts`) — awkward for dashboards and alerts.
- The **master process exports no metrics and no traces** (`Worker.ts:69-72` is the only init site),
  so lobby scheduling — the thing that decides whether public matches exist at all — is unobserved.
- `POST /api/start_game/:id` returns **no response at all** on the not-found and public-game paths
  (`Worker.ts:167-183`), hanging the caller until timeout.
- `nginx.conf` hardcodes 41 worker ports while prod runs 20 (dead but harmless `if` branches).
- Changing `numWorkers()` reshuffles every in-flight game's home worker, and the client computes the
  same index — so client and server must be deployed together.

### R8 — Test coverage is thin where it matters least visibly
621 tests pass in 2.6 s, but the coverage floor is 21% statements. `src/client/graphics/` (the largest
and most crash-prone surface) is barely covered. The pure `src/core/profile/` rules are well covered —
the pattern is right, it just has not spread.

### R9 — Local-only deploy credentials and no staging box
All three pipelines depend on env files and SSH keys that exist only on the owner's machine. There is
no `.env.staging` on disk even though `staging` is a supported argument everywhere — practically the
game fleet is dev + prod. Bus-factor 1. Backlog items `sec10`–`sec13` cover parts of this.

---

## 12. Documented-but-stale

Found while verifying existing documentation against the code. Each of these should be corrected in
its source document.

| # | Claim | Where it says that | What the code shows |
|---|---|---|---|
| 1 | "Pixi.js rendering", "Rendering: Pixi.js with layered architecture (~40 layers)" | `CLAUDE.md` (Three-Tier Structure; Key Subsystems); `geoconflict-overview.md` §1 stack table | Rendering is **Canvas 2D**. Pixi appears in exactly 2 of 43 layer files (`StructureIconsLayer.ts:4`, `StructureDrawingUtils.ts:1`) and composites into the 2D canvas (`StructureIconsLayer.ts:228`). The ordered layer array has **32 entries** + a conditional tutorial layer (`GameRenderer.ts:246-292`). |
| 2 | "Server ... broadcasts turns (~1000ms intervals)" | `CLAUDE.md`, Game Loop & Tick System | `turnIntervalMs()` = `100 / 1.5` ≈ **66.7 ms** (`DefaultConfig.ts:240-247`). Off by ~15×. `geoconflict-overview.md` states this correctly. |
| 3 | "some game modes like Duos/Trios/Quads are disabled"; "Disabled modes ~~Duos~~ ~~Trios~~ ~~Quads~~" | `CLAUDE.md`, Codebase Context; `geoconflict-overview.md` §2.2 | **Active.** All three are in the public rotation `TEAM_COUNTS` (`src/server/MapPlaylist.ts:106-114`, asserted by `tests/server/MapPlaylist.test.ts:50`) and offered in the private host lobby (`HostLobbyModal.ts:290-299`) and singleplayer (`SinglePlayerModal.ts:209`). |
| 4 | "React client" | `docs/project-status.md` (Tech stack), last updated 2025-11-03 | **Zero** React imports and no React dependency. The UI is **Lit** (68 client files import from `"lit"`). |
| 5 | "HTTPS/TLS pending"; "HTTP served directly from the container (port 80)" | `docs/project-status.md`, Deployment Strategy | TLS is provisioned by certbot on all three fleets (`setup.sh:236-243`, `setup-profile.sh`, `setup-telemetry.sh`), and the container port is published to `127.0.0.1:3000` behind a host nginx (`update.sh:75`). |
| 6 | Deploy scripts describe the target as a **Hetzner** box | `setup.sh:2`, `update.sh` header comments | All Geoconflict VPS are **reg.ru, Moscow, Russia** (verified by IP geolocation, 2026-06-13). Verify by IP before any hosting/latency/residency claim. |
| 7 | `/wiki-ingest`, `/wiki-query`, `/wiki-lint` are the available slash commands | `CLAUDE.md`, Knowledge Base & Wiki | The installed skills are `fkit-wiki-ingest`, `fkit-query`, `fkit-wiki-lint`, `fkit-wiki-sync`. The unprefixed names no longer exist. |
| 8 | "All 18 unit types" | `geoconflict-overview.md` §2.6 | The `UnitType` enum has **17** members (`src/core/game/Game.ts:182-200`). |
| 9 | Two HTML templates | `MEMORY.md`, HTML Templates | Three `HtmlWebpackPlugin` outputs (`webpack.config.js:280-328`). The third, `yandex-games_iframe-parent.html`, is a bundle-less wrapper (`chunks: []`) that iframes the real page — so the "update both" rule for elements still holds for the two bundled templates. |
| 10 | `ai-agents/ai-agents.yml` pins `claude: { id: claude-opus-4-8 }` | `ai-agents/ai-agents.yml` | Not verified against any current model list — flagged as likely stale config rather than a code claim. |

Verified as **still accurate** (spot-checked, so future readers do not re-verify): the 32-map
`GameMapType` enum; the intent→execution pipeline description in `CLAUDE.md`; the critical-files table
in `CLAUDE.md`; `Bootstrap.ts` as the single entry with the 5 s bounded gate; the analytics-event
naming convention and enum location; the two-layer nginx model; the telemetry OOM root cause;
`geoconflict-overview.md`'s turn-interval and spawn-phase numbers.

---

## 13. Open questions

For the owner. None of these are guessed at above.

1. **The upstream OpenFront API.** `jwtIssuer()` still points the game server at an external
   OpenFront-style identity/archive/matchmaking service (`Archive.ts:32-40`, `Worker.ts:484-541`,
   `jwt.ts:49-75`). Is that a live third-party dependency in production today, a dead upstream
   leftover, or something Geoconflict is expected to self-host? This determines whether R2 and the
   archive task are blocked on an external party.

2. **Discord / email account path.** `AccountModal` and `jwt.ts`'s `/magic-link`, `/login/discord`,
   `/users/@me` exist and are wired, but `<account-button>` is absent from the Yandex template. Is the
   non-Yandex web build (`index.html`) still a shipped product surface, or is it dev-only?

3. **`staging`.** Every deploy script accepts `staging` and `example.env` has a full
   `SERVER_HOST_STAGING` block, but no `.env.staging` exists on disk. Is staging retired, or is a box
   pending?

4. **Durable XP crediting (R6).** Is silent, unrecoverable XP loss during a profile-backend outage
   acceptable, or should a dead-letter/replay path be designed? This is a product call with a
   technical cost, so it needs the owner's judgement rather than mine.

5. **Signed Yandex identity (R1).** Is the Yandex IAP secret key still the sole blocker, and is there
   an expected date? Whether paid citizenship ships before the key arrives changes the risk grade
   materially.

6. ~~**Cosmetics monetization timing (R5).**~~ **ANSWERED — owner, 2026-08-09.** Fail-open is accepted
   while the project sells nothing, with a pre-commitment to migrate to fail-closed at the **first paid
   entitlement** — any paid entitlement, not only one the cosmetics checker gates. The trigger was
   ruled three times that day (wide → narrow → wide again); see ADR-102
   (`decisions/adr-102-privilege-refresher-fails-open.md`), status `accepted` with that expiry trigger.
   Migration briefed as a separate, trigger-gated task (`0008`), **now dependent on task `0009`**
   (upstream OpenFront API is the source of entitlement data).

7. **`ADMIN_TOKEN` in production (R4).** Is a real value set in the prod env file, i.e. is the
   `"dummy-admin-token"` default only a local-dev convenience? I can see the default in code but not
   the deployed value.

8. **ADR practice.** `ai-agents/knowledge-base/decisions/` is empty, yet several settled architectural
   choices are documented only as inline code comments (fail-soft crediting, fail-open privileges, the
   identity seam, archive-off, compact-maps-off). Would you like these retro-recorded as ADRs so
   future reviews stop re-litigating them?

9. **`src/core` → `src/client` imports.** Is the coupling at `GameRunner.ts:1` and `GameImpl.ts:1`
   inherited from upstream and deliberately left alone, or worth breaking?

---

## 14. Where to look first

| Concern | Start here |
|---|---|
| Game tick / determinism | `src/core/GameRunner.ts`, `src/core/game/GameImpl.ts:349` |
| Adding a game action | `src/core/Schemas.ts` → `src/core/execution/` → `ExecutionManager.ts:47` → `InputHandler.ts` |
| Game state | `src/core/game/GameImpl.ts`, `PlayerImpl.ts`, `UnitGrid.ts` |
| Balance / tuning | `src/core/configuration/DefaultConfig.ts` |
| Networking (client) | `src/client/Transport.ts`, `src/client/ClientGameRunner.ts` |
| Networking (server) | `src/server/Worker.ts`, `src/server/GameServer.ts` |
| Lobby scheduling / public rotation | `src/server/Master.ts:119`, `src/server/MapPlaylist.ts` |
| Rendering | `src/client/graphics/GameRenderer.ts`, `layers/`, `TransformHandler.ts` |
| Yandex platform, analytics, ads, flags | `src/client/flashist/FlashistFacade.ts` |
| App startup / degraded mode | `src/client/Bootstrap.ts` |
| Profile / XP / citizenship | `src/core/profile/`, `src/profile-server/`, `src/server/ProfileApiClient.ts` |
| Deploy | `build-deploy*.sh`, `setup*.sh`, `Dockerfile*`, `nginx.conf` |
