# Investigation: the intermittent `MasterFeedbackRoutes` test failure — trace the "empty log" shape and decide whether this suite is the known supertest flake

## ID
0500

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0499`. `0500`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-26**, given live via `AskUserQuestion` in the lead's Claude Code session and
> relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel; ADR-021/037). Question: *"A test for the
> in-game feedback route failed once (passed on re-run), unrelated to our work. Open a small 'find out why' task?"* →
> **"File a small task (Recommended)"** — option text: *"Backlog board; traces the failure and decides if it's a known
> flaky test. Nothing waits on it."* ⛔ Not producer precedent.

> 📌 **Scope amended on an OWNER RULING of 2026-10-26** (same channel: live `AskUserQuestion` in the lead's session,
> relayed by `fkit-lead` to a spawned `fkit-producer`). The owner picked **"Add both to 0500 (Recommended)"** —
> option text: *"0500 already investigates random test failures; it stays on Backlog. Nothing waits on it. Knock-on:
> none (checked)."* Adds two more untracked one-off failures, both from task `0495`: `InternalPathCase` (an
> unexpected **401**) and `SshAlerts` (a missing message). See *Context → Two more failures added by the scope
> amendment*. Sprint, priority, status, owner and `Depends on` are **unchanged**; the task stays investigate-only.
> ⛔ Not producer precedent.

> 📌 **Second scope amendment on an OWNER RULING of 2026-10-26** (same channel: live `AskUserQuestion` in the lead's
> session, relayed by `fkit-lead` to a spawned `fkit-producer`). The owner picked **"Add it to 0500 (Recommended)"** —
> option text: *"0500 confirms it against all odd failures, then proposes the fix as a plan. Stays on Backlog.
> Knock-on: none (checked)."* Adds a read-only `fkit-coder` diagnosis of 2026-10-26: item A's routing lead is
> answered (no guard bypass), and a new lead — **port shadowing on macOS** — is to be checked against every
> status-carrying flake shape. See *Context → New finding (2026-10-26): A answered, and port shadowing* and *What to
> build* step 7. Sprint, priority, status, owner and `Depends on` are **unchanged**; the task stays investigate-only.
> ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design — the Priority cell stays `—`.)

## Status
🔲 Backlog

## Owner
fkit-coder

This is an **investigation, not a fix.** Its output is a findings report. **No test or source change ships from this
task** — if a fix is warranted, the report proposes it as a plan and the owner rules on it (spawn instruction relayed
from the owner's ruling: *"investigate only, no fix without a plan"*).

## Context

### The failure that triggered this

- **Suite / check:** `tests/server/MasterFeedbackRoutes.test.ts` › *"falls back to stdout, and 200, when Telegram is
  not configured"* (the last case of the `/api/subscribe` characterization block).
- **When:** task `0496`, full `npm test` run 1 (2026-10-26). **1 failed.** The assertion that failed was the
  captured **info log being empty** — it did not contain `[subscribe] a@example.invalid`.
- `0496`'s worklog records: not the supertest timeout shape, not a `SIGSEGV`; neither the test file nor `src/server/`
  was touched by `0496` or any uncommitted task. **Passed 3/3 run alone. Full re-run green** (238 suites, 5042 tests,
  92 s). Cause not traced.

### Earlier failures of this same suite (all recorded only in closed tasks' worklogs — never collected)

| Task | Case | Shape recorded | Alone afterwards |
|---|---|---|---|
| `0307` | *posts to the bot's sendMessage endpoint…* | `Exceeded timeout of 5000 ms` | 3/3 |
| `0389` | (case not named) | "Telegram call missing" — one of several supertest suites failing in the same runs; load average 7–9 | 5/5 |
| `0412` | *answers 500 when the send is refused* | unexpected **404** | 3/3 |
| `0496` | *falls back to stdout, and 200, when Telegram is not configured* | **captured info log empty** — new shape | 3/3 |

The investigator should re-read those four worklogs rather than trust this table — it is the producer's summary.

### Why this matters

- **CLAUDE.md's known-flake table does not list this suite.** Its "Where" line names the four
  `tests/profile-server/*Routes.test.ts`, `tests/server/Master.test.ts`, and the two integration suites. This suite
  uses `supertest` too, so every worker who hits it has to judge alone whether it is the flake — four times so far.
- **The "empty log" shape is not in the table at all.** It is also not obviously the confirmed mechanism: the
  confirmed mechanism (`0200`) produces **no response**, while this assertion runs *after* `await request(...)`
  resolved — so a response of some kind came back.

### Leads (producer-read 2026-10-26 — unverified; re-check by symbol, line numbers drift)

These are starting points, not findings:

- In `src/server/Master.ts`, the `/api/subscribe` handler's not-configured branch calls `log.info(...)`
  **synchronously, before** `res.json({ ok: true })`. If the handler ran, the log line should be there by the time the
  response arrives. An empty log therefore suggests **the handler's not-configured branch never ran** for that
  request.
- The test asserts in this order: `fetchMock` not called → info log contains the email → `res.body` equals
  `{ ok: true }`. **It never asserts `res.status`, despite "and 200" in its title.** So a response that never reached
  the handler — a `404` (as in `0412`), a `429` from the route's rate limiter, a `400` — would fail at the **log**
  assertion first and look like "empty log". The empty-log shape may be the `0412` unexpected-status shape seen
  through a different assertion. The 0496 output may or may not have printed the status; check.
- The suite re-loads `Master.ts` per case inside `jest.isolateModules`, with env vars set and restored around the
  load, and a mocked `Logger` whose `child()` pushes into a module-level `logCalls` array cleared in `beforeEach`.
  Whether module isolation, the env save/restore, or the mock wiring can misbehave under load is part of the question.

### Two more failures added by the scope amendment (2026-10-26)

Both seen during task `0495` (folder still in `ai-agents/tasks/backlog/0495-…`), both recorded **only** in its
worklog, both green on re-run, neither traced. Facts below are the producer's reading of `0495`'s `worklog.md` and
`review.md` — re-read them; do not trust this table.

| # | Suite › case | When | Symptom recorded | Afterwards | Source |
|---|---|---|---|---|---|
| A | `tests/profile-server/InternalPathCase.test.ts` › *"/Internal is 404 and never runs the handler"* | `0495` review-round-2 fix, full `npm test` run 1 (1 failed / 5165 passed, 237/238 suites) | expected **404**, got **401** | full re-run green (238/238, 5166/5166); suite alone 5/5 green (27/27) | `0495` worklog, round-2 entry |
| B | `tests/profile-server/SshAlerts.test.ts` › *"a PASSWORD login never hides inside a KEY group: it gets its own immediate message"* | `0495` build (B3), full `npm test` run 1 (1 failed / 5151 passed, 238 suites, 101 s) | **expected 2 messages, got 1** (`h.sent` length) | full re-run green (5152/5152); suite alone 5/5 green (46/46) | `0495` worklog, build entry; `0495` review.md ("Disproven or not raised") |

- **Both:** no file under `src/profile-server/` or `tests/profile-server/` was changed by `0495`. For A the worklog
  records **no `SIGSEGV` and no `node-*.ips` report**; for B it records neither way — the `0197` check is **not
  recorded** for B.
- **Not captured for either:** the full jest failure output (stack, diff, which parametrized route A hit). Only the
  one-line summaries above exist. Do not reconstruct them.
- ⚠️ **Correction to how B was relayed.** The spawn that amended this task described B as the `tests/ssh-alerts.sh`
  **shell harness** run through `tests/scripts/ShellHarnesses.test.ts`. `0495`'s worklog says otherwise: the failing
  suite was the **jest suite** `tests/profile-server/SshAlerts.test.ts` (task `0443`'s SSH-alert route), and the
  failing case name exists in that file (a supertest suite). Run 1 had exactly one failure, so the shell harnesses
  passed in it. Treat B as the jest suite; confirm from the worklog before relying on either.

**Leads for A and B (producer-read 2026-10-26 — unverified; re-check by symbol):**

- **A — a 401 here may not be "a 401 on a route with no auth middleware".** CLAUDE.md's flake table lists a `401`
  under "seen historically, mechanism unknown" for routes with **no** auth middleware. The internal routes in
  `src/profile-server/Routes.ts` **do** sit behind `internalAuth` (which answers 401), and the alert routes have
  their own token checks. So a 401 on a `/Internal/...` path is consistent with **two very different stories**:
  (1) the request was routed case-insensitively to an internal route and stopped at its auth — i.e. the
  case-sensitive-routing property this suite pins (task `0276`; the suite's header explains that
  `app.set("case sensitive routing", true)` must run before the first `app.use`) **failed for one request**; or
  (2) the 401 came from somewhere else (another middleware, a response mix-up under load). **Establish which before
  calling A the flake.** Story (1) would be a security-relevant finding (the network-layer guard behind
  `PROFILE_INTERNAL_TOKEN`), not a test-noise one — if the evidence points there, say so loudly at the top of the
  report.
  - ✅ **Resolved 2026-10-26 (second scope amendment) — story (1) is ruled out; no guard bypass.** The original
    lead is kept above as history. See *New finding (2026-10-26)* below for the evidence. Story (2) — the 401 came
    from somewhere else — is what remains, and the port-shadowing lead is now the candidate for it.
- **B — load-sensitive timing in the suite's own harness.** `0495`'s reviewer noted the suite's `settle()` is
  microtask / `setImmediate` based and imports only `src/profile-server/*` and `src/core/notifications`. A
  `settle()` that returns before the second send lands under full-suite load would give exactly "2 expected, 1
  sent" — a **suite-specific** shape (class (c) below), not the `0200` mechanism. Check what `settle()` actually
  waits for.

### New finding (2026-10-26): A answered, and port shadowing

From a **read-only `fkit-coder` diagnosis on 2026-10-26**, relayed by `fkit-lead`. The conclusions below are **the
coder's**, not verified by the producer; re-check by symbol (line numbers drift). For the original `0496`
empty-log failure the port-shadowing explanation is **most likely, not proven**.

**1. Item A's security lead is answered: no guard bypass (coder's conclusion).**
- `src/profile-server/Routes.ts` (~line 603) sets case-sensitive routing **before the first mount**, on a **fresh
  app per `createApp`** call. Express 4 builds each route's match regex **once, at registration**, so timing or load
  cannot change how a path is matched afterwards.
- The test sends the **correct** token (`tests/profile-server/InternalPathCase.test.ts`, ~lines 201 and 208). So if
  a mixed-case request ever did slip through to an internal route, it would answer **200**, not 401. A 401 is
  therefore not the signature of the guard failing.
- Stress check: **4,500 mixed-case requests under CPU load → 0 handler runs, 0 × 401.**

**2. New lead — port shadowing on macOS (coder's diagnosis).**
- supertest **7.2.2** calls `app.listen(0)` — that listens on **all addresses** (`::`) — and then sends the request to
  `127.0.0.1:<port>` (`node_modules/supertest/lib/test.js`, ~lines 60–69).
- On macOS, a wildcard listener can be given a port number that **another local program already holds on
  `127.0.0.1`**. The request then reaches **that other program**, not the test server.
- **Reproduced on the owner's Mac in plain Node** (no jest, no project code): a foreign **401** (answered by a VS Code
  helper), a **403** (another app), **`ECONNRESET`**, and a **silent hang** — each matching a recorded flake shape.
- Seen **only under connection churn**: 0 occurrences in 20,000 idle start/close cycles. That fits "fails only in
  full runs".
- Binding `127.0.0.1` explicitly: **0 foreign answers in one 15,000-request run.** Suggestive only — a single run;
  about a **5 % chance** of seeing 0 by luck even if the fix did nothing.
- Also seen during the diagnosis: `SessionRoutes.test.ts` answered **403 where 401 was expected**, once, under extra
  load.
- ⚠️ **It does NOT explain `0200`'s confirmed timeout shape** (handshake completes, no response). That mechanism stays
  as `0200` recorded it — never merge the two into one root cause.
- How it could explain this task's shapes (to be confirmed, not assumed): A's **401** and `0412`'s **404** would be
  another program's answer; `0496`'s **empty log** fits a foreign answer that never reached the handler (see the
  missing `res.status` assertion lead above). B (`SshAlerts`, 2 expected / 1 sent) is **not** obviously a
  status-carrying shape — check whether it fits at all, or stays a `settle()` question.

**3. ⚠️ Safety note for whoever runs this task.** During this diagnosis the coder **accidentally left 16 CPU-spinning
helper processes running for about 10 minutes** (load average peaked around **146**) on the owner's Mac, which has a
kernel-panic history (see CLAUDE.md, task `0427`). For every experiment in this task:
- use **bounded, killable** processes only — a fixed iteration count or a hard time limit, and a way to kill them all;
- check for and kill leftover background processes **before and after** each experiment;
- **never** run a load or churn experiment **alongside a full `npm test`** (or any second full run).

### Rules this task must respect (CLAUDE.md, "Known flake — `supertest` suites")

- **Rule out `0197`'s segfault first** for any failure reproduced (`signal=SIGSEGV`, or a
  `~/Library/Logs/DiagnosticReports/node-*.ips` whose stack starts at `ClearStaleLeftTrimmedPointerVisitor`).
  **Never give the two one root cause.**
- **No retry, ever** — neither as a proposed fix nor as a way to make the suite pass.
- **Nothing from the "refuted as flake fixes" list** may be proposed or attempted as a fix: shared server per suite ·
  awaiting `listening` · guaranteeing `close` · IPv4-bound listen · `--runInBand` · raising the timeout. (Guaranteeing
  `close` fixes the `did not exit` leak only, and was declined on cost.)
  - ⚠️ **One narrow exception, from the 2026-10-26 second scope amendment** (the owner's option text: *"…then proposes
    the fix as a plan"*). If port shadowing is confirmed (step 7), the report **may propose** "test servers listen on
    `127.0.0.1` through one shared helper that awaits `listening`" — which is exactly `0200`'s variant **G**
    (IPv4-bound listen + await `listening`). It may be proposed **only** for the status-carrying shapes, **only as a
    plan for owner approval**, and the report must say plainly that `0200` measured variant G and found it does
    **not** change the timeout shape (0.215 %), so it is **not** a fix for that shape. Nothing is applied in this task.
- **Run tests only through the npm scripts** (`npx jest` bypasses the project test lock, task `0427`). **One full run
  at a time** — the owner's Mac has kernel-panicked during parallel full runs (cause unproven). Targeted runs
  (`npm test -- tests/server/MasterFeedbackRoutes.test.ts`) take no lock and are the cheap way to repeat this suite.
- **Bounded, killable experiments only** — see the safety note under *New finding (2026-10-26)*. No load or churn
  experiment alongside a full `npm test`.

## What to build

A findings report at `ai-agents/knowledge-base/reports/<YYYY-MM-DD>-0500-masterfeedbackroutes-flake-findings.md`,
plus the worklog. No source or test changes.

1. **Collect the shapes.** Read the four worklogs (`0307`, `0389`, `0412`, `0496`) and record each failure: case,
   exact symptom, run context (full vs alone, load if recorded), outcome alone. Correct the table above where it is
   wrong.
2. **Trace the empty-log failure.** Establish what response that request actually got and why the not-configured
   branch's log line was missing. Use instrumented **local, throwaway** runs as needed (diagnostic logging in a scratch
   copy or reverted before hand-off — nothing lands). Try to reproduce under load the way it happened (inside a full
   run, or with the suite repeated as targeted runs while the machine is busy), respecting the one-full-run rule.
   If it cannot be reproduced, say so plainly and state what the evidence still supports.
3. **Classify it.** For each shape, say whether it is: (a) the confirmed `0200` mechanism, (b) a listed-but-untraced
   shape (`404`, `socket hang up`, …), (c) something specific to this suite (module isolation, env handling, mock
   wiring, rate limiter), or (d) unknown. State the evidence and how certain each call is.
4. **Recommend on CLAUDE.md.** Say whether this suite belongs in the known-flake table's "Where" line, and whether
   the empty-log shape (or "Telegram call missing") belongs in the shapes table. **Draft the exact wording** but do
   **not** edit CLAUDE.md — that edit needs the owner's approval and is a separate step after the report.
5. **Note any test-quality gap found on the way**, e.g. the missing `res.status` assertion, as a proposal for the
   owner — not a change. A change that makes the failure *read* more clearly (asserting status first) is not a flake
   fix and must not be presented as one.
6. **The two added failures, A and B (scope amendment 2026-10-26).** For each, the same treatment as steps 1–4, in
   its own section of the same report:
   - **Record** it from `0495`'s worklog (and review.md for B), citing the entry.
   - **Trace** it: for **A**, establish where the 401 came from — reached an internal route's auth (the
     case-sensitive-routing property failed) or something else. That answer leads the A section either way. For
     **B**, establish what `settle()` waits for and whether the second send can land after it under load.
     Reproduce under load as in step 2 (targeted runs while the machine is busy; one full run at a time). If not
     reproducible, say so and state what the evidence still supports.
   - **Classify** it into (a)–(d) as in step 3, with evidence and certainty.
   - **CLAUDE.md:** say whether `InternalPathCase.test.ts` and `SshAlerts.test.ts` belong in the known-flake "Where"
     line (neither is a `*Routes.test.ts` suite, so neither is listed today), and whether A's 401 is the table's
     existing `401` row or a different shape. Draft wording only — no edit.
   - If A's trace points to the routing property really failing, **stop and report it as its own finding** for the
     owner — it is then not a flake question, and no fix ships from this task.
   - *(2026-10-26 second amendment)* For **A**, the coder's diagnosis already answers the routing question (no guard
     bypass — see *New finding*). Re-check that evidence and record it as the A section's lead; the open question
     for A is now where the 401 **did** come from (step 7).
7. **Port shadowing (second scope amendment 2026-10-26).** Confirm or refute the coder's port-shadowing mechanism
   (see *New finding (2026-10-26)*) against **every status-carrying flake shape**: the **401**, **403**, **404** and the
   **missing CORS header** (`access-control-allow-origin` → `undefined`) — including **`MasterFeedbackRoutes`** (the
   `0412` 404 and the `0496` empty log) and **A** (`InternalPathCase`). Also say whether **B** (`SshAlerts`) fits it at
   all, or stays a `settle()` question.
   - When a failure happens during this task, **capture the full jest output** (not a one-line summary) **and which
     local ports were held at that moment** (e.g. a listing of listening sockets), so a foreign answer can be tied to
     the program that held the port. Do not write other programs' ports or addresses into the report beyond what
     the finding needs — no endpoints, no secrets.
   - Respect the safety note: bounded, killable processes only; never alongside a full `npm test`.
   - **If confirmed**, the report proposes — as a **plan for owner approval, not applied** — that test servers listen
     on `127.0.0.1` through **one shared helper that awaits `listening`** (either ~95 call sites changed, or one
     wrapper around supertest; the report weighs the two). The plan must carry the `0200` variant-G caveat from
     *Rules* (does not touch the timeout shape). **Investigate-only stays:** no source or test change ships here.
   - **If refuted or unresolved**, say so plainly, with what the evidence still supports.

## Verification steps

- The report exists at the path above and contains: a shapes table covering all four recorded failures with each one's
  source worklog cited; a classification per shape with its evidence and stated certainty; an explicit
  `0197`-ruled-out line for any failure reproduced during the investigation.
- The report states **what response the empty-log request received** (status and body) — or, if that could not be
  established, says so and gives the reason. "Probably the flake" without evidence does not pass.
- The report contains a yes/no recommendation on adding this suite (and which shapes) to CLAUDE.md's known-flake
  section, with the **draft wording** quoted — and confirms CLAUDE.md was **not** edited.
- The report has a section each for **A** (`InternalPathCase`, the 401) and **B** (`SshAlerts`, 2 expected / 1
  sent), each with its `0495` source cited, a classification with evidence and certainty, and a yes/no CLAUDE.md
  recommendation with draft wording.
- The **A** section states where the 401 came from — the internal route's auth, or elsewhere — or says plainly that
  this could not be established and why. If the routing property is implicated, that is stated at the **top** of the
  report, not inside the A section.
- The **B** section states what `settle()` waits for, as read from the code.
- The report has a **port-shadowing section** (step 7) that gives a confirmed / refuted / unresolved call for each
  status-carrying shape (401, 403, 404, missing CORS header), with evidence and certainty; says whether B fits it;
  and keeps it separate from `0200`'s timeout mechanism. Any failure seen during the task has its full output and the
  held-ports snapshot recorded in the worklog.
- If port shadowing is confirmed, the 127.0.0.1-helper fix appears **only as a plan for owner approval**, with the
  `0200` variant-G caveat stated.
- No proposal in the report is a retry or an item from the "refuted as flake fixes" list — **except** the
  127.0.0.1-helper plan, under the narrow exception in *Rules*.
- The worklog records that no experiment ran alongside a full `npm test`, and that no helper processes were left
  running at hand-off.
- `git diff -- src/ tests/` is empty at hand-off (any diagnostic instrumentation was reverted).
- The worklog records every test run made: command, full vs targeted, result, and that runs went through the npm
  scripts.
- No secrets in the report (the suite uses fake tokens and `.invalid` hosts; keep it that way — no real bot token,
  chat ID or proxy URL).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing. Nothing waits on this task (owner's option text: *"Nothing waits on it."*).
- **Related:** `0200` (the supertest flake findings — `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`);
  `0197` (the V8 segfault — must be ruled out, never merged with this); `0427` (the full-run test lock); `0277`
  (wrote this characterization suite — its header says a failing case means the code is wrong, **not** the test, so
  do not edit the cases to make them pass); `0495` (source of failures A and B — scope amendment 2026-10-26); `0276`
  (wrote `InternalPathCase.test.ts` and the case-sensitive-routing guard); `0443` (wrote `SshAlerts.test.ts` and the
  SSH-alert grouping); `0300` (backlog — may change the feedback route's response contract and
  would then touch this suite; not a dependency).
- **Follow-ups this may produce, each for the owner:** a CLAUDE.md edit (owner-approved wording); possibly a small
  test-clarity task (e.g. assert status first). Neither is in scope here.
- Scope line ("investigation only") comes from the owner's ruling as relayed; the five steps under *What to build* are
  the producer's breakdown of the three goals the spawn named (trace the empty-log failure; decide on the CLAUDE.md
  flake list; record the shapes). Step 6 is the producer's breakdown of the 2026-10-26 scope amendment ("Add both to
  0500").
- **Follow-ups A may produce:** if failure A turns out to be the case-sensitive-routing guard really failing, that is
  a separate owner decision (likely its own task), not a flake follow-up. *(2026-10-26: the coder's diagnosis found
  no guard bypass — see Context. Kept as history.)*
- **Follow-up step 7 may produce:** if port shadowing is confirmed and the owner approves the plan, the 127.0.0.1
  shared test-server helper is its own task (filed after the report), plus a CLAUDE.md flake-section update
  describing the mechanism. Neither is in scope here. Step 7 is the producer's breakdown of the 2026-10-26 second
  scope amendment ("Add it to 0500").
- **Title and folder name still name only `MasterFeedbackRoutes`.** Left as filed so links and the Backlog board row
  stay valid; the scope is what *Context* and *What to build* say. The report path may keep the
  `masterfeedbackroutes` slug.
