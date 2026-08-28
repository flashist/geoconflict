# Test-suite reliability: the random jest-worker `SIGSEGV`, and the integration suite that hangs without `--forceExit`

## ID
0197

## Sprint
Sprint 4

## Priority
**Medium — investigation-first.**

Nothing here is player-facing and nothing is broken in production, which keeps it off High. It ranks
above the routine hygiene backlog for one reason: **the segfault makes a green suite look red at
random, and that erodes the exact signal every review and every ship gate depends on.** A reviewer, a
ship-loop, or the next person cannot tell a flake from a regression — so the cheapest correct response
to a red run becomes "re-run it", which is also the response that hides a real regression. The cost is
paid on every future task, not this one.

✅ **Priority and sprint placement OWNER-CONFIRMED 2026-08-28** (ruled that day via `AskUserQuestion`
in the lead session, relayed to the producer through the lead). **Medium was the producer's rank and
the owner confirmed rather than disturbed it**, and promoted the task from the Backlog board into
**Sprint 4** — the same ruling and the same grounds as `0196`: the segfault degrades the test signal
**every** task's verification depends on, right now (it already made two runs look red during `0067`'s
work), and the cost is paid by every future task until it is fixed, not by this one. The earlier
"producer's rank, not an owner ruling" marker is **closed — no longer an open question.**

⚠️ **The Sprint 4 board row was appended at the end of the status table, and that encodes no rank.**
That board is unranked (every Priority cell reads `—`), so row order carries no meaning there. This was
an **append**, not a mid-board insertion above the `✅ Done` rows — the case fkit's **ADR-035**
(*a mid-board insertion is not the owner-ruled re-rank exception*) bars.

