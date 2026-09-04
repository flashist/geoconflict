# `0208` — Implementation plan

> **Status: APPROVED by the owner, live in session, 2026-09-04.** All seven open questions were ruled
> the same day. This file is the approved plan; the `NEEDS-DECISION` blocks that were put to the owner
> are recorded below as **decided outcomes**, not as open questions.
>
> **Author:** `fkit-coder`. **Architect consulted** at plan time as the brief requires
> (`brief.md` §3, `:307-310`) — its input is identified as such wherever it is used, including the one
> place I rejected it.
>
> ⛔ **Nothing in this plan is built yet.** ⏳ **Part B is planned-but-HELD** — see
> [Build order](#build-order--part-b-is-held).

---

## Build order — Part B is HELD

| Half | State |
|---|---|
| **Part A** — multiplayer clientless-leader incidence (`src/core/` + client) | ✅ **Approved and ready to build.** |
| **Part B** — Singleplayer platform-leaderboard award incidence (`src/client/` only) | ⏳ **PLANNED BUT HELD.** Do not build until the owner returns the production `Game:Mode:Solo` figure (Decision 6). |

**Why Part B is held:** the owner is pulling production `Game:Mode:Solo` vs `Game:Mode:Multiplayer`
and `Match:Loss:OpponentWon` themselves. If Solo turns out to be a negligible share of matches,
Part B is instrumenting a population that barely exists and may be dropped. **Those numbers were not
in when this plan was approved.** ⚠️ Part B's window still closes when
[`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s guard ships — but
`0210` is unscheduled, so there is time to wait for the figure.

---

## Recorded decisions — owner rulings, 2026-09-04

All seven were put to the owner as `NEEDS-DECISION` and answered live in session on **2026-09-04**.

### Decision 1 — Deploy separation: **Option C.** `0022` + Part A + Part B ship together this weekend.

🔴 **The owner chose this AGAINST the coder's recommendation and against the architect's.**
⛔ **It is the owner's ruling and it stands. Do not re-litigate it — not here, not in review, not at
build time.**

**The cost the owner accepted, recorded plainly because they asked for it to be recorded:**

- A post-deploy **desync or stall regression cannot be attributed** between `0022`'s guard and
  Part A's instrumentation. They are the only two changes touching that code path and they land
  together.
- A **rollback removes all three together** (the owner named the prior release as `v0.0.140`;
  ⚠️ *relayed from the ruling — not verified against the repo in this plan*). **Bisecting therefore
  needs a second deploy**, not a rollback.

📌 **This is a recorded accepted cost, not an argument.** The implementer's obligation is to make the
attribution problem as small as possible: keep Part A a **separate, independently revertable commit**
from Part B, and keep the `src/core/` diff minimal and behaviour-preserving (see
[A2](#a2--where-the-emission-goes) and [A6](#a6--determinism--argument-vs-test-stated-honestly)).

### Decision 2 — Part A event shape: **Option A.** One combined `Match:WinCondition:…` event.

The coder's shape, **not** the architect's two-event shape. See [A4](#a4--the-event-string).

### Decision 3 — Part B emission timing: **Option A.** Count **attempts**.

Emit after `increaseCurPlayerLeaderboardScore(...)` resolves, **regardless of its boolean result**.
🔴 **Required wording in `ai-agents/knowledge-base/analytics-event-reference.md`: "this counts
attempts, platform failures included."**

### Decision 4 — Abandon-time companion event: **Option A.** Leave it out.

⛔ **Do not add it.** The architect proposed a second clientless-leader check inside
`Main.ts`'s `logActiveMatchAbandon()`. It is **not** part of this task. Filing a follow-up brief for it
is **optional and explicitly not part of this task**.

### Decision 5 — Part A reconnect handling: **Option A.** Suppress on reconnect.

Matches `Game:Start`'s existing convention (`shouldLogMatchStartAnalytics`). 🔴 **Record the resulting
small under-count in the reference doc** — see [A5](#a5--over-count-hazards--concretely).

### Decision 6 — Part B dashboard numbers: **Option A.** The owner pulls them.

The owner will pull production `Game:Mode:Solo` vs `Game:Mode:Multiplayer` and
`Match:Loss:OpponentWon` **themselves**, before Part B is built. ⏳ **Not yet in.** See
[Build order](#build-order--part-b-is-held).

### Decision 7 — ADR-110: **Option A.** Doc note only.

Note in `analytics-event-reference.md` that the **`AiPlayer` leaf** of `Match:WinCondition` is
**ADR-110's re-raise-trigger measurement**. ⛔ **Do not edit
`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`.** Reopening that ADR
is a product decision and is the owner's.

---

## The architect consult — what it settled, and the one place it is wrong

The brief requires an `fkit-architect` consult at plan time (`brief.md:307-310`). It was run. Treat
its output as an input that was evaluated, not as truth — every load-bearing claim below was
re-verified by the coder against the working tree.

**What it settled, and it is decisive:**

> 🔴 **A direct `src/core/ → src/client/flashist/FlashistFacade` import is a CRASH, not a coupling
> trade-off.** ✅ **Verified independently:** `FlashistFacade.ts:268` (`window.onerror = …`) and `:292`
> are **top-level statements**, and the simulation runs inside a **Web Worker**
> (`src/core/worker/Worker.worker.ts:16,40,44`). Importing that module from `src/core/` throws
> `ReferenceError: window is not defined` at module-eval time.

⇒ The brief's framing of the seam as a three-way judgement call (`GameUpdate` / `EventBus` /
direct import) is **narrower than the brief thought**: the direct import is not an option at all, and
`EventBus` is not one either (executions receive only `Game` — `Execution.init(mg, ticks)` — and hold
no bus handle; the `WinEvent` class at `WinCheckExecution.ts:12` is the dead fossil of that abandoned
idea, referenced nowhere in `src/` or `tests/`). **One option survives.**

### ⚠️ Where the architect is REJECTED, and why

The architect instructed: *emit at the guard-return point itself.*

⛔ **That is rejected.** It contradicts `brief.md` §1 — *"instrument the DECISION POINT, not the
guard's early return"* — which the brief calls its single most important instruction. Following the
architect would make the metric **read zero the day `0205`/`0211` ship**, while still drawing a healthy
green line on a dashboard. That is the exact failure §1 exists to prevent.

**Correct placement, and it is what this plan does:** inside the `if (threshold || timer)` block and
**above** the clientless guard. See [A2](#a2--where-the-emission-goes).

---

## The `players()` / `isAlive()` trap — resolved, with the evidence

**The claim put to the plan:** a Nation can reach 100 % with the match never ending and *no win
condition firing at all*, because `players()` filters `isAlive()`
(`src/core/game/GameImpl.ts:419-421`) — so a counter keyed on *"who leads when the win condition
fires"* would never count it.

**What the code actually says:** `checkWinnerFFA()` builds `sorted` from `this.mg.players()` (alive
only), takes `max = sorted[0]`, then tests
`max.numTilesOwned() / numTilesWithoutFallout * 100 > percentageTilesOwnedToWin()`. A Nation at 100 %
**passes that test**. The `if` body **does** execute. What does *not* execute is `setWinner` — the
clientless guard at `:69-77` returns first.

⇒ **The win-condition test fires; only the winner declaration does not.** Instrumenting **inside the
`if`, above the guard**, therefore **does** count that case. **The trap is closed by §1's own
instruction, correctly implemented.** No `GameServer.end()` counter is needed, and none is added
(see [What I recommend NOT doing](#what-i-recommend-not-doing), item 2).

⚠️ **The residual that is genuinely NOT counted:** a match that ends with **no winner and where the
threshold/timer test never passed** — everyone quits, the 3-hour cap expires on fragmented territory.
That is a **different question** and its site is out of scope per `brief.md` §6. It is not measured by
this task and the plan does not claim otherwise.

---

## Verified facts this plan rests on

⚠️ **Locate by symbol, not by line — `WinCheckExecution.ts` and `ClientGameRunner.ts` have both moved
repeatedly.** Line numbers below were read from the working tree on 2026-09-04.

| Fact | Evidence |
|---|---|
| Simulation runs in a Web Worker; core **cannot** call the analytics facade | `src/core/worker/Worker.worker.ts:16,20-29,40,44`; `src/client/flashist/FlashistFacade.ts:268,292,343-345` |
| `Game.addUpdate()` is already public — no interface change needed | `src/core/game/Game.ts:751` |
| State hash = players + units **only**; execution fields excluded | `src/core/game/GameImpl.ts:378-384, 389-395`; `src/core/game/PlayerImpl.ts:1138-1141` |
| `WinEvent` is dead code, not a hook | `src/core/execution/WinCheckExecution.ts:12`; zero references in `src/` or `tests/` |
| `0022`'s clientless guard is **in the tree** | `WinCheckExecution.ts:69-77` (FFA), `:113-118` (Team) |
| The guard `return`s **above** `this.active = false` (Hazard A's mechanism) | `:76` vs `:80`; `:117` vs `:121` |
| 🔴 **GameAnalytics event IDs: at most 5 colon-separated parts, ≤64 chars each, no key/value dimensions** | `node_modules/gameanalytics/dist/GameAnalytics.js` — `validateEventIdLength` = `/^[^:]{1,64}(?::[^:]{1,64}){0,4}$/`, `validateEventIdCharacters` = `/^[A-Za-z0-9\s\-_\.\(\)\!\?]{1,64}(:[…]{1,64}){0,4}$/` |
| The analytics call takes only a **numeric** value — no dimensions | `FlashistFacade.ts:196` — `flashist_logEventAnalytics(event: string, value?: number)` → `GameAnalytics.addDesignEvent` |
| Analytics are production-only | `FlashistFacade.ts:197` and `:397` — `process.env.DEPLOY_ENV === "prod"` |
| Composing a suffix onto an enum base is the **house pattern** | `src/client/Main.ts:558` — `` `${flashistConstants.analyticEvents.SESSION_HEARTBEAT}:${label}` `` |
| Helper-module + `jest.mock` of the facade is the proven client test shape | `src/client/MatchStartAnalytics.ts`; `tests/client/MatchStartAnalytics.test.ts:1-13` |
| A real-game test harness exists and can read emitted updates | `tests/core/executions/WinCheckExecution.test.ts:300-333` reads `(game as any).updates[GameUpdateType.Win]` |
| Winner tuple shapes | `src/core/Schemas.ts:485-491` — `["player", ID, …]` / `["team", SafeString, …]` / `["opponent", SafeString]`, optional |
| Part B's latches are **pre-existing** and correctly placed | `src/client/ClientGameRunner.ts:335-336, 505-514, 533-536` |
| Singleplayer stores no reconnect session | `ClientGameRunner.ts:573-575` — `saveReconnectSession` skipped when `transport.isLocal` |
| `GameUpdateType` is not serialized in `Schemas.ts` or the server; the updates record is built from `Object.values(GameUpdateType)` | `src/core/game/GameImpl.ts:949-952`; `src/core/game/Game.ts:33-35` |
| Public lobbies cannot carry a timer | `src/server/MapPlaylist.ts:162` (`maxTimerValue: undefined`, `gameType: GameType.Public` at `:156`, no later override) |
| ⛔ `GameManager.ts:63` does **NOT** support the public-only claim | It is the **private** path and the `undefined` is a default that `...gameConfig` at `:68` overrides |

**No localization change in either half** — nothing user-visible is added. `resources/lang/en.json`
and `ru.json` are untouched.

---

# PART A — multiplayer clientless-leader incidence

*(`src/core/` + client consumption. Approved and ready to build.)*

## A1 — The emission seam

**Decided: a new `GameUpdate` type, consumed in `ClientGameRunner`.** Identified as the architect's
recommendation, and adopted.

Rejected, with reasons:

| Option | Why not |
|---|---|
| Direct `src/core → src/client` import of the facade | **Crashes the worker** (`window` at module top level). Not a trade-off — an impossibility. |
| `EventBus` event consumed by a client layer | Executions hold no bus handle; `Execution.init(mg, ticks)` receives only `Game`. `WinEvent` is dead code, not a wired hook. |

✅ **This adds NO new `src/core → src/client` import**, so it adds nothing to
[`0007`](../0007-investigate-core-to-client-import-coupling/brief.md)'s open problem. That was an
explicit concern in `brief.md` §3.

## A2 — Where the emission goes

Inside `checkWinnerFFA()` and `checkWinnerTeam()`, **inside the `if (threshold || timer)` block and
above the clientless guard**, so it fires for **every** leader — clientless or not.

That one placement buys three things at once:

1. 🔴 **It survives `0205`/`0211`** (`brief.md` §1). The counter keeps meaning after the fix — it
   simply changes from *"how often we stall"* to *"how often the fallback award fires."*
2. 🔴 **It closes the `isAlive()` trap** — see the section above.
3. 🔴 **It carries its own denominator.** The leader-kind leaf includes `Human` and `AiPlayer`, so the
   rate is `(Bot + Nation + BotTeam) / all` **from one event, with no cross-event join.** It also
   directly answers **ADR-110's re-raise trigger**: the `AiPlayer` leaf is how often an AI player
   legitimately leads at the win condition (Decision 7).

⛔ **No control-flow change.** Do not touch `this.active`, do not move either `return`, do not touch
the `gameType !== GameType.Singleplayer` clause. Behaviour must be byte-identical to today apart from
the added update.

## A3 — Files

| File | Change |
|---|---|
| `src/core/game/GameUpdates.ts` | **Append** `WinConditionCheck` to `GameUpdateType`; add a `WinConditionCheckUpdate` interface and its union member. Fields are **structured-cloneable primitives only** (the payload crosses `postMessage`): `mode`, `lobbyType`, `branch`, `leaderKind`, `leaderSharePercent`, `isTutorial`. ⛔ **No `Player` references. No identifiers of any kind** — no player IDs, no Yandex IDs, no lobby IDs, no client IDs. |
| `src/core/execution/WinCheckExecution.ts` | Add `private reportedWinCondition = false;`. In **both** check methods: extract the OR'd predicate into two locals (`thresholdMet`, `timerMet`) — a pure refactor with identical semantics — then `if (thresholdMet \|\| timerMet)`, and at the **top of that block**, latch-and-`this.mg.addUpdate({...})`. Branch = `thresholdMet ? "Threshold" : "Timer"` (threshold wins if both). Add a code comment stating the payload must never become client-dependent (see [A6](#a6--determinism--argument-vs-test-stated-honestly)). |
| `src/client/WinConditionAnalytics.ts` **(new)** | Pure helpers mirroring `MatchStartAnalytics.ts`: `shouldLogWinConditionCheck(state)`, `winConditionAnalyticsEventName(update)`, `logWinConditionCheckAnalytics(update, state)`. Kept out of `ClientGameRunner` so it is unit-testable without a DOM. |
| `src/client/ClientGameRunner.ts` | Read `gu.updates[GameUpdateType.WinConditionCheck]` in the existing update handler. Gate on `this.lobby.gameRecord === undefined` (no replays), `this.lobby.isReconnect !== true` (Decision 5), and a `hasReportedWinConditionCheck` field beside `hasProcessedWin`. |
| `src/client/flashist/FlashistFacade.ts` | **One** enum key: `MATCH_WIN_CONDITION: "Match:WinCondition"`. ⛔ Never write the event string inline. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New row in the `Match:` family, plus the denominator paragraph, the reconnect caveat, the tab-closed under-count caveat, and the ADR-110 note (Decision 7). |

## A4 — The event string

```
Match:WinCondition:<FfaPublic|FfaPrivate|TeamPublic|TeamPrivate>:<Threshold|Timer>:<Bot|Nation|AiPlayer|Human|BotTeam|HumanTeam>
```

**5 parts exactly — the hard maximum.** `value` = integer leader share %.

- Mode and lobby-type are **fused** into one segment because 5 parts is a wall and four dimensions plus
  a two-part name do not fit. **Accepted cost:** you cannot slice by mode independently of lobby type
  on the dashboard; you read the four fused leaves instead.
- **Tutorial is not a segment** — a tutorial is Singleplayer and never reaches a public or private
  lobby leaf.
- 🔴 **The threshold and timer branches are never merged** (`brief.md`, *What to measure — Part A*).
  Public traffic can only ever exercise `Threshold`; a `Timer` sample is **private-lobby-only by
  construction** and its leaf says so. ⛔ **Never pool the two** — two populations counted as one
  produces a meaningless denominator.
- Naming follows the project rule: `Category:Subcategory:Value`, PascalCase, colon-separated, no
  underscores. Neighbours: `Match:Duration`, `Match:Loss:OpponentWon`, `Match:SpawnMissed:TimingRace`.

## A5 — Over-count hazards, concretely

### Hazard A — per-tick re-fire (~10⁴ events per stalled match)

`private reportedWinCondition` on the execution, set **before** the `addUpdate`. Deterministic — the
same field computes the same value on every client — and never hashed. Plus an **independent
client-side latch** in `ClientGameRunner` as belt-and-braces.

### Hazard B — per-client multiplication

🔴 **Accept it. Do NOT elect a single emitter.** *(Agreed with the architect; the reasoning below is
the coder's and is the decisive one.)*

A clientless leader leads **precisely because** humans died or left, and heartbeats drive
`executeNextTick` off `requestAnimationFrame` (`ClientGameRunner.ts:540-549`) — **a closed tab emits
nothing.** Any election therefore picks the client most likely to be gone, and so
**under-counts the exact population being measured. An under-count is indistinguishable from a true
zero**, which is the worst possible outcome for a task whose entire purpose is to find out whether
this happens at all.

The multiplication is also less harmful than it looks: the natural denominator,
`Game:Mode:Multiplayer`, is **already per-client-match** — it fires once per client on a non-replay,
non-reconnect start. Numerator and denominator sit on the **same population**, so the **ratio** is
sound.

### 🔴 Required wording in the reference doc — do not paraphrase this away

> **The denominator is client-matches, not matches.** The multiplier varies with lobby size and with
> how many clients stay to the end, so **absolute counts are uninterpretable** and skew toward large,
> well-attended lobbies. **Read only the ratio against total ended client-matches.**

⛔ **Do not leave this implicit.** An unlabelled inflated count is worse than no count, because it
looks authoritative.

### Reconnect caveat (Decision 5) — also for the doc

A reconnecting client re-simulates from turn 0 with a fresh latch, so the event would fire again;
`Game:Start` is **not** re-fired on reconnect. Suppressing on reconnect keeps numerator and denominator
on the same population, **at the cost of losing a client that was genuinely present at the crossing —
a small under-count.** Reconnects are rare, so this is small either way. It goes in the doc.

## A6 — Determinism: argument vs test, stated honestly

⚠️ **This is the item the brief flags as expensive to discover late (`brief.md:805-807`), and the
answer is genuinely mixed. Do not let it be reported as simply "tested".**

**ARGUED — and the argument is verifiable by reading the code cited above:**

- `GameImpl.hash()` (`:389-395`) sums `PlayerImpl.hash()` over `_players` and **nothing else**. An
  execution's private boolean **cannot** enter the state hash.
- `addUpdate` appends to the per-tick view stream, which is drained to `postMessage` and **never read
  back by the simulation**.
- Precedent is in the same file: `private active` and `private mg` are already non-hashed execution
  bookkeeping.

**TESTED — and this will be written:**

- Two independent games from identical inputs produce **identical `HashUpdate` sequences**.
- In the clientless case: `isActive()` is still `true` after the check, `setWinner` is still uncalled,
  and **exactly one** `WinConditionCheck` update exists — i.e. behaviour is identical to today apart
  from the added update.

**🔴 WHAT THE TEST CANNOT PROVE, said plainly:** it runs **one** game instance, so it **cannot
demonstrate cross-client agreement**. That property is secured **by design, not by test** — the emitted
payload is derived purely from game state and config and deliberately contains **no `clientID` and no
per-client data**. ⚠️ **If a future edit makes the payload client-dependent, this test will not catch
it.** Hence the required code comment at the emission site.

## A7 — Test plan

Extend `tests/core/executions/WinCheckExecution.test.ts`, using the existing `setup()`/conquer harness
at `:300-333`:

1. **FFA threshold, clientless Bot** → one update, `leaderKind: Bot`, `branch: Threshold`; `setWinner`
   still uncalled; `isActive()` still `true`. *(Verification 1)*
2. **FFA threshold, Nation (`PlayerType.FakeHuman`)** → `leaderKind: Nation`. 🔴 **The brief flags the
   Nation case as INFERRED from the shared `clientID === null` guard and NEVER OBSERVED
   (`brief.md:617-622`). This test is where it stops being an inference.**
3. **FFA threshold, human leader** → `leaderKind: Human`, `setWinner` **called** — behaviour unchanged.
4. **`PlayerType.AiPlayer` leader** → `leaderKind: AiPlayer`, `setWinner` called. *(Verification 5;
   ADR-110 — an AI player carries a real `clientID` and may legitimately win.)*
5. **Team threshold, `ColoredTeams.Bot`** → `BotTeam`. *(Verification 2)*
6. **Timer branch, both modes**, `maxTimerValue` set → `branch: Timer`. *(Verification 3.)*
   ⚠️ **Public traffic can never exercise this branch, so the unit test is the only coverage it will
   ever get. Test it separately — a green threshold test does not cover it.**
7. 🔴 **Latch (Verification 4):** tick well **past** the point where the guard has re-fired many times
   and assert the update array length is **exactly 1**, not ~90/minute. ⛔ **A test that runs a few
   ticks passes vacuously. Do not report this satisfied by reading the code.**
8. **Singleplayer and tutorial paths unchanged** — the FFA guard's carve-out still behaves as today.
   *(Verification 6)*

New files:

- `tests/core/WinCheckDeterminism.test.ts` — the two-run hash-sequence comparison from
  [A6](#a6--determinism--argument-vs-test-stated-honestly). *(Verification 7, with its stated limit.)*
- `tests/client/WinConditionAnalytics.test.ts` — event-string composition for **every** leaf; the
  replay / reconnect / latch gates; and an assertion that every produced string satisfies GameAnalytics'
  `^[^:]{1,64}(?::[^:]{1,64}){0,4}$`. Mock the facade per `tests/client/MatchStartAnalytics.test.ts:1-13`.

Then:

- `npm test` green, `npm run lint` clean. *(Verification 9)*
- ⚠️ **On a `supertest` failure:** rule out `0197`'s `SIGSEGV` first (`signal=SIGSEGV`, or a
  `node-*.ips` whose stack starts at `ClearStaleLeftTrimmedPointerVisitor`), then check CLAUDE.md's
  known-flake signature, then **re-run and say that you re-ran.** ⛔ Never give the two one root cause.
- ✅ `src/core/` changes are tested — project rule, non-negotiable. *(Verification 8)*

## A8 — What Part A honestly CANNOT measure

⚠️ **Both of these belong in the reference doc. Neither is fixable inside this task's scope.**

1. 🔴 **Clients that are gone emit nothing.** The event is emitted by **clients**. In the stall
   population, humans are frequently dead or have closed the tab; a client that is gone at the moment
   of the crossing contributes nothing. **The direction of the bias is known (under-count). The
   magnitude is NOT establishable from within this task.** Fixing it needs a server-side observer,
   which requires a new client→server message — explicitly out of scope (`brief.md` §6).
2. **Matches that end with no winner where the threshold/timer test never passed** (everyone quits;
   the 3-hour cap expires on fragmented territory) are **not counted by anything here.** Different
   question, out-of-scope site.

## A9 — Post-deploy, not checkable locally

`GameAnalytics` initialises **only** when `DEPLOY_ENV === "prod"` (`FlashistFacade.ts:397`).
⛔ **Do not weaken that gate to make local testing convenient.** Verify the **emission path** locally
(the call fires, once, with the right string and value); treat **dashboard appearance** as a separate
post-deploy check. *(Verification 11.)*

---

# PART B — Singleplayer platform-leaderboard award incidence

*(`src/client/` only.* ⏳ **PLANNED BUT HELD — see [Build order](#build-order--part-b-is-held).)***

## B0 — The existing-data check (Decision 6, owner action, no code)

🟡 **Finding, and it is the honest one: NO Part B sub-question is fully answerable with no code.**

| Existing event | Answers | Does **NOT** answer |
|---|---|---|
| `Game:Mode:Solo` | Solo match **starts**, per client | 🔴 **Over-states by the whole tutorial share** (`analytics-event-reference.md:71` — it covers *"solo mode, missions, and tutorial matches"*). Triggers on the `"start"` message, whereas `reportParticipation()` triggers later, on the first update where `myPlayer !== null` — a player who starts and leaves before that point gets the event but no point. |
| `Match:Loss:OpponentWon` | A **lower bound** on the placement-loss case | 🔴 Requires `myPlayer.isAlive()` and `!hasShownDeathModal`; `reportPlacements()` requires **neither**. It therefore misses **every eliminated human** — plausibly the majority. ⛔ **Cannot be used as the answer.** A lower bound and a cross-check, nothing more. |

**But there is a real cost saving in checking first, and it is why Part B is held:** if `Game:Mode:Solo`
is a negligible share against `Game:Mode:Multiplayer`, Part B is instrumenting a population that barely
exists and may be dropped entirely.

⚠️ **This is a dashboard read, not a code change, and it cannot be done locally** — analytics are
production-only. The owner is doing it. *(Verification 19.)*

## B1 — Files

| File | Change |
|---|---|
| `src/client/leaderboard/LeaderboardReporter.ts` | Add `gameType: GameType; isTutorial: boolean` to `ParticipationParams`; the same **plus** `humanWon: boolean` to `PlacementParams`. Emit **inside** each function, immediately after `increaseCurPlayerLeaderboardScore(...)` resolves, **regardless of its boolean result** (Decision 3), and **only** when `gameType === GameType.Singleplayer`. |
| `src/client/ClientGameRunner.ts` | Pass those fields. `gameType`/`isTutorial` from `this.gameView.config().gameConfig()`. `humanWon` from the `WinUpdate` already handed to `reportPlacements(_winUpdate)`: `winner?.[0] === "player" && winner[1] === this.lobby.clientID` (`Schemas.ts:485-491`). ⛔ **Do not change `reportPlacements`'s `_winUpdate` parameter shape** — that is `0209`. |
| `src/client/flashist/FlashistFacade.ts` | **One** enum key: `MATCH_LEADERBOARD_AWARD: "Match:Leaderboard:Award"`. ⛔ Never inline. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New row, plus the matches-not-client-matches denominator **and its reasoning**, plus the required "counts attempts, platform failures included" wording (Decision 3). |

## B2 — The event string

```
Match:Leaderboard:Award:<Participation|PlacementWon|PlacementLost>:<Solo|SoloTutorial>
```

**5 parts.** `value` = **points awarded** (1 for participation; 10/5/2 for placement).

- Won/lost is **fused into the path segment** because a sixth dimension does not exist in
  GameAnalytics.
- 🔴 **`points` — not `placement`.** `placement` never leaves the browser: `reportPlacement()` passes
  only `params.points` to `increaseCurPlayerLeaderboardScore(...)`, and `params.placement` reaches
  nothing but a `console.debug`. Measuring `placement` would measure a value that never reaches the
  platform. `placement`'s own defect is [`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md)
  and is **not this task**.
- ⚠️ **Record the points value rather than assuming it.** In Singleplayer there is exactly one
  `PlayerType.Human`, so `myIndex === 0` and it should be **10** every time — **if a value other than
  10 ever appears, an assumption in `0209` or here is wrong, and that is worth knowing.**
- 🔴 **The tutorial is NOT filtered out at emission time.** It is marked `SoloTutorial`. The dimension
  is what makes the number comparable to `0210`'s non-tutorial scope; dropping the rows destroys the
  ability to check the split later. *(Verification 14.)*

## B3 — Why this seam, and the `0210` coordination

Emitting **inside `LeaderboardReporter`, at the platform call**, satisfies `brief.md` §7 —
*"instrument where the award ACTUALLY HAPPENS, and only when it happens."* The brief correctly records
that the reporter has **no game-type awareness**; this plan therefore **threads it in via the params**.

🔴 **That is the same seam [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)
needs for its guard.** Doing it here means `0210` becomes a `return` against fields that **already
exist**, instead of a second, conflicting threading. The brief asked the two tasks to coordinate the
choice; **this is that coordination, and it runs in `0210`'s favour.**

⛔ **This task does NOT add `0210`'s guard.** Adding it would destroy this task's own measurement —
the guard makes the rate unobservable, which is the entire reason the owner asked for the measurement
first.

**A fourth game-type predicate is NOT written:** `gameType` and `isTutorial` are read straight off
`gameConfig()`, not re-derived. ⚠️ **`WinModal.isSoloOpponentWin()` is deliberately NOT reused** — it
additionally requires `isAlive()` and `!hasShownDeathModal`, which is **precisely the bias that makes
`Match:Loss:OpponentWon` a lower bound.** Reusing it would import that bias into the measurement.

## B4 — Over-count: nothing to solve, re-verified

✅ **Both hazards are already handled by pre-existing production code, not by this task.**

- **Hazard A** — `hasReportedParticipation` and `hasProcessedWin` are pre-existing fields, each set
  `true` **immediately before** its call, inside the same `if`
  (`ClientGameRunner.ts:335-336, 505-514, 533-536`). Each path fires at most once per
  `ClientGameRunner` instance.
- **Hazard B** — Singleplayer has exactly **one** client (it runs against the in-browser `LocalServer`;
  the reporting path only ever reports the local `PlayerType.Human`).
- **Replays** — both call sites already carry `this.lobby.gameRecord === undefined`.

🔴 **Consequence: Part B's denominator is MATCHES, not client-matches.** ⛔ **Do NOT copy Part A's
denominator caveat onto Part B's events** — writing a client-match caveat onto a count that is
genuinely per-match would be its own kind of lie. Record **why** (single client, pre-existing latches)
in the doc.

### ⚠️ The one residual, and it stays UNVERIFIED

**A mid-match reload builds a fresh `ClientGameRunner` and resets both latches.** The evidence says
Singleplayer cannot be resumed — `saveReconnectSession` is skipped when `transport.isLocal`
(`ClientGameRunner.ts:573-575`), and `isLocal` is true for Singleplayer — **but that is an inference
from one call site, not a test.** 📌 **Verification step 18 is a manual play-test. Report what
actually happens, not what was inferred; if a resume double-counts participation, say so in the
reference doc.**

## B5 — Test plan

New file `tests/client/LeaderboardReporter.test.ts` (mock the facade per
`tests/client/MatchStartAnalytics.test.ts:1-13`):

1. Participation on non-tutorial Solo → `Match:Leaderboard:Award:Participation:Solo`, value **1**.
   *(Verification 12)*
2. Placement loss to a bot → `…:PlacementLost:Solo`, value **10**. 🔴 **The headline case — the one
   the owner asked to measure.** *(Verification 13)*
3. Tutorial → `…:SoloTutorial` for both paths, **not filtered out**. *(Verification 14)*
4. 🔴 **Multiplayer → NO emission at all.** *(Verification 15 — the regression step that matters. A
   loosely written discriminator pollutes the multiplayer numbers Part A exists to produce, and the
   two halves would then corrupt each other.)*
5. Replay → no emission. *(Verification 16 — confirm by test rather than assuming, because a seam
   moved into `LeaderboardReporter` sits **below** the call-site guard.)*
6. GameAnalytics regex assertion on every produced string.

Manual, in a prod-like build: Verification 12, 13 (start Solo, actually lose to a bot) and **18**
(reload mid-match). ⛔ **Verification 17 — exactly one event per path per match — must not be reported
satisfied by reading the code**, even though the latches are pre-existing.

⚠️ **Scope discipline for whoever verifies this:** steps 12–20 mean running Singleplayer matches and
losing them. ⛔ **The instinct to "just add the guard" while sitting in that code is the single most
likely way this task gets ruined.** The guard is `0210`. **Measure, then leave.**

---

## Separability — direct answer

**Behaviourally: yes, fully.** Part A is `src/core/` plus a new client helper; Part B is
`src/client/leaderboard/`. No shared code, no shared event, no ordering dependency between them.
**Part B can ship alone**, and it carries **zero** determinism risk. **Part A can ship alone.**

**File-wise: NOT disjoint — say so rather than claiming clean separation.** Both halves add a key to
`FlashistFacade.ts`'s enum, both edit `ClientGameRunner.ts`, and both add a row to
`analytics-event-reference.md`.

🔴 **Mitigation, and it is load-bearing under Decision 1:** keep them as **two separate, independently
revertable commits**. The overlapping edits are additive and non-adjacent, so reverting one will not
strand the other. Under Option C this is the only thing standing between the owner and an
unattributable post-deploy regression.

---

## What I recommend NOT doing

*(Kept in full — this is the most useful part of the plan for whoever builds it.)*

1. ⛔ **Do not elect a single emitter for Hazard B.** Its bias runs in the measured direction, and an
   under-count is indistinguishable from a true zero.
2. ⛔ **Do not add a `GameServer.end()` or server-side OTEL counter.** Out of scope (`brief.md` §6), and
   it needs a new client→server message. The `isAlive()` trap it was proposed to close is **already
   closed** by [A2](#a2--where-the-emission-goes).
3. ⛔ **Do not add the architect's abandon-time companion event** (a clientless-leader check inside
   `Main.ts`'s `logActiveMatchAbandon()`). **Ruled out by the owner, Decision 4.** Independent reasons
   it should stay out: the trap is already closed; it measures a different thing ("this client walked
   away") and would be conflated with the stall rate on a dashboard; and it depends on `Main` holding a
   `GameView` handle, **which the architect did not verify.**
4. ⛔ **Do not add a player-count or lobby-activity dimension.** The brief forbids it on a guess
   (high-cardinality, definition unsettled), and there is **no room** — 5 parts is a hard wall.
5. ⛔ **Do not "fix" Hazard A by moving `this.active = false`.** That early `return` above it **is**
   `0022`'s fix; moving it reintroduces the bug and is marked ⛔ in `0022`, `0205` and this task's brief.
6. ⛔ **Do not add `0210`'s guard, do not change `awardTable` or any point value, do not touch
   `placement` or `reportPlacements()`'s `_winUpdate` parameter** (that is `0209`), and **do not touch
   `WinCheckExecution` from Part B** (Part B is downstream of it, in the client).
7. ⛔ **Do not weaken the `DEPLOY_ENV === "prod"` gate** to make local verification convenient.

---

## Scope reminders carried from the brief

- ⛔ **Instrumentation only.** This task ships no gameplay change, does not fix the stall, and does not
  add the Singleplayer guard. **Do not "just fix it while you are in there."**
- ⛔ **No identifiers, either half.** No player IDs, no Yandex IDs, no lobby IDs, no client IDs, in any
  event or dimension. **The question is a rate, and a rate needs no identity.**
- ⛔ **No per-player farm-detection dimension** ("how many Singleplayer matches did this player start").
  That is per-player behavioural tracking; it would be a separate brief with its own privacy review.
- ⛔ **No dashboard build.** Getting the events flowing is this task. Reading them is the follow-up.
- ⛔ **No secrets.** Variable names only (`DEPLOY_ENV`, `maxTimerValue`) — no values, hosts, endpoints,
  connection strings or keys. This file goes to git.
- 🔴 **`0206` was REVERTED on 2026-09-04 and was NEVER DEPLOYED.** Its fallback code is not in the tree.
  ⛔ **Do not read `0206` as shipped anywhere.** `0022`'s guard **is** in the tree, undeployed, and
  ships with this work under Decision 1 — **do not confuse the two.**
- 🔴 **A product decision hangs on the result.** ADR-110's re-raise trigger points at this measurement
  and is still unfired. ⛔ **Do not report a number without saying what it implies for ADR-110** —
  and do not edit the ADR (Decision 7).
- ⛔ **This task does not gate `0210`.** Nobody may hold `0210` waiting for a number. If the two
  collide, `0210` wins and Part B loses its window — the owner accepted that trade in advance.
- ⏳ **Ruling 7 still stands:** `0211` must not **SHIP** until `0208` is **deployed and collecting
  data** — not merely merged, not merely built. **Planning and building `0211` in parallel is
  explicitly allowed.** Neither task is `🚧 Blocked`.
