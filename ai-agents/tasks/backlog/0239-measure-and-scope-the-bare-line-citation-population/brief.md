# Measure, then scope, the bare `:NNN` citation population across `ai-agents/`

## ID
0239

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**
Any qualifier goes in prose below the field, never in the field.

## Priority
Unscheduled

⚠️ **The label above is the producer's, and it is deliberately low-commitment.** ⛔ **The owner ruled
that this be FILED, and explicitly ruled that it NOT BE STARTED** (2026-09-10, given live in session
and relayed through the spawning session). **Filed is not scheduled, and scheduled is not started.**

🔒 **ADR-035 — this row was APPENDED at the bottom of
[`backlog.md`](../../../sprints/backlog.md).** No row moved, nothing was renumbered, no closed row was
touched. **Bottom-of-board means "added last", and nothing more** — it is not a ranking statement.

## Status
🔲 Backlog

## Owner
fkit-producer (measurement + scoping). ⚠️ **If a sweep is later authorised, ownership of the sweep is
a separate decision** — it is not implied by this brief.

## Context

> 📌 **Citation frame.** The counts below were measured on **2026-09-10** against the working tree at
> parent commit `589249c`, **plus that day's uncommitted citation sweep**. ⚠️ **They will drift.**
> **Re-measure before acting on any number in this brief** — including these. That instruction is not
> boilerplate; it is the entire subject of the task.

### What was measured, and what was NOT

