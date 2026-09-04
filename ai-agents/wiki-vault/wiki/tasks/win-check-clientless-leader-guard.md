# Win-Check Clientless-Leader Guard (task 0022)

**Source**: `ai-agents/tasks/done/0022-win-check-multiplayer-regression-investigation/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — closed 2026-09-02 (agent-closed — not owner-verified)

> 🔧 **The task's founding premise was REFUTED, and the task survived anyway because a worse defect
> was found underneath it.** Filed as a live correctness regression introduced by
> `0140-solo-win-condition-fix` (PR #77); it is not one. See *Outcome*.
>
> 🚨 **The largest defect it uncovered is STILL LIVE IN PRODUCTION AND IS FIXED NOWHERE.** `0022`
> shipped the guard only. ~~The XP that the guard's shape leaves unawarded is closed by `0206`~~,
> which was ~~unscheduled~~ ~~promoted into Sprint 4~~ ~~built, reviewed and closed 2026-09-03~~
> 🔴 **REVERTED 2026-09-04 ON AN OWNER RULING AND NEVER DEPLOYED. Struck, not deleted.**
>
> 🔴 **`0206` closed nothing, and the reason is worth stating precisely: it was a NO-OP in the case
> that actually loses the XP.** `players()` filters to `isAlive()`
> (`src/core/game/GameImpl.ts:421-423`), so once every clientful player is eliminated the award finds
> nobody and takes **the same early `return` this guard already took.**
> **Measured 2026-09-04:** a Nation reached **100.0 % of the map and the match still did not end.**
> ⇒ **The stall this task's guard produces predates `0206`, survives it, and survives its revert.**
>
> **The replacement is [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)**, which
> closes the loss by decoupling crediting from the winner rather than by crowning anyone.
> See [[decisions/clientless-leader-win-policy]].
>
> 🔴 **And the guard's twin has the same defect.** `checkWinnerTeam()` carries the **same shape**, so a
> bot-team-led Team match stalls and loses its XP identically — **unnoticed across `0022`, `0206` and
> `0205`** until the revert. ⚠️ Reported, **not re-verified by symbol**.

## Goal

Investigate three suspected win-condition risk surfaces in `src/core/execution/WinCheckExecution.ts`
and `src/core/game/GameImpl.ts`, and fix whichever prove real:

1. **FFA** — a clientless leader (a Bot, or a Nation) produces `winner: undefined`.
2. **Teams** — the Bot team leads and the match cannot end.
3. **HumansVsNations / Teams singleplayer** — fill bots are declared the winner.

Scope shipped was **risks 1 and 3 only**. Risk 2 was split out to `0205` on owner ruling **R4**, so
risks 1 and 3 could ship without waiting on a policy decision only risk 2 needed.

## Key Changes

| Change | Where |
|---|---|
| Risk 1 — clientless-leader guard, placed **before** `setWinner` and **before** `active = false` | `src/core/execution/WinCheckExecution.ts:69-77` (`setWinner` `:78`, `this.active = false` `:80`) — ⚠️ **re-verified by symbol at the 2026-09-04 lint; these numbers shifted when `0206` was reverted, so locate by symbol** |
| Risk 3 — Bot-team loss-title arm on the already-dead-player path | `src/client/graphics/layers/WinModal.ts:403-421` |
| New key `win_modal.bot_team` | `resources/lang/en.json:627` and `resources/lang/ru.json:648` |
| Tests | `tests/core/executions/WinCheckExecution.test.ts`, `tests/client/WinModal.test.ts` |

- **The guard's predicate is `max.clientID() === null`, not `PlayerType.Bot`.** That is deliberate and
  is the scope correction the investigation produced: **Nations (`PlayerType.FakeHuman`) are
  constructed with a null clientID** (`src/core/GameRunner.ts:89-93`) and public FFA carries them —
  `disableNPCs` is Team-only (`src/server/MapPlaylist.ts:165`) and `bots: 400` (`:169`). A
  `PlayerType.Bot` check would have missed Nations entirely.
- **Placement before `this.active = false` is the one behavioural improvement that matters.** Before
  this task the win check permanently deactivated itself on a clientless leader, so no later win could
  be declared in that match, **even by a human**. The guard returns above that line, so the check stays
  alive.
- The guard exempts non-tutorial singleplayer only (`gameType !== Singleplayer || isTutorial === true`
  ⇒ return), mirroring `GameImpl.makeWinner()`'s existing condition.
- The `WinModal` arm renders `win_modal.bot_team` instead of `win_modal.other_team`'s
  `"{team} team has won!"`, because `"Bot"` is a raw enum value and was rendering untranslated. It also
  logs the existing `GAME_LOSS` analytics event; no new analytics event was added.

## Outcome

**Verification quoted from the task's worklog and review ledger, not re-measured at close:** `npm test`
**108 suites / 1128 tests green on the first run** (no flake, no re-run); `npm run lint` clean.
Stateful review round 1 closed out; both reviewers ran (the reviewer's own pass plus Codex); findings
**R3** and **R4** fixed and reviewer-verified; **R1** and **R2** accepted as residuals.

**The premise was refuted, commit by commit, and independently re-verified by the closing producer:**

| commit | `makeWinner()` clientless branch |
|---|---|
| `de2fd00~1` (the real pre-PR baseline) | `if (clientId === null) return;` → **undefined** |
| `de2fd00` "Codex: solo win condition fix" | **`src/core/game/GameImpl.ts` is not in the diff at all** |
| `0b8528c` "review changes" | `return ["opponent", winner.name()];` (widened) |
| `db5029d` "review changes" | narrowed back to `Singleplayer && !isTutorial`; else **undefined** |

The state the brief called *"Before"* existed **only between two commits inside the same PR series** and
never shipped. **Net effect of PR #77 on this path: zero.** The `undefined` return is **original to the
fork** — `feea527`, the fork's first commit. Priority was re-ranked `High` → `Medium` on exactly that
basis (owner ruling **R1**). See [[tasks/solo-win-condition-fix]], the change that is hereby cleared.

🚨 **The real defect, which the brief never mentioned and which is worse than what it described:** when
a clientless player wins FFA, `WinModal.ts` hits an **empty block**, so no `SendWinnerEvent` is emitted,
so no `winner` message reaches the server, so `GameServer.handleWinner` never runs, so **`creditMatchXp`
(`src/server/GameServer.ts:1253`, sole call site `:1199`) never runs — the entire match's match-end XP is
silently lost, for every player in it.** Failure mode is **silent**: not a crash, not a hang, not a
desync; the match simply never ends. See [[decisions/adr-101-fail-soft-xp-crediting]] for why this is
**not** covered by that ADR's closeout clause.

**Accepted residuals, each with its destination:**

- **R1 — `reportPlacements()` no longer fires for a clientless-leader FFA match.** ⚠️ **Not
  tutorial-only** — Public and Private FFA too. In a match nobody wins, the top-3 humans lose
  leaderboard placement points they previously got. The trade is genuinely two-sided: **better** when a
  human eventually wins (points land on the real win, because the guard keeps the check alive),
  **worse** when nobody ever does. Owner-ruled an **accepted residual of the guard-only shape, not a
  defect to fix inside `0022`**; carried in full to `0206`.
  ⛔ **Record the useful half too, so nobody "restores" the old behaviour:** for the **tutorial**,
  losing `reportPlacements()` is a **FIX, not a regression.** Previously a bot winning a tutorial ran
  `reportPlacements()`, which ranks only Humans (`src/client/ClientGameRunner.ts:409-412`) — a tutorial
  has exactly one — so the single human player received **first-place leaderboard POINTS for LOSING**,
  written to the **real platform leaderboard** through `LeaderboardReporter.reportPlacement`
  (`src/client/leaderboard/LeaderboardReporter.ts:44-59`), which has **no game-type guard**.
  🚩 **It is the `points` that reach the platform, never the `placement` rank** — see the
  keep-them-apart table on [[decisions/clientless-leader-win-policy]]. The two were conflated
  repeatedly on 2026-09-03.
  ✅ **`0206` did not reintroduce this** — its fallback award returned early on
  `gameType === GameType.Singleplayer`, so it was multiplayer-only. 📌 **Moot since 2026-09-04: the
  award was reverted, so there is no new branch at all.** ⚠️ **This guard is NOT reverted and STAYS.**
- **R2 — `win_modal.bot_team` exists only in `en.json` / `ru.json`**; the other 31 shipped locales fall
  back to English. Accepted under the project's en+ru-only localization convention. **No follow-up task
  filed.** See [[systems/localization]].
- **R5, narrowed — stays on `0022`, nothing carried forward.** 🚨 **Risk 1 has NO live reproduction.**
  It needed a non-Singleplayer private lobby, and a second dev server would have collided with the
  owner's on port 3001; the owner declined the interruption (ruling **R5**). Risk 1's coverage is
  **synthetic jest tests only**, and the repo's own recorded lesson is that synthetic-map tests can pass
  while real behaviour is wrong. The live check that did run covered **risk 3 only**, in Singleplayer,
  and even there the player's death was **forced** (`hasShownDeathModal` set directly), not natural.

⚠️ **`WinModal.ts` is deliberately NOT Prettier-clean — expected, do not "fix" it.** Owner ruling
2026-09-02: the file was already unclean at `HEAD` with **13 pre-existing deviations, none from this
task**; the new arm adds a 14th, formatted identically to the two sibling arms it sits between.
`npm run format` would drag 13 unrelated hunks into a minimal diff. `lint-staged` will reformat them all
whenever it next stages that file. Recorded so nobody files it as a defect.

**Follow-ups filed, ~~both on the Backlog board and both unscheduled~~ — updated 2026-09-03:**

- `0205` — risk 2, the Teams Bot-team win stall. **Still on the Backlog board, unscheduled, unstarted**
  (owner-reviewed and deliberately left there). Its policy gate is **discharged** (next-highest human
  team wins, measured by territory), but **two sub-questions stay open** — tie-breaking, and the
  all-Nations team. ✅ **Its premise was CONFIRMED by simulation 2026-09-03**, with production frequency
  still unmeasured. See [[tasks/teams-bot-team-win-stall]]. ℹ️ It was filed as `0204` and **renumbered
  to `0205` on an owner ruling** the same day, an ID collision with a carry-check hook task reserved
  elsewhere in the toolkit. `0204` has no task folder; do not conflate the two.
- `0206` — ~~the FFA timer/threshold award, which is what actually closes the XP loss above.~~
  🔴 **REVERTED 2026-09-04 ON AN OWNER RULING. NEVER DEPLOYED. It closed nothing.**
  📌 Promoted into Sprint 4, planned, built, reviewed and closed on 2026-09-03 —
  `✅ Done (agent-closed — not owner-verified)`, and **that status is still correct: the WORK was
  done.** Codex adversarial pass: **"No findings."**; three **low** Claude findings, all
  dispositioned; `npm test` green on first run; **play-test gate PASSED.** ⚠️ **None of that is
  retracted** — what was wrong was the plan's **premise**, not the code.
  🔴 **The decisive residual (its residual 4) turned out to be *the* case:** every clientful player
  eliminated ⇒ the award finds nobody ⇒ same early `return` as this guard. It spawned four briefs
  (`0207`–`0210`) and, at its revert, a fifth: `0211`.
  📎 Page: [[tasks/ffa-clientless-leader-fallback-award]] — **read its STOP box.**
- `0211` — [[tasks/credit-participation-xp-elimination-or-match-end]], **`0206`'s replacement**, filed
  by the revert and **scheduled into Sprint 4** on 2026-09-04. Credits participation XP at
  **elimination or match end**, independent of any winner, across **FFA and Team**.
  ⚠️ **It must not SHIP before `0208` is deployed and collecting data** — planning and building in
  parallel is explicitly allowed, and neither task is `🚧 Blocked`.

📌 **The winner predicate for BOTH was ruled 2026-09-03 — ADR-110, one policy across FFA and Team:**
an AI player may be declared winner; `clientID() !== null` stays, with no `PlayerType.AiPlayer`
exclusion. 🔴 **That ADR carries a known expiry** (any durable, player-visible winner surface forces a
re-examination) — see [[decisions/adr-110-ai-winner-allowed]] before citing it.
🚩 A misleading comment on that exact predicate was filed the same day as `0207` —
[[tasks/winmodal-participation-comment-correction]].

All of this is recorded on [[decisions/clientless-leader-win-policy]], [[decisions/sprint-backlog]] and
[[decisions/sprint-4]].

## Related

- [[decisions/clientless-leader-win-policy]] — the win-policy decision this task produced: the rejected prescribed fix, the guard-only shape, and the both-branches award ruling that governs `0205`/`0206`
- [[tasks/solo-win-condition-fix]] — `0140` / PR #77, the change this task suspected and **cleared**
- [[decisions/sprint-4]] — the sprint board row and close-out context
- [[decisions/adr-110-ai-winner-allowed]] — the winner predicate this guard's shape hands to `0205` / `0206`, ruled 2026-09-03 **with a known expiry**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, risk 2 split out of this task, premise confirmed by simulation 2026-09-03
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the misleading participation comment on the same predicate
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the FFA award built against this guard and **REVERTED 2026-09-04 — never deployed**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, the replacement that closes this guard's XP residual without crowning anyone
- [[decisions/sprint-backlog]] — where `0205` and `0207` are filed (`0206`'s, `0208`'s and `0211`'s rows now read `➡️ Moved`)
- [[decisions/adr-101-fail-soft-xp-crediting]] — the XP path this defect bypasses entirely, upstream of the fail-soft client
- [[systems/execution-pipeline]] — `WinCheckExecution` emits `Win` updates through the core execution path
- [[systems/game-loop]] — schedules `WinCheckExecution` in deterministic replay
- [[systems/localization]] — the en+ru-only convention behind residual R2
- [[systems/player-profile-store]] — the match-end XP crediting path that never runs
- [[features/ai-players]] — the clientless players (Bots and Nations) this guard is about
- [[systems/glossary]] — the win-condition vocabulary and the two guards, located by symbol because their line numbers drift
- [[features/tutorial]] — the first-place-for-losing leaderboard bug this guard incidentally fixed (residual R1's useful half)
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the award **built to close** the XP residual this task shipped by design. 🔴 **REVERTED 2026-09-04, never deployed — and measurement showed it was a NO-OP in the case that actually loses the XP.** The residual is **still open**; the replacement is [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, the same first-place-for-losing shape this task fixed for the tutorial, still live in non-tutorial Singleplayer
