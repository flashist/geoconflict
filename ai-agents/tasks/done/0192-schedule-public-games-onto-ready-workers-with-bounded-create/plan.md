# Plan — 0192 schedule public games onto ready workers, with a bounded create call

> **Approval record.** Approved by the owner 2026-08-27 via `AskUserQuestion` in the `fkit lead` session
> (`/fkit-sprint-ship-loop`, Sprint 4). Rulings: **D1 (A)** cap 1000, exhausted → last unfiltered draw +
> `warn`; **D2 (B)** empty ready set → skip the tick, `error` once per episode, `info` on resume;
> **D3 (A)** create timeout 5 s, failure path deletes the ID from `publicLobbyIDs` directly (still rethrows).
> Plan text below is the plan worker's return, copied by the driver; HTML entities in the relay were
> restored to `<`, `>`, `=>`.

**Code state read:** working tree on `dev` — HEAD `282655c` **plus the uncommitted, done `0056` and `0193` changes** (`src/server/WorkerSupervisor.ts` untracked; `src/server/Master.ts` and `tests/server/Master.test.ts` modified). HEAD alone carries neither task; this plan targets the working tree. Node v24.13.0, Jest 30, undici 8. No other dirty path is touched.

## Line corrections (working tree supersedes the brief and ADR-109's citations)

