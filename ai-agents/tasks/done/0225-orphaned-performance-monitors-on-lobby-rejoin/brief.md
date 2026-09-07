# Joining a lobby mid-game leaks the running `PerformanceMonitor` — orphaned monitors keep emitting `Performance:*` forever

## ID
0225

## Sprint
Sprint 4

**➕ ADDED TO SPRINT 4 ON 2026-09-07 on the owner's instruction**, given live: the leaked
`PerformanceMonitor` path *"needs its own brief. Add it to the current sprint."*

⚠️ **The owner ruled SCHEDULING (which board), NOT rank.** The Priority cell below is the
**producer's** rank, not an owner ruling — do not read it as one.

⚠️ **This task's Sprint 4 row is APPENDED at the BOTTOM of that board, and its position does NOT
express its rank.** fkit's **ADR-035** bars inserting a new row above a board's closed rows, so
appending is the only mechanically permitted placement. **Bottom row = board mechanics, not
ranking.**

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream
`adr-0XX` ADRs living in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

## Priority
**High *(producer's rank — NOT an owner ruling)*.** Ranked directly **after
[`0224`](../0224-gameanalytics-per-user-event-limit-exceeded/brief.md)** (which the owner ruled is
next in work order) and **before the owner's analytics watch period begins**. The rank is driven by
**timing, not size**: the change is tiny, but its value decays sharply once the watch period starts
— see *Ordering relative to `0224`* below.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Depends on
**Nothing — startable immediately.** No server contact, no deploy needed to make the change, no DB.

Related, not blocking: **`0224`** touches the same subsystem (`PerformanceMonitor.ts`).
🔴 **CORRECTION, verified 2026-09-07 while writing this brief: `0224`'s change is COMMITTED, not
uncommitted.** It is in `HEAD` — commit `35afc64` *"Sprint push"*, 2026-09-07, which carries both the
`SAMPLE_INTERVAL_MS = 300 * 1000` constant and the `visibilitychange` listener. The working tree is
clean for `src/`. The premise this brief was originally handed — *"in the working tree,
uncommitted"* — was **stale**, and the ordering advice below was rewritten around the real state.
⛔ **Whether that commit has been DEPLOYED, and whether the owner's watch period has STARTED, is NOT
determinable from this repository.** Read *Ordering relative to `0224`* before starting.

---

## Context

### The defect, verified twice in-session and re-verified against current source 2026-09-07

Found by a spawned `fkit-coder` while planning `0224`, re-confirmed by a second coder after `0224`'s
change landed in the working tree, and **re-verified line by line for this brief on 2026-09-07**
(`0224` touched `PerformanceMonitor.ts` but not `Main.ts`, so the line numbers below are current as
of writing — ⚠️ **the implementer must still re-verify them, not trust this list**).

**Mechanism:**

1. `src/client/Main.ts:676-679` — `handleJoinLobby()` stops an already-running game when the player
   joins a new lobby:
   ```
   if (this.gameStop !== null) {
     console.log("joining lobby, stopping existing game");
     this.gameStop();
   }
   ```
   It **does not** call `this.perfMonitorStop?.()`, and it does not null the field.
2. `src/client/Main.ts:757` — when the new game starts, the `onStart` callback does
   `this.perfMonitorStop = startPerformanceMonitor();`, **overwriting** the previous monitor's
   stopper.
3. ⇒ The previous monitor's `setInterval` **and** its `requestAnimationFrame` loop keep running until
   page unload. **The only handle that could stop them has been overwritten and is unreachable.**

`src/client/PerformanceMonitor.ts` confirms what leaks — the returned stopper is the sole teardown for
all three resources: `cancelAnimationFrame(rafId)`, `clearInterval(sampleInterval)`, and
`document.removeEventListener("visibilitychange", resetSampleWindow)` (`PerformanceMonitor.ts:69-73`).

### Consequences, in order

1. **Concurrent monitors accumulate.** One orphan per mid-game lobby join, per page session. Each
   emits its own `Performance:*` events on its own independent interval. A player who joins three
   lobbies without reloading ends with three monitors running.
2. 🔴 **This is an analytics-volume contributor, and it is why the owner wants it tracked now.**
   `0224` just cut the `Performance:*` interval 60 s → 300 s expecting a **≥5× reduction**, and the
   owner is about to spend several days watching **exactly that metric**. Orphaned monitors **partly
   offset that cut**. ⚠️ **Say it plainly: this defect can make `0224`'s observed reduction look
   SMALLER than it should be**, and the owner could reasonably conclude from a weak number that the
   interval change underdelivered, when the real cause is monitors that were never stopped. That is
   the practical reason this matters now rather than later.
   ⚠️ **Magnitude is NOT quantified.** Nobody has measured what share of sessions join a second lobby
   mid-game. The offset is **real and directional, not sized** — do not write a number for it
   anywhere.
3. **As of `0224` it also leaks a `visibilitychange` listener.** `0224`'s hidden-tab fix registers one
   (`PerformanceMonitor.ts:27`) and only the now-lost stopper removes it — so every orphan holds a
   permanent document-level listener too.
4. **A leaked `requestAnimationFrame` loop is a live per-frame callback** (`PerformanceMonitor.ts:12-16`).
   Small, but real client-side cost, on every frame, for the rest of the page session.

### Paths that already handle it correctly (verified 2026-09-07)

Recorded so the implementer starts from a checked map rather than a blank page — **not so they skip
their own sweep**:

| Path | `Main.ts` | Stops the monitor? |
|---|---|---|
| `beforeunload` | `:247-254` | ✅ calls `perfMonitorStop?.()` (does not null it — harmless at unload) |
| `SendWinnerEvent` (game won/ended) | `:273-277` | ✅ stops **and** nulls |
| `onHashUpdate` (popstate / hashchange) | `:496-505` | ✅ indirectly, via `handleLeaveLobby()` |
| `handleLeaveLobby()` | `:923-937` | ✅ stops **and** nulls |
| **`handleJoinLobby()` — joining while a game runs** | **`:676-679`** | ❌ **THE HOLE** |
| monitor start site | `:757` | overwrites the handle, destroying the orphan's only stopper |

---

## What to build

### Scope

**The fix is almost certainly one line** — call `this.perfMonitorStop?.()` (and null the field)
alongside the `this.gameStop()` at `Main.ts:676-679`.

🚨 **BUT THIS BRIEF DOES NOT PRE-COMMIT YOU TO THAT, AND THIS INSTRUCTION IS THE SUBSTANCE OF THE
TASK:**

> **Audit EVERY path that stops, ends, replaces, or restarts a game for the same omission** — win,
> leave, join-over, hash/popstate navigation, unload, reconnect, singleplayer start, and any
> error/disconnect teardown inside `joinLobby`'s callbacks or `ClientGameRunner` — **before deciding
> what the change is.** A one-line fix applied to one of several identical holes would **leave the
> defect alive while looking closed.**

Concretely, derive the path list yourself rather than trusting the table above: find every
assignment to and call of `this.gameStop`, every place `startPerformanceMonitor()` could be reached, and
every teardown that fires when a game ends for any reason. Report the paths you checked and the
verdict for each — **including the ones that were already correct**, so the audit is auditable.

### A structural option worth weighing (your call, not a requirement)

Rather than adding the stop call at N sites, consider a **single choke point**: a small private helper
that stops any existing monitor before starting a new one (and one that stops-and-nulls on teardown),
so a **future** new teardown path cannot reintroduce the leak.

⚠️ This is a **recommendation to evaluate, not a ruling.** Weigh it against the minimal-change
principle. The reason it is raised at all: [`0201`](../0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md)
closed with residual **R5** — a fix that repaired today's known instances but did not structurally
close the same failure mode for the next file. Same shape here. If you choose the minimal fix,
**say so and say why**; if you choose the choke point, keep it small.

### Rules that bind regardless

- ⛔ **No event should be added, renamed, or removed by this task.** If that changes, `CLAUDE.md`
  binds: event strings only via the `flashistConstants.analyticEvents` enum key, **never inline**, and
  `ai-agents/knowledge-base/analytics-event-reference.md` **must** be updated for every event added,
  renamed, or removed. If the outcome is "no event change", **record that explicitly** — do not leave
  it unstated.
- 🔒 **No secrets in any artifact.** The GameAnalytics Game key and Secret key are hardcoded in
  `src/client/flashist/FlashistFacade.ts` — **never print, quote, or record either value**, nor any
  dashboard ID or URL containing one. `file:line` references only.
- Do **not** change the sampling interval, the event set, or anything else `0224` owns.

---

## Verification steps

🚨 **BE HONEST ABOUT WHAT IS AND IS NOT VERIFIABLE HERE. READ THIS WHOLE SECTION BEFORE WRITING A
TEST.**

- **There is no test for `PerformanceMonitor` today.** None exists and none is trivially addable —
  the module reaches for `requestAnimationFrame`, `document`, `performance.memory`, and the analytics
  facade.
- **`CLAUDE.md` mandates tests for `src/core/` only.** Both files here are `src/client/`. **This task
  is not required to add a test.**
- ⛔ **DO NOT INVENT A TEST THAT ONLY PROVES THE CALL WAS ADDED.** A unit test asserting
  "`perfMonitorStop` was invoked" restates the diff and proves nothing about the leak. A previous
  coder in this session made exactly that call and it was the right one.

### What IS genuinely checkable — the dev-console observation (required)

1. `npm run dev`, open the client with the dev console.
2. **Temporarily** lower `SAMPLE_INTERVAL_MS` in `src/client/PerformanceMonitor.ts` to a few seconds
   and add a **temporary** per-monitor tag logged from inside the interval (e.g. a monotonically
   increasing instance number). Both are throwaway instrumentation.
   🚨 **REVERT BOTH BEFORE YOU FINISH.** Leaving either in would silently undo `0224`.
3. Join a lobby and let the game start — confirm exactly **one** tag is ticking.
4. **Without reloading the page**, join a second lobby while the first game is running. Let it start.
5. ✅ **PASS:** only **ONE** tag is still ticking — the new one. ❌ **FAIL (today's behaviour):** two
   tags tick side by side, forever.
6. Repeat for each additional teardown path your audit judged at risk.
7. Optional supporting evidence, not a substitute for step 5: in Chrome DevTools, confirm the
   `visibilitychange` listener count on `document` does not grow with each join.

### Baseline checks

- `npm test` green and `npm run lint` clean.
  ⚠️ **State plainly in the worklog that the suite does NOT cover this defect** — a green run here is
  a no-regression signal, **not** evidence the leak is fixed. The only evidence for that is step 5.
- ⚠️ If a `supertest` suite flakes, apply `CLAUDE.md`'s known-flake procedure (rule out the `0197`
  segfault signature first, then re-run **and say that you re-ran**). Unrelated to this change.

### Acceptance criteria

1. The audit is done and **reported path by path**, with a verdict for each — including paths already
   correct.
2. Every path found missing the stop call is fixed, **or** a single choke point makes the question
   moot; the choice is stated with its reason.
3. The dev-console observation above shows **one** monitor after a mid-game lobby join.
4. All temporary instrumentation is reverted — `SAMPLE_INTERVAL_MS` is back at `300 * 1000`.
5. No event added, renamed, or removed (or, if one was, `analytics-event-reference.md` updated).
6. `npm test` green, `npm run lint` clean, with the coverage caveat stated.

---

## Ordering relative to `0224` — producer's scheduling call

**What is established, and what is not:**

| | Status |
|---|---|
| `0224`'s interval change is committed | ✅ **YES** — `HEAD` = `35afc64` *"Sprint push"*, 2026-09-07, verified this turn |
| That commit has been **deployed** to production | ⛔ **NOT DETERMINABLE FROM THIS REPOSITORY** — a deploy leaves no artifact in git |
| The owner's **watch period** has started | ⛔ **UNKNOWN** — only the owner can say |

**Recommendation, and it forks on one fact only:**

- **If `0224` has NOT yet been deployed** → **ship `0225` in the SAME deploy.** This is the
  recommended path.
- **If `0224` IS already deployed and the watch has begun** → 🔴 **HOLD `0225` until the watch period
  ends.** Landing it mid-watch changes the measurement conditions partway through and makes the whole
  series uninterpretable — worse than either extreme.

**Reasoning for the first branch.** `0224`'s entire value is a number the owner reads off the
dashboard over several days. Orphaned monitors inflate `Performance:*` in exactly the population that
rejoins lobbies, so a watch period run against the leak measures a **partly-offset** reduction. The
risk is a wrong conclusion in the expensive direction: the owner sees a weaker-than-expected drop and
infers the interval change underdelivered, when the real cause is monitors that were never stopped.
The fix is small and low-risk, so bundling costs little.

**The tradeoff, stated:** shipping both in one deploy means the observed `Performance` drop is the
**combined** effect of two changes and cannot be attributed to either one alone. I judge that
acceptable — the owner's question is *"is `Performance` still too chatty?"*, not *"which of the two
changes did more?"* — and `0224`'s acceptance only requires attributing the drop to the **category**,
not to a specific change. **`0224`'s worklog should record that the watch measures both.**

🚨 **DO NOT GUESS WHICH BRANCH YOU ARE IN. Ask the owner** — *"has the build carrying `0224` gone out,
and has your watch started?"* — before touching code. Nothing in the repo answers it.

---

## Notes

- **Cross-reference:** `0224`'s brief already lists *"confirming the monitor's stop function runs on
  every teardown path"* among its **deferred, not rejected** items. **This task is that item, taken
  up.** `0224`'s scope stays exactly as the owner narrowed it — one interval constant.
- **Not in scope, and not fixed by this task:** the 3–4 Sep breach (session-start events, unexplained
  and unaddressed), the `DEPLOY_ENV` fail-open default, the cardinality question, the `0224` reduction
  target. All remain open where `0224` records them. **A later reader must not read this task as
  having fixed the per-user limit problem** — it removes one contributor to one category.
- **Magnitude unmeasured.** How often players join a second lobby mid-game in production is unknown.
  The offset on `0224`'s numbers is real in direction and **unquantified in size**. Do not put a
  figure on it.
- 🔒 Filenames, `file:line` references and counts only in this task's artifacts — no key or dashboard
  values anywhere.

---

## Close note — 2026-09-07

**Closed by a spawned `fkit-producer` under the `fkit-lead` conductor session.**

### 🚨 `✅ Done (agent-closed — not owner-verified)` — what that means HERE, concretely

⚠️ **The owner has NOT committed the change and has NOT run it themselves.** The owner ruled the
*decisions* on this task (scheduling onto Sprint 4, the choke-point shape, F2/F3/F4 splitting out);
they did **not** hand-verify the result.

🔴 **`src/client/Main.ts` is UNCOMMITTED in the working tree at close time.** Verified this turn —
`git status --short` reports ` M src/client/Main.ts`, and this task folder is itself untracked
(`??`), which is why the move used `mv` rather than `git mv`. **A closed task whose code is not
committed is exactly the state a later reader will misjudge**, so it is stated here rather than left
to inference. Nothing was committed, pushed, stashed, checked out or restored by the close.

### Delivered

**One file — `src/client/Main.ts`, `+18 / −6`** (measured; `git diff --numstat` → `18 6`).
⚠️ An earlier worklog revision said `+12 / −5` — that figure was **an estimate written as a
measurement**, was wrong, and was corrected under review finding **R2**. Recorded, not silently
swapped.

Two new private helpers plus five rewritten call sites:

| Site | Change |
|---|---|
| new helper | `stopPerformanceMonitor()` — stops and nulls |
| new helper | `restartPerformanceMonitor()` — stops any predecessor, then starts |
| `:249` (`beforeunload`) | → `this.stopPerformanceMonitor()` |
| `:275` (`SendWinnerEvent`) | → `this.stopPerformanceMonitor()` |
| `:678` (`handleJoinLobby`) | **added** the stop beside `this.gameStop()` — **F1's fix** |
| `:757` (`onStart`) | → `this.restartPerformanceMonitor()` — **F3's containment** |
| `:931` (`handleLeaveLobby`) | → `this.stopPerformanceMonitor()` |

**No analytics event was added, renamed or removed** — recorded explicitly, per the brief;
`analytics-event-reference.md` needed no update and was not touched.
`src/client/PerformanceMonitor.ts` is byte-identical to `HEAD` (`SAMPLE_INTERVAL_MS = 300 * 1000`
intact); **no instrumentation residue anywhere in `src/`**.

### Evidence — the strongest in this chain, and stated as such

A **dev-console observation over two consecutive singleplayer games** showed exactly **one** monitor
ticking after a mid-game join — **plus a negative control on the un-fixed build showing both monitors
interleaved.** ✅ **The negative control is what makes the PASS falsifiable**, and it is the reason
this task's evidence is stronger than its siblings'. It was run for real, not reasoned about.

### ⚠️ And its limits — these do NOT get dropped on close

- The runtime evidence covers **ONE of the six touched sites** — the F1 mid-game-join path.
- It **cannot separate `:678` from `:757`**: the two log lines are **4 ms** apart, and the negative
  control reverted both together. The PASS credits **the pair**, not either site alone.
- **`:249`, `:275` and `:931` have NO runtime evidence** — verified **statically only**, by the coder
  and independently by the reviewer, who found no regression. A static argument, not an observation.
- **F3 was never reproduced by anyone.** It needs a forced socket drop inside a sub-second window.
  Its containment at `:757` is **defensive**, read from code, not demonstrated.

### Review integrity — read before trusting the APPROVE

Round 1 verdict: **✅ APPROVE — ship as-is, no defect in the diff.** With three caveats that stand:

- ⚠️ **Codex coverage was FULL but THIN.** Three attempts (attempt 1 `Selected model is at capacity`,
  attempt 2 an unsupported model), **one finding returned.** The adversarial worker's padding was
  **self-labelled *same model family, NOT independent*** and was treated as a second Claude pass, not
  as Codex. ⇒ **Two-model coverage achieved; the diverse half was ONE FINDING DEEP.**
- ⚠️ **The reviewer did NOT re-run `npm test`.** The coder's green — **113 suites / 1185 tests**,
  first run both times — is **not independently confirmed.** (The suite covers none of this defect
  either way: a green run is a no-regression signal only.)
- ⚠️ **No timing figure was ever obtained.** The host ran at load **24–36** throughout and every
  worker correctly **refused to quote one**. No duration appears in any artifact by design.

### Findings — disposition

| # | Disposition |
|---|---|
| **R1** | **NOT a `0225` defect** — routed to `0227`. Codex found `0227`'s brief wrongly excluded the worker-init-failure site. Recorded, not acted on here. |
| **R2** | Corrected in `worklog.md` (the diff stat). |
| **R3** | Corrected in `worklog.md` (evidence scope). |

🔵 **No code change was requested by the review, and none was made.** The reviewed diff is
byte-unchanged.

### Incidental win — worth recording

The diff **also fixes the *monitor* half of F4** (the `:675-686` await interleave): a second join's
`restartPerformanceMonitor` stops the first's monitor, so the count stays 1 where pre-diff it was 2.
**The `gameStop` half is now [`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md).**

### Follow-ups spawned from this task

- **[`0227`](../0227-crashed-game-leaves-performancemonitor-running/brief.md)** — crashed-game
  monitor. Now **three** sites, not one: correcting the brief under R1 surfaced a third, **site C at
  `ClientGameRunner.ts:215`** (`.then((r) => r?.start())` with **no `.catch`**).
- **[`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md)** — the `gameStop` race
  (F4's remaining half).
- **[`0229`](../../backlog/0229-double-onjoin-constructs-a-second-clientgamerunner/brief.md)** —
  **F3's ROOT CAUSE**, filed on the owner's live ruling 2026-09-07. `0225` contained F3's *monitor*
  consequence only; the double-`onJoin` that constructs a **second `ClientGameRunner`** is untouched.
