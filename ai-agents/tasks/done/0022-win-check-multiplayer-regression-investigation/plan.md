# 0022 — Approved Plan (scope: risks 1 and 3 only)

> **Provenance and one disclosed transformation.** This plan was produced by a spawned `fkit-coder`
> (plan-only, wrote nothing to disk) and approved by the owner via `AskUserQuestion` in the
> `fkit lead` session on **2026-09-02**. The driver (`fkit-lead`) wrote this file at the moment of
> approval, before any build spawn.
>
> ⚠️ **Disclosed transformation — this is NOT a byte-for-byte copy.** The plan arrived through the
> subagent channel with HTML entities escaped (`&gt;`, `&lt;`, `&amp;`). Those have been decoded back to
> `>`, `<`, `&` so the code snippets are usable. **No other change was made** — no re-rendering, no
> summarising, no reordering. Every other byte is as returned.

---

## ⚠️ Read this first: the task's premise was REFUTED

**`0022` was scheduled as a live correctness regression introduced by PR #77. It is not one.**
PR #77 did not introduce the `makeWinner()` → `undefined` path. Verified commit by commit:

| commit | `makeWinner()` clientless branch |
|---|---|
| `de2fd00~1` (pre-PR baseline) | `if (clientId === null) return;` → **undefined** |
| `de2fd00` "solo win condition fix" | **`GameImpl.ts` not in the diff** |
| `0b8528c` "review changes" | `return ["opponent", winner.name()];` (widened) |
| `db5029d` "review changes" | narrowed back; else **undefined** |

The state the brief calls *"Before"* existed only **between two commits inside the same PR** and was
never a shipped baseline. **Net effect of PR #77 on this path: zero.** The defect is original to the
fork (`feea527`).

**A real defect nevertheless exists, and it is worse than the brief describes** — see §2. That is why
the task survives.

---

## Owner rulings that scope this plan (all given live in session, 2026-09-02)

**R1 — The task SURVIVES, re-ranked `High` → `Medium`.** Honest re-rank: the fix is ~8 lines and the
silent XP loss is real, but this is not the urgent live regression Sprint 4 believed it was. The
producer records the re-rank and the refutation.

