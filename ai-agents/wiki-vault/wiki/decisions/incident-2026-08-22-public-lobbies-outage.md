# Incident: 2026-08-22 Public Lobbies Outage

**Date**: 2026-08-22
**Status**: accepted

## Context

On 2026-08-22 production served an empty `/api/public_lobbies` body for roughly **3.5 hours** — every player on the platform saw an empty lobby list (dev unaffected). Service was recovered by `docker restart`.

> **Track status, 2026-08-28.** The whole outage track is **built, reviewed and committed on `dev`** — `0055`, `0057`, `0056`, `0192`, `0193`, `0194`, all agent-closed and **none owner-verified**. Every task's post-deploy check is still pending by design. See "Outcome" below.
>
> 🚢 **DEPLOYED 2026-08-29 — updated 2026-08-30.** This banner previously ended: *"**No deployment to production is confirmed for any of it** … so the assumption for operational purposes remains that **production still runs with crash recovery disarmed**."* **That assumption is now wrong and must not be repeated.** The whole track shipped in release `362a2f9` (`WorkerSupervisor.ts` landed in `dc90719`, an ancestor of it), and the repaired path was observed working on that release: the quorum gate reached **18/20 ready workers, then 20/20 within 80 ms**, with **zero readiness-deadline and zero give-up markers** — the gate opened on quorum rather than on its 90 s fallback, and no worker exhausted its restart cap. Public lobbies were live and filling. ⚠️ **What is still unverified is each task's own checklist, and the failure case itself**: nothing killed a worker in production to watch `WorkerSupervisor` restart it. Crash recovery is **armed and quiet**, not **proven**.

Source: `ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md` (full evidence chain, refuted hypotheses, local repro, and evidence-appendix commands; investigated by an fkit-coder session with the owner present, diagnosis-only mandate).

## Decision

The investigation established a complete causal chain and split the response into tasks rather than one patch:

**Root-cause chain.** Worker 16 died 1.74 s after fork during the `0.0.139` prod deploy → `cluster.on("exit")` in `src/server/Master.ts` reads `worker.process.env.WORKER_ID`, but a Node `ChildProcess` has **no `.env` property**, so the value is always `undefined` → the `if (!workerId)` branch logs one opaque line and returns without restarting — **no worker has ever been restarted after a crash in the project's history** (the defect dates to the fork's first commit `feea527`; the deployed batch is explicitly not implicated) → 19/20 workers alive, but the scheduling gate requires **all 20** ready → scheduling never starts → `publicLobbiesJsonStr` stays `""` → `200` with `Content-Length: 0` → the client's `response.json()` throws and nothing renders.

**Six defects recorded** (all `src/server/Master.ts` unless noted): (1) the always-`undefined` worker ID kills restart, proven; (2) `if (!workerId)` treats worker 0 as missing once #1 is fixed; (3) the all-20 gate has no quorum, timeout, or alarm — one lost worker is a total outage; (4) a re-satisfied gate would install a second lobby-fetch interval; (5) the empty-string lobbies initialiser produces an unparseable body (`src/client/PublicLobby.ts` throws); (6) the exit handler discards `code`/`signal` — the reason **why worker 16 died is unrecoverable** (signature consistent with a native-level abort or a `ts-node`/ESM loader exit under 20 concurrent TypeScript compiles; not proven).

