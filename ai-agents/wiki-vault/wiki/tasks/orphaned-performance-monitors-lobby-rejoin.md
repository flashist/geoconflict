# Joining a Lobby Mid-Game Leaks the Running `PerformanceMonitor`

**Source**: `ai-agents/tasks/done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — task `0225`; added to the sprint 2026-09-07 on the owner's instruction, closed the same day

> **`✅ Done (agent-closed — not owner-verified)`.** The owner ruled the *decisions* (scheduling onto Sprint 4, the choke-point shape, splitting F2/F3/F4 out); they did **not** hand-verify the result and did not run it themselves.
>
> ⛔ **NOT DEPLOYED as of 2026-09-07.** The change is in commit `702a8ea`, ships at the next deploy window. Nothing on this page describes production behaviour.
>
> 📌 At close time `src/client/Main.ts` was **uncommitted in the working tree** and the task folder itself was untracked, which is why the close used `mv` rather than `git mv`. It has since been committed in `702a8ea`. Nothing was committed, pushed, stashed or restored *by the close*.

## Goal

**This one IS a leak, and that is what separates it from its siblings.** Joining a lobby while a game is running orphaned the running `PerformanceMonitor` permanently — the monitors **accumulate**, one per mid-game join, and none can ever be stopped again.

**Mechanism** (line numbers as verified 2026-09-07, pre-fix):

1. `src/client/Main.ts:676-679` — `handleJoinLobby()` stops the running game with `this.gameStop()` but **never calls `this.perfMonitorStop?.()`** and never nulls the field.
2. `src/client/Main.ts:757` — the new game's `onStart` does `this.perfMonitorStop = startPerformanceMonitor();`, **overwriting** the previous monitor's stopper.
3. ⇒ The previous monitor's `setInterval`, its `requestAnimationFrame` loop **and** (since `0224`) its `visibilitychange` listener keep running until page unload. **The only handle that could stop them is gone.**

`src/client/PerformanceMonitor.ts:69-73` confirms the returned stopper is the sole teardown for all three resources.

## Key Changes

**One file — `src/client/Main.ts`, `+18 / −6`** (measured via `git diff --numstat`). ⚠️ An earlier worklog revision said `+12 / −5`; that was **an estimate written as a measurement**, was wrong, and was corrected under review finding R2 — recorded, not silently swapped.

Two new private helpers plus five rewritten call sites:

| Site | Change |
|---|---|
| new helper | `stopPerformanceMonitor()` — stops and nulls |
| new helper | `restartPerformanceMonitor()` — stops any predecessor, then starts |
| `:249` (`beforeunload`) | → `this.stopPerformanceMonitor()` |
| `:275` (`SendWinnerEvent`) | → `this.stopPerformanceMonitor()` |
| `:678` (`handleJoinLobby`) | **added** the stop beside `this.gameStop()` — the actual fix |
| `:757` (`onStart`) | → `this.restartPerformanceMonitor()` — containment for the F3 double-`onJoin` case |
| `:931` (`handleLeaveLobby`) | → `this.stopPerformanceMonitor()` |

**No analytics event was added, renamed or removed** — recorded explicitly; `analytics-event-reference.md` needed no update and was not touched. `src/client/PerformanceMonitor.ts` was left byte-identical to `HEAD`, with no instrumentation residue anywhere in `src/`.

## Outcome

### Evidence — the strongest in this family, and stated as such

A **dev-console observation over two consecutive singleplayer games** showed exactly **one** monitor ticking after a mid-game join — **plus a negative control on the un-fixed build showing both monitors interleaved.** ✅ **The negative control is what makes the PASS falsifiable.** It was run for real, not reasoned about.

### ⚠️ And its limits — these do NOT get dropped

- The runtime evidence covers **ONE of the six touched sites** — the mid-game-join path.
- It **cannot separate `:678` from `:757`**: the two log lines are **4 ms** apart and the negative control reverted both together. The PASS credits **the pair**, not either site alone.
- **`:249`, `:275` and `:931` have NO runtime evidence** — verified statically only, by the coder and independently by the reviewer, who found no regression. A static argument, not an observation.
- **The double-`onJoin` case (F3) was never reproduced by anyone.** It needs a forced socket drop inside a sub-second window. Its containment at `:757` is **defensive, read from code, not demonstrated.**

### Review integrity — read before trusting the APPROVE

Round 1 verdict: **✅ APPROVE — ship as-is, no defect in the diff.** Three caveats stand:

- ⚠️ **Codex coverage was FULL but THIN.** Three attempts (attempt 1 `Selected model is at capacity`, attempt 2 an unsupported model), **one finding returned**. The adversarial worker's padding was self-labelled *same model family, NOT independent* and was treated as a second Claude pass. ⇒ two-model coverage achieved; **the diverse half was one finding deep.**
- ⚠️ **The reviewer did NOT re-run `npm test`.** The coder's green — 113 suites / 1185 tests, first run both times — is **not independently confirmed**. (The suite covers none of this defect either way.)
- ⚠️ **No timing figure was ever obtained.** The host ran at load 24–36 throughout and every worker correctly refused to quote one. No duration appears in any artifact, by design.

Findings: **R1** was **not a `0225` defect** — routed to `0227` (Codex found `0227`'s brief wrongly excluded the worker-init-failure site). **R2** and **R3** were worklog corrections. 🔵 **No code change was requested and none was made** — the reviewed diff is byte-unchanged.

### Why it was scheduled ahead of the analytics watch period

`0224` cut the `Performance:*` interval 60 s → 300 s expecting a **≥5×** reduction, and the owner is about to spend days watching **exactly that metric**. Orphaned monitors **partly offset that cut**, so a watch run against the leak measures a partly-offset reduction — and the owner could reasonably conclude the interval change underdelivered when the real cause is monitors that were never stopped. **The rank was driven by timing, not size.**

⚠️ **Magnitude is NOT quantified.** Nobody measured what share of sessions join a second lobby mid-game. The offset is **real in direction and unsized** — do not write a number for it anywhere.

**The accepted tradeoff, stated:** shipping both in one deploy means the observed `Performance` drop is the **combined** effect of two changes. That is precisely what makes `0224`'s acceptance criteria 3 and 4 unmeetable — see [[tasks/gameanalytics-per-user-event-limit]].

### Incidental win

The diff **also fixes the *monitor* half of F4** (the `:675-686` await interleave): a second join's `restartPerformanceMonitor` stops the first's monitor, so the count stays 1 where pre-diff it was 2. **The `gameStop` half is now task `0228`**, on the Backlog board.

### What this deliberately does NOT do

- ❌ It does not fix the 3–4 Sep breach — session-start events, still unexplained.
- ❌ It does not touch the `DEPLOY_ENV` fail-open default (`0226`), the cardinality question, or `0224`'s unset reduction target. All stay open where `0224` records them.
- ❌ **A later reader must not read this as having fixed the per-user limit problem** — it removes one contributor to one category.

### Follow-ups spawned from this task

- **`0227`** — the crashed-game teardown seam. Grew from **one** site to **three** when R1 corrected it. See [[tasks/crashed-game-teardown-seam]].
- **`0228`** — the `handleJoinLobby()` stale-`gameStop` race (F4's remaining half). **Filed with reachability UNPROVEN** — nobody has demonstrated the interleaving occurs; "unreachable, closed" is a legitimate outcome.
- **`0229`** — the double-`onJoin` that constructs a **second `ClientGameRunner`**, F3's root cause. `0225` contained F3's *monitor* consequence only.

## Related

- [[systems/client-game-teardown]] — the teardown map this task fixed one hole in, and the sites still open
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, whose watch period this was scheduled ahead of and whose criteria 3/4 it makes unattributable
- [[tasks/crashed-game-teardown-seam]] — task `0227`, the crash-path half of the same missing wiring
- [[systems/analytics]] — the `Performance` event category these orphans inflate
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[decisions/sprint-backlog]] — where `0228` and `0229` are tracked
