# Worklog — 0035: give the worker the map the page already loaded (+ 0348 leftover R1)

## 2026-09-30 — BUILD (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Build worker)

Built against the approved `plan.md` (blob `b1e2c7a80d21ca03d5892ec8b7e2f4d59d2d19bb`, checked with
`git hash-object` before starting — matched the carried pointer). `plan.md`, the brief's `## Status`
and the sprint board were not touched. The Sprint 8 verify task was **not** filed (the closing
producer does that). Built on top of 0347's and 0348's uncommitted working tree.

### What changed

- **`src/core/game/TerrainMapLoader.ts`** — new exported `terrainMapFromSource(source)`, a thin
  wrapper over the existing private `buildTerrainMapData` (fresh `GameMap`s every call; the bin
  length is checked by `genTerrainFromBin`). Task 0035 comment explains why it must not go back
  through `loadTerrainMapSource` (Compact nations would be halved twice). Nothing else reformatted.
- **`src/core/GameRunner.ts`** — `createGameRunner(..., callBack, mapSource?: TerrainMapSource)`;
  `mapSource ? await terrainMapFromSource(mapSource) : await loadGameMap(...)`.
- **`src/core/worker/WorkerMessages.ts`** — `InitMessage.mapSource?: TerrainMapSource` with the
  one-line comment.
- **`src/core/worker/Worker.worker.ts`** — `init` passes `message.mapSource` as the 5th argument.
  The module-level `FetchGameMapLoader` stays for the fallback; 0348's `init_failed` path unchanged.
- **`src/core/worker/WorkerClient.ts`** — constructor gains `private mapSource?: TerrainMapSource`
  (comment: copied by structured clone, not transferred); `initialize()` puts it in `init`.
  `cleanup()` takes `this.initReject`, clears it, terminates, clears handlers/callback, then calls
  the taken reject with `new Error("Worker stopped before it finished starting")` (`settleReject`
  clears the 15 s timer). After a finished start `initReject` is already undefined, so cleanup is
  unchanged there.
- **`src/client/ClientGameRunner.ts`**
  - `joinLobby`: `const leaveController = new AbortController()`; `leaveController.abort()` next to
    `left = true` in both the lobby-`error` branch and the returned leave function;
    `leaveController.signal` passed to `createClientGame`; the `r === undefined` comment now also
    says "or the join was already left … (task 0035)". `if (left) r.stop()` unchanged.
  - `createClientGame(…, signal: AbortSignal)`: after the map load,
    `getCachedMap(gameMap, gameMapSize)` → `mapSource`, `console.warn` if undefined; then
    `if (signal.aborted) { console.log; return; }` before any worker is built; an `abort` listener
    (`stopStartingWorker = () => worker?.cleanup()`, `{ once: true }`) added before the `try` and
    removed in a new `finally`; `new WorkerClient(gameStartInfo, clientID, mapSource)`; in the
    `catch`, `worker?.cleanup()` stays first, then `if (signal.aborted) { console.log; return; }`
    **before** the analytics, the Uptrace line and the popup. 0348's "no `clearReconnectSession`
    here" comment kept.
- **`ai-agents/knowledge-base/analytics-event-reference.md`** — `Worker:InitFailed` and
  `Worker:InitFailedCause:{Cause}` rows: "Not logged when the player had already left the join (task
  0035)."; the `Crash` example "e.g. a map download or runner build failure" → "e.g. the config fetch
  or the runner build; a map download only on the no-page-map fallback". No event added/renamed.
  No user-visible text, so no `en.json`/`ru.json` change.

### Tests

- **`tests/core/game/TerrainMapLoader.test.ts`** — new `describe("terrainMapFromSource")`: builds
  with no loader call at the source's sizes; two calls → two distinct `GameMap`s, ownership on one
  not visible on the other (0032); wrong-length bin rejects; Compact: `loadTerrainMap` →
  `getCachedMap` → `terrainMapFromSource` keeps `[2, 3]` (not halved twice).
- **New `tests/core/GameRunnerMapSource.test.ts`** — a **real** `createGameRunner` over the
  `tests/testdata/maps/plains` bytes, `getConfig` mocked to a `TestConfig`. With a source:
  `getMapData` never called, game size = source size. Without: `getMapData` called once (fallback).
  The real runner built fine under node, so the plan's mock-`TerrainMapLoader` fallback was not
  needed.
- **`tests/core/worker/WorkerClient.test.ts`** — new describe: W6 (`init` carries `mapSource`;
  undefined without one), W7 (`cleanup()` mid-start rejects at once, not a `WorkerInitTimeoutError`,
  `jest.getTimerCount() === 0`, worker terminated), W8 (`cleanup()` after success: no throw, nothing
  rejected).
- **`tests/core/worker/WorkerWorker.test.ts`** — the mock records its 5th argument; the `init`
  now carries a `mapSource` and a new test asserts it reaches `createGameRunner`.
