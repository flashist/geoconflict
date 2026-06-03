# Task — Investigate Lobby and Map Fetch Failures

## Sprint
Sprint 4c — Stabilization

## Priority
Medium — ~9.3 errors/min. Intermittent failures prevent players from entering or loading matches.

---

## Context

Clients intermittently fail to fetch lobby lists and terrain map data. Some failures show specific HTTP statuses (503 Service Unavailable); others are generic network aborts. At least one map asset (`/maps/africa/manifest.json`) has returned 503 in production, which is user-visible: a match cannot load without map data.

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `TypeError: Error fetching lobbies: Failed to fetch` | 4.49/min |
| `TypeError: Failed to load map data: Failed to fetch` | 4.33/min |
| `TypeError: TerrainMapLoader: failed to load map "Iceland:Compact": Failed to fetch` | 0.29/min |
| `Error: Failed to load map data: Failed to load /maps/africa/manifest.json?v=0.0.131: Service Unavailable` | 0.11/min |
| `TypeError: Error fetching lobbies: Load failed` | 0.07/min |

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## Investigation

Before making code changes, determine the cause of each failure type:

### 1. Static map asset availability

- Directly verify that known-failing map manifest URLs are available and return `200` in production. Check: `/maps/africa/manifest.json?v=0.0.131`, `/maps/iceland_compact/manifest.json` (or equivalent compact map path).
- A 503 is a server/CDN availability issue, not a client bug. If assets are missing or the static server is intermittently unavailable, this is a deployment/infrastructure fix, not a code fix.
- Check whether compact map assets introduced in Sprint 4b were fully deployed alongside the code changes.

### 2. Lobby fetch failure type

- Distinguish HTTP error from network abort/offline. `Failed to fetch` and `Load failed` are browser-level network errors (can be offline, CORS, timeout, or connection refused). Determine if these are transient user-network issues or if the lobby endpoint itself is intermittently down.
- Check the lobby polling interval and whether repeated failures are generating multiple log entries per incident.

### 3. Error context quality

- Current errors lack enough context to distinguish 404 vs 503 vs network abort in map load failures.
- Add HTTP status code and URL to map load error messages in `src/core/game/TerrainMapLoader.ts` where not already present.
- For lobby fetch failures in `src/client/PublicLobby.ts`, confirm whether a transient failure already retries or whether a single failure is terminal.

---

## What to Build

Conditional on investigation findings:

**If static assets are missing/misconfigured:**
- Fix the deployment to ensure all map manifests are served at the expected paths with correct cache-busting version strings.

**If lobby/map fetch errors are transient network issues:**
- Add retry with backoff for map manifest fetches if not already present.
- Reduce log severity for expected transient failures (downgrade from `console.error` to `console.warn` for recoverable network aborts in the lobby poll path).

**Regardless:**
- Add HTTP status code to all map load error messages so future Uptrace entries are actionable without manual reproduction.

---

## Verification

1. Known map manifest URLs (including compact map variants) return `200` from production.
2. A transient lobby fetch failure does not produce a `console.error` on every poll tick.
3. Map load failures logged to Uptrace include HTTP status code and full URL.
4. The `Failed to load map data` error groups drop significantly or disappear from Uptrace after fixes.

---

## Notes

- Investigation findings must be documented before implementation scope is locked. If the root cause is a deployment gap rather than a code bug, the "code change" is minimal.
- The Iceland:Compact failure is particularly relevant given Sprint 4b's compact map work — verify those assets are in the deployment manifest.
