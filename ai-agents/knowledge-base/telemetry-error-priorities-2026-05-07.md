# Telemetry Error Priorities - 2026-05-07

## Summary

This investigation reviewed the Uptrace production error table for the 1-hour window from 2026-05-07 11:57:13 UTC to 2026-05-07 12:57:13 UTC (14:57:13 to 15:57:13 Moscow time).

The highest-value work is not the single highest raw error string, but the recurring error families that either break user-visible flows or obscure the signal in telemetry:

1. Cosmetics fetch/config failures: about 138.6 error logs/min combined.
2. Singleplayer/local hash crash: about 31.0 error logs/min combined.
3. Archive failures: about 26.6 error logs/min combined.
4. Public lobby/map fetch failures: about 9.3 error logs/min combined.

Uptrace is production-only for this project. The rate values below are from Uptrace error/fatal logs grouped by `_group_id`; duplicate browser/runtime wording is grouped manually into likely root-cause families.

## Priority Tasks

### 1. Fix cosmetics.json serving and reduce cosmetics fetch log noise

**Rate:** about 138.6/min combined.

Observed groups:

- `TypeError: Error getting cosmetics: Failed to fetch` - 99.12/min
- `unhandled rejection at: Error: HTTP error! status: 404 at PrivilegeRefresher.loadPrivilegeChecker` - 12.90/min
- `TypeError: Error getting cosmetics: Load failed` - 12.37/min
- `Failed to fetch cosmetics from http://91.197.98.116/cosmetics.json: Error: HTTP error! status: 404` - 6.45/min
- `SyntaxError: Error getting cosmetics: Unexpected token '<', "<!doctype "... is not valid JSON` - 3.40/min
- `TypeError: Error getting cosmetics: NetworkError when attempting to fetch resource.` - 2.99/min
- `SyntaxError: Error getting cosmetics: The string did not match the expected pattern.` - 1.13/min
- `SyntaxError: Error getting cosmetics: JSON.parse: unexpected character at line 1 column 1` - 0.25/min

**Description:** Both client and server are trying to load cosmetics data and frequently fail. The server-side `PrivilegeRefresher` fetches `config.jwtIssuer() + "/cosmetics.json"` and receives 404. Client-side `fetchCosmetics()` also logs failures and invalid JSON cases, including HTML responses parsed as JSON.

**Severity:** Medium-high. The game can probably continue because the privilege checker is designed to fail open and client cosmetics return `null`, but this affects cosmetics/player identity presentation and floods telemetry heavily enough to hide more important errors.

**Difficulty:** Low to medium. Likely a deployment/config/static routing issue plus log-throttling/handling cleanup.

**Likely code areas:**

- `src/client/Cosmetics.ts` - client `fetchCosmetics()`.
- `src/server/PrivilegeRefresher.ts` - server fetch and refresh behavior.
- `src/server/Worker.ts` - static file serving and API host behavior.
- Deployment/static asset config for `cosmetics.json`.

**Recommended handling:**

- Verify where `resources/cosmetics/cosmetics.json` or equivalent output should be served in production.
- Ensure `config.jwtIssuer() + "/cosmetics.json"` returns valid JSON with the expected schema.
- Stop throwing from `PrivilegeRefresher.loadPrivilegeChecker()` after logging; the interval callback currently creates an unhandled rejection on every failed refresh.
- Consider reducing client `console.error` severity for expected optional cosmetics fetch failures, or deduplicate/report them with context.

**Acceptance checks:**

- `GET <api-base>/cosmetics.json` returns `200` and valid cosmetics JSON in production.
- `PrivilegeRefresher` failure path keeps fail-open behavior without creating unhandled rejections.
- The combined cosmetics error rate falls near zero after deployment.

### 2. Guard singleplayer/local hash recording against missing turns

**Rate:** about 31.0/min combined.

Observed groups:

- `TypeError: Cannot set properties of undefined (setting 'hash')` - 9.59/min
- `TypeError: Cannot set properties of undefined (setting 'hash')` - 9.56/min
- `Uncaught TypeError: Cannot set properties of undefined (setting 'hash') [object Object]` - 9.15/min
- Safari-style `undefined is not an object (evaluating 'this.turns[e.turnNumber].hash=e.hash')` groups - 2.22/min combined
- `Uncaught TypeError: Cannot set properties of undefined (setting 'hash') YandexSDKLogError [object Object]` - 0.44/min

**Description:** `LocalServer.onMessage()` handles hash messages by writing `this.turns[clientMsg.turnNumber].hash = clientMsg.hash` every 100 turns. In production, hash messages sometimes reference a turn index that is not present in `this.turns`, causing a client-side TypeError.

**Severity:** High. This is a direct runtime crash path in singleplayer/local game execution. It can break a match even though the server remains healthy.

