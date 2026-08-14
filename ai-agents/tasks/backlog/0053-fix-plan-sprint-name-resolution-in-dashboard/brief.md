# Track the upstream `PLAN_SPRINT` resolution defect in fkit's `dashboard.sh` until a release fixes it

## ID
0053

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**This is a tracking task, not an implementation task. Nobody here writes the fix.**

`dashboard.sh`'s `PLAN_SPRINT` resolves empty for every sprint plan in this repo, which makes
`/fkit-status`'s **drift rule 1** inert repo-wide. The defect is real and was verified by running the
script on 2026-08-10.

### The owner's ruling — 2026-08-10

The defect is in **fkit toolkit code, not Geoconflict code**. `.gitignore:34` ignores
`.claude/skills/fkit-*/`, so the file is untracked here; it is byte-identical to the copy in the
separate fkit repo and would be overwritten by the next fkit install or update.

Three options were put to the owner. The owner chose **none of them** and ruled a fourth:

> *"Generate an .md file that I can hand to the fkit-owner and they will take care of it. You can
> brief a task to the backlog here just to remember that the decision was made and eventually it
> will be fixed by a new version of fkit."*

So:

- **The fix arrives in a future fkit release.** It is not ours to make, in this repo or in the fkit
  repo.
- **The handoff document is the deliverable, and it is already written:**
  `ai-agents/knowledge-base/reports/fkit-dashboard-plan-sprint-resolution-defect-2026-08-10.md`.
  It is self-contained and written to be forwarded to the fkit maintainer as-is.
- **This brief exists so the decision is not rediscovered from scratch.** Without it, the next person
  who notices the empty `PLAN_SPRINT` re-investigates a closed question.

### The defect, in short — full detail is in the handoff document

- `PLAN_SPRINT` resolution (`dashboard.sh:83–108`) has two general rungs and both miss here: the H1
  regex wants `^# Sprint <N>` but our H1s read `# Geoconflict — Sprint 4 — …`; the filename fallback
  wants `^sprint-<N>$` but our files are named `plan-sprint-4.md`. Only the `backlog.md` special case
  (`:93–108`) resolves.
- Rule 1 (`dashboard.sh:802`) is a **skip**, so an empty `PLAN_SPRINT` *disables* the skip: sprint
  boards **over**-report (phantom drift), and backlog-shaped boards **under**-report via the
  `:772` scheduled-but-parked check. ⚠️ An earlier internal write-up called this "silent
  under-reporting" — that framing was wrong; do not reintroduce it.
- It is **not** silent: `drift unresolved-plan-sprint` fires at `:905` and sets plan-level drift at
  `:917`.

### ⚠️ What we cannot observe today, and why that is fine

Fixing `PLAN_SPRINT` alone would change **exactly one line of live output** on this repo right now:

- Five `plan-*.md` files `die` at `dashboard.sh:206` (`no '## Status' section`) before any drift logic
  runs — that is **our** data defect, and `0004` owns it.
- `sprint-backlog.md` reaches the drift block, but all 23 rows read `⬜ No sprint`, which parses as
  `key=unknown`, and the whole disagreement block is guarded by `[ "$key" != "unknown" ]` (`:761`).
- `backlog.md` already resolves correctly and is unaffected.

So the observable delta is: `sprint-backlog.md` stops emitting `drift unresolved-plan-sprint`. This
matters for the check below — a bare "run the dashboard, looks fine" is not evidence of anything.

## What to build

Nothing is built. This task is **watch, then verify**.

1. **Get the handoff document to the fkit maintainer.** The owner is the channel. The document is
   written and needs no further work; if it is revised before sending, revise the file in place so
   the repo keeps the version that was actually sent.

2. **Note the fkit version in use when the handoff is sent** — `0.2.1` at time of writing. It is the
   baseline for "did the fix land yet".

