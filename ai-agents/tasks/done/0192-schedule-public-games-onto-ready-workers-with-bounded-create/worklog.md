# Worklog — 0192 schedule public games onto ready workers, with a bounded create call

Build worker under `/fkit-sprint-ship-loop` (Sprint 4), 2026-08-27. Plan approved by the owner
2026-08-27 (D1 (A), D2 (B), D3 (A)); `plan.md` blob `68109e4d…`, 19669 bytes — matched before work
started. Working tree: `dev` at `282655c` plus the uncommitted `0056`/`0193` changes; nothing else
touched. Node v24.13.0, Jest 30.

## Change surface

- `src/server/Master.ts` — `GameID` import; new block (130 lines, replacing the 29-line
  `schedulePublicGame`): `PICK_GAME_ID_MAX_ATTEMPTS`, `CREATE_GAME_TIMEOUT_MS`, `GameIDPick`,
  `pickGameID`, `ScheduleDeps` (with the optional `maxAttempts` seam from plan test #9),
  `liveScheduleDeps`, `noReadyWorkersLogged`, exported `schedulePublicGame(playlist, deps)`.
  `startScheduling()`'s call site unchanged. Everything else byte-unchanged.
- `tests/server/Master.test.ts` — import hunk (+8 lines) and the appended
  `describe("0192 ready-worker placement + bounded create")` (367 lines): plan tests #1–#13 plus
  #1b (hash parity against `DevServerConfig.workerIndex`).
- this `worklog.md`.
- Not touched: `WorkerSupervisor.ts`, `Worker.ts`, configs, nginx, client, wiki, `0057` findings,
  ADR-109, incident record.

`git diff --stat` for the two source files is against HEAD and therefore also carries `0056`/`0193`'s
uncommitted hunks (`Master.ts 251 +/-`, `Master.test.ts 1120 +/-`); the 0192-only sizes are the ones
above.

## Step 4 run 1 — unit, lint, types

| Check | Result |
|---|---|
| `npx jest tests/server/Master.test.ts` | 42 passed (14 new + 28 existing) |
| `--randomize` | 7 seeds green after the fixes below; 1 seed (`-888769075`) failed before them |
| `--detectOpenHandles` | 42 passed, no open handles |
| `npm test` | 96 suites, 862 tests passed |
| `npm run lint` | clean |
| `npx tsc --noEmit -p tsconfig.json` | exit 0 |

Test-side defects found and fixed while building (not product code): (1) `cyclingDraw` read
`mock.calls.length` after Jest had already recorded the call — off by one, tests #2/#6; (2) the
expected abort text: the Logger mock's `formatError` is `String(error)`, which renders an
`AbortError` as `AbortError: …`; (3) the real `MapPlaylist.gameConfig()` shuffles maps at random
and, under one seed, spent 10 000 attempts and logged `Failed to generate a valid map playlist` on the
shared log mock — a fixed-body playlist stub replaced it (Master.ts reads only `gameConfig()`).

## Step 4 run 2 — dead index, held dead (dev, 2 workers, loopback)

Pre-flight: ports 3000–3020 free, no `Server.ts` process. Booted 17:07:25 UTC; both ready, `Quorum
reached (2/2)`. `kill -9` worker 1 six times (restarts at 1/2/4/8/16 s), cap hit:

```
17:08:37.495Z Restarted worker 1 (New PID: …)
17:08:39.465Z Worker 1 died again after 5 restarts in the last 10 minutes; giving up on this index (code: null, signal: SIGKILL)
```

Window 17:08:41–17:09:32 (51 s), sampler on `/api/public_lobbies` every 500 ms:

- `Failed to schedule public game on worker w1`: **0** (whole run: 0). `Error scheduling public game`: **0**.
- Creates: **11, all on `w0`**, cadence 4.84 s (dev lobby lifetime 5 s) — `17:08:42.668 … 17:09:31.080`.
  By chance alone 11/11 on one of two indices is p = 2⁻¹¹.
- Sampler: 88 samples, **0 empty, 0 unparseable**, 12 distinct IDs (one lobby at a time).
- Only master error line in the window: `17:08:55.666Z 90s readiness deadline: workers [1] never
  reported ready (1/2)` — `0056`'s expected audit, not this task.
- Contrast with `0057` run 1 (one miss per ~2 draws, 3 error lines each): during the six deaths
  themselves (17:07:55–17:08:41) the master logged exactly one `Error fetching game …: fetch failed`
  (the lobby that was on worker 1 when it died) and zero `Failed to schedule` — every draw while
  worker 1 was between death and ready went to `w0`.

## Step 4 run 3 — rejoin

Fresh boot; `kill -9` worker 1 once at 17:11:00.471.

```
17:11:00.493Z Worker 1 (PID: …) died with code: null and signal: SIGKILL
17:11:00.493Z Restarting worker 1 in 1000 ms (restart 1/5 in window)
17:11:01.495Z Restarted worker 1 (New PID: …)
17:11:03.492Z Worker 1 is ready. (2/2 ready)
```

Creates: before kill `w0` 2 / `w1` 3; between kill and `Worker 1 is ready` **1, on `w0`**
(17:11:01.526 — worker 1 was forked but not yet ready); after rejoin `w0` 5 / `w1` 4
(`17:11:06.379 w1`, `17:11:11.197 w1`, …). `Failed to schedule`: 0 in the run. No lobby was on
`w1` at the kill instant, so no `Error fetching` line either. Said plainly: one in-gap create landing
on `w0` is consistent with the filter, not proof of it (p = ½ by chance); run 2 and unit test #6 are
the evidence for the mechanism.

## Step 4 run 4 — wedged index (`SIGSTOP` worker 1, 40 s)

Fresh boot; `SIGSTOP` 17:12:52.981, `SIGCONT` 17:13:32.507.

During the stop, per draw that landed on `w1` — **5 attempts in 40 s, each failing at 5.0 s** (before:
no failure in 40 s):

```
17:12:58.070Z Error fetching game tei1ACnV: AbortError        ← the lobby on w1, dropped by the poll
17:13:03.072Z Failed to schedule public game on worker w1: AbortError: This operation was aborted
17:13:03.072Z Error scheduling public game: AbortError: This operation was aborted
17:13:03.123Z Error fetching game ApTNYVbm: AbortError        ← the poll of that ID, started 100 ms after the create
17:13:08.124Z Failed to schedule public game on worker w1: AbortError …
17:13:08.171Z Error fetching game UhEg7aUS: AbortError
17:13:08.175  w0 creating Public game DbHeDms1                ← next draw landed on w0
```

Counts in the window: `Failed … w1 … abort` 5, `Error scheduling` 5, `Error fetching` 6, total master
error lines 16 (vs `0057`'s 207 with the unguarded poll). Sampler 65 samples, **41 empty**, 0
unparseable — not flapping any more: the list is genuinely empty for the 5 s each wedged create waits
(p = ½ per draw in dev; 1/20 in prod). ADR-109's accepted residual (a wedged-but-alive worker stays
eligible) is exactly this.

On `SIGCONT`, worker 1 drained 6 buffered creates in 6 ms (`17:13:32.513 … .518`): **5 orphans**
(`ApTNYVbm UhEg7aUS a2cKzMwr J8zkexuR WcTR7Xvt` — each had already been dropped by the master; each
ended `no clients joined, not archiving game` at 17:14:07.5) plus 1 live one (the create in flight at
`SIGCONT`, listed). `Too Many Requests`: **0**. After `SIGCONT`: no master error/warn lines.

**Orphans unchanged vs the `0193` baseline (5 / 5).** The `0193` review's own pre-0192 live re-run
already measured 5 orphans with the poll guard on
(`ai-agents/tasks/done/0193-guard-fetchlobbies-against-overlapping-ticks/review.md:7`); this run
reproduces 5. `0057`'s 2 was the pre-`0193` number: there the unguarded poll flood tripped the
worker's 20 req/s limiter and 429'd some of the queued creates — an accidental orphan guard that
`0193` removed (predicted in its ledger). The plan predicted "same-or-similar, not fewer" for 0192
(aborting the client side does not retract a request already in the stopped worker's socket buffer);
0192 leaves the count where `0193` left it. Run 4b confirms the mechanism. (Wording corrected per
review R1 round 1, finding R3; the earlier text read "5 vs `0057`'s 2" and could be read as a
regression of this diff.)

## Step 4 run 4b — same, with `0193`'s guard disabled

`if (lobbyPollInFlight) return;` commented out (uncommitted, marked `TEMP 0192 run 4b`), fresh boot,
`SIGSTOP` 17:16:31.783 → `SIGCONT` 17:17:11.299.

- In the window: `Failed … w1 … abort` 2, `Error scheduling` 4, **`Error fetching` 150**, total master
  error lines **158** (the flood is back). Sampler 66 samples, 19 empty (flapping again).
- On drain: 2 queued creates 429'd (`Failed to schedule public game on worker w1: … Too Many Requests`
  ×2 at 17:17:11.34), plus `Error fetching game 7sh3wpgt: SyntaxError: Unexpected token 'T'` ×2 (a
  poll that got the limiter's text body — pre-existing). **1 orphan** (`wsFtQV8t`).
- So: guard on → 16 error lines, 5 orphans; guard off → 158 error lines, 1 orphan. The guard is the
  right trade (orphans are ~150 s of an idle GameServer each; the flood was the outage-shaped
  symptom), but the orphan-on-wedge-recovery number is now honest and higher. Not fixable in
  `Master.ts` (plan Step 2 note); a `Worker.ts` check of `req.socket.destroyed`/`req.aborted` before
  `createGame` is the producer's call — see Deviations / NEEDS-DECISION in the envelope.

Revert proof: `grep -c 'TEMP 0192' src/server/Master.ts` → 0; line 431 reads
`if (lobbyPollInFlight) return;`; `git diff -U1 -- src/server/Master.ts` shows the guard hunk as
`0193` wrote it.

## Step 4 run 5 — healthy path (≥ 5 min)

Fresh boot 17:18:55, sampled to 17:28:40 (**9 min 41 s**).

```
17:18:59.752Z Worker 0 is ready. (1/2 ready)
17:18:59.759Z Worker 1 is ready. (2/2 ready)
17:18:59.759Z All workers ready
17:18:59.759Z Quorum reached (2/2, quorum 2), starting game scheduling
```

- `Quorum reached`: once. Master error/warn lines over the whole run: **0**. Lines from this task
  (`No ready workers`, `scheduling resumed`, `unfiltered`, `Failed to schedule`): **0**.
- Creates: **121 — `w0` 61 / `w1` 60**; cadence mean 4.84 s (min 4.76, max 4.86), i.e. unchanged
  from runs 2–3 and from `DevConfig.gameCreationRate` + lobby lifetime. The filter is a no-op at
  full strength, as designed.

## Step 4 run 6 — prod shape

Unit tests #1 (n = 20, 2 excluded, 2000 draws), #3 (cap exhaustion at n = 20), #5 (n = 2 + the 1000
cap) run by name: 3 passed.

## Step 4 run 7 — post-deploy

**Pending by design** — owner/producer, on the real box after the next prod deploy carrying
`0055`/`0056`/`0193`/`0192`. Deployment state of those is UNKNOWN; not assumed.

## Cleanup

Every boot stopped with `stop.sh` (kill master, `pkill -f src/server/Server.ts`), each time verified
`no Server.ts process` and `ports 3000–3020 free`. Logs, sampler output and helper scripts live in the
session scratchpad only; no `persistentID` appears in any excerpt above (none of the selected master
lines carry one; nothing was pasted from client/WS lines).

## Decision log — autonomously-applied calls

Standing approval = the approved plan (ADR-032 Decision 3 / ADR-019 discipline). Each entry: what,
why it qualified.

1. **Playlist stub in tests instead of `new MapPlaylist(false)`.** The plan said "reuse the file's
   existing … mock" without naming the playlist; the real one is random and logs on the shared child,
   which made test #9 order-dependent (seed `-888769075`). Mechanical, test-only, inside Step 3's
   intent (deterministic, fork-free tests). Obvious winner.
2. **`readyCount` + `numWorkers` added to the resume line's meta** (plan sketch had only
   `readyWorkerIndices`). `0056`'s Step 3a rule — values in both message and meta — applied to the
   count already in the message. Localized, in-plan.
