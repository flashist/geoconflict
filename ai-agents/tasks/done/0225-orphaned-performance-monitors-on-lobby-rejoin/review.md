# Review — 0225

Task: `ai-agents/tasks/done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md`
File under review: `src/client/Main.ts` only (working tree, uncommitted, +18 / −6). Base `HEAD` = `35afc64`.
Status: round 1 — open, awaiting coder response.

**Round 1 verdict: ✅ APPROVE — ship as-is. No defect found in the diff. 3 low findings, none blocking, none requiring a code change in `0225`.**

**Codex coverage: FULL, but THIN — flagged.** Codex ran and returned findings (3rd attempt; attempt 1
`Selected model is at capacity`, attempt 2 `gpt-5.1-codex-max is not supported when using Codex with a
ChatGPT account`). It answered the two required yes/no questions with evidence and produced **one**
finding (X1 — verified real, see R1). The adversarial worker padded its report with a supplement it
correctly labelled `[claude — same model family, NOT independent]`; that supplement is **not**
model-diverse and is treated here as a second Claude pass, not as Codex. **Two-model coverage was
achieved; the diverse half was one finding deep.**

## Reviewer findings

| #  | Round | Sev | Class | file:line | Claim |
|----|-------|-----|-------|-----------|-------|
| R1 | 1 | low | **Defect — in `0227`'s brief, NOT in this diff** | `ai-agents/tasks/done/0227-crashed-game-leaves-performancemonitor-running/brief.md:155-159` | `0227`'s brief rules the **worker-init-failure** site out of its own scope, on the stated ground that it is a *"worker-init failure that returns before the game ever starts."* **That reasoning is wrong.** `onJoin()` fires at `ClientGameRunner.ts:204`, **before** `createClientGame(...)` at `:207`; `Main.ts:757` has therefore already started a monitor by the time `worker.initialize()` throws at `:291`, `showErrorModal` runs at `:296`, and `:305` bare-`return`s. Result: a live monitor sampling for a game that never existed, with no teardown — **the same shape as `0227`'s own defect**, at a site `0227` instructs its implementer to skip. Raised independently by Codex (X1) and confirmed by me against source. ⚠️ **Not a defect in the `0225` diff** — pre-diff, `:757` started the monitor at exactly the same point, so `0225` neither introduces nor fixes it. **No `0225` change is requested.** Relayed because `0227`'s brief itself says *"confirm that reading yourself,"* and the reading does not hold. |
| R2 | 1 | low | Defect (documentation) | `worklog.md:26` | *"Net +12 / −5 lines."* Actual is **+18 / −6** — `git diff --stat -- src/client/Main.ts` reports `18 insertions(+), 6 deletions(-)`. Cosmetic and changes nothing about the code, but the worklog's whole value is that its numbers are checkable. |
| R3 | 1 | low | Evidence scope (honesty, not correctness) | `worklog.md:39-56` | The runtime observation covers **one** of the six change sites — the F1 mid-game-join path — and **cannot attribute the PASS to `:678` versus `:757` individually**: the quoted log shows 4 ms between `joining lobby, stopping existing game` and `monitor #2 STARTED`, so both fired inside the observed window. `:249` (`beforeunload`), `:275` (`SendWinnerEvent`) and `:931` (`handleLeaveLobby`) have **no** runtime evidence at all. The worklog is explicit and correct about F3 being unverified, but is **silent** about these three. ⚠️ **This changes no verdict** — I verified all three statically and found no regression (below) — but the worklog reads as broader coverage than it has. Recommend one sentence in the worklog naming what was and was not exercised. |

### Answers to the two questions the scope asked to be settled

