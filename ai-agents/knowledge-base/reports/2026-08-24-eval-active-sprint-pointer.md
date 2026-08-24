# Evaluation — how should fkit resolve the *active sprint*? (owner-set pointer vs alternatives)

**Date:** 2026-08-24 · **Author:** fkit-architect (consult, spawned by lead; owner ruling 2026-08-24
relayed) · **Feeds:** ADR-108 (`../decisions/adr-108-owner-set-active-sprint-pointer.md`)

## 1. Problem

fkit's active-sprint resolution (upstream ADR-041 §1: *highest eligible resolved identity among the
open plans in `ai-agents/sprints/`*) selects the wrong board whenever future sprints are pre-scoped.
Reproduced in this project on 2026-08-24:

```
$ bash .claude/skills/fkit-status/dashboard.sh select-active ai-agents/sprints
active file="plan-sprint-6.md" identity="Sprint 6"
candidate ... plan-sprint-4.md identity="Sprint 4"   ← all live work is here
candidate ... plan-sprint-5.md identity="Sprint 5"
```

Plans 4/5/6 are all legitimately open (4 unfinished, 5/6 pre-scoped — a normal planning practice
here; `plan-index.md` deliberately catalogs all three). The owner asked "current sprint status" and
got Sprint 6's board. The decision: what should the next fkit update change so the empty-argument
`/fkit-status` (and `/fkit-sprint-ship-loop`, which uses the same rule —
`fkit-sprint-ship-loop/SKILL.md:47,94`) answers with the sprint the owner is actually working?

**Constraints (from the existing implementation and its recorded law):**

