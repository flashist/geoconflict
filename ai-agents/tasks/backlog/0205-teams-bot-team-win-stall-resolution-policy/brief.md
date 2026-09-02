# Teams multiplayer: the Bot team can lead and make the match unwinnable — decide the resolution policy

## ID
0205

> ℹ️ **Renumbered `0204` → `0205` on 2026-09-02, on an owner ruling given live in session.** This task
> was originally filed as `0204`. That ID was allocated correctly by the rule (max across all three
> boards was `0203`), but `0204` had **already been reserved invisibly**: the plan-carry-check hook
> task is referenced repeatedly as `0204` inside
> `.claude/skills/fkit-sprint-ship-loop/SKILL.md`, which enumerates five specific honesty markers that
> `0204` must delete when the hook lands. That task was never filed as a brief, so no board could see
> it. **The rule had a blind spot; the allocation was not a mistake.** The owner ruled that renumbering
> this one new folder is cheaper and safer than editing five load-bearing markers. ⛔ **The `0204`
> references in that skill file are correct and must not be changed.**

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md), **not** on Sprint 4,
because no owner ruling scheduled it into a sprint. ~~and **it cannot start at all until the owner
rules on the resolution policy**~~ — ✅ that second reason is spent: the ruling landed 2026-09-02. The
first reason stands on its own, so the board choice is unchanged; filing it on Sprint 4 would still
assert a sprint commitment nobody made. See Notes for the full board-choice reasoning.

> ✅ **PLACEMENT REVIEWED AND DELIBERATELY LEFT — owner ruling, 2026-09-02, given live in session.**
> The owner looked at this after the resolution-policy ruling unblocked the task and **agreed it stays
> on `backlog.md`, unscheduled.** The owner also agreed with the producer's **Low–Medium** rank and its
> reasoning: the defect is **pre-existing**, its **frequency is unmeasured**, and the realistic trigger
> is **private lobbies with a timer set**.
> **This is a decision, not an oversight.** Recorded here so nobody later reads an unblocked task
> sitting on the backlog board as a scheduling miss and "fixes" it by promoting it.

## Priority
**Low–Medium — unchanged. Producer's rank, not an owner ruling.**

✅ **Re-checked 2026-09-02, after the blocker was cleared. The rank stays Low–Medium.** Clearing the
gate made this task **ready**, not more **important** — those are different axes, and only the first
one changed.

✅ **Owner-agreed 2026-09-02, given live in session.** The owner reviewed this rank and its reasoning —
pre-existing, unmeasured frequency, realistic trigger is private lobbies with a timer set — and
**agreed**. It remains **the producer's rank that the owner confirmed rather than disturbed**, not an
owner-originated ranking, and the board stays unranked (`—` in its Priority column).

- **Not a regression, and not new.** The guard that causes this predates PR #77 and has been in the
  fork the whole time. Nothing broke recently.
- **Real, and player-visible when it fires:** the match becomes unwinnable while the Bot team leads.
- **Narrow blast radius.** The realistic trigger is **private/custom Team lobbies with a timer set**;
  public Team lobbies ship `maxTimerValue: undefined` (✅ `MapPlaylist.ts:162`) and so are territory-only,
  where the 95% threshold makes it rare.
- **Frequency is still unmeasured** — no production observation, no player report on file. That is
  unchanged by the ruling.
- ~~But it is gated on an owner decision that has not been made, so it cannot be ranked as ready work
  regardless of how it compares to anything else.~~ ✅ **No longer true — the ruling landed.** Struck,
  not deleted.
- Rank it below `0022`'s risks 1 and 3, which ship without it.

## Status
🔲 Backlog

✅ **Unblocked 2026-09-02** — the owner ruled on the resolution policy (**next-highest human team
wins**; see *The resolution policy — ✅ DECIDED*). The gate that made this `🚧 Blocked` is gone.

