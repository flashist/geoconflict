# Worklog — 0200 Confirm and fix the `supertest` profile-server flake

Build step, 2026-09-01. Spawned `fkit-coder` as the **Build worker** of the lead's
`/fkit-sprint-ship-loop`, implementing the owner-approved `plan.md` (owner rulings **R1–R3** binding).

Findings report: `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`

Plan carried both ways and verified on disk before any work:
`git hash-object plan.md` → `4a1b366d58fb6ac95bed411dc65dcdf6391b23ad`, `wc -c` → `32655`. **Matches the
driver's pointer exactly.**

---

## Headline

**The mechanism is CONFIRMED, and it is not any of the three mechanisms the brief and plan led with.**

A supertest request does this, per call, ~95 times per full run:

```
http.createServer(app)  →  server.listen(0)  →  read server.address().port  →  http.request(...)
```

all in **one synchronous tick**. Roughly **1 request in 450** (measured jest-free: 112 hangs /
50 000) completes its TCP handshake against that freshly-listened socket — the client sees
`connect` **and** `ready`, with `remotePort` set — while **the server never emits `connection`**. The
request is never answered and never errors. Jest's default 5 000 ms per-test timeout then fires, which
is why every symptom in this family reports as `Exceeded timeout of 5000 ms` regardless of cause.

And because supertest calls `server.close()` **only inside the response callback**
(`node_modules/supertest/lib/test.js:133-160`), a request that never completes leaves its ephemeral
server **bound forever** — which is the `Jest did not exit one second after the test run has completed`
message. **The hang is the same defect seen from a second angle, not a separate one.**

**Refuted on evidence, not inference:** worker contention (**H-A**), ephemeral-port recycling
(**H-B**), response cross-talk (**H-C**), and late completion (**H-D**) — see the ledger in the
findings report. **H-F** was already refuted at plan time. **H-G is confirmed.** I also raised and
then refuted my own **H-H** (libuv fd-reuse).

**Second headline, and the one that decides Phase 2: every fix candidate in plan §3 is refuted by
measurement.** Awaiting `listening`, guaranteeing `close`, yielding a loop turn, binding IPv4
explicitly, and — the plan's *leading* fix — **binding one shared server per suite instead of ~95**
all leave the rate at ~0.22 %, unchanged. `--runInBand` does not help either: **7 failures / 100**
serial full-suite runs.

**So there is no repository-side fix on the table.** This lands on plan §3.4 — a finding and a
recognition note — which the plan explicitly names a legitimate outcome. **The branch choice is
returned to the owner (D1, D4), not taken.**

⚠️ **The single most load-bearing negative:** the cheap 4-suite harness that reproduces this runs
**in ONE process**. `pids=1` in every captured trace. Jest's `shouldRunInBand` returns true for
`tests.length <= 20 && timings.length > 0 && areFastTests`
(`node_modules/@jest/core/build/index.js:3516-3522`), so **`--maxWorkers=4` is ignored** for four fast
suites once timings are cached. This flake needs **no second jest worker at all**.

---

## Chronology

### 1. Instrumentation (plan §2.1) — the load-bearing step, done first

Built a throwaway `--require` preload shim that patches **only core modules** (`http`, `net`). Jest's
sandbox resolves core modules to the real realm objects, so this reaches supertest and express
**without editing a single test file or source file**. Userland patching would not have worked — jest
gives test files their own `supertest`/`express` module instances.

Recorded per event, NDJSON, one file per pid: server create/listen/close **with fd**, `connection`
accept, express-preceding `request` arrival, response status + body for non-2xx, and client-side
request/socket/connect/ready/response/error with local and remote ports.

🔒 **No credential value is logged anywhere.** Header **names** only; `Authorization` is recorded as
`present|absent`. Bodies are captured only for non-2xx responses and truncated — those are
`{"error":"..."}` shapes.

Verified the shim fires inside the jest sandbox before trusting it (26 servers seen on one
`PaymentsRoutes` run).

### 2. It reproduced on smoke run 3 of 3, fully instrumented

