# ADR-115: A citizen's approved name is shown in multiplayer matches at ADR-103 trust level — forged-id and look-alike cases are accepted risks

- **Status:** accepted
- **Date:** 2026-09-28 (rulings given 2026-09-27 and 2026-09-28; code as built by task `0322`, uncommitted at
  the time of writing). **Amended** 2026-09-28 — see *Amendment* below. **Amended** 2026-10-01 — `0308` cancelled;
  the D6 revisit now lives in `0365` (see *Amendment — 2026-10-01*).
  **Amended** 2026-10-07 — residual 1 stays open by owner ruling even after `0332` (see *Amendment — 2026-10-07*).
  **Amended** 2026-10-07 (later the same day) — `0323` cancelled; the second re-raise trigger has no filed
  candidate again (see *Amendment — 2026-10-07, `0323` cancelled*).
- **Deciders:** Owner (Mark Dolbyrev). Every ruling below was given live via `AskUserQuestion` in the
  `fkit lead` session and relayed by `fkit-lead`. **This ADR records rulings already given; it makes no new
  decision.** The one exception is marked: the "re-raise only if" conditions are the architect's reading of
  the existing rulings and ADR-103, not owner text.

### Owner rulings — verbatim

From `0317` (2026-09-27; table in `ai-agents/tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md`):

| # | Question | Owner's answer (verbatim) | Option text shown (verbatim) |
|---|---|---|---|
| **D1** | Prefill the start-screen name first? | **"Yes, prefill first (Recommended)"** | *"Honest citizens play under their approved name right away. Accept that anyone can still type the same name."* |
| **D2** | Which approach? | **"(a) Server swaps it in (Recommended)"** | — |
| **D3** | Trust level until `0267`? | **"Accept, record as ADR (Recommended)"** | *"Ship (a) now; write the accepted risk down as a design decision (an ADR); 0267 closes it later with no rework."* |
| **D6** | Look-alike names | **"Keep accepting, revisit in 0308 (Recommended)"** | *"You, as moderator, catch look-alikes when approving. Handle it properly with 0308 (which characters a name may contain)."* |
| — | Rude-name filter gap | **"Keep filter, warn me first (Recommended)"** | *"The filter stays. When you review a name request, you're told if the filter would hide it, so you can decline it."* |

From `0322`'s plan (2026-09-28; `ai-agents/tasks/done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/plan.md` § *Owner rulings*):

- **Q1** (reword the name-approved inbox message now?): **"Keep the short message"** — no lang change; the
  `0316` short wording stays. (Not the recommended option.)
- **Q2** (names approved before this ships were never filter-checked): **"Accept, note in the ADR
  (Recommended)"** — no extra code; recorded as a known leftover (residual 5 below).

## Context

In a multiplayer match the name other players saw was whatever the client typed. The server checked its
shape and relayed it; nothing tied it to the profile, so a moderator-approved name never reached other
players (`0317` report, `ai-agents/knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md`).

The game server already asks the profile server who a player is, at join, through ADR-103's single
identity funnel (`GameServer.getCreditableYandexId`, `src/server/GameServer.ts:1350-1352`). That id is
**client-asserted and unverified**. Verification is not buildable inside this task: verified login is filed
as `0325`, and even `0325` alone does not reach the game server, which learns the id from the WebSocket join
and never sees a profile session (`ai-agents/knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md`
§6). So the real choice was: show approved names now at ADR-103 trust, or not at all until verified identity
reaches the game server. D3 chose the first.

**Why this is new for ADR-103.** ADR-103 was scoped to earned XP. The funnel has since gained users:

1. **Crediting / resolve** — ADR-103's own scope (`startProfileResolve`, `:1387`).
2. **The private-lobby gate** — task `0302`, `GameServer.creatorMayStartPrivateLobby` (`:947`), which reads
   the citizen flag through `resolveProfilePlayer` (`:968`); owner-accepted residual 2026-09-26, recorded in
   the `Client.isCitizen` comment (`src/server/Client.ts`, the docblock above `:29`).
3. **This ADR — showing a player-chosen identity to other players.** The first two are about what the
   player gets; this one is about what *everyone else* is told the player is. That is the new part.

## Decision

The game server swaps a citizen's approved name in for the typed name, at ADR-103 trust level, with these
rules (as built; verified against the working tree 2026-09-28):