3. **Off-by-one and `AbortError:` text fixes in my own fixtures** (run 1 above) — defects in code I
   wrote minutes earlier, not product behaviour; verified by the failing → passing runs.
4. **Test #1b added** (hash parity against `DevServerConfig.workerIndex`) — the plan's Step 3 setup
   text asks for exactly this assertion ("asserted once against `new DevServerConfig().workerIndex`
   at n = 2"); it is a separate `it` rather than folded into #1 so a hash drift fails by name.

Unattended fixes applied to **product** code beyond the plan text: **none**. No obvious-winner call
changed behaviour outside the plan.

### Review round 1 (2026-08-27) — Process-review worker

Owner rulings relayed by the driver. **None of the entries below was autonomous**; each is owner-ruled.
Unattended fixes / obvious-winner calls in this step: **none**.

5. **R1 (owner-ruled: apply now).** `src/server/Master.ts` create-failure `log.error` gained a
   single-object meta `{ gameID, workerIndex, workerPath, timeoutMs: CREATE_GAME_TIMEOUT_MS }`;
   message text byte-identical; no nullable field. `tests/server/Master.test.ts` #11/#12: one
   `toEqual(createFailureMeta(id))` assertion per failure branch via a describe-local helper — no
   suite restructuring.
6. **R2 (owner-ruled: residual, no code).** Recorded in `review.md` *Accepted residuals*: an injected
   `maxAttempts` ≥ 1 is the contract; unreachable via live deps.
7. **R3 (owner-ruled: wording).** Run 4 paragraph and the Deviations bullet above reworded to
   "unchanged vs the `0193` baseline (5 / 5)"; 4b evidence kept; the separate `Worker.ts` guard brief
   noted as the producer's to file at close.

Checks after R1: `npx jest tests/server/Master.test.ts` 42/42; `--randomize` ×2 (seeds 371998607,
-1251461261) 42/42; `--detectOpenHandles` 42/42 clean; `npm run lint` exit 0; `npx tsc --noEmit -p
tsconfig.json` exit 0.

## Deviations from the plan

- Orphan count on wedge recovery (run 4) is **unchanged vs the `0193` baseline (5 / 5)**; `0057`'s 2
  was the pre-`0193` number (reason in run 4/4b). The plan's Step 2 warned the count would not fall,
  and it did not. Not fixable in `Master.ts`. The owner ruled (review round 1, 2026-08-27) that a
  separate `Worker.ts` guard brief — check `req.socket.destroyed`/`req.aborted` before `createGame` —
  is filed by the producer at close; not part of this task.
- The plan's claim that the direct delete "saves the third error line" holds for **fast** failures
  (dead port, 4xx) only; in the wedged case the poll of the new ID starts ~100 ms after the create and
  aborts too, so the `Error fetching game <id>` line still appears (run 4 excerpt). Unit test #12 pins
  the fast-failure behaviour; no code change.