- **`tests/client/JoinLobbyReconnectSession.test.ts`** — new describe "task 0035": L1 (worker built
  with `(gameStartInfo, "c", <marker>)`), an L2 control (still joined → popup query + 2 failure
  events, so the popup spy is not vacuous), L2 `test.each` (Timeout / Crash / cleanup-itself
  rejection: `cleanup` runs before the start settles; then no `Worker:InitFailed*`, no `logOtelWarn`,
  no `#error-modal` query, no `clearReconnectSession`, `onGameEnd` once), L3 (lobby `error` mid-start
  → cleanup; later failure adds no telemetry, `#error-modal` queried only once — the lobby error's
  own), L4 (leave while config pending → no `WorkerClient`, no telemetry, no popup, `onGameEnd` once).
  Existing J1–J7 untouched and green.
- **Not unit-tested (as planned):** leave **after** a successful start — needs a real
  `GameView`/renderer; the `finally` removal keeps it identical to today. Left for live check 4.

### Evidence

- **Mutation checks** (each reverted right after): drop the silent-on-abort `catch` branch → L2×3 +
  L3 fail; drop the abort listener → L2×3 + L3 fail; drop the pre-worker abort check → L4 fails; drop
  the reject in `cleanup()` → W7 fails; make `createGameRunner` ignore the source → the "with a
  source" test fails. Sources restored and re-verified (grep + green runs).
- `npx jest` over the 9 touched/adjacent suites (`TerrainMapLoader`, `GameRunnerMapSource`,
  `GameRunner`, `tests/core/worker/*`, `JoinLobbyReconnectSession`, `ClientGameRunnerTeardown`,
  `ReconnectSession`): **9 suites, 74 tests, all pass.**
- `npx tsc --noEmit -p tsconfig.json`: **clean.** (It caught one test bug first — see decision log.)
- `npx eslint` on every touched source/test file: **clean.**
- `npx prettier --check`: 3 touched files warn (`GameRunner.ts`, `TerrainMapLoader.ts`,
  `TerrainMapLoader.test.ts`) — **all three already fail at HEAD** (checked by piping `git show
  HEAD:<file>` through prettier); whole-file drift, not reformatted (minimal-diff rule). The other
  touched files pass.
- **Not run here (Verify step owns them):** full `npm test`, `npm run lint`, the live Playwright checks.

### Decision log

Unattended calls the plan did not spell out (point · choice · why):

1. **L2 gets a third case, "cleanup() itself".** · Besides Timeout and Crash errors arriving after the
   leave, one case lets the mocked `cleanup()` reject the start, as the real `cleanup()` now does. ·
   That is the path production actually takes; the plan's two cases model a real failure racing the
   leave. Additive test only.
2. **An L2 control test (still joined → the popup is asked for).** · Added. · Proves the
   "`#error-modal` never queried" assertion can fail; otherwise it could pass vacuously.
3. **Order inside `createClientGame`: `getCachedMap` + `console.warn` before the `signal.aborted`
   early return.** · Kept that order. · The plan lists the lookup first and the abort check "right
   before the worker is built"; the only cost is a possible extra warn on a join that was left.
4. **L4 asserts no `Worker:*` events / no Uptrace / no popup — not "no analytics at all".** · The
   `Match:PreloadHit*` / `Match:PreloadMiss` events still fire before the abort check, as today. · The
   plan scopes the silence to the worker-failure telemetry (`Worker:InitFailed*`, Uptrace, popup); the
   preload events describe the map load, which did happen.
