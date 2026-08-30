# Worklog — 0197 Test-Suite Reliability (jest-worker `SIGSEGV` + integration-suite hang)

Build step, 2026-08-29. Spawned `fkit-coder` under the `fkit lead` sprint driver, implementing the
owner-approved `plan.md` (amendments A1–A6 binding).

Findings report: `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md`

---

## Headline

**Plan §11's Q2 collapsed the investigation before a single sweep run was spent.**
`~/Library/Logs/DiagnosticReports/` still holds **four** `node-2026-08-28-*.ips` crash reports. All four
are jest worker children (`parentProc: node`), all four carry a **byte-identical** faulting stack, and
that stack is **entirely inside V8's garbage collector with no native-addon frame anywhere**.

Second headline: **the segfault was then reproduced live**, on 2026-08-29 at 19:59:44, during the sweep
that **excludes every jsdom suite** — same byte-identical V8 GC stack, no `canvas.node` loaded. Victim:
`tests/core/executions/SAMLauncherExecution.test.ts`, a pure-JS core suite. H1 is refuted by
experiment, not just by inference.

Third headline: **the integration "10-minute hang" does not reproduce in any invocation form** —
including the pre-change parallel one. Under `--runInBand` it exits cleanly in ~4 s, 10/10, with
**zero open handles**. The `pg`-pool attribution is wrong, and so is the hang itself.

---

## Chronology

### 1. Q2 first — the crash reports (read-only)

Four reports, no others anywhere at the time of this check — `Retired/` empty, nothing from
2026-08-29. (A fifth was produced later, by this session's own sweep B; see §2.)

| File | Crash time | pid / parent |
|---|---|---|
| `node-2026-08-28-165132.ips` | 16:51:31 | 42256 / 41992 |
| `node-2026-08-28-172316.ips` | 17:23:14 | 51447 / 51408 |
| `node-2026-08-28-190357.ips` | 19:03:55 | 31777 / 31177 |
| `node-2026-08-28-190827.ips` | 19:08:25 | 92652 / 92559 |

Identical exception in all four:

```
type    : EXC_BAD_ACCESS (SIGSEGV)
subtype : KERN_INVALID_ADDRESS at 0x0000000000000006
thread  : 0 (MainThread, com.apple.main-thread)
```

Identical faulting stack in all four — same symbol *and* same image offset in every frame:

```
v8::internal::ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers(...)   +100
v8::internal::InternalFrame::Iterate(v8::internal::RootVisitor*) const      +240
v8::internal::Isolate::Iterate(...)                                         +364
v8::internal::Heap::IterateRoots(...)                                       +460
v8::internal::MarkCompactCollector::MarkRoots(...)                          + 56
v8::internal::MarkCompactCollector::MarkLiveObjects()                       +968
v8::internal::MarkCompactCollector::CollectGarbage()                        +128
v8::internal::Heap::MarkCompact()                                           +420
v8::internal::Heap::PerformGarbageCollection(...)                           +824
v8::internal::Heap::CollectGarbage(...)::$_1::operator()() const           +1188
heap::base::Stack::SetMarkerAndCallbackImpl<...>(...)                       + 40
PushAllRegistersAndIterateStack                                             + 40
v8::internal::Heap::CollectGarbage(...)                                     +748
v8::internal::StackGuard::HandleInterrupts(...)                             +504
v8::internal::Runtime_StackGuardWithGap(...)                                +312
Builtins_CEntry_Return1_ArgvOnStack_NoBuiltinExit                           + 84
Builtins_BaselineOutOfLinePrologue                                          +116
```

**Reading:** a stack-guard interrupt at a Baseline-tier function prologue triggers a mark-compact GC;
while iterating the roots of an `InternalFrame`, `ClearStaleLeftTrimmedPointerVisitor` dereferences a
near-null pointer (`0x6`). `ClearStaleLeftTrimmedPointerVisitor` is V8's handler for pointers left
stale by **array left-trimming**. This is a V8 GC defect, not repository code.

**Native modules loaded at crash time** — the discriminator that kills H1:

| Report | `canvas.node` | `swc.darwin-arm64.node` | total images |
|---|---|---|---|
| 16:51:32 | **yes** | yes | 40 |
| 17:23:16 | **no** | yes | 9 |
| 19:03:57 | **no** | yes | 9 |
| 19:08:27 | **no** | yes | 9 |

Three of four crashes happened in a worker with **no canvas loaded at all**. jsdom/canvas is not a
necessary condition. `swc` is present in all four, but it is present in *every* jest worker, so its
presence carries no signal — and no swc frame appears on any stack.

**Corroboration of plan §0.3:** exactly **four** crash reports exist for 2026-08-28, not five. The
brief's five-suite segfault table is off by one, exactly as §0.3 argued from `0068`'s worklog.
Reported, not corrected — briefs are the producer's.

**Caveat on that corroboration** (found later, §2): a segfault does **not** always fail the run, so
report count and "occurrences the brief noticed" are not the same quantity. The count still refutes
*five crash reports on 2026-08-28*, which is what §0.3 claimed; it does not prove only four workers
died that day.

### 2. Sweep programme (P1a) — 170 runs

| Sweep | Scope | Node | Runs | Segfaults | Other failing runs |
|---|---|---|---:|---:|---:|
| *(banked at plan time)* | full suite | 24.13.0 | 30 | 0 | 2 |
| A | full suite | 24.13.0 | 60 | 0 | 4 |
| B | non-jsdom only | 24.13.0 | 30 | **1** | 1 |
| C | jsdom only | 24.13.0 | 30 | 0 | 0 |
| D | full suite | 22.19.0 | 30 | 0 | 1 |
| E | full suite | 20.19.6 | 20 | 0 | 1 |
| | | | **200** | **1** | **9** |

The one reproduction (sweep B run 6) killed the worker running
`tests/core/executions/SAMLauncherExecution.test.ts` with `signal=SIGSEGV`; its pid matches
`node-2026-08-29-195945.ips` exactly.

Two measurement caveats worth carrying forward, both in the findings report: macOS writes the crash
report **asynchronously** (so report-count attribution lags by up to one run — correlate on pid), and
**a segfault does not always fail the run** (jest respawns and retries, so a green run is not proof no
worker died).

### 3. Phase 2 — the integration invocation (implemented)

Applied per A3. See "Change surface" below.

### 4. Phase 3 — open-handles assessment (measured, not assumed)

| Invocation | Result | Wall clock |
|---|---|---|
| `--runInBand --detectOpenHandles`, **no** `--forceExit` | 5 suites / 70 tests pass, exits on its own, **zero open handles reported** | 5 s |
| `--runInBand`, **no** `--forceExit`, no detect | 5 suites / 70 tests pass, exits on its own | 4 s |
| same, repeated **10×** | 70/70 pass and clean exit **every time** | 3–4 s each |
| `npm run test:integration` (as first built, `--runInBand --forceExit`) | 5 suites / 70 tests pass | 3.73 s real |
| `npm run test:integration` (**final**, `--runInBand` only, per R1) | 5 suites / 70 tests pass, exits on its own, no force-exit line | 3.08 s real |
| parallel workers, no flags (the **pre-change** `test:integration`) | **5 suites / 27 tests FAIL** (migration race) — but still exits on its own | 13 s |

**No hang in any form.** The pre-change parallel invocation fails loudly; it does not hang either.

**The brief's stated cause is refuted twice over.** Every pool is already `end()`ed (6 `afterAll`
sites across 5 files), *and* jest's own `--detectOpenHandles` names nothing. The limiter/supertest
hypothesis the plan floated as the leading alternative is also not needed: under `--runInBand` there
is no hang to explain.

