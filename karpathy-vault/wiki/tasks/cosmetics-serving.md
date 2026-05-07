# Cosmetics Serving and Fetch Noise

**Source**: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md`
**Status**: done
**Sprint/Tag**: Sprint 4c / stabilization

## Goal

Restore the production `/cosmetics.json` endpoint and remove repeated cosmetics-related telemetry noise while preserving the intended fail-open behavior for optional cosmetics.

## Key Changes

- Added `src/server/CosmeticsConfig.ts` to normalize the legacy bundled `resources/cosmetics/cosmetics.json` into the runtime `CosmeticsSchema` shape.
- Added `GET /cosmetics.json` in `src/server/Master.ts`, before the SPA fallback, so production returns JSON instead of a 404 HTML page.
- Changed `src/server/PrivilegeRefresher.ts` so failed refreshes do not rethrow from timer callbacks; repeated failures are deduplicated and the fail-open checker remains active.
- Changed `src/client/Cosmetics.ts` so optional cosmetics fetch failures return `null` with deduplicated `console.warn` entries instead of repeated `console.error` noise.
- Added focused tests for cosmetics normalization, `PrivilegeRefresher` failure handling, and client warning deduplication.

## Outcome

The game server now owns a valid root `/cosmetics.json` response from the bundled resource, and endpoint failures no longer create repeating unhandled rejection/error groups. Cosmetics remain optional: the server continues fail-open, and the client continues falling back to no cosmetics when the endpoint is unavailable.

## Related

- [[systems/telemetry]]
- [[systems/configuration]]
