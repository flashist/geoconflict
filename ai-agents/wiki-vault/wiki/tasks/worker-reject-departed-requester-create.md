# `Worker.ts`: Reject a Buffered `create_game` Whose Requester Has Already Gone Away

**Source**: `ai-agents/tasks/done/0194-worker-reject-buffered-create-game-from-departed-requester/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — 2026-08-22 outage track — task `0194` — the track's last item

> ✅ Done (agent-closed 2026-08-28 — **not owner-verified**). Committed on `dev`; the post-deploy run is pending by design and the deployment state is unknown.
>
> ⚠️ **The shipped fix is not the one the brief specifies, and the brief was deliberately left unedited — `plan.md` supersedes it on the central point.** See "What actually shipped" below. Read `ai-agents/tasks/done/0194-worker-reject-buffered-create-game-from-departed-requester/plan.md` for the built design.

## Goal

Close the one residual `0192` recorded and could not fix from the master side: **orphan public games on wedged-worker recovery**.

When a worker is alive but not answering, the master's `create_game` POSTs pile up in the worker's socket buffer. Since `0192` the master aborts each create after 5 s and drops the ID from `publicLobbyIDs` — but **aborting the client side does not retract bytes already sitting in the stopped worker's socket buffer**. On recovery the worker parses every queued request and creates a game for each, so games exist that the master has already forgotten. Nobody is ever routed to them; each lives out its lobby lifetime and ends with `no clients joined, not archiving game`.

Baseline, measured (dev, 2 workers, worker 1 `SIGSTOP`ped 40 s, then `SIGCONT`): **5 orphans** with the `0193` poll guard on. Without the guard the count was 1 — but only because the unguarded poll's 150-line error flood accidentally tripped the worker's rate limiter and 429'd the queued creates. `0193` removed that accidental protection on purpose, so **5 is the honest baseline**.

Owner ruling 2026-08-27: this is option **(A)** — a separate `Worker.ts` brief, rather than extending `0192` or leaving the residual unfiled.

## Key Changes

**Scope: `src/server/Worker.ts` plus tests. `Master.ts` untouched.**

### What actually shipped, and why it differs from the brief

The brief prescribed a **synchronous** `req.socket.destroyed` / `req.aborted` check before `gm.createGame`, and required (Step 2) that this be *measured*, not reasoned, before the tests were finalised. **The measurement refuted it** — 90 aborted plus 15 live trials, agreeing with an earlier 30-trial run:

- `req.aborted` stays `false`, because the request completes out of the kernel buffer.
- `req.destroyed` is `true` **even for healthy creates**.

So the brief's check would either never fire or reject 100% of creates. The owner therefore approved plan option **D1 (A)** on 2026-08-28: a **bounded 10 ms settle wait**.

- `REQUESTER_SETTLE_MS = 10`; `requesterGone(req, res)` is a pure predicate over `res.destroyed`, `res.socket === null`, `res.socket.destroyed`, `req.socket === null`, `req.socket.destroyed`; `awaitRequesterSettled(req, res, settleMs)` checks once, waits up to 10 ms, and re-checks.
- **All creates are guarded — public and private** (plan decision D3), and a departed requester gets a **`503` JSON** answer (D4).
- The guard sits **after** validation and the admin-token / worker-index checks, so a rejected request still gets the same 400/401 it always did.
- One `warn` line per skipped create, naming the game ID and reason, with no `persistentID` and no IP beyond the existing anonymized form.
- New `tests/server/Worker.test.ts` for the predicate. The route-level test was skipped (D6) and the `RequesterGone.ts` extraction contingency never triggered (D5).

## Outcome

**0 orphans on the wedge run, against the recorded baseline of 5.** This **discharges `0192`'s accepted orphan residual**. Guard `warn` lines: 4. `Too Many Requests`: 0. Master error lines 13, down from 16.

- Healthy 6-minute run: 74 creates, cadence 4.84 s unchanged, **0 guard warns**.
- Private lobby hosted through the real browser client: 200 and live, 0 warns.
- Rejection paths unchanged: 400 / 401 / 400.
- `npm test` 97 suites / 874 tests, lint 0, `tsc` 0, prettier clean; 12/12 randomized ×2 with no open handles.
- Review round 1 ran both reviewers (own pass plus Codex `gpt-5.5`): **3 low defects and 1 frontier item, all in the test file — `Worker.ts` had no confirmed defect.** R1–R3 applied per owner ruling, R4 accepted; ledger closed out and confirmed by the reviewer's phase 2.
- **Two accepted residuals:** `Logger.ts` global side effects in the server unit tests, and a hardcoded `CREATE_GAME_TIMEOUT_MS = 5_000` in the test file.
- **What this does not buy:** exclusion of a wedged-but-alive worker from scheduling. That needs a responsiveness signal and remains an ADR-109 residual. While a worker is wedged the master still spends one 5 s failed attempt per draw that lands on it — this task only stops those attempts from becoming orphan games afterwards.

## Related

- [[tasks/schedule-public-games-onto-ready-workers]] — task `0192`, whose orphan residual this discharges
- [[tasks/fetchlobbies-in-flight-guard]] — task `0193`, whose poll guard made the honest orphan count visible
- [[tasks/worker-routing-dead-worker-investigation]] — task `0057`, which first observed the orphans and named the wedged shape as quorum-independent
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task `0056`, the outage root-cause fix earlier in the track
- [[decisions/adr-109-worker-index-placement-contract]] — untouched by this task; the game still lives on its hash index
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident that opened the track
- [[systems/networking]] — the worker's `create_game` route and rejection paths
- [[decisions/sprint-4]] — the sprint board carrying the outage track
