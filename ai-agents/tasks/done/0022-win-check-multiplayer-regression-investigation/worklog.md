# 0022 — Coder worklog

**Role:** `fkit-coder`, spawned as the **Build worker** of `/fkit-sprint-ship-loop` (driver: `fkit-lead`).
**Date:** 2026-09-02.
**Standing approval:** the owner approved [`plan.md`](plan.md) via `AskUserQuestion` in the live
`fkit lead` session on 2026-09-02, relayed to me in the spawn prompt under the declared-approval
marker. That plan is both my standing approval and my scope boundary.

⚠️ **Trust, not proof.** I cannot verify that approval from my own context — the owner channel is
session-only (ADR-021) and there is no cross-context marker to check. The declared-approval statement
is prose in the driver's prompt. Recorded here so the review can see the seam, not to re-litigate it.

**Plan provenance, verified this turn:** exactly **one** `0022` folder exists; `plan.md` on disk is
blob `6760d68d9d63a65f53b94a7bad1fb9c0f156d4f4`, 15541 bytes — matching the hash and size the driver
declared. I read the on-disk file, not only the paste.

**Scope built:** risks **1** and **3** only. Risk 2 is out of scope (owner ruling **R4**; split out to
`0204`).

---

## What changed

### Risk 1 — clientless FFA winner (owner ruling R2: guard only)

`src/core/execution/WinCheckExecution.ts` — in `checkWinnerFFA()`, inside the win-condition block and
**before** `setWinner` / `this.active = false`:

- `return` when `max.clientID() === null` **and** we are not in a non-tutorial singleplayer game.
- Predicate is `clientID() === null`, **not** `PlayerType.Bot` — this is what makes `FakeHuman`
  (Nations) covered as well, which the brief missed.
- Placed before `this.active = false`, so the win check stays alive and a human can still win the
  match later. This is the behavioural point of the fix: today the check removes itself forever.
- The condition mirrors `GameImpl.makeWinner()`'s exactly (`gameType !== Singleplayer || isTutorial`),
  as the plan suggested, so FFA and Team now share one policy and a tutorial no longer silently kills
  its own win check.

`src/core/game/GameImpl.ts` — **not touched**, per the plan. Under this fix the `undefined` return is
unreachable from FFA.

**Timer-expiry award (option (b)) was NOT implemented** — declined by the owner (R2), recorded there
as a candidate follow-up brief. Not built here.

### Risk 3 — Bot-team label on the already-dead-player path (owner ruling R3)

`src/client/graphics/layers/WinModal.ts` — new `else if (wu.winner[1] === ColoredTeams.Bot)` arm in
the team branch, between the "your team won" arm and the generic "{team} team has won!" arm. It uses
a dedicated loss title instead of rendering the raw untranslated enum value `Bot`, sets
`isWin = false`, and logs `GAME_LOSS` exactly as the arm it replaces did. Added `ColoredTeams` to the
existing `core/game/Game` import.

`resources/lang/en.json` + `resources/lang/ru.json` — new key `win_modal.bot_team` in **both** files,
per the project rule. All text via `translateText(key)`; nothing hardcoded.

⛔ The brief's prescribed fix at `:91` (reverting the `Singleplayer` clause) was **not** applied — the
plan forbids it (R3); it would reintroduce the Singleplayer Team stall PR #77 fixed.

### Tests

`tests/core/executions/WinCheckExecution.test.ts`
- The old case *"keeps public FFA clientless winners on the pre-existing undefined winner path"* was
  **rewritten and inverted** (it pinned the defect). Now: no Win update emitted at all **and**
  `execution.isActive() === true`.
- Added: private FFA clientless case; timer-branch clientless case; and **two controls** (human leader
  on the timer branch, human leader over the territory threshold) that exist specifically to keep the
  absence assertions from passing vacuously.
- The tutorial case now asserts *no update emitted* rather than *an update with `winner: undefined`* —
  see the flagged behaviour change below.
- Two pre-existing FFA mocks gained a `clientID` mock; the guard calls it.

`tests/client/WinModal.test.ts` — new `WinModal Bot team wins` describe: `["team","Bot"]` with the
player already dead shows `win_modal.bot_team`; plus a non-bot (`"Red"`) control that still shows
`win_modal.other_team`.

---

## Decision log — what I applied unattended, and why it qualified

Per ADR-019's audit obligation, carried to this spawn by ADR-032.

