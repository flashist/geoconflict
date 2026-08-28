# `Worker.ts`: reject a buffered `create_game` whose requester has already gone away (orphan public games on wedged-worker recovery)

## ID
0194

## Sprint
Sprint 4

## Priority
Sprint 4's Status board is unranked (every Priority cell reads `—`), so no rank is assigned or
displaced. **On merit this belongs directly below `0192`**, because it closes the one residual `0192`
recorded and could not fix from the master side, it is small and self-contained, and it is the last
item of the outage track — nothing else in the sprint waits on it, and its cost while open is low
(each orphan is ~150 s of an idle `GameServer` on the recovered worker, no player impact).

## Status
✅ Done (agent-closed — not owner-verified)

> ⚠️ **The shipped fix is not the one this brief specifies — read `plan.md` for what was actually
> built.** "What to build" Step 1 prescribes a **synchronous** `req.socket.destroyed` / `req.aborted`
> check before `gm.createGame`. Step 2's own probe (worklog Step 0 — 90 aborted + 15 live trials,
> agreeing with the plan's earlier 30-trial run) **measured that check to observe nothing**:
> `req.aborted` stays `false` because the request completes out of the kernel buffer, and
> `req.destroyed` is `true` even for healthy creates — so the brief's check would either never fire or
> reject 100 % of creates. The owner therefore approved (2026-08-28, via `AskUserQuestion` in the
> ship-loop session) the plan's option **D1 (A)**: a **bounded 10 ms settle wait**
> (`awaitRequesterSettled`) re-reading `res.destroyed || res.socket === null ||
> res.socket.destroyed || req.socket === null || req.socket.destroyed`, guarding **all** creates —
> public and private (D3) — and responding **`503` JSON** (D4). Route-level test skipped (D6); the
> `RequesterGone.ts` extraction contingency did not trigger (D5). **This brief was deliberately left
> unedited** — the plan supersedes it on this point.

## Owner
fkit-coder

## Context

**This is the (A) follow-up from `0192`'s orphan finding — owner ruled 2026-08-27** (via the sprint
ship-loop, relayed through `AskUserQuestion`). `0192`'s review ledger records the orphan count as an
accepted residual on the condition that this brief is filed at close
([`0192/review.md`](../../done/0192-schedule-public-games-onto-ready-workers-with-bounded-create/review.md),
*Accepted residuals*, last bullet).

### The defect

When a worker is alive but not answering (the **wedged** shape — `0057` findings
[§2.5 run 2 and §5](../../../knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md)),
the master's `create_game` POSTs to it pile up in the worker's socket buffer. Since `0192`, the master
aborts each create after 5 s and drops the ID from `publicLobbyIDs` (`src/server/Master.ts:614-647`).
**But aborting the client side does not retract bytes already sitting in the stopped worker's socket
buffer.** On recovery the worker parses every queued request and calls `gm.createGame` for each
(`src/server/Worker.ts:116-164`, the call at `:158`) — creating public games the master has already
forgotten. Nobody is ever routed to them; each lives out its lobby lifetime and ends with
`no clients joined, not archiving game` (`src/server/GameServer.ts:805`).

Measured (`0192` worklog run 4 / 4b, dev, 2 workers, `SIGSTOP` worker 1 for 40 s):

- **Poll guard on (`0193`, the shipped state):** worker 1 drained 6 buffered creates in 6 ms on
  `SIGCONT` → **5 orphans**, 0 × `Too Many Requests`, 16 master error lines in the window.
- **Poll guard off (run 4b):** **1 orphan** — but only because the unguarded poll's 150-line error
  flood tripped the worker's 20 req/s limiter and 429'd the queued creates by accident. `0193`
  removed that accidental guard on purpose (predicted in its ledger); the honest baseline is **5**
  (`0193` [`review.md:7`](../../done/0193-guard-fetchlobbies-against-overlapping-ticks/review.md)
  measured 5 with the guard on, before `0192`; `0192` reproduced 5).

`0192`'s plan (Step 2 note) reasoned this in advance and flagged that the orphan-proof fix lives in
`Worker.ts`, not `Master.ts`. `0192` §Verification step 4 therefore reported "unchanged (5 / 5)", not
"fewer".

### Why the fix is worker-side and safe by construction

By the time the recovered worker runs the route handler for a buffered request, the master has long
since aborted that request — its side of the TCP connection is closed. A `create_game` whose requester
can no longer receive the response has **no legitimate outcome**: the master will never list the ID,
so nobody can join. Skipping creation in that case cannot harm a live request — if the socket is
still open, the check is a no-op and the request proceeds exactly as today.

## What to build

**Scope: `src/server/Worker.ts` plus tests. `Master.ts` is not touched** — `0192`'s master-side
behaviour is the fixed context this builds on.

