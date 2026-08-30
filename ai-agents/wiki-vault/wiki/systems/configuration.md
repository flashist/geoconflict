# Configuration

**Layer**: shared
**Key files**: `src/core/configuration/Config.ts`, `src/core/configuration/ConfigLoader.ts`, `src/core/configuration/DefaultConfig.ts`, `src/core/configuration/DevConfig.ts`, `src/core/configuration/PreprodConfig.ts`, `src/core/configuration/ProdConfig.ts`, `src/core/configuration/RuntimeConfig.ts`

## Summary

Shared runtime and gameplay configuration for Geoconflict. The system selects environment-specific server settings from `GAME_ENV`, fetches public server config for the browser through `/api/env`, and exposes deterministic gameplay constants through the `Config` / `ServerConfig` interfaces.

## Architecture

`Config.ts` defines the contract. `ServerConfig` covers environment, worker routing, auth, public host/protocol/port, the public profile API URL, JWT issuer/audience, storage, OTEL, AI-player settings, and deploy identifiers. `Config` covers gameplay values such as spawn timing, bot/nation setup, troop and gold rates, combat math, unit stats, cooldowns, nuke behavior, and theme access.

`ConfigLoader.ts` is the selection point. Server code reads `process.env.GAME_ENV` and maps `dev` to `DevServerConfig`, `staging` to `preprodConfig`, and `prod` to `prodConfig`. Browser code calls `/api/env`, stores public runtime overrides with `setRuntimeConfig()`, then builds either `DevConfig` or `DefaultConfig` based on `GameEnv`.

`DefaultConfig.ts` contains the shared baseline for production and staging gameplay. `DevConfig.ts` changes development-only server behavior, including two workers, fast game creation, enabled AI players, and obvious dummy admin/API tokens. `PreprodConfig.ts` and `ProdConfig.ts` mainly specialize environment, worker count, audience defaults, and production AI-player enablement.

## Gotchas / Known Issues

- `GAME_ENV` must be one of `dev`, `staging`, or `prod`; unsupported values throw during config load.
- Browser config depends on `/api/env`. Missing `gameEnv` / `game_env` in that response is a hard startup error.
- Public URL and JWT settings can come from runtime config first, then process environment, then environment-specific defaults. This fallback chain is useful for deploys but can hide stale environment values if not checked explicitly.
- ✅ **Production `/api/env` now advertises `https` on the apex domain** (task `0063`, deployed 2026-08-29 in release `362a2f9`). It previously advertised **`http` on a raw IP**, and the client could not recover: `ensureAbsoluteUrl` in `src/client/jwt.ts` returns the value **unchanged** when it already matches `^https?://`, so `getApiBase()`'s protocol-upgrade fallback never fires once the config carries a scheme. ⚠️ **`publicPort`, `jwtIssuer` and `jwtAudience` were elided from the captured response body**, so only `publicProtocol` / `publicHost` / `apiBaseUrl` are evidenced in the task record. See [[tasks/prod-api-env-https-apex]].
- ⚠️ **`ProdConfig.ts` still defaults `jwtAudience()` to the upstream placeholder `"openfront.io"`** when unset — an OpenFront value in this project's production auth path. Flagged by `0063` rather than silently changed, because altering an audience value can invalidate live tokens. Nothing consumes it today (there is no auth service in this deployment), which is why it is a hygiene item and not a defect.
- ⚠️ **`Matchmaking.ts` builds `new WebSocket(\`${config.jwtIssuer()}/matchmaking/join\`)` and is latent-broken.** The WebSocket constructor requires a `ws:`/`wss:` scheme, so an `https://` issuer throws a synchronous `SyntaxError` exactly as the old `http://` one did — fixing the config did **not** fix this line. It is currently unreachable (no caller of `MatchmakingModal.open()` exists) and was deliberately left recorded rather than repaired.
- `DevServerConfig` contains intentionally unsafe dummy credentials and must not be used as a production security model.
- Production and staging use `DefaultConfig` for gameplay; environment-specific differences live in `ServerConfig` unless a `Config` subclass overrides behavior.

## Related

- [[systems/game-overview]] — gameplay constants and mode behavior that configuration controls
- [[systems/project-operations]] — environment boundaries and deploy workflow
- [[systems/networking]] — worker routing and public endpoint configuration
- [[systems/telemetry]] — OTEL endpoint and production-only observability configuration
- [[tasks/cosmetics-serving]] — same-origin and internal-origin handling for the optional cosmetics config endpoint
- [[tasks/profile-api-url-config]] — public profile-service URL resolution and `/api/env` exposure
- [[tasks/profile-game-server-deploy-env]] — deploy-time propagation that makes `PROFILE_API_URL` visible in real game-server containers
- [[systems/player-profile-store]] — service that consumes the public profile API URL
- [[systems/architecture-overview]] — where the config accessors sit in the wider survey
- [[decisions/config-parity-failure-class]] — the recurring class where a deploy pipeline never forwards a variable the application needs (`0062`, `0063`, `0195`)
- [[tasks/prod-api-env-https-apex]] — task `0063`, the `/api/env` protocol/host fix now live in production
