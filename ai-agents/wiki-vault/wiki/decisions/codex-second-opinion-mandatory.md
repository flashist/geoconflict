# The Codex Second Opinion Is Mandatory — and Its Stated Evidence Was Wrong

**Date**: 2026-09-10
**Status**: accepted

> ⚠️ **This page records EVIDENCE, not law.** The rule itself already lives in the three fkit review
> skills and stays there. **No rule changed on 2026-09-10, no convention document was written, and no
> ADR was written.** This page exists because the *reasoning* that was relayed to the owner did not
> survive checking, and the correction is worth keeping.

## Context

Source: `ai-agents/knowledge-base/reports/2026-09-10-codex-second-opinion-owner-confirmation.md`,
recorded by a spawned `fkit-producer` at the close of task `0236`
([[tasks/citizenship-kill-switch-coverage]]).

The owner confirmed, live in session, that a code review must carry an independent **Codex** pass for
genuine model diversity, and that a Codex outage is a **loud** degradation, never a quiet skip.

**Three review skills already required exactly this**, degradation banners included — `fkit-review`
(the Codex adversarial pass is a *step*, not an option, and a missing Codex forces the
`🟡 Partial review — Codex unavailable` banner), `fkit-stateful-review` (the same pass, the same
degradation, flagged loudly), and `fkit-adversarial-review` (*"Primary mode — run the pass on Codex"*,
a mandatory fallback mode, *"never silently substitute yourself for Codex"*, and a fallback banner
that must be first in the output every time).

**Why this is not a `conventions/` document.** A convention has exactly one home; a second copy of a
rule is how the two drift apart and the project stops knowing which one is law. Restating what three
skills already mandate would create that second copy on day one.

## Decision

> **No code review closes without a Codex second opinion. A Codex outage is a LOUD degradation flag,
> not a quiet skip.**

**A Codex pass that ran but could not do part of its job is also a degradation, and gets said.** The
worked example is `0236` round 2: Codex ran and returned findings, but **could not execute jest**
(read-only sandbox, `EPERM` on the haste-map write), so the green suite was the **Claude reviewer's
single execution**. The *findings* had two-reviewer coverage; the **test execution did not**. **That
distinction is the honest unit of this rule.**

## Consequences

### 🚨 The ruling's stated evidence did NOT survive verification

The ruling was relayed with this reasoning: *"across three separate tasks, Codex found the defect the
Claude pass missed each time … All three were in code that had ALREADY passed a Claude review. Three
for three."*

**"Three for three" is not what the review ledgers say.** The ruling stands — it is the owner's, and
it confirms the skills regardless — but its reasoning is recorded accurately here so this page is not
the source of a claim nobody can reproduce.

| Task · finding | Severity | What the ledger's own attribution column says |
|---|---|---|
| `0227` R3 — the worker `ErrorUpdate` branch is unreachable; **site A is dead code**, which invalidated the task's site-A acceptance claim | **high** | ✅ *"Raised by Codex; missed by this reviewer."* A clean Codex-only catch, and the strongest single data point there is |
| `0227` R4 — the generation guard keys on the latest join rather than on who owns the live monitor | medium | ⚠️ *"Sharper path found by Codex; same root cause found independently by this reviewer."* A sharper **path**, **not** a defect Claude missed |
| `0236` R1 — the sync snapshot is never re-primed on late-SDK recovery | medium | ❌ *"Raised by both reviewers."* **The Claude pass did NOT miss this** |
| `0236` R6 — a self-contradictory doc comment | low | ✅ *"Raised by Codex."* Codex-only, but **comment-only, no behaviour** |

**Two further facts that cut against the count, and that stay in this record:**

- **`0225` cannot be counted at all.** Its ledger records Codex failing three attempts (*"Selected
  model is at capacity"*, an unsupported-model error) and states the pass *"is not model-diverse and
  is treated here as a second Claude pass, not as Codex."* If `0225` was the intended third task, **it
  is evidence of a Codex OUTAGE, not of a Codex catch.**
- **The exchange runs both ways.** `0236` R9 is marked **"Reviewer-only finding"** — the Claude
  reviewer found something Codex did not, in the same round.

**What the evidence actually supports:** **two Codex-only catches** (`0227` R3, `0236` R6), **one of
them `high` and invalidating an acceptance claim in code that had already passed a Claude review** —
on its own a serious argument for the ruling. Plus one sharper-path contribution. Against that, one
Claude-only finding and one outage.

⚠️ **This is a SIGNAL, not a measurement.** Two tasks, one day, one project, no controlled comparison,
and no count of the reviews where Codex added nothing. **Do not quote a hit rate from this page.**

⛔ **The two counter-facts above stay.** Dropping them to make the case tidier would be the same
failure in the other direction: a one-sided argument built by selection instead of a check.

### 🔴 Where the wrong framing came from — recorded plainly, because the failure is the point

**The "three for three" framing ORIGINATED WITH THE LEAD, not with the record.** The lead asserted it
and **relayed it to the owner multiple times before anyone checked it**, and it was **corrected by the
producer against the ledgers' own attribution columns** at the close of `0236`.

⛔ **This was NOT an ambiguity in the record, and must not be written up as one. The record was fine;
it was not read.** The claim was built from partial memory instead of a check — the exact failure mode
[[systems/agent-conventions]]'s evidence-before-assertion rule exists to stop, committed about the
review process itself. 📌 **The correction is deliberately left VISIBLE in the Sprint 4 board row for
`0236`. Do not tidy it away.**

### What a reviewer must actually do

Nothing new. Follow the skills: run the Codex adversarial pass and do not treat it as optional; if
Codex is unreachable, **say so in the prescribed banner and call the review partial** — never a quiet
skip, and **never a second Claude pass presented as a second opinion**; and if Codex ran but could not
do part of its job, say **that** too.

## Related

- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, whose close produced this record and whose round-2 jest degradation is its worked example
- [[tasks/crashed-game-teardown-seam]] — task `0227`, source of R3, the one `high` Codex-only catch
- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, whose ledger records the Codex outage
- [[systems/agent-conventions]] — the standing agent working agreements, including evidence-before-assertion
- [[decisions/profile-deploy-hardening-review-loop]] — the earlier ruling on bounding review loops rather than re-litigating settled trade-offs
- [[decisions/sprint-4]] — the sprint these reviews ran inside