**Step 1 — Guard the create route.** In the `create_game` handler (`Worker.ts:116-164`), immediately
before `gm.createGame` at `:158` — after validation and the admin-token / worker-index checks, so a
rejected request still gets the same 400/401 it gets today — check whether the requester has gone
away and, if so, **skip creation**: log one `warn` line naming the game ID and the reason (no
`persistentID` or IP beyond the existing `ipAnonymize` form), and return without creating. The route
is plain Express on Node's `http.createServer` (`Worker.ts:59-60`), so the signals to check are the
request socket's closed/destroyed state and the request's aborted flag (`req.socket.destroyed`,
`req.aborted` or their current non-deprecated equivalents — **verify against the Node version in use
and state the exact properties in the plan**). Extract the predicate as a small pure function taking
a request-like object (e.g. `requesterGone(req)`), so it is unit-testable without binding a port.

**Step 2 — Prove the check is observable at handler time.** This is the one real unknown. The handler
runs after `express.json()` has consumed the body; whether Node has already marked the socket
destroyed by then — for a request whose peer closed **while the worker was stopped** — is a timing
question the plan must answer with evidence, not reasoning. Run Verification step 2 **before** the
unit tests are finalised. If the synchronous pre-`createGame` check does not observe the closed
socket in the live run, **stop and say so in the plan** — do not widen scope silently. The fallback
the plan may propose (the owner decides): defer the check one macrotask, or check again after
`createGame` and tear the game down if the response can no longer be written. Either is still
`Worker.ts`-only.

**Step 3 — Tests.** There is no `Worker.test.ts` today (`tests/server/` covers the master and the
game server only). Add one for the extracted predicate at minimum:

- A request-like object with a destroyed socket → `true`; with an open socket and no abort → `false`;
  with the aborted flag set → `true`.
- If a route-level seam is cheap (an exported app factory, or `supertest` against `startWorker`'s
  app), one test that a `create_game` whose socket is destroyed before the handler runs creates no
  game (`gm.game(id)` is undefined) and logs the warn line; skip this if it needs a new seam of any
  size — say so in the plan.

## Verification steps

1. **All new tests pass**; full suite, lint and `tsc --noEmit` clean.
2. **Wedged index, local — the `0192` run-4 procedure.** Fresh dev boot (2 workers; ports 3000–3002
   verified free first — memory note on Remotion squatters), `SIGSTOP` worker 1 for 40 s, `SIGCONT`.
   On recovery count `no clients joined, not archiving game` lines on worker 1 for IDs the master never
   listed (the 0192 worklog run 4 method). **Expect ≈ 0** (was 5). State the exact number, and the
   number of `warn` lines the new guard emitted — they should match the drained-but-aborted creates.
   The one create genuinely in flight at `SIGCONT` (listed by the master) must still be created.
3. **Healthy path unchanged.** Full boot with all workers ready: public games are created at the
   normal cadence, `/api/public_lobbies` shows them, and no guard `warn` line appears over a ≥ 5 min
   run.
4. **Private lobby unchanged.** Host a private lobby from the client (`HostLobbyModal` POSTs
   `create_game` straight to `/w<N>/`) — created and joinable as before; no guard line.
5. **Rate limiter and rejection paths unchanged.** A bad body still gets 400, a public create without
   the admin token still gets 401, a worker-index mismatch still gets 400 — the guard sits after them.
6. **Post-deploy** (pending by design until the next prod deploy that carries this): scope
   `docker logs` to the current boot and confirm no guard `warn` lines during a healthy run, and that
   `0192`'s `Failed to schedule public game` count is unchanged by this task.

## Notes

- **Depends on:** `0192` — done (agent-closed 2026-08-27); this builds on its 5 s create abort and
  the run-4 measurement procedure. Nothing else.
- **Blocks:** nothing.
- **Related:** `0058` (`Worker.ts` `server.on("error")` — the same silently-hung-worker family, no
  dependency either way), `0193` (its poll guard is what made the honest orphan count visible),
  `0057` (the investigation; §2.5 run 2 first observed the orphans, §5 named the wedged shape as
  quorum-independent), ADR-109 (the fixed-placement contract — untouched by this task; the game still
  lives on its hash index).
- **Owner ruling recorded 2026-08-27:** this is **option (A)** for `0192`'s orphan finding — a
  separate `Worker.ts` brief, filed by the producer at `0192`'s close, rather than extending `0192`
  or leaving the residual unfiled.
- **What this does not buy:** exclusion of a wedged-but-alive worker from scheduling (ADR-109
  residual; needs a responsiveness signal, `0057` §9). While the worker is wedged, the master still
  spends one 5 s failed attempt per draw that lands on it — this task only stops those attempts from
  becoming orphan games afterwards.
- **Do not modify `Master.ts`, the `0057` findings, or `0192`'s records.** Reference them.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs carry `persistentID` values (PII) — filter any excerpt
  before it lands in a worklog, review or commit. Use only loopback literals and default local ports
  in reproduction notes.
