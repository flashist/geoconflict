# 0478 — worklog

## 2026-10-24 — Batch 1: who votes, worth it now?, the locked vote button, test or ship — and ON HOLD

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

### 1 — "Map voting: who gets to vote?" (brief S1; To-discuss 1; the "verified only" conflict)

Owner typed, verbatim (not a listed option):

> *"I think the idea with voting maps should be puth back to backlog and hold there for quite a while, I am
> thinking about cancelling it completely, but I am not ready to make this decision right now."*

⇒ **Who votes: NOT DECIDED.** S1, To-discuss 1 and the conflict *"gated to verified players only"* vs Q1
stay open on purpose.
⇒ **The task goes back to the Backlog board, ON HOLD** "for quite a while" — done 2026-10-24 (see *What
was changed* below).
⇒ ⚠️ **Cancelling is the owner's call and is NOT decided.** The owner said he is *thinking about*
cancelling it completely but is *"not ready to make this decision right now"*. This task is **not**
cancelled; no mover was run.

### 2 — "Is voting worth it with today's player numbers? How do we find out?" (To-discuss 2)

Owner typed, verbatim: *"Not worth it"*

⇒ **To-discuss 2 answered:** not worth it at today's player numbers. No measurement task is filed (the
owner did not ask for one). This is the reason behind the hold.

### 3 — "A player who can't vote taps the vote button. What happens?" (To-discuss 4)

Owner picked, verbatim: **"Citizenship popup (Recommended)"** — option text: *"Opens the existing
explain-and-buy popup, like a locked private lobby today."*

⇒ **Recorded for whenever the talk resumes:** a player who may not vote and taps the vote button gets the
existing citizenship explain-and-buy popup (`0301`), the same pattern as the locked private lobby
(`0302`). It does **not** settle who may vote (answer 1).

### 4 — "Map voting: test on a group first, or ship to everyone?" (To-discuss 6)

Owner typed, verbatim: *"Not rolling it out anytime soon"*

⇒ **To-discuss 6 not decided** — there is no rollout to plan. Left open on purpose.

### Not asked in this batch

- **S2 — price** (above 249 Yan): left open on purpose (no outcome; on hold).
- **To-discuss 5 — cooldown N:** a developer proposal for a build; no build is planned.
- **To-discuss 3:** already settled in the brief (`0340` + `0332` live; Q4 no new gate).

### What was changed (2026-10-24, by the spawned producer)

- Status `🔄 In progress` → `🔲 Backlog`, with an **ON HOLD** note in the brief's `## Status`.
- `## Sprint` `Sprint 9` → `Backlog`; `## Priority` `12` → `—` (the Backlog board is unranked).
- Sprint 9 row (rank 12) → `➡️ Moved to [Backlog](backlog.md)`, ruling quoted; a new `🔲 Backlog` row,
  marked ON HOLD, appended to the [Backlog board](../../../sprints/backlog.md).
- **Not done:** no cancel, no `/fkit-task-done`, no `/fkit-task-cancelled`. The task folder did not move.

### Knock-on check

- `0478`'s own lines: `**Depends on:** nothing`, `**Blocks:** nothing` (confirmed in the brief).
- No brief under `ai-agents/tasks/backlog/` names `0478` in a `Depends on:` line (grep, 2026-10-24).
- Placement check (`/fkit-task-brief` step 9), run after the edit: `none (checked: plan-sprint-9.md)`.
  `plan-index.md` was skipped (`identity unresolved`, exit 3 — the sprint index, not a board); both Backlog
  boards are skipped by design. Board renders: Sprint 9 no drift (`10 done · 1 in progress · 5 backlog ·
  1 moved — of 17`); Backlog board `derive 0478 depends="nothing"`, no drift on `0478`.
- ⚠️ **Soft ordering, not a dependency:** `0484` (shared purchase flow, Sprint 9) says it starts *"after
  the six talks `0477`–`0482`"*. With `0478` on hold, read literally, `0484` would wait indefinitely. Not
  a `Depends on:` line, so the placement check does not see it. Raised to the owner as an open question,
  2026-10-24; `0484` not edited.

### Where the talk stands

- **Outcome (File / Park / Drop): not decided.** On hold on the Backlog board. The owner may later resume
  the talk, park it, or cancel it — his call.
- **Answered:** To-discuss 2 (not worth it now), To-discuss 4 (citizenship popup).
- **Open on purpose:** S1 / To-discuss 1 / the verified-only conflict (who votes), S2 (price),
  To-discuss 5 (cooldown N), To-discuss 6 (test or ship).