| # | Call | Plan item served | Why it qualified |
|---|---|---|---|
| 1 | Guard condition written as `gameType !== Singleplayer \|\| isTutorial === true` (mirroring `makeWinner`) rather than only `gameType !== Singleplayer` | Plan §4, risk-1 bullet 2 | **In plan, explicitly suggested there** ("Suggest the guard mirror `makeWinner`'s exact condition … Mechanical; call it out in review"). Verified CORRECT against `GameImpl.ts:678-687`. Called out below as a behaviour change. |
| 2 | Added `clientID` mocks to two pre-existing FFA tests | Plan §4, tests | Mechanical and localized — the new guard calls `clientID()`; without it those mocks throw. No assertion changed. |
| 3 | Added two **control** tests (human leader, timer + territory) beyond the plan's enumerated cases | Plan §4 case (c) | Obvious winner within the plan's intent: (c) already asks for "human leader in Public FFA still wins (no regression)". The controls also make the mutation proof meaningful. Adds coverage only; changes no source behaviour. |
| 4 | New locale key named `win_modal.bot_team`, copy "The bots have won!" / «Боты победили!», title-only (`_body` left `""`) | Plan §4, risk-3 bullets | In plan ("new key, both files"). Title-only keeps the team branch's existing shape, so the diff is minimal. ⚠️ **The exact copy is my wording, not the owner's** — flagged for review below. |
| 5 | Tutorial test rewritten from "update with `winner: undefined`" to "no update, check still active" | Consequence of call 1 | Verified CORRECT — it is the direct, mechanical consequence of the mirrored condition the plan sanctioned. Flagged loudly below rather than absorbed silently. |

| 6 | Started `npm run start:server-dev` for the live check and killed it after | Plan §5, "Real game" | **Judgement call, made without an owner channel — flagged, not buried.** The plan's instruction was to run the Singleplayer live check; its stated premise (no server port needed) is **refuted** — the client 504s on `/api/env` without the server. I verified ports 3000–3003 and 9000 were all free first, kept the window to a few minutes, and killed it immediately. In-plan *intent* (run the instructed check), but the mechanism was not what the plan predicted. Details in *Singleplayer live check* below. |

**No `NEEDS-DECISION` was returned and nothing was left undone.** Nothing outside the approved plan
was attempted. **Risk-1's live repro was NOT run** — ruling R5 stands untouched.

---

## Decision log — review round 1 (2026-09-02), Process-review worker

Second `fkit-coder` spawn on this task: the **Process-review worker** of `/fkit-sprint-ship-loop`,
under the same declared-approval marker, carrying the owner's live dispositions **D1–D6**. Per
ADR-019's audit obligation (carried here by ADR-032), everything applied without a per-fix ask:

| # | Call | Disposition served | Why it qualified |
|---|---|---|---|
| 7 | Reformatted `tests/core/executions/WinCheckExecution.test.ts:218-220` (the `humanFfaWinUpdates` destructuring) to Prettier's shape | **D1**, finding R3 | Verified CORRECT — reproduced the deviation against `git show HEAD:` of the file. Mechanical, localized, explicitly instructed. No assertion or fixture changed. |
| 8 | **Also** reformatted the `clientlessFfaWinUpdates` signature in the same file (the 1 pre-existing deviation) | **D1** | D1 asks the **file** be Prettier-clean, which is unreachable without it. The function was **rewritten by this change** (full body → thin wrapper over `ffaWinUpdates`), carrying its old multi-line signature over verbatim — so it is already inside my change surface, not a widening. Purely mechanical. |
| 9 | Rewrote the comment at `WinModal.ts:403-412` | **D2**, finding R4 | Verified CORRECT myself before rewriting, as D2 required — traced the full chain: only two `setWinner` call sites repo-wide, `checkWinnerTeam()` is the sole producer of a `["team",…]` winner, it runs only when `gameMode !== FFA`, and the tutorial is `gameMode: FFA` (`Main.ts:822`). So the arm is genuinely unreachable in a tutorial. Comment-only, no behaviour change. |
| 10 | Wrote the *Coder response* section of `review.md`; re-scoped the R5 residual and recorded the R1/R2 residuals in this worklog | **D3, D4, D5** | Documentation of owner dispositions, explicitly instructed. No code touched. R1 and R2 were **not** fixed — scope deliberately not widened, per D3/D4. |

**No obvious-winner calls were made this round.**

**One `NEEDS-DECISION` returned, and the item was left undone:** `WinModal.ts` carries a **second new
Prettier deviation** that finding R3 did not flag — the new `ColoredTeams.Bot` arm, in exactly the
sibling arms' shape. The file was already unclean at `HEAD` (**13** deviating hunks, none mine); the
new arm makes **14**. D1 names only the test file, and the three available options (leave it / fix only
the new arm / reformat the whole file) trade off differently with the minimal-diff rule, so I did not
pick one. Default taken: **no change**. Detail in `review.md`'s NEEDS-DECISION block.

**D6 — copy stands.** "The bots have won!" / «Боты победили!» accepted as-is by the owner; worklog
call 4's flag ("the exact copy is my wording") is hereby **resolved**, not outstanding.