- **One implementation of one question** — ADR-041 §5, enforced in
  `~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh:121-124` (`resolve_identity` is "THE
  ONE implementation of the grammar, for every mode"). Any fix must not create a second place that
  answers "which sprint is active".
- **Sprints have no status field by design** — folder location is the state (`sprints/done/` =
  closed; `structure-spec.md:174-177` — structural directories only, no content contract).
- **The resolver is a pure function of file contents** — `dashboard.sh:24-33` (contract block: reads
  the plan, the briefs it links, sibling first lines; "Nothing else. Not the code, not git").
- **Wrong is strictly worse than none** — ADR-040's hard constraint, quoted at
  `dashboard.sh:127-134`: an unresolved identity is loud, a wrong one is silent. Both rungs refuse
  rather than guess.
- **Zero-migration preference** — the `select-active` mode was itself added so that "the
  one-argument invocation is byte-identical to what it always was" (`dashboard.sh:34-36`); existing
  installs must keep working untouched.

**Priorities** (owner-relayed via the lead's spawn brief; no direct owner channel in this consult):
single-source-of-truth per ADR-041 §5, drift risk, migration cost for existing fkit installs, and
actually fixing the observed failure. The lead's prior take — "full status field creates dual-source
drift; the pointer is the minimal fix" — treated as context, not a constraint.

## 2. The candidates

| | Approach |
|---|---|
| **(a)** | Status quo + discipline: archive plans promptly; ask for sprints by name |
| **(b)** | Owner-set **active-sprint pointer** the resolver honors when present, deriving as today when absent |
| **(c)** | Full per-sprint status field in each plan |
| **(d)** | Resolver heuristic change (most-recently-modified wins, or lowest open identity wins) |

## 3. Analysis

### (a) Status quo + discipline

**How it works.** No code change. The owner either archives 5/6 (they aren't done — they'd have to
live somewhere else, or the pre-scoping practice ends) or always types `/fkit-status Sprint 4`.

- **Pros:** zero implementation, zero migration, ADR-041 untouched.
- **Cons:** does not fix the failure — it forbids the workflow that triggers it. Pre-scoped future
  sprints are legitimate and in live use (this project, today). "Ask by name" quietly deletes the
  empty-argument contract's value: the whole point of `select-active` is that the owner *doesn't*
  have to know the answer. And discipline-based fixes are exactly the class fkit keeps replacing
  with mechanism (the dashboard script exists because "the counts must sum to M" as an instruction
  failed — `dashboard.sh:19-22`).
- **Effort/reversibility:** none / trivially.
- **Risk:** the failure recurs on every install that pre-scopes; each recurrence hands the owner a
  wrong board silently — the worst direction per ADR-040.

### (b) Owner-set active-sprint pointer *(recommended)*

**How it works.** One new optional, owner-authored file — `ai-agents/sprints/.active-sprint` —
containing a single identity token (e.g. `Sprint 4`). `mode_select_active`
(`dashboard.sh:237-298`) gains one step in front of the ordering loop:

1. Pointer absent → derive exactly as today (byte-identical; zero migration).
2. Pointer present and its token matches an **eligible open candidate's resolved identity** → that
   plan is active. Identity resolution still goes through `resolve_identity` — one grammar, one
   implementation. Two open plans claiming the pointed identity hit the *existing*
   `ambiguous-active-sprint` drift record (`dashboard.sh:288-293`) unchanged.
3. Pointer present but stale — names an identity no eligible open plan resolves to (archived plan,
   typo, `Backlog`, unresolvable token) → **loud drift record** (e.g.
   `drift stale-active-pointer wanted="…"`) *and* fall back to derivation, so the owner still gets a
   board plus the finding. Silent honor of a stale pointer would be "wrong and silent"; silent
   fallback would hide the staleness — emit-and-derive is the only combination that fails loud in
   both directions.

Why a **marker file**, not front-matter in the plan: a `active: true` line is per-file state — it
travels with the file into `sprints/done/` on archive (instant stale claim inside a closed plan),
and two plans can both carry it (a new ambiguity class needing a new tie-break). A single pointer
file can name only one sprint **by construction**, and it lives outside the candidate scan already
(the `*.md` glob at `dashboard.sh:241` never sees a dotfile). It also preserves "sprints have no
status field": the pointer is not a status on a sprint, it is one new fact — *which board the owner
is working* — stored once.

**Single-source-of-truth check (ADR-041 §5).** §5 forbids two *implementations* of one question.
The pointer is not a second implementation — it is a second *input* to the one implementation, and
it answers a question the current inputs provably cannot: which of several legitimately open plans
the owner intends. Sprint 4-vs-6 is owner intent, not derivable state; no function over open plans
can recover it. Precedent: eligibility already honors an owner-authored fact the resolver merely
reads (`## Sprint: Backlog` in briefs, `dashboard.sh:148-163`).

- **Pros:** fixes the observed failure exactly; absent-pointer path is byte-identical (zero
  migration); one implementation preserved; stale state fails loud; both consumers
  (`fkit-status`, `fkit-sprint-ship-loop`) fixed at the single `select-active` seam.
- **Cons / costs:** a new owner-maintained state that *can* go stale (mitigated by the drift
  record, not eliminated); one new file class for `structure-spec.md` ("owner-authored, optional,
  never repaired") and a paragraph in `fkit-status/SKILL.md`'s argument contract; the owner must
  remember to move the pointer at sprint rollover (forgetting = one loud drift line at next status,
  then derivation — degraded to today's behavior, not worse).
- **Effort/reversibility:** small — one guarded branch in `mode_select_active`, one drift record,
  doc updates, tests. Fully reversible: delete the file and the branch; absent-pointer behavior was
  never touched.
- **Risks/unknowns:** token grammar edge cases (leading/trailing whitespace, BOM) — trivially
  normalized; whether a convenience setter (a producer-side command) should exist or hand-editing
  suffices — upstream's call, see open questions.

### (c) Full per-sprint status field

**How it works.** Every plan carries a status (`active` / `open` / `done`…); the resolver reads it.

- **Cons (disqualifying):** creates a *second* implementation of "is this sprint open" — folder
  location already answers that (`sprints/done/` = closed, `SKILL.md:33-34`), so plan-in-`done/`
  with status `active` is a new permanent drift class, precisely the plan-vs-brief-vs-location
  drift the dashboard spends its `⟦FACTS⟧` section policing for tasks. "Active" as a per-file flag
  also allows N files to claim it (same ambiguity as front-matter, above). Migration is the worst
  of the four: every plan in every existing install needs the field, and heal/structure tooling
  needs content rules for a file class that today has none (`structure-spec.md:176-177`).
- **Pros:** self-describing plans.
- **Effort/reversibility:** largest; reversal requires touching every plan again.

### (d) Resolver heuristic change

**Most-recently-modified wins:** breaks the pure-function contract (`dashboard.sh:24-33`) — mtime
is metadata, not content; git checkout/clone does not preserve it, so two clones of one repo would
disagree about the active sprint, and any incidental write (a lint pass, a heal, a formatting fix)
silently flips the answer. Wrong-and-silent, the forbidden direction. Rejected outright.

**Lowest open identity wins:** deterministic, and it happens to fix *this* project's instance
(4 < 6). But it only mirrors the failure: the moment an old sprint is deliberately left open (a
long-tail hardening plan) while work moves to a newer one, lowest-wins names the wrong board with
identical silence. It also re-litigates ADR-041 §1.4's owner-ruled ordering, and — the core point —
**no heuristic over open plans can recover owner intent**, because "which board am I working" is
not a function of the files. Every heuristic guesses; ADR-040 ranks a wrong guess below no answer.

- **Effort:** small. **Risk:** trades one silent-wrong case for another; churns a freshly
  owner-ruled ordering.

## 4. Comparison

| | Fixes observed failure | Single source (ADR-041 §5) | Drift risk | Migration cost | Effort |
|---|---|---|---|---|---|
| (a) status quo | **No** — forbids the workflow instead | preserved | none new | none | none |
| **(b) pointer** | **Yes** — reads intent instead of guessing | preserved — new *input*, same one implementation | stale pointer possible → **loud** drift record + derive fallback | **zero** (absent = today, byte-identical) | small |
| (c) status field | Yes, at the cost of a new drift class | **violated** — duplicates folder-location's answer | permanent dual-source (status vs location), N-claimants | worst — every plan, every install | large |
| (d) heuristic | mtime: no (non-deterministic) · lowest-wins: this case only | preserved | silent-wrong in mirror scenarios | zero | small |

## 5. Recommendation

**(b) — the owner-set active-sprint pointer**, as a dotfile (`ai-agents/sprints/.active-sprint`)
holding one identity token, honored by `mode_select_active` when present and valid, with a loud
`stale-active-pointer` drift record plus derivation fallback when present-but-stale, and today's
byte-identical derivation when absent.

**Rationale in one line:** the observed failure is that active-sprint is *owner intent*, which no
function over open plans can derive — so the fix is to let the owner state it once, in one place,
read by the one existing implementation.

**Main tradeoff accepted:** a new piece of owner-maintained state that can go stale at sprint
rollover. Mitigation, not elimination: staleness is detected and reported loudly, and the degraded
behavior is exactly today's derivation — never worse than the status quo.

**De-risk before committing upstream:** none needed beyond normal tests — the change is one guarded
branch behind an existence check, and the no-pointer path is untouched.

## 6. Open questions (for the owner / fkit upstream)

1. **Pointer content grammar** — recommended: the identity token (`Sprint 4`), since identity is the
   resolution currency and survives a file rename; confirm vs a filename.
2. **Setter ergonomics** — hand-edit only, or a producer-side convenience (e.g. the sprint-close /
   sprint-plan flow updating the pointer)? Hand-edit suffices for v1; a setter reduces rollover
   staleness.
3. **Should `sprint-backlog.md` be renamed upstream of this?** Unrelated to the fix but observed:
   its H1 "Sprint Backlog" normalizes to the `Backlog` identity (`dashboard.sh:94-100`) — correct
   today, worth knowing it is load-bearing.
4. **Interim, before the fkit update ships:** this project can only use approach (a) discipline
   ("ask by name") — worth telling the producer explicitly so status requests name Sprint 4.
