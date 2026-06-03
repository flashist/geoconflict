# Investigation — Lobby & Map Fetch Failures (s4c)

**Date:** 2026-06-03
**Task:** `ai-agents/tasks/backlog/s4c-investigate-lobby-map-fetch.md`
**Source telemetry:** `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md` (~9.3 errors/min combined)

## Error groups under investigation

| Error group | Rate | Root cause |
|---|---|---|
| `Error fetching lobbies: Failed to fetch` | 4.49/min | Client network abort × 1s poll spam |
| `Failed to load map data: Failed to fetch` | 4.33/min | Client network abort × bulk manifest fetch in map menu |
| `TerrainMapLoader: failed to load map "Iceland:Compact": Failed to fetch` | 0.29/min | Same client network abort (compact reuses base assets) |
| `Failed to load /maps/africa/manifest.json?v=0.0.131: Service Unavailable` | 0.11/min | nginx serves backend 503 verbatim (no cache rule for `.json`) |
| `Error fetching lobbies: Load failed` | 0.07/min | Safari wording for the same network abort |

## Findings

### 1. The 503 is an nginx config gap, not a missing asset
`nginx.conf` defines `proxy_cache` + `proxy_cache_use_stale ... http_503` rules for `.bin`,
images/`.webp`, `.js`, `.css`, and `.html`, but **had no rule for `.json`**. Map manifests
therefore fell through to the default `location /`, which has neither caching nor stale-serving,
so nginx returned the backend's transient 503 verbatim. A match cannot load without its manifest,
so this is user-visible.

**Live production check (2026-06-03):**
- `GET https://geoconflict.ru/maps/africa/manifest.json?v=0.0.135` → `200`, `Content-Length: 5202` (matches on-disk file).
- `GET .../maps/iceland/manifest.json` → `200`, `Content-Length: 1450`.
- `GET .../maps/iceland/map4x.bin` → `200`, **`X-Cache-Status: MISS`**.
- The manifest responses returned **no `X-Cache-Status` header at all**, while the `.bin` did —
  direct proof that `.bin` went through the cached location block and `.json` did not.

Assets are correctly deployed; the 503 is a purely intermittent backend hiccup that nginx was
passing straight through.

**Fix:** added `location ~* ^/maps/.+\.json$` in `nginx.conf` mirroring the `.bin` block
(`proxy_cache STATIC` + `proxy_cache_use_stale ... http_503`). Scoped to `/maps` so dynamic JSON
is unaffected; `?v=` keys each version in the cache separately.

### 2. `Failed to fetch` / `Load failed` are client-side network aborts, amplified by logging patterns
These are browser-level errors (offline, Yandex iframe, mobile, dropped connection — Chrome:
"Failed to fetch", Safari: "Load failed"), not backend faults. Two patterns inflated them into
the error stream:
- **`src/client/PublicLobby.ts`** polls `/api/public_lobbies` **every 1000ms** and logged
  `console.error` on every failed tick — and a single failure logged **twice** (once in
  `fetchLobbies`, again in `fetchAndUpdateLobbies`). A 30s outage = ~60 error logs.
- **`src/client/components/Maps.ts`** `MapDisplay.loadMapData()` fetches `manifest.json` for
  **every map** (~33) when the map-selection menu opens, so one blip throws many at once.

### 3. `console.error` is shipped to Uptrace as ERROR; `console.warn` is not
`src/client/OtelBrowserInit.ts` intercepts `console.error` and emits `SeverityNumber.ERROR`
(also `window.error` / `unhandledrejection`). `console.warn` is **not** captured (only the
explicit `logOtelWarn()` emits WARN). So downgrading expected transient aborts to `console.warn`
removes them from the error stream without losing local-console visibility.

### 4. Error context was insufficient
`src/core/game/FetchGameMapLoader.ts` reported `Failed to load ${url}: ${statusText}` for HTTP
errors (URL present, but **no numeric status code**), and a raw `fetch()` reject carried **no URL
at all** (bare `TypeError: Failed to fetch`). No retry existed.

### 5. Compact maps reuse base assets — the Sprint 4b worry is unfounded
`Iceland:Compact` loads `/maps/iceland/map4x.bin` + `map16x.bin` — the same files/dir as normal
Iceland (`TerrainMapLoader.ts`). `resources/maps/` contains only the 33 base map dirs; there are
no `*_compact` dirs and none are needed. The compact failures are the same network-abort issue.

### 6. Version string is healthy
`?v=` comes from `package.json.version` via `src/version.ts` (currently `0.0.135`). Telemetry's
`0.0.131` simply reflects the older 2026-05-07 build window — not a bug.

## Changes made

| File | Change |
|---|---|
| `nginx.conf` | New `^/maps/.+\.json$` location: cache + serve-stale-on-5xx for manifests |
| `src/core/game/FetchGameMapLoader.ts` | Single `fetchWithRetry` chokepoint: 2 retries w/ backoff on 5xx + network reject (no retry on 4xx); errors now include numeric status + URL, and network rejects include the URL |
| `src/client/PublicLobby.ts` | Removed double-log; dedupe to a single `console.warn` per outage (cleared on next success) instead of per-tick `console.error` |
| `src/client/components/Maps.ts` | Non-blocking thumbnail-fetch failure downgraded `console.error` → `console.warn` |
| `tests/core/game/FetchGameMapLoader.test.ts` | New: success, 404 (no retry), 503 (retry), network reject (retry), recover-on-retry |

`TerrainMapLoader.ts` deliberately keeps `console.error` for gameplay map-load failure (it is
user-blocking and should stay ERROR), now carrying the improved URL+status context and retry.

## Deploy note

There are two nginx layers. The **host** nginx (provisioned once by `setup.sh` into
`/etc/nginx/sites-available/geoconflict`) is a minimal `:80/:443 → 127.0.0.1:3000` proxy + SSL.
The repo's `nginx.conf` — where the caching rules and this `.json` fix live — is the **container**
nginx: `Dockerfile:73` does `COPY nginx.conf /etc/nginx/conf.d/default.conf`, and the container is
published as `-p 127.0.0.1:3000:80` (`update.sh:75`). Request flow:
`browser → host nginx → 127.0.0.1:3000 → container nginx (nginx.conf) → Node`.

Therefore the fix ships with the **normal image build/deploy** — no `setup.sh` re-run needed:
`build-deploy.sh <env>` → `build.sh` (`docker buildx build .` from the working tree, baking in the
current `nginx.conf`) → `deploy.sh` → `update.sh` (`docker pull` + recreate container). The new
container nginx starts with the updated config.

**Caveat:** commit `nginx.conf` before running `build-deploy.sh` — the build context is the working
tree (uncommitted changes are still included), but `build-deploy.sh` only auto-commits/tags
`package.json`, so an uncommitted `nginx.conf` would make the deployed image diverge from the tag.
The client code changes ship with the same image build.
