# Plan — 0193 `fetchLobbies` in-flight guard

**Approval record.** Plan produced by a spawned `fkit-coder` (plan-only) on 2026-08-26 and
**approved by the owner via `AskUserQuestion` in the `fkit lead` session the same day**, driver
`fkit-sprint-ship-loop`. The text from "## Plan — 0193" onward is the coder's return, copied verbatim
by the driver at approval. No plan-time decisions were raised; standing owner rulings the plan honours:
worker rate limiter stays as-is (no exemption); orphan games on recovery are `0192`'s create-timeout
problem; quorum 18/20 untouched; routing untouched (ADR-109).

---

## Plan — 0193 `fetchLobbies` in-flight guard

Code state read: `dev` HEAD `2d1135c`; `src/server/Master.ts` last changed by `419a116` (0055). Line numbers in the brief match the tree (`:128-136` interval, `:433-505` `fetchLobbies`, `:508-535` `schedulePublicGame`). No `0056`/`0192` branch exists locally, so this lands first on `dev` unless the driver sequences otherwise.

### Step 1 — Guard design: skip-if-in-flight (chosen)

**Change in `src/server/Master.ts`:**

1. Add module-level state next to `publicLobbyIDs` (`:89`):
   `let lobbyPollInFlight = false;`
2. Extract the interval body into an exported function (placed just above `fetchLobbies`):
   ```ts
   // Exported for tests. One poll outstanding at a time: a tick that finds the
   // previous poll still pending is a no-op. See 0057 findings §2.2.
   export async function lobbyPollTick(onEmpty: () => void): Promise<void> {
     if (lobbyPollInFlight) return;
     lobbyPollInFlight = true;
     try {
       const lobbies = await fetchLobbies();
       if (lobbies === 0) onEmpty();
     } finally {
       lobbyPollInFlight = false;
     }
   }
   ```
3. Replace `:128-136` with one line: `setInterval(() => void lobbyPollTick(scheduleLobbies), 100);`
   `scheduleLobbies` (`:122-126`) is unchanged; `schedulePublicGame` is not exported.
4. `fetchLobbies` body untouched: the 5 s abort (`:437-438`) stays, the delete-on-error (`:451`) stays, the JSON write (`:500-502`) stays.

**Why this over the alternatives:**

| Option | Verdict | Reason |
|---|---|---|
| **Skip-if-in-flight flag, `setInterval` kept** | **chosen** | Healthy cadence byte-identical (a settled poll takes a few ms; the next 100 ms tick runs as today). Smallest diff on the block 0056 Step 3 rewrites — its `schedulingStarted` guard and "interval installs exactly once" test stay meaningful. Flag at module scope means the invariant holds across *any* number of intervals, which also neutralises 0056 defect #4 until 0056 lands. |
| Re-arm with `setTimeout` after completion | rejected | Cadence becomes 100 ms + poll duration (drift); replaces the very structure 0056 is editing and testing; brief says healthy cadence must not change. |
| Coalesce (remember a skipped tick, run it right after settle) | rejected | Buys nothing: the interval re-fires 100 ms later anyway. Extra state, no behaviour gain. |
| Per-ID in-flight dedupe (poll healthy IDs while one is stuck) | rejected | Needs a merge of partial results into `publicLobbiesJsonStr` (otherwise each tick still writes its own list — the flapping bug in a new coat). Larger diff, and today the staleness is the same: every current tick includes the stuck ID and waits on `Promise.all`, so the body is already frozen ~5 s per stuck ID. The whole-poll guard does not worsen that. |
| Abort the old poll when a new tick wants to start | rejected | A stuck ID would be aborted every 100 ms and never reach its 5 s delete — permanent stall. |
| Flag **plus** a generation counter ("only the newest poll may publish") | not added | Redundant with the flag; the flag already makes a second concurrent poll impossible. Recorded here as the fallback if a future change adds a second `fetchLobbies` caller. |

