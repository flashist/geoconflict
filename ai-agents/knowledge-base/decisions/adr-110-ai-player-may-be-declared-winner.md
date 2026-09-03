# ADR-110: May an AI player be declared the winner of a match?

- **Status:** ✅ **accepted** — 2026-09-03, owner ruling given live in session (*"Allow — accept the ADR."*).
  **Conditional on a live revisit trigger — read the box below before citing this ADR.**
- **Date:** 2026-09-03 (drafted); **accepted 2026-09-03** (promoted in place per `README.md:11-16`)
- **Deciders:** Owner (ruled live in session, 2026-09-03); fkit-architect (evaluation, drafted this ADR on the owner's live ruling *"write an ADR, you sign off"*)
- **Scope:** **FFA (`0206`) *and* Team mode (`0205`) — one policy across both modes.** See the ruling box.
- **Series:** Geoconflict project ADRs (the `101+` band). See `README.md:45-65`.

---

## 🔴 THIS DECISION HAS A KNOWN EXPIRY. READ BEFORE CITING IT.

> ### Revisit trigger — pre-committed, and already known to be coming
>
> **Before any durable, player-visible record of winners ships — a leaderboard, match history, an
> announcements feed, a share card, or any other surface that names the winner outside the end-of-match
> modal — this decision MUST be re-examined and a superseding ADR written if it changes.**
>
> **This is not a hypothetical.** When the owner accepted `allow` on 2026-09-03, they were asked
> directly whether such a surface exists (Open question 3, the one flagged as able to flip the
> recommendation). Their answer, verbatim: **"None today, but planned."**
>
> So the owner accepted this decision **knowing the trigger is on the roadmap**. The acceptance is
> sound for the world as it stands — where the only place a winner's name appears is the transient
> end-of-match modal (T2), and no XP reaches the AI (T1). It is **not** a settled-forever call:
> this ADR's whole case rests on an XP-centred analysis (T1/T3) that, by the architect's own
> assessment, **would be answering the wrong question** the moment a synthetic name can enter a
> durable record (T4, second half).
>
> **What this means in practice:** whoever picks up leaderboard, match-history, or winner-feed work
> owns re-opening this ADR *as part of that work* — before it ships, not after. Do not treat the
> `accepted` status as licence to build a winners surface on the assumption that AI winners are fine
> in it. **They were never assessed for it.**

---

> **Why this is an ADR and not a line in a task plan.** The owner ruled on 2026-09-03 that this is a
> **product-direction call, not an interpretation of an existing rule** — a coder must not settle it
> inside `0206`'s implementation plan. The technical facts below are the architect's; the *choice* was
> the owner's, and they made it.

## The owner's ruling, 2026-09-03 (given live in session)

Three parts, all recorded here:

1. **The core call — ALLOW.** *"Allow — accept the ADR."* The owner read the architect's
   recommendation (Option A) and accepted it. The FFA fallback predicate stays `clientID() !== null`;
   no `PlayerType.AiPlayer` special case enters `WinCheckExecution`.
2. **One policy across both modes — FFA *and* Teams.** Ruled separately and explicitly: the decision
   covers **Team mode (`0205`)** as well as **FFA (`0206`)**. The owner's stated reasoning: they
   deliberately unified the branch scope across `0205`/`0206` on 2026-09-02, and **a type-based
   exclusion in only one mode would re-split what they had just unified.** This resolves Open
   question 2 and discharges the T5 warning.
   ⚠️ *Scope note, unchanged:* Teams' win path is structurally different — `makeWinner`'s `"team"`
   branch (`GameImpl.ts:668-675`) collects every clientful member of the winning team, so
   *"does the winning team contain an AI"* is a different shape of question from *"is the winner an
   AI"*. The **policy** is now settled for both modes; the **Teams implementation design** is not, and
   belongs with `0205`.
3. **The qualification — a durable winner surface is planned.** Answering Open question 3:
   **"None today, but planned."** Recorded as the revisit trigger in the box above. This is the
   material qualification on the acceptance and must travel with it.

## Context

### The question, precisely

Task [`0206`](../../tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)
(`brief.md:288-302`) will change `WinCheckExecution.checkWinnerFFA()` so that, when the leader at the
win condition is clientless, the win is awarded to **"the top-ranked player that has a `clientID`"**
instead of no winner being declared at all.

**That predicate, as literally written, includes AI players.** So the question this ADR settles is:

> When the FFA fallback award fires, may a **synthetic AI player** be the player declared winner of a
> public match — or must the fallback skip AI players and award only to a real human?

### Verified facts (every line below read this run, 2026-09-03)

**1. AI players have real `clientID`s.**
`AiPlayerSchema = { clientID: ID, username: UsernameSchema }` — `src/core/Schemas.ts:473-476`.
`GameStartInfoSchema` carries them in a separate `aiPlayers` array, **not** in `players`
(`src/core/Schemas.ts:478-483`), and the server fills that array from `this.aiPlayers`
(`src/server/GameServer.ts:488-491`) while `players` comes only from `activeClients`
(`:480-487`).

**2. The four player types.** `Bot`, `Human`, `AiPlayer`, `FakeHuman` — `src/core/game/Game.ts:347-352`.

**3. AI players and Nations run the *same* class; only the `clientID` differs.**
`GameRunner.ts:61-69` builds AI players as `PlayerInfo(username, PlayerType.AiPlayer, p.clientID, …)`;
`:86-97` builds Nations as `PlayerInfo(name, PlayerType.FakeHuman, null, …)`. Both are driven by
`FakeHumanExecution` — `GameRunner.ts:140-146` → `ExecutionManager.aiPlayerExecutions()`
(`src/core/execution/ExecutionManager.ts:154-162`), which returns
`new FakeHumanExecution(this.gameID, player, difficulty, null)`.
⚠️ **There is no `AiPlayerExecution` class.** Re-verified this run: `grep -rn "AiPlayerExecution" src/ tests/`
returns nothing. (`geoconflict-overview.md` claimed otherwise and was corrected the same day.)

**4. AI players are deliberately indistinguishable from humans in the UI.**
`PlayerInfoOverlay.ts:278-280` and `PlayerPanel.ts:295-302` both fall `PlayerType.AiPlayer` through to
the **same** `player_type.player` label and 👤 icon as `PlayerType.Human`. Bots get `player_type.bot`
🤖 and Nations get `player_type.nation`. **Owner's own words, 2026-09-03:** *"we use them to mimic
real players, and actually real players don't know that these are AI players."*

**5. An AI can be *named* winner but can never *vote* for one.**
`numClients() = activeClients.length + aiPlayers.length` — `src/server/GameServer.ts:421-423`. AI
players are in `aiPlayers`, never in `activeClients`, so they hold no WebSocket and send no `winner`
message. The majority vote in `handleWinner` is computed over `activeClients`' unique IPs
(`:1174-1186`) — a purely human electorate either way.

**6. The current guard keys on `clientID`, not on player type.**
`WinCheckExecution.ts:65` — `if (max.clientID() === null)`. That is why the guard catches Bots and
Nations but **not** AI players today: an AI player already passes it and can already win, on both
branches, before `0206` changes anything. **This ADR is therefore partly about ratifying or reversing
live behaviour, not only about new behaviour.**

**7. The candidate pool is alive players only.**
`checkWinnerFFA()` sorts `this.mg.players()` (`WinCheckExecution.ts:42-44`), and
`GameImpl.players()` filters `.filter((p) => p.isAlive())` (`src/core/game/GameImpl.ts:421-423`).
**This is load-bearing for the "no eligible winner" trade-off below.**

## The trade-offs

### T1 — XP crediting: **traced in full, and it is winner-independent** ✅

The prior run left this unverified. It is now traced end to end, and the answer changes the shape of
the decision.

`handleWinner` (`GameServer.ts:1144`) → on vote success → `creditMatchXp(potentialWinner.winner)`
(`:1199`, the sole call site of `:1253`). `creditMatchXp` then calls
`selectMatchCredits(this.id, participation, clientStateById, eligibleRoster)` (`:1294-1299`), defined
at `src/core/profile/MatchQualification.ts:74-100`.

**`selectMatchCredits` never looks at who won.** It iterates the *participation list* and credits
every entry that clears four gates (`MatchQualification.ts:82-98`):

| Gate | Line | What an AI player hits |
|---|---|---|
| in `eligibleRoster` | `:83` | ❌ **fails** — the roster is `gameStartInfo.players.map(p => p.clientID)` (`GameServer.ts:1276-1278`), which is `activeClients` only (`:480-487`). AI clientIDs live in `gameStartInfo.aiPlayers`. |
| `qualifiesForMatchXp` | `:84` | n/a |
| known `clientStateById` entry | `:86` | ❌ **also fails** — the map is built from `this.allClients` (`GameServer.ts:1285-1293`); an AI has no `Client`. |
| non-null `yandexPlayerId` | `:89` | ❌ **also fails** — no Yandex identity exists. |

**Conclusion, evidence-backed: crediting an AI winner awards the AI nothing, and is impossible by
three independent gates.** What the AI winner actually *does* is **unblock crediting for every real
player in the match** — because the only thing standing between a match and `creditMatchXp` is that
*some* winner exists to be voted on. This is precisely the whole-match XP loss `0206` exists to close
(`0206/brief.md:162`).

⚠️ **One genuine defect found in passing, reported not fixed.** `WinModal.buildPlayerParticipation`
carries the comment *"only human players have one (AI players return null and are skipped)"*
(`src/client/graphics/layers/WinModal.ts:487-492`). **That comment is wrong** — it skips on
`clientID === null` (`:498-499`), which excludes Bots and Nations but **includes AI players**, since
they have real clientIDs (fact 1). AI entries therefore *are* built into the participation list and
are then discarded server-side by the roster gate. **Harmless today** — the outcome is right and the
comment is merely misleading — but it is a live trap for anyone who trusts it. Not fixed here (this
ADR writes no code); worth a follow-up brief if the owner wants it.

### T2 — Is the win announced, and what would players see?

**Yes, announced, and it looks exactly like a human win.**
`WinModal.ts:438-450` resolves the winner via `playerByClientID(wu.winner[1])`, and because an AI's
`clientID()` is non-null it emits `SendWinnerEvent(["player", winnerClient], …)` (`:442-450`) — the
same path a human win takes. Every other player then sees
`translateText("win_modal.other_won", { player: winner.name() })` (`:468-470`) with the AI's
`Anon0000`-style username, and `GAME_LOSS` analytics fire (`:475-477`).

**There is no tell.** Combined with fact 4, a player has no way to know the winner was synthetic.
Whether that is acceptable is the honesty question in T4 — it is *not* a technical gap to close.

### T3 — Excluding AI players can leave a match with **no eligible winner** 🔴

**This is the strongest argument for allowing the AI win, and it is concrete, not hypothetical.**

Public FFA lobbies ship `bots: 400` **and** keep Nations enabled (`0206/brief.md:205-208`, citing
`src/server/MapPlaylist.ts:165,169` — *carried from the brief, not re-read this run*). Every one of
those is clientless. Now combine that with fact 7: the fallback's candidate pool is **alive** players
only.

So the failure case is: **every human is eliminated before the 80 % threshold is reached, while AI
players are still alive.** In that match:

- **AI eligible** ⇒ an AI is declared winner ⇒ a `Win` update is emitted ⇒ the still-connected,
  already-dead humans' clients emit `SendWinnerEvent` ⇒ `handleWinner` runs ⇒ `creditMatchXp` runs ⇒
  **every eliminated-but-connected human is credited**, because `qualifiesForMatchXp` explicitly
  credits players who were legitimately killed (`MatchQualification.ts:43-45`).
- **AI excluded** ⇒ no clientful *human* is alive ⇒ no winner ⇒ **no `Win` update ⇒ the whole match's
  XP is silently lost for everyone**. That is exactly the `0022` residual `0206` was filed to close,
  reopened by the exclusion.

⚠️ **Frequency is UNMEASURED**, and I did not measure it. `0206`'s own phase-1 investigation
(`brief.md:264-287`) is the place that gets measured. Do not read the paragraph above as an observed
production incident — it is a structural argument, same standing as `0206`'s own Priority reasoning
(`brief.md:80-83`). **How often "all humans dead, AI alive, 80 % reached" actually occurs is the
single biggest unknown in this ADR.**

### T4 — The honesty / product angle

This is the half that is genuinely the owner's, and I am not resolving it.

**For allowing it:** AI players exist *specifically* to be mistaken for real players. A rule saying
"an AI may play like a human, be named like a human, be labelled a human, and be attacked like a
human — but may never win" carves a hole in the very illusion the feature is built to sustain. It
would also be an illusion that leaks: over enough matches, a player who never once sees an `Anon0xxx`
account win could infer the category. **Special-casing the win is a *bigger* honesty artefact than
allowing it.**

**Against allowing it:** a synthetic account publicly winning a real match is a different act from a
synthetic account merely being present. It is the one moment the game makes a positive public claim
about a player. If leaderboards, announcements, or a future "recent winners" surface ever consume the
winner identity, a fabricated name enters a durable, player-visible record. ⚠️ **I did not audit for
such a surface and cannot say none exists** — see Open question 3.

> 🔴 **Answered 2026-09-03, and it matters:** the owner says **"None today, but planned."** So this
> paragraph describes a harm that is **not reachable today but is on the roadmap**. That is exactly
> why this ADR carries a revisit trigger rather than being a settled-forever call — see the box at the
> top of this file.

### T5 — Consistency with the existing guard, and with Teams

The `0022` guard's stated policy is *"a clientless leader (a Bot **or** a FakeHuman nation) is never
declared the winner outside a non-tutorial singleplayer game"* (`WinCheckExecution.ts:59-64`). It says
nothing about AI players, because AI players are not clientless. **Excluding AI players would be a new
rule, not an extension of the existing one** — it would need a second predicate keyed on
`PlayerType.AiPlayer`, where today one `clientID()` check does all the work.

✅ **The owner ruled the Teams parity explicitly — this warning is discharged, not left hanging.**
The decision covers `0205` and `0206` alike; see the ruling box at the top. The reasoning below is
what prompted the question, and is kept because it still explains *why* the two must move together.

⚠️ **Whatever is ruled here must be mirrored onto Teams.** `0206`'s sibling
[`0205`](../../tasks/backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) builds the same
fallback in `checkWinnerTeam()`, and the owner deliberately ruled the branch scope **once, for both**,
to keep the two on one policy (`0206/brief.md:227-230`). **A ruling that applies to FFA only would
re-split the policy the owner just unified.** Teams is harder, not merely symmetric: a team's win goes
through `makeWinner`'s `"team"` branch (`GameImpl.ts:668-675`), which collects *every* clientful member
of the winning team — so "does the team contain an AI" is a different shape of question from "is the
winner an AI". I have **not** designed that half; it is out of this ADR's scope and belongs with
`0205`.

### T6 — Cost

- **Allow:** zero code. `0206` implements its predicate exactly as its brief already words it.
- **Exclude:** one extra type check in `checkWinnerFFA()`, a mirrored one in `checkWinnerTeam()`
  (`0205`), and tests for the no-eligible-winner case in T3 — plus permanently owning the T3 XP-loss
  hole as an accepted residual.

## Decision (architect's recommendation, **accepted by the owner 2026-09-03**)

> **ALLOW an AI player to be declared winner. Do not special-case `PlayerType.AiPlayer` in
> the fallback — keep the predicate on `clientID() !== null` exactly as `0206`'s brief words it.
> This applies to Team mode (`0205`) as well as FFA (`0206`).**

Reasoning, in priority order:

1. **The exclusion buys nothing and costs the fix.** T1 proves an AI winner receives no XP, by three
   independent gates, and T3 shows the exclusion can reopen the whole-match XP loss that is `0206`'s
   entire reason to exist. The exclusion would be a rule whose only measurable effect is to sometimes
   restore the defect.
2. **It is consistent with what AI players are for.** T4's first half: a never-wins rule is a larger
   and more detectable artefact than the win itself.
3. **It is the smaller change and keeps one predicate.** T5, T6.

🔴 **The strongest argument against this decision — it was NOT refuted, it was overridden with eyes
open.** T4's second half: if a durable, player-visible winner record exists **or is planned**, "no XP
was awarded" is not the same as "no harm was done", and this ADR's reasoning is weighted by an XP
analysis that would then be answering the wrong question.

**The owner answered Open question 3 with "None today, but planned" and accepted `allow` anyway.**
That is a legitimate call — nothing durable exists today, so the harm the argument describes is not
yet reachable. But it means **this ADR was accepted with its own strongest counter-argument known to
be on the roadmap.** Hence the pre-committed revisit trigger at the top of this file. Anyone reading
this section later: the counter-argument was never answered on its merits, only deferred.

### If the ruling had been EXCLUDE (recorded for completeness — it was not)

The owner ruled **allow**, so none of the below applies. Kept visible so the rejected branch's
conditions are not re-derived if the revisit trigger ever fires and the decision is re-opened:

1. It would have had to be ruled for **Teams as well** (T5), or the unified policy re-splits.
   *(The owner ruled the Teams parity anyway — see the ruling box — so this condition is satisfied
   in either direction.)*
2. The T3 XP-loss hole would have to be **recorded as a knowingly accepted residual** on `0206` — by
   the producer, not by the architect and not by the coder.
3. `0206`'s brief wording *"the top-ranked player that has a `clientID`"* would become **wrong as
   written** and would need a producer edit. ⚠️ Not edited — task files are producer-only.

## Consequences (accepted)

- `0206` proceeds with its predicate unchanged; no new type check enters `WinCheckExecution`.
- **`0205` (Teams) carries the same policy** — its `checkWinnerTeam()` fallback likewise gets no
  `PlayerType.AiPlayer` exclusion. The branch scope the owner unified on 2026-09-02 stays unified.
  ⚠️ How that policy is *expressed* in the team branch is `0205`'s design problem, not settled here.
- Public FFA matches in which every human dies before the threshold now **complete and credit XP**,
  where today they stall silently.
- Players will occasionally see an `Anon0xxx` name in the win modal with no indication it was
  synthetic. **This is now a deliberate, recorded choice rather than an accident of the predicate.**
- The `0022` guard's comment (`WinCheckExecution.ts:59-64`) becomes incomplete — it describes a
  clientless-leader policy without noting that AI players are deliberately *outside* it. Worth a
  comment update when `0206` is implemented.

### Re-raise only if

- 🔴 **A durable, player-visible record of winners is BUILT** — leaderboard entry, match history,
  announcements feed, social/share card, or any surface naming the winner outside the transient
  end-of-match modal. **Re-raise before it ships, not after.** The owner confirmed on 2026-09-03 that
  such a surface is **planned but does not exist today** ("None today, but planned"), so this trigger
  is **expected to fire** — it is a scheduled review, not a remote contingency. This ADR's XP-centred
  reasoning (T1/T3) does not cover that case at all; T4's second half takes over, and Option B may
  become the better answer. See the box at the top of this file.
- Yandex Games policy, or Russian advertising/consumer law, is found to bear on presenting a
  synthetic account as a match winner. **Not assessed here — I am not qualified to and did not.**
- `0206`'s **phase-1 measurement** (`brief.md:264-287`) shows the T3 case is effectively unreachable in
  production, which would remove the strongest argument for allowing it.
- Match-end XP crediting ever becomes **winner-dependent** — i.e. `selectMatchCredits` gains a bonus
  or gate keyed on who won. T1's entire conclusion is contingent on it not being.

**Do not re-raise** merely because "an AI won a match" is observed; that is the accepted, intended
consequence of this decision, not evidence against it.

## Options considered

| Option | Verdict |
|---|---|
| **A. Allow AI winners** (predicate stays `clientID() !== null`) | ✅ **CHOSEN — owner ruling, 2026-09-03.** Zero code, closes T3, consistent with the feature's purpose. Accepts T4's honesty cost explicitly. Applies to FFA **and** Teams. |
| **B. Exclude AI winners** (add a `PlayerType.AiPlayer` check) | Rejected. Buys no XP protection (T1), can reopen the whole-match XP loss (T3), needs a Teams mirror (T5), and contradicts the deliberate human-indistinguishability of the feature (fact 4). ⚠️ **Rejected for today's world only** — it becomes the live candidate again the moment the revisit trigger fires (a durable winner surface), which the owner says is planned. |
| **C. Allow, but label the win in the modal** (e.g. mark a synthetic winner) | Rejected. It breaks fact 4 outright — an AI-only label is a direct tell that identifies the whole class of accounts, defeating the feature far more thoroughly than an occasional win reveals it. |
| **D. Allow, but suppress the *announcement*** (award silently so crediting runs, show no win modal) | Rejected. A match that ends with no win screen is a worse and more conspicuous player experience than one that names a winner, and it would need a new update shape that no current code path supports. |

## Links

- Task this unblocks: [`0206`](../../tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)
  — the predicate at `brief.md:288-302`; its open implementation questions at `:248-260`.
  ⚠️ **`0206` was not edited by this ADR.** Task files are producer-only.
- Sibling that must carry the mirrored ruling:
  [`0205`](../../tasks/backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md).
- Origin of the guard being modified:
  [`0022`](../../tasks/done/0022-win-check-multiplayer-regression-investigation/brief.md).
- AI-players feature spec: `ai-agents/tasks/done/0074-ai-players-standalone/brief.md`.
- Overview section: `../geoconflict-overview.md` §5 (corrected 2026-09-03 — the `AiPlayerExecution`
  claim and two "in development" markers).

## ADR number allocation — how `110` was verified free

Per `README.md:45-51`, this project's ADRs run from `101`, allocated as *highest on disk + 1*. Checks
run **this session, 2026-09-03**:

1. **On disk:** `ai-agents/knowledge-base/decisions/` holds `adr-101` … `adr-109`. Highest = `109`.
2. **Repo-wide sweep for invisible reservations** — the `0204` trap
   (`0206/brief.md:11-15`) is exactly a number reserved in skill prose with no file. Ran
   `grep -rniE "adr-?1[0-9][0-9]"` across the **whole repo** (excluding `node_modules`, `.git`), not
   just `decisions/`. Result: **only `adr101`–`adr109` appear anywhere.** No hit on `110` or above.
3. **`.claude/` skills specifically:** every ADR cited under `.claude/` is in the **fkit** `001–099`
   band (ADR-004/005/010/014/015/017–022/024/025/028–033/035/037/039/040/041), plus two
   non-conflicting artefacts (`adr-999`, `adr-1029`) that fall outside the `1NN` band. **No project-band
   reservation.**
4. **Series:** this is a **Geoconflict product/technical** decision about game behaviour, not about the
   fkit toolkit — so it belongs in the `101+` band, not `001–099` (`README.md:53-65`).

⇒ **`110` is free.**

## Open questions — asked, and how the owner answered (2026-09-03)

Kept in full with the answers folded in, so the sequence stays readable.

1. **The core call:** allow (A) or exclude (B)? Architect's recommendation was A.
   → ✅ **ANSWERED: A — allow.** *"Allow — accept the ADR."*
2. **If A:** confirm the same ruling applies to **Teams** (`0205`), so the two modes stay on one policy.
   → ✅ **ANSWERED: yes, one policy across both modes.** Reasoning given: the branch scope was
   deliberately unified across `0205`/`0206` on 2026-09-02, and a type-based exclusion in one mode only
   would re-split it.
3. 🔴 **The one that could flip the recommendation:** does any **durable, player-visible record of
   winners** exist or is any planned — platform leaderboard entry, announcements feed, match history,
   a share card? The architect found none on the winner path and **did not audit for one**. If one
   exists, T4's second half outweighs T1/T3 and B becomes the better answer.
   → ⚠️ **ANSWERED: "None today, but planned."** The owner accepted `allow` **with this known.**
   Nothing durable exists now, so the decision is sound today; a leaderboard or match history is on the
   roadmap, so **the decision is time-limited.** This is the material qualification on the acceptance
   and is why the revisit trigger at the top of this file exists. **It is not a footnote — it is the
   condition the acceptance rests on.**
4. **Should the misleading `buildPlayerParticipation` comment** (`WinModal.ts:487-492`, T1) get a
   follow-up brief? Harmless today, actively misleading to a future reader.
   → ⬜ **STILL OPEN.** Not put to the owner in the acceptance ruling. A producer call (task files and
   briefs are producer-only); the architect has not filed anything.
