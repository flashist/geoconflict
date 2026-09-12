# ADR-110 — An AI player may be declared the winner

**Date**: 2026-09-03 (corrected 2026-09-04)
**Status**: accepted — ⚠️ **unchanged by the `0206` revert; the decision is NOT superseded**

> Source: `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`
> (drafted and accepted the same day; promoted in place per [[decisions/adr-numbering-two-series]]).
> Slug abbreviated from the knowledge-base counterpart — the vault's standing style, not drift.

---

## 🔴 2026-09-04 — THIS ADR RULES ON A PREDICATE THAT EXISTS IN NO SHIPPED CODE

> **[`0206`](../tasks/ffa-clientless-leader-fallback-award.md) was REVERTED and never deployed;
> `0205` (Team) is unbuilt.** ⇒ **This is a live policy awaiting its first implementation.**
>
> ⛔ **THE DECISION ITSELF IS UNAFFECTED AND IS *NOT* SUPERSEDED.** It rules on **policy** — may an AI
> player be declared winner; the predicate stays `clientID() !== null` with **no**
> `PlayerType.AiPlayer` exclusion; **one policy across FFA and Team.** That policy stands, and the
> status remains `accepted`. What was reverted is `0206`'s FFA **implementation** of it.
>
> ✅ **Its ONE in-code trace survives**, deliberately: the comment in `WinCheckExecution.ts` saying the
> guard is about being **clientless**, not about being **AI**. **The revert kept it on purpose.** ⛔ Do
> not delete it while "restoring" that file — see [[tasks/ffa-clientless-leader-fallback-award]].
>
> ⚠️ **The revisit trigger is unchanged** — a durable, player-visible winner surface still forces
> re-examination before it ships (see the expiry box below).
>
> ### 🔴 T1 HAS EXPIRED — the scheduled expiry FIRED on 2026-09-12. ⛔ DO NOT CITE T1 FORWARD.
>
> ✅ **`0211` SHIPPED AND CLOSED 2026-09-12**, and it did exactly what this box predicted:
> [[tasks/credit-participation-xp-elimination-or-match-end]] decoupled crediting from the winner
> (**Mechanism A** — credit at elimination **or** at the *"no winner declarable"* moment). ⇒ 🔴 **T1's
> premise — *"the only thing standing between a match and `creditMatchXp` is that some winner
> exists"* — IS NOW FALSE**, and T1's argument (that an AI winner is valuable because it unblocks
> everyone's crediting) **has lost most of its force.**
>
> ⛔ **SHIPPED IS NOT DEPLOYED.** `0211` is not in production, so **in the live game T1's premise still
> describes what happens today.** ⚠️ **Two different frames — do not collapse them:** the *decision
> record* must now read T1 as expired; the *production behaviour* has not changed yet.
>
> ⛔ **THIS STILL DOES NOT FIRE THE RE-RAISE TRIGGER BELOW.** That trigger reads *"crediting ever
> becomes winner-**dependent**"*; `0211` made it **less** so, which is the safe direction. 🔴 **The ADR
> is NOT superseded and its decision is UNCHANGED** — only one of its supporting arguments is spent.
>
> ~~⏳ **T1 is TRUE TODAY and has a SCHEDULED EXPIRY** — re-verified 2026-09-04: `creditMatchXp`'s sole
> call site is still inside `handleWinner`, so T1's premise holds today.~~ 📌 **STRUCK 2026-09-12 —
> TRUE WHEN WRITTEN, AND THE EXPIRY IT SCHEDULED IS THE ONE THAT FIRED.**

---

## 🔴 THIS DECISION HAS A KNOWN EXPIRY. READ THIS BEFORE CITING IT.

