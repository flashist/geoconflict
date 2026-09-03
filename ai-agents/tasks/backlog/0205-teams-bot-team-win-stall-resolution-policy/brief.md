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

### ✅ HELD AT LOW–MEDIUM AGAINST THE EMPIRICAL EVIDENCE — owner ruling, 2026-09-03, given live in session

**The premise was CONFIRMED by simulation on 2026-09-03** (see *Empirical findings* below), and the
same run showed the defect is **passivity-dependent**. The producer flagged that the passivity
dependence arguably lowers real-world likelihood and put the rank to the owner rather than moving it.

> **Owner ruling: the rank stays Low–Medium.**

**Owner's reasoning, recorded because it is NOT the obvious reading of "premise confirmed":** the
passivity dependence **supports** this rank rather than undermining it. Busy public lobbies are safe
(**60 %+ activity → 0/3 stalls**), so the realistic trigger remains **private and quiet lobbies** —
which is exactly what this brief already said.

⚠️ **Record it that way and do not re-read it later as inertia.** The rank is unchanged **and now
owner-confirmed against measured evidence**, not merely inherited from 2026-09-02. It was **weighed and
held**, not left alone because nobody looked.

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
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md). See *The branch scope — ✅
DECIDED* below.
~~🚩 **TWO things remain open — (a) and (b) — and this ruling does NOT touch either.** Neither blocks
starting; both are plan-time decisions that must be settled in the plan and approved before code.~~

