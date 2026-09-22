# Two silent board-record failures: the third `➡️ Moved` row nobody revisits, and `dashboard.sh`'s greedy move-target parse

## ID
0293

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**FILED 2026-09-22** by a spawned `fkit-producer` with **no owner channel of its own** (ADR-021), on an
**OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`** and relayed by
`fkit-lead`. Shown both findings below, the owner chose **"File it as a task"** over three alternatives
they were offered and declined: **fix it now**, **fold it into `0050`**, and **leave it**. The reason
they gave: *neither blocks anything today, but both are silent and both will recur.*
⚠️ **The owner ruled the ACTION (file it) and the BOARD.** They did **not** rule the rank, the owner
field, or **which fix is right** — the fix is deliberately left open below. ⛔ **Not producer
precedent.**

**Both findings are the same class of defect: a record or a parse that goes wrong with NO symptom.**
Neither raises an error, a warning, or a failed check. Each produces a **confident wrong answer**. That
shared property is why they are one brief and not two — split them and the second gets buried, because
the first is the one with a story attached.

🟢 **Honest framing, stated up front so nobody escalates this on read:** **nothing is blocked, and no
board is wrong today.** The two rows this was discovered through were corrected on 2026-09-22, and all
three boards currently verify clean — `dashboard.sh` on `ai-agents/sprints/backlog.md` reports **zero**
drift records. The owner **deliberately deferred** the fix. What earns this a task is **recurrence**,
not damage.

---

### FINDING 1 — a sprint→sprint move updates two records when there are three

**The move procedure updates two carriers of the same fact:**
1. the sprint plan's Status cell, and
2. the brief's own `## Sprint` field.

Those two then **agree**, so `dashboard.sh`'s drift rule 2 (which compares a `➡️ Moved` row's target to
the brief's `## Sprint`) stays silent when run against the **sprint** boards.

**But a task that was originally pulled from the Backlog board carries a THIRD record** — its
`➡️ Moved to …` row on `ai-agents/sprints/backlog.md`, which is deliberately never deleted so the
pointer to where the work went survives. **Nothing in the move procedure revisits it.** The backlog
board is consulted for the **first** move (backlog → sprint) and never again, so every **subsequent**
sprint→sprint move leaves that row naming a sprint the task is no longer in.

**It surfaced by luck, not by design.** The stale rows were found only because the checker was run
against `ai-agents/sprints/backlog.md` **specifically**. `/fkit-status` does not do that when reporting
an active sprint — it resolves one active sprint plan and reads that — so on a normal status run the
disagreement is invisible.

**Measured blast radius on 2026-09-22 — as measured, deliberately not stated larger:**

| Task moved to Sprint 5 that day | Row on `backlog.md`? | Went stale? |
|---|---|---|
| `0061-investigate-prod-telegram-feedback-delivery-failure` | **yes** | ✅ **yes** — fixed 2026-09-22 |
| `0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate` | **yes** | ✅ **yes** — fixed 2026-09-22 |
| `0285` | **no** | no |
| `0289` | **no** | no |
| [`0030-archive-s3-backed-citizen-gated`](../0030-archive-s3-backed-citizen-gated/brief.md) | **no** | no |

⚠️ **2 of 5, and the other 3 were spared for a reason that does not generalize:** they have **no row on
that board at all**, because they were **never pulled through it**. That was **verified by grep**
(`tasks/*/<id>-` across `backlog.md` → `0285` 0 rows, `0289` 0 rows, `0030` 0 rows), **not assumed.**
⛔ **Do not read "3 of 5 were fine" as a low base rate** — the correct reading is *every
Backlog-originated task is exposed, and only Backlog-originated tasks are.*

**The evidence, so it is not re-derived.** Before 2026-09-22 the row and the brief agreed (both
`Sprint 4`) and the checker emitted nothing. The briefs flipped to `Sprint 5` in commit `ee357f6`; the
rows did not follow. `dashboard.sh ai-agents/sprints/backlog.md` then reported, verbatim:

