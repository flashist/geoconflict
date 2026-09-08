# ADR-108 — Active sprint is owner-set via a pointer, derived only as fallback

**Date**: 2026-08-24 *(updates: 2026-09-07, 2026-09-08)*
**Status**: accepted — **re-confirmed in practice 2026-09-07, still unshipped upstream**; **scope widened by an in-place amendment 2026-09-08** from "the active-sprint pointer" to **local patching of `fkit-status` generally**. ⚠️ **Updated in place — NOT superseded, NOT replaced.** The Decision, Options and Consequences are untouched and the earlier wording is kept in full.

> # 🔴 UPDATE 2026-09-07 — THE PREDICTED FAILURE RECURRED, AND THE POINTER IS STILL NOT IMPLEMENTED
>
> **Owner ruling, given live in session, verbatim:** *"The active sprint is the Sprint 4!"*
>
> `select-active` was re-run on **2026-09-07** and returned `active file="plan-sprint-6.md" identity="Sprint 6"` — **exactly the failure this ADR was written about**, now with plans 4, 5 and 6 open.
>
> ✅ **Verified this date by reading the code, not assumed:** the `.active-sprint` pointer designed below is **NOT implemented** in either copy of the resolver. `grep` for `active-sprint` in `.claude/skills/fkit-status/dashboard.sh` and in `~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh` matches **only** the pre-existing `drift ambiguous-active-sprint` printf. ⇒ 🚨 **Creating `ai-agents/sprints/.active-sprint` today would be INERT — it would change no tool's answer.**
>
> ⇒ **The interim workaround remains the whole of the mechanism: ask by name — `/fkit-status Sprint 4`.**
>
> **What was done instead:** the ruling was recorded where humans and agents read, since no field the resolver reads can carry it — `plan-sprint-4.md` marked active, `plan-sprint-5.md` and `plan-sprint-6.md` each marked *not* active (with Sprint 6 naming itself as the board the tooling wrongly returns), and `plan-index.md`.
>
> ⚠️ **No sprint plan was archived and no task row was moved.** The owner ruled which sprint is active — **not** that Sprint 4's open rows should relocate, and not that plans 5 and 6 should close. Archiving 5 and 6 is the *"archive promptly"* option **this ADR already rejected by name**, and it would also be false: neither is done.
>
> 🚨 **This does NOT resolve the residual risk — it documents around it.** Two live consumers still silently answer for the wrong board on an empty argument: `/fkit-status` and `/fkit-sprint-ship-loop`. ~~**A decision on whether to implement the pointer locally or keep waiting on upstream is OPEN and belongs to the owner.**~~ ✅ **ANSWERED 2026-09-08 — see the update immediately below. The residual risk itself is UNCHANGED and still open; only the question of what to do about it was settled.**

