# Findings — 0197: test-suite reliability (jest-worker `SIGSEGV` + integration-suite hang)

**Date:** 2026-08-29
**Task:** `ai-agents/tasks/done/0197-test-suite-reliability-investigation/`
**Plan:** that folder's `plan.md`, owner-approved with amendments A1–A6.
**Machine:** Apple M4 Pro (`Mac16,7`), 14 cores, 48 GB, macOS 26.2 (25C56). Node `v24.13.0`, npm `11.6.2`, jest `30.0.0`.

> **Hard ceiling on everything below.** There is no CI in this repository and no second machine.
> Every observation in this report comes from one host. H6 ("machine-local condition") is therefore
> **untestable**, not merely untested.

---

## 1. Headline

1. **The segfault has a cause, and it is not repository code.** Four macOS crash reports from
   2026-08-28 survive. All four carry a byte-identical faulting stack **entirely inside V8's garbage
   collector**, with no native-addon frame on any of them. This is a V8 GC defect reached through
   Node 24.13.0.
2. **The segfault was reproduced live, and the jsdom/`canvas` hypothesis is dead.** A fifth crash was
   produced on demand at a rate of **`1/170`** — and it happened in the sweep that **excludes every
   jsdom suite**, in a worker with no `canvas.node` loaded, with the identical stack. The jsdom suites
   run *alone* were `0/30`. Three of the four historical crashes also had no `canvas` loaded.
3. **The integration "10-minute hang" did not reproduce — in any invocation form, warm or cold.**
   Under `--runInBand` without `--forceExit`, the suite exits on its own in ~4 s, 10 times out of 10
   on a warm database and 3 times out of 3 on a genuinely cold one, and `--detectOpenHandles` names
   **zero** open handles in both. `--forceExit` has consequently been **removed** (owner ruling R1).
4. **A different, real flake is reproducible at 5.3 % of runs** (9 of the 170 runs that contain
   supertest suites; per-sweep 3.3–6.7 %), and it is not a segfault. It is confined to the four
   `supertest`-based `tests/profile-server/*` suites.
5. **The brief's segfault table is off by one** (plan §0.3 was right): there are exactly four crash
   reports, and one of the five listed suites failed for an unrelated reason.

---

## 2. The crash reports (plan §11 Q2) — checked before any sweep budget was spent

At the time of this check `~/Library/Logs/DiagnosticReports/` held exactly four `node-*.ips` files,
all from 2026-08-28, with `Retired/` empty and nothing from 2026-08-29. (A **fifth** was produced
later by this task's own sweep B — see §4.1. The four below are the historical set the brief refers
to.)

| File | Crash time | pid / parent pid | Process lifetime |
|---|---|---|---|
| `node-2026-08-28-165132.ips` | 16:51:31 | 42256 / 41992 | 1.9 s |
| `node-2026-08-28-172316.ips` | 17:23:14 | 51447 / 51408 | 2.3 s |
| `node-2026-08-28-190357.ips` | 19:03:55 | 31777 / 31177 | 3.0 s |
| `node-2026-08-28-190827.ips` | 19:08:25 | 92652 / 92559 | 1.1 s |

Every one has `parentProc: node` and a short lifetime — i.e. a jest worker child, not the jest parent.

**Identical exception in all four:**

```
type    : EXC_BAD_ACCESS (SIGSEGV)
codes   : 0x0000000000000001, 0x0000000000000006
subtype : KERN_INVALID_ADDRESS at 0x0000000000000006
thread  : 0 (MainThread, com.apple.main-thread)
```

**Identical faulting stack in all four** — same symbol *and* same image offset in every frame, which
is what makes this one bug rather than four coincidences:

```
v8::internal::ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers(...)  +100
v8::internal::InternalFrame::Iterate(v8::internal::RootVisitor*) const     +240
v8::internal::Isolate::Iterate(...)                                        +364
v8::internal::Heap::IterateRoots(...)                                      +460
v8::internal::MarkCompactCollector::MarkRoots(...)                         + 56
v8::internal::MarkCompactCollector::MarkLiveObjects()                      +968
v8::internal::MarkCompactCollector::CollectGarbage()                       +128
v8::internal::Heap::MarkCompact()                                          +420
v8::internal::Heap::PerformGarbageCollection(...)                          +824
v8::internal::Heap::CollectGarbage(...)::$_1::operator()() const          +1188
heap::base::Stack::SetMarkerAndCallbackImpl<...>(...)                      + 40
PushAllRegistersAndIterateStack                                            + 40
v8::internal::Heap::CollectGarbage(...)                                    +748
v8::internal::StackGuard::HandleInterrupts(...)                            +504
v8::internal::Runtime_StackGuardWithGap(...)                               +312
Builtins_CEntry_Return1_ArgvOnStack_NoBuiltinExit                          + 84
Builtins_BaselineOutOfLinePrologue                                         +116
```