✅ **Updated 2026-09-03 — (b) IS NOW ANSWERED IN PART. Struck above, not deleted.** Owner ruling, given
live in session: **ADR-110 is accepted, and it is ONE POLICY ACROSS BOTH MODES** — an AI player
(`PlayerType.AiPlayer`, which carries a real `clientID`) **may** be declared winner, in Team mode
(`0205`) as well as FFA ([`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)). See
*The winner predicate — ✅ DECIDED (ADR-110)* below.

🚩 **STILL OPEN, and neither blocks starting:**
- **(a) tie-breaking** between human teams level on tile count — untouched by anything ruled so far.
- **(b-residual) the all-Nations team case** — ADR-110 settles that AI players count; it does **not**
  settle whether a team made entirely of **Nations** (`PlayerType.FakeHuman`, `clientID === null`) can
  be awarded the win. 📌 **The owner deliberately DEFERRED this to plan time on 2026-09-03** — it is a
  decision with a known shape, not an oversight. See *The all-Nations team* below.

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

> Note: Nations (`PlayerType.FakeHuman`) are **not** on the Bot team — ~~`maybeAssignTeam` hashes them
> onto a named player team like any non-Bot player.~~ ⚠️ **MECHANISM CORRECTED 2026-09-03 (architect
> pass). The outcome above is right; the mechanism was wrong. Struck, not deleted.** Nations get their
> team from **`assignTeams()`** (`src/core/game/GameImpl.ts:170` → `src/core/game/TeamAssignment.ts`)
> and **never reach `maybeAssignTeam()` at all**. Bots reach `maybeAssignTeam()` via `SpawnExecution`,
> which passes **no team**. So "Nations land on a named team" is still true — it just does not happen
> where this brief said it did. **Anyone planning by symbol must look in `TeamAssignment.ts`, not in
> `maybeAssignTeam()`.** And in public Team lobbies they are usually absent
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
| **Territory threshold** — Bot team exceeds `percentageTilesOwnedToWin()` | Yes | ~~⚠️ **Rare.**~~ 🚩 **THIS CELL IS CORRECTED BY MEASUREMENT — 2026-09-03. Struck, not deleted; see *Empirical findings* below.** The threshold really is **95 %** (✅ still verified, `src/core/configuration/DefaultConfig.ts:713-718` — `return 95` for `GameMode.Team`, `80` otherwise). ⛔ **But "rare" was wrong as stated.** Under idle humans the bot team crosses 95 % at **ticks 6180–9480 ≈ 7–10 minutes of real play**, **12/12** on the shipped *public* config. It is rare **because humans play**, not because 95 % is hard to reach. |
| **Timer expiry** — `maxTimerValue` elapses and whoever leads "wins" | Yes | ✅ **This is the realistic one.** At expiry the aggregate 400-bot single team plausibly outsizes any one human team, the guard fires, and **the timer expires with no winner — permanently**, because the check stays active and just keeps re-hitting the same guard. |

**The timer route is private/custom lobbies only.** Public lobbies ship `maxTimerValue: undefined`
(✅ verified, `src/server/MapPlaylist.ts:162`), so public Team games are territory-only. The timer is
**host-settable** in a private lobby — ✅ verified, `src/client/HostLobbyModal.ts:773-774`
(`maxTimerValue: this.maxTimer === true ? this.maxTimerValue : undefined`), with the same pattern in
`src/client/SinglePlayerModal.ts:567`.

**So the shape to design for is: a private Team lobby with a timer set.** Not the 95% wipeout.
⚠️ **Amended 2026-09-03:** still true as the *realistic* shape, but the 95 % route is **not** ruled out
by difficulty — see the corrected cell above and *Empirical findings* below.

~~⚠️ **Unverified — needs measuring during the investigation phase:** *how often* the aggregate Bot team
actually out-tiles the leading human team at a typical timer expiry. The reasoning above is
structural, not measured. Nobody has observed this in production or reproduced it live, and no player
report is on file. **Do not present it as a confirmed field incident.**~~
✅ **MEASURED 2026-09-03 — struck, not deleted.** ⚠️ **The last sentence still stands in part:** this was
measured in a **simulator**, not in production. It is still not a confirmed field incident.

---

## ✅ Empirical findings — the premise is CONFIRMED (2026-09-03)

**Run at the owner's explicit request** by an `fkit-coder`, as a **headless deterministic simulation**.
**Method, stated so the limits are readable:** the real **World** map (**651,609 land tiles**),
**400 bots**, and **`DefaultConfig` — not `TestConfig`**. Human team slots are **idle by construction**
(the owner's requested method) except in the activity sweep noted below.

> ### 🔴 VERDICT: the premise this task was filed on is CONFIRMED.

### What was measured

| Finding | Result |
|---|---|
| **Bot team tops the ranking and no winner is ever set** | Duos / Trios / Quads **with a timer**: bot team on top **12/12**, `setWinner` called **0/12**, win check still `active` **12/12**. Bot team ≈ **595k** tiles vs best human team ≈ **5k**. |
| **The guard is proven CAUSAL, not correlated** | Identical board with `gameType: Singleplayer` → `setWinner("Bot")`, `active = false`, **3/3**. **Only the `gameType !== Singleplayer` clause differs.** |
| **The 95 % territory route is reachable fast** | Under idle humans the bot team crosses 95 % at **ticks 6180–9480 ≈ 7–10 minutes of real play**, **12/12**, on the shipped **public** config (`maxTimerValue: undefined`). |
| **The defect is PASSIVITY-DEPENDENT, not unconditional** | Activity sweep over **40 team slots**: **0–20 % active → bot team leads 3/3 each**; **40 % → 1/3**; **60–100 % → 0/3**, matches resolve normally. **Crossover lies between 20 % and 60 %.** |
| ~~**`HumansVsNations` is EXEMPT**~~ 🚩 **"EXEMPT" IS THE WRONG WORD AND IS SUPERSEDED — owner ruling 2026-09-03. Struck, not deleted.** The **measurement** below is unchanged and still correct; only the label is wrong. It is not exempt from the fix — it is **in scope for the fix and currently passing by accident**. See *The `HumansVsNations` accident — ✅ RULED: the fix must cover it BY DESIGN* below. | The only public Team config that resolves — and only **incidentally**: `disableNPCs` is false there (`src/server/MapPlaylist.ts:165`), so **61 Nations** on a named team take ≈ **619k** tiles and win, **4/4**. ⚠️ **Stated so nobody reads it as a counter-example** — it does not disprove the defect, it sidesteps it. 🔴 **And now: it must not be read as "needs no coverage" either.** |

### 🚩 Two corrections this evidence forces on the text above

1. **"The territory route is rare" is NOT supported as written.** It is rare **because humans play**,
   not because the 95 % threshold is hard to reach. **That distinction changes what Verification step
   1b must prove** — see the amended step.
2. **The defect is conditional on passivity.** ⚠️ **Caveat that must ride with the crossover number:**
   "active" here was `FakeHumanExecution` at **Medium**, which plays **better than a casual human**, so
   **the real-world crossover is probably HIGHER than 40 %.** Do not quote 40 % as the human threshold.

### It is not literally permanent — and the alternative ending is worse

`GameServer.ts:56` caps a match at **3 hours** → `GamePhase.Finished`; a **private** game also ends when
all clients disconnect (`:876-882`).
🔴 **Neither path goes through `handleWinner`.** So the match ends with **no winner and no match-end XP
for anyone** — **exactly the outcome `0205`'s rejected option 3 was rejected for.** The stall does not
resolve into a benign timeout; it resolves into the failure the owner already declined.

### ⚠️ Limits — record these honestly, they are not footnotes

- **Single map** (`world`). No other map was exercised.
- **Humans idle by construction** outside the activity sweep — the owner's requested method, and the
  reason the headline numbers are what they are.
- **Production frequency is STILL UNMEASURED.** No telemetry, no player report. **This is a simulator
  result, not a field observation.** Nothing here licenses calling it a confirmed live incident.

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
- ~~**(b) What "human team" means** — *any* team that is not `ColoredTeams.Bot`, or specifically a team
  with at least one real client? (Relevant if Nations are ever on a named team — see the Nations note
  above: `maybeAssignTeam` hashes them onto named teams, though they are usually absent from public
  Team lobbies.) **Not ruled on.**~~ ✅ **PARTLY RULED 2026-09-03 — struck, not deleted.** See the two
  sections immediately below: ADR-110 settles the **AI-player** half; the **all-Nations** half is an
  open **plan-time** decision the owner deliberately deferred.

### The winner predicate — ✅ DECIDED (ADR-110)

#### ✅ Owner ruling, 2026-09-03, given live in session

> **ADR-110 is ACCEPTED: an AI player (`PlayerType.AiPlayer`, which has a real `clientID`) MAY be
> declared the winner. And it is ONE POLICY ACROSS BOTH MODES — it applies to Team mode (`0205`) as
> well as FFA ([`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)).**

