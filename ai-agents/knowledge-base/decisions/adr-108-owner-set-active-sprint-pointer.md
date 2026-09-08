# ADR-108: Active sprint is owner-set via a pointer, derived only as fallback (direction for the next fkit update)

- **Status:** accepted — **re-confirmed in practice 2026-09-07, still unshipped upstream**; **scope widened by amendment 2026-09-08** to cover local patching of `fkit-status` generally (decision unchanged)
- **Date:** 2026-08-24 *(updates: 2026-09-07, 2026-09-08)*
- **Deciders:** Owner (rulings 2026-08-24, 2026-09-07, 2026-09-08 — each relayed via a spawning session); fkit-architect (evaluation, and the 2026-09-08 assessment)

> ## 🔴 UPDATE 2026-09-07 — the predicted failure recurred, and the pointer is still not implemented
>
> **Owner ruling, given live in session, verbatim:** *"The active sprint is the Sprint 4!"*
>
> `select-active` was re-run on **2026-09-07** and returned
> `active file="plan-sprint-6.md" identity="Sprint 6"` — **exactly the failure this ADR was written
> about, now with three open plans (4, 5, 6) instead of the original three.**
>
> ✅ **Verified this date, by reading the code — not assumed:** the `.active-sprint` pointer designed
> below is **NOT implemented** in either copy of the resolver. `grep` for `active-sprint` in
> `.claude/skills/fkit-status/dashboard.sh` and in
> `~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh` matches **only** the pre-existing
> `drift ambiguous-active-sprint` printf. ⇒ **Creating `ai-agents/sprints/.active-sprint` today
> would be INERT — it would change no tool's answer.**
>
> ⇒ **The interim workaround recorded in the Scope note below is still the whole of the mechanism:
> ask for sprint status BY NAME (`/fkit-status Sprint 4`).**
>
> **What was done instead, 2026-09-07** — the ruling is recorded where humans and agents read, since
> no field the resolver reads can carry it:
> [`plan-sprint-4.md`](../../sprints/plan-sprint-4.md) (marked active),
> [`plan-sprint-5.md`](../../sprints/plan-sprint-5.md) and
> [`plan-sprint-6.md`](../../sprints/plan-sprint-6.md) (each marked *not* active, with sprint 6
> naming itself as the board the tooling wrongly returns), and
> [`plan-index.md`](../../sprints/plan-index.md).
>
> ⚠️ **No sprint plan was archived and no task row was moved.** The owner ruled which sprint is
> active — not that Sprint 4's 24 open rows should relocate, and not that plans 5 and 6 should be
> closed. Archiving 5 and 6 is the *"archive promptly"* option this ADR **already rejected by name**
> (see Options considered), and it would also be false: neither is done.
>
> 🚨 **This does NOT resolve the residual risk.** It documents around it. Two live consumers still
> silently answer for the wrong board on an empty argument — `/fkit-status` and
> `/fkit-sprint-ship-loop` (`fkit-sprint-ship-loop/SKILL.md:47,94`). **A decision on whether to
> implement the pointer locally or keep waiting on upstream is OPEN and belongs to the owner.**

