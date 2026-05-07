# Configuration

**Layer**: shared
**Key files**: `src/core/configuration/Config.ts`, `src/core/configuration/ConfigLoader.ts`, `src/core/configuration/DefaultConfig.ts`, `src/core/configuration/DevConfig.ts`, `src/core/configuration/PreprodConfig.ts`, `src/core/configuration/ProdConfig.ts`, `src/core/configuration/RuntimeConfig.ts`

## Summary

Shared runtime and gameplay configuration for Geoconflict. The system selects environment-specific server settings from `GAME_ENV`, fetches public server config for the browser through `/api/env`, and exposes deterministic gameplay constants through the `Config` / `ServerConfig` interfaces.

## Architecture

`Config.ts` defines the contract. `ServerConfig` covers environment, worker routing, auth, public host/protocol/port, JWT issuer/audience, storage, OTEL, AI-player settings, and deploy identifiers. `Config` covers gameplay values such as spawn timing, bot/nation setup, troop and gold rates, combat math, unit stats, cooldowns, nuke behavior, and theme access.

`ConfigLoader.ts` is the selection point. Server code reads `process.env.GAME_ENV` and maps `dev` to `DevServerConfig`, `staging` to `preprodConfig`, and `prod` to `prodConfig`. Browser code calls `/api/env`, stores public runtime overrides with `setRuntimeConfig()`, then builds either `DevConfig` or `DefaultConfig` based on `GameEnv`.

`DefaultConfig.ts` contains the shared baseline for production and staging gameplay. `DevConfig.ts` changes development-only server behavior, including two workers, fast game creation, enabled AI players, and obvious dummy admin/API tokens. `PreprodConfig.ts` and `ProdConfig.ts` mainly specialize environment, worker count, audience defaults, and production AI-player enablement.

## Gotchas / Known Issues

- `GAME_ENV` must be one of `dev`, `staging`, or `prod`; unsupported values throw during config load.
- Browser config depends on `/api/env`. Missing `gameEnv` / `game_env` in that response is a hard startup error.
- Public URL and JWT settings can come from runtime config first, then process environment, then environment-specific defaults. This fallback chain is useful for deploys but can hide stale environment values if not checked explicitly.
- `DevServerConfig` contains intentionally unsafe dummy credentials and must not be used as a production security model.
- Production and staging use `DefaultConfig` for gameplay; environment-specific differences live in `ServerConfig` unless a `Config` subclass overrides behavior.

## Related

- [[systems/game-overview]] — gameplay constants and mode behavior that configuration controls
- [[systems/project-operations]] — environment boundaries and deploy workflow
- [[systems/networking]] — worker routing and public endpoint configuration
- [[systems/telemetry]] — OTEL endpoint and production-only observability configuration
