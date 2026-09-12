# Measure Clientless-Leader and Singleplayer Award Incidence (task 0208)

**Source**: `ai-agents/tasks/done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md` — read its `🔴 CLOSING RECORD` at the top of `## Status` first; `worklog.md` in the same folder carries the build and the `V18` run. 🔧 **Path corrected 2026-09-11: the task folder moved `backlog/` → `done/` on close, and this field still pointed at `backlog/`.**
**Status**: ✅ **done (agent-closed — not owner-verified)** — closed 2026-09-11 on an owner ruling. ⛔ **NOT a clean close and NOT fully verified: `V16` and `V17` close UNTESTED** (see the closing record below)
**Sprint/Tag**: Sprint 4 — scheduled 2026-09-04 by owner ruling; **re-ranked `Medium` → `High`** the same day

> # 🔴 CLOSED 2026-09-11 — AND ⛔ **NOT VERIFIED**. READ THIS BEFORE ANY FIGURE ON THIS PAGE.
>
> **The owner ruled the close, live in session, relayed through the lead.** The closing producer was
> spawned without an owner channel, so the close carries the **`(agent-closed — not owner-verified)`**
> marker required by ADR-033 §5 — ⚠️ better-evidenced than a typical agent close (the owner ruled it,
> and every figure was read from the owner's own browser session), **but the marker still applies.**
>
> **✅ What was delivered:** both deliverable numbers — **Part A** (clientless-leader share at the win
> condition) and **Part B** (Singleplayer platform-leaderboard award incidence) — plus the **award-kind
> split** and the **award-kind × mode cross-tab**. All four read **4–10 September 2026, full days**, in
> the same session and the same window. **`V18` was RUN and PASSED by observation.**
>
> **⛔ What it closes WITHOUT — a knowing choice, not an omission:**
>
> - 🚨 **`V16` AND `V17` WERE NEVER TESTED AND CLOSE UNTESTED**, argued from source only. **`V16`** —
>   neither Part B event fires while watching a **replay**; **`V17`** — **exactly one event per path per
>   match.** ⛔ **The brief's own step 17 bars reporting `V17` satisfied by reading the code**, and it
>   was not tested. 📌 **The owner was OFFERED the chance to test them first and CHOSE TO CLOSE.**
>   ⛔ **No page may imply this task is fully verified.**
> - 🔴 **THE PER-MATCH STALL RATE WILL NEVER BE KNOWN, AND THE COST IS NOW SPENT — NOT PENDING.**
>   ~~the pre-fix denominator disappears permanently the moment `0211` ships~~ ✅ **`0211` SHIPPED
>   2026-09-12. THE DENOMINATOR IS GONE.** 📌 **Struck, not deleted — it was a prediction, and the
>   prediction came true on schedule.** Owner ruling of 2026-09-11 (**option B**): accept the
>   client-side number as a **directional lower bound**, ⛔ **build NO server-side counter.**
>   **A deliberate, accepted, irreversible loss of a measurement — now actually incurred.**
>   ⛔ **Do not re-propose it later as a gap someone should close.** ⚠️ **Every figure on this page is
>   therefore a PERMANENT HISTORICAL RECORD: it can never be re-measured, re-derived or corrected.**
>
> **⚠️ Caveats that travel with EVERY figure on this page, permanently:**
>
> 1. 🔴 **Part A's unit is CLIENT-MATCHES, not matches** — one event per **client** per match, so an
>    N-client lobby contributes N identical rows. ⛔ **Absolute counts are uninterpretable; only ratios
>    are safe**, and even those are weighted by lobby size and by how many clients stayed.
> 2. 🔴 **Every leaderboard figure is award ATTEMPTS, platform failures included — NEVER points
>    confirmed banked.** ⛔ **A rise is not evidence any player's score moved.**
> 3. 🔴 ***"52 % of Team matches stalled" is NOT a supported claim.*** See the verbatim sentence below.
>
> **📌 Consequences of the close:** `0211`'s **ship gate was CLEARED** (~~⚠️ cleared is **not** scheduled —
> `0211` stays `🔲 Backlog` and nobody is building it~~ ~~🔴 **the owner then ruled BUILD `0211`; it is now
> `🔄 In progress`** — with no session owning it, no plan approved and no code written~~ 📌 **BOTH
> SUPERSEDED — struck, not deleted; each true when written.** ✅ **`0211` SHIPPED AND CLOSED 2026-09-12**
> — see [[tasks/credit-participation-xp-elimination-or-match-end]]) ·
> 🔴 **`0205` WAS RE-RANKED ON AN OWNER RULING the same day, AND SIGNED OFF THE SAME DAY** — ✅ **the
> rank in force is `Medium`** (~~🟡 producer proposes `Medium`, ⛔ **rank in force still `Low–Medium`**~~
> struck, not deleted). ⛔ **Three layers:** owner ruled **THAT** · producer proposed the **VALUE** ·
> owner **SIGNED IT OFF** — never *"the owner ranked it `Medium`"*, never *"the producer set it"*.
> ⛔ status/scope/folder unchanged ·
> `0210` now has its incidence figure, ⛔ **its
> status, scope and rank are UNCHANGED** · **ADR-110's re-raise trigger has fired only in the sense
> that the measurement now EXISTS** — ⛔ **recorded as an INPUT REQUIRING AN ARCHITECT'S READ, NOT as a
> conclusion about ADR-110.**