```
drift disagreement 0061 plan="➡️ Moved to [Sprint 4](plan-sprint-4.md) — priority High …" brief_sprint="Sprint 5" moved_target="Sprint 4"
drift disagreement 0238 plan="➡️ Moved to [Sprint 4](plan-sprint-4.md) — priority: unranked"  brief_sprint="Sprint 5" moved_target="Sprint 4"
```

⚠️ **This recurs on the next sprint→sprint move of any Backlog-originated task.** It is not a
one-off caused by that particular ruling.

---

### FINDING 2 — `dashboard.sh:938`'s move-target derivation is greedy, and a second marker silently wins

```sh
moved_target=$(printf '%s' "$st" | sed -nE "s/.*Moved to \[*(${SPRINT_ID_RE}|Backlog).*/\1/p" | head -1)
```

The leading `.*` is **greedy**, so it matches the **LAST** `Moved to [` in the Status cell. A row that
records its own move history in that column therefore reports the **wrong target, with no error**. The
trailing `| head -1` does not help: `$st` is a single line, so sed emits at most one result.

**Reproduced directly against that exact expression on 2026-09-22 — not inferred:**

| Status cell shape | Parses as |
|---|---|
| canonical marker **first**, struck history **second** | **`Sprint 4`** ⛔ **WRONG — the stale one wins** |
| struck history **first**, canonical marker **second** | `Sprint 5` ✅ right, **by accident of ordering** |

⚠️ **Note how counter-intuitive that is, because it is the trap:** writing the row the way a careful
author would — **canonical marker leading, history struck after it** — produces the **wrong** answer.
Getting it right requires burying the live marker at the end of the cell, which reads worse. **An
author cannot get both a readable row and a correct parse in that column.**

**Why nobody has hit it:** today every `➡️ Moved` Status cell happens to contain exactly one marker.
Nothing checks that, and nothing tells an author it matters.

⚠️ **THE EXISTING MITIGATION IS A WORKAROUND, NOT A FIX — record it as such.** While fixing finding 1
on 2026-09-22, the producer avoided this by putting the struck history in the **Task** column (which
the parser does not read) and asserting **exactly one** `Moved to [` per row before writing. That
choice **constrains how every future author may write a moved row**, it is recorded nowhere an author
would look, and **nothing enforces it.** It bought correctness for two rows; it did not remove the
trap.

---

## What to build

⚠️ **THE FIX IS DELIBERATELY NOT SETTLED. Do not treat any option below as chosen** — the owner ruled
that this be *filed*, explicitly not that it be *designed*. **Whoever picks this up decides, and should
put the choice to the owner before building.**

**Step 1 — decide where finding 1 belongs.** Genuinely open; the options are not equivalent in cost or
blast radius:

| Option | Shape | Tradeoff to weigh |
|---|---|---|
| **A. The move procedure checks all boards** | On any board move, also reconcile a `➡️ Moved` row on `backlog.md` if one exists | Fixes it at the source, but adds a step to a procedure that is already long and is followed by hand |
| **B. The checker spans boards** | `dashboard.sh` reconciles a task's records across every board, not one plan at a time | Catches it however it arose, including moves made by hand — but it is a structural change to the checker |
| **C. `/fkit-status` widens what it reads** | The status run also checks `backlog.md`, so a stale row surfaces on a normal run | Cheapest to reach; **detects rather than prevents**, and adds noise to every status report |

**Step 2 — decide finding 2 separately.** It is **not** fixed by any of A/B/C. Candidate shapes
include making the match non-greedy or anchoring it to the cell's leading marker; a guard that
**fails loudly** when a Status cell contains more than one `Moved to [`; or writing the
one-marker-per-cell constraint down where an author will meet it. ⛔ **Do not pick one here.**
⚠️ Whatever is chosen must keep the three behaviours `dashboard.sh:918-935` documents as load-bearing
and warns against regressing: **`-E` (BSD sed reads `\|` as a literal pipe)**, `\[*` being
zero-or-more so historic unlinked prose still parses, and `$SPRINT_ID_RE` remaining **the one**
grammar (ADR-040 §6) so `Sprint 4c` does not parse as `Sprint 4`. **Read those comments before
touching the line.**

