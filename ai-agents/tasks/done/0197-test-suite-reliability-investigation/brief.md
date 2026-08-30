# Test-suite reliability investigation: the random jest-worker `SIGSEGV`, and the integration suite's real exit behaviour

> 🔧 **CORRECTED 2026-08-29 by the producer, from this task's own build findings.** Three factual
> claims in this brief were wrong. They are corrected **in place** below, with what they previously
> said **preserved** rather than overwritten:
>
> 1. **The segfault count is FOUR distinct suites on 2026-08-28, not five** (§ Symptom 1).
> 2. **The segfault's cause is now KNOWN — an upstream V8 garbage-collector bug — and this brief's
>    leading hypotheses (jsdom/`canvas`, worker memory pressure) were REFUTED BY EXPERIMENT, not
>    merely left unconfirmed** (§ Symptom 1).
> 3. **The "integration suite hangs without `--forceExit`" symptom does not reproduce at all** — both
>    the stated cause (open `pg` pool handles) and the symptom itself were folklore (§ Symptom 2).
>
> **Authority for all three:**
> `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md`.
>
> ⚠️ **Status, priority and sprint are UNCHANGED.** This is a factual correction to the brief only,
> made while the task is mid-build.
>
> 📛 **THE TITLE AND FOLDER NAME WERE KNOWN-WRONG, AND WERE RENAMED AT CLOSE — 2026-08-30.** Both used
> to say *"the integration suite that hangs without `--forceExit`"*. **That suite does not hang** (see
> § Symptom 2). Preserved here so the change is auditable:
>
> | | Before | After |
> |---|---|---|
> | Title | *Test-suite reliability: the random jest-worker `SIGSEGV`, and the integration suite that hangs without `--forceExit`* | *Test-suite reliability investigation: the random jest-worker `SIGSEGV`, and the integration suite's real exit behaviour* |
> | Folder | `0197-test-suite-reliability-segfault-and-integration-hang` | `0197-test-suite-reliability-investigation` |
>
> ✅ **RENAME OWNER-RULED 2026-08-29** via `AskUserQuestion` in the `fkit lead` session: **the rename
> happens AFTER this task closes, not before** — a coder held this folder mid-build and a rename would
> have broken its in-flight paths. **Carried out on 2026-08-30 by the producer as part of the close**,
> exactly as ruled. The hang clause is gone from both; *"investigation"* and *"real exit behaviour"*
> replace it because that is what the task actually delivered — a root cause and a disproof, not a fix.
>
> ⚠️ **Two stale path references were initially NOT repaired**, because they live in this task's
> finished output, which the close was barred from editing: this folder's own `review.md:3` and
> `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md:4` both still
> named the old `…-segfault-and-integration-hang` folder. Both are plain-text paths, not markdown
> links. Reported at close rather than silently fixed.
>
> ✅ **RESOLVED — owner ruling R7, 2026-08-30** (`AskUserQuestion`, `fkit lead` session), taking the
> producer's recommendation: **both were repaired as pointer-only fixes.** The ground accepted was the
> mover skill's own rule — **a historical record's *links* are live; its *claims* are frozen.** The
> earlier "do not touch finished output" instruction was lifted **for these two path strings only**.
>
> | File | Before | After |
> |---|---|---|
> | `review.md:3` | `ai-agents/tasks/backlog/0197-test-suite-reliability-segfault-and-integration-hang/brief.md` | `ai-agents/tasks/done/0197-test-suite-reliability-investigation/brief.md` |
> | `…-findings.md:4` | `ai-agents/tasks/backlog/0197-test-suite-reliability-segfault-and-integration-hang/` | `ai-agents/tasks/done/0197-test-suite-reliability-investigation/` |
>
> **One occurrence per file; the path string and nothing else changed in either.** No claim, figure,
> verdict, finding, narrative or formatting was touched. ⚠️ **Note what was deliberately left alone:**
> the findings report's own H1 still reads *"jest-worker `SIGSEGV` + integration-suite hang"*. That is a
> **claim, not a path** — frozen by the same rule that permitted the two repairs, and it is corrected
> in this brief and in the report's body rather than in its title.

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
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Close-out — 2026-08-30

> ⚠️ **`(agent-closed — not owner-verified)`.** Closed by a **spawned** producer with no channel to the
> owner (ADR-033 §5). The full loop did run — plan → owner approval → build → independent stateful
> review → process-review → reviewer round-2 verification, ending **✅ Ready to merge** with the ledger
> at this folder's `review.md` marked `Status: closed-out`. What the marker records is narrower and
> exact: **no human inspected the result before the file moved.**

