# Async message-handler throws inside `Worker.worker.ts` never reach the main thread — a worker-internal `unhandledrejection` is logged and the game silently carries on

## ID
0251

> ℹ️ **ID allocation, checked 2026-09-13 before filing. `0251` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0251-*/` — no matches (highest ID on disk across all three boards was
> `0250`). **2.** `grep -rn "^0251$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.** ⭐
> `grep -rn "0251" .claude/` — **zero hits**. **4.** repo-wide (`node_modules`, `.git`, `static`
> excluded, `.svg` filtered) — zero prose hits. Duplicate-ID check (`sort | uniq -d` over folder
> prefixes) — empty.

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity; a decorated value is reported as drift. **Do not decorate it.**

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-13, given live in the lead session (0232 plan question Q5)
and relayed through the spawning `/fkit-sprint-ship-loop` session — ⛔ NOT Sprint 4.** The owner ruled
**that a follow-up brief for F2 be filed** at 0232's close; **no sprint was named**, so it files here.
⛔ **They did NOT rule what it is worth or when it is worked** — see *Priority*.

## Priority
Unscheduled *(Backlog board is unranked by design)*

📌 **Producer's rank: Medium.** ⛔ **This is the PRODUCER's rank, not the owner's** — the owner ruled
that the task be filed, not what it is worth. **Medium and not High** because, unlike
[`0232`](../../done/0232-worker-tick-error-never-reaches-main-thread/brief.md), the game does **not**
freeze on this path — it was observed to *continue* — and because nobody has seen it fire outside a
forced throw. **Medium and not Low** because it is the **last known dark error path** in the worker,
and because the reasoned consequences (a dropped turn ⇒ silent simulation divergence; a request
promise that never settles) are exactly the kind that surface later as an unexplained desync or a
hung UI with nothing in the log. 🔴 **Both consequences are REASONED FROM CODE, not observed** — only
the *dropping* has been observed.

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ **`fkit-coder`, with a design gate.** Step 2 below is a policy decision per handler (crash the game
vs. report-and-continue). It is technical enough for the coder to *propose*, but **the player-visible
half — whether a lost turn or a hung request ends the game with a modal — is the owner's call**, and the
plan must put it to the owner before step 3 is built.

## Context

**Filed 2026-09-13 at the close of
[`0232`](../../done/0232-worker-tick-error-never-reaches-main-thread/brief.md), on an owner ruling.** 0232
made a **game-tick fault** reach the main thread (`game_error` message, modal, `stop()`,
`onGameEnd()`), and made a **post-init uncaught worker throw** reach it too (`WorkerClient.ts:37-44`).
This brief is the **one path 0232 deliberately left dark** — its residual **F2**.

📌 **FRAME DECLARATION — every `file:line` below is against the working tree at `fd2c88e` on `dev` plus
0232's uncommitted `src/core/` changes, read 2026-09-13.** ⚠️ 0232 is **not committed** at filing time;
`Worker.worker.ts` lines will move if anything lands above them. **Re-verify before relying on any of
them.**

### The mechanism — CODE FACTS, each read this turn

1. **The worker's `message` listener is `async`.** `src/core/worker/Worker.worker.ts:34` —
   `ctx.addEventListener("message", async (e) => { … switch (message.type) { … } })`. ⇒ **any `throw`
   inside the listener is a *rejected promise*, not an exception.** Per the HTML spec an event
   listener's returned promise is ignored, so the rejection surfaces only as an `unhandledrejection`
   event **inside the worker** — it does **not** become the parent `Worker`'s `error` event.
2. **Six `case` handlers deliberately re-throw after logging.** Each wraps its work in
   `try { … } catch (error) { console.error(…); throw error; }`: `"init"` (`:41-59`, rethrow `:57`),
   `"turn"` (`:61-73`, `:71`), `"player_actions"` (`:75-95`, `:93`), `"player_profile"` (`:96-112`,
   `:110`), `"player_border_tiles"` (`:113-131`, `:129`), `"attack_average_position"` (`:132-152`,
   `:150`). Each of the five request handlers also throws `"Game runner not initialized"` before its
   `try` when `gameRunner` is unset (`:62`, `:76`, `:97`, `:114`, `:133`; `"transport_ship_spawn"`
   `:154` too). ⚠️ The spawn hand-off cited these as `~:58,:72,:94,:111,:130,:151`; the working tree
   reads one line lower on each — same six sites.
3. **A seventh handler swallows instead.** `"transport_ship_spawn"` (`:153-171`) catches, logs
   `Failed to spawn transport ship:` and does **not** rethrow — and does not send a result either. It
   is dark by a different route (no rejection at all), with the same main-thread consequence as fact 5.