5. **L3 does not assert the `onGameEnd` count.** · Left out. · On a lobby error, `onGameEnd` runs in
   the error branch and again from `.then` when `createClientGame` returns `undefined` — same as
   before this task (0348's failure path did the same); the receiver is documented as safe to call
   more than once. Unchanged behaviour, so not pinned.
6. **`GameRunnerMapSource.test.ts` uses `GameMapType.World` as the map key.** · First draft used
   `GameMapType.Plains`, which does not exist; SWC ran it as `undefined` and passed, `tsc` caught it.
   Fixed to `World` (the loader is mocked, so the key only needs to be a real enum value).
7. **Code-fix decisions under the review-worker rules:** none — this is the Build step; no review
   findings were applied.

## Verify — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Verify worker; wrote no source/tests)

- **`npm test` (full): GREEN on the re-run — 183/183 suites, 3261/3261 tests**, shell harnesses included,
  nothing skipped. ⚠️ **The first run was red: 1 failure**, `tests/profile-server/NameChangeRoutes.test.ts`
  › "403s a non-citizen" → `socket hang up` (182/183 suites, 3260/3261 tests). Ruled out `0197` first: no
  `SIGSEGV`/`signal=` in the output, no new `node-*.ips` in DiagnosticReports. A supertest suite this task
  does not touch, matching the known-flake family (`socket hang up` = seen, never traced). **I re-ran;**
  the re-run was fully green.
- **`npm run lint`:** exit 0, clean.
- **Live checks.** Local dev on this working tree (0347 + 0348 + 0035 uncommitted): game server on
  3000–3002, client via `webpack serve --port 9010` (9000 = another project's dev server, PID 57856 — left
  alone). Headless Chromium, a Playwright script in the scratchpad (not in the repo), fresh context per
  run, `context.route` for blocking/holding/delaying. Client built with the OTEL endpoint pointed at a
  **local fake sink on 127.0.0.1** (nothing sent anywhere real). All I started was stopped afterwards;
  3000–3002 / 9010 / 9999 free again.
  1. **One download per map file: PASS.** Per match start: public (Britannia; again Africa) —
     `manifest.json` 1, `map.bin` 1, `map4x.bin` 1; singleplayer Normal (World) — same 1/1/1;
     singleplayer **Compact** (World) — `manifest.json` 1, `map4x.bin` 1, `map16x.bin` 1. **Zero** map
     requests after the game worker was created in every run; no "no cached map source" warn. (The page
     also fetches every map's `manifest.json` twice at page load, for the map list — before any match,
     unchanged.) *Before*: the 0348 verify logs from this machine today (`v-slow.log`) show the worker
     itself fetching `manifest.json`, `map.bin`, `map4x.bin` after it was created — i.e. 2 each per start.
     Not re-measured on HEAD (would need a second checkout).
  2. **Dev-box case: PASS.** Browser cache disabled (CDP `Network.setCacheDisabled`) and every map file
     held 17 s at the route (the "throttle" — a route delay, not CDP bandwidth throttling). Page preload
     took **51 s** (`Match:PreloadReady` value 51). Match started; `Worker:InitSuccess` **0.13 s** after
     `Match:PreloadReady` (worker created → success 0.12 s). No `Worker:InitFailed`, no popup.
  3. **Leave during start: PASS** (worker's `/api/env` held open, leave 1.5 s later), all three ways:
     hash change, Back (`history.pushState` then `goBack`), and a new `join-lobby` for the next public
     lobby. In each: worker closed **0.01–0.02 s** after the leave; log line
     `createClientGame: worker start ended after the join was left`; no popup at once and **still none
     16 s later**; no `Worker:InitFailed*`; the sink got **no** posts (it did get the line in check 5, so
     the silence is not vacuous). New-join case: the new match then started normally
     (`Worker:InitSuccess`, `Game:Start`).
  4. **Leave after a successful start: PASS** (public, singleplayer Normal and Compact): hash-change
     leave → `leaving lobby` / `on stop: leaving game`, worker closed at once, 0 game workers, no popup,
     `reconnect-session` cleared, back on the start screen, no `Worker:InitFailed`.
     ⚠️ Observation, **not caused by this change**: after that leave the public-lobby card stays on the
     already-started lobby (`0s`) and clicking it does nothing — `Main.ts` calls `publicLobby.stop()` at
     game start and `handleLeaveLobby` never restarts the poll. Neither file is touched by 0035/0347/0348.
  5. **0348/0347 regressions: PASS.** Worker `/api/env` blocked → popup 0.20 s after the worker was
     created, `Error: Worker initialization failed: Failed to fetch`, `Worker:InitFailed` +
     `Worker:InitFailedCause:Crash` (0), sink got `Worker init failed (Crash): …`, worker closed.
     Held open → popup **15.02 s** after the worker was created, `Worker initialization timeout`,
     `…Cause:Timeout` (15), sink got the Timeout line, worker closed. After a Crash failure the
     `reconnect-session` was kept; unblocked + reload → `Reconnect:PromptShown` → Rejoin →
     `Reconnect:Accepted` → `Reconnect:Succeeded` → `Worker:InitSuccess`, same IDs.
- **Not verified live:** the Compact nation positions (unit-tested only); a real Uptrace (local sink only);
  real dev-box network (simulated).
- **Fixes applied without asking / obvious-winner calls: none.** This was a Verify step.

## Process review, round 1 — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Process-review worker)

- Ledger round 1: **no reviewer findings**, and the verdict was ✅ Ready to merge. The *Coder response* has no rows,
  only a round note. There were no accepted residuals, and no ADR (101–116) is in scope. No regression or oscillation.
  Ledger `Status:` set to **closed-out**.
- **Decision log (applied without asking):**
  1. **Obvious-winner doc tweak, in plan file 8.** · *Answers:* the reviewer's optional wording remark
     from the round-1 relay. It is **not** a ledger finding row. · *Changed:* `analytics-event-reference.md`, the
     `Worker:InitFailedCause:{Cause}` row. The Value text "crashed after a slow download" became "crashed after a slow
     step" (e.g. a slow config fetch; a slow map download only on the no-page-map fallback). · *Why it
     qualified:* plan file 8 is the analytics-doc wording for exactly these rows. After 0035 the worker
     downloads the map only on the fallback, and the same row's Crash text already says so. Doc only; no
     code or behaviour change. · *Check:* Prettier drift on the file is 118 diff lines both before and after,
     and the edited line is not part of it (the file already failed Prettier at HEAD, per 0348).
  2. Code fixes applied without asking: **none**.
