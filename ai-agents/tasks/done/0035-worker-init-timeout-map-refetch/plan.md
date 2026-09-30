
# Plan — 0035: give the worker the map the page already loaded (+ 0348 leftover R1)

Planning-only. Nothing written. Builds on the uncommitted 0347 + 0348 working tree, not HEAD.

## Summary
- **The double download is still there on the current tree.** The page loads the map (`ClientGameRunner.ts:178` preload, or `:369`), then `new WorkerClient(gameStartInfo, clientID)` (`:378`) sends only the game info. The worker loads the map again with its own `FetchGameMapLoader` (`Worker.worker.ts:19` → `createGameRunner` → `loadTerrainMap`, `GameRunner.ts:42`). The two contexts do not share the loader's cache.
- **Fix (Option A):** the page sends the map bytes it already has (`TerrainMapSource`: manifest sizes, nations, main bin and mini bin) inside the worker's `init` message. The worker builds its map from them and does no map download. If the bytes are missing, the worker downloads the map itself as it does today.
- **The bytes are copied, not transferred (moved).** Checked: `GameMapImpl` keeps a direct reference to the bytes (`GameMap.ts`, `this.terrain = terrainData`), and the page's cache (task 0032) holds the same arrays for the next game. Moving them would empty the page's live map. The copy is ~5.4 MB on the Normal size, a few ms, and uses no more memory than today, because the worker already holds its own downloaded copy.
- **0348 leftover R1 is in scope, per the owner ruling.** Leaving while the worker is still starting now (a) stops that worker at once and (b) skips the "Failed to start" popup and the `Worker:InitFailed*` / Uptrace telemetry if the start then fails. I found nothing that blocks it.
- **Already done by 0348 (brief text is stale):** 15 s limit, stopping the worker on failure, crash vs timeout. The brief's "5 s", `WorkerClient.ts:37-42`, `:94` and `:271-275` references no longer match the tree.
- No new analytics events. No user-visible text, so no change to `en.json`/`ru.json`. One analytics-doc wording update (see file 8).