A citation audit on 2026-09-10 measured the population of `file:line` references under `ai-agents/`,
**excluding `ai-agents/wiki-vault/`** (a separate write surface, `fkit-wiki`'s — ADR-005).

| Measurement | Count | Confidence |
|---|---|---|
| Full-path citations (`path/file.ts:123`) | **~3,450** across **241 files** | measured |
| **Bare `:NNN` refs** (`` `:123` `` with no filename) | **~2,186** | measured |
| Files carrying a **declared citation frame** | **12** | measured |
| Citations actually **verified by content match** that day | **~35** — on the order of **1%** | measured |
| **How many bare refs are actually WRONG** | 🔴 **UNKNOWN — NEVER MEASURED** | — |

🚨 **READ THE LAST ROW BEFORE THE OTHERS. `2,186` IS A HAZARD MEASUREMENT, NOT A DEFECT COUNT.**
⛔ **Nothing here says 2,186 citations are broken.** Nobody has sampled them. The error rate could be
2 % or 30 %, and **which of those it is completely changes what this task is worth** — that is
precisely why measuring comes first and everything else is conditional on the number.

### Why a bare ref is the dangerous form — and this is not hypothetical

[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md)
bans bare `:NNN`. **On 2026-09-10 the repository demonstrated exactly what the ban is for, and it cost
an owner ruling to unwind.**

A bare `` `:147-153` `` was written **inside `0182`'s brief**, meaning a paragraph in a *different*
document — `ai-agents/knowledge-base/profile-backup-restore-runbook.md`. Because it carried no
filename:

1. **Three separate readers** — a producer, the lead, and the owner — resolved it to `0182`'s own
   brief, where `:147-153` is the `## 4. Configure the deploy` header. **Real text, plausible
   context, completely unrelated.**
2. It was propagated onto the Sprint 4 board as `0182:147-153`, hardening the wrong attribution.
3. A sweep checked **every commit of `0182`'s brief**, found no supporting evidence in any of them,
   and **flagged the underlying claim UNSOURCED.** That conclusion was correct about `0182` — it
   stopped **one file too early**.
4. 🔴 **The owner ruled a RETRACTION of the claim** on that flag.
5. Before executing, the producer searched the wider knowledge-base, found the real source **at
   exactly those line numbers**, unchanged in every commit from `879b2f4` to `589249c`, **refused the
   ruling and escalated.**
6. **The owner withdrew the retraction.** Nothing was deleted.

⇒ 🚨 **VERIFIED, TRUE EVIDENCE WAS ONE STEP FROM BEING DELETED, and the only thing that stopped it was
one person searching outside the cited file before executing.** The full arc is recorded in
[`0218`'s brief](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md).

**The asymmetry that makes this the expensive failure mode:** a wrong *line number* sends you to the
wrong text, and you may notice. A wrong *file* makes you conclude **the text never existed** — which
reads as fabrication, and the natural remedy is deletion. **The two remedies are opposite: fix the
pointer, or delete the claim. Getting it backwards destroys evidence.**

### ⛔ This is not a carelessness problem, and a brief that framed it that way would mislead you

**Every citation defect found on 2026-09-10 was produced by someone careful, following the procedure,
and re-deriving correctly against what they read.** Specifically:

- The **producer running the citation sweep produced two stale citations of its own**, one by adding a
  citation-frame block to `0182`'s brief that **moved every line it had just finished correcting.**
- The **wiki librarian appeared to have done the same and blamed itself for it — and had not.** Its
  numbers (`0182:175`, `:207`) were **correct at `589249c`** and stopped holding only because the
  producer's uncommitted frame block moved the target underneath them. ✅ **That self-blame was
  relayed onward and is hereby corrected: it was not that agent's defect.**

⇒ **A NEW FAILURE SHAPE, now documented in the convention: CONCURRENT UNCOMMITTED EDITS.** A commit
hash is **not a sufficient frame** when several agents edit and cite the same file in one session.
Re-derive **last**, after edits stop.

⚠️ **Whoever picks this task up should assume the same of themselves.** The procedure had an ambiguity
in it; people did not fail it. **Design the work so it survives being done by a careful person having
an ordinary day** — that is what the sampling step below is really testing.

### The population should be finite, not endlessly growing

📌 **The convention bans NEW bare refs**, so this set should **stop growing** as documents are written
and revised under it. That matters for the decision:

- It makes this a **finite cleanup**, not a treadmill.
- ⇒ ✅ **"Do nothing, deliberately" is a defensible option the owner can take and revisit later** —
  not a failure, and not a decision that gets worse every week. **Say so plainly in the hand-off.**

⚠️ **That expectation is a claim about a convention's effect, and it has not been measured either.**
If the sample shows recently-written documents still adding bare refs, the convention is not holding
and **that is a more urgent finding than the backlog of old ones.**

## What to build

🔴 **STEP 1 IS A MEASUREMENT AND IT GATES EVERYTHING ELSE. Do not skip to fixing.**

1. 🔴 **Sample and measure the real error rate — the whole point of the task.**
   - Re-derive the population counts first (they will have drifted from this brief's numbers).
   - Take a **random sample of 30–50 bare `:NNN` refs**, drawn across the whole population — not
     clustered in one document, and not chosen because they look suspicious. **A biased sample is
     worse than no sample**, because it produces a confident wrong number.
   - For each: resolve which file it means, open it, and **content-match against what the citing
     sentence claims is there.** Record one of: ✅ correct · ⚠️ right file, wrong lines ·
     🔴 **wrong file** · ❓ unresolvable (nobody can tell what it meant).
   - 🚨 **Report the `wrong file` and `unresolvable` counts SEPARATELY and FIRST.** Those are the
     class that deleted-evidence risk comes from; a wrong line number is a lesser defect and mixing
     them into one percentage hides the thing that matters.
   - Also record **when each sampled ref was written** — that is what tests whether the convention is
     holding for new writing.

2. **Put the measured number to the owner with a recommendation, and stop there.**
   - ⛔ **Do not begin a sweep on your own judgement, whatever the number is.** Step 1's output is a
     decision aid; the decision is the owner's.
   - Frame it as what it is: *at X % error, of which Y % are wrong-file, a sweep costs roughly Z and
     buys this much.* Give **one** recommendation with its main tradeoff.
   - ✅ **"Do nothing" must be presented as a live option**, with the finite-population reasoning
     above — not listed to be dismissed.

3. **If — and only if — the owner authorises remediation, scope it as its own decision.** Likely
   shapes, recorded so they need not be re-derived, **none of them chosen here**:
   - Fix only the **wrong-file and unresolvable** refs, leaving wrong-line-number ones.
   - Fix bare refs **only in documents someone is actively working from** (live briefs, conventions,
     runbooks) and leave closed-task records alone.
   - Add citation **frames** to high-traffic documents without touching individual refs — cheaper,
     and it makes future staleness *detectable* rather than silent.
   - ⛔ **A repo-wide mechanical rewrite is the one shape to be most suspicious of** — it is exactly
     the "careful person re-derives the number they were given" failure the convention documents,
     executed at scale.

4. **Do not touch `ai-agents/wiki-vault/`.** It is `fkit-wiki`'s exclusive write surface (ADR-005).
   If the sample suggests the vault has the same problem, **report it and route it to `fkit-wiki`** —
   do not write there, and do not count vault refs in this task's population.

## Verification steps

1. The sample is **genuinely random** and its selection method is written down and reproducible.
   **State the sample size and how the refs were drawn.**
2. Every sampled ref has a recorded verdict from the five categories, and **wrong-file** and
   **unresolvable** are reported as their own counts, stated **before** any aggregate percentage.
3. The re-derived population counts are stated alongside this brief's 2026-09-10 numbers, so the
   drift between them is visible.
4. The age distribution of sampled refs is reported, and it explicitly answers: **is the convention
   holding for newly written documents?**
5. ⛔ **No citation was "fixed" during step 1.** Measuring and repairing in the same pass destroys the
   measurement. If something egregious is found, **report it; do not fix it.**
6. The hand-off names **"do nothing"** as an option with its reasoning, not as a strawman.
7. 🔒 No secrets — this all goes to git.

## Notes

- **Depends on:** nothing. Runnable whenever the owner schedules it.
- **Blocks:** nothing. ⚠️ **It does not gate any Sprint 4 work**, which is part of why it is on the
  Backlog board rather than a sprint.
- **Board choice:** filed on [`backlog.md`](../../../sprints/backlog.md) because it is **unscheduled
  and unsized**, and because it gates nothing. Filing it into a sprint would assert a commitment the
  owner did not make — the owner ruled *file it, do not start it.*
- **Related:**
  [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md)
  — the convention this task exists to make actionable. **Read its recurrence section first**; it
  carries the three confirmed 2026-09-10 instances and the two failure shapes.
- **Related:** [`0004`](../0004-reconcile-legacy-status-markers-in-sprint-plans/brief.md) — the
  record-hygiene pile. **Deliberately NOT folded into it.** `0004` is about status vocabulary and
  board↔brief reconciliation; this is a citation-integrity measurement with a different owner, a
  different first step, and its own gate. ⚠️ **Do not merge them without deciding that explicitly.**
- ⛔ **Do not invoke the mover skills.** Producer-only since ADR-033 — route any close to the producer.