| Item | Brief says | Tree now |
|---|---|---|
| Ready set | `readyWorkers` at `Master.ts:20`, grown at `:114`, shrunk by `0056`'s `markDead` | `WorkerSupervisor` private `ready: Set<number>`; read via `readyIndices(): number[]` (`WorkerSupervisor.ts:195-197`); shrinks in `handleExit` (`:140`), grows in `markReady(index, clusterId?)` (`:96-120`). The live instance is `export const workerSupervisor` (`Master.ts:32-62`). No `readyWorkers`, no `markDead` exist. |
| `schedulePublicGame` | `:508-535` | `:516-543`, not exported |
| Bare `generateID()` | `:509` | `:517`; `publicLobbyIDs.add` at `:518` |
| `create_game` fetch | `:516-526` | `:524-534`, no `signal` |
| `fetchLobbies` 5 s abort | `:437-438` | `:445-446` (`AbortController` + `setTimeout`, never cleared) |
| Scheduling interval | `:128-136` | `startScheduling()` `:166-174`; the one interval line is `:173` (`0193`'s `lobbyPollTick` with the in-flight guard, `:430-439`) |
| `publicLobbyIDs` | `:89` | `:125`, exported (`0193`) |
| Precedent | `Worker.ts:545-556` | `generateGameIdForWorker`, `Worker.ts:545-556` — unchanged |
| Hash | `DefaultConfig.ts:296-298` | unchanged: `workerIndex`, `workerPath` `:299`, `workerPort` `:302` |

`readyIndices()` is the seam `0056` left for this task (`Master.ts:29-31` comment, `WorkerSupervisor.ts:6-7`). **No accessor is added to `WorkerSupervisor.ts`; the file is not touched.**

## Design in one paragraph

`schedulePublicGame` stops drawing a bare ID. A new pure, exported function `pickGameID(readyIndices, workerIndexOf, draw, maxAttempts)` in `Master.ts` rejection-samples `draw()` until `workerIndexOf(id)` is in `readyIndices`, capped at `maxAttempts` (the `Worker.ts:545-556` pattern). `schedulePublicGame` is exported and takes an injected `deps` object (`readyIndices()`, `draw()`), defaulting to the live `workerSupervisor.readyIndices()` and `generateID` — the same injection style as `WorkerSupervisor`, so the scheduler is testable without forking. An empty ready set skips the tick; an exhausted cap falls back to the last (unfiltered) draw with a `warn`. The `create_game` fetch gets an `AbortController` timeout (mirroring `fetchLobbies`, plus `clearTimeout`), and the failure path removes the ID from `publicLobbyIDs` itself. Client, worker, nginx, configs: untouched (ADR-109).

## Step 1 — `pickGameID` (pure) + the ready-set draw in `schedulePublicGame`

In `src/server/Master.ts`, above `schedulePublicGame`:

```ts
// 0192 / ADR-109: the worker index is a fixed placement contract, so to avoid a dead
// index we move the ID, not the index (the Worker.ts generateGameIdForWorker pattern).
export const PICK_GAME_ID_MAX_ATTEMPTS = 1000;

export interface GameIDPick {
  gameID: GameID;
  attempts: number;
  // false only when the cap was exhausted: gameID is then the last, unfiltered draw.
  onReadyIndex: boolean;
}

// Pure. Returns null without drawing when nothing is ready (nothing can be scheduled).
export function pickGameID(
  readyIndices: ReadonlySet<number>,
  workerIndexOf: (gameID: GameID) => number,
  draw: () => GameID = generateID,
  maxAttempts: number = PICK_GAME_ID_MAX_ATTEMPTS,
): GameIDPick | null
```

Behaviour: `readyIndices.size === 0` → `null`, `draw` never called. Otherwise loop `attempts = 1..maxAttempts`: `gameID = draw()`; if `readyIndices.has(workerIndexOf(gameID))` → `{ gameID, attempts, onReadyIndex: true }`. After the cap → `{ gameID: <last draw>, attempts: maxAttempts, onReadyIndex: false }`. With every index ready the first draw always hits, so the filter is a no-op and the distribution is untouched.

`schedulePublicGame` becomes:

```ts
export interface ScheduleDeps {
  readyIndices(): number[];
  draw(): GameID;
}
const liveScheduleDeps: ScheduleDeps = {
  readyIndices: () => workerSupervisor.readyIndices(),
  draw: generateID,
};
let noReadyWorkersLogged = false;   // module state, like lobbyPollInFlight

export async function schedulePublicGame(playlist: MapPlaylist, deps: ScheduleDeps = liveScheduleDeps) {
  const ready = new Set(deps.readyIndices());
  const pick = pickGameID(ready, (id) => config.workerIndex(id), deps.draw);
  if (pick === null) {
    if (!noReadyWorkersLogged) {
      noReadyWorkersLogged = true;
      log.error(`No ready workers (0/${config.numWorkers()}); skipping public game scheduling until a worker reports ready`, { readyCount: 0, numWorkers: config.numWorkers() });
    }
    return;                                   // skip the tick; nothing added to publicLobbyIDs
  }
  if (noReadyWorkersLogged) {
    noReadyWorkersLogged = false;
    log.info(`Ready workers available again ([${[...ready].join(", ")}]); public game scheduling resumed`, { readyWorkerIndices: [...ready] });
  }
  const gameID = pick.gameID;
  const workerPath = config.workerPath(gameID);
  if (!pick.onReadyIndex) {
    log.warn(`Public game ID draw hit no ready worker in ${pick.attempts} attempts (ready: [${[...ready].join(", ")}]); scheduling ${gameID} unfiltered on worker ${workerPath}`, { attempts: pick.attempts, readyWorkerIndices: [...ready], workerIndex: config.workerIndex(gameID), gameID });
  }
  publicLobbyIDs.add(gameID);
  … Step 2 …
}
```

(Exact texts are the build worker's; the values must appear in both the message and single-object meta, per `0056`'s Step 3a rule — Uptrace drops `null` attributes but keeps the rest.) `startScheduling()`'s call `schedulePublicGame(playlist)` is unchanged. Exclusion is by liveness only: a ready-then-wedged worker stays eligible (ADR-109 accepted residual).

Cost per scheduled game: one `readyIndices()` sort+copy and mean 1.11 draws at 18/20 (`0057` §3); at the worst realistic case (1 of 20 ready after the deadline) mean 20 draws, P(cap exhausted) = 0.95^1000 ≈ 5e-23. Draws are µs each; 1000 ≈ 1–2 ms once in never.

## Step 2 — Bound the `create_game` call, drop the ID on failure

```ts
export const CREATE_GAME_TIMEOUT_MS = 5_000;
…
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), CREATE_GAME_TIMEOUT_MS);
  try {
    const response = await fetch(`http://localhost:${config.workerPort(gameID)}/api/create_game/${gameID}`, {
      method: "POST",
      headers: { … unchanged … },
      body: JSON.stringify(playlist.gameConfig()),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to schedule public game: ${response.statusText}`);
    }
  } catch (error) {
    publicLobbyIDs.delete(gameID);            // D3: a create that failed is not a lobby
    log.error(`Failed to schedule public game on worker ${workerPath}: ${formatError(error)}`);   // text unchanged (greps, brief step 7)
    throw error;                              // existing contract: scheduleLobbies logs "Error scheduling public game"
  } finally {
    clearTimeout(abortTimer);
  }
```

- `AbortController` + `setTimeout` rather than `AbortSignal.timeout` (used in `ProfileApiClient.ts:237`) because Jest fake timers drive the former (0193's tests rely on exactly this) and not the latter; `clearTimeout` in `finally` so a successful create leaves no 5 s timer behind (the `fetchLobbies` precedent leaks one per poll — harmless, not touched).
- **Why 5 s (D3):** matches the poll's 5 s abort at `:446`. The next tick's poll of the new ID starts ~100 ms after the create and drops the ID at ~5.1 s; any create that succeeds later than that is an orphan by construction, so a longer create timeout buys nothing. Shorter (3 s) is defensible but adds nothing measurable.
- **Failure path drops the ID directly (D3):** `schedulePublicGame` is then self-consistent and testable alone — "not created ⇒ not a lobby" — and a fast failure (dead port, `429`, `400`) reschedules on the very next tick without a poll round-trip (saves the third error line, `Error fetching game …`). `fetchLobbies` deleting the same ID later is a no-op. The rethrow stays: `scheduleLobbies`'s `Error scheduling public game` line is a grep target in `0057` §6.3.
- **Recorded, not fixable here (reasoned, not observed):** aborting the client side does not retract a request already sitting in a `SIGSTOP`ped worker's socket buffer; on `SIGCONT` the worker still parses it and creates the game → orphan. So the brief's "expect fewer than the 2 observed" orphans in verification step 4 may not hold. The timeout's gain is that the master's attempt fails in 5 s and is logged, instead of hanging until undici's ~300 s default. An orphan-proof fix needs `Worker.ts` to check `req.socket.destroyed`/`req.aborted` before `createGame` — out of scope, flagged for the producer.

## Step 3 — Tests (`tests/server/Master.test.ts`, new `describe("0192 ready-worker placement + bounded create")` appended; 0055 / 0193 / 0056 describes untouched)

Setup: reuse the file's existing `undici` fetch mock and the shared `logger.child` mock; fake timers in `beforeEach`; `afterEach` — real timers, settle straggler fetch promises (same `trackedPromise` idea, local copy — 0193's helpers are describe-scoped and are not moved), `publicLobbyIDs.clear()`, `fetchMock.mockReset()`, `jest.getTimerCount() === 0`. `workerIndexAt(n) = (id) => simpleHash(id) % n` (imported `simpleHash`; mirrors `DefaultConfig.workerIndex` `:296-298`, asserted once against `new DevServerConfig().workerIndex` at n = 2). `idOnIndex(n, k)`: rejection-sample the real `generateID` until index `k` (deterministic fixture builder). Under Jest, `config` is `DevServerConfig` (`GAME_ENV` unset → dev → 2 workers, ports 3001/3002).

| # | Case (brief bullet) | Assertion |
|---|---|---|
| 1 | Excluded indices never chosen, n = 20 | ready = 0..19 minus {3, 17}; 2 000 real draws → every `workerIndexOf(gameID)` ∈ ready, `onReadyIndex` true, `attempts ≤ 40` (P(7+) ≈ 1e-7 per draw; cap is 1000 so no flake) |
| 2 | All ready = no-op | draw stub records calls; n = 20 all ready → result is the first stub value, `attempts === 1`, stub called once. Same at n = 2 |
| 3 | Cap exhaustion | ready = {0}, draw stub always returns `idOnIndex(20, 1)`, `maxAttempts = 7` → `onReadyIndex false`, `attempts 7`, `gameID` = the stub value; stub called exactly 7 times |
| 4 | Empty ready set | `pickGameID(new Set(), …)` → `null`, draw never called |
| 5 | Scales to dev's 2 and prod's 20 | #1 rerun at n = 2 with ready = {0} (500 draws → all index 0); `PICK_GAME_ID_MAX_ATTEMPTS === 1000` |
| 6 | Dead-then-ready rejoins | `WorkerSupervisor` harness (same shape as 0056's, n = 2): `start`, `markReady(0/1)`, `handleExit` index 1 → `pickGameID(new Set(readyIndices()), idx, cycleDraw)` with a draw cycling `[idOnIndex(2,1), idOnIndex(2,0)]` returns the index-0 ID with `attempts 2`; fire the restart timer, `markReady(1)` → same call returns the index-1 ID with `attempts 1` |
| 7 | `schedulePublicGame` skips on empty set | `deps.readyIndices → []`: fetch not called, `publicLobbyIDs` empty, `log.error` once with `No ready workers`; second call → still one error (once per episode); then `readyIndices → [0]` + healthy fetch → `log.info` resumed line once, lobby added |
| 8 | Default deps before `startMaster()` | `schedulePublicGame(playlist)` with no deps: `workerSupervisor.readyIndices()` is `[]` → skip, fetch not called (the live seam is wired) |
| 9 | Cap-exhausted fallback still schedules | `deps.readyIndices → [0]`, draw stub → `idOnIndex(2, 1)`; via a `maxAttempts` seam this is awkward through `schedulePublicGame`, so: assert the `warn` line + a fetch to port 3002 (`w1`) using `pickGameID` result semantics — implemented by exposing `maxAttempts` on `ScheduleDeps` as an optional field (default 1000) so the test passes `maxAttempts: 3` |
| 10 | Healthy create | `deps.readyIndices → [0, 1]`, real draw; fetch resolves `{ ok: true }` → URL is `/api/create_game/<gameID>` on port `3001 + workerIndex`, `init.signal` is an `AbortSignal`, admin header present, ID stays in `publicLobbyIDs`, no error/warn logs, `jest.getTimerCount() === 0` after (timer cleared) |
| 11 | **Create aborts at 5 s instead of hanging** | fetch = abortsOnSignal (rejects with `AbortError` when `init.signal` fires); `const p = schedulePublicGame(playlist, deps)`; `advanceTimersByTimeAsync(4_999)` → still pending; `advanceTimersByTimeAsync(1)` → `p` rejects with the AbortError; `log.error` `Failed to schedule public game on worker w<N>: … aborted`; ID removed from `publicLobbyIDs` |
| 12 | Fast failure drops the ID | fetch rejects (`TypeError: fetch failed`) → rejects, error logged, ID removed, timer cleared. Also `!response.ok` (`statusText: "Too Many Requests"`) → same |
| 13 | `CREATE_GAME_TIMEOUT_MS === 5_000` and `≤` the poll abort's 5 000 | pins the D3 value; the poll constant is a literal at `:446`, so the assertion is against `5000` with a comment pointing at it |

Not unit-tested, said plainly: `startScheduling()`'s call site (one line, unchanged) and the real `cluster` wiring — covered by the local runs. Also run: `npx jest tests/server/Master.test.ts --randomize` ×2, `--detectOpenHandles`, `npm test`, `npm run lint`, `npx tsc --noEmit -p tsconfig.json`.

## Step 4 — Local verification (dev, 2 workers, no nginx, no Docker — runnable in the build spawn; commands per the `0057` Appendix, loopback only)

Pre-flight every run: ports 3000–3020 free (Remotion squats 3001 — memory note). Stop everything after; `persistentID` filtered from every excerpt.

1. **Unit, lint, types** — Step 3's list, all green.
2. **Dead index, held dead.** There is no "restarts disabled" switch: hold `w1` dead by hitting `0056`'s cap — `kill -9` worker 1 six times (restarts at 1/2/4/8/16 s, ~35 s) until `giving up on this index`. Then ≥ 45 s with the public-body sampler at 500 ms. Expect: **zero** `Failed to schedule public game on worker w1`, zero `Error scheduling public game`, lobbies replaced at the normal cadence (every 5 s per `DevConfig.gameCreationRate`), sampler never empty because of a miss, worker 0's log shows every create. Before-figure for contrast: `0057` run 1, one miss per ~2 draws.
3. **Rejoin.** Fresh boot; `kill -9` worker 1 once. The lobby on `w1` is dropped by the next tick (~32 ms) and the replacement is drawn while `w1` is out of the ready set → it lands on `w0` (master log: no `w1` create until `Worker 1 is ready`); after `Restarted worker 1` + `Worker 1 is ready` (~1 s), subsequent creates land on both indices again (both worker logs show creates within the next few lobby cycles). "Restart by hand" is not possible for an abandoned index (`0056` has no manual re-fork); the auto-restart is the rejoin path.
4. **Wedged index.** `SIGSTOP` worker 1 for 40 s. Expect per draw that lands on `w1`: `Failed to schedule public game on worker w1: … aborted` + `Error scheduling public game` within ~5 s (before: no failure in 40 s). On `SIGCONT`: count `no clients joined, not archiving` for IDs the master never listed → report the number against `0057`'s 2 — **expected same-or-similar, not fewer** (Step 2's socket-buffer note); report `Too Many Requests` count. 4b: repeat with `0193`'s guard temporarily disabled (comment out `if (lobbyPollInFlight) return;`, uncommitted; `git diff` proof of revert in the worklog) since both are on the branch, per the brief.
5. **Healthy path.** Full boot, all ready: `Quorum reached` once, cadence unchanged, no warn/error lines from this task; over ≥ 5 min count creates per worker in both worker logs — roughly even at 2 workers (the filter is a no-op at full strength).
6. **Prod shape** — unit tests #1, #3, #5 at n = 20.
7. **Post-deploy** (owner/producer, real box) — brief step 7, `docker logs --since <boot>` → no `Failed to schedule public game` lines on a healthy run. Deployment of `0055`/`0056`/`0193`/this change to prod is **UNKNOWN**; not assumed.

## Change surface

- **Edit** `src/server/Master.ts`: constants `PICK_GAME_ID_MAX_ATTEMPTS`, `CREATE_GAME_TIMEOUT_MS`; `GameIDPick`, `ScheduleDeps`, `pickGameID`, `liveScheduleDeps`, `noReadyWorkersLogged`; `schedulePublicGame` exported + deps param + pick + empty/fallback branches + abort timer + failure-path delete. Import `GameID` type from `../core/Schemas`. Everything else byte-unchanged.
- **Edit** `tests/server/Master.test.ts`: import hunk (`pickGameID`, `schedulePublicGame`, the two constants, `simpleHash`, `DevServerConfig`) + the appended describe.
- **Write** task folder `worklog.md` (evidence, decision log, unattended-fix record or `none`).
- **Not touched:** `WorkerSupervisor.ts`, `Worker.ts`, configs, nginx, client, `Dockerfile`, wiki, incident record, `0057` findings, ADR-109.

## Risks / edge cases

- **Wedged worker still eligible** — liveness ≠ health; ADR-109 accepted residual. The timeout bounds each wedged draw to one 5 s failure; at 20 workers p = 1/20 per draw.
- **Orphans on wedge recovery are not removed by the timeout** (Step 2 note). Reported honestly in step 4; a `Worker.ts` guard is a separate brief if wanted.
- **Empty-ready-set episode is silent after the first error line** (D2 rec) — the underlying causes already log at error (`giving up`, 90 s deadline audit); the resume line closes the episode. If the owner prefers recurring lines, D2 option (C).
- **Healthy prod boot at 18/20** — the two still-booting indices are simply not drawn for a few hundred ms, then rejoin on `WORKER_READY`; long-run distribution unaffected.
- **`429` from the worker's 20 req/s limiter** (`Worker.ts:109-114`) → `!response.ok` → drop + rethrow + reschedule next tick, possibly onto the same worker for up to 1 s — pre-existing, unchanged, cheaper than before by one poll round-trip.
- **Fake-timer coexistence** — the new describe installs fake timers in its own `beforeEach` like 0193's; the supervisor suite never touches `setTimeout`. `clearTimeout` in `finally` keeps `--detectOpenHandles` clean.
- **Tree hygiene** — `0056`/`0193` are uncommitted in the same tree; keep this diff to the two files above. If the owner commits `0056` first, nothing here changes.
- **Rate of `readyIndices()` calls while the set is empty** — 10/s, each a sort of ≤ 20 numbers; negligible.

## Decisions raised at plan time — see the approval record above once ruled

- **D1** — attempt cap **1000** + on exhaustion **last unfiltered draw + `warn`** (brief-mandated fallback).
- **D2** — empty ready set → **skip the tick, `error` once per empty episode, `info` on resume**.
- **D3** — create timeout **5 s**, failure path **drops the ID from `publicLobbyIDs` directly** (and still rethrows).