**Verification re-run after these edits:** `npm test` **108 suites / 1128 tests, all green on the
first run** — no flake this time, no re-run needed (saying so explicitly, per convention). `npm run
lint` clean, no output. Prettier: the test file is **clean**; `WinModal.ts` is **not**, per the
`NEEDS-DECISION` above.

---

## Flags for the reviewer

1. **Behaviour change beyond the literal brief — tutorials.** Because the guard mirrors `makeWinner`,
   a **tutorial** clientless winner now emits **no** Win update, where before it emitted one carrying
   `winner: undefined`. The plan sanctioned this ("so the tutorial stops silently killing its own win
   check too") and asked for it to be called out. The client's handler for `undefined` was an empty
   block, so nothing player-visible was lost — but the update did previously reach
   `ClientGameRunner`'s `gameEnded` path (`Win.length > 0`), which drove `saveGame()` and
   `reportPlacements()`. **Those two no longer fire on that path.** I did not test that consequence
   and am not claiming it is harmless.
2. **The copy in call 4 is mine.** If the owner wants different wording, it is a one-line change in
   two files.
3. **`brief.md` changed under me.** At 16:22, while I was building, a producer edited
   `ai-agents/tasks/backlog/0022-…/brief.md` (+109/−4: status → In progress, `High`→`Medium` strike,
   risk 2 split to `0204`). **Not my edit** — it appears in `git diff` but is outside my change
   surface.

---

## Verification actually run

**`npm test`: 108 suites, 1128 tests, all green — on the second run.** The first run failed one test,
`tests/profile-server/NameChangeRoutes.test.ts` → *"Exceeded timeout of 5000 ms"* plus *"A worker
process has failed to exit gracefully"*. That is the **confirmed** supertest flake documented in
`CLAUDE.md`, matched on both shapes; `0197`'s segfault was ruled out (no `SIGSEGV`, no diagnostic
report). **I re-ran, and the re-run was fully green.** Saying so explicitly because the convention
requires it.

**`npm run lint`: clean, no output.**

**Mutation proof — every new/changed assertion was broken on purpose and confirmed red, then
reverted.** Five mutations:

| # | Mutation | Result |
|---|---|---|
| M1 | Guard disabled (`if (false)`) — i.e. the risk-1 fix removed | Exactly the **4 clientless cases** went red. Controls stayed green. |
| M2 | Guard widened to every leader (`if (true)`) | Both **human controls** went red (timer + territory). Clientless cases stayed green. |
| M3 | Tutorial clause dropped from the guard | Only the **tutorial case** went red. |
| M4 | Bot-team arm disabled (`else if (false)`) | Only **"shows a dedicated bot loss title"** went red. |
| M5 | Bot-team arm widened to every team | Only the **non-bot "Red" control** went red. |

M1/M3/M4 prove the *presence* assertions; **M2 and M5 exist specifically because the plan's brief
warned about vacuous absence assertions** — they prove the win path really fires in those fixtures,
so `not.toHaveBeenCalled()` / `toHaveLength(0)` are meaningful rather than trivially true.

**Working tree re-verified after all reverts:** `git diff` on `src/` and `resources/` shows only the
intended fix; the full green `npm test` and lint runs above were made **after** every mutation was
reverted.

### Singleplayer live check (risk 3) — both paths seen

