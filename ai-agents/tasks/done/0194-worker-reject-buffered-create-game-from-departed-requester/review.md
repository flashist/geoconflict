# Review — 0194

Task: `ai-agents/tasks/done/0194-worker-reject-buffered-create-game-from-departed-requester/brief.md`
File(s) under review: `src/server/Worker.ts` (uncommitted, vs HEAD `dc90719`), `tests/server/Worker.test.ts` (new)
Out of scope: `brief.md` / `plan.md` / `ai-agents/sprints/plan-sprint-4.md` status edits (driver's, not the coder's)
Reviewers: fkit-reviewer (Claude, own pass + executed probes) · Codex `gpt-5.5` via `codex exec` — **both ran, coverage complete**
Status: closed-out (round 1 — all four dispositioned; no blocking finding remains)

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `tests/server/Worker.test.ts:61` | The comment "This test fails if either signal is reintroduced" is false for `req.aborted`: the fixture sets `aborted: false`, so a predicate widened with `\|\| req.aborted` still passes this test. Only the `req.destroyed` half is actually guarded. (Raised by both reviewers. Mitigant, not a fix: `RequestLike` declares only `socket`, so `tsc` rejects either field — the type, not the test, is the real guard.) |
| R2 | 1 | low | `tests/server/Worker.test.ts` (whole file) | `npx prettier --check tests/server/Worker.test.ts` **fails** — 4 hunks (lines 34–36, 42–46, 48–50, 99). Violates the repo Code Style rule (Prettier via husky + lint-staged). `npx eslint` and `npx tsc --noEmit` both pass. |
| R3 | 1 | low | `tests/server/Worker.test.ts:3-5` | Header comment understates the module-scope side effects of importing `src/server/Worker`: through `Logger.ts` the import also builds a winston logger and an OTEL `LoggerProvider`, and **globally replaces `console.warn`** (`src/server/Logger.ts:69-76` — corrected in phase 2 from my round-1 `:70-76`, which was off by one on the start). "No port is bound and no timer is started" is true in the DB-less dev test env (`otelEnabled()` false → `new LoggerProvider({resource})`, no processors — verified: suite exits clean, no open handles) but is **env-conditional**: with OTEL enabled the same import constructs a `BatchLogRecordProcessor`, i.e. a live timer / open handle. |
| R4 | 1 | low | `tests/server/Worker.test.ts:139-142` | The master-timeout invariant hardcodes `const CREATE_GAME_TIMEOUT_MS = 5_000` although `src/server/Master.ts:521` **exports** it, so the assertion can keep passing against a stale value. Classified frontier-move (test isolation vs. pulling `Master.ts`'s module scope into a unit test), not a defect — disposition is the coder's. |

## Coder response

<!-- CODER-OWNED — the reviewer never writes here. -->

**Round 1 — all four verified against the code before any edit. No source change was made: the
verifications confirmed `src/server/Worker.ts` has no defect, and all four findings land in
`tests/server/Worker.test.ts` (three of them in comments). R1–R3 were applied under the owner's
2026-08-28 rulings, not autonomously.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** | Defect (comment states a guarantee the test does not provide) | Rewrote the comment at `tests/server/Worker.test.ts:67-79` to say exactly what the test guards and what it does not: it **fails** if `req.destroyed` is reintroduced (fixture sets `destroyed: true`), it **does not catch** `req.aborted` (fixture sets `aborted: false`, so `\|\| req.aborted` still returns `false` and the test still passes) — that half is guarded at the **type** level. Per the owner's ruling, **no extra fixture added**. | ✅ done (owner-ruled) |
| R2 | **CORRECT** | Defect (repo Code Style rule) | Ran `npx prettier --write tests/server/Worker.test.ts` — that file only. Reflowed 4 hunks. `npx prettier --check` now passes. | ✅ done (owner-ruled) |
| R3 | **CORRECT** | Defect (comment understates module-scope side effects) | Rewrote the header comment at `tests/server/Worker.test.ts:3-12`: the import builds a winston logger, constructs an OTEL `LoggerProvider`, and **globally replaces `console.warn`** (`src/server/Logger.ts:69-76`); "no timer is started" is true **only** because `otelEnabled()` is false in the dev test env, and with OTEL enabled the same import constructs a `BatchLogRecordProcessor`. Side effect itself accepted as a residual (below). | ✅ done (owner-ruled) |
| R4 | **CORRECT (as stated) — no change** | **Frontier-move** (test isolation vs. pulling `Master.ts` module scope into a unit test) | Owner ruled: keep the hardcoded `5_000`. Decoupling this test from `Master.ts`'s module scope is deliberate, and the comment at `tests/server/Worker.test.ts:156` already cites `Master.ts:521`. Recorded as an accepted residual with a re-raise condition. | won't fix (frontier) — owner-ruled |

**Verification notes behind the verdicts** (evidence, not assertion):

- **R1** — re-derived by hand: `requesterGone(req, healthyRes())` with the fixture's `aborted: false`
  short-circuits to `false` under a `\|\| req.aborted` widening, so the test would still pass. The
  reviewer's mitigant is real and was **executed**: temporarily widening the predicate in
  `src/server/Worker.ts` with `\|\| req.aborted \|\| req.destroyed` makes `npx tsc --noEmit` fail with
  `TS2339: Property 'aborted' does not exist on type 'RequestLike'` and the same for `'destroyed'`.
  `Worker.ts` was restored byte-identically afterwards (verified by `diff` against a pre-experiment
  copy, and by an unchanged `git diff --stat` of `+86` lines).
- **R2** — reproduced: `npx prettier --check` exited 1 before, 0 after.
- **R3** — read `src/server/Logger.ts:1-41` (the `otelEnabled()` branch: `BatchLogRecordProcessor` on
  the true arm, bare `new LoggerProvider({ resource })` on the false arm) and `:69-76` (the
  `console.warn` replacement). Both as the reviewer described.
- **R4** — confirmed `src/server/Master.ts:521` reads `export const CREATE_GAME_TIMEOUT_MS = 5_000;`,
  so the import the reviewer describes is genuinely available; the disposition is a preference, not a
  correction.

**Recorded from round 1, so neither is re-hunted or re-litigated:**

- The **10 ms settle window is owner-re-ruled and independently corroborated.** The reviewer's own
  120-request measurement found the `destroyed` flags already true at the instant `res` emitted
  `"close"` — **120/120**. The flags **lead** the event, so a late `"close"` carries nothing the
  timer-expiry re-read of `requesterGone` did not already have. The residual on a loaded box is
  **fail-open** (guard misses → today's behaviour), never fail-closed.
- Codex's MEDIUM that writing the `503` to a destroyed response throws `ERR_STREAM_DESTROYED` was
  **disproven by execution** (reviewer's run, recorded under *Verified non-findings*). **Not to be
  re-litigated.**

## Accepted residuals (shared, do-not-re-litigate)

Both entries below are **owner-ruled 2026-08-28** (round 1). Do not re-raise except on the stated
condition.

- **Server unit tests inherit `Logger.ts`'s global module-scope side effects.** (from **R3**)
  Importing any `src/server/*` module that reaches `src/server/Logger.ts` builds a winston logger,
  constructs an OTEL `LoggerProvider`, and **globally replaces `console.warn`** (`Logger.ts:69-76`).
  This is a property of **`Logger.ts`**, not of 0194 — `tests/server/Master.test.ts` and the other
  `tests/server/` suites already carry it. In the dev test env `otelEnabled()` is `false`, so the
  provider is built with no processors, starts no timer, and the suite exits clean under
  `--detectOpenHandles`. The header comment of `tests/server/Worker.test.ts` now states this
  accurately instead of claiming the import is side-effect-free.
  **Re-raise only if** a test comes to depend on a pristine `console`, **or** OTEL is enabled in the
  test env (then the same import constructs a `BatchLogRecordProcessor`, i.e. a live timer / open
  handle).

- **`tests/server/Worker.test.ts` hardcodes `CREATE_GAME_TIMEOUT_MS = 5_000` rather than importing it
  from `Master.ts`.** (from **R4**) Deliberate: keeping this unit test decoupled from `Master.ts`'s
  module scope is worth more than the staleness risk, and the comment at
  `tests/server/Worker.test.ts:156` already cites `Master.ts:521` so a reader can check the value.
  Frontier-move, not a defect.
  **Re-raise only if** `CREATE_GAME_TIMEOUT_MS` in `src/server/Master.ts` ever changes — then this
  test's local copy must be updated in the same change.

## Verified non-findings (round 1 — recorded so they are not re-hunted)

- **Writing the `503` to an already-destroyed response is safe.** Codex raised this MEDIUM from the Node
  docs (`ERR_STREAM_DESTROYED`). Executed against this repo's express 4.21.2 on Node v24.13.0:
  `res.status(503).json(...)` with `res.destroyed === true` returns normally — no throw, no
  `unhandledRejection`, no hit on the express global error handler at `Worker.ts:553`. The pre-change
  code already wrote `res.json(game.gameInfo())` on the same destroyed socket in the same scenario, so
  the guard strictly reduces bytes written to a dead peer. **Disproven.**
- **A `"close"` arriving after the timer cannot leave the predicate false while the socket is gone.**
  Independently measured (120 aborted requests, this repo's express, Node v24.13.0): at the instant
  `res` emitted `"close"`, the `requesterGone` predicate was **already true in 120/120** — the
  `destroyed` flags lead the event, never lag it. So re-reading the predicate on timer expiry loses
  nothing a late `"close"` would have carried. This is the load-bearing support for the owner's
  2026-08-28 ruling to keep `REQUESTER_SETTLE_MS = 10` despite the plan's 1.769 ms rationale being
  superseded by the 10.810 ms re-measurement.
- **The guard cannot reject a live peer.** `requesterGone` goes true only on `destroyed`/`null`, which
  Node sets only after it has torn the connection down. Residual under a loaded 20-worker prod box is
  **fail-open** (event-loop lag delays the flip past 10 ms → guard misses → orphan created, i.e.
  today's behavior), never fail-closed. Bounded and benign.
- **The new `await` does not widen a same-ID duplicate-create into a new failure.** Codex raised it LOW.
  `GameManager.createGame` (`src/server/GameManager.ts:42-73`) is unconditional last-write-wins
  (`this.games.set(id, game)`) with no existence check — that was already true, and two sequential
  pre-change creates for one ID produced the identical end state. The 10 ms window changes the
  interleaving, not the outcome. Pre-existing property of `GameManager`, not a 0194 regression.
- `gc?.gameType === GameType.Public` is a plain `boolean` (`false` for the bodyless private create where
  `CreateGameInputSchema` yields `undefined`) — **never `null`**, so the 0056 Step 3a rule holds for both
  public and private creates.
- Pre-existing `400` (`:125`, `:131`, `:148`), `401` (`:138`) and the `/w<N>` `404` all sit before the
  guard and are byte-unchanged in the diff.
- `503` handling is non-retrying on both callers, as intended: `Master.ts:632` throws → deletes the ID
  from `publicLobbyIDs` → the 100 ms loop reschedules a fresh ID; `HostLobbyModal.ts:880-884` throws
  `HTTP error! status: 503`.
- Settle helper: no timer or listener leak (both cleared on either exit path), no TDZ (`done` cannot run
  before `setTimeout` returns), no double-resolve, cannot hang.
- `Worker.ts:610`'s second `gm.createGame` is inside `pollLobby` — no HTTP requester — correctly out of
  scope.
- Log line carries `ipAnonymize(clientIP)` only; no PII, tokens or endpoints in the new source or in
  `worklog.md`.
- Tests: 12/12 pass under `--randomize --detectOpenHandles`, no leaked handles, no tautologies beyond the
  constant assertion covered by R4.
- Worklog honesty confirmed: both invalid constructions (the worker-0 DEAD arm that hit the index-400;
  the schema-invalid 401 body that 400'd early) are disclosed and excluded from the counts, and the
  in-flight-live create is proved in the dedicated run 2b rather than claimed from run 2.

## Re-litigates settled decisions (suppressed)

None this round. Both reviewers were primed with ADR-109's "closed by this ADR" list and the owner's
2026-08-28 `REQUESTER_SETTLE_MS = 10` ruling; neither produced a finding matching them.

## Round 1 closeout — reviewer verification (phase 2, 2026-08-28)

Re-checked after the coder's edits. `Status: closed-out` **confirmed** — I did not need to correct it.

- **`src/server/Worker.ts` is byte-identical to what I reviewed.** The diff against `dc90719` still
  resolves to the **same blob hash** — `index 270180a..3f99f75` in both passes — at `+86` insertions,
  1 file changed, 0 deletions. The temporary predicate widening used to prove the `tsc` rejection left
  **nothing** behind; no source change slipped in. `git status` shows the coder touched only
  `tests/server/Worker.test.ts`.
- **R1's rewritten comment (`:67-79`) is accurate.** It states both halves correctly: the test **fails**
  on a `|| req.destroyed` widening (fixture sets `destroyed: true`) and **does not catch**
  `|| req.aborted` (fixture sets `aborted: false`), with the `aborted` half guarded at the type level by
  `RequestLike` declaring only `socket`. No overclaim remains. Owner's "comment only, no extra fixture"
  ruling followed.
- **R3's rewritten header (`:3-12`) is accurate and complete.** It names the winston logger, the OTEL
  `LoggerProvider`, and the global `console.warn` replacement, cites `Logger.ts:69-76`, and flags
  "starts no timer" as **env-conditional** on `otelEnabled()`, naming `BatchLogRecordProcessor` as what
  an OTEL-enabled env would construct. The surviving "no port is bound" claim is still true.
- **R2 fixed.** `npx prettier --check tests/server/Worker.test.ts` → *All matched files use Prettier code
  style!* (exit 0).
- **Tests re-run:** `npx jest tests/server/Worker.test.ts` → **12/12 pass**, 0.556 s.
- **Both residual entries read as the owner ruled**, each with a usable re-raise condition. Spot-checked
  their supporting cites: `tests/server/Master.test.ts` exists (10 other `tests/server/` suites carry the
  same `Logger.ts` import side effect, so "a property of `Logger.ts`, not of 0194" is correct), and
  `tests/server/Worker.test.ts:156` does cite `Master.ts:521`.
- **Both round-1 records survive intact**: the 120/120 corroboration of the 10 ms window, and the
  execution-disproven `ERR_STREAM_DESTROYED` claim.
- **Stale line numbers, noted not corrected:** my R2 and R4 rows cite pre-reflow lines (R2's four hunks;
  R4's `:139-142`, now `:159-162`). They were accurate when written; a future reader should date them to
  round 1.
- **Not done:** I did not re-run the full `npm test` suite. Scope was one test file and `Worker.ts` is
  unchanged, so no broader regression path exists — but the full suite was not exercised in phase 2.
