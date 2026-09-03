# 0206 — Approved implementation plan

> **Provenance.** Produced by a spawned `fkit-coder` on 2026-09-03 under a plan-only instruction, then
> presented to the owner by `fkit-lead` via `AskUserQuestion` and **approved** the same day. This file
> is the approved text, written by the driver at the moment of approval and before any build spawn
> (ADR-020 / `fkit-sprint-ship-loop` §2).
>
> ⚠️ **HTML-entity decode disclosure.** The plan returned through the subagent channel with `<`, `>` and
> `&` HTML-escaped. Those entities have been decoded back to their literal characters in the code blocks
> below (`=>`, `&&`). **No other alteration was made.** If a code block reads oddly, suspect this decode
> first.
>
> ⚠️ **The plan gate here was prose-enforced, not structural.** Plan mode's write-wall cannot run in a
> spawned worker (ADR-021), so "write no source" was an instruction, not a wall. Stated per the ADR-031
> honesty clause. Do not rewrite this into a guarantee.

---

## Owner rulings folded into this plan

All given live in session, 2026-09-03, via `AskUserQuestion`.

| # | Question | Ruling |
|---|---|---|
| **Q1** | Should the match END on the threshold branch? | **Yes — end it, on both branches**, exactly like any other win (`setWinner` + `active = false`). |
| **Q2** | Ranking measure and tie-break? | **Tile count** (`numTilesOwned()`, reusing the already-sorted array), **tie-break ascending `smallID()`**. |
| **Q3** | How is phase-1 frequency measurement discharged? | **Fold it in** — ship the fix *with* a log line on the fallback award; read frequency afterwards. |
| **Q4** | How is verification step 2 (`creditMatchXp` runs) proven? | **Core test + server test, and state the gap** — report the middle leg as unchanged-and-already-live, never as verified. |

Earlier rulings this plan also rests on:

- **Branch scope: BOTH branches** (timer *and* territory threshold). Owner ruling, 2026-09-02.
- **Winner predicate: `clientID() !== null`, with NO `PlayerType.AiPlayer` exclusion.** Owner ruling
  2026-09-03, recorded as **ADR-110** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`,
  status `accepted`). 🔴 That ADR carries a **known expiry** — it must be re-examined before any durable
  player-visible winner surface ships. **Do not design anything that depends on it being permanent.**
- **One policy across FFA and Team mode.** `0205` is the Team twin; do not silently split the two.

**Sequencing ruling (2026-09-03):** `0206` ships before `0208`'s measurement. The owner accepted that the
pre-fix stall count is therefore **permanently unmeasurable**, and that the log line's fallback-fire rate
is the proxy that replaces it. Stated here so nobody later reads the missing baseline as an oversight.

---

## 1. Where the change goes

**One file, one function:** `src/core/execution/WinCheckExecution.ts` → `checkWinnerFFA()`.

Located **by symbol**, not by line — this file has drifted twice recently. Line numbers below were
accurate at `2d1135c` (guard block `:65-73`, `setWinner` `:74`, `this.active = false` `:76`) and were
re-verified as still accurate during planning, but **locate by symbol regardless**.

Current shape:

```ts
if ( /* threshold OR timer, :53-58 */ ) {
  // comment block :59-64 (task 0022 policy)
  if (max.clientID() === null) {
    const gameConfig = this.mg.config().gameConfig();
    if (
      gameConfig.gameType !== GameType.Singleplayer ||
      gameConfig.isTutorial === true
    ) {
      return;                       // ← the stall this task closes
    }
  }
  this.mg.setWinner(max, this.mg.stats().stats());
  console.log(`${max.name()} has won the game`);
  this.active = false;
}
```

Read carefully, that inner `return` is reached in exactly two situations:

| Situation | Reaches the `return`? |
|---|---|
| Public / Private multiplayer FFA, clientless leader | ✅ yes — **this is what `0206` fixes** |
| Singleplayer **tutorial**, clientless leader | ✅ yes — **must keep returning** |
| Singleplayer **non-tutorial**, clientless leader | ❌ no — falls through, awarded as `["opponent", name]` (the "solo loss" display) |

So the fallback only ever has to decide between the first two rows. **That is the whole safety analysis.**

---

## 2. The change

```ts
if (max.clientID() === null) {
  const gameConfig = this.mg.config().gameConfig();
  if (
    gameConfig.gameType !== GameType.Singleplayer ||
    gameConfig.isTutorial === true
  ) {
    // Task 0206: instead of stalling with no winner (which loses the whole
    // match's XP for every player), award the win to the top-ranked player
    // that HAS a clientID — same tile-count ranking as the leader above.
    // Predicate is clientID() !== null with NO PlayerType.AiPlayer exclusion:
    // an AI player may be declared winner (ADR-110, accepted 2026-09-03).
    //
    // Multiplayer only. A tutorial (and singleplayer generally) has no
    // server-side XP to rescue, and awarding its single Human the win for
    // LOSING to a bot would hand them first-place platform-leaderboard points
    // via ClientGameRunner.reportPlacements() — the exact bug 0022 fixed.
    if (gameConfig.gameType === GameType.Singleplayer) {
      return;
    }
    const fallback = sorted.find((p) => p.clientID() !== null);
    if (fallback === undefined) {
      // No clientful player is alive. Award nothing and stay active, exactly
      // as before this task — never manufacture a winner out of nothing.
      return;
    }
    this.mg.setWinner(fallback, this.mg.stats().stats());
    console.log(`${fallback.name()} has won the game (0206 fallback award)`);
    this.active = false;
    return;
  }
}
```

Plus, in the same function, make the existing sort's tie-break explicit (**Q2 ruling**):

```ts
const sorted = this.mg
  .players()
  .sort(
    (a, b) => b.numTilesOwned() - a.numTilesOwned() || a.smallID() - b.smallID(),
  );
