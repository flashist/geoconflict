# ADR-124: Join token — the profile server vouches for a player's session, and the game server's identity funnel carries the result

- **Status:** **accepted** (owner sign-off 2026-10-07, relayed by `fkit-lead`). Promoted `proposed` → `accepted`
  in place, per `decisions/README.md` § *Immutability starts at `accepted`*, with the owner's answers to Q1–Q7
  folded in (see *Owner rulings — verbatim*).
  - **The ruling, verbatim:** asked Q8 (*"Sign off ADR-124?"*), the owner chose **"Accept with answers
    (Recommended)"** — option text in the design report § 15: *"Accept, with the Q1–Q7 answers folded in
    (Recommended). It becomes `accepted`. The ADR-103/113/115/116 notes in § 11 are then applied."*
  - *History, kept visible:* until 2026-10-07 this line read *"**proposed — owner sign-off pending.** Drafted for
    task `0332`, phase 1. Nothing in this ADR is decided until the owner signs it off. The per-use policy (Decision
    5) is **blank by design**: it records the owner's answers to Q2–Q5 of the design report once given."*
- **Date:** 2026-10-07 (drafted and accepted the same day). **Amended** 2026-10-07 (later the same day) — `0323`
  cancelled; the start-time counter is now the only planned reader of `verified` (see *Amendment — 2026-10-07, `0323` cancelled*). No
  decision changed.
- **Deciders:** Owner (Mark Dolbyrev) — signed off 2026-10-07 (above). Drafted by `fkit-architect`, spawned by
  `fkit-lead` (`/fkit-sprint-ship-loop`, Sprint 7), with no owner channel (ADR-021). The architect heard no ruling
  first-hand; the design run, every ruling below and the acceptance itself arrived by relay. The design run was
  authorised by an owner ruling relayed by `fkit-lead` (2026-10-07, live `AskUserQuestion` in the `fkit lead`
  session): *"Run 0332 design (Recommended)"* — option text *"Send the architect to write the 0332 design report. No
  code gets written. I come back to you with its open questions, then stop."* ⛔ Not precedent beyond `0332`.
- **Citation frame:** working tree on `dev` at `5a70b6f`, 2026-10-07. Full evidence, with `path:line`, is in
  [`../reports/2026-10-07-0332-join-token-design.md`](../reports/2026-10-07-0332-join-token-design.md) (cited below
  as "the report").
