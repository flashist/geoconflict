# Task status vocabulary

> **The canonical set of task statuses for this project.** These are the *only* values that may appear
> in a task brief's `## Status` field, a sprint plan's Status column, or a status dashboard.
>
> This is a **starting convention**, shipped with the project scaffold. It is yours — amend it to fit
> how your team actually works. What matters is that there is exactly **one** place the vocabulary is
> defined, and that it is this one.

## The statuses

| Status | Marker | Meaning | Set by |
|---|---|---|---|
| **Backlog** | `🔲 Backlog` | Scoped and filed, not picked up. The default on creation. | Producer |
| **In progress** | `🔄 In progress` | A session owns it and work has started. | Anyone — freely |
| **Blocked** | `🚧 Blocked — <reason>` | Started, cannot proceed. **A reason is mandatory.** | Anyone — freely |
| **Done** | `✅ Done` | Reviewed, verified, complete — **closed by the owner**. | Owner, via `/fkit-task-done` |
| **Done (agent-closed)** | `✅ Done (agent-closed — not owner-verified)` | Closed by an agent. Complete **on the agent's own judgment**; no human checked it. | A **spawned producer**, via `/fkit-task-done` |
| **Cancelled** | `⛔ Cancelled (YYYY-MM-DD) — <reason>` | Dropped, will not be done. **A reason is mandatory.** | Owner, via `/fkit-task-cancelled` |
| **Cancelled (agent-closed)** | `⛔ Cancelled (agent-closed — not owner-verified) (YYYY-MM-DD) — <reason>` | Dropped on an agent's own judgment. **A reason is mandatory.** | A **spawned producer**, via `/fkit-task-cancelled` |
| **Moved** | `➡️ Moved to [Sprint N](…) — priority M` | Carried to another sprint. Not dead, not done — relocated. | Producer |

⚠️ **`N` in the `Moved to [Sprint N]` marker is the target sprint's *identity*, not a number** — `4`,
or `4c`. `Sprint 4` and `Sprint 4c` are different sprints.

**No other value is valid.** Not "Not started", not "WIP", not "Todo", not "Complete". If a status you
need isn't here, the fix is to amend this doc — not to invent a value inline.

