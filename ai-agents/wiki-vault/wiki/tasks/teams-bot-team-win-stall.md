# Teams Bot-Team Win Stall — resolution policy (task 0205)

**Source**: `ai-agents/tasks/backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md`
**Status**: backlog
**Sprint/Tag**: Backlog — unscheduled, on `sprints/backlog.md`. Ready work; **nobody is building it**

> ✅ **The premise was CONFIRMED by simulation on 2026-09-03.** In Team mode the aggregate Bot team
> can lead and the match becomes unwinnable — measured, not reasoned.
> ⚠️ **Production frequency is still UNMEASURED.** This is a **simulator result, not a field
> observation**: no telemetry, no player report on file. Nothing here licenses calling it a confirmed
> live incident.

## Goal

Split out of task `0022` (risk 2) on owner ruling **R4**, 2026-09-02, because it needed a policy
decision that risks 1 and 3 did not.

In Team mode, `WinCheckExecution.checkWinnerTeam()` ranks teams by tile count. When the win condition
fires and the leading team is `ColoredTeams.Bot`, the guard `return`s **above** `this.active = false`,
so the check is never deactivated — it simply retries forever. **Not a hang and not a crash:** the
match keeps running normally, it is just **unwinnable for as long as the Bot team leads.**

**Pre-existing, not a PR #77 regression.** `if (max[0] === ColoredTeams.Bot) return;` predates
`0140-solo-win-condition-fix`; that PR only appended `&& gameType !== GameType.Singleplayer` so the Bot
team could win in Singleplayer. The multiplayer stall is exactly what the code did before.

**Why the Bot team has territory at all:** every `PlayerType.Bot` player is routed to `botTeam` in Team
mode, and public lobbies configure `bots: 400` (`src/server/MapPlaylist.ts:169`) — a single aggregate
team holding the tiles of up to 400 bots against human teams of a handful each.

## Key Changes

**Nothing is built. Every entry below is a ruling or a finding, not a code change.**

### ✅ Empirical findings — 2026-09-03, headless deterministic simulation