**What this means for the code here:** the winner predicate stays **`clientID() !== null`**, with **no
`PlayerType.AiPlayer` exclusion**. Do not add one.

📎 **Cite:** `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`.
⛔ **Read that ADR before relying on it** — it carries a **pre-committed revisit trigger** (any durable,
player-visible winner surface — leaderboard, match history, announcements feed, share card — forces a
re-examination). The ADR is the authority on its own conditions; this brief only points at it.

### 🚩 The all-Nations team — OPEN, and DELIBERATELY DEFERRED to plan time

⚠️ **This is a decision with a known shape that the owner chose to make later. It is NOT an oversight,
and a future reader must not re-raise it as one.**

**The consequence, stated explicitly because ADR-110 does not cover it:** Nations
(`PlayerType.FakeHuman`) are **clientless** — `clientID === null` — so the `clientID() !== null`
predicate **excludes them**. And a private Team lobby really can hand a **whole named team** to Nations:
host defaults at `src/client/HostLobbyModal.ts:42`. If such a team leads and **no** team with a real
client qualifies, the predicate awards nobody.

**The two candidate answers, recorded so the plan starts from them:**

| Candidate | What it costs |
|---|---|
| **Award to the top team regardless** (drop the client requirement in this fallback) | A team of Nations can be declared winner of a real match. |
| **Nations may never win** (keep `clientID() !== null` strictly) | **Recreates the no-winner / no-XP wedge** in exactly the private-lobby case this task exists to close. |

