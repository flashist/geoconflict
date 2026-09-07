# `ClientGameRunner.stop()` never runs on a normal leave-lobby — the runner, its Web Worker and a 1-second reconnect interval survive every abandoned multiplayer game

## ID
0231

## Sprint
Sprint 4

## Status
🔲 Backlog

## Owner
fkit-coder

## Priority
Medium–High *(**position OWNER-RULED 2026-09-07**; the `Medium–High` label itself is the producer's)*

🔴 **THE OWNER RULED THIS ROW'S POSITION, 2026-09-07, given live in session and relayed through the
spawning session. Authority first: this is an OWNER RULING, not a producer re-rank, and it is NOT
producer precedent for re-ranking anything else.**

**The original ruling: this row sits DIRECTLY BELOW
[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md)** on the Sprint 4 board.
The reasoning the owner accepted: it depends on `0227` landing first, and it is the **accumulating**
member of the family — `0225`, `0227` and `0228` are each bounded to at most one stale object, and
this one is not.

🔴 **RE-RULED BY THE OWNER LATER THE SAME DAY (2026-09-07), given live in session and relayed through
the spawning session. THIS ROW NOW SITS BELOW
[`0232`](../0232-worker-tick-error-never-reaches-main-thread/brief.md)**, not directly below `0227`.
Final order on the board: **`0227` → `0232` → `0231`.**

**The owner SUPERSEDED THEIR OWN earlier ruling of the same day, deliberately** — they were shown
that the new ordering displaced it and ruled anyway. It is a supersession, **not an accidental
contradiction**, and the earlier ruling above is **kept, not deleted**, so the trail reads straight.

🚨 **The owner was told plainly, before the recommendation, that BOTH risks — this task's
accumulation and `0232`'s silent freeze — are UNMEASURED, and that the ordering is a JUDGEMENT CALL
rather than a decision on evidence.** ⛔ **Neither risk became measured by being ruled on.** The
accumulation described below is still unobserved and step 1 still has to settle it.

⚠️ **Nothing about this task's content, scope or `Medium–High` label changed** — only its position.
⚠️ **ADR-035's append-only constraint was lifted by the owner for exactly the two row moves this
re-ruling required and nothing else.** ✅ **No closed row was altered and nothing was renumbered.**

🚨 **The owner was shown the caveat IN FRONT OF the recommendation — that the accumulation is REASONED
FROM CODE and NOT MEASURED — and ruled this position anyway**, explicitly declining the alternative of
deferring the rank until step 1 measures it. ⛔ **That does not upgrade the reasoning into a
measurement.** The accumulation is still unobserved, and step 1 still has to settle it.

⚠️ **It was first APPENDED at the bottom of the board on filing** — fkit's **ADR-035** bars a producer
from inserting a new row above a board's closed rows, so appending was the only mechanically permitted
placement — **and then moved on this ruling.** ✅ **No closed row was altered:** this board's Priority
column carries word ranks, not `P<n>` numbers, so nothing was renumbered — only position changed.

⚠️ **The `Medium–High` label is still the PRODUCER's and was not owner-ruled.** The owner ruled the
row's **position**, not its label.

📎 *ADR-035 is cited by name, never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs, which live in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

---

## Context

**Filed 2026-09-07 on an owner ruling given live in session.** The finding came out of the coder who
planned [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) while reading the
code, and the owner ruled it gets its own brief rather than being folded in.

### The mechanism — CODE FACTS, each re-verified at commit `702a8ea`

Every line reference below was read from `git show 702a8ea:<file>` for this brief on 2026-09-07 —
**not** from the working tree, which was being edited by another session at the time.

1. **`ClientGameRunner.stop()` has exactly ONE caller.** `src/client/ClientGameRunner.ts:499` — inside
   the worker's error branch, i.e. **the crash path**. A grep of the whole file for `this.stop()`
   returns that one call site and the method definition at `:753`. Nothing else in the file, and
   nothing in `Main.ts`, ever calls it.
2. **`Main.gameStop` is not the runner's stopper.** It is the closure `joinLobby()` returns at
   `ClientGameRunner.ts:230-233`, and its entire body is `console.log("leaving game");
   transport.leaveGame();`. **It never calls `runner.stop()`.**
3. **`stop()` is what does the teardown** (`ClientGameRunner.ts:753-766`): sets `isActive = false`,
   calls `this.worker.cleanup()`, calls `this.transport.leaveGame()`, and clears
   `this.connectionCheckInterval`. **On a normal leave, none of that runs.**
4. **A 1-second interval survives.** `ClientGameRunner.ts:465-471` — inside a `setTimeout(…, 20000)`,
   `this.connectionCheckInterval = setInterval(() => this.onConnectionCheck(), 1000)`. `stop()` is the
   only thing that clears it (`:761-764`).
5. **That interval calls `reconnect()` on the game the player already left.**
   `ClientGameRunner.ts:1074-1086` — `onConnectionCheck()` returns early if `this.transport.isLocal`
   (`:1075`), otherwise, if no server message has arrived for >5000 ms, it calls
   `this.transport.reconnect()`, which is `this.connect(this.onconnect, this.onmessage)`
   (`src/client/Transport.ts:377-379`).
6. **`Main`'s `EventBus` is long-lived** — `src/client/Main.ts:144`, `private eventBus: EventBus = new
   EventBus()`, one per `Main` instance, not per game. `start()` registers **five** listeners on it
   (`ClientGameRunner.ts:473-483`: `MouseUpEvent`, `MouseMoveEvent`, `AutoUpgradeEvent`,
   `DoBoatAttackEvent`, `DoGroundAttackEvent`) and **the file never calls `off` or
   `removeEventListener` even once.** ⚠️ Note `EventBus` **does** expose `off()`
   (`src/core/EventBus.ts:32`) — removal is available and simply not used.
7. **Leave-lobby is the ordinary path.** `Main.handleLeaveLobby()` (`Main.ts:923-937`) calls
   `this.gameStop()` and nulls it. Per fact 2, that reaches `transport.leaveGame()` and nothing else.
   The `beforeunload` handler (`Main.ts:247-253`) does the same.

### 🚨 What follows — and the sharp limit on how far it may be stated

⚠️ **THE ACCUMULATION IS REASONED FROM CODE. IT HAS NOT BEEN OBSERVED IN A RUNNING BROWSER.**

The reasoning: nothing clears the interval or the worker on a normal leave, and each new game builds a
new runner, so **each abandoned multiplayer game should leave behind one live 1-second interval and
one Web Worker**, for the lifetime of the page. ⛔ **Nobody has measured this.** No browser session was
observed, no interval count was taken, no worker count was taken, no memory figure exists.

**If it holds, it makes this materially larger than `0227`'s issue**, which is *bounded* — at most one
stale monitor, cleared by the next join or leave. This one has no such ceiling. **That comparison is
the reason the task exists, and it rests on the reasoning above, not on a measurement.**

🚨 **DO NOT ASSERT A USER-VISIBLE IMPACT.** Battery drain, reconnect storms, added server load and
memory growth are **things to check**, listed in step 1 below. **None of them is a finding.** ⛔ **No
figure, rate or severity may be written for any of them anywhere until it is measured.**

### ✅ Singleplayer is exempt

`onConnectionCheck()` early-returns on `this.transport.isLocal` at `ClientGameRunner.ts:1075`, so the
reconnect half does not apply to local games. ⚠️ **That guard covers the reconnect call only** — the
interval itself, the worker and the five listeners are **not** conditioned on `isLocal`. Whether the
non-reconnect half of the leak still applies to singleplayer is **an open question, not a settled
exemption.**

### ⚠️ A related code fact, recorded as SOMETHING TO VERIFY rather than as a second defect

The interval is created inside a **`setTimeout(…, 20000)`** (`:465-471`), and **that timeout handle is
never stored, so `stop()` cannot cancel it**. Read literally, a runner stopped *within* the first 20
seconds would still have the pending timeout fire afterwards and install a fresh, uncleared interval —
and `onConnectionCheck()` has no `isActive` guard. ⚠️ **This is read off the code and has NOT been
reproduced.** It would affect the crash path too, i.e. the one path where `stop()` does run. **Confirm
or refute it as part of this task; do not assume it.**

### 🔴 Scope boundary — this must NOT be folded into `0227`

[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) **explicitly bars** the fix
this task needs. Its brief, at `:301-302`: *"⛔ **Do NOT also null or re-drive `Main.gameStop` from the
runner** unless you can show it is safe."* ⇒ **this needs its own design and its own verification**,
which is exactly why it is a separate task.

⚠️ **`0227` introduces a new `onGameEnd` / `onTeardown` callback parameter on `joinLobby()`**
(`0227`'s brief, `:290`). **Whether this task can reuse that seam or needs a different one is an OPEN
QUESTION for whoever plans this task.** ⛔ **This brief deliberately does not decide it** — the seam
does not exist yet, and its final shape is `0227`'s to settle.

### Where this sits among the four sibling tasks

| Task | What it covers | Bounded or accumulating? |
|---|---|---|
| [`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) | `PerformanceMonitor` orphaned on lobby rejoin | Bounded |
| [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) | `PerformanceMonitor` survives a crashed/failed game | Bounded |
| [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md) | stale `gameStop` across three awaits | Bounded |
| **`0231` (this task)** | **the whole runner + worker + 1 s interval + 5 listeners, on the NORMAL leave path** | **Accumulating — ⚠️ reasoned, not observed** |