**Difficulty:** Low for a defensive fix; medium if the underlying turn/hash ordering bug needs full root-cause tracing.

**Likely code area:**

- `src/client/LocalServer.ts`, around hash handling in `onMessage()`.

**Recommended handling:**

- Add a guard before assigning `hash`: if the turn is missing, log a bounded warning with turn number/current turn count and return.
- Investigate why a hash can arrive before the corresponding local turn exists. Plausible causes are async turn processing, replay/local-server timing, or duplicate/stale hash messages.
- Avoid logging this as an unhandled/uncaught error after the guard.

**Acceptance checks:**

- A hash for a missing turn does not throw.
- Existing hash verification/replay behavior still works.
- The hash crash groups disappear from Uptrace.

### 3. Fix archive endpoint/config failures and singleplayer archive body limits

**Rate:** about 26.6/min combined.

Observed groups:

- `error archiving game record (gameID: ...): Not Found` - 16.29/min
- `TypeError: Failed to archive singleplayer game: Failed to fetch` - 9.64/min
- `Error in POST /api/archive_singleplayer_game: PayloadTooLargeError: request entity too large` - 0.64/min

**Description:** Multiplayer/full game archival is posting to the external archive endpoint and receiving `Not Found`. Singleplayer archival is also failing client-side, and some compressed uploads exceed the current Express JSON body limit. The worker currently uses default `express.json()` globally.

**Severity:** Medium-high. The live match can complete, but match history/replay/debugging data is lost or incomplete. This directly weakens future bug investigations and player support.

**Difficulty:** Medium. It likely spans server config, archive service routing, and request-size handling. The body-limit fix itself is small.

**Likely code areas:**

- `src/server/Archive.ts` - posts full records to `${config.jwtIssuer()}/game/{gameID}`.
- `src/server/Worker.ts` - `/api/archive_singleplayer_game` route and `express.json()` setup.
- `src/client/LocalServer.ts` - compressed singleplayer archive upload.
- Production archive/JWT issuer service routing.

**Recommended handling:**

- Confirm `config.jwtIssuer()` in production points at the archive service that owns `POST /game/:gameID`.
- Log archive response status code and short body safely; `statusText` alone reports `Not Found` but not enough routing detail.
- Add a route-scoped or global JSON limit appropriate for compressed singleplayer archives, for example `express.json({ limit: "10mb" })` if validated against expected payload sizes.
- Consider awaiting `archive(finalizeGameRecord(gameRecord))` in `/api/archive_singleplayer_game` if the endpoint should reflect archive success instead of fire-and-forget.

**Acceptance checks:**

- Production archive POSTs return success for multiplayer and singleplayer records.
- Oversized singleplayer archive requests either succeed within a documented limit or fail with an explicit, user-invisible, low-noise server log.
- Uptrace archive `Not Found` and payload-too-large groups disappear or drop sharply.

### 4. Investigate public lobby and map fetch failures

**Rate:** about 9.3/min combined.

Observed groups:

- `TypeError: Error fetching lobbies: Failed to fetch` - 4.49/min
- `TypeError: Failed to load map data: Failed to fetch` - 4.33/min
- `TypeError: TerrainMapLoader: failed to load map "Iceland:Compact": Failed to fetch` - 0.29/min
- `Error: Failed to load map data: Failed to load /maps/africa/manifest.json?v=0.0.131: Service Unavailable` - 0.11/min
- `TypeError: Error fetching lobbies: Load failed` - 0.07/min

**Description:** Clients intermittently fail to fetch lobby lists and terrain map data. This may be network turbulence, CDN/static-host availability, or stale-build/static-asset routing. The map failures are user-facing because a match cannot start or render correctly without map data.

**Severity:** Medium. Individual players can fail to enter or load matches, but the error family is lower rate than cosmetics/hash/archive.

**Difficulty:** Medium. Requires distinguishing client network loss from server/static availability. If caused by missing assets or service routing, it is likely straightforward; if caused by mobile network/iframe environment, it needs graceful degradation and retry policy.

**Likely code areas:**

- `src/client/PublicLobby.ts` - lobby polling/fetch errors.
- `src/core/game/TerrainMapLoader.ts` and map loader implementations.
- Static map asset deployment under `/maps/...`.
- Build/version cache behavior for static assets.

**Recommended handling:**

- Check production availability of the failing map manifests directly, especially `/maps/africa/manifest.json?v=0.0.131`.
- Add status-code/body context to map load errors where available.
- For lobby fetch failures, distinguish HTTP failure from network abort/offline and reduce logging for expected transient failures.
- Add retry/backoff for map manifest fetches if not already present.

**Acceptance checks:**

- Known map manifest URLs return `200` from production.
- A transient lobby fetch failure does not spam `console.error` every poll.
- Map load failures include enough context to distinguish 404, 503, stale asset, and network abort.

