# Worklog — 0194 `Worker.ts`: reject a buffered `create_game` whose requester has already gone away

Built 2026-08-28 by `fkit-coder`, spawned as the Build worker of `/fkit-sprint-ship-loop` under the
declared-approval marker (owner approved the plan 2026-08-28 via `AskUserQuestion` in the driver
session: D1 (A), D2 10 ms, D3 all creates, D4 `503` JSON, D5/D6 recommendations taken).

Environment: Node **v24.13.0**, TypeScript 5.8.3, express 4.21.2, undici 8.0.2, Jest 30 (`@swc/jest`).
Base: `dev` at HEAD `dc90719`. Loopback only; every excerpt below filtered for `persistentID`
(no occurrence on this path).

> ⚠️ **Working tree was NOT clean at start**, contrary to the spawn prompt. Two driver-owned status
> edits were already present (`plan-sprint-4.md` and this task's `brief.md`, both `🔲 Backlog` →
> `🔄 In progress`), plus the untracked `plan.md`. All three are the driver's own bookkeeping, outside
> my change surface; I left them untouched.

---

## Step 0 — the probe, re-run before any product code

Faithful mimic of `Worker.ts`'s app (same express 4.21.2 from this repo's `node_modules`, same
middleware order `compression()` → `express.json()` → `express-rate-limit`, same `http.createServer`,
same POST route). Parent mimics `Master.ts`'s create call (undici + `AbortController`): `SIGSTOP` the
child, fire 6 buffered creates and abort each, then fire 1 create it does **not** abort, then `SIGCONT`.
Scripts lived in the session scratchpad only; nothing was written to the repo.

Run twice: **5 trials** (30 aborted + 5 live) reproducing the plan's sample size, then **15 trials**
(90 aborted + 15 live) to tighten the tail. Every aborted request reached the handler (90/90) and every
live one returned `200` (15/15).

### Checkpoint table (15-trial run; the 5-trial run agreed on every row)

"Departure observed" = the plan's predicate — `res.destroyed || res.socket === null ||
res.socket.destroyed || req.socket === null || req.socket.destroyed`. Never `req.aborted`/`req.destroyed`.

| Checkpoint | Departure observed (aborted) | False positives (live) | Plan's recorded table |
|---|---|---|---|
| synchronous, at handler entry | **0 / 90** | 0 / 15 | 0 / 30 — **agrees** |
| `process.nextTick` | **0 / 90** | 0 / 15 | 0 / 30 — **agrees** |
| `setImmediate` ×1 | **0 / 90** | 0 / 15 | 0 / 30 — **agrees** |
| `setImmediate` ×2 | 90 / 90 | 0 / 15 | 30 / 30 — **agrees** |
| `setTimeout(0)` | **66 / 90** — not reliable | 0 / 15 | 26 / 30 — **agrees** (same verdict) |
| `setTimeout(5 ms)` | **90 / 90** | 0 / 15 | 30 / 30 — **agrees** |
| `setTimeout(10 ms)` | **90 / 90** | 0 / 15 | (not in the plan; added this run) |
| `setTimeout(200 ms)` | 90 / 90 | **0 / 15** | 0/5 live — **agrees** |
| `res` `"close"` event | 90 / 90, **0.154 – 10.810 ms** (median 0.895) | 0 / 15 fired early | 30/30, 0.243 – **1.769** ms (median 0.66) — ⚠️ **max diverges** |

### Property usability, measured (reproduces the plan exactly)

| Property | Healthy request | Departed requester | Verdict |
|---|---|---|---|
| `req.aborted` | `false` (0/15) | **`false` (0/90)** | **Unusable** — the request completed out of the kernel buffer (`req.complete` true 90/90). |
| `req.destroyed` | **`true` (15/15)** | `true` (90/90) | **Unusable and dangerous** — true for every healthy create; would reject 100 % of creates. |
| `req.closed` | `true` (15/15) | `true` (90/90) | Unusable, same reason. |
| `req.socket.destroyed` | `false` at every checkpoint | `false` at entry → **`true` by 5 ms (90/90)** | **Usable after a settle window.** |
| `res.destroyed` | `false` at every checkpoint | `false` at entry → **`true` by 5 ms (90/90)** | **Usable, same window.** |
| `res.socket === null` | `false` | `false` (0/90) | Defensive only. |

**Conclusion — unchanged from the plan:** the brief's specified synchronous `req.socket.destroyed` /
`req.aborted` check observes nothing (0/90) and would ship a guard that never fires. The brief's own
first fallback (one `setImmediate`) is also insufficient (0/90). The bounded settle wait is required.

### ⚠️ The one divergence, and why it did not stop the build

The plan's `res` `"close"` row records a max of **1.769 ms**; I measured **10.810 ms** — which *exceeds*
the 10 ms settle window. The plan's stated rationale for D2 ("5.6× the observed worst case") is
therefore **not supported by my measurement** and should not be repeated as written.

It is nonetheless **not a contradiction of the design**, for a reason the plan itself states: the
`"close"` event is only an *early-exit optimisation*. `awaitRequesterSettled` **re-reads the predicate
when its timer expires**, so a late `"close"` costs nothing. The decisive signal is the `destroyed`
flags, and those were true for **90/90 by the 5 ms checkpoint** and **90/90 at 10 ms** — a 2× margin on
the window, with **zero** false positives on live requests through 200 ms. The plan's risk section had
already anticipated timing drift ("the design absorbs that up to 10 ms and degrades to *does nothing*,
not to a false rejection").

I therefore **kept D2 at the owner-ruled 10 ms** (changing it would have needed re-approval) and wrote
the *measured* numbers, not the plan's, into the code's evidence comment. **Run 2 re-measured this
end-to-end and found 0 orphans**, confirming the margin holds in the real worker. Recorded here so the
owner can revisit D2 (25 ms was the plan's other option) with the true numbers if they wish; it is a
one-line change.

---

## Step 0b — is `Worker.ts` importable under Jest?

**PASS**, so the **D5 contingency did not trigger** and no `src/server/RequesterGone.ts` was created.

`Worker.ts:56-57` declares `const __filename` / `const __dirname` — the identifiers `Master.ts:63-66`
documents as unimportable when declared at *module* scope under `@swc/jest`. Here they are
**function-scoped** inside `startWorker()`, which is legal. Asserted with a one-line import test before
any test body was written:

```
PASS tests/server/Worker.test.ts
  Step 0b
    ✓ imports Worker.ts (1 ms)