⛔ **This does not explain, address, or close
[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md) or
[`0230`](../0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md).** The 3–4 Sep event
spike was in the once-per-session categories, and nothing here is known to touch them. ⚠️ If `0230`'s
investigation reaches hypothesis 3 (a client per-session re-entry path), this task is **context worth
reading — not an answer.**

---

## What to build

A teardown path that actually stops the runner when a player leaves a game normally, so that no
interval, worker or event listener outlives the game that created it.

### Work plan — in this order

1. 🔴 **MEASURE IT FIRST. This step is not optional and it comes before any fix.**
   Run the game in a real browser, join and leave a multiplayer game **several times in one page
   session**, and record, as **numbers**:
   - how many live intervals exist after N leaves,
   - how many Web Workers exist after N leaves,
   - how many `reconnect()` calls are made against left games, and against which endpoint,
   - whether the five event listeners accumulate on `Main`'s bus.

   ⚠️ **State plainly whether the accumulation is confirmed or refuted.** If it does **not**
   accumulate, that is a real and valuable result — **say so and stop**, then put the finding to the
   owner rather than building a fix for something that is not happening.
   ⚠️ **Also settle the `setTimeout(…, 20000)` question** from the Context section here.
   ⚠️ **Also settle whether the singleplayer/`isLocal` path leaks the non-reconnect half.**

