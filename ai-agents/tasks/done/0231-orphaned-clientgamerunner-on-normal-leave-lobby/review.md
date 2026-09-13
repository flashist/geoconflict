# Review — 0231

Task: ai-agents/tasks/backlog/0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md
File(s) under review: src/client/ClientGameRunner.ts (working tree vs HEAD `fd2c88e`, +62/−19) · tests/client/ClientGameRunnerTeardown.test.ts (new)
Status: closed-out

> Round 1, 2026-09-13. Reviewer: `fkit-reviewer` (spawned by the `/fkit-sprint-ship-loop` driver; no
> owner channel). Reviewers run: own pass + Codex adversarial pass (`codex exec --sandbox read-only`,
> prompt at `.fkit/tmp/0231-adversarial-prompt.md`, output at `.fkit/tmp/0231-codex-out.md`,
> exit 0) — **coverage: full**. Scope excludes the unrelated uncommitted 0219/0241/0232 files.
>
> **Verdict: ✅ Ready to merge — no confirmed behavioural defect; 5 nits/low notes, R5 (a wrong
> comment in the new test file) recommended before close.**
>
> Verified by the reviewer this round (not taken from the worklog): the suite passes 6/6 on the
> working tree and fails **4/2 (T1, T3, T4, T5) against the HEAD runner** in a scratch `git worktree`
> — matching the worklog; full `npm test` 120 suites / 1252 tests green; `tsc --noEmit`, eslint and
> prettier clean on both files; `git diff --stat HEAD -- src/core/` is the 0232 baseline (4 files,
> +45/−16) — this task touched none of it; `src/client/Main.ts` untouched (0227's bar: direction is
> `Main.gameStop` → `runner.stop()`, nothing in the runner touches `Main`); 0233's three modal sites
> (`ClientGameRunner.ts:253`, `:755`, `:769`) untouched — textual adjacency to D1 only, no design
> conflict, and D5's idempotent `stop()` is what 0233 will want to call.
>
> Checked and clean (no row): `EventBus.off()` removes by exact reference (`src/core/EventBus.ts:32-43`)
> and the five bound fields are initialised at field-init, before `start()`; the 20 s timeout is
> stored/cleared and its `isActive` guard cannot race `stop()` (single-threaded; `stop()` before the
> callback clears the handle, after it clears the interval); `onGameEnd()` from `stop()` is
> generation-guarded in `Main.ts:793` and `stopPerformanceMonitor()` is idempotent (`:965-966`), so
> `handleLeaveLobby`'s trailing call is a no-op; a stale second closure call (0228) hits the latch;
> the crash branch (`:551-560`) reaches `stop()` first, so music/teardown are not blocked by the latch;
> no analytics event added/renamed/removed; the jest mocks replace only browser-facing modules — the
> runner, `EventBus`, the input event classes and the (fake) timers are real, `T3` installs its
> `inputEvent` spy *before* construction so the bound field captures it, and `T1`/`T4`/`T5` fail on
> HEAD for the reason each claims. **T1–T5 are not tautological.**