**⚠️ Read this before the body below. What this task found is not what it was filed expecting.**

- **The `SIGSEGV` is an upstream V8 garbage-collector bug, and is NOT repository-fixable.**
  `ClearStaleLeftTrimmedPointerVisitor` dereferencing `0x…06` during mark-compact — **five
  byte-identical stacks, no native-addon frame on any of them.** Rate ~**1 in 170** runs. No code in
  this repository causes it and no change here can remove it.
- **The brief's own leading hypotheses were REFUTED BY EXPERIMENT, not left unconfirmed.**
  jsdom/`canvas` poisoning a reused worker: the live reproduction came from the sweep that *excludes
  every jsdom suite*, in a worker with **no `canvas.node` loaded** — the exact inverse of the
  prediction. Worker memory pressure: ruled out (macOS exhaustion presents as jetsam/`SIGKILL`, not
  `SIGSEGV`). `jest-worker` mismatch and `@swc/core` also ruled out.
- **The integration-suite hang DOES NOT REPRODUCE AT ALL — warm or cold.** The symptom in this task's
  original title never existed; jest prints its force-exit banner unconditionally whenever the flag is
  set, and that banner was the whole of the evidence. **`--forceExit` was therefore REMOVED, not
  documented**, and `CLAUDE.md` now states plainly that a future hang is a **real regression**.
- **No segfault mitigation was bought — owner ruling A2.** Capping workers would trade a permanent
  slowdown on every run for an intermittent flake, and the owner declined. **The accepted cost, on the
  record: a red run stays ambiguous.** A reviewer or ship gate still cannot tell this flake from a
  regression at a glance; the correct response remains re-run *and record both results*, never a silent
  retry.
- **Verification at close:** `npm test` **107 suites / 1075 tests, exit 0**; `npm run test:integration`
  **5 suites / 70 tests, exit 0** with **no `Force exiting Jest` line**; the `TEST_DATABASE_URL` guard
  rejects unset / empty / whitespace-only / tab+newline; `tsc --noEmit` and `npm run lint` both **0**;
  credential scan clean.
- **Six review findings, all verdict CORRECT, none disputed by the coder.** Four fixed; **R3 and R4
  accepted as residuals by owner ruling** — both err *conservatively*, making this task's own evidence
  look **weaker** rather than stronger, and that ground is recorded in the ledger. Round 2 verified
  **every fix independently, none on assertion**.
- **Findings of record:**
  `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md`.
- **Split out and still open:** the `supertest` profile-server flake is **`0200`** (owner amendment
  **A4**) — in *our own* test code, at roughly **ten times** the segfault's rate, and therefore the
  actionable one of the two. This close fed `0200` its first directly observed instance.

## Context

Three distinct reliability problems in the test toolchain, observed during `0067`'s build and review
(2026-08-28). Grouped into one task on the owner's ruling. They share a subject — the trustworthiness
of `npm test` and `tests/integration` — but **they are not assumed to share a root cause**, and the
investigation should not assume it either.

### Symptom 1 — recurring jest-worker `SIGSEGV` on unrelated, untouched suites

🔧 **CORRECTED 2026-08-29 — the count is FOUR, not five.**

**What this section previously claimed** (preserved verbatim): *"Evidence updated 2026-08-28 — the
count is now FIVE distinct suites in a single day, not two. The brief was filed on the first two
occurrences (both from `0067`). Three more landed the same day during `0068`'s build and review"*,
listing `tests/profile-server/NameChangeRoutes.test.ts` as occurrence 3.

**Why that was wrong.** `NameChangeRoutes.test.ts` never segfaulted. `0068`'s own worklog
(`ai-agents/tasks/done/0068-citizen-verified-icon/worklog.md:189`) records it as an **assertion
failure** — *"failed one test … (\"409s a name_mismatch…\" got 404)"* — with no `SIGSEGV` anywhere in
that record. `0068`'s `review.md:153` then rolled that assertion failure into its five-suite segfault
list, and this brief inherited the error from there.

**Two independent confirmations of the correction.** (a) macOS keeps exactly **four** `node-*.ips`
crash reports from 2026-08-28 — a jest-worker segfault always writes one, so the count is exact, not
inferred. (b) This task's own build reproduced that same `got 404` shape **9 times in 170 runs**,
confirming it is a distinct, reproducible, **non-segfault** failure mode — now briefed separately as
**`0200`**.

