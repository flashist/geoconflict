# Measure Clientless-Leader and Singleplayer Award Incidence (task 0208)

**Source**: `ai-agents/tasks/backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`
**Status**: 🚧 **Blocked — BUILT, COMMITTED AND DEPLOYED; the DELIVERABLE NUMBER is still not read**
**Sprint/Tag**: Sprint 4 — scheduled 2026-09-04 by owner ruling; **re-ranked `Medium` → `High`** the same day

> # 🔧 CORRECTED 2026-09-07 — THIS PAGE'S "NOTHING BUILT YET" WAS STALE
>
> **Both halves are built, reviewed and committed in `6b30e22`, an ancestor of `HEAD`, and are DEPLOYED in build `0.0.141`.** Confirmed 2026-09-05: **177 `Match:WinCondition` events** observed over ~2 hours, plus one `Match:Leaderboard:Award:Participation:SoloTutorial`. The review closed out over **7 rounds (Part A 1–4, Part B 1–3) with 10 findings — 9 fixed and verified, 1 owner-accepted residual (B3)**.
>
> ⛔ **BUILT AND REVIEWED IS NOT DONE — DO NOT CLOSE THIS TASK.** This is a **measurement** task: the deliverable is **THE NUMBER — the clientless-leader share** — and there is none. ⚠️ **The 177-event midday sample proves the instrumentation works and NOTHING ELSE.** The gate is a **full-day Group-by (Event id 03/04/05)** read. It is blocked on **that read**, not on any code, commit or deploy.
>
> 🔴 **`0211`'s ship gate is therefore STILL NOT CLEAR.** ⚠️ **Do not read "deployed" as satisfying it.**
>
> 📌 **A prior marker on this task reading *"NOT DEPLOYED, NO DATA, UNCOMMITTED"* was FALSE and was corrected 2026-09-05.** Recorded so the same wrong read is not made again.
>
> 🟢 **Related, and worth knowing:** when GameAnalytics raised its per-user event-limit banner on 2026-09-06, **the first hypothesis was that this task's `WinCheckExecution` latch had failed and was emitting every 10 ticks.** The per-category breakdown **refutes it** — `Match` is flat across the spike (25.87 → 31.79 → 26.16). ⛔ **Do not re-open that line without evidence contradicting the table.** See [[tasks/gameanalytics-per-user-event-limit]].

