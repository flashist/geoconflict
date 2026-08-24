# Task — Profile Backend Infra: Client-facing `profileApiUrl` via /api/env (T4b)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D, config/secrets). Sub-task of `s4-profile-04-backend-infra.md` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
Medium — fully independent, zero deploy surface. Mergeable at any point in the order.

## Depends on
None.

## Blocks
None.

## Context
Thread a client-exposed `profileApiUrl` through the existing `GAME_ENV` + layered `.env.secret` config system and the `/api/env` response, exposing **only the resolved value, never the raw env**. The value is intentionally consumer-less within T4 (the client UI that reads it is a later sprint) — inert plumbing, parallel to the laid-down-but-unconsumed `DATABASE_URL`/`PROFILE_INTERNAL_TOKEN` secrets, **not** dead code and **not** absent-consumer hardening.

## Scope
- `Config.ts`: add `profileApiUrl(): string` to the `ServerConfig` interface.
- `DefaultConfig.ts`: implement — `runtimeConfig().profileApiUrl` (trimmed) wins → else `process.env.PROFILE_API_URL` (trimmed) → else `""`. Only the resolved value is exposed; raw env never sent.
- `RuntimeConfig.ts`: add `profileApiUrl?: string` to `RuntimeConfigData`.
- `ConfigLoader.ts`: `getServerConfigFromClient` maps `config.profileApiUrl ?? config.profile_api_url` (camel + snake).
- `Master.ts`: add `profileApiUrl: config.profileApiUrl()` to the `/api/env` response object.
- `example.env`: document `PROFILE_API_URL=` (game-server env).
- `tests/util/TestServerConfig.ts`: add the `profileApiUrl` stub so existing config tests compile.
- Confirm no `webpack.config.js` change is needed — `/api/env` is already proxied (`webpack.config.js` context array). Add `/api/*` plumbing only if a new route is introduced (it is not).
- Inline note: the exposed value has **no in-T4 consumer by design**.

## Out of scope
- The box-side `PROFILE_API_URL` env consumed by build-deploy (lives in `example.env.profile`, T4e).
- `DATABASE_URL` / `PROFILE_INTERNAL_TOKEN` provisioning (T4e).
- Any client UI that renders/uses `profileApiUrl` (later sprint).

## Acceptance criteria (defined up front)
- `DevServerConfig().profileApiUrl()` returns `""` by default, the trimmed `PROFILE_API_URL` when set, and the runtime-override value when both are present (runtime beats env) — `ProfileApiUrlConfig.test.ts` (6 cases).
- A blank/whitespace `PROFILE_API_URL` resolves to `""` (not whitespace).
- The `/api/env` response includes `profileApiUrl` set to `config.profileApiUrl()` (unit/contract assertion on Master's env object).
- Only the resolved string is in the response; `process.env.PROFILE_API_URL` is never serialized raw (review + resolution test).
- `npm run lint` and `npm test` pass; `ProfileApiUrlConfig.test.ts` is green.

## Threat model
Low surface. The only concern is leaking an unintended env value to the client — mitigated by construction (`DefaultConfig` resolves to a single trimmed string; Master serializes that resolved value only). No secret involved (`PROFILE_API_URL` is a public subdomain URL). `DATABASE_URL`/`PROFILE_INTERNAL_TOKEN` are not touched. Exposed-but-unconsumed is benign inert plumbing, not absent-consumer hardening.

## Review budget
1 round.

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:src/core/configuration/{Config,DefaultConfig,RuntimeConfig,ConfigLoader}.ts`
- `git show 4e56fbf:src/server/Master.ts`
- `git show 4e56fbf:tests/server/ProfileApiUrlConfig.test.ts`, `git show 4e56fbf:tests/util/TestServerConfig.ts`, `git show 4e56fbf:example.env`

## Independent test
`npm test -- tests/server/ProfileApiUrlConfig.test.ts` (mocks `jose` for ESM) — 6 cases green; unit assertion on the `/api/env` builder. Fully verifiable on the dev host with no VPS and no Docker.