#### ✅ Owner ruling, 2026-09-03, given live in session

> **Settle it in `0205`'s plan, with the code in front of whoever plans it — not by a blind ruling now.**

**Owner's reasoning:** it is **the same shape as the FFA no-eligible-winner hole** and deserves the same
care. So: answer it **in the plan**, get it approved, and do not write the fix before it is answered.

~~⚠️ **Also still open from `0022`, and never ruled on:** whether the human-team fallback should apply
**only on the timer branch**, not on every tick, so a match is not ended prematurely. `0022` suggested
timer-only; **no ruling exists.**~~ ⚠️ **This has an FFA twin** — the same branch-scope question was open
on [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md), where a timer-only answer
would close nothing in public FFA (public lobbies ship `maxTimerValue: undefined`,
`src/server/MapPlaylist.ts:162`). ~~**Consider ruling both at once**; a split answer leaves Team and FFA
with inconsistent win-fallback policies.~~ ✅ **They WERE ruled at once — see immediately below. Struck,
not deleted.**

### The branch scope — ✅ DECIDED

#### ✅ Owner ruling, 2026-09-02, given live in session

> **BOTH BRANCHES. The fallback award applies to the timer branch AND the territory-threshold branch.**

**Ruled once, deliberately, across BOTH this task (`checkWinnerTeam()`) and
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) (`checkWinnerFFA()`)** — to keep
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
   tutorial.** ~~*(Traced by the reviewer in `0022`'s R4 and by the coder independently — see
   `0022`'s `review.md`. **Not re-verified by the producer this turn — treat as `unverified` by me.**)*~~
   ✅ **NOW VERIFIED — 2026-09-03. Struck, not deleted; this claim is no longer `unverified`.**
   Confirmed against the tree: `src/client/Main.ts:823` sets `gameMode: GameMode.FFA` and `:835` sets
   `isTutorial: true`, and FFA routes to `checkWinnerFFA()`. **The tutorial cannot reach
   `checkWinnerTeam()`.** *(Line numbers moved by one from the earlier `:822` reading — locate by
   symbol.)*
   ⚠️ **Confirm it anyway if the plan changes which function the tutorial can reach.**

⛔ ~~**None of the three open items blocks starting the task**~~ ✅ **Two open items remain — (a) and
(b) — and neither blocks starting the task.** They are plan-time decisions, not gates. **Struck, not
deleted.**

### The `HumansVsNations` accident — ✅ RULED: the fix must cover it BY DESIGN

#### ✅ Owner ruling, 2026-09-03, given live in session

> **"Make it deliberate."**
>
> **`0205`'s fix must resolve EVERY Team config BY DESIGN — `HumansVsNations` included — not leave one
> working by coincidence.**

⚠️ **This is a SCOPE CONSTRAINT on the eventual fix. It is NOT a new open question, and it is NOT a
gate.** Nothing about it blocks starting; it constrains what "done" means. **The plan must not treat
`HumansVsNations` as already-solved.**

**The finding it rules on** (measured 2026-09-03, see *Empirical findings*): `HumansVsNations` is the
**only public Team config that resolves correctly — and only by accident.** `disableNPCs` is **false**
there (✅ `src/server/MapPlaylist.ts:165`, whose condition is
`mode === GameMode.Team && playerTeams !== HumansVsNations`), so **61 actively-playing Nations** sit on
a named team, take ≈ **619k** tiles and win, **4/4**. **Every other public Team config stalls.**

**Owner's stated concern, recorded because it is the whole reason for the ruling:** a config change
elsewhere could **silently remove the accident**, and **nobody would connect the two.** The Nations are
only on that team because one boolean in `MapPlaylist.ts` happens to be false for one playlist entry.
Nothing anywhere records that a win-condition property depends on it. Flip that boolean — or add a new
Team playlist entry, or reorder the `playerTeams` check — and `HumansVsNations` joins the stalling
configs, with no test failing and no reader able to trace it back.

> 🔴 **A future reader must not mistake "it currently works" for "it needs no coverage."**
> It works **today**, for a reason that is **incidental**, **undocumented in code**, and **one boolean
> away from not being true.** That is the definition of what this ruling forbids relying on.

**What this means concretely for the plan and the fix:**

- **`HumansVsNations` is IN SCOPE.** The fallback-award path must be **reachable and correct** for it,
  not merely "not broken by us".
- ⛔ **Do not scope the fix to "the configs that currently stall."** That is the shape the ruling
  rejects: it would leave exactly one config depending on the accident.
- **The fix must not depend on `disableNPCs` being false for that playlist entry** — nor on Nations
  being present, nor on their tile count. If `disableNPCs` flipped to `true` for
  `HumansVsNations` tomorrow, the config must still resolve, **through the fix**, not through the
  accident.
- 🚩 **This interacts with the open all-Nations question, and the plan must settle them together.**
  `HumansVsNations`'s current *accidental* resolution is a **Nations team winning** — which is
  precisely the case *The all-Nations team* leaves open. ⚠️ **If the plan answers that with "Nations may
  never win", it does not merely fail to help `HumansVsNations` — it REMOVES the accident that is
  currently carrying it**, and that config regresses from working to stalling. **Answer the two as one
  decision, or the fix can make this config worse than it is today.** ⛔ **The producer is not
  answering it here** — the owner deferred it to plan time on 2026-09-03, deliberately.
- **Verification step 8 is amended accordingly** — see below. "Still resolves as it does today" is no
  longer a sufficient assertion.

---

## Investigation (phase 1 — the ruling has landed; do this before any fix)

1. Confirm the stall end to end in a **private Team lobby with a short timer** and a large bot count:
   the timer expires, the Bot team leads, no winner is declared, and the match continues indefinitely.
   ⚠️ **Port note, real:** the dev server binds **3001/3002**, and anything already squatting 3001
   silently kills worker 0 (`EADDRINUSE` swallowed in `Worker.ts`) → no public lobbies, which reads like
   a code bug and is not. Do not start a second `npm run dev` against a tree that already has one.
2. ~~Measure how often the aggregate Bot team actually leads at timer expiry with realistic bot counts and
   human team sizes — this is the claim marked unverified above.~~ ✅ **DONE 2026-09-03 by simulation —
   see *Empirical findings*. Struck, not deleted.** Bot team led **12/12** with a timer; `setWinner`
   **0/12**. ⚠️ **The residual stands and is NOT closed:** that was a simulator with idle humans on one
   map. **Production frequency is still unmeasured**, and the activity sweep says the real answer
   depends on how active the lobby is.
3. Confirm what the **existing** clients do at that moment (no `Win` update is emitted at all, so
   nothing should render — check that no modal, analytics event, or archive write fires).
4. ~~Check whether the same guard can strand the match on the **territory** branch in any configuration
   that is actually shipped, or whether the 95% threshold rules it out in practice.~~ ✅ **ANSWERED
   2026-09-03. Struck, not deleted.** 🔴 **It CAN, on the shipped public config** (`maxTimerValue:
   undefined`), **12/12**, with the crossing at **ticks 6180–9480 ≈ 7–10 minutes**. **The 95 % threshold
   does NOT rule it out.** ⚠️ The one exemption is **`HumansVsNations`**, which resolves incidentally
   (61 Nations on a named team win, 4/4) — not a counter-example.

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
count, and ~~**(b) whether "human team" means any non-`ColoredTeams.Bot` team or one with a real
client.**~~ ✅ **(b) is now PARTLY RULED — struck, not deleted.** **ADR-110 (accepted 2026-09-03)
settles that AI players count: the predicate is `clientID() !== null` with NO `PlayerType.AiPlayer`
exclusion.** 🚩 **What remains of (b) is the ALL-NATIONS TEAM case, which the owner deliberately
deferred to plan time on 2026-09-03** — answer it in the plan with the code in front of you, and get it
approved before writing the fix. ~~Plus the unruled branch-scope question (timer-only vs every tick).~~ ✅ **The branch scope
IS now ruled — BOTH branches, timer and the 95 % territory threshold (owner ruling 2026-09-02, made
jointly with `0206`). Struck, not deleted.** ⚠️ **Carry its two conditions:** plan it as the
**materially larger** behaviour change it is, and honour the **tutorial re-check** (hard step, recorded
in `0206`).

🔴 **SCOPE CONSTRAINT — owner ruling 2026-09-03, given live in session:** *"Make it deliberate."*
**The fix must resolve EVERY Team config BY DESIGN, `HumansVsNations` included** — that config is the
only public Team config that resolves today, and it does so **by accident** (`disableNPCs` false at
`src/server/MapPlaylist.ts:165` → 61 Nations on a named team win, 4/4). ⛔ **Do not scope the fix to
"the configs that currently stall", and do not treat `HumansVsNations` as already-solved.** 🚩 **It
interacts with the open all-Nations question — answer the two together, or a "Nations may never win"
answer will REMOVE the accident and regress this config from working to stalling.** Full ruling and
reasoning: *The `HumansVsNations` accident — ✅ RULED* above. **This is a scope constraint, not an open
question and not a gate.**

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
     🚩 **AMENDED 2026-09-03 by the empirical findings — what this step must PROVE has changed.** It was
     written when the 95 % route was believed **rare**. It is not: on the **shipped public config**
     (`maxTimerValue: undefined`) the bot team crosses 95 % **12/12** at ≈ **7–10 minutes** of play.
     **So 1b is not an exotic edge case to cover cheaply — it is the route that fires in a public Team
     lobby whenever the lobby is quiet.** Prove it on the **public** config, not only on a synthetic
     board forced to 95 %.
     ⚠️ **And prove the passivity dependence is preserved rather than papered over:** with a lobby that
     is **active** (60 %+ of slots playing) matches already resolve normally today (**0/3** stalls) —
     **the fix must not change that path.**
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
7. **The winner predicate carries NO `PlayerType.AiPlayer` exclusion** — per **ADR-110**, accepted
   2026-09-03 as one policy across Team and FFA. A team whose qualifying member is an AI player
   (`clientID() !== null`) **must** be able to win. **Added 2026-09-03.**
8. ~~**`HumansVsNations` still resolves as it does today** — it is the one public Team config that already
   ends correctly (61 Nations on a named team win, **4/4**, because `disableNPCs` is false there). It
   resolves **incidentally**, not by design, so it is exactly the shape a careless fix disturbs.
   **Added 2026-09-03.**~~
   🔴 **AMENDED 2026-09-03 BY OWNER RULING — *"Make it deliberate."* Struck, not deleted; "still resolves
   as it does today" is NO LONGER SUFFICIENT.** The observation above is still true and still the reason
   this step exists. **What the step must now PROVE is stronger:**
   - **8a. `HumansVsNations` resolves THROUGH the fix path, by design** — not through the accident.
     Demonstrate that the fallback award is what ends it, or that the fix would end it if the accident
     were absent.
   - **8b. The accident is not load-bearing.** With `disableNPCs` forced **true** for
     `HumansVsNations` — i.e. the Nations that currently carry it removed — the config **must still
     resolve.** ⛔ **This is the step that catches the failure the ruling exists to prevent**: a config
     change elsewhere silently removing the accident, with nobody able to connect the two.
   - **8c. No Team config is left resolving only by coincidence.** Enumerate the public Team configs and
     show each resolves by design. ⚠️ **Do not report 8 satisfied by observing that `HumansVsNations`
     still passes** — that is exactly the reading the ruling forbids.
   - 🚩 **8b is contingent on the open all-Nations decision** (*The all-Nations team*, deferred to plan
     time). If the plan rules "Nations may never win", 8b is how you find out that the ruling regressed
     this config. Settle that decision **before** writing the fix, not when this step fails.

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
- **FFA twin:** [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — the FFA form
  of the same stall, filed 2026-09-02 out of `0022`'s declined option (b) plus review finding R1.
  ~~**It shares this task's unruled branch-scope question** (timer-only vs wider). Ruling the two
  together avoids leaving `checkWinnerFFA()` and `checkWinnerTeam()` with inconsistent policies —
  something `0022`'s notes already flag.~~ ✅ **The two WERE ruled together, 2026-09-02: BOTH BRANCHES
  in both tasks.** `checkWinnerFFA()` and `checkWinnerTeam()` now share one policy by construction, so
  the inconsistency `0022`'s notes warn about cannot arise. **Struck, not deleted.**
- The `0022` premise refutation does **not** apply to this risk: risk 2 was always described as
  pre-existing, and that description was correct.
- **2026-09-03 — evidence pass, three things landed in one day.** (1) A headless deterministic
  simulation, run at the owner's explicit request, **CONFIRMED the premise** and corrected two claims
  in this brief (see *Empirical findings*). (2) The owner **weighed that evidence and HELD the
  Low–Medium rank** — the passivity dependence supports it rather than undermining it, because busy
  lobbies are safe. (3) **ADR-110 was accepted** as one policy across Team and FFA.
- **ADR-110:** `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md` —
  cited here, **not authored or edited by this brief**. It carries a pre-committed revisit trigger; read
  it there rather than trusting this summary.
- ⚠️ **The 3-hour cap is not a safety net.** `GameServer.ts:56` finishes a stalled match at 3 hours, and
  a private game also ends when all clients disconnect (`:876-882`) — but **neither path runs
  `handleWinner`**, so the match ends with **no winner and no match-end XP for anyone**. That is
  **precisely the outcome rejected option 3 was rejected for**, arriving anyway via the stall. It
  strengthens the case for the chosen policy; it does not weaken it.
- 🔴 **2026-09-03 — `HumansVsNations` is a SCOPE CONSTRAINT on the fix, by owner ruling: *"Make it
  deliberate."*** It is the only public Team config that resolves, and it resolves **by accident**
  (`disableNPCs` false at `src/server/MapPlaylist.ts:165`). The fix must resolve **every** Team config
  **by design**, that one included. **Owner's concern:** a config change elsewhere could silently remove
  the accident and **nobody would connect the two**. ⚠️ **This is a constraint, not a new open question
  and not a gate** — it does not block starting; it changes what "done" means. Full ruling: *The
  `HumansVsNations` accident — ✅ RULED*; the Empirical-findings "EXEMPT" label is **struck** there;
  Verification step 8 is **amended into 8a/8b/8c**. 🚩 **It is entangled with the deferred all-Nations
  question — a "Nations may never win" answer would remove the accident and regress this config from
  working to stalling. Settle both as one decision.**
- 📊 **Production frequency is still unmeasured, and that gap now has a brief of its own:**
  [`0208-measure-clientless-leader-at-win-condition-in-production`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md),
  filed 2026-09-03 on an owner ruling (*"File a brief, don't schedule"*) — **unscheduled on the backlog
  board.** It exists to close the residual this brief carries in three places: **this task's Low–Medium
  rank rests on "busy lobbies are safe"**, which is a claim about a **never-measured** lobby-activity
  distribution; **investigation step 2's residual**; and `0206`'s unmeasured-frequency flag.
  ⚠️ **It does not gate this task and this task does not gate it.** 🚩 **But note the sequencing:** once
  `0205`/`0206` ship, the metric measures *how often the fallback fires*, not *how often we stalled* —
  the original question becomes permanently unanswerable. Recorded there, not resolved.
- 🚩 **A misleading comment nearby was filed separately as `0207`**
  ([`0207-winmodal-participation-comment-ai-player-correction`](../0207-winmodal-participation-comment-ai-player-correction/brief.md))
  — `WinModal.ts:487-492` claims `buildPlayerParticipation` skips AI players, which is **wrong** (the
  skip is on `clientID === null`). Comment-only; it touches the same predicate ADR-110 just ruled on,
  so anyone planning `0205` or `0206` will read it.
