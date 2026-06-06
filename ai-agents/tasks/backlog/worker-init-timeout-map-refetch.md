# Brief — Worker Init Timeout on Joining Public Matches (redundant map re-fetch)

> **Status:** Investigation complete, not yet implemented. This document is a hand-off brief.
> **Audience:** (1) Producer — to write the task description. (2) Tech-specialist — to implement.
> The implementer will **not** have the original chat context, so everything needed is below.
> **Priority (suggested, producer to confirm):** Medium. Not a prod-blocker by itself, but it is a real
> latent fragility on the client join path and the proper fix removes a redundant 4 MB download per match.

---

## TL;DR

When joining a public match on the **dev server** (`https://79.174.91.179`), the client shows
**"Не удалось запустить игру — попробуйте обновить страницу / Error: Worker initialization timeout"**
and the match never starts.

Root cause: the game-logic **Web Worker re-downloads the full map binary (~5.6 MB) from scratch**, even
though the main thread already downloaded the exact same files milliseconds earlier during preload. The
worker has a **hard 5-second init timeout**. On a connection where the map download takes longer than 5s,
the worker never finishes and init fails.

The reason it surfaced *now*, on the dev box specifically: that host is served over **HTTPS with an
untrusted certificate** (it's a bare IP — the red "Not Secure" in the browser). Chrome **does not write to
its disk cache over a connection with certificate errors**, so the worker's "re-fetch" is a full cold
download instead of an instant cache hit. The same map took **20s** to preload on the main thread
(observed), so the worker's 5s budget was never going to be enough.

- **Locally:** works — assets are fast and cacheable.
- **Prod (`geoconflict.ru`):** valid TLS + working nginx cache (verified live, see references) → the worker's
  re-fetch is a browser-cache hit and init completes well under 5s. So this **is not expected to break prod**.
- **Dev box:** breaks, because the untrusted cert disables browser caching.

There are two fixes, independent and complementary. The **proper fix** is to stop the worker re-downloading
the map at all. The **cheap fix** is to raise the timeout. Recommendation: do both, lead with the proper fix.

---

## Symptom (what was observed)

- Page: `https://79.174.91.179/yandex-games_iframe.html`, version `0.0.135-dev.3`, in a Yandex Games iframe context.
- Action: click to join a public FFA match (map: "Гибралтарский пролив" = Strait of Gibraltar = `straitofgibraltar`).
- Result: error modal —
  ```
  Не удалось запустить игру — попробуйте обновить страницу.
  game id: <id>
  client id: <id>
  Error: Worker initialization timeout
  ```
- Console analytics timeline (chronological):
  - `Match:PreloadHitNotLoaded value: 4`   — at game start, the preloaded map was not yet cached (4s into the load)
  - `Match:PreloadReady value: 20`         — the main-thread preload of the map finished after **20 seconds**
  - `Worker:InitFailed value: undefined`   — fired **exactly 5 seconds after** PreloadReady → the worker hit its 5s timeout
- The user **can** join public matches when running the game locally; only the dev box fails.

---

## Root cause analysis

### The init timeout
`src/core/worker/WorkerClient.ts` — `initialize()` posts an `init` message to the worker and rejects after 5s:

```ts
// WorkerClient.ts:66-96
setTimeout(() => {
  if (!this.isInitialized) {
    ...
    reject(new Error("Worker initialization timeout"));
  }
}, 5000); // 5 second timeout
```

This 5s value has existed **since the first commit of the fork** (`git blame` → `feea527`). It is **not a
regression introduced by the 0.0.135 release** — nothing on this path changed in this release.

### What the worker actually does during init
The `init` handler builds the game runner, which **loads the map from the network**:

```ts
// src/core/worker/Worker.worker.ts:18
const mapLoader = new FetchGameMapLoader(`/maps`, version);
// :42-60 — case "init": createGameRunner(..., mapLoader, ...) → loadGameMap() → fetches map binaries
```

For Strait of Gibraltar the assets are (`static/maps/straitofgibraltar/`):

| File | Size |
|---|---|
| `map.bin` | 4.28 MB |
| `map4x.bin` | 1.07 MB |
| `map16x.bin` | 0.27 MB |
| `manifest.json` | ~1.3 KB |
| **Total** | **~5.6 MB** |

### The redundant download (the real defect)
The main thread **already downloaded these exact files** during preload, then **throws the result away from
the worker's perspective**:

- Main thread preloads via `terrainMapFileLoader` (`src/client/TerrainMapFileLoader.ts:4` →
  `new FetchGameMapLoader('/maps', version)`), in `ClientGameRunner.ts` `preloadMap()` (~:126-160).
- `createClientGame()` awaits that load (`ClientGameRunner.ts:226-277`, `gameMap = await terrainLoad`).
- Then it constructs `new WorkerClient(gameStartInfo, clientID)` (`ClientGameRunner.ts:278-281`) — **the
  already-loaded `gameMap` is never passed in**.
- The worker therefore re-loads the map from scratch using its **own** `FetchGameMapLoader`
  (`Worker.worker.ts:18`), hitting the network again for the same URLs.

Both loaders use the **same prefix and cache-buster** (`/maps` + `version`), so the URLs are identical. On a
**normal** connection the worker's re-fetch is a free browser-cache hit (nginx serves `.bin` as
`Cache-Control: public, max-age=31536000, immutable`, see `nginx.conf` ~:180-188). That is why it normally
works and is invisible.

