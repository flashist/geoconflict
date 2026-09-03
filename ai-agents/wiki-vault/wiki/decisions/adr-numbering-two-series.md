# ADR numbering — two series share this repo

**Date**: 2026-08-08
**Status**: accepted

> Owner ruling, 2026-08-08.
> Source: `ai-agents/knowledge-base/decisions/README.md`

## Context

Two independent ADR series are cited inside this repository, and before this ruling both used the same `001+` range — so a bare reference like "ADR-005" was ambiguous. One series is about **Geoconflict**, the product. The other is about **fkit**, the agent toolkit the project's workflow runs on; its ADRs are cited in `ai-agents/tasks/README.md` and in the project conventions, but the documents themselves **do not live in this repo**.

## Decision

**Reserve `001`–`099` for fkit toolkit ADRs. This project's ADRs start at `101`.**

| Series | Lives in | Band |
|---|---|---|
| **This project's ADRs** (Geoconflict) | `ai-agents/knowledge-base/decisions/` | **101+** |
| **fkit toolkit ADRs** | the fkit install share — not in this repo | 001–099 |

- Allocate a new project ADR from the highest number already **on disk** in the project's decisions folder, plus one — and never below 101. If the folder were empty, the next number would still be 101.
- `100` is left unused as a deliberate gap between the bands.
- File naming is `adr-<NNN>-<slug>.md`; a number is **never reused**.

A number at or above 101 is always this project's; a number below 100 is always fkit's. Naming the series when citing an ADR is still good practice but is no longer load-bearing for correctness.

## Immutability starts at `accepted` — a `proposed` ADR is still a draft

**(Owner ruling, 2026-08-09, recorded so nobody re-derives it.)** The immutability rule bites **from `accepted` onward**, not from the moment the file exists.

- **`proposed` → `accepted` is promoted in place.** Edit the ADR's own Status line and fold in the owner's ruling. Do **not** write a second ADR to accept a draft, and do not mark the draft superseded — there is no earlier settled decision to supersede.
- **While an ADR is `proposed`, its body is editable.** It is a draft put to the owner; refining the wording before the ruling is normal.
- **Once an ADR is `accepted`, the body is history.** A change of decision goes in a new ADR that supersedes it.
- **The narrow carve-out covers CLARIFICATIONS ONLY** (architect's judgment 2026-08-09, explicitly authorised by the owner the same day). Clarifying wording already in an accepted ADR, or recording that a pre-committed trigger fired, may be done in place — date and attribute the amendment inline, and **keep every superseded wording visible** rather than rewriting into one clean story. **A reversal of an accepted decision may not be done in place — it requires a superseding ADR.** If you are undoing a choice rather than sharpening its wording, you are writing a new ADR.

> ⚠️ **One recorded exception — ADR-102, 2026-08-09. Not precedent.** [[decisions/adr-102-privilege-refresher-fails-open]]'s trigger was clarified (narrowed), then that clarification was *reversed* (widened again) **in place**. Under the rule just stated the reversal should have gone in a superseding ADR. It stands as-is **on the owner's explicit instruction that day** and is left in place deliberately. It is **not precedent, and it is the last reversal that will be handled this way.** Anyone citing it as licence to reverse an accepted ADR in place is misreading it.

## Consequences

- **ADR-101 through ADR-106 were retro-recorded on 2026-08-08** from decisions that had, until then, existed only as inline code comments. Each states the date the decision was *actually* made and marks plainly where intent is *inferred from code* rather than read from an owner statement. They were first written as ADR-001…006 and **renumbered the same day** under this ruling.
- **ADR-107** was recorded directly in the new band. Its missing selection rationale was supplied by the owner on **2026-08-09** and folded in as a clarifying amendment.
- **ADR-102 was promoted `proposed` → `accepted` in place on 2026-08-09**, then had its expiry trigger ruled **three times that same day** (wide → narrow → wide again). All three wordings are kept visible with dates and reasons so nobody re-proposes the abandoned narrow reading. The **promotion** and the **first (clarifying) amendment** are the worked example of the rule above; the **third wording — a reversal done in place — is the recorded exception, not the example**.
- **2026-08-09 — ADR-102's "coin chain" residual was downgraded** after Task 11's design was read: coins as designed are earn-only, so the paid-entitlement trigger is not implicated. Kept visible in the ADR as a corrected record with a narrow conditional re-raise, not deleted.
- Wiki ADR pages in this vault carry the project number in their slug, so the vault inherits the same unambiguous identity.
- An ADR **creates** a convention; it never *is* one. The standing rules themselves live in the conventions set — see [[systems/agent-conventions]]. If you have to read an ADR to know how to do something routine, the convention is missing.

## Related

- [[decisions/adr-101-fail-soft-xp-crediting]]
- [[decisions/adr-102-privilege-refresher-fails-open]]
- [[decisions/adr-103-identity-trust-seam]]
- [[decisions/adr-104-archiving-disabled]]
- [[decisions/adr-105-compact-maps-out-of-rotation]]
- [[decisions/adr-106-flags-suppressed]]
- [[decisions/adr-107-turn-interval-1-5x]]
- [[decisions/adr-108-active-sprint-pointer]]
- [[decisions/adr-109-worker-index-placement-contract]]
- [[decisions/adr-110-ai-winner-allowed]] — drafted and **promoted `proposed` → `accepted` in place on 2026-09-03**, the rule above applied as intended; its number was verified free by a **repo-wide** sweep including `.claude/`, after the invisible-reservation trap that forced `0204` → `0205`
- [[systems/agent-conventions]] — the conventions set, and how it differs from ADRs
- [[systems/project-brief]] — where the two-series rule is stated as a working rule for agents
