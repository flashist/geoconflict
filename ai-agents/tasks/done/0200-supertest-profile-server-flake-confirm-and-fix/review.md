# Review — 0200

Task: `ai-agents/tasks/backlog/0200-supertest-profile-server-flake-confirm-and-fix/brief.md`
File(s) under review:
- `CLAUDE.md` (new subsection, lines 179–219, +42/−0 purely additive)
- `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md` (new)
- `ai-agents/tasks/backlog/0200-supertest-profile-server-flake-confirm-and-fix/worklog.md` (new)

Status: in-review

**Round 1.** Reviewers run: **fkit-reviewer (Claude)** + **Codex adversarial pass** (`codex-cli 0.152.0`,
`--sandbox read-only`) — **both completed, coverage is full**.

**Verdict: ⚠️ Changes requested — 10 defects (3 high, none blocking a code path).**
No source or test file was changed, so nothing here can break the build. Every finding is an **accuracy
defect in an authoritative document**. Three of them mis-scope the failure family in `CLAUDE.md` — which
is the exact error class (`0068`'s `SIGSEGV` misrecording) that this note exists to prevent.

---

## Reviewer findings

| #   | Round | Sev | file:line | Claim |
|-----|-------|-----|-----------|-------|
| R1 | 1 | high | `CLAUDE.md:181-182` | "the only `supertest` suites in the repo" is false — seven test files import supertest, three of them outside the four named. |
| R2 | 1 | high | `CLAUDE.md:190-191` | "this is the **unit** path; it has nothing to do with the integration suite" contradicts `0197`'s recorded finding that this same family hit `tests/integration/NameChange.it.test.ts`. |
| R3 | 1 | high | `CLAUDE.md:184,193` | The untraced `socket hang up` sub-shape is folded into the "confirmed" mechanism; its unknown status is in the report and worklog but **not** in the note. `worklog.md:315` wrongly claims it is. |
| R4 | 1 | med | `CLAUDE.md:184-185`; report `:250-252` | The `404` and missing-CORS shapes are response-bearing, so the confirmed no-response mechanism cannot produce them either — but only the `401` is carved out. Report §5.1 disposes of the `404` with a non-sequitur. |
| R5 | 1 | med | `CLAUDE.md:199-203` | The crash-report discriminator replaces `0197`'s stack-signature rule with a count delta, and its "count unchanged ⇒ this flake" reading is over-broad — `0197` explicitly says a red run stays ambiguous. |
| R6 | 1 | med | `CLAUDE.md:209-211` | "guaranteeing `close`" / "awaiting `listening`" are listed flatly as "all refuted", losing the report's own confirmed finding that they **do** fix the `Jest did not exit` leak. |
| R7 | 1 | med | report `:29,317-320,326-329` | The report is stale against the shipped state: it says Phase 2 was not taken, D1/D4 are unanswered, and status is `🔄 In progress` — while `CLAUDE.md:218` links it as "Full evidence". |
| R8 | 1 | med | report `:112`; `worklog.md:91-93` | The load-bearing reproducer (`variants.cjs`) is not preserved — it lives only in an ephemeral session scratchpad, and the worklog's evidence path does not resolve from the repo. |
| R9 | 1 | low | report `:164` | Internal rate drift: "The observed jest per-run rate is 4–5 %" against the same report's 7.0 % serial arm (`:180`). Does not propagate — `CLAUDE.md:182` says "~4–7 %", which is right. |
| R10 | 1 | low | report `:165` | The 4× harness-vs-jest gap is attributed solely to loop aggressiveness, without addressing the competing explanation that the harness's hang threshold is 2000 ms vs jest's 5000 ms. |

---

### R1 — `CLAUDE.md:181-182` · high · **Defect** · raised by both reviewers

> "`tests/profile-server/{NameChangeRoutes,InboxRoutes,PaymentsRoutes,Routes}.test.ts` — the only
> `supertest` suites in the repo"

**False.** Seven test files import supertest:

| File | supertest requests |
|---|---:|
| `tests/profile-server/NameChangeRoutes.test.ts` | 31 |
| `tests/profile-server/InboxRoutes.test.ts` | 23 |
| `tests/profile-server/PaymentsRoutes.test.ts` | 22 |
| `tests/profile-server/Routes.test.ts` | 19 |
| **`tests/server/Master.test.ts:29`** | **5** |
| **`tests/integration/Routes.it.test.ts:10`** | **27** |
| **`tests/integration/NameChange.it.test.ts:10`** | **8** |

`tests/server/Master.test.ts` is on the **default `npm test` path** — `jest.config.ts:45-50` sets
`testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$"` and ignores only `/tests/integration/`. The two
integration suites drive `createApp()` through supertest in the identical pattern
(`tests/integration/Routes.it.test.ts:14,73,96`).

Impact is the note's whole purpose: a reader hitting one of the five shapes in `Master.test.ts` is told
by `CLAUDE.md` that this family cannot apply, and will misfile it. That is the `0068` failure mode.

### R2 — `CLAUDE.md:190-191` · high · **Defect** · raised by both reviewers

> "This is the **unit** path; it has nothing to do with the integration suite's no-`--forceExit` rule
> below."

**Half right, and the wrong half is load-bearing.** The half that is correct: the integration section's
`--forceExit` history was about open `pg` pool handles, a genuinely different thing — that
disambiguation was worth adding.

The half that is wrong: the family is **not** confined to the unit path, and this repo already recorded
it on the integration path. `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md:249-251`:

> "The single failing test in the cold `--detectOpenHandles` run was `socket hang up` in
> `NameChange.it.test.ts` — one of exactly **two** integration suites that use `supertest`. **That is the
> flake family characterized in §6**, not a handle leak and not a cold-DB defect."

So `CLAUDE.md` now contradicts an existing knowledge-base finding, in the note that cross-references
that very task. The concrete cost: `npm run test:integration` runs `--runInBand`, which this task
measured does **not** suppress the flake (7/100), while `CLAUDE.md:255-256` tells the reader an
integration hang "is a real regression — investigate it". Both cannot be right.

### R3 — `CLAUDE.md:184,193` · high · **Defect** · raised by both reviewers

The note lists `socket hang up` among five shapes of a family whose "**Mechanism is confirmed**"
(`:193`), and carves out **only** the `401` (`:214-215`). The report is much more careful
(`report:230-235`):

> "Every one of my six instrumented traces captured the *timeout* sub-shape … `socket hang up` appeared
> only in the two uninstrumented full-suite arms (6 occurrences) and was therefore **never traced**.
> `socket hang up` means the connection *was* established and then torn down before a response, which is
> **not** the same event as 'never accepted'. So the family may contain **more than one sub-mechanism**."

None of that reached `CLAUDE.md`. And `worklog.md:314-316` asserts:

> "the `socket hang up` sub-shape was never traced. Both are recorded as open observations **in the note**
> and the report."

**That is not true of the note.** The worklog claims a caveat it did not write. Two of three artifacts
mark it unknown; the authoritative one does not.

On the plan's confirmation bar: plan `:422-423` required "two independent traces of the same mechanism
before calling it confirmed", and §2.6 `:265-266` repeats it. **That bar was met** — six traces. But it
was met *for the timeout sub-shape only*, and the note applies the resulting "confirmed" label to all
five shapes. The bar is not the problem; the scope of the label is.

### R4 — `CLAUDE.md:184-185`, report `:250-252` · medium · **Defect** · raised by Codex, verified

The confirmed mechanism produces **no response at all** (`report:46-50`). A `404` body
("Expected: 400 / Received: 404") and a read of `access-control-allow-origin` both require a response
object to exist. The report applies exactly this reasoning to the `401` (`report:262-263`: "The mechanism
confirmed here produces **no response**, which cannot produce a `401`") — and then does not apply it to
the `404`, disposing of it instead at `report:251-252`:

> "The `404` shape never needed the body capture in the end: **no response is produced at all** on this
> path, so there is nothing to distinguish."

That holds only for the traced sub-shape; it is a non-sequitur applied to a shape defined by having a
response. Neither the `404` nor the CORS shape occurred in any `0200` arm — §4.2's table (`:221-225`)
counts only timeout / did-not-exit / socket-hang-up. Both are in the same epistemic position as the `401`
and neither is carved out, in either artifact.

### R5 — `CLAUDE.md:199-203` · medium · **Defect** · raised by Codex, verified

The **command itself is fine** — I checked `ls -1 ~/Library/Logs/DiagnosticReports/node-*.ips | wc -l`
against both zsh and bash; an unmatched glob prints `0` on stdout in both. The **interpretation rule** is
the defect, on two counts:

1. It replaces `0197`'s actual recognition rule with a count. `0197` findings `:389-391`: *"if a jest
   worker dies with `SIGSEGV`, check `~/Library/Logs/DiagnosticReports/` for a `node-*.ips` **whose stack
   starts at `ClearStaleLeftTrimmedPointerVisitor`**, re-run explicitly, and say so."* A count delta only
   shows *some* Node process crashed.
2. "Count unchanged ⇒ this flake" is over-broad and contradicts `0197` `:393-394`, which states plainly
   that **"a red run stays ambiguous"** and **"a *green* run is not proof no worker died."** An unchanged
   count rules the segfault family *out*; it does not rule this family *in* — a genuine regression also
   leaves the count unchanged.

### R6 — `CLAUDE.md:209-211` · medium · **Defect** · mine only

> "**Do not re-attempt these. All measured, all refuted** … one shared server per suite · awaiting
> `listening` · **guaranteeing `close`** · binding IPv4 explicitly · `--runInBand`"

Refuted **as flake fixes** — true. But the report separately **confirms** (H-G, `report:103`) that
guaranteeing `close` fixes the `Jest did not exit` leak, and says so explicitly at `report:305-310`
(Option 2): *"Variant B does not stop the flake but it does stop the `Jest did not exit` hang (H-G), by
guaranteeing `close`."* The owner declined it on **cost** (~95 call sites for a partial win), not because
it fails.

The unqualified "all refuted" therefore states something measurement did not show, and forecloses a real
(if declined) option for a future reader who is specifically chasing the hang.

### R7 — report `:29,317-320,326-329` · medium · **Defect** · mine only

The report was never updated after the owner ruled. It still reads:

- `:29` — "⚠️ **Decisions D1 and D4 are now live and are returned to the owner unanswered.** No code was changed."
- `:317-320` — "These are D1 and D4 from the plan, and R1 keeps both with the owner"
- `:326-329` — "**Phase 2 is not taken.** … `0200`'s status is left `🔄 In progress`."

Meanwhile the owner ruled Option 1 and the note was written (`worklog.md:231-264`). `CLAUDE.md:218` sends
readers to this report as **"Full evidence"** — and they arrive at a document asserting the decision is
still open and no note exists. The worklog is correct and current; the report is not.

### R8 — report `:112`, `worklog.md:91-93` · medium · **Defect (evidence preservation)** · mine only

The entire "not a repository defect" claim rests on a jest-free reproducer. That reproducer is not
preserved anywhere durable:

- `report:112` cites it as "`variants.cjs`" with **no path**. It exists only under the session-scoped
  `/private/tmp/claude-501/…/scratchpad/` — outside the repo, and garbage-collected with the session.
- `worklog.md:91-93` cites retained contaminated-arm evidence under
  `scratchpad/contaminated/hunt-CONTAMINATED-2-concurrent-sweeps/`. **That path does not resolve from the
  repo root** (`ls -d scratchpad` → no such file). A dangling evidence pointer.

I read `variants.cjs` and it is sound: variant A faithfully models supertest (synchronous `listen(0)`,
synchronous `address().port`, same-tick `http.request({agent:false})`), E shares one server, G awaits
`listening` before an IPv4 bind. It is worth keeping. Option 3 (escalate upstream), declined only *"for
now"*, cannot be reopened without it.

Whether to preserve it, and where, is the owner's call — I flag only that the note's strongest claim
currently cites evidence a future reader cannot obtain, and does not say so.

### R9 — report `:164` · low · **Defect** · raised by Codex, verified

§3.3 states "**The observed jest per-run rate is 4–5 %**" while §4 of the same report records the serial
full-suite arm at **7.0 %** (`:180`). `CLAUDE.md:182` quotes "~4–7 %", which matches the data — so this
does not propagate to the note. Report-internal only.

### R10 — report `:165` · low · **Defect (stated confidence)** · mine only

§3.3 attributes the 4× harness-vs-jest gap entirely to "the tight standalone loop is more aggressive than
jest". A competing explanation is not addressed: the harness scores a hang at **2000 ms**
(`variants.cjs:22`, `PER_REQ_TIMEOUT = 2000`) while jest scores at **5000 ms**, so requests completing
between 2 s and 5 s count as hangs in one and passes in the other. H-D's 30–90 s watchdog runs partially
cover this, but §3.3 does not say so.

Changes no conclusion — §3.3's operative instruction ("use 0.22 % only for comparing variants") is right
either way.

---

## Not a defect — a judgment call for the owner

**Proportionality of the note.** 42 lines is **12.4 % of a 340-line `CLAUDE.md`** for one family of test
failures. My read: justified in *kind*, oversized in *execution*. The recognition signature, the `0197`
discriminator and the "don't re-attempt" list earn their place — the `0068` misrecording cost a real wrong
turn, and that is the cost this note buys down. The refuted-fix rates and the two ⚠️ epistemics paragraphs
are report material that the linked report already carries.

Note the interaction: **R1–R6 all add required caveats**, so a correctness-first fix makes the note
*longer*. That strengthens the case for compressing elsewhere. The coder already flagged this as a
judgment call (`worklog.md:222-224`, decision 12); it is the owner's to settle, not a defect.

---

## Verified and cleared — do not chase these

Checked against the code and found **correct**; recorded so no one re-opens them.

- **`0197` cross-check is sound** (my scope item 7). The one segfault during the sweeps was
  `tests/AllianceRequestExecution.test.ts`, `signal=SIGSEGV`, crash reports 5 → 6 — a **core** suite, not
  a profile-server one, counted separately and never pooled into this rate (`report:185-192`). Evidence
  stated. Classification stands.
- **"~95 ephemeral servers per full run"** — exact: 31 + 23 + 22 + 19 = 95.
- **supertest closes only in the response callback** — `node_modules/supertest/lib/test.js:133-152`.
- **Synchronous `listen(0)` then `address().port`** — `lib/test.js:63,67`. The §3.2 sub-finding that
  supplying a host makes `listen` async is correct.
- **`superagent` sets `agent: false`** — `node_modules/superagent/lib/node/index.js:159` (report cites
  `:162`; off by three lines in this version, immaterial).
- **jest `shouldRunInBand`** — `tests.length <= 20 && timings.length > 0 && areFastTests`,
  `@jest/core/build/index.js:3519-3521`. Verbatim correct.
- **No route can answer `GET /v1/profile` with 401** — `internalAuth` is attached only at
  `Routes.ts:290,324,658,838` (all `/internal/*`); `Routes.ts:255-258` carries only `allowPublicCors` and
  `profileReadLimiter`. Report §5.2 is right.
- **The plan's confirmation bar was met** — plan `:422-423` / §2.6 `:265-266` asked for two independent
  traces; six were captured. (Scope of the resulting label is R3's subject, not the bar itself.)
- **Budget held.** ~325 cheap-harness (ceiling 500) + 200 full-suite. The worklog's re-reading of R2
  (`worklog.md:270-279`) never became load-bearing — the spend is inside R2's literal ceiling either way,
  and the worklog says so itself. No action.

## Re-litigates settled decisions (suppressed)

**None.** This is Round 1 on a fresh ledger; there are no accepted residuals yet, and no ADR in
`ai-agents/knowledge-base/decisions/` (101–109) touches test-flake scope.

## Convergence call

**Act, do not close out.** Every finding is novel, none re-litigates a settled tradeoff, and the three
high-severity ones are single-sentence factual corrections to a document — cheap to fix and expensive to
leave. R1/R2/R3 share one root cause: **the note asserts a narrower scope than the evidence supports**,
in the file most likely to be believed without checking. Fixing that root cause resolves all three.

No loop risk here. Round 2 should be a re-read of the corrected text, not a re-investigation — **the
measurements are not in question and must not be re-run** (R2's budget, ~1300 runs already spent).

## Coder response

**Round 1 processed 2026-09-01 by `fkit-coder` (Build worker, `/fkit-sprint-ship-loop`).**

**All 10 findings verified against the files before any edit. 9 accepted in full, R10 accepted in
part. 0 disputed.** No sweep was re-run — the measurements were never in question, only the wording.
No test, source, or config file was touched.

| # | Sev | Verdict | Class | Action |
|---|---|---|---|---|
| R1 | high | **CORRECT** | defect | Note's scope corrected — all **seven** supertest importers named |
| R2 | high | **CORRECT** | defect | Re-worded, not deleted: `--forceExit` disambiguation kept, false scope removed |
| R3 | high | **CORRECT** | defect | Fixed in all three artifacts; "confirmed" now scoped to the timeout sub-shape |
| R4 | med | **CORRECT** | defect | `404` + CORS carved out alongside the `401`; §5.1 non-sequitur labelled |
| R5 | med | **CORRECT** | defect | Stack signature restored; "likely, not certain" replaces the count rule |
| R6 | med | **CORRECT** | defect | `close`-fixes-the-leak exception restored to the note |
| R7 | med | **CORRECT** | defect | Report §0/§7.1/§8 brought current with the Option 1 ruling |
| R8 | med | **CORRECT** | defect | Reproducer inlined as report §9 (owner ruling D1); dangling path removed |
| R9 | low | **CORRECT** | defect | "4–5 %" → "4.0–7.0 %" with all three arms cited |
| R10 | low | **PARTIALLY CORRECT** | defect (stated confidence) | Valid half applied; see below |

### Verification notes worth recording

**R1** — `grep -rn 'from "supertest"' tests/` returns 7 files. `tests/server/Master.test.ts:29` is on
the default path: `jest.config.ts` `testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$"` with
`testPathIgnorePatterns` excluding only `/tests/integration/`. Confirmed exactly as claimed. ⚠️ The
error came from `0200`'s brief and I propagated it without checking — **the brief still carries it**
and that correction belongs to the producer at close, not to me.

**R2** — `2026-08-29-0197-test-suite-reliability-findings.md:249-251` verified verbatim: the
`NameChange.it.test.ts` `socket hang up` is *"the flake family characterized in §6"*. The reviewer's
"half right, and the wrong half is load-bearing" reading is exactly right.

**R5** — the reviewer explicitly cleared the *command* and faulted the *interpretation*. Verified
`0197:389-394`: the rule is the `ClearStaleLeftTrimmedPointerVisitor` stack, and *"a red run stays
ambiguous"* / *"a green run is not proof no worker died"*. I changed only the interpretation.

**R10 — the part I do not accept, with evidence.** The valid half is applied: the 2 000 ms vs 5 000 ms
threshold difference is a live, unexcluded explanation for the 4× rate gap, and §3.3 now says so.
But the finding suggests the watchdog runs only *"partially cover"* this. For **H-D** they cover it
fully: all five `--runInBand` hang runs ran to the **complete 90 s watchdog** (90/90/90/90/91 s), and
had the request completed before 90 s supertest's response callback would have closed the server and
let jest exit. **H-D's refutation is not weakened, and I did not soften it.** The threshold confound
affects only how many hangs the standalone harness *counts*, not whether requests complete — and it
cancels entirely in the A–G variant comparison, where the threshold is identical across all six arms.

### Changes made

- `CLAUDE.md` — note rewritten: **42 → 32 content lines** (+33/−0 by `numstat`), **12.4 % → 9.7 %** of
  the file, carrying *more* caveats than before (owner ruling D2). Verified by measurement, not
  estimate — an earlier draft of this section said "33" before I had counted it.
- `.../reports/2026-09-01-0200-supertest-flake-findings.md` — §0, §3.3, §5.1, §5.2, new §5.3, §7.1,
  §8, new **§9 (reproducer inlined)**.
- `worklog.md` — R3's false claim corrected and the error named, R8's dangling path replaced,
  decision log grown (entries 14–26).

### Surfaced, not taken — needs a decision

⚠️ **`CLAUDE.md`'s existing integration-suite rule may need a cross-reference.** R2 notes that
*"If this suite starts hanging, that is a real regression — investigate it, don't add the flag back"*
and this family can both cause a hang there. My note states the interaction and sits **above** that
section, so a top-to-bottom reader is covered; a reader landing directly on the integration section is
not. That rule was written by `0197`, so editing it is outside this task's ruled branch. **Left for the
owner/driver.**

⚠️ **`0200`'s brief still asserts "the only four in the repo using supertest"** (R1). Brief edits are
the producer's at close. **Carried, not fixed.**

## Accepted residuals (shared, do-not-re-litigate)

_(none yet — added once the owner disposes of the proportionality question and R8)_
