# Confirm and fix the `supertest` profile-server flake — 9 failures in 170 runs, four symptoms, one suspected cause

## ID
0200

## Sprint
Sprint 4

✅ **Sprint placement OWNER-RULED 2026-08-29** via `AskUserQuestion` in the `fkit lead` session, taking
the producer's recommendation. **Promoted from the Backlog board into Sprint 4**, alongside `0196` and
`0197`. Grounds accepted: the same rationale used to promote `0197` there on 2026-08-28, plus the
argument `0197` cannot make for itself — `0197`'s segfault is an **upstream V8 bug with no
repository-side fix**, while this one is in **our own test code at roughly ten times the rate**. The
earlier "unplaced — sprint placement has not been made" marker is **closed; no longer an open
question.** Its Backlog-board row is now `➡️ Moved` and points here.

## Priority
**Medium.**

✅ **OWNER-CONFIRMED 2026-08-29** via `AskUserQuestion` in the `fkit lead` session. **Medium was the
producer's rank and the owner confirmed rather than disturbed it** — the same distinction `0197`'s
brief records. The earlier "recommendation, not an owner ruling" marker is **closed.** The
counter-argument below is kept on the record deliberately; it was weighed, not removed.

Nothing here is player-facing and nothing in production is affected, which keeps it off High. It ranks
above the routine hygiene backlog for the same reason `0197` did — **a random red run destroys the
signal every review and every ship gate reads** — with one argument `0197` cannot make for itself:

