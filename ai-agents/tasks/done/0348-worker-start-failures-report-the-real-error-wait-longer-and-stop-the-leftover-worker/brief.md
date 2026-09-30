# Worker start failures: report the real error, wait longer than 5 s, and stop the left-over worker

## ID
0348

## Sprint
Sprint 7

## Priority
23 — append rank. ⚠️ **Part of the owner-ruled top-of-Sprint-7 reconnect work (R2), worked directly after
[`0347`](../../done/0347-a-refresh-after-a-failed-match-start-can-rejoin-the-match/brief.md)**, whatever this number says.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner ruling R2 given
live in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent. R2
(`AskUserQuestion`, "What should the Sprint 7 reconnect task cover?") → **"Rejoin + fix the timeout
(Recommended)"** — *"…Also fix 0035 (give the worker the map the page already loaded, and/or a longer limit), so
start failures happen less. Removes the main cause."* Full authority record:
[`0347`](../../done/0347-a-refresh-after-a-failed-match-start-can-rejoin-the-match/brief.md) § Context.

**Why this is its own task (producer's split, flagged for the owner).** [`0035`](../0035-worker-init-timeout-map-refetch/brief.md)
says its two fixes are *"independent and complementary"*: Option A (give the worker the map) and Option B (raise
the limit), plus a worker-leak fix. Option B + the leak fix are small and ship alone; Option A is bigger and
touches `src/core` map loading. So B + the leak fix live here, and `0035` keeps Option A (see its 2026-09-29
addendum). This task also adds one thing `0035` did not know:

**New finding — `fkit-coder`'s reading, 2026-09-29, spot-checked by the producer the same day:** a crash inside the
worker's start **looks exactly like "slow"**. In `Worker.worker.ts` (~`:42-58`), the `init` case calls
`createGameRunner(...).then(...)` inside a `try`, but that `try` only catches errors thrown straight away — a failure
inside the async map load / runner build is never caught and never posted back. `WorkerClient.ts`'s `error`
listener (~`:37-42`) does not see it either (a rejected promise is not a worker `error` event). So the page waits
the full 5 s and reports **"Worker initialization timeout"**. ⚠️ This means `0035`'s regression analysis point 1
(*"real crashes still fail fast"*) is **only true for errors thrown straight away**, not for this async case.

Consequence for the owner's case (game `FVgxfTRH`, "Worker initialization timeout"): today nobody can tell whether
it was a slow download or a crash. After this task, they can.

## What to build

1. **Report a real start failure as itself, at once.** When the worker's start fails for any reason, the page learns
   it immediately with the real error (not after the time limit, not as "timeout"). The error modal shows it; the
   player-facing wording stays as today unless the plan argues otherwise.
2. **Raise the start time limit** from 5 s — `0035` proposes **15 s**, with a regression analysis
   (`0035` § *Regression analysis of raising the timeout*: server disconnect window 60 s, late start loses no turns,
   no test pins `5000`, the connection watchdog starts only after start). Re-check those points; the plan picks the
   number.
3. **Stop the left-over worker on failure** (`0035` § *Also fix while here — worker leak on failure*): the failure
   path calls the worker's cleanup before returning.
4. **Analytics:** make "timed out" and "crashed" tell apart in `Worker:InitFailed` (a value, or a separate event —
   the plan decides). Update `ai-agents/knowledge-base/analytics-event-reference.md` in the same change; event
   strings only through the enum.

## Verification steps

1. **Forced crash:** make the worker's map load fail (e.g. block the map URL in DevTools) → the error appears within
   about a second, with the real reason, **not** "Worker initialization timeout"; the analytics event says "crash".
2. **Slow but working:** throttle so the worker's map load takes longer than 5 s but less than the new limit → the
   match starts.
3. **Real timeout:** a hang longer than the new limit → the timeout error appears; the event says "timeout".
4. **No left-over worker:** after a forced failure, DevTools shows no running game worker.
5. Tests cover the new failure report and the cleanup (`src/core/` changes must be tested — project rule).
6. `npm test` and `npm run lint` pass.

## Notes

- **Depends on: nothing.**
- **Blocks:** nothing hard. **Sequencing:** do this before `0035` — both edit the worker start path
  (`WorkerClient.ts`, `ClientGameRunner.ts` catch block), and this task's crash-vs-timeout signal tells how much
  `0035`'s map hand-over actually buys.
- Works alone and alongside [`0347`](../../done/0347-a-refresh-after-a-failed-match-start-can-rejoin-the-match/brief.md);
  once this lands, `0347`'s repro B may need a forced worker error instead of a slow network (the limit is longer).
- Carved out of `0035` (Option B + leak fix) by the producer. `0035` is **not** cancelled or closed; it keeps
  Option A.
- ✅ **Split CONFIRMED 2026-09-29 — the *"flagged for the owner"* in § Context is cleared (text kept as written, ADR-035).** OWNER RULING given live 2026-09-29 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **Q2** (keep the producer's three-way split of the reconnect work?) → **"Keep 3 tasks (Recommended)"** — `0347` rejoin, `0348` worker-failure handling, `0035` reuse the map; **`0347` first**. This task stays second, after `0347`. No scope changed.
