# Incident: 2026-08-22 Public Lobbies Outage

**Date**: 2026-08-22
**Status**: accepted

## Context

On 2026-08-22 production served an empty `/api/public_lobbies` body for roughly **3.5 hours** — every player on the platform saw an empty lobby list (dev unaffected). Service was recovered by `docker restart`; the root-cause defects remained unfixed in `main` at the time of the record, and **production still runs with worker crash recovery disarmed** until task `0056` ships.

Source: `ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md` (full evidence chain, refuted hypotheses, local repro, and evidence-appendix commands; investigated by an fkit-coder session with the owner present, diagnosis-only mandate).

## Decision

The investigation established a complete causal chain and split the response into tasks rather than one patch:

**Root-cause chain.** Worker 16 died 1.74 s after fork during the `0.0.139` prod deploy → `cluster.on("exit")` in `src/server/Master.ts` reads `worker.process.env.WORKER_ID`, but a Node `ChildProcess` has **no `.env` property**, so the value is always `undefined` → the `if (!workerId)` branch logs one opaque line and returns without restarting — **no worker has ever been restarted after a crash in the project's history** (the defect dates to the fork's first commit `feea527`; the deployed batch is explicitly not implicated) → 19/20 workers alive, but the scheduling gate requires **all 20** ready → scheduling never starts → `publicLobbiesJsonStr` stays `""` → `200` with `Content-Length: 0` → the client's `response.json()` throws and nothing renders.

**Six defects recorded** (all `src/server/Master.ts` unless noted): (1) the always-`undefined` worker ID kills restart, proven; (2) `if (!workerId)` treats worker 0 as missing once #1 is fixed; (3) the all-20 gate has no quorum, timeout, or alarm — one lost worker is a total outage; (4) a re-satisfied gate would install a second lobby-fetch interval; (5) the empty-string lobbies initialiser produces an unparseable body (`src/client/PublicLobby.ts` throws); (6) the exit handler discards `code`/`signal` — the reason **why worker 16 died is unrecoverable** (signature consistent with a native-level abort or a `ts-node`/ESM loader exit under 20 concurrent TypeScript compiles; not proven).

**Task split.** `0055` (defects #5/#6 — parseable body + exit diagnostics; done, agent-closed) → `0057` (investigation: `simpleHash(gameID) % numWorkers()` can route a game to a dead/unready worker — up to ~2-in-20 under the ruled 18/20 quorum; owner-ruled to run **before** `0056`) → `0056` (defects #1–#4: restore crash recovery **with a mandatory restart cap** — owner ruled 2026-08-22: gate quorum **18 of 20 or a 90 s deadline**; restart cap **5 per worker index per rolling 10-min window, backoff 1s→30s**, then give up and log at error level; arming restarts without the cap risks a fork loop, since no restart has ever run before). Follow-ups filed unsprinted: `0058` (`Worker.ts` missing `server.on("error")` — explicitly refuted as this outage's cause) and `0059` (precompile the server for prod instead of `ts-node/esm` — the leading but unproven hypothesis for the death itself; owner-ruled 2026-08-23 to stay on the backlog board).

**Notable refuted hypotheses** (recorded so nobody re-runs them): nginx caching, the deployed code batch (`git diff` over it is empty for `src`), disk full, OOM, crash-loop, `EADDRINUSE`, pipe backpressure, process ceilings.

## Consequences

- Recovery-by-restart is not a fix: every deploy and restart re-runs the same 20-worker startup, and the death appears **intermittent, not systematic** (first restart came back 20/20).
- The config-drift sweep around the outage (§9 of the record) surfaced three production defects unrelated to the outage itself, each now a task: **`0062`** — `PROFILE_INTERNAL_TOKEN` is never forwarded by `deploy.sh`, so every profile call no-ops in prod (no profile row, no XP ever credited; blocks `0017` and `0018`); **`0063`** — prod `/api/env` advertises `http` on a raw IP, silently breaking token login and profile fetch from the https page; **`0061`** — prod Telegram feedback delivery fails (`TypeError: fetch failed`; the initial "needs `TELEGRAM_PROXY_URL`" diagnosis was disproven — the proxy is wired and forwarded, so it is an open investigation). Plus **`0060`** — 150 MB container log retention now shared with nginx access logs nearly cost the investigation window.
- `tests/` had **no coverage of `Master.ts` or `Worker.ts` at all** before `0055`.
- Operational lessons baked into the record: `docker logs` is cumulative across restarts (scope counts to the current boot); an empty-string body is provable from its ETag (base64-SHA-1 of `""`); container logs contain `persistentID` values (documented as the JWT `sub`, PII) — filter before sharing.

## Related

- [[tasks/master-lobbies-worker-exit-diagnostics]] — task 0055, the shipped unblocked half
- [[systems/networking]] — `Master.ts` worker coordination and endpoint surface
- [[systems/player-profile-store]] — the `0062` no-op-in-prod crediting finding lands here
- [[decisions/sprint-4]] — sprint board carrying `0055`–`0057` and the promoted config-drift tasks
- [[decisions/sprint-backlog]] — the unsprinted follow-ups `0058`, `0059`, `0061`
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft posture whose `debug`-level miss logging kept `0062` invisible
- [[systems/project-brief]] — the current-focus picture this outage and the `0062` blocker reshaped