**Nothing else gates it. Nobody is building it** — it is ready work sitting on the backlog board,
unscheduled. ~~Two things remain open but **neither blocks starting**: the precise definition of
"next-highest human team" (an open implementation question, recorded below, to settle in the plan) and
the phase-1 investigation steps, which are part of the work itself.~~

✅ **Updated 2026-09-02:** the **measure** is now ruled — **territory (tile count)**. **Struck above,
not deleted.** ~~🚩 **Three things remain open, and none of them blocks starting:**~~ **(a)** tie-breaking
between human teams level on tile count, **(b)** whether "human team" means any non-`ColoredTeams.Bot`
team or one with a real client, ~~and **(c)** whether the fallback applies **only on the timer branch**
or every tick (open since `0022`, never ruled)~~. ~~All three are~~ plan-time decisions. The phase-1
investigation steps are part of the work itself, as before.

✅ **Updated again 2026-09-02 — (c) IS NOW ANSWERED. Struck above, not deleted.** Owner ruling, given
live in session: **BOTH BRANCHES — the fallback applies to the timer branch AND the territory-threshold
branch**, in this task *and* its FFA twin
[`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md). See *The branch scope — ✅
DECIDED* below.
🚩 **TWO things remain open — (a) and (b) — and this ruling does NOT touch either.** Neither blocks
starting; both are plan-time decisions that must be settled in the plan and approved before code.

## Owner
fkit-coder

---

## Context

**Split out of [`0022-win-check-multiplayer-regression-investigation`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md)
on an owner ruling given live in session, 2026-09-02** (recorded as ruling **R4** in
[`0022`'s plan](../../done/0022-win-check-multiplayer-regression-investigation/plan.md)). `0022` carried three
risk surfaces. Risks 1 and 3 are being built now. **Risk 2 — this task — needs an owner decision that
risks 1 and 3 do not, so it was split out rather than allowed to hold them up.**

### The defect

In Team mode, `WinCheckExecution.checkWinnerTeam()` ranks teams by tile count. When the win condition
fires and the leading team is `ColoredTeams.Bot`, the guard returns **before** the winner is set:

```
if (
  max[0] === ColoredTeams.Bot &&
  this.mg.config().gameConfig().gameType !== GameType.Singleplayer
) {
  return;
}
this.mg.setWinner(max[0], this.mg.stats().stats());
this.active = false;
```

Because the `return` is **above** `this.active = false`, the win check is **not** deactivated — it
simply retries on its next scheduled run. **This is not a hang and not a crash.** The match keeps
running normally; it is just **unwinnable for as long as the Bot team leads**.

✅ **Producer-verified 2026-09-02** against the working tree: `src/core/execution/WinCheckExecution.ts`,
guard at `:109-114`, `setWinner` at `:115`, `this.active = false` at `:117`.
⚠️ **These line numbers drift.** A coder is editing this same file right now for `0022`'s risk-1 fix;
the guard sat at `:94-99` before that edit and has already moved once. **Locate it by symbol, not by
line.**

### It is pre-existing, not a PR #77 regression

`if (max[0] === ColoredTeams.Bot) return;` **predates** `0140-solo-win-condition-fix` (PR #77). That PR
only **appended** `&& gameType !== GameType.Singleplayer` to it, to let the Bot team win in
Singleplayer. The stall in **multiplayer** is exactly what the code did before, unchanged.

### Why the Bot team has territory at all

`GameImpl.maybeAssignTeam()` routes **every** `PlayerType.Bot` player to `this.botTeam`
(`ColoredTeams.Bot`) in Team mode, while human players are hashed across the named teams.
✅ Producer-verified: `src/core/game/GameImpl.ts:463-472`, `botTeam` declared `:83`, and the Bot team is
included in `teams()` at `:700`. Public lobbies configure **`bots: 400`**
(✅ `src/server/MapPlaylist.ts:169`). So in Team mode the Bot team is a single aggregate holding the
tiles of up to 400 bots, competing against human teams of a handful of players each.

> Note: Nations (`PlayerType.FakeHuman`) are **not** on the Bot team — `maybeAssignTeam` hashes them
> onto a named player team like any non-Bot player. And in public Team lobbies they are usually absent
> entirely: `MapPlaylist.ts:165` reads
> `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations`, which is **true** for
> ordinary public Team games. ✅ Producer-verified. This is the one place where `0205`'s scope is
> **narrower** than `0022`'s risk 1, which does cover Nations.

---

## ⚠️ The corrected trigger — read this instead of `0022`'s

**`0022`'s brief emphasises the 95% territory route. That route is rare and is not the realistic
shape.** Correcting it is a required part of this split (owner ruling R4).

| Route | Reachable? | Realistic? |
|---|---|---|
| **Territory threshold** — Bot team exceeds `percentageTilesOwnedToWin()` | Yes | ⚠️ **Rare.** In Team mode that threshold is **95%** (✅ verified, `src/core/configuration/DefaultConfig.ts:713-718` — `return 95` for `GameMode.Team`, `80` otherwise). The Bot team holding 95% of non-fallout land means the humans are already effectively wiped out. |
| **Timer expiry** — `maxTimerValue` elapses and whoever leads "wins" | Yes | ✅ **This is the realistic one.** At expiry the aggregate 400-bot single team plausibly outsizes any one human team, the guard fires, and **the timer expires with no winner — permanently**, because the check stays active and just keeps re-hitting the same guard. |

**The timer route is private/custom lobbies only.** Public lobbies ship `maxTimerValue: undefined`
(✅ verified, `src/server/MapPlaylist.ts:162`), so public Team games are territory-only. The timer is
**host-settable** in a private lobby — ✅ verified, `src/client/HostLobbyModal.ts:773-774`
(`maxTimerValue: this.maxTimer === true ? this.maxTimerValue : undefined`), with the same pattern in
`src/client/SinglePlayerModal.ts:567`.

**So the shape to design for is: a private Team lobby with a timer set.** Not the 95% wipeout.

⚠️ **Unverified — needs measuring during the investigation phase:** *how often* the aggregate Bot team
actually out-tiles the leading human team at a typical timer expiry. The reasoning above is
structural, not measured. Nobody has observed this in production or reproduced it live, and no player
report is on file. **Do not present it as a confirmed field incident.**

---

## The resolution policy — ✅ DECIDED

### ✅ Owner ruling, 2026-09-02, given live in session

> **The next-highest human team wins.**

**Owner's reasoning, as given:** the timer exists to end the match, and a human team gets a real
result. **Match-end XP still credits normally** — which is the decisive point: this option keeps the
match ending through `handleWinner`, so `creditMatchXp` runs. The producer had flagged that the
"no winner after timeout" option would **silently drop match-end XP for everyone**; the owner picked
the option that avoids repeating that defect class (the same one `0022`'s risk 1 is fixing for FFA).

**This was the blocking decision, and it is now made.** Carried verbatim from `0022`'s brief, "What to
Build" → risk 2, the gate now satisfied:

> **"Decide the resolution policy with Mark before implementing."**

### ⛔ Rejected options — recorded so nobody re-opens this

| Option | Verdict | Why rejected |
|---|---|---|
| **1. The Bot team wins.** Simplest; consistent with the Singleplayer behaviour PR #77 introduced. | ⛔ **Rejected** | It ends a multiplayer Teams match with "Bot team has won" — exactly the outcome the existing guard was written to prevent. Not a real result for the players. |
| **2. The next-highest *human* team wins.** | ✅ **CHOSEN** | The timer exists to end the match, and a human team is a real result. Match-end XP credits normally because the match still resolves through `handleWinner`. |
| **3. No winner after a timeout** — the match resolves as a draw / no-result. | ⛔ **Rejected** | A match ending with no winner sends no `winner` message to the server, and `creditMatchXp` (`GameServer.ts:1253`, **sole** call site `:1199`) runs **only** from `handleWinner` — so this would **silently drop the whole match's match-end XP, for every player.** ✅ Producer-verified (call site and sole-caller claim). Same defect class as `0022`'s risk 1. |

### The measure — ✅ DECIDED. Two sub-questions remain OPEN.

#### ✅ Owner ruling, 2026-09-02, given live in session

> **"Next-highest human team" is measured by TERRITORY — tile count.**

**Owner's reasoning, as accepted:** it matches how the win condition already works everywhere else —
the 80 % / 95 % thresholds are territory-based (`src/core/configuration/DefaultConfig.ts:713-718`) —
and **players already read territory as the score**. Ranking the fallback by anything else would make
the winner disagree with what the game has been showing all match.

This also lines up with `checkWinnerTeam()`'s existing ranking, which is by tile count. ⛔ **But that
was never the argument** — the earlier note in this brief explicitly warned against treating tile count
as decided just because it is the existing ranking. It is decided now because the **owner ruled it**,
on the reasoning above.

~~**"Next-highest human team" is not yet precisely defined, and the producer is not defining it.** The
ruling settles the *policy*; the *measure* is an implementation decision that still needs an answer
before code is written:~~ ✅ **The measure is now answered. Struck, not deleted.**

- ~~Ranked by **territory (tile count)**, matching how `checkWinnerTeam()` already ranks teams? Or by
  **troops**, or some other measure?~~ ✅ **ANSWERED — territory (tile count), owner ruling 2026-09-02.**

#### 🚩 STILL OPEN — the ruling does NOT settle these two, and neither is answered by the producer

- **(a) Tie-breaking** when two human teams are level on tile count — **undefined today.** The
  territory ruling does not imply a tie-break. Settle it in the plan and get it approved.
- **(b) What "human team" means** — *any* team that is not `ColoredTeams.Bot`, or specifically a team
  with at least one real client? (Relevant if Nations are ever on a named team — see the Nations note
  above: `maybeAssignTeam` hashes them onto named teams, though they are usually absent from public
  Team lobbies.) **Not ruled on.**

~~⚠️ **Also still open from `0022`, and never ruled on:** whether the human-team fallback should apply
**only on the timer branch**, not on every tick, so a match is not ended prematurely. `0022` suggested
timer-only; **no ruling exists.**~~ ⚠️ **This has an FFA twin** — the same branch-scope question was open
on [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md), where a timer-only answer
would close nothing in public FFA (public lobbies ship `maxTimerValue: undefined`,
`src/server/MapPlaylist.ts:162`). ~~**Consider ruling both at once**; a split answer leaves Team and FFA
with inconsistent win-fallback policies.~~ ✅ **They WERE ruled at once — see immediately below. Struck,
not deleted.**

### The branch scope — ✅ DECIDED

#### ✅ Owner ruling, 2026-09-02, given live in session

> **BOTH BRANCHES. The fallback award applies to the timer branch AND the territory-threshold branch.**

**Ruled once, deliberately, across BOTH this task (`checkWinnerTeam()`) and
[`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md) (`checkWinnerFFA()`)** — to keep
the two functions on a **consistent policy**, which `0022`'s own notes warn against splitting.