`PaymentsRoutes.test.ts:85`, `Exceeded timeout of 5000 ms`, followed by `Jest did not exit`. The trace
showed exactly one client request with no response and no error, and **no `close` for its server**.

### 3. ⚠️ Harness fault — one arm contaminated, discarded, and recorded

An earlier `nohup … &` sweep (pid 16165) **survived** being reported "completed" by the harness, and a
second sweep then ran **concurrently** into the same arm directory. Both wrote the same
`summary.tsv`; machine load was doubled.

**That arm's rate is discarded, not reported.** Its logs and traces were retained as *qualitative*
evidence only, in the **session scratchpad — which is ephemeral and does not resolve from the repo
root.** ⚠️ Nothing in this report's conclusions rests on that arm; the durable evidence is the
reproducer, inlined at
`ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md` §9. This is the plan
§2.6 clause —
*"any run overlapping other work is recorded as such, not silently pooled"* — applied to my own
harness rather than to the machine.

Fix: `sweep.sh` now **refuses to start** if another `sweep.sh` is running. All strays killed and
verified gone before the clean baseline.

Worth one line, since it points the same way as the rest: that arm, at **double** load, failed ~13 in
~156 (~8 %) against the clean arm's 4 %. Suggestive of load-sensitivity, **not** reported as a
measurement — the arm is contaminated by construction.

### 4. Clean instrumented baseline — 6 / 150 (4.0 %)

Idle machine, guard in place, complete unfiltered output teed per run.

| | |
|---|---|
| Failing runs | **6 / 150 = 4.0 %** |
| Hangs (`did not exit`) | 5 |
| `Exceeded timeout of 5000 ms` | 5 |
| Suites hit | `NameChangeRoutes` ×2, `Routes` ×3, `PaymentsRoutes` ×1 |
| macOS crash reports | **5 before, 5 after — unchanged** |
| `0197` segfaults | **0** |

Consistent with the brief's 5.3 %. Crash-report parity is the check that keeps `0197`'s family out of
this rate, exactly as the brief demands.

### 5. The fd hypothesis I formed, and then refuted with my own data

I predicted a libuv fd-reuse race: server closes fd 12, next server immediately re-opens fd 12, and the
kqueue watcher registration is lost. Every failing trace **did** show the failing server on fd 12 with
the previous server closed on fd 12 one to three milliseconds earlier.

**It does not hold.** fd 12 is reused on essentially every iteration — `listen` fds across one run are
`{14: 90, 12: 11}`, so fd reuse is a **constant**, not a discriminator. And `run-125`'s failure was
**`sid 1`, the first server in the process, with no preceding close at all.**

Recorded because a negative is a finding, and because the pattern was genuinely persuasive before the
distribution was checked.

### 6. Jest-free reproduction — this is not a jest artifact

`variants.cjs`, plain Node, no jest, no express, no supertest: `createServer` → `listen(0)` → read port
→ `http.request({ agent: false })` in the same tick.

**112 hangs / 50 000 = 0.224 % per request**, 2 errors. **Every** hang carries `accepted: false` — the
server never accepted. Failures cluster in adjacent iterations (e.g. `i=14696,14697`; `i=15499,15500`).

This moves the mechanism out of jest, out of express, and out of the profile-server entirely.

### 7. Every candidate fix measured — and every one refuted

`variants.cjs`, 20 000–75 000 iterations per arm. **Variant A is what supertest does today.**

| Variant | Change | Rate |
|---|---|---:|
| A | none | 0.224 % |
| B | await `listening` + guaranteed close (plan §3.1 fallback) | 0.215 % |
| C | guaranteed close only | 0.240 % |
| D | one loop turn + close | 0.265 % |
| **E** | **ONE shared server reused for every request (plan §3.1 MAIN branch)** | **0.22 %** |
| G | IPv4-bound listen (`127.0.0.1`) | 0.215 % |

**Not one of them moves the rate.** E is the important one: the plan's leading fix — the one whose
test-isolation cost (**D1**) it flagged for the owner — **does not work.** The ~95 binds per run are
not the cause.

I checked E for the obvious confound (client-port wrap colliding with `TIME_WAIT` on a fixed server
port) and it is not that: E's hang curve is **linear from iteration 0**, with no knee at the ~16 000
wrap point (6 hangs by 5 000, 32 by 15 000, 96 by 40 000, 165 by 75 000).

