# Plan — 0225: stop orphaning `PerformanceMonitor` instances

> **Provenance.** Produced by a spawned `fkit-coder` (plan-only, wrote no source), 2026-09-07.
> **APPROVED BY THE OWNER 2026-09-07** via `AskUserQuestion` in the `fkit lead` session, together
> with a ruling on F2 (recorded at the bottom).
>
> ⚠️ **Honesty note.** The lead wrote this file by transcribing the worker's returned plan out of the
> driver session's context. It was not copied from a pre-existing file, because none existed.

**Ships in the same deploy as `0224`** — owner ruled 2026-09-07 that `35afc64` has not been deployed
yet, so both go out together and the analytics watch starts against a clean baseline.

## 1. The audit — every path that starts, stops, or replaces a game

Verified against `HEAD` = `35afc64`, by grep over `src/` for `gameStop`, `perfMonitorStop`,
`startPerformanceMonitor`, plus every `join-lobby` / `leave-lobby` dispatcher.

**Start sites — there is exactly ONE.** `Main.ts:755-757` (`joinLobby`'s `onJoin` callback) is the
sole `startPerformanceMonitor()` call in the repo, and it assigns over `this.perfMonitorStop`
unconditionally. Every entry point funnels here (`PublicLobby.ts:307`,
`JoinPrivateLobbyModal.ts:225/296`, `ReconnectModal.ts:178`, `HostLobbyModal.ts:603`,
`Matchmaking.ts:135`, `SinglePlayerModal.ts:534`, `Main.ts:800/876` → `join-lobby` → `Main.ts:279` →
`handleJoinLobby`). **That single start site is what makes a choke point viable.**

| # | Path | Location | Stops the monitor? |
|---|---|---|---|
| 1 | `beforeunload` | `Main.ts:247-254` | ✅ `perfMonitorStop?.()` at `:249`. Does not null — harmless at unload. |
| 2 | `SendWinnerEvent` (game ended) | `Main.ts:273-277` | ✅ stops **and** nulls. |
| 3 | `popstate` / `hashchange` → `onHashUpdate` | `Main.ts:496-505` | ✅ indirect — calls `handleLeaveLobby()` when `gameStop !== null`. |
| 4 | `handleLeaveLobby()` | `Main.ts:923-937` | ✅ stops **and** nulls (`:931-932`). |
| 5 | **`handleJoinLobby()` — join while a game runs** | **`Main.ts:676-679`** | ❌ **HOLE (F1)** — calls `this.gameStop()`, never `perfMonitorStop`, never nulls; `:757` then overwrites the handle. |
| 6 | **`joinLobby`'s `onJoin` re-fire** | `ClientGameRunner.ts:190-216`, `:204` | ❌ **HOLE (F3)** — see below. |
| 7 | **Worker crash → `ClientGameRunner.stop()`** | `ClientGameRunner.ts:487-501`, `:753-765` | ❌ **WRONG-STATE (F2)** — see below. |
| 8 | `joinLobby`'s returned stopper | `ClientGameRunner.ts:230-233` | n/a — only `transport.leaveGame()`; knows nothing about the monitor, by design. |
| 9 | Desync / connection-error modals | `ClientGameRunner.ts:649-673` | n/a — informational, game keeps running. Correct. |

### 🔴 F3 — orphaning with NO lobby join involved

`ClientGameRunner.ts:190-216`: on a `"start"` message `onJoin()` runs at `:204`, then
`createClientGame(...).then(r => r?.start())` — **async** (terrain load). The runner only replaces the
transport's handlers at `:689`. **In that window `joinLobby`'s own `onmessage` is still installed**,
and `Transport.ts:361-378` reconnects on socket close, re-sending `joinGame` → the server re-delivers
`"start"` → `onJoin()` fires again → `Main.ts:757` overwrites a live handle. Orphan, same as F1.

⚠️ **Mechanism read from code; NOT reproduced at runtime.** Timing-dependent and probably rare.

**F3 is why the fix is a choke point and not a one-liner:** it orphans without any lobby join, so a
`:676`-only fix would look closed while the defect lived.

### F2 — monitor outlives a crashed game (owner-ruled OUT of this task)

`ClientGameRunner.ts:487-501`: a worker `ErrorUpdate` shows the crash modal and calls `this.stop()`
(`:753-765`), tearing down worker, transport and interval — but **never reaching `Main`**.
`Main.perfMonitorStop` stays live and `Main.gameStop` stays non-null, so the monitor keeps emitting
`Performance:*` for a dead game until the player leaves or joins another lobby.

**Not an orphan** (the handle is still reachable), so it does not accumulate. Fixing it needs a new
`ClientGameRunner` → `Main` teardown callback — a new seam, outside this task's fence.

### F4 — observation only, no change proposed

`Main.ts:676-679` does not null `this.gameStop`, and `:680-703` awaits three promises before
reassigning at `:686`. Two fast `join-lobby` events can interleave in that gap. Pre-existing,
unrelated to the monitor, out of scope.

## 2. Chosen shape — choke point at the start site, PLUS the explicit stop at `:676`

- **A `:676`-only fix does not close F3.** That alone decides it.
- **The choke point is small** — two private methods, ~6 lines, in the file that already owns the
  field. Not an abstraction, not a lifecycle manager.
- **Next-path-added case.** There is exactly one start site. "Stop any predecessor, then start" means a
  future teardown path that forgets costs at most **one** stale monitor, never an accumulating leak. A
  per-site list would need re-auditing every time someone adds a path — `0201`'s R5 residual shape.
- **Keep the stop at `:676` as well.** The choke point alone would leave the old game's monitor running
  from the moment its game stops until the new one starts — seconds, or **forever** if the new join
  errors before `onJoin`. The monitor belongs to the game; stop it when the game stops.

**`PerformanceMonitor.ts` unchanged.** Its stopper is already double-call safe — `cancelAnimationFrame`
on a stale id, `clearInterval` on a cleared id, and `removeEventListener` for an unregistered listener
are all no-ops. No guard flag; that would be churn.

## 3. Exact change surface — ONE file, `src/client/Main.ts`

Naming follows the project's full-descriptive-names rule.

1. **New private helpers**, next to `handleLeaveLobby` (~`:937`):
   - `stopPerformanceMonitor()` — `this.perfMonitorStop?.(); this.perfMonitorStop = null;`
   - `restartPerformanceMonitor()` — calls `stopPerformanceMonitor()`, then
     `this.perfMonitorStop = startPerformanceMonitor();` (module import already at `:43`).
2. `:249` — `this.perfMonitorStop?.()` → `this.stopPerformanceMonitor()`. Behaviour-identical plus a
   null; makes the helper the single teardown.
3. `:275-276` — the two lines → `this.stopPerformanceMonitor()`.
4. `:676-679` — add `this.stopPerformanceMonitor();` alongside `this.gameStop()`. **F1's fix.**
5. `:757` — `this.perfMonitorStop = startPerformanceMonitor();` → `this.restartPerformanceMonitor();`
   **F3's containment.**
6. `:931-932` — the two lines → `this.stopPerformanceMonitor()`.

Net: ~6 added lines, 5 call sites rewritten to one-liners. **No behaviour change on any path that was
already correct.**

**Not touched:** `PerformanceMonitor.ts`, `ClientGameRunner.ts`, the analytics enum,
`analytics-event-reference.md`, `SAMPLE_INTERVAL_MS`, `DEPLOY_ENV`/`Dockerfile`/`webpack.config.js`,
`en.json`/`ru.json`, `CLAUDE.md`, `ai-agents/sprints/`, and every other task folder.

**No event is added, renamed, or removed**, so `analytics-event-reference.md` needs no update —
recorded explicitly rather than left silent.

## 4. Verification — honest

| Check | Status |
|---|---|
| `npm test` green, `npm run lint` clean | Runnable — **but covers none of this.** A green run is a no-regression signal only. |
| Dev-console observation (the real evidence) | Runnable in a coder session with a browser. |
| F3 (double `onJoin`) | **Not practically reproducible** — needs a forced socket drop inside a sub-second window. The fix is defensive. **Say so; do not claim it verified.** |

**No unit test will be written.** There is no `PerformanceMonitor` test today; `CLAUDE.md` mandates
tests for `src/core/` only, and both files here are `src/client/`. A test asserting
"`perfMonitorStop` was invoked" restates the diff and proves nothing about the leak — the brief
forbids it and that is the right call.

### The dev-console observation, concretely

1. **Temporary instrumentation** in `PerformanceMonitor.ts`: `SAMPLE_INTERVAL_MS` → a few seconds, plus
   a module-level instance counter logged from inside the interval.
   🚨 **BOTH MUST BE REVERTED BEFORE HAND-OFF — leaving either silently undoes `0224`.**
2. `npm run dev`. **Use two consecutive SINGLEPLAYER games, not public lobbies** — singleplayer goes
   through `Transport.connectLocal` (`Transport.ts:295-306`), needing no multiplayer lobby, which
   sidesteps the documented port-3001 squatting failure that empties `/api/public_lobbies`. It hits the
   identical path: `SinglePlayerModal.ts:534` dispatches the same `join-lobby` into `handleJoinLobby`.
3. Start game 1 — confirm exactly **one** tag ticking.
4. **Without reloading**, start game 2 from the in-game menu.
   ✅ PASS: one tag still ticking, the new one. ❌ FAIL (today): two.
5. Corroboration, not a substitute: `getEventListeners(document).visibilitychange.length` in DevTools
   does not grow across joins.
6. `flashist_logEventAnalytics` console-logs instead of sending when `DEPLOY_ENV !== "prod"`
   (`FlashistFacade.ts:199-207`), so real `Performance:*` emissions are visible as a second signal.

⚠️ If a test flakes, apply `CLAUDE.md`'s procedure: rule out `0197`'s `SIGSEGV` /
`ClearStaleLeftTrimmedPointerVisitor` signature first, then the supertest shape, then re-run — **and
say that you re-ran.**

---

## Owner rulings, 2026-09-07 (`AskUserQuestion`, `fkit lead` session)

| # | Question | Ruling |
|---|---|---|
| **Plan gate** | Choke point + stop at `:676`, or strict one-line fix? | ✅ **APPROVED as planned** — choke point plus the `:676` stop. The strict one-liner was put to the owner and **not** chosen; they were told explicitly it would leave F3 open. |
| **F2** | Monitor keeps emitting after a worker crash — fix here or brief separately? | ✅ **SHIP `0225` AS PLANNED; brief F2 separately.** Keeps the diff one-file and deploy-ready alongside `0224`. F2 emits at most one crashed session's worth of events — **bounded, not accumulating** — so it will not distort the watch the way F1 would. |