1. **One optional field on the existing resolve reply, three states.** `PlayerResolveResponseSchema.displayName`
   (`src/core/profile/CreditContract.ts:74-95`): **absent** = older profile server, keep what is held;
   **`null`** = no approved name (never approved, or cleared by `0314`), clear it; **a string** = a
   candidate, re-checked before use. `.catch(undefined)` makes a malformed value read as absent, so it can
   never drop `playerId` (the XP credit) or `isCitizen` (the ★) with it. Both deploy orders parse. The
   profile server sends the name whatever the citizen status (`src/profile-server/Routes.ts:763`) and logs no
   name. No new request, no new setting, no new trust path.
2. **The identity comes only through the funnel.** The name is set only inside `startProfileResolve`'s
   `.then` (`src/server/GameServer.ts:1413-1418`), whose id comes from `getCreditableYandexId` (`:1389`).
   Nothing new reads `client.yandexPlayerId`: the only readers in `src/server/` are the funnel (`:1351`), the
   null→value setter on `update_identity` (`:433`) and the construction site (`src/server/Worker.ts:520-521`).
3. **Stored checked, swapped re-checked.** At resolve time the name goes through `JoinUsernameSchema`
   (`src/core/Schemas.ts:255-260`) and is stored trimmed, or `null` with **one** `warn` line carrying the
   clientID only, never the name (`checkedApprovedName`, `:1439-1455`). At the swap it is checked again
   silently (`matchDisplayName`, `:1470-1476`); on failure the typed name is used.
4. **One swap point, two callers.** `matchDisplayName` is used by `start()` (`:546`, the frozen roster every
   in-match screen reads) and `gameInfo()` (`:1056`, the lobby poll). No client change. *(Amended 2026-09-28, `0322` review round 1:)*
   after start, `gameInfo()` reads each name from the frozen start roster by `clientID` first and uses
   `matchDisplayName` only as the fallback for a client the roster does not list (`:1046-1051`, `:1056`).
5. **The swap can never be what stops `start()`.** `start()` returns without starting if the roster fails
   `GameStartInfoSchema` (`:558-561`). Every `JoinUsernameSchema` pass also passes the roster's
   `UsernameSchema` (`Schemas.ts:235`), pinned by `tests/core/ApprovedNameInvariants.test.ts` and by the
   server test *start() never aborts on a swapped name* (`tests/server/ApprovedNameInMatch.test.ts:501`).
6. **Frozen at start.** A resolve that answers after `start()` is ignored for the name (`!this._hasStarted`,
   `:1413`); it still sets `profilePlayerId`, so crediting is unchanged. The guard is `_hasStarted`, not
   `hasStarted()`: a resolve during prestart still applies, to the poll and the roster alike. *(Amended 2026-09-28:)* this now holds more strongly — after
   start the poll reads the frozen roster itself (Decision 4), so for anyone on the roster even a reconnect
   after start cannot make the poll disagree with it.
7. **Reconnect carries the name only for the same creditable id** (`:284-294`) — the `profilePlayerId` rule,
   **not** the unconditional `isCitizen` carry (`:280`). Carried across a different identity it would show
   another player's name.
8. **Fail-soft.** A missing, failed or slow resolve never blocks or delays a join; the player plays under
   the typed name (the `0068` rule, unchanged).
9. **The rude-name filter stays; the moderator is warned first.** The match still runs
   `fixProfaneUsername(sanitize(name))` on other players' names (`src/core/GameRunner.ts:51-54`). The
   moderator's per-request Telegram message and the digest list say whether that filter would hide the
   requested name, using **the same matcher**, moved to `src/core/validations/profanity.ts` so the profile
   server can import it (`wouldMatchFilterHideName`, `src/profile-server/NameChangeRepository.ts:816-818`;
   digest `src/profile-server/NameChangeDigest.ts:268`). Yes/no only, operator-only, never in the player's
   reply, never logged. **English dataset only** — a Russian insult is not caught; the moderator's reading is
   still the real check.

## Options considered

The approaches were weighed in the `0317` report (§5); D2 chose (a). Summarized here only so the choice is
readable without it:

- **(a) Server swaps it in from the resolve reply (chosen, D2)** — one optional field and one swap point;
  every multiplayer surface follows with no client change; fully reversible (remove the field and the
  helper).
- **(b) Client supplies the name; the server reserves approved names for their proven owner** — rejected by
  D2. Needs the server to prove ownership, which is exactly the verified identity it does not have yet.
- **Wait for verified identity before showing approved names at all** — rejected by D3: *"Ship (a) now …
  0267 closes it later with no rework."*
- **Drop or bypass the rude-name filter for approved names** — rejected by the filter ruling: *"The filter
  stays."*

## Consequences