### Why the dev box breaks
`https://79.174.91.179` is a **bare IP with an untrusted TLS cert** (red "Not Secure"). `setup.sh` only issues
a real Let's Encrypt cert for a **domain** (`setup.sh:217-244`, certbot `-d $PUBLIC_HOST`), and has a staging
path (`CERTBOT_STAGING=true` → `--test-cert`, explicitly "not browser-trusted", `setup.sh:231-232`). A bare IP
can't get a trusted cert at all.

**Chrome does not store responses in its HTTP disk cache over a connection with certificate errors.** So on
the dev box every asset is fetched cold, every time:

1. Main thread cold-downloads ~5.6 MB → **20s** (observed `PreloadReady value: 20`).
2. Worker cold-downloads the **same** ~5.6 MB again, but only has **5s** → **timeout → InitFailed**.

### Environment matrix

| Environment | TLS | Browser caches `.bin`? | Worker re-fetch | Result |
|---|---|---|---|---|
| Local dev | trusted/localhost | yes (and fast) | instant | ✅ works |
| Dev box (IP) | **untrusted** | **no** | cold ~20s vs 5s budget | ❌ **timeout** |
| Prod (`geoconflict.ru`) | valid (Let's Encrypt) | yes | cache hit, ~instant | ✅ expected to work |

Prod caching was independently verified live on 2026-06-03 (see references): map `.bin` returns `200` with
`X-Cache-Status` present (cached location block), valid HTTPS.

---

## Proposed solutions

### Option A — Proper fix: stop the worker re-downloading the map (recommended)
The main thread has already loaded and parsed the terrain. Avoid the second download entirely.

Approaches (implementer to choose the cleanest for this codebase):
- **Pass the loaded map to the worker.** The main thread has the parsed `TerrainMapData` /
  `gameMap` (`ClientGameRunner.ts:243-277`). Transfer the underlying `ArrayBuffer`(s) into the worker via
  `postMessage(..., [transferList])` so the worker uses them instead of fetching. (`createGameRunner` /
  `loadGameMap` would need to accept pre-loaded buffers instead of always going through `FetchGameMapLoader`.)
- **Or** share a cache the worker can read without re-downloading (e.g. ensure the worker's `fetch` is served
  from the Cache Storage API / a warmed cache the main thread populated) — less clean than transferring buffers.

Effect: removes the failure mode on slow/uncacheable connections **and** removes a redundant ~5.6 MB download
for **every** player on **every** match start (bandwidth + faster start on prod too).

### Option B — Cheap fix: raise the init timeout (belt-and-suspenders)
`WorkerClient.ts:94` — change `5000` to **`15000`** (15s). Keeps slow/cold-but-working connections from being
clipped. Does **not** address the redundant download; it just gives it more time.

### Recommendation
Do **A** (it's the actual defect). Add **B** as cheap insurance for genuinely slow networks even after A.
While in this code, also fix the cleanup gap below.

### Also fix while here — worker leak on failure (pre-existing, not caused by this change)
The init-failure catch block never terminates the worker:

```ts
// ClientGameRunner.ts:278-296
try {
  worker = new WorkerClient(...);
  await worker.initialize();
} catch (err) {
  // logs WORKER_INIT_FAILED, shows modal, returns — but never calls worker.cleanup()
}
```

A timed-out worker keeps running in the background until navigation. Add `worker.cleanup()` (terminates the
worker, see `WorkerClient.ts:271-275`) in the catch before returning.

---

## Regression analysis of raising the timeout (Option B)

Confirmed by tracing the code — **no functional regressions**, one narrow UX cost:

1. **Real crashes still fail fast.** `WorkerClient.ts:37-42` rejects init immediately on the worker `error`
   event (load failure / thrown exception). The 5s timer only catches a *silent hang*. Raising it delays only
   that case, not genuine failures.
2. **No test pins the value.** No test asserts `5000` or "initialization timeout" (`tests/` grep — only
   unrelated `addTroops(5000)` style hits).
3. **Server disconnect window is 60s, far beyond 20s.** `GameServer.ts:53` `disconnectedTimeout = 60*1000`;
   a client is only marked disconnected after 60s without a ping (`:944`). A 15–20s init is safely inside it.
4. **Starting late loses no turns.** When the runner starts, it re-joins (`joinGame(turnsSeen)`) and the server
   replays the turn backlog in the `start` message (`ClientGameRunner.ts:570-585`); >30 queued turns trigger the
   catch-up overlay (`:586-591`). A late-starting client simply catches up — same mechanism as a reconnect. No
   desync, no loss.
5. **Connection watchdog can't interact.** `connectionCheckInterval` only starts *after* a successful init
   (`ClientGameRunner.ts:435-440`), so it never overlaps the init window.

**Only downside:** in the rare silent-hang case, the user waits ~15s instead of 5s before the error modal
(slower failure, not a broken one). On valid-TLS prod this path is barely reachable (cache hit).

---

## Files involved (reference map for the implementer)

| File | Lines | Relevance |
|---|---|---|
| `src/core/worker/WorkerClient.ts` | 66-96 | `initialize()` + the 5s timeout (Option B) |
| `src/core/worker/WorkerClient.ts` | 37-42 | fail-fast error listener (why crashes don't wait for timeout) |
| `src/core/worker/WorkerClient.ts` | 271-275 | `cleanup()` (terminate worker) — for the catch-block fix |
| `src/core/worker/Worker.worker.ts` | 18, 42-60 | worker's own map loader + `init` handler (the re-fetch, Option A) |
| `src/core/GameRunner.ts` | 35-47 | `createGameRunner` → `loadGameMap` (entry to map load inside worker) |
| `src/core/game/FetchGameMapLoader.ts` | whole | the fetch implementation (URLs, cache-buster, retries) |
| `src/client/TerrainMapFileLoader.ts` | 4 | main-thread loader (same prefix+version as worker) |
| `src/client/ClientGameRunner.ts` | 226-296 | `createClientGame`: preload await + worker construct/init + catch (Option A, cleanup fix) |
| `src/client/ClientGameRunner.ts` | 126-160, 570-591 | preload logic + late-start backlog/catch-up (no turn loss) |
| `src/server/GameServer.ts` | 53, 944 | 60s server disconnect window (timeout safety margin) |
| `nginx.conf` | ~180-188 | `.bin` cache headers (why caching normally saves the worker) |
| `setup.sh` | 217-244 | certbot/TLS provisioning (why the dev IP has an untrusted cert) |

---

## Verification / acceptance criteria

- [ ] On a properly-TLS'd host (prod domain or a trusted-cert staging), joining a public match starts the
      match reliably; `Worker:InitSuccess` fires, no `Worker:InitFailed`.
- [ ] **Option A:** confirm via Network tab that the map binaries (`map.bin`, `map4x.bin`, `map16x.bin`) are
      requested **once** per match start, not twice. (Today: requested twice — preload + worker.)
- [ ] **Option B:** on a deliberately slow/throttled connection where map load > 5s but < 15s, the match still
      starts instead of erroring.
- [ ] Worker-init failures (force one) no longer leave a running worker behind (`cleanup()` called).
- [ ] All `src/core/` changes covered by tests (project rule: core changes must be tested). At minimum, a test
      around the worker init / map provisioning path; existing `tests/core/game/FetchGameMapLoader.test.ts`
      is the precedent for this area.
- [ ] `npm test` and `npm run lint` pass.

---

## Notes for the release decision (context for the producer)

- This does **not** by itself justify pausing the prod release: the failure is explained by the dev box's
  untrusted cert disabling browser caching; prod has valid TLS and verified working map caching.
- **However**, before shipping, the recommended confirmation was: test the join flow against a valid-TLS host
  (prod domain or trusted-cert staging) rather than relying only on inference. The bare-IP dev box is **not a
  representative test environment** for anything that depends on browser HTTP caching (cert is untrusted).

---

## References

- Related prior investigation (lobby/map fetch errors, confirms prod TLS + cache healthy):
  `ai-agents/knowledge-base/lobby-map-fetch-investigation-2026-06-03.md` (and task
  `ai-agents/tasks/done/s4c-investigate-lobby-map-fetch.md`).
- Commit where the worker map-fetch path last changed: `4196cae` (s4c-investigate-lobby-map-fetch),
  `e90d6ee` (worker improvements). The 5s timeout itself predates these (`feea527`, first fork commit).
- Two-nginx-layer deploy model (where `.bin` caching lives): see the "Deploy note" in the prior investigation
  doc above; container nginx config is `nginx.conf`, shipped via image build (`build-deploy.sh`).
