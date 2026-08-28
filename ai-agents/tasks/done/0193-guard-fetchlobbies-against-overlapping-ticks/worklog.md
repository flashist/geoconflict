# Worklog — 0193 `fetchLobbies` in-flight guard

Build unit executed 2026-08-26 by a spawned `fkit-coder` (driver `fkit-sprint-ship-loop`, Sprint 4).
`plan.md` (blob `5c175485b028e4cc14b47df352b31e4a7a4193fd`, 12730 bytes — re-hashed this turn, matched
the driver's paste) was owner-approved the same day and **not re-authored**. Nothing committed. Code
state at build: `dev` HEAD `282655c` (the plan read `2d1135c`; `src/server/Master.ts` is unchanged
between them — last touched by `419a116`). `ai-agents/wiki-vault/`, the sprint plan, the brief status,
the `0057` report and the incident record were not modified.

## Change surface

- `src/server/Master.ts` (+17 / −10, `git diff --numstat`; an earlier draft of this line said +19 — review R1 nit, corrected):
  - `publicLobbyIDs` is now `export const` (test seam, comment says so); `let lobbyPollInFlight = false;`
    added beside it.
  - New exported `lobbyPollTick(onEmpty)` above `fetchLobbies()` — the plan's function verbatim:
    skip if in flight, set flag, `await fetchLobbies()`, call `onEmpty()` on `0`, release in `finally`.
  - The `:128-136` interval body replaced by the plan's one-liner:
    `setInterval(() => void lobbyPollTick(scheduleLobbies), 100);` — `scheduleLobbies` untouched, so
    `0056` Step 3 rebases a one-line conflict.
  - `fetchLobbies()` body byte-unchanged (5 s abort, delete-on-error, JSON write all as before);
    `schedulePublicGame` not exported.
- `tests/server/Master.test.ts` (extended in place; the three 0055 tests are unchanged):
  - `undici` mocked (`fetch`, `ProxyAgent`); the `Logger` mock now returns one shared child so
    `log.error` calls are countable.
  - New `describe("lobbyPollTick in-flight guard")` with the plan's five cases (fake timers for the
    master's 5 s abort; real timers around every supertest call; `afterEach` restores module state
    and asserts the body is back to `{"lobbies":[]}`).
  - Review round 1, R1 (2026-08-27): fixture promises go through `trackedPromise()` (registers a
    settle hook); `afterEach` settles stragglers, then asserts the reset tick observably ran. Test
    file numstat after R1: `+235 / −11`. `Master.ts` untouched by the review round.
- `ai-agents/tasks/backlog/0193-…/worklog.md` — this file.

No other files touched. `git status` for the two source files: ` M` only.

## Verification evidence

### Unit tests, lint, types (all run this turn, restored source)

```
$ npm test -- tests/server/Master.test.ts
PASS tests/server/Master.test.ts
  GET /api/public_lobbies before any lobby fetch has run
    ✓ responds 200 with a non-empty body
    ✓ responds with a body that JSON.parse accepts
    ✓ responds with the same top-level shape as a real lobbies response
  lobbyPollTick in-flight guard
    ✓ skips ticks while a poll is in flight: one request per ID, not one per tick
    ✓ lets a late abort settle without overwriting a live lobby, then releases the flag
    ✓ reschedules exactly once when the sole lobby aborts
    ✓ keeps the healthy cadence: one fetch per tick per ID, scheduling on an empty set
    ✓ releases the flag when onEmpty throws
Tests: 8 passed, 8 total

$ npm test                       → Test Suites: 96 passed, 96 total; Tests: 828 passed, 828 total
$ npm run lint                   → exit 0, no output
$ npx tsc --noEmit -p tsconfig.json → exit 0, no output
```

### Prove-red (plan case 6) — run once, source restored and re-checked

With `if (lobbyPollInFlight) return;` replaced by a comment:

```
✕ skips ticks while a poll is in flight: one request per ID, not one per tick
    Expected number of calls: 1
    Received number of calls: 3
✕ lets a late abort settle without overwriting a live lobby, then releases the flag (5007 ms)
    thrown: "Exceeded timeout of 5000 ms for a test."
✕ reschedules exactly once when the sole lobby aborts (5009 ms)
    thrown: "Exceeded timeout of 5000 ms for a test."
✓ (the other 5)
Tests: 3 failed, 5 passed, 8 total
```

