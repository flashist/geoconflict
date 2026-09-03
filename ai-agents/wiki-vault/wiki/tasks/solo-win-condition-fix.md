# Solo Opponent Win Condition Fix

**Source**: `ai-agents/tasks/done/0140-solo-win-condition-fix/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Fix solo missions and singleplayer/custom games so the match ends when an opponent reaches the win threshold. The player should see a distinct loss state because an opponent won, not the existing elimination/death screen, and the player must not be able to win after that opponent victory has already ended the match.

## Key Changes

- Updated `src/core/execution/WinCheckExecution.ts` so a Bot-team winner is accepted in `GameType.Singleplayer`, while Bot-team wins are still ignored outside singleplayer.
- Preserved clientless FFA opponent winners as explicit opponent winners so the client can distinguish "opponent won" from "player was eliminated". ⚠️ **Read this narrowly — corrected 2026-09-03 against `0022`'s producer-verified evidence.** It holds **only inside non-tutorial singleplayer**. `GameImpl.makeWinner()`'s clientless branch returns `undefined` everywhere else, and **this task did not change that** — `src/core/game/GameImpl.ts` is not in PR #77's first commit's diff at all, and the `undefined` return is original to the fork (`feea527`). See [[tasks/win-check-clientless-leader-guard]].
- Updated `src/client/graphics/layers/WinModal.ts` to detect non-tutorial singleplayer win updates where the winner is an opponent, another team, or another player while the local player is still alive.
- Added a distinct opponent-win loss modal using `win_modal.opponent_won_title` and `win_modal.opponent_won_body` in `resources/lang/en.json` and `resources/lang/ru.json`.
- Added `Match:Loss:OpponentWon` to `flashistConstants.analyticEvents` and the analytics reference. The modal also logs `Game:End` and `Game:Loss` before the reason-specific loss event.
- Added tests in `tests/core/executions/WinCheckExecution.test.ts` and `tests/client/WinModal.test.ts` covering singleplayer Bot-team wins, non-singleplayer Bot-team suppression, clientless FFA opponent winners, the distinct loss modal, tutorial exclusion, and elimination-modal preservation.

## Outcome

Solo modes now have a clear game-end path when a nation, bot team, or other opponent wins before the human player. The fix is intentionally scoped away from tutorial behavior and multiplayer behavior. The loss state is tracked once with `Match:Loss:OpponentWon`, and the winner is still sent through the existing `SendWinnerEvent`/archive path so match-end recording remains consistent.

> ✅ **CLEARED — the suspicion against this change was REFUTED, and the investigation closed the same
> day it was raised (2026-09-02).** Task `0022` was filed suspecting that this change (`0140`, PR #77)
> let fill bots win a **Teams** or **HumansVsNations** match when land is scarce. Its commit-by-commit
> evidence, independently re-verified by the closing producer, shows otherwise: `src/core/game/GameImpl.ts`
> is **not in PR #77's first commit's diff at all**, and the clientless-`makeWinner()` `undefined`
> return is **original to the fork** (`feea527`). **Net effect of PR #77 on this path: zero.** `0022`
> closed `✅ Done (agent-closed — not owner-verified)` with **risks 1 and 3** in scope; **risk 2 —
> the Teams bot-team win stall — was split out to `0205`**, which is a live open question about win
> policy and **not** a defect attributed to this change. ✅ **`0022`'s full findings are now ingested
> (2026-09-03)** — see [[tasks/win-check-clientless-leader-guard]] and
> [[decisions/clientless-leader-win-policy]]. See also [[decisions/sprint-4]].

> ⛔ **One thing `0022` prescribed against this change must NEVER be applied.** `0022`'s brief directed
> that the `gameType !== Singleplayer` clause be reverted from `checkWinnerTeam()`, restoring an
> unconditional Bot-team guard. **That was rejected by owner ruling — it would reintroduce exactly the
> singleplayer Team stall this task fixed**: with the clause removed, the guard returns before
> `setWinner` and before `this.active = false`, so a singleplayer Team match in which the Bot team leads
> can never end. Producer-verified structurally. Recorded on
> [[decisions/clientless-leader-win-policy]].

## Related

- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which suspected this change, **refuted its own premise**, and shipped the clientless-leader guard instead
- [[decisions/clientless-leader-win-policy]] — the win policy `0022` produced, including the rejected fix that would have regressed this task
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the split-out risk 2; ⛔ its fix **must not** delete the `gameType !== GameType.Singleplayer` clause this task added, which is exactly what would regress it
- [[decisions/sprint-4]] — Sprint 4 bug-fix context, and task `0022`'s suspected regression from this change — **investigated and refuted 2026-09-02**
- [[systems/execution-pipeline]] — win checks emit `Win` updates through the core execution path
- [[systems/game-loop]] — schedules `WinCheckExecution` in deterministic replay
- [[systems/analytics]] — `Match:Loss:OpponentWon` event reference
- [[systems/match-logging]] — archived winners can include solo opponent winners