4. **The worker's own `unhandledrejection` listener only logs.** `Worker.worker.ts:182-184` —
   `console.error("Unhandled promise rejection in worker:", event)`. **This is the natural bridge
   point**, and today it posts nothing.
5. **Every request promise on the main thread settles ONLY on a matching `*_result` message.**
   `src/core/worker/WorkerClient.ts:130-277` — `playerProfile`, `playerBorderTiles`,
   `playerInteraction`, `attackAveragePosition`, `transportShipSpawn` each register a handler keyed by
   `messageId` and call `resolve(...)` from it; **`reject` is used only for the pre-`initialize()`
   guard.** ⇒ **reasoned, not observed:** a throw in a request handler leaves the caller's promise
   **pending forever** and its `messageHandlers` entry alive until `cleanup()`. Which UI awaits those
   promises — and what a never-settling one does to it — is **unknown and part of step 1**.
6. **A throw inside `"turn"` drops the turn.** `:66-68` — `await gr.addTurn(message.turn)`; on a
   throw the turn is never queued. ⇒ **reasoned, not observed:** this client's simulation silently
   falls one turn behind every other client's, which the 10-tick hash vote should later report as a
   desync **on this client**, with nothing in the log pointing at the real cause.
7. **`"heartbeat"` is the one handler with no `try` at all** (`:38-40`,
   `(await gameRunner)?.executeNextTick()`). `executeNextTick()` has its own `try/catch`
   (`GameRunner.ts:181-197`, the 0232 path), so a tick fault does not come here — **but if the
   `gameRunner` promise itself rejected (an async failure inside `createGameRunner`, which `"init"`'s
   `try` cannot catch because it only sees synchronous throws), every ~60 Hz heartbeat would produce a
   fresh `unhandledrejection`.** ⚠️ **Reasoned only. Confirm or refute in step 1.** (`WorkerClient`'s
   5 s init timeout, `:96-102`, covers the *init* half of this — the heartbeat storm after it is the
   open part.)

### What was OBSERVED — by 0232, in a real browser, before AND after its fix

From 0232's worklog, step 1.2 (T-c) and step 4.6: a temporary `throw` after `addTurn` when
`turnNumber === 150` produced, **in the worker console only**, `Failed to process turn: Error: …` then
`Unhandled promise rejection in worker: PromiseRejectionEvent`. **On the main thread: nothing** — no
`error` event on the `Worker`, no window error, no modal. **The game carried on** (turns 301, updates
300 in that run). Same in singleplayer and in the dev multiplayer lobby. **Unchanged by 0232's fix** —
0232's `game_error` bridge covers the `gameUpdate` callback and the parent `error` event, neither of
which this path touches.

🔴 **That is the whole observed record: the rejection is dark. Facts 5–7's consequences have NOT been
watched.** ⛔ **No frequency, severity or player-impact figure may be written anywhere until
observed.** Nobody has seen a real (non-forced) handler throw in this codebase.

### Why 0232 did not just fix it — the design call this task owns