Case 1 red exactly as the plan predicted (3 fetches for 3 ticks). Cases 2 and 3 went red by **test
timeout, not by the plan's predicted "4 error lines"**: without the guard, the awaited ticks B–D each
open their own request on the stuck ID and block on their own 5 s abort, which the test never advances
(the test only advances the clock after the ticks), so the old shape shows up as a hang under fake
timers. The 4-line count was therefore not observed in that run. Guard line confirmed back in place
(`grep -n "if (lobbyPollInFlight) return;"` → `:430`; `grep -c prove-red` → `0`) before every later
step.

### Step 3 — local reproduction (dev, 2 workers, no nginx; loopback and default ports only)

Ports 3000–3002 verified free before boot (`lsof … || echo free` → `free`). One script (session
scratchpad) did run 2 then run 1, each on a fresh boot, and stopped everything; afterwards
`pgrep -fl 'src/server/Server.ts'` → none, ports free again. Timestamps below are master-log UTC.

**Run 2 — `SIGSTOP` worker 1 (PID 65857, confirmed `T` state) 13:37:02 → `SIGCONT` 13:37:42, sampler
120 × 500 ms from 13:36:57.**

```
13:37:14.786  Error fetching game h35sKutZ: AbortError      ← 4 lines in the whole window, 1 per ID,
13:37:19.860  Error fetching game BQ3AXqsF: AbortError         ≥ 5 s apart (was 50 per ID, 100 ms apart)
13:37:34.574  Error fetching game XaXYvKn6: AbortError
13:37:39.657  Error fetching game ecF6JyeG: AbortError
13:37:42.213-216  w_1 creating … h35sKutZ, BQ3AXqsF, XaXYvKn6, ecF6JyeG, yTbSFsm9   ← drain: 5 creates
13:38:17.259  w_1 no clients joined, not archiving game ×5     ← the drained games end (created + 35 s)
(no "Too Many Requests", no "Failed to schedule" anywhere in run2.log)
```

Sampler sequence (gameID × consecutive samples): `WoT6qf1e ×6, yLvpUXcq ×9, H8c9RBwa ×19, [] ×9,
LTzeDk3K ×9, r6UGy9xt ×19, [] ×14, yTbSFsm9 ×9, 5PrWtHXC ×9, vrvTe3MP ×9, CJFddf6s ×8` — 120 samples,
0 unparseable, **23 empty, 0 flaps**. The two empty stretches (13:37:15.2–19.9 and 13:37:34.9–42.4)
are the brief's out-of-scope shape: the sole lobby's replacement was drawn onto the wedged worker
(create hangs — `0192`), so no live lobby existed anywhere; the second stretch ends the instant the
worker resumes (`yTbSFsm9` at 13:37:42.37). Never was an empty sample bracketed by the same gameID.
The two `×19` stretches are the plan's stated "body frozen ~5 s while the poll waits on the stuck ID".

**Run 1 — `kill -9` worker 1 (PID 66866) at 13:39:05.37, sampler 90 × 500 ms.**

```
13:39:05.396  worker crashed could not find id   (clusterId 2, signal SIGKILL — 0055 fields present)
13:39:05.397  Error fetching game zGz32nvS        ← lobby on the dead worker dropped, 25 ms
13:39:14.928  Failed to schedule public game on worker w1   ┐ miss #1 (3 lines)
13:39:14.928  Error scheduling public game                  │
13:39:15.025  Error fetching game 433cJkyt                  ┘ +97 ms
13:39:19.799/.799/.897   miss #2  (+98 ms)
13:39:24.680/.680/.781   miss #3  (+101 ms)
13:39:29.553/.553/.650   miss #4  (+97 ms)
```

Sampler: 90 samples, 0 unparseable, **1 empty, 0 flaps**; one lobby at a time throughout.

**Healthy boot (both runs).** `All workers ready` once per boot. Pre-stop creates in run 2:
13:36:55.280 (w1), 13:37:00.068 (w0), 13:37:04.922 (w0) — consecutive lobbies with no empty sample
between them.

#### Before / target / measured