> **Before any durable, player-visible record of winners ships — a leaderboard, match history, an
> announcements feed, a share card, or ANY surface that names the winner outside the transient
> end-of-match modal — this decision MUST be re-examined, and a superseding ADR written if it
> changes.**
>
> **The trigger is not hypothetical — it is on the roadmap.** When the owner accepted `allow` on
> 2026-09-03 they were asked directly whether such a surface exists or is planned. Their answer,
> verbatim: **"None today, but planned."** They accepted **knowing the trigger is coming.**
>
> So the ADR's own strongest counter-argument was **overridden with eyes open, not refuted** — in the
> ADR's words, *"never answered on its merits, only deferred."* The acceptance is sound for the world
> as it stands, where a winner's name appears only in the transient end-of-match modal. It is **not a
> settled-forever call.**
>
> ⛔ **Do not read `accepted` as licence to build a winners surface assuming AI winners are fine in
> it. They were never assessed for it.** Whoever picks up leaderboard, match-history or winner-feed
> work owns re-opening this ADR **as part of that work, before it ships.**

---

## Context

Tasks `0206` (FFA — `ai-agents/tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md`,
**closed 2026-09-03 and then REVERTED 2026-09-04 — never deployed**) and `0205` (Team — still
unbuilt) award the win to *"the
top-ranked player that has a `clientID`"* when the leader at
the win condition is clientless — the fix for the silent whole-match XP loss recorded in
[[decisions/clientless-leader-win-policy]]. **That predicate, as written, includes AI players**, because
`PlayerType.AiPlayer` carries a real `clientID` while Bots and Nations do not (see [[systems/glossary]]
§1). So the question had to be settled: may a synthetic AI player be named winner of a public match?

The owner ruled this a **product-direction call, not an interpretation of an existing rule** — a coder
must not settle it inside `0206`'s implementation plan.

**The behaviour partly pre-dates the decision.** `WinCheckExecution`'s guard keys on
`clientID() === null`, so an AI player already passes it and can already win today, on both branches.
This ADR therefore **ratifies live behaviour as much as it authorises new behaviour.**

## Decision

> **ALLOW an AI player to be declared winner. The predicate stays `clientID() !== null` with NO
> `PlayerType.AiPlayer` exclusion — do not add one.**

**One policy across both modes — FFA (`0206`) *and* Team (`0205`)**, a second explicit owner ruling.
The owner's reasoning: they deliberately unified the branch scope across `0205`/`0206` on 2026-09-02,
and **a type-based exclusion in only one mode would re-split what they had just unified.**

⚠️ **The policy is settled for both modes; the Teams *implementation* is not.** A team win goes through
`makeWinner`'s `"team"` branch (`src/core/game/GameImpl.ts:668-675`), which collects every clientful
member of the winning team — so *"does the winning team contain an AI"* is a different shape of
question from *"is the winner an AI"*. That design belongs to `0205`.

### Why allowing it costs nothing on the XP path

🚩 **This is the reasoning, and it must not be shortened into "an AI can win now".** An AI winner is
**credited nothing**: `selectMatchCredits` (`src/core/profile/MatchQualification.ts:74-100`) **never
looks at who won** — it iterates the participation list — and an AI fails **three independent gates**:

| Gate | Line | Why an AI fails it |
|---|---|---|
| in `eligibleRoster` | `:83` | the roster is `gameStartInfo.players` = `activeClients` only (`src/server/GameServer.ts:480-487`, `:1276-1278`); AI clientIDs live in the separate `aiPlayers` array (`:488-491`) |
| known `clientStateById` entry | `:86` | that map is built from `this.allClients` (`GameServer.ts:1285-1293`); an AI has no `Client` |
| non-null `yandexPlayerId` | `:89` | no Yandex identity exists |

**What the award actually does is unblock crediting for every real player in the match** — the only
thing standing between a match and `creditMatchXp` is that *some* winner exists to be voted on. An AI
can be *named* winner but can never *vote* for one: the majority vote runs over `activeClients`' unique
IPs (`GameServer.ts:1174-1186`), a purely human electorate.

