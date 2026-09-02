# Confirm and Fix the `supertest` Profile-Server Flake

**Source**: `ai-agents/tasks/done/0200-supertest-profile-server-flake-confirm-and-fix/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — test-reliability track (`0197` → `0200`)

> ✅ **Closed 2026-09-01 by a spawned producer — agent-closed, not owner-verified.**
>
> 🚨 **Closed with NO CODE FIX — a recognition note only (owner ruling 2026-09-01, the findings' §3.4 branch). This is not "flake fixed."** No source, test or config file was touched, in either phase.
>
> **Findings of record:** `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`, with the ~40-line reproducer inlined (owner ruling D1).

## Goal

Split out of `0197` under **owner amendment A4** — *characterize the flake inside `0197`, fix it under a separate brief.* `0197`'s 200-run sweep programme found its jest-worker `SIGSEGV`, and found as a by-product a second, entirely different failure roughly ten times more frequent: **9 failing runs in 170, ~5.3 % of every run containing a `supertest` suite**, reproducing on Node 20, 22 and 24 alike.

Sprint placement and **Medium** priority were both owner-ruled 2026-08-29 (the rank was the producer's and the owner confirmed rather than disturbed it), promoting it from the Backlog board into Sprint 4.

**Investigation-first by design.** The brief's own leading hypothesis was explicitly *localized but not proven*, and the brief said so: assuming it and jumping to a fix would repeat exactly the mistake that produced the wrong turn in the first place.

📌 **The task exists because the flake had already cost one.** This failure was misrecorded as a `SIGSEGV` in `0068`'s `review.md`, which put a five-suite segfault count into `0197`'s brief and steered that investigation toward the wrong hypothesis class.

## Key Changes

**None in source, tests or config.** The deliverables are documentation:

| File | Change |
|---|---|
| `CLAUDE.md` | A recognition note in `## Testing` — **+33 / −0**, purely additive |
| `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md` | Phase 1 findings, with the jest-free reproducer inlined |

## Outcome

### 1. Mechanism CONFIRMED — for the timeout shape only, and NOT a repository defect

Per `request(app)` call, supertest does `http.createServer(app)` → `server.listen(0)` → read the port → `http.request(...)` in one synchronous tick. Roughly **1 request in 450** (jest-free measurement) then does the following, identically every time: the client's TCP handshake **completes** (`connect` and `ready` both fire with `remotePort` set), the server **never accepts** it (no `connection` event), the app never sees it (the probe sits *before* express, which excludes express), **no error is ever raised**, and the request simply never resolves. The ephemeral server is never closed, because supertest calls `server.close()` only inside the response callback — which is the whole of the `Jest did not exit` companion symptom. **The hang and the timeout are one defect seen twice.**

**Confirmed at the socket-API level** by 6 independent instrumented traces plus a jest-free reproducer. **It is not in supertest's per-request server pattern, not in jest, not in express, and not in `src/profile-server/`** — it reproduces in **~40 lines of plain Node** with no jest, no express and no project code, at a rate invariant to every structural change tried.

⚠️ **`Exceeded timeout of 5000 ms` is jest's clock, nothing more** — any stalled supertest request reports that way regardless of cause. It is **not** a fingerprint of superagent's agent timeout, which happens to share the value.

### 2. Every candidate fix was MEASURED and REFUTED — including the plan's own leading one

- **A shared server per suite** left the rate identical: `165 / 75 000 = 0.22 %` against a `0.224 %` baseline.
- **Awaiting `listening`**, **guaranteeing `close`**, and **binding IPv4** likewise changed nothing.
- **`--runInBand`** did not help: **7 failures / 100 serial full-suite runs**.
- **Raising the timeout is dead too** — all five hang runs ran to the full 90 s watchdog.

Options 2 (fix the leak knowingly), 3 (escalate upstream) and 4 (keep investigating) were **declined** by the owner; Option 1, the recognition note, was ruled.

### 3. 🚨 TWO SHAPES REMAIN UNEXPLAINED and must never be recorded as resolved

- **The `401`** on `GET /v1/profile`, a route with **no auth middleware** — `internalAuth` is the file's only `401` source and is attached exclusively to `/internal/*`, so no code path in the app can produce it. It **never recurred** in any `0200` measurement arm and was therefore **never traced. Mechanism unknown.**
- **The `socket hang up` sub-shape** — **6 occurrences**, all in uninstrumented arms, **never traced.**

The confirmed mechanism produces **no response at all**, which cannot produce a `401` — so that shape is either a second, rarer failure mode (response cross-talk) or a one-off mis-attribution. **Both are untested.** Recording an untraced shape as understood is the `0068` error this whole task exists to stop.

The **unexpected `404`** and the **missing `access-control-allow-origin`** are likewise outside the confirmed scope. "Mechanism confirmed" covers the **timeout sub-shape and its `Jest did not exit` companion** — and nothing else.

### 4. 🔧 A propagated claim this task DISPROVED

The four `tests/profile-server/*` suites were **never** "the only suites in the repository using `supertest`." **Seven** test files import it:

| File | Runs under |
|---|---|
| `tests/profile-server/InboxRoutes.test.ts` | `npm test` |
| `tests/profile-server/NameChangeRoutes.test.ts` | `npm test` |
| `tests/profile-server/PaymentsRoutes.test.ts` | `npm test` |
| `tests/profile-server/Routes.test.ts` | `npm test` |
| **`tests/server/Master.test.ts`** | **`npm test` — the DEFAULT path** |
| `tests/integration/Routes.it.test.ts` | `npm run test:integration` |
| `tests/integration/NameChange.it.test.ts` | `npm run test:integration` |

⚠️ **Only the "only four" clause was wrong — the observation above it still holds:** all 9 measured failures did land in those four suites, and the one sweep containing no supertest suite had zero failures. But "confined to profile-server" is an **observed distribution, not a structural boundary**, and the flake family can reach `tests/server/Master.test.ts` on the default `npm test` path and both integration suites.

**The symptom count was also corrected at close: FIVE, not four.** The task's own title still says four; that was left unchanged **deliberately**, because it is the identity string the board rows and the folder name carry.

### 5. ⚠️ The one-host ceiling

*"Not a repository defect"* is **what stands after every alternative was refuted — not something positively proven.** There is no CI in this repository and no second machine; every measurement came from one host, so a "machine-local condition" hypothesis is **untestable**, not merely untested.

### 6. Verification and review at close

`npm test` **107 suites / 1075 tests**, unchanged. Review: ⚠️ **changes requested — 10 defects (3 high, none blocking)**, **Codex coverage FULL** (`codex-cli 0.152.0`), **not** degraded; all 10 processed in round 2 — 9 accepted in full, 1 in part with recorded evidence, 0 disputed. The pre-registered "100 clean runs post-fix" gate was **not met and was not meant to be**: the task closed on the recognition-note branch, so there is no post-fix sweep.

## Related

- [[tasks/test-suite-reliability-investigation]] — task `0197`, the parent whose sweep programme found this flake and from which it was split under amendment A4
- [[tasks/citizen-verified-icon]] — task `0068`, where this failure was misrecorded as a `SIGSEGV`; that misrecording is the concrete cost this task exists to stop repeating
- [[systems/architecture-overview]] — the build/run/test picture and the "no CI, one host" ceiling
- [[systems/player-profile-store]] — the profile service whose route suites carry the flake
- [[decisions/sprint-4]] — the sprint board carrying the test-reliability track
- [[decisions/sprint-backlog]] — the Backlog board carrying `0201` and `0202`, the shell-harness pair this task's close-out filed