> # 🔴 UPDATE 2026-09-08 — the open question is ANSWERED: HOLD on local patching, ship `0001`
>
> **Owner ruling, given live in session and relayed through the spawning session:** **HOLD on locally patching `/fkit-status`. Ship task `0001` instead.**
>
> **How it is recorded matters.** This is an **amendment to this ADR, made in place** — not a new ADR, not a supersession. It answers a question **this ADR itself left open** (the struck sentence above says verbatim that the decision *"is OPEN and belongs to the owner"*), and it clarifies wording already in the Scope note below, **widening it from the pointer specifically to local patching of `fkit-status` generally.** ⚠️ **One reading of the project's decision-record rules would call that widening a new decision needing its own ADR.** It sits here on the owner's explicit instruction to update ADR-108 *rather than* write a new one, and on the architect's reasoning that **two ADRs asking one question invite two different answers.** Flagged rather than resolved silently.
>
> ### 🚨 A prior claim about `/fkit-heal` was FALSE and is corrected here
>
> ⛔ **The claim that a local patch would be reported by `/fkit-heal` as owner-edited does NOT hold.** The architect ran heal: **zero verdict lines for any `.claude/` path** — those files are **not in the hash manifest at all**. ⛔ **Do not carry the false version forward.**
>
> **The real cost is quieter and worse than "it gets flagged".** `.claude/skills/fkit-*/` is **gitignored**, so a local patch is:
> - **not in git** — unreviewable, and absent on a fresh clone;
> - **invisible to `/fkit-heal`** — no tool reports it, in either direction;
> - **silently overwritten by the next fkit update**, with **no warning from anything**.
>
> A fix that vanishes without a trace at the next update, and that a second machine never had, is not a fix. **That fact is what drove the ruling.**
>
> ### Two DIFFERENT blind spots — and this ADR's fix does not cover the other one
>
> | | **ADR-108's blind spot** | **The 2026-09-08 blind spot** |
> |---|---|---|
> | Failure | The **wrong board** is chosen from among eligible candidates | A board that is **not a candidate at all** |
> | Mechanism | `select-active` derives the highest open identity | **File selection**: the status skill names only `ai-agents/sprints/backlog.md`, singular; `sprint-backlog.md` appears nowhere, so **no documented argument reaches it** |
> | Fixed by the pointer? | Yes | **No** |
> | Fixed by task `0001`? | No | Yes — it removes the second board |
>
> 🚨 **Implementing this ADR's pointer would NOT surface `sprint-backlog.md`.** The pointer chooses among *candidates*, and that board is not one. Verified live 2026-09-08: `select-active` reports it as `identity="Backlog"`, and `dashboard.sh` states the selector will *"Never fall back to a `Backlog`-identity board."* ⇒ **The two blind spots are independent, and neither fix closes the other.**
>
> ⇒ **`0001` removes the 2026-09-08 blind spot. It does nothing for ADR-108's**, where the mechanism remains what the 2026-09-07 update recorded: **ask for sprint status BY NAME.** 🔴 **This ADR's residual risk is unchanged and still open.**
>
> 🚨 **And `0001` is not a complete fix even of its own blind spot.** It fixes **reachability**, not **rendering** — the two ratified board-level status values `⬜ No sprint` and `⏸ Parked` are still not rendered by the dashboard, so once `0001` moves those rows onto `backlog.md`, **that** board carries values the dashboard does not render. **The blind spot follows the rows.** See [[systems/agent-conventions]].
>
> ⚠️ **Two premises corrected by the same assessment, recorded so nobody re-derives them:**
> 1. **The non-canonical values do NOT hide rows.** `dashboard.sh` renders all 25 with their status cells verbatim, and the marker lookup's default arm is a **bucket, not a drop**. The cost is a useless summary line plus drift-noise lines: **degraded, not invisible.**
> 2. **The default run omitting unscheduled work is the CONTRACT, not a bug** — `backlog.md`'s own 34 open rows are not in the default run either. ⛔ **Not a defect; do not write it up as one.**
>
> ⚠️ **`0001` is not yet shippable purely on this ruling's say-so, and its status and priority are UNCHANGED (`🔲 Backlog` / `Unscheduled`) — the owner ruled the ROUTE, not the SCHEDULE.** A scope conflict with the same day's status-vocabulary ratification was raised and has since been settled by the widening recorded in [[systems/agent-conventions]].

> Project ADR-108 — see [[decisions/adr-numbering-two-series]].
> Deciders: owner (ruling 2026-08-24, relayed via the lead); fkit-architect (evaluation).
>
> **Scope note.** fkit is upstream tooling. This ADR records the *direction this project wants the next fkit update to take* — **nothing in this repo or in the fkit install is modified by it.** Until upstream ships the pointer, the project workaround is discipline: ask for sprint status **by name** (`/fkit-status Sprint 4`).
>
> Source: `ai-agents/knowledge-base/decisions/adr-108-owner-set-active-sprint-pointer.md`

## Context

fkit resolves "the active sprint" — empty-argument `/fkit-status`, and `/fkit-sprint-ship-loop`'s default — as the highest eligible resolved identity among open plans in `ai-agents/sprints/`, computed by the single `select-active` implementation in `fkit-status/dashboard.sh`.

**Verified failure, reproduced in this project 2026-08-24:** plans 4, 5 and 6 are all legitimately open — 4 unfinished, 5 and 6 pre-scoped, which is normal planning practice here — so `select-active` returned Sprint 6 while all live work was on Sprint 4. The owner asked for current sprint status and got the wrong board, **silently**.