> 🔴 **CARRY THE QUALIFIER WHEN YOU RESTATE THIS — dropping it is how the false Consequences bullet
> below got written.** The award unblocks crediting **only where a LIVING CLIENTFUL player exists to
> award to.** Where every clientful player is already eliminated, `GameImpl.players()` filters to
> `isAlive()` (`src/core/game/GameImpl.ts:421-423`), the candidate list is empty, no winner is named,
> and **nothing is unblocked.** ⚠️ **Measurement on 2026-09-04 showed that case is *the* case, not a
> corner case.** ⛔ **Any restatement of this paragraph that omits the qualifier is the struck bullet
> reappearing in new words.**

### Why excluding AI players was rejected

- **It buys no XP protection** (the three gates above already do that) and **can reopen the whole-match
  XP loss** `0206` exists to close: in a match where every human is eliminated before the threshold
  while AI players are still alive, excluding them leaves **no eligible winner at all** — no `Win`
  update, no XP for anyone. The candidate pool is alive players only (`GameImpl.players()` filters
  `isAlive()`, `:421-423`).
  ⚠️ **How often that shape occurs is UNMEASURED** — a structural argument, not an observed incident.
- **It contradicts what AI players are for.** They are deliberately indistinguishable from humans in
  the UI (`PlayerInfoOverlay.ts:278-280`, `PlayerPanel.ts:295-302` fall `AiPlayer` through to the same
  `player_type.player` label and 👤 icon as `Human`). Owner, 2026-09-03: *"we use them to mimic real
  players, and actually real players don't know that these are AI players."* A never-wins rule is a
  **larger and more detectable artefact** than the win itself — over enough matches, never seeing an
  `Anon0xxx` account win reveals the whole category.
- Two further options were rejected: **labelling** a synthetic win in the modal (a direct tell that
  identifies the entire class of accounts), and **suppressing the announcement** (a match ending with
  no win screen is worse and more conspicuous, and no current update shape supports it).

## Consequences

- ~~✅ **`0206` SHIPPED 2026-09-03 with the predicate unchanged**~~ **SUPERSEDED 2026-09-04 — `0206`
  was REVERTED and never deployed.** ✅ **The half that stands, and is now the durable statement:
  no `PlayerType.AiPlayer` type check enters `WinCheckExecution` — true before `0206`, true in
  `0206`, and true after the revert.** **This is the consequence that actually survived.**
  `0205` carries the same policy — verification step 7 there asserts no `PlayerType.AiPlayer`
  exclusion.