## Reviewer findings
| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1 | low | src/client/ClientGameRunner.ts:210-243 | Raised by Codex; **PARTIALLY CORRECT, pre-existing, not a regression.** `left` is checked only after `onPrestart()`/`onJoin()` already ran for a `start` that lands after the leave. Remote: unreachable — the closure's `transport.leaveGame()` → `killExistingSocket()` nulls `onmessage` (`Transport.ts:753`). Local only: `LocalServer.start()` awaits `buildMissionConfigIfNeeded()` (tutorial / mission SP) before emitting `start` (`LocalServer.ts:66-99`), so a hash-leave inside that window still fires Main's `onPrestart`/`onJoin` (UI hide, monitor restart). HEAD would then `r.start()` a ghost game; the new code `r.stop()`s it and, via `endGame()`, clears the 5 ms turn interval the late `start()` armed. The remaining Main-side effect lives in `Main.ts` (out of scope: plan §2, 0227 bar). Frontier-move (scope line), recorded for the follow-up brief. |
| R2 | 1 | nit | src/client/ClientGameRunner.ts:266-275, :883 | Raised by both; **CORRECT, behaviour-neutral today.** On the left-before-runner path `transport.leaveGame()` runs twice (closure `else` branch, then `r.stop()`). Remote: `stopPing()` then `socket === null → return`. Local: `LocalServer.endGame()` twice = `clearInterval` twice + `archiveEnabled()` hard-`false` (`DefaultConfig.ts:315`, no overrides). Latent only: becomes duplicate archive work if ADR-104's gate is ever lifted. Hardening option: have the closure always route through `stop()` when a runner exists and rely on the latch — or leave as is and note it. |
| R3 | 1 | nit | src/client/ClientGameRunner.ts:527, :863 | Raised by both; **CORRECT, unreachable.** `start()` has no `isStopped` guard: `stop(); start();` would re-arm timers/listeners/transport on a torn-down runner and a later `stop()` returns at the latch. Not reachable through `joinLobby` (`left` is checked synchronously before `r.start()`, `:235-243`). One-line hardening (`if (this.isStopped) return;`) or accept. |
| R4 | 1 | nit | src/client/ClientGameRunner.ts:238, :865 | Own pass; **CORRECT, latent.** The `left` branch calls `stop()` on a runner whose `start()` never ran, so `stopBackgroundMusic()` fires for a game that never played music — if a join-over's *new* runner has already started, this stops the new game's music: the exact cross-game side effect D5(ii) was moved behind the latch to prevent. Collapses to latent because `SoundManager.backgroundMusic` is `[]` since task 0066 (`SoundManager.ts:17-19`) — both calls are no-ops today. Option: guard the music line on `this.isActive` (music is only started in `start()`), or record as residual. |
| R5 | 1 | nit | tests/client/ClientGameRunnerTeardown.test.ts:6-7 | Raised by Codex; **CORRECT.** Header comment says "T1, T2 and T3 fail on the pre-0231 code … T4/T5 pin the latch". Reviewer-verified against HEAD: **T1, T3, T4, T5 fail; T2 passes** (old `stop()` already cleared a live interval). The worklog states this correctly; the file header does not. Comment-only fix. |