- **Supersedes in part:** [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md), design rule 2 only
  (the funnel's planned *"returns the verified id or `null`"* exit). ADR-103's decision to accept the asserted id
  **for earned XP is NOT superseded** — the owner kept XP open to unverified players (Q2). See *Effect on older ADRs*.
  - *History, kept visible:* the draft read *"**Would supersede in part:** ADR-103, design rule 2, and, **if** the
    owner rules XP verified-only (Q2), its decision for earned XP."* Q2 = keep, so the conditional half did not
    happen.
- **Built?** **No — not at this writing.** This ADR is accepted; `0332`'s build (slice A) is not yet written or
  deployed. Every "the game server now …" below describes the accepted design, not production.

### Owner rulings — verbatim

All given 2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by `fkit-lead`.
Answers are the owner's chosen option labels unless marked free text. The questions are in the report § 15.

| # | Question (short) | Owner's answer (verbatim) | Recommended? | What it means here |
|---|---|---|---|---|
| **Q1** | Measure first, or switch on at once? | FREE TEXT: *"No, we're not spending another weekend slot for counting only, but we can add some metrics to the code and check them after."* | Neither option as worded | No measure-only slot. The two counters ship **inside** the slice-A build and are read afterwards (Decision 8) |
| **Q2** | XP for unverified players? | **"Keep XP (Recommended)"** | yes | `xpCredit` = allow |
| **Q3** | ★ badge for unverified citizens? | **"Keep the ★ (Recommended)"** | yes | `citizenBadge` = allow |
| **Q4** | Private lobby for unverified citizens? | **"Keep it open (Recommended)"** | yes | `privateLobbyGate` = allow |
| **Q5** | Approved name only when verified? | **"Keep for unconfirmed"** | **no** (architect recommended *verified only*) | `approvedName` = allow. ADR-115 residual 1 **stays open by owner ruling**; `0323`'s mark needs its own check (Decision 5 note) |
| **Q6** | How the game server asks | **"Reuse login pass (Recommended)"** | yes | Option A, Decision 1. Accepted residual 1 accepted |
| **Q7** | Profile server cannot answer `verified` | **"Treat as unconfirmed (Recommended)"** | yes | Decision 6 confirmed. With Q2–Q5 all open it changes nothing a player sees today; it is **the rule for any future enforcement** |
| **Q8** | Sign off ADR-124 | **"Accept with answers (Recommended)"** | yes | This status |

> 📝 **2026-10-07 (later) — Q5 row:** `0323` was cancelled, so *"`0323`'s mark needs its own check"* no longer names a
> planned task. Row left as written. See *Amendment — 2026-10-07, `0323` cancelled*.

## Context

The game server learns a player's Yandex id from the WebSocket join and trusts it unchecked (ADR-103). That
choice is confined to one funnel, `GameServer.getCreditableYandexId` (`src/server/GameServer.ts:1382-1384`). The
funnel has four users: XP crediting, the citizen ★, the private-lobby gate (`0302`), and the approved name in
matches (`0322`, ADR-115).

Since **2026-10-07** the profile server mints `vfy:true` sessions for players whose Yandex signed data checks out
at login (ADR-116; `0340` deployed, `0395` confirmed live). But the game server never sees that session, so it
still cannot tell a real player from a forged id (ADR-116 residual 7). ADR-103's and ADR-115's own re-raise lists
name this second step, `0332`, as their exit.

Three facts from the code shape the decision (report § 3–5):

- The session token carries the **internal** player id (`pid`), not the Yandex id (`src/profile-server/SessionToken.ts:4`).
  Matching "this token belongs to this Yandex id" therefore needs `player_identities`, which only the profile server
  has.
- The game server **already** calls the profile server at every point where identity enters: `POST
  /internal/v1/players/resolve`, at join, late `update_identity`, reconnect, credit time and the lobby gate
  (report § 3.1).
- An old game server **closes the socket on an unknown message type** (`GameServer.ts:348-362`), and the client
  treats that close as the end of the match (`src/client/ClientGameRunner.ts:888-893`). Unknown **fields**, by
  contrast, are dropped silently (plain `z.object`, `src/core/Schemas.ts:640-643`, `:675-692`).

## Decision

1. **Carry the token on the existing resolve call.** The client sends its profile session token as an optional
   field, `profileSession`: in the `join` when it already holds one, otherwise in the existing `update_identity`
   message once its login finishes. **No new message type.** The game server passes the token as an optional
   `sessionToken` on `POST /internal/v1/players/resolve`. The profile server checks it and replies with an optional
   `verified: boolean`. **The session secret stays on the profile box only** (ADR-113 point 6).
2. **"Vouched" means all five hold:** `verifySessionToken` returns `ok` (MAC, schema, TTL, not expired);
   `vfy === true`; `plt === "yandex_games"`; `pid` equals the player the asserted Yandex id resolves to.
   Anything else, including no token, ⇒ `verified: false`. The check runs after the find-or-create, in its own
   `try/catch`, and can **never** fail the resolve. A malformed token is read as absent: `.optional().catch(undefined)`
   on the resolve request and on both client messages, so a bad token never costs a resolve (no 4xx), and never a
   join (no schema close).
3. **The result lives in the funnel.** The funnel returns `{ yandexId, verified }` (`getCreditableIdentity`).
   `verified` comes from a server-only `Client.identityVerified`, which is set only by a resolve that carried *this*
   client's token for *this* client's id. It goes false → true only, per `Client` object, and follows the
   same-id rule across a reconnect. The token is held on `Client.profileSession` only until the first successful
   vouch, then dropped. **No code outside the funnel and the resolve path reads either field** (extends ADR-103
   rules 1 and 3).
   *Clarification, 2026-10-07 — owner follow-up ruling, recorded by `fkit-architect` (spawned by `fkit-lead`,
   `/fkit-sprint-ship-loop`, Sprint 7; heard by relay, not first-hand). Clarifies wording only; the sentence above
   is kept as written.* **"Until the first successful vouch" means until the first vouch the profile server
   answered** — a resolve that carried this token and whose reply carries `verified`, **true or false**. Then the
   token is dropped. It is **kept** when the resolve failed (no reply), and when the reply carries no `verified`
   (an old or rolled-back profile server, Decision 6), so a later resolve can still vouch. The drop applies only to
   the token that resolve carried: **a newer token that arrived meanwhile is never dropped.** Why dropping on
   `false` loses nothing: every `false` outcome (bad MAC or schema, expired, `vfy:false`, other player, other
   platform) is permanent for that token. Source: the approved build plan,
   `ai-agents/tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/plan.md`
   § 2.1, its open question Q1 (that plan's Q1 — not Q1 of the design report in the rulings table above).
   - **The ruling, verbatim** (2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim
     by `fkit-lead`): asked when the game server should throw away the player's session token after the profile
     server checks it, the owner chose **"After any answer (Recommended)"** — option text: *"Throw it away as soon
     as the profile server says yes OR no. The shortest hold, and nothing is lost. The architect adds a clarifying
     note to ADR-124. If the profile server can't answer at all, the pass is kept for a retry."*
   - *Not chosen, kept visible:* the literal reading — hold the token until a reply says `verified: true`, so a
     `false` reply keeps it in memory for the rest of the visit. Never in force; the plan flagged it as the
     one-line alternative.
4. **A late token is handled, never waited for.** A token that arrives after join causes one more resolve. If a
   tokenless resolve is in flight, the new one is chained after it. `start()` never waits. A vouch that lands
   after `start()` counts for XP and the lobby gate, but not for that match's frozen ★ or name (ADR-115 Decision 6).
   *2026-10-07, on the rulings:* with every use `allow` (Decision 5), a late vouch changes nothing a player sees. It
   still matters for the start-time counter (a vouch after `start()` counts as `unverified` there) and for `0323`'s
   mark (Decision 5 note).
   > 📝 *2026-10-07 (later):* `0323` was cancelled — the late vouch now matters only for the start-time counter.
   > Sentence above left as written. See *Amendment — 2026-10-07, `0323` cancelled*.
   *Clarification, 2026-10-07 — owner follow-up ruling, recorded by `fkit-architect` (spawned by `fkit-lead`,
   `/fkit-sprint-ship-loop`, Sprint 7; heard by relay, not first-hand). Clarifies wording only; the sentences above
   are kept as written. Decision 4 itself stands: a late token is still handled and never waited for.*
   **"Causes one more resolve" now has two limits**, both from `0332`'s review-R1 fix (owner ruling *"Fix in this
   build"*, 2026-10-07; ledger `ai-agents/tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/review.md`
   R1, and R4 for this note):
   - **A cap per connection.** The game server takes at most `MAX_LATE_PROFILE_SESSIONS_PER_CLIENT` = **2** late
     tokens per server-side `Client` (`src/server/GameServer.ts`, `export const MAX_LATE_PROFILE_SESSIONS_PER_CLIENT`;
     counted in `private acceptProfileSession(`, called only from the `case "update_identity":` handler). A token
     past the cap is ignored: no resolve, and **one** warn line the first time, carrying `clientID` only (never the
     token). Tokens that are skipped anyway — the client is already verified, or it is the token already held — do
     not count. The count is keyed by the `Client` object (`lateProfileSessionCounts`, a `WeakMap`), so a reconnect,
     which gets a new `Client`, starts again at zero.
   - **No queue of resolves.** At most one resolve waits behind the one in flight. A token that arrives while a
     resolve is already queued shares that queued resolve (`startProfileResolve`, the `!inFlight.started` check),
     and the queued resolve reads the client's **newest** held token when it starts (`entry.token =
     client.profileSession` in `runQueued`). So a late token causes **at most** one more resolve, and may cause none
     of its own.
   - **Why 2 is headroom, not a budget:** a real client sends at most **one** late token per socket. The join
     carries the token when it is already held (`src/client/Transport.ts`, `this.joinCarriedProfileSession =
     profileSession !== null`); otherwise `private async maybeSendLateProfileSession(` sends it once in an
     `update_identity`, and returns early when the join already carried it (`if (this.joinCarriedProfileSession)
     return;`). The other `update_identity` sender, `maybeRefreshYandexIdentity`, sends the id only, never a token.
   - **Re-raise:** any future client path that sends a refreshed token mid-socket (for example a re-login after a
     `401`) must revisit this cap first — otherwise its third token on one socket is dropped silently, seen only as
     a warn line. (Also listed under *Re-raise only if*.)
   - **The ruling, verbatim** (2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim
     by `fkit-lead`): asked *"the new limit (at most 2 extra login passes per connection; real players send at most
     1) isn't written in the decision record, ADR-124. Add a dated note there, or just record it as a known
     limit?"*, the owner chose **"Add ADR note (Recommended)"** — option text: *"Docs only. The architect adds one
     dated note to ADR-124, so a future change doesn't trip over the limit by surprise."*
   - *Citation frame:* content anchors (per `../conventions/file-line-citations.md`), each grep-checked to one hit
     in the **uncommitted** working tree on `dev` at `3cee150`, 2026-10-07 — `0332`'s build is not yet committed.
     Line numbers in that tree, for convenience only: `GameServer.ts` :92, :179, :524, :1528-1555, :1612, :1622-1625;
     `Transport.ts` :408, :433-435, :450.
5. **One policy decides what an unverified player loses — and today it is nothing.** The owner ruled every use
   open to unverified players (2026-10-07):

   | Use | Unverified player | Owner ruling (verbatim) |
   |---|---|---|
   | XP crediting (`xpCredit`) | **allow** | Q2 — *"Keep XP (Recommended)"* |
   | ★ badge (`citizenBadge`) | **allow** | Q3 — *"Keep the ★ (Recommended)"* |
   | Private-lobby gate (`privateLobbyGate`) | **allow** | Q4 — *"Keep it open (Recommended)"* |
   | Approved name in matches (`approvedName`) | **allow** | Q5 — *"Keep for unconfirmed"* (not the recommendation) |

   **So slice B (enforcement) is not needed and is not built.** No player loses anything because of this ADR.
   **Implementation (architect's call, 2026-10-07):** because every row is `allow`, slice A builds **no**
   `src/server/IdentityPolicy.ts` and **no** per-use reads — a table nobody reads would be dead code that drifts
   untested. The four users keep reading exactly what they read today. The first change that flips a row to `deny`
   adds the table and its one read per use through the funnel, as the report § 6 lays out (that is the template, not
   a build item now). It needs the owner's ruling on that row, and it must apply Decision 6.

   **Readers of `verified` in slice A:** the start-time counter (Decision 8) only. `0323`'s name mark is the next
   planned reader. Under Q5 = keep, a forged id still shows a citizen's approved name, so the mark cannot borrow
   trust from the name: **it must check `verified` itself, through the funnel**, and freeze it at `start()` with the
   roster (ADR-115 Decision 6), or a late vouch could make the mark and the frozen name disagree. That is `0323`'s
   design, not this build.
   > 📝 **2026-10-07 (later) — `0323` was cancelled.** After this, **the start-time counter
   > `geoconflict.server.match.identity` (Decision 8) is the only planned reader of `verified`.** Paragraph above
   > left as written. A future reader must still check `verified` through the funnel and apply Decision 6. See
   > *Amendment — 2026-10-07, `0323` cancelled*.

   *History, kept visible:* the draft table read **pending — Q2 / Q3 / Q4 / Q5** in every row, with *"Architect's
   recommendation, not a decision: `approvedName` = deny; the other three = allow, for now."* The owner followed the
   recommendation on Q2–Q4 and not on Q5. The draft also said *"`src/server/IdentityPolicy.ts` maps each use … Each
   user makes one read through the funnel"*; that now describes the template for a future flip, not slice A.
6. **A missing `verified` (old or rolled-back profile server) reads as unverified** — **confirmed by the owner, Q7:
   *"Treat as unconfirmed (Recommended)"*.** So a profile rollback can never silently reopen a use the owner later
   denies. **Dormant today:** with every use `allow` it changes nothing a player sees; it only makes the start-time
   counter read `unverified`. It is the standing rule for any future enforcement: **if any use is ever `deny`, roll
   back the game's enforcement before rolling the profile server back below the vouch build.**
   *History, kept visible:* the draft read *"— pending owner confirmation, Q7."*
7. **The token is a credential.** It is never logged, persisted, put in analytics, or sent to any player: not in
   `gameInfo()`, the start roster, turns or the archive, all of which list fields one by one. **The build must also
   fix** the pre-join log at `src/server/Worker.ts:457-460`, which writes whole client messages and would write the
   token. It must log the message type only. And it must stop the raw-input catch-all logs (`GameServer.ts:461-467`,
   `Worker.ts:556-563`) and the raw-message echo (`GameServer.ts:350-360`).
8. **Rollout: one build, counters inside it, read afterwards** — **owner ruling Q1** (free text): *"No, we're not
   spending another weekend slot for counting only, but we can add some metrics to the code and check them after."*
   **Slice A is the whole build**: the client sends the token, the profile server vouches, the funnel carries
   `{ yandexId, verified }`, plus the Decision 7 log fixes and hardening, plus two bounded counters —
   `geoconflict.profile.resolve.vouch{outcome}` (8 values) and `geoconflict.server.match.identity{state}` (4 values,
   counted at `start()`); value lists in the report § 9.4. Deploy order: profile first, then the game image (report
   § 9.2), in a normal deploy slot; **no measure-only slot**. The counters are read **after** that deploy. They feed
   any later re-raise of a Decision 5 row (see *Re-raise only if*); they gate nothing now, because nothing is
   enforced.
   *History, kept visible:* the draft read *"**Rollout: measure, then enforce** — pending owner confirmation, Q1.
   Slice A (profile first, then game) ships with every use `allow`, plus two bounded metrics … Slice B flips the uses
   the owner denied."* Slice B is not needed (Decision 5).

## Options considered

- **Carry the token on the existing resolve call (chosen — owner ruling Q6, *"Reuse login pass (Recommended)"*;
  the draft read "chosen, pending Q6").** No extra request; the secret stays on one
  box; the player-id match happens next to `player_identities`. **Cost:** the game box briefly holds a 24 h bearer
  token in memory (report § 4.2).
- **The game server checks the token itself** — rejected. The secret would sit on two boxes, against ADR-113
  point 6. A broken-into game box could then **mint** verified sessions for anyone, and it saves no request.
- **An audience-bound, minutes-long join ticket** — not now. It is safer if the game box is broken into, but it
  adds an endpoint, a token type, a client step and a new way to fail. It is the upgrade path (see *Re-raise only
  if*).
- **A new `profile_session` message type** — rejected. An old game server ends the player's match on it.
- **The profile server applies the policy** (withholds `isCitizen`/`displayName` from unverified players) —
  rejected. It splits game policy across two boxes, and fails open on a profile rollback.
- **Return `null` from the funnel for unverified players** (ADR-103 rule 2 as planned) — rejected. The funnel needs
  the id to *learn* `verified`, and one null cannot express four separate owner rulings. *2026-10-07:* the rulings
  confirm it — a `null` for unverified players would have denied all four uses, and the owner kept all four open.

## Consequences

*Rewritten 2026-10-07 on the owner's rulings, while promoting the draft. The draft's wording is kept below each
changed point.*

- **Positive:** the game server can tell a verified player from an asserted id, and it counts how many match
  players are verified — the number a later enforcement decision needs (Decision 8). `0323`'s mark gets the
  `verified` bit it needs to be honest (Decision 5 note). The log fix stops today's pre-join log of whole client
  messages, which already writes Yandex ids.
  > 📝 *2026-10-07 (later):* `0323` was cancelled, so no mark will use the bit; the return is the counters. See
  > *Amendment — 2026-10-07, `0323` cancelled*.
  *Draft read:* *"The forged-id risk closes for every use the owner denies, with one read each. `0323`'s mark can be
  honest."*
- **What this ADR does NOT do — stated plainly:** **it closes no forged-id hole.** The owner kept every use open
  (Decision 5), so after this ships a forged Yandex id still earns XP for its victim (ADR-103 risk R1), still shows
  the ★ (`0068`), still hosts a private lobby (`0302`) and still shows a citizen's approved name (ADR-115 residual 1).
  ADR-116 residual 7 therefore stays open too. Each closes only when the owner flips its row.
- **Negative / costs:** two new server-only `Client` fields; an optional field on two client messages and on the
  resolve request and reply; one more resolve when a token is late; ~12 metric series; a dormant rollback rule
  (Decision 6). **And residual 1 below is paid for a build that, today, gates nothing** — its return is the counters,
  `0323`'s mark, the log fix and readiness for a later flip. The owner accepted Q6 in the same batch as Q2–Q5.
  *Draft read:* *"… ~12 metric series; a new rollback rule (Decision 6)."*
  > 📝 *2026-10-07 (later):* with `0323` cancelled, the return is the counters, the log fix and readiness for a later
  > flip — `0323`'s mark drops out. Residual 1 is still accepted (Q6). See *Amendment — 2026-10-07, `0323` cancelled*.
- **Accepted residuals:**
  1. **Bearer tokens pass through game-box memory** (option A; owner ruling Q6). A break-in there could use them at
     the profile server as those players for up to 24 h. This is bounded: that box already holds
     `PROFILE_INTERNAL_TOKEN`.
  2. **Self-farming is not stopped.** A player can copy their own verified token into extra clients.
     Verification proves who, not how many.
  3. **A late token does not change that match's frozen ★ or name.** *2026-10-07:* invisible to players while both
     are `allow`; it matters for the counter and for `0323`'s mark.
     📝 *2026-10-07 (later):* `0323` cancelled — it now matters for the counter only.
  4. **A narrow pre-join race can drop a late token.** The player stays unverified for that match, which is
     fail-soft. The client re-sends on every reconnect.
  5. **Honest unverified players lose whatever the owner denies,** for the whole visit. That is about 3–7 % today
     (small samples; `0402` re-reads them), and everyone during Yandex trouble (ADR-116 residual 2).
     *2026-10-07:* **today that is nothing** — no row is `deny`. This residual applies to any future flip.
  6. **The forged-id holes stay open by owner ruling** (Q2–Q5, 2026-10-07) — XP gifting, forged ★, forged hosts,
     and a forged approved name (ADR-115 residual 1). Added 2026-10-07.

## Re-raise only if

- **The session token gains power beyond a player acting on their own account** (money, other players, admin), or
  the game box's exposure grows — then build the audience-bound join ticket first.
- **The counters (Decision 8) show a much larger unverified share among match players than at login** — then
  revisit Decision 4 and the client's timing before enforcing anything. *(Draft read "The shadow numbers".)*
- **The owner wants any use to become verified-only** — then add the policy table and that use's read per the
  report § 6, apply Decision 6, reword `0397`'s *not confirmed* text (EN + RU) to name the loss, and, if the loss hits
  non-citizens (XP would), switch on `0397`'s message for unverified non-citizens. Added 2026-10-07.
- **Observed abuse of any `allow` use** (XP gifting, forged ★, forged hosts) — then revisit that row of Decision 5.
- **A client path appears that sends a refreshed session token mid-socket** (e.g. a re-login after a `401`) — then
  revisit `MAX_LATE_PROFILE_SESSIONS_PER_CLIENT` (= 2 late tokens per connection) before it ships; see the Decision 4
  clarification. Added 2026-10-07 (owner ruling, `0332` review R4).
- **A reader of `client.identityVerified`, `client.profileSession` or `client.yandexPlayerId` appears outside the
  funnel and the resolve path** — that is a defect against this ADR.
- **The token appears in a log, a DB row, an analytics event, a player-bound message or the archive** — that is a
  defect against this ADR.

Absent those, a review finding of the form *"the game server holds the session token in memory"*, *"a player can
farm with their own token"*, *"a late token doesn't give the ★ this match"*, *"an unverified player still gets
X"* (for an `allow` row — today, all four), *"a forged id still earns XP / shows the ★ / hosts / shows an approved
name"* or *"there is no `IdentityPolicy.ts`"* is **closeout of this ADR, not a new defect.**

## Effect on older ADRs — applied 2026-10-07, adjusted to the rulings

✅ **Applied 2026-10-07** by `fkit-architect` (spawned by `fkit-lead`) on this ADR's acceptance, as dated,
attributed, append-only notes; every earlier wording in those ADRs is kept. Each note says plainly that `0332` is
**accepted, not built**.

| ADR | What changed (on the actual rulings) | Form |
|---|---|---|
| **ADR-103** | **Design rule 2 only** is superseded: the funnel will not return `null` for unverified players; it gains `{ yandexId, verified }` and today nothing downstream reads `verified` except the counter. **Its earned-XP decision is NOT superseded** (Q2 = keep) — it still governs the game server after `0332` ships. Rules 1, 3, 4, 5 stand and extend to the new fields. Its *"exit is now `0332`"* is **revised**: `0332` delivers the mechanism, but the asserted id stays accepted for XP by owner ruling; the exit is now an owner ruling flipping `xpCredit` to `deny` | Supersession in part (rule 2) — a Status pointer and an inline ⛔ pointer at rule 2, plus a dated note |
| **ADR-115** | Residual 1 **stays open by owner ruling** (Q5 = *"Keep for unconfirmed"*), even once `0332` ships — its *"`0325` plus the join-token second step land … residual 1 closes"* expectation will not happen. ADR-124 provides the `verified` bit a future change could use; that change would need one read in `matchDisplayName`, so the *"needs no change to this code"* forecast is corrected. Its second re-raise trigger (the `0323` mark) is now live for `0323`'s design | Dated in-place note (owner follow-up ruling + clarification) |
| **ADR-113** | Point 6: from `0332`'s build, the WS join (or `update_identity`) also carries the session token, which the game server relays on resolve and holds in memory only. The game server still does not hold the secret | Dated in-place note (clarification) |
| **ADR-116** | Residual 7 (*"closes only with `0332`"*): `0332` delivers the mechanism but, by owner ruling, closes nothing — the residual stays open | Dated in-place note (owner follow-up ruling) |

*History, kept visible:* this section was headed *"Effect on older ADRs — applied ONLY after sign-off"*, opened
*"None of these has been applied"*, and its table carried the conditional forms (*"If Q2 = deny …"*, *"If Q5 = deny
… If Q5 = allow …"*) and, for ADR-116, *"the mechanism shipped"*. Q2 and Q5 were both *keep*, and nothing has shipped
yet, so the applied notes follow the table above.

> 📝 **2026-10-07 (later) — ADR-115 row:** *"Its second re-raise trigger (the `0323` mark) is now live for `0323`'s
> design"* is overtaken: `0323` was cancelled, and ADR-115 now records that trigger as waiting again (ADR-115
> *Amendment — 2026-10-07, `0323` cancelled*). Row left as written.

## Amendment — 2026-10-07, `0323` cancelled (the counter is the only planned reader of `verified`)

Facts only; **no decision in this ADR changes.** Recorded by `fkit-architect` (spawned by `fkit-lead`,
`/fkit-sprint-ship-loop`, Sprint 7; heard by relay, not first-hand) under `decisions/README.md`'s carve-out.

**The ruling, verbatim** (2026-10-07, live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by
`fkit-lead`): asked *"What should happen to 0323?"*, the owner chose **"Cancel 0323 (Recommended)"** — *"Nothing gets
built. A producer cancels it with your reason ('players don't care; only admins need it, and 0332's counters cover
that'). It can be filed again later if you want a per-player admin view."* Earlier the same session, at `0323`'s plan
gate: *"No need for special mark of "this is really that account", users don't care about this feature, it's only
important for us (developers/admins of the game)"*.

- **`0323` is cancelled** —
  [`tasks/cancelled/0323-…`](../../tasks/cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md).
- **After this, the start-time counter `geoconflict.server.match.identity` (Decision 8) is the only planned reader of
  `verified`.** Every *"`0323`'s mark"* reference above (Q5 row, Decision 4, Decision 5 note, *Consequences*,
  residual 3, the ADR-115 row in *Effect on older ADRs*, *Related*) is overtaken and kept visible.
- **Unchanged:** Decisions 1–8, the per-use table (all `allow`), the accepted residuals and the re-raise list. The
  rule in the Decision 5 note still binds any **future** reader: check `verified` through the funnel, and apply
  Decision 6.
- **Open point carried in ADR-115, not here:** whether a future per-player admin view counts as *"presented to
  players"* under ADR-115's re-raise trigger is undecided — owner's call if such a view is filed.

## Related

- Report: [`../reports/2026-10-07-0332-join-token-design.md`](../reports/2026-10-07-0332-join-token-design.md)
- Task: `ai-agents/tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md`
- ADR-101 (fail-soft crediting), ADR-103, ADR-111 (1 XP per match), ADR-113, ADR-115, ADR-116, ADR-121, ADR-123
- Code: `src/server/GameServer.ts` (funnel `:1382-1384`, resolve `:1408-1461`, reconnect `:269-306`,
  `update_identity` `:439-453`), `src/server/Worker.ts` (join `:529-542`, pre-join log `:457-460`),
  `src/server/Client.ts`, `src/server/ProfileApiClient.ts`, `src/core/profile/CreditContract.ts`,
  `src/profile-server/Routes.ts` (resolve `:844-873`), `src/profile-server/SessionToken.ts`,
  `src/client/ProfileSession.ts`, `src/client/Transport.ts`
- Tasks: `0323` (the mark — depends on slice A; must check `verified` itself under Q5 = keep; **cancelled
  2026-10-07**), `0397` (the *not
  confirmed* text — **not** reworded by `0332`, since no use is denied; reworded only by a future flip), `0319`,
  `0267`, `0402`
