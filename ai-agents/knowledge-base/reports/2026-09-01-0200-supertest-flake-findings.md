# 0200 — `supertest` profile-server flake: Phase 1 findings

**Date:** 2026-09-01
**Author:** `fkit-coder`, Build worker of the lead's `/fkit-sprint-ship-loop`
**Task:** `ai-agents/tasks/backlog/0200-supertest-profile-server-flake-confirm-and-fix/brief.md`
**Plan:** that folder's `plan.md` (blob `4a1b366d58fb6ac95bed411dc65dcdf6391b23ad`, 32 655 bytes —
verified on disk before any work), owner rulings **R1–R3** binding.
**Machine:** Apple M4 Pro, 14 cores, macOS 26.2, Node `v24.13.0`, jest `30.0.0-rc.1`,
supertest `7.2.2`, superagent `10.3.0`, express `4.21.1`.

---

## 0. Verdict, first

**MECHANISM: CONFIRMED** — at the socket-API level, with 6 independent instrumented traces plus a
jest-free reproducer.

**FIX: NONE AVAILABLE in test infrastructure. Every candidate in plan §3 is REFUTED with data.**

The failure is **not** in supertest's per-request server pattern, **not** in jest, **not** in express,
and **not** in `src/profile-server/`. It reproduces in ~40 lines of plain Node at a rate that is
**invariant** across every structural change tried — including the two the plan proposed as the fix.

**This lands on plan §3.4 / hypothesis H-E**, but a far better-characterized H-E than the plan
anticipated: not "some transient localhost condition" but a **reproducible, measurable ~0.22 %
per-request loss of the TCP accept on 127.0.0.1 HTTP connections on this host**, unchanged by how the
server is created, bound, awaited, shared, or closed.

✅ **Resolved 2026-09-01.** The owner ruled **Option 1 — recognition note only, no code change**,
settling **D1** and **D4**. The note is written into `CLAUDE.md` (`## Testing`). Options 2 (fix the
leak knowingly), 3 (escalate upstream) and 4 (keep investigating) were **declined** — see §7. No
source, test or config file was changed, in Phase 1 or Phase 2.

⚠️ **Scope of "confirmed", stated once and up front:** it covers the **timeout sub-shape** (and its
`Jest did not exit` companion). It does **not** cover `socket hang up`, the unexpected `404`, the
missing CORS header, or the `401` — see §5.2. Do not read "mechanism confirmed" as covering all five
shapes.

---

## 1. The mechanism, stated precisely

Per `request(app)` call, supertest does this in **one synchronous tick**
(`node_modules/supertest/lib/test.js:34-68`):

```
http.createServer(app)  →  server.listen(0)  →  read server.address().port  →  http.request(...)
```

Roughly **1 request in 450** (jest-free measurement) does the following, every time identically:

| Observation | Evidence |
|---|---|
| The client's TCP handshake **completes** | `cli_sock_connect` **and** `cli_sock_ready` fire, with `remotePort` set to the server's port |
| The server **never accepts** it | no `connection` event — `srv_conn` count is exactly one short of `cli_req` in every failing trace; `accepted: false` on **every** jest-free hang |
| The app never sees it | no `srv_req` — the probe sits **before** express, so express is excluded |
| No error is ever raised | no `cli_err`, no `cli_sock_err`, no `ECONNREFUSED`, no `ECONNRESET` |
| The request simply never resolves | next event in the process is 5 000 ms later |
| The ephemeral server is **never closed** | no `close` event for that `sid` |

The last row is the whole of the second symptom. supertest calls `server.close()` **only inside the
response callback** (`lib/test.js:133-160`). A request that never completes therefore leaves its
listener bound, the jest worker cannot exit, and you get
`Jest did not exit one second after the test run has completed`.

**The hang and the timeout are one defect seen twice, not two defects.**

### 1.1 Why every symptom in the brief reads as `Exceeded timeout of 5000 ms`

Jest's default per-test timeout is 5 000 ms. **Any** stalled supertest request reports as
`Exceeded timeout of 5000 ms` regardless of cause. The plan already warned (§0.3) that this number is
**not** a fingerprint of superagent's agent timeout, which happens to share the value. Confirmed here:
the 5 000 ms is jest's clock, nothing more.

### 1.2 A worked trace

Clean baseline `run-045`, the whole life of the failing request:

```
329  listen      sid 11  port 49189  fd 12
329  cli_req     rid 11  target 127.0.0.1:49189/v1/profile/name-change-cancel
330  cli_socket  rid 11  fd 13  localPort 49190  connecting=true
330  cli_sock_connect  rid 11  localPort 49190  remotePort 49189
330  cli_sock_ready    rid 11  localPort 49190  remotePort 49189
     ... nothing. no srv_conn. no srv_req. no close. ...
```

The immediately preceding request, on the same fd, is entirely normal:

```
328  srv_conn        sid 10  port 49187  srvFd 12  connFd 13
328  srv_req         sid 10  POST /v1/profile/name-change-cancel
328  srv_res         sid 10  status 400
328  close           sid 10  port 49187  fd 12
```

---

## 2. Hypothesis ledger — every hypothesis, with its outcome

Plan §2.5's table, resolved. **Negatives are findings and are reported as such.**

| # | Hypothesis | Outcome | Evidence |
|---|---|---|---|
| **H-A** | Contention between parallel jest workers | **REFUTED — twice, independently** | (1) The reproducing harness runs in **one process**. `pids=1` in **10/10** captured traces. Jest's `shouldRunInBand` (`node_modules/@jest/core/build/index.js:3516-3522`) returns true for `tests.length <= 20 && timings.length > 0 && areFastTests`, so **`--maxWorkers=4` is ignored** for four fast suites once timings are cached. (2) The brief's own discriminator: **7 failures / 100 full-suite `--runInBand` runs** (§4.1) where H-A predicts ~0. Also reproduces with **zero** jest involvement at all (§3). |
| **H-B** | Intra-process ephemeral-port recycling | **REFUTED** | In every failing trace the target port appears **exactly once** in the whole process's port history — it was never previously bound. Falsification criterion from §2.5 met exactly. |
| **H-C** | Response cross-talk (client reads another request's response) | **REFUTED for this shape** | There is **no response at all** — server-side and client-side agree that nothing was sent. ⚠️ **Not** refuted for the `401` symptom (§5.2). |
| **H-D** | Late completion, not loss | **REFUTED** | Jest-free harness with a 2 000 ms budget and jest runs with a 5 000 ms budget both end the same way; the 30–90 s watchdog runs show the process still stuck with the listener bound. Nothing ever arrives. **The "raise the timeout" candidate (plan §3.2) is therefore dead and must not be used.** |
| **H-E** | Transient / machine-local condition, not a repository defect | **STANDING — and now characterized** | Everything else is refuted, and the rate is invariant to every structural change (§3). ⚠️ **Cannot be positively proven on one host** (R2 / plan §5). |
| **H-F** | Pooled keep-alive socket reuse | **REFUTED at plan time; re-confirmed** | `superagent` sets `agent: false` (`node_modules/superagent/lib/node/index.js:162`); every response carries `Connection: close`. Banked in plan §0.3, unchanged. |
| **H-G** | The hang is a *consequence* — a timed-out request leaves its server unclosed | **CONFIRMED** | No `close` event for the failing `sid` in any trace; `Jest did not exit` in 5/5 hang runs. |
| **H-H** *(mine, added)* | libuv fd-reuse race: closing fd 12 and immediately re-listening on fd 12 loses the kqueue watcher | **REFUTED — by my own data** | Every failing trace *did* show fd 12 with the previous server closed on fd 12 1–3 ms earlier. But fd reuse is a **constant**: `listen` fds across one run are `{14: 90, 12: 11}`. And `run-125`'s failure was **`sid 1`, the first server in the process, with no preceding close at all.** Recorded because the correlation was genuinely persuasive until the distribution was checked. |

---

## 3. The fix candidates — all measured, all refuted

This is the section that decides Phase 2, so it is given in full.

A jest-free harness (`variants.cjs`, plain Node, no jest / express / supertest) reproduces the
mechanism, which lets each candidate be tested at high N cheaply. **Variant A is byte-for-byte what
supertest does today.**

| Variant | What it changes vs supertest today | Hangs | Rate | `accepted:false` on every hang? |
|---|---|---:|---:|---|
| **A** | nothing — the current pattern | 112 / 50 000 | **0.224 %** | yes |
| **B** | **await the `listening` event** + guaranteed close (plan §3.1's "lighter fallback") | 43 / 20 000 | **0.215 %** | yes |
| **C** | guaranteed close only, no await | 48 / 20 000 | **0.240 %** | yes |
| **D** | yield one loop turn (`setImmediate`) + guaranteed close | 53 / 20 000 | **0.265 %** | yes |
| **E** | **ONE shared listening server reused for every request** (plan §3.1's *main* branch) | 165 / 75 000 | **0.22 %** | yes |
| **G** | new server per request, bound to **IPv4 loopback explicitly** | 43 / 20 000 | **0.215 %** | yes |

**Every rate is the same rate.** Restructuring changes nothing. B and G land on the *identical*
count (43 / 20 000), which is the cleanest single-variable statement available: with the await held
constant, changing the bind family from `::` to `127.0.0.1` moves nothing at all.

### 3.1 What this kills, explicitly

- **Plan §3.1's main branch — "bind one server per suite instead of ~95"** — variant **E**. This was
  the plan's leading fix, the one whose test-isolation cost (**D1**) the plan flagged as possibly
  needing an owner ruling. **It does not fix the flake.** The ~95 binds per run are not the cause;
  a single long-lived server loses accepts at the same rate.
- **Plan §3.1's lighter fallback — `withApp(app, fn)` with an awaited `listen` and a `finally` close**
  — variant **B**. **It does not fix the flake either.** It *would* fix the **leak** (H-G) and
  therefore the `Jest did not exit` hang, but the request is still lost and the test still fails.
- **Plan §3.2 — raising the timeout** — dead via **H-D**. The request never arrives at any timeout.
- **Plan §3.3 — capping workers / `--runInBand`** — dead via **H-A**. The reproducing harness already
  runs in one process.
- **Plan §3.5 — retry** — forbidden outright by R3, and not proposed.

### 3.2 Two sub-findings worth keeping

**`server.listen(0, "127.0.0.1")` is asynchronous.** Supplying a host sends `listen` through
`lookupAndListen`, so `server.address()` returns `null` synchronously. Supertest's synchronous
`address().port` read (`lib/test.js:57-68`) works **only because** `listen(0)` omits the host. Any
"bind IPv4 explicitly" change must await `listening`. Variant G was corrected for this, which makes
**B vs G a clean single-variable comparison of bind family** — and G still hangs.

**Variant E's rate is linear from iteration 0**, so it is *not* an artifact of client-port wrap
against a fixed server port (the `TIME_WAIT` 4-tuple collision I checked for): 6 hangs in the first
5 000, then a steady 10–15 per 5 000 with no knee at the ~16 000 wrap point.

```
[E  5000/100000] hangs=6     [E 40000/100000] hangs=96
[E 15000/100000] hangs=32    [E 60000/100000] hangs=135
[E 25000/100000] hangs=59    [E 75000/100000] hangs=165
```

### 3.3 ⚠️ A rate that must not be transferred between harnesses

The jest-free per-request rate is **0.22 %**. Naively, ~95 requests per full jest run would predict
~19 % of runs failing. **The observed jest per-run rate is 4.0–7.0 %** (§4: 6/150, 4/100, 7/100), so
the per-request rate *inside jest* is roughly **0.05 %** — about 4× lower.

⚠️ **Two explanations for that 4× gap, and this report does not separate them:**

1. The tight standalone loop is more aggressive than jest.
2. **The two harnesses score a hang at different thresholds.** The reproducer calls it at
   **2 000 ms** (`PER_REQ_TIMEOUT`, §9); jest calls it at **5 000 ms**. Any request completing between
   2 s and 5 s is a *hang* in one and a *pass* in the other, which would inflate the standalone rate on
   its own.

Explanation 2 was **not excluded** and is not ruled out here.

**It does not touch H-D.** H-D ("requests complete late rather than never") is refuted on independent
evidence: all five hang runs in the `--runInBand` arm ran to the **full 90 s watchdog**
(`run 7/30/35/65/78 → 90, 90, 90, 90, 91 s`). Had the request completed at any point before 90 s,
supertest's response callback would have fired, closed the server, and let jest exit. It never did. So
the request genuinely never arrives — the threshold question affects only *how many* the standalone
harness counts, not *whether* they complete.

**Use 0.22 % only for comparing variants against each other**, which is what it was measured for, and
where the threshold is identical across all six arms so the confound cancels. Do not quote it as the
rate the test suite experiences.

---

## 4. Rates measured, with power stated

Per plan §2.2 and brief verification 1. Rule of three: 0 failures in N gives a 95 % upper bound ≈ 3/N.

| Arm | Harness | N | Flake failures | Rate | `0197` segfaults (classified **out**) |
|---|---|---:|---:|---:|---:|
| Clean instrumented baseline | 4 supertest suites, `--maxWorkers=4` | **150** | **6** | **4.0 %** | 0 |
| Full suite, **parallel** | `--maxWorkers=13` | **100** | **4** | **4.0 %** | **1** |
| Full suite, **serial** | `--runInBand` | **100** | **7** | **7.0 %** | 0 |

**Power of the baseline N:** at the brief's p = 0.053, P(zero failures in 150) ≈ 0.03 %. The arm was
never at risk of a false negative, and in fact produced 6.

**Crash-report parity:** `5` → `5` across the baseline arm; `5` → `6` across the parallel full-suite
arm (**exactly one** segfault, matching the one flagged run); `6` → `6` across the serial arm. The
`0197` family is counted separately everywhere and never pooled into this rate — and no attempt is
made to give the two one root cause.

The one segfault was `tests/AllianceRequestExecution.test.ts`,
`A jest worker process (pid=53427) was terminated by another process: signal=SIGSEGV` — a **core**
suite, not a profile-server one. `0197`'s family, at ~1 in 100, consistent with its recorded ~0.5 %.

### 4.1 `--runInBand` discriminator (brief step 1) — the answer

**`--runInBand` does NOT fix the flake. It survives serial execution at a rate at least as high.**

| | Parallel (`--maxWorkers=13`) | Serial (`--runInBand`) |
|---|---:|---:|
| Flake failures | **4 / 100 (4.0 %)** | **7 / 100 (7.0 %)** |
| `Exceeded timeout of 5000 ms` | 4 | 10 |
| `socket hang up` | 2 | 4 |
| `Jest did not exit…` | 0 | 5 |
| Median clean-run wall clock | **3 s** | **5 s** |

**Power, stated rather than assumed.** N = 100 per arm. H-A predicts ~0 failures serially; **7 were
observed**, so *"the flake does not vanish under `--runInBand`"* is solid. What N = 100 does **not**
support is the *direction* of the 4 → 7 difference: the 95 % intervals (≈1.1–9.9 % and ≈2.9–13.9 %)
overlap heavily. **Read this as "serial is no better", not as "serial is worse".**

This is the brief's single most informative named experiment, and it agrees with the direct
observation: the cheap reproducing harness already runs in one process with **no jest worker at all**
(`pids=1` in 10/10 traces). **H-A is refuted twice over, by two independent routes.**

The 3 s → 5 s figure is the measured cost a suite-wide `--runInBand` would impose (plan §3.3 / **D2**).
It is recorded for completeness only — **`--runInBand` is not a fix, so the cost question does not
arise.** No worker or concurrency setting was changed.

### 4.2 Symptom shapes, and one sub-shape my traces do NOT cover

| Shape | Baseline | Full parallel | Full serial |
|---|---:|---:|---:|
| `Exceeded timeout of 5000 ms` | 5 | 4 | 10 |
| `Jest did not exit one second after…` | 5 | 0 | 5 |
| `socket hang up` | 0 | 2 | 4 |

All four suites in the brief's scope were hit across the task's arms
(`NameChangeRoutes`, `PaymentsRoutes`, `InboxRoutes`, `Routes`).

⚠️ **Every one of my six instrumented traces captured the *timeout* sub-shape — the request that is
never accepted. `socket hang up` appeared only in the two uninstrumented full-suite arms (6
occurrences) and was therefore never traced.** `socket hang up` means the connection *was* established
and then torn down before a response, which is **not** the same event as "never accepted". So the
family may contain **more than one sub-mechanism**, and this report characterizes only the one it
traced. Stated rather than smoothed over.

---

## 5. Two things the brief and plan got slightly wrong, corrected

Neither changes their conclusions. Recorded because the next reader should not lean on the stated
reasons.

### 5.1 The plan's §0.5 correction is right, and there is one more

Plan §0.5 already corrected the brief's claim that the routes are registered "unconditionally" (they
are conditional on `paymentsRepo` / `inbox` / `nameChange` being defined — `Routes.ts:400`, `:592`,
`:734`). Confirmed. The conclusion survives because the failing tests all pass a repo.

⚠️ **Correction — an earlier draft of this report disposed of the `404` with a non-sequitur.** It said
the body capture "never needed" to distinguish anything because no response is produced at all. That
reasoning only holds *for the traced sub-shape*, and it is circular when applied to a shape **defined
by having a response**. The body capture was built to answer the `404` question and simply **never got
the chance** — the `404` did not occur in any `0200` arm (§4.2). The question does not go away; it went
unobserved.

### 5.2 THREE response-bearing shapes are **not** explained by this finding, and are left open

Plan §0.2 recorded a `401` on `GET /v1/profile` and called it "strictly more diagnostic". Re-verified
here: `internalAuth` is the file's only 401 source and is attached **only** to `/internal/*`
(`Routes.ts:290, 324, 658, 838`); `GET /v1/profile` (`Routes.ts:255-257`) carries only
`allowPublicCors` and `profileReadLimiter`. **No code path can answer `GET /v1/profile` with 401.**

**That symptom did not recur in this task** — not once across every arm — so it could not be traced.
The mechanism confirmed here produces **no response**, which cannot produce a `401`. So either the
`401` is a *second*, rarer failure mode (genuine response cross-talk, H-C), or it was a
one-off mis-attribution.

⚠️ **The identical argument applies to two more of the brief's five shapes, and an earlier draft of
this report failed to apply it.** Reading a `404` status, or reading
`access-control-allow-origin` off a response, **both require a response object to exist**. The
confirmed mechanism produces none. So all three sit in the same epistemic position:

| Shape | Occurred in any `0200` arm? | Explained by the confirmed mechanism? |
|---|---|---|
| unexpected `404` | **no** (§4.2) | **no** — response-bearing |
| `access-control-allow-origin` → `undefined` | **no** (§4.2) | **no** — response-bearing |
| `401` on a public route | **no** (§4.2) | **no** — response-bearing |

None of the three was observed here, so none could be traced, and **none is explained.** They remain
on the brief's list as historically observed shapes whose mechanism is unknown. Candidate explanations
— genuine response cross-talk (H-C, refuted only for the *traced* sub-shape), or mis-attribution — are
untested.

⚠️ **Stated plainly: this report does not explain the `401`, the `404`, or the missing CORS header.**
None is folded into the confirmed mechanism, and none should be recorded as explained.

### 5.3 Nor is `socket hang up` — and it DID occur here

Distinct from the three above, because this one was actually observed: **6 occurrences**, all in the
two **uninstrumented** full-suite arms (§4.2), and therefore **never traced**. `socket hang up` means
the connection *was* established and then torn down before a response — **not** the same event as
"never accepted".

⚠️ **The plan's two-trace confirmation bar (`plan:422-423`, §2.6) was met six times over — but only
for the timeout sub-shape.** "Mechanism confirmed" must not be read as covering `socket hang up`. The
family may contain more than one sub-mechanism. Tracing it was **Option 4, which the owner declined**
(§7.1); it stays recorded as untraced rather than chased.

---

## 6. The one-host ceiling

Restated, not buried. There is no CI and no second machine. **Every number here is from one host.**
H-E cannot be positively established; it is what is left standing after everything else is refuted.

Specifically untested and untestable here: whether this rate is a property of macOS 26.2, of this
Node build, of this hardware, or of localhost TCP generally. A reader must not infer that CI or
another developer's machine behaves this way — nor that it does not.

---

## 7. Phase 2 — what is left, and why it is the owner's call

Plan §3 offered five branches. **Four are refuted by measurement and the fifth is forbidden:**

| Plan branch | Status |
|---|---|
| §3.1 main — one shared server per suite | **refuted** (variant E, 0.22 %) |
| §3.1 fallback — `withApp` with awaited listen + guaranteed close | **refuted as a flake fix** (variant B, 0.215 %) |
| §3.2 — raise the timeout | **dead** (H-D refuted) |
| §3.3 — `--runInBand` / cap workers | **dead** (H-A refuted; serial is 7/100) |
| §3.5 — retry | **forbidden** by R3, not proposed |

That leaves exactly three things the owner can choose between. **The plan's §3.4 outcome — a finding
and a recognition note, no code change — is now the evidence-backed default, not a fallback.**

**Option 1 — §3.4 recognition note only (no code change).** Add the family's signature to `CLAUDE.md`
so a red run is recognized instead of misfiled: the four suites affected, the shapes
(`Exceeded timeout of 5000 ms` / `socket hang up` / unexpected `404` / missing
`access-control-allow-origin` / `401` on a public route), the `Jest did not exit` companion, the
crash-report check that separates it from `0197`, and the instruction to re-run explicitly and say so.
This is the concrete thing that stops the `0068` misrecording happening a third time — the cost the
brief says has already been paid once.

**Option 2 — Option 1 plus fix the *leak* only, knowingly.** Variant B does not stop the flake but it
does stop the **`Jest did not exit`** hang (H-G), by guaranteeing `close`. That converts a run that
hangs until killed into a run that fails fast. ⚠️ **It makes the symptom cheaper without removing the
cause, and it touches ~95 call sites across four suites** — a large diff for a partial win. It is
*not* on plan §3.1's stated rationale, because that rationale was "reduce the binds", which is
refuted.

**Option 3 — escalate beyond this repository.** The reproducer is ~40 lines of plain Node with no
jest, express, or project code. If this is a Node/libuv/macOS defect it belongs upstream, not in a
test refactor. ⚠️ **One host. This cannot be established here** (§6), and confirming it needs a second
machine or a CI runner, neither of which exists.

**These were D1 and D4 from the plan, and R1 kept both with the owner** — R1 permits a *confirmed*
mechanism to proceed into its selected branch without a second gate, but every branch it would have
proceeded into is refuted, and D4 ("whether a finding-only outcome closes the task") is by the plan's
own terms an owner decision.

### 7.1 Owner ruling — 2026-09-01

**OPTION 1 RULED: recognition note only, no code change.** Via `AskUserQuestion` in the `fkit lead`
session. **D1 and D4 are settled.**

| Declined | Owner's stated reason |
|---|---|
| **Option 2** — fix the leak (variant B) knowingly | ~95 call sites for a partial win on a rationale measurement has refuted. **Variant B was not written.** |
| **Option 3** — escalate upstream | Declined *for now*, on the one-host blocker (§6). ⚠️ Reopening it needs the reproducer — which is why it is inlined at §9 rather than left in a scratchpad. |
| **Option 4** — keep investigating | Declined. The untraced `socket hang up` sub-shape **stays recorded as untraced**, not chased. |

The note was written to `CLAUDE.md` under `## Testing`, immediately before
`### Integration tests (real Postgres)`.

---

## 8. Status

Phase 1 **complete**, mechanism **CONFIRMED for the timeout sub-shape**, all plan-§3 fix candidates
**refuted with data**.

**Phase 2 complete on the owner-ruled §3.4 branch:** the recognition note is written; **no code fix was
attempted**, because every candidate was refuted. Nothing in `src/` was touched, no test file was
edited, no config was changed, nothing was committed. `0200`'s status is left `🔄 In progress` — the
sprint driver owns it.

---

## 9. The reproducer, inlined

⚠️ **This code carries the entire "not a repository defect" claim, so it lives here rather than in a
session scratchpad that is garbage-collected.** Owner ruling D1, 2026-09-01: inline it into this
report; do **not** commit it as a runnable file — a file nothing runs or maintains is how `0201`'s
shell harness came to rot for two months.

To use it: save as `variants.cjs` outside the repo and run `node variants.cjs <A|B|C|D|E|G> <N>`.
Requires nothing but Node — **no jest, no express, no supertest, no project code.** Every rate in §3
came from this file on Node `v24.13.0` / macOS 26.2.

**Variant A is a faithful model of what supertest does today:** synchronous `listen(0)`, synchronous
`address().port`, same-tick `http.request({agent: false})`, and `server.close()` only on the response
path — so a lost response leaks the listener, exactly as `supertest/lib/test.js:133-160` does.

```js
"use strict";
const http = require("http");

const VARIANT = (process.argv[2] ?? "A").toUpperCase();
const N = Number(process.argv[3] ?? 20000);
const PER_REQ_TIMEOUT = 2000; // ⚠️ see §3.3 — this differs from jest's 5000 ms

let ok = 0, hangs = 0, errors = 0;
const hangDetail = [];

function makeServer() {
  return http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
  });
}

function fire(server, port, i, closeInFinally, neverClose) {
  return new Promise((resolve) => {
    let settled = false;
    let accepted = false;
    let sock = null;
    const onConn = (s) => { accepted = true; s.on("error", () => {}); };
    server.on("connection", onConn);
    const cleanupConn = () => server.removeListener("connection", onConn);

    const done = (kind, extra) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (kind === "ok") ok++;
      else if (kind === "err") errors++;
      else {
        hangs++;
        if (hangDetail.length < 40)
          hangDetail.push({
            i,
            serverPort: port,
            serverFd: server._handle ? server._handle.fd : null,
            clientLocalPort: sock ? sock.localPort : null,
            clientFd: sock && sock._handle ? sock._handle.fd : null,
            accepted,                    // <- false on EVERY captured hang
            listening: server.listening, // <- true on EVERY captured hang
            ...extra,
          });
      }
      cleanupConn();
      // Variant A mimics supertest: close ONLY on the response path.
      if (!neverClose && (closeInFinally || kind === "ok" || kind === "err")) {
        try { server.close(); } catch (_) {}
      }
      resolve();
    };

    const timer = setTimeout(() => done("hang", {}), PER_REQ_TIMEOUT);

    const req = http.request(
      { host: "127.0.0.1", port, path: "/x", method: "POST", agent: false },
      (res) => { res.resume(); res.on("end", () => done("ok", {})); },
    );
    req.on("socket", (s) => { sock = s; });
    req.on("error", (e) => done("err", { code: e.code }));
    req.end("{}");
  });
}

// A — exactly what supertest does today.
async function iterationA(i) {
  const server = makeServer();
  server.listen(0);
  const port = server.address().port; // supertest reads it synchronously
  await fire(server, port, i, false);
}

// B — plan §3.1's "lighter fallback": await 'listening' + guaranteed close.
async function iterationB(i) {
  const server = makeServer();
  await new Promise((r) => server.listen(0, r)); // same bind args as A
  const port = server.address().port;
  try { await fire(server, port, i, true); }
  finally { if (server.listening) server.close(); }
}

// C — guaranteed close only, no await (isolates which half of B matters).
async function iterationC(i) {
  const server = makeServer();
  server.listen(0);
  const port = server.address().port;
  try { await fire(server, port, i, true); }
  finally { if (server.listening) server.close(); }
}

// D — yield exactly one event-loop turn after listen.
async function iterationD(i) {
  const server = makeServer();
  server.listen(0);
  const port = server.address().port;
  await new Promise((r) => setImmediate(r));
  try { await fire(server, port, i, true); }
  finally { if (server.listening) server.close(); }
}

// E — plan §3.1's MAIN branch: ONE shared listening server for every request.
let sharedServer = null, sharedPort = null;
async function iterationE(i) {
  if (!sharedServer) {
    sharedServer = makeServer();
    await new Promise((r) => sharedServer.listen(0, r));
    sharedPort = sharedServer.address().port;
  }
  await fire(sharedServer, sharedPort, i, false, true);
}

// G — new server per request, bound to IPv4 loopback explicitly.
// supertest always dials 127.0.0.1 while listen(0) binds :: (dual-stack).
// NOTE: supplying a host makes listen() async, so this MUST await — which is
// what makes B vs G a clean single-variable comparison of bind family.
async function iterationG(i) {
  const server = makeServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  try { await fire(server, port, i, true); }
  finally { if (server.listening) server.close(); }
}

const iter = { A: iterationA, B: iterationB, C: iterationC,
               D: iterationD, E: iterationE, G: iterationG }[VARIANT];
if (!iter) { console.error("unknown variant " + VARIANT); process.exit(2); }

(async () => {
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await iter(i);
    if ((i + 1) % 5000 === 0)
      process.stdout.write(
        `[${VARIANT} ${i + 1}/${N}] ok=${ok} hangs=${hangs} errors=${errors} ${Date.now() - t0}ms\n`,
      );
  }
  if (sharedServer) sharedServer.close();
  console.log(JSON.stringify(
    { variant: VARIANT, n: N, ok, hangs, errors, wallMs: Date.now() - t0, hangDetail },
    null, 2,
  ));
  process.exit(0);
})();
```

**The jest-side instrumentation is not reproduced here.** It was a `--require` preload patching only
`http`/`net` (jest resolves core modules to the real realm objects, so it reached supertest without
editing any test file). Its outputs are quoted throughout §1–§2; the shim itself is not load-bearing
for the "not a repository defect" claim, which is why only the reproducer is preserved.
