# A double `onJoin` inside the async `createClientGame` window constructs a SECOND `ClientGameRunner` — F3's root cause

## ID
0229

## Sprint
Backlog

**Filed 2026-09-07 by a spawned `fkit-producer`, on an owner ruling given live in session:
F3's root cause gets its own task.**

⚠️ **The owner ruled THAT IT GETS A TASK. The owner did NOT rule the board or the rank** — both cells
below are the **producer's** call, stated as the producer's. See *Board placement* in `## Notes`.

⚠️ **This row is APPENDED at the bottom of the Backlog board, and its position does NOT express its
rank.** fkit's **ADR-035** bars inserting a new row above a board's closed rows, so appending is the
only mechanically permitted placement. **Bottom row = board mechanics, not ranking.**

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs living in the fkit install share. This project's `ai-agents/knowledge-base/decisions/` holds only
the `adr-1XX` series, so a relative link would not resolve.*

## Priority
Unscheduled

**Producer's rank, stated as the producer's: `Medium`** — the same rank class as its two siblings
[`0227`](../0227-crashed-game-leaves-performancemonitor-running/brief.md) and
[`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md), and **below** them in one specific
sense: those two have **confirmed mechanisms**, and this one has an **unproven reachability** whose
first phase may well end in *close it*. **This board is unranked by design**, so the Priority cell
reads `—`; the ranking above exists only so the owner can act on it in one edit if they pull this
into a sprint.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
**Nothing — startable immediately.** No server contact, no deploy, no DB.

⚠️ **Not blocking, but read first:**
[`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) is closed and its
`src/client/Main.ts` change **is UNCOMMITTED in the working tree as of filing** — so `Main.ts` line
numbers **will shift**. Every reference below is to `ClientGameRunner.ts` and `Transport.ts`, both of
which `0225` did **not** touch, and all were re-verified at `HEAD` = `35afc64` while writing this
brief. **Re-verify them yourself anyway; do not trust this list.**

---

## Context

### 🚨 What this task is, in one sentence