| Metric | Before (0057 §2.5) | Target | **Measured** |
|---|---|---|---|
| `Error fetching game` lines per stuck ID | 50 | ≤ 1 each | **1 each** (4 IDs, 4 lines over the 40 s stop; plan expected ~4–8) |
| Flap samples (`X, [], X`) | 25/120 empty | 0 | **0 flaps**; 23/120 raw empties, all in two stretches with no live lobby anywhere (replacement drawn onto the wedged worker — `0192`'s hung create) |
| Post-`SIGCONT` `Too Many Requests` | 3 | 0 | **0** (`grep -c` → 0; also 0 `Failed to schedule`) |
| Orphans (baseline for `0192`) | 2 | report | **4** — every ID the master dropped during the stop was created by w1 on drain (`h35sKutZ`, `BQ3AXqsF`, `XaXYvKn6`, `ecF6JyeG`); drain was 5 creates (was 8). Raw `grep -c 'no clients joined, not archiving'` → 16, but that line is logged by **every** unjoined dev game (control: run 1 → 3), so it is not an orphan count |
| Established conns to `:3002` while stopped | 108 | single digits | **12 `lsof` lines** — loopback lists both ends of each connection, so ≤ 6 connections (4 hung creates + the one in-flight poll + idle pool); not single-digit *lines*, stated as measured |
| Run 1 (dead) | ~3 lines/miss, ~100 ms | unchanged | **unchanged**: 3 lines/miss, 97–101 ms miss→drop, 4 misses, no hang, 1/90 empty (was 2/90) |
| Healthy boot | once; new lobby ≤ ~200 ms | unchanged | `All workers ready` ×1 per boot; next lobby present within one 500 ms sample of the previous one leaving — **the ~200 ms figure is not resolvable**: the sampler is 500 ms and workers log no "game started" line |

Log-volume expectation check: 4 abort lines over a 40 s stop in 2-worker dev, all ≥ 5 s apart —
inside the plan's 4–8 estimate. Recovery burst: 1 poll + 5 creates, no 429.

## What could not be observed, and why

- The plan's predicted **"4 error lines" red shape for case 3** — the unguarded old code hangs the
  awaited ticks under fake timers instead (see prove-red above). Case 1's red (3 vs 1) is the
  observed regression guard.
- **Healthy-turnover latency to ~200 ms** — no worker log line marks game start; bounded to < 500 ms
  by the sampler only.
- **Prod nginx 1 s cache blink (R1)** — no nginx in dev; unchanged by this task, per the plan.
- **Post-deploy check (brief step 5)** — needs the next prod deploy; not this unit's.

## Decision log (applied without asking — each verified-`CORRECT`, localized, inside the approved plan)

1. **Case 1 "never settles" fixture is a manually-released deferred, not `new Promise(() => {})`.**
   Why: an abandoned pending poll would pin `lobbyPollInFlight` for every later test in the file (the
   plan's own "module-state leakage" risk), and the `afterEach` reset tick would then be a no-op. The
   assertions run while the promise is still pending, so the case tests exactly what the plan says;
   the release happens after them. Test-mechanics only; plan intent unchanged.
2. **`publishedLobbyIDs()` re-installs fake timers after each supertest call.** Why: without it,
   case 2's tick C ran under real timers and planted a real 5 s abort timer, which made Jest print
   "did not exit one second after the test run" (observed, then gone). Same "real timers only around
   supertest" rule the plan states, applied symmetrically.
3. **Healthy fixture echoes the URL's gameID** (`healthy(gameID, init)`), because `fetchLobbies()`
   publishes `gi.gameID` from the response body, not the polled ID — the first run of case 2 failed on
   `"unused"` vs `"live"` for that reason. Fixture fix, no behaviour change.
4. **Orphans counted by definition, not by the brief's grep.** The `no clients joined, not archiving`
   grep counts every unjoined dev game (run 1 control: 3); the number reported as the `0192` baseline is
   the set of drain-time creates whose IDs the master had already dropped (4), with the raw grep count
   also stated so nothing is hidden.

Obvious-winner calls: none beyond the above. Nothing outside the approved plan was changed.

## Review round 1 (2026-08-27) — `review.md`, reviewer verdict ✅ ready to merge, one low finding

5. **R1 fixed under the owner's ruling (lead session): "fixtures must settle" + a settle guarantee in
   `afterEach`.** Verified CORRECT: the `afterEach` reset went through the guarded `lobbyPollTick`,
   so a fixture left pending pinned `lobbyPollInFlight` and the reset was a no-op (visible cascade,
   not silent; test hygiene only). Mechanism chosen — the smallest that keeps `Master.ts` at zero
   change: `trackedPromise()` registers a settle hook per fixture promise; `afterEach` settles
   stragglers on real timers, drains on `setImmediate`, then asserts the reset tick ran
   (`resetTick` called once) before the body check. Rejected: a reset export from `Master.ts`
   (0056 builds on that file next), `jest.isolateModules` (larger restructure, same guarantee).
   Proof run: with case 1's `pending.release()` removed, only case 1 fails; the other 7 pass.
   Checks re-run after the fix: `jest tests/server/Master.test.ts` 8/8, `--randomize` seed
   504260008 8/8, `npm test` 96 suites / 828 tests, `npm run lint` 0, `npx tsc --noEmit -p
   tsconfig.json` 0. Ledger row written; header set `closed-out`.
6. Worklog nit from the same round: `Master.ts` numstat corrected to `+17/−10`.
