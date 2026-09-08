# A crashed game stops the runner but never tells `Main` — the `PerformanceMonitor` keeps sampling for a dead game

## ID
0227

## Sprint
**Sprint 4** — [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md).

➡️ **PROMOTED FROM THE BACKLOG BOARD INTO SPRINT 4 ON 2026-09-07, on an owner ruling given live in
session.** The [Backlog board](../../../sprints/backlog.md) row is **kept as a pointer**, flipped to
`➡️ Moved to Sprint 4` — **not deleted, and not flipped to Done** (the `0201` precedent).

⚠️ **THE PROMOTION CHANGED THE BOARD PLACEMENT AND NOTHING ELSE.** The status below stays
`🔲 Backlog`, this folder stays in `ai-agents/tasks/backlog/` (only `/fkit-task-done` /
`/fkit-task-cancelled` move folders), nobody has started it, and **rank was NOT ruled** — the
`Medium` below is still the **producer's**.

> 🔴 **SUPERSEDED BY THE CLOSE (2026-09-07) — the sentence above was true when written, on the day this task was PROMOTED, and is kept rather than deleted.** ⛔ **It is now FALSE as a statement of current state:** this task's `## Status` reads **`✅ Done (agent-closed — not owner-verified)`** and this folder sits in **`ai-agents/tasks/done/`**, moved by `/fkit-task-done`. **Read the `## Status` field, not this line.** The line describes the *promotion*, which genuinely changed board placement only; the *close* came later and changed both. Flagged by the wiki sync and corrected by the producer, 2026-09-07.


🔴 **THIS REVERSES THE OWNER'S OWN EARLIER RULING OF THE SAME DAY, AND THAT IS DELIBERATE.** Earlier on
2026-09-07 the owner **confirmed `Backlog`** for this task — when the brief covered **one** site. It now
covers **three** (A, B and C; see *CORRECTION (2026-09-07)* below). ⛔ **The earlier confirmation was
NOT a mistake and is not being corrected — the input changed.**

🚨 **THE SEVERITY CLASS DID NOT CHANGE, AND THE OWNER RULED WITH THAT CAVEAT IN FRONT OF THEM.** The
lead put the changed cost back to the owner explicitly, stating that all three sites remain **bounded
and non-accumulating — still not a leak** — and that more sites means **more work, not more urgency**.
**The owner promoted it anyway.** ⚠️ **Record this as an OWNER JUDGEMENT, not a producer re-rank.**

📌 **The original owner ruling of 2026-09-07 stands unchanged and is recorded here in full:** **this
defect ("F2") gets its own brief, filed now while the audit is fresh**, and it is **out of scope for
[`0225`](../0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md)**, which ships without
it. That ruling covered the brief, not the board; the board came later, above. The superseded
Backlog reasoning is kept, marked, in *Board placement — the producer's reasoning* near the end.

⚠️ **This task's Sprint 4 row is APPENDED at the BOTTOM of that board, and its position does NOT
express its rank.** fkit's **ADR-035** bars inserting a new row above a board's closed rows, so
appending is the only mechanically permitted placement. **Bottom row = board mechanics, not ranking.**
The same was true of the Backlog row it was promoted from.

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs living in the fkit install share. This project's `ai-agents/knowledge-base/decisions/` holds only
the `adr-1XX` series, so a relative link would not resolve.*

