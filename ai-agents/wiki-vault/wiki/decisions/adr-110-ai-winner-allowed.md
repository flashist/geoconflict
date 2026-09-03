# ADR-110 — An AI player may be declared the winner

**Date**: 2026-09-03
**Status**: accepted

> Source: `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`
> (drafted and accepted the same day; promoted in place per [[decisions/adr-numbering-two-series]]).
> Slug abbreviated from the knowledge-base counterpart — the vault's standing style, not drift.

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
**shipped and closed 2026-09-03**) and `0205` (Team — still unscheduled) award the win to *"the
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

- ✅ **`0206` SHIPPED 2026-09-03 with the predicate unchanged** — `WinCheckExecution.ts`'s
  `checkWinnerFFA()` selects `sorted.find((p) => p.clientID() !== null)`, with **no
  `PlayerType.AiPlayer` check anywhere in the file** (verified against the tree at this lint).
  `0205` carries the same policy — verification step 7 there asserts no `PlayerType.AiPlayer`
  exclusion, and `0206` gained step `5b` for the same assertion.
- Public FFA matches where every human dies before the threshold now **complete and credit XP**, where
  before `0206` they stalled silently.
  ⚠️ **Only where a clientful player is still ALIVE.** `0206` shipped the deliberate hole: if
  `sorted.find(...)` finds nobody, it awards nothing and stays active, so **that match's XP is still
  lost**. See [[decisions/clientless-leader-win-policy]].
  🔴 **And nothing has been run live** — `0206` closed agent-closed, not owner-verified, with no
  deploy and no production observation.
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
  ✅ **DONE — `0206` landed 2026-09-03 and updated that comment**; `WinCheckExecution.ts` now states
  *"the policy is about being clientless, not about being AI: a `PlayerType.AiPlayer` has a real
  `clientID`, so it is outside this guard entirely and may be declared the winner (ADR-110)."*
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
- ~~`0206`'s phase-1 measurement shows the no-eligible-winner case is effectively unreachable in
  production, removing the strongest argument for allowing it.~~ ⚠️ **This condition can no longer
  fire as written, and that is a LOSS, not a resolution.** `0206` shipped **without** the phase-1
  measurement (its residual 9), and the pre-fix baseline is now **permanently unmeasurable** — an
  accepted consequence of the owner's sequencing ruling. The measurement that could still bear on
  this is task `0208` — ~~whose scope is being widened as of 2026-09-03 and is NOT settled~~
  📌 **whose widening is now SETTLED (owner ruling *"Add it — measure both"*): Part A multiplayer
  clientless-leader incidence, Part B Singleplayer award incidence, and the two must not be merged.**
  ⛔ **Part A deliberately EXCLUDES AI players** — an AI-player win is a normal win under this ADR, not
  a stall. See [[tasks/measure-clientless-leader-and-solo-awards]].
- Match-end XP crediting ever becomes **winner-dependent** — the whole XP argument is contingent on
  `selectMatchCredits` not looking at who won.

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
- [[decisions/sprint-4]] — where `0206` was scheduled, built and closed (2026-09-03, agent-closed — not owner-verified)
- [[decisions/sprint-backlog]] — where `0205`, `0207`, `0208`, `0209` and `0210` all sit, unscheduled
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, which shipped this ADR's predicate unchanged
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, whose Part A excludes AI players on this ADR's reasoning
- [[tasks/placement-semantics-literal-one]] — task `0209`, whose accepted `1`-for-a-loser case follows from this ADR
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, which this ADR does **not** pre-answer (it governs who WINS, not who receives points)
