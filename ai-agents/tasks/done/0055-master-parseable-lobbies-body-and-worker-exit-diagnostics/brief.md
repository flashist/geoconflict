# `Master.ts`: serve a parseable lobbies body, and log why a worker died

## ID
0055

## Sprint
Sprint 4

## Priority
Ship first — this is the half of the outage fix that needs no decision from anyone.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

On **2026-08-22** production served an empty `/api/public_lobbies` body for roughly 3.5 hours — every
player on the platform saw an empty lobby list. Service was recovered by a container restart. **The
defects are still unfixed in `main`, and crash recovery is disarmed in production right now.**

Full investigation record — read it before starting, it has the complete evidence chain, the
refuted hypotheses, and the local repro:
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

**This brief is deliberately the small, independent half.** The real repair — restoring worker crash
recovery and making the scheduling gate survivable — is task **`0056`**. Its two blocking owner
decisions were ruled on 2026-08-22 (quorum 18/20 with a 90 s deadline; restart cap 5 per index per
10 min, backoff 1s→30s), but `0056` now waits on **`0057`**'s routing findings by owner ruling, so it
is not the first thing that ships. **This task depends on none of that** — it needs no decision, no
investigation, and changes no control flow. Outage-track order is `0055` → `0057` → `0056`, and
`0055` can start immediately, in parallel with `0057`.

It covers defects **#5** and **#6** from §5 of the incident record. It does **not** cover #1, #2, #3
or #4 — those are `0056`.

### Why these two, and why now

**Defect #5 — the endpoint can serve a body the client cannot parse.**
`publicLobbiesJsonStr` is initialised to `""` (`src/server/Master.ts:78`) and only ever assigned at
`Master.ts:480`, inside the lobby-fetch interval. If that interval never installs — exactly what
happened on 2026-08-22 — `/api/public_lobbies` (`Master.ts:181`) does `res.send("")`, returning
`200` with `Content-Length: 0`. The client then calls `response.json()` on an empty body
(`src/client/PublicLobby.ts:138`), which **throws**, so nothing renders at all — not even an
"no lobbies right now" state. A valid empty payload turns a hard client-side exception into an
ordinary empty list.

**Defect #6 — the one log line that would have explained the crash throws its evidence away.**
The `cluster.on("exit")` handler receives `code` and `signal` as arguments (`Master.ts:133`) and its
failure branch logs `worker crashed could not find id` (`Master.ts:136`) — discarding both, plus
`worker.id` and `worker.process.pid`, which are also in scope. This is the direct reason §7 of the
incident record cannot say *why* worker 16 died. **Without this, a recurrence is equally
undiagnosable.**

### The honest tradeoff in doing this separately

`0056` replaces the `if (!workerId)` failure branch outright. So the log line this task improves is
partly superseded when `0056` lands. That is **accepted on purpose**: `0056` is gated on owner
decisions and may take days, and until it ships, a second worker death produces the same opaque line
we cannot read. Buying diagnosability for the gap is worth re-touching four lines later. `0056`'s
brief carries the instruction to preserve these fields in the new handler.

## What to build

**Scope: `src/server/Master.ts` only.** No client changes, no infra changes, no control-flow changes.

**1 — Initialise the lobbies payload to a valid empty document.**

At `Master.ts:78`, replace the empty-string initialiser with a serialised empty payload. The shape
**must match what `Master.ts:480` actually assigns** — read that call and mirror its top-level keys
exactly, so a client parsing the placeholder and a client parsing a real response take the same code
path. Do not guess the shape from this brief.

**2 — Log everything the exit handler already has, on the failure branch.**

In the `if (!workerId)` branch at `Master.ts:135-137`, before the `return`, log at `error` level:
`code`, `signal`, `worker.id`, and `worker.process.pid`. Keep the existing "could not find id" text
so log greps written during the incident still match. **Leave the `return` and the restart logic
exactly as they are** — arming restarts is `0056`'s job and carries a risk this task must not take
on (see `0056`).

**3 — Confirm the client's empty-list path is sane.** Read `src/client/PublicLobby.ts:138` and
verify that a successfully-parsed payload with zero lobbies renders an empty state rather than
throwing or rendering nothing. **If it does not, stop and report it** — do not expand this task to
fix the client without checking back. It would be a separate brief.

## Verification steps

1. **Unit or integration test for the placeholder payload.** `JSON.parse()` of the initial value of
   `publicLobbiesJsonStr` succeeds and yields the same top-level shape as a real assignment from
   `Master.ts:480`, with zero lobbies. Note: `tests/` currently has **no coverage for `Master.ts` at
   all** (§9 of the incident record) — this is greenfield, and reaching a module-level `let` may
   require a small export. Keep that export minimal; the larger extraction belongs to `0056`.
2. **Reproduce the outage condition locally and confirm the endpoint is now parseable.** Start the
   server with the lobby-fetch interval prevented from installing, `curl
   /api/public_lobbies`, and confirm a non-zero `Content-Length` and a body that `JSON.parse`
   accepts. Before the change the same run returns `Content-Length: 0`.
3. **Client renders an empty list, not an exception.** With the server in the state from step 2, load
   the client and confirm no console exception from `PublicLobby.ts` and an empty-lobby UI state.
4. **A worker death now logs its cause.** Force a worker to exit non-zero at startup (the local repro
   in §5.1 of the incident record is the starting point) and confirm the emitted line carries `code`,
   `signal`, `worker.id` and `pid`. Confirm the worker is **still not restarted** — that behavior
   must be unchanged by this task.
5. **No behavior change when everything is healthy.** Full local boot, all workers ready, endpoint
   serves real lobbies exactly as before.

## Notes

- **Depends on:** nothing. Deliberately unblocked — no owner decision gates it.
- **Blocks:** `0056` (sequencing only, not a hard dependency — both touch the exit handler, and
  landing this one first keeps `0056`'s diff readable).
- **Related:** `0057` (worker-routing investigation), `0058` (`Worker.ts` error handler), `0059`
  (precompile the server for prod).

- **Do not arm worker restarts in this task.** That is `0056`, and it must ship together with a
  restart cap — see the risk section of `0056`. A change here that causes a dead worker to be
  re-forked would be out of scope and unsafe.
- **Do not modify the incident record.** Reference it; it is the investigation's finished output.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs contain `persistentID` values, documented as the JWT
  `sub` and PII. If you paste log excerpts into a worklog or review, filter them first — see the
  warning at the end of the incident record.
