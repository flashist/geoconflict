# Investigation — Public-Game Routing Can Send Games to a Dead or Unready Worker

**Source**: `ai-agents/tasks/done/0057-investigate-worker-routing-to-dead-or-unready-workers/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — 2026-08-22 outage track — task `0057` — architect-led

> ✅ Done (agent-closed 2026-08-26 — **not owner-verified**). Findings were reviewed with the owner the same day and the task closed on them. Investigation only — no routing code changed under this brief.

## Goal

Size the routing residual that task `0056`'s quorum gate was about to make live, and say whether the owner's ruled quorum should stand.

`schedulePublicGame` selects a worker with `simpleHash(gameID) % numWorkers()` — a pure function of the game ID and the **configured** worker count, consulting no liveness or readiness state. Before `0056`, this was invisible: the all-20 scheduling gate refused to schedule anything unless every worker was ready, a worse failure that masked this one. The owner's ruled quorum of **18 of 20** permits up to two missing indices, so up to **2 in 20 (~10%)** of scheduled public games could land on an absent worker. Frequency was settled by the ruling; **severity was the unknown**, and severity decides whether the residual is acceptable.

The owner ruled 2026-08-22 that this investigation runs **before** `0056`, so the quorum could be revisited before it was built rather than after.

## Key Changes

No code. Output is the findings document `ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`, plus three follow-up briefs and one ADR.

**Two distinct failure shapes, measured locally (dev, 2 workers):**

- **Dead index** (port refuses) — **self-healing**: ~100 ms and 3 error lines per miss, no hang, no orphan. Expected cost at 18/20 is ≈ 0.11 extra draws ≈ 11 ms ≈ 0.33 error lines per scheduled game. Player-visible only rarely (≈ 1 blink/hour at 100 games/hour) and briefly (≤ 1 s), because a miss rewrites the lobbies JSON to `[]` and nginx caches any 200 for 1 s.
- **Wedged index** (alive, accepts connections, never answers) — the create call **hangs unbounded**; on recovery the queued creates succeed against IDs the master already dropped, producing **orphan public games** plus `429 Too Many Requests` on later creates. **Independent of the quorum value**: `readyWorkers` tracks liveness, never responsiveness. Node's cluster primary owns the listening socket and keeps *accepting* connections for a stopped worker, which is why a wedged worker looks alive.

**What the hash is actually buying** (§3): deterministic placement is a **shared contract, not load balancing** — four parties compute it independently and there is no game→worker registry. That finding became [[decisions/adr-109-worker-index-placement-contract]].

**A separate defect surfaced in passing** (§2.2, §7): the 100 ms lobby poll has no in-flight guard, so a stuck worker stacks a request per tick — 50 error lines per stuck ID, ~21% lobby-list flapping, self-inflicted 429s. Filed as its own brief.

**Recommendation:** option **(v)** — rejection-sample the game ID onto a ready index, plus a bounded create timeout. Master-only; the client/worker/nginx contract is untouched. Distribution is uniform to within ±1.2% over 20 indices; sampling onto 18 ready of 20 takes mean 1.11 draws, max 7 in 2×10⁵ trials.

## Outcome

- **The quorum was confirmed, not revised.** The owner reviewed the findings 2026-08-26 and **18 of 20 with a 90 s deadline stands**. The dead-index residual is a nuisance, not an outage; the one bad shape is quorum-independent.
- Three follow-up briefs approved the same day: `0192` (option (v)), `0193` (the poll guard), and later `0194` (the worker-side orphan fix). All three shipped.
- ADR-109 records the placement contract the investigation uncovered.
- **Private lobbies were examined and left exposed** (§7) — the host picks the ID client-side and POSTs straight to `/w<N>/`; no master-only option helps without publishing worker health to the client. Owner-accepted.
- **Open, not answered here:** whether this ever bit production before. The 2026-08-22 incident is not evidence of it — nothing was scheduled at all under the old gate. A responsiveness signal for wedged workers (§9) is named as a future item, not designed.
- An Uptrace query line (§6.3) for `Worker mismatch` / `should be on worker` remains worth running: hits there would mean client/server worker-count drift, a different failure that looks the same from outside.

## Related

- [[decisions/adr-109-worker-index-placement-contract]] — the contract this investigation established
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task `0056`, which this ran before and whose quorum it confirmed
- [[tasks/schedule-public-games-onto-ready-workers]] — task `0192`, the recommended option (v)
- [[tasks/fetchlobbies-in-flight-guard]] — task `0193`, the standalone defect found in passing
- [[tasks/worker-reject-departed-requester-create]] — task `0194`, which closed the orphan shape §2.5 first observed
- [[tasks/master-lobbies-worker-exit-diagnostics]] — task `0055`, the earlier half of the same outage track
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident that surfaced this
- [[systems/networking]] — worker routing and the master's endpoint surface
- [[decisions/sprint-4]] — the sprint board carrying the outage track
- [[decisions/sprint-backlog]] — the unsprinted board `0057` was filed on before its same-day promotion