> ### 🟢 THE MEASUREMENT — PART A, read 2026-09-11 off the dashboard, window 4–10 Sep 2026
>
> 🔴 **Unit: CLIENT-MATCHES. Read caveat 1 above before any number here.** ⚠️ **Provenance: read off the
> GameAnalytics dashboard in the owner's browser by the lead session; a coder then verified every
> interpretation against the code, read-only. NOT reproducible from the repository.** ⚠️ **Figures are
> as the dashboard rounds them — APPROXIMATE, not exact.**
>
> | Dimension | Values |
> |---|---|
> | **mode** | `TeamPublic` **3.72K** · `FfaPublic` **3.14K** — ⚠️ **ZERO private-lobby events in the window** |
> | **branch** | `Threshold` **6.86K — 100 %**; the **timer branch fired ZERO times** |
> | **leader** | `Human` **3.00K** · `BotTeam` **1.95K** · `HumanTeam` **1.74K** · `AiPlayer` **89** · `Nation` **50** · `NationsTeam` **29** |
> | **Total** | **6.86K client-matches** |
>
> **Derived rates — ⚠️ ALL LOWER BOUNDS, at the client-match unit:**
>
> | Rate | Value | Arithmetic |
> |---|---|---|
> | **FFA clientless-in-front** | **~1.6 %** | `Nation` 50 / 3,139 |
> | **Team clientless-in-front** | **~53.2 %** | (`BotTeam` 1,950 + `NationsTeam` 29) / 3,719 |
> | **Team stall-capable** (`BotTeam` only) | **~52.4 %** | `BotTeam` 1,950 / 3,719 |
> | **Overall clientless-in-front** | **~29.1 %** | 1,999 / 6,858 |
>
> ⛔ **53.2 % and 52.4 % are DIFFERENT NUMBERS and must never be substituted for one another.**
> **`NationsTeam` is clientless in front but is NOT part of the stall population:** the Team guard tests
> only `ColoredTeams.Bot`, so **a leading all-Nations team IS declared winner and the match ENDS** —
> with a winner tuple carrying zero client ids.
>
> #### 🔴 A firing records who was FIRST PAST THE POST, not how the match ENDED
>
> The event is latched at the **first crossing**; the win check keeps running after a clientless leader
> is turned away and emits nothing further. ⚠️ **A `BotTeam` row where a human team later won still
> reads `BotTeam`.** Three biases pull in **both** directions — client-match weighting and tab-closed
> clients **under**-state the match rate, first-crossing latching **over**-states it — and 🔴 **the net
> magnitude is NOT establishable from this event.**
>
> > ⛔ ***"52 % of Team matches stalled" is NOT a supported claim.*** **The defensible sentence, and it
> > travels VERBATIM:**
> > *"in 52 % of measured Team-mode client-matches that reached the win condition, the leader at that
> > moment was the all-bot team, and no winner could be declared at that moment."*
>
> #### ⚠️ `Timer: 0` is EXPECTED — and must NOT be read as "matches never run out of time"
>
> The timer branch is instrumented on the **same line** that produced every `Threshold` row, but
> `maxTimerValue` is hardcoded `undefined` in public lobbies (`src/server/MapPlaylist.ts`) and is
> settable only by a private-lobby host or in Singleplayer — the latter dropped client-side. **It was
> documented as unreachable before deploy.** ⚠️ **Zero private-lobby events in the window is the SECOND
> reason it is zero.**
>
> 🔴 **THREE TERMINATION PATHS EMIT NOTHING AND ARE GENUINELY UNMEASURED:** the 3-hour
> `maxGameDuration` kill (`src/server/GameServer.ts`), the ordinary **all-clients-left** end of a
> stalled match, and **a match where no leader survives to cross** (`players()` filters to `isAlive()`
> — the 2026-09-04 100 %-Nation finding).
>
> #### ⚠️ FFA's zero `Bot` leaders is an AGGREGATION ARTEFACT, not a population difference
>
> Both modes run `bots: 400`. **FFA tests one individual against 80 %; Team sums all 400 bots into one
> team against 95 %.** ⛔ **`Bot` and `BotTeam` are NOT comparable quantities.** *(A separate, real
> asymmetry does exist for nations: public Team lobbies disable NPCs except in the `Humans Vs Nations`
> slot, 1 of 7.)*
>
> #### 📌 `AiPlayer` 89 — ADR-110's re-raise trigger, and how to read it
>
> **89 firings in 7 days.** An `AiPlayer` carries a real `clientID`, never enters the clientless guard,
> and **may legitimately be declared winner under ADR-110** — so these are normal wins, not stalls.
> **On ADR-110, stated carefully and NOT overreached:** the **FFA** clientless case is **rare (1.6 %)**,
> the direction that **weakens the strongest argument for the `allow` ruling — FOR FFA ONLY.**
> ⛔ **It is emphatically NOT rare in Team mode (53.2 %).** 📌 **Recorded as an INPUT REQUIRING AN
> ARCHITECT'S READ — ⛔ NOT as a conclusion about ADR-110.** See [[decisions/adr-110-ai-winner-allowed]].