> ## 🔴 UPDATE 2026-09-08 — the open question below is ANSWERED: hold on local patching, ship `0001`
>
> **Amendment basis (stated so it can be checked, per `decisions/README.md`).** This is an
> **owner's follow-up ruling on a question this ADR itself left open** — the residual note above says
> verbatim: *"A decision on whether to implement the pointer locally or keep waiting on upstream is
> **OPEN and belongs to the owner**."* It also clarifies wording already in the Scope note directly
> below (*"Nothing in this repo or in the fkit install is modified by this decision"*), widening it
> from the pointer specifically to local patching of `fkit-status` generally. **It reverses nothing**
> — the Decision, Options and Consequences are untouched, and the earlier wording is kept in full.
> ⚠️ **One reading of `decisions/README.md` would call the widening a new decision needing its own
> ADR.** It is recorded here on the owner's explicit 2026-09-08 instruction to update ADR-108 *rather
> than* write a new ADR, and on the architect's reasoning that **two ADRs asking one question invite
> two different answers**. Flagged rather than resolved silently.
>
> **Owner ruling, given live in session and relayed through the spawning session:**
> **HOLD on locally patching `/fkit-status`. Ship task `0001` instead.**
>
> ### Why — the cost of a local patch is quieter and worse than "it gets flagged"
>
> 🚨 **A prior claim that a local patch would make `/fkit-heal` report the file as owner-edited is
> FALSE.** The architect ran heal: **zero verdict lines for any `.claude/` path** — those files are
> not in the hash manifest at all. The real cost is that **`.claude/skills/fkit-*/` is GITIGNORED**, so
> a local patch is:
> - **not in git** — unreviewable, and absent on a fresh clone;
> - **invisible to `/fkit-heal`** — no tool reports it, in either direction;
> - **silently overwritten by the next fkit update**, with no warning from anything.
>
> A fix that vanishes without a trace at the next update, and that a second machine never had, is not
> a fix. **That fact is what drove the ruling.**
>
> ### Two different mechanisms — one decision, and this ADR's fix does NOT cover the other
>
> | | **ADR-108's blind spot** | **The 2026-09-08 blind spot** |
> |---|---|---|
> | Failure | The **wrong board** is chosen from among eligible candidates | A board that is **not a candidate at all** |
> | Mechanism | `select-active` derives the highest open identity (upstream ADR-041 §1) | **File selection**: `fkit-status/SKILL.md:57` names only `ai-agents/sprints/backlog.md`, singular; `sprint-backlog.md` appears nowhere, so **no documented argument reaches it** |
> | Fixed by the pointer? | Yes | **No** |
> | Fixed by task `0001`? | No | Yes — it removes the second board |
>
> 🚨 **Implementing this ADR's pointer would NOT surface `sprint-backlog.md`.** The pointer chooses
> among *candidates*; that board is not one. Verified live 2026-09-08:
> `dashboard.sh select-active` reports `candidate file="sprint-backlog.md" identity="Backlog"`, and
> `dashboard.sh:274` states the selector will *"Never fall back to a `Backlog`-identity board."*
> ⇒ The two blind spots are **independent**, and neither fix closes the other.
>
> ⇒ **`0001` removes the 2026-09-08 blind spot. It does nothing for ADR-108's**, where the mechanism
> remains what the 2026-09-07 update recorded: **ask for sprint status BY NAME** (`/fkit-status
> Sprint 4`). This ADR's residual risk is **unchanged and still open**.
>
> ⚠️ **Two premises corrected by the same assessment, recorded so they are not re-derived:**
> 1. The non-canonical status values `⬜ No sprint` / `⏸ Parked` do **not** hide rows — `dashboard.sh`
>    renders all 25 with their status cells verbatim, and `marker_key`'s default arm is a **bucket, not
>    a drop**. The cost is a useless summary line plus drift-noise lines: **degraded, not invisible.**
> 2. The default run omitting unscheduled work is **the contract, not a bug** (upstream ADR-041 §3) —
>    `backlog.md`'s own 34 open rows are not in the default run either. **Not a defect.**
>
> **Tracking:** [`0001-consolidate-unsprinted-work-onto-backlog-board`](../../tasks/backlog/0001-consolidate-unsprinted-work-onto-backlog-board/brief.md).
> ⚠️ **`0001` is not yet shippable as written** — a scope conflict with the same day's
> status-vocabulary ratification is open and returned to the owner; see that brief's own 2026-09-08
> update. **Its status and priority are unchanged: the owner ruled the route, not the schedule.**

> **Scope note.** fkit is upstream tooling; this ADR records the *direction this project wants the
> next fkit update to take*, not a change we implement here. Nothing in this repo or in the fkit
> install (`~/.local/share/fkit/`) is modified by this decision. Until upstream ships it, the
> project workaround is discipline: ask for sprint status **by name** (`/fkit-status Sprint 4`).

## Context

fkit resolves the "active sprint" (empty-argument `/fkit-status`, and `/fkit-sprint-ship-loop`'s
default — `fkit-sprint-ship-loop/SKILL.md:47,94`) by upstream ADR-041 §1: the highest eligible
resolved identity among open plans in `ai-agents/sprints/`, computed by the single implementation
in `~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh` (`select-active` mode, lines
237-298; `resolve_identity` at 121-166 is "THE ONE implementation" per ADR-041 §5).

Verified failure (reproduced 2026-08-24 in this project): plans 4, 5, and 6 are all legitimately
open — 4 unfinished, 5/6 pre-scoped, which is normal planning practice here — so `select-active`
returned `active file="plan-sprint-6.md"` while all live work was on Sprint 4. The owner asked for
current sprint status and got the wrong board, silently.

Constraints that shape the fix:
- Sprints deliberately have **no status field** — folder location is the state (`sprints/done/` =
  closed; `structure-spec.md:174-177`).
- **One implementation of one question** (upstream ADR-041 §5).
- The resolver is a **pure function of file contents** (`dashboard.sh:24-33`).
- **A wrong answer is strictly worse than none** (upstream ADR-040 constraint, `dashboard.sh:127-134`).
- Existing fkit installs must migrate at **zero cost**.