⚠️ **This is the more actionable of the two test-reliability problems.** `0197`'s segfault turned out
to be an **upstream V8 garbage-collector bug** with no repository-side fix available. This one is in
**our own test code**, at a **~5.3 % per-run rate** (vs the segfault's ~0.5 %) — roughly ten times more
frequent, and plausibly fixable here. If the owner wants the test signal repaired, this is the task
that can actually repair it.

📌 **It has already cost a wrong turn.** This exact failure was misrecorded as a `SIGSEGV` in `0068`'s
`review.md`, which put a five-suite segfault count into `0197`'s brief and steered that investigation
toward a hypothesis class that was not where the failure lived. That is not a hypothetical cost; it
was paid.

**The counter-argument, stated so the owner can weigh it:** the fix is a test-infrastructure change
with no user-visible benefit, and the mechanism is not yet proven — Phase 1 could conclude "transient
localhost condition, not repository-fixable", which would be a legitimate outcome and would leave the
work with nothing to show but a finding. Weigh that against ten times the flake rate.

## Status
✅ Done (agent-closed — not owner-verified)

🚨 **Closed 2026-09-01 with NO CODE FIX — recognition note only (owner ruling 2026-09-01, §3.4
branch). This is not "flake fixed".** What shipped:

- **Mechanism CONFIRMED for the timeout shape only.** The client's TCP handshake completes, the server
  never accepts, and no response or error ever arrives. **Not a repository defect:** it reproduces in
  ~40 lines of plain Node with no jest, no express, and no project code.
- **Every candidate fix was measured and REFUTED — including the plan's own leading one.** A shared
  server per suite left the rate identical (`165/75000 = 0.22 %` against a `0.224 %` baseline), as did
  awaiting `listening`, guaranteeing `close`, binding IPv4, and `--runInBand` (**7 failures / 100
  serial full-suite runs**). Raising the timeout is dead too — all five hang runs ran to the full 90 s
  watchdog.
- **Deliverable:** a recognition note in `CLAUDE.md` (32 lines, 9.7 % of the file) plus
  `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`, with the ~40-line
  reproducer inlined (owner ruling D1).
- **Review:** ⚠️ **Changes requested — 10 defects (3 high, none blocking). Codex coverage FULL**
  (`codex-cli 0.152.0`) — **not** degraded. All 10 processed in Round 2: 9 accepted in full, 1 in part
  with recorded evidence, 0 disputed.
- **Verification:** `npm test` **107 suites / 1075 tests**, unchanged. `CLAUDE.md` **+33/−0**, purely
  additive. **No source, test, or config file was touched.**

🚨 **TWO SHAPES REMAIN UNEXPLAINED and must never be recorded as resolved:**
- the **`401`** on a route with no auth middleware (never recurred, never traced), and
- the **`socket hang up`** sub-shape (**6 occurrences**, all in uninstrumented arms, never traced).

Recording an untraced shape as understood is the `0068` error this whole task exists to stop.

⚠️ **The one-host ceiling.** *"Not a repository defect"* is what **stands after every alternative was
refuted** — it is **not** something positively proven. No CI, one machine.

## Owner
fkit-coder

## Context

**Owner-ruled 2026-08-29 via `AskUserQuestion` — amendment A4 on `0197`'s plan: characterize the flake
inside `0197`, fix it under a SEPARATE brief. This is that brief.** Its existence is authorized; what
is open is only its rank and sprint.

`0197`'s build ran a 200-run sweep programme hunting a jest-worker `SIGSEGV`. It found the segfault
(4 historical + 1 live reproduction, all one upstream V8 GC bug — see that task). It also found, as a
by-product, **a second and entirely different failure that reproduces roughly ten times more often**.

### What was measured

**9 failing runs in 170 runs — ~5.3 % of every run that contains a `supertest` suite.**

| Sample | Node | Runs | Failing runs | Rate |
|---|---|---:|---:|---:|
| Plan-time baseline sweep | 24.13.0 | 30 | 2 | 6.7 % |
| Sweep A (full suite) | 24.13.0 | 60 | 4 | 6.7 % |
| Sweep B (non-jsdom; still contains all 4 supertest suites) | 24.13.0 | 30 | 1 | 3.3 % |
| Sweep D (full suite) | 22.19.0 | 30 | 1 | 3.3 % |
| Sweep E (full suite) | 20.19.6 | 20 | 1 | 5.0 % |
| **Sweep C — jsdom suites only, contains NO supertest suite** | 24.13.0 | 30 | **0** | **0 %** |
| **All runs containing supertest suites** | — | **170** | **9** | **5.3 %** |

**Two things that table settles.**

1. **Every single failure landed in one of the four `supertest`-based `tests/profile-server/*`
   suites.** The one sweep with **zero** failures is the one sweep containing **no** supertest suite.

   🚨 **CORRECTED 2026-09-01 at close — this bullet previously claimed those four were "the only
   suites in the repository that use `supertest`". That was FALSE, and this task disproved it.**
   **Seven** test files import `supertest` (`grep -rln 'from "supertest"' tests/`):

   | File | Runs under |
   |---|---|
   | `tests/profile-server/InboxRoutes.test.ts` | `npm test` |
   | `tests/profile-server/NameChangeRoutes.test.ts` | `npm test` |
   | `tests/profile-server/PaymentsRoutes.test.ts` | `npm test` |
   | `tests/profile-server/Routes.test.ts` | `npm test` |
   | **`tests/server/Master.test.ts`** | **`npm test` — the DEFAULT path (`jest.config.ts`)** |
   | `tests/integration/Routes.it.test.ts` | `npm run test:integration` |
   | `tests/integration/NameChange.it.test.ts` | `npm run test:integration` |

   ⚠️ **Only the "only four in the repo" clause was wrong. The observation above it is unchanged and
   still holds** — all 9 measured failures did land in the four `tests/profile-server/*` suites, and
   the supertest-free sweep had zero. But the four were never the whole `supertest` surface, so
   "confined to profile-server" is an **observed distribution, not a structural boundary**, and the
   flake family can reach `tests/server/Master.test.ts` on the default `npm test` path and both
   `tests/integration/*` suites.
2. **It reproduces on Node 20, 22 and 24 alike.** It is therefore **unrelated to `0197`'s V8 GC
   segfault**, which is a different signal, a different family, and shares no worker state with it.

### The four suites, and the load they generate

| Suite | `request(` calls per run |
|---|---|
| `tests/profile-server/NameChangeRoutes.test.ts` | 31 |
| `tests/profile-server/InboxRoutes.test.ts` | 23 |
| `tests/profile-server/PaymentsRoutes.test.ts` | 22 |
| `tests/profile-server/Routes.test.ts` | 19 |

That is roughly **95 ephemeral HTTP servers bound and torn down per full run, inside 13 parallel jest
workers.**

### The observed failure shapes — FIVE symptoms, one suspected event

> ⚠️ **Count corrected 2026-09-01 at close: five, not four.** The H1 title above still reads "four
> symptoms" and is left unchanged **deliberately** — it is the identity string every board row and the
> task folder name carry, so editing it would fan drift across documents. **This section's count is the
> authoritative one.**

| Run | Node | Suite | Symptom |
|---|---|---|---|
| A-9 | 24 | `Routes.test.ts` | `socket hang up` |
| A-36 | 24 | `InboxRoutes.test.ts` | `Exceeded timeout of 5000 ms` on an OPTIONS preflight |
| A-41 | 24 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| A-51 | 24 | `PaymentsRoutes.test.ts` | `Expected: 400 / Received: 404` |
| B-25 | 24 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| D-23 | 22 | `NameChangeRoutes.test.ts` | `Exceeded timeout of 5000 ms` |
| E-3 | 20 | `PaymentsRoutes.test.ts` | `Received: 404` |
| baseline | 24 | `NameChangeRoutes.test.ts` | `expected 400 "Bad Request", got 404 "Not Found"` |
| baseline | 24 | `InboxRoutes.test.ts` | `access-control-allow-origin` → `undefined` |
| **0200 planning probe 2, run 33** | **24** | **`NameChangeRoutes.test.ts:405`** | **🆕 `expected 200 "OK", got 401 "Unauthorized"` on `GET /v1/profile`** |

#### 🆕 The fifth symptom — a `401` the app cannot produce (added 2026-09-01, mechanism UNKNOWN)

Observed during `0200`'s own planning (probe 2 run 33, `tests/profile-server/NameChangeRoutes.test.ts:405`):

```
expected 200 "OK", got 401 "Unauthorized"
```

**Why it is the most diagnostic of the five.** `GET /v1/profile` is registered at
`src/profile-server/Routes.ts:255-257` with only `allowPublicCors` and `profileReadLimiter`. Its only
exits are `200`, `400`, `404` and `500`. `internalAuth` is the file's **only** `401` source and is
attached **exclusively** to `/internal/*` (`Routes.ts:290, 324, 658, 838`). **No code path in this app
can answer `GET /v1/profile` with `401`.** The other four symptoms are all consistent with "the request
never arrived"; this one is a response that **belongs to something else**.

🚨 **Its mechanism is UNKNOWN and must not be recorded as explained.** It **never recurred** in any
`0200` measurement arm and was therefore **never traced**. The mechanism this task did confirm
(§ findings) produces **no response at all**, which cannot produce a `401` — so this shape is either a
second, rarer failure mode (response cross-talk) or a one-off mis-attribution. **Both are untested.**

**Two concrete anchors to start from:**
- `tests/profile-server/NameChangeRoutes.test.ts:330` — expected `400`, got `404`.
- `tests/profile-server/InboxRoutes.test.ts:103` — CORS header came back `undefined`.

### 🆕 A directly observed, identity-captured instance — 2026-08-30, `PaymentsRoutes.test.ts`

**Added 2026-08-30 by the producer at `0197`'s close. This is the first occurrence of this flake
observed *outside* `0197`'s sweep programme with its identity captured live** — every row in the table
above was reconstructed from sweep logs. It turns a statistical pattern into **a named, concrete
starting point for Phase 1**, and Phase 1 should begin here rather than from a cold sweep.

**Where it came from.** `0197`'s **round-2 independent review** (2026-08-30). The reviewer's own first
`npm test` of that round failed — and the reviewer captured the failing suite instead of losing it.

| | |
|---|---|
| **Suite** | **`tests/profile-server/PaymentsRoutes.test.ts`** |
| Run shape | `npm test` → **1 failed / 1074 passed** |
| Standalone | **passes 23 / 23** |
| Subsequent full runs | **three clean runs at 107 suites / 1075 tests** |
| Crash reports (`node-*.ips`) | **5 before, 5 after — unchanged** |
| Jest config in play | **`unitConfig`** |

**Four things this instance rules out, each on evidence, not inference.**

1. **Not a segfault.** The macOS crash-report count was **5 before and 5 after**. This failure family
   leaves no crash report, which separates it cleanly from `0197`'s V8 GC bug — consistent with, and
   now directly confirming, point 2 of *What was measured* above.
2. **Not a regression from `0197`'s `.trim()` change** — and **structurally impossible** to be one, not
   merely unlikely. `globalSetup` attaches only to **`integrationConfig`**, while `npm test` runs
   **`unitConfig`**, which ignores `/tests/integration/`. The changed file cannot execute on this path.
3. **Not a real assertion failure.** 23/23 standalone plus three clean full runs afterwards.
4. **Not confined to the integration config.** ⚠️ **It was observed on the `unitConfig` path, and that
   is itself informative about scope** — the flake does not need the integration harness, the
   integration database, or `globalSetup` to fire. Any Phase 1 experiment that reproduces only under
   `npm run test:integration` is looking at the wrong surface.

➡️ **For Phase 1:** `PaymentsRoutes.test.ts` is the suite with the freshest evidence and the most
recently observed failure, so **step 2's per-suite loop should start there** — but note it is *not* the
highest-frequency suite in the table above (`NameChangeRoutes` carries four of the nine sweep failures
to `PaymentsRoutes`'s two). **Do not narrow to `PaymentsRoutes` alone.** The four-suite scope stands;
this is a starting point, not a re-scoping.

### The leading hypothesis — and the reason it is NOT yet a finding

**Hypothesis:** these nine are **one** transient localhost HTTP failure between supertest's ephemeral
server and its client, seen from four different assertions. A hang-up, a 5-second timeout, a `404`
from something that is not the app under test, and a response carrying none of that app's CORS
middleware are all consistent with the same event: the request never reached the app. The `404` shape
is the tell — **a `404` has no CORS header either**, which is why the missing
`access-control-allow-origin` and the unexpected `404` are most likely the same failure, not two.

**What rules out the obvious alternative:** these are **not** route-registration bugs.
`NameChangeRoutes` and `PaymentsRoutes` both register the routes in question **unconditionally** in the
code paths those tests exercise.

🚨 **The mechanism is LOCALIZED but NOT PROVEN, and this brief does not pretend otherwise.** The
above is the `0197` coder's assessment from failure-shape reasoning, not from a discriminating
experiment. Confirming it is Phase 1's entire job. **A brief that assumed the hypothesis and jumped to
a fix would repeat exactly the mistake that produced the five-suite segfault error in the first
place.**

## What to build

**Investigation-first. Phase 1 must produce a confirmed mechanism before Phase 2 changes any test
file.**

### Phase 1 — confirm the mechanism (findings before any fix)

1. **Run the `--runInBand` discriminator.** Run the full suite serially, N runs (N chosen so the
   result is meaningful against a ~5 % per-run base rate — at 30 runs you would expect ~1.6 failures
   if parallelism is irrelevant, so a zero result at N=30 is weak; size it deliberately and **state
   the power of your chosen N**, do not just report the count). This is the single most informative
   experiment available: if the flake vanishes serially, contention between the ~95 ephemeral servers
   across 13 workers is implicated; if it survives, it is not.

2. **Run standalone per-suite loops, ×100 each**, on all four supertest suites individually. This
   separates "the suite fails on its own" from "the suite fails only alongside the other three".
   Record the per-suite rate — they may not be equal, and an unequal rate is itself a clue.

3. **Capture what a failure actually looks like on the wire, not just at the assertion.** When a
   failure is caught, record the response status, the full header set, and the body — enough to say
   whether the `404` came from the app under test, from a *different* ephemeral server on a reused
   port, or from a connection that never completed. **This is the observation that turns the
   hypothesis into a finding or kills it.**

   ⚠️ **Do not filter your test output — an identity has already been lost this way once.** During
   `0197`'s build the coder hit this same failure and **could not name the suite**, because the command
   it ran filtered the output and dropped the `FAIL` line. The reviewer hit it again on 2026-08-30,
   kept the full output, and that is the only reason `PaymentsRoutes.test.ts` is named above. **Capture
   complete, unfiltered output for every run in this task** (tee it to a file rather than grepping it
   live) — this flake is ~5 % per run, so a lost occurrence costs roughly 20 runs to buy back.

4. **Test the port-reuse / ephemeral-port-exhaustion hypothesis explicitly**, since it is the
   mechanism that would explain a `404` from a live-but-wrong server. Record how supertest binds
   (`:0` ephemeral vs a fixed port), whether servers are closed in an `afterAll`/`afterEach`, and
   whether sockets linger in `TIME_WAIT` across the ~95 bind/teardown cycles.

5. **Record every hypothesis you test and its outcome, including the negatives.** A ruled-out
   hypothesis is a finding. If the honest answer is *"a transient localhost condition on this host, not
   a repository defect"*, **that is a complete and acceptable Phase 1 outcome** — say so plainly and
   recommend what (if anything) should change. Do not manufacture a fix to justify the task.

⚠️ **The same one-host ceiling `0197` hit applies here.** There is no CI in this repository and no
second machine. Every measurement will come from one host, and a "machine-local condition" hypothesis
is **untestable**, not merely untested. State that limit rather than letting a reader infer generality.

### Phase 2 — fix, only once Phase 1 has a mechanism

6. **Fix the confirmed mechanism in the test infrastructure.** Likely shapes, depending on what
   Phase 1 finds — listed as candidates, **not as a decision**: awaiting the server's `listen`
   before the first request; closing each ephemeral server in an `afterAll`; sharing one server per
   suite instead of one per request; raising the 5-second assertion timeout **only** if Phase 1 shows
   the request genuinely completes late rather than never arriving.

7. ⚠️ **Do not "fix" this by capping workers or forcing `--runInBand` on the whole suite without
   surfacing the cost first.** That trades a permanent slowdown on **every** run for an intermittent
   flake — a product-cost decision, not an implementation detail. **Surface it; do not decide it
   alone.** This is the same warning `0197` carries, and for the same reason.

8. ⚠️ **Do not mask it with a retry.** A retried flake is an invisible flake. If a retry is genuinely
   the right answer, propose it with that cost named.

## Verification steps

1. **Findings exist and are honest about their limits** — the `--runInBand` discriminator result is
   stated with the power of its N, the four standalone ×100 loops are reported per suite, and every
   hypothesis tested is listed with its outcome. A "did not reproduce" result is reported as such.
2. **The mechanism is stated as confirmed or as unconfirmed, explicitly.** No fix was applied to an
   unconfirmed mechanism.
3. **Post-fix, a sweep of at least 100 runs containing the supertest suites shows 0 failures of any of
   the observed shapes** (`socket hang up`, 5-second timeout, unexpected `404`, missing
   `access-control-allow-origin`, **and the `401` added 2026-09-01 — five, not four**). At the pre-fix
   rate of ~5.3 %, 100 clean runs is a meaningful result; 30 is not. **State the observed rate before
   and after** — "it seems better" is not a verification.

   ⚠️ **This gate was NOT met and was not meant to be** — the task closed on the recognition-note
   branch with **no code fix**, so there is no "post-fix" sweep. See the Status field.
4. `npm test` still passes and the full-suite counts are unchanged, unless a change was deliberately
   made and explained.
5. **The four `tests/profile-server/*` suites still assert what they asserted before.** A flake fixed
   by weakening an assertion is a deleted test, not a fixed one — `git diff` reviewed specifically for
   this.
6. If any worker/concurrency setting was changed, the **runtime cost is measured and reported, not
   estimated.**
7. 🔒 **No credential values anywhere** — not in findings, worklog, test fixture or log line. These are
   profile-server suites; name variables and filenames only.

## Notes

- **Depends on:** nothing. Independently shippable today — it needs no `0197` deliverable, and `0197`'s
  characterization work is already complete and recorded in its findings report.
- **Blocks:** nothing formally. Like `0197`, it protects the verification signal every other task's
  review and ship gate relies on — which is its real argument for being pulled sooner rather than later.
- **Related:** `0197` (parent — this flake was found during its sweep programme and split out under
  owner amendment **A4**; its brief and findings report are the evidence base), and `0068` (where this
  flake was **misrecorded as a `SIGSEGV`** in `review.md:153` while `worklog.md:189` recorded it
  correctly as an assertion failure — that misrecording is the concrete cost this task exists to stop
  repeating; that folder is finished output — **reference it, do not edit it**).
- **Evidence source of record:**
  `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md` §6. Read it
  before starting; every number in this brief comes from it.
- **This is NOT the `0197` segfault.** Different signal (assertion/timeout vs `EXC_BAD_ACCESS`),
  different family (supertest HTTP vs V8 GC), reproduces on Node 20/22/24 where the segfault's Node
  question is open, and the crash reports settle that they share no worker state. **Do not let the
  shared parentage steer this investigation toward inventing one root cause for both** — that
  conflation is precisely what went wrong the first time.
- ✅ **BOTH open questions RULED 2026-08-29** (owner, via `AskUserQuestion` in the `fkit lead` session,
  relayed through the lead), **taking the producer's recommendation on both**. **No open questions
  remain on this brief.**
  - **Sprint — promoted from the Backlog board into Sprint 4.** Full reasoning in the Sprint field.
  - **Priority — Medium, confirmed rather than disturbed.** It was the producer's rank. Full reasoning
    in Priority.
- ⚠️ **The Sprint 4 board row was appended at the end of the status table, and that encodes no rank.**
  That board is unranked (every Priority cell reads `—`), so row order carries no meaning there. This was
  an **append**, not a mid-board insertion above the `✅ Done` rows — the case fkit's **ADR-035** bars.
  The ruling lives in prose in that board's addendum, which is where rank belongs on an unranked board.

  > 📎 **ADR-035 is cited by name, not linked, on purpose.** It is one of **fkit's own upstream ADRs**
  > (the `adr-0XX` series, which lives in the fkit install share). This project's
  > `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it
  > would not resolve.
- **This task is live on Sprint 4 only.** Its Backlog-board row was converted to `➡️ Moved` with a
  pointer to `plan-sprint-4.md` — the same treatment `0057` and `0062` document — so it is **not
  double-listed** as open work on two boards.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **No secrets in any artifact.** Variable names, container names and ports only — never a value.