Constraints that shape any fix: sprints deliberately have **no status field** (folder location is the state — `sprints/done/` means closed); one implementation of one question; the resolver is a **pure function of file contents**; a wrong answer is strictly worse than none; existing installs must migrate at zero cost.

The root cause is not a bug in the ordering rule. **"Which sprint is the owner working" is owner intent, not a derivable property of the open plans.** Any resolver that reads only the plans must guess whenever more than one is legitimately open.

## Decision

The next fkit update should add an **owner-set active-sprint pointer**: one optional, owner-authored dotfile — `ai-agents/sprints/.active-sprint` — holding a single sprint identity token (e.g. `Sprint 4`). `select-active` honors it ahead of the derivation rule:

1. **Pointer absent** → derive exactly as today, byte-identical output.
2. **Pointer present and its token resolves to an eligible open plan** → that plan is the active sprint. Identity matching goes through the existing `resolve_identity`, so two open plans claiming the pointed identity fall into the existing `ambiguous-active-sprint` drift record unchanged.
3. **Pointer present but stale** (names an identity no eligible open plan carries — archived plan, typo, `Backlog`, unresolvable token) → emit a **loud drift record** *and* fall back to derivation. Fail loud in both directions: never silently honor a stale pointer, never silently discard one.

The pointer is a **dotfile** so the existing `*.md` candidate scan never sees it, and a **single file, not per-plan state**, so exactly one sprint can be named by construction.

**Options rejected.** **Status quo + discipline** — does not fix the failure; it forbids the pre-scoped-sprints workflow that triggers it, and discipline-based fixes are the class fkit keeps replacing with mechanism. (Retained only as the *interim* project workaround until upstream ships.) **A full per-sprint status field** — duplicates folder-location's answer to "is this sprint open", creating a permanent dual-source drift class (a plan in `done/` marked `active`), allows N files to claim active, and carries the worst migration cost of all options. **A resolver heuristic change** — *most-recently-modified wins* breaks the pure-function contract (mtime is metadata git does not preserve; two clones disagree; any incidental write silently flips the answer); *lowest open identity wins* fixes this instance but mirrors the failure the moment an old plan is deliberately left open while work moves forward. No heuristic over open plans can recover owner intent.

## Consequences

- **Positive** — the empty-argument status and ship-loop contract becomes trustworthy under pre-scoped future sprints, which is the workflow this project actually uses. Both consumers are fixed at the single `select-active` seam. Existing installs are untouched until an owner opts in by creating the file.
- **Negative** — one new piece of owner-maintained state that can go stale at sprint rollover. Mitigated: loudly detected, degrades to today's derivation, never worse than the status quo. One new file class for upstream's structure spec (owner-authored, optional, never repaired) and a paragraph in the status skill's argument contract.
- **This project is not fixed by this ADR.** Until upstream ships the pointer, asking for status without naming a sprint can still return the wrong board here. Name the sprint.
- **Re-raise only if:** upstream implements the pointer as per-plan front-matter or a status field instead of a single pointer file (reopening the N-claimants and archive-staleness problems this ADR rejects); the stale-pointer path is implemented as silent fallback or silent honor (violating the fail-loud requirement); or the owner's planning practice changes so only one plan is ever open at a time, in which case the pointer is dead weight.

  A review finding that merely notes *"active-sprint can be wrong when several plans are open, absent a pointer"* is **closed by this ADR** — that is the recorded interim state, not a new defect.

## Related

- [[systems/agent-conventions]] — the project's standing law on task and sprint vocabularies, and where the "ask by name" interim workaround lives in practice; also carries the two board-level status exceptions the dashboard still does not render
- [[decisions/sprint-backlog]] — the two unsprinted boards, and where task `0001` — **the owner's chosen route, ruled 2026-09-08** — is tracked
- [[decisions/sprint-4]] — the board that was silently skipped in the reproduced failure
- [[decisions/sprint-5]] — pre-scoped open plan, part of the condition that triggers it
- [[decisions/sprint-6]] — the plan `select-active` wrongly returned
- [[decisions/adr-numbering-two-series]] — the ADR number bands

Evaluation source: `ai-agents/knowledge-base/reports/2026-08-24-eval-active-sprint-pointer.md`.