- **Positive:** honest citizens are shown under their approved name on every multiplayer screen, with no
  client change and no new trust path. The later fix for residual 1 needs **no change to this code**.
  > 📝 **2026-10-07 — corrected forecast:** under ADR-124 a later fix for residual 1 would need **one read** of the
  > funnel's `verified` bit in `matchDisplayName`; and the owner ruled that no such fix is made now (see *Amendment —
  > 2026-10-07*). Text above left byte-identical.
- **Negative / costs — accepted residuals, each owner-ruled:**
  1. **Forged id (D3).** Someone who sends a citizen's Yandex id gets that citizen's approved name. A forger
     and the victim in the same match both show it. The trust note sits on the field
     (`src/server/Client.ts:40-54`).
     > 📝 **2026-10-07 — stays open by owner ruling, also after `0332`.** Q5: **"Keep for unconfirmed"** (see
     > *Amendment — 2026-10-07*). Text above left byte-identical.
  2. **Typed copies and look-alikes (D1, D6).** Anyone can still type the same string, or a look-alike.
     Revisited in `0308`. *(Amended 2026-10-01:)* `0308` was **cancelled** 2026-10-01; the revisit now lives in
     [`0365`](../../tasks/backlog/0365-block-invisible-character-names-and-warn-the-moderator-about-look-alike-names/brief.md) (warn the moderator about look-alike names, owner ruling R2 of 2026-09-29). The residual
     itself is unchanged — see *Amendment — 2026-10-01*.
  3. **Slow resolve / freshness.** If the resolve has not answered by `start()`, that match shows the typed
     name (as `0068` already accepted). The name is only as fresh as the last resolve (join, reconnect or
     late `update_identity`); an approval or a `0314` clear takes effect from the next one.
  4. **Widens `0068` R3.** The unauthenticated `GET /api/game/:id` (`src/server/Worker.ts:336-343` →
     `gameInfo()`) now carries the approved name alongside the clientID. The public lobby list does not —
     `Master.ts` strips `clients` to a count (`src/server/Master.ts:516-524`). Public lobby ids are listed
     publicly, so anyone can watch which lobby a given citizen sits in. Same exposure class as typed names
     today, but an approved name is a **stable, unique handle**, so it is tied to one person.
  5. **Names approved before this shipped were never checked by the filter warning (Q2).** No sweep was run.
- **Residual risks / "re-raise only if"** *(architect's reading of the rulings above and ADR-103; not owner
  text)*:
  - **`0325` plus the join-token second step land** (the client sends its session token in the join and the
    game server has the profile server vouch for it; **filed 2026-09-28 as [`0332`](../../tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)** —
    at first writing this read "not filed yet"; `0250` design report §6). Then
    verification goes *inside* `getCreditableYandexId` and residual 1 closes with no change here. This is the
    expected exit.
    > 📝 **2026-10-07 — this exit will not happen as written.** `0332` (ADR-124, accepted 2026-10-07, not yet built)
    > gives the game server a `verified` bit, but the owner ruled the approved name stays shown for unverified players
    > (Q5). Residual 1 stays open by owner ruling. See *Amendment — 2026-10-07*. Text above left byte-identical.
  - **The approved name, or a mark derived from it, is presented to players as confirmed identity.** `0323`
    (the mark) is the filed candidate: under residual 1 a forger would carry that mark too. Decide before it
    ships.
    > 📝 **2026-10-07 — this trigger is now live for `0323`'s design.** With residual 1 open by owner ruling, the
    > mark cannot borrow trust from the name; per ADR-124 Decision 5 it must check `verified` itself, through the
    > funnel, frozen at `start()`. See *Amendment — 2026-10-07*. Text above left byte-identical.
    > 📝 **2026-10-07 (later) — `0323` was cancelled; this trigger is waiting again.** Owner ruling: players do not
    > care about the mark. No mark is planned, so the trigger is back to waiting for **any future** mark presented
    > to players as confirmed identity. Both texts above left byte-identical. See *Amendment — 2026-10-07, `0323`
    > cancelled*.
  - **Anything of value is gated on the approved name** (not just display).
  - **Observed impersonation abuse in production.**
  - **A reader of `client.yandexPlayerId` appears outside the funnel** — a defect against ADR-103 and this ADR.

  Absent those, a review finding of the form "a forged id shows a citizen's name", "a player can type a
  citizen's name or a look-alike", "the lobby poll exposes the approved name" or "the filter does not catch
  Russian words" is **closeout of this ADR, not a new defect.**

## Amendment — 2026-09-28 (`0322` review round 1)

Facts only; no decision changed.

- **`gameInfo()` changed.** The coder's round-1 review fix makes `gameInfo()`, after start, read each name
  from the frozen start roster by `clientID`, with `matchDisplayName` as the fallback for anyone not on the
  roster (`src/server/GameServer.ts:1041-1056`). Recorded as a clause on Decision 4; Decision 6 now holds
  more strongly.
