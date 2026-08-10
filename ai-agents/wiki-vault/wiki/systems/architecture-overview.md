# Architecture Overview

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/architecture.md`, `src/core/`, `src/client/`, `src/server/`, `src/profile-server/`

## Summary

The evidence-first architecture survey of the whole codebase, written by the architect on **2026-08-08** against branch `dev` at `c8a2041`. Every claim in the source is grounded in a `path:line` reference or an observed command result; where an existing document disagreed with the code, **the code won** and the disagreement was recorded rather than smoothed over. This page is the technical authority for the wiki: where an older page disagrees on a technical fact, this one wins.

The survey is deliberately broad rather than deep — it is an initiation pass, not an exhaustive reference.

Source: `ai-agents/knowledge-base/architecture.md`

## Architecture

### Four tiers, one TypeScript ESM repo

| Tier | Role | TS LOC |
|---|---|---|
| `src/client/` | Lit web components + **Canvas 2D** rendering | 34,365 |
| `src/core/` | shared deterministic game logic — the contract between tiers | 20,915 |
| `src/server/` | Node cluster master + worker game servers | 3,922 |
| `src/profile-server/` | standalone profile/XP backend (Express + Postgres) | 687 |
| `tests/` | Jest suite | 13,261 |

`src/core/` holds `Schemas.ts` (Zod wire types), `game/`, `execution/` (the ~40 intent executions), `configuration/`, and `profile/` (shared XP/citizenship rules). A **coupling wart**: `src/core/GameRunner.ts` and `src/core/game/GameImpl.ts` each import from `src/client/`, so "shared core" reaches back into the client tier in two places.

The fork's divergences from upstream are marked `// Flashist Adaptation` — 79 occurrences across `src/`, plus 154 `flashist_`-prefixed identifiers.

### The tick model

The server is a **relay, not a simulator** — clients execute the game logic. See [[systems/game-loop]] and [[systems/execution-pipeline]] for the pipeline; the survey's own additions are:

- **Turn interval is ~66.7 ms**, not the stock 100 ms — `turnIntervalMs()` returns `100 / flashist_gameSpeedCoef` with the coefficient at `1.5`. See [[decisions/adr-107-turn-interval-1-5x]].
- The main thread drives the worker with a `requestAnimationFrame` **heartbeat pump** — one tick per frame normally, batched while catching up. Catch-up threshold is 30 queued turns; beyond it an overlay shows and rendering is suppressed until the queue drains.
- Worker initialization has a 5,000 ms timeout.
- Clients hash state every 10 ticks; the server takes a **majority vote** and flags minority clients desynced. Out-of-sync clients cannot vote on the winner.
- Singleplayer / tutorial / replay have **no server** — `LocalServer.ts` emulates one in-browser and feeds the same `Turn` objects to the same worker.

### Client tier

- **Entry point** is `src/client/Bootstrap.ts`, the sole webpack entry, running a three-phase start: immediate analytics → a **bounded 5,000 ms platform gate** (Yandex SDK, player data, flags, language) → dynamic `import("./Main")`. Every custom-element registration sits behind that import, so components *structurally cannot* race platform init. See [[systems/flashist-init]].
- **Three HTML templates, two bundled.** `index.html` and `yandex-games_iframe.html` both get the bundle and carry an identical set of custom elements; `yandex-games_iframe-parent.html` is a bundle-less 12-line wrapper that iframes the real page. The "update both" rule applies to the **two bundled** templates.
- **Rendering is `CanvasRenderingContext2D`.** The ordered layer array has **32 entries** plus a conditional 33rd tutorial layer; `layers/` holds 43 files. Pixi.js appears in exactly **two** files — `StructureIconsLayer` keeps its own offscreen canvas and a Pixi WebGL renderer for structure icons, then composites the result into the main 2D canvas. See [[systems/rendering]].
- **`FlashistFacade.ts`** (~1,200 lines) is the singleton owning everything platform-specific: ~70 analytics event constants, four experiment flags, degraded mode, three late-SDK recovery paths, and language mapping (only `en`/`ru` are ever produced). See [[systems/analytics]].
- **Localization** — 33 language files, **statically bundled**, not fetched. Selection precedence is `localStorage["lang"]` > Yandex-resolved > `navigator.language`. See [[systems/localization]].
- **Two client-side backends are easy to confuse**: the profile/XP/citizenship API, and an upstream OpenFront-style account API used by `AccountModal` / `jwt.ts`. `<account-button>` exists only in `index.html`.

