# ADR-108 — Active sprint is owner-set via a pointer, derived only as fallback

**Date**: 2026-08-24
**Status**: accepted

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

- [[systems/agent-conventions]] — the project's standing law on task and sprint vocabularies, and where the "ask by name" interim workaround lives in practice
- [[decisions/sprint-4]] — the board that was silently skipped in the reproduced failure
- [[decisions/sprint-5]] — pre-scoped open plan, part of the condition that triggers it
- [[decisions/sprint-6]] — the plan `select-active` wrongly returned
- [[decisions/adr-numbering-two-series]] — the ADR number bands

Evaluation source: `ai-agents/knowledge-base/reports/2026-08-24-eval-active-sprint-pointer.md`.
