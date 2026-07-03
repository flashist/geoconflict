# Investigate Lobby and Map Fetch Failures

**Source**: `ai-agents/tasks/done/s4c-investigate-lobby-map-fetch.md`, `ai-agents/knowledge-base/lobby-map-fetch-investigation-2026-06-03.md`
**Status**: done
**Sprint/Tag**: Sprint 4c — Production Stabilization

## Goal

Explain and reduce the Sprint 4c production error groups around public lobby polling and terrain map loading, especially generic browser fetch aborts and intermittent `503 Service Unavailable` responses for map manifests.

## Key Changes

- `nginx.conf` now has a `^/maps/.+\.json$` location that mirrors the cached `.bin` static-asset path, including `proxy_cache STATIC` and serving stale cached manifests on backend 5xx responses.
- `src/core/game/FetchGameMapLoader.ts` routes map fetches through one retry chokepoint with backoff for 5xx and network rejects, no retry for 4xx, and improved errors that include numeric status and URL.
- `src/client/PublicLobby.ts` no longer double-logs each lobby polling failure. It emits one `console.warn` per outage and clears the state on the next success.
- `src/client/components/Maps.ts` downgrades non-blocking thumbnail/map-menu fetch failures from `console.error` to `console.warn`.
- `tests/core/game/FetchGameMapLoader.test.ts` covers success, 404/no retry, 503 retry, network reject retry, and recover-on-retry behavior.

## Outcome

The investigation split the error groups into two causes:

- The `503` map-manifest failure was an nginx caching gap, not a missing asset. Production checks showed manifest files existed and returned `200`, but manifest responses lacked the `X-Cache-Status` header that `.bin` responses had, proving `.json` did not pass through the static cache rule.
- `Failed to fetch` and Safari `Load failed` groups were browser/network aborts amplified by logging patterns. Public-lobby polling ran every second and previously logged each failed tick as `console.error`; opening the map menu fetched many manifests at once, so one network blip produced many errors.

Compact map failures were not a separate asset-deployment problem: `Iceland:Compact` reuses the base `/maps/iceland/map4x.bin` and `/maps/iceland/map16x.bin` files, and no `*_compact` directory is required.

Deploying this fix uses the normal image build/deploy path. The relevant nginx config is the container nginx copied from repo `nginx.conf`, not the host nginx installed by `setup.sh`. The source cautions that `nginx.conf` should be committed before `build-deploy.sh` so the tagged image and git history do not diverge.

## Related

- [[systems/telemetry]]
- [[decisions/sprint-4c]]
