# Plan — Task 0197: Test-Suite Reliability (jest-worker `SIGSEGV` + integration-suite hang)

> **Provenance.** Produced by a spawned `fkit-coder` in the plan step of an orchestrated drive from a
> `fkit lead` session, 2026-08-29. Approved by the owner via `AskUserQuestion` the same day, with six
> decisions ruled — recorded verbatim in **§12 Owner amendments** at the foot of this file. **The
> amendments bind over the body where they conflict.**
>
> ⚠️ **Plan-gate honesty (ADR-031 / ADR-032 D7).** On this orchestrated path, "no source before the
> owner approves the plan" was enforced by a *prompt instruction* to the spawned coder, **not** by plan
> mode's structural write-wall — that wall cannot run in a spawned worker. Do not read this provenance
> note as a structural guarantee.

**Status at time of writing: PLAN ONLY. Nothing written.** No file under `src/`, `tests/`,
`package.json`, `jest.config.ts`, `CLAUDE.md`, any task folder, any board, or the wiki was created or
edited. The only working-tree changes present are the producer's concurrent 0063 close
(`plan-sprint-4.md`, 0069/0070 briefs, the 0063 folder move) — not the planner's.

---

## 0. Pre-plan evidence gathered (read-only) — it changes the plan materially

The suite was run rather than guessed at. Three results reshape the task.

### 0.1 The suite is *fast* — ~4 s a run. Reproduction sweeps are nearly free.

```
/usr/bin/time -p npm test   →  exit 0
Test Suites: 107 passed, 107 total
Tests:       1075 passed, 1075 total
Time:        3.712 s      real 4.63  user 17.43  sys 6.31
```

A 200-run sweep is ~15 minutes of wall clock, not a day. The usual "how long do we hunt a flake"
trade-off mostly evaporates, which is why decision **D1** below is framed in hundreds of runs rather
than hours.

### 0.2 30 consecutive runs: **zero SIGSEGV** — but a **6.7% flake rate of a different kind**

30 back-to-back `npx jest` runs (default 13 workers, machine otherwise idle), 2026-08-29:

| Result | Count |
|---|---|
| exit 0 | 28 |
| exit 1 | **2** (runs 3 and 23) |
| `SIGSEGV` / worker crash | **0** |

Both failures are ordinary single-test assertion failures with the worker process intact — **not**
segfaults:

| Run | Suite | Failure |
|---|---|---|
| 3 | `tests/profile-server/NameChangeRoutes.test.ts` | `expected 400 "Bad Request", got 404 "Not Found"` (`:330`) |
| 23 | `tests/profile-server/InboxRoutes.test.ts` | `expect(res.headers["access-control-allow-origin"]).toBe("*")` → `Received: undefined` (`:103`) |

Both are consistent with *the route not being registered on the app instance under test* (a 404 has no
CORS header either). Two suites, same shape, both under `tests/profile-server/`. **This is a real,
reproducible repository flake that the brief does not describe.**

### 0.3 The brief's segfault table looks like it conflates two failure modes

Brief row 3 lists `tests/profile-server/NameChangeRoutes.test.ts` as a `SIGSEGV`. But `0068`'s own
worklog records that occurrence as:

> `ai-agents/tasks/done/0068-citizen-verified-icon/worklog.md:189` — *"failed one test in
> `tests/profile-server/NameChangeRoutes.test.ts` (\"409s a name_mismatch…\" got 404)"*

That is an assertion failure — **the same "got 404" shape the sweep reproduced twice**. `0068`'s
`review.md:153` then rolled it into the five-suite segfault list, and the brief inherited that. So the
segfault sample is plausibly **four** occurrences, not five, and one row of the "five unrelated suites
⇒ environmental" argument is a different bug.

The brief is **not** edited by this plan (out of scope per the driver's hard rules). Flagged for the
producer.

### 0.4 Ground facts read out of the repo

| Fact | Value | Where |
|---|---|---|
| Node / npm | `v24.13.0` / `11.6.2` | runtime |
| Node pinned? | **No** — no `.nvmrc`, no `.node-version`, no `engines` field | repo root, `package.json` |
| CI? | **None** — no `.github/workflows` | repo root |
| jest | `30.0.0`; `jest-runner@30.0.0 → jest-worker@30.0.0` | `npm ls jest-worker` |
| hoisted `jest-worker@29.7.0` | belongs to `eslint-webpack-plugin`, **not** jest — red herring | `npm ls jest-worker` |
| transform | `@swc/jest 0.2.39` / `@swc/core 1.13.3` (native `swc.darwin-arm64.node`) | `jest.config.ts` |
| native `.node` modules present | `@swc/core`, **`canvas` 3.1.0**, `fsevents`, `@unrs/resolver-binding` | `find node_modules -name '*.node'` |
| suites with `@jest-environment jsdom` | **23** | `grep -rl "@jest-environment" tests` |
| **jsdom loads native canvas** | **verified**: `new JSDOM(...).getContext("2d")` returns a real context and `process.report.getReport().sharedObjects` contains `build/Release/canvas.node` | measured 2026-08-29 |
| machine | Apple M4 Pro, 14 cores, 48 GB RAM, macOS 26.2 | `sysctl` / `sw_vers` |
| Node versions available locally | nvm has `v20.19.6`, `v22.19.0`, `v24.13.0` | `~/.nvm/versions/node` |

**Integration side:**

| Fact | Value |
|---|---|
| `package.json:23` | `"test:integration": "cross-env RUN_DB_TESTS=1 jest"` — **no `--runInBand`, no `--forceExit`, no env guard**. The named script that exists today is exactly the one that produces the folklore failures. |
| `jest.config.ts` | `RUN_DB_TESTS=1` flips to `testMatch: tests/integration/**/*.it.test.ts`; no `maxWorkers`, no `forceExit`, no `globalSetup` |
| pool cleanup | **every** integration suite already does `afterAll(async () => { await pool.end(); })` — 6 sites across 5 files |
| ⇒ the brief's "open `pg` pool handles" attribution is **unverified and probably wrong** | leading alternative: three `express-rate-limit` limiters created inside `createApp()` (`src/profile-server/Routes.ts:211, :377, :712`), whose memory store holds an interval and is never shut down. Only `Routes.it.test.ts` calls `createApp` — which gives a clean bisect. `supertest` is a second candidate. |
| env-file convention | `.env*` is gitignored (`.gitignore:9`); a family already exists (`.env`, `.env.dev`, `.env.profile`, `.env.telemetry`, `….secret`). **No `.env.test`.** No contents were read. |
| `dotenv` | already a runtime **dependency**; jest does **not** load it today |
| container | `gc-0012-it-pg` **Up 3 days**, `0.0.0.0:5433->5432/tcp`, port reachable — phase 2 is verifiable right now |
| worklog disagreement (real) | `0012` uses database `gc_it`; `0018` used `gc_it_0018` with a different password (`0018/worklog.md:76`). Names only, no values. |

---

## 1. Scope, restated

Four workstreams, deliberately **not** assumed to share a cause:

- **P1a** — characterize the `SIGSEGV`. Evidence first; no fix without a finding.
- **P1b** — *(new — see amendment A4)* characterize the `got 404` flake reproduced at 6.7%.
- **P2** — make the integration invocation durable and un-mis-transcribable.
- **P3** — assess whether the open handles should be fixed rather than masked by `--forceExit`.

P2 and P3 do not wait on P1 (brief, Notes).

---

## 2. Phase 1a — the `SIGSEGV`: hypotheses, predictions, discriminators

Sweeps are scripted into the scratchpad, never the repo. Each sweep is N runs of `npx jest` (bypassing
`pretest`, which regenerates map nation counts — it wrote nothing tracked in the planning run, but
skipping it keeps the loop honest), recording per-run exit code, wall time, victim suite, and the jest
worker signal line if any.

**Baseline already banked: 30 runs, 0 segfaults, default worker count.** The budget set in amendment
A1 starts from 30.

| # | Hypothesis | Evidence for | It predicts | How to tell it apart |
|---|---|---|---|---|
| **H1** | **jsdom → native `canvas` + jest worker reuse.** A worker that ran one of the 23 jsdom suites carries native cairo/canvas state; jest reuses child processes, so a later *pure-JS* suite executes in a poisoned process. | Verified that jsdom pulls in `canvas.node`. Explains the brief's central puzzle — why a color test and a spatial-index test segfault (`SIGSEGV` normally comes from native code, and these files have none of their own). | Crashes appear only in runs where jsdom suites are also scheduled; a sweep over **non-jsdom suites only** is clean at equal N; the victim is never the culprit. | Sweep **A** = full suite (baseline). Sweep **B** = `tests` minus the 23 jsdom paths. Sweep **C** = the 23 jsdom paths only. Crashes in A and C but never in B ⇒ H1. Also capture `process.report` shared objects from a crashed worker where a core file exists. |
| **H2** | **`@swc/core` native transform crash.** The one native module every suite touches. | All five victims are `.ts`, all transformed by swc in-worker. | Crash rate rises with *cold* transform cache (more swc invocations per run) and falls when warm; disappears under a different transform. | Sweep **D** = `jest --clearCache` before every run vs the warm baseline. Sweep **E** = a **scratchpad-only** jest config (`npx jest --config /tmp/….json`, no repo file touched) swapping the transform to `babel-jest` — `@babel/core`, `preset-env`, `preset-typescript` are already installed. Clean under babel at equal N ⇒ swc implicated. |
| **H3** | **Node 24 / V8-in-`vm` interaction.** | Node is **unpinned** (no `.nvmrc`, no `engines`) so every run silently takes whatever is installed; Node 24 + macOS 26.2 are both very new. | Rate differs by Node major. | Identical N-run sweeps under nvm's `v22.19.0` and `v24.13.0` (and `v20.19.6` if needed). Cheap — all three are already installed. |
| **H4** | **Worker count / memory pressure.** | The brief's own leading suspicion. | Rate scales with `--maxWorkers`; vanishes under `--runInBand`. **But** memory exhaustion on macOS presents as `SIGKILL`/jetsam or a V8 heap-OOM message — *not* `SIGSEGV`. So the observed signal already argues against it. | Sweeps at `--maxWorkers=13` (default) / `4` / `1`, plus `--runInBand`; peak RSS via `/usr/bin/time -l`. Expected to be **ruled out**, and a ruled-out hypothesis with data behind it is a finding. |
| **H5** | **`jest-worker` version mismatch.** | The tree does contain `jest-worker@29.7.0` and `@27.5.1`. | — | **Already ruled out by inspection, no run needed**: `jest-runner@30.0.0` resolves `jest-worker@30.0.0`; the 29.7.0 copy is `eslint-webpack-plugin`'s and the 27.5.1 is `terser-webpack-plugin`'s. Neither is in jest's runtime path. |
| **H6** | **Machine/OS-local condition.** | macOS 26.2 is brand new; **there is no CI in this repo**, so every observation of this flake comes from exactly one machine. | Not reproducible anywhere else. | **No local discriminator exists.** This is the honest ceiling on the investigation and the reason the brief's "this is a local toolchain condition, not a repository defect" outcome is a live possibility, not a cop-out. |

**Reporting rule, binding:** every hypothesis above gets a row in the findings with its outcome —
reproduced / ruled out / untestable — including the observed rate stated as `k/N`, and including `0/N`
if that is the answer. **No hypothesis gets quietly dropped for being negative.**

---

## 3. Phase 1b — the `got 404` flake

Two independent reproductions, 6.7% run-level. Cheap to characterize:

1. Read how `NameChangeRoutes.test.ts` and `InboxRoutes.test.ts` construct their app (`createApp`
   arguments, module mocks, `jest.resetModules` usage, any module-level singleton in
   `src/profile-server/Routes.ts`).
2. Loop each suite **standalone** ×100. Flakes alone ⇒ intra-suite state. Clean alone but flaky in the
   full run ⇒ cross-suite / worker-reuse state — which would put it in the same family as H1.
3. `--randomize` sweeps to see whether execution order predicts it.
4. Report the mechanism.

**Scope of this phase is set by amendment A4: characterize only, do not fix.**

---

## 4. Phase 2 — make the integration invocation durable

The core finding: **`npm run test:integration` already exists and is wrong.** It omits `--runInBand`
(suites race migrations on a cold DB — `0017/worklog.md:77`), omits `--forceExit` (10-minute hang), and
does not check `TEST_DATABASE_URL` (the "5 suites / 70 tests failed in 0.43 s" bogus red). Phase 2 is
mostly *repairing an existing named command*, not inventing one — which is the strongest available
answer to the brief's own argument, because the failure mode cannot survive a command that carries its
own flags.

Change surface, as ruled by amendment A3:

1. **`package.json`** — `test:integration` gains `--runInBand --forceExit` so the flags are part of the
   name.
2. **A fail-fast guard as a jest `globalSetup` wired into `integrationConfig` in `jest.config.ts`** — a
   single choke point rather than an import in five suites. An unset variable produces
   `TEST_DATABASE_URL is not set …` instead of a plausible-looking red.
3. **`CLAUDE.md`** — a short subsection under `## Testing` (line 148): the command, the two variable
   **names** (`RUN_DB_TESTS`, `TEST_DATABASE_URL`) and what each is for, the gitignored file the value
   belongs in (**`.env.test`**, per amendment A5), the Postgres container and port, why `--forceExit` is
   required and that it is **pre-existing** (predates `0067`), and one line stating that `0012`'s and
   `0018`'s worklogs disagree and this section is now the single source of truth.
4. **No `tests/integration/README.md`** — a third copy of the same command is a third thing to drift.
   This declines one of the brief's own candidates; the owner did not overrule it.

🔒 Variable names, the container name, and the port only. **No connection string, host, user, or
password**, in any artifact — and **the coder does not create `.env.test`**, because writing it means
writing a credential (amendment A5).

---

## 5. Phase 3 — open handles: assess, then ask

The brief's stated cause is contradicted by the code (every pool is already `end()`ed). So the
assessment is:

1. Run the integration suite **without** `--forceExit` under `--detectOpenHandles` and record what jest
   actually names.
2. Bisect: the four non-`Routes` suites alone (no `createApp`, no limiters, no supertest) vs
   `Routes.it.test.ts` alone. If only the latter hangs, the limiters/supertest are implicated and `pg`
   is exonerated.
3. Report the assessment and the size of the real fix — a limiter shutdown in `createApp`'s teardown
   seam, or test-side disposal. **Then stop and return `NEEDS-DECISION`.** Fixing it touches production
   route-construction code, which is a different risk class from a docs change. (This is the planner's
   D4, which recommended deciding after the assessment exists; the owner was not asked to pre-rule it,
   and it remains open by design.)

Explicitly recorded per the brief: **a hang and a segfault are different failures; fixing one proves
nothing about the other.**

---

## 6. Change surface, consolidated

| File | When | Why |
|---|---|---|
| `package.json` (`test:integration`) | P2 — certain | encode `--runInBand --forceExit` |
| `jest.config.ts` (`globalSetup` on `integrationConfig`) | P2 — certain (A3) | the unset-variable guard, at one choke point |
| `CLAUDE.md` (`## Testing`) | P2 — certain | the durable, discoverable record |
| `jest.config.ts` (`maxWorkers` / `workerIdleMemoryLimit`) | **RULED OUT by amendment A2** | no mitigation is being bought |
| `.nvmrc` + `engines` | P1 — only if H3 lands; still requires a `NEEDS-DECISION` (planner's D6, not pre-ruled) | zero-runtime-cost mitigation |
| `src/profile-server/Routes.ts` (limiter teardown) | P3 — only if approved after the assessment | real fix vs mask |
| `tests/profile-server/*.test.ts` | **RULED OUT by amendment A4** — characterize only, fix under a new brief | the 404 flake |

**Nothing outside this table.** No task file, brief, board row, worklog of another task, or wiki page.

---

## 7. Verification strategy

1. `npm test` → expect the counts unchanged at **107 suites / 1075 tests, exit 0** (the measured
   baseline; re-derived at the time, not copied).
2. The documented integration command **executed verbatim from a fresh shell with nothing exported**
   except what the docs say to export — the actual bar from brief verification step 2, and the
   counter-example is the reviewer's two failed attempts. Counts re-derived, not copied from `0067`.
3. Unset `TEST_DATABASE_URL` deliberately and confirm the output is an explicit "not set" message,
   **not** a fast plausible red.
4. `npm run lint`, `npx tsc --noEmit`.
5. 🔒 `git diff` read specifically for credential values before hand-off.
6. If any worker/concurrency setting changes: runtime **measured** over ≥5 paired runs with
   `/usr/bin/time -p`, before and after, reported as numbers — never estimated (brief verification
   step 7). *(Under A2 no such setting should change; the step stands in case one is proposed.)*
7. Findings document states every hypothesis with `k/N` and its outcome, including negatives.

---

## 8. What will NOT be done

- **No speculative segfault fix.** No Node bump, no `--maxWorkers` cap, no `--workerIdleMemoryLimit`,
  without a finding behind it and an owner ruling on the cost. **Amendment A2 forecloses the mitigation
  entirely for the no-cause outcome.**
- **No repo edits during investigation.** Experimental jest configs live in the scratchpad and are
  passed via `--config`.
- **No edits to `ai-agents/tasks/done/0067-*` or `0068-*`** — finished output; referenced only.
- **No brief, status, board, or `plan-sprint-4.md` edits.** The §0.3 discrepancy is *reported*, not
  corrected. A producer concurrently holds those files.
- **No `ai-agents/wiki-vault/` writes.** Ever.
- **No commit, no push.**
- **No credential values** anywhere — not truncated, not "starts with", not "the local one". **`.env.test`
  is not authored by the coder** (A5).
- **No mover skills** (`/fkit-task-done` etc.) — producer-only since ADR-033; the close routes to a
  producer.
- **No fix for the 404 flake** (A4).

---

## 9. Sequencing and rough effort

| Order | Work | Cost |
|---|---|---|
| 1 | P2 doc + script + guard (unblocked, highest value per minute) | ~30–45 min incl. verification |
| 2 | P3 assessment (`--detectOpenHandles` + bisect), then **stop and return `NEEDS-DECISION`** | ~30 min |
| 3 | P1a sweeps A–E + Node-version sweeps, per the A1 budget | mostly unattended; ~4 s/run |
| 4 | P1b characterization (no fix) | ~45 min |
| 5 | Findings write-up + hand-off | ~30 min |

---

## 10. Decisions ruled by the owner

All six `NEEDS-DECISION` blocks the planner returned were put to the owner via `AskUserQuestion` in the
`fkit lead` session on 2026-08-29, in two batches of four and two. **All six were answered; every
answer took the planner's recommendation.** See §12.

---

## 11. Open questions still outstanding

Not blocking the build; to be raised when the relevant phase lands.

- **Q2 — Do the raw logs of the segfault occurrences still exist?** Only prose summaries survive in the
  `0067`/`0068` folders. An actual jest worker signal line, a crash report from
  `~/Library/Logs/DiagnosticReports/`, or a core file would discriminate H1/H2 in one read instead of
  hundreds of runs. macOS crash reports for `node` from 2026-08-28 would be decisive if not pruned.
  **Action: check `~/Library/Logs/DiagnosticReports/` first, before spending any sweep budget** — it is
  a one-command check that could collapse the whole investigation.
- **Q3 — Is there any second machine, or any intent to add CI?** There is no `.github/workflows`. With
  one machine and no CI, H6 ("local condition") is untestable, and that is a hard ceiling on how
  conclusive phase 1 can be. Report this ceiling explicitly in the findings.
- **Q4 — Was the machine under load during the five occurrences?** All five were on one working day of
  active development. If they only appear under concurrent load (a dev server, a build, a Docker
  workload), an idle-machine sweep will never see them. **If sweeps A–E come back clean, add a load
  generator and say so in the findings** rather than reporting a bare negative.

---

## 12. Owner amendments — ruled 2026-08-29 via `AskUserQuestion`, binding

> These override the plan body wherever they conflict. Each records the planner's `NEEDS-DECISION` id.

**A1 — segfault sweep budget (planner's D1).**
**200 runs total (~15 min wall clock), spread across sweeps A–E and two Node majors — escalating to 500
only if sweep A produces at least one crash.** A reproduction makes further runs diagnostic rather than
speculative. Uncapped hunting was explicitly rejected: on a possibly machine-local condition it has no
natural end. The 30 runs already banked count toward the 200.

**A2 — no mitigation if no cause is found (planner's D2).**
**If phase 1 finds no root cause, DO NOT buy a mitigation that hides the segfault.** Document the flake,
its recognition signature, and the rule "if you see it, re-run explicitly and say so." Test signal stays
fast (~4 s). The accepted cost, stated plainly: **a red run stays ambiguous.** Capping workers and
`--workerIdleMemoryLimit` were both offered and both declined — a permanent, measured slowdown on every
run forever is not worth a flake that did not appear in 30 runs. *If H1 is CONFIRMED, a targeted split
may be proposed — but as a new `NEEDS-DECISION`, not under this amendment.*

**A3 — integration command and guard placement (planner's D3).**
**Fix the existing `test:integration` script (add `--runInBand --forceExit`), add the `CLAUDE.md`
subsection, and put the unset-variable guard in `jest.config.ts` as a jest `globalSetup`** — one choke
point, not an import in five suites, since `jest.config.ts` already owns the integration/unit split.
Rejected: a shared-helper guard (five places to keep in sync), `dotenv` auto-loading (hides whether the
variable was set deliberately; a stale file becomes a new silent failure mode), and documentation-only
(a doc is exactly what was lost the first time, and the broken npm script would stay broken).

**A4 — the 6.7% `got 404` flake (planner's D5).**
**Characterize it inside 0197; fix it under a separate brief.** Finding the mechanism is cheap and
materially affects 0197's own findings — if it shares worker-reuse state with the segfault, that IS a
phase-1 result. But fixing it edits test files this brief never scoped, and scope belongs to the
producer. **Do not edit `tests/profile-server/*.test.ts`.**

**A5 — where the `TEST_DATABASE_URL` value lives (planner's Q1).**
**Document a new `.env.test`, and the OWNER creates it.** It matches the existing gitignored
`.env` / `.env.dev` / `.env.profile` / `.env.telemetry` family and keeps test config separate from dev.
**The coder documents the NAME only and must not author the file** — writing it means writing a
credential. Rejected: folding into the existing `.env` (mixes test-DB config into dev), and
shell-export-only (nothing to go stale, but it is the exact friction that caused the original problem).

**A6 — plan approved (the gate itself).**
The plan is **approved as written, subject to A1–A5.** The owner chose full approval over the narrower
"phase 2 only" and over rejecting to rescope first — so the segfault investigation proceeds despite the
30-clean-run result, within A1's budget.

**Not pre-ruled, still open by design:** the planner's **D4** (fix the open handles vs document them)
and **D6** (pin Node). D4 returns as a `NEEDS-DECISION` after the phase-3 assessment exists; D6 returns
only if H3 is implicated. Do not decide either autonomously.