### 5. Triage client null-id/null-object errors

**Rate:** about 1.8/min combined across visible groups.

Observed groups:

- `TypeError: e is null` groups - about 1.02/min combined
- `TypeError: null is not an object (evaluating 'a.id')` groups - about 0.40/min combined
- `TypeError: Cannot read properties of null (reading 'id')` groups - about 0.36/min combined
- `Unhandled rejection: null is not an object (evaluating 'a.id')` - 0.15/min
- Related lower-rate `null has no properties` groups - about 0.16/min combined

**Description:** These are minified client errors, so the current telemetry view does not identify the original source file/function. They are low-volume compared with the top clusters but probably represent real client-side state assumptions.

**Severity:** Medium. Any uncaught null access can break a specific UI flow, but current evidence does not show which feature is affected.

**Difficulty:** Medium to high unless source maps or better error context are available in Uptrace.

**Likely code areas:**

- Unknown from current grouped messages. Needs source maps, stack traces, or reproduction.

**Recommended handling:**

- Confirm whether production client source maps are uploaded/available to Uptrace or whether stack traces include release/source mapping.
- Add contextual error boundaries/log fields around high-risk Yandex/player-profile/leaderboard flows if source maps are not available.
- Triage after the high-rate known clusters are fixed, because current telemetry is too noisy.

**Acceptance checks:**

- Uptrace shows unminified stack traces or enough contextual metadata for these errors.
- At least one specific source path and user flow is identified before code changes are attempted.

### 6. Handle mobile memory/WebGL rendering failures as a separate performance task

**Rate:** about 0.4/min combined visible groups.

Observed groups:

- `RangeError: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': Out of memory at ImageData creation` - 0.22/min combined
- `Uncaught RangeError: Failed to execute 'getImageData'... YandexSDKLogError` - 0.07/min
- `Uncaught RangeError: Failed to execute 'createImageData'... Out of memory` - lower than the visible cutoff but present in prior table
- `This browser does not support WebGL. Try using the canvas renderer` and `bindFramebuffer` failures - about 0.2/min combined

**Description:** These errors suggest low-memory devices or unsupported/unstable graphics contexts. They are not the highest volume, but they are likely correlated with the mobile crash/abandonment problem.

**Severity:** Medium-high for affected users, especially mobile; lower global priority due to lower observed rate.

**Difficulty:** High. Rendering memory issues usually require profiling, asset-size reduction, fallback behavior, and device-specific testing.

**Likely code areas:**

- `src/client/graphics/**`
- Terrain/map rendering and minimap/image-data code paths.
- Mobile performance settings and renderer fallback logic.

**Recommended handling:**

- Treat as a dedicated mobile stability/performance task, not a quick telemetry cleanup.
- Capture device/browser/OS in error context where possible.
- Prefer graceful fallback to canvas/no-effects mode when WebGL is unavailable or context creation fails.

**Acceptance checks:**

- Known low-memory/WebGL-unavailable environments show a fallback UI or reduced renderer instead of uncaught errors.
- Error logs include device/browser context.

## Lower-Priority Or External/Expected Noise

These should not be the first fix targets unless they grow:

- Yandex SDK initialization/load errors (`Get external iframe timeout`, `load sdk file error`): likely platform/network/environment dependent. Rate about 0.8/min across visible groups.
- Leaderboard score error (`Player is not present in leaderboard`): about 0.47/min. Worth handling defensively, but not blocking core gameplay.
- MetaMask connection errors: about 0.2/min. Likely unrelated browser extension noise unless the app intentionally integrates wallet flows.
- Missing animated sprite logs (`MiniSmoke`, `Tornado`, `Tentacle`, `Shark`): low rate. Verify assets, but these are less critical than crashes/archive/cosmetics.
- `attempting reconnect` and `Socket encountered error`: may be expected network behavior. Reclassify or throttle if they are not actionable errors.

## Recommended Fix Order

1. Cosmetics serving plus `PrivilegeRefresher` failure handling. This removes the largest noise source and fixes a live feature/config issue.
2. `LocalServer` hash guard. This is a direct client crash with a small likely fix.
3. Archive endpoint and body limit. This protects match history and debugging data.
4. Map/lobby fetch diagnostics and retry/noise reduction.
5. Source-map/context improvement for minified null errors.
6. Mobile rendering memory/WebGL fallback work.

## Notes For Future Telemetry Quality

- Several client errors are grouped by minified message only. Uploading source maps or adding release/source context would make future triage much faster.
- Grouped browser variants should be reviewed as error families, not individual `_group_id` rows.
- Some expected transient network events should use lower-severity logging or rate limiting, otherwise they compete with real gameplay crashes in Uptrace.