The `Force exiting Jest: Have you considered using --detectOpenHandles` line that `--forceExit`
prints is **unconditional whenever `--forceExit` is set** — it is not evidence that handles were open.
That line is plausibly the whole origin of the "open pg pool handles" folklore.

---

## Change surface

| File | Change |
|---|---|
| `package.json` | `test:integration` → `cross-env RUN_DB_TESTS=1 jest --runInBand` (**no** `--forceExit`, per R1); new `engines.node = ">=24.13.0 <25"` (R2, loosened from an exact pin by R5) |
| `.nvmrc` | **new** — exact `24.13.0` (R2; deliberately left exact by R5) |
| `jest.config.ts` | `integrationConfig` gains `globalSetup: "<rootDir>/tests/integration/globalSetup.ts"` |
| `tests/integration/globalSetup.ts` | **new** — fail-fast guard, throws when `TEST_DATABASE_URL` is unset |
| `CLAUDE.md` | new `### Integration tests (real Postgres)` subsection under `## Testing`; Node-pin note (with the explicit non-mitigation warning) under `## Development Commands` |

Nothing else. No brief, no board row, no task status, no wiki, no `.env.test`, no commit.

---

## Decision log

Changes applied without asking, under the sprint-loop standing approval (verified `CORRECT`,
mechanical/localized, inside the approved plan):