- ~~Public FFA matches where every human dies before the threshold now **complete and credit XP**,
  where before `0206` they stalled silently.~~
  > 🔴 **STRUCK — DISPROVED BY MEASUREMENT, 2026-09-04. DO NOT CITE THIS BULLET.**
  >
  > **It was false when written, and false at the moment the owner accepted it.** Kept struck rather
  > than deleted so the record shows what was believed.
  >
  > **What is actually true:** those matches did **not** complete and did **not** credit XP.
  >
  > **Why.** `checkWinnerFFA()` sorts `this.mg.players()`, and `GameImpl.players()` filters
  > `.filter((p) => p.isAlive())` (`src/core/game/GameImpl.ts:421-423`) — **this ADR's own fact 7,
  > which flagged it as "load-bearing."** So when every human is dead they are absent from `sorted`,
  > `0206`'s `sorted.find((p) => p.clientID() !== null)` returns `undefined`, and `0206` took **the
  > same early `return` as the pre-`0206` code.** **The bullet is contradicted by the very code it
  > describes.**
  >
  > **Observed, not inferred:** in a live instrumented private FFA (2026-09-04) a **Nation reached
  > 100.0 % of the map with the match still not ending.** `creditMatchXp` never ran; nobody was
  > credited.
  >
  > **The defect this bullet claimed to close is still open and still live.** Closing it is
  > [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`), by decoupling crediting from
  > the winner entirely.
  >
  > ⛔ **This does NOT invalidate the decision.** The ruling is about the **winner predicate**. This
  > bullet was a downstream *expectation about `0206`'s effect*, not a premise of that choice.
  >
  > **How the error happened, for future readers:** **T3 states the scenario correctly and WITH its
  > qualifier** — *"every human is eliminated … **while AI players are still alive**"*. This bullet
  > was a degraded restatement of T3 that **dropped T3's own load-bearing condition** and asserted the
  > outcome unconditionally. **T3 itself is sound; only this generalisation of it is false.**
- Players will occasionally see an `Anon0xxx` name in the win modal with **no indication it was
  synthetic**. That is now a deliberate recorded choice, not an accident of the predicate.
- **Nations and Bots remain excluded** — they are clientless, and this ADR does not change that. In FFA
  that is the intended shape. 🚩 **In Team mode it bites harder**: a private lobby can hand a whole
  named team to Nations (`src/client/HostLobbyModal.ts:42` defaults), and if such a team leads with no
  clientful team qualifying, the predicate awards nobody — recreating the wedge. **The owner
  deliberately DEFERRED that case to `0205`'s plan on 2026-09-03**; it is a decision with a known
  shape, not an oversight, and must not be re-raised as one.
- ~~The `0022` guard's comment becomes incomplete — it describes a clientless-leader policy without
  noting that AI players sit deliberately *outside* it. Worth a comment update when `0206` lands.~~
  ✅ **DISCHARGED — and it SURVIVED THE REVERT, deliberately.** `0206` added the clarifying comment;
  when `0206` was reverted on 2026-09-04 **that one comment was intentionally kept**, so
  `WinCheckExecution.ts` still states the guard is about being **clientless**, not about being AI.
  🔴 **It is the ONLY in-code trace of this ADR anywhere in the repository**, and it is why that file
  is deliberately **not** byte-identical to its pre-`0206` state. ⛔ Do not delete it.
  ⚠️ This is **only the `WinCheckExecution` comment.** The separate `WinModal` comment is still wrong
  and is still task `0207` — see the next bullet.
- 🚩 **A misleading comment on this exact predicate was filed as task `0207`** — see
  [[tasks/winmodal-participation-comment-correction]]. `WinModal.ts` claims AI players are skipped
  from participation; they are not.

### Re-raise only if

- 🔴 **A durable, player-visible winner surface is BUILT** — see the expiry box. **Expected to fire; a
  scheduled review, not a remote contingency.**
- Yandex Games policy, or Russian advertising/consumer law, is found to bear on presenting a synthetic
  account as a match winner. ⚠️ **Not assessed — the architect stated they were not qualified to.**
- **Measurement shows the no-eligible-winner case is effectively unreachable in production**, removing
  the strongest argument for allowing it.
  ⚠️ **POINTER CORRECTED 2026-09-04: this trigger originally cited `0206`'s phase-1 measurement —
  which NEVER RAN, because `0206` was reverted. The work now lives in task `0208`.**
  ~~🔴 **The trigger is therefore still UNFIRED and still LIVE — nobody has measured it.**~~
  📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.**

  > ### ✅ 2026-09-11 — THE MEASUREMENT NOW EXISTS. ⛔ THIS IS AN INPUT, NOT A VERDICT ON THIS ADR.
  >
  > `0208` was read off the dashboard for **4–10 September 2026** and closed the same day. 🔴 **The
  > trigger has "fired" ONLY in the sense that the measurement exists.** ⛔ **NOTHING about this ADR has
  > changed, nothing is superseded, and no conclusion about it may be drawn from these numbers.**
  > 📌 **Recorded as AN INPUT REQUIRING AN ARCHITECT'S READ.**
  >
  > | | Value | ⚠️ |
  > |---|---|---|
  > | **`AiPlayer` leader firings** | **89 in 7 days** | The `AiPlayer` leaf *is* this trigger's measurement — these carry a real `clientID` and **may legitimately win under this ADR** |
  > | **FFA clientless-in-front** | **~1.6 %** | **Rare — and that is the direction that WEAKENS the strongest argument for the `allow` ruling, FOR FFA ONLY** |
  > | **Team clientless-in-front** | **~53.2 %** | ⛔ **EMPHATICALLY NOT RARE.** Do not generalise the FFA reading across modes |
  >
  > 🔴 **UNIT: CLIENT-MATCHES, NOT MATCHES** — one event per client per match, so **absolute counts are
  > uninterpretable and only ratios are safe**, and those are weighted by lobby size and by how many
  > clients stayed. **All rates are LOWER BOUNDS.**
  > ⛔ **`0208` closed `(agent-closed — not owner-verified)` and is NOT fully verified** — its `V16` and
  > `V17` close untested. ⛔ **Do not cite it as a clean result.**
  > 🔴 **And the per-match stall rate WILL NEVER BE KNOWN** (owner ruling, option B, 2026-09-11) — so
  > **no sharper number is coming to settle this trigger.** See
  > [[tasks/measure-clientless-leader-and-solo-awards]].
  ✅ **And the earlier "permanently unmeasurable" claim is REVERSED:** because `0206` never deployed,
  the pre-fix baseline is measurable again. 🔴 **It is `0211` shipping that would destroy it — which
  is exactly why the owner ordered `0208` deployed and collecting data BEFORE `0211` ships.**
  📌 `0208`'s widening is SETTLED (owner ruling *"Add it — measure both"*): **Part A** multiplayer
  clientless-leader incidence, **Part B** Singleplayer award incidence, and **the two must not be
  merged.** ⛔ **Part A deliberately EXCLUDES AI players** — an AI-player win is a normal win under
  this ADR, not a stall. See [[tasks/measure-clientless-leader-and-solo-awards]].
- Match-end XP crediting ever becomes **winner-dependent** — the whole XP argument is contingent on
  `selectMatchCredits` not looking at who won.
  ⚠️ **`0211` is the opposite direction and does NOT fire this** — it makes crediting *less*
  winner-dependent. See the T1-expiry note in the box at the top of this page.

⛔ **Do not re-raise merely because "an AI won a match" was observed.** That is the accepted, intended
consequence.

## Related

- [[decisions/clientless-leader-win-policy]] — the XP-loss defect this predicate is part of fixing, and the both-branches ruling this ADR sits on top of
- [[decisions/adr-numbering-two-series]] — the `101+` band, and the promote-in-place rule this ADR followed
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team half, where the all-Nations case is deferred to plan time
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, the guard whose predicate this ADR ratifies
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the comment that contradicts this ADR
- [[systems/glossary]] — why an AI player is clientful and a Nation is not; the `PlayerType` taxonomy this decision turns on
- [[features/ai-players]] — the feature whose human-indistinguishability is the honesty argument here
- [[systems/player-profile-store]] — the match-end XP crediting path an AI winner unblocks and is not credited by
- [[systems/execution-pipeline]] — the Intent → Execution → `GameUpdate` path the `Win` update this ADR governs travels on
- [[decisions/sprint-4]] — where `0206` was scheduled, built and closed (2026-09-03, agent-closed — not owner-verified) and where `0208` and `0211` were scheduled on 2026-09-04
- [[decisions/sprint-backlog]] — where `0205`, `0207`, `0209` and `0210` sit, unscheduled (`0208` and `0211` have since moved to Sprint 4)
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, which built this ADR's predicate unchanged and was then **REVERTED** — read its STOP box
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which **EXPIRED this ADR's T1 argument** by decoupling crediting from the winner. ✅ **Shipped and closed 2026-09-12 — the expiry has FIRED, not merely been scheduled**; ⛔ **not** an implementation of this ADR, and ⛔ **it did NOT fire the re-raise trigger**
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, whose Part A excludes AI players on this ADR's reasoning. ✅ **Closed 2026-09-11 with the re-raise trigger's measurement READ** — `AiPlayer` **89 firings in 7 days**, FFA clientless **~1.6 %** vs Team **~53.2 %**. ⛔ **An INPUT REQUIRING AN ARCHITECT'S READ, NOT a conclusion about this ADR**; ⚠️ **client-matches, lower bounds, and `0208` is not fully verified**
- [[tasks/placement-semantics-literal-one]] — task `0209`, whose accepted `1`-for-a-loser case follows from this ADR
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, which this ADR does **not** pre-answer (it governs who WINS, not who receives points)
