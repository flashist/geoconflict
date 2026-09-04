# Task-attribute cross-reference sweep

> **When a ruling changes a task attribute, sweep the *other* files that describe it. The task's own
> brief section is the record — [and only an attribute that has such a
> section](#which-attributes--the-bound) is in scope. Every other file holds a hand-written copy, and
> copies do not update themselves.**
>
> **Signed off by the owner, live in session, 2026-09-04** — first as the narrower board-position rule,
> then **widened to any ruled task attribute, and the file renamed to match, later the same day.**
> Standing law, in full: no part of this document is pending.
>
> Their reasoning, at both sign-offs: **justified by severity, not frequency.** One instance that day
> was one action away from permanently destroying a measurement, because it contradicted a live
> ship-ordering ruling. And **rank is the same mechanism as board position** — proved four times over,
> *inside the corrections that were enforcing the narrow rule*.
>
> ⚠️ **Sign-off makes this law; it does not make it checked.** See
> [Where this is enforced](#where-this-is-enforced) — nothing enforces it automatically. **The widening
> bought no enforcement either.**
>
> 🔴 **This document is at its size ceiling.** Seven steps is the most a sweep procedure can carry and
> still be run. **If an eighth lesson arrives, replace a step — do not append one.** Growing this file
> is the drift it exists to prevent.

## The rule

**Updating the task's own brief is half the job.** The other half is every *other* file that states, in
prose, what that attribute is — a sibling task's brief, a sprint plan row, the backlog board. Those
statements are copies, not links, and a ruling that changes the attribute invalidates all of them.

**Board position was the first instance, not the mechanism.** Promotion into a sprint, a move between
boards, a close, and a **re-rank** all trigger this sweep. ⚠️ **The triggers are not equally observed,
and this doc will not pretend otherwise:** promotion is directly evidenced by the thirteen corrections
below, and **re-rank** by the nine stale rank claims found the same day; the **close** case rests on
`0206`'s close specifically, which left stale pointers of its own; a plain **move between boards** is
reasoning from the shared mechanism, not an observation.

### Which attributes — the bound

**The general shape: an attribute with an authoritative home in the task's own brief, copied as prose
into other files.** `## Sprint`, `## Status`, `## Priority`, `## Owner` and `## Depends on` are all
such homes. A ruling that changes any of them invalidates every prose copy of it.

⛔ **The bound — this is what keeps the rule followable.** An attribute is in scope **only if you can
name the single section of a task brief that settles it.** If you cannot, it is out of scope. This is
deliberately **not** *"any ruling invalidates any copied pointer"*: that would pull in architecture
claims, code comments and design docs, and nobody would run it.

## Why this is a rule and not advice

Observed 2026-09-04. Tasks `0208` and `0211` were each promoted into Sprint 4 by owner ruling. Both
briefs' own `## Sprint` sections were updated correctly and immediately. **Thirteen cross-references
in five other files were not** — `ai-agents/sprints/backlog.md`, `ai-agents/sprints/plan-sprint-4.md`,
and the briefs of `0206`, `0208`, `0209`.

Three were stale **inside their own commit** — one of them three lines above the row that recorded the
promotion. Two rows contradicted themselves **within a single table cell**: the Status column read
`➡️ Moved to Sprint 4` while the prose beside it said "unscheduled".

**The worst instance did not merely lag a ruling — it inverted one.** `0208`'s brief read *"Both tasks
are unscheduled, so no sequencing is actually committed today"*, when a ruling that same day had
committed exactly one: `0211` must not ship until `0208` is deployed and collecting data. A reader
acting on that sentence would have shipped `0211` first and **permanently destroyed `0208`'s pre-fix
denominator** — the irreversible outcome the ruling existed to prevent.

⇒ **The failure mode is a stale copy contradicting a live decision, in the voice of the record.**

### Then the sweep repeated the mistake on a different attribute

In **four of those thirteen corrections**, the producer wrote a stale **rank** — asserting `0208` was
`Medium` when a ruling hours earlier had raised it to `High`. It verified every scheduling fact and
**inherited the rank from the prose it was correcting**, never opening `0208`'s `## Priority`. Five
further pre-existing stale rank claims were then found, one of them the Sprint 4 board row itself, and
`0208`'s own `## Priority` was internally self-contradictory.

Two things follow, and together they are why the rule covers attributes rather than board position
alone:

- **A sweep scoped to the word that triggered it cannot find what it is not looking for.** Grepping
  `unscheduled` / `no sprint` could never surface a stale rank — though the same day's rulings changed
  **both**.
- **A correction is itself a cross-reference.** Nobody swept the corrections.

## What to do

1. **Grep the task ID across `ai-agents/sprints/` and `ai-agents/tasks/`, then make a second pass for
   pointers that describe the task without naming its ID.** Board-position terms:  `unscheduled`,
   `not scheduled`, `no sprint`, `nobody is building it`, `on this board`, `Backlog —`,
   `don't schedule`. The task's own brief is where you finish, not where you stop.
2. **Sweep every attribute the ruling touched — each as its own pass, and within
   [the bound](#which-attributes--the-bound) — and assume the ruling had siblings.** Rulings arrive in
   batches: on 2026-09-04 one ruling scheduled `0208` and a **second** raised its rank, so a
   cross-reference reading *"the ruling scheduled this task; it did not rank it"* was true of the first
   ruling and false of the day. Rank is its own vocabulary — `rank`, `priority`, `Medium`, `High`,
   `Low`, `the producer's`, `owner ruling` — and a scheduling grep will never return it.
3. **Correct by striking, not deleting** — as the boards already do in practice (this is practice, not
   separately codified). Keep the original visible and date the correction. 🔴 **But mark
   wrong-when-written differently from spent-not-wrong.** A pointer a later ruling overtook is **spent,
   not wrong** — it was true when typed. A pointer that was **false on the day it was written** is an
   **error**, and writing *"spent, not wrong"* over it launders a mistake into the record. The four
   rank claims above were errors, not spent pointers. ⚠️ **This clause corrects an earlier version of
   this very step**, which read *"a stale pointer is **usually** spent, not wrong"* and left the
   wrong-when-written case hiding inside the word *usually*.
4. **Strike the stale half, not the whole sentence.** These sentences usually assert two things at once
   (*"unscheduled, and the rank is the producer's"*), and often only one went stale. ⛔ Striking the
   whole sentence destroys a true statement alongside the false one.
5. **Prefer a pointer to a copy; if you must copy a value, carry its whole provenance.** The cheapest
   correct cross-reference is *"see `0208`'s `## Priority` — authoritative"*, because **every copied
   value is a future stale claim.** Where provenance is split, half of it is false: `0208`'s rank was
   **raised by owner ruling, to a value the producer set**, so *"the producer's rank"* and *"the owner
   ranked it High"* are both wrong. ⛔ **Half a provenance is a wrong provenance.**
6. **Leave verbatim ruling quotes alone.** Where a cross-reference quotes an owner ruling as a record of
   what was said, mark it historical and superseded with a dated pointer. ⛔ **Do not restate,
   reinterpret, or strike the ruling itself.**
7. 🔴 **A correction is itself a cross-reference — sweep your own edits before reporting.** ⛔ **Never
   restate an attribute you did not open the authoritative section for**
   ([`evidence-before-assertion.md`](evidence-before-assertion.md)). The 2026-09-04 pass fixed thirteen
   stale scheduling pointers and wrote four stale rank claims **inside those same edits**, inherited
   from the prose it was correcting.

## What this rule is NOT

- ⛔ **Not a licence to change status, rank, scope, or board position** while sweeping. Correcting a
  stale *description* of a decision is not re-making the decision, and the authority to set a status is
  fixed by [`task-status-vocabulary.md`](task-status-vocabulary.md), not by this sweep.
- ⛔ **Not satisfied by trusting a lint.** The 2026-09-04 wiki sync surfaced three of the thirteen — and
  did so only as explicit *"outside the vault — reported, NOT fixed"* observations. It lints
  `ai-agents/wiki-vault/`, where the state was already correct. **A vault lint is not authoritative for
  `ai-agents/tasks/` or `ai-agents/sprints/`, and finding three is not evidence there were three.**
- ⛔ **Not satisfied by a caller's count.** That sweep was handed over as "three", then "eight". The real
  number was thirteen, found only by grepping and reading every hit. **Verify the location list; never
  inherit it.**

## Where this is enforced

⚠️ **Nowhere automatically — state this honestly rather than implying a check exists.**

- **The producer's board-move step**, by procedure: whoever promotes, moves, closes, or re-ranks a task
  runs the grep in step 1 before considering the move finished.
- ⚠️ **The 2026-09-04 additions changed nothing here.** Steps 2, 3's error/spent split, 5 and 7 are
  procedure, not checks. More rules did not buy more coverage.
- **Not** by `/fkit-wiki-lint` or `/fkit-wiki-sync` — they lint `ai-agents/wiki-vault/` and have no
  authority over the boards. Anything they report outside the vault is a courtesy, never coverage.
- **Not** by `dashboard.sh` — it parses Status and Priority cells, not the prose around them.

A grep-based check over `ai-agents/sprints/` and `ai-agents/tasks/` is the obvious way to make this
mechanical. ⚠️ **It was weighed at sign-off and deliberately not taken — owner ruling, 2026-09-04. No
enforcement task is filed.** This convention is procedural only, by choice rather than by oversight.
Do not read the gap as an unnoticed one, and do not file the task without asking.

## Related

- [`task-status-vocabulary.md`](task-status-vocabulary.md) — defines the statuses and who may set them;
  its rule *"the brief and the sprint plan must agree"* covers a task's own two records. This
  convention covers the copies **other** files hold.
- [`priority-is-rank-not-identity.md`](priority-is-rank-not-identity.md) — the same live-pointer vs
  frozen-history distinction, applied to rank notation. **Read it before sweeping rank:** it settles
  which rank forms are live cross-references and which are frozen history that must not be rewritten.
- [`evidence-before-assertion.md`](evidence-before-assertion.md) — why an inherited count is not a check.