> 📎 **ADR-035 is cited by name, not linked, on purpose.** It is one of **fkit's own upstream ADRs**
> (the `adr-0XX` series, which lives in the fkit install share). This project's
> `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it
> would not resolve.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Three distinct reliability problems in the test toolchain, observed during `0067`'s build and review
(2026-08-28). Grouped into one task on the owner's ruling. They share a subject — the trustworthiness
of `npm test` and `tests/integration` — but **they are not assumed to share a root cause**, and the
investigation should not assume it either.

### Symptom 1 — recurring jest-worker `SIGSEGV` on unrelated, untouched suites

**Evidence updated 2026-08-28 — the count is now FIVE distinct suites in a single day, not two.** The
brief was filed on the first two occurrences (both from `0067`). Three more landed the same day during
`0068`'s build and review:

| # | Suite that segfaulted | Observed during | Date |
|---|---|---|---|
| 1 | `tests/Colors.test.ts` | `0067` process-review | 2026-08-28 |
| 2 | `tests/core/game/StartGold.test.ts` | `0068` build | 2026-08-28 |
| 3 | `tests/profile-server/NameChangeRoutes.test.ts` | `0068` build | 2026-08-28 |
| 4 | `tests/UnitGrid.test.ts` | `0068` process-review | 2026-08-28 |
| 5 | `tests/Attack.test.ts` | `0068` review phase 2 | 2026-08-28 |

**In every one of the five: the suite passed standalone, and every full re-run was green.** Independent
full runs also came back clean with no segfault at all (`0067`'s reviewer close-out pass at 103/103
suites / 1039/1039 tests; `0068`'s runs at 106/106 suites / 1072/1072 tests). So it is intermittent, it
moves between suites, and it is not attributable to any particular test.

**Why the larger sample changes the investigation, and narrows it.** Five distinct, unrelated suites —
a pure-JS color test, a core game-rule test, a profile-server route test, a spatial-index test, and an
attack test — sharing no module and no owner, all inside one day, **argues environmental rather than
file-specific.** The five hit different areas of the tree, including one suite (`NameChangeRoutes`)
whose deps differ from the others entirely. Phase 1 should therefore weight the environmental
hypotheses (worker count / memory pressure, Node + `jest-worker` version interaction, a native module
loaded process-wide) **above** any per-suite theory — but must still record what it rules out, because
"argues environmental" is an inference from a five-point sample, not a proven cause. The brief's
original instruction stands: characterise before theorising, and do not fix speculatively.

Note also that occurrence 3 is the same `NameChangeRoutes` flake listed as an accepted residual on
`0068` — it is recorded there as environmental and tracked here, not as a `0068` defect.

**Why this is worth a task rather than a shrug.** A random red run is not a neutral inconvenience: it
destroys the signal. Review verdicts, the sprint ship-loop's gates, and every future "is this change
safe" judgment all read `npm test`'s exit code. Once a red run might mean nothing, the honest reader
has no way to distinguish flake from regression without a manual re-run — and the habit that forms
("just re-run it") is exactly the habit that lets a genuine regression through. This was recorded in
`0067`'s review ledger as an **environmental observation, explicitly not a defect of that task**, with
the note that a third occurrence should be treated as a toolchain problem in its own right. This task
is that treatment.

### Symptom 2 — `tests/integration` hangs without `--forceExit`

`RUN_DB_TESTS=1 npx jest tests/integration --runInBand` does not exit after the suites finish — open
`pg` pool handles keep the process alive past a 10-minute timeout. **Pre-existing**, not introduced by
`0067`, and there is a working workaround (`--forceExit`). The problem is that the workaround is
**folklore**: it lives in one task's worklog, so the next person meets a 10-minute hang with no
indication that it is expected or how to get past it.

### Symptom 3 — the integration invocation is not reproducible from the records

Found by the reviewer during `0067`'s review. The integration suite requires a `TEST_DATABASE_URL`
environment variable. `0067`'s worklog does not record it, and a sibling task's worklog records a
**different** database configuration — which cost the reviewer **two failed attempts** before landing on
a working invocation. An independent verifier being unable to reproduce a task's own verification is a
review-integrity gap, not a convenience gap.

**Second reproducibility data point, added 2026-08-28 (from `0068`'s review).** A reviewer lost a run to
an **unset `TEST_DATABASE_URL`**. The failure did not look like a missing environment variable — it
looked like a real regression: **"5 suites / 70 tests failed in 0.43s"**, a fast, total, plausible-looking
red. Every suite the integration run was supposed to exercise reported failed, in under half a second.

This is the strongest single argument for the recommendation in Phase 2. A missing-env-var artifact that
is **indistinguishable at a glance from a genuine regression** is worse than a hang: a hang announces
itself, while this produces a confident wrong answer. Encoding the invocation in an npm script — rather
than leaving it to memory or to a worklog — removes the failure mode entirely, because the variable
cannot be silently omitted from a named command. A script that fails fast with an explicit "`RUN_DB_TESTS`
/ `TEST_DATABASE_URL` not set" message, instead of a bogus red, would also be an acceptable outcome; state
which was chosen.

🔒 **Recorded here as a variable name and a failure shape only.** No connection string, host, port, user
or password appears in this brief, and none may appear in the findings or documentation this task
produces.

🔒 **This task must land the correct invocation somewhere durable — and must name only the variables
and the file, never any value.** No connection string, no host, no port, no user, no password, in the
brief, in any worklog, in any report, or in this repo. Say *where* the invocation is documented and
*which* variables it needs; the values belong in a gitignored local env file that the documentation
points at by name.

## What to build

**Investigation-first: symptom 1 has no known cause and must not be "fixed" speculatively.** Symptoms 2
and 3 are documentation work and can proceed in parallel.

### Phase 1 — investigate the segfault (findings before any fix)

1. **Establish whether it reproduces at all.** Run the full suite repeatedly (a loop of N runs, N
   chosen to be meaningful, recording each outcome and which suite failed if any). Report the observed
   rate honestly, including if the answer is "did not reproduce in N runs" — that is a legitimate and
   useful finding, and it should be reported rather than converted into a guess.
2. **Characterise it before theorising.** Capture what is actually available: the jest-worker exit
   signal, whether it correlates with worker count / `--runInBand` / `--maxWorkers`, the Node and
   `jest-worker` versions, the SWC transform in use, and whether any native module is loaded by the
   affected suites (`canvas`, `pg`, or similar) — native code is where a `SIGSEGV` normally comes from,
   and pure-JS suites segfaulting is itself a clue.
3. **Test the obvious environmental hypotheses explicitly** — memory pressure / worker count, a native
   dependency, a Node version interaction — and **record which ones were ruled out and how**. A ruled-out
   hypothesis is a finding.
4. **Report findings and stop.** Do not implement a mitigation in the same pass. If the finding is "this
   is a local toolchain/environment condition and not a repository defect", that is a complete and
   acceptable outcome — say so plainly, and recommend what (if anything) should change.
5. If a mitigation *is* warranted, propose it with its cost. ⚠️ **Capping workers or forcing
   `--runInBand` trades a real, permanent slowdown on every run for an intermittent flake** — that is a
   product-cost decision, not an implementation detail. **Surface it; do not decide it alone.**

### Phase 2 — make the integration suite's invocation durable (can start immediately)

6. **Document the correct invocation in a durable, discoverable place** — not in a task worklog, which
   is where it was lost. Candidates, in the producer's order of preference:
   - a short section in `CLAUDE.md` (it is where the other "how do I run this" commands already live,
     and it is loaded by every agent session), and/or
   - a `tests/integration/README.md` next to the suites themselves, and/or
   - an `npm` script in `package.json` that encodes the flags, so the invocation is a name rather than
     a remembered command line.

   **Recommendation: the npm script plus a pointer to it from `CLAUDE.md`** — a script cannot be
   mis-transcribed the way a command line can. Confirm the placement before writing if you disagree.

7. **Record which environment variables the suite needs — by name only** (`RUN_DB_TESTS`,
   `TEST_DATABASE_URL`), what each is for, and which gitignored file the value belongs in. 🔒 **No
   values.** State explicitly that the two worklogs currently disagree, and that the documented form is
   now the single source of truth.

8. **Document the `--forceExit` requirement as expected behaviour, with its reason** — open `pg` pool
   handles after the suites finish — so the next person recognises the hang instead of debugging it.
   Note that it is pre-existing and predates `0067`.

9. **Decide, and record, whether the open handles should be fixed rather than masked.** Closing the
   pools in an `afterAll` is the real fix and would remove the need for `--forceExit`. It may be small
   or it may not. **Report the assessment; do not silently pick either branch.** If it is a small,
   contained change, propose it — with the note that a hang and a segfault are different failures and
   fixing one proves nothing about the other.

## Verification steps

1. **Findings exist and are honest about their limits** — the observed reproduction rate is stated,
   including a "did not reproduce" result if that is what happened, and every hypothesis tested is
   listed with its outcome. No speculative fix was applied to symptom 1 without a finding behind it.
2. **A person who has never run the integration suite can run it from the written documentation alone**,
   with no access to any task worklog. This is the actual bar — the reviewer's two failed attempts are
   the counter-example it must beat.
3. **The documented invocation was executed as written** and the suite passes: 5 suites / 70 tests at
   the time of writing (re-derive the current numbers; do not copy these).
4. **The `--forceExit` requirement is documented with its reason**, and the documentation says it is
   pre-existing.
5. 🔒 **Not one credential value appears anywhere** — not in the documentation, the worklog, the
   findings, a test fixture, or a log line. Variables and filenames only. `git diff` reviewed
   specifically for this before the task is handed on.
6. `npm test` still passes and the full-suite counts are unchanged, unless a change was deliberately
   made and explained.
7. If any worker/concurrency setting was changed, the **runtime cost** is measured and reported, not
   estimated.

## Notes

- **Depends on:** nothing. Independently shippable today; phase 2 does not wait on phase 1's findings.
- **Blocks:** nothing formally. It protects the verification signal every other task's review and ship
  gate relies on, which is its real argument for being pulled sooner rather than later.
- **Related:** `0067` (where all three symptoms were observed — its `review.md` records the segfault as
  an environmental observation and its `worklog.md` records the `--forceExit` behaviour; that folder is
  finished output — **reference it, do not edit it**), `0012` (the sibling task whose worklog records a
  different database configuration — symptom 3 is that disagreement), and **`0068`** (added 2026-08-28 —
  source of segfault occurrences 2–5 and of the unset-`TEST_DATABASE_URL` data point; its `review.md`
  and `worklog.md` in `ai-agents/tasks/done/0068-citizen-verified-icon/` are finished output —
  **reference them, do not edit them**).
- **The evidence grew after filing; the ranking did not change.** Priority, sprint and status are
  exactly as owner-confirmed on 2026-08-28. The 2026-08-28 additions above are evidence only — five
  occurrences instead of two, and a second reproducibility data point. Nothing was re-ranked, and the
  ADR-035 note above still applies unchanged (cited by name, not linked — it is an fkit upstream ADR).
- **The three symptoms are grouped, not assumed related.** Owner-ruled as one task. A single root cause
  would be a surprise; do not let the grouping steer the investigation toward inventing one.
- **A "did not reproduce" outcome closes phase 1 legitimately.** Say so plainly and recommend what
  should change (possibly nothing). Do not manufacture a fix to justify the task.
- **Do not "fix" the segfault by capping workers without surfacing the cost first** — a permanent
  slowdown on every run, traded for an intermittent flake, is the owner's call.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact.** This task is *about* a connection-string variable, so the risk of
  pasting one into documentation, a worklog or a findings file is unusually high. Name the variable,
  never a value — not truncated, not "starts with", not "the local one".