[`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) **contained F3's
*monitor* consequence. The CAUSE is untouched: a double `onJoin` still constructs a SECOND
`ClientGameRunner`.**

### The mechanism — code-read, verified at `HEAD` = `35afc64`

1. **`ClientGameRunner.ts:190-216`** — on a `"start"` message from the server, `onJoin()` runs at
   **`:204`**, and only then does `createClientGame(...)` begin at **`:207`**. That call resolves
   **asynchronously** (terrain load, worker init), so there is a real window between the two.
2. **The runner replaces the transport's handlers only at `:689`** — `this.transport.connect(onconnect,
   onmessage)`, at the end of `ClientGameRunner.start()`, which cannot run until `createClientGame`
   has resolved.
3. **In that window, `joinLobby`'s own `onmessage` (installed at `:229`) is still the live handler.**
4. **`Transport.ts:361-374`** — the socket's `onclose` reconnects on any close code other than `1000`
   or `1002` (`:370-372`), via `reconnect()` → `connect(this.onconnect, this.onmessage)`
   (`:377-378`), which **reuses the handlers currently installed**.
5. `onconnect` re-sends `transport.joinGame(0)` (`ClientGameRunner.ts:122-125`), the server re-delivers
   `"start"`, and `joinLobby`'s `onmessage` runs the `"start"` branch **again** — so `onJoin()` fires a
   second time **and a second `createClientGame(...)` is started.**

⇒ **Two `ClientGameRunner` instances, each with its own worker, its own transport wiring and its own
render chain.**

### 🚨 1. Why this is worth a task — and why `0225` made it LESS visible, not less real

**Two concurrent `ClientGameRunner`s is a heavier failure than two monitors.** A duplicate runner
brings a duplicate simulation **worker**, duplicate transport handlers and a duplicate render chain —
a different order of cost from a leaked `setInterval`.

🔴 **And here is the part that must not be lost: `0225`'s containment means it no longer shows up in
analytics.** `0225` routed the monitor start through `restartPerformanceMonitor()`
(`Main.ts:757`), which stops any predecessor before starting the new one. So a second `onJoin` now
produces **one** monitor where it used to produce two — **the `Performance:*` symptom is gone.**

⛔ **That makes this defect LESS LIKELY TO BE NOTICED, NOT LESS REAL.** The observable signal that
would have surfaced it in production has been suppressed by a fix that deliberately did not address
the cause. **That is the reason this is worth a task rather than a footnote**, and any artifact for
this task that describes `0225` as having fixed the race is **wrong**.

### ⚠️ 2. Reachability is UNPROVEN — and this brief does NOT assert the race occurs

🚨 **NEITHER REVIEWER REPRODUCED IT. It is code-read only.** `0225`'s worklog and its review both say
so explicitly and independently: the mechanism is confirmed **by reading the code**, from two passes;
the containment at `:757` is confirmed **by construction** (the restart helper is fully synchronous —
stop then start, no `await`, no yield point — so `onJoin` cannot re-fire mid-restart). Neither
reviewer observed the race itself.

**Firing it requires a forced socket drop inside a sub-second window** — between `onJoin()` at `:204`
and the handler swap at `:689`.

✅ **PHASE 1 OF THIS TASK IS ESTABLISHING WHETHER IT FIRES IN PRACTICE — NOTHING MORE.**

🟢 **"Unreachable → close it" is a legitimate and welcome outcome.** A findings report that says *the
window cannot be hit, here is what I tried and why it cannot* is a **successful** completion of this
task, not a failure. Do not treat closing it as a bad result, and do not reach for a fix to justify
the task.

### ⚠️ 3. One partial refutation is on record and MUST be carried

🔴 **`0225`'s reviewer PARTLY REJECTED a broader version of this claim, and a brief that overstates the
window is wrong on the record.**

The rejected claim: *"the pre-diff code leaked a monitor per WebSocket reconnect."* The reviewer's
refutation, verified against source:

> The runner's **own** `onmessage` (`ClientGameRunner.ts:655-692`) handles `desync`, `error` and
> `turn` — **but NOT `start`.** So after the handler swap at `:689`, a reconnect **cannot** re-fire
> `onJoin()`.

⇒ **ONLY THE PRE-SWAP WINDOW IS LIVE.** A reconnect at any point after `ClientGameRunner.start()` has
installed its own handlers is **harmless** for this defect.

⛔ **Do not write, and do not let any plan, worklog or review for this task write, that a reconnect
leaks a runner "per reconnect" or "for the life of the session."** The exposure is confined to
reconnects landing inside the `createClientGame` window, and that confinement is a **finding on the
record**, not a caveat to soften.

📎 *A line-number note, so nobody thinks they have found a discrepancy: `0225`'s review cites the swap
as `:693` and the runner's `onmessage` as `:655-692`. Re-measured at `HEAD` = `35afc64` for this
brief, the swap is at **`:689`** and `onmessage` closes at `:688`. **The reasoning is unaffected** —
only the four-line offset differs. **Re-measure yourself.***

---

## What to build

### 🚨 PHASE 1 — reachability. This is the whole of the task as filed.

**Establish whether the double `onJoin` can actually happen.** Report findings; do not fix anything
yet.

Suggested lines of attack — **derive your own, do not treat this as a checklist:**

- **Force the drop.** The window opens at `ClientGameRunner.ts:204` and closes at `:689`. Find a way
  to close the socket inside it with a code that is neither `1000` nor `1002` (the two `Transport.ts`
  does **not** reconnect on). Killing the dev server worker, a devtools network condition, or a
  temporary forced `socket.close(<code>)` behind throwaway instrumentation are all fair.
- **Widen the window deliberately, and say that you did.** `createClientGame` resolves after terrain
  load and worker init; a temporary artificial delay inside that path turns a sub-second race into an
  observable one. 🚨 **If you widen the window, the finding is "reachable WITH AN ARTIFICIALLY WIDENED
  WINDOW" — which is WEAKER evidence than a natural reproduction and must be written up as such, never
  as a plain "reproduced".**
- **Instrument, don't guess.** A temporary counter logged at `:204` (`onJoin` entry) and at `:207`
  (`createClientGame` entry) tells you directly whether either ran twice.
- **Check whether the server can even re-deliver `"start"`** to a reconnecting client for a game
  already in progress. If it cannot, the race is unreachable **from the server side** and that is the
  cleanest possible finding — it closes the task on evidence.

**Phase 1's deliverable is a findings report**, written into this task folder's `worklog.md`, stating
plainly: **reachable / not reachable / could not determine**, what was tried, and — if reachable —
whether it was natural or window-widened.

### PHASE 2 — a fix, and ONLY if phase 1 says reachable

⛔ **DO NOT DESIGN OR WRITE THE FIX BEFORE PHASE 1'S FINDINGS EXIST.** If phase 1 shows the race
fires, **stop and hand the findings back to the producer**, who will scope the fix as its own brief
with the owner. That is the investigation-first rule, and it applies here precisely because the shape
of a correct fix depends on *how* the race turns out to be reachable.

Recorded only so the phase-1 investigator knows what to look at while they are in the file — **not as
a pre-approved direction:** the natural candidates are a re-entry guard on the `"start"` branch (has
`onJoin` already fired for this game?), swapping the transport handlers earlier, or not re-sending
`joinGame` on a reconnect that lands mid-construction. **Each has a different failure mode, and
choosing between them without findings is exactly the mistake this brief is structured to prevent.**

### Rules that bind regardless

- ⛔ **No analytics event is to be added, renamed or removed by this task.** If that changes,
  `CLAUDE.md` binds: event strings **only** via the `flashistConstants.analyticEvents` enum key, never
  inline, and `ai-agents/knowledge-base/analytics-event-reference.md` **must** be updated. If the
  outcome is "no event change", **record that explicitly** — do not leave it unstated.
- 🚨 **ALL TEMPORARY INSTRUMENTATION MUST BE REVERTED**, and the worklog must say so and show it. A
  widened `createClientGame` window or a forced `socket.close` left in the tree would be a severe
  regression.
- ⛔ **Do not re-fix `0225`'s monitor path** (`Main.ts:678`, `:757`) — that task owns it and is closed.
  **Do not touch `0227`'s teardown seam or `0228`'s `gameStop` race** — those tasks own theirs.
- 🔒 **No secrets in any artifact.** `file:line` references only; never print, quote or record the
  GameAnalytics keys (hardcoded in `src/client/flashist/FlashistFacade.ts`), nor any dashboard ID or
  URL.

---

## Verification steps

🚨 **HONEST VERIFICATION STANCE — THE SAME AS THIS TASK'S TWO SIBLINGS. READ IT BEFORE WRITING A TEST.**

- **There is no relevant test today**, and none is trivially addable — `ClientGameRunner` reaches for
  a Web Worker, the transport, the DOM and the terrain loader.
- **`CLAUDE.md` mandates tests for `src/core/` only.** Every file here is `src/client/`. **This task
  is not required to add a test.**
- ⛔ **DO NOT INVENT A TEST THAT ONLY PROVES A GUARD WAS ADDED.** A unit test asserting "the second
  `onJoin` was rejected" restates the diff and proves nothing about the race. A coder in this chain
  made exactly that call on `0225` and it was the right one.

### What IS genuinely checkable

**Phase 1 (the task as filed) is verified by its own findings report.** Its acceptance is honesty and
completeness, not a green signal:

1. The report states **reachable / not reachable / could not determine** in those words.
2. It lists what was tried and what each attempt showed — **including the attempts that failed to
   provoke it**, which are the evidence for an "unreachable" verdict.
3. If reachable, it states whether the reproduction was **natural** or used an **artificially widened
   window**, and does not present the second as the first.
4. All temporary instrumentation is reverted, and the report shows the tree is clean of it.
5. No analytics event added, renamed or removed — **recorded explicitly** either way.

### Baseline checks

- `npm test` green and `npm run lint` clean.
  ⚠️ **State plainly in the worklog that the suite covers NONE of this** — a green run is a
  no-regression signal only, never evidence about the race.
- ⚠️ If a `supertest` suite flakes, apply `CLAUDE.md`'s known-flake procedure: rule out the `0197`
  `SIGSEGV` / `ClearStaleLeftTrimmedPointerVisitor` signature **first**, then re-run **and say that
  you re-ran**. Unrelated to this change.

### Acceptance criteria

1. Phase 1's findings report exists in this folder's `worklog.md` and meets all five points above.
2. **If NOT reachable** → the task is complete. Hand back to the producer to close, with the finding
   recorded. **This is a success.**
3. **If reachable** → **STOP.** Hand the findings back to the producer for phase-2 scoping. **Do not
   implement a fix under this brief.**
4. The tree contains no leftover instrumentation, and `npm test` / `npm run lint` are green and clean
   with the coverage caveat stated.

---

## Notes

- **Depends on:** nothing
- **Blocks:** nothing

### Cross-references — the same audit produced all four

- **[`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md)** — **the
  containment.** ✅ Closed 2026-09-07 as `Done (agent-closed — not owner-verified)`. It fixed F3's
  *monitor* consequence at `Main.ts:757` and **deliberately did not touch the cause**. ⛔ **Do not
  describe `0225` as having fixed this race**, and do not re-open it.