- **Citations refreshed.** The change moved `GameServer.ts` lines after `gameInfo()` by +10 (+12 from
  `matchDisplayName`, whose docblock grew); every such
  citation above was re-pointed and verified against the working tree. `ApprovedNameInMatch.test.ts`'s
  cited test moved `:454` → `:501`. Citations before `gameInfo()` (`:280`, `:284-294`, `:433`, `:546`,
  `:558-561`, `:947`, `:968`) did not move.
- **The join-token step is filed** as `0332`
  (`ai-agents/tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md`).
  The "re-raise only if" condition is unchanged; only its "not filed yet" note is updated.

## Amendment — 2026-10-01 (`0308` cancelled; the D6 revisit moves to `0365`)

Facts only; no decision changed. Recorded by the architect on an owner ruling given live 2026-10-01 in the
`fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` — verbatim option chosen: **"New task for the 2
safety parts (Recommended)"** — *"Producer files one small backlog task: block invisible-character names + warn the
moderator about look-alike names. The nice-to-have parts are dropped. Architect fixes ADR-115's 'revisited in 0308'
line."*

- **`0308` was cancelled 2026-10-01** — the "lost space" report was not reproduced. Its folder moved to
  [`tasks/cancelled/0308-…`](../../tasks/cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md). So *"Revisited in `0308`"* (residual 2) no longer names a live task.
- **Where the D6 revisit lives now: [`0365`](../../tasks/backlog/0365-block-invisible-character-names-and-warn-the-moderator-about-look-alike-names/brief.md)** (*Block names made of invisible characters, and warn the
  moderator about look-alike names*; Backlog, unscheduled). Its part (b) builds on owner ruling **R2, 2026-09-29**
  — **"Warn the moderator (Recommended)"** — which answered D6 and is recorded verbatim in `0308`'s brief
  (ruling table, row R2) and `plan.md` (*Owner rulings 2026-09-29*). Per `0365`'s brief, R2 is the **only** `0308`
  ruling that carries over.
- **What did not change.** Residual 2 is still an accepted residual: R2 only *warns* the moderator; it never
  refuses a name, never changes a stored name, and changes no code this ADR cites. The "re-raise only if" list is
  unchanged, and a finding of the form *"a player can type a citizen's name or a look-alike"* is still closeout of
  this ADR, not a new defect.
- **Kept as written, on purpose.** D6's row in *Owner rulings — verbatim* still says *"revisit in 0308"* /
  *"Handle it properly with 0308"*: that is the owner's text of 2026-09-27 and is not rewritten. Residual 2's
  original *"Revisited in `0308`."* is kept visible, with the 2026-10-01 note after it (per `decisions/README.md`:
  keep every superseded wording visible).

## Amendment — 2026-10-07 (ADR-124 accepted; the owner kept the approved name for unverified players)

Recorded by `fkit-architect` (spawned by `fkit-lead`, `/fkit-sprint-ship-loop`, Sprint 7) on the acceptance of
[ADR-124](adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md), under
`decisions/README.md`'s carve-out for **an owner's follow-up ruling that clarifies wording already in the ADR**.
**No decision in this ADR changes** — the owner's ruling *keeps* Decision D3's trust level. Every earlier wording is
kept; the 📝 pointers above lead here.