> ### 🟢 THE MEASUREMENT — PART B, read 2026-09-11, same session and window (4–10 Sep 2026)
>
> 🚨 **CAVEAT FIRST — THE FIGURES ARE MEANINGLESS WITHOUT IT: THESE ARE AWARD *ATTEMPTS*, PLATFORM
> FAILURES INCLUDED — NEVER POINTS CONFIRMED BANKED.** The event fires after the platform call settles,
> **whatever it returned, including a rejection** — which is exactly what a platform failure looks like
> from here. ⛔ **That applies to the 49.64K headline too.** ⚠️ **Same provenance and same rounding
> caveat as Part A.**
>
> ✅ **"All Singleplayer" is the SCOPE, not a finding** — multiplayer emits nothing, deliberately.
> ⛔ **Do not record the absence of a multiplayer value as a discovery.**
>
> | Dimension | Values |
> |---|---|
> | **mode leaf** | `Solo` **65.45K** · `SoloTutorial` **13.66K** |
> | **award kind** | `Participation` **62.29K** · `PlacementWon` **14.28K** · `PlacementLost` **2.53K** |
> | **Total** | **79.11K award ATTEMPTS** |
>
> **The award-kind × mode cross-tab** (filtered to `Solo`, grouped by award kind):
>
> | Award kind | `Solo` (non-tutorial) | Combined | ⇒ tutorial share |
> |---|---:|---:|---:|
> | `Participation` | **49.64K** | 62.29K | 12.65K |
> | `PlacementWon` | 13.28K | 14.28K | 1.00K |
> | `PlacementLost` | **2.53K** | 2.53K | **0** |
> | **Total** | **65.45K** | **79.11K** | **13.66K** |
>
> ⚠️ **One rounding artefact, recorded so nobody reads it as an error:** the tutorial column sums to
> 13.65K against the 13.66K `SoloTutorial` total read separately. **The 0.01K gap is the dashboard's
> rounding, not a missing row.**
>
> 🟢 **The number `0210`'s scope actually wanted: the NON-TUTORIAL MATCH count is `Solo`
> `Participation` — 49.64K, about 7.1K/day.** Participation is awarded **once per reporting match**, so
> the non-tutorial `Participation` count **is** the non-tutorial match count. ⛔ **The other 15.81K
> `Solo` rows are placement awards riding on those SAME matches — NOT additional matches.**
> ⚠️ **Attempts, not points banked.**
>
> - **~62.29K Singleplayer matches reported to the platform leaderboard** across both leaves, ~8.9K/day.
> - **~27 % of reporting matches reach a placement outcome** (16,810 / 62,290). ⚠️ **Record the rest as
>   UNRESOLVED-TO-PLACEMENT, CAUSE NOT ESTABLISHED.** ⛔ **Do not write it down as abandonment — that is
>   an inference the data does not state.**
> - **Among matches that DO place, ~85 % are wins** (14,280 / 16,810).
> - **Tutorials reach a placement far less often — ~7.9 % vs ~31.8 %.** ⛔ **AN OBSERVATION ONLY. NO
>   CAUSE IS OFFERED AND NONE MAY BE INFERRED** — not abandonment, not tutorial length, not design.
>
> #### 🔴 THE TRANSFERABLE LESSON — a forbidden shortcut, PROVED WRONG by the measurement
>
> Applying the blended **82.7 % `Solo` share** to the 62.29K combined match count would have produced
> **~51.5K** against an actual **49.64K** — **overstating by ~1.9K matches (~3.7 %)**, with every
> appearance of precision. **The `Solo` share is NOT uniform across award kinds, and the data proves it:
> `Participation` 79.7 % · `PlacementWon` 93 % · `PlacementLost` 100 %.**
> 🚨 **A marginal share is only safe to multiply into a sub-population when it is known to be uniform
> across it — and here it demonstrably was not.** ⛔ **Do not repeat the shortcut on another cross-tab.**
>
> #### ✅ `PlacementLost:SoloTutorial` — a code-derived prediction now VERIFIED IN PRODUCTION DATA
>
> `PlacementLost` is **identical in both columns (2.53K)**, so the `SoloTutorial` contribution over the
> full 7-day window is **exactly zero**. The reference doc predicted this **from reading the code alone**
> — tutorials are hard-coded FFA with `disableNPCs`, so a clientless leader hits `0022`'s guard and
> returns before `setWinner`, and the placement path never runs. 📌 **Record it as a code-derived
> prediction now confirmed against production data, not as a fresh finding.**
> ⚠️ **This confirms the zero is real TODAY; it does NOT make it permanent and does NOT license deleting
> the leaf** — it becomes reachable the moment `0205` / `0211` removes that guard. **Build dashboards
> from the five.**