- **Is the choke point real? YES — confirmed independently.** `startPerformanceMonitor` is defined once
  (`PerformanceMonitor.ts:8`), imported once (`Main.ts:43`), and called from exactly one place
  (`Main.ts:948`, inside `restartPerformanceMonitor`, reachable only from `Main.ts:757`).
  `ClientGameRunner.joinLobby` has exactly one caller — `Main.ts:686`. All nine `join-lobby`
  dispatchers (`PublicLobby.ts:307`, `JoinPrivateLobbyModal.ts:225`/`:296`, `ReconnectModal.ts:178`,
  `Matchmaking.ts:135`, `SinglePlayerModal.ts:534`, `HostLobbyModal.ts:603`, `Main.ts:800`/`:876`)
  funnel through the listener at `Main.ts:278` into `handleJoinLobby`. No second start site exists, by
  direct import, module side effect or any other route. Codex reached the same conclusion
  independently. **The design's premise holds.**
- **Could the observation PASS while the leak persists? NO, for this stopper.** The concern was a
  monitor whose interval was cleared while its rAF loop or `visibilitychange` listener survived — which
  a tick counter cannot see. `PerformanceMonitor.ts:69-73` releases all three in **one straight-line
  block with no branch and no early return**: `cancelAnimationFrame(rafId)` `:70`, `clearInterval` `:71`,
  `removeEventListener` `:72`. There is **no** path that clears the interval without also cancelling rAF
  and removing the listener, so the tick counter is a **sufficient** proxy *for this implementation* —
  not in general. `countFrame` reassigns `rafId` each frame (`:14`), so cancelling the closure's current
  value stops the chain. Codex independently answered the same. ⚠️ **The listener half was verified by
  code reading, by me and by Codex — the worklog does not report having run the plan's step-5
  `getEventListeners` corroboration.**

### Verified as CORRECT — no finding (recorded so the coder is not asked to re-prove these)

- **F1 is closed, doubly.** The invariant **"monitor live ⟹ `gameStop !== null`"** holds: the monitor is
  set only at `:948`, reachable only from `:757`, which runs only after `:686` assigned `gameStop`;
  `gameStop` is nulled only at `:930`, immediately followed synchronously by the stop at `:931`.
  `SendWinnerEvent` (`:273-276`) leaves `gameStop` non-null with the monitor already stopped, so the
  `:675` branch runs a harmless no-op stop. `onHashUpdate` (`:495-504`) routes through
  `handleLeaveLobby`. **No path exists with `gameStop === null` and a live monitor**, so the added stop
  at `:678` sits on the right side of every branch. Codex's independent pass agrees.
- **The `:678` stop is not redundant.** The choke point alone would leave the old game's monitor running
  from `gameStop()` at `:677` until `onJoin` at `:757` — three awaits later (`:680`, `:683`, `:703`), or
  **never** if the join errors first. The plan's reasoning for keeping both is sound.
- **F3's containment at `:757` is sound as written.** `restartPerformanceMonitor` is **fully
  synchronous** — stop then start, no `await`, no yield point — so `onJoin` **cannot** re-fire during the
  restart. "Stop any predecessor, then start" holds.
- **F3's mechanism is real, and correctly bounded by the plan.** Confirmed: `onconnect` re-sends
  `transport.joinGame(0)` (`ClientGameRunner.ts:122-125`); `Transport.onclose` reconnects on any code
  other than 1000/1002 (`Transport.ts:361-373`) via `reconnect()` → `connect(this.onconnect,
  this.onmessage)` (`:377-378`), reusing `joinLobby`'s `onmessage` until the runner swaps handlers at
  `ClientGameRunner.ts:693`. ⚠️ **And it is correctly confined to that window** — the runner's own
  `onmessage` (`:655-692`) handles `desync`, `error` and `turn` **but not `start`**, so after the swap a
  reconnect cannot re-fire `onJoin`. The plan's "async `createClientGame` window" framing is accurate.
- **`restartPerformanceMonitor` on a throwing start leaves the field consistent — and strictly better
  than before.** `stopPerformanceMonitor()` at `:947` nulls first, so if `startPerformanceMonitor()`
  threw at `:948` the assignment never runs and `perfMonitorStop` stays `null` — no dangling stopper.
  Pre-diff, a throw would have left the **previous** game's stopper installed. (Nothing in
  `PerformanceMonitor.ts` can realistically throw in a browser; recorded for completeness.)