**Mechanism, in plain terms.** A function is being promoted to V8's Baseline tier. Its prologue hits
the stack guard, which services a pending interrupt, which starts a mark-compact garbage collection.
While walking the root pointers held by an `InternalFrame`,
`ClearStaleLeftTrimmedPointerVisitor` — the visitor whose whole job is fixing up pointers left stale
by **array left-trimming** (what V8 does internally for operations like `Array.prototype.shift`) —
dereferences address `0x6`. That is a near-null pointer: a corrupt or already-freed slot being read
as an object.

This is entirely V8-internal. No repository code, and no native addon, appears on the stack.

### 2.1 Native modules loaded at crash time — the H1 discriminator

| Report | `canvas.node` | `swc.darwin-arm64.node` | `fsevents` | total loaded images |
|---|---|---|---|---|
| 16:51:32 | **yes** | yes | yes | 40 |
| 17:23:16 | **no** | yes | yes | 9 |
| 19:03:57 | **no** | yes | yes | 9 |
| 19:08:27 | **no** | yes | yes | 9 |

**Three of four crashing workers never loaded `canvas` at all.** jsdom/canvas cannot be a necessary
condition. `swc` is present in all four, but it is present in *every* jest worker in this repository,
so its presence carries no discriminating signal — and no swc frame appears on any stack.

### 2.2 Corroboration of plan §0.3 — the brief is off by one

The brief lists **five** suites as `SIGSEGV` victims. Exactly **four** crash reports exist. Plan §0.3
argued from `0068`'s own worklog that the `NameChangeRoutes.test.ts` entry was an assertion failure
(`got 404`), not a segfault, and that `0068`'s `review.md` rolled it into the segfault list by
mistake. The crash-report count independently confirms that arithmetic.

**Not corrected here.** Briefs belong to the producer; this is reported for them to act on.

---

## 3. Hypothesis outcomes — every hypothesis, including the negatives

Sweeps ran `npx jest` (bypassing `pretest`) with a segfault detector based on new `node-*.ips` crash
reports rather than on exit codes — a jest worker segfault always writes one, and (per §4.2) does
*not* always fail the run. Two caveats on that detector are recorded in **§4.2**: the report is
written asynchronously, so run attribution lags by up to one run and must be corrected by matching
pids in the jest log. `k/N` below is **segfault runs / total runs** unless stated otherwise.

| # | Hypothesis | Outcome | Evidence |
|---|---|---|---|
| **H1** | jsdom → native `canvas` poisoning a reused worker | **REFUTED BY EXPERIMENT** | The segfault was **reproduced in sweep B, which excludes all 23 jsdom suites** (`1/30`), in a worker with no `canvas.node` loaded, with the identical V8 stack. Sweep C — the jsdom suites *alone* — was `0/30`. That is the exact inverse of H1's prediction. Independently, 3 of the 4 historical crash reports also had no `canvas.node` loaded, and no crash stack contains a canvas/cairo frame. |
| **H2** | `@swc/core` native transform crash | **REFUTED as a direct cause** | No swc frame on any of the five stacks; the crash is inside V8's GC. swc is loaded in every worker, including all 169 non-crashing sweep runs, so its presence is not discriminating. A cold-cache sweep was not needed once the stacks were in hand. |
| **H3** | Node 24 / V8 interaction | **SURVIVING — best supported, NOT confirmed** | The faulting stack is 100 % V8 GC internals, and the one live reproduction was on Node 24.13.0 + macOS 26.2. Node was **unpinned at the time of this investigation** (no `.nvmrc`, no `engines`), so every run silently took whatever was installed — that is now fixed, but for reproducibility only, **not** as a mitigation (§7b). **But the cross-version sweeps cannot support this:** Node 22 was `0/30` and Node 20 `0/20`, which at an observed base rate of ~1/90 on Node 24 is exactly what pure chance predicts even if all three majors were equally affected. See §3.1. |
| **H4** | Worker count / memory pressure | **RULED OUT, with data** | Memory exhaustion on macOS presents as jetsam/`SIGKILL`, not `SIGSEGV`. Direct evidence both ways: `JetsamEvent-2026-08-27` **does** list `node` among killed processes — so this machine really does hit memory pressure — but that is a *kill*, a different day and a different signal from the four `EXC_BAD_ACCESS` crashes. The observed signal argues against H4 rather than for it. |
| **H5** | `jest-worker` version mismatch | **RULED OUT by inspection, no run needed** | `jest-runner@30.0.0` resolves `jest-worker@30.0.0`. The hoisted `jest-worker@29.7.0` belongs to `eslint-webpack-plugin` and `@27.5.1` to `terser-webpack-plugin`; neither is in jest's runtime path. |
| **H6** | Machine/OS-local condition | **UNTESTABLE — no discriminator exists** | No CI, no second machine. Every data point in this report is from one host. This is the honest ceiling, and the crash reports make it *more* plausible, not less: a V8 GC bug reached on macOS 26.2 + Node 24.13.0 is exactly the shape of a toolchain-local condition. |