| # | Suite that segfaulted | Observed during | Date |
|---|---|---|---|
| 1 | `tests/Colors.test.ts` | `0067` process-review | 2026-08-28 |
| 2 | `tests/core/game/StartGold.test.ts` | `0068` build | 2026-08-28 |
| 3 | `tests/UnitGrid.test.ts` | `0068` process-review | 2026-08-28 |
| 4 | `tests/Attack.test.ts` | `0068` review phase 2 | 2026-08-28 |
| ~~—~~ | ~~`tests/profile-server/NameChangeRoutes.test.ts`~~ | ~~`0068` build~~ | ❌ **STRUCK 2026-08-29 — never a segfault.** Assertion failure (`got 404`); tracked as **`0200`**. |
| 5 | `tests/core/executions/SAMLauncherExecution.test.ts` | **this task's own sweep — reproduced live** | 2026-08-29 |

**Five crash reports now exist: the four historical ones above plus the one reproduced live on
2026-08-29.** Four distinct suites on 2026-08-28; five crashes in total across both days.

**In every one of the four historical occurrences: the suite passed standalone, and every full re-run
was green.** Independent
full runs also came back clean with no segfault at all (`0067`'s reviewer close-out pass at 103/103
suites / 1039/1039 tests; `0068`'s runs at 106/106 suites / 1072/1072 tests). So it is intermittent, it
moves between suites, and it is not attributable to any particular test.

🔧 **CORRECTED 2026-08-29 — the cause is now KNOWN, and this brief's leading hypotheses were REFUTED
BY EXPERIMENT, not merely left unconfirmed.**

**What this section previously claimed** (preserved): *"Why the larger sample changes the
investigation, and narrows it. Five distinct, unrelated suites — a pure-JS color test, a core
game-rule test, a profile-server route test, a spatial-index test, and an attack test — sharing no
module and no owner, all inside one day, **argues environmental rather than file-specific.** … Phase 1
should therefore weight the environmental hypotheses (worker count / memory pressure, Node +
`jest-worker` version interaction, a native module loaded process-wide) **above** any per-suite
theory."* It also noted that *"occurrence 3 is the same `NameChangeRoutes` flake listed as an accepted
residual on `0068`"* — occurrence 3 is now struck; see the table above.

**What the build actually found — an upstream V8 bug, not a repository defect.** All **five** crash
reports (four historical + the one reproduced live) carry a **byte-identical faulting stack entirely
inside V8's garbage collector** — the same symbol *and* the same image offset in every frame, which is
what makes it one bug rather than five coincidences:
`ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers` dereferencing address `0x6` during a
mark-compact GC, reached from the Baseline-tier prologue's stack guard. **No native-addon frame
appears on any of them, and no repository code appears on any of them.** Signal is
`EXC_BAD_ACCESS (SIGSEGV)`, `KERN_INVALID_ADDRESS at 0x6`, on the worker's main thread.
**Observed rate: 1 segfault in 170 runs (~0.5 %).**

**Hypotheses closed, with how:**

| Hypothesis this brief weighted | Outcome |
|---|---|
| jsdom → native `canvas` poisoning a reused worker | **REFUTED BY EXPERIMENT.** The live reproduction came from the sweep that **excludes every jsdom suite**, in a worker with **no `canvas.node` loaded**, with the identical stack. The jsdom suites run *alone* were 0/30. Three of the four historical crashes also had no `canvas` loaded. That is the exact inverse of the prediction. |
| Worker count / memory pressure | **RULED OUT.** Memory exhaustion on macOS presents as jetsam/`SIGKILL`, not `EXC_BAD_ACCESS`/`SIGSEGV`. (A separate jetsam event on 2026-08-27 confirms the machine *does* hit memory pressure — different day, different signal.) |
| `jest-worker` version mismatch | **RULED OUT by inspection.** jest's runtime path resolves one matching version; the other hoisted copies belong to webpack plugins. |
| `@swc/core` native transform | **REFUTED as a direct cause.** No swc frame on any stack, and swc loads in *every* worker including all 169 non-crashing runs — no discriminating signal. |
| Node 24 / V8 interaction | **SURVIVING, best supported, NOT confirmed.** The stacks are 100 % V8 GC internals. But the cross-version sweeps (Node 22 at 0/30, Node 20 at 0/20) are **underpowered by roughly an order of magnitude** at the observed rate — they support nothing either way. Node is unpinned (no `.nvmrc`, no `engines`). |
| Machine/OS-local condition | **UNTESTABLE.** No CI, no second machine; every data point is from one host. This is the honest ceiling. |

⚠️ **The "five unrelated suites ⇒ environmental" inference reached a defensible conclusion from an
argument that does not hold.** The victim suite carries **no** information about the cause — it is
simply whichever suite happened to be resident in the worker when V8's GC tripped over its own stale
pointer. `SAMLauncherExecution.test.ts`, the live reproduction's victim, is a pure-JS core suite.

⚠️ **A green run is not proof no worker died.** jest respawns a killed worker and can retry the suite,
so the historical occurrence count is a count of the times jest *could not* recover — a floor, not the
true frequency.

Full detail — the stack, the per-report loaded-module table, the sweep design and every negative
result — is in the findings report named in the correction banner at the top of this brief.

**Why this is worth a task rather than a shrug.** A random red run is not a neutral inconvenience: it
destroys the signal. Review verdicts, the sprint ship-loop's gates, and every future "is this change
safe" judgment all read `npm test`'s exit code. Once a red run might mean nothing, the honest reader
has no way to distinguish flake from regression without a manual re-run — and the habit that forms
("just re-run it") is exactly the habit that lets a genuine regression through. This was recorded in
`0067`'s review ledger as an **environmental observation, explicitly not a defect of that task**, with
the note that a third occurrence should be treated as a toolchain problem in its own right. This task
is that treatment.

### Symptom 2 — `tests/integration` hangs without `--forceExit`

🔧 **CORRECTED 2026-08-29 — THIS SYMPTOM DOES NOT REPRODUCE AT ALL. Both halves of the claim below
were wrong: the stated cause and the symptom itself.**

**What this section previously claimed** (preserved verbatim): *"`RUN_DB_TESTS=1 npx jest
tests/integration --runInBand` does not exit after the suites finish — open `pg` pool handles keep the
process alive past a 10-minute timeout. **Pre-existing**, not introduced by `0067`, and there is a
working workaround (`--forceExit`). The problem is that the workaround is **folklore**: it lives in one
task's worklog, so the next person meets a 10-minute hang with no indication that it is expected or
how to get past it."*

**What measurement found:**

- `--runInBand` **without** `--forceExit` exits **on its own in ~4 s**, 5 suites / 70 tests passing,
  **10 runs out of 10**.
- `--detectOpenHandles` reports **zero** open handles.
- Every integration suite **already closes its pool** — six `afterAll(async () => { await pool.end(); })`
  sites across five files. There was nothing left open to keep the process alive.
- No hang was observed in **any** invocation form. The flagless *parallel* form fails loudly (a
  migration race) but it does not hang either — it exits in 13 s.

**Where the folklore came from.** `--forceExit` makes jest print its *"Force exiting Jest: Have you
considered using `--detectOpenHandles`…"* line **unconditionally, whenever the flag is set** — whether
or not any handle was open. A run that prints it looks like it *had* to be force-exited even when it
would have exited cleanly. **No surviving artifact anywhere shows an actual hang** — not a log, not a
timing, not a transcript.

⚠️ **One thing this does NOT close.** All the measurements above ran against a **warm** database whose
schema already existed. A **cold** database (first migration) was not tested — dropping and recreating
the owner's integration database was outside the approved plan. If the historical hang was
cold-DB-specific, it has **not** been excluded.

📌 **The documentation work in Phase 2 below is still worth doing** — the invocation genuinely was
undocumented, and symptom 3 is unaffected. But it must document what is **true** (`--forceExit` is not
required under `--runInBand`), not the folklore this section originally asserted. Whether to keep
`--forceExit` as insurance or drop it so a future real handle leak stays visible is returned to the
owner as an open decision in the findings report.

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

> 🔧 **2026-08-29 — Phase 1's questions have been ANSWERED by this task's own build.** The steps below
> are preserved as the instruction that was given, and are correct as method. Do not re-run them from
> scratch: the cause, the reproduction rate, and every hypothesis outcome are recorded in the findings
> report named in the correction banner at the top of this brief, and summarised in § Symptom 1 above.
> Step 5's warning (do not buy a mitigation without surfacing its cost) still stands and was honoured —
> no mitigation was bought.

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

8. ~~**Document the `--forceExit` requirement as expected behaviour, with its reason** — open `pg` pool
   handles after the suites finish — so the next person recognises the hang instead of debugging it.
   Note that it is pre-existing and predates `0067`.~~

   🔧 **CORRECTED 2026-08-29 — struck as written; the premise is false.** The step above (preserved) told
   the reader to document a requirement that does not exist and a reason that is not the reason. **What
   should be documented instead:** that `--forceExit` is **not required** under `--runInBand`, that the
   suite exits on its own in ~4 s with zero open handles, that every pool is already closed in an
   `afterAll`, and that jest's *"Force exiting Jest…"* line prints whenever the flag is set and is
   **not** evidence a handle was open. Note the one unclosed case: all measurements were against a
   **warm** database; a cold first-migration database was not tested.

9. ~~**Decide, and record, whether the open handles should be fixed rather than masked.** Closing the
   pools in an `afterAll` is the real fix and would remove the need for `--forceExit`.~~

   🔧 **CORRECTED 2026-08-29 — moot; already done in the repository.** Six
   `afterAll(async () => { await pool.end(); })` sites exist across five integration files. There are no
   open handles to fix. The remaining question is the inverse and is an **owner decision, not a coder
   one**: keep `--forceExit` as insurance, or drop it so a future *real* handle leak stays visible?
   Returned in the findings report as open item **D4**.

## Verification steps

1. **Findings exist and are honest about their limits** — the observed reproduction rate is stated,
   including a "did not reproduce" result if that is what happened, and every hypothesis tested is
   listed with its outcome. No speculative fix was applied to symptom 1 without a finding behind it.
2. **A person who has never run the integration suite can run it from the written documentation alone**,
   with no access to any task worklog. This is the actual bar — the reviewer's two failed attempts are
   the counter-example it must beat.
3. **The documented invocation was executed as written** and the suite passes: 5 suites / 70 tests at
   the time of writing (re-derive the current numbers; do not copy these).
4. ~~**The `--forceExit` requirement is documented with its reason**, and the documentation says it is
   pre-existing.~~ 🔧 **CORRECTED 2026-08-29 — replaced.** The bar is now: **the documentation states
   the measured truth** — `--forceExit` is not required under `--runInBand`, the suite exits by itself,
   and jest's force-exit banner is not evidence of an open handle. A document repeating the old claim
   fails this step.
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
  source of segfault occurrences 2–4 and of the unset-`TEST_DATABASE_URL` data point; ⚠️ **also the
  source of the five-vs-four error corrected 2026-08-29** — its `review.md:153` rolled an assertion
  failure into the segfault list, while its `worklog.md:189` records the same event correctly; both
  files in `ai-agents/tasks/done/0068-citizen-verified-icon/` are finished output —
  **reference them, do not edit them**), and **`0200`** (the supertest flake split out of this task
  under owner amendment A4 on 2026-08-29).
- **The evidence grew after filing; the ranking did not change.** Priority, sprint and status are
  exactly as owner-confirmed on 2026-08-28. The 2026-08-28 additions above are evidence only — and the
  2026-08-29 corrections are corrections only. Nothing was re-ranked, and the ADR-035 note above still
  applies unchanged (cited by name, not linked — it is an fkit upstream ADR).

- 🔧 **CORRECTION PROVENANCE — 2026-08-29, producer, mid-build.** Three factual errors in this brief
  were corrected in place from this task's own build findings; each correction preserves what the brief
  previously claimed. See the banner under the title for the list, and § Symptom 1 / § Symptom 2 for the
  detail. **Nothing was silently overwritten, and no status, priority, sprint, owner or file location
  was touched.** The corrections were made by the producer at the lead session's request; the coder was
  actively working in this task's `worklog.md`, `plan.md` and findings report at the time, and **none of
  those three files was touched.**

- **The `NameChangeRoutes` `404` flake is now its own task: `0200`** (filed 2026-08-29, Backlog board).
  Owner-ruled on 2026-08-29 via `AskUserQuestion` (amendment **A4** on this task's plan): **characterize
  the flake inside `0197`, fix it under a separate brief.** `0200` is that brief. It is the same failure
  that was misrecorded as segfault occurrence 3 — which is exactly why it earns its own record.

- ⚠️ **`0068`'s `review.md` carries the five-suite error at its line 153, and is finished output that
  must not be edited.** It is corrected *here*, not there. A reader arriving from `0068` will see the
  wrong count; this brief and the findings report are the correction of record.
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
