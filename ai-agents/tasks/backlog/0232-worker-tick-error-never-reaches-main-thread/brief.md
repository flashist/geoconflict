# A game-tick crash inside the Web Worker is swallowed by the worker itself — no modal, no teardown, no error surface; the game just freezes

## ID
0232

## Sprint
Sprint 4

## Status
🔲 Backlog

## Owner
fkit-coder

## Priority
High *(**position OWNER-RULED 2026-09-07**; the `High` label itself is the producer's, **not**
owner-ruled)*

🔴 **THE OWNER RULED THIS ROW'S POSITION, 2026-09-07, given live in session and relayed through the
spawning session. Authority first: this is an OWNER RULING, not a producer re-rank, and it is NOT
producer precedent for re-ranking anything else.**

**The ruling: this row sits DIRECTLY BELOW
[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md), and
[`0231`](../0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md) moves down one to sit
below THIS row.** Final order on the Sprint 4 board: **`0227` → `0232` → `0231`.**

🚨 **This SUPERSEDES the owner's OWN earlier ruling of the same day** — that `0231` sits directly
below `0227`. **The owner was shown that it displaced their earlier ruling and ruled anyway.** It is
a deliberate supersession, **not an accidental contradiction**, and the earlier ruling is **recorded,
not deleted**, on `0231`'s brief and on the board.

🚨 **The owner was told plainly, IN FRONT OF the recommendation, that BOTH risks are UNMEASURED and
that this ordering is a JUDGEMENT CALL rather than a decision made on evidence** — and ruled on that
basis. ⛔ **That does not upgrade either risk into a measurement.** This task's freeze is still
reasoned-only, and `0231`'s accumulation is still reasoned-only.

⏱️ **SEQUENCING WAS OWNER-RULED THE SAME DAY TOO: this task stays sequenced AFTER `0227` lands.** The
owner **declined** the alternative of splitting step 1 (the browser reproduction) out to run
immediately, accepting the producer's reasoning: the same file as the uncommitted `0227` work
(near-certain merge conflict) and step 4 verifies `0227`'s seam, which must exist first.

⚠️ **It was first APPENDED at the bottom of the board on filing** — fkit's **ADR-035** bars a producer
from inserting a new row above a board's closed rows, so appending was the only mechanically
permitted placement — **and then moved on this ruling. The owner lifted ADR-035's append-only
constraint for EXACTLY these two row moves and nothing else.** ✅ **No closed row was altered:** this
board's Priority column carries word ranks, not `P<n>` numbers, so nothing was renumbered — only
position changed.

⚠️ **The `High` label is still the PRODUCER's and was not owner-ruled.** The owner ruled the row's
**position**, not its label.

📎 *ADR-035 is cited by name, never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs, which live in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

---

## Context

**Filed 2026-09-07 on an owner ruling given live in session:** this gets its own brief rather than
being folded into [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md).

**Found by Codex** during the `0227` code review; **verified by the reviewer**; and **every line
reference below was independently re-verified by the producer who filed this brief**, reading
`git show 702a8ea:<file>` — **not** the working tree, which another session was editing at filing
time.

### The mechanism — CODE FACTS, each re-read at commit `702a8ea`

1. **The worker's game loop reports a tick fault through a callback.**
   `src/core/GameRunner.ts:171-183` — `this.game.executeNextTick()` is wrapped in `try/catch`; on an
   `Error` it logs `"Game tick error:"` and calls
   `this.callBack({ errMsg: error.message, stack: error.stack } as ErrorUpdate)`, then `return`s.
   ⚠️ A **non-`Error`** throw is logged only — **no callback at all**. That is a second, narrower drop
   in the same `catch`.
2. **That callback is `gameUpdate` in the worker, and it drops the error on the floor.**
   `src/core/worker/Worker.worker.ts:20-28`:

   ```ts
   function gameUpdate(gu: GameUpdateViewData | ErrorUpdate) {
     // skip if ErrorUpdate
     if (!("updates" in gu)) {
       return;
     }
     sendMessage({ type: "game_update", gameUpdate: gu });
   }
   ```

   The `ErrorUpdate` is **never `postMessage`'d**. `gameUpdate` is the exact function handed to
   `createGameRunner(...)` at `Worker.worker.ts:44-48`.