```

No mocks were needed (unlike `Master.test.ts`, which stubs `jose`/`Logger`/`undici`). Importing runs
module scope only — `getServerConfigFromServer()`, `logger.child`, `new MapPlaylist(false)`;
`startWorker()` is never called, so no port is bound and no timer started.

---

## Steps 1–2 — the change (`src/server/Worker.ts`, +86 lines, no import added)

- **Module scope**, above `startWorker()`: `REQUESTER_SETTLE_MS = 10`, the `SocketState` /
  `RequestLike` / `ResponseLike` structural interfaces, `requesterGone()` (pure predicate) and
  `awaitRequesterSettled()` (early-exits on `res` `"close"`, else waits `settleMs`, then re-evaluates),
  with the evidence comment carrying **this run's** measurements.
- **Route**, between the worker-index check and `gm.createGame`: the `await` guard, one `log.warn` with
  a single-object meta, and `return res.status(503).json({ error: "Requester gone" })`.

All four earlier rejection paths (`:125` 400, `:131` 400, `:138` 401, `:148` 400) are byte-unchanged and
still sit *before* the guard. `Worker.ts`'s second `gm.createGame` call site (the matchmaking path) is
untouched by design — it has no HTTP requester.

---

## Step 3 — tests (`tests/server/Worker.test.ts`, new)

12 tests, covering the plan's 1–11 (the constant test split into two assertions):

- `requesterGone` — healthy `false`; `res.destroyed`, `req.socket.destroyed`, `res.socket.destroyed`,
  `res.socket === null`, `req.socket === null` each `true`.
- **The Step 0 regression guard**: an object shaped like a *fully-read healthy* request
  (`destroyed: true, aborted: false, closed: true, complete: true`, live sockets) must still yield
  `false`. This is the test that fails if `req.destroyed` / `req.aborted` are ever reintroduced — i.e.
  the test that would have caught the brief's suggested signals.
- `awaitRequesterSettled` — already-gone returns `true` with **no timer armed** and no listener left;
  live waits the full window then returns `false` (pending at 9 ms); departs-mid-window returns `true`
  without waiting it out. All assert `jest.getTimerCount() === 0` and `res.listenerCount("close") === 0`
  afterwards. `EventEmitter`-backed fake `res`, so `once`/`removeListener` are the real Node
  implementations.
- `REQUESTER_SETTLE_MS === 10`, and three orders of magnitude below `Master.ts:521`'s
  `CREATE_GAME_TIMEOUT_MS = 5_000`.

**Route-level test: skipped per D6** — `app` is a local inside `startWorker()`, so a supertest seam
means extracting an app factory plus taming three background timers; and it still could not reproduce
the race (the socket must die *after* the body is buffered and *before* dispatch). The race is covered
by Step 0 (predicate level, 90/90) and Step 4 run 2 (end-to-end).

---

## Step 4 — verification

### Run 1 — unit, lint, types — **PASS**

| Check | Result |
|---|---|
| `npm test` | **97 suites / 874 tests passed**, 0 failed (baseline `0192`: 96 / 862; +1 suite / +12 tests is this file) |
| `npx jest tests/server/Worker.test.ts` | 12 / 12 passed |
| `--randomize` ×2 | 12 / 12 both runs |
| `--detectOpenHandles` | 12 / 12, **no open handles reported** |
| `npx eslint` | **exit 0**, 0 lines of output |
| `npx tsc --noEmit -p tsconfig.json` | **exit 0**, 0 lines of output |

Both `eslint` and `tsc` **failed on the first attempt**; see the decision log for the two fixes.

### Run 2 — wedged index (`SIGSTOP` worker 1, 40 s) — **the headline**

`0192` run-4 procedure: fresh boot, 2 workers, `Quorum reached`, 500 ms `/api/public_lobbies` sampler
to build the master's listed-ID history; orphan = a worker-1 create the master **never listed**.

`SIGSTOP` 07:36:57.640Z → `SIGCONT` 07:37:37.643Z. Sampler: 220 samples, 22 empty, 0 unparseable,
19 distinct listed IDs.

| Metric | This run | `0192` baseline |
|---|---|---|
| **Orphans** | **0** | **5** |
| **Guard `warn` lines** | **4** | n/a (no guard) |
| `Too Many Requests` | **0** | 0 |
| Master error lines in the stop window | **13** | 16 |

The guard warns trade one-for-one with the would-be orphans: 4 creates were drained-and-already-aborted,
4 were warned, 0 became games. The master-error delta (13 vs 16) is **one fewer draw landing on w1**
during the 40 s (5 `Error fetching` + 4 `Failed to schedule` + 4 `Error scheduling` = 13, against
`0192`'s 6 + 5 + 5 = 16); draws are p = ½ per cadence in dev, so this is sampling, not a behaviour
change. `0192`/`0193` behaviour is otherwise unchanged.

```
07:37:37.653Z  cannot create game HEBjrUiF, requester went away before creation (worker 1, ip null, settle 10ms)
07:37:37.660Z  cannot create game hG3bnBF7, requester went away before creation (worker 1, ip null, settle 10ms)
07:37:37.663Z  cannot create game Xs8pUgic, requester went away before creation (worker 1, ip null, settle 10ms)
07:37:37.674Z  cannot create game XoyXHuse, requester went away before creation (worker 1, ip ::,   settle 10ms)
```

Cross-checks, both **0** as required: guard-warned IDs that were nonetheless created — **0**;
guard-warned IDs the master had listed — **0**.

Meta on every warn is complete with **no null-valued field** (the `0056` Step 3a rule; Uptrace drops
nulls): `{gameID, workerIndex: 1, isPublic: true|false, settleMs: 10}`.

### Run 2b — the in-flight create, proved deterministically

Run 2 did **not** happen to produce an un-aborted create in flight at `SIGCONT` (its only drain-window
create, `Kqe71DYQ`, landed 4.5 s *after* `SIGCONT` — a fresh post-recovery create, not the in-flight
one). Rather than claim the property from run 2, I constructed it: wedge worker 1, hand-buffer two
creates into the stopped worker's socket, `SIGCONT`, compare.

Both are **private, bodyless** creates, so they also exercise the `gc === undefined` path.

| Arm | ID | Created? | Guard warn? | HTTP |
|---|---|---|---|---|
| **LIVE** — never aborted, buffered 30 s | `qvsP9DXT` | **YES** — `Worker 1: … creating Private game with id qvsP9DXT` | **0** | `200` |
| **DEAD** — aborted while stopped | `UBINLdNk` | **NO** | **1** | client `AbortError` |

**This is the required confirmation: the create genuinely in flight at `SIGCONT` is still created, with
no warn line.**

> First attempt at this run was **mis-constructed and is not counted**: I used `tZdg8AWo` as the DEAD
> arm, which hashes to worker **0**, so it hit the worker-index 400 at `:148` before ever reaching the
> guard (`This game tZdg8AWo should be on worker 0, but this is worker 1` — verified in the log, not
> assumed). Re-run above with two worker-**1** IDs. The mistake incidentally re-confirmed that the
> index check still precedes the guard.

### Run 3 — healthy path, 6 min — **PASS**

Fresh boot, both workers ready, `Quorum reached` **once**. Window 07:43:38.623Z – 07:49:38.645Z
(**6.00 min**). Sampler 718 samples, **0 empty**, 75 distinct listed IDs.

| Metric | Result |
|---|---|
| Creates | **74** — w0 **44** / w1 **30** |
| Cadence | mean **4.84 s** (min 4.81, max 4.87) — identical to `0192` run 5's 4.84 s |
| **Guard `warn` lines** | **0** |
| Error lines | **0** |
| Warn lines (any level) | **0** |

The 44/30 split is wider than `0192` run 5's 61/60, but that run had 121 creates; at n = 74 the
binomial sd is ≈ 4.3, so 44/30 is ≈ 1.6 sd — sampling noise, and it cannot be the guard, which fired
**0 times** in this run.

### Run 4 — private lobby via the browser client — **PASS** (it *was* runnable)

Full `npm run dev` (client 9000 + server 3000), real Chromium, real `HostLobbyModal` flow:
Multiplayer tab → `#host-lobby-button`.