1. **`package.json` — `--runInBand --forceExit` on `test:integration`.** Answers plan §4.1 / A3
   verbatim. Mechanical one-line edit, explicitly enumerated in the approved change-surface table as
   "P2 — certain". Verified: the command passed 5/5 suites, 70/70 tests.
   **↳ Superseded by owner ruling R1 (below): `--forceExit` was subsequently removed.** `--runInBand`
   stands.
2. **`tests/integration/globalSetup.ts` + the `jest.config.ts` wiring.** Answers plan §4.2 / A3, which
   names the mechanism (jest `globalSetup`), the file it attaches to, and the choke-point rationale.
   Localized: one new file, one added config key. Verified: unset `TEST_DATABASE_URL` now exits 1 with
   the explicit message.
3. **`CLAUDE.md` `### Integration tests` subsection.** Answers plan §4.3 / A3, which enumerates the
   required contents item by item. Contains variable **names**, the container name and port only — no
   connection string, host, user, or password.

Obvious-winner calls: **none.**

### Owner rulings R1–R4 — ruled 2026-08-29, relayed by the `fkit lead` driver

**These are the owner's decisions, not autonomous calls of mine.** I returned all four as
`NEEDS-DECISION`; the owner ruled each via `AskUserQuestion` in the live driver session and the lead
relayed them back. All four took my recommendation.

4. **R1 — D4: DROP `--forceExit`** from `test:integration`, *conditional on a cold-DB check first*.
   Owner ruling. I ran the check (see below): three cold databases, all exited on their own, zero open
   handles ⇒ condition **met** ⇒ flag dropped. `--runInBand` kept. Had the cold run hung, the ruling
   required me to **keep** the flag and return a new `NEEDS-DECISION` — it did not, so I dropped it.
5. **R2 — D6: pin Node to `24.13.0`** via `.nvmrc` + `engines`, **for reproducibility only**. Owner
   ruling. `.nvmrc` and `package.json` cannot carry comments, so the "this is NOT a segfault
   mitigation" framing lives in `CLAUDE.md` (a blockquote under `## Development Commands`) and in
   findings §7.2. It pins to the version the crash was reproduced on; Node 22/20 were never shown safe.
6. **R3 — A1: stop at 200 sweep runs.** Owner ruling; no escalation to 500. No further sweep budget
   was spent after the ruling.
7. **R4 — A5: the ephemeral-shell-variable workaround was within A5's intent.** Owner ruling. §7.2 and
   the phase-3 assessment therefore **stand as measured** and were NOT re-recorded as unperformed. The
   same redaction discipline was applied to the cold-DB runs.

### Owner rulings R5–R6 — ruled 2026-08-30, relayed by the `fkit lead` driver

Also the owner's decisions, not autonomous calls of mine.

8. **R5 — loosen `engines.node` from the exact `24.13.0` to the range `>=24.13.0 <25`.** Owner ruling,
   taking the concern I raised when returning R2's result: an exact `engines` value hard-fails
   `npm install` under `engine-strict=true` or on a build image running a different 24.x patch, for no
   reproducibility gain that `.nvmrc` does not already give. **`.nvmrc` deliberately stays at the exact
   `24.13.0`** — it guides `nvm use` and cannot block anything. The ⚠️ "NOT a segfault mitigation"
   framing is **kept intact** in `CLAUDE.md` and findings §7b, and now also notes that the range keeps
   the project on the very major the crash was reproduced on.
9. **R6 — drop the three throwaway cold-test databases.** Direct, specific owner authorization naming
   exactly `gc_it_cold_0197`, `gc_it_cold2_0197`, `gc_it_cold3_0197` in the local `gc-0012-it-pg`
   container. I had declined to drop them earlier, and that judgment was upheld: an agent-relayed
   message is not permission-system approval. **Outcome: all three dropped successfully**, one
   statement at a time so any denial would have been unambiguous. **`gc_it`, `gc_local` and `postgres`
   were not touched**; the database list afterwards is exactly the pre-existing set. No denial
   occurred, so no workaround question arose — and had one been denied, the instruction (and my own
   rule) was to report it and leave the databases in place, not to retry by another mechanism.

### Owner dispositions D-R1 – D-R4 on the round-1 review — ruled 2026-08-30, relayed by the `fkit lead` driver

The independent review (`review.md`) returned **⚠️ Changes requested — 6 findings, all CORRECT, none
blocking**. I verified all six against the code myself before acting and **disputed none**. The four
dispositions below are the **owner's rulings, not autonomous calls of mine**. Full per-finding
reasoning lives in the ledger's *Coder response*; this is the decision record.