### Re-litigates settled decisions (suppressed)
- Codex #4 "no jest test covers the D1 `joinLobby` closure / `left` path" → settled by the owner-approved plan, `plan.md` §3 ("`joinLobby`'s closure (D1) needs a real `Transport`/WebSocket → browser only") and Q5; browser-verified in `worklog.md` §3 (1b/1c/1d/1e after-numbers). Re-raise only if a cheap unit seam for `createClientGame` appears.
- Wider per-game leak on in-page routes (canvas, rAF loop, Transport's 24 listeners, renderer/window listeners), multiple runners per `joinLobby` (0229), 0228's stale closure, 0233's three modal sites → owner rulings Q3 / plan §2 residuals; not raised by either reviewer beyond those pointers.

### Disproven / collapsed (no row; the coder need not chase these)
- Own pass: "`stop()` racing the 20 s callback can still create an interval" — no: single-threaded, handle cleared or interval cleared, and the callback's `isActive` guard covers the crash-before-arm case (1e reproduced then gone in the worklog).
- Own pass: "`EventBus.off()` during `emit` iteration skips a listener" — `stop()` is not reachable synchronously from any bus handler (callers: worker callback, DOM `beforeunload`/`hashchange`/`leave-lobby`/`join-lobby`); pre-existing EventBus shape regardless.

### Convergence call
Round 1, fresh ledger — nothing re-litigated. No confirmed behavioural defect in the diff; R1 is pre-existing and out of scope, R2–R4 are latent hardening nits, R5 is a wrong comment. **Recommend: act on R5 (comment), dispose R2–R4 as fix-or-residual at the coder's/owner's call, carry R1 into the producer's follow-up brief (Q3), then close.** Not an authorization — the verdict is a recommendation.

### Open questions for the owner (relayed by the driver; the reviewer has no channel)
1. R2/R3/R4 — record as **accepted residuals** (latent, unreachable or no-op today) or apply the one-line hardenings in this pass? Reviewer recommendation: hardenings are cheap and fully covered by the existing suite shape, but residual is defensible; either is fine.
2. R1 — confirm it goes into the follow-up brief the producer files at close (Q3), since the fix would be in `Main.ts`.

## Coder response
> Round 1, 2026-09-13. Coder: `fkit-coder`, spawned as the `/fkit-sprint-ship-loop` Process-review
> worker under the declared-approval marker (plan approved by the owner via `AskUserQuestion` in the
> lead session, 2026-09-13; standing approval = the approved plan, D1–D5). No owner channel. Fixes
> below were applied without per-fix approval on ADR-019's discipline; each is recorded in
> `worklog.md`'s decision log. Every claim re-verified against the working tree, not taken from the
> reviewer's text. Loop check: fresh ledger, no *Accepted residuals* existed before this round; the
> plan's Q3 ruling (wider leak → separate brief) is the only settled decision touched, by R1.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | PARTIALLY CORRECT | Frontier (scope line) | none in code. Verified: remote unreachable — the closure's `transport.leaveGame()` → `killExistingSocket()` nulls `socket.onmessage` (`Transport.ts:753`), so no `start` lands after a leave; local only — `LocalServer.start()` awaits `buildMissionConfigIfNeeded()` before `clientMessage({type:"start"})` (`LocalServer.ts:66-99`), so a hash-leave inside that await still runs Main's `onPrestart()`/`onJoin()` (`ClientGameRunner.ts:210-217`) before `.then` sees `left` and `r.stop()`s the runner (`:235-240`). Severity (mine): low — tutorial/mission SP only, a hash/Back leave inside a sub-second window, and the runner side is now torn down (worker, 5 ms turn interval via `endGame()`). An early `if (left) return` in `onmessage` was considered and rejected: it would skip the late `start()`'s `endGame()` and leak the 5 ms interval instead — a trade, not a fix. The Main-side effect (UI hide, monitor restart) lives in `Main.ts`, which the plan (§2, 0227 bar) excludes. Recorded as an accepted residual and added to `worklog.md`'s residuals list for the producer's follow-up brief (Q3). | won't fix (frontier) |
| R2 | CORRECT | Frontier | none in code. Verified: left-before-runner path = closure `else` → `transport.leaveGame()` (`:270-275`), then `.then` → `r.stop()` → `transport.leaveGame()` again (`:238`, `:890`). Remote: 2nd call = `stopPing()` then `socket === null → return` (`Transport.ts:463-466`). Local: `endGame()` twice = `clearInterval` twice, then `archiveEnabled()` is hard-`false` (`DefaultConfig.ts:315`, no override) → return (`LocalServer.ts:262-273`). Behaviour-neutral today. **The second call is load-bearing in the local case** — it is the one that clears the 5 ms turn interval the late `LocalServer.start()` armed after the first `leaveGame()` (R1's window); and the first call is load-bearing for the common pre-start remote leave (no `start` ever arrives → nothing else would kill the socket). So neither call can be dropped from `ClientGameRunner.ts`; the right idempotence seat, if archive is ever enabled, is `LocalServer.endGame()` — outside the approved plan (one file). Recorded as an accepted residual. | won't fix (frontier) |
| R3 | CORRECT | Defect (latent, unreachable) | applied: `start()` now returns at the top `if (this.isStopped)` (`ClientGameRunner.ts:528-530`). Verified behaviour-neutral for every reachable path: `start()` has one caller, `.then` at `:241-242`, reached only when `!left`; `isStopped` can only be set by `stop()`, whose callers are the closure (needs `runner !== null`, assigned synchronously one line before `r.start()`) and the crash branch (needs the `worker.start` callback, wired inside `start()`) — so `isStopped` is always `false` when `start()` runs today. New test **T6** (`start(); stop(); start()` → `worker.start` once, `playBackgroundMusic` once, five listener arrays empty, no 1000 ms interval and no `reconnect` after 60 s); fails without the guard (verified by temporarily reverting the hunk), passes with it. | ✅ done |
| R4 | CORRECT | Defect (latent) | applied: `stopBackgroundMusic()` in `stop()` now runs only `if (this.isActive)` (`:868-872`). Verified: `isActive` is `true` iff `start()` ran and `stop()` has not (`:534`, `:875`; no other writer), so the guard reads "this runner started the music". Behaviour-neutral on every reachable path: crash branch and `Main.gameStop` on a started runner unchanged; the never-started `left` runner skips a call that is a no-op today (`SoundManager.backgroundMusic` is `[]`, `SoundManager.ts:10-19`) and that would silence a join-over's already-started next game if tracks return — the same cross-game side effect D5(ii) exists to prevent. T5 now also asserts `stopBackgroundMusic` not called; fails without the guard, passes with it. T4 (started runner → music stopped once) unchanged and green. | ✅ done |
| R5 | CORRECT | Defect (comment) | applied: header comment at `tests/client/ClientGameRunnerTeardown.test.ts:6-10` now says T1, T3, T4, T5 fail on the pre-0231 code, T2 passes on it too (regression guard), and names T6 / the T5 music assertion. Matches the reviewer's and the worklog's HEAD run (4 failed / 2 passed). | ✅ done |

**Tests after the round:** `npm test -- tests/client/ClientGameRunnerTeardown` 7/7 (was 6/6; +T6, +1 assertion in T5) · full `npm test` **120 suites / 1253 tests, all passed, none skipped** (Docker up) · `npm run lint` 0 problems · `npx tsc --noEmit` clean · prettier clean on both files · `git diff --stat HEAD -- src/core/` still the 0232 baseline (4 files, +45/−16) · `src/client/Main.ts` untouched · `grep -rn TEMP-0231 src tests` empty. `ClientGameRunner.ts` diff vs HEAD is now +70/−20 (was +62/−19). No commit made by this step.

## Accepted residuals (shared, do-not-re-litigate)
- **R1 — `left` seen after Main's `onPrestart`/`onJoin` on a local late `start`** — What: a hash/Back leave that lands inside `LocalServer.start()`'s `await buildMissionConfigIfNeeded()` (tutorial / mission SP only; remote is unreachable because `killExistingSocket()` nulls `onmessage`) still fires Main's `onPrestart()`/`onJoin()`; the runner it builds is then torn down by the `left` branch (worker + 5 ms turn interval gone), but Main's UI hide / monitor restart happen once more. · Why (structural): the fix seat is `Main.ts` (`onPrestart`/`onJoin` are Main's callbacks) or `LocalServer.start()` — both outside this task's one-file plan (plan §2, 0227 bar, owner Q3 ruling: wider in-page-leave work → separate brief). An early `if (left) return` in `joinLobby`'s `onmessage` was rejected: it skips the late `start()`'s `endGame()` and leaks the 5 ms interval instead. Pre-existing on HEAD (HEAD `r.start()`ed the ghost game). · Re-raise only if: the follow-up brief the producer files at close is not filed, or a `Main.ts`/`LocalServer.ts` change makes the leave-during-build window reachable on a remote game.
- **R2 — `transport.leaveGame()` called twice on the left-before-runner path** — What: closure `else` branch calls it once (no runner yet), and the `left` branch's `r.stop()` calls it again when the build completes. · Why (structural): both calls are load-bearing — the first is the only teardown when no `start` ever arrives (the common pre-start remote leave), the second is what clears the 5 ms turn interval a late local `start()` armed (R1's window) — so neither can be dropped from `ClientGameRunner.ts`. Neutral today: remote 2nd call is `socket === null → return`; local 2nd call is `clearInterval` ×2 then `archiveEnabled()` hard-`false` (`DefaultConfig.ts:315`). Idempotence belongs in `LocalServer.endGame()`, outside the plan. · Re-raise only if: `archiveEnabled()` is ever lifted (ADR-104 / 0030) — then `LocalServer.endGame()` needs its own once-guard before this path double-archives.
