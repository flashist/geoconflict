# Review — 0233

Task: ai-agents/tasks/done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md
File(s) under review: src/client/ClientGameRunner.ts (working tree vs HEAD `6822210`, +13) · tests/client/ClientGameRunnerTeardown.test.ts (+131/−9)
Status: closed-out

> Round 1, 2026-09-13. Reviewer: `fkit-reviewer` (spawned by the `/fkit-sprint-ship-loop` driver; no
> owner channel). Reviewers run: own pass + Codex adversarial pass (`codex exec --sandbox read-only`,
> prompt `.fkit/tmp/0233-adversarial-prompt.md`, output `.fkit/tmp/0233-codex-out.md`, exit 0, one
> attempt, no retry needed) — **coverage: full**. Scope excludes the unrelated uncommitted 0220/0221
> profile-server/deploy/harness files and the new Backlog briefs. `plan.md` / `worklog.md` read as
> context only.
>
> **Verdict: ⚠️ Changes requested — 1 low defect (none blocking), 3 nits. R1 needs an owner
> disposition (residual vs. widen); R4 is a comment fix; R2/R3 are pre-existing or documented.**
>
> Verified by the reviewer this round (not taken from the worklog): `npm test -- tests/client/ClientGameRunnerTeardown`
> **10/10** on the working tree; the same test file against the **HEAD runner** in a scratch `git worktree`
> → **T7 and T9 fail, T8 passes, T1–T6 pass** (matches the worklog's negative check); eslint 0 problems,
> prettier clean and `tsc --noEmit` exit 0 on both files; `git diff --stat HEAD -- src/core/` **empty**;
> `grep -rn TEMP-0233 src tests` **empty**; `src/client/Main.ts`, `Transport.ts` untouched. Full `npm test`
> not re-run by the reviewer (worklog: 121 suites / 1264 tests green).
>
> Checked and clean (no row): **D1 ordering** — `stop()` touches only `#catch-up-overlay`
> (`ClientGameRunner.ts:870-873`), never `#error-modal`; the modal's X is a bare `modal.remove()`
> (`:1282-1284`) and the copy button is independent of the runner, so both keep working after `stop()`.
> **Re-entrancy** — `stop()` runs inside `socket.onmessage` → `leaveGame()` → `killExistingSocket()` nulls
> the handlers and closes the OPEN socket (`Transport.ts:748-762`); the wrapper does nothing after
> `this.onmessage(result.data)` (`:342-355`), the socket is single-threaded, and the server's close frame
> (1000 for a kick) then goes to a null `onclose` — nothing lost for the kick. **D3 invariant** — `r.start()`
> calls `transport.connect()` again, which builds a new socket with the runner's `onmessage` (`:315-323`),
> so `joinLobby`'s handler cannot see an `error` once `runner !== null`; `left = true` makes a pending
> build take 0231's `r.stop()` branch (`:235-240`); `Main.gameStop` later → `transport.leaveGame()` again
> → `stopPing()` then `socket === null → return` (`Transport.ts:459-466`), idempotent, pinned by T9.
> **`onGameEnd()` with no monitor** (3a) — Main's callback returns at the generation guard (`Main.ts:793`)
> and `stopPerformanceMonitor()` is `perfMonitorStop?.(); = null` (`:965-966`). **Local path** —
> `LocalServer` never sends `error` (grep), so D1/D3 are inert in SP/replay. **Second `error`** —
> `showErrorModal` dedupes on `#error-modal`, `stop()` latches (T7). **T7/T9 non-tautology** — both fail
> on HEAD for the reason each claims (verified above). **Music** — stops on a kick behind `isActive`; new and
> intended. **Analytics** — no event added/renamed/removed. **Server side** — the kick sends `error` then
> `close(1000)` and `addClient` refuses silently (`GameServer.ts:196-201`, `:987-1010`); `kickedClients`
> has one writer (`:1010`).

## Reviewer findings
| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1 | low | src/client/ClientGameRunner.ts:791-794 (D1), :263-268 (D3 comment) | Own pass; **CORRECT — a real behaviour change on the non-kick `error` path, not covered by the plan's edge 1.** The comment "the server closes the socket right after an `error` and refuses a rejoin" is true only for the kick. The other in-game `error` sender is the client-message schema failure, `GameServer.ts:312-328`: `error` (+ the raw message) then `close(1002, "ClientMessageSchema")` — and that client is **not** added to `kickedClients`, so a rejoin is accepted. On HEAD this self-heals: `onclose` 1002 dispatches `reconnect-failed` and does not reconnect (`Transport.ts:362-378`), but the runner's 1 s check (armed 20 s after `start()`) sees >5 s of silence and calls `transport.reconnect()` (`ClientGameRunner.ts:1216-1228`) → new socket → `joinGame(turnsSeen)` → `addClient` accepts → `sendStartGameMsg` catch-up. After D1 the game is terminal (worker gone, no reconnect) behind a closable "connection error" modal. Blast radius: **only a client that sends a message the server's schema rejects** — a client bug, or version skew across a deploy (a stale tab after a schema change). Plan edge 1 / worklog residual 2 accepted the 1002 case only for the lost `reconnect-failed` dispatch (which, verified, matters only with an active `ReconnectModal` session, `ReconnectModal.ts:196-204`); the lost **auto-recovery** was not described, so the owner has not ruled on it. Fixing it means telling a kick from a 1002 in `Transport` (0252 territory) — outside the one-file plan. Options: (a) record as accepted residual + correct the two comments to say "for a kick"; (b) widen. Reviewer recommendation: (a). |
| R2 | 1 | low | src/client/ClientGameRunner.ts:766-777, :782-794, :1241-1243 | Raised by Codex; **PARTIALLY CORRECT — pre-existing, not a regression of this diff.** A `desync` shows a closable `#error-modal`; if the player leaves it open and a kick then arrives, `showErrorModal` returns early (`:1241`) and D1's `stop()` tears the game down behind the stale desync notice. On HEAD the same sequence left the same stale modal over a frozen, socket-less game (the server had closed it and refuses a rejoin), so the visible outcome is unchanged; D1 only makes the teardown real. Root cause is `showErrorModal`'s dedupe-by-presence, same file, not touched by 0233. Frontier-move for this task (out of plan scope); recorded so it is not rediscovered. Re-raise only if the desync modal stops being closable or a second terminal `error` source appears. |
| R3 | 1 | nit | src/client/ClientGameRunner.ts:268-270, :235-240, :906 | Raised by Codex; **CORRECT, behaviour-neutral, already documented.** In the 3b window (`start` received, runner still building) D3 calls `onGameEnd()` once, then the pending build's `r.stop()` calls it again (`:906`). Main's callback is generation-guarded and `stopPerformanceMonitor()` is idempotent (`Main.ts:793`, `:965-966`); the worklog's "Seam question" states and relies on exactly this, and 3b was browser-verified (monitor gone, 0 sockets). Structurally the twin of 0231's accepted residual R2 (double `leaveGame()` on the same path) — both calls load-bearing (D3's for 3a where no runner ever exists; `r.stop()`'s for the runner's own teardown). Not jest-testable for the reason 0231/0227 recorded (`createClientGame` needs terrain/worker/renderer). Option: record as accepted residual beside 0231 R2. |
| R4 | 1 | nit | tests/client/ClientGameRunnerTeardown.test.ts:305-326 (T8 title, comment, last assertion) | Own pass; **CORRECT — the "turns still reach the worker" half of T8 is tautological; the three `not.toHaveBeenCalled` assertions are the real pin.** The runner's `turn` branch (`:796-810`) has no `isStopped`/`isActive` guard — in the real client a stopped runner receives no turns only because `killExistingSocket()` nulls `socket.onmessage`, which the mock bypasses by invoking the closure directly. Reviewer-verified in a scratch worktree: with `this.stop()` added to the desync branch, T8 fails at `worker.cleanup` (line 322) — good — but with the three negatives removed, the `sendTurn` assertion **still passes**. So the assertion cannot catch a wrong teardown and its title/comment overstate what it proves. Comment/title fix only (e.g. "a desync tears nothing down" + a note that `sendTurn` is not gated by `stop()`), or drop the assertion; no code change. |

### Re-litigates settled decisions (suppressed)
- Codex #3 "the `document` stub (`querySelector: () => ({})`) makes every `showErrorModal` return before creating DOM, so T7/T9 would pass if the modal call were deleted or `stop()` removed the modal" — **true as stated**, but settled: plan Q4 (owner-approved) chose the node environment + stub over a jsdom file, and 0227's accepted residual *"No automated test for the teardown seam"* carries the re-raise condition *"only if a jsdom environment is introduced repo-wide"* — not met. The "modal still shown after the fix" claim is browser-verified in `worklog.md` step 5 for sites 1 / 3a / 3b, and the reviewer traced `stop()` touching only `#catch-up-overlay` (see header). Pointer: 0227 `review.md` residual 3; `plan.md` Q4.
- Reconnect-session not cleared on a kick · no-backoff 1006 loop · `beforeunload` `GAME_ABANDON` for a kicked game · canvas keeps painting / Transport bus listeners stay (0252) — recorded by the coder in `worklog.md` residuals 1/3/4 and the 0252 note; not raised as new by either reviewer.
- 0231 R1 / R2 (accepted residuals) — neither reviewer re-raised; R3 above is recorded as their structural twin, not a re-open.

### Disproven / collapsed (no row; the coder need not chase these)
- Own pass: "`stop()`'s `hideCatchUpOverlay()` or the latch removes/blocks the error modal" — no: only `#catch-up-overlay` is removed; the modal is DOM-only with its own close handler.
- Own pass: "`error` can reach `joinLobby`'s handler after `runner !== null`" — no: `r.start()` → `transport.connect()` replaces the socket and its `onmessage` (`Transport.ts:315-323`); the lobby handler is unreachable from then on (remote); local never sends `error`.
- Own pass: "the `document`/fake-timer stubs leak into T1–T6" — no: `afterEach` deletes `document` and restores real timers; T1–T6 never reach `showErrorModal`; `requestAnimationFrame` global follows 0231's existing pattern.
- Codex: "no findings for re-entrancy, LocalServer `error`, T7/T9 failing-on-HEAD" — agrees with the own pass (see header).

### Convergence call
Round 1, fresh ledger — nothing re-litigated. No blocking defect: D1/D3 do what the approved plan says, the browser numbers in the worklog are consistent with the code the reviewer traced, and T7/T9 are real regression tests. R1 is a low, client-bug-only regression the plan did not describe — it needs an owner disposition, not necessarily code. R4 is a comment fix. R2/R3 are pre-existing/documented. **Recommend: act on R4 (comment) and R1's comment wording, dispose R1/R3 as residual-or-widen at the owner's call, then close.** Not an authorization — the verdict is a recommendation.

### Open questions for the owner (relayed by the driver; the reviewer has no channel)
1. **R1** — record "D1 makes a 1002 `ClientMessageSchema` close terminal (HEAD auto-recovered via the runner's reconnect check)" as an **accepted residual** with re-raise condition "a non-kick `error` sender becomes reachable by a healthy client", plus the comment correction — or widen 0233/0252 to distinguish kick from 1002 in `Transport`? Reviewer recommendation: residual + comment fix.
2. **R3** — record the 3b double `onGameEnd()` as an accepted residual beside 0231 R2 (same path, same idempotence argument), or leave unrecorded?

## Coder response
> Round 1 response, 2026-09-14, by a spawned `fkit-coder` (Process-review worker of `/fkit-sprint-ship-loop`,
> no owner channel). Owner dispositions were given live in the lead session 2026-09-13 and relayed by the
> driver: R1 → accept as residual + fix the comments; R2/R3 → residual, no code; R4 → test title/comment fix.
> Each finding re-verified against the working tree before acting (`GameServer.ts:314-327` sends `error`
> then `close(1002)` and never touches `kickedClients`; `Transport.ts:362-378` dispatches `reconnect-failed`
> on 1002 and does not reconnect; the runner's check at `ClientGameRunner.ts:545-554` / `:1216-1228`
> reconnects on HEAD; the turn branch `:796-810` has no stop guard; `showErrorModal` dedupes at `:1241`).
> Severity assigned by the coder from the traced blast radius, not inherited.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Frontier (low — only a client whose message the server's schema rejects: a client bug or version skew; recovery on HEAD was silent auto-rejoin, and a stale tab keeps failing the same way after each rejoin) | Comments at `ClientGameRunner.ts:263-268` (D3) and `:791-795` (D1) rewritten: a kick (1000) refuses a rejoin; a 1002 schema close is treated as terminal *by choice*, pointer to this ledger. Recorded as accepted residual (below), owner-ruled. Widening (telling kick from 1002 in `Transport`) not done — 0252 territory, outside the one-file plan. | won't fix (frontier) — comments ✅ done |
| R2 | PARTIALLY CORRECT | Frontier (pre-existing: `showErrorModal`'s dedupe-by-presence at `:1241`; on HEAD the same sequence left the same stale desync modal over a dead game, D1 only makes the teardown real) | none — recorded as accepted residual (below), owner-ruled. | won't fix (frontier) |
| R3 | CORRECT | Frontier (behaviour-neutral: 3b calls `onGameEnd()` from D3 then from the pending build's `r.stop()` at `:906`; Main's callback is generation-guarded, `stopPerformanceMonitor()` idempotent; browser-verified in `worklog.md` step 5) | none — recorded as accepted residual beside 0231 R2 (below), owner-ruled. Both calls stay: D3's is the only one at 3a (no runner ever), `r.stop()`'s is the runner's own teardown. | won't fix (frontier) |
| R4 | CORRECT | Defect (test only — the `sendTurn` half of T8 was tautological; the three `not.toHaveBeenCalled` negatives were always the pin) | T8 retitled "a desync tears nothing down (no stop, no leave, no onGameEnd)"; comment above it states why `sendTurn` cannot be a pin (turn branch has no stop guard; the mock bypasses `killExistingSocket()`). **The `turn` feed, the `sendTurn` assertion and the `sendTurn` mock were dropped** — a line that passes under a wrong teardown reads as a pin it is not, and nothing it could catch is uncovered (a thrown desync branch fails at the `desync` call itself; a teardown fails at `worker.cleanup`). | ✅ done |

Gates after the fixes: `npm test -- tests/client/ClientGameRunnerTeardown` **10/10**; `npm run lint` clean;
`npx tsc --noEmit` exit 0; prettier clean on both files; `git diff --stat src/core/` empty;
`grep -rn TEMP-0233 src tests` empty. Full `npm test`: **121 suites / 1264 tests green**, 33.7 s (no skip, no SIGSEGV).

## Accepted residuals (shared, do-not-re-litigate)
- **R1 — D1 makes a 1002 `ClientMessageSchema` close terminal** — What: after a server `error` the runner calls `stop()` regardless of the close code; for a kick (1000) nothing is lost (rejoin refused, `GameServer.ts:196-201`), but a message-schema failure (`error` + `close(1002)`, `GameServer.ts:314-327`, client *not* added to `kickedClients`) is now terminal behind a closable "connection error" modal, where HEAD auto-recovered via the runner's connection check → `transport.reconnect()` → rejoin accepted. · Why (structural): the trigger is a client bug or version skew only (a healthy client never sends a message the schema rejects), and telling a kick from a 1002 means reading the close code in `Transport` — 0252 territory, outside 0233's one-file plan; a silent rejoin of a client that will fail the same way again is not clearly the better behaviour. Owner ruling 2026-09-13: accept + correct the comments. · Re-raise only if: a non-kick `error` sender becomes reachable by a healthy client.
- **R2 — an open desync modal hides a later kick modal** — What: `showErrorModal` returns early when `#error-modal` exists (`ClientGameRunner.ts:1241`); a player who leaves the desync notice open and is then kicked sees the stale desync text over a game D1 has torn down. · Why (structural): pre-existing dedupe-by-presence in a function 0233 does not touch; on HEAD the same sequence left the same stale modal over a dead, socket-less game, so the visible outcome is unchanged. Owner ruling 2026-09-13: residual, no code. · Re-raise only if: the desync modal stops being closable, or a second terminal `error` source appears.
- **R3 — `onGameEnd()` called twice on the 3b path** (twin of 0231 R2) — What: a lobby-side `error` in the build window calls `onGameEnd()` from D3, then the pending build's `left` branch calls `r.stop()` → `onGameEnd()` again (`:235-240`, `:906`). · Why (structural): both calls are load-bearing — D3's is the only one at 3a (no runner is ever built), `r.stop()`'s is the runner's own teardown; Main's callback is generation-guarded (`Main.ts:793`) and `stopPerformanceMonitor()` is idempotent (`:965-966`). Not jest-testable (`createClientGame` needs terrain/worker/renderer); browser-verified in `worklog.md` step 5. Owner ruling 2026-09-13: residual beside 0231 R2. · Re-raise only if: Main's `onGameEnd` gains a non-idempotent side effect, or the generation guard is removed.