> ### 🟢 THE `V18` PLAY-TEST — RUN 2026-09-11, PASSED BY OBSERVATION
>
> Performed by the **lead via browser automation**, in a tab **the owner brought to the foreground**.
> 📌 **An earlier attempt in a BACKGROUNDED tab was ABANDONED** — the browser throttled the game loop,
> so the match did not tick at full speed. **The foreground run is the one that counts.**
>
> **Conditions:** production, build **`0.0.141`** · **Singleplayer custom game** on **World** ·
> ⛔ **NOT the tutorial** (auto-launched on first visit, explicitly skipped — `SoloTutorial` is a
> different leaf and answers a different question) · match genuinely **live and ticking** (~36 s,
> `Anon551`, 10.6K troops, 25.8K gold) · action: a plain **page reload**.
>
> 🟢 **Result: the reload returned straight to the MAIN MENU** — no rejoin prompt, no resumed match.
> ⇒ ✅ **A Singleplayer match CANNOT be resumed after a reload**, so the fresh `ClientGameRunner` a
> reload builds — which resets `hasReportedParticipation` and `hasProcessedWin` — has **no earlier match
> to double-count against.** ✅ **The no-resume conclusion is now an OBSERVATION, not an inference.**
>
> **Two honest details, recorded rather than glossed:** the player's **area read `0.0 %`** at the moment
> of reload (troops and gold, little or no captured territory — ⛔ it does not affect what `V18` tests);
> and, **incidental and not a finding**, **tutorial completion PERSISTED across the reload** even though
> the match did not.
>
> ⛔ **`V18` PASSING DISCHARGES `V18` AND NOTHING ELSE. `V16` and `V17` are UNCHANGED and UNTESTED.**

