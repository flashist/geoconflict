# Plan: Fix Archive Endpoint Failures and Singleplayer Body Limit

## Context

Three production error groups are silently discarding match history and replay data:

| Error | Rate |
|---|---|
| `error archiving game record (gameID: ...): Not Found` | 16.29/min |
| `TypeError: Failed to archive singleplayer game: Failed to fetch` | 9.64/min |
| `Error in POST /api/archive_singleplayer_game: PayloadTooLargeError` | 0.64/min |

Root causes identified from code inspection:

1. **Archive.ts** uses `config.jwtIssuer()` as the archive base URL, but `jwtIssuer()` points to the auth/JWT service — not the game record storage service. `config.apiBaseUrl()` already exists in the Config interface with its own `API_BASE_URL` env var override, and is the correct base to use. The error log also only captures `response.statusText`, losing the status code and response body.

2. **Worker.ts** registers `app.use(express.json())` globally with the default 100 KB limit. Singleplayer records (gzip-compressed) can exceed this, causing 413 before the route handler ever runs.

3. **LocalServer.ts** uses `keepalive: true` on the archive `fetch()`. Browsers (Chrome/Chromium) cap keepalive request bodies at 64 KB; any compressed record larger than that immediately throws `TypeError: Failed to fetch` on the client side, regardless of the server body limit. The error is also logged at `console.error` despite archive being non-critical.

---

## Implementation

### 1. `src/server/Archive.ts`

**Lines 24 and 51** — switch URL base from `config.jwtIssuer()` to `config.apiBaseUrl()`:

```ts
// line 24 (archive POST)
const url = `${config.apiBaseUrl()}/game/${gameRecord.info.gameID}`;

// line 51 (readGameRecord GET)
const url = `${config.apiBaseUrl()}/game/${gameId}`;
```

`apiBaseUrl()` is already on the `Config` interface (`src/core/configuration/Config.ts:56`) and implemented in `DefaultConfig.ts:142–151`. It checks `API_BASE_URL` env var and falls back to `jwtIssuer()`, so no config change is needed in non-overriding environments — but it provides the ops team the correct knob to point archive at a separate host.

**Line 34** — improve the error log to include status code and a safe body excerpt:

```ts
const body = await response.text().catch(() => "");
log.error(
  `error archiving game record (gameID: ${gameRecord.info.gameID}): ` +
  `HTTP ${response.status} ${response.statusText} — ${body.slice(0, 200)}`
);
```

### 2. `src/server/Worker.ts`

**Line 102** — increase the body limit from the default 100 KB to 10 MB:

```ts
app.use(express.json({ limit: "10mb" }));
```

**Rationale for 10 MB**: the archive body is gzip-compressed JSON. Body-parser checks the compressed byte count against the limit. A long singleplayer game replay can produce several MB of compressed data. 10 MB is the proposed ceiling — please confirm or adjust before merging. Rate limiting (20 req/s per IP, line 105–109) provides the abuse backstop.

The route error handler at lines 273–276 already catches `PayloadTooLargeError` via the surrounding try/catch, but Express fires the 413 **before** the route handler, so the body limit itself must be raised.

### 3. `src/client/LocalServer.ts`

**Lines 310, 314** — remove `keepalive: true` and demote the error log:

```ts
compress(jsonString)
  .then((compressedData) => {
    return fetch(`/${workerPath}/api/archive_singleplayer_game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
      body: compressedData,
      // keepalive removed: browser caps keepalive bodies at 64 KB; large
      // records cause TypeError before the request is even sent.
    });
  })
  .catch((error) => {
    console.warn("Failed to archive singleplayer game:", error);
  });
```

The archive is fire-and-forget and non-critical to match completion, so `console.warn` is appropriate. Removing `keepalive` means the request may be cancelled if the user navigates away immediately after game-over, which is acceptable for a best-effort archive.

---

## Files Changed

| File | Lines | Change |
|---|---|---|
| `src/server/Archive.ts` | 24, 34–36, 51 | `apiBaseUrl()` + richer error log |
| `src/server/Worker.ts` | 102 | `express.json({ limit: "10mb" })` |
| `src/client/LocalServer.ts` | 310, 314 | remove `keepalive`, `console.warn` |

---

## Open Question for Mark

**Body limit value**: 10 MB is proposed for the Express body limit. This covers the compressed byte count of singleplayer records. If you have Uptrace data on typical `Content-Length` sizes for singleplayer archive requests, a tighter value could be used. Should I proceed with 10 MB or adjust?

---

## Verification

1. Deploy and watch the `Not Found` archive error group in Uptrace — should disappear.
2. Singleplayer game end should produce a `200 { success: true }` response on the archive route (check network tab or server logs).
3. For an oversized record, the server should return 413 with a clean log (`Error processing archive request: ...`) — not an unhandled rejection.
4. In browser devtools: no `TypeError: Failed to archive singleplayer game` after removing `keepalive`.
5. Archive failure (if archive service is down) should appear only as a `console.warn`, not a red `console.error`.