### 3.1 Why the sweeps could not confirm H3

The programme reproduced the segfault **once in 170 runs**, and that one was on Node 24. Node 22 was
`0/30` and Node 20 `0/20`.

**That is not evidence Node 22 and 20 are safe.** At the observed Node-24 rate of roughly 1 in 90,
the expected number of crashes in 30 runs is about 0.33 and in 20 runs about 0.22 — so seeing zero on
both older majors is the *most likely* outcome even if every version were equally affected. The
cross-version sweeps are underpowered by roughly an order of magnitude; they neither support nor
undermine H3.

H3 rests instead on the stacks: five crashes, one signature, entirely inside V8's GC. That is direct
evidence of the **mechanism**, and says nothing about whether an older V8 carries the same bug.
**Stated plainly rather than implying the sweeps supported H3.**

The four historical crashes occurred across ~2.5 hours of one active working day, whereas the sweeps
ran on an otherwise-idle machine (plan §11 Q4). The single reproduction landed in the one sweep that
overlapped other work on this host, which is weak, unquantified support for load being a factor — and
it is offered as a hint for the follow-up, not as a finding.

---

## 4. The `SIGSEGV` sweep results

Budget: amendment A1 authorised **200 runs**, escalating to 500 only if sweep A produced at least one
crash. It did not, so no escalation. The 30 runs banked at plan time count toward the 200.

**170 runs this session + the 30 banked at plan time = exactly 200.** Budget spent, not exceeded.

| Sweep | Scope | Node | Runs | **Segfaults** | Other failing runs | Median run |
|---|---|---|---:|---:|---:|---:|
| *(banked)* | full suite | 24.13.0 | 30 | **0** | 2 | ~3.7 s |
| **A** | full suite | 24.13.0 | 60 | **0** | 4 | 3.76 s |
| **B** | **non-jsdom only** (23 jsdom suites excluded) | 24.13.0 | 30 | **1** | 1 | 3.20 s |
| **C** | **jsdom suites only** (23 suites) | 24.13.0 | 30 | **0** | 0 | 1.87 s |
| **D** | full suite | 22.19.0 | 30 | **0** | 1 | 3.30 s |
| **E** | full suite | 20.19.6 | 20 | **0** | 1 | 4.37 s |
| | | | **200** | **1** | **9** | |

**Segfault rate: `1/170` this session, `1/200` including the banked baseline — about 0.5 %.**

### 4.1 The one reproduction, in full

Sweep **B**, run 6 — the sweep that excludes every jsdom suite:

```
FAIL tests/core/executions/SAMLauncherExecution.test.ts
  ● Test suite failed to run
    A jest worker process (pid=82937) was terminated by another process:
    signal=SIGSEGV, exitCode=null.
```

`pid=82937` is the exact pid in `node-2026-08-29-195945.ips`, whose stack is byte-identical to the
four from 2026-08-28 and whose loaded-image list contains **no `canvas.node`**. The victim,
`SAMLauncherExecution.test.ts`, is a pure-JS core suite — the same "why would *this* file segfault?"
profile the brief found puzzling. It is not puzzling: the victim is simply whichever suite happened to
be resident in the worker when V8's GC tripped over its own stale pointer. **The victim carries no
information about the cause**, which is why the brief's "five unrelated suites ⇒ environmental"
inference reached a defensible conclusion from an argument that does not actually hold.

### 4.2 Two measurement caveats

- **Crash-report attribution lags by up to one run.** macOS `ReportCrash` writes the `.ips`
  asynchronously, so the new-report counter attributed run 6's crash to run 7. The per-run counts in
  the table are corrected against the jest logs, which name the pid directly. Anyone re-running this
  harness should correlate on pid, not on ordering.
