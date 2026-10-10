# ADR-124 — Join Token: the Profile Server Vouches for a Player's Session, and the Game Server's Identity Funnel Carries the Result

**Date**: 2026-10-07
**Status**: accepted

> 🆕 **2026-10-10 sync — verified live by `0405`** ([[tasks/join-token-identity-vouch-live]]): match-start verified
> share 95.3 % vs login 97.55 % (not-verified 4.7 % vs 2.45 %, counted differently). Put to the owner as **re-raise
> trigger 2** — ruling *"Not 'much worse', leave it (Recommended)"*: **trigger 2 NOT hit**, no task, Decision 4 not
> revisited. No session token found in any log searched. The canonical ADR file did not change in this window.

> Project ADR-124 — see [[decisions/adr-numbering-two-series]]. ⚠️ **Vault slug abbreviated** from the knowledge-base
> counterpart (the vault's standing style, not drift).
> **Drafted and accepted 2026-10-07.** Drafted by `fkit-architect` for task `0332` (phase 1), with no owner channel;
> every ruling, and the acceptance itself, arrived by relay from `fkit-lead` (live `AskUserQuestion` in the
> `fkit lead` session). Owner sign-off, verbatim: **"Accept with answers (Recommended)"** (Q8).
> **Amended later the same day** — `0323` cancelled; the start-time counter is now the only planned reader of
> `verified`. No decision changed.
>
> **Supersedes in part** [[decisions/adr-103-identity-trust-seam]] — **design rule 2 only** (the funnel's planned
> *"returns the verified id or `null`"*). ADR-103's decision to accept the asserted id **for earned XP is NOT
> superseded** — the owner kept XP open to unverified players (Q2).
>
> 🔧 **Built? — the ADR says "No — not at this writing"; that is now stale.** `0332`'s build (slice A) was finished
> and closed the same day ([[tasks/join-token-identity-vouch]]) and its code is in commit `077c9e3` ("Sprint push",
> 2026-10-07 15:48 +0300). That commit is in **no release tag** (checked this sync), so **nothing here is deployed**.
> The ADR text and its dated notes on ADR-103/113/115/116 still say *"accepted, not built"*; they were written before
> the build closed. Recorded here, sources not changed.
>
> Sources: `ai-agents/knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md`;
> design report `ai-agents/knowledge-base/reports/2026-10-07-0332-join-token-design.md` (citation frame: `dev` at
> `5a70b6f`).

## Context

The game server learns a player's Yandex id from the WebSocket join and trusts it unchecked (ADR-103). That trust is
kept to one funnel, `GameServer.getCreditableYandexId`, which has four users: XP crediting, the citizen ★
([[tasks/citizen-verified-icon]]), the private-lobby gate ([[tasks/private-lobby-citizen-perk]]) and the approved name
in matches ([[tasks/approved-name-in-multiplayer-matches]], ADR-115).

Since 2026-10-07 the **profile** server mints `vfy:true` sessions for players whose Yandex signed data checks out at
login ([[decisions/adr-116-verified-login]]; `0340` deployed, [[tasks/verified-login-enforce-live]]). The game server
never saw that session, so it still could not tell a real player from a forged id (ADR-116 residual 7). ADR-103 and
ADR-115 both named this second step, `0332`, as their exit.

Three facts from the code shaped the decision (per the ADR and report):
- The session token carries the **internal** player id (`pid`), not the Yandex id — so matching "this token belongs to
  this Yandex id" needs `player_identities`, which only the profile server has.
- The game server **already** calls the profile server (`POST /internal/v1/players/resolve`) wherever identity enters:
  join, late `update_identity`, reconnect, credit time, the lobby gate.
- An old game server **closes the socket on an unknown message type**, and the client treats that close as the end of
  the match; unknown **fields** are silently dropped. So a new message type would break old servers; a new optional
  field does not.

## Decision

1. **The token rides the existing resolve call.** The client sends its profile session token as an optional
   `profileSession` field — in the `join` when it already holds one, otherwise in the existing `update_identity` once
   its login finishes. **No new message type.** The game server passes it as an optional `sessionToken` on the resolve;
   the profile server replies with an optional `verified`. **The session secret stays on the profile box only**
   (ADR-113 point 6). Owner Q6: *"Reuse login pass (Recommended)"*.
2. **"Vouched" = all of:** the token verifies (MAC, schema, TTL, not expired); `vfy === true`; platform
   `yandex_games`; token `pid` equals the player the asserted Yandex id resolves to. Anything else, including no token,
   ⇒ `verified: false`. The check runs after the find-or-create, in its own `try/catch`, and can **never** fail the
   resolve; a malformed token is read as absent (`.optional().catch(undefined)` on the resolve and on both client
   messages) — never a 4xx, never a join close.
3. **The result lives in the funnel.** It returns `{ yandexId, verified }` (`getCreditableIdentity`;
   `getCreditableYandexId` stays). `verified` comes from a server-only `Client.identityVerified`, set only by a resolve
   that carried *this* client's token for *this* client's id; false → true only per `Client`; follows the same-id rule
   across reconnect. The token sits on `Client.profileSession` until the first vouch. **No code outside the funnel and
   the resolve path reads either field.**
   - *Clarification (owner follow-up ruling, 2026-10-07, "After any answer (Recommended)"):* "until the first
     successful vouch" means until the first resolve whose reply carries `verified`, **true or false** — then that token
     is dropped. It is kept when the resolve failed or the reply has no `verified` (old profile server), and a newer
     token that arrived meanwhile is never dropped.
4. **A late token is handled, never waited for.** It causes one more resolve; `start()` never waits. A vouch after
   `start()` counts for XP and the lobby gate, not for that match's frozen ★ or name (ADR-115 Decision 6).
   - *Clarification (owner ruling R4, "Add ADR note (Recommended)", from `0332`'s review R1 fix):* **at most
     `MAX_LATE_PROFILE_SESSIONS_PER_CLIENT` = 2 late tokens per server-side `Client`** (a reconnect starts at zero);
     past that the token is ignored, with one warn line carrying `clientID` only. **No queue of resolves:** at most one
     waits behind the one in flight, and it reads the newest held token when it starts. A real client sends at most one
     late token per socket, so 2 is headroom, not a budget.
5. **One policy decides what an unverified player loses — and today it is nothing.**

   | Use | Unverified player | Owner ruling (verbatim) |
   |---|---|---|
   | XP crediting | allow | Q2 — *"Keep XP (Recommended)"* |
   | ★ badge | allow | Q3 — *"Keep the ★ (Recommended)"* |
   | Private-lobby gate | allow | Q4 — *"Keep it open (Recommended)"* |
   | Approved name in matches | allow | Q5 — *"Keep for unconfirmed"* — **not** the architect's recommendation (*verified only*) |

   So the enforcement slice (B) is not needed and not built. Architect's call: slice A builds **no**
   `IdentityPolicy.ts` and no per-use reads (a table nobody reads would be dead code); the first change that flips a row
   to `deny` adds them (report § 6 is the template), needs the owner's ruling on that row, and must apply Decision 6.
   **Only reader of `verified` today: the start-time counter** (Decision 8) — since `0323` was cancelled, the only
   planned one.
6. **A missing `verified` (old or rolled-back profile server) reads as unverified** — Q7, *"Treat as unconfirmed
   (Recommended)"*. Dormant while every row is `allow`; the standing rule for any future enforcement: **roll back the
   game's enforcement before rolling the profile server back below the vouch build.**
7. **The token is a credential:** never logged, persisted, put in analytics or sent to any player (not in `gameInfo()`,
   the start roster, turns or the archive). The build must also fix the pre-join log in `src/server/Worker.ts` that
   wrote whole client messages (it would write the token, and already wrote Yandex ids), stop the raw-input catch-all
   logs, and stop echoing the raw message on a parse failure.
8. **Rollout: one build, counters inside it, read afterwards** — Q1, free text: *"No, we're not spending another
   weekend slot for counting only, but we can add some metrics to the code and check them after."* Two bounded
   counters ship in slice A: `geoconflict.profile.resolve.vouch{outcome}` (8 values) and
   `geoconflict.server.match.identity{state}` (4 values, counted at `start()`) — see [[systems/telemetry]]. Deploy
   order: **profile server first, then the game image**, in a normal slot; no measure-only slot. They gate nothing now.

Rejected: the game server checking the token itself (the secret on two boxes; a broken-into game box could **mint**
verified sessions); an audience-bound, minutes-long join ticket (**not now** — the upgrade path); a new
`profile_session` message type (old servers end the match on it); the profile server applying the policy (splits game
policy across two boxes, fails open on rollback); a `null` from the funnel for unverified players (one null cannot
express four separate rulings — and would have denied all four, which the owner kept open).

## Consequences

- **Positive:** the game server can tell a verified player from an asserted id, and counts how many match players are
  verified — the number any later enforcement decision needs. The log fix stops a pre-existing log of whole client
  messages, which already wrote Yandex ids.
- 🚨 **It closes no forged-id hole — stated plainly by the ADR.** After it ships a forged Yandex id still earns XP for
  its victim (ADR-103 R1), still shows the ★, still hosts a private lobby, and still shows a citizen's approved name
  (ADR-115 residual 1). ADR-116 residual 7 stays open too. Each closes only when the owner flips its row.
- **Costs:** two server-only `Client` fields; an optional field on two client messages and on the resolve request and
  reply; one more resolve per late token; ~12 metric series; a dormant rollback rule.
- **Accepted residuals (the ADR's six):**
  1. **Bearer tokens pass through game-box memory** (Q6) — a break-in there could use them at the profile server as
     those players for up to 24 h. Bounded: that box already holds `PROFILE_INTERNAL_TOKEN`.
  2. **Self-farming is not stopped** — a player can copy their own verified token into extra clients.
  3. **A late token does not change that match's frozen ★ or name** — now matters for the counter only.
  4. **A narrow pre-join race can drop a late token** — that player stays unverified for that match (fail-soft).
  5. **Honest unverified players would lose whatever the owner denies** (about 3–7 % today on small samples, everyone
     during Yandex trouble) — **today nothing**.
  6. **The forged-id holes stay open by owner ruling** (Q2–Q5).
- **Re-raise only if:** the session token gains power beyond a player acting on their own account, or the game box's
  exposure grows (build the join ticket first); the counters show a much larger unverified share among match players
  than at login; the owner wants any use verified-only (add the policy table, apply Decision 6, reword `0397`'s *not
  confirmed* text EN + RU, and switch on its message for unverified non-citizens if XP is denied); observed abuse of an
  `allow` use; a client path that sends a refreshed token mid-socket (revisit the cap of 2 first). **Defects against
  this ADR:** a reader of `client.identityVerified` / `client.profileSession` / `client.yandexPlayerId` outside the
  funnel and resolve path; the token in a log, DB row, analytics event, player-bound message or the archive.
- Absent those, *"the game server holds the token in memory"*, *"a player can farm with their own token"*, *"a late
  token doesn't give the ★ this match"*, *"an unverified player still gets X"*, *"a forged id still earns XP / shows
  the ★ / hosts / shows an approved name"* or *"there is no `IdentityPolicy.ts`"* is **closeout, not a new defect.**

### Effect on older ADRs (applied 2026-10-07 as dated, append-only notes)

| ADR | What changed |
|---|---|
| [[decisions/adr-103-identity-trust-seam]] | Design rule 2 superseded in part; its earned-XP decision **stands** (Q2); rules 1, 3, 4, 5 extend to the new fields; its exit is now **an owner ruling flipping `xpCredit` to `deny`**, not `0332` |
| [[decisions/adr-115-approved-name-in-matches]] | Residual 1 **stays open by owner ruling** (Q5), also after `0332`; the "needs no change to this code" forecast corrected (a future fix = one read in `matchDisplayName`); its second re-raise trigger was briefly live for `0323`, then waiting again once `0323` was cancelled |
| [[decisions/adr-113-internal-player-id]] | Point 6 clarified: the join (or `update_identity`) also carries the token, relayed on resolve, held in memory only; the game server still does not hold the secret; new accepted residual (bearer tokens in game-box memory) |
| [[decisions/adr-116-verified-login]] | Residual 7: `0332` delivers the mechanism but, by owner ruling, closes nothing — stays open |

⚠️ **Open point carried in ADR-115, not decided here:** whether a future **per-player admin view** ("who is really
who") counts as *"presented to players"* under ADR-115's re-raise trigger. Owner's call if such a task is filed.

## Related

- [[tasks/join-token-identity-vouch]] — task `0332`: the design (phase 1) and the build (slice A) of this ADR
- [[tasks/long-session-refresh-popup]] — task `0404`: the exit for `0332`'s review finding R2 (a token over 24 h old sent at join reads as `expired`)
- [[decisions/adr-103-identity-trust-seam]] — superseded in part (design rule 2 only)
- [[decisions/adr-113-internal-player-id]] — point 6 clarified
- [[decisions/adr-115-approved-name-in-matches]] — residual 1 stays open by owner ruling
- [[decisions/adr-116-verified-login]] — the verified login this ADR carries to the game server; residual 7 stays open
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — the login numbers no longer gate `0332`'s deploy
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h Yandex signed-data window behind the 3–7 % unverified share
- [[decisions/cancelled-tasks]] — `0323` (the name mark), cancelled the same day; the counter is now the only planned reader of `verified`
- [[tasks/verified-login-enforce-live]] — task `0395`: `vfy: true` live, this ADR's precondition
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, the funnel's approved-name user
- [[tasks/citizen-verified-icon]] — task `0068`, the funnel's ★ user
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the funnel's private-lobby user
- [[tasks/session-verified-status-line]] — task `0397`: its *not confirmed* text is reworded only by a future flip
- [[systems/telemetry]] — the two new counters
- [[systems/player-profile-store]] — the profile server and its resolve route
- [[decisions/sprint-7]] — the board: `0332` at rank 9, `0323` cancelled
- [[decisions/sprint-8]] — the verify task `0405`
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[decisions/sprint-backlog]] — the Backlog board, where `0267`'s game-server path now points at this ADR
- [[tasks/approved-name-in-matches-investigation]] — task `0317`: its R1 (forged-id approved name) stays open by Q5; its brief B3 (`0323`) cancelled
- [[tasks/verified-login-shadow-mode]] — task `0325`, which named the second step this ADR designs
- [[tasks/authenticated-profile-read]] — task `0250`, whose design report §6 first named the join token
- [[tasks/verified-login-enforce]] — task `0340`, S3a: the verified session the token carries
- [[tasks/join-token-identity-vouch-live]] — task `0405`: trigger 2 not hit (owner ruling 2026-10-10)
- [[tasks/routes-it-test-verified-field]] — task `0431`: the integration test updated for the resolve reply's `verified` key