```
POST http://localhost:9000/w1/api/create_game/ygHCawkY?creatorClientID=NkcazMiL  =>  200 OK
w_1: Worker 1: IP :: creating Private game with id ygHCawkY, creator: NkcazMiL
```

Lobby confirmed live and joinable on worker 1 — `GET :3002/api/game/ygHCawkY` returns
`numClients: 1` with the host client joined. **Guard `warn` lines in the entire dev run: 0.** Warn/error
lines: 0. The `/w<N>` prefix middleware path is unaffected, as expected (the guard sits well after it).

### Run 5 — rejection paths unchanged — **PASS**

| Path | Expected | Got |
|---|---|---|
| Bad body | 400 | **400** `{"error":"✖ Invalid input"}` |
| Public create, no admin token | 401 | **401** `Unauthorized` |
| Worker-index mismatch | 400 | **400** `{"error":"Worker, game id mismatch"}` |

Guard warn lines during these tests: **0** — correct, the guard sits after all three.

> The **first** attempt at the 401 check was **invalid and is not counted**: I sent
> `{gameType:"Public", gameMap:"World"}`, which fails `CreateGameInputSchema` and 400'd at the *schema*
> check, never reaching the admin-token branch. Re-run with a `GameConfig` the server itself emitted
> (captured from `/api/public_lobbies`), which passes the schema and genuinely exercises the 401.