**The ruling, verbatim** (2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by
`fkit-lead`): asked Q5 of the `0332` design report (*"Approved name: show a citizen's approved name in matches only
when verified?"*), the owner chose **"Keep for unconfirmed"** — **not** the architect's recommendation (*"Verified
only"*). The option as put (report § 15): *"(b) Keep for unverified. Residual 1 stays open by your ruling, and
`0323`'s mark would need its own check."* The owner then accepted ADR-124: **"Accept with answers (Recommended)"**.

**Not built yet.** ADR-124 is accepted; `0332`'s build is not written or deployed at this writing.

**What this clarifies:**
- **Residual 1 stays open by owner ruling — also after `0332` ships.** The first re-raise bullet expected residual 1
  to close when *"`0325` plus the join-token second step land"*. That expectation is overtaken: the join token
  (`0332`) will give the game server a `verified` bit, and the owner chose not to use it for the name. A forged id
  keeps showing a citizen's approved name, as accepted under D3.
- **What a future fix would take** (should the owner later rule the name verified-only): one read of the funnel's
  `verified` bit in `matchDisplayName`, through ADR-124's policy table (report § 6 of the `0332` design). So the
  *"needs no change to this code"* forecast in *Consequences* is corrected — the change is small, not zero. Freezing
  at `start()` (Decision 6) is unchanged; a vouch after `start()` would not change that match's name.
- **The `0323` re-raise bullet is now live.** `0323`'s mark is the next planned reader of `verified`. Under residual 1
  it cannot rest on the name: it must check `verified` itself through the funnel and freeze it with the roster at
  `start()`, or a forger would carry the mark (or a late vouch would make mark and name disagree). That is `0323`'s
  decision to make before it ships, as this bullet already required.
  > 📝 **2026-10-07 (later) — overtaken: `0323` was cancelled the same day.** This bullet is no longer live and
  > `0323` is no longer a planned reader of `verified`. Bullet left byte-identical. See *Amendment — 2026-10-07,
  > `0323` cancelled*.
- **Unchanged:** residuals 2–5, the other re-raise bullets, and the closeout sentence. A finding *"a forged id shows a
  citizen's name"* is still closeout of this ADR.

## Amendment — 2026-10-07, `0323` cancelled (the re-raise trigger has no filed candidate)

Facts only; no decision changed. Recorded by `fkit-architect` (spawned by `fkit-lead`, `/fkit-sprint-ship-loop`,
Sprint 7) under `decisions/README.md`'s carve-out, on the model of the *Amendment — 2026-10-01* (`0308` cancelled).

**The ruling, verbatim** (2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by
`fkit-lead`): asked *"What should happen to 0323?"*, the owner chose **"Cancel 0323 (Recommended)"** — *"Nothing gets
built. A producer cancels it with your reason ('players don't care; only admins need it, and 0332's counters cover
that'). It can be filed again later if you want a per-player admin view."* Earlier the same session, at `0323`'s plan
gate, the owner wrote: *"No need for special mark of "this is really that account", users don't care about this
feature, it's only important for us (developers/admins of the game)"*.

- **`0323` is cancelled** — folder moved to
  [`tasks/cancelled/0323-…`](../../tasks/cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md),
  marked `⛔ Cancelled (agent-closed — not owner-verified)`.
- **The second re-raise trigger returns to waiting.** It still reads *"the approved name, or a mark derived from it,
  is presented to players as confirmed identity"*. It now has **no filed candidate**; it fires again for any future
  mark of that kind. The 2026-10-07 *"now live for `0323`'s design"* note and the *Amendment — 2026-10-07* bullet
  *"The `0323` re-raise bullet is now live"* are overtaken and kept visible.
- **The admin need is met elsewhere, per the ruling:** `0332`'s start-time counter
  (`geoconflict.server.match.identity`, ADR-124 Decision 8) — aggregate numbers, not per player. Per ADR-124 as
  amended 2026-10-07, that counter is now the only planned reader of `verified`.
- ⚠️ **Open point for the owner — carried forward, not decided.** If a **per-player admin view** (who is really who)
  is ever filed, it is undecided whether it counts as *"presented to players"* under this trigger. Admins are not
  players, but such a view would still show a "confirmed" label built on the same identity. Ask the owner when such a
  task is filed; do not settle it in a review or a consult.
- **Unchanged:** every decision, residuals 1–5 (residual 1 stays open by owner ruling Q5), the other re-raise bullets
  and the closeout sentence.

## Related

- ADR-103 — the identity-trust seam this ADR extends to a third user
- ADR-113 — the internal player id the resolve returns
- 📝 Added 2026-10-07: [ADR-124](adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md)
  (join token, accepted 2026-10-07) — provides the `verified` bit; residual 1 stays open by owner ruling Q5. See
  *Amendment — 2026-10-07*.
- `src/server/GameServer.ts:1350-1352` (funnel), `:1387-1429` (resolve), `:1439-1455`, `:1470-1476`
  (check and swap), `:1041-1056` (`gameInfo`, frozen roster first), `:284-294` (reconnect)
- `src/core/profile/CreditContract.ts:74-95` — the three-state contract
- `src/core/validations/profanity.ts` — the shared rude-name matcher
- `ai-agents/knowledge-base/name-change-digest-runbook.md` — the moderator's rude-name filter warning
- `ai-agents/knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md` — the approach and its risks
- `ai-agents/knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md` §6 — where the
  forged-id case actually closes
- Tasks: `0317` (source), `0322` (this build), `0068` (R3, same seam), `0302` (lobby gate), `0321` (prefill
  and lock), `0323` (the mark — **cancelled 2026-10-07**), `0308` (name rule — **cancelled 2026-10-01**), `0365` (invisible names + look-alike warning — the D6
  revisit since 2026-10-01), `0325` (verified login), `0332` (join token), `0267`