### Game server tier

One binary: `cluster.isPrimary` → master, else worker. Master serves HTTP/API/static; each worker serves HTTP + WebSocket. Prod runs 20 workers, dev/preprod 2.

- **Game placement is deterministic sharding, not load balancing** — `workerIndex(gameID) = simpleHash(gameID) % numWorkers()`. The **client computes the same index independently** to pick its worker URL, so client and server must ship the same worker count and be deployed together.
- **Public lobby scheduling is master-side**: a 100 ms interval polls lobbies and creates one when none is open. The lobby window is 120,000 ms.
- **Join** caps 3 concurrent clients per IP on public games, kicks a same-`persistentID` client in prod, supports reconnect, and upserts the player's profile.
- **Winner** is decided by a vote counted **by unique IP**. Hard game cap is 3 h.
- **Auth is three independent layers**: player identity (a `PersistentId` UUID is accepted anonymously with no cryptography; otherwise EdDSA-only JWT verification), cosmetic entitlements (**fails open** — see [[decisions/adr-102-privilege-refresher-fails-open]]), and an admin/service header key.
- **Three features are present but switched off**: archiving ([[decisions/adr-104-archiving-disabled]]), matchmaking, and compact maps in the public rotation ([[decisions/adr-105-compact-maps-out-of-rotation]]).
- **Telemetry init is worker-only** — the master exports no metrics and no traces, only logs. See [[systems/telemetry]].

### Profile backend tier

A standalone service with its own image, VPS, and Postgres; the game server never touches the database. It uses its **own minimal logger** rather than the game server's, deliberately — so **this tier exports no telemetry**.

Five routes: `/health`, `/ready`, an **unauthenticated** `GET /v1/profile` (rate-limited, with CORS applied before the limiter so even a 429 is readable), and two internal endpoints. `toPublicProfile()` strips the paid-citizen fields and the cross-device linkage token from every response precisely *because* the read is unauthenticated.

Service-to-service auth is two layers: an nginx IP allowlist on `/internal/`, and an application-level bearer token compared with `timingSafeEqual` that **fails closed**. Crediting is a **single SQL statement** (ledger insert with `ON CONFLICT DO NOTHING`, then a gated XP increment), so there is no read-modify-write race. See [[systems/player-profile-store]].

The match-end XP flow funnels all trust through one function — see [[decisions/adr-103-identity-trust-seam]] — and the delivery path is fail-soft with no durable queue — see [[decisions/adr-101-fail-soft-xp-crediting]].

### Deployment

**There is no CI/CD** — no `.github/` directory. Every deploy is a local shell script: build an image locally, push, SSH to the target, run a remote script. Three independent fleets (game, profile, telemetry), all on reg.ru VPS in Moscow, so 152-FZ data residency is satisfied.

- **Game** — secret hygiene is a hard gate: a name check, then an authoritative per-layer **byte scan of the built image**, then re-tag and identity assert, and only then push. The container runs nginx and node together under supervisord. Three proxy tiers exist on a game box (host nginx → container nginx → node); the container nginx is **baked into the image**, so its edits ship via the build, not the provisioning script. See [[decisions/registry-image-policy]] and [[decisions/vps-credential-leak-response]].
- **Profile** — digest-pinned deploys, secrets staged so none reaches remote argv, a 120 s health gate requiring both services healthy, and digest-pinned automatic rollback that must itself pass the same gate. Migrations run only after the gate passes. Backups are encrypted **before leaving the box**. See [[tasks/postgres-backup-routine]].
- **Telemetry** — a config dry-run validated locally before the box is touched; the Uptrace UI is loopback-only, reachable by SSH tunnel. **Two Postgres instances exist and are easy to confuse** — the profile application DB and Uptrace's metadata DB. **Only the former is backed up.**

### Build, run, test

