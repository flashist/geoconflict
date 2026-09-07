# 0227 — worklog

**Coder:** fkit-coder (spawned under fkit-lead as conductor)
**Date:** 2026-09-07
**Base commit:** `702a8ea` (clean `src/` tree at start)
**Committed?** ⛔ **No.** Nothing committed, nothing pushed. The owner authorized implementation, not a commit.

---

## 🔴 CORRECTION (round-1 review, 2026-09-07) — SITE A IS NOT FIXED BY THIS TASK, AND CANNOT BE

**This supersedes every "site A" claim made lower down in this worklog. The original text is kept, struck
where wrong, so the mistake is findable rather than quietly erased.**

**The worker `ErrorUpdate` crash branch is unreachable dead code.** Found by Codex during the round-1
adversarial review; the reviewer's own first pass had cleared site A and was wrong. **I re-verified the
whole chain myself before accepting it:**

| Hop | Evidence |
|---|---|
| A tick fault builds the `ErrorUpdate` | `src/core/GameRunner.ts:170-183` — `this.callBack({ errMsg, stack } as ErrorUpdate)` |
| That callback **is** the worker's `gameUpdate` | `src/core/worker/Worker.worker.ts:44-48` passes `gameUpdate` into `createGameRunner` |
| **The drop** | `src/core/worker/Worker.worker.ts:20-23` — `function gameUpdate(gu) { if (!("updates" in gu)) { return; } … }`. An `ErrorUpdate` is `{errMsg, stack}` — **no `updates` key** ⇒ it returns early and is **never `postMessage`d** |
| The wire type cannot carry it | `src/core/worker/WorkerMessages.ts:55-58` — `GameUpdateMessage.gameUpdate` is typed `GameUpdateViewData` only |
| Only that message reaches the client | `src/core/worker/WorkerClient.ts:49-52` |

I also swept the whole repo: `grep -rn "errMsg" src/` returns **exactly four hits** — the single
producer (`GameRunner.ts:176`), the type (`GameUpdates.ts:25`), and the single consumer
(`ClientGameRunner.ts:517,519`). **There is no second delivery path.**