## Priority
**Medium *(producer's rank — NOT an owner ruling)*.** Ranked **below**
[`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md) *(Medium–High)* and well below
[`0225`](../0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) *(High)*. The rank is driven
by **how the defect behaves, not by how easy it is**: it is **bounded, non-accumulating, and needs a
worker crash to fire at all**, so unlike `0225` it does not decay in value against the owner's
analytics watch period, and unlike `0226` it is not a risk that every build carries.

📌 **UNCHANGED BY THE 2026-09-07 PROMOTION TO SPRINT 4.** The owner ruled **scheduling** (which board),
**not rank** — the same distinction already recorded on `0201`, `0224`, `0225`, `0226`, `0228` and
`0229`. On the Sprint 4 board this sits **below [`0224`](../0224-gameanalytics-per-user-event-limit-exceeded/brief.md)**,
which carries the owner-ruled `🔴 NEXT IN WORK ORDER` marker, and **below `0225`'s `High`**. ⚠️ **The
scope growing from one site to three raised the COST, not the urgency** — do not read the promotion as
a rank increase.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Depends on
**Nothing — startable immediately.** No server contact, no deploy needed to make the change, no DB.

**Related, not blocking:**

- **`0225`** — this defect was found while auditing `0225` and is recorded there as a residual. `0225`
  fixes the *lobby-rejoin* hole in `Main.ts`; this fixes the *crash* hole, which is a different
  direction of the same missing wiring. ⚠️ **`0225`'s `Main.ts` change is UNCOMMITTED, in the working
  tree, as of writing** (`git status` shows `M src/client/Main.ts` against `HEAD` = `35afc64`). If
  `0225` lands first, `Main.ts` line numbers below will shift — **re-verify, do not trust them.**
- **[`0224`](../0224-gameanalytics-per-user-event-limit-exceeded/brief.md)** — the analytics-volume
  context. See *Relationship to `0224`* below, which says plainly what this does **not** fix.

---

## Context

### 🚨 What this is NOT — read this first, it is the reason the defect was deprioritised

🔴 **THIS IS NOT AN ORPHANED MONITOR AND IT IS NOT A LEAK. THE DISTINCTION IS THE WHOLE REASON THE
OWNER LET `0225` SHIP WITHOUT IT.**

- The monitor's stop handle, `Main.perfMonitorStop`, is **still reachable from `Main`**. Nothing
  overwrites it and nothing loses it.
- ⇒ Monitors **do not accumulate**. There is at most **one** dead game's monitor running at a time,
  and the player's **next leave-lobby or join-lobby stops it** through the paths that already work.
- **`0225`'s F1 was accumulating** — one permanently unstoppable monitor per mid-game lobby join, none
  of which could ever be stopped again. **This one is not.** The cost here is bounded: **extra
  `Performance:*` events for the span between a crash and the player's next navigation.**

⛔ **Do not let any artifact for this task inflate it into a leak.** If a worklog, a review, or a
close note describes this as "orphaned monitors" or "monitors accumulating", that description is
**wrong** and must be corrected — that language belongs to `0225`.

### The defect — verified three times on 2026-09-07, most recently for this brief

Found by a spawned `fkit-coder` while planning `0225`, re-verified twice since, and **re-verified line
by line for this brief against `HEAD` = `35afc64`**. ⚠️ **The implementer must still re-verify every
reference themselves** — `0225`'s `Main.ts` edit is sitting uncommitted in the working tree and will
move `Main.ts` line numbers.

**Mechanism:**

1. `src/client/ClientGameRunner.ts:487-501` — the game worker's callback. When the worker reports an
   `ErrorUpdate`, the runner shows the crash modal and stops itself:
   ```
   if ("errMsg" in gu) {
     showErrorModal(...);
     console.error(gu.stack);
     this.stop();
     return;
   }
   ```
   *(`this.stop()` is at `:499`.)*
2. `src/client/ClientGameRunner.ts:753-765` — `stop()` tears down **its own** things and only its own:
   background music, the catch-up overlay, the `isActive` flag, `this.worker.cleanup()`,
   `this.transport.leaveGame()`, and `clearInterval(this.connectionCheckInterval)`.
   🔴 **It never reaches `Main`.**
3. ⇒ Back in `Main`, **`perfMonitorStop` stays live and `gameStop` stays non-null.** The
   `PerformanceMonitor` **keeps its `setInterval` sampling and keeps emitting `Performance:*` events
   for a game that is already dead** — until the player leaves the lobby or joins another one.

⚠️ **This mechanism is SITE A of three.** Sites **B** (worker-init failure) and **C** (an un-`catch`ed
`createClientGame` rejection) reach the same end state by a different route and were **added to this
brief on 2026-09-07 by the correction below** — read it before planning the fix.

### 🔴 Why it cannot be fixed the way `0225` was: there is no seam

**A grep of `src/client/ClientGameRunner.ts` for `perfMonitor|onGameEnd|onTeardown|PerformanceMonitor`
returns NOTHING** *(re-run for this brief — zero matches)*. The runner has **no callback back to
`Main` at all** for teardown.

Verified at `src/client/ClientGameRunner.ts:107-112` — `joinLobby()`'s full signature carries exactly
two callbacks, and **both point forward**, into the game starting:

```
export function joinLobby(
  ...,
  onPrestart: () => void,
  onJoin: () => void,
): () => void
```

The single returned value is the **stopper `Main` holds as `gameStop`** — i.e. the wiring runs
`Main → runner` only. **There is nothing running `runner → Main`.**

⇒ **The fix requires ADDING A NEW SEAM** — a teardown/end callback from `ClientGameRunner` back to
`Main`, threaded through `joinLobby`'s parameter list and wired at `Main`'s `joinLobby(...)` call
site. **It is therefore NOT a one-liner and it touches two files.** That is exactly why it was
excluded from `0225`, whose scope is one file.

### Relationship to `0224` — and what this does NOT explain

This defect is a **small, bounded contributor** of `Performance:*` events for games that are already
dead. It is real, and it points the same direction as `0224`'s reduction work.

🚨 **IT DOES NOT EXPLAIN THE 3–4 SEP SPIKE AND IT DOES NOT CLOSE `0224`.** Stated flatly so no later
reader can infer otherwise:

- The 3–4 Sep breach was **session-start** events — `Player` (~34×), `Experiment` (~45×), `Session`,
  `Platform`, `Device`. **`Performance` barely moved across it** (115.65 → 185.54, ~1.6×). A defect in
  the `Performance` category **cannot** be that spike's cause.
- **The spike remains UNEXPLAINED.** Nobody has traced it, and this task does not attempt to.
- `0224`'s open items — the unset reduction target, the full event enumeration, the cardinality
  question (still open, still trending up), the `DEPLOY_ENV` fail-open default (now `0226`) — **all
  stay open exactly where `0224` records them.**
- ⚠️ **Magnitude here is NOT quantified and no figure may be invented for it.** Nobody has measured
  how often the worker crashes in production, nor how long a player sits on a crash modal before
  navigating. The contribution is **real in direction, unsized.**

### Paths already handled correctly (checked 2026-09-07 — a starting map, not a substitute for a sweep)

| Path | Where | Stops the monitor? |
|---|---|---|
| `beforeunload` | `Main.ts:247-254` | ✅ calls `stopPerformanceMonitor()` |
| `SendWinnerEvent` (game won/ended) | `Main.ts:273-277` | ✅ |
| `onHashUpdate` (popstate / hashchange) | `Main.ts:495-505` | ✅ indirectly, via `handleLeaveLobby()` |
| `handleLeaveLobby()` | `Main.ts:923-937` | ✅ stops **and** nulls `gameStop` |
| `handleJoinLobby()` join-over | `Main.ts:675-679` | ⚠️ **`0225`'s territory** — currently fixed in the uncommitted working tree |
| **worker `ErrorUpdate` → `ClientGameRunner.stop()`** | **`ClientGameRunner.ts:491-501` → `:753-765`** | ❌ **THIS TASK (site A)** |
| **worker-init failure → bare `return`** | **`ClientGameRunner.ts:289-306`** | ❌ **THIS TASK (site B — see correction below)** |
| **`createClientGame(...)` rejects — no `.catch`** | **`ClientGameRunner.ts:215`** | ❌ **THIS TASK (site C — see correction below)** |

### 🔴 CORRECTION (2026-09-07) — an exclusion in this brief was WRONG, and site B is in scope

🚨 **An earlier revision of this brief ruled the worker-init-failure site OUT of scope on the grounds
that it *"returns before the game ever starts."* THAT REASONING IS FALSE. It is recorded here rather
than quietly deleted, so the same mistake is not made again.**

**Who caught it:** Codex, during the adversarial review of
[`0225`](../0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md), independently confirmed by
the reviewer, and **re-verified line by line against `HEAD` = `35afc64` before this correction was
written**.

**Why it is false — the call ordering:**

| Line | What happens |
|---|---|
| `ClientGameRunner.ts:204` | `onJoin()` fires **first** |
| `Main.ts:757` | that callback runs `this.restartPerformanceMonitor()` — **the monitor is now live** |
| `ClientGameRunner.ts:207-215` | **only then** is `createClientGame(...)` called |
| `ClientGameRunner.ts:291` | `await worker.initialize()` throws |
| `ClientGameRunner.ts:296-304` | crash modal shown |
| `ClientGameRunner.ts:305` | **bare `return`** — no runner is ever constructed, nothing is stopped |

⇒ **Live monitor, no game, no teardown.** That is **exactly this task's defect**, at a site the brief
was telling the implementer to skip. The premise "returns before the game ever starts" confused *the
game* with *the monitor*: the game indeed never starts, but **the monitor was already started one
line earlier**, by `onJoin`.

**Site C — the same hole, found while re-checking site B.** `ClientGameRunner.ts:215` is
`.then((r) => r?.start())` with **no `.catch`**. `createClientGame` can reject at
`:245-247` (`throw new Error("missing gameStartInfo")`), from `getConfig` (`:248-252`), from
`await terrainLoad` (`:277`), or from `loadTerrainMap` (`:282-286`) — **all of them after `onJoin`
has already started the monitor**. This one is arguably worse than site B: it shows **no modal at
all**, so the player sees nothing and the monitor keeps sampling. ⚠️ Verify this yourself; it is
newly recorded and has not been reproduced.

**Still bounded — the "not a leak" framing above survives this correction.** At sites B and C
`Main.perfMonitorStop` remains reachable, so the next leave-lobby or join-lobby still stops it. The
correction widens *where* the defect occurs, **not** its severity class.

**✅ `0225` is UNAFFECTED — do not re-open it.** Pre-diff, `Main.ts:757` started the monitor at the
**same point** inside the same `onJoin` callback (`git diff src/client/Main.ts` shows only
`this.perfMonitorStop = startPerformanceMonitor();` → `this.restartPerformanceMonitor();`). The
ordering that makes sites B and C real is **pre-existing** and is neither caused nor worsened by
`0225`.

### The other `showErrorModal` sites — re-checked with the same lens

⚠️ **Re-checked 2026-09-07 against the `onJoin`-fires-first ordering, because that ordering is what
broke the site-B exclusion.** Conclusion: `:296` moves **into** scope (site B, above); the other three
stay out, but for a **sharper reason than before**.

| Site | What it is | In scope? |
|---|---|---|
| `:218` | lobby-level `error` message in `onmessage` | **No — with a caveat, below** |
| `:296` | worker-init failure | 🔴 **YES — site B** |
| `:653` | desync notice, inside the runner's message handler | **No** |
| `:664` | transport `error`, inside the runner's message handler | **No** |

**Why `:653` and `:664` stay out:** both live *inside* `ClientGameRunner`, so a runner exists and
`isActive` is still true — neither calls `this.stop()`. The monitor is running **and so is the
game**. That is a monitor matching its game, not a monitor outliving one. Not this defect.

**Why `:218` stays out, and the caveat that goes with it:** `:218` is in `joinLobby`'s own
`onmessage`. If the `error` arrives **before** the `start` message, `onJoin` has not run and no
monitor was started by this join — nothing to leak. If it arrives **after** `start`, the monitor is
live, but `:218` does not tear anything down and `createClientGame` continues to completion, so the
game does still arrive. ⚠️ **The caveat:** if that late `error` is followed by `createClientGame`
rejecting, the leftover state is **site C's**, not `:218`'s. Fixing C covers it. **`:218` needs no
change of its own.**

⚠️ **`showErrorModal`'s close button only calls `modal.remove()` (`ClientGameRunner.ts:1140-1142`)** —
it does **not** leave the lobby or stop anything. So a player who dismisses the site-B modal is left
on the game screen with a live monitor and no game, until they navigate. Relevant to how long site B
runs; not itself a separate defect.

---

## What to build

### Scope

**Add a teardown seam from `ClientGameRunner` to `Main`, and use it on all three sites**, so that when
a game dies — or never comes into existence — the monitor stops too.

The shape is the implementer's call, but the constraint is fixed: **`Main` must learn that the game
ended or never started.** Two files are in scope — `src/client/ClientGameRunner.ts` and
`src/client/Main.ts`.

🚨 **A seam wired ONLY into `ClientGameRunner.stop()` DOES NOT FIX SITES B AND C.** At both of those
no runner is ever constructed, so `stop()` never runs. This is the single most likely way to ship a
half-fix here. The seam must also fire:

- **Site B** — in the `catch` at `ClientGameRunner.ts:292-306`, before the `return` at `:305`.
- **Site C** — from a `.catch` on `ClientGameRunner.ts:215`, which today has none. The `undefined`
  return from site B also arrives here as `r === undefined`, so handling both at `:215` — e.g.
  `.then((r) => { if (r === undefined) { onGameEnd(); return; } r.start(); }).catch(...)` — may be the
  cheapest single place to cover B and C together. **Your call; state the reason.**
  ⚠️ Adding a `.catch` changes error behaviour: today those rejections surface as unhandled promise
  rejections. **Decide deliberately whether to log/report them, and say what you chose** — do not
  swallow an error silently as a side effect of stopping a monitor.

Things to weigh and then **state your choice with its reason**:

- **A new `onGameEnd` / `onTeardown` callback parameter on `joinLobby()`** (`ClientGameRunner.ts:107-112`),
  invoked from `stop()` (`:753-765`), wired at `Main`'s `joinLobby(...)` call site (`Main.ts:686`) to
  call `this.stopPerformanceMonitor()`. This is the obvious shape and matches the existing
  `onPrestart` / `onJoin` convention already in that signature.
- **Firing from `stop()` rather than from the crash branch specifically** — `stop()` is the one place
  every self-stop funnels through, so wiring it there covers future self-stop paths too. ⚠️ **But
  check re-entrancy:** `stop()` is also reachable from the stopper `Main` already holds
  (`gameStop`), and `Main.handleLeaveLobby()` calls `gameStop()` and *then* `stopPerformanceMonitor()`.
  A callback that fires in that case must be **idempotent and must not re-enter `Main`'s teardown**.
  `stop()`'s existing `if (!this.isActive) return;` guard (`:755`) is relevant — **read it before
  deciding where the call goes.**
- ⛔ **Do NOT also null or re-drive `Main.gameStop` from the runner** unless you can show it is safe.
  `gameStop` staying non-null after a crash is a **separate observation (F4, below)** and is **out of
  scope here.**

### Rules that bind regardless

- ⛔ **No event should be added, renamed, or removed by this task.** If that changes, `CLAUDE.md`
  binds: event strings only via the `flashistConstants.analyticEvents` enum key, **never inline**, and
  `ai-agents/knowledge-base/analytics-event-reference.md` **must** be updated for every event added,
  renamed, or removed. If the outcome is "no event change", **record that explicitly** — do not leave
  it unstated.
- Do **not** change the sampling interval, the event set, or anything else `0224` owns.
- Do **not** re-fix `0225`'s join-over path — that task owns it. If `0225` has not landed yet, expect
  a conflict in `Main.ts` and coordinate rather than duplicating the change.
- 🔒 **No secrets in any artifact.** The GameAnalytics Game key and Secret key are hardcoded in
  `src/client/flashist/FlashistFacade.ts` — **never print, quote, or record either value**, nor any
  dashboard ID or URL containing one. `file:line` references only.

---

## Verification steps

🚨 **BE HONEST ABOUT WHAT IS AND IS NOT VERIFIABLE HERE, AND READ THIS WHOLE SECTION BEFORE WRITING A
TEST. This is the same stance as `0225`.**

- **There is no test for `PerformanceMonitor` today.** None exists and none is trivially addable — the
  module reaches for `requestAnimationFrame`, `document`, `performance.memory`, and the analytics
  facade.
- **`CLAUDE.md` mandates tests for `src/core/` only.** Both files here are `src/client/`. **This task
  is not required to add a test.**
- ⛔ **DO NOT INVENT A TEST THAT ONLY PROVES A CALLBACK WAS ADDED.** A unit test asserting "the
  teardown callback was invoked" restates the diff and proves nothing about whether emission actually
  stops. A coder in this session made exactly that call on `0225` and it was the right one.

### What IS genuinely checkable — the dev-console observation

1. `npm run dev`, open the client with the dev console.
2. **Temporarily** lower `SAMPLE_INTERVAL_MS` in `src/client/PerformanceMonitor.ts` to a few seconds
   and add a **temporary** log line inside the sampling interval, so emission is visible as a tick.
   Both are throwaway instrumentation.
   🚨 **REVERT BOTH BEFORE YOU FINISH.** Leaving the shortened interval in would silently undo `0224`.
3. Join a lobby, let the game start, confirm the tick is running.
4. **Force or simulate a worker `ErrorUpdate`** so the crash modal appears and
   `ClientGameRunner.stop()` runs.
5. ✅ **PASS:** the tick **stops** at that moment. ❌ **FAIL (today's behaviour):** it keeps ticking
   until you leave or join another lobby.

### ⚠️ Step 4 may be the hard part — say so, do not assume it is easy

🚨 **PROVOKING A GENUINE WORKER CRASH MAY NOT BE STRAIGHTFORWARD, AND THIS BRIEF DOES NOT PRETEND
OTHERWISE.** The `ErrorUpdate` arrives from inside the Web Worker running the simulation; there is no
UI affordance that triggers one, and a real crash depends on a game-logic fault you cannot summon on
demand.

**If a genuine crash cannot be produced at reasonable cost, simulating the branch is acceptable** —
for example, temporarily forcing the `"errMsg" in gu` branch at `ClientGameRunner.ts:491`, or
temporarily throwing from inside the worker. 🚨 **Whatever you do, say EXACTLY what you did and
whether the crash was REAL or SIMULATED in the worklog.** A simulated branch still proves the seam
fires and the emission stops, which is the thing under test — **but it is weaker evidence than a real
crash and must not be written up as one.**

⛔ **If you cannot achieve even the simulated observation, say so plainly and do not close the task as
verified.** Report it as unverified and hand the question back rather than inflating what you checked.

### Baseline checks

- `npm test` green and `npm run lint` clean.
  ⚠️ **State plainly in the worklog that the suite does NOT cover this defect** — a green run here is a
  no-regression signal, **not** evidence the fix works. The only evidence for that is step 5.
- ⚠️ If a `supertest` suite flakes, apply `CLAUDE.md`'s known-flake procedure (rule out the `0197`
  segfault signature first, then re-run **and say that you re-ran**). Unrelated to this change.

### 🔴 CORRECTION (2026-09-07, round-1 review) — CRITERION 1 CANNOT BE MET FOR SITE A

**Written by the coder on an owner ruling after the round-1 review. Nothing below is deleted — the
acceptance criteria are left exactly as the producer wrote them, and this block says which of them
turned out to be unsatisfiable and why.**

🚨 **SITE A IS UNREACHABLE DEAD CODE. IT IS NOT FIXED BY THIS TASK AND CANNOT BE FROM THESE TWO FILES.**

Found by Codex in the round-1 adversarial review, missed by the reviewer's first pass, and re-verified
line by line by the coder:

- `src/core/worker/Worker.worker.ts:20-23` — the worker's `gameUpdate` opens with
  `if (!("updates" in gu)) { return; }`. An `ErrorUpdate` is `{errMsg, stack}` and has **no `updates`
  key**, so it is **dropped and never `postMessage`d**.
- The producer at `src/core/GameRunner.ts:170-183` is the **only** `ErrorUpdate` source in the repo
  (`grep -rn "errMsg" src/` → 4 hits total: producer, type, and the single consumer).
- ⇒ `src/client/ClientGameRunner.ts:517`'s `if ("errMsg" in gu)` **can never be true**; `this.stop()`
  never runs; `onGameEnd()` never fires for site A.

📌 **Numbering, so this block does not read as contradicting the brief above it:** this correction
quotes `ClientGameRunner.ts` in **working-tree numbering** (with 0227's diff applied), matching
`worklog.md` and `review.md`. **The rest of this brief uses `HEAD` (`702a8ea`) numbering** — the crash
branch is `:491-501` at HEAD and `:517-525` in the working tree. **Both are correct.**

**Consequences for this brief, stated plainly:**

- ⛔ **Acceptance criterion 1 cannot be met for site A**, and this task **must not be closed claiming
  it was.** Criteria 1 for **B** and **C** are met and observed.
- ⛔ **Acceptance criterion 2's site-A observation is void.** The coder's simulated run proved the
  callback fires **when the branch's statements are invoked directly** — it did **not** prove a real
  worker crash is handled, because a real worker crash never reaches the branch. The brief's step-4
  caveat about "provoking a genuine worker crash may not be straightforward" was correct in spirit but
  wrong in cause: **it is impossible, not merely hard.**
- ✅ **The `stop()` seam stays.** Owner ruling. It is **dormant-but-correct** and goes live the moment
  the worker drop is fixed. It is not dead weight and must not be removed.
- 🚨 **The root cause is worse than this brief describes.** A worker game-tick crash today gives **no
  modal, no teardown, and no error surface at all** — a **silently frozen game** with the monitor still
  sampling. That is a bigger defect than 0227. It lives in `src/core/` and **is being filed as its own
  task**; it is explicitly **not** fixed here.
- ⚠️ **R3 is a static proof only.** Nobody has forced a throw inside `game.executeNextTick()` and
  watched no modal appear. Do that when the follow-up task is picked up.

**Also corrected:** the *Paths already handled correctly* table above marks site A as "❌ **THIS TASK
(site A)**". Read that row as **"not fixable by this task — see this correction"**.

**One defect was introduced by the fix and has been repaired in the same round** — the `onGameEnd`
closure carried no game identity, so a superseded game's late teardown could stop the *current* game's
monitor. Fixed with a generation token in `Main.ts`. See `worklog.md` and `review.md` (R1).

**A fourth site of the same defect class was found and is NOT fixed here** by owner ruling: a mid-game
server `error` message (multi-tab kick) shows a closable modal and tears down nothing
(`ClientGameRunner.ts:689-698`). Being filed separately. See `review.md` (R2).

### Acceptance criteria

1. A teardown seam exists from `ClientGameRunner` to `Main`, and **all three sites** use it:
   **A** the crash path (`:491-501` → `:753-765`), **B** the worker-init `catch` (`:292-306`), and
   **C** the un-`catch`ed `createClientGame` rejection (`:215`). ⛔ **A fix that covers only A is a
   half-fix and must not be closed as done** — say explicitly in the worklog how B and C are covered.
2. The dev-console observation shows `Performance:*` emission **stopping** at the crash, with the
   worklog stating whether the crash was **real or simulated**. **Site B is the cheap one to observe**
   — throwing from `worker.initialize()` is far easier to force than a genuine worker crash, so use it
   as the primary observation if site A resists (see the step-4 caveat above).
3. Re-entrancy is addressed: the normal leave-lobby and join-lobby paths still work and do not
   double-stop or re-enter `Main`'s teardown. Say how you checked.
4. All temporary instrumentation is reverted — `SAMPLE_INTERVAL_MS` is back at `300 * 1000`.
5. No event added, renamed, or removed (or, if one was, `analytics-event-reference.md` updated) —
   **recorded explicitly either way.**
6. `npm test` green, `npm run lint` clean, with the coverage caveat stated.
7. The close note does **not** describe this as a leak or as orphaned monitors, and does **not** claim
   it explains the 3–4 Sep spike or closes `0224`.

---

## Board placement — the producer's reasoning

🔴 **SUPERSEDED 2026-09-07 — THE OWNER PROMOTED THIS TO SPRINT 4. The whole section below is kept,
struck-don't-delete, because the reasoning was SOUND WHEN WRITTEN and the owner CONFIRMED it earlier
the same day.** What changed is the input, not the argument: the brief went from **one** site to
**three** (sites B and C, added by the correction above), the lead put that changed cost back to the
owner **while stating that the severity class did NOT change** — bounded, non-accumulating, still not
a leak, more work rather than more urgency — and **the owner promoted it anyway**. ⚠️ **An owner
judgement, not a producer re-rank, and not a correction of the earlier ruling.** The `Medium` rank
below is **unchanged and still the producer's**. See the `## Sprint` section at the top for the
promotion record.

~~**Recommendation: the Backlog board, `Medium`.** The owner ruled the brief, not the board; this is my
call and I am naming it as mine.~~

~~**Why not Sprint 4:**~~

- **`0225` earned Sprint 4 on time-sensitivity, and this does not share it.** `0225` is on Sprint 4
  because an accumulating leak can make `0224`'s observed reduction look smaller than it should be
  during the owner's watch period — its value **decays** once that window starts. This defect is
  **bounded and needs a worker crash to fire**, so its contribution to the watched metric is small and
  it does not distort the measurement in a way worth racing.
- **It follows the owner's own precedent from today.** `0226` — likewise a real defect split out of
  the same analytics audit, likewise not time-critical — the owner sent to the **Backlog** board, not
  Sprint 4. This has the same shape.
- **Sprint 4 already carries a recorded capacity risk.** The plan's Notes flag all eight profile
  phases plus an open live-verification tail as an accepted overload. Adding a non-urgent two-file
  change to it makes that worse for no scheduling benefit.
- **It costs more than `0225` did.** A new seam across two files is a bigger change than the one-line
  `0225` fix — the reverse of the usual "it's tiny, just bundle it" argument.

**The tradeoff, stated honestly:** a coder who has just done `0225` has both files loaded and the
mechanism fresh, so doing this immediately after would be **cheaper in context than doing it cold
later**. I am trading that saving for keeping the owner's just-drawn scope line intact and not
re-widening Sprint 4. 🟢 **If the owner would rather capture the saving, promoting this to Sprint 4 and
running it straight after `0225` is a perfectly good call and costs nothing to switch** — that is the
owner's to make, not mine.

---

## Notes

### F4 — a separate observation from the same audit. NOT in this task's scope. **Now filed as `0228`.**

✅ **RESOLVED 2026-09-07 — the owner ruled, live, that F4 gets its own task.** It is now
**[`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md)** and no longer lives only in this
paragraph. The description below is kept for continuity; **`0228` is the authority.**

During the same audit a second, **unrelated** issue was recorded:

- `src/client/Main.ts:675-679` — `handleJoinLobby()` calls `this.gameStop()` but **does not null
  `this.gameStop`**.
- `Main.ts:680-703` — the method then **awaits three promises** (`getServerConfigFromClient()`,
  `fetchCosmetics()`, `FlashistFacade.instance.getYandexUniqueId()`) before reassigning
  `this.gameStop` at `:686`.
- ⇒ Two fast `join-lobby` events can **interleave** inside that await window.

🚨 **THIS IS PRE-EXISTING AND HAS NOTHING TO DO WITH THE `PerformanceMonitor`.** It is a re-entrancy
concern in lobby joining, not a monitor-lifecycle bug.

⛔ **DO NOT FOLD F4 INTO THIS TASK'S SCOPE.** It is mentioned, not assigned. This brief's implementer
should read it as *"do not accidentally make this worse"*, nothing more.

📌 **Producer's note, superseded:** an earlier revision said F4 was **not** filed as its own task and
carried it as an open question, because the owner's ruling at the time covered exactly one brief.
**The owner has since ruled that it gets one.** It is `0228`. ⚠️ **`0228` is filed with reachability
UNPROVEN** — nobody has demonstrated the interleaving actually occurs; establishing that is `0228`'s
first step, and "unreachable, closed" is a legitimate outcome there.

⚠️ **The monitor half of F4 is already fixed by `0225`** (its diff adds `this.stopPerformanceMonitor()`
at `Main.ts:678`). What `0228` carries is the **`gameStop` half only**. Do not describe `0225`'s work
as outstanding.

### Cross-references

- **[`0225`](../0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md)** — where this defect
  (F2) was found and is recorded as a residual. `0225` fixes the join-over hole in `Main.ts`; **this
  task fixes the crash hole and is the other half of the same missing wiring.** ⚠️ `0225`'s change is
  **uncommitted in the working tree** as of writing.
- **[`0224`](../0224-gameanalytics-per-user-event-limit-exceeded/brief.md)** — the analytics-volume
  context. `0224` deferred *"confirming the monitor's stop function runs on every teardown path"*;
  `0225` took up the join path and **this task takes up the crash path**. ⛔ Neither closes `0224`.
- **[`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md)** — the `DEPLOY_ENV` fail-open
  default, split out of the same audit onto the Backlog board by owner ruling. Unrelated mechanism,
  same investigation.

### Standing cautions

- **Bounded, not accumulating.** Repeated because it is the single most misreadable thing about this
  task. At most one dead game's monitor, ended by the next leave or join.
- **Magnitude unmeasured.** Worker-crash frequency in production is unknown. Do not put a figure on
  the event contribution anywhere.
- 🔒 Filenames, `file:line` references and counts only in this task's artifacts — no key or dashboard
  values anywhere.

---

## Open questions for the owner

1. ✅ **RESOLVED 2026-09-07 — ~~Should F4 be filed as its own task?~~** Owner ruled **yes**, live.
   Filed as **[`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md)** on the Backlog board.
2. ✅ **RESOLVED 2026-09-07 — ~~Board: confirm or overrule.~~ The owner ruled TWICE on the same day,
   and both rulings are recorded.** First they **confirmed `Backlog`** (the producer's recommendation),
   when the brief covered **one** site. After the correction above widened it to **three** sites, the
   lead put the changed cost back to them — **explicitly flagging that the severity class did NOT
   change**: all three remain bounded and non-accumulating, so more sites means **more work, not more
   urgency**. **The owner then ruled: promote to Sprint 4.** ⚠️ **The second ruling supersedes the
   first on the board question only; the first was correct for the input it had, and neither is
   deleted.** ⛔ **Rank was NOT ruled either time — `Medium` is still the producer's.** Nothing here is
   started: the status stays `🔲 Backlog` and this folder stays in `ai-agents/tasks/backlog/`.

> 🔴 **SUPERSEDED BY THE CLOSE (2026-09-07) — the sentence above was true when written, on the day this task was PROMOTED, and is kept rather than deleted.** ⛔ **It is now FALSE as a statement of current state:** this task's `## Status` reads **`✅ Done (agent-closed — not owner-verified)`** and this folder sits in **`ai-agents/tasks/done/`**, moved by `/fkit-task-done`. **Read the `## Status` field, not this line.** The line describes the *promotion*, which genuinely changed board placement only; the *close* came later and changed both. Flagged by the wiki sync and corrected by the producer, 2026-09-07.