3. **The wire format cannot carry it either.** `GameUpdateMessage.gameUpdate` is typed
   `GameUpdateViewData` — `src/core/worker/WorkerMessages.ts:55-58`. There is **no** error message
   type from worker to main thread.
4. **The main-thread dispatcher only ever forwards a `game_update`.**
   `src/core/worker/WorkerClient.ts:44-51` — `case "game_update": if (this.gameUpdateCallback &&
   message.gameUpdate) this.gameUpdateCallback(message.gameUpdate)`.
5. **⇒ The client's crash branch is DEAD CODE.** `src/client/ClientGameRunner.ts:487-501` registers
   `this.worker.start((gu: GameUpdateViewData | ErrorUpdate) => { ... if ("errMsg" in gu) {
   showErrorModal(...); console.error(gu.stack); this.stop(); return; } ... })`. Per facts 2–4
   **`"errMsg" in gu` can never be true**, so the `showErrorModal` at `:492` and the `this.stop()` at
   `:499` **never run**.
6. **Why it typechecks.** `WorkerClient.start()`'s parameter is typed
   `(gu: GameUpdateViewData | ErrorUpdate) => void` (`WorkerClient.ts:98`) and
   `gameUpdateCallback` the same (`:17-19`). **The type is wider than anything the code can
   deliver** — which is precisely why a dead branch compiles clean and has sat unnoticed.
7. **`ErrorUpdate` is `{ errMsg: string; stack?: string }`** — `src/core/game/GameUpdates.ts:24-27`.

### ⚠️ A SECOND silent-drop path in the same area — record it, verify it, do NOT assume it

`WorkerClient.ts:36-43` adds a `worker.addEventListener("error", ...)` handler, but its whole body is
guarded by `if (this.initReject)`. `initReject` is set only inside `initialize()`
(`:66-95`) and is set back to `undefined` the moment init succeeds (`:75`) or times out (`:88`).
⇒ **read from the code, a worker-level `error` event AFTER initialization does nothing at all.**
⚠️ **This has not been exercised. Confirm or refute it as part of this task**; if it holds, an
unhandled throw *outside* `GameRunner`'s `try` is silent too, and a fix that only unblocks the
`ErrorUpdate` path would still leave that one dark.

### 🚨 The user-visible consequence — and the sharp limit on how far it may be stated

**What the code says:** when a game tick throws, the worker stops producing updates for that tick and
tells the main thread nothing. There is **no modal, no teardown, and no error surface** — the game
appears to freeze while the page stays alive.

🔴 **THIS IS REASONED FROM CODE. IT HAS NOT BEEN OBSERVED IN A RUNNING BROWSER.** Nobody has watched
a tick fault happen. ⛔ **No frequency, no severity, and no player-impact figure may be written
anywhere** until step 1 below produces one. The reviewer states the consequence; the reviewer did not
watch it either.

⚠️ Note also that a tick fault does **not** necessarily kill the session outright: `GameRunner`
`return`s from the faulting tick and the next `heartbeat` will call `executeNextTick()` again
(`Worker.worker.ts:39-41`). **Whether the game recovers, wedges, or diverges after one faulting tick
is UNKNOWN and is part of step 1** — do not write "freeze" as settled until it is watched.

### 🔴 This is the root cause behind `0227`'s headline site

[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) is about a crashed game
leaving the `PerformanceMonitor` running. Its headline site is the very branch that fact 5 shows can
never execute. **`0227` built a correct seam that is DORMANT:** `ClientGameRunner.stop()` calls
`onGameEnd()`, which stops the monitor. **That seam goes live the moment this task fixes the drop.**

🚨 **Whoever does this task MUST verify that seam actually fires once errors start arriving.** `0227`
could not verify it — nothing could reach it — and **that is why `0227`'s site A was never really
verified.** This task is where that verification finally becomes possible, and it is a required
deliverable here, not a nice-to-have.

⚠️ **Check `0227` AS IT LANDED, not as its brief described it.** Its brief, its worklog and its
review were still being edited when this brief was filed.

### ⚠️ "~3 lines" is the size of the DROP, not the size of the TASK