📌 **All `ClientGameRunner.ts` line numbers in this worklog are WORKING-TREE numbering** (i.e. with this
task's diff applied). 0227's `brief.md` cites the same sites in **`HEAD` (`702a8ea`) numbering**, so the
two documents differ by the size of this diff — e.g. the crash branch is `:491` at HEAD and `:517` in
the working tree. **Both are correct; they are not in conflict.**

⇒ `ClientGameRunner.ts:517`'s `if ("errMsg" in gu)` **can never be true**, so `this.stop()` at `:525`
never runs, so `onGameEnd()` **never fires for site A**.

**What this means for my own evidence — stated plainly, not softened:**

- 🚨 **"I could not provoke a genuine worker crash" was not a tooling limitation. It cannot happen.**
  I recorded the right fact and drew the wrong conclusion from it.
- 🚨 **Run 4 did NOT verify site A.** It ran the crash branch's *statements* directly and proved the
  callback fires **when invoked**. It did **not** prove a real worker crash is handled, because a real
  worker crash never reaches that branch. ⛔ **Do not read run 4 as "site A verified."**
- ✅ **Sites B and C are genuinely fixed and genuinely observed.** They are unaffected by this.
- ✅ **The `stop()` seam is correct and must NOT be removed** (owner ruling; the reviewer is explicit).
  It is **dormant-but-correct**: it goes live the moment the worker drop is fixed.

**🚨 The underlying defect is bigger than 0227 and is now someone else's task.** Today a worker
game-tick crash produces **no modal, no teardown, and no error surface at all** — the player sits on a
**silently frozen game** while the monitor keeps sampling. That root cause lives in `src/core/`, outside
this task's two-file scope. **I did not touch it** (owner ruling: a producer is filing it).

**Not yet done by anyone:** R3 is a **static** reachability proof (mine and Codex's). **No runtime
confirmation** — forcing a throw inside `game.executeNextTick()` and observing that no modal appears —
has been performed. Worth doing when the follow-up task is picked up.

---

## Framing — say it once, plainly

This is **not** a leak and **not** "orphaned monitors". `Main.perfMonitorStop` stays reachable at all
three sites, so at most **one** dead game's monitor runs at a time and the player's next leave/join
stops it. That language belongs to `0225`.

This task **does not** explain the 3–4 Sep GameAnalytics spike and **does not** close `0224`.

---

## What changed

Two files, both `src/client/`. **Nothing in `src/core/`.**

| File | Change |
|---|---|
| `src/client/ClientGameRunner.ts` | New 5th parameter `onGameEnd: () => void` on `joinLobby` (`:107-117`); rewritten promise chain at `:217-238` covering sites **B** and **C**; `onGameEnd` threaded through `createClientGame` (`:267`) into `new ClientGameRunner(...)` (`:358`) and the constructor (`:400`); `this.onGameEnd()` as the last statement of `stop()` (`:791`) covering site **A**. |
| `src/client/Main.ts` | 5th argument at the single `joinLobby(...)` call site (`:774-778`) calling `this.stopPerformanceMonitor()`. |

Net: **+36 / −2**.

### How each of the three sites is covered

- **Site A — worker `ErrorUpdate` crash.** `stop()` now calls `onGameEnd()` as its last statement,
  **behind** the existing `if (!this.isActive) return;` guard, so it fires exactly once and only
  after the runner finished its own teardown.
- **Site B — worker-init failure.** `createClientGame` returns `undefined` (bare `return` in the
  `catch`); no runner is ever constructed, so `stop()` can never run. Handled at the `.then` as
  `r === undefined`.
- **Site C — `createClientGame` rejects.** Handled by a new `.catch` on the same chain.

**Sites B and C are covered at one place**, the promise chain in `joinLobby` — the cheapest single
point that covers both, exactly as the brief suggested weighing. Only site A required threading.

### Shape chosen: explicit callback, not an EventBus event

The owner was shown the EventBus alternative and chose the callback. Reasons recorded: it matches
`joinLobby`'s existing `onPrestart` / `onJoin` convention; sites B and C sit inside `joinLobby`
itself, whose contract with `Main` is already "callbacks in, stopper out"; and a missed wiring is a
compile error, whereas an EventBus emit with no listener compiles and silently does nothing — which
is precisely this task's failure mode.

### 🔴 The `.catch` re-throws, and that is load-bearing

```ts
.catch((err) => {
  onGameEnd();
  throw err;   // keep the rejection unhandled
});
```

Today a site-C rejection is reported **twice** — `FlashistFacade.ts:294-308`
(`flashist_logErrorToAnalytics`) and `OtelBrowserInit.ts:139-160` (an `unhandled_rejection` span and
log). A plain `.catch` would have **silenced both**. Re-throwing produces a fresh rejected promise
carrying the same `err`, so both global handlers still fire with an identical `event.reason`.
**This was verified at runtime, not just argued** — see site C below, and the HEAD control run.

---

## Verification

### Environment — no deploy needed, and none was done

`npm run dev` on localhost:9000, driven through a real browser. `webpack.config.js:335-336` defaults
`DEPLOY_ENV` to `"dev"`, and `flashist_logEventAnalytics` (`FlashistFacade.ts:198-207`) **already
`console.log`s every event when `DEPLOY_ENV !== "prod"`** and then early-returns.

⇒ **The brief's "add a temporary log line inside the sampling interval" was unnecessary and was not
done.** The dev console already prints `Performance:*` as a visible tick. Only `SAMPLE_INTERVAL_MS`
needed temporary lowering, which halved the temporary-instrumentation surface.

`FlashistFacade.ts:399` gates GameAnalytics behind `DEPLOY_ENV === "prod"`, so **no dashboard number
exists for any of this** and none is claimed. All evidence below is dev-console evidence.

All observations used a **singleplayer** game (`LocalServer`), which goes through the same
`joinLobby → onJoin → createClientGame` path.

### Results

`SAMPLE_INTERVAL_MS` temporarily at `3 * 1000` for every run below.

| # | Site | Forced how | Ticks before | Ticks after | Verdict |
|---|---|---|---|---|---|
| 1 | **B** | `throw` in the `try`, after `new WorkerClient(...)`, behind a 10 s delay | 3 (15.2 s, 18.2 s, 21.2 s) | **0** | ✅ stops |
| 2 | **B — control, seam disabled** | same, with `onGameEnd()` commented out | 3 | **~30 and still going** | ✅ reproduces today's defect |
| 3 | **C** | `throw` before the `try`, behind a 10 s delay | 3 (8.5 s, 11.5 s, 14.5 s) | **0** | ✅ stops |
| 4 | **A** | 🚨 **SIMULATED** — see below | 4 (9.8 s → 18.8 s) | **0** | 🔴 **NOT a verification of site A** — see the correction at the top. Proves only that the callback fires when the branch's statements are invoked directly; the branch is unreachable, so this says nothing about a real worker crash. |
| 5 | leave-lobby (negative control) | real in-game exit button | 9 | **0** | ✅ no double-stop, no new error |
| 6 | join-over (negative control) | dispatched the same `join-lobby` `CustomEvent` the UI dispatches | 17 | new game's monitor starts normally | ✅ see caveat |

**Run 2 is the one that makes runs 1/3/4 mean anything.** With the seam disabled, `Performance:*`
kept ticking indefinitely past `Worker:InitFailed` — that is the defect, reproduced. With the seam,
it stops.

**Run 3 also proved the re-throw:** at 15560 ms the console shows
`flashist_logErrorToAnalytics __ errorText: Unhandled rejection: ... reason: Error: ...`. The `.catch`
did **not** silence the existing reporter.

### 🚨 Site A was SIMULATED — and the review then showed the simulation was hiding a dead branch

🔴 **SUPERSEDED BY THE CORRECTION AT THE TOP OF THIS FILE. Read that first.** Kept, marked, because it
records what I believed at the time and why it was wrong.

~~I could not provoke a genuine worker `ErrorUpdate`; it needs a game-logic fault inside the Web Worker
that cannot be summoned on demand, exactly as the brief warned.~~ **The real reason is that it cannot
happen at all** — `Worker.worker.ts:20-23` drops every `ErrorUpdate` before it is posted.

What I actually did: temporarily inserted a branch in the `worker.start(...)` callback running the
**same statements** as the real crash branch (`showErrorModal(...)` then `this.stop()`) after 12 s.

~~**This proves the seam fires from `stop()` and that emission stops.**~~ It proves the seam fires **if
the branch is entered**. The branch is never entered, so **site A is not fixed by this task and cannot
be from these two files.** Sites B and C were forced at their real failure points and stand.

### ⚠️ Caveat on run 6 (join-over) — read this, it is not a clean pass

A real join-over is **not reachable from the singleplayer menu**: mid-game the canvas intercepts
pointer events, so the menu button cannot be clicked. The real path is a lobby join (public lobby,
hash join). I therefore dispatched the same `join-lobby` `CustomEvent` the UI dispatches — a **real
code path with a synthetic trigger**.

That run surfaced `TypeError: Cannot read properties of null (reading 'id')` in
`TerritoryLayer.paintTerritory`, thrown synchronously inside `r.start()` → `GameRenderer.initialize()`.

**I did not assume it was pre-existing. I tested it.** I stashed my change, rebuilt at `702a8ea`, and
repeated the identical experiment: **the same `TypeError` with the same stack and the same
unhandled-rejection reporting occurred at HEAD.** So:

1. It is **pre-existing** and not introduced here.
2. It independently re-confirms the re-throw: the error surfaces identically before and after my
   change.
3. It is a **real-world instance of a synchronous `r.start()` throw**, the case I flagged in the plan.
   My `.catch` now also stops the monitor for that half-started game. I judge that correct — the game
   did not come up — and I am recording it rather than leaving it implicit.

It is **out of scope** and I did not touch it. It looks related to `0231`
(orphaned `ClientGameRunner` on a normal leave-lobby), which the producer has since filed.

### Re-entrancy — how I checked (acceptance criterion 3)

- **By code:** `ClientGameRunner.stop()` has **exactly one caller**, the crash branch
  (`ClientGameRunner.ts:499` pre-diff). `Main.gameStop` is `joinLobby`'s returned closure, which only
  calls `transport.leaveGame()` — it does **not** call `runner.stop()`. ⇒ `onGameEnd` cannot fire
  from the leave-lobby or join-over paths at all.
  🔴 **This refutes the brief's re-entrancy caveat (brief `:296-300`)**, which assumed `stop()` was
  reachable from `gameStop`. It is not.
- **By construction:** `Main.stopPerformanceMonitor()` (`Main.ts:938-941`) is `this.perfMonitorStop?.()`
  then `= null` — idempotent, so a double call is harmless.
- **By observation:** runs 5 and 6 above.

---

## Baseline checks

- `npm test` — **113 suites / 1185 tests passed**, ~29 s. Identical to the pre-change baseline
  (113 / 1185, ~31 s).
  ⚠️ **A green suite here is a NO-REGRESSION signal ONLY. The suite covers none of this defect.** The
  only evidence the fix works is the dev-console observation above.
- `npm run lint` — clean. `npx tsc --noEmit` — clean. `npx prettier --check` on both touched files — clean.
- **No `supertest` flake occurred**, so the known-flake procedure was not needed and nothing was re-run.

### Tests: none added, deliberately

- Both files are `src/client/`. `CLAUDE.md` mandates tests for `src/core/` only, and **nothing in
  `src/core/` was touched**.
- `jest.config.ts:11` sets `testEnvironment: "node"` — no `document`, no `requestAnimationFrame`, no
  `performance.memory`, all of which `PerformanceMonitor.ts` needs.
- The only non-tautological assertion is unreachable at reasonable cost: the promise chain lives
  inside `joinLobby`, which needs a real `Transport` + WebSocket; `createClientGame` is not exported.
- A test asserting "`onGameEnd` was invoked" restates the diff. The brief bars it (`:331-333`) and the
  `0225` precedent agrees.

---

## 🔒 The revert gate — outputs quoted verbatim

```
$ git diff --stat src/client/PerformanceMonitor.ts
[end of output]

$ grep -n "SAMPLE_INTERVAL_MS" src/client/PerformanceMonitor.ts
6:const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes
67:  }, SAMPLE_INTERVAL_MS);
```

`git diff --stat src/client/PerformanceMonitor.ts` printed **nothing**. Line 6 reads `300 * 1000`.
**`0224` is not undone.**

A repo-wide `grep -rn "TEMP-0227\|TEMP_0227" src/ tests/ resources/` returns **nothing** — all four
pieces of temporary instrumentation are gone.

⚠️ **`npm run format` was NOT run, on purpose.** It is `prettier --write .` over the whole repo, and
`PerformanceMonitor.ts` is **already prettier-unclean at `702a8ea`** (the long `PERFORMANCE_FPS_AVERAGE`
call at `:51`). Running it would have rewritten that line and left a non-empty diff on the very file
this gate depends on. `npx prettier --write` was used on the two touched files only. **Note for the
next person: that pre-existing formatting drift is still there, untouched.**

---

## Events (acceptance criterion 5) — recorded explicitly

**No analytics event was added, renamed, or removed.** `Worker:InitFailed` / `Worker:InitSuccess`
(`ClientGameRunner.ts:293-295`, `:307-309`) are untouched. The re-throw deliberately avoids
introducing a new error event by letting the existing global handlers do what they already do.
⇒ **`ai-agents/knowledge-base/analytics-event-reference.md` needs no change and was not changed.**

---

## Round-1 review response (2026-09-07)

Full ledger: [`review.md`](review.md). Owner ruled all three dispositions live.

| # | Verdict | Class | Outcome |
|---|---|---|---|
| **R1** | **CORRECT** | Defect — **introduced by this diff** | ✅ **Fixed.** Generation token in `Main.ts`. |
| **R3** | **CORRECT** | Defect — pre-existing root cause in `src/core/` | ✅ Record corrected (above). **No code change here**, by owner ruling. |
| **R2** | **CORRECT** | Incomplete — 4th site, same defect class | ⛔ **Out of scope**, by owner ruling. Producer is filing it. Diff not widened. |

### R1 — the one code change this round

**The finding was right and it was my harm.** `Main.ts`'s `onGameEnd` closure carried **no game
identity**. `onJoin()` fires at `ClientGameRunner.ts:209` **before** `createClientGame(...)` at `:212`,
so monitor N is already live while game N's promise is still in flight — and `worker.initialize()`
alone carries a **5-second timeout** (`WorkerClient.ts:88-94`), so that window is seconds wide. A
join-over inside it, followed by game N hitting the new `r === undefined` branch or the new `.catch`,
would fire `onGameEnd()` and **kill monitor N+1** — telemetry silently stopping for a *live* match, the
inverse distortion of the bug being fixed, in the very data `0224` depends on.

**Not hypothetical:** my own run 6 observed the synchronous `r.start()` throw on a join-over, which is
exactly that trigger. **Pre-diff this could not happen — there was no callback.**

**Severity: medium** (my assignment, matching the reviewer's). It needs a join-over inside the in-flight
window *and* game N failing; it is bounded and self-heals on the next leave/join. But it is silent.

**Fix — 3 lines plus a field, entirely in `Main.ts`; `ClientGameRunner.ts` untouched by this round:**

```ts
private joinGeneration = 0;                                  // field
const joinGeneration = ++this.joinGeneration;                // before joinLobby(...)
if (joinGeneration !== this.joinGeneration) { return; }       // first line of onGameEnd
```

I evaluated the reviewer's suggested shape on its merits rather than substituting my own, and adopted
it. I considered keying on `lobby.gameID` instead and rejected it: there is no existing
`currentGameID` field to compare against, so it is the same amount of new state, and a monotonic
counter cannot collide.

**Why the increment sits immediately before the `joinLobby(...)` call, not at the top of
`handleJoinLobby`:** it ties the generation to *actual `joinLobby` invocations*, which is exactly what
`onGameEnd` belongs to, and it sidesteps the pre-existing `await`-interleave in `handleJoinLobby`
(`0228`) rather than entangling with it.

**Edge case checked and deliberately left alone:** `handleLeaveLobby` does **not** bump the generation,
so a superseded game's late callback still matches and calls `stopPerformanceMonitor()`. That is a
**no-op** — `perfMonitorStop` is already `null` (`Main.ts:941-944`) — so it is harmless. Bumping there
too would be extra state for no behavioural gain.

⚠️ **Not verified at runtime.** The R1 trigger needs a join-over landing inside game N's in-flight
window; I did not reproduce that timing in the browser. The fix is verified by code reading, `tsc`,
lint and the full suite. **Saying so rather than implying a runtime check I did not do.**

## Round-2 review response (2026-09-07)

| # | Verdict | Class | Outcome |
|---|---|---|---|
| **R4** | **CORRECT** | **Defect — in round 1's own R1 fix** | ✅ Fixed. `monitorGeneration` in `Main.ts`. |
| **R5** | **CORRECT** | Docs — no behaviour | ✅ Applied. Numbering clauses. |

### 🔴 R4 refutes my round-1 claim 4 — I was wrong, and here is exactly how

I wrote that the increment sits *"immediately before the `joinLobby(...)` call"* and therefore
*"sidesteps the pre-existing `await`-interleave."* **That was wrong, and I verified it myself before
accepting the finding.**

`src/client/Main.ts:707` — `yandexPlayerId: await FlashistFacade.instance.getYandexUniqueId(),` — sits
**inside the object literal being passed to `joinLobby`**. It is evaluated **after** the mint at `:689`
and **before** `joinLobby` is actually invoked, so `handleJoinLobby` **suspends between the two**.
**I read the mint's textual position and mistook it for its execution position.** There is no
sidestepping; the guard sat squarely inside the interleave window.

**The failure my round-1 guard allowed** (verified against the code, not taken on trust):

1. Join **B** mints gen 2, suspends at `:707`.
2. Join **C** mints gen 3, calls `joinLobby`; C's `onJoin` starts monitor **C**.
3. **B resumes** and its `onJoin` runs `restartPerformanceMonitor()` — **stopping C's monitor and
   starting B's** — while `this.joinGeneration` is still 3.
4. B's `createClientGame` fails (or `worker.initialize()` hits its 5 s timeout).
5. B's guard sees `2 !== 3` → **returns without stopping**. ⇒ a monitor sampling a **dead** game — the
   original 0227 bug — **plus** C's live telemetry already killed at step 3.

A second route needs no `await` at all: if join #2's `onJoin` merely **arrives** before join #1's,
ownership lands on the older generation and the same inversion follows. **One root cause: my guard
keyed on *who joined last* instead of *who owns the live monitor*.**

**Fix (owner-ruled shape, `Main.ts` only, +14/−1):**

```ts
private monitorGeneration = 0;                                // new field
this.monitorGeneration = joinGeneration;                      // beside restartPerformanceMonitor()
if (joinGeneration !== this.monitorGeneration) { return; }     // guard now keys on ownership
```

Confirmed for myself, as instructed, that `onJoin` and `onGameEnd` are arguments to the **same**
`joinLobby(...)` call and so close over the same `joinGeneration`.

**Re-traced after the fix:** interleaved — B sees `2 === 2` and **stops correctly**; C's later callback
sees `3 !== 2` and correctly skips. Non-interleaved — game N's late callback still sees `1 !== 2` and
skips. ⛔ **Round 1's guard was NOT reverted; this tightens it.**

⚠️ **Deliberately not reproduced at runtime**, per the reviewer's Q5 ruling: static reading is what
found R4, and a runtime run of the common path would have gone green and hidden it. Verified by code
reading + `tsc` + lint + full suite (113/1185 green).

### R5 — numbering

`worklog.md` and `review.md` cite `ClientGameRunner.ts` in **working-tree** numbering; `brief.md` cites
it in **`HEAD` (`702a8ea`)** numbering. Both were internally right but read as a contradiction on a
record the task closes on. Added an explicit clause to this worklog and to the brief's correction block
(crash branch: `:491` at HEAD, `:517` in the working tree).

### Cleared by round 2 — no action

The no-bump-in-`handleLeaveLobby` reasoning holds in all three sequences including leave-then-rejoin.
My rejection of a `gameID` key was right, and the reviewer found **stronger evidence than I had**:
`ReconnectModal.ts:177-186` dispatches `join-lobby` with the **same `gameID`**, so a `gameID` key could
not distinguish an original join from its reconnect. The R3 record correction passed as honest and
complete.

---

## Deviations from the approved plan

1. **The site-B instrumentation had to be reshaped mid-build.** An unconditional `throw` before
   `await worker.initialize()` made the rest of the function unreachable, so TypeScript dropped the
   `lobbyConfig.gameStartInfo` narrowing and the build failed with 4 × `TS18048`. Re-expressed as a
   `const … : boolean` guard so the following code stayed reachable. **This was temporary
   instrumentation only — it never touched the real change, and `tsc --noEmit` was clean on the real
   change both before and after.**
2. **A 10 s delay was added before the forced failures.** Without it the failure beat the first sample
   tick, so the run showed *zero* ticks and could not distinguish "stopped" from "never started". The
   delay makes the before/after visible.
3. **Run 2 (seam disabled) was added** — not in the plan. Without a control, "no ticks after" proves
   nothing.
4. **The HEAD control for the `TypeError` was added** — not in the plan, and necessary: I would
   otherwise have been shipping with an unexplained error in my own verification run.

## Things I did not do

- Did not commit or push.
- Did not touch `PerformanceMonitor.ts` permanently, `0224`, or `0231`'s orphaned-runner defect.
- Did not null or re-drive `Main.gameStop` (brief `:301-303`); `0228` owns that.
- Did not set `gameHasEnded` in the new callback — it would suppress `logActiveMatchAbandon()` for
  crashed games, an analytics behaviour change outside this scope. Deliberate omission, recorded here.
- Did not move any task file.
