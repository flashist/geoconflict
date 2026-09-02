# Test-Suite Reliability Investigation — the Jest-Worker `SIGSEGV` and the Integration Suite's Real Exit Behaviour

**Source**: `ai-agents/tasks/done/0197-test-suite-reliability-investigation/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — test-reliability track (`0197` → `0200`)

> ✅ **Closed 2026-08-30 by a spawned producer — agent-closed, not owner-verified.** The full loop ran (plan → owner approval → build → independent stateful review → process-review → reviewer round 2, ending **Ready to merge**); what the marker records is narrower and exact: **no human inspected the result before the file moved.**
>
> 📛 **The task was RENAMED at close, by owner ruling, because its own title was known-wrong.** Title and folder both used to say *"the integration suite that **hangs without `--forceExit`**"*. **That suite does not hang.** Folder `0197-test-suite-reliability-segfault-and-integration-hang` → `0197-test-suite-reliability-investigation`. The rename was ruled 2026-08-29 and deliberately deferred until the coder released the folder.
>
> **Findings of record:** `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md`.

## Goal

Three reliability problems in the test toolchain, all observed during `0067`/`0068` (2026-08-28) and grouped into one task by owner ruling — **grouped, not assumed to share a root cause**:

1. A random jest-worker `SIGSEGV` on unrelated, untouched suites.
2. The belief that `tests/integration` hangs for ~10 minutes without `--forceExit`.
3. The integration invocation not being reproducible from the written records — a reviewer lost two runs to it, and a later reviewer lost one to an unset `TEST_DATABASE_URL` that presented as **"5 suites / 70 tests failed in 0.43 s"**, a fast total red indistinguishable at a glance from a real regression.

The argument for doing it at all: **a random red run destroys the signal every review verdict and every ship gate reads.** Once red might mean nothing, the cheapest response becomes "re-run it" — which is also the response that hides a genuine regression.

## Key Changes

**This task's substantive output is a set of disproofs, not a fix.** What changed in the repository is small:

| File | Change |
|---|---|
| `package.json` | `test:integration` → `cross-env RUN_DB_TESTS=1 jest --runInBand` (**no** `--forceExit`); new `engines.node` range `>=24.13.0 <25` |
| `.nvmrc` | **new** — exact `24.13.0` |
| `jest.config.ts` | `integrationConfig` gains `globalSetup: "<rootDir>/tests/integration/globalSetup.ts"` |
| `tests/integration/globalSetup.ts` | **new** — fails the run immediately with an explicit message when `TEST_DATABASE_URL` is unset |
| `CLAUDE.md` | new `### Integration tests (real Postgres)` subsection — now the **single source of truth** for running them; plus the Node-pin note |

## Outcome

### 1. The segfault is an upstream V8 bug and is NOT repository-fixable

Five macOS crash reports (four historical from 2026-08-28, one reproduced live 2026-08-29) carry a **byte-identical faulting stack entirely inside V8's garbage collector** — the same symbol *and* the same image offset in every frame, which is what makes it one bug rather than five coincidences: `ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers` dereferencing address `0x6` during a mark-compact GC, reached from the Baseline-tier prologue's stack guard. `EXC_BAD_ACCESS (SIGSEGV)`, `KERN_INVALID_ADDRESS at 0x6`. **No native-addon frame and no repository code on any of them.** Observed rate **~1 in 170 runs**.

**The count is FOUR distinct suites on 2026-08-28, not five** — a correction that propagated from `0068`'s `review.md`, which rolled an assertion failure (`got 404` in `NameChangeRoutes.test.ts`) into the segfault list. Confirmed two independent ways: macOS holds exactly four `node-*.ips` reports from that day, and this task reproduced the `404` shape 9 times in 170 runs as a separate, non-segfault failure. That flake is now task `0200`.

**The victim suite carries no information about the cause** — it is simply whichever suite was resident in the worker when V8's GC tripped over its own stale pointer. The live reproduction's victim, `SAMLauncherExecution.test.ts`, is a pure-JS core suite.