### Run 6 — post-deploy — **PENDING BY DESIGN, NOT RUN**

Deployment state is **UNKNOWN** and not assumed. On the next prod deploy carrying this change: scope
`docker logs` to the current boot, confirm no guard `warn` lines on a healthy run, and confirm `0192`'s
`Failed to schedule public game` count is unchanged.

---

## Cleanliness

- Pre-flight before **every** boot: `lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN` free.
- After the final run: ports 3000–3005, 3010, 3020 and 9000 all free; no stray `Server.ts`,
  `webpack serve`, or probe processes.
- All probe/driver scripts lived in the session scratchpad; **none** were written to the repo.
- The browser run wrote 4 files into the repo's gitignored `.playwright-mcp/` (a long-standing owner
  tooling directory); I deleted **only those 4** and left the rest of the directory alone.
- No temp hacks, no `TEMP` markers, no commented-out guards. `git diff --stat` confirms the change
  surface is `src/server/Worker.ts` only, plus the new untracked `tests/server/Worker.test.ts`.
- **No commit, no push, no task-file move.**

---

## Decision log — every call applied without asking

Three fixes were applied under the standing approval (verified `CORRECT` + mechanical/localized +
inside the approved plan). None is a frontier-move; none changes an owner ruling.

1. **`gc` is `GameConfig | undefined`, not `GameConfig` — the plan's Step 2 note is factually wrong.**
   *Which finding it answers:* `npx tsc` failed — `src/server/Worker.ts(233,21): error TS18048: 'gc' is
   possibly 'undefined'`.
   *What changed:* the warn meta's `isPublic: gc.gameType === …` → `isPublic: gc?.gameType === …`, with
   a comment recording why.
   *Why it qualified:* verified against the source, not inferred — `CreateGameInputSchema`
   (`src/core/WorkerSchemas.ts:4-9`) is `GameConfigSchema.or(z.object({}).strict().transform(() =>
   undefined))`, so a **bodyless private create yields `gc === undefined`**, exactly the path D3 brought
   into scope. The plan asserted "`gc` is `result.data`, non-optional at this point, so no `?.`"; the
   file's own neighbours at `:138-139` and `:161` already use `gc?.`. One character, matches the local
   idiom, and **preserves the plan's actual intent** — the `0056` Step 3a rule that no meta field may be
   null: `gc?.gameType === GameType.Public` is a plain `boolean` (`false` for a bodyless create), never
   `null`. Verified live in run 2b: `isPublic: false` on the private arm, `true` on public, **0 null
   fields across all 4 warns**.