**Owner's reasoning, as given:** both-branches is **the only option that actually closes the public-FFA
XP loss** — the main mode, and the original defect. That reasoning is FFA-shaped, and the Team half of
the ruling follows from **consistency**, not from a separate Team-side measurement. ⚠️ **Recorded
honestly:** in Team mode the threshold branch is the **95 %** route this brief already calls **rare**
(✅ `src/core/configuration/DefaultConfig.ts:713-718`), so widening to it changes little in practice
here — **the consistency is the point, the Team-side impact is not measured.**

⚠️ **Two conditions carried WITH the ruling — part of it, not caveats to drop:**

1. ⚠️ **It is a materially larger behaviour change than the deferred timer-only option**, and must be
   **treated as such at plan time** — in this task too, not only in `0206`.
2. ⚠️ **It must be re-checked against the tutorial first-place-for-losing bug before shipping.** That
   check is recorded as a **hard verification step in `0206`**, where it bites.
   ℹ️ **Why it does not bite here, stated with evidence rather than assumed:** a tutorial is created
   `gameMode: GameMode.FFA` (`src/client/Main.ts:822`) and `WinCheckExecution.tick()` calls
   `checkWinnerTeam()` only when `gameMode !== GameMode.FFA`, so **`checkWinnerTeam()` never runs in a
   tutorial.** *(Traced by the reviewer in `0022`'s R4 and by the coder independently — see
   `0022`'s `review.md`. **Not re-verified by the producer this turn — treat as `unverified` by me.**)*
   ⚠️ **Confirm it anyway if the plan changes which function the tutorial can reach.**

⛔ ~~**None of the three open items blocks starting the task**~~ ✅ **Two open items remain — (a) and
(b) — and neither blocks starting the task.** They are plan-time decisions, not gates. **Struck, not
deleted.**

---

## Investigation (phase 1 — the ruling has landed; do this before any fix)

1. Confirm the stall end to end in a **private Team lobby with a short timer** and a large bot count:
   the timer expires, the Bot team leads, no winner is declared, and the match continues indefinitely.
   ⚠️ **Port note, real:** the dev server binds **3001/3002**, and anything already squatting 3001
   silently kills worker 0 (`EADDRINUSE` swallowed in `Worker.ts`) → no public lobbies, which reads like
   a code bug and is not. Do not start a second `npm run dev` against a tree that already has one.
2. Measure how often the aggregate Bot team actually leads at timer expiry with realistic bot counts and
   human team sizes — this is the claim marked unverified above.
3. Confirm what the **existing** clients do at that moment (no `Win` update is emitted at all, so
   nothing should render — check that no modal, analytics event, or archive write fires).
4. Check whether the same guard can strand the match on the **territory** branch in any configuration
   that is actually shipped, or whether the 95% threshold rules it out in practice.

## What to Build

✅ **The policy is decided: the next-highest human team wins** (owner ruling, 2026-09-02). Build that,
not one of the rejected options.

~~⚠️ **But the *measure* is not decided** — see *Open implementation question* above. Settle
"next-highest by what, and how are ties broken" in the plan and get it approved **before** writing the
fix. Do not silently assume tile count.~~

✅ **The measure IS now decided: TERRITORY (tile count)** — owner ruling, 2026-09-02. Rank human teams
by tile count and award the win to the highest. **Struck above, not deleted.**

🚩 **But two sub-questions remain OPEN and must still be settled in the plan and approved before the
fix is written** — see *STILL OPEN* above: **(a) tie-breaking** between human teams level on tile
count, and **(b) whether "human team" means any non-`ColoredTeams.Bot` team or one with a real
client.** ~~Plus the unruled branch-scope question (timer-only vs every tick).~~ ✅ **The branch scope
IS now ruled — BOTH branches, timer and the 95 % territory threshold (owner ruling 2026-09-02, made
jointly with `0206`). Struck, not deleted.** ⚠️ **Carry its two conditions:** plan it as the
**materially larger** behaviour change it is, and honour the **tutorial re-check** (hard step, recorded
in `0206`).

- The change belongs in `WinCheckExecution.checkWinnerTeam()`. Keep any early return **below**
  `this.active = false` only if the intent really is to stop checking; today's `return` above it is what
  makes the state persistent.
- ⚠️ **Do not "fix" this by deleting the `gameType !== GameType.Singleplayer` clause.** That clause is
  PR #77's fix for the Singleplayer Team stall, and removing it reintroduces that bug. This is marked
  ⛔ in `0022`'s brief for the same reason.
- All changes here are in `src/core/` and therefore **must be tested** (project rule).
- ~~If option 3 is chosen, the match-end XP path must be handled explicitly — see the ⚠️ above.~~
  ✅ **Moot — option 3 was rejected.** The chosen policy sets a winner, so the match resolves through
  `handleWinner` and `creditMatchXp` runs on the normal path. ⚠️ **Still worth an explicit check in
  verification** — that the XP actually credits on this new branch is an assertion nobody has tested;
  it is **unverified** until step 6 below passes.

## Verification

1. **The chosen policy fires** in a private Team lobby with a timer, Bot team leading at expiry — the
   **next-highest human team** is declared the winner.
   - **1b — and it fires on the TERRITORY-THRESHOLD branch too.** Bot team crossing the **95 %**
     threshold (`src/core/configuration/DefaultConfig.ts:713-718`) with no timer set: the next-highest
     human team is declared the winner. **Added by the branch-scope ruling, 2026-09-02 (both branches).**
     ⚠️ **Test it separately — a green timer test does not cover this branch.** *(Numbered `1b` rather
     than renumbered, so that the reference to "step 6" elsewhere in this brief stays correct.)*
2. **Singleplayer Team modes still end correctly** — PR #77's fix is not regressed. This is the specific
   thing a careless fix breaks.
3. **Public Team matches with a human team leading still resolve normally** — no regression to the
   ordinary win path.
4. **FFA is untouched** — `0022`'s risk-1 guard in `checkWinnerFFA()` must still behave as it does after
   `0022` ships.
5. `npm test` green, `npm run lint` clean.
6. **Match-end XP credits on the new branch** — the owner's stated reason for choosing this option was
   that XP still credits normally. Prove it: the human-team win reaches `handleWinner` and
   `creditMatchXp` runs. Do **not** report this as satisfied by reasoning alone.

## Notes

- **Split from:** [`0022-win-check-multiplayer-regression-investigation`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md)
  (risk 2), on owner ruling **R4**, 2026-09-02. `0022` carries a pointer forward to this task.
  Read `0022`'s *⚠️ Premise refuted* section before starting here — it corrects several claims that
  this task inherits the context of.
- **Depends on:** ~~an **owner decision**, not a task.~~ ✅ **That decision was made 2026-09-02** — the
  dependency is discharged. **Nothing gates this task now.** `0022` shipping is *not* a prerequisite,
  though it will land first in practice and touches the same file.
- **Renumbered `0204` → `0205`** on an owner ruling, 2026-09-02 — see the note under `## ID`.
- **Board choice, stated honestly:** `backlog.md`, not `plan-sprint-4.md`. No owner ruling scheduled
  this into Sprint 4 — ruling R4 said only "split it out". ~~and the task is `🚧 Blocked` on a decision
  that has not been made, so it could not be worked in Sprint 4 even if it were listed there.~~
  ✅ **That second reason is spent** (the ruling landed); the first stands alone. Putting it on the
  sprint board would still assert a commitment nobody made. Same reasoning as `0203` — **and now
  `0206` as well**. **Row appended, not inserted** (ADR-035).
  ✅ **Owner-reviewed and deliberately left, 2026-09-02** — see the ruling block under `## Sprint`.
  **Not an oversight.**
- **FFA twin:** [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — the FFA form
  of the same stall, filed 2026-09-02 out of `0022`'s declined option (b) plus review finding R1.
  ~~**It shares this task's unruled branch-scope question** (timer-only vs wider). Ruling the two
  together avoids leaving `checkWinnerFFA()` and `checkWinnerTeam()` with inconsistent policies —
  something `0022`'s notes already flag.~~ ✅ **The two WERE ruled together, 2026-09-02: BOTH BRANCHES
  in both tasks.** `checkWinnerFFA()` and `checkWinnerTeam()` now share one policy by construction, so
  the inconsistency `0022`'s notes warn about cannot arise. **Struck, not deleted.**
- The `0022` premise refutation does **not** apply to this risk: risk 2 was always described as
  pre-existing, and that description was correct.