```

And update the `0022` policy comment at `:59-64` to note AI players are deliberately *outside* the
clientless policy — ADR-110's own Consequences bullet asks for exactly this (*"the `0022` guard's comment
becomes incomplete… worth a comment update when `0206` is implemented"*).

**The `console.log` on the fallback award discharges the Q3 ruling.** ⚠️ **Honest limit, recorded at
approval:** a core-layer `console.log` runs in the client's Web Worker and **reaches no dashboard**. A
real metric would need a client analytics event — a new entry in `flashistConstants.analyticEvents`
**and** an update to `analytics-event-reference.md`. **That scope was NOT planned and must NOT be added
without a further owner ruling.** `0208` is the task that does it properly.

### Why `gameType === Singleplayer` rather than `isTutorial === true`

The two are equivalent given the table above (non-tutorial singleplayer never reaches here), but the
`gameType` form states the actual intent — *the fallback exists to rescue server-side XP, and
singleplayer has none* — stays correct if the singleplayer branch is ever restructured, and is the
strictly safer of the two if someone later changes the guard shape.

### What is NOT changed

- `checkWinnerTeam()` — **byte-identical**. `0205` owns Team mode.
- The `0022` guard's Singleplayer / `isTutorial` handling — preserved exactly; the fallback is added
  *inside* it, not in place of it.
- No `PlayerType.AiPlayer` check anywhere (ADR-110).
- Thresholds, fallout, `percentageTilesOwnedToWin()` — untouched.

---

## 3. Verified context this plan rests on

Each verified during planning; cite these rather than re-deriving them.

- **FFA has no teams.** `addPlayers()`'s FFA branch (`src/core/game/GameImpl.ts:150-154`) calls
  `addPlayer(p)` with no team argument → `addPlayer` (`:448-456`) falls through to `maybeAssignTeam()`,
  which returns `null` when `gameMode !== GameMode.Team` (`:463-466`). ⇒ **Today's Team-mode
  team-assignment findings do not touch `0206`.** `0206`'s Sprint 4 row still records this as an
  *unverified belief*; it is now **verified** and the row can be corrected.
- **Tutorial humans have real `clientID`s.** `GameRunner.ts:54-59` builds every entry of
  `gameStart.players` as `PlayerType.Human` with `p.clientID`; `Main.ts:800-838` puts the local player
  there with a generated `clientID`, `isTutorial: true`, `bots: 100`, `disableNPCs: false`.
  🔴 **This is what makes the tutorial gate mandatory.**
- **`reportPlacement` has no game-type guard** and calls
  `FlashistFacade.instance.increaseCurPlayerLeaderboardScore` — the real platform leaderboard
  (`src/client/leaderboard/LeaderboardReporter.ts:44-58`).
- **`reportPlacements()` fires whenever a `Win` update exists** (`ClientGameRunner.ts:516`, `:530-536`)
  and ranks Humans only by `numTilesOwned()` desc (`:407-419`).
- **The award unblocks server crediting:** `WinModal` emits `SendWinnerEvent(["player", clientID], …)`
  for any non-null winner clientID (`WinModal.ts:438-450`) → `handleWinner` (`GameServer.ts:1144`) →
  majority vote over active clients' IPs (`:1174-1186`) → `creditMatchXp` (`:1199`).
- **Public FFA has no timer** (`MapPlaylist.ts:162` `maxTimerValue: undefined`), keeps Nations (`:165`),
  and carries `bots: 400` (`:169`).
- **Candidate pool is alive players only:** `GameImpl.players()` filters `.isAlive()` (`:421-423`).
- **`smallID` tie-break == current behaviour.** `addPlayer` (`:448-460`) does `_playersBySmallID.push`,
  `nextPlayerID++` and `_players.set` in one call, so Map insertion order **is** ascending `smallID`
  order; `players()` returns `Array.from(_players.values())` filtered, preserving it; `Array.prototype.sort`
  is spec-stable since ES2019. So ties **today** already resolve to lowest `smallID` — the explicit
  tie-break **writes down an existing invariant rather than changing behaviour**.
  ⚠️ **Caveat owed to the owner and carried here:** this was verified by *reading* the construction path,
  not by running two clients side by side. T7 catches a wrong tie-break in a unit test, but a
  **cross-client divergence would not be caught by any test in this repo.**

---

## 4. Test plan

All changes are in `src/core/` ⇒ **must be tested** (CLAUDE.md project rule). All new tests go in the
existing `tests/core/executions/WinCheckExecution.test.ts`, using its two existing helper styles
(`mockTimerExpiredFfa` for the timer branch; the real-game `ffaWinUpdates` helper for the threshold
branch). **Baseline confirmed green during planning: 15 tests passing, no flake, no re-run needed.**

| # | Test | Branch | Asserts |
|---|---|---|---|
| T1 | clientless leader, public FFA, one clientful human alive | **threshold** | `Win` update emitted, `winner === ["player", humanClientId]`, `isActive() === false` |
| T2 | clientless leader, private FFA, timer expired | **timer** | same, via `mockTimerExpiredFfa` extended to a two-player list |
| T3 | clientless leader, **no clientful player alive at all** | both | **no** `Win` update, `isActive() === true` (verification step 5) |
| T4 | 🔴 clientless leader, **tutorial** (`Singleplayer` + `isTutorial: true`) | threshold | **no** `Win` update, `isActive() === true` — the existing test at `:232-240` already asserts this and **must stay green unchanged**; add an explicit second assertion that the human is not the winner, so the intent is legible |
| T5 | clientless leader, **non-tutorial singleplayer** | threshold | still `["opponent", name]` — the existing test at `:170-190` must stay green unchanged |
| T6 | **AI player is an eligible fallback winner** (`PlayerType.AiPlayer`, non-null `clientID`, ranked below a clientless leader) | threshold | awarded — asserts **no `PlayerType.AiPlayer` exclusion** (step 5b / ADR-110) |
| T7 | two clientful players **tied** on tiles | threshold | the lower `smallID` wins; deterministic tie-break |
| T8 | ordinary human win over the threshold | both | unchanged (existing `:218-226` covers the threshold half; keep) |

**Per the Q4 ruling, additionally:** a **server-side test** that feeds `handleWinner` a winner message
from mocked clients and asserts `creditMatchXp` runs. No such test exists today;
`tests/server/GameServerReconnect.test.ts` is the nearest model. `handleWinner` is private, so this needs
an `as any` reach-in — **the owner approved this specific cost** in ruling Q4.

Helper changes: `mockTimerExpiredFfa` gains an optional second player, and its mocks gain `smallID()`
(single-player mocks never tie, so they stay safe either way — the `||` short-circuits before `smallID`
is read).

Then: `npm test` (full) and `npm run lint`.

⚠️ **If a `supertest` suite is red**, check `CLAUDE.md`'s known-flake signature and rule out `0197`'s
`SIGSEGV` (`signal=SIGSEGV`, or a `~/Library/Logs/DiagnosticReports/node-*.ips` whose stack starts at
`ClearStaleLeftTrimmedPointerVisitor`) **before** calling it a regression — and **if you re-ran, say you
re-ran**.

---

## 5. Discharging the brief's verification steps

| Step | How | Honest strength |
|---|---|---|
| 1 — award fires on **both** branches | T1 (threshold) + T2 (timer), separately | ✅ proven by test |
| 2 — **`creditMatchXp` runs** | Core test (T1) + the new server test. **Middle leg reported as a gap** — see below | ⚠️ **partial by construction; report it as such** |
| 3 — `reportPlacements()` runs again | T1 proves the `Win` update exists; `ClientGameRunner.ts:516` makes `gameEnded` true from exactly that | ⚠️ **code trace, not a test** — `ClientGameRunner` has no test harness in this repo |
| 4 — 🔴 tutorial does **not** award first place for losing | T4 + T5, plus the existing tutorial tests kept green | ✅ proven by test at the core layer |
| 5 — no clientful player ⇒ no winner | T3 | ✅ proven by test |
| 5b — AI player **may** win | T6 | ✅ proven by test |
| 6 — human wins unchanged | T8 + existing suite | ✅ |
| 7 — Team mode untouched | `git diff` shows `checkWinnerTeam()` unchanged; its 2 existing tests stay green | ✅ |
| 8 — `npm test` / `npm run lint` | run both | ✅ |

**Step 2, per the Q4 ruling — the required wording.** Prove the core end (the fallback emits `Win` with
`["player", clientID]`) and the server end (the new `handleWinner` test). The **middle leg** —
`Win` update → `WinModal` → `SendWinnerEvent` → `Transport` → server — has **no test harness in this
repo**, is **unchanged by this task**, and runs on every ordinary human win in production today.
⛔ **Report it exactly that way — "unchanged and already live", never "verified".** The brief says do not
report this step as satisfied by reasoning alone; the honest form is core-tested + server-tested + one
named, unchanged gap.

**Step 4 is worth stating plainly:** because the tutorial gate lives in **core**, the tutorial never emits
a `Win` update at all, so `reportPlacements()` cannot run. That is stronger than "we checked the client
behaviour" — the client path is **structurally unreachable**. It is still proven by a test, not by that
sentence alone.

---

## 6. Risks

1. 🔴 **Tutorial regression** — the whole reason for the `Singleplayer` gate. Mitigated by T4/T5 and by
   keeping `0022`'s two tutorial tests **unmodified**. ⛔ **If those two tests are ever edited to
   accommodate this change, that is the alarm — stop and escalate.**
2. **Behaviour change, and it is visible.** Public FFA matches that today run to the 3-hour cap or empty
   out will now **end at 80%** with a declared winner who may hold very little territory. Players will see
   "X won" where X is not the dominant force on the map. **That is the price of the both-branches ruling;
   it is visible, not silent.**
3. **Determinism** — every client must reach the same winner or the game desyncs. Addressed by the
   explicit `smallID` tie-break (T7). `numTilesOwned()` is already simulation state, hashed every 10 ticks.
4. **`0205` coupling** — the Team twin must land on the same predicate and the same "does it end" answer.
   Q1/Q2 were answered mode-agnostically for that reason. **The rulings above are to be relayed into
   `0205`'s plan, not re-derived there.**

---

## 7. The no-eligible-clientful-player case

**Award nothing. `return` before `this.active = false` — exactly as `0022` does today.**

- Reachable because `players()` filters `.isAlive()` (`GameImpl.ts:421-423`): if every clientful player is
  eliminated before the threshold, only Bots and Nations remain alive.
- Manufacturing a winner from a clientless player is precisely what `0022`'s guard exists to stop, and
  `makeWinner` would return `undefined` for one anyway (`GameImpl.ts:677-687`) — the original defect.
- ⚠️ **Stated without softening: in this specific case the match's XP is still lost.** Elimination is
  permanent, so no clientful player can become available later. ADR-110's trade-off T3 is exactly why AI
  players are **not** excluded — an alive AI player with a real `clientID` keeps this case rare rather
  than routine.
- Covered by verification step 5 and test T3.

---

## 8. Out of scope — found during planning, deliberately NOT fixed here

Both are pre-existing, unrelated to this task's change, and **must not be folded in**:

1. **`ClientGameRunner.reportPlacements()` computes `const placement = +1;` (`:426`)** — a literal `1`,
   not `myIndex + 1`. Every top-3 human is reported as placement 1. The *points* are correct
   (`awardTable[myIndex]`); only the reported placement is wrong.
2. **Non-tutorial Singleplayer already awards first-place platform-leaderboard points for losing** to a
   bot — the same shape as the tutorial bug `0022` fixed, still live, touched by neither `0022` nor
   `0206`. It is a product call (should singleplayer report to the platform leaderboard at all?).

Briefs for both are the producer's to file.

3. **`WinModal.ts:487-492`'s comment is wrong** — it claims AI players are skipped from participation; the
   skip at `:498-499` is on `clientID === null`, which **includes** them. Confirmed live during planning.
   **Task `0207` covers it. Nothing in this plan depends on that comment.**