**Task split.** `0055` (defects #5/#6 — parseable body + exit diagnostics; done, agent-closed) → `0057` (investigation: `simpleHash(gameID) % numWorkers()` can route a game to a dead/unready worker — up to ~2-in-20 under the ruled 18/20 quorum; owner-ruled to run **before** `0056`) → `0056` (defects #1–#4: restore crash recovery **with a mandatory restart cap** — owner ruled 2026-08-22: gate quorum **18 of 20 or a 90 s deadline**; restart cap **5 per worker index per rolling 10-min window, backoff 1s→30s**, then give up and log at error level; arming restarts without the cap risks a fork loop, since no restart has ever run before) → `0192` (routing option (v)) → `0194` (the worker-side orphan fix). `0193` (the `fetchLobbies` overlap guard) sits alongside them with no dependency either way. Follow-ups filed unsprinted: `0058` (`Worker.ts` missing `server.on("error")` — explicitly refuted as this outage's cause) and `0059` (precompile the server for prod instead of `ts-node/esm` — the leading but unproven hypothesis for the death itself; owner-ruled 2026-08-23 to stay on the backlog board).

## Outcome (2026-08-26 → 2026-08-28)

**`0057` — investigation, closed 2026-08-26 on findings reviewed with the owner.** It separated two failure shapes: a **dead** index is self-healing (~100 ms and 3 error lines per miss, ≈ 0.33 error lines per scheduled game at 18/20 — a nuisance), while a **wedged** index (alive, accepting, never answering) hangs the create call unboundedly and leaves orphan games plus 429s on recovery — and is **independent of the quorum value**. **The owner confirmed 18 of 20 / 90 s rather than revising it.** The investigation also established that the hash placement is a shared contract rather than load balancing, recorded as ADR-109, and surfaced the poll-overlap defect as its own brief.

**`0056` — closed 2026-08-27.** Crash recovery restored behind a new `src/server/WorkerSupervisor.ts`; the quorum ships as the ratio `ceil(n × 9/10)` so dev's 2 workers stay startable; the interval installs exactly once; a degraded start names the missing indices. Its OTEL verification **corrected a wiki claim** — a single meta object does reach Uptrace as attributes, but a `null`-valued attribute is dropped (see [[systems/telemetry]]).

**`0193` — closed 2026-08-27.** Error lines per stuck ID 50 → 1, lobby-list flapping 25-of-120 samples → 0, self-inflicted 429s 3 → 0.

**`0192` — closed 2026-08-27.** Dead index: 0 misroutes over 51 s. Wedged index: the create fails at 5 s instead of hanging. Orphans were **unchanged (5/5)** and accepted as a residual with a follow-up filed.

**`0194` — closed 2026-08-28, discharging that residual: 0 orphans against the baseline of 5.** Its shipped design deliberately **supersedes its own brief** — the brief's synchronous socket check was *measured* not to fire, so a bounded 10 ms settle wait shipped instead.

**Still open after the track:** *why* worker 16 died (zero output, never reached its first log statement, not kernel-killed) — `0059` addresses the leading unproven hypothesis; exclusion of a wedged-but-alive worker from scheduling, which needs a responsiveness signal nobody has designed; and private-lobby exposure, owner-accepted as-is.

**Notable refuted hypotheses** (recorded so nobody re-runs them): nginx caching, the deployed code batch (`git diff` over it is empty for `src`), disk full, OOM, crash-loop, `EADDRINUSE`, pipe backpressure, process ceilings.

## Consequences

- Recovery-by-restart is not a fix: every deploy and restart re-runs the same 20-worker startup, and the death appears **intermittent, not systematic** (first restart came back 20/20).
- The config-drift sweep around the outage (§9 of the record) surfaced three production defects unrelated to the outage itself, each now a task: **`0062`** — `PROFILE_INTERNAL_TOKEN` is never forwarded by `deploy.sh`, so every profile call no-ops in prod (no profile row, no XP ever credited; blocks `0017` and `0018`); **`0063`** — prod `/api/env` advertised `http` on a raw IP (✅ **fixed and deployed 2026-08-29 in `362a2f9`**; ⚠️ the "silently breaking token login and profile fetch" framing filed here was later found **vacuous** — there is no auth service in this deployment, so no user ever held a token. The config was wrong and is now right, but do not repeat the user-impact claim — see [[tasks/prod-api-env-https-apex]]); **`0061`** — prod Telegram feedback delivery fails (`TypeError: fetch failed`; the initial "needs `TELEGRAM_PROXY_URL`" diagnosis was disproven — the proxy is wired and forwarded, so it is an open investigation). Plus **`0060`** — 150 MB container log retention now shared with nginx access logs nearly cost the investigation window.
- `tests/` had **no coverage of `Master.ts` or `Worker.ts` at all** before `0055`.
- Operational lessons baked into the record: `docker logs` is cumulative across restarts (scope counts to the current boot); an empty-string body is provable from its ETag (base64-SHA-1 of `""`); container logs contain `persistentID` values (documented as the JWT `sub`, PII) — filter before sharing.

## Related

- [[tasks/master-lobbies-worker-exit-diagnostics]] — task 0055, the shipped unblocked half
- [[tasks/worker-routing-dead-worker-investigation]] — task 0057, the routing investigation that ran first
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task 0056, the root-cause fix
- [[tasks/schedule-public-games-onto-ready-workers]] — task 0192, the routing fix
- [[tasks/fetchlobbies-in-flight-guard]] — task 0193, the poll-overlap guard
- [[tasks/worker-reject-departed-requester-create]] — task 0194, the worker-side orphan fix that closed the track
- [[decisions/adr-109-worker-index-placement-contract]] — the placement contract the investigation established
- [[systems/telemetry]] — the OTEL attribute behaviour 0056 measured
- [[decisions/cancelled-tasks]] — where the cancelled duplicate deploy-time config guard (`0072`) from this outage's config-drift sweep is recorded
- [[systems/networking]] — `Master.ts` worker coordination and endpoint surface
- [[systems/player-profile-store]] — the `0062` no-op-in-prod crediting finding lands here
- [[decisions/sprint-4]] — sprint board carrying `0055`–`0057` and the promoted config-drift tasks
- [[decisions/sprint-backlog]] — the unsprinted follow-ups `0058`, `0059`, `0061`
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft posture whose `debug`-level miss logging kept `0062` invisible
- [[tasks/prod-api-env-https-apex]] — task `0063` from this sweep, the one instance fixed and deployed
- [[decisions/config-parity-failure-class]] — where this sweep's `0062`/`0063` findings were joined by a third instance (`0195`) in a **different** deploy pipeline, making it a class rather than a `deploy.sh` bug
- [[systems/project-brief]] — the current-focus picture this outage and the `0062` blocker reshaped