### 8. The brief's `--runInBand` discriminator — run, and it says "no"

| | Parallel `--maxWorkers=13` | Serial `--runInBand` |
|---|---:|---:|
| Flake failures | **4 / 100 (4.0 %)** | **7 / 100 (7.0 %)** |
| `0197` segfaults (classified **out**) | 1 | 0 |
| Median clean run | 3 s | 5 s |

**The flake survives serial execution.** H-A predicted ~0. At N = 100/arm the *direction* of 4 → 7 is
not supported (intervals overlap), but *"it does not vanish"* is.

The one segfault was `tests/AllianceRequestExecution.test.ts` — a **core** suite, `signal=SIGSEGV`,
crash reports 5 → 6. `0197`'s family, counted separately, never pooled in.

⚠️ `socket hang up` appeared 6 times across these two uninstrumented arms and **0 times** in any
instrumented arm — so that sub-shape was never traced. The family may have more than one
sub-mechanism; the report says so rather than smoothing it over.

---

## Decision log

Each entry: what I decided, why, and — where it applies — why it qualified to be done without asking
under the sprint-loop standing approval (verified `CORRECT` + mechanical/localized + inside the
approved plan, or obvious-winner-within-intent).

1. **Instrument via a core-module `--require` preload rather than editing test files.** Qualifies:
   inside plan §2.1, which explicitly requires "no test file and no source file is edited". Not a
   judgment call — the plan specifies the shape.
2. **Discarded the contaminated arm's rate rather than reporting it.** Qualifies: plan §2.6 states the
   rule directly. Reporting a double-load arm as a rate would have been the error.
3. **Added a concurrency guard to the throwaway harness.** Qualifies: mechanical, scratchpad-only,
   nothing ships from there (plan §5).
4. **Refuted my own fd-reuse hypothesis and recorded it** rather than presenting the fd-12 correlation
   as the mechanism. Qualifies: plan §2.5 requires falsification criteria and §2.6 forbids
   manufacturing a mechanism.
5. **Budget reading, stated rather than assumed** — see below. **Not** taken as licence to spend
   freely.
6. **Ran the `--runInBand` discriminator even though H-A was already refuted.** Qualifies: brief
   verification 1 names it explicitly and requires its power stated. Re-testing a refuted hypothesis
   was worth 200 runs *only* because the full suite genuinely uses 13 workers where the cheap harness
   does not — I said so rather than skipping it silently.
7. **Kept variant E running to 75 000 rather than stopping at the 2 000-iteration smoke that showed
   0 hangs.** The smoke would have reported the plan's main fix as *working*. Qualifies: plan §2.6
   forbids manufacturing a mechanism, and reporting a fix on n=2 000 against a 0.22 % rate would have
   been exactly that. **This is the single call in this task that most changed the outcome.**
8. **Did NOT write the variant-B leak fix, though it is arguably "in the approved plan".** Judgment
   call, so it **stops here**: §3.1 offers that fallback on the rationale *"fixes the leak … its value
   depends entirely on which of the two Phase 1 confirms"*, and Phase 1 confirmed **neither**. Writing
   ~95 call-site edits across four suites on a refuted rationale is a behavior-changing, non-localized
   change outside the plan's confirmed intent. **Surfaced as Option 2, not taken.**
9. **Phase 2 branch selection: surfaced, not taken.** D1 and D4 returned unanswered → **owner ruled
   Option 1** (above).
10. **Wrote the recognition note into `CLAUDE.md`.** Qualifies: directly ruled by the owner (Option 1),
    plan §3.4, and §5 lists `CLAUDE.md` as a file this task may touch for exactly this purpose. Not a
    judgment call — the branch was chosen for me.
11. **Added one unrequested clause: "this is the unit path, unrelated to the integration suite's
    no-`--forceExit` rule below."** Qualifies as mechanical/localized and inside the ruled branch —
    plan §0.4 identified the collision, and the new note sits ~30 lines above the rule it would
    otherwise appear to contradict. Flagged here rather than slipped in.