### 2. The brief's leading hypotheses were REFUTED BY EXPERIMENT, not left unconfirmed

| Hypothesis | Outcome |
|---|---|
| jsdom → native `canvas` poisoning a reused worker | **REFUTED BY EXPERIMENT.** The live reproduction came from the sweep that **excludes every jsdom suite**, in a worker with **no `canvas.node` loaded**, with the identical stack. The jsdom suites run *alone* were 0/30. Three of the four historical crashes also had no `canvas` loaded. The exact inverse of the prediction |
| Worker count / memory pressure | **RULED OUT.** macOS memory exhaustion presents as jetsam/`SIGKILL`, not `EXC_BAD_ACCESS`/`SIGSEGV` (a separate jetsam event on 2026-08-27 confirms the machine does hit memory pressure — different day, different signal) |
| `jest-worker` version mismatch | **RULED OUT by inspection** — the hoisted older copies belong to webpack plugins, not jest's runtime path |
| `@swc/core` native transform | **REFUTED as a direct cause** — no swc frame on any stack, and swc loads in every worker including all 169 non-crashing runs |
| Node 24 / V8 interaction | **SURVIVING, best supported, NOT confirmed.** The stacks are 100 % V8 GC internals, but the cross-version sweeps (Node 22 at 0/30, Node 20 at 0/20) are **underpowered by roughly an order of magnitude** at the observed rate — they support nothing either way |
| Machine/OS-local condition | **UNTESTABLE.** No CI, no second machine; every data point is from one host. The honest ceiling |

### 3. The integration hang DOES NOT REPRODUCE — warm or cold — and the stated cause was folklore

`--runInBand` **without** `--forceExit` exits on its own in ~3–4 s: **10 runs out of 10** on a warm database and **3 out of 3** on a genuinely cold first-migration one, with `--detectOpenHandles` naming **zero** open handles in both. Every integration suite **already closes its pool** — six `afterAll(async () => { await pool.end(); })` sites across five files. There was never anything left open.

**Where the folklore came from:** jest prints its *"Force exiting Jest: Have you considered using `--detectOpenHandles`…"* line **unconditionally whenever the flag is set**, so a run that prints it looks like it *had* to be force-exited. **No surviving artifact anywhere shows an actual hang** — not a log, not a timing, not a transcript.

**`--forceExit` was therefore REMOVED, not documented** (owner ruling R1, conditional on the cold-DB check, which passed), so a future real handle leak surfaces as a visible hang instead of being silently masked. `CLAUDE.md` now states plainly that **a future hang is a real regression — investigate it, do not add the flag back.**

### 4. ⚠️ The Node pin is NOT a mitigation — do not let any retelling turn it into one

Node is pinned **for reproducibility only**, so contributors and future build images run a known runtime instead of silently taking whatever is installed. Deliberately asymmetric (owner ruling R5): `.nvmrc` exact `24.13.0` (names the known-good version, guides, cannot block); `engines.node` range `>=24.13.0 <25` (keeps the intent while unable to hard-fail an install over a patch bump).

> **`24.13.0` is the very version the crash was reproduced on, and the range keeps the project on that same major.** Node 22 and 20 were **not** shown to be safe either. Anyone reading this pin as a fix has misread it.

**Scope, precisely: local development only. The Docker images are NOT pinned by it** — both `Dockerfile` and `Dockerfile.profile` build from the floating tag `node:24-slim`, which `.nvmrc` (inert in Docker) and `engines` (a warning at most; no `.npmrc`, so `engine-strict` is off) do not control.

### 5. No mitigation was bought, and the accepted cost is on the record

Per owner ruling A2, **no segfault mitigation was purchased** — no `--maxWorkers` cap, no `workerIdleMemoryLimit`. Capping workers would trade a permanent slowdown on every run for an intermittent flake, and the owner declined.

🔴 **Accepted cost, stated plainly: a red run stays ambiguous.** A reviewer or ship gate still cannot tell this flake from a regression at a glance; the correct response is re-run **and record both results**, never a silent retry. And per §4.2 of the findings, **a green run is not proof no worker died** — jest respawns a killed worker and can retry the suite, so the occurrence count is a floor, not the true frequency.

