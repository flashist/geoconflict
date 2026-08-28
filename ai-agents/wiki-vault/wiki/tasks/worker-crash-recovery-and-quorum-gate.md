# Restore Worker Crash Recovery — With a Restart Cap — and Make the Scheduling Gate Survivable

**Source**: `ai-agents/tasks/done/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — 2026-08-22 outage track — task `0056`

> ✅ Done (agent-closed 2026-08-27 — **not owner-verified**). Built, stateful review closed out, committed on `dev`. **Deployment to production is not confirmed** — the brief's post-deploy check (step 8) is pending by design, and whether the earlier `0055` fix reached prod was never established either.

## Goal

The root-cause fix for the 2026-08-22 total loss of public lobbies. Four defects, all in `src/server/Master.ts`:

1. `worker.process.env` does not exist on a Node `ChildProcess`, so the exit handler's `workerId` was **always** `undefined` — **no worker has ever been restarted after a crash in this project's history** (the defect dates to `feea527`, the fork's first commit).
2. `if (!workerId)` treats worker index **0** as missing, since `0` is falsy. Masked by defect 1; goes live the moment it is fixed.
3. The scheduling gate required **all 20** workers ready — no quorum, no timeout, no alarm. One lost worker in twenty was a total outage.
4. A re-satisfied gate would install a **second** lobby-fetch interval.

**Two owner rulings, made 2026-08-22, implemented as given:** (a) scheduling starts at a quorum of **18 of 20** ready workers or a **90-second deadline**, whichever comes first; (b) restart cap of **5 per worker index per rolling 10-minute window**, exponential backoff **1 s → 30 s**, then stop re-forking that index and log at `error` level.

**The cap was non-negotiable and had to ship in the same change.** Fixing defect 1 arms worker restarts for the first time ever, and nobody knows why worker 16 died — a worker crashing repeatedly for that same unknown reason would otherwise be respawned forever.

## Key Changes

- **New `src/server/WorkerSupervisor.ts`** — readiness and restart tracking extracted into a testable unit (`markReady`, `markDead`, `missing()`, quorum/deadline logic). The extraction was expected and approved by the brief; it enlarges the diff beyond a minimal patch.
- **The quorum is a ratio, not the literal 18.** `quorumFor(n) = max(1, ceil(n × 9 / 10))` — 20 → 18, 10 → 9, 2 → 2, 1 → 1. Integer arithmetic on purpose. A hard-coded 18 would have made dev (2 workers) unstartable.
- Worker index is now tracked in a `Map` populated at fork time **and on every restart**, tested with `=== undefined` rather than falsiness, so index 0 survives. A dead worker is removed from `readyWorkers`, which nothing did before.
- Backoff is `1 s, 2 s, 4 s, 8 s, 16 s`, ceiling 30 s. With the cap at 5 the ceiling is never reached inside one window — the 6th death gives up instead — but it is still enforced.
- A `schedulingStarted` guard installs the lobby-fetch interval **exactly once**, including quorum-then-deadline and across a restart that re-satisfies the condition. A degraded start logs **which indices** never reported, by index.
- `tests/server/Master.test.ts` extended substantially (28 cases in the `WorkerSupervisor` describe), including the fork-loop guard — the brief's most important test. `0055`'s and `0193`'s describes untouched.
- Review round 1 added a spawn-failure branch (`worker.once("error")` → the same restart path) and a `markReady` sender cross-check that ignores stale or mismatched `WORKER_READY` messages.

## Outcome

- The 2026-08-22 scenario resolves into a non-event under the ruled values, which was the point of the ruling.
- **Verification 4a passed with a caveat, and it corrects a wiki claim.** Observed in Uptrace 2026-08-27 (dev): `workerIndex`, `clusterId`, `pid`, `signal`, `restartsInWindow`, `windowMs`, `missingWorkerIndices`, `readyCount`, `numWorkers`, `quorum` all arrive **as log attributes**. **A `null`-valued attribute is dropped** — `code: null` on a signal death is absent from the attribute set, though the message text still carries it. See [[systems/telemetry]], where the old "silently drops extra arguments" gotcha has been corrected to what was measured.
- Uptrace free-text search did not match these lines; attribute filters did.
- **Deployment is unconfirmed.** Brief verification step 8 (20/20 ready on the real box, `Quorum reached … starting game scheduling` present exactly once per boot, endpoint serving a real lobby) is pending by design.
- **This task does not explain the crash.** Why worker 16 died stays open — it produced zero output, never reached its first log statement, and was not killed by the kernel. Task `0059` (precompile the server for prod instead of `ts-node/esm`) addresses the leading unproven hypothesis.
- Residual left deliberately: a degraded-quorum start still misroutes a fraction of scheduled games. That is what task `0192` removes.

## Related

- [[tasks/worker-routing-dead-worker-investigation]] — task `0057`, which ran first and confirmed the 18/20 quorum
- [[tasks/schedule-public-games-onto-ready-workers]] — task `0192`, which consumes this task's maintained ready set
- [[tasks/worker-reject-departed-requester-create]] — task `0194`, the last item on the same track
- [[tasks/fetchlobbies-in-flight-guard]] — task `0193`, which edits the same interval block (rebase, no dependency)
- [[tasks/master-lobbies-worker-exit-diagnostics]] — task `0055`, whose exit diagnostics this carries forward to both branches
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident record this fixes
- [[decisions/adr-109-worker-index-placement-contract]] — the placement contract the quorum made live
- [[systems/networking]] — master/worker coordination
- [[systems/telemetry]] — the OTEL attribute behaviour this task measured
- [[decisions/sprint-4]] — the sprint board carrying the outage track
