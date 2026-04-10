# HF-11b — Stale Build Sessions: Version Endpoint

## Priority
High. Depends on HF-11a (investigation) being complete. Unblocks HF-11c.

## Context

HF-11a confirmed the root cause of stale build sessions. This task adds the lightweight server-side endpoint that the client will use to check whether it is running the current build. This is a pure server-side change — no client code is touched here.

## What to Build

Add a single endpoint to the game server:

```
GET /api/version
Response: { "build": "0.0.118" }
```

The `build` value must always reflect the currently running server build — the same `BUILD_NUMBER` constant used for GameAnalytics custom dimension (HF-7).

**Cache headers — critical:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

If this endpoint is cached by Yandex CDN or the browser, the version polling in HF-11c becomes useless. These headers are not optional.

**Implementation notes:**
- This should be a minimal endpoint — no authentication, no database lookup, just returns the build constant
- Add it to the same HTTP server that handles other `/api/*` routes
- The endpoint must be available at all times — it should not require an active match or player session

## Verification

1. `GET /api/version` returns `{ "build": "CURRENT_BUILD_NUMBER" }` with correct build value
2. Response headers include `Cache-Control: no-cache, no-store, must-revalidate` — verify in browser DevTools
3. After deploying a new build, the endpoint immediately returns the new build number
4. Endpoint responds within 50ms — it is a constant lookup, not a database query

## Notes

- This endpoint will be called every 5 minutes per connected client session plus once on startup and on tab focus — at current scale (~4,500 DAU) this is negligible server load
- The endpoint does not need to be versioned or authenticated — the build number is not sensitive information