2. **`prefer-const` on the settle helper's timer.**
   *Which finding it answers:* `npx eslint` failed — `95:9 error 'timer' is never reassigned. Use
   'const' instead`.
   *What changed:* I had initially written `let timer` (to avoid referencing it before its declaration);
   reverted to **the plan's own verbatim shape** — `const timer = setTimeout(done, settleMs)` with
   `done` closing over it. Safe: `done` cannot run before `setTimeout` returns.
   *Why it qualified:* mechanical, and it moves the code *toward* the approved text rather than away.

3. **The evidence comment carries my measured numbers, not the plan's.**
   *Which finding it answers:* the Step 0 divergence above (close-event max 10.810 ms vs the plan's
   1.769 ms).
   *What changed:* the comment above `REQUESTER_SETTLE_MS` cites 90 aborted / 15 live, "true for 90/90
   by the 5 ms checkpoint", and the 0.15–10.81 ms close-event range, plus an explicit note that the
   `destroyed` flags — not the event — are the decisive signal.
   *Why it qualified:* an obvious winner within the plan's intent. Copying the plan's numbers would have
   written a **false claim** into the source. `REQUESTER_SETTLE_MS` itself is unchanged at the
   owner-ruled 10.

**No** judgment call was taken unattended: D2 was left at 10 ms rather than retuned, D5's contingency
was not needed (Step 0b passed), and D6's skip was honoured as approved.

## Deviations from the plan

1. **Step 0's `res` `"close"` max is 10.810 ms, not 1.769 ms** — flagged above and in the report. The
   plan's D2 rationale wording is superseded; D2's *value* is not.
2. **Test count is 12, not 11** — the plan's test 11 ("constant pinned") is two assertions, so it reads
   as two Jest cases. No coverage difference.
3. **Run 4 was run and passed.** The spawn prompt anticipated it might not be runnable in this
   environment; it was.
4. Everything else — change surface, D1/D3/D4 behaviour, D6 skip, the run list — as approved.

---

## Stateful review — round 1 response (2026-08-28)

Ledger: `review.md`. Reviewer raised **R1–R4**, all `low`, **all four in `tests/server/Worker.test.ts`**.
All four verified against the code before any edit. **`src/server/Worker.ts` was not changed** — the
verifications found no defect in it, and nothing in the fixes forced a source change. Ledger Status
moved `in-review` → `closed-out`.

### Decision log — round 1 fixes

**None of the three applied fixes was an autonomous call.** R1, R2 and R3 were each **ruled by the
owner on 2026-08-28** and relayed verbatim in the spawn prompt; R4 was ruled "accept as residual, no
code change". My part was verification and execution, not disposition. Recorded here anyway, because
ADR-019's audit obligation is about making a wrong fix findable afterwards, not only about autonomy.

1. **R1 — corrected the regression-guard comment (`tests/server/Worker.test.ts:67-79`).**
   *Which finding:* R1 — the comment claimed "This test fails if either signal is reintroduced", which
   is **false for `req.aborted`**.
   *Verification before acting:* re-derived by hand — the fixture sets `aborted: false`, so a predicate
   widened with `|| req.aborted` short-circuits to `false` and the test still passes. Only the
   `req.destroyed` half (fixture `destroyed: true`) actually fails the test.
   *What changed:* the comment now states both halves explicitly, and names the **type-level** guard
   that covers `req.aborted`: `RequestLike` in `Worker.ts` declares only `socket`.
   *Type-level claim was executed, not assumed:* I temporarily widened the predicate in
   `src/server/Worker.ts` to `... || req.aborted || req.destroyed` and ran `npx tsc --noEmit -p
   tsconfig.json`:
   ```
   src/server/Worker.ts(82,9): error TS2339: Property 'aborted' does not exist on type 'RequestLike'.
   src/server/Worker.ts(83,9): error TS2339: Property 'destroyed' does not exist on type 'RequestLike'.
   ```
   `Worker.ts` was then restored from a pre-experiment copy and confirmed **byte-identical** (`diff`
   clean; `git diff --stat src/server/Worker.ts` still `+86`), and `tsc` re-run clean.
   *Why it qualified:* owner-ruled, comment-only, and the ruling explicitly declined the extra fixture.