3. **On each fkit update, check whether the fix has landed.** Cheapest check, no code reading
   required:

   ```
   bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/sprint-backlog.md
   ```

   If `drift unresolved-plan-sprint` is **gone** from the facts, resolution now works on a
   `plan-`-prefixed / prose-H1 plan and the fix has landed. If the fact is still there, it has not.
   (If `0001` has retired `sprint-backlog.md` by then, use any `plan-sprint-*.md` that `0004` has made
   readable, and look for the same fact.)

4. **When it lands, verify rule 1 actually fires** — resolution working is necessary, not sufficient.
   See Verification steps. Then close this task.

5. **If a release lands with a *wrong* identity instead of no identity, reopen loudly.** The specific
   hazard, spelled out in §6 of the handoff document: a numeric-only widened pattern resolves
   `plan-sprint-4c.md` to `Sprint 4`. That is worse than the current state, because rule 1 goes live
   against the wrong sprint name and then silently skips the status cross-check on the whole board.
   **A wrong identity is a regression, not a partial fix.**

6. **Do not patch `.claude/skills/fkit-status/dashboard.sh` locally.** It is gitignored, `/fkit-heal`
   would report it as an owner-edited divergence from the install manifest, and the next update
   discards it. If waiting ever becomes intolerable, that is a new decision for the owner — not
   something to do quietly under this task.

## Verification steps

This task closes when the fix has landed **and** been confirmed here — not when the handoff is sent.

1. **The handoff document exists and is what was sent.**
   `ai-agents/knowledge-base/reports/fkit-dashboard-plan-sprint-resolution-defect-2026-08-10.md`.
2. **A newer fkit is installed** than the version recorded in What-to-build step 2.
3. **`drift unresolved-plan-sprint` is gone** from the board named in step 3 above.
4. **The letter-suffix case is correct, not merely quiet.** Run the dashboard on
   `ai-agents/sprints/plan-sprint-4c.md` (readable only after `0004`). It must resolve to
   `Sprint 4c`, or report `unresolved-plan-sprint`. If it resolves to `Sprint 4`, **that is a
   regression — record it and reopen**, do not close.
5. **Rule 1 is demonstrated firing, not just reachable.** On a plan whose identity now resolves, a
   brief whose `## Sprint` names a *different* sprint produces **no** `drift disagreement`, while an
   otherwise identical brief naming the *same* sprint, with a deliberate status mismatch, **does**.
   Both halves are needed: the first proves the skip works, the second proves the fix did not turn
   rule 1 into a blanket suppressor.
6. **A genuinely unidentifiable plan still reports `unresolved-plan-sprint`.** The fix must not
   convert a loud failure into a quiet one.
7. **Nothing under `.claude/skills/fkit-*/` was hand-edited.** `/fkit-heal` reports no owner-edited
   divergence for `fkit-status/dashboard.sh`.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing

- **Producer-owned** — changed from `fkit-coder` when this became a tracking task. There is no source
  to write. What remains is a decision record, an owner-channel handoff, and a periodic
  read-only check — producer work. A coder seat would have nothing to do until a release lands, and
  even then the verification is running a script and reading facts.

- **Sequencing with `0004`.** Verification steps 4 and 5 need at least one readable `plan-sprint-*.md`,
  and today all five `die` at `:206`. `0004` (widened today to cover both the `## Sprint N Status`
  rename **and** the two plans with no status table at all) is what makes them readable. Not a hard
  dependency — step 3's check works on `sprint-backlog.md` without `0004` — but full verification
  waits for it. If the fkit fix lands first, do step 3, and hold steps 4–5 until `0004` ships.

- **Relationship to `0050`.** `0050` reconciles the **brief-side** `## Sprint` values; this tracks the
  **reader-side** resolution. Neither subsumes the other. `0050`'s step 6 parked the
  question of whether the parse bug belonged in `0050` or its own brief; the owner ruled **its own
  brief** on 2026-08-10, and this is it. That parked item is answered and `0050` now cross-references
  this task.

- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- No secrets: the handoff document was written to be forwarded outside this project and contains
  none.