**Step 3 — record the decision.** This is a convention change with a rationale worth keeping; an ADR
or a `knowledge-base/conventions/` note is likely warranted. That is a judgement for the implementer,
not a requirement of this brief.

🚨 **IT TOUCHES FKIT'S OWN SKILL FILES, AND NO RULING TODAY AUTHORIZED EDITING THEM.** Every option
above lands in `.claude/skills/` — `dashboard.sh`, the task-brief/mover procedures, or the status
skill. The 2026-09-22 ruling authorized **filing this task and nothing else**; the scope limit on the
session that filed it explicitly forbade editing any skill file. ⛔ **Get that authorization
explicitly before writing code for this.**

## Verification steps

1. **A reproduction exists before any fix** — a fixture (or a documented sequence) in which a
   Backlog-originated task is moved sprint→sprint and the stale `backlog.md` row is shown to be
   produced. ⚠️ **Do not skip this**: without it there is no way to tell a real fix from a
   coincidence, which is precisely how the defect survived.
2. **After the fix, that reproduction no longer produces a stale row** — or produces a **loud** report
   naming the task, if the chosen option is detection (C) rather than prevention (A/B). Say which
   outcome the chosen option is supposed to give, and check for that one.
3. **Finding 2 is addressed on its own terms and proved on its own case:** a Status cell containing
   **two** `Moved to [` markers either parses the intended target, or **fails loudly**. ⛔ It must not
   keep silently taking the last one.
4. `bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/backlog.md` reports **zero** `drift`
   and **zero** `nonconf` records, and the tally line carries **no** `drift on tasks …` suffix.
5. The same is true for each live sprint plan — the change fixed the backlog case **without**
   introducing drift on a board that was clean before. Check every board, not just the one that failed.
6. The three load-bearing behaviours named in step 2 above still hold — in particular, verify on
   **BSD sed** (this project's own machine), not only GNU sed. ⚠️ A `\|` regression here is invisible
   to a Linux run and breaks **every** live moved row on the consumer's Mac.
7. `npm test` passes. ⚠️ Budget ~22–25 s, not ~3 s — the shell harnesses are in the gate (`CLAUDE.md`).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related — [`0050-reconcile-sprint-field-values`](../0050-reconcile-sprint-field-values/brief.md),
  and ⛔ DELIBERATELY NOT MERGED INTO IT.** The owner was offered exactly that on 2026-09-22 and
  **declined**. Recorded here so nobody merges them later on a surface resemblance — both mention
  `## Sprint` and `dashboard.sh`, and that is where the similarity ends:
  - **`0050` is about a FIELD'S VALUE being unparseable** — `## Sprint` holding prose, a multi-line
    paragraph, or nothing, so `field_value()` reads the wrong thing out of a record that *is* being
    maintained.
  - **This task is about a WHOLE RECORD NOBODY REVISITS** (finding 1) and a **parse that silently
    prefers the wrong one of two valid-looking markers** (finding 2). The field values involved are
    already well-formed; the problem is that one carrier is never updated, and that the parser picks
    the wrong marker without complaining.

  ⇒ **Fixing `0050` completely would leave both findings here untouched, and vice versa.**
- **Related:** the rows that exposed finding 1 —
  [`0061-investigate-prod-telegram-feedback-delivery-failure`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md)
  and
  [`0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md).
  ⛔ **Both were already corrected on 2026-09-22 and need nothing.** They are cited as **evidence**,
  not as work.
- **Board rationale, producer's call — the OWNER RULED THE BOARD on this one:** the Backlog board, as
  they directed, same as `0292`. ⚠️ **Tradeoff accepted knowingly:** this board has a demonstrated
  hold-forever failure mode (`0061` sat here 2026-08-23 → 2026-09-17). Both findings are silent, so
  nothing will resurface them on its own — **the next time a stale row is noticed, it will be by
  luck again.**
- **Effort:** not estimated. It depends entirely on which option in step 1 is chosen, and they differ
  substantially. ⛔ Do not quote a figure from this brief.