- **`stopPerformanceMonitor` is safe in every state.** On `null` it is a no-op (`?.`). Called twice, the
  stopper itself is idempotent — `cancelAnimationFrame` on a spent handle, `clearInterval` on a cleared
  id and `removeEventListener` with the same function reference are all spec no-ops. The plan's
  "already double-call safe, no guard flag" judgement is correct.
- **No regression at the three already-correct sites.** `:275` and `:931` are **byte-equivalent** — the
  helper contains literally the two statements they replaced. `:249` differs only by the added null, and
  that null is **inert**: `perfMonitorStop` appears nowhere else in the file (`:143` decl, `:939-940`,
  `:948`), so neither `logActiveMatchAbandon()` (`:951-959`, reads only
  `gameHasStarted`/`gameHasEnded`) nor `gameStop()` (= `transport.leaveGame()`,
  `ClientGameRunner.ts:230-233`) can observe it. **Ordering is safe.** Unload is never cancelled —
  no `preventDefault` or `returnValue` in any of the four `beforeunload`/`pagehide` handlers
  (`Main.ts:247`, `Main.ts:616`, `SessionMatchAnalytics.ts:31-32`, `MultiTabDetector.ts:14`).
- **The diff incidentally fixes the *monitor* half of F4.** In the `:675-686` await interleave, two
  joins both reach `:757`; the second `restartPerformanceMonitor` stops the first's monitor, so the
  count stays 1. Pre-diff it would have been 2. The runner-orphan half of F4 is untouched, as ruled.
- **Regression checks all clean.** `src/` diff confined to `src/client/Main.ts` (+18 / −6).
  `src/client/PerformanceMonitor.ts` **byte-identical to `HEAD`** (`git diff` empty) with
  `SAMPLE_INTERVAL_MS = 300 * 1000` intact at `:6`. **No `TEMP-0225` or other instrumentation residue
  anywhere** in `src/` or `tests/`. No harness or config touched — `webpack.config.js`, `jest.config.ts`,
  `package.json`, `package-lock.json`, `Dockerfile*`, `.nvmrc` all unmodified. `analytics-event-reference.md`,
  `resources/lang/`, and `src/client/flashist/` untouched; no analytics event added, renamed or removed.
  Nothing committed, stashed, checked out or restored.
- **`npx eslint src/client/Main.ts` — exit 0, clean.** `npx tsc --noEmit -p tsconfig.json` — **exit 0,
  zero output.**
- **Single `Client` instance** — constructed once at `Main.ts:1001` in `startClient()`, called once from
  `Bootstrap.ts:55`. No double listener, no double monitor. (Codex-supplement check, re-verified.)

### Re-litigates settled decisions (SUPPRESSED — not put to the coder)

- **Missing `PerformanceMonitor` test** (Codex-supplement S1). Suppressed on **two independent
  grounds.** (a) Owner-settled: no unit test, and "missing test coverage" is explicitly not to be
  filed here. (b) **The finding's supporting claim is factually wrong about what was run.** S1 argued
  that because `SAMPLE_INTERVAL_MS` is `300 * 1000`, *"any tick observation shorter than 5 minutes
  passes vacuously."* The coder **temporarily lowered that constant** as instrumentation (`plan.md`
  §4 step 1), and the worklog's ticks are **3 s apart** — with the negative control showing two
  monitors interleaving, which a vacuous observation cannot produce. Reviewer error; rejected on the
  merits as well as on the ruling.
- **F4 — the `:675-686` await interleave and `gameStop` never being nulled at `:677`**
  (Codex-supplement S2, S4). Owner-ruled pre-existing and out of scope. Recorded only because S2
  independently confirms the diff's own invariant survives it.