2. **Only if step 1 confirms it — design the teardown seam.** The open question named above is the
   first thing to answer: **can `0227`'s `onGameEnd` / `onTeardown` callback be reused, or does this
   need its own?** Answer it against `0227` **as it actually landed**, not as its brief described it.
   ⚠️ **`0227`'s brief bars re-driving `Main.gameStop` from the runner** — if the design needs that,
   **show it is safe, in writing, or choose a different seam.**

3. **Make the normal-leave path reach the teardown**, so `worker.cleanup()`, the interval clear and
   the transport leave all run. ⚠️ **`stop()` already early-returns when `!isActive`**
   (`ClientGameRunner.ts:755`), so it is idempotent — a path that ends up calling it twice is safe.
   **Verify that guard still holds after `0227` lands** rather than assuming it.

4. **Remove the five event listeners on teardown.** `EventBus.off()` exists
   (`src/core/EventBus.ts:32`). ⚠️ **`.bind(this)` returns a NEW function each call**, so a bare
   `off(Event, this.handler.bind(this))` removes nothing — the bound references must be stored at
   registration time to be removable. Confirm the behaviour of `EventBus.off()` before relying on it.

5. **Re-measure and report the same numbers as step 1**, before and after, so the fix is proved by the
   same instrument that found the problem.

