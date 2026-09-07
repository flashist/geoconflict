# Review — 0227

Task: `ai-agents/tasks/done/0227-crashed-game-leaves-performancemonitor-running/brief.md`
File(s) under review: `src/client/ClientGameRunner.ts`, `src/client/Main.ts` (working tree, uncommitted, +36 / −2). Base `HEAD` = `702a8ea`.
Status: **closed-out from the reviewer side — round 3, 2026-09-07.** R1 fixed (round 1 → 2), R4 fixed (round 2 → 3), R5 closed (numbering clauses landed in both docs). R3 is recorded, not fixed here — site A is unreachable and its root cause is `0232`. R2 routed to `0233`. R6 (low, stale comment) routed to `0228` and does **not** reopen 0227 under the owner's stopping rule. **No high-severity finding in the round-3 delta.**
⚠️ **Coder's caveat, updated for round 2** (supersedes the round-1 wording, which flagged the then-unreviewed R1 fix — round 2 has since reviewed it and found R4 in it, which is exactly the risk that caveat named): **round 2's R4 fix is now itself NEW code no reviewer has seen** (`Main.ts`, `monitorGeneration`, +14/−1 on top of the round-1 diff), and it was **not reproduced at runtime** — deliberately, per the reviewer's Q5 ruling. Rounds 1 and 2 are fully dispositioned; **awaiting the single delta re-review the owner's stopping rule allows, then 0227 closes.**

**Round 1 verdict: ⚠️ Changes requested — 3 defects (1 high, 2 medium). The diff is safe to merge, but
the task MUST NOT be closed claiming site A is fixed — site A is unreachable dead code.**

🚨 **READ R3 FIRST. THE SIMULATION HID A REAL PROBLEM.** The worker `ErrorUpdate` crash branch
(`ClientGameRunner.ts:517`) **can never run**: `Worker.worker.ts:21-23` drops every `ErrorUpdate`
before it is ever `postMessage`d. The `onGameEnd()` call added to `stop()` is therefore **inert for
its stated purpose**. Sites B and C are genuinely fixed; **site A — the task's headline site — is
not, and cannot be from inside these two files.**

**Codex coverage: FULL.** Codex ran (`codex exec --sandbox read-only`) and returned 2 findings plus 5
explicit no-findings. **Codex found R3 and this reviewer did not** — its independent trace through the
worker adapter is the reason this review is not signing off on a false coverage claim. R2 was raised
by **both** reviewers independently. No reviewer was skipped; no degradation to report.

---

# ROUND 2 (2026-09-07) — scope: the R1 fix in `src/client/Main.ts` only

Tree at review: `src/client/ClientGameRunner.ts` +30/−1 (**byte-unchanged since round 1** — re-verified
via `git diff --numstat`), `src/client/Main.ts` +16/−0.

**Round 2 verdict: ⚠️ Changes requested — 1 medium defect (non-blocking). R1's main window IS closed
and the fix is a real improvement, but the guard keys on "who joined last" instead of "who owns the
live monitor", so it still inverts under 0228's await interleave. The R3 record correction is honest,
complete, and in places harder on itself than my finding was.**

🚨 **THE INCREMENT IS NOT "IMMEDIATELY BEFORE" THE `joinLobby(...)` CALL — there is an `await` between
them.** `Main.ts:707` is `yandexPlayerId: await FlashistFacade.instance.getYandexUniqueId(),`, **inside
the object literal being passed to `joinLobby`**. The generation is minted at `:689`, then the method
**suspends**, and only then is `joinLobby` invoked. This **refutes the coder's claim 4** on its own
terms. See R4.

**Codex coverage: FULL.** Codex ran and returned 1 finding plus 5 explicit no-findings. **Codex found
the `:707` await and I did not** — my own pass reached the same root cause by a weaker route (inverted
`onJoin` arrival), which needs the two servers' `start` messages to invert; Codex's route needs only
one SDK await. Merged into R4, credited. Second round running, second time the diverse pass earned its
place.

---

# ROUND 3 (2026-09-07) — the single allowed delta pass. Scope: the R4 fix in `src/client/Main.ts`.

Tree at review: `src/client/ClientGameRunner.ts` +30/−1 (**unchanged since round 2**, re-verified via
`git diff --numstat`), `src/client/Main.ts` +26/−0.

**Round 3 verdict: ✅ 0227 CLOSES. R4 is genuinely fixed — both routes closed, verified independently
by both reviewers. No high-severity finding, so the stopping rule is not triggered. One low
documentation finding, routed out as a residual.**

**Codex coverage: FULL. No degradation.** Codex ran and returned **"No findings in
`src/client/Main.ts`"** with all five attack points explicitly cleared. It reached every conclusion I
reached independently — including Q3, where it agrees `this.joinGeneration` is a monotonic allocator
and **not** vestigial. **Three rounds, three full Codex passes.**

### The stopping rule — applied, per finding

| # | Severity | Reopens 0227? | Routed to |
|---|---|---|---|
| R6 | **low** | **No** | **`0228`** — see the note on routing below |

**No high-severity finding exists in this delta.** I rated before routing, not to fit the rule.

### Round 3 — verified as CORRECT