- **[`0227`](../0227-crashed-game-leaves-performancemonitor-running/brief.md)** — sibling. A crashed
  game stops the runner but never tells `Main`. Now **three** sites, after `0225`'s review corrected a
  wrong exclusion in its brief. **Overlaps this task's file** (`ClientGameRunner.ts`) but not its
  defect.
- **[`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md)** — sibling. The `gameStop` half of
  F4, reachability likewise unproven.
- ⚠️ **All three siblings are open and none blocks this one.** They touch overlapping files, so
  whoever picks two of them up in sequence will have the context loaded — a scheduling convenience,
  **not a dependency**.

### Board placement — the producer's call, stated as the producer's

**Filed on the Backlog board, not Sprint 4.** ⚠️ **The owner ruled that this gets a task; the board is
mine.**

**Reasoning.** The same-day precedent cuts both ways and I followed the half that fits:
[`0224`](../0224-gameanalytics-per-user-event-limit-exceeded/brief.md) and `0225` went to **Sprint 4**
because they were **time-sensitive** — an accumulating leak distorts a watch-period number the owner
was about to read. `0226`, ~~`0227`~~ and `0228` went to **Backlog** because they were real defects with
no clock on them. **This one has no clock at all** — and it is weaker than those three in one further
respect: **its reachability is unproven, and phase 1 may end in "close it."** Sprint 4 also carries a
**recorded capacity risk**. ⇒ Backlog.

> ⚠️ **Superseded in part (2026-09-07) — the `0227` half of this citation only.** `0227` was
> **promoted from Backlog to Sprint 4 on 2026-09-07 by owner ruling**, after its scope grew from
> **one** site to **three** (the crash path, worker-init, and site C at `ClientGameRunner.ts:215` — a
> `.then(…)` with no `.catch`). It is no longer a Backlog example. The `0226` and `0228` halves stand
> unchanged — `0228` was **separately and explicitly confirmed** by the owner as **Backlog /
> `Low–Medium`** on the same day, *after* being told its reachability is unproven. The reasoning above
> was sound when written; one of its inputs moved.
>
> 🚨 **This does NOT change this task's placement.** `0229` stays on **Backlog** — that placement is
> the producer's call, still unruled by the owner, and nothing here re-ranks it.
>
> **Why `0227` moved and this one does not:** `0227` was promoted because its **cost** grew (one site →
> three) while its **severity class stayed the same**; the owner promoted it knowing that. `0229` is
> weaker on a different axis — **reachability is unproven**, and phase 1 may end in "close it as
> unreachable." That is exactly why it stays on Backlog.

⚠️ **Tradeoff, stated:** a coder fresh off `0225`/`0227` has `ClientGameRunner.ts` and `Transport.ts`
loaded, so running this immediately would be **cheaper in context** than doing it cold later. That
saving is traded for keeping the owner's just-drawn scope line intact. 🟢 **Promoting it to Sprint 4
is a perfectly good owner call and costs nothing to switch.**

### Scope boundaries — what this task does NOT claim

- ⛔ **It does not claim the race occurs.** Reachability is the question, not the premise.
- ⛔ **It does not claim a reconnect leaks a runner per reconnect** — refuted on the record; only the
  pre-swap window is live. See §3 above.
- ⛔ **It does not fix, and must not be read as fixing,** `0227`'s teardown seam, `0228`'s `gameStop`
  race, `0224`'s analytics-volume work, the unexplained 3–4 Sep event-limit breach, or the
  `DEPLOY_ENV` fail-open default ([`0226`](../0226-deploy-env-fails-open-to-prod-analytics/brief.md)).
- ⚠️ **Magnitude is unmeasured and must stay unmeasured here.** How often a socket drops inside a
  sub-second window in production is unknown. **No figure may be written for it anywhere.**
- 🔒 Filenames, `file:line` references and counts only — no key values, dashboard IDs or URLs in any
  artifact for this task.
