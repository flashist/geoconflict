# ADR-108: Active sprint is owner-set via a pointer, derived only as fallback (direction for the next fkit update)

- **Status:** accepted
- **Date:** 2026-08-24
- **Deciders:** Owner (ruling 2026-08-24, relayed via lead); fkit-architect (evaluation)

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