> ### 📌 SCHEDULED INTO SPRINT 4 — 2026-09-04, owner ruling given live in session
>
> 🔴 **THIS REVERSES THE 2026-09-03 RULING THAT FILED IT** (*"File a brief, don't schedule."*).
> ⛔ **That earlier ruling was NOT wrong — it is SPENT.** It was correct for the day it was given.
> **What changed is what depends on this number.**
> ⚠️ **Scheduled is NOT started** — status stays `backlog`; **nobody is building it.**
> Its Backlog-board row is kept as `➡️ Moved`, not deleted.
>
> ### 🔴 THIS SHIPS BEFORE `0211`
>
> ⛔ **[[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`) must not SHIP until this
> task is DEPLOYED AND GATHERING DATA** — ⚠️ **"deployed and collecting", NOT merely merged or built;
> a merged metric measures nothing.** ✅ **`0211` may be planned and built in parallel — only its SHIP
> is ordered.** ⚠️ **This makes NEITHER task `🚧 Blocked`** — this one is gated by nothing, and `0211`
> waits only at the ship.
>
> **Why:** `0211` shipping first **PERMANENTLY DESTROYS this task's Part A pre-fix denominator** —
> you cannot measure how often matches stalled uncredited once they stop stalling uncredited. **No
> later opportunity, no proxy.** Owner's reasoning: **measure before you fix.**
>
> ### 📌 RE-RANKED `Medium` → `High` — AND THE PROVENANCE IS SPLIT
>
> 🔴 **The instruction to RAISE it is an OWNER RULING; the VALUE `High` is the PRODUCER'S judgement.**
> The owner named no value. ⛔ **Do not restate this as "the owner ranked it High".**
> The producer's reasoning: **asymmetric decay is decisive** — `0211` late costs XP that is *already*
> being lost, **this task late costs the number PERMANENTLY**; it now **gates a `Medium–High` task in
> the same sprint**, and a gate ranked below what it gates invites picking up the gated task first;
> and it **can reopen an ACCEPTED ADR**. **Not higher, honestly: this still only MEASURES, and no
> player is harmed by it landing a week late** — the *"measuring never outranks fixing"* principle is
> **narrowed, not abandoned**; what overrides it is **irreversibility, not importance.**
>
> ### 🔴 IT IS NOW LOAD-BEARING FOR THREE SEPARATE DECISIONS, not one
>
> 1. **ADR-110's RE-RAISE TRIGGER.** ⚠️ **Pointer corrected 2026-09-04:** it originally cited `0206`'s
>    phase-1 investigation, **which never ran because `0206` was reverted**. The work now lives here.
>    🔴 **The trigger is still UNFIRED and still LIVE — nobody has measured it** — and firing it could
>    remove *"the strongest argument for allowing it"*, i.e. **this measurement can reopen an accepted
>    ADR.**
> 2. **It SCOPES `0211`** — whether **stalled-match survivors are a real population**, which matters
>    now that survivors are in `0211`'s scope.
> 3. **It CAPS `0205`'s RANK**, which has always been held down by unmeasured frequency.
>
> ✅ **Part A's decay clock STOPPED** — because `0206` was reverted and **never deployed**, the pre-fix
> baseline is measurable again. It is **`0211` shipping** that would restart the clock and destroy it.

> ⚠️ **THE FOLDER NAME UNDER-DESCRIBES THIS TASK, DELIBERATELY.** It still reads
> `0208-measure-clientless-leader-at-win-condition-in-production`, which now names only half the scope.
> **Renaming would break every inbound link — including ones `0206`'s close had re-pointed minutes
> before the widening.** ⛔ **Do not "fix" the folder name.** The scope is what this page and the
> brief's scope section say, not what the folder says.

## Goal

**Instrumentation only. This task ships no gameplay change, fixes no stall, and adds no guard.**

Since the owner's 2026-09-03 ruling *"Add it — measure both"*, it has **two halves that must not be
merged.** They share a motive, not a measurement: different questions, on different code, in different
tiers.

| | Half | Question | Tier |
|---|---|---|---|
| **A** | Multiplayer clientless-leader incidence *(as originally filed)* | How often, in live production, is the leader at the moment the win condition fires a player or team with **no client** behind it? | `src/core/` |
| **B** | Singleplayer platform-leaderboard award incidence *(the 2026-09-03 widening)* | How often does the client award platform-leaderboard **points** out of **non-tutorial Singleplayer**, and by which of the two paths? | `src/client/` |

⛔ **Part A excludes AI players.** `PlayerType.AiPlayer` carries a real `clientID` and, per
[[decisions/adr-110-ai-winner-allowed]], may legitimately win. **An AI-player win is a normal win, not
a stall.** Part A's clientless leader means a **Bot** (`PlayerType.Bot`) or a **Nation**
(`PlayerType.FakeHuman`) in FFA, or the `ColoredTeams.Bot` team in Team mode.

**Why it exists:** today's evidence for both `0205` and `0206` is a **headless simulator result, not a
field observation**. Nobody knows the production rate. That is the entire gap.

## Key Changes

⚠️ **Corrected 2026-09-07 — this section previously read *"Nothing built yet."* It is built, committed (`6b30e22`) and deployed (`0.0.141`).** The design shape below is what shipped; the spec now lives in `ai-agents/knowledge-base/analytics-event-reference.md`.

### 🔴 Build dashboards from the REACHABLE set, not from the event grammar

**`Match:WinCondition` — 21 reachable ids, not 56.** The two leaf sets are **disjoint**: FFA emits only `Bot|Nation|AiPlayer|Human` (one per `PlayerType`), team mode only `BotTeam|NationsTeam|HumanTeam`. **7 leader leaves, not 7 per mode** ⇒ `(4 FFA + 3 team) × 2 lobby types × 2 branches` = **28 grammatically reachable**. Of those, the **seven `…Public:…:Timer` ids are also unreachable**, because public lobbies carry no `maxTimerValue`. **28 − 7 = 21 that can actually appear.**

⚠️ **A panel per cross-product leaf would show 35 permanently-empty series, which reads as telemetry loss.**

**`Match:Leaderboard:Award` — 5 reachable ids, not 6.** `…:PlacementLost:SoloTutorial` **cannot currently fire**: tutorials are hard-coded FFA and `LocalServer` forces `disableNPCs` on, so a clientless leader hits `0022`'s guard and returns before `setWinner` — only a human win reaches the placement path. ⚠️ **The leaf is deliberately kept, not deleted** — it becomes reachable the moment `0205` / `0211` removes that guard, and the composer sweeps all six on purpose so removing the guard needs no analytics change.

### Denominators — the two halves use DIFFERENT ones, and copying one onto the other is wrong

- **Part A's denominator is client-matches, not matches.** The server never simulates, so every connected client emits its own copy; the multiplier varies with lobby size and with how many clients stay to the end. ⛔ **Absolute counts are uninterpretable and skew toward large, well-attended lobbies. Read only the ratio** against `Game:Mode:Multiplayer`, which is already per-client-match. A single elected emitter was deliberately **not** used: a clientless leader leads *because* humans died or left, so any election picks the client most likely to be gone.
- **Part B's denominator is matches.** Singleplayer runs one client against the in-browser `LocalServer`, and both call sites are latched once per `ClientGameRunner` and already skip replays.

### Known under-counts — read Part A as a LOWER BOUND

1. **Clients that are gone emit nothing.** Direction of the bias is known; **magnitude is not establishable without a server-side observer**, which was out of scope.
2. **Reconnects are suppressed**, keeping numerator and denominator on the same population at the cost of losing a client that genuinely was present.
3. **Matches ending with no winner** — everyone quits, or the 3-hour cap expires on fragmented territory — **are counted by nothing here.**

⚠️ **Part B counts ATTEMPTS, platform failures included.** The event is emitted after the platform call settles, whatever it returned, and also when it rejects. **A rise is not evidence any player's leaderboard score moved.**

⚠️ **One unverified residual:** a mid-match reload builds a fresh `ClientGameRunner` and resets both latches. Singleplayer *appears* unable to resume — but that is **static analysis, not a play-test.**

### The original design instructions, which the build honoured

**Dimensions Part A is useless without:** game mode (FFA vs Team) · lobby type (public vs private) ·
**branch (threshold vs timer)** · leader kind (Bot / Nation / bot-team).

⚠️ **The two branches must stay distinguishable, never merged.** Public lobbies ship
`maxTimerValue: undefined` (`src/server/MapPlaylist.ts`), so **the timer branch cannot fire in a public
lobby at all**. A single undifferentiated counter would read as *"the timer route never happens"* —
which is a property of the config, not a finding.

**Two design instructions that keep the metric honest:**

- 🔴 **Instrument the DECISION POINT, not the guard's early return.** A counter inside the `return` path
  goes silently to zero the day the fallback award replaces it — while still drawing a healthy green
  line on a dashboard. Recording it where the win condition has fired and the leader is identified,
  *before* the disposition is decided, keeps the question comparable after the fix: it simply becomes
  *"how often does the fallback award fire?"*
- 🔴 **Emit at most once per match — Part A faces two over-count hazards that multiply.**
  **Hazard A, per-tick re-fire:** the guard returns above `this.active = false`, so a stalled match
  re-emits roughly **90 events per minute** for up to the 3-hour cap — order **10⁴ events from one
  match**. **Hazard B, per-client multiplication:** the server never simulates, so every connected
  client emits its own copy. 🚩 A latch only half-solves Hazard B — the denominator becomes
  **client-matches, not matches** — and the plan must **either** de-duplicate to one emitter **or**
  write that denominator into the analytics reference doc. ⛔ Never leave it implicit.

### 🟢 Part B has NO over-count problem — and this must not be copied across from Part A

**Verified by reading the code, not assumed.** Both of Part A's hazards are absent:

- **Hazard A does not apply — the latches already exist in production code.** `ClientGameRunner`
  declares `hasReportedParticipation` and `hasProcessedWin` as fields, **each set `true` immediately
  before its call, inside the same `if`.** Each path fires **at most once per `ClientGameRunner`
  instance**. This task does not have to add them.
- **Hazard B does not apply — Singleplayer has exactly one client.** `Transport.ts` sets `isLocal` for
  `GameType.Singleplayer`, so the match runs against the in-browser `LocalServer`.

🔴 **Consequence: Part B's denominator is MATCHES, not client-matches.** ⛔ **Do not copy Part A's
denominator caveat onto Part B's events** — writing a client-match caveat onto a genuinely per-match
count would be its own kind of lie.

- ✅ **Replays are already excluded cleanly** — both call sites carry `gameRecord === undefined`.
- ⚠️ **One residual left deliberately unverified: a mid-match page reload.** A fresh page load builds a
  fresh `ClientGameRunner`, resetting both latches. Whether a Singleplayer match can be resumed at all
  was **not tested**. The evidence points at *no* — `saveReconnectSession` is skipped when
  `transport.isLocal`, which is true for Singleplayer — **but that is an inference from one call site,
  not a test.** 📌 Leave it to plan time; **do not report it settled either way.**

### 🔴 Part B counts `points`, never `placement`

**`placement` never leaves the browser.** A measurement of it measures a value that reaches nothing and
answers nobody's question. Count **points awarded**. `placement`'s own defect is
[[tasks/placement-semantics-literal-one]] and is **not this task**. See the keep-them-apart table on
[[decisions/clientless-leader-win-policy]].

**Both award paths are in scope, and the unguarded one is the farmable one:**

| Path | Trigger | Awarded | Why in scope |
|---|---|---|---|
| **`reportParticipation()`** | Once per match, first time `myPlayer !== null`, not a replay | **1** point | 🔴 **The farmable path — entirely unguarded, no game-type check of any kind.** It fires on a match *started*: no win, no loss, no opponent needed. **A measurement that only counts `reportPlacements()` misses it entirely.** |
| **`reportPlacements()`** | Once per match, on the first `Win` update, not a replay | `[10, 5, 2]` by index; Singleplayer has exactly one Human ⇒ `myIndex === 0` ⇒ **10 points for LOSING to a bot** | The shape `0210` was filed on, and the more offensive number |

**Part B's dimensions:** path (participation vs placement) · **tutorial vs non-tutorial** (🔴 the
load-bearing split — `0210`'s scope is non-tutorial) · points awarded · outcome (human won vs lost, on
the placement path).

### 🟡 Part of Part B may already be answerable with NO CODE — check first

- **`Game:Mode:Solo` already ships.** But it is **not the same number**, and both differences push the
  wrong way: it **includes the tutorial** (so it over-states non-tutorial Singleplayer by the whole
  tutorial share), and it fires on the `"start"` message rather than at `reportParticipation()`'s later
  trigger.
- **`Match:Loss:OpponentWon` already ships and is a PARTIAL proxy — biased LOW.** It carries almost the
  right predicate, but it **also requires `myPlayer.isAlive()` and `!hasShownDeathModal`, and
  `reportPlacements()` requires neither.** A human **eliminated** in Singleplayer still receives the 10
  points and fires no such event. ⛔ **It cannot be used as the answer** — a lower bound and a
  cross-check, nothing more.

### Boundaries

- ⛔ **No identifiers, either half.** No player IDs, Yandex IDs, lobby IDs or client IDs. **It is a
  rate, and a rate needs no identity.**
- ⛔ **Do not add a per-player "how many Singleplayer matches did they start" dimension.** It is the
  obvious farm-detection instinct and it is **per-player behavioural tracking** — a separate brief with
  its own privacy review, if ever wanted.
- ⛔ **Do not add a player-count or lobby-activity dimension on a guess** — high-cardinality, definition
  unsettled. Raise it at plan time.
- ⛔ **No server-side OTEL counter** (the server cannot see this event at all), **no dashboard build**,
  **no change to `WinCheckExecution`'s behaviour**, and ⛔ **do not add `0210`'s guard while in the
  code** — 🔴 that guard makes the rate unobservable, which is the entire reason the owner asked for
  the measurement first.
- ⚠️ **Analytics is production-only** — `GameAnalytics` initialises only when `DEPLOY_ENV === "prod"`.
  Verify the **emission path** locally; treat the **dashboard appearance** as a separate post-deploy
  check. ⛔ **Do not weaken that gate for local convenience.**
- ⚠️ **Part A's emission seam is an open design decision this brief deliberately does not make** — the
  instrumentation point is in `src/core/`, the analytics client in `src/client/`. It expects an
  **`fkit-architect` consult at plan time**. `WinCheckExecution`'s `WinEvent` class is **dead code
  referenced nowhere else — not a hook.** **Part B needs no such consult**, being entirely in
  `src/client/`. ⚠️ Part B's simplicity does **not** discharge Part A's architect consult or its
  determinism check.
- ⚠️ **The two halves are separately shippable.** If only one can be built, say which and why — do not
  silently half-do both.

## Outcome

**Not started. Nothing gates it; nobody is building it.**

**Priority `Medium` — the producer's rank, not the owner's.** The owner ruled *that it be filed*, *that
it not be scheduled*, and *that it measure both halves*. **They have never ranked it.** It was
re-ranked one notch (Medium–low → Medium) on the widening, because there are now **two decaying
windows, not one**, and Part B is cheaper per answer. It stays **below a fix**: measuring never
outranks fixing.

### 🚩 The value decays — and Part B decays harder

- ✅ **PART A'S CLOCK HAS STOPPED, as of 2026-09-04 — `0206` was REVERTED and NEVER DEPLOYED**, so the
  pre-fix denominator is **intact and still measurable.** 🔴 **The decay is caused by DEPLOY, not by a
  close** — and the deploy that would now cause it is **`0211`'s**, which is exactly why `0211`'s ship
  is ordered behind this task.
  ~~Part A survives `0206` as a *different* question (*"how often does the fallback award fire?"*).~~
  🔴 **Struck — there is no fallback award to count.** Part A is back to its original question.
  ⚠️ **The check at plan time is unchanged in kind, only in target:** verify **`0211`'s** deploy state
  before reporting a number, or it lands against the wrong denominator.
- 🔴 **Part B has NO successor question.** `0210`'s ruling is *report nothing*, so once its guard ships
  the counter reads **zero forever, by design**. **Part B is a snapshot with an expiry date**, and the
  brief says so rather than pretending otherwise.

### 🔴 It does not gate `0210` — stated twice in the brief on purpose

The owner's `0210` ruling was **explicitly not conditioned on incidence**; option C (*leave it, accept
the inflation*) was rejected on **farmability**, with the reasoning that unmeasured incidence does not
rescue it. ⛔ **Do not turn `0210` into a dependent task, do not add a "blocked by `0208`" marker, and
do not hold its plan waiting for a number.** If the two collide, **`0210` wins and Part B loses its
window** — the owner accepted that trade in advance.

**Consumers currently reasoning without this number:** `0205` (whose held Low–Medium rank rests on a
claim about the real lobby-activity distribution, which has never been measured), `0205`'s
investigation step 2, `0210`, and — added 2026-09-04 — **`0211`** (whether stalled-match survivors are
a real population) and **ADR-110's re-raise trigger**.
⚠️ **They are consumers, not dependents** — 🔴 **with one exception added 2026-09-04: `0211`'s SHIP is
genuinely ordered behind this task.** ⛔ That is still **not** a `🚧 Blocked` marker on either.

## Related

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, built **without** this measurement and then **REVERTED 2026-09-04**, which is what handed the pre-fix baseline back
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, **whose ship is ordered behind this task** because it would permanently destroy Part A's denominator
- [[tasks/teams-bot-team-win-stall]] — task `0205`, whose held rank rests on the unmeasured lobby-activity distribution this would measure
- [[tasks/placement-semantics-literal-one]] — task `0209`, which owns `placement`; this task counts **`points`**. Adjacent, and a live conflation risk rather than a dependency
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, the reason Part B exists and the guard that ends Part B's window
- [[decisions/clientless-leader-win-policy]] — the defect this measures, and the `placement`/`points` keep-them-apart table
- [[decisions/adr-110-ai-winner-allowed]] — why AI players are **excluded** from Part A's clientless-leader definition
- [[systems/analytics]] — the event conventions, the enum, the reference doc, and the `DEPLOY_ENV === "prod"` gate this task works inside
- [[decisions/sprint-backlog]] — the board this was filed on and **moved OFF 2026-09-04** (its row there reads `➡️ Moved`)
- [[decisions/sprint-4]] — 🔄 **the board this task is now ON**, scheduled 2026-09-04 and raised to `High`
- [[systems/player-profile-store]] — the crediting path whose silence this task measures, and where `creditMatchXp`'s single call site lives
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, whose per-category breakdown **exonerated this task's instrumentation** as the cause of the 4 Sep per-user event breach