The root cause is not a bug in the ordering rule: **"which sprint is the owner working" is owner
intent, not a derivable property of the open plans.** Any resolver that only reads the plans must
guess whenever more than one is legitimately open.

Full analysis: `../reports/2026-08-24-eval-active-sprint-pointer.md`.

## Decision

The next fkit update should add an **owner-set active-sprint pointer**: one optional, owner-authored
dotfile — `ai-agents/sprints/.active-sprint` — containing a single sprint identity token (e.g.
`Sprint 4`). `select-active` honors it in front of the derivation rule:

1. **Pointer absent** → derive exactly as today (ADR-041 §1 unchanged, byte-identical output).
2. **Pointer present, token resolves to an eligible open plan** → that plan is the active sprint.
   Identity matching goes through the existing `resolve_identity` — one grammar, one
   implementation; two open plans claiming the pointed identity fall into the existing
   `ambiguous-active-sprint` drift record unchanged.
3. **Pointer present but stale** (names an identity no eligible open plan carries — archived plan,
   typo, `Backlog`, unresolvable token) → emit a **loud drift record** (e.g.
   `drift stale-active-pointer wanted="…"`) **and** fall back to derivation. Fail loud in both
   directions: never silently honor a stale pointer, never silently discard one.

The pointer is a dotfile so the existing `*.md` candidate scan (`dashboard.sh:241`) never sees it,
and a **single file, not per-plan state**, so exactly one sprint can be named by construction.

## Options considered

- **Owner-set pointer (chosen)** — the only candidate that reads owner intent instead of guessing
  at it. Preserves ADR-041 §5 (a new *input* to the one implementation, not a second
  implementation), zero migration (absent = today's behavior), fails loud when stale, and its
  degraded mode is exactly the status quo. Precedent for resolver-reads-owner-authored-fact exists:
  brief `## Sprint:` fields (`dashboard.sh:148-163`).
- **Status quo + discipline (archive promptly; ask by name)** — rejected: does not fix the failure,
  it forbids the pre-scoped-sprints workflow that triggers it, and discipline-based fixes are the
  class fkit keeps replacing with mechanism (`dashboard.sh:19-22`). Retained only as the *interim*
  project workaround until upstream ships.
- **Full per-sprint status field** — rejected: duplicates folder-location's answer to "is this
  sprint open", creating a permanent dual-source drift class (plan in `done/` marked `active`), and
  allows N files to claim active. Worst migration cost of all options (every plan, every install).
  This matches the lead's prior assessment.
- **Resolver heuristic change** — rejected in both variants. *Most-recently-modified wins* breaks
  the pure-function contract (mtime is metadata git does not preserve; two clones disagree; any
  incidental write silently flips the answer). *Lowest open identity wins* fixes this instance
  (4 < 6) but mirrors the failure the moment an old plan is deliberately left open while work moves
  forward, and re-litigates ADR-041 §1.4's owner-ruled ordering. No heuristic over open plans can
  recover owner intent.

## Consequences

- **Positive:** the empty-argument status/ship-loop contract becomes trustworthy under pre-scoped
  future sprints — the workflow this project actually uses. Both consumers are fixed at the single
  `select-active` seam. Existing installs are untouched until an owner opts in by creating the file.
- **Negative / costs:** one new piece of owner-maintained state that can go stale at sprint
  rollover (mitigated — loudly detected, degrades to today's derivation, never worse than status
  quo). One new file class for upstream's `structure-spec.md` (owner-authored, optional, never
  repaired) and a paragraph in `fkit-status/SKILL.md`'s argument contract.
- **Residual risks / "re-raise only if":**
  - upstream implements the pointer as per-plan front-matter or a status field instead of a single
    pointer file (reopens the N-claimants and archive-staleness problems this ADR rejects), or
  - the stale-pointer path is implemented as silent fallback or silent honor (violates the
    fail-loud requirement), or
  - the owner's planning practice changes so that only one sprint plan is ever open at a time — in
    which case the pointer is dead weight and the derivation alone suffices.

  A review finding that merely notes "active-sprint can be wrong when several plans are open,
  absent a pointer" is **closed by this ADR** — that is the recorded interim state, not a new
  defect.

## Related

- Evaluation: `../reports/2026-08-24-eval-active-sprint-pointer.md`
- Upstream law referenced: fkit ADR-040 / ADR-041 (quoted in
  `~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh:64-77,121-134,168-173,216-298`; the
  ADR files themselves live in fkit's own repo, not this project)
- Consumers: `fkit-status/SKILL.md` (empty-argument rule), `fkit-sprint-ship-loop/SKILL.md:47,94`
- Sprint-state-is-location: `~/.local/share/fkit/claude/structure-spec.md:174-177`