## Design choices I made (the brief left them open)
1. **Send the parsed source (`TerrainMapSource`), not a fake loader.** For the Compact size, `loadTerrainMapSource` halves the nation coordinates once before caching (`TerrainMapLoader.ts:140-147`). Feeding cached data back through a loader would halve them a second time and put nations in the wrong places. Building straight from the source avoids that.
2. **Copy, not transfer.** Reason in the summary. Also rejected: SharedArrayBuffer (needs cross-origin isolation headers, which the Yandex iframe won't allow) and a Cache Storage warm-up (the brief itself calls it less clean, and it still depends on browser caching).
3. **The page finds the bytes with `getCachedMap(config.gameMap, config.gameMapSize)` after the map load resolves**, rather than adding a field to `TerrainMapData`. It is the same key and the same object, and it avoids changing a core type that test helpers build by hand (`tests/util/Setup.ts`). The value is set before the load promise resolves (`TerrainMapLoader.ts:159`), so it is always there in practice.
4. **The missing-bytes fallback is kept:** the worker downloads the map as it does today, and the page logs a `console.warn`. No analytics event for it, because it should never happen.
5. **An explicit optional parameter on `createGameRunner`**, not seeding the worker's module cache. The dependency stays visible.
6. **R1 uses an `AbortController` owned by `joinLobby`.** It is aborted everywhere `left = true` is set: the leave function **and the lobby `error` branch**. The lobby-error branch already shows its own popup and ends the game, so a later worker failure there is the same stray second popup.
7. **`WorkerClient.cleanup()` now fails a start that is still pending** with a plain error, immediately. Without this, a stopped worker's start would hang until the 15 s timer. After a start has finished, cleanup behaves exactly as before.
8. **Abandoned join = fully silent** (only a `console.log`). No popup, no `Worker:InitFailed`, no `…Cause:*`, no Uptrace line, as the owner ruling says. The reconnect session is still never cleared on this path (0347 hand-off).

## Changes, by file

### 1. `src/core/game/TerrainMapLoader.ts`
- Export `terrainMapFromSource(source: TerrainMapSource): Promise<TerrainMapData>`. It is a thin exported wrapper over the existing private `buildTerrainMapData` (or that function renamed and exported). It builds fresh `GameMap`s, so the 0032 rule holds (never share a built map), and `genTerrainFromBin` checks the byte lengths. Add a Task 0035 comment. Do not reformat the rest of the file.

### 2. `src/core/GameRunner.ts`
- `createGameRunner(gameStart, clientID, mapLoader, callBack, mapSource?: TerrainMapSource)`.
- `const gameMap = mapSource ? await terrainMapFromSource(mapSource) : await loadGameMap(...)`. Add a Task 0035 comment.

### 3. `src/core/worker/WorkerMessages.ts`
- `InitMessage` gains `mapSource?: TerrainMapSource`, with a one-line comment ("the page's already-loaded map; absent → the worker downloads it").

### 4. `src/core/worker/Worker.worker.ts`
- In the `init` case, pass `message.mapSource` as the 5th argument to `createGameRunner`. The module-level `FetchGameMapLoader` stays for the fallback. 0348's `.catch` → `init_failed` path is unchanged.

### 5. `src/core/worker/WorkerClient.ts`
- The constructor gains `private mapSource?: TerrainMapSource`. `initialize()` puts it in the `init` message.
- `cleanup()`: take `this.initReject`, set it to undefined, terminate the worker, clear the handlers, then call the taken reject with `new Error("Worker stopped before it finished starting")`. `settleReject` clears the 15 s timer. Add a Task 0035 comment.

### 6. `src/client/ClientGameRunner.ts`
- **`joinLobby`:** `const leaveController = new AbortController()`. The leave function (`:310-319`) and the lobby-`error` branch (`:289`) call `leaveController.abort()` next to `left = true`. Pass `leaveController.signal` to `createClientGame`. Update the `.then` comment at `:248` ("…or the join was already left, task 0035"). The `if (left) r.stop()` success branch is unchanged.
- **`createClientGame`** (new `signal: AbortSignal` parameter):
  - After the map is loaded: `const mapSource = getCachedMap(config.gameMap, config.gameMapSize)`. If it is undefined, `console.warn`.
  - `if (signal.aborted) return;` right before the worker is built, so a join left while the config or map was loading never starts a worker.
  - `const stopStartingWorker = () => worker?.cleanup(); signal.addEventListener("abort", stopStartingWorker, { once: true });` goes around the `try`. It is removed in a `finally` after the start settles, so after a successful start the existing `left → r.stop()` path alone owns teardown, exactly as task 0231 set it up.
  - `new WorkerClient(gameStartInfo, clientID, mapSource)`.
  - In the `catch`: `worker?.cleanup()` first, as today. Then `if (signal.aborted) { console.log(...); return; }`, placed **before** the analytics, the Uptrace line and the popup. Keep 0348's comment that says no `clearReconnectSession` here.

### 7. Tests — see below.

### 8. `ai-agents/knowledge-base/analytics-event-reference.md`
- `Worker:InitFailed` and `Worker:InitFailedCause:{Cause}` rows: add "not logged when the player had already left the join (task 0035)". In the `Crash` examples, change "e.g. a map download" to "e.g. the config fetch or the runner build; a map download only on the no-page-map fallback". Leave the file's existing Prettier failure alone (it already failed at HEAD, per 0348).

## Tests
**Core (required by CLAUDE.md):**
- `tests/core/game/TerrainMapLoader.test.ts`, new describe:
  - `terrainMapFromSource` builds maps with no loader call, and the sizes match.
  - Two calls give two different `GameMap` objects: setting an owner on one does not show on the other (0032).
  - A wrong-length bin rejects.
  - Compact: a source from `loadTerrainMap(..., Compact)` → `getCachedMap` → `terrainMapFromSource` keeps the nation coordinates exactly (not halved twice).
- **New `tests/core/GameRunnerMapSource.test.ts`**, using the real `tests/testdata/maps/plains` bytes and `getConfig` mocked to return a `TestConfig`, built as in `tests/util/Setup.ts`:
  - With a `mapSource`, `mapLoader.getMapData` is **never called** and the game map's size equals the source's.
  - Without one, `getMapData` **is** called (fallback).
  - If building a real runner under node turns out not to work, the builder falls back to mocking `TerrainMapLoader` and asserting which branch ran, and records that in the worklog.
- `tests/core/worker/WorkerClient.test.ts`:
  - W6: a client built with a source posts `init` carrying that `mapSource`; without one, `mapSource` is undefined.
  - W7: `cleanup()` during a pending start rejects `initialize()` at once (not a `WorkerInitTimeoutError`), leaves no timers (`jest.getTimerCount() === 0`) and terminates the worker.
  - W8: `cleanup()` after a successful start does not throw and rejects nothing.
- `tests/core/worker/WorkerWorker.test.ts`: the mock records its arguments; an `init` that carries `mapSource` passes it through as `createGameRunner`'s 5th argument.

**Client — `tests/client/JoinLobbyReconnectSession.test.ts`, new describe "task 0035"** (reuses its mock block; `getCachedMap` returns a marker object; the WorkerClient mock's `cleanup` can reject a controlled start):
- L1: the worker is built with `(gameStartInfo, "c", <marker source>)`.
- L2 (a `test.each` over Timeout and Crash errors): leave during the start → `cleanup` is called **before** the start settles. Then the start fails → no `Worker:InitFailed*` events, no `logOtelWarn`, the popup is not shown (`document.querySelector` spy never asked for `#error-modal`), `clearReconnectSession` is not called, and `onGameEnd` is called once.
- L3: a lobby `error` during the start → the worker is cleaned up, and the later start failure adds no telemetry and no second popup.
- L4: leave before the config or map resolves → `WorkerClient` is never built, no telemetry, `onGameEnd` is called once.
- The existing J2/J6a/J6b/J7 tests must stay green. They are the "not left → popup and telemetry still fire" controls.
- **Not unit-tested, and why:** the "leave **after** a successful start" path. Driving `createClientGame` past the start needs a real `GameView`/renderer, which this harness mocks out. The `finally` removal keeps that path identical to today's; it is checked live (below).

**Then:** full `npm test` (slow — the shell harnesses run too), `npm run lint`, `npx tsc --noEmit`. On a known supertest flake, re-run and say so.

## Live verification (local, Playwright, as 0348 did)
1. **One download:** count requests to `/maps/<map>/map.bin` and `map4x.bin` (plus `map16x.bin` on Compact) per match start. Expected: 1 each (today 2). Run it on a public match and on a singleplayer game.
2. **The dev-box case, simulated:** cache disabled plus throttling, so the page's preload takes more than 15 s. The match starts, and `Worker:InitSuccess` comes within about 1–2 s of `Match:PreloadReady`. No `Worker:InitFailed`.
3. **Leave during start (R1):** the worker start is now fast, so hold the worker's `/api/env` request open to make a window. Leave (hash change / Back, and separately start a new join). Expected: the worker closes at once (`page.workers()` is 0), no popup, no `Worker:InitFailed*`. Wait 16 s more on the next screen and match: still no stray popup.
4. **Leave after a successful start:** the normal teardown still works, same as today.
5. **0348 and 0347 regressions:** blocking the map after `PreloadReady` **no longer forces a crash**, because the worker doesn't download the map any more. Instead, block the worker's `/api/env` → `Crash` popup; hold it open forever → `Timeout` popup at 15 s. After a failure the session is kept and Rejoin works.
- Port 3001 must be free (known trap).

## Edge cases / risks
- **Wrong map sent:** the key equals the game's own map and size, so this is impossible by design. If it ever happened, the page and the worker would at least agree, and the hash-vote desync check against other players would catch it. No extra guard added.
- **Leave vs failure race:** whichever comes first wins. A real failure before the leave still shows its popup, which is correct.
- **Leave while refreshing:** `beforeunload` → `gameStop` → abort, so the worker stops silently. The session is **not** cleared (only `handleLeaveLobby` clears it), so a Rejoin after the refresh still works (0347).
- **The worker still makes one network call,** `/api/env`: tiny, but not cached in the worker. Left out of scope.
- **The page's own slow preload still uses up part of the ~20 s spawn phase** (0348 note). Out of scope; this task removes only the worker's second download.
- **Size of the start message:** the ~5.4 MB copy happens once per match start, on the main thread, and takes milliseconds.

## Out of scope
- Speeding up the page's own map preload. Passing `/api/env` to the worker. Any change to reconnect-session logic.

## After done
- Wiki: `wiki/systems/client-game-teardown.md` and `features/reconnection.md` (worker start path, and leave during start) → route to `fkit-wiki` with `/fkit-wiki-ingest` of the done brief.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text; the three plan-made calls (a lobby `error` counts as "left"; `WorkerClient.cleanup()` fails a still-pending start at once; the live forced-crash method moves from blocking the map to blocking the worker's `/api/env`) were named explicitly in the approval question.*

- **Plan:** APPROVED, including those three calls.
- **Open question — local proof enough, or a verify task after the deploy?** **File a verify task for Sprint 8** — after the weekend deploy, the owner joins a public match on the dev box and confirms it starts and the map downloads once. Per the owner's standing build/verify-split rule (2026-09-29): this build task closes on local proof; the verify task goes at the top of the next sprint and must not block the current sprint's deploy. (Filed by the closing producer, not by the builder.)