> # 🔧 CORRECTED 2026-09-07 — THIS PAGE'S "NOTHING BUILT YET" WAS STALE
>
> **Both halves are built, reviewed and committed in `6b30e22`, an ancestor of `HEAD`, and are DEPLOYED in build `0.0.141`.** Confirmed 2026-09-05: **177 `Match:WinCondition` events** observed over ~2 hours, plus one `Match:Leaderboard:Award:Participation:SoloTutorial`. The review closed out over **7 rounds (Part A 1–4, Part B 1–3) with 10 findings — 9 fixed and verified, 1 owner-accepted residual (B3)**.
>
> ~~⛔ **BUILT AND REVIEWED IS NOT DONE — DO NOT CLOSE THIS TASK.** This is a **measurement** task: the deliverable is **THE NUMBER — the clientless-leader share** — and there is none. ⚠️ **The 177-event midday sample proves the instrumentation works and NOTHING ELSE.** The gate is a **full-day Group-by (Event id 03/04/05)** read. It is blocked on **that read**, not on any code, commit or deploy.~~
> 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **The full-day read was taken (4–10 Sep 2026) and the task was closed on an owner ruling.** ⛔ **The task is still NOT fully verified — `V16` and `V17` close untested.** See the closing record above.
>
> ~~🔴 **`0211`'s ship gate is therefore STILL NOT CLEAR.** ⚠️ **Do not read "deployed" as satisfying it.**~~
> ✅ **SPENT 2026-09-11 — `0211`'s SHIP GATE IS CLEARED by the owner's option-B ruling.** ~~⚠️ **Cleared is not scheduled** — `0211` stays `🔲 Backlog` and nobody is building it.~~ 📌 **SUPERSEDED LATER THE SAME DAY — struck, not deleted; true when written.** 🔴 **The owner then ruled BUILD `0211`, and it now reads `🔄 In progress`** — ⚠️ **a compromise token: no session owns it, no plan is approved, no code is written.**
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
> ### ~~🔴 THIS SHIPS BEFORE `0211`~~ → ✅ **SATISFIED AND SPENT. Kept, not deleted.**
>
> ✅ **The ordering was HONOURED:** this task was deployed (build `0.0.141`, commit `6b30e22`),
> collected 4–10 Sep 2026, and **closed 2026-09-11** — *then* `0211` shipped **2026-09-12.**
> 🔴 **So the denominator loss below is the ACCEPTED PRICE PAID ON SCHEDULE, not a violation and not an
> accident.** ⛔ **The constraint is now historical — do not apply it to any future task.**
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
>    ~~🔴 **The trigger is still UNFIRED and still LIVE — nobody has measured it**~~ 📌 **SPENT
>    2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **THE MEASUREMENT NOW EXISTS** — FFA
>    clientless **~1.6 %**, Team **~53.2 %**, `AiPlayer` **89 firings in 7 days**. ⛔ **That is the
>    trigger firing only in the sense that the measurement exists — it is an INPUT REQUIRING AN
>    ARCHITECT'S READ, NOT a conclusion about ADR-110, and nothing about that ADR has changed.**
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