12. **Kept the note to one screen.** Judgment, but a cheap and reversible one: `CLAUDE.md` is read
    constantly and this is one family of test failures. Everything long lives in the findings report,
    which the note links.
13. **Did NOT add the fifth-symptom (`401`) row to the brief.** That is the producer's edit; the
    driver is routing it. I also did not soften the `401` into "explained" anywhere — it is marked
    unexplained in the note, the report (§5.2) and here.

### Round 2 — stateful review (`review.md`), 10 findings

Verdict ⚠️ Changes requested, 3 high, none blocking. **Codex coverage FULL** (`codex-cli 0.152.0`,
exit 0, 7 findings) — not a degraded review. Every finding verified against the files **before** any
edit. **All 10 accepted; 9 in full, R10 in part.** No sweep was re-run — the measurements were never in
question, only the wording.

14. **R1 (high) — "the only `supertest` suites in the repo" is false. ACCEPTED, verified.**
    `grep` returns **seven** importers; `tests/server/Master.test.ts:29` is on the default `npm test`
    path (`jest.config.ts` `testRegex` ignores only `/tests/integration/`), plus
    `tests/integration/{Routes,NameChange}.it.test.ts`. Fixed: the note's **Where** line now names all
    seven. ⚠️ **I inherited this from `0200`'s own brief and did not check it** — the note's whole
    purpose is to stop a reader misfiling a shape, and as written it told a reader hitting one in
    `Master.test.ts` that this family could not apply. Qualifies: verified-`CORRECT`, single-sentence,
    inside the ruled branch.
15. **R2 (high) — "nothing to do with the integration suite" contradicts `0197`. ACCEPTED, verified.**
    `2026-08-29-0197-...-findings.md:249-251` assigns a `socket hang up` in `NameChange.it.test.ts` to
    **this** family. Per the coordinator I **re-worded rather than deleted** — the `--forceExit`
    disambiguation was worth keeping, the scope claim was not. The note now says the rule below is
    about leaked `pg` handles *and* that this family reaches the integration suites, so a hang there
    is *possibly this*.
16. **R3 (high) — untraced `socket hang up` folded into "confirmed"; worklog claimed a caveat it never
    wrote. ACCEPTED, verified.** Fixed in **all three** artifacts: the note's table marks it
    `seen, never traced`; the report gains §5.3; the false worklog line is corrected and the error
    named. The plan's two-trace bar was met — **for the timeout sub-shape only** — and the report and
    note now say which sub-shape "confirmed" covers.
17. **R4 (med) — `404` and CORS are response-bearing like the `401` and were not carved out.
    ACCEPTED, verified.** §4.2's table shows neither occurred in any arm. The report's §5.1 disposal
    of the `404` was circular and is now labelled a correction; §5.2 is retitled to cover **three**
    shapes with a table. The note's table groups all three as `mechanism unknown`.
18. **R5 (med) — crash-report count replaced `0197`'s stack signature. ACCEPTED, verified.**
    `0197:389-394` gives the rule as *a `node-*.ips` whose stack starts at
    `ClearStaleLeftTrimmedPointerVisitor`*, and states plainly that **"a red run stays ambiguous"**.
    My "count unchanged ⇒ this flake" inverted that into a positive identification. The note now uses
    the stack signature and says *likely, not certain*. **The command was fine; the interpretation was
    the defect** — I did not change the command.
19. **R6 (med) — "all refuted" erased H-G's confirmation that `close` fixes the leak. ACCEPTED.**
    The note now carries the exception explicitly: guaranteeing `close` **does** fix the
    `did not exit`, was declined on cost (~95 call sites), not because it fails.
20. **R7 (med) — report stale against the shipped state. ACCEPTED.** §0, §7.1 and §8 now record the
    Option 1 ruling, the three declined options with reasons, and that the note exists — so
    `CLAUDE.md`'s "Full evidence" link no longer lands on a document claiming the decision is open.