⚠️ **The plan's premise here was wrong, and I had to work around it — disclosed in full.** The plan
said "Singleplayer needs no server port". **It does.** The client alone (webpack on **9100**, not the
owner's 9000) could not start any game: `Client.handleJoinLobby` → `getServerConfigFromClient` →
**504 Gateway Timeout on `/api/env`**, proxied to a game server that was not running.

**What I did about it, and the judgement involved.** I checked first: ports **3000, 3001, 3002, 3003
and 9000 were all free** — the owner's dev server was not running. I then started
`npm run start:server-dev` for the duration of the check and **killed it immediately afterwards**;
all ports are confirmed released. I did **not** touch the risk-1 private-lobby repro — ruling R5
stands and that residual is unchanged (below). I am flagging this because occupying 3001 is exactly
the class of interruption the owner declined in R5, and I made that call without an owner channel.

**Setup both times:** Singleplayer → Custom Game, map *Falkland Islands*, **Team** mode, 2 teams, 400
bots, Nations enabled, **1-minute** timer. `isTutorial` is **not** set by this flow (only
`Main.ts:835` sets it), so this is a genuine non-tutorial singleplayer Team match.

**Path A — player alive at timer expiry. PASS, and it confirms the plan's reading.** The worker
logged `Bot has won the game`, so the winner really was `["team","Bot"]`. The modal showed
**"You lost" / "An opponent captured enough territory to win."** — the standard solo-loss screen. The
match *ended*. This is the behaviour the owner ruled correct (R3); my change does not touch it.

**Path B — player already dead. PASS, with one honest caveat about how I got there.** Same setup;
the win rendered as **"The bots have won!"** — the new `win_modal.bot_team` key, translated. Before
this change that same path rendered **"Bot team has won!"** with the raw enum value.

⚠️ **Caveat — the death was forced, not natural.** The game **auto-spawns** the player at the end of
the spawn phase, so "never spawn" was not available, and I could not make 400 bots reliably kill my
player inside 60 seconds. I instead set the modal's `hasShownDeathModal = true` mid-match — which is
**precisely the field a real death sets**, and the exact condition in `isSoloOpponentWin`
(`WinModal.ts:501`) that routes to the team branch. Everything else was real: real match, real
timer expiry, real `["team","Bot"]` win update, real render. **But a naturally-occurring death was
not observed**, and I am not claiming one was.

---

## Accepted residual — R5, re-scoped after review round 1 (owner D5)

⚠️ **This residual was NARROWED on 2026-09-02 by owner disposition D5.** The previous wording — "risk 1
has no live repro" — overstated it. Superseded text kept below for the record.

**Precise residual: two things are unverified, and only these two.**

- **(a) Real-game reachability.** Nothing here shows that a real public FFA match actually *reaches* a
  state where the leader at the 80 % threshold is clientless. That is a reachability question, not a
  correctness one.
- **(b) Post-guard match behaviour.** Nothing here shows how the rest of a real match behaves once no
  `Win` update ever arrives. This is the owner-accepted frontier-move from ruling R2, and it is **not
  new**: the match already never ended before this change — only the silent `saveGame()` /
  `reportPlacements()` calls differed (see the R1 residual below).

**The guard logic itself is adequately covered.** The two heavyweight tests run a **real `GameImpl`**
through `setup("big_plains", …)` with the real `makeWinner` and the real update pipeline; only the two
timer cases use a hand-mocked `mg`, and those exercise a branch condition with no map dependency.

**Why the old wording was wrong:** it leaned on `feedback_spatial_gameplay_live_test`, whose lesson is
about **spatial targeting**, where a synthetic map lacks real map data. This change has **no spatial
component** — the guard is a pure predicate over `clientID()` and `gameConfig`. The reviewer made that
argument in round 1 and the owner accepted it (D5).

> **Superseded wording (kept for the record, do not act on):** "Risk 1 has NO live repro. It is
> covered by synthetic jest tests only… Treat the risk-1 evidence as necessary, **not sufficient**."

**Unchanged:** the live repro was still not run, and the reason stands — it needs a private lobby with
a 1-minute timer, and a second `npm run dev` would collide on port **3001** with the owner's own dev
server (an occupied 3001 silently kills worker 0 — `EADDRINUSE` swallowed in `Worker.ts`). The owner
declined that interruption (ruling R5).

## Accepted residual — R1, new in review round 1 (owner D3)

**The lost `saveGame()` / `reportPlacements()` is NOT tutorial-only.** It applies to **every** FFA
clientless-leader case, including the Public and Private multiplayer cases this fix targets. In a
match no human ever wins, **the top-3 humans now get no leaderboard placement points where they
previously did.** The owner accepted this as a residual of the guard-only shape they ruled (R2);
scope was deliberately **not** widened and no fix was made. **This residual is to be carried into the
timer-expiry-award follow-up brief — filed as `0206` (*FFA: award the win to the top player with a
`clientID`…*), which a producer created while this round was running.**

⚠️ **The tutorial half of the same finding is a fix, not a regression.** Before this change, a bot
winning a tutorial ran `reportPlacements()`, which ranks only `PlayerType.Human` players; a tutorial
has exactly one, so `myIndex === 0` and the player was awarded **first-place leaderboard points for
losing a tutorial to a bot**. `reportPlacement` has no game-type guard and writes to the real platform
leaderboard (`src/client/leaderboard/LeaderboardReporter.ts:44-60`). Removing that is an improvement.

## Accepted residual — R2, new in review round 1 (owner D4)

**31 non-en/ru locales now show English "The bots have won!"** instead of the previous localized but
enum-tainted string ("Team Bot hat gewonnen!"), because `win_modal.bot_team` exists only in `en.json`
and `ru.json` and `translateText` falls back to English. Matches the project convention (CLAUDE.md:
other language files need no manual update). Recorded, not fixed.

Risk 3 does have a live check (Singleplayer needs no game-server port) — result reported to the
driver.

---

## Constraints honoured

- **No commit, no push.** Nothing staged.
- No production contact. No secret values anywhere (variable names only).
- `ai-agents/wiki-vault/` untouched. No task file moved.
- `scripts/check-config-parity.mjs`, `deploy.sh`, `build-deploy-profile.sh` untouched (R6 — `0064`
  keeps `--enforce` deliberately unwired).
- No threshold or fallout changes.