~~⚠️ **One unverified residual:** a mid-match reload builds a fresh `ClientGameRunner` and resets both latches. Singleplayer *appears* unable to resume — but that is **static analysis, not a play-test.**~~
✅ **DISCHARGED 2026-09-11 BY OBSERVATION — struck, not deleted; TRUE WHEN WRITTEN.** `V18` was run on
production `0.0.141` and **passed**: the reload returned straight to the main menu. **No resume ⇒ no
double-count.** ⛔ **This discharges `V18` ALONE — `V16` and `V17` remain untested.** See the `V18` box
at the top of this page.

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
- ~~⚠️ **One residual left deliberately unverified: a mid-match page reload.** A fresh page load builds a
  fresh `ClientGameRunner`, resetting both latches. Whether a Singleplayer match can be resumed at all
  was **not tested**. The evidence points at *no* — `saveReconnectSession` is skipped when
  `transport.isLocal`, which is true for Singleplayer — **but that is an inference from one call site,
  not a test.** 📌 Leave it to plan time; **do not report it settled either way.**~~
  ✅ **SETTLED 2026-09-11 BY PLAY-TEST (`V18`) — struck, not deleted; TRUE WHEN WRITTEN.** The match
  cannot be resumed: the reload went **straight to the main menu**. **An observation, not an inference.**
- ⛔ **`V16` (no emission while watching a replay) and `V17` (exactly one event per path per match) were
  NEVER TESTED and close UNTESTED** — both argued from source only, and the brief's own step 17 bars
  reporting `V17` satisfied by reading the code. 📌 **The owner was offered the chance to test them and
  chose to close.**

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

✅ **CLOSED 2026-09-11 `(agent-closed — not owner-verified)` on an owner ruling.** Both deliverable
numbers were read, plus the award-kind split and the award-kind × mode cross-tab — all four in the same
session and window (4–10 Sep 2026). `V18` was run and **passed by observation**.
⛔ **It is NOT a clean close: `V16` and `V17` close UNTESTED, argued from source only, and the owner
was offered the chance to test them first and chose to close.** ⛔ **No reader may treat this task as
fully verified.** The figures and their permanent caveats are in the closing record at the top of this
page.

**What the close changed elsewhere, and what it deliberately did not:**

| | |
|---|---|
| `0211` | ✅ **Ship gate CLEARED** — and ✅ **SHIPPED AND CLOSED 2026-09-12.** ~~⚠️ Status UNCHANGED — still `🔲 Backlog`, nobody building it; cleared is not scheduled~~ 📌 **struck, not deleted; true when written** |
| `0210` | ✅ Now has its incidence figure — **49.64K non-tutorial award attempts / matches over 7 days, ~7.1K/day.** ⛔ **Status, scope and rank UNCHANGED** — its ruling was never conditioned on incidence |
| ADR-110 | 📌 The re-raise trigger's **measurement now exists** (`AiPlayer` 89; FFA 1.6 % vs Team 53.2 %). ⛔ **An INPUT REQUIRING AN ARCHITECT'S READ, NOT a conclusion about the ADR** |
| `0205` | 📌 Its rank was held down by *unmeasured* frequency; a **directional field figure now exists**. ~~⚠️ **Nobody has re-ranked it and no ruling has been sought — its status, scope and rank stand as they were**~~ 🔴 **FALSE SINCE 2026-09-11 — struck, not deleted. THE OWNER RULED THAT `0205` BE RE-RANKED**, precisely because this measurement disproved that premise. ~~🟡 **Producer proposes `Medium`, awaiting sign-off; ⛔ rank in force still `Low–Medium`.**~~ ✅ **SIGNED OFF THE SAME DAY — struck, not deleted: the rank in force is `Medium`.** ⛔ **Three layers, never flattened:** owner ruled **THAT** it be re-ranked · producer proposed the **VALUE `Medium`** · owner **SIGNED IT OFF**. ⚠️ **Sign-off does NOT weaken this page's caveats** — client-match unit, lower bound, latched at first crossing, per-match rate permanently unknowable. ⛔ **Status, scope and folder unchanged** |
| `0211` | ✅ **SHIPPED AND CLOSED 2026-09-12** (`✅ Done — agent-closed, not owner-verified`). ~~🔴 SCHEDULED TO BUILD on an owner ruling, 2026-09-11 — now `🔄 In progress`, with no session owning it, no plan approved and no code written~~ 📌 **struck, not deleted.** 🚨 **It DID permanently destroy this task's Part A pre-fix denominator — knowingly accepted by the owner; the cost is now SPENT, ⛔ NOT a gap to close later** |
| The per-match stall rate | 🔴 **WILL NEVER BE KNOWN** — owner ruling, option B. ⛔ **Do not re-propose a server-side counter** |