The reviewer estimated **~3 lines** to stop dropping the `ErrorUpdate`. ⛔ **Do not read that as a
trivial task.** Unblocking the drop **changes crash-handling behaviour across the whole client** —
from a path that has provably never fired to one that shows a modal and tears the game down. The
estimate covers the drop only; **it does not cover what surfaces once errors start arriving**, which
is the real work and the real risk.

### 🔒 `src/core/` — the testing rule applies in full

This lands in **`src/core/`** (`GameRunner.ts`, `worker/Worker.worker.ts`, `worker/WorkerMessages.ts`,
`worker/WorkerClient.ts`). **`CLAUDE.md`: "All code changes in `src/core/` MUST be tested."** That
rule applies here **in full** — it is not waived by the change being small.

### Where this sits among the sibling tasks

| Task | What it covers |
|---|---|
| [`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) | `PerformanceMonitor` orphaned on lobby rejoin |
| [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) | `PerformanceMonitor` survives a crashed/failed game — **its crash site depends on this task to ever fire** |
| [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md) | stale `gameStop` across three awaits |
| [`0231`](../0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md) | runner + worker + 1 s interval survive a normal leave |
| [`0233`](../0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md) | the remaining `showErrorModal` sites that never stop the monitor |
| **`0232` (this task)** | **the worker never tells the main thread a tick faulted at all** |

---

## What to build

Make a game-tick fault inside the Web Worker actually reach the main thread, and make the client's
existing crash handling — modal, `stop()`, and `0227`'s `onGameEnd` seam — run when it does.

### Work plan — in this order

1. 🔴 **REPRODUCE IT FIRST, IN A REAL BROWSER. This step is not optional and it comes before any fix.**
   Force a throw inside a game tick (a temporary local throw in an execution's `tick()` is fine — it
   must **not** be committed) and record what a player actually sees:
   - Is there a modal? Any console output? Does the page stay responsive?
   - Does the game freeze, keep running, recover on the next heartbeat, or desync?
   - Does anything at all stop — the monitor, the worker, the transport, the 1 s connection check?

   ⚠️ **Write down what was OBSERVED, separately from what was reasoned.** This is the step that turns
   the Context section's reasoning into a fact.
   ⚠️ **Also settle the post-init `worker.addEventListener("error")` question** from the Context.

2. **Carry the error across the worker boundary.** The three code facts that must change together:
   `Worker.worker.ts:20-28` must send it, `WorkerMessages.ts:55-58` must be able to type it, and
   `WorkerClient.ts:44-51` must dispatch it to `gameUpdateCallback`. ⚠️ **Decide deliberately whether
   the error rides the existing `game_update` message or gets its own message type**, and write the
   reason down — a union on the existing type widens something every update path touches.

3. **Handle the non-`Error` throw** at `GameRunner.ts:180-182`, which today produces no callback at
   all. ⚠️ **Decide whether it should**, and say why either way. Do not leave it undecided silently.

4. 🔴 **Verify `0227`'s dormant seam actually fires.** With errors now arriving, confirm in a real
   browser that `ClientGameRunner.stop()` runs, that `onGameEnd()` is called, and that the
   `PerformanceMonitor` genuinely stops — no further `Performance:*` events after the crash.
   **This is the deliverable `0227` could not produce.** ⚠️ If the seam does **not** fire, that is a
   finding about `0227` — **report it, do not quietly patch `0227`'s files**, which are another
   task's.

5. **Work out what else the newly-live path now does**, and check it. `stop()` calls
   `worker.cleanup()` and `transport.leaveGame()` (`ClientGameRunner.ts:753-766`); the modal is shown
   with `showErrorModal(...)` at `:492`. ⚠️ **A crash path that has never executed in production is
   being switched on** — a bad interaction here is worse than the silent freeze it replaces. Check at
   minimum: does the modal render with real text, is the game left in a state the player can exit,
   and does a subsequent join still work.

6. **Tests.** `src/core/` changes **MUST** be tested (`CLAUDE.md`). At minimum: a test proving an
   `ErrorUpdate` produced by `GameRunner`'s catch reaches the main-thread callback — i.e. a test that
   would have caught this drop.

### 🔒 Constraints

- ⛔ **Do not edit `0227`'s task folder** (`brief.md`, `worklog.md`, `review.md`) — it is another
  task's, and it was being actively edited when this brief was filed.
- ⛔ **Do not commit the temporary throw** used to reproduce in step 1.
- ⛔ **Do not write a frequency, severity or player-impact figure that has not been observed.**
- **All code changes in `src/core/` MUST be tested** (`CLAUDE.md`) — the whole of this task lands
  there.
- **Never commit or push unless the owner explicitly asks.**

---

## Verification steps

1. **Step 1's observation is written down** — what a player sees when a tick throws, observed in a
   browser, before any fix. ⛔ A code-reading argument does not satisfy this.
2. **A forced tick fault now produces the error modal**, observed in a real browser, with the message
   and stack from the thrown error.
3. 🔴 **The `PerformanceMonitor` is proven to stop after a crash** — no `Performance:*` events after
   the modal appears. **This is the criterion `0227` could not meet; it is required here.**
4. **`0227`'s `onGameEnd` seam is confirmed to fire** (or its failure to fire is reported as a
   finding, in writing, against `0227` as it landed).
5. **The post-init `worker.addEventListener("error")` question is answered** — confirmed or refuted,
   with what was observed.
6. **The non-`Error` throw case is decided and the decision is written down.**
7. **A test exists that fails on the old code** — i.e. it catches the dropped `ErrorUpdate`. `npm test`
   green; `npm run lint` clean. ⚠️ `npm test` now runs the shell harnesses and takes **~22–25 s**,
   not ~3 s (`CLAUDE.md`) — expected, not a hang.
8. **A normal game still plays end to end** in a real browser — join, play, leave — with no spurious
   error modal. ⚠️ This change touches the update path every tick goes through; a regression here hits
   every game, not just crashing ones.

---

## Notes

- 🔴 **POSITION — OWNER-RULED 2026-09-07, given live in session:** this row sits **directly below
  [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md)**, with
  [`0231`](../0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md) moved down one to below
  it — **`0227` → `0232` → `0231`**. The producer had recommended exactly this and the owner adopted
  it; **the reasoning the owner accepted:** this is the root cause behind `0227`'s headline site,
  `0227` cannot be fully verified without it, and it is a defect with **no error surface at all**.
  🚨 **It supersedes the owner's own earlier same-day ruling** on `0231`'s position — knowingly, with
  the displacement shown to them, and **after being told plainly that both risks are unmeasured and
  the call is a judgement rather than evidence.** ⛔ **Neither risk became measured by being ruled
  on.** See the Priority section above for the full trail.
- **Depends on:** [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) — 🔴 **it
  lands first; OWNER-RULED 2026-09-07.** It touches `src/client/ClientGameRunner.ts` around the same
  crash branch (merge-conflict risk against work that is uncommitted right now), and step 4 verifies
  **its** seam, which must exist first.
  ⚠️ **Step 1 — the reproduction — does NOT technically depend on `0227`**, and **the owner was
  offered the option of splitting it out to run immediately and DECLINED it.** ⛔ **Do not split it
  out.** The whole task waits for `0227`.
- **Blocks:** nothing formally. ⚠️ But **`0227`'s site A stays unverified until this lands**, which is
  a fact worth carrying into any status report on `0227`.
- **Evidence provenance:** found by **Codex** during the `0227` code review, verified by the
  **reviewer**, and every `file:line` above re-verified by the producer at commit `702a8ea` via
  `git show`, because `src/client/ClientGameRunner.ts` and `src/client/Main.ts` were being edited by
  another session at filing time. ⚠️ **The implementer must re-verify every line number again** —
  `0227` lands in `ClientGameRunner.ts` first.
- 🚨 **The freeze is REASONED FROM CODE, NOT OBSERVED.** Repeated here because it is the one thing a
  later reader is most likely to promote into a fact.
- ⚠️ **"~3 lines" is the reviewer's estimate for the DROP ONLY**, not for this task.
- **Filed 2026-09-07 by a spawned `fkit-producer`**, on an owner ruling relayed through the spawning
  session. The producer had **no owner channel** — the Priority above is the producer's rank.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — `file:line` references only.