> # 🔴 SCOPE WIDENED 2026-09-08 — both exceptions below are now valid on **two** boards
>
> **Owner ruling, given live in session 2026-09-08 and relayed through a spawning session:**
> `⬜ No sprint` and `⏸ Parked` are valid on **`sprints/sprint-backlog.md` AND `sprints/backlog.md`**.
>
> 🚨 **This WIDENS a scope limit ruled the same day. It is a deliberate re-scoping, and it is not what
> was originally meant.** Both exceptions were ratified earlier on 2026-09-08 as valid on
> `sprint-backlog.md` **only** — that narrower wording is kept below, struck where it is now wrong,
> **superseded rather than deleted.** Read the sequence, not a single clean story.
>
> **Why it was widened.** Task
> [`0001`](../../tasks/backlog/0001-consolidate-unsprinted-work-onto-backlog-board/brief.md)
> consolidates `sprint-backlog.md` into `backlog.md` and retires the first board. Under the narrow
> wording those rows could only arrive on `backlog.md` by being flattened to `🔲 Backlog` — destroying
> the distinction the same day's ruling had just found worth keeping. Both values describe
> **unscheduled work**, and after `0001` `backlog.md` becomes the only board that holds it. The owner
> took the re-scoping over the flattening.
>
> ## What did NOT change
>
> - ❌ **Still invalid in a task brief's `## Status` field.** Briefs keep `🔲 Backlog` and record the
>   no-sprint / parked fact in `## Sprint` (or, for a park, its condition in the board row's prose).
> - ❌ **Still invalid on `plan-sprint-N.md`.** A row on a sprint plan has a home by definition.
> - ❌ **Still not rendered by `/fkit-status`.** The dashboard knows the canonical set only. Widening
>   the boards did **not** make these values visible to it — after `0001`, that blind spot follows the
>   rows onto `backlog.md`. See
>   [ADR-108](../decisions/adr-108-owner-set-active-sprint-pointer.md).
> - ❌ **Still not a general-purpose status.** Two named boards, not "wherever unscheduled work lives".

## Board-level exception — `⬜ No sprint`, on ~~`sprint-backlog.md` only~~ `sprint-backlog.md` and `backlog.md`

| Status | Marker | Meaning | Set by | Valid where |
|---|---|---|---|---|
| **No sprint** | `⬜ No sprint` | Defined, worth doing, **no sprint home**. Not scheduled, not blocked, not dropped. | Producer | [`sprints/sprint-backlog.md`](../../sprints/sprint-backlog.md) and [`sprints/backlog.md`](../../sprints/backlog.md) — **those two only** *(widened 2026-09-08 from `sprint-backlog.md` alone)* |

**Ratified 2026-09-08 by owner ruling, given live in session and relayed through a spawning session.**
It was found in use on **21 rows** of `sprint-backlog.md` during a board-visibility sweep. The choice put
to the owner was *reconcile those 21 rows to `🔲 Backlog`* versus *ratify and document*; **ratify won,
and the existing rows were deliberately left as they are.** ⚠️ **The board now carries 23 such rows, not
21** — the same 2026-09-08 session appended `0026` and `0029` under a separate ruling in the same batch.
The "21" is the count at the moment of the ruling, kept because it is what the owner ruled on.

**Why it is not just `🔲 Backlog`.** `🔲 Backlog` means *scoped and filed, not picked up* — it says
nothing about scheduling. `⬜ No sprint` carries the extra fact that the task **has no sprint home and
needs one before implementation begins**, which is the entire purpose of that board and is stated in its
own header. None of the canonical statuses above can express it, and per the **Report reality, not the
template** rule below, the answer to a distinction the vocabulary cannot express is to fix the
vocabulary — not to flatten the row into a value that quietly drops the fact.

⚠️ **This is a board-level exception, not a general-purpose status.** It is valid **only** in the Status
columns of `sprint-backlog.md` **and `backlog.md`**. It is **not** valid in a task brief's `## Status`
field — briefs on those boards keep `🔲 Backlog` and record the no-sprint fact in their `## Sprint`
field instead — and it is not valid on `plan-sprint-N.md`, where a row by definition already has a home.

> ~~It is valid **only** in `sprint-backlog.md`'s Status column. … and it is not valid on
> `plan-sprint-N.md` or `backlog.md`, where a row by definition already has a home.~~
> — **original wording, ratified earlier on 2026-09-08, superseded the same day by the scope widening
> at the top of this section. Kept, not deleted.**

⚠️ **`/fkit-status` does not render this value.** The dashboard knows the canonical set only, so
`sprint-backlog.md` rows are not counted by it. Read that board directly.

## Board-level exception — `⏸ Parked`, on ~~`sprint-backlog.md` only~~ `sprint-backlog.md` and `backlog.md`

| Status | Marker | Meaning | Set by | Valid where |
|---|---|---|---|---|
| **Parked** | `⏸ Parked` | Deliberately not scheduled **until a named external condition is met**. Blocked on a *signal*, not on work. | Producer | [`sprints/sprint-backlog.md`](../../sprints/sprint-backlog.md) and [`sprints/backlog.md`](../../sprints/backlog.md) — **those two only** *(widened 2026-09-08 from `sprint-backlog.md` alone)* |

**Ratified 2026-09-08 by owner ruling, given live in session and relayed through a spawning session** —
the same sweep and the same batch as `⬜ No sprint` above, but a **separate ruling**. Found in use on
**2 rows**; those rows were deliberately left as they are.

🚨 **A `⏸ Parked` row MUST state its unpark condition.** This is mandatory, not stylistic: a park with
no named condition is **indistinguishable from an abandoned task**, and an unconditioned park will sit
on the board forever with nobody able to say what would ever move it. Write the condition as a
falsifiable signal someone could check — the two existing rows do (*"mobile DAU crosses 1,500 in
analytics"*, *"mobile performance baseline confirmed stable in Sentry/analytics"*). If you cannot name
the condition, the task is not parked; it is either `⬜ No sprint` or a cancellation.

**Why none of the canonical six can carry this.** `🚧 Blocked` is the near miss and it is wrong:
Blocked means *started, cannot proceed*, and a parked task has not started and is not being attempted.
`🔲 Backlog` and `⬜ No sprint` both lose the fact that an **external signal**, not a scheduling
decision, governs when the work becomes eligible. `⛔ Cancelled` is false — the work is still wanted.

⚠️ **Board-level exception, not a general-purpose status.** Valid **only** in the Status columns of
`sprint-backlog.md` **and `backlog.md`** — not in a task brief's `## Status` field, and not on
`plan-sprint-N.md`.

> ~~Valid **only** in `sprint-backlog.md`'s Status column — not in a task brief's `## Status` field,
> and not on `plan-sprint-N.md` or `backlog.md`.~~ — **original wording, ratified earlier on
> 2026-09-08, superseded the same day by the scope widening at the top of the `⬜ No sprint` section.
> Kept, not deleted.**

🚨 **The unpark-condition rule above survives the widening unchanged.** A `⏸ Parked` row on
`backlog.md` must state its condition exactly as one on `sprint-backlog.md` must.

⚠️ **`/fkit-status` does not render this value** either. The dashboard knows the canonical set only, so
parked rows are not counted by it. Read that board directly.

## The authority split — this is the point

**`In progress` and `Blocked` are free.** They are simply facts about the world; any session may set
them without ceremony, and *should*, the moment they become true.

**`Done` and `Cancelled` are skill-gated and role-gated — not owner-gated.** They may only be set by
the `/fkit-task-done` and `/fkit-task-cancelled` skills — never by hand-editing a file — and **only the
producer may invoke those skills.** That one is enforced rather than asked: a `PreToolUse` hook denies
a mover call from any non-producer identity, at any spawn depth. Every other role routes its closes
through the producer and closes nothing itself.

⚠️ **A close performed without the owner present must write the `(agent-closed — not owner-verified)`
variant — including a producer that was SPAWNED to close.** A spawned agent has no channel to you, so
its close is agent-closed however trustworthy the role. Only an owner-present producer session yields a
plain owner-verified close.

⚠️ **Role-gating is not prevention.** Understand the trade you are inheriting: restricting the movers
to one role separates the closing *identity*, but an agent that has decided its work is done can still
spawn a producer to close — the same act with an extra hop. The marker is **prose, not enforcement**;
nothing compels it. It exists so the board can at least be *read* honestly by someone who looks.

⚠️ **The marker does not appear in `/fkit-status`.** The dashboard matches on the marker prefix, so an
agent-closed row is counted and filtered as an ordinary closed row. To tell the two apart you must open
the sprint plan or the brief.

**If your team wants a stronger guarantee than this**, the fix is a further precondition in
`claude/skill-ownership-hook.sh` — closes only from an owner-present session, say — not stricter prose.
Prose does not stop an agent that has already decided its work is done.

`Moved` is producer-set, because relocating work across sprints is a planning act.

## Rules

- **A status is only true if it is current.** An `In progress` marker left behind on an abandoned task
  is worse than no marker at all — it makes the board lie *with confidence*. If you pick a task up,
  set it; if you put it down, unset it.
- **`Blocked` and `Cancelled` require a reason, inline, in the status itself.** A blocker with no
  stated cause cannot be acted on by anyone but the person who wrote it.
- **The brief and the sprint plan must agree.** Both carry the status; both get updated together. The
  mover skills already do this — do the same by hand. ⚠️ Those two are the task's *own* records;
  **other** files also describe its status in prose, and those copies are swept per
  [`task-attribute-cross-reference-sweep.md`](task-attribute-cross-reference-sweep.md).
- **Report reality, not the template.** If a dashboard shows a distinction this vocabulary can't
  express, the dashboard is lying — fix the vocabulary, don't fake the row.

## Where this is enforced

- `/fkit-task-done` — sets `✅ Done`
- `/fkit-task-cancelled` — sets `⛔ Cancelled`
- `/fkit-task-brief` — sets `🔲 Backlog` on creation
- `/fkit-status` — the dashboard renders these values and no others
- The producer reports against these values and no others

## Related

- [`status-report-format.md`](status-report-format.md) — how the producer *reports* status; its
  dashboard uses exactly these values.
