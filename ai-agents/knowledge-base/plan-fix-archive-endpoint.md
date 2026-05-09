# Plan: Fix Archive Endpoint Failures and Singleplayer Body Limit

## Context

Three production error groups are silently discarding match history and replay data:

| Error | Rate |
|---|---|
| `error archiving game record (gameID: ...): Not Found` | 16.29/min |
| `TypeError: Failed to archive singleplayer game: Failed to fetch` | 9.64/min |
| `Error in POST /api/archive_singleplayer_game: PayloadTooLargeError` | 0.64/min |

---

## Root Cause Analysis

### Issue 1 — Multiplayer archive 404 (`Archive.ts`)

`Archive.ts` constructs archive URLs using `config.jwtIssuer()`, which in `.env.prod` resolves to `http://91.197.98.116`. So it posts to `http://91.197.98.116/game/{gameID}` — but **no `/game/:gameID` route exists anywhere in the geoconflict server code**. The request hits nginx → Node.js port 3000 → 404.

The upstream openfront.io had an external Cloudflare Worker at `api.openfront.io/game/:gameID`. The geoconflict fork inherited the archive client but never built the matching endpoint.

**Confirmed env values in `.env.prod`:**
```
JWT_ISSUER=http://91.197.98.116
API_BASE_URL=http://91.197.98.116
```

**Precedent — cosmetics fix (`s4c-fix-cosmetics-serving`):**
The same pattern occurred with `cosmetics.json` (also fetched from `config.jwtIssuer() + "/cosmetics.json"`, also returning 404, also blocked in Yandex.Games iframe context by the raw IP). That fix:
1. Added `GET /cosmetics.json` to `Master.ts`, serving the file from disk.
2. Added `localCosmeticsJsonUrl()` to `ServerEndpoints.ts` — uses `localMasterUrl()` → `http://127.0.0.1:3000/cosmetics.json`.
3. Replaced `config.jwtIssuer() + "/cosmetics.json"` in `Worker.ts` with `localCosmeticsJsonUrl()`.

The archive fix follows the same approach.

---

### Issue 2 — Singleplayer archive body too large (`Worker.ts`)

`app.use(express.json())` at `src/server/Worker.ts:102` uses the default 100 KB limit. Singleplayer records are gzip-compressed before POST; compressed size can exceed 100 KB. Express fires 413 before the route handler runs.

---

### Issue 3 — Singleplayer archive `Failed to fetch` (`LocalServer.ts`)

`src/client/LocalServer.ts:310` uses `keepalive: true`. Browsers (Chrome/Chromium) cap keepalive request bodies at **64 KB**; larger compressed records trigger `TypeError: Failed to fetch` immediately on the client. The catch also logs at `console.error` despite archive being non-critical.

---

## Implementation Plan

### 1. Add `POST /game/:id` and `GET /game/:id` to `Master.ts`

Mirror the cosmetics pattern. Store game records as JSON files on disk under `data/game-records/`.

**`src/server/ServerEndpoints.ts`** — add path constant and URL helper:
```ts
export const GAME_RECORD_PATH = "/game";

export function localGameRecordUrl(gameId: string): string {
  return localMasterUrl(`${GAME_RECORD_PATH}/${gameId}`);
}
```

**New file `src/server/GameRecordStorage.ts`** — disk-based read/write:
```ts
// Reads/writes GameRecord JSON files under data/game-records/<gameId>.json
// Throws on write failure; returns null if not found on read.
```

**`src/server/Master.ts`** — add two routes (before the SPA fallback):
```ts
app.post("/game/:id", async (req, res) => { /* write to disk */ });
app.get("/game/:id",  async (req, res) => { /* read from disk */ });
```

**`src/server/Archive.ts`** — replace `config.jwtIssuer()` with `localMasterUrl()`:
```ts
// line 24
const url = localMasterUrl(`/game/${gameRecord.info.gameID}`);
// line 51
const url = localMasterUrl(`/game/${gameId}`);
```

Also improve the error log at line 34 to include status code + response body excerpt:
```ts
const body = await response.text().catch(() => "");
log.error(
  `error archiving game record (gameID: ${gameRecord.info.gameID}): ` +
  `HTTP ${response.status} ${response.statusText} — ${body.slice(0, 200)}`
);
```

---

### 2. Increase body limit (`Worker.ts:102`)

```ts
app.use(express.json({ limit: "10mb" }));
```

Rationale: body-parser checks compressed byte count. Long singleplayer replays can produce several MB compressed. Rate limiter (20 req/s per IP) provides abuse backstop. **Confirm 10 MB with Mark before merging.**

---

### 3. Fix singleplayer archive fetch (`LocalServer.ts:301–315`)

Remove `keepalive: true`, demote error to `console.warn`:

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
      // keepalive removed: browser 64 KB cap causes TypeError for large records
    });
  })
  .catch((error) => {
    console.warn("Failed to archive singleplayer game:", error);
  });
```

---

## Files Changed

| File | Change |
|---|---|
| `src/server/ServerEndpoints.ts` | Add `GAME_RECORD_PATH`, `localGameRecordUrl()` |
| `src/server/GameRecordStorage.ts` | New file — disk-based game record read/write |
| `src/server/Master.ts` | Add `POST /game/:id` and `GET /game/:id` routes |
| `src/server/Archive.ts` | Use `localMasterUrl()` instead of `config.jwtIssuer()`; richer error log |
| `src/server/Worker.ts` | `express.json({ limit: "10mb" })` |
| `src/client/LocalServer.ts` | Remove `keepalive: true`, `console.error` → `console.warn` |

---

## Open Questions

**Body limit value**: 10 MB proposed. Confirm or adjust based on Uptrace `Content-Length` data for singleplayer archive requests.

---

## Verification

1. `POST /game/:id` in production returns 200; `Not Found` error group in Uptrace disappears.
2. `GET /game/:id` returns the stored record.
3. Singleplayer game end produces `200 { success: true }` — no 413 for normal-sized records.
4. No `TypeError: Failed to archive singleplayer game` in browser console after removing `keepalive`.
5. Archive failure logs appear as `console.warn` / `log.warn`, not errors.
