# ADR-115 — A Citizen's Approved Name Is Shown in Matches at ADR-103 Trust Level

**Date**: 2026-09-28 (rulings given 2026-09-27 and 2026-09-28; amended 2026-09-28)
**Status**: accepted

> Project ADR-115 — see [[decisions/adr-numbering-two-series]].
> Source: `ai-agents/knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md`
>
> **Provenance:** every ruling was given by the owner live via `AskUserQuestion` in the `fkit lead` session
> and relayed by `fkit-lead`. **The ADR records rulings already given; it makes no new decision.** The one
> exception it marks: the *"re-raise only if"* list is the architect's reading of the rulings and ADR-103,
> **not owner text**.
>
> 📌 The source ADR cites `file:line` against the 2026-09-28 working tree. Per the vault's citation rule this
> page names functions instead; read the source ADR for the line frame.

## Context

In a multiplayer match the name other players saw was whatever the client typed; a moderator-approved name
never reached them ([[tasks/approved-name-in-matches-investigation]]). The game server already asks the
profile server who a player is at join, through ADR-103's single funnel (`GameServer.getCreditableYandexId`)
— and that id is **client-asserted and unverified**. Verified login (`0325`) alone does not reach the game
server, which learns the id from the WebSocket join and never sees a profile session (the `0250` design
report §6). So the real choice was: show approved names **now** at ADR-103 trust, or **not at all** until
verified identity reaches the game server. Owner ruling D3 chose the first.

**Why this is new for ADR-103.** ADR-103 was scoped to earned XP. The funnel's users are now: (1) crediting /
resolve; (2) the private-lobby gate (`0302`, `creatorMayStartPrivateLobby`); (3) **this** — showing a
player-chosen identity to *other* players. The first two are about what the player gets; this one is about
what everyone else is told the player is.

**Owner rulings recorded (verbatim):** D1 *"Yes, prefill first (Recommended)"* · D2 *"(a) Server swaps it in
(Recommended)"* · D3 *"Accept, record as ADR (Recommended)"* — *"Ship (a) now; write the accepted risk down as
a design decision (an ADR); 0267 closes it later with no rework."* · D6 *"Keep accepting, revisit in 0308
(Recommended)"* · rude-name filter *"Keep filter, warn me first (Recommended)"* · from `0322`'s plan: Q1 *"Keep
the short message"* and Q2 *"Accept, note in the ADR (Recommended)"*.

## Decision

The game server swaps a citizen's approved name in for the typed name, at ADR-103 trust level, as built by
[[tasks/approved-name-in-multiplayer-matches]]:

1. **One optional three-state field** (`displayName`) on the existing resolve reply — absent / `null` / a
   string. No new request, setting or trust path.
2. **Identity only through the funnel** — the name is set only in `startProfileResolve`'s result. Nothing new
   reads `client.yandexPlayerId`.
3. **Stored checked, swapped re-checked** against `JoinUsernameSchema` (`checkedApprovedName`,
   `matchDisplayName`); on failure the typed name is used.
4. **One swap point, two callers** — `start()` (frozen roster) and `gameInfo()` (lobby poll). *Amended:* after
   start, `gameInfo()` reads the frozen roster by clientID first.
5. **The swap can never stop `start()`** — every `JoinUsernameSchema` pass also passes the roster schema
   (pinned by `tests/core/ApprovedNameInvariants.test.ts`).
6. **Frozen at start** — a resolve after start is ignored for the name.
7. **Reconnect carries the name only for the same creditable id** — not the unconditional `isCitizen` carry.
8. **Fail-soft** — a missing, failed or slow resolve never blocks a join (the `0068` rule).
9. **The rude-name filter stays; the moderator is warned first**, with the same matcher
   (`src/core/validations/profanity.ts`). English dataset only.

**Rejected:** (b) client-supplied name reserved for its proven owner (needs the verified identity that does
not exist yet); waiting for verified identity (D3); dropping or bypassing the filter for approved names.

## Consequences

**Accepted residuals, each owner-ruled — do not re-file them as defects:**

1. **Forged id (D3).** Sending a citizen's Yandex id gets that citizen's approved name; forger and victim in
   the same match both show it.
2. **Typed copies and look-alikes (D1, D6).** Anyone can still type the same string or a look-alike —
   revisited in `0308`.
3. **Slow resolve / freshness.** A resolve that has not answered by `start()` leaves the typed name; the name
   is only as fresh as the last resolve — an approval or a `0314` clear takes effect from the next one.
4. **Widens `0068` R3.** The unauthenticated `GET /api/game/:id` lobby poll now carries the approved name
   next to the clientID (the public lobby list strips clients to a count). An approved name is a **stable,
   unique handle**, so anyone can watch which lobby a given citizen sits in.
5. **Names approved before this shipped were never filter-checked (Q2).** No sweep was run.

**Re-raise only if** *(architect's reading, not owner text)*: `0325` **plus** the join-token step land (filed
2026-09-28 as `0332`, Sprint 7) — verification then goes *inside* `getCreditableYandexId` and residual 1
closes with no change here (the expected exit); the name, or a mark from it, is presented as **confirmed
identity** (`0323`, Sprint 7 — decide before it ships); anything of value is gated on the approved name;
observed impersonation abuse; or a reader of `client.yandexPlayerId` outside the funnel (a defect against
ADR-103 and this ADR). Absent those, *"a forged id shows a citizen's name"*, *"a player can type a citizen's
name or a look-alike"*, *"the lobby poll exposes the approved name"* or *"the filter misses Russian words"*
is **closeout of this ADR, not a new defect.**

## Related

- [[decisions/adr-103-identity-trust-seam]] — the seam this ADR extends to a third user
- [[decisions/adr-113-internal-player-id]] — the internal player id the resolve returns
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, the build
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, the approach and the rulings
- [[tasks/start-screen-approved-name-lock]] — task `0321`, prefill and lock (D1, D4)
- [[tasks/citizen-verified-icon]] — task `0068`, R3 (same seam), widened here
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the funnel's second user
- [[tasks/player-name-path-security-review]] — task `0307`, the look-alike residual this re-rules
- [[tasks/name-change-dismiss-and-clear]] — task `0314`, the runbook's remedy for a hidden or rude approved name
- [[systems/player-profile-store]] — the `0250` design report on where the forged-id case actually closes
- [[decisions/sprint-7]] — `0323` (the mark) and `0332` (the join token)
- [[decisions/sprint-6]] — Sprint 6, the active sprint since 2026-09-26, whose board carries this task
- [[tasks/citizenship-name-change]] — task `0067`, the name-change feature this follow-up extends