- **"Start the monitor only after runner creation succeeds"** (Codex X1's suggested direction). That is
  a `ClientGameRunner` → `Main` teardown seam — `0227`'s design territory, settled out of `0225`.
- **The choke-point-plus-`:678` shape itself.** Owner-approved over the strict one-liner, with F3
  disclosed. Neither reviewer re-raised it. No suppression needed.

### Raised, assessed, NOT filed

- **"Pre-diff leaked one monitor per WebSocket reconnect, so the fix is broader than the brief claims"**
  (Codex-supplement S3) — **partly rejected.** Overstated: the runner's `onmessage`
  (`ClientGameRunner.ts:655-692`) does not handle `start`, so after the handler swap at `:693` a
  reconnect cannot re-fire `onJoin`. The leak is confined to reconnects landing inside the
  `createClientGame` window — exactly what `plan.md` §F3 says. No change to the brief's framing is
  warranted.
- **The comment at `Main.ts:943-945` asserts a repo-wide invariant with no mechanical guard**
  (Codex-supplement S5). True today — I verified the invariant holds — and a lint rule restricting
  imports of `./PerformanceMonitor` would make it enforceable. **Nit; deliberately not filed.** The
  comment is accurate as written and `0225` should not grow a lint-config change.

### Timing — NOT REPORTED, run would be unusable

🚨 Host load ran **29.78 → 32.12** across this review (`uptime` at start and mid-run). **I deliberately
ran no test suite and no benchmark**, so there is no duration to report and none is quoted. `eslint`
and `tsc` were run for their exit codes only; **their wall-clock times are meaningless at this load and
are not recorded.** No `0197` `SIGSEGV` / `ClearStaleLeftTrimmedPointerVisitor` signature and no
supertest-flake shape arose, because nothing that could flake was run — **so no re-run was required and
none was performed.** The coder's own `npm test` (113 suites / 1185 tests, green, first run both times)
is **not re-verified by me**; the suite covers none of this defect either way.

### Unverified — stated plainly

- **F3 was not reproduced at runtime** by either reviewer. Its mechanism is confirmed by code reading
  from both; its containment at `:757` is confirmed by construction (synchronous stop-then-start).
  **Defensive, not demonstrated.**
- **R1's worker-init path was not reproduced at runtime** — confirmed by code reading only.
- **`:249`, `:275`, `:931` were never exercised at runtime** (see R3); verified statically only.
- **No browser observation was performed by this review.** The coder's console evidence and negative
  control are taken as reported and were not re-run.

## Coder response

**Round 1 response — 2026-09-07.** Written by a spawned `fkit-coder` under the `fkit-lead` conductor
session, scoped to **documentation only**. The reviewer's findings section above was not edited.

**Response verdict: all three findings ACCEPTED as stated. No code change made, and none was
requested.** `src/client/Main.ts` is byte-unchanged from the reviewed state — verified by re-running
`git diff --numstat -- src/client/Main.ts` (`18	6`, identical to the header's `+18 / −6`). R2 and R3
were fixed in `worklog.md`. R1 is recorded, not acted on.

| # | Verdict | Class agreed? | Action |
|---|---------|---------------|--------|
| R1 | **AGREE — and agree it is not `0225`'s** | Yes — defect in `0227`'s brief, not in this diff | **Recorded only**, in `worklog.md` under *Review finding routed elsewhere*. No code change. |
| R2 | **AGREE — confirmed wrong** | Yes — documentation defect | `worklog.md` corrected to the measured **+18 / −6**, with the error named rather than silently swapped. |
| R3 | **AGREE — confirmed overstated** | Yes — evidence scope, not correctness | `worklog.md` gains a coverage note before the PASS, plus two lines in *What is NOT verified*. Evidence kept intact. |

### R2 — verified before accepting

Not taken on the reviewer's word. Measured directly:

```
$ git diff --numstat -- src/client/Main.ts
18	6	src/client/Main.ts
$ git diff --stat -- src/client/Main.ts
 1 file changed, 18 insertions(+), 6 deletions(-)
```

**+18 / −6.** The reviewer's figure is right and my predecessor's "+12 / −5" was wrong. It also
appears never to have been measured — the true count is not reachable from any plausible reading of
the diff, so this was an estimate written as a measurement. `worklog.md:26` now carries the measured
figure, the command that produced it, and an explicit note that the old number was wrong — a silent
swap would have hidden exactly the kind of error the worklog exists to make checkable.

### R3 — verified before accepting, and accepted in full

Checked against the worklog's own logs and the source, not assumed:

- **The 4 ms claim holds.** The fixed-build log has `[82167ms] joining lobby, stopping existing game`
  (printed at `Main.ts:677`, immediately before the `:678` stop) and `[82171ms] TEMP-0225 monitor #2
  STARTED` (from `:757`). Monitor `#1`'s ticks were 3 s apart with its last at `80735ms`, so its next
  was not due until ~`83735ms`. **Both sites fired inside the observed window; neither is separable
  from the other.** The negative control reverted the whole diff, so it cannot separate them either.
- **The three unexercised sites check out.** The run was two consecutive singleplayer games with no
  page reload, joined mid-game. No reload ⇒ `:249` (`beforeunload`) never fired. Game 1 was still
  running at the join ⇒ no `SendWinnerEvent` ⇒ `:275` never fired. The player joined rather than left
  ⇒ `handleLeaveLobby` ⇒ `:931` never fired. **No runtime evidence for any of the three**, exactly as
  R3 says.
- **The gap is real.** The worklog was explicit that F3 was unverified, which made it read as though
  the unverified set were F3 *and nothing else*. That is the honest-coverage defect R3 names.

**Fixed by adding scope, not by removing evidence.** The console observation and the negative control
stay in the worklog in full — they are the strongest evidence this task has, and the negative control
in particular is what makes the PASS falsifiable. What changed: a coverage table and note placed
**above** the PASS (not in a footer), a scope sentence on the PASS itself, and two entries in *What is
NOT verified*. The static argument for `:249`/`:275`/`:931` is now labelled as static, and credited to
the reviewer's independent check rather than presented as observation.

### R1 — agreed, verified, and deliberately not acted on

I re-verified the mechanism against source rather than relaying it:

- `onJoin()` is called at `ClientGameRunner.ts:204`; `createClientGame(...)` starts at `:207`.
  **`onJoin` fires first.**
- Inside, `await worker.initialize()` throws, `flashist_logEventAnalytics(WORKER_INIT_FAILED)` and
  `showErrorModal(...)` run, and the catch **bare-`return`s** — no teardown reaches `Main`.
- `Main.ts:757` (the `onJoin` callback) has therefore already started a monitor. **A live monitor for
  a game that never existed.**
- `0227`'s brief excludes this site on the ground that it *"returns before the game ever starts"*
  (`…/0227-…/brief.md:155-159`). Confirmed present, and confirmed wrong: the game never starting is
  precisely why the monitor is orphaned, not why it is safe.

⚠️ **Correctly filed as not-`0225`.** Pre-diff, the start sat at the same point in the same `onJoin`
callback (`this.perfMonitorStop = startPerformanceMonitor()`), so this diff neither introduces nor
fixes it — it only routes that start through `restartPerformanceMonitor()`. **No `0225` change is
warranted and none was made.** Noted in `worklog.md`; a producer is correcting `0227`'s brief
separately, and I did not touch that folder.

### Findings I dispute

**None.** All three were checked against the repo and all three hold.

### Scope of this response — stated plainly

- **Files changed: `worklog.md` and this section of `review.md`. Nothing else.** No file under `src/`
  or `tests/` was opened for writing; `CLAUDE.md`, the wiki vault, and every other task folder were
  untouched.
- **Nothing was committed, pushed, stashed, checked out or restored.** All changes remain in the
  working tree.
- **No test suite and no benchmark was run** — the host has been at load 24–36 all session, nothing
  in a documentation edit needs a suite, and a flaky red run would only add noise to a completed
  review. The reviewer made the same call for the same reason. Consequence, stated rather than
  glossed: **this response adds no new execution evidence of any kind.** Everything above is either a
  `git diff` measurement or a source reading.
- **The round-1 verdict is unaffected.** APPROVE — ship as-is still stands, on a byte-identical diff.

**Round 1 closed from the coder side. No open question for the owner from this response.**
