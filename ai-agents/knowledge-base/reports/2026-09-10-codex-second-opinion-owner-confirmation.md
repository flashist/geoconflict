# The Codex second opinion is mandatory — owner confirmation, and what the review ledgers actually show

**Date:** 2026-09-10
**Recorded by:** a spawned `fkit-producer`, at the close of task
[`0236`](../../tasks/done/0236-client-kill-switch-for-citizenship-surfaces/brief.md).
**Authority:** an **owner ruling**, given live in session and relayed through the spawning session.
**Citation frame:** repository `HEAD` = `4c981e5`. Review ledgers are cited by task folder and finding
id, which are stable; the fkit skills are cited **by section heading, never by line number** — they are
install-share files that `/fkit-heal` may replace wholesale. See
[`conventions/file-line-citations.md`](../conventions/file-line-citations.md).

---

## The ruling

> **No code review closes without a Codex second opinion. A Codex outage is a LOUD degradation flag,
> not a quiet skip.**

---

## 🔴 NO RULE CHANGED. This confirms existing practice.

**The three review skills already require exactly this**, and they already require the loud
degradation. Checked before writing this record, as the coordinator asked:

| Skill | What it already says |
|---|---|
| `.claude/skills/fkit-review/SKILL.md` | *"B) The adversarial pass (Codex, via CLI)"* is a step of the procedure, not an option. **"Graceful degradation (mandatory)"** requires recording `Codex reviewer unavailable: <reason>`. A separate rule — *"When the missing reviewer is Codex, the verdict line is not enough on its own"* — forces the banner `🟡 Partial review — Codex unavailable` / `⚠️ [NOT model-diverse — INCOMPLETE]`. |
| `.claude/skills/fkit-stateful-review/SKILL.md` | *"Exactly as in **fkit-review Step 1** — your own pass, plus the Codex adversarial pass … with the same degradation"*, and flag partial coverage **loudly**. |
| `.claude/skills/fkit-adversarial-review/SKILL.md` | *"Primary mode — run the pass on Codex."* **"Fallback mode (mandatory …)"**, *"**Never silently substitute yourself for Codex**"*, and a fallback banner that must be **"first thing in the output, every time"**. |

⇒ **This record is EVIDENCE, not law.** The rule lives in the skills and stays there.

**Why this is not a `conventions/` document.** `conventions/README.md` is explicit: a convention is
*"prescriptive and current"*, it has **exactly one home**, and *"a second copy of a rule is how the two
drift apart and the project stops knowing which one is law."* A convention restating what three skills
already mandate would create the second copy on day one. The same README puts *"what happened, once"*
in `reports/` — which is what this is.

**No ADR was written.** An ADR records *why* a rule is what it is, and is architect work; the
coordinator's instruction was to say so and stop rather than write one. **If anyone judges an ADR is
warranted here, that is a call for `fkit-architect`, not this record.**

---

## 🚨 THE RULING'S STATED EVIDENCE DID NOT SURVIVE VERIFICATION — corrected here, not quietly dropped

The ruling was relayed with this reasoning: *"across three separate tasks, Codex found the defect the
Claude pass missed each time … All three were in code that had ALREADY passed a Claude review. Three
for three."*

**Three for three is not what the review ledgers say.** Every finding below was read in its own
ledger's findings table this turn. **The ruling stands — it is the owner's, and it confirms the skills
regardless — but its reasoning must be recorded accurately or this file becomes the source of a claim
nobody can reproduce.**

> ### 🚨 Where the wrong framing came from — recorded plainly, because the failure is the point
>
> **The "three for three" framing ORIGINATED WITH THE LEAD, not with the record.** The lead asserted
> it and **relayed it to the owner multiple times before anyone checked it**, and it was **corrected
> by the producer against the ledgers' own attribution columns** at the close of `0236`.
>
> ⛔ **This was NOT an ambiguity in the record, and must not be written up as one. The record was
> fine; it was not read.** The claim was built from partial memory instead of a check — **the exact
> failure mode this session spent two days rooting out, committed about the review process itself.**
> The lead has corrected it to the owner in those terms.
>
> 📌 **The correction is also left VISIBLE in the Sprint 4 board row for `0236`, rather than quietly
> edited out. ⛔ Do not tidy it away later.**