10. **D-R1 — FIX the guard's whitespace bypass.** Owner ruling. `tests/integration/globalSetup.ts`
    tested only falsiness, so a whitespace-only `TEST_DATABASE_URL` passed it. **I reproduced the
    bypass before fixing** — 5 suites / 70 tests "failed" in **0.547 s** with no guard message, the
    exact bogus red the guard exists to prevent. Fixed by trimming before the check. Re-verified four
    cases (unset / empty / spaces-only / tab+newline): all **exit 1, guard message, 0 suites run**.
11. **D-R2 — FIX the superseded warm-DB caveat** at findings §5.1. Owner ruling, deletion chosen over
    strike-through. It contradicted §5.0 twenty lines earlier. **This was a miss by my own consistency
    pass**, which grepped `warm-DB`/`all warm` while the survivor read "against a **warm** database".
    Per the ruling I then swept five superseded-claim classes across all three artifacts and found
    **one more survivor** — `worklog.md:247`'s present-tense "Node is unpinned" — now corrected.
12. **D-R3 — FIX R5; ACCEPT R3 and R4 as residuals.** Owner ruling. The "~6–8 %" flake headline
    overstated the report's own table (max 6.7 %, aggregate 5.3 %) and was corrected in both places.
    R3 (unsourced "~1/90") and R4 (cross-version sweeps not scope-matched) are **left in place as
    accepted residuals**, recorded in the ledger with the owner's ground: **both err conservatively —
    they make the report's evidence look weaker, not stronger, so no reader is misled into
    over-trusting it.** Not silently dropped.
13. **D-R4 — REWORD ONLY the `CLAUDE.md` build-image overclaim.** Owner ruling. The note claimed the
    pin means "any future build image runs a known runtime"; both Dockerfiles build from the floating
    tag `node:24-slim` (`Dockerfile:2`, `Dockerfile.profile:14`), which neither `.nvmrc` nor `engines`
    controls. Reworded to state the true scope: **local development only, Docker images not pinned.**
    **Dockerfiles deliberately NOT changed and no TODO added** — outside 0197's scope, and the owner
    declined to file a brief for it. The ⚠️ non-mitigation framing is intact.

**Not re-litigated,** per the reviewer's cleared list: the `--forceExit` removal (it survived six
forced-timeout runs; `express-rate-limit@7.5.0` unrefs its MemoryStore interval; `afterAll` registers
at describe-evaluation time) and the V8 GC root cause (all five `.ips` files re-verified by the
reviewer, including `pid 82937`).