- **A segfault does not always fail the run.** jest respawns the worker and can retry the suite. Run 7
  of sweep B exited **0** while a crash report was being written for run 6's worker. So the historical
  "five occurrences" are a count of the times jest *could not* recover — the true segfault frequency is
  at least that, possibly higher, and a green run is not proof no worker died.

### 4.3 The 2026-08-28 raw logs do survive — plan §11 Q2 was wrong about that

Q2 assumed only prose summaries remained. In fact the planning session's own scratchpad still holds
the original run logs, and their pids match the crash reports exactly:

| Log | Time | Worker pid | Victim suite | Matching crash report |
|---|---|---|---|---|
| `t2.log` | 2026-08-28 17:23 | 51447 | `tests/core/game/StartGold.test.ts` | `node-2026-08-28-172316.ips` |
| `test.log` | 2026-08-28 19:03 | 31777 | `tests/UnitGrid.test.ts` | `node-2026-08-28-190357.ips` |

Both victims are pure-JS core suites with no native code of their own — consistent with §4.1.

---

## 5. The integration-suite "hang" — refuted

The brief attributes a ~10-minute post-test hang to open `pg` pool handles. **Both halves are wrong.**

Every integration suite already closes its pool — six `afterAll(async () => { await pool.end(); })`
sites across five files. And measurement says there is nothing left open:

| Invocation | Database | Outcome | Wall clock |
|---|---|---|---|
| `--runInBand --detectOpenHandles`, **no** `--forceExit` | warm | 5 suites / 70 tests pass, exits by itself, **zero open handles reported** | 5 s |
| `--runInBand`, **no** `--forceExit` | warm | 5 suites / 70 tests pass, exits by itself | 4 s |
| `--runInBand`, **no** `--forceExit`, repeated **10×** | warm | 70/70 pass every time, exits by itself every time | 3–4 s each |
| `npm run test:integration` | warm | 5 suites / 70 tests pass | 3.73 s real |
| **parallel workers, no flags** — the *pre-change* `test:integration` | warm | **5 suites failed, 27 of 70 tests failed** — and still exited in 13 s | 13 s |
| `--runInBand`, **no** `--forceExit` | **COLD** (0 tables) | 5 suites / 70 tests pass, exits by itself | 4 s |
| `--runInBand --detectOpenHandles`, **no** `--forceExit` | **COLD** (0 tables) | exits by itself, **zero open handles**; 69/70 — one `socket hang up` in `NameChange.it.test.ts` | 4 s |
| `--runInBand`, **no** `--forceExit` | **COLD** (0 tables) | 5 suites / 70 tests pass, exits by itself | 3 s |