~~**Not started. Nothing gates it; nobody is building it.**~~
📌 **SPENT — struck, not deleted; TRUE WHEN WRITTEN.**

~~**Priority `Medium` — the producer's rank, not the owner's.** The owner ruled *that it be filed*, *that
it not be scheduled*, and *that it measure both halves*. **They have never ranked it.** It was
re-ranked one notch (Medium–low → Medium) on the widening, because there are now **two decaying
windows, not one**, and Part B is cheaper per answer. It stays **below a fix**: measuring never
outranks fixing.~~
📌 **STALE — struck, not deleted.** The rank ended at **`High`** with **split provenance** (the owner
ruled THAT it be raised; the VALUE is the producer's — see the re-rank box above), and the
*"measuring never outranks fixing"* principle was **narrowed, not abandoned**: what overrode it was
**irreversibility, not importance.**

### 🚩 The value decays — and Part B decays harder

> ✅ **BOTH SNAPSHOTS WERE TAKEN BEFORE EITHER WINDOW CLOSED (2026-09-11).** Part A's pre-fix
> denominator was read while `0211` was **still unshipped**; Part B's rate was read while `0210`'s
> guard is **still unbuilt**. 🔴 **PART A'S WINDOW HAS SINCE CLOSED FOR GOOD: `0211` SHIPPED
> 2026-09-12**, so that denominator is **gone, not going.** ⚠️ **Part B's window is still open** —
> its counter reads zero forever only once `0210` ships, and `0210` is **still `🔲 Backlog`,
> unscheduled.** ⛔ **Do not read the two as having closed together.** The reads below are the only
> ones there will ever be. The two bullets that follow describe the mechanics and stand as written.

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

📌 **UPDATED 2026-09-11 — the consumers below now HAVE the number.** ~~⛔ **Nothing about their status,
scope or rank moved on account of it:** `0211`'s gate is cleared but it stays `🔲 Backlog`; `0210` is
unchanged; `0205` has not been re-ranked and no ruling was sought; ADR-110 has an input, not a
verdict.~~ 📌 **SUPERSEDED LATER THE SAME DAY — struck, not deleted; true when written.** 🔴 **Two
owner rulings then moved two of them:** `0211` was **ruled to build** (~~now `🔄 In progress`,
⚠️ nobody owns it yet~~ 📌 **struck — ✅ it SHIPPED AND CLOSED 2026-09-12**) and `0205` was **ruled to be re-ranked — and the value SIGNED OFF the same day** (✅ **rank in force
`Medium`**; ~~🟡 producer proposes `Medium`, ⛔ rank in force still `Low–Medium`~~ struck, not deleted.
⛔ **Three layers:** owner ruled **THAT** · producer proposed the **VALUE** · owner **SIGNED IT OFF**;
status/scope/folder unchanged). ✅ **Still true: `0210` is
unchanged, and ADR-110 has an input, not a verdict.**

~~**Consumers currently reasoning without this number:**~~ **Consumers, as they were:** `0205` (whose held Low–Medium rank rests on a
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
- [[decisions/adr-110-ai-winner-allowed]] — why AI players are **excluded** from Part A's clientless-leader definition, and the re-raise trigger this task's `AiPlayer` leaf measures
- [[features/ai-players]] — the player type behind the `AiPlayer` leaf: **89 leader firings in 7 days**, each one a legitimate win under ADR-110, not a stall
- [[systems/analytics]] — the event conventions, the enum, the reference doc, and the `DEPLOY_ENV === "prod"` gate this task works inside
- [[decisions/sprint-backlog]] — the board this was filed on and **moved OFF 2026-09-04** (its row there reads `➡️ Moved`)
- [[decisions/sprint-4]] — 🔄 **the board this task is now ON**, scheduled 2026-09-04 and raised to `High`
- [[systems/player-profile-store]] — the crediting path whose silence this task measures, and where `creditMatchXp`'s single call site lives
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, whose per-category breakdown **exonerated this task's instrumentation** as the cause of the 4 Sep per-user event breach