`npm run dev` / `build-dev` / `build-prod` / `gen-maps`; `npm test` (unit, excludes integration), `npm run test:integration` (needs a real Postgres), `test:coverage`, `perf`; `lint` / `format` / `check:docker-secret-boundary`; `migrate`; and the three deploy scripts.

**Observed on the survey (2026-08-08):** 82 suites, **621 tests passed in 2.57 s**. The two integration test files were **not** exercised — they need a live Postgres. Coverage thresholds are set deliberately low (statements 21%, branches 16%). TypeScript is ESM, target ES2020, `strictNullChecks` on but **not full `strict`**.

## Gotchas / Known Issues

### Ranked risks

| # | Risk |
|---|---|
| **R1** | **Client-asserted Yandex identity is the basis for XP crediting.** Anyone able to craft a join message can claim another player's id. Known, documented, deliberately scoped — blocked on the Yandex IAP secret key. The seam is one function, so the fix is cheap once the key exists. See [[decisions/adr-103-identity-trust-seam]]. |
| **R2** | **No CI, and the game deploy has no health gate or rollback.** Lint/tests/type-checks run only pre-commit on staged files. The **profile** pipeline is well hardened; the **game** pipeline deploys by mutable tag with no gate and no rollback. The asymmetry is the debt. |
| **R3** | **Mobile rendering fragility.** Production telemetry shows recurring out-of-memory `getImageData` and "no WebGL" errors on low-memory devices. Crashed users generate no further events, so the measured rate **understates** the impact. |
| **R4** | **The admin token defaults to a literal placeholder** and is compared non-constant-time. The profile server's internal auth does both correctly and is the model to copy. |
| **R5** | **The privilege refresher fails open** — a master outage silently grants unrestricted cosmetics. **Accepted by the owner 2026-08-09 while the project sells nothing**, and that acceptance **expires at the first paid entitlement of any kind**, checker-gated or not, at which point it becomes a revenue leak rather than an accepted risk. No alerting exists for "currently serving fail-open"; that gap is accepted, not covered. **Dependency:** the `flares` the checker consumes come from the **upstream OpenFront user API** (`Worker.ts:377`, `ApiSchemas.ts:53`), not from Geoconflict — so the migration depends on task `0009`, and whether that upstream call is live in production is **unverified**. See [[decisions/adr-102-privilege-refresher-fails-open]]. |
| **R6** | **XP crediting has no durable queue** — a profile-backend outage is silent, unrecoverable XP loss. See [[decisions/adr-101-fail-soft-xp-crediting]]. |
| **R7** | **Coupling and consistency papercuts** — `src/core/` imports from `src/client/` twice; OTEL `service.name` is `"openfront"` while metrics are `geoconflict.server.*`; the **master exports no metrics or traces**, so lobby scheduling is unobserved; one worker route returns no response at all on two paths, hanging the caller until timeout; changing the worker count reshuffles every in-flight game. |
| **R8** | **Test coverage is thin where it matters least visibly** — `src/client/graphics/`, the largest and most crash-prone surface, is barely covered. The pure profile rules are well covered; the pattern is right, it just has not spread. |
| **R9** | **Local-only deploy credentials and no staging box.** All three pipelines depend on env files and SSH keys that exist only on the owner's machine. Bus-factor 1. |

### Documented-but-stale — claims other documents get wrong

Each was verified against the code and should be corrected in its source document.

| Claim | Where | What the code shows |
|---|---|---|
| "Pixi.js rendering", "~40 layers" | `CLAUDE.md`, `geoconflict-overview.md` | **Canvas 2D**; Pixi in 2 of 43 layer files; **32** ordered layers |
| "turns at ~1000 ms intervals" | `CLAUDE.md` | **~66.7 ms** — off by ~15× |
| "Duos/Trios/Quads are disabled" | `CLAUDE.md`, `geoconflict-overview.md` | **All three are live** in the public rotation, private host lobby, and singleplayer |
| "React client" | `docs/project-status.md` | **Zero** React imports; the UI is **Lit** |
| "HTTPS/TLS pending" | `docs/project-status.md` | TLS is provisioned on all three fleets |
| Deploy targets are **Hetzner** boxes | `setup.sh`, `update.sh` comments | All VPS are **reg.ru, Moscow** |
| `/wiki-ingest`, `/wiki-query`, `/wiki-lint` are the slash commands | `CLAUDE.md` | The installed skills are `fkit-wiki-ingest`, `fkit-query`, `fkit-wiki-lint`, `fkit-wiki-sync` |
| "All 18 unit types" | `geoconflict-overview.md` | The enum has **17** members |
| "Two HTML templates" | `MEMORY.md` | **Three** outputs; the third is a bundle-less wrapper |