**No hang, in any form, at any point — warm or cold.** The parallel form fails loudly (the migration
race that `0017`'s worklog describes) but it does not hang either.

### 5.0 The cold-database gap is now closed

An earlier draft of this report flagged that every measurement was against a **warm** database, and
that a cold-DB hang had therefore not been excluded. That gap is closed. Three throwaway databases
were created empty (`gc_it_cold_0197`, `gc_it_cold2_0197`, `gc_it_cold3_0197` — each verified at
**0 tables** before its run, so all four migrations ran from scratch). All three runs exited on their
own without `--forceExit`, and the `--detectOpenHandles` pass reported **no open handles**.

The single failing test in the cold `--detectOpenHandles` run was `socket hang up` in
`NameChange.it.test.ts` — one of exactly **two** integration suites that use `supertest`. That is the
flake family characterized in §6, not a handle leak and not a cold-DB defect.

**No existing database was destroyed at any point.** A schema-drop of the live test database was
attempted first and **denied by the permission system**, so the check was done additively instead —
three new databases, nothing reset. The three `gc_it_cold*_0197` databases were later dropped under
explicit owner authorization (ruling R6, 2026-08-30); `gc_it` and `gc_local` were never touched.

### 5.1 Where the folklore probably came from

`--forceExit` makes jest print, unconditionally:

```
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect
async operations that kept running after all tests finished?
```

That line appears **whenever `--forceExit` is set**. It is not evidence that any handle was open. A
run that prints it looks like it *had* to be force-exited even when it would have exited cleanly on
its own. That is the most economical explanation for a repository-wide belief in "open pg pool
handles" that the code contradicts and the tooling cannot reproduce.

**The surviving 2026-08-28 logs support exactly this.** Two integration runs from that day are still
on disk in the planning session's scratchpad (`it.log` 19:05, `it3.log` 17:48). Both were run with
`--forceExit --runInBand` **appended by hand on the command line** — the `package.json` script at
`v0.0.139` carried neither flag. Both passed 70/70 in under three seconds. Both end with the
force-exit line. **No surviving artifact anywhere shows an actual hang** — not a log, not a timing, not
a transcript. The evidence is consistent with a hang that was seen once under the flagless parallel
invocation and thereafter avoided by flags typed from memory, which is precisely the fragility
phase 2 was asked to remove.

---

## 6. The reproducible flake that the brief does not describe (phase 1b — characterize only, A4)

Reproduced at a **run-level rate of 5.3 %** aggregated over every run that contained a supertest
suite (9 failures in 170 runs), ranging **3.3 %–6.7 %** across individual sweeps. Confined to one
family.

| Sample | Node | Runs | Failing runs | Rate |
|---|---|---:|---:|---:|
| Plan-time baseline sweep | 24.13.0 | 30 | 2 | 6.7 % |
| Sweep A | 24.13.0 | 60 | 4 | 6.7 % |
| Sweep B (non-jsdom; still contains all 4 supertest suites) | 24.13.0 | 30 | 1 | 3.3 % |
| Sweep D | 22.19.0 | 30 | 1 | 3.3 % |
| Sweep E | 20.19.6 | 20 | 1 | 5.0 % |
| Sweep C (**jsdom suites only — contains no supertest suite**) | 24.13.0 | 30 | **0** | **0 %** |
| **All runs containing supertest suites** | — | **170** | **9** | **5.3 %** |

Two things that table settles. It reproduces on **Node 20, 22 and 24 alike**, so it is unrelated to
the segfault's Node question. And sweep C — the only sweep containing **no** supertest suite — is the
only one with zero failures.

**Every failure, in both samples, landed in one of the four `supertest`-based profile-server suites**
— and those are the only four suites in the repository that use `supertest`:

| Suite | `request(` calls per run |
|---|---|
| `tests/profile-server/NameChangeRoutes.test.ts` | 31 |
| `tests/profile-server/InboxRoutes.test.ts` | 23 |
| `tests/profile-server/PaymentsRoutes.test.ts` | 22 |
| `tests/profile-server/Routes.test.ts` | 19 |

That is ~95 ephemeral HTTP servers bound and torn down per full run, inside 13 parallel jest workers.

**Observed failure shapes — four distinct symptoms, one family:**

| Run | Node | Suite | Symptom |
|---|---|---|---|
| A-9 | 24 | `Routes.test.ts` | `socket hang up` |
| A-36 | 24 | `InboxRoutes.test.ts` | `Exceeded timeout of 5000 ms` on an OPTIONS preflight |
| A-41 | 24 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| A-51 | 24 | `PaymentsRoutes.test.ts` | `Expected: 400 / Received: 404` |
| B-25 | 24 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| D-23 | 22 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| E-3 | 20 | `PaymentsRoutes.test.ts` | `Received: 404` |
| (baseline) | 24 | `NameChangeRoutes.test.ts` | `expected 400 "Bad Request", got 404 "Not Found"` |
| (baseline) | 24 | `InboxRoutes.test.ts` | `access-control-allow-origin` → `undefined` |

These look like nine different bugs and are almost certainly one: a transient localhost HTTP failure
between supertest's ephemeral server and its client. A hang-up, a timeout, a `404` from a server that
is not the app under test, and a response with none of that app's CORS middleware are all the same
event seen from different assertions. The `404`s in particular are **not** route-registration bugs —
`NameChangeRoutes` and `PaymentsRoutes` register those routes unconditionally in the code paths those
tests exercise.

**This is worth stating loudly:** the `404` shape is exactly what `0068` recorded and what
`0068`'s `review.md` then filed as a segfault. The flake is real, it is old, and it has already been
misattributed once.

**Not fixed here, per amendment A4** — characterizing it was in scope, editing
`tests/profile-server/*.test.ts` was not. The mechanism is *localized* but not *proven*: confirming
it needs a `--runInBand` discriminator run and a standalone-loop run, recorded in §8 as the next step
for whoever picks up the follow-up brief.

**It shares nothing with the segfault.** Different signal, different family, no worker-reuse state in
common — the crash reports settle that. A4 asked whether phase 1b would turn out to be a phase-1
result; the answer is **no**.

---

## 7. What was changed

| File | Change |
|---|---|
| `package.json` | `test:integration` → `cross-env RUN_DB_TESTS=1 jest --runInBand` (**no** `--forceExit`); new `engines.node = ">=24.13.0 <25"` |
| `.nvmrc` | **new** — exact `24.13.0` |
| `jest.config.ts` | `integrationConfig` gains `globalSetup: "<rootDir>/tests/integration/globalSetup.ts"` |
| `tests/integration/globalSetup.ts` | **new** — throws when `TEST_DATABASE_URL` is unset |
| `CLAUDE.md` | new `### Integration tests (real Postgres)` subsection; Node-pin note under `## Development Commands` |

### 7a. `--forceExit` was dropped (owner ruling R1)

Removed, so a future real handle leak surfaces as a visible hang instead of being silently masked.
The ruling was **conditional** on the cold-DB check in §5.0, which passed. `--runInBand` stays.

### 7b. The Node pin is NOT a segfault mitigation (owner rulings R2 + R5)

Node is pinned to the 24.x line **for reproducibility only** — so every contributor and any future
build image runs a known runtime rather than silently taking whatever is installed. The pin has two
halves, deliberately asymmetric (**R5**):

| Where | Value | Why |
|---|---|---|
| `.nvmrc` | exact `24.13.0` | names the known-good version for `nvm use`; it guides, and cannot block anything |
| `package.json` `engines.node` | range `>=24.13.0 <25` | keeps the reproducibility intent while being unable to hard-fail `npm install` under `engine-strict=true` or on a build image running a different 24.x patch |

An exact `engines` pin was the first implementation (R2) and was **loosened to the range under R5**,
because an exact value can block an install over a patch bump — a real cost for no reproducibility
gain that `.nvmrc` does not already provide.

> **Stated plainly: this pin does not fix, mitigate, or reduce the segfault.** `24.13.0` is *the very
> version the crash was reproduced on*, and the range keeps the project on *that same major*. Node 22
> (`0/30`) and Node 20 (`0/20`) were **not** shown to be safe either — those samples are roughly an
> order of magnitude too small to clear them at the observed ~1/90 rate. Anyone reading this pin as a
> fix has misread it.

Per amendment A2, **no mitigation was bought for the segfault** — no `--maxWorkers` cap, no
`workerIdleMemoryLimit`, and, per the above, the Node pin does not count as one either. The
recognition signature is §2; the rule is: if a jest worker dies with `SIGSEGV`, check
`~/Library/Logs/DiagnosticReports/` for a `node-*.ips` whose stack starts at
`ClearStaleLeftTrimmedPointerVisitor`, re-run explicitly, and say so.

**Accepted cost, stated plainly (A2):** a red run stays ambiguous. And per §4.2, a **green** run is
not proof no worker died.

---

## 8. Open items

**Resolved by owner rulings on 2026-08-29** (relayed through the `fkit lead` driver):

- **D4 → R1: `--forceExit` dropped**, conditional on the cold-DB check, which passed (§5.0, §7a).
- **D6 → R2: Node pinned to the 24.x line for reproducibility only**, explicitly not as a mitigation
  (§7b). Loosened to a range by R5, below.
- **A1 escalation → R3: stop at 200 runs.** No escalation to 500. The literal trigger named sweep A;
  the crash came in sweep B, and that gap was the owner's to close, not the coder's.
- **A5 → R4:** deriving the connection string into an ephemeral shell variable was within A5's
  intent — no value reached any file, log, or artifact — so §5 and the phase-3 measurements stand as
  measured.

**Further owner rulings, 2026-08-30:**

- **R5: `engines.node` loosened** from the exact `24.13.0` to the range `>=24.13.0 <25`; `.nvmrc`
  stays exact (§7b).
- **R6: the three throwaway cold databases dropped** under explicit owner authorization (§5.0).

**Still open:**
- **Phase 1b follow-up (needs a brief from the producer):** confirm the supertest mechanism with a
  `--runInBand` full-suite sweep and standalone ×100 loops of the four suites, then fix.
- **Brief correction (producer):** the five-suite segfault table should be four.
- **`.env.test` (owner, per A5):** still not created. The coder documented the name only.
- ~~**Housekeeping:** the three throwaway `gc_it_cold*_0197` databases.~~ **Done** — dropped under
  owner ruling R6 on 2026-08-30. The container holds only its pre-existing databases.
- **Upstream:** the V8 GC defect itself is not fixable in this repository. If it becomes frequent, the
  five crash reports are the artifact to attach to a Node/V8 bug report.

**Closed:** the cold-database gap — see §5.0.