**Recognition signature:** if a jest worker dies with `SIGSEGV`, check `~/Library/Logs/DiagnosticReports/` for a `node-*.ips` whose stack starts at `ClearStaleLeftTrimmedPointerVisitor`, re-run explicitly, and say so.

### 6. Verification at close, and what split out

`npm test` **107 suites / 1075 tests, exit 0**; `npm run test:integration` **5 suites / 70 tests, exit 0** with **no `Force exiting Jest` line**; the `TEST_DATABASE_URL` guard rejects unset / empty / whitespace-only / tab+newline; `tsc --noEmit` and `npm run lint` both **0**; credential scan clean. Six review findings, **all verdict CORRECT, none disputed** — four fixed, R3 and R4 accepted as residuals by owner ruling (both err *conservatively*, making this task's own evidence look weaker rather than stronger). Round 2 verified every fix independently, none on assertion.

**Split out — `0200`** (owner amendment A4): the `supertest` profile-server flake. **9 failures in 170 runs, ~5.3 %** of every run containing a supertest suite, all nine landing in the four `supertest`-based `tests/profile-server/*` suites. Symptoms: `socket hang up`, 5 s timeouts, unexpected `404`s, a missing `access-control-allow-origin`, and a `401` added later — suspected at the time to be one transient localhost HTTP failure between supertest's ephemeral server and its client; the `404`s are **not** route-registration bugs. It reproduces on Node 20, 22 and 24 alike, so it is unrelated to the segfault's Node question. **`0200` closed 2026-09-01** — see [[tasks/supertest-profile-server-flake]].

> 🔧 **CORRECTED 2026-09-02 from `0200`'s own findings — two claims this paragraph carried were FALSE, and both are preserved here struck rather than deleted so the correction is auditable.**
>
> 1. ~~"the only four in the repository that use it"~~ — **FALSE. Seven** test files import `supertest`, including **`tests/server/Master.test.ts` on the default `npm test` path** and both `tests/integration/*` suites. The observation above it is unchanged and still holds — all nine measured failures did land in those four suites — but "confined to profile-server" is an **observed distribution, not a structural boundary**.
> 2. ~~"unlike the segfault it is in our own code"~~ — **FALSE.** `0200` confirmed the mechanism at the socket-API level and it is **not a repository defect**: it reproduces in ~40 lines of plain Node with no jest, no express and no project code. **Both** test-reliability problems turned out to be outside this repository. `0200`'s row also carries an `🏁 OUTCOME` note recording that its promotion premise — the more actionable of the two, because it is ours — was wrong.
>
> Also corrected: the symptom count is **five, not four** (a `401` on a route with no auth middleware was added 2026-09-01). **`0200` shipped no code fix**; every candidate was measured and refuted. Two shapes — that `401` and the `socket hang up` — remain **untraced and must never be recorded as explained**.

**Still open beyond `0200`'s close:** `.env.test` has not been created (the coder documented the variable name only, per the no-values rule), and the V8 defect itself is upstream — if it becomes frequent, the five crash reports are the artifact to attach to a Node/V8 bug report.

🔒 **This whole task is *about* a connection-string variable.** Variables and filenames only appear anywhere in its record; no value does.

## Related

- [[tasks/citizen-verified-icon]] — task `0068`, which routed this defect out rather than absorbing it, and whose `review.md` carries the five-vs-four error corrected here
- [[tasks/citizenship-name-change]] — task `0067`, where the symptoms were first observed
- [[systems/architecture-overview]] — the survey's build/run/test section and the "no CI, one host" ceiling this investigation ran into
- [[decisions/windoworigin-url-join-defect]] — task `0198`, which carried the `0197` segfault as an accepted residual
- [[tasks/supertest-profile-server-flake]] — task `0200`, the split-out flake; its findings corrected the two claims struck above
- [[decisions/sprint-4]] — the sprint board carrying this task and its `0200` follow-up