Run at the owner's explicit request by an `fkit-coder`. **Method, stated so the limits are readable:**
the real **World** map (**651,609 land tiles**), **400 bots**, **`DefaultConfig` — not `TestConfig`**.
Human team slots **idle by construction** (the owner's requested method) outside the activity sweep.

| Finding | Result |
|---|---|
| **Bot team tops the ranking, no winner is ever set** | Duos / Trios / Quads **with a timer**: bot team on top **12/12**, `setWinner` called **0/12**, win check still `active` **12/12**. Bot team ≈ **595k** tiles vs best human team ≈ **5k** |
| **The guard is proven CAUSAL, not correlated** | Identical board with `gameType: Singleplayer` → `setWinner("Bot")`, `active = false`, **3/3**. **Only the `gameType !== Singleplayer` clause differs** |
| **The 95 % territory route is reachable FAST** | Under idle humans the bot team crosses 95 % at **ticks 6180–9480 ≈ 7–10 minutes of real play**, **12/12**, on the shipped **public** config (`maxTimerValue: undefined`) |
| **The defect is PASSIVITY-DEPENDENT, not unconditional** | Activity sweep over **40 team slots**: **0–20 % active → bot team leads 3/3 each**; **40 % → 1/3**; **60–100 % → 0/3**, matches resolve normally. **Crossover lies between 20 % and 60 %** |
| **`HumansVsNations` is EXEMPT — and only incidentally** | The one public Team config that resolves: `disableNPCs` is false there, so **61 Nations** on a named team take ≈ **619k** tiles and win, **4/4**. ⚠️ **It does not disprove the defect, it sidesteps it** |

🚩 **Two corrections this evidence forces, and neither may be dropped in retelling:**

1. **"The territory route is rare" is NOT supported as written.** It is rare **because humans play**,
   not because 95 % is hard to reach. That changes what verification step 1b must prove: exercise the
   **public** config, not only a synthetic board forced to 95 %.
2. ⚠️ **The 40 % figure is NOT the human threshold.** "Active" here was `FakeHumanExecution` at
   **Medium**, which plays **better than a casual human**, so **the real-world crossover is probably
   HIGHER than 40 %.** Do not quote 40 % as a human number.

⚠️ **Limits, recorded honestly — not footnotes:** single map (`world`), no other exercised; humans idle
by construction outside the sweep; **production frequency still unmeasured.**

### 🚩 Mechanism correction — right outcome, wrong path

The brief claimed `maybeAssignTeam()` puts Nations on named teams. **The outcome is right; the
mechanism was wrong.** Nations get their team from **`assignTeams()`** (`src/core/game/GameImpl.ts:170`
→ `src/core/game/TeamAssignment.ts`) and **never reach `maybeAssignTeam()` at all** — only bots do, via
`SpawnExecution`. **Anyone planning by symbol must look in `TeamAssignment.ts`.** Corrected on the
brief 2026-09-03 by an architect pass; recorded in the vault at [[systems/glossary]] §2.

### The 3-hour cap is NOT a safety net

`GameServer.ts:56` finishes a stalled match at 3 hours, and a private game also ends when all clients
disconnect (`:876-882`). 🔴 **Neither path runs `handleWinner`**, so the match ends with **no winner and
no match-end XP for anyone** — **exactly the outcome rejected option 3 was rejected for**, arriving
anyway via the stall. It strengthens the case for the chosen policy; it does not weaken it.

### Owner rulings that govern the build

| Ruling | Date | Content |
|---|---|---|
| **Resolution policy** | 2026-09-02 | **The next-highest HUMAN team wins.** ⛔ Option 1 (Bot team wins) and option 3 (no winner) are **REJECTED and must not be re-opened** — option 3 sends no `winner` message, so `creditMatchXp` never runs and it would repeat the very defect class being fixed |
| **The measure** | 2026-09-02 | **Territory — tile count.** Chosen because the win thresholds are already territory-based and players read territory as the score. ⛔ **Not** because it is the existing `checkWinnerTeam()` ranking — that was explicitly not the argument |
| **Branch scope** | 2026-09-02 | **BOTH branches — timer AND the 95 % territory threshold**, ruled once for `0205` and `0206` together so the two functions stay on one policy |
| **Winner predicate** | 2026-09-03 | **ADR-110 accepted, one policy across both modes** — an AI player may win; predicate stays `clientID() !== null` with **no `PlayerType.AiPlayer` exclusion**. See [[decisions/adr-110-ai-winner-allowed]] and read its **expiry** before relying on it |
| **Priority held** | 2026-09-03 | **Low–Medium, HELD against the empirical evidence.** ⚠️ Not inertia — weighed and held. Owner's reasoning: the passivity dependence **supports** the rank, because busy public lobbies are safe (60 %+ activity → 0/3 stalls), so the realistic trigger stays **private and quiet lobbies** |
| **Board placement** | 2026-09-02 | Stays on `backlog.md`, unscheduled — reviewed after the policy ruling unblocked it and **deliberately left**. Not a scheduling miss; do not "fix" it by promoting it |

## Outcome

**Unblocked since 2026-09-02, unstarted, unscheduled.** Nothing gates it.

🚩 **Two questions remain OPEN, to be settled in the plan and approved before code — neither blocks
starting:**

- **(a) Tie-breaking** between human teams level on tile count. Undefined today; the territory ruling
  does not imply a tie-break.
- **(b-residual) The all-Nations team.** ADR-110 settles that AI players count; it does **not** settle
  whether a team made entirely of **Nations** (clientless, `clientID === null`) may be awarded the win.
  A private Team lobby really can hand a whole named team to Nations (`HostLobbyModal.ts:42`). Award
  regardless ⇒ a team of Nations wins a real match; keep the predicate strict ⇒ **recreates the
  no-winner / no-XP wedge in exactly the private-lobby case this task exists to close.**
  📌 **The owner DELIBERATELY DEFERRED this to plan time on 2026-09-03** — same shape as the FFA
  no-eligible-winner hole, and deserving the same care. **A decision with a known shape, not an
  oversight; do not re-raise it as one.**

**Two conditions ride with the both-branches ruling and are part of it, not caveats to drop:** plan it
as the **materially larger** behaviour change it is, and honour the **tutorial re-check** — a hard
verification step recorded on `0206`, where it bites.
✅ **`0206` shipped 2026-09-03 and DISCHARGED that re-check on the FFA side**: its fallback award
returns early on `gameType === GameType.Singleplayer`, so it is multiplayer-only and no tutorial can
reach it. ⚠️ **That discharge is `0206`'s, not this task's** — `0205` still owns its own plan-as-larger
obligation.

ℹ️ **Why the tutorial re-check does not bite here — evidence, not assumption, and now verified:** a
tutorial is created `gameMode: GameMode.FFA` (`src/client/Main.ts:823`, `isTutorial: true` at `:835`)
and `WinCheckExecution.tick()` calls `checkWinnerTeam()` only when `gameMode !== GameMode.FFA`. **The
tutorial cannot reach `checkWinnerTeam()`.** ✅ Verified against the tree 2026-09-03 (previously carried
as `unverified`). Confirm again if the plan changes which function a tutorial can reach.

**Verification the task must pass includes two steps added 2026-09-03:** the winner predicate carries
**no `PlayerType.AiPlayer` exclusion** (step 7, per ADR-110), and **`HumansVsNations` still resolves as
it does today** (step 8) — it resolves **incidentally**, not by design, so it is exactly the shape a
careless fix disturbs. Step 1b must also prove the passivity dependence is **preserved, not papered
over**: an active lobby (60 %+) already resolves today, and the fix must not change that path.

⛔ **Do not "fix" this by deleting the `gameType !== GameType.Singleplayer` clause** — that clause is
PR #77's fix for the Singleplayer Team stall.

ℹ️ **Filed as `0204`, renumbered to `0205`** on an owner ruling 2026-09-02: `0204` was already reserved
invisibly by a plan-carry-check hook task that exists only as prose in an fkit skill file and was never
filed as a brief. **`0204` has no task folder in this repo; never conflate the two**, and do not edit
those skill-file references.

## Related

- [[decisions/clientless-leader-win-policy]] — the three 2026-09-02 rulings this task inherits, and the FFA half of the same defect class
- [[decisions/adr-110-ai-winner-allowed]] — the winner predicate ruled for this task and `0206` alike, **with its known expiry**
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which this was split out of (risk 2)
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the misleading comment on the same predicate, filed alongside
- [[tasks/solo-win-condition-fix]] — `0140` / PR #77, whose Singleplayer fix must not be regressed here
- [[decisions/sprint-backlog]] — the board this task sits on, unscheduled and owner-confirmed there
- [[decisions/sprint-4]] — where its FFA twin `0206` was scheduled, built and closed on 2026-09-03 (agent-closed — not owner-verified; nothing run live). ⚠️ **`0206` shipping does NOT advance this task** — `checkWinnerTeam()` is byte-identical, Team mode is untouched, and `0205` stays `🔲 Backlog` and unscheduled
- [[systems/glossary]] — the team-assignment paths, the Bot team's reality, and the win-condition vocabulary this task turns on
- [[systems/execution-pipeline]] — the `Win` update path a stalled match never reaches
- [[systems/player-profile-store]] — the match-end XP crediting that the stall silently skips
- [[features/ai-players]] — Bots, Nations and AI players, the three entities this policy has to tell apart
- [[features/tutorial]] — the first-place-for-losing bug the both-branches ruling must be re-checked against; **it does not bite here**, because a tutorial is FFA and cannot reach `checkWinnerTeam()`
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the FFA twin, **shipped 2026-09-03 — and it does NOT advance this task**: `checkWinnerTeam()` is byte-identical
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, whose Part A would measure the production frequency this task's held rank currently assumes