**R2 — Risk 1 fix shape: GUARD ONLY.** Mirror the Team guard into FFA, placed **before**
`this.active = false` so the win check stays alive and a human can still win later. **Do not**
implement the timer-expiry award (the coder's option (b)) — it is a behaviour change and the owner
declined it for now. Record it as a candidate follow-up brief.

**R3 — Risk 3: FIX THE LABEL ONLY.** The owner accepts that a live player seeing the standard
*"You lost"* screen is correct behaviour. Risk 3 therefore collapses to one string fix on the
**already-dead-player** path, plus the new key in **both** `en.json` and `ru.json`.
⛔ **Do NOT apply the brief's prescribed fix at `:91`** (reverting the `Singleplayer` clause). The
coder demonstrated it would reintroduce the Singleplayer Team stall that PR #77 fixed. That
instruction in the brief is wrong.

**R4 — Risk 2 is SPLIT OUT into its own brief.** It is real, pre-existing, and needs the owner's
`:88` policy decision (Bot team wins / next-highest human team wins / no-winner-after-timeout).
Risks 1 and 3 ship without waiting on it. The new brief must carry the **corrected trigger**: the
realistic shape is **private Team + timer**, not the 95% territory case the brief emphasises.
**Do not implement risk 2 in this task.**

**R5 — Verification: synthetic tests + a Singleplayer live check.** Risk 3 gets a real end-to-end
check (Singleplayer needs no server port). Risk 1 is covered by unit tests only.
⚠️ **Stated honestly as a gap, not waved away:** the repo's own recorded lesson
(`feedback_spatial_gameplay_live_test`) is that synthetic-map tests can pass while real behaviour is
wrong. Risk 1's live repro needs a private lobby and would collide with the owner's dev server on
port 3001; the owner declined the interruption. **The residual is accepted and must be recorded in
the worklog and surfaced at review.**

**R6 — Standing constraints.** No production contact. No commits, no pushes. No secret values —
variable names only. `0064` remains open with `--enforce` deliberately unwired: **do not touch**
`scripts/check-config-parity.mjs`, `deploy.sh`, or `build-deploy-profile.sh`.

---

## The approved plan, as returned

## 1. Evidence for the refutation

Git history of the "solo win condition fix" series (all four commits, 2026-04-28) — table above.

Verified with `git show de2fd00~1:src/core/game/GameImpl.ts` (line 679: `if (clientId === null) return;`).

The empty handler was also pre-existing: `git show de2fd00~1:src/client/graphics/layers/WinModal.ts`
already had `if (wu.winner === undefined) { // ... }`.

The brief's own PR already **pinned the undefined path in a test named "keeps public FFA clientless
winners on the pre-existing undefined winner path"** — the authors knew it was pre-existing.

## 2. Actual blast radius of the `winner: undefined` path (risk 1)

Traced end to end. **Scope is wider than "bot"**: the predicate is `clientID() === null`, which covers
`PlayerType.Bot` **and** `PlayerType.FakeHuman` (Nations). Public FFA has both — `MapPlaylist.ts:169`
`bots: 400`, `MapPlaylist.ts:165` `disableNPCs: mode === GameMode.Team && …` ⇒ **false for FFA**.

What happens, file by file:

- `src/core/execution/WinCheckExecution.ts:59-61` — `setWinner(max)`, then `this.active = false`.
  **The win check permanently removes itself.** No later win can ever be declared in that match, even
  by a human.
- `src/core/game/GameImpl.ts:667-694` — `makeWinner` returns `undefined` for a clientless player
  outside Singleplayer-non-tutorial (`:678-687`). No type error: `WinnerSchema` is `.optional()`
  (`Schemas.ts:484-492`), so `WinUpdate.winner` already admits `undefined`.
- `src/client/graphics/layers/WinModal.ts:380-381` —
  `if (wu.winner === undefined || wu.winner[0] === "opponent") { // ... }` — **empty block**. No modal,
  no `SendWinnerEvent`, no `logMatchEndAnalytics`, no `Match:Win` / `Match:Loss`.
- `src/client/ClientGameRunner.ts:516, 525-536` — `gameEnded` is `Win.length > 0`, true regardless. So
  `saveGame()` (archives a local record with `winner: undefined`) and `reportPlacements()` (leaderboard
  points) **do** still run. No crash.
- Server: no `winner` message ⇒ `GameServer.handleWinner` (`:1144`) never runs ⇒ `this.winner` stays
  `null` ⇒ **`creditMatchXp` (`GameServer.ts:1199`, its only call site) never runs — the whole match's
  match-end XP is silently lost.** The game is archived later without a winner (`:814`, `:1006`).

**Failure mode: silent.** Not a crash, not a hang, not a throw. **Not a desync** — `makeWinner` reads
only game state and `gameConfig`, identical on every client, so every client produces the same
`undefined`; the tick stream stays in agreement. The deterministic-sim concern in the task framing does
not apply here.

Player-visible: the match simply never ends. No end-of-match modal; the sim keeps running until players
leave or the server's 3-hour `maxGameDuration` (`GameServer.ts:56, :867`) fires.

**Reachability — the brief misses the likelier path.** Territory route needs 80% of non-fallout land
(`DefaultConfig.ts:713-717`), rare. But `WinCheckExecution.ts:56-57` also fires on **timer expiry**, and
`maxTimerValue` is host-settable (`HostLobbyModal.ts:773`, `SinglePlayerModal.ts:567`). In a **private
lobby with a timer**, whoever is top at expiry "wins" — with 400 bots plus Nations on the map, a
clientless player being top is entirely plausible. Public lobbies leave `maxTimerValue: undefined`
(`MapPlaylist.ts:162`), so the timer route is private/custom only; public is territory-only.

## 3. Per-risk breakdown

**Risk 1 — FFA clientless winner ⇒ `winner: undefined`.**
**REAL. Not a regression** (pre-existing since `feea527`). Wider than stated (Nations too).

**Risk 2 — Teams multiplayer Bot-team stall.**
**REAL. Pre-existing** — `if (max[0] === ColoredTeams.Bot) return;` predates PR #77; the PR only
appended `&& gameType !== Singleplayer`. `WinCheckExecution.ts:94-99` returns **before**
`active = false`, so the check keeps retrying every 10 ticks — not a hang, just an unwinnable match
while the Bot team leads. Public Team needs the Bot team at 95% (`DefaultConfig.ts:714`), rare. The
realistic shape is **private Team + timer**. **SPLIT OUT (owner ruling R4) — do not implement here.**

**Risk 3 — Singleplayer Team / HumansVsNations, Bot team wins.**
**REAL as a behaviour change from PR #77** (`de2fd00` added the `gameType !== Singleplayer` clause).
Reachable: `SinglePlayerModal.ts:41` `bots = 400` default, Team mode selectable (`:179`),
`maybeAssignTeam` routes every `PlayerType.Bot` to `ColoredTeams.Bot` (`GameImpl.ts:463-472`).

**But the brief's characterisation is wrong.** What the player actually sees for `["team", "Bot"]`:
- **Player alive** → `isSoloOpponentWin` (`WinModal.ts:491-522`) returns true
  (`"Bot" !== myPlayer.team()`) → the **"You lost / An opponent captured enough territory to win"**
  modal, `Match:Loss:OpponentWon` fires. Coherent, and the match *ends* instead of stalling.
- **Player already dead** (`hasShownDeathModal`, `:501`) → falls to the team branch (`:382`) →
  `win_modal.other_team` → **"Bot team has won!" / «Команда «Bot» победила!»** with the raw
  untranslated enum value.

So the only defect here is that dead-player label. **The brief's prescribed fix — revert the
`Singleplayer` clause so "the Bot team should never win in any game type" — would regress PR #77's
intent** and put Singleplayer Team modes back to a permanent stall. Do not do it.

## 4. Change surface

**Risk 1 minimal fix — mirror the Team guard into FFA:**
- `src/core/execution/WinCheckExecution.ts` (~8 lines) — in `checkWinnerFFA()`, before `setWinner`,
  `return` when `max.clientID() === null` and we are not in Singleplayer-non-tutorial. Predicate is
  `clientID() === null`, **not** `PlayerType.Bot` — Nations must be covered. Guard **before**
  `this.active = false`, so the check keeps running and a human can still win later. This is the single
  behavioural improvement that matters: today the check dies forever.
  - Suggest the guard mirror `makeWinner`'s exact condition (`Singleplayer && !isTutorial`) so the
    tutorial stops silently killing its own win check too. Mechanical; call it out in review.
- Add the comment `:114` of the brief asks for: FFA and Team now share one policy.
- `src/core/game/GameImpl.ts` — **no change**. Under this fix the `undefined` return becomes
  unreachable from FFA. Optionally a comment.

**Risk 3 display fix:**
- `src/client/graphics/layers/WinModal.ts` — in the team branch, special-case
  `wu.winner[1] === ColoredTeams.Bot` (dead-player path) to use loss copy instead of the raw team key.
- `resources/lang/en.json` **and** `resources/lang/ru.json` — new key, both files, per the project rule.

**Tests (mandatory — `src/core/` change):**
- `tests/core/executions/WinCheckExecution.test.ts` — the existing test **"keeps public FFA clientless
  winners on the pre-existing undefined winner path"** asserts today's behaviour and must be rewritten
  (rename + invert, comment pointing at 0022). New cases: (a) Public/Private FFA, clientless leader over
  threshold ⇒ **no Win update emitted at all** *and* `winCheck.isActive() === true`; (b) same on the
  timer branch; (c) human leader in Public FFA still wins (no regression); (d) Singleplayer + tutorial
  cases unchanged.
- `tests/client/WinModal.test.ts` — `["team","Bot"]` with the player already dead.

Not touched: `scripts/check-config-parity.mjs`, `deploy.sh`, `build-deploy-profile.sh`,
`ai-agents/wiki-vault/`. No threshold or fallout changes (brief `:116`).

## 5. Test plan — synthetic vs real

**Synthetic (jest).** Everything in §4. ⚠️ These suites use `setup("big_plains", …)` and hand-mocked
`mg` objects; per `feedback_spatial_gameplay_live_test` they can pass while real behaviour differs.
Treat as necessary, not sufficient.

**Real game (`npm run dev`).**
- **Risk 3, end to end (Singleplayer — no server-port issue):** Team mode, bots 400, small map,
  `maxTimerValue` 1 min. At expiry confirm the modal. Then repeat, letting your own player die first, to
  hit the raw-"Bot" label path.
- **Risk 1, honest repro (needs a non-Singleplayer game):** private lobby, 1-min timer, small map, one
  human staying tiny. **Owner declined this (R5) — port 3001 collision with their own dev server.**
  Accepted residual.
- ⚠️ Port conflict, real: the dev server binds **3001/3002** and an occupied 3001 silently kills worker
  0 (`EADDRINUSE` swallowed in `Worker.ts`) ⇒ empty public lobbies, which looks like a code bug and
  isn't. The owner's dev client on **9000** is separate, but a second full `npm run dev` **will** collide
  on 3001.

Sequencing: risk-1 fix + tests → risk-3 display fix + tests → Singleplayer live check → `npm test` +
`npm run lint`.

## 6. Everything in the brief that is wrong

1. **`:31-39` "Change 2 — `GameImpl.makeWinner()`" — inverted.** Pre-PR was `return;` (undefined).
   `de2fd00` does not touch `GameImpl.ts`.
2. **`:44` "Before the fix, a bot winning called `makeWinner(botPlayer)` → `["opponent", botName]`" —
   false.** True only between `0b8528c` and `db5029d`, both inside the same PR series.
3. **`:115` "the most likely live regression" — false premise.** The path is original to the fork.
4. **`:44` "The game ends (`this.active = false`)" — misleading.** That only removes the win-check
   execution; the game does not end.
5. **`:57` "Find all callers of `setWinner()` that pass a `Player`"** — there is exactly one,
   `WinCheckExecution.ts:59`.
6. **Risk 1 scope too narrow** — Nations (`FakeHuman`) hit the identical path and are present in public
   FFA.
7. **`:91` prescribed revert for risk 3 is wrong** — it would reintroduce the Singleplayer Team stall
   PR #77 fixed.
8. **`:50` "an outcome with no meaningful product interpretation"** — for a live player it renders as
   the standard solo loss screen. Only the dead-player path is defective.
9. **Line numbers drift** — `makeWinner` is `667-694` (guard `678-687`), not `679-688`; the Team guard is
   `94-99`, not `94-98`.
10. The brief never mentions **the lost match-end XP**, which is the largest live consequence of risk 1.
11. **Dependency note is correct** — no task gate; the only in-text gate is `:88`, risk-2-only.

## Open questions

**Q1 — does the task survive?** *(Rec: keep, drop to Medium.)*
**Q2 — Risk 1 fix shape:** (a) guard only, or (b) guard plus timer-expiry award. *(Rec: (a) now,
(b) as a follow-up brief.)*
**Q3 — Risk 2's `:88` decision**, and should it be split out?
**Q4 — is the current Singleplayer risk-3 behaviour actually wrong?**
**Q5 — live verification of risk 1 needs the owner's dev server stopped.**

---

## How the owner's rulings resolve the open questions

| Q | Coder's rec | Owner ruling |
|---|---|---|
| Q1 | keep, drop to Medium | **ACCEPTED** (R1) |
| Q2 | (a) guard only now | **ACCEPTED** (R2) — (b) recorded as a candidate follow-up, not built |
| Q3 | split it out | **ACCEPTED** (R4) — own brief, carrying the corrected private-Team-plus-timer trigger |
| Q4 | live-player behaviour is fine | **ACCEPTED** (R3) — label fix only, and the brief's `:91` revert is forbidden |
| Q5 | — | **Synthetic + Singleplayer live check only** (R5). Risk 1 gets no live repro; residual accepted and must be surfaced at review |