### 🔒 Constraints

- ⛔ **Do not fold this into `0227`, and do not edit `0227`'s brief or task folder.**
- ⛔ **Do not write a severity, rate or user-impact figure that has not been measured.**
- **All code changes in `src/core/` MUST be tested** (`CLAUDE.md`). `src/core/EventBus.ts` is in
  `src/core/` — if step 4 changes it, that rule applies.
- **Never commit or push unless the owner explicitly asks.**

---

## Verification steps

1. **The step-1 measurement exists as numbers**, recorded before any fix — interval count, worker
   count, `reconnect()` calls, listener count, after a stated number of join/leave cycles. ⛔ **"It
   leaks" without numbers does not satisfy this**, and neither does a code-reading argument.
2. **The same numbers are recorded after the fix**, by the same method, and show the objects going to
   zero after leave. **A before-number without an after-number, or an after-number without a
   before-number, fails this criterion.**
3. **The `setTimeout(…, 20000)` question is answered** — confirmed or refuted, with what was observed.
4. **The singleplayer/`isLocal` question is answered** — whether the non-reconnect half of the leak
   applies to local games.
5. **The seam question is answered in writing:** whether `0227`'s `onGameEnd` seam was reused, or why
   a different one was needed. If `Main.gameStop` is re-driven from the runner, **the safety argument
   `0227` demanded is written down.**
6. **A normal join → play → leave → re-join cycle still works end to end**, in a real browser, on a
   real multiplayer game. ⚠️ **Not a unit test alone** — this is a teardown-ordering change and the
   failure mode is a runner torn down too early.
7. `npm test` green; `npm run lint` clean. ⚠️ Note `npm test` now runs the shell harnesses and takes
   **~22–25 s**, not ~3 s (`CLAUDE.md`) — that is expected, not a hang.
8. 🚨 **If step 1 refuted the accumulation, criteria 2 and 6 do not apply** — the deliverable is the
   measurement plus a recommendation to the owner, and the task closes on that. ⛔ **Do not build a
   fix for a problem the measurement did not find.**

---

## Notes

- **Depends on:** [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) — it must land first. It touches
  **the same two files** (`src/client/ClientGameRunner.ts`, `src/client/Main.ts`) and **the same
  teardown seam**, and it introduces the `onGameEnd` callback this task may build on. ⚠️ Starting
  before `0227` lands means designing against a seam that does not exist yet and taking a near-certain
  merge conflict in both files.
- **Blocks:** nothing.
- ⚠️ **Step 1 — the measurement — does NOT depend on `0227`** and could be done at any time. **Only the
  fix is blocked.** If the owner wants the accumulation question settled early, step 1 can be split out
  and run first; **that split is the owner's call, not the implementer's.**
- **Evidence provenance:** the mechanism was found by the coder who planned `0227` while reading the
  code, and **every line reference in this brief was independently re-verified at commit `702a8ea`**
  by the producer who filed it, reading `git show` output rather than the working tree — another
  session was mid-edit in `ClientGameRunner.ts` and `Main.ts` at filing time. ⚠️ **The implementer must
  re-verify every line number again**, since `0227` lands in both files first.
- 🚨 **The accumulation is REASONED FROM CODE, NOT OBSERVED.** Repeated here because it is the one
  thing a later reader is most likely to promote into a fact. **No browser session has been run.**
- **Filed 2026-09-07 by a spawned `fkit-producer`**, on an owner ruling relayed through the spawning
  session. ⚠️ The producer had **no owner channel** — the Priority above is the producer's rank, **not**
  an owner ruling.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — `file:line` references only.