Spot-checked and **still accurate**: the 32-map enum; the intent→execution pipeline description; the critical-files table; `Bootstrap.ts` as the single entry with its 5 s gate; the analytics-event naming convention; the two-layer nginx model; the telemetry OOM root cause.

### Open questions for the owner

Nine, unanswered as of the survey and **not guessed at**: whether the upstream OpenFront API is a live third-party dependency; whether the non-Yandex web build is still a shipped surface; whether `staging` is retired; whether silent XP loss is acceptable; whether the Yandex secret key is still the sole identity blocker; whether the privilege checker should flip to fail-closed before cosmetics are purchasable; whether a real admin token is set in prod; whether more settled choices should be retro-recorded as ADRs; and whether the core→client coupling is worth breaking.

**Three have since been answered, and several produced briefs:**

- **Question 8 (retro-record ADRs)** — partly answered: ADR-101 through ADR-107 were retro-recorded on 2026-08-08.
- **Question 6 (cosmetics monetization timing / R5)** — **ANSWERED, owner, 2026-08-09.** Fail-open is accepted while the project sells nothing, with a pre-commitment to migrate to fail-closed at the **first paid entitlement** — any paid entitlement, not only one the cosmetics checker gates. The trigger was ruled three times that day (wide → narrow → wide again). Migration briefed as trigger-gated task `0008`, **now dependent on task `0009`**. See [[decisions/adr-102-privilege-refresher-fails-open]].
- **Question 1 (upstream OpenFront API)** — **partly answered, owner, 2026-08-09:** it is **infrastructure to be self-hosted eventually** — not a dead leftover to rip out, and not a permanent dependency. ⚠️ **Whether anything actually reaches it at runtime is still unverified** and must not be asserted either way; task `0009` determines it.
- **Question 9 (core→client imports)** — owner's ruling was "investigate the blast radius first", not fix and not leave: task `0007`.
- **Question 7 (`ADMIN_TOKEN` in prod)** — still unanswered as a *deployed-value* question, but the code-side defects are briefed as task `0005` (fail closed on a missing secret; constant-time compare).

The remainder stay open. See [[decisions/sprint-backlog]] for all eleven briefs these produced.

## Related

- [[systems/project-brief]] — the product counterpart; what the game is and who it is for
- [[systems/game-overview]] — game-design reference
- [[systems/game-loop]] — the tick and turn-replay path in detail
- [[systems/execution-pipeline]] — intent → execution → GameUpdate
- [[systems/networking]] — worker routing and the WebSocket/HTTP surface
- [[systems/rendering]] — the layer model and camera
- [[systems/flashist-init]] — the bootstrap gate and degraded mode
- [[systems/telemetry]] — OTEL wiring and its gaps
- [[systems/player-profile-store]] — the profile/XP backend
- [[systems/player-infrastructure]] — the pre-S4 identity/customization substrate; carries R5's upstream `flares` dependency at the system level
- [[systems/configuration]] — `GAME_ENV`, `/api/env`, runtime config
- [[systems/server-performance]] — turn-cost analysis
- [[decisions/adr-101-fail-soft-xp-crediting]], [[decisions/adr-102-privilege-refresher-fails-open]], [[decisions/adr-103-identity-trust-seam]], [[decisions/adr-104-archiving-disabled]], [[decisions/adr-105-compact-maps-out-of-rotation]], [[decisions/adr-106-flags-suppressed]], [[decisions/adr-107-turn-interval-1-5x]] — the settled choices this survey surfaced
- [[decisions/sprint-backlog]] — the eleven unsprinted briefs, including the ones this survey's risks and open questions produced (`0005` R4, `0006`, `0007` R7, `0008` R5, `0009`)