- **Q1 — BOTH routes are genuinely closed. Verified, not accepted on the coder's word.** The key is
  that ownership is claimed *where the monitor starts*, so the guard now tests the real invariant:
  *only the join that owns the live monitor may stop it.*
  - **Codex's `:707`-await route:** B mints 2, suspends at `:707`; C mints 3, calls `joinLobby`, C's
    `onJoin` sets `monitorGeneration = 3`, monitor C live; B resumes, B's `onJoin` runs
    `restartPerformanceMonitor()` (stops C's, starts B's) and sets `monitorGeneration = 2`; **B fails
    → `2 === 2` → stops. Correct.** C's later callback → `3 !== 2` → skips, and nothing of C's is
    live. **Correct.**
  - **My round-2 no-await route** (join #2's `onJoin` merely *arrives* first, no `:707` needed):
    `monitorGeneration = 2`, then #1's `onJoin` restarts and sets it to 1. **#1 fails → `1 === 1` →
    stops. Correct.** #2 fails → `2 !== 1` → skips; its monitor was already replaced. **Correct.**
    ⇒ **The coder's claim that ownership-at-start covers my second route is TRUE.**
  - **Round 1's protection survives:** non-interleaved, game N's late callback sees `N !== N+1` and
    skips. Confirmed in both directions — no wrongly-blocked stop, no wrongly-allowed stop.
- **Q2 — no sequence leaves a live monitor that nothing can stop. The invariant is airtight by
  construction.** `startPerformanceMonitor()` has **exactly one** call site (`:974`, inside
  `restartPerformanceMonitor()`), which itself has **exactly one** call site (`:766`, inside
  `onJoin`) — and `this.monitorGeneration = joinGeneration` is the **very next statement** (`:769`).
  ⇒ **every monitor start is immediately followed by its ownership claim**, so a live monitor's owner
  is always exactly `this.monitorGeneration`. Checked each path asked about: **`onJoin` never fires /
  join fails first** → no monitor was ever started, nothing to strand, and the callback correctly
  skips. **Reconnect** (`ReconnectModal.ts:177-186`, same `gameID`) → re-enters `handleJoinLobby` and
  mints a **fresh** generation at `:694`, so the same-gameID collision that would have defeated a
  gameID key cannot occur. **Leave-then-rejoin** (`:957` does not reset either field) → the stale
  `monitorGeneration` is harmless: a same-generation late callback passes the guard and calls
  `stopPerformanceMonitor()`, which is `this.perfMonitorStop?.()` on `null` — a genuine no-op; the
  rejoin then mints and claims a new generation. **A stale `monitorGeneration` can never cause a
  wrong stop of a *later* monitor**, because no later monitor can start without overwriting it.
- **Q3 — `this.joinGeneration` is NOT vestigial. Load-bearing, and both reviewers agree.** Its only
  appearances are the declaration (`:146`) and `++this.joinGeneration` (`:694`) — it is never read by
  the guard any more. But the increment **is** a read, and it is the mechanism that mints **unique**
  values for the captured `const`. Delete the field and there is no way to distinguish two joins.
  ⇒ It changed **role** (from "pointer to the current game" to "monotonic allocator") without
  becoming dead state. **Asked and answered plainly: not dead, keep it.** See R6 for the one real
  consequence of that role change.
- **Q4 — the `:766`→`:769` gap is safe.** Both statements are synchronous in the same function body
  with no `await` and no yield point; `startPerformanceMonitor()` only registers a rAF, an interval
  and a listener before returning (`PerformanceMonitor.ts:8-73`) — none can synchronously re-enter.
  **Nothing can observe the intermediate state.** Codex independently verified the same.
- **Q4 (runtime) — I HOLD my round-2 position for this delta, without qualification.** Static reading
  is sufficient and a runtime demo should not gate the close. The delta is **three lines** of
  synchronous assignment and comparison over a two-state space, exhaustively enumerable by reading —
  which is what both reviewers did. The precedent is not merely consistent, it is the reason: **R4
  was found by static reading and would have been hidden by a green runtime run of the common path.**
  A demo here would re-observe the happy path and prove least about the race it is meant to cover.
  **The ownership key does not change my view — it strengthens it**, because the invariant it encodes
  is checkable by construction (one start site, ownership claimed on the next line) rather than by
  observation.
- **R5 is CLOSED — the numbering clauses landed correctly and completely in both files.**
  `worklog.md:31-34` declares working-tree numbering and gives the mapping; `brief.md:392-396`
  declares that its correction block uses working-tree numbering while the rest of the brief uses
  `HEAD` (`702a8ea`). Both state the crash branch as **`:491`(-501) at HEAD / `:517`(-525) in the
  working tree** and both say plainly that neither is in conflict. **Nothing left ambiguous.**

## Reviewer findings

| #  | Round | Sev | Class | file:line | Claim |
|----|-------|-----|-------|-----------|-------|
| R1 | 1 | **medium** | **Defect — introduced by this diff** | `src/client/Main.ts:775-778` | The `onGameEnd` closure carries **no game identity**. It is `() => this.stopPerformanceMonitor()` on the singleton `Client`, so a **late-settling** `onGameEnd` from a *superseded* game stops the **current** game's monitor. `onJoin()` fires at `ClientGameRunner.ts:209`, **before** `createClientGame(...)` at `:212`, so monitor N is already live while game N's promise is still in flight. If a join-over or leave+rejoin happens inside that window and game N's chain then hits the new `r === undefined` branch (`:225`) or the new `.catch` (`:232`), `onGameEnd()` fires and kills monitor **N+1**. ⚠️ **This is not hypothetical: the `.catch` also receives the synchronous `r.start()` throw, and the coder's own run 6 observed exactly that throw (`TerritoryLayer.paintTerritory` `TypeError`) on a join-over.** Result: FPS/memory telemetry silently stops for a **live** match — the inverse distortion of the bug being fixed, in the very data `0224` depends on. Bounded and self-healing on the next leave/join, so non-blocking. **Pre-diff this cross-talk could not occur — there was no callback.** The worklog's re-entrancy analysis is correct as far as it goes (it proves `gameStop` cannot call `stop()`) but checks only the *synchronous* path; it does not consider a *previous* game's callback firing late. |
| R3 | 1 | **high** | **Defect — pre-existing root cause; INVALIDATES the task's site-A acceptance claim. Raised by Codex; missed by this reviewer.** | `src/core/worker/Worker.worker.ts:20-23` → `src/client/ClientGameRunner.ts:517` | **The worker `ErrorUpdate` crash branch is unreachable — site A is dead code.** A game-tick fault calls `this.callBack({errMsg, stack} as ErrorUpdate)` at `GameRunner.ts:175-179`. That callback **is** `gameUpdate` in `Worker.worker.ts:20`, whose first act is `// skip if ErrorUpdate` / `if (!("updates" in gu)) return;` (`:21-23`) — **the error is dropped and never `postMessage`d.** The only `"game_update"` post is at `:25-28`, past that guard, and `GameUpdateMessage.gameUpdate` is typed `GameUpdateViewData` (`WorkerMessages.ts:55-58`) with no `ErrorUpdate` member. `WorkerClient` dispatches only that message to `gameUpdateCallback` (`:50-51`). ⇒ **`ClientGameRunner.ts:517`'s `if ("errMsg" in gu)` can never be true**, so `this.stop()` at `:525` never runs, so **`onGameEnd()` never fires for site A**. ⚠️ **This is exactly why the coder "could not provoke a genuine `ErrorUpdate`" — it cannot happen.** The simulation ran the crash branch's *statements* directly, which proves the seam fires **if** the branch runs, and the branch never runs. **The `stop()` seam is not wrong and must NOT be removed** — it is correct and becomes live the moment the drop is fixed. But the worklog's `✅ stops` for run 4 and the brief's site-A acceptance **cannot stand as written**. 🚨 **The underlying defect is worse than 0227 describes:** a worker game-tick crash today produces **no modal, no teardown, and no error surface at all** — the player sits on a silently frozen game while the monitor keeps sampling. **Root cause is in `src/core/`, outside this task's two-file scope — it needs its own brief.** |
| R2 | 1 | **medium** | **Incomplete — 4th site of the same defect class, uncovered. Raised by BOTH reviewers independently.** | `src/client/ClientGameRunner.ts:689-698` (and `:244-253`) | A server `error` message shows a **closable** modal and does **nothing else** — no `this.stop()`, no `onGameEnd()`. `GameServer.ts:945-960` sends exactly this **mid-game**: `"Kicked from game (you may have been playing on another tab)"`, then `ws.close(1000, ...)`. Code `1000` is not reconnected by `Transport.onclose`, so the game is genuinely over — yet the runner stays `isActive = true`, the worker is never `terminate()`d (`cleanup()` runs only in `stop()`), and **the `PerformanceMonitor` keeps sampling indefinitely**. `showErrorModal`'s close button only calls `modal.remove()` (`ClientGameRunner.ts:1165-1171`) — it tears down nothing. This is 0227's own defect shape at a site the brief never enumerated, and **multi-tab play is plausibly more common in a Yandex Games iframe than a worker `ErrorUpdate` (site A)**. Same bounded, non-accumulating class the owner already ruled Medium — hence medium, not high. **Scope question for the owner, not an accusation of a bad build.** |

| R4 | **2** | **medium** | **Defect — the R1 fix is incomplete in the same direction it was meant to fix. Sharper path found by Codex; same root cause found independently by this reviewer.** | `src/client/Main.ts:689` + `:707` + `:761` + `:783` | **The guard keys on "latest join to mint a generation", not "who owns the live monitor" — so it can block a stop that SHOULD happen, re-creating the original 0227 bug in a narrower window.** Root cause: `const joinGeneration = ++this.joinGeneration;` (`:689`) is **not** immediately before the `joinLobby(...)` call in *execution* order — `:707` (`yandexPlayerId: await FlashistFacade.instance.getYandexUniqueId()`) suspends the method **between** the mint and the call. **Concrete false negative** (Codex's sequence, re-verified line-by-line by me): (1) join B mints gen 2, suspends at `:707`; (2) join C mints gen 3, calls `joinLobby`, its `onJoin` runs `restartPerformanceMonitor()` at `:761` — **monitor C live**; (3) join B resumes, calls `joinLobby`, B's `onJoin` reaches `:761` and **stops C's monitor and starts B's** — the live monitor is now B's while `this.joinGeneration === 3`; (4) B's `createClientGame` fails, or `worker.initialize()` hits its 5 s timeout (`WorkerClient.ts:88-94`); (5) B's `onGameEnd` sees `2 !== 3` at `:783` and **returns without stopping** — **a monitor left sampling for a dead game**, plus live game C's telemetry already killed at step 3. ⚠️ **My own independent route to the same defect** needs no `:707` await at all — if join #2's `onJoin` merely arrives *before* join #1's (different servers, no ordering guarantee; e.g. #1 a public lobby waiting to fill, #2 a singleplayer `LocalServer` starting instantly), monitor ownership again lands on the older generation and the same inversion follows. **Two independent routes, one root cause.** ⛔ **This does NOT mean revert to round 1** — Codex and I both confirm the guard is **correct** in the non-interleaved case, which is what R1 was about, so the fix is a strict improvement and should land. **Precondition** is the `Main.ts:679-690` await interleave — an owner-accepted pre-existing residual (0225 finding F4, owned by `0228`) — so this is medium, not high: telemetry-only, bounded, non-accumulating, self-healing on the next clean join. **Cheap complete fix (~3 lines, same file, no `ClientGameRunner` change):** add `private monitorGeneration = 0;`, set `this.monitorGeneration = joinGeneration;` beside `this.restartPerformanceMonitor()` at `:761` (**same closure scope — verified**), and guard on `joinGeneration !== this.monitorGeneration`. That encodes the real invariant — *only the game that started the live monitor may stop it* — and is immune to **both** routes, because it is assigned at the moment the monitor actually starts. |
| R5 | **2** | **low** | Documentation — nit, non-blocking | `worklog.md:23-32` vs `brief.md:183` | The R3 record cites **two different line-number frames** without labelling either. The worklog uses **working-tree** numbers (`ClientGameRunner.ts:517`, `:525`); the brief's table uses **HEAD** numbers (`:491-501`). The producer's re-verification (HEAD `:491` / `:499`) matches the brief, not the worklog. Both are internally right; the pair reads as a contradiction to anyone checking. **One clause each — "(working-tree numbering)" / "(HEAD numbering)" — closes it.** Changes no verdict and no code. |

### Round 2 — verified as CORRECT (recorded so the coder is not asked to re-prove these)

- **The guard DOES close R1's window as identified — confirmed by both reviewers.** In the ordinary
  (non-interleaved) case: game N's chain settles late, a join-over has already bumped to N+1, guard
  blocks the stale stop, monitor N+1 survives. **R1 as filed is fixed.** Also confirmed there is **no
  false negative** on the plain join-over path: `Main.ts:679-682` stops monitor N *synchronously*,
  before the awaits and before the bump, so at the moment the guard later blocks game N's callback
  there is nothing left that should have been stopped. The 0225-verified invariant *"monitor live ⟹
  `gameStop !== null`"* still holds, so the `gameStop === null` branch cannot skip a needed stop.
- **Claim 2 — not bumping in `handleLeaveLobby` — HOLDS. Verified in all three sequences, and Codex
  agrees.** (a) *Leave, no rejoin:* `:947` stops the monitor and nulls `perfMonitorStop`; a late
  same-generation callback passes the guard and calls `stopPerformanceMonitor()`, which is
  `this.perfMonitorStop?.()` on `null` — **a genuine no-op**. (b) *Leave then rejoin:* the rejoin bumps
  at `:689`, so the old callback's generation differs and is blocked; the new monitor is safe. (c)
  *Chain settles between the leave and the rejoin's bump:* guard passes, stop is again a no-op on
  `null`. **No path where the missing bump causes harm.** `stopPerformanceMonitor()` is idempotent by
  construction (`:954-957`), and the stopper it calls is idempotent per `PerformanceMonitor.ts:69-73`
  (0225-verified: `cancelAnimationFrame` on a spent handle, `clearInterval` on a cleared id,
  `removeEventListener` with the same reference are all spec no-ops).
- **Claim 3 — rejecting `lobby.gameID` in favour of a counter is CORRECT, and the reason is concrete.**
  `ReconnectModal.ts:177-186` dispatches `join-lobby` with `gameID: session.gameID` — **the same
  gameID as the original session**. A `gameID` key would therefore be **identical** for the original
  join and its reconnect, so a stale callback from the first attempt would be indistinguishable from
  the reconnect's and would be allowed to stop the reconnect's monitor — R1 surviving its own fix. A
  monotonic counter cannot collide. Codex agrees independently ("the problem is counter placement,
  not counter-vs-gameID"). Overflow is unreachable at one increment per join.
- **Closure capture, `this`-binding, and field mutation are all clean.** `joinGeneration` is a `const`
  captured by an arrow function (lexical `this`), and `this.joinGeneration` is mutated only at `:689`.
  Both reviewers checked; no finding.
- **Claim 4 — "the increment sits immediately before `joinLobby(...)`, avoiding entanglement with
  0228" — REFUTED.** It is immediately before *in source order* and **not in execution order**: the
  `await` at `:707` sits between them. The claim is half-right — the placement genuinely does not make
  0228's `gameStop`-overwrite worse — but the intended conclusion, that the guard is therefore
  independent of the interleave, **does not follow**. R4 is exactly that dependence.
- **Claim 5 — no runtime reproduction. My judgment, without splitting it: STATIC REASONING IS
  SUFFICIENT; a runtime demo should NOT gate this landing.** The guard is four lines of synchronous
  comparison with no I/O and a two-state space, exhaustively enumerable by reading. R1's own trigger
  was never reproducible on demand either (round 1 established a real join-over is unreachable from
  the singleplayer menu without a synthetic dispatch), so demanding a demo demands what the harness
  cannot honestly deliver. The failure mode is lost telemetry, not corrupted gameplay, and it
  self-heals on the next join. 🚨 **And the round-1 lesson applies again, in the opposite direction:
  static reading is what found R4 — a runtime run of the common path would have gone green and hidden
  it.** The right next step is the 3-line tightening in R4, **not** a runtime demonstration.
- **The R3 record correction is HONEST AND COMPLETE — nothing reads softer than the facts.** It
  supersedes rather than erases (original text struck, kept findable); it re-verifies the chain
  independently and goes **further than my finding did** with a repo-wide `grep -rn "errMsg" src/`
  establishing there is no second delivery path; it states plainly that *"I could not provoke a
  genuine worker crash" was not a tooling limitation — it cannot happen*; it marks run 4 in the
  results table as **🔴 NOT a verification of site A**; it records the `stop()` seam as
  **dormant-but-correct and must NOT be removed**; it says the root cause is bigger, lives in
  `src/core/`, and was left untouched; and it flags that **no runtime confirmation of R3 exists**. The
  brief carries the matching correction, including that **acceptance criterion 1 cannot be met for
  site A** and the task **must not be closed claiming site A is fixed**. **I found nothing softened,
  and one place where the coder was harder on itself than I was.** Only R5 (a line-number frame nit)
  is outstanding.

| R6 | **3** | **low** | Documentation — stale comment describing the defect that was just fixed. **Does NOT reopen 0227** (stopping rule). Routed to **`0228`**. | `src/client/Main.ts:144-145` | **The `joinGeneration` field comment still describes the R4-broken semantics.** It reads *"Incremented on every joinLobby call, so a superseded game's teardown callback can tell it is no longer the current game."* That is exactly what the guard **no longer does** — R4 established that "the current game" (last to mint) is *not* the monitor's owner, and the guard now compares against `this.monitorGeneration` (`:793`). The comment is a **trap for the next reader**: it presents `this.joinGeneration` as the ownership pointer, which invites a future "simplification" of the guard back to `!== this.joinGeneration` — **reintroducing R4 verbatim**. The `monitorGeneration` comment directly below (`:147-150`) is accurate and does explain the split, which limits the blast radius to a reader who stops at the first comment. **Fix is one clause** — e.g. *"…so each join gets a unique token; ownership of the live monitor is tracked separately in `monitorGeneration`."* **No behaviour change, no code change.** |

### Round 3 — routing note (the stopping rule)

The rule names `0231` / `0232` / `0233` as the residual homes. **R6 fits none of them** — those own the
orphaned runner, the `Worker.worker.ts` `ErrorUpdate` drop, and the fourth error-message site
respectively; R6 is a comment on 0227's own new field in `Main.ts`. **I am routing it to `0228`**,
which was not in the rule's list, because `0228` owns the `Main.ts` `gameStop` / await-interleave work
and will be editing this exact region — it is the only task that will have the file open for a reason
related to the comment's subject. **Flagging the deviation rather than forcing R6 onto an unrelated
task or silently dropping it.** If the owner prefers, it is equally fine to leave R6 recorded here and
unassigned; it is a comment, and nothing depends on it being fixed.

### Verified as CORRECT — no finding (recorded so the coder is not asked to re-prove these)

- **`stop()`'s no-double-fire / no-missed-fire mechanics are correct** — *given* that `stop()` runs at
  all (which R3 shows it does not, for site A). `stop()` has exactly one caller (`:525`) and that
  caller is registered inside `worker.start(...)` at `:513`, which runs **after** `this.isActive =
  true` at `:490`. So `isActive` would always be `true` when the crash branch runs; `stop()` sets it
  `false` at `:784` **before** `this.onGameEnd()` at `:793`. No double-fire, no missed fire.
  `SoundManager.stopBackgroundMusic()` at `:780` sitting **before** the guard is pre-existing and
  harmless — it changes nothing about `onGameEnd`. **The placement the task asked me to assess is
  correct; the problem is upstream, not in the placement.**
  🚨 **CORRECTION — this reviewer initially cleared site A and was WRONG.** My first pass argued that
  the runtime simulation's gap was closed statically because `:521-525` is straight-line code from
  the `"errMsg" in gu` test to `this.stop()`. That argument is true **and irrelevant**: I checked the
  code *after* the test and never checked whether the test can ever be true. Codex traced the worker
  adapter and found it cannot. **See R3.** Recorded here rather than quietly amended, because the
  coder was told site A was verified and it is not.
- **The `.catch` re-throw is correct, and silences nothing.** Both reporters are
  `window.addEventListener("unhandledrejection", ...)` reading `event.reason` —
  `FlashistFacade.ts:293-307` and `OtelBrowserInit.ts:139-163`. Throwing inside a `.catch` returns a
  **new rejected promise** carrying the same `err`; **nothing is chained after the `.catch`**
  (verified — the chain ends at `:238`), so that rejection is unhandled and both listeners fire with
  an identical `reason`. **No duplication either:** pre-diff the chain produced one unhandled
  rejection; post-diff the original is handled by the `.catch` and exactly one new one replaces it.
  ⇒ **Net unhandled-rejection count is unchanged at one.** The coder's runtime observation (run 3) and
  the HEAD control agree with the static reading. **If any reviewer proposes dropping the re-throw,
  reject it — it would silence both reporters.**
- **The synchronous `r.start()` throw landing in the new `.catch` is correct behaviour.** `start()`
  sets `isActive = true` (`:490`) and then throws at `renderer.initialize()` (`:511`), so
  `worker.start(...)` at `:513` is never reached, no crash callback is ever registered, and `stop()`
  can therefore **never** run for that runner. Stopping the monitor from the `.catch` is the only
  teardown that will ever happen for a half-started game. Correct call, correctly recorded.
- **The `TerritoryLayer.paintTerritory` `TypeError` is genuinely pre-existing — confirmed
  independently of the coder's stash experiment.** On code grounds: the diff's only change to that
  path is `.then((r) => r?.start())` → `.then((r) => { if (r === undefined) {…} r.start(); })`. For a
  **defined** `r` the two are behaviourally identical, and the diff touches nothing in
  `GameRenderer.initialize()` or `TerritoryLayer`. The diff **cannot** cause or worsen it. Out of
  scope here; plausibly `0231`.
- **Not setting `this.gameStop = null` — correct.** Barred by the brief (`:302-304`); belongs to
  `0228`. Leaving it non-null is also **behaviourally safe**: after a crash the player's next
  `handleLeaveLobby` (`Main.ts:928-936`) runs `gameStop()` (= `transport.leaveGame()` only) then a
  no-op `stopPerformanceMonitor()`. Nothing breaks.
- **Not setting `this.gameHasEnded = true` — correct.** It would gate `logActiveMatchAbandon()`
  (`Main.ts:958-960`) off for crashed games, changing analytics behaviour. Out of scope, and the
  omission is explicitly recorded in the worklog. **The fix is not half-done by either omission.**
- **No automated test — the argument is SOUND, and the point is settled by the brief anyway.**
  `jest.config.ts:11` is `testEnvironment: "node"`, and `startPerformanceMonitor` needs
  `requestAnimationFrame`, `document`, `window` and `performance.memory`
  (`PerformanceMonitor.ts:8-73`) — none present. `createClientGame` is **not exported**
  (`ClientGameRunner.ts:263`). `joinLobby` **is** exported (`:107`), but it synchronously constructs a
  `Transport` and calls `transport.connect(...)`, so exercising the chain needs a real WebSocket
  harness. And the brief **bars** the tautological version outright (`:328-331`: *"DO NOT INVENT A
  TEST THAT ONLY PROVES A CALLBACK WAS ADDED"*), with `CLAUDE.md`'s mandate covering `src/core/` only
  — nothing in `src/core/` was touched. **No test demanded.** ⚠️ One honest qualification: a test
  asserting *"a superseded game's `onGameEnd` does not stop the current monitor"* (R1) would **not**
  restate the diff — but it needs the same infeasible harness, so this does not change the call.
- **`joinLobby` has exactly one call site** — `Main.ts:686` (verified repo-wide across `src/` and
  `tests/`). Making `onGameEnd` a **required** 5th parameter is the right choice and matches the
  coder's stated reason: a missed wiring is a compile error, whereas an EventBus emit with no listener
  compiles and silently does nothing — which is precisely this task's failure mode.
- **The brief's re-entrancy caveat (`:296-300`) is correctly refuted by the coder.** `joinLobby`
  returns `() => { console.log("leaving game"); transport.leaveGame(); }` (`:246-249`) — it does
  **not** call `runner.stop()`. So `onGameEnd` cannot fire synchronously from leave-lobby or
  join-over. **Confirmed.** (R1 is the *asynchronous* residue of the same question, which that
  refutation does not reach.)
- **No analytics event added, renamed or removed.** `WORKER_INIT_FAILED` / `WORKER_INIT_SUCCESS`
  (`:317-319`, `:331-333`) untouched; the re-throw deliberately adds no new error event.
  `analytics-event-reference.md` correctly needs no change.
- **`src/client/PerformanceMonitor.ts` is byte-identical to `HEAD`** (`git diff` empty) with
  `SAMPLE_INTERVAL_MS = 300 * 1000` intact at `:6`. **`0224` is not undone.** No `TEMP-0227` residue.
  `src/core/` untouched.

### Codex's explicit no-findings (independent corroboration)

Codex returned these as *"No Finding"*, each matching this reviewer's independent conclusion above:
the `isActive` gate makes `onGameEnd` once-only and the pre-guard `stopBackgroundMusic()` is not a
leak; the `.catch(... throw err)` preserves `unhandledrejection` reporting with no later `.then`
swallowing it; the synchronous `r.start()` throw correctly lands in the `.catch` and stopping the
monitor there is right because `onJoin` already started it; the required 5th parameter breaks no call
site. On tests Codex adds a point worth keeping: demanding one now *"would likely restate
implementation **unless the missed terminal paths are fixed first**"* — i.e. the case for a test grows
only if R2/R3 are acted on. **Two models, same conclusions, reached separately.**

### Re-litigates settled decisions (SUPPRESSED — not put to the coder)

- **"Add a unit test for the teardown callback."** Settled twice over: 0227's brief `:328-331` bars it
  by name, and the `0225` ledger records the same suppression
  (`ai-agents/tasks/done/0225-orphaned-performance-monitors-on-lobby-rejoin/review.md`, *Re-litigates
  settled decisions*). **Re-raise only if** a jsdom test environment is introduced repo-wide.
- **"`gameStop` is never nulled after a crash / the `Main.ts:675-686` await interleave."** Owner-ruled
  pre-existing and out of scope (0225 finding F4); `0228` owns the `gameStop` half. **Re-raise only
  if** `0228` lands and the condition survives. ⚠️ **R1 is NOT this finding** — R1 is a *new*
  consequence that this diff creates on top of that pre-existing condition, so it is reported, not
  suppressed.
- **"The orphaned `ClientGameRunner` survives a normal leave-lobby."** Real (`leaveGame()` only kills
  the socket; `worker.terminate()` runs solely in `stop()` via `cleanup()`, `WorkerClient.ts:271-272`)
  and owned by `0231`. Not 0227's.

### Unverified — stated plainly

- **R3 was not reproduced at runtime** — it is a static reachability proof, reached independently by
  Codex and re-verified line-by-line by this reviewer through `GameRunner.ts:175-179` →
  `Worker.worker.ts:20-28` → `WorkerMessages.ts:55-58` → `WorkerClient.ts:50-51`. **A runtime
  confirmation (force a throw inside `game.executeNextTick()` and observe that no modal appears) has
  NOT been done and would be worth doing before filing the follow-up task.**
- **No browser observation was performed by this review.** The coder's dev-console evidence and its
  negative control (run 2) are taken as reported and were **not** re-run.
- **R1 was not reproduced at runtime** by this review — it is confirmed by code reading, and its
  trigger (the synchronous `r.start()` throw on a join-over) is corroborated by the coder's own run 6.
- **R2 was not reproduced at runtime** — confirmed by code reading of the client handler and the
  server send site.
- **No test suite was run by this review.** The coder's `npm test` (113 suites / 1185 tests, green) is
  **not** re-verified here; the suite covers none of this defect either way. **No `supertest` flake
  and no `0197` `SIGSEGV` / `ClearStaleLeftTrimmedPointerVisitor` signature arose, because nothing
  that could flake was run — so no re-run was required and none was performed.**

## Coder response

**Round 1, 2026-09-07.** Every finding independently verified against the code before acting. Owner
ruled all three dispositions live. Severities below are **mine**, derived from the blast radius I
traced — not inherited from the reviewer's labels (they happen to agree).

| #  | Verdict | Defect / Frontier | My severity | Action | Status |
|----|---------|-------------------|-------------|--------|--------|
| R1 | **CORRECT** | **Defect — introduced by this diff** | medium | Generation token in `Main.ts`: `joinGeneration` field, `const joinGeneration = ++this.joinGeneration` before `joinLobby(...)`, early-return guard as the first statement of the `onGameEnd` closure. `ClientGameRunner.ts` untouched this round. | ✅ done |
| R3 | **CORRECT** | Defect — pre-existing root cause in `src/core/`, outside this task's scope | high (as a defect); **fatal to the site-A acceptance claim** | **No code change**, by owner ruling. Corrected the record instead: `worklog.md` gains a top correction block + the run-4 row and the site-A section are struck and superseded; `brief.md` gains a correction block before the acceptance criteria. `stop()` seam **kept** — dormant-but-correct. | ✅ done (record corrected) |
| R2 | **CORRECT** | Incomplete — 4th site of the same defect class | medium | **None here**, by owner ruling — out of scope, producer is filing it. Diff deliberately not widened. | won't fix (frontier) — scope, see residual |

### R1 — verified, then fixed

Confirmed against the code, not taken on trust. `onJoin()` at `ClientGameRunner.ts:209` runs **before**
`createClientGame(...)` at `:212`, so monitor N is live while game N's promise is in flight; the window
is seconds wide because `worker.initialize()` alone has a **5 s** timeout (`WorkerClient.ts:88-94`).
Nothing cancels that chain on a join-over — `gameStop` is only `transport.leaveGame()`. So game N
settling into the new `r === undefined` branch or the new `.catch` would stop monitor **N+1**.

**This is new harm from my diff** — pre-diff the chain was `.then((r) => r?.start())` and never touched
the monitor. The reviewer's point that my re-entrancy analysis only covered the *synchronous* path is
correct and I accept it.

Adopted the reviewer's suggested shape after evaluating it. Rejected keying on `lobby.gameID`: same
amount of new state, and a monotonic counter cannot collide. The increment sits immediately before the
`joinLobby(...)` call so the generation tracks actual invocations and does not entangle with the
pre-existing `handleJoinLobby` await-interleave (`0228`).

⚠️ **Not reproduced at runtime** — the trigger needs a join-over landing inside game N's in-flight
window, which I did not reproduce in the browser. Verified by code reading, `tsc --noEmit`, lint, and
the full suite (113/1185 green). Stated rather than implied.

### R3 — verified independently before accepting

I did **not** take the reachability proof on trust. Chain re-walked hop by hop:
`GameRunner.ts:170-183` (only `ErrorUpdate` producer) → `Worker.worker.ts:44-48` (`gameUpdate` **is**
that callback) → **`Worker.worker.ts:20-23`** (`if (!("updates" in gu)) return;` — the drop) →
`WorkerMessages.ts:55-58` (wire type is `GameUpdateViewData` only) → `WorkerClient.ts:49-52`. Repo-wide
`grep -rn "errMsg" src/` returns exactly four hits — producer, type, and the single consumer at
`ClientGameRunner.ts:517,519`. **No second delivery path exists.** R3 is correct.

**I accept the correction against my own evidence.** My "could not provoke a genuine worker crash" was
not a tooling limit — it cannot happen. Run 4 proved the callback fires **when invoked**, not that a
real crash is handled. The site-A acceptance claim is withdrawn.

### R2 — correct, and deliberately not fixed

I verified the claim (`ClientGameRunner.ts:689-698` shows a closable modal and calls no teardown;
`showErrorModal`'s close button only does `modal.remove()`). It is a real fourth instance of the same
class. **Owner ruled it out of scope**; a producer is filing it. Not fixing it here is a **scope**
decision, not a judgement that the finding is wrong — recorded as a residual below so the next round
does not re-raise it as new.

### Gates re-run after the R1 fix

```
$ git diff --stat src/client/PerformanceMonitor.ts
[end of output]

$ grep -n "SAMPLE_INTERVAL_MS" src/client/PerformanceMonitor.ts
6:const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes
67:  }, SAMPLE_INTERVAL_MS);
```

`npm test` 113 suites / 1185 tests green (~35 s); `npm run lint`, `npx tsc --noEmit`, and
`npx prettier --check` on both touched files all clean. **No `supertest` flake arose, so no `0197`
signature check and no re-run were needed.** `npm run format` was **not** run (repo-wide; that file is
already prettier-unclean at `HEAD`). `src/core/` untouched. **Nothing committed.**

### Round 2, 2026-09-07

| #  | Verdict | Defect / Frontier | My severity | Action | Status |
|----|---------|-------------------|-------------|--------|--------|
| R4 | **CORRECT** | **Defect — in round 1's own R1 fix** | medium | `monitorGeneration` field; claimed beside `restartPerformanceMonitor()` in `onJoin`; guard keys on it instead of `joinGeneration`. `Main.ts` only. | ✅ done |
| R5 | **CORRECT** | Docs — no behaviour | low | Numbering clause added to `worklog.md` and to the brief's correction block. | ✅ done |

**R4 — verified myself, and it refutes my own round-1 claim 4.** I claimed the increment sits
"immediately before `joinLobby(...)`" and therefore does not entangle with `0228`'s await-interleave.
**That was wrong.** `Main.ts:707` — `yandexPlayerId: await FlashistFacade.instance.getYandexUniqueId(),`
— is **inside the object literal being passed to `joinLobby`**, so it is evaluated **after** the mint at
`:689` and **before** the call actually happens. The method suspends between the two. I read the mint's
*textual* position and not its *execution* position.

I walked the reviewer's sequence against the code and it holds: B mints 2 and suspends; C mints 3 and
starts monitor C; B resumes and its `onJoin` **takes the monitor over** (`restartPerformanceMonitor()`
stops C's and starts B's) while `this.joinGeneration` is still 3; B then fails and its guard sees
`2 !== 3` and **skips the stop** — a monitor sampling a dead game, i.e. the original 0227 bug, *plus*
C's telemetry already killed. The second route (join #2's `onJoin` merely arriving first) needs no
`await` and inverts the same way. **Root cause: my guard keyed on "who joined last" rather than "who
owns the live monitor."**

Fix verified in scope: `onJoin` (`:759+`) and `onGameEnd` (`:778+`) are arguments to the **same**
`joinLobby(...)` call, so both close over the same `joinGeneration` — confirmed by reading, as
instructed, not assumed.

Re-traced after the fix: interleaved case — B's guard now sees `2 === 2` and **stops correctly**; C's
later callback sees `3 !== 2` and correctly skips. Non-interleaved case — game N's late callback still
sees `1 !== 2` and skips, so **round 1's protection is preserved**. ⛔ **Round 1's guard was NOT
reverted** — this tightens it.

⚠️ **Not reproduced at runtime, deliberately.** Per the reviewer's Q5 ruling: static reading is what
found R4, and a runtime run of the common path would have gone green and hidden it. Verified by code
reading + `tsc` + lint + the full suite.

**Cleared by round 2, no action:** the no-bump-in-`handleLeaveLobby` reasoning holds across all three
sequences; the rejection of a `gameID` key was right — and the reviewer found **harder evidence than I
had**: `ReconnectModal.ts:177-186` dispatches `join-lobby` with the **same `gameID`**, so a `gameID` key
could not tell an original join from its reconnect; the R3 record correction passed as honest and
complete.

### Gates re-run after R4

```
$ git diff --stat src/client/PerformanceMonitor.ts
[end of output]

$ grep -n "SAMPLE_INTERVAL_MS" src/client/PerformanceMonitor.ts
6:const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes
67:  }, SAMPLE_INTERVAL_MS);
```

`npm test` 113 suites / 1185 tests green (~38 s); `npm run lint`, `npx tsc --noEmit`,
`npx prettier --check` all clean. **No `supertest` flake arose**, so no `0197` `SIGSEGV` /
`ClearStaleLeftTrimmedPointerVisitor` check and no re-run were required — none performed.
`npm run format` **not** run. `src/core/` untouched. Final source diff: `ClientGameRunner.ts` +31/−1,
`Main.ts` +26/−0. **Nothing committed.**

### 🛑 Stopping rule (owner-set, recorded here so round 3 honours it)

**ONE re-review of the delta only, then 0227 closes.** Anything round 3 finds **short of a
high-severity defect** becomes a **recorded residual on `0231` / `0232` / `0233`** — not another fix
round. A high-severity defect is the only thing that reopens this.

## Accepted residuals (shared, do-not-re-litigate)

- **Site A (worker `ErrorUpdate`) is out of 0227's reach** — What: the `onGameEnd()` call in
  `ClientGameRunner.stop()` is kept as **dormant-but-correct** code; 0227 ships fixing **B and C only**,
  and its brief and worklog now say site A is not fixed and cannot be. · Why (structural): the
  `ErrorUpdate` is dropped in `src/core/worker/Worker.worker.ts:20-23`, outside this task's two-file
  scope; removing the seam was rejected because it is correct and becomes live the instant the drop is
  fixed. The real defect (a worker crash gives no modal, no teardown, no error surface — a silently
  frozen game) is filed as its own task. · **Re-raise only if** the `Worker.worker.ts` drop is fixed and
  the seam still fails to fire, **or** a second `ErrorUpdate` delivery path is introduced.
- **The 4th site (mid-game server `error` / multi-tab kick) is out of 0227's scope** — What:
  `ClientGameRunner.ts:689-698` shows a closable modal and tears nothing down; the monitor keeps
  sampling. Real, verified, and **not fixed here**. · Why (structural): owner ruled the scope line at
  sites A/B/C; widening the diff mid-review was rejected in favour of a separate brief the producer is
  filing. · **Re-raise only if** the owner moves it into 0227's scope, or the separate task is closed
  without covering it.
- **No automated test for the teardown seam** — What: no test added. · Why (structural):
  `jest.config.ts:11` is `testEnvironment: "node"` (no `document` / `requestAnimationFrame` /
  `performance.memory`), `createClientGame` is not exported, and exercising `joinLobby` needs a real
  WebSocket harness; the brief bars the tautological version by name (`:328-331`); `CLAUDE.md`'s mandate
  covers `src/core/`, which is untouched. Reviewer and Codex both independently agreed. · **Re-raise
  only if** a jsdom environment is introduced repo-wide, **or** R2/R3's terminal paths are fixed (per
  Codex's qualification, the case for a test grows then).
