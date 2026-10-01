# Worker Start Failures Report the Real Error, Wait 15 s, and Stop the Leftover Worker (task 0348)

**Source**: `ai-agents/tasks/done/0348-worker-start-failures-report-the-real-error-wait-longer-and-stop-the-leftover-worker/brief.md` (evidence read from the same folder's `plan.md`, `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 23 (append rank; part of the owner-ruled top reconnect run) / task `0348`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `9cb8ee4`; **not in any deploy yet**
> (latest game tag `0.0.155`). Live checks ran on local dev only; the Uptrace line was checked at a **local fake
> sink**, never in a real Uptrace.

## Goal

Second of the three reconnect tasks split from owner ruling R2 (see [[tasks/rejoin-after-failed-match-start]]).
Carved out of [[tasks/worker-reuses-page-map]]'s Option B (raise the limit) plus its worker-leak fix, with one
new finding:

**A crash inside the worker's start looked exactly like "slow".** In `Worker.worker.ts`'s `init` case, the `try`
around `createGameRunner(...).then(...)` only caught errors thrown straight away. A failure inside the async map
load / runner build was never posted back, and `WorkerClient`'s `error` listener does not see a rejected
promise. So the page waited the full 5 s and reported **"Worker initialization timeout"**. ⚠️ This made `0035`'s
regression point *"real crashes still fail fast"* true only for synchronous errors. For the owner's case (game
`FVgxfTRH`) nobody could tell a slow download from a crash.

## Key Changes

- **`src/core/worker/WorkerMessages.ts`** — new `init_failed` message type (`InitFailedMessage`, carries a string
  reason).
- **`src/core/worker/Worker.worker.ts`** — a separate `.catch` on the start promise posts `init_failed` with the
  real reason; the promise stays rejected on purpose.
- **`src/core/worker/WorkerClient.ts`** — `WORKER_INIT_TIMEOUT_MS = 15000` (was a hard-coded 5000); new
  `WorkerInitTimeoutError` (message unchanged: `"Worker initialization timeout"`); `init_failed` rejects at once
  with `Worker initialization failed: <reason>`; the timer is cleared on every settle.
- **`src/client/ClientGameRunner.ts` (`createClientGame` catch)** — `worker?.cleanup()` first (and deliberately
  **no** `clearReconnectSession`, per `0347`); `Worker:InitFailed` unchanged; new
  `Worker:InitFailedCause:{Timeout|Crash}` with whole seconds since the worker start; one Uptrace warning,
  `Worker init failed (<cause>): <reason>`, via `logOtelWarn` (owner-approved addition). The player-facing
  heading is unchanged; only the technical `Error:` line now shows the real reason. No new text keys.
- **Why 15 s, not more (plan):** the multiplayer spawn phase is ~20 s (300 turns × 66.7 ms); a start slower than
  that joins after spawning has closed. The server disconnect window is 60 s; a late start loses no turns.

## Outcome

- **Live checks (local dev, Playwright):** forced crash → modal ~1.1 s after the worker was created, real reason
  shown, `…Cause:Crash`, worker closed **PASS**; worker bundle blocked **PASS**; slow but working (~6.3 s start)
  → match starts **PASS**; real hang → modal at **15.0 s**, `…Cause:Timeout` (value 15) **PASS**; no leftover
  worker in any failure case **PASS**; `0347` rejoin still works **PASS**.
- ⚠️ **Observation:** when the worker **script** fails to load, the reason reads `Worker crashed: undefined` —
  the browser's `error` event carries no message (pre-existing listener, not this change).
- **Full `npm test`:** 182/182 suites, 3244 tests, first run, no flake. `npm run lint` clean.
- **Review:** R2 (test fixture read like a timeout but ran the Crash branch) fixed. **R1 → accepted residual,
  owner ruling *"Note it on 0035"*:** leaving while the worker is still starting, then a failed start, still
  shows the error popup (possibly over the next match) and logs the failure telemetry; the 15 s limit makes the
  timeout case up to 15 s late. No teardown leak (`onGameEnd` is generation-guarded). **`0035` then fixed it.**

## Related

- [[tasks/rejoin-after-failed-match-start]] — task `0347`, first in the reconnect run
- [[tasks/worker-reuses-page-map]] — task `0035`, which kept Option A and fixed this task's R1
- [[systems/analytics]] — `Worker:InitFailedCause:{Cause}`
- [[systems/client-game-teardown]] — site B (worker-init failure) now also stops the worker; `init_failed` is a worker→main error message for the start only
- [[systems/architecture-overview]] — its "5,000 ms" worker-init timeout is now 15 s
- [[features/reconnection]] — the flow a failed start now feeds into
- [[decisions/sprint-7]] — the board