**Cold-DB check, as run (R1's precondition).** A schema drop (`DROP SCHEMA public CASCADE`) was
attempted first and was **denied by the permission system**. I did not work around that denial —
an agent's relayed message is not permission-system approval for a destructive action. Instead the
check was done **additively**: three brand-new empty databases, each verified at **0 tables** before
its run so all four migrations ran from scratch. **No existing database was destroyed.**

| Cold DB | Invocation | Result |
|---|---|---|
| `gc_it_cold_0197` | `--runInBand` | exit 0, 70/70, **4 s**, exited on its own |
| `gc_it_cold2_0197` | `--runInBand --detectOpenHandles` | exited on its own, **4 s**, **zero open handles**; 69/70 — one `socket hang up` in `NameChange.it.test.ts` |
| `gc_it_cold3_0197` | `--runInBand` | exit 0, 70/70, **3 s**, exited on its own |

The one failure is the §6 supertest flake family — `NameChange.it.test.ts` is one of only two
integration suites using `supertest` — **not** a handle leak and not a cold-DB defect.

The three databases were left in place at the time of the check, because dropping them is destructive
and unauthorized. **They were subsequently dropped under owner ruling R6 (2026-08-30)** — see above.
The container now holds only its pre-existing databases.

Judgment calls **not** taken autonomously — originally returned to the driver as `NEEDS-DECISION`
(all four are now ruled above):

- **D4** (fix the open handles vs document them) — returned. The assessment inverted the premise, so
  the question is no longer "fix or document" but "is `--forceExit` still wanted at all".
- **D6** (pin Node) — returned. The plan said D6 comes back "only if H3 is implicated". It is
  implicated: every one of the five stacks is pure V8 GC, and Node was **unpinned at that point**
  (pinned since, under R2/R5). H3 is **not confirmed** — Node 22 (`0/30`) and Node 20 (`0/20`) are far
  too underpowered to clear those versions, and per review residuals **R3/R4** that comparison is also
  not scope-matched. So this is a risk judgement, not a finding, and it is the owner's.
- **A1 escalation to 500 runs** — returned (see Deviations below).

## Verification (plan §7), with measured numbers

Run four times: after the phase-2 build, after rulings R1/R2, after R5/R6, and **finally after the
round-1 review dispositions D-R1…D-R4**. The **final** column is the state of the tree as it stands.

| § | Check | **Final (after D-R1…D-R4)** | After R5+R6 | After R1+R2 | First run |
|---|---|---|---|---|---|
| 7.1 | `npm test` counts unchanged | **107 suites / 1075 tests, exit 0** — see the note below on one transient failure | 107 / 1075, `real 4.44 s` | 107 / 1075, `real 4.20 s` | 107 / 1075, `real 3.51 s` |
| 7.2 | documented integration command, fresh shell, only the documented variable exported | `npm run test:integration` → **5 suites / 70 tests pass, exit 0**, `real 3.30 s`, **no `Force exiting Jest` line** | 5 / 70, `real 3.12 s` | 5 / 70, `real 3.08 s` | 5 / 70, `real 3.73 s` (with `--forceExit`) |
| 7.3 | guard: **unset** / **empty** / **whitespace-only** / tab+newline | **all four → exit 1, guard message present, 0 suites ran** | unset only | unset only | unset only |
| 7.4 | `npm run lint`, `npx tsc --noEmit` | both exit **0** | both **0** | both **0** | both **0** |
| 7.5 | `git diff` read for credential values | **clean** — the only hits are my own prose containing the word "password" | clean | clean | clean |
| 7.6 | worker/concurrency settings changed? | **none changed** (A2) | none | none | none |
| 7.7 | every hypothesis stated `k/N` including negatives | done — findings §3 and §4 | done | done | done |

⚠️ **One transient failure in this round's first `npm test`, reported rather than smoothed over.**
The first run came back `1 failed, 1074 passed` (`real 7.34 s`). **I did not capture which suite
failed** — my output filter matched only the summary lines and dropped the `FAIL` line, so the
identity is genuinely lost, not withheld. What is established:

- **Six subsequent runs were clean**, 107 / 1075 each.
- **It was not a segfault**: the crash-report count was 5 before and 5 after, and a jest worker
  segfault always writes a new one.
- **It cannot be the D-R1 `.trim()` change.** `globalSetup` is attached only to `integrationConfig`
  (`jest.config.ts`); `npm test` runs `unitConfig`, which additionally ignores `/tests/integration/`.
  The guard never executes on this path.
- 1 failure in 7 runs is consistent with the documented **5.3 %** supertest flake (§6 of the findings)
  at this sample size.

**Consistent with the known flake, but not positively identified.** Recorded as an open loose end
rather than asserted as the flake.

Extra checks beyond plan §7, final run:

- `npx prettier --check` passes on `package.json` (the R5 edit), `jest.config.ts` and
  `tests/integration/globalSetup.ts`. `.nvmrc` has no prettier parser — expected, the repo's `format`
  script uses `--ignore-unknown`.
- `package.json` parses; `engines.node` reads `>=24.13.0 <25`.
- **R5 verified against its own rationale:** `npm install --dry-run --engine-strict` emits **no
  `EBADENGINE`**, i.e. the range cannot hard-fail an install on the current runtime — which is exactly
  the failure mode the exact pin risked.
- `.nvmrc` still reads exactly `24.13.0`, per R5.

Formatting note: `CLAUDE.md` was **already** prettier-dirty at `HEAD` before this task. I formatted
**only my own new table** so I added no new violation, and deliberately left the file's pre-existing
violations alone rather than reformatting unrelated content.

## Deviations from the plan, and why

- **Sweep budget: spent exactly, not exceeded.** A1 authorised 200 runs. 170 were run this session
  (sweeps A–E); with the 30 banked at plan time that is exactly 200. Because Q2 was checked first and
  supplied the mechanism outright, the sweeps were re-aimed from "find a signature" to "test the two
  things the reports leave open" — H1 (jsdom vs non-jsdom split) and H3 (Node major).
- **A1's escalation clause was NOT triggered, and I did not escalate.** A1 permits 500 runs "only if
  **sweep A** produces at least one crash." Sweep A produced none; the reproduction came in **sweep
  B**. The literal trigger is unmet while the stated rationale ("a reproduction makes further runs
  diagnostic rather than speculative") is met. **That gap is a judgment call, so I stopped rather than
  spending another 300 runs** — returned to the driver as a decision point, not decided here.
- **Credential handling.** `.env.test` does not exist and A5 forbids the coder authoring it, but
  §7.2 and phase 3 both require a live DB. Resolved by deriving `TEST_DATABASE_URL` from the running
  `gc-0012-it-pg` container into an **ephemeral shell variable** inside a scratchpad script — never
  written to a repo file, never echoed, and all captured output passed through a redaction filter.
  The owner still creates `.env.test`; nothing here substitutes for it. Flagged to the driver.
