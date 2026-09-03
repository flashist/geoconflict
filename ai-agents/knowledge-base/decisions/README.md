# Decisions — Architecture Decision Records (ADRs)

**Why the rule is what it is.** An ADR records a *settled* decision: the forces at play, the choice
made, the options rejected and why, and the consequences accepted. It is **immutable once accepted** —
when a decision changes, write a new ADR that supersedes the old one; never edit history.

## Immutability starts at `accepted` — a `proposed` ADR is still a draft

**(Owner ruling, 2026-08-09. Stated here so nobody re-derives it.)**

The immutability rule above bites **from `accepted` onward**, not from the moment the file exists.

- **`proposed` → `accepted` is promoted in place.** Edit the ADR's own Status line and fold in the
  owner's ruling. Do **not** write a second ADR to accept a draft, and do not mark the draft
  superseded — there is no earlier settled decision to supersede.
- **While an ADR is `proposed`, its body is editable.** It is a draft put to the owner; refining the
  wording before the ruling is normal.
- **Once an ADR is `accepted`, the body is history.** A change of decision goes in a new ADR that
  supersedes it. The narrow exception — **written by the architect on its own judgment 2026-08-09,
  and explicitly authorised by the owner the same day** — is amendments the ADR itself invites:
  recording that a pre-committed trigger fired, or an owner's follow-up ruling that clarifies wording
  already in the ADR. Those are amendments *to the record of that decision*, not a new decision; date
  and attribute them inline so the sequence stays readable, and **keep every superseded wording
  visible** rather than rewriting into one clean story.
  **The carve-out covers CLARIFICATIONS ONLY (owner ruling, 2026-08-09).** Clarifying wording already
  in an accepted ADR, or recording that a pre-committed trigger fired, may be done in place. **A
  reversal of an accepted decision may not** — it requires a **superseding ADR**. If you are undoing a
  choice rather than sharpening its wording, you are writing a new ADR.

  ⚠️ **One recorded exception — ADR-102, 2026-08-09, not precedent.** ADR-102's trigger was clarified
  (narrowed), then that clarification was *reversed* (widened again) **in place**. Under the rule just
  stated, the reversal should have gone in a superseding ADR. It **stands as-is on the owner's explicit
  instruction that day**, and is left in place deliberately — the owner did not ask for it to be
  unpicked or re-housed. It is **not precedent, and it is the last reversal that will be handled this
  way.** Anyone citing it as licence to reverse an accepted ADR in place is misreading it.
- **A new decision is never an edit.** If the choice itself changes, supersede — do not overwrite.

See [`../conventions/README.md`](../conventions/README.md) for how this folder differs from
`conventions/` (what the rule *is*), `reports/`, and `incidents/`.

## Naming and number allocation — read this before you create an ADR

`adr-<NNN>-<slug>.md` — three or more digits, non-empty slug, numeric identity. Never reuse a number.

**The allocation rule (owner ruling, 2026-08-08):**

> **001–099 is reserved for fkit toolkit ADRs. This project's ADRs start at 101.**
> Allocate a new project ADR from the highest number already **on disk in this folder**, plus one —
> and never below 101. If this folder were empty, the next number would still be 101, not 001.

100 is left unused as a deliberate gap between the two bands.

### Why the reservation exists — two ADR series share this repo

| Series | Lives in | Number band | Example references |
|---|---|---|---|
| **This project's ADRs** (Geoconflict) | `ai-agents/knowledge-base/decisions/` (here) | **101+** | ADR-101 … ADR-107 |
| **fkit toolkit ADRs** | the fkit install share — **not in this repo** | 001–099 | ADR-005 (wiki write gateway), ADR-020, ADR-029, ADR-031, ADR-033 |

fkit's own ADR numbers are cited inside this repo — in `ai-agents/tasks/README.md` (ADR-020, ADR-029)
and `../conventions/task-owner-vocabulary.md` (ADR-031). Those are **about the agent toolkit**, not
about Geoconflict. Before the ruling both series used the same 001+ range, so `ADR-005` was ambiguous.
The bands now separate them: **a number at or above 101 is always this project's; a number below 100
is always fkit's.** Naming the series when you cite an ADR is still good practice, but no longer
load-bearing for correctness.

## History of this folder

- **ADR-101 through ADR-106** were **retro-recorded on 2026-08-08** from decisions that had, until
  then, existed only as inline code comments. Each states the date the decision was actually made and
  marks plainly where intent is *inferred from code* rather than read from an owner statement.
  They were first written as ADR-001…006 and **renumbered to 101…106 the same day** under the
  allocation ruling above.
- **ADR-107** (turn-interval speed-up) was recorded 2026-08-08 directly in the new band.
- **ADR-102** was promoted `proposed` → `accepted` **in place** on 2026-08-09 on the owner's ruling.
  Its **expiry trigger was then ruled three times that same day** — wide, narrowed, then widened again
  to "any paid entitlement" on new code evidence. All three wordings are kept visible in the ADR, with
  dates and reasons, so nobody re-proposes the abandoned narrow reading. The **promotion** and the
  **first (clarifying) amendment** are the worked example of the rule above. The **third wording — a
  reversal done in place — is the recorded exception, not the example**; see the carve-out section.
- **2026-08-09 — ADR-102's "coin chain" residual was downgraded**, after Task 11's design was read:
  coins as designed are **earn-only** (`../../sprints/plan-sprint-5.md:67-69`), so the paid-entitlement
  trigger is not implicated. The concern is kept visible in the ADR as a corrected record with a
  narrow conditional re-raise, not deleted.
- **2026-09-03 — ADR-110** (may an AI player be declared the winner of a match?) was drafted and
  promoted `proposed` → `accepted` **in place** the same day, on an owner ruling given live in session
  (*"Allow — accept the ADR."*). The owner ruled two further points with it: the policy covers
  **Team mode (`0205`) as well as FFA (`0206`)** — one policy across both modes, because the branch
  scope had been deliberately unified on 2026-09-02 and a type-based exclusion in one mode would
  re-split it — and, answering the ADR's own flagged could-flip-this question, that a durable
  player-visible winner record is **"None today, but planned."**
  ⚠️ **That last answer makes ADR-110 a time-limited decision, not a settled-forever one.** It carries
  a pre-committed revisit trigger requiring re-examination **before** any leaderboard, match history,
  announcements feed, or share card ships. The trigger is **expected to fire**. Do not cite ADR-110 in
  support of a winners surface without re-opening it — its reasoning never covered that case.
