# A Crashed Game Stops the Runner but Never Tells `Main` — the `PerformanceMonitor` Keeps Sampling

**Source**: `ai-agents/tasks/done/0227-crashed-game-leaves-performancemonitor-running/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — task `0227`; promoted in from the Backlog board 2026-09-07, closed the same day

> 🚨 **CLOSED WITH ITS HEADLINE ACCEPTANCE CRITERION UNMET FOR SITE A. Site A was NOT fixed and CANNOT be fixed from these two files — it is unreachable dead code.**
>
> **`✅ Done (agent-closed — not owner-verified)`.** Three review rounds, three Codex passes.
>
> ⛔ **NOT DEPLOYED as of 2026-09-07** (commit `c910452`). Nothing here describes production behaviour.
>
> 🔴 **This is NOT a leak and NOT "orphaned monitors."** `Main.perfMonitorStop` stays reachable, so monitors **do not accumulate** — at most one dead game's monitor runs at a time, and the player's next leave-lobby or join-lobby stops it. That distinction is the whole reason the owner let `0225` ship without it. ⛔ **Do not let any artifact inflate this into a leak** — that language belongs to [[tasks/orphaned-performance-monitors-lobby-rejoin]].

## Goal

`ClientGameRunner` had **no callback back to `Main` at all** for teardown. `joinLobby()`'s signature carried exactly two callbacks (`onPrestart`, `onJoin`) and **both point forward, into the game starting**; the single returned value is the stopper `Main` holds as `gameStop`. The wiring ran `Main → runner` only — **nothing ran `runner → Main`.**

⇒ When a game died, `Main`'s `perfMonitorStop` stayed live and the `PerformanceMonitor` kept sampling for a dead game. **Fixing it required ADDING A NEW SEAM**, threaded through `joinLobby`'s parameter list and wired at `Main`'s call site — which is exactly why it was excluded from `0225`, whose scope was one file.

**Three sites, not one.** The brief was filed covering site A only; sites B and C were added 2026-09-07 by a correction.

| # | Site | Where |
|---|---|---|
| **A** | worker `ErrorUpdate` → `ClientGameRunner.stop()` | the crash branch |
| **B** | worker-init failure → bare `return`, after the modal | **pre-fix** `ClientGameRunner.ts:289-305` (at `35afc64`) → **post-fix `:313-329` at `c910452`** |
| **C** | `createClientGame(...)` rejects — `.then((r) => r?.start())` with **no `.catch`** | **pre-fix** `ClientGameRunner.ts:215` (at `35afc64`) → **post-fix `:222-232` at `c910452`** |

> 🔧 **CITATIONS RE-DERIVED 2026-09-08 (lint), by reading both commits and matching content — never by shifting.** This table previously gave **only** the `35afc64` numbers while the page's own banner frames it at `c910452`; **two frames on one page is exactly what convention 10 exists to prevent** (see [[systems/agent-conventions]]). ⚠️ **Site B's old end was also off by one** — it read `:289-306`, but `:306` is the *next* statement (`flashist_logEventAnalytics(`); the `catch` closes at **`:305`**. Both frames are now named explicitly so neither number can be read as the other's.
>
> ✅ **What site C looks like AFTER the fix, read at `c910452`:** the bare `.then((r) => r?.start())` is now a `.then` carrying a **compensating branch** — `if (r === undefined) { onGameEnd(); return; } r.start();` — followed by the `.catch` that was missing. ⚠️ **Note what that means for site B: `0227` did NOT change the worker-init `catch` itself.** It is byte-identical and still bare-`return`s. **The monitor is stopped UPSTREAM, at the call site, not inside the catch.** ⛔ **Do not read *"`0227` covers it"* as *"the catch was fixed"*** — if teardown is ever needed *inside* that catch, nothing is there.

🔴 **The site-B exclusion had rested on FALSE reasoning, and that is recorded rather than deleted.** An earlier revision ruled it out because it *"returns before the game ever starts."* The call ordering refutes that: `onJoin()` fires **first** (`ClientGameRunner.ts:204`), `Main.ts:757` starts the monitor, and **only then** is `createClientGame(...)` called. ⇒ **live monitor, no game, no teardown.** The premise confused *the game* with *the monitor*. Caught by **Codex** during `0225`'s adversarial review. Site C — worse, because it shows **no modal at all** — was found while re-checking B.

## Key Changes

Two files, commit `c910452`: `src/client/ClientGameRunner.ts` (+31 / −1) and `src/client/Main.ts` (+26).

- **A new `onGameEnd: () => void` parameter on `joinLobby`**, stored on the runner and called **last, behind the `isActive` guard, in `stop()`** — so it fires exactly once and only after the runner has torn down its own things.
- **Site B**: `.then((r) => …)` now detects `r === undefined` (worker init failed, no runner constructed) and calls `onGameEnd()`.
- **Site C**: a `.catch` calls `onGameEnd()` and then **re-throws on purpose**, so the rejection stays unhandled and the global `unhandledrejection` reporters still see it exactly as they do today.
- **`Main.ts`**: a **generation token**. `joinGeneration` increments per `joinLobby` call; a separate `monitorGeneration` is claimed **beside the monitor start**, not at mint time, because `handleJoinLobby` awaits between the two and two joins can interleave. The teardown callback stops the monitor **only** if `joinGeneration === this.monitorGeneration`, and deliberately leaves `gameStop` alone.

**One defect was introduced by the fix and repaired in the same round**: the `onGameEnd` closure originally carried no game identity, so a superseded game's late teardown could stop the *current* game's monitor. The generation token is that repair (review finding R1).

## Outcome

### 🚨 Site A is unreachable dead code — criterion 1 cannot be met for it

Found by **Codex in the round-1 adversarial review**, missed by the reviewer's first pass, and re-verified line by line by the coder:

- `src/core/worker/Worker.worker.ts:20-23` — the worker's `gameUpdate` opens with `if (!("updates" in gu)) { return; }`. An `ErrorUpdate` is `{errMsg, stack}` and has **no `updates` key**, so it is **dropped and never `postMessage`d**.
- `src/core/GameRunner.ts:170-183` is the **only** `ErrorUpdate` source in the repo (`grep -rn "errMsg" src/` → 4 hits total: producer, type, single consumer).
- ⇒ `ClientGameRunner`'s `if ("errMsg" in gu)` **can never be true**; `this.stop()` never runs; `onGameEnd()` never fires for site A.

**Consequences, stated plainly:**

- ⛔ **Criterion 1 cannot be met for site A**, and this task **must not be read as having fixed it.** Criteria 1 for **B** and **C** are met and observed.
- ⛔ **Criterion 2's site-A observation is void.** The coder's simulated run proved the callback fires **when the branch's statements are invoked directly** — it did **not** prove a real worker crash is handled, because a real worker crash never reaches the branch. The brief's caveat that provoking a genuine crash "may not be straightforward" was right in spirit, wrong in cause: **it is impossible, not merely hard.**
- ✅ **The `stop()` seam stays — owner ruling.** It is **dormant-but-correct** and goes live the moment the worker drop is fixed. **It is not dead weight and must not be removed.**
- 🚨 **The root cause is worse than this task describes.** A worker game-tick crash today gives **no modal, no teardown, and no error surface at all**. That lives in `src/core/` and is filed as its own task, **`0232`** — see [[systems/client-game-teardown]]. ⚠️ **That is a static proof only** — nobody has forced a throw inside `game.executeNextTick()` and watched no modal appear.

### 📌 Two line-number frames are both correct

The correction block quotes `ClientGameRunner.ts` in **working-tree numbering** (with `0227`'s diff applied); the rest of the brief uses **`HEAD` (`702a8ea`) numbering**. The crash branch is `:491-501` at `HEAD` and `:517-525` in the working tree. Re-verify against the commit you are reading, not against either figure.

### A fourth site of the same class is NOT fixed here

A mid-game server `error` message — the multi-tab kick — shows a closable modal and tears down nothing. **Both reviewers found it independently**, which is the strongest signal on it. Filed separately as **`0233`** by owner ruling. Also unfixed: the desync and lobby-error modals.

### Relationship to `0224` — what this does NOT explain

A **small, bounded, unsized** contributor of `Performance:*` events for games already dead.

🚨 **It does not explain the 3–4 Sep spike and does not close `0224`.** That breach was **session-start** events; `Performance` barely moved across it (~1.6×). ⚠️ **Magnitude is NOT quantified and no figure may be invented** — nobody has measured worker-crash frequency in production, nor how long a player sits on a crash modal before navigating. **Real in direction, unsized.**

### The board history, kept because it reads as a contradiction otherwise

The owner ruled **twice on 2026-09-07**. First they **confirmed `Backlog`**, when the brief covered **one** site. After the correction widened it to **three**, the lead put the changed cost back to them — **explicitly flagging that the severity class did NOT change**: all three remain bounded and non-accumulating, so more sites means **more work, not more urgency**. **The owner promoted it to Sprint 4 anyway.**

⚠️ **Record that as an OWNER JUDGEMENT, not a producer re-rank, and not a correction of the earlier ruling — the input changed, not the argument.** ⛔ **Rank was never ruled either time**; the `Medium` label is the producer's.

✅ **RESOLVED 2026-09-08 — the source brief's self-contradiction has been CORRECTED BY THE PRODUCER.** A previous sync flagged it and left it as found (the wiki writes only inside the vault): the brief's *Open questions* tail, and a matching passage near its top, both still read *"the status stays `🔲 Backlog` and this folder stays in `ai-agents/tasks/backlog/`"* while the authoritative `## Status` read `✅ Done (agent-closed — not owner-verified)` and the folder sat in `done/`.

**Both passages now carry a superseded marker — struck, NOT deleted** (the project's standing practice): each says the sentence *was true when written, on the day this task was **promoted***, is **now false as a statement of current state**, and that the reader must **read the `## Status` field, not that line.** The promotion genuinely changed board placement only; the **close came later and changed both.** ⚠️ **Anyone reading `0227`'s brief must still read `## Status` first** — the stale-looking prose is deliberately preserved history, not a live claim.

## Related

- [[systems/client-game-teardown]] — the seam this task added, the full site map, and the four sites still open
- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, where this defect was found as a residual; it fixes the join-over hole, this fixes the crash holes
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, the analytics-volume context; ⛔ neither task closes it
- [[systems/analytics]] — the `Performance` event category
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[decisions/sprint-backlog]] — where `0228`, `0229` and `0226` are tracked