**Invariant, stated for the reviewer:** at most one `fetchLobbies` outstanding ⇒ every write to `publicLobbiesJsonStr` is made by the newest poll ⇒ no stale/empty list can land on top of a newer good one. Empty bodies are still written when the set is genuinely empty (normal lobby turnover, or the sole lobby's ID aborting) — that is the rare, ≤ 1 s blink R1 already sized, and stays out of scope.

**What this does not change (say so if asked):** a new lobby still arrives only after the 5 s abort when the sole lobby sits on a wedged worker (bounded by the abort, not the guard); the hanging create and the orphans on recovery are `0192`'s create timeout; the worker limiter stays as-is; the uncleared 5 s abort timers on the success path (10/s, harmless no-op aborts) are left alone — not in scope.

### Step 2 — Test seam and tests (`tests/server/Master.test.ts`, extend in place)

**Exports added to `Master.ts`, all marked "exported for tests" like `app` (`:22-24`):**
- `lobbyPollTick` (above).
- `publicLobbyIDs` — `export const publicLobbyIDs`. Minimal seam to seed IDs. Nothing wider: `fetchLobbies` and `schedulePublicGame` stay private (the 0055 review's carried wish to export `fetchLobbies` for shape parity remains 0056's; `0192`'s `pickGameID` extraction is untouched). Output is read through the existing route (`GET /api/public_lobbies` via supertest), so `publicLobbiesJsonStr` needs no export.

**Test mechanics:**
- `jest.mock("undici", () => ({ fetch: jest.fn(), ProxyAgent: jest.fn() }))` hoisted above the imports, same pattern as the file's `jose`/`Logger` mocks. undici 8.0.2 is CJS (`main: index.js`) — no `transformIgnorePatterns` change.
- Capture the master's `log.error` by having the `Logger` mock factory build one child object and expose it on the mocked module (read back with `jest.requireMock`), so the count of `Error fetching game` calls is assertable. Today's factory returns fresh `jest.fn()`s per `child()` call — adjust the existing mock, the three existing tests do not depend on it.
- `jest.useFakeTimers()` (Jest 30) before each tick so the internal 5 s `setTimeout` is faked; `await jest.advanceTimersByTimeAsync(5000)` to fire the abort and flush the promise chains; `jest.useRealTimers()` before any supertest call (supertest needs real sockets).
- Fetch mock shapes: *never settles* → `new Promise(() => {})`; *aborts* → rejects with `Object.assign(new Error("aborted"), { name: "AbortError" })` when `init.signal` fires `abort`; *healthy* → resolves `{ json: async () => ({ gameID, numClients: 0, clients: [], gameConfig: { maxPlayers: 8 }, msUntilStart: Date.now() + 60_000 }) }` (mirrors `Worker.ts:232-239` `game.gameInfo()`; `msUntilStart` must stay > 250 or `:476-484` deletes it).
- Isolation: `afterEach` clears `publicLobbyIDs`, runs one tick with a healthy no-op mock so `publicLobbiesJsonStr` is back to `{"lobbies":[]}`, and resets the mocks — so the three existing placeholder tests keep passing regardless of order.

**Cases (brief's minimum, plus two):**
1. **In-flight skip.** Seed one ID; fetch never settles; call `lobbyPollTick(onEmpty)` three times → `fetch` called **once**, `onEmpty` never called.
2. **Late abort does not overwrite a live lobby.** Seed `{stuck, live}`; stuck aborts, live resolves. Tick A; tick B (skipped: fetch count stays 2, not 4); advance 5 s → A settles: body lists exactly `live`, `stuck` is gone from the set, `log.error` called **once**. Tick C then runs (fetch count 3, only `live`) — proves the flag was released.
3. **Sole stuck lobby → exactly one reschedule.** Seed `{stuck}` only; ticks A, B, C, D; advance 5 s → body `{lobbies: []}`, `onEmpty` called **once**, one error line (was 4 here, 50 live).
4. **Healthy cadence.** Fetch resolves immediately; tick, await, tick, await → one fetch per tick per ID; with an empty set, `onEmpty` fires on every tick (the `lobbies === 0 → schedule` branch is intact).
5. **Flag released on a throwing `onEmpty`.** `onEmpty` throws synchronously → the tick rejects, the next tick still polls. Guards the `finally`.
6. **Regression guard for the old shape** (prove-red): with the guard removed, case 1 shows 3 fetches and case 3 shows 4 error lines — run once during build, recorded in the worklog, not kept as a test.

Also: `npm test`, `npm run lint`, `npx tsc --noEmit -p tsconfig.json` clean.

### Step 3 — Local verification recipe (dev, 2 workers, no nginx)

Uses the 0057 Appendix verbatim; ports 3000–3002 must be free first (Remotion squats 3001 — memory note).

```
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN || echo free
npm run start:server-dev > run.log 2>&1 &          # wait for "All workers ready"
for i in $(seq 1 120); do date +%T.%N; curl -s localhost:3000/api/public_lobbies; echo; sleep 0.5; done > lobbies.log &
# run 2: wedged
kill -STOP <PID of "Started worker 1">; sleep 40; lsof -nP -iTCP:3002 | grep -c ESTABLISHED; kill -CONT <PID>
# run 1: dead   (fresh boot)
kill -9 <PID of "Started worker 1">
pkill -f 'src/server/Server.ts'
```

Counts to report (before = 0057 §2.5 measured baseline; re-run "before" via `git stash` only if a number is surprising):

| Metric | Command | Before | Target |
|---|---|---|---|
| Error lines per stuck ID | `grep -o 'Error fetching game [A-Za-z0-9]*' run.log \| sort \| uniq -c` | 50 | **≤ 1 each** |
| Flap samples (empty sample bracketed by the *same* gameID) | small awk/script over `lobbies.log`: count `X, [], X` triples | 25/120 | **0**; report raw empties separately — empties during real turnover are legitimate |
| Post-`SIGCONT` 429s | `grep -c 'Too Many Requests' run.log` | 3 | **0** |
| Orphans (baseline for `0192`) | `grep -c 'no clients joined, not archiving' run.log` | 2 | report the number, not a target |
| Established conns to `:3002` while stopped | `lsof` line above | 108 | expect single digits |
| Run 1 (dead) | same greps | ~3 lines/miss, ~100 ms | **unchanged** |
| Healthy boot | `grep -c 'All workers ready' run.log`; watch lobby turnover | once; new lobby ≤ ~200 ms after fill/start | **unchanged** |

Filter `persistentID` values out of any excerpt that reaches the worklog.

**Log-volume expectation, to check against:** while a worker is wedged, one `AbortError` line per ID that lands on it, 5 s apart at most — 2-worker dev draws it with p = 1/2, so ~4–8 lines over a 40 s stop (was 207); prod at 20 workers p = 1/20 per draw, ≈ 1 line per ~100 s per wedged worker. Recovery burst shrinks from ~50 queued polls + a few creates to ≤ 1 poll + ≤ ~8 creates, under the 20 req/s limiter — hence the 0 × 429 target. That is an expectation to measure, not a guarantee: a run that queues > 20 creates inside one second on drain could still 429; state the count either way.

### Coordination

- **0056 Step 3** rewrites `:119-137`. After this change the block is one `setInterval(... lobbyPollTick(scheduleLobbies) ...)` line; whichever lands second rebases a one-line conflict. 0056's "installs exactly once" test is unaffected; its Step 4 readiness extraction does not touch the tick.
- **0192** may delete the ID in the create-failure path — compatible; the tick passes `scheduleLobbies` as a callback, so `pickGameID` plumbing stays inside `schedulePublicGame`.
- Worker limiter, quorum 18/20, routing: untouched, as ruled.

## Risks / edge cases

- **Fake timers vs supertest.** Modern fake timers stall real sockets; the plan switches to real timers before every request. If Jest 30's `advanceTimersByTimeAsync` does not flush the undici mock's abort listener chain, fall back to resolving the abort via a manual `await Promise.resolve()` loop — noted so the build does not stall on it.
- **Module-state leakage between tests.** `publicLobbiesJsonStr` and the flag persist across tests in the file; the `afterEach` reset above is mandatory or the three 0055 tests go order-dependent.
- **`Date.now` is faked** under modern timers — `msUntilStart` (`:472`) becomes deterministic; fixtures must use `Date.now() + 60_000` computed *after* timers are installed.
- **A poll can now be skipped for up to 5 s** — this is the same freeze the current code has (every tick waits on the stuck ID), so no new staleness; but if a reviewer expects the healthy lobby's `numClients` to refresh during that window, the answer is "same as before, per-ID dedupe rejected above".
- **Exporting `publicLobbyIDs`** widens the module surface by one mutable `Set`. Marked test-only; no runtime consumer.
- **Wedged create still hangs** for the tick that draws the wedged worker (no timeout) — `0192`. This task's counts will still show orphans; that is expected and reported as `0192`'s baseline.
- **Prod-only caveat:** nginx's 1 s cache of any 200 (R1) still turns a legitimately empty tick into a ≤ 1 s blink for all clients; unchanged by this task and not measurable locally (no nginx in dev).