21. **R8 (med) + owner ruling D1 — reproducer inlined. APPLIED AS RULED.** Pasted verbatim into the
    report as **§9**, with a note that it is deliberately **not** committed as a runnable file (owner's
    reason: a file nothing runs is how `0201`'s harness rotted). The dangling
    `scratchpad/contaminated/...` pointer is replaced with a statement that the arm was ephemeral and
    that **no conclusion rests on it**.
22. **R9 (low) — "4–5 %" against the report's own 7.0 %. ACCEPTED.** Now "4.0–7.0 %" with the three
    arms cited. Did not propagate to the note, which was already right at "~4–7 %".
23. **R10 (low) — PARTIALLY ACCEPTED, and I am recording why the rest does not apply.**
    **Valid half, applied:** the reproducer scores a hang at 2 000 ms and jest at 5 000 ms, so requests
    completing between 2 s and 5 s count as hangs in one and passes in the other. That is a live,
    unexcluded explanation for the 4× rate gap, and §3.3 now names it and says it was not excluded.
    **Half that does not apply:** the reviewer suggested the watchdog runs only "partially" cover this.
    For the *rate gap* they do not cover it at all — but for **H-D** they cover it completely, and H-D
    is the claim that matters. All five `--runInBand` hang runs ran to the **full 90 s watchdog**
    (90/90/90/90/91 s). Had the request completed before 90 s, supertest's response callback would have
    closed the server and jest would have exited. **H-D's refutation stands and is not weakened**;
    §3.3 now says so. I did not soften H-D.

### Round 2 — judgment calls, and the one I did NOT take

24. **D2 proportionality — trimmed the note as ruled, and it is shorter *and* stronger.**
    **42 → 32 content lines** (`git diff --numstat` +33/−0 including the trailing blank);
    **12.4 % → 9.7 %** of the file. Achieved by moving the refuted-fix **rate figures** and the
    epistemics paragraph into the linked report, and by replacing prose with one status table that
    carries R3's scope limit and R4's three shapes in four rows. **Every caveat survives**: scope of
    "confirmed", the four unexplained shapes, the R6 exception, one-host (compressed to one clause,
    not dropped).
    ⚠️ **I first wrote "42 → 33" into this log and into `review.md` before measuring it, and the real
    figure after a second compression pass is 32.** Caught by my own verification, corrected in both.
    Worth recording rather than quietly fixing: it is the *same* error class as R3 — asserting a
    number I had not checked — inside the round that was fixing R3.
25. ⚠️ **I did NOT edit `CLAUDE.md`'s existing integration-suite rule, and R2 arguably leaves a residual
    tension there.** That rule (*"If this suite starts hanging, that is a real regression —
    investigate it, don't add the flag back"*) was written by `0197`, and this family can now cause a
    hang there. My note states the interaction and sits **above** that section, so a reader going top
    to bottom is covered — but a reader landing directly on the integration section is not. Editing
    another task's rule is outside the ruled branch and is a judgment call, so I **stopped and
    surfaced it** rather than taking it. **Carried to the driver.**
26. **Did not re-run any sweep**, per the explicit instruction and R2's budget. Every number in the
    corrected artifacts is the number already measured; nothing was re-derived or re-stated as new.

---

## Phase 2 — owner ruling, 2026-09-01

**OPTION 1 — recognition note only, no code change. RULED** by the owner via `AskUserQuestion` in the
`fkit lead` session, relayed by the sprint driver. This settles **D1** and **D4**, the two decisions
R1 reserved. My recommendation was taken as written.

**Explicitly declined, recorded so nobody re-opens them as if they were merely unexplored:**

| Declined | Owner's stated reason |
|---|---|
| **Option 2** — fix the leak (variant B) knowingly | ~95 call sites for a partial win, on a rationale measurement has refuted. **Variant B was not written.** |
| **Option 3** — escalate upstream | Declined *for now*, on my own stated blocker: one host, no CI, cannot be established here. |
| **Option 4** — keep investigating | Declined. The untraced `socket hang up` sub-shape **stays recorded as untraced**, not chased. |

### What was written

One new subsection in `CLAUDE.md`, `### ⚠️ Known flake — the four supertest profile-server suites`,
placed inside `## Testing` immediately before `### Integration tests (real Postgres)` — where someone
staring at a red run will actually look.

It carries all eight required items: the five signature shapes; the four-suite confinement; the
`Jest did not exit` companion named as **the same defect**; the crash-report check that separates this
family from `0197`; the mechanism as **confirmed and not a repository defect**; the refuted fixes
**with their rates**, so a future reader does not re-attempt them; the `401` marked **not explained**;
and the one-host ceiling.

One thing I added that was not on the list: an explicit line that this hang is on the **unit** path and
is unrelated to the integration suite's `--forceExit` rule sitting a few lines below it. Plan §0.4
flagged that collision, and without the boundary the new note would read as contradicting the existing
one. **Mechanical and localized, inside the ruled branch** — a one-clause disambiguation of the note
I was told to write, not a new claim.

**`CLAUDE.md` is the only file edited in Phase 2.** No test file, no source, no `jest.config.ts`, no
`package.json`, no brief, no commit.

---

## Budget accounting (owner ruling R2)

R2 fixes the ceiling at **500 cheap-harness runs + 200 full-suite parallel runs**, "exactly as §2.6
registers it".

**How I read it, said out loud because it changes what I was allowed to spend:** §2.6 scopes that
ceiling to the *non-reproduction* branch — *"If it does not reproduce at all: the pre-registered
ceiling is 500 cheap-harness runs … plus 200 full-suite parallel runs"*, whose stated purpose is to
bound the rate when zero failures are seen. The programme as a whole is budgeted separately at ~1300
runs in §2.7, which R1 approved as written. **I have therefore treated 500+200 as the abort rule for
the hunt, not as a cap on the approved programme.** The distinction never became load-bearing: the
flake reproduced on smoke run 3, so the abort rule was never approached.

Cheap-harness jest runs consumed:

| Arm | Runs | Status |
|---|---:|---|
| Smoke | 3 | reproduced on run 3 |
| Aborted first hunt | 15 | 15/15 clean; killed |
| Contaminated hunt | ~156 | **rate discarded** |
| `fdcheck` | 1 | shim validation |
| Clean baseline `base_instr` | 150 | **6/150** |
| **Total cheap-harness** | **~325** | of the 500 hunt ceiling |

Full-suite runs (§2.2 discriminator, separately budgeted at 200 in §2.7):

| Arm | Runs | Result |
|---|---:|---|
| `full_par` (`--maxWorkers=13`) | 100 | 4 flake + 1 segfault |
| `full_band` (`--runInBand`) | 100 | 7 flake + 0 segfault |
| **Total full-suite** | **200** | exactly the §2.7 allocation |

The `variants.cjs` iterations (50 000 + 20 000 × 3) are **jest-free single requests**, not jest runs,
and are not counted against a budget denominated in jest runs.

---

## Status of the work

Phase 1 **complete**, mechanism **CONFIRMED**. Phase 2 **complete** on the owner-ruled §3.4 branch:
the recognition note is written to `CLAUDE.md`, and **no code fix was attempted** because every
candidate was refuted by measurement.

Nothing in `src/` was touched. No test file was edited. No config was changed. No brief was edited.
Nothing was committed. `0200`'s status remains `🔄 In progress` — the driver owns it.

**Carried forward, unresolved and deliberately so — FOUR of the five shapes, not one:** the `401`, the
unexpected `404` and the missing `access-control-allow-origin` are all **response-bearing**, so the
confirmed no-response mechanism cannot produce any of them, and none occurred in any `0200` arm. The
`socket hang up` sub-shape *did* occur (6 times) but only in uninstrumented arms, so it was **never
traced**.

**"Mechanism confirmed" covers the timeout sub-shape and its `Jest did not exit` companion. Nothing
else.** All four open shapes are recorded as such in `CLAUDE.md`'s table, the findings report (§5.2,
§5.3) and here. None is claimed as explained.

⚠️ **An earlier version of this line said all of that was "recorded as open observations in the note"
— which was FALSE at the time:** the note carved out only the `401`. Round-1 review R3 caught it. That
is the `0068` error class — a caveat asserted in one artifact and absent from the authoritative one —
reproduced inside the note written to prevent it. Both the note and this claim are now fixed.
