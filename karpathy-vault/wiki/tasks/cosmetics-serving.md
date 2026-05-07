# Cosmetics Serving and Fetch Noise

**Source**: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md`
**Status**: done
**Sprint/Tag**: Sprint 4c / stabilization

## Goal

Restore the production `/cosmetics.json` endpoint and remove repeated cosmetics-related telemetry noise while preserving the intended fail-open behavior for optional cosmetics.

## Key Changes

- Added `src/server/CosmeticsConfig.ts` to normalize the legacy bundled `resources/cosmetics/cosmetics.json` into the runtime `CosmeticsSchema` shape.
- Added `GET /cosmetics.json` in `src/server/Master.ts`, before the SPA fallback, so production returns JSON instead of a 404 HTML page.
- Changed worker-side `PrivilegeRefresher` construction to fetch the internal master endpoint (`MASTER_INTERNAL_ORIGIN` or the default `http://127.0.0.1:3000`) for `/cosmetics.json`, so server entitlement checks use the game master's normalized config instead of the external `JWT_ISSUER` host.
- Changed `src/server/PrivilegeRefresher.ts` so failed refreshes do not rethrow from timer callbacks; repeated failures are deduplicated and the fail-open checker remains active.
- Changed `src/client/Cosmetics.ts` so optional cosmetics fetch failures return `null` with deduplicated `console.warn` entries instead of repeated `console.error` noise.
- Changed client cosmetics loading to request same-origin `/cosmetics.json` instead of `getApiBase() + "/cosmetics.json"` so HTTPS/Yandex builds do not fetch the raw HTTP VPS IP and trigger browser mixed-content blocking.
- Added a local webpack dev-server proxy for `/cosmetics.json` to the server on port 3000.
- Added focused tests for cosmetics normalization, `PrivilegeRefresher` failure handling, and client warning deduplication.

## Outcome

The game server now owns a valid root `/cosmetics.json` response from the bundled resource, and endpoint failures no longer create repeating unhandled rejection/error groups. Cosmetics remain optional: the server continues fail-open, and the client continues falling back to no cosmetics when the endpoint is unavailable.

## Related

- [[systems/telemetry]]
- [[systems/configuration]]
- [[decisions/sprint-4c]]