2. **R2 — ran the project formatter on the new test file.**
   *Which finding:* R2 — `npx prettier --check tests/server/Worker.test.ts` failed (4 hunks).
   *Verification before acting:* reproduced — exit 1, `[warn] tests/server/Worker.test.ts`.
   *What changed:* `npx prettier --write tests/server/Worker.test.ts` — **that file only**. Whitespace /
   line-wrapping only; no assertion, fixture or comment text altered by the formatter. Re-check exits 0.
   *Why it qualified:* owner-ruled, mechanical, and it enforces the repo's own Code Style rule.

3. **R3 — corrected the header comment (`tests/server/Worker.test.ts:3-12`).**
   *Which finding:* R3 — "no port is bound and no timer is started" understated the import's
   module-scope side effects and hid that the no-timer half is env-conditional.
   *Verification before acting:* read `src/server/Logger.ts:1-41` (`otelEnabled()` true arm →
   `new LoggerProvider({ resource, processors: [new BatchLogRecordProcessor(logExporter)] })`; false arm
   → bare `new LoggerProvider({ resource })`) and `:69-76` (the global `console.warn` replacement).
   Reviewer's description matched the source exactly.
   *What changed:* the comment now says the import builds a winston logger, constructs an OTEL
   `LoggerProvider`, and globally replaces `console.warn`, and that "starts no timer" holds **only**
   because `otelEnabled()` is false in this dev test env.
   *Why it qualified:* owner-ruled, comment-only.

4. **R4 — no code change.** Owner ruled the hardcoded `5_000` is deliberate test isolation. Verified
   `src/server/Master.ts:521` does export `CREATE_GAME_TIMEOUT_MS = 5_000`, so the reviewer's claim is
   accurate; the disposition is a preference, not a correction. Recorded as an accepted residual with a
   re-raise condition.

**Obvious-winner calls made unattended this round: none.** Every applied change traces to an owner
ruling relayed in the spawn prompt.

### Recorded so they are not re-litigated

- **`REQUESTER_SETTLE_MS = 10` is owner-re-ruled and independently corroborated.** The reviewer's own
  120-request measurement found the `destroyed` flags **already true in 120/120** at the instant `res`
  emitted `"close"` — the flags **lead** the event rather than lagging it. A late `"close"` therefore
  carries nothing the settle helper's timer-expiry re-read of `requesterGone` did not already have,
  which retires the concern my Step 0 divergence (close-event max **10.810 ms**, above the 10 ms window)
  raised. The residual on a loaded box is **fail-open** — event-loop lag delays the flip, the guard
  misses, and an orphan is created exactly as before this task — **never fail-closed**.
- **Codex's MEDIUM that `res.status(503).json(...)` on a destroyed response throws
  `ERR_STREAM_DESTROYED` was disproven by execution** (reviewer's run against this repo's express
  4.21.2 / Node v24.13.0: returns normally, no throw, no `unhandledRejection`). **Not to be
  re-litigated.**

### Round 1 check set — all green

| Check | Result |
|---|---|
| `npx jest tests/server/Worker.test.ts` | **12/12 pass** |
| `npx jest … --randomize` (seed `-1258772483`) | **12/12 pass** |
| `npx jest … --randomize` (seed `949120833`) | **12/12 pass** |
| `npx jest … --detectOpenHandles` | **12/12 pass**, no open handles reported |
| `npx prettier --check tests/server/Worker.test.ts` | **pass** (was failing — R2) |
| `npm run lint` | **pass**, no output |
| `npx tsc --noEmit -p tsconfig.json` | **pass**, exit 0 |
| `npm test` (full suite) | **97 suites / 874 tests pass**, 3.343 s |

**Not run this round:** the Step 4 live runs (wedge, healthy-path, private lobby, rejection paths) —
this round changed only comments and formatting in a test file, so no runtime behaviour moved. Run 6
(post-deploy) remains **pending by design**, unchanged.

**No commit, no push, no task-file move.** All edits are left in the working tree.