| Task · finding | Severity | What the ledger's own attribution column says |
|---|---|---|
| **`0227` R3** (round 1) — the worker `ErrorUpdate` branch is unreachable; **site A is dead code**, which **invalidated the task's site-A acceptance claim** | **high** | ✅ **"Raised by Codex; missed by this reviewer."** A clean Codex-only catch, and the strongest single data point there is. |
| **`0227` R4** (round 2) — the generation guard keys on "latest join to mint a generation", not "who owns the live monitor", so it inverts under an `await` interleave | medium | ⚠️ **"Sharper path found by Codex; same root cause found independently by this reviewer."** Codex found the *sharper path*, **not** a defect Claude missed. |
| **`0236` R1** (round 1) — the sync snapshot is never re-primed on late-SDK recovery | medium | ❌ **"Raised by both reviewers."** **The Claude pass did NOT miss this.** |
| **`0236` R6** (round 2) — a self-contradictory doc comment | low | ✅ **"Raised by Codex."** Codex-only — but **comment-only, no behaviour**. |

**Two further facts that cut against the "three tasks" count:**

- **`0225` cannot be counted at all.** Its ledger records Codex failing three attempts
  (`Selected model is at capacity`, an unsupported-model error) and states plainly that the pass
  *"is not model-diverse and is treated here as a **second Claude pass, not as Codex**."* If `0225`
  was the intended third task, **it is evidence of a Codex outage, not of a Codex catch.**
- **The exchange runs both ways on `0236`.** `R9` is marked **"Reviewer-only finding"** — the Claude
  reviewer found something Codex did not, in the same round.

### What the evidence does support — stated at its real strength

**Codex-only catches: two** (`0227` R3, `0236` R6). **One of them is `high` and invalidated an
acceptance claim in code that had already passed a Claude review** — on its own that is a serious
argument for the ruling. Add one sharper-path contribution (`0227` R4, medium). Against that, one
Claude-only finding (`0236` R9, low), and one outage (`0225`).

⚠️ **This is a signal, not a measurement.** Two tasks, one day, one project, no controlled comparison,
and no count of the reviews where Codex added nothing. **Do not quote a hit rate from this file.**

⛔ **THE TWO COUNTER-FACTS ABOVE — `0225`'s outage and `0236`'s Claude-only `R9` — STAY IN THIS
RECORD.** Dropping them to make the case tidier would be **the same failure in the other direction**:
a one-sided argument built by selection instead of a check. **This file is evidence, not advocacy.**

---

## Practical consequence — what a reviewer must actually do

Nothing new. Follow the skills:

1. Run the Codex adversarial pass. Do not treat it as optional.
2. If Codex is unreachable, **say so loudly in the prescribed banner and call the review partial** —
   never a quiet skip, and **never a second Claude pass presented as a second opinion**.
3. **A Codex pass that ran but could not do part of its job is also a degradation, and gets said.**
   `0236` round 2 is the worked example: Codex ran and returned findings, but **could not execute
   jest** (read-only sandbox, `EPERM` on the haste-map write), so the green suite was the Claude
   reviewer's **single execution**. **The findings had two-reviewer coverage; the test execution did
   not.** That distinction is the honest unit of this rule.

---

## Related

- [`0236`](../../tasks/done/0236-client-kill-switch-for-citizenship-surfaces/review.md) — the ledger
  this record was written at the close of.
- [`0227`](../../tasks/done/0227-crashed-game-leaves-performancemonitor-running/review.md) — R3 and R4.
- [`0225`](../../tasks/done/0225-orphaned-performance-monitors-on-lobby-rejoin/review.md) — the outage.
- [`conventions/evidence-before-assertion.md`](../conventions/evidence-before-assertion.md) — the rule
  that required the correction above, and that the first draft of `0236`'s closing note broke.