0232's coder wrote (worklog, "F2 follow-up note for the producer"): *"A fix needs a worker-side bridge
(e.g. the worker's `unhandledrejection` listener posting a `game_error`), which is a separate design
call — `"turn"` failures in particular may be recoverable, so 'crash the game' is not obviously the
right response there."* ⚠️ Fact 6 above cuts against "recoverable": a dropped turn is a divergence, not
a hiccup. **That is an argument, not a finding — step 2 settles it, and it is put to the owner.**

### Where this sits

| Path out of the worker | Bridged? | By |
|---|---|---|
| `GameRunner` tick fault → `ErrorUpdate` | ✅ `game_error` message | [`0232`](../../done/0232-worker-tick-error-never-reaches-main-thread/brief.md) |
| Uncaught **sync** worker throw → parent `Worker` `error` event | ✅ `WorkerClient.ts:37-44` | 0232 (D4) |
| `async` handler throw → worker-internal `unhandledrejection` | ❌ **logged only** | **this task** |
| `"transport_ship_spawn"` swallowed catch | ❌ **no signal at all** | **this task** |

## What to build

A worker-side bridge so that a rejected message-handler promise is **reported to the main thread**
and handled by a **decided** per-handler policy — instead of being logged inside the worker and lost.

### Work plan — in this order

1. 🔴 **OBSERVE THE CONSEQUENCES FIRST, in a real browser.** 0232 observed only that the rejection is
   dark. Force a throw in **each** of: `"turn"`, one request handler (say `"player_profile"`), and
   `"transport_ship_spawn"`, and record — observed, separately from reasoned:
   - `"turn"`: does this client desync later, and what does the player see when it does?
   - request handler: which UI awaited the promise, and what does it do while it never settles?
   - `"transport_ship_spawn"`: same, for the swallowed path.
   - fact 7: make `createGameRunner` reject and watch whether heartbeats storm `unhandledrejection`.
   ⚠️ Temporary throws only — **none may be committed** (0232's `TEMP-` tag discipline is the model).
2. **Decide the per-handler policy and put it to the owner before building.** For each of the seven
   handlers: **crash** (post `game_error` → modal + `stop()`, the 0232 path), **report-and-continue**
   (post a new non-fatal message the main thread logs/telemetries and, for requests, uses to
   **reject** the pending promise), or **leave as is, with a written reason**. Write the decision down
   in the plan. ⚠️ The player-visible half is the owner's; the coder proposes.
3. **Build the bridge.** The obvious seat is the worker's existing `unhandledrejection` listener
   (`Worker.worker.ts:182-184`) — ⚠️ but note it cannot know *which* message rejected, so a
   per-handler policy likely needs the rejection tagged at the `catch` sites (or `id`-carrying error
   results for requests). Decide deliberately; write the reason down. **Request promises must be able
   to reject** (fact 5) if the policy for any request handler is anything other than "crash".
4. **Tests.** `src/core/` — the rule applies in full. At minimum, per handler in scope: a test that a
   throw inside the handler produces the decided message on the wire, and (for requests) that the
   main-thread promise **rejects** instead of pending. 0232's `tests/core/worker/WorkerWorker.test.ts`
   already loads the real `Worker.worker.ts` under jest via a stubbed `globalThis.self` — extend it.
5. **Verify in a real browser**, same instrument as step 1, that each forced throw now produces the
   decided behaviour, and that a **clean** game (singleplayer and dev lobby) still plays end to end
   with no spurious modal or rejection.

### 🔒 Constraints

- ⛔ **Do not commit the temporary throws** used in steps 1 and 5.
- ⛔ **Do not write a frequency, severity or player-impact figure that has not been observed.**
- ⛔ **Do not edit 0232's task folder** — it is closed; cite it.
- **All code changes in `src/core/` MUST be tested** (`CLAUDE.md`).
- **Never commit or push unless the owner explicitly asks.**

## Verification steps

1. **Step 1's observations are written down**, one per forced path, observed in a browser, before any
   fix — including fact 7's heartbeat question, confirmed or refuted.
2. **The per-handler policy table exists**, with a reason per row, and the owner's decision on the
   player-visible half is recorded (or the open question is returned, if the owner was absent).
3. **A forced throw in each in-scope handler produces the decided behaviour**, observed in a browser
   — a modal + teardown where "crash" was chosen; a logged/telemetried report **and a rejected
   promise** where "report-and-continue" was chosen.
4. **No request promise is left pending forever** on a handler throw — proven by a jest test that
   fails on today's code.
5. **`npm test` green; `npm run lint` clean; `npx tsc --noEmit` clean.** ⚠️ `npm test` takes ~22–25 s
   (shell harnesses) — expected, not a hang.
6. **A normal game still plays end to end** in a real browser — singleplayer and dev lobby — with no
   spurious modal and zero `unhandledrejection` lines in the worker console.

## Notes

- **Depends on:** [`0232`](../../done/0232-worker-tick-error-never-reaches-main-thread/brief.md) — ✅
  closed 2026-09-13 `(agent-closed — not owner-verified)`; **its `src/core/` changes are uncommitted at
  filing time.** This task builds on its `game_error` message type and its `WorkerWorker.test.ts`
  harness; start only after 0232 has landed in git, or the diff will collide in all four worker files.
- **Blocks:** nothing.
- **Related, not dependent:**
  [`0231`](../../done/0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md) (what the crash path does
  *after* `stop()` — the reconnect-as-ghost observation 0232 handed it) and
  [`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md) (the
  desync/server-error modal sites — relevant if a `"turn"` throw is routed to the existing desync
  surface instead of a new one).
- 🚨 **F4 — the crash modal's UX (non-closable, "paste into Discord", may cover the exit button on a
  small viewport) — was explicitly NOT filed by owner ruling 2026-09-13** and lives only in 0232's
  worklog. If step 2 chooses "crash" for more handlers, that UX gets more traffic; **raise it, do not
  file it here.**
- **Evidence provenance:** the dark path was found and observed by 0232's coder (worklog steps 1.2
  and 4.6, tag T-c); every `file:line` above was read this turn by the filing producer against the
  working tree at `fd2c88e` + 0232's uncommitted changes.
- **Filed 2026-09-13 by a spawned `fkit-producer`**, on an owner ruling relayed through the
  `/fkit-sprint-ship-loop` session. The producer had **no owner channel** — the Priority above is the
  producer's rank, not an owner ruling.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — `file:line` references only.
