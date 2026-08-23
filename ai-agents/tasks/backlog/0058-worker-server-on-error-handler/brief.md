# `Worker.ts`: a failed port bind leaves a silently hung worker — add `server.on("error")`

## ID
0058

## Sprint
Backlog

## Priority
Unscheduled — small, self-contained, same failure family as `0056`

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Surfaced by the 2026-08-22 outage investigation (§10, suggested follow-ups):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

`src/server/Worker.ts` calls `server.listen(PORT, …)` at `:455` with **no `error` listener** on the
HTTP server. An `EADDRINUSE` or any other bind failure therefore does not reach a handler that knows
what it means. It surfaces instead at the process-level `uncaughtException` handler (`Worker.ts:475`),
which **logs and does not exit**.

The result is a worker process that is alive, never listening, and never reports ready — and, until
`0056` ships, one that is never restarted either. That is the same end state that caused the
2026-08-22 outage, reached by a different road.

**This was investigated and refuted as the cause of the 2026-08-22 incident specifically** — no
`EADDRINUSE` appeared in the logs and worker 16 never reached `listen` (§6 of the incident record).
It is filed as a latent defect on its own merits, not as an incident follow-up whose cause is
suspected.

## What to build

**Scope: `src/server/Worker.ts`.**

1. **Attach an `error` listener to the HTTP server before `listen`.** Log at `error` level with the
   worker index, the error `code`, and the port. Then **exit the process non-zero** — a worker that
   cannot bind its port has no useful work to do, and exiting hands the problem to the master's
   restart path (which `0056` makes functional).

2. **Check the `uncaughtException` handler's contract while you are here** (`Worker.ts:475`). Log
   and continue is a deliberate-looking choice, and it may well be right for in-game exceptions. Do
   **not** change it under this brief. If the audit suggests it should exit for some error classes,
   report that as a finding — it is a separate decision with real blast radius.

3. **Confirm the interaction with `0056`.** Once restarts are armed, a worker that exits on a bind
   failure gets re-forked, hits the same bound port, and exits again — straight into the restart cap.
   That is the correct outcome (loud, capped, visible) rather than the current silent hang, but the
   brief should not pretend it is a full fix for a genuinely occupied port. Note it in the worklog.

## Verification steps

1. **Reproduce a bind failure.** Occupy a worker's port before starting it. Before the change: the
   worker stays alive, never listens, never reports ready, and the failure is visible only as an
   `uncaughtException` log line. After: an error-level log naming the worker index, the `code`, and
   the port, followed by a non-zero process exit.
2. **The master notices.** With `0056` shipped, confirm the exit is picked up by the exit handler and
   the restart path runs. If `0056` has not shipped yet, confirm the exit is at least *logged* by the
   master rather than swallowed.
3. **Healthy path unchanged.** Normal boot: every worker binds, listens, and reports ready exactly as
   before. The new listener must never fire.
4. **`uncaughtException` behavior is unchanged** unless the owner explicitly rules otherwise.

## Notes

- **Depends on:** nothing. Ships independently.
- **Blocks:** nothing.
- **Related:** `0056` (makes the exit actually recoverable), `0055`, `0057`, `0059`.

- **Refuted as the 2026-08-22 cause** — do not re-investigate that. §6 of the incident record has the
  evidence, and re-running refuted hypotheses is what that section exists to prevent.
- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **No secrets in any artifact.**
