# Investigation: public-game routing can send games to a dead or unready worker

## ID
0057

## Sprint
Sprint 4

## Priority
**Runs before `0056`** — owner-ruled 2026-08-22. First item on the outage track *when the track
resumes*.

*Retired 2026-08-26:* the 2026-08-23 hold on the outage track ("do not start yet — track at rest")
was **lifted by the owner on 2026-08-26**. The findings were reviewed with the owner that day —
[`ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`](../../../knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md)
— and the task closed on them. `0056` is startable; the routing fix is `0192`.

## Status
✅ Done (agent-closed — not owner-verified)

*(Filed to the Backlog board on 2026-08-22, promoted into Sprint 4 the same day when the owner ruled
that it runs before `0056`. A hard dependency of a Sprint 4 task belongs in that sprint — leaving it
unsprinted would hide a blocker sitting on the sprint's critical path. Producer call; see Notes.)*

## Owner
fkit-architect

## Context

**This is an investigation, not an implementation task. No routing code changes under this brief.**

Surfaced by the 2026-08-22 outage investigation, §10 decision (3):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

`schedulePublicGame` selects a worker with:

```
return simpleHash(gameID) % this.numWorkers();
```

`src/core/configuration/DefaultConfig.ts:297`

The selection is a pure function of the game ID and the **configured** worker count. It consults no
liveness or readiness state. So a game can be routed to a worker that is dead, restarting, or has
never reported ready.

Today this is invisible, because the scheduling gate (`Master.ts:110`) refuses to schedule anything
at all unless **all** workers are ready — a worse failure that masks this one. Task **`0056`**
replaces that gate with quorum-or-deadline. **The moment `0056` ships, this becomes live.**

**The quorum is now decided, so the exposure is a concrete number, not a hypothetical.** The owner
ruled on 2026-08-22: **18 of 20 workers, with a 90-second deadline.** A quorum of 18 permits **up to
two** missing indices, so up to **2 in 20 — roughly 10%** of scheduled public games can route to an
absent worker while the gate is satisfied. Size your findings against that figure. `0056` deliberately
leaves this residual rather than folding an architecture change into an outage fix.

**This task now runs BEFORE `0056`** (owner-ruled, same date). That ordering is the reason the
findings matter: the quorum value is committed but not yet built, so if the severity turns out worse
than assumed, the owner can revisit 18/20 *before* it ships rather than after.

The producer is not the right role to settle this. Changing the selection function changes
game-to-worker distribution, and distribution has consequences — cache locality, load balance across
workers, and whether a given game ID is reproducibly placed — that need an architect's read before a
product call is made.

## What to build

Nothing is built. Produce **findings**, written to
`ai-agents/knowledge-base/reports/`, then review them with the owner before any implementation brief
is written.

Answer, with evidence from the code:

1. **What actually happens** when a public game is scheduled onto a dead or unready worker index. Does
   the schedule call fail loudly, fail silently, hang, or half-succeed leaving an orphaned lobby
   entry? Trace it through to what the player sees. This is the load-bearing unknown — the ~10%
   (2-in-20) figure is *frequency*, now settled by the ruled quorum; **severity is what is still
   unknown**, and it is what decides whether the residual is acceptable.
2. **What the selection function is actually buying us.** Deterministic hash placement is a choice,
   not an accident — identify what depends on it (reproducible placement of a game ID, avoiding a
   shared registry, anything else) before proposing to replace it.
3. **Candidate approaches, with tradeoffs.** At minimum: (i) filter the modulus over the set of ready
   workers; (ii) retry on a different worker when the target is unavailable; (iii) keep the hash and
   have the master hold scheduling for an unready index; (iv) leave it, and accept the residual with
   an alarm. Say what each costs and what it breaks.
4. **Interaction with `0056`'s ruled quorum — and whether 18/20 should stand.** The quorum is
   **decided (18 of 20, 90 s deadline)** but **not yet built**, which is exactly why this task runs
   first. Quantify the residual at 18/20, and say plainly whether the findings support keeping that
   value. **If they do not, say so as a recommendation to the owner** — do not quietly assume the
   ruling is immovable, and equally do not treat this as licence to change it. It is the owner's
   decision either way; your job is to give them the number before the code exists.
5. **Whether this ever bit us in production.** The 2026-08-22 incident is not evidence of it — the
   old gate meant nothing was scheduled at all. Check whether a distinct signature exists in
   telemetry or in the error families already catalogued in the knowledge base.

Finish with **one recommendation and its main tradeoff**, and any decision the owner must make.

## Verification steps

This is an investigation; it closes on reviewed findings, not on a green test run.

1. A findings document exists under `ai-agents/knowledge-base/reports/`.
2. Every claim about behavior cites a `file:line` or a reproduction, not an inference. Question 1 in
   particular must be **traced**, not assumed.
3. The recommendation names the option **and** what it costs — a recommendation with no stated
   downside has not finished the analysis.
4. Findings reviewed with the owner. If the outcome is "implement something", that becomes a new
   brief; this task does not grow into the implementation.

## Notes

- **Depends on:** nothing. Ready to start now.
- **Blocks:** **`0056`** — owner-ruled 2026-08-22 that this runs first. `0056` does not start until
  these findings are reviewed with the owner.
- **Sequencing:** `0057` → `0056`.
- **Promoted from the Backlog board into Sprint 4 on 2026-08-22** (producer call). It was filed
  unsprinted earlier the same day, before the ordering was ruled. Once it became a hard dependency of
  a Sprint 4 task, leaving it on an unranked, explicitly-unscheduled board would have put a blocker
  on the sprint's critical path where the sprint board could not see it. Sprint membership follows
  the dependency.
- **Related:** `0055`, `0058`, `0059` — all from the same incident.

- **Do not change routing under this brief.** If the answer turns out to be a one-line filter, that
  is still a separate brief with its own review — the point of the investigation is that the
  distribution consequences get looked at first.
- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **No secrets in any artifact** — the findings document goes to git.
