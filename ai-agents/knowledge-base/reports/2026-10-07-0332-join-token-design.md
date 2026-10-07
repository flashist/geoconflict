# 0332 — Join token: the game server has the profile server vouch for a verified session (phase 1 design)

- **Task:** [`0332`](../../tasks/backlog/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md), phase 1 (design). Owner: `fkit-architect`.
- **Date:** 2026-10-07. **Citation frame:** working tree on `dev` at `5a70b6f`. Every `path:line` below was read
  in that tree.
- **Written by:** `fkit-architect`, spawned by `fkit-lead` (`/fkit-sprint-ship-loop`, Sprint 7), with no owner
  channel (ADR-021). The run was authorised by an owner ruling relayed by `fkit-lead` (2026-10-07, live
  `AskUserQuestion` in the `fkit lead` session): *"Run 0332 design (Recommended)"*. ⛔ Not precedent.
- **Draft ADR:** [ADR-124](../decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md),
  status **proposed — owner sign-off pending**.
  - 📝 **2026-10-07 — ADR-124 is now `accepted`, and the owner answered Q1–Q8.** Where this report recommends
    otherwise, the rulings win — see § 17 (addendum). The body below is kept as written.
- **No source code was written.** No stubs were put in the source tree. The interfaces are in § 4 as fenced code.

---

## 0. The answer in eight lines

1. **The precondition is met.** Verified sessions (`vfy:true`) have been live since **2026-10-07** (`0340`
   deployed as profile `0.0.156-profile.3`; the owner's live check returned `vfy: true` —
   `tasks/done/0395-…/worklog.md` § 5). The brief's *"`0325` is blocked on an owner-run test"* is stale.
2. **How the game server asks: it adds the player's session token to the resolve call it already makes**
   (`POST /internal/v1/players/resolve`). The profile server checks the token and answers `verified: true|false`.
   The session secret stays on the profile box only, as ADR-113 point 6 already says.
3. **"Vouched" means all five:** the token's signature checks out, it has not expired, it says `vfy:true`, it is
   for platform `yandex_games`, **and** its player id equals the player the joined Yandex id resolves to.
   Anything else ⇒ unverified.
4. **The client sends the token in the join when it already has it,** or in the existing `update_identity`
   message once a slow login finishes. **No new message type**, because an old game server closes the socket on
   an unknown type, and the client treats that close as the end of the match (§ 3.3).
5. **The result is stored on the server-side `Client` and read only through the funnel.** The funnel now returns
   `{ yandexId, verified }`. Each of the four users asks one **policy table** whether an unverified player is
   allowed.
6. **What an unverified player loses is the owner's call (Q2–Q5).** My recommendation: verified-only for the
   **approved name** (it costs honest citizens almost nothing, and `0323` needs it). Keep the other three for
   unverified players for now, and decide after measuring.
7. **Two leaks must be fixed in the same build.** One code path today writes a whole client message into the log
   (`src/server/Worker.ts:459`). Two catch blocks log raw parse errors.
8. **Build in two slices plus a verify task:** (A) vouch + measure, no player-visible change; (B) apply the
   owner's policy. If the owner keeps all four perks for unverified players, B is not needed.

---

## 1. Goal, context, success criteria

**The problem.** The game server learns who a player is from the Yandex id the client sends in the WebSocket join
(`src/server/Worker.ts:540-541`). Nothing checks that id. ADR-103 confines that trust question to one funnel,
`GameServer.getCreditableYandexId` (`src/server/GameServer.ts:1382-1384`), which today just returns
`client.yandexPlayerId`. Since 2026-10-07 the **profile** server can prove who a player is (ADR-116). But the game
server never sees the profile session, so that proof does not reach it (ADR-116 residual 7).

**Success criteria** (from the brief's phase-2 verification, refined here in § 9):

- A join carrying a valid `vfy:true` token for the same player ⇒ the funnel says **verified**.
- Every forgery shape ⇒ **unverified**: another player's token, a tampered, expired or `vfy:false` token, or no
  token.
- An old client, an old profile server, and both deploy orders all still let the player join and play.
- The token never appears in logs, the public game-info route, turn broadcasts or the archive.
- Each of the four funnel users behaves as the owner rules.

**State check (point of the driver's note, verified in the repo):** `0340` and `0395` are in `tasks/done/`.
`0395`'s worklog records the deploy at 2026-10-07T07:10:45Z and the owner's `vfy: true` check (§ 4–5). The
post-`0391` login numbers no longer gate this deploy (brief, 2026-10-07 note; ADR-123).

## 2. Constraints and scope

**Hard constraints carried in:**

| Constraint | Source |
|---|---|
| A slow or dead profile API never delays or blocks a join | `GameServer.ts:1394-1396`; ADR-115 Decision 8 |
| The ★ and the approved name freeze at `start()` | `GameServer.ts:557-569`; ADR-115 Decision 6 |
| One identity funnel; no other reader of `client.yandexPlayerId` | ADR-103 rules 1 and 3; ADR-115 Decision 2 |
| The id may only go null → value | `Client.ts:80-86`; ADR-103 rule 4 |
| The game server does not hold the session secret | ADR-113 point 6 |
| Login never refuses because of the signature; a failed check gives `vfy:false` | ADR-116 Decision 4 |
| The token is a 24 h bearer credential with no revocation | ADR-116 residual 1; `SessionToken.ts:21-27` |
| Fail-soft crediting, no durable queue | ADR-101 |
| Weekend deploy slots; split build and verify tasks | owner rulings 2026-09-29 (project memory) |

**In scope:** the nine points of the brief's *Phase 1*.
**Out of scope (from the brief, unchanged):** verified login itself (`0325`/`0340`), the name mark (`0323`),
gating the profile server's name-change routes (`0319`), other platforms (`0267` item 4).

---

## 3. Point 1 — every place identity enters the game server

### 3.1 The entry points

| # | Entry | Where | What it does with identity today |
|---|---|---|---|
| E1 | **Join** | `Worker.ts:529-542` builds `Client` with `clientMsg.yandexPlayerId`; `GameManager.ts:33-36` → `GameServer.addClient` | `addClient` resolves at once: `resolveProfileForClient` (`GameServer.ts:334`) |
| E2 | **Late `update_identity`** | `GameServer.ts:439-453`; schema `Schemas.ts:640-643` | null → value only (`Client.ts:80-86`), then resolve again (`:447`) and retry a dropped participation report (`:450`) |
| E3a | **Reconnect, same page** (socket dropped) | client: `Transport.ts:362-383` reconnects; `ClientGameRunner.ts:813-816` re-sends the join with `turnsSeen` | the server sees a **new join** for the same `clientID` → carry rules at `GameServer.ts:269-306`, then resolve (`:334`) |
| E3b | **Reconnect after a page reload** | `ReconnectSession.ts` keeps `gameID`/`clientID`; `Main.ts:807` `isReconnect` | Same as E3a on the server. On the client, a **new page load means a new login and a new token** (`ProfileSession.ts:17-22`) |
| E4 | **Lazy resolves** (not new identity, but they call the resolve) | credit time `GameServer.ts:1598-1616`, `:1627-1693`; private-lobby gate `:984-990` | `resolveProfilePlayer` (`:1408-1416`) resolves again if no player id is known yet |

The funnel is read at `GameServer.ts:293`, `:296` (reconnect carry), `:1409`, `:1421` (resolve), `:1582`
(credit state) and `:1662` (drop count). Nothing else in `src/server/` reads `client.yandexPlayerId` besides the
funnel (`:1383`), the setter on `update_identity` (`:443`) and the construction site (`Worker.ts:541`), as
ADR-115 Decision 2 recorded.

### 3.2 A token that arrives late

**Why it happens.** The client logs in once per page load (`ProfileSession.ts:1-3`), fire-and-forget at start-up
(`:111-118`). The login waits for Yandex's signed player data with no normal time limit and a 60 s hang net
(ADR-116 D1; `ProfileSession.ts:55-61`, `:224-248`), then allows 5 s for the request (`:51`). The page reloads
after every match (comment at `Main.ts:813`, not re-traced), so **every match starts on a fresh login**. A player
who joins a lobby quickly can join before the login finishes.

**Design.**

- **Client.** When the join is built, include the token if the page already holds one (a new synchronous getter
  on `ProfileSession.ts`, which never starts a login). After every (re)connect, also wait on `ensureSession()`
  (shared, never a second login, `ProfileSession.ts:124-135`). If a token arrives that the join did not carry, and
  the socket is open, send it in `update_identity` together with the Yandex id. This copies the pattern of
  `maybeRefreshYandexIdentity` (`Transport.ts:411-426`), whose "id is null" early return (`:413`) must not apply to
  the token. Skip both for local games (`isLocal`).
- **Server.** One method handles the join and the late message alike: store the token on the `Client`, then
  resolve again **with** it. The token never changes the id: a late message for a *different* Yandex id leaves the
  id as it was (null → value only) and is checked against the id the client already has. A mismatch ⇒ unverified.
- **In-flight resolve.** `startProfileResolve` shares a resolve already in flight for the same client
  (`GameServer.ts:1425-1428`). A tokenless resolve in flight must **not** swallow the token: the coder chains a
  fresh resolve after it. This needs a test.
- **Verified only goes false → true** per `Client` object, the way `isCitizen` does (`GameServer.ts:1436-1441`). A
  later resolve that fails or lacks the token never clears it. Once verified, the server drops the stored token,
  because it no longer needs it.
- **What a late token can still change.** The XP credit and the private-lobby gate read the state when they run,
  so a late vouch counts for them. The ★ and the approved name are frozen at `start()` (ADR-115 Decision 6), so a
  vouch that lands **after** start does not change them for that match. Under a "verified only" policy, that player
  shows the typed name and no ★ for that one match. `start()` never waits for a vouch (ADR-115 Decision 8).

### 3.3 Why not a new message type

`ClientMessageSchema` is a discriminated union (`Schemas.ts:694-703`). An old game server that gets an unknown
`type` fails the parse, replies `error` and closes with 1002 (`GameServer.ts:348-362`). The client treats exactly
that close as **terminal**: it stops the match (`ClientGameRunner.ts:888-893`, task `0233`). Extra fields, by
contrast, are dropped silently, because both message schemas are plain `z.object` (`Schemas.ts:640-643`,
`:675-692`). So the token rides as an **optional field** on `join` and on `update_identity`. A new client that talks
to an old server (after a game rollback, in a tab that was already open) loses nothing.

### 3.4 Reconnect carry

Today a reconnect carries `profilePlayerId` and `approvedName` only for the same creditable id
(`GameServer.ts:290-303`). It carries `isCitizen` **unconditionally** (`:287-289`). The new `identityVerified`
flag follows the **same-id rule**. A replacement still needs the same `clientID` **and** the same `persistentID`
(`:274-283`), and `persistentID` comes from the verified play token (`Worker.ts:474-480`), so the carry adds no new
way in. If the owner rules the ★ verified-only (Q3), the unconditional `isCitizen` carry must also start reading
the policy. Otherwise a different identity on the same socket could carry a ★.

---

## 4. Point 2 — how the game server asks

### 4.1 Options weighed

| | **A. Add the token to the existing resolve call** ⭐ | B. The game server checks the token itself | C. A separate short-lived "join ticket" |
|---|---|---|---|
| What happens | `POST /internal/v1/players/resolve` gets an optional `sessionToken`; the profile server checks it and replies `verified` | The game box gets `PROFILE_SESSION_SECRET` and runs `verifySessionToken` | The client trades its session for a ticket (`POST /v1/join-ticket`) that only the game path accepts and that expires in minutes; the game server forwards the ticket on resolve |
| Where the secret lives | **Profile box only** | **Two boxes** | Profile box only |
| Extra requests | **None.** The resolve already happens at every entry (§ 3.1) | None, but the player-id match still needs the resolve reply | **One more client call per page load**, plus one more way to fail |
| Player-id match | Done next to `player_identities`, where the resolve already is | Possible: compare the token's `pid` to the resolve reply's `playerId` | Same as A |
| If the game box is broken into | The attacker sees tokens passing through memory for up to 24 h (see 4.2) | The attacker can **mint** a session for any player, verified ones included. That is full impersonation on the profile server | The attacker sees tickets that are useless anywhere else and expire in minutes |
| Agrees with ADRs | ADR-113 point 6 (*"The game server does not hold the session secret"*) | **Contradicts** ADR-113 point 6. Rotating the secret would need both boxes changed in step | Fits ADR-113. Adds a second token type |
| Cost to build | Small: one optional field each way, one helper on the profile side | Small code, but new config parity work on two boxes | Medium: a new endpoint, a new token type, a new client step, its own tests |

**Recommendation: A.** It adds no requests, keeps the secret on one box, and puts the player-id match where the
identity table is. **The main trade-off:** the game box now briefly holds a 24 h bearer token (4.2). C is the
upgrade path if that ever matters. It is recorded in the ADR as a re-raise condition, not built now.

### 4.2 The new exposure A creates, stated plainly

Until now a session token travelled only between the client and the profile server. Under A it also passes
through the game server's memory. If the game box were broken into, an attacker could collect tokens of players
on that box and use them at the profile server as those players, verified, for up to 24 h. Concretely: reading
their own-view profile including paid facts (`PublicProjection.ts` owner view), and anything that later gates on
`verified` (`0319` name changes).

**How much this adds.** A broken-into game box already holds `PROFILE_INTERNAL_TOKEN`
(`ProfileApiClient.ts:185-188`), so it can already create players and credit XP to anyone through the internal
routes. Under A it can also act on the player-facing routes as players who joined there. This is a real but
bounded addition. It sits inside ADR-116's re-raise rule: *"`vfy:true` is used to authorize something beyond a
player acting on their own account"* — and it does not cross that line.

**Holding window, kept short:** the token is stored only until the first successful vouch, then dropped (§ 3.2).

---

## 5. Point 3 — what "vouched" means exactly

The profile server answers `verified: true` **only if all of these hold**, checked in this order:

1. A token was sent, and it passes the request schema. A malformed token is read as **absent**. It never fails
   the resolve (§ 5.1).
2. `verifySessionToken(sessionSecret, token)` returns `status: "ok"` (`SessionToken.ts:115-168`). That covers the
   MAC (constant-time, canonical base64url, `:131-148`), the claim schema (`:156-159`), the TTL check (`:161-163`)
   and expiry (`:164-166`). An unusable secret reads as invalid (`:120-122`).
3. `claims.vfy === true`. Strictly `=== true`, as `callerFromSession` does (`Routes.ts:333-335`).
4. `claims.plt === "yandex_games"`, the platform of the resolve request (`ProfileApiClient.ts:97-100`).
5. `claims.pid === resolved.playerId`. The token is for the **same internal player** that the joined Yandex id
   resolves to through `player_identities`. **The token carries the internal id, not the Yandex id**
   (`SessionToken.ts:4`, `:39-46`), so this match can only be made after the resolve. That is one more reason the
   check belongs with the resolve (option A).

Anything else ⇒ `verified: false`. The vouch runs **after** `resolveOrCreatePlayer` (`Routes.ts:851-855`), inside
its own `try/catch`. If the vouch throws, the answer is `false`. It never costs the player the resolve, so their
XP and ★ are not lost.

Two further cases are unverified on purpose: a player erased since the token was minted (the resolve creates a new
player, so `pid` differs), and a token from before the last rotation of `PROFILE_SESSION_SECRET` (invalid).

### 5.1 Two lessons that must not be relearned

- **A bad token must never turn a good resolve into a 400.** The game client treats any 4xx as final and does not
  retry (`ProfileApiClient.ts:269-273`). A 400 would make `resolvePlayer` return null, and the player would lose
  their XP, ★ and name for that match. So the request field is `.optional().catch(undefined)`, in the same way
  `displayName` protects the reply (`CreditContract.ts:85-94`). ADR-116 amendment A1 learned the same lesson at
  login.
- **A bad token must never fail the join.** The game server closes a socket whose join fails its schema
  (`Worker.ts:440-450`). So the join and `update_identity` fields are also `.optional().catch(undefined)`, with a
  generous bound. A token is about 200 characters today (`v1.` + base64url claims + 43-character MAC). The bound is
  1024.

---

## 6. Point 4 — where the result lives

**Inside the funnel.** `getCreditableYandexId` becomes a small family that stays the **one place** identity is
decided:

```ts
// src/server/GameServer.ts — signatures only; bodies are the coder's.

/** What the funnel knows about this client's identity. */
interface CreditableIdentity {
  /** Client-asserted Yandex id (UNTRUSTED on its own). */
  yandexId: string;
  /**
   * True only after the profile server vouched (ADR-124) for a vfy:true session
   * of THIS id. False → true only, per Client object.
   */
  verified: boolean;
}

/** The ONLY reader of client.yandexPlayerId and client.identityVerified. */
private getCreditableIdentity(client: Client): CreditableIdentity | null;

/** Kept: the resolve and the reconnect-carry compare still need the id alone. */
private getCreditableYandexId(client: Client): string | null; // = getCreditableIdentity(client)?.yandexId ?? null

/** One policy read per use — the owner's ruling (Q2–Q5) lives in ONE table. */
private identityAdmits(use: IdentityUse, client: Client): boolean;
```

```ts
// src/server/IdentityPolicy.ts (new, server-only — not src/core)
export type IdentityUse =
  | "xpCredit"
  | "citizenBadge"
  | "privateLobbyGate"
  | "approvedName";

/** What each use does for an UNVERIFIED player. "allow" = today's behaviour. */
export const UNVERIFIED_IDENTITY_POLICY: Readonly<
  Record<IdentityUse, "allow" | "deny">
> = {
  xpCredit: "allow",         // TODO(owner) Q2
  citizenBadge: "allow",     // TODO(owner) Q3
  privateLobbyGate: "allow", // TODO(owner) Q4
  approvedName: "allow",     // TODO(owner) Q5
};
```

```ts
// src/server/Client.ts — two new server-only fields (never sent, never logged).
/** The player's profile session token, held only until the first successful vouch. */
public profileSession: string | null = null;
/** Set only from a resolve that carried THIS client's token for THIS client's id. */
public identityVerified: boolean = false;
```

**Why not "return null when unverified" as ADR-103 rule 2 planned.** The game server learns `verified` *from* the
resolve, and the resolve needs the id. So the funnel cannot drop the id before the resolve without also losing the
ability to verify. And if the owner rules the four users differently, one null cannot express that. The
`{ yandexId, verified }` shape plus a policy table covers every ruling, including "deny all". **This changes ADR-103
rule 2 and ADR-115's "no change to this code" forecast** (§ 11).

**Where each user reads it** (each a one-line change, applied in slice B only for the uses the owner denies):

| User | Today | With the policy |
|---|---|---|
| XP crediting | `identityKnown` at `GameServer.ts:1582` → `selectMatchCredits` (`MatchQualification.ts:124-140`) | Add `verified` to `ClientCreditState` and a `requireVerified` input to `selectMatchCredits` (a pure `src/core` change, with tests per CLAUDE.md). ⚠️ `identityKnown` must keep meaning "has an id", because `selectUnresolvedCreditClients` (`MatchQualification.ts:151-165`) uses it to decide who to resolve, and the resolve is what *learns* `verified`. After the resolve, `resolveThenCredit` (`GameServer.ts:1638-1644`) must take `verified` from the client, not from the snapshot taken before it |
| ★ badge | `start()` `:568`, `gameInfo()` `:1090`, reconnect carry `:289` | `isCitizen && identityAdmits("citizenBadge", c)` at the two display points; the carry follows § 3.4 |
| Private-lobby gate | `creatorMayStartPrivateLobby` `:980`, `:990` | `creator.isCitizen && identityAdmits("privateLobbyGate", creator)` at both reads |
| Approved name | `matchDisplayName` `:1502-1508` (used by `start()` `:563` and `gameInfo()` `:1088`) | Typed name unless `identityAdmits("approvedName", c)` |

New funnel rule, extending ADR-103 rules 1 and 3: **no code outside the funnel and the resolve path reads
`client.identityVerified` or `client.profileSession`.**

---

## 7. Point 5 — what an unverified player loses: OWNER DECISIONS

The architect does not pick these. Each has the two real options, their costs, and a recommendation.

### 7.1 Who is "unverified", in practice

- **Honest players whose login check failed.** Server-side, about **93–97 %** of logins that carry a signature come
  back `ok` (`0395` worklog § 4: 14 of 15 in the first ~3 min; the `0392` window read 96.70 %). Those are small,
  early samples, and `0402` re-reads them. Not counted in that figure: logins that send no signature at all, logins
  that fail outright, and tokens that arrive after `start()`. So roughly **3–7 % of honest logged-in players, plus
  an unknown extra**. Slice A's measurement gives the real number for match players.
- **It lasts the whole visit.** Yandex returns the same signed data for the whole visit, so a reload rarely helps.
  Closing and reopening the game usually does (`0397` product spec, *Architect correction*, citing ADR-121).
- **A Yandex outage or key change makes everyone unverified, silently** (ADR-116 residual 2). Login still works,
  by design (ADR-116 Decision 4). Under any "deny", that perk then disappears for every player until Yandex
  recovers.
- **Old open tabs** (bundles from before the deploy) send no token. They age out within about one match, because
  the page reloads after each match.
- **Guests** have no Yandex id and none of these perks today. Nothing changes for them.

### 7.2 The four rulings

| | Keep for unverified (today's behaviour) | Verified only | Recommendation |
|---|---|---|---|
| **Q2 — XP crediting** | A forger can gift XP to someone else's account (ADR-103's risk). The award is **1 XP per match** with a 100 XP threshold (`Citizenship.ts:20`, `:31`; ADR-111), so it takes ~100 forged matches to gift free citizenship. | An honest unverified player **silently gets no XP** for that match, with no backfill (ADR-101). Non-citizens see XP unequalized (`PublicProjection.ts` `equalizedXp`), so they would see their XP not move. `0397` must then show non-citizens a message too (brief, 2026-10-06 note). ⚠️ This does **not** stop farming your own account: a player can copy their own verified token into extra clients. | **Keep for unverified.** The harm is small and needs a victim's id. The cost lands silently on honest players. Re-raise on observed abuse, or if XP gains value. |
| **Q3 — ★ badge** | A forged citizen id shows the ★ (`0068`, accepted as cosmetic). | An honest unverified citizen, including a **paying** one, has **no ★ in matches for the whole visit**, while their own card still says citizen. A late token (after `start()`) also loses the ★ for that one match. Likely to cause complaints. | **Keep for unverified.** Forging needs the victim's Yandex id, which no game screen shows. The cost lands on citizens, paying ones included. |
| **Q4 — private-lobby gate** | A forged citizen id can host a private match (`0302`, owner-accepted 2026-09-26). | An honest unverified citizen **cannot start a private match** this visit and sees only the generic "couldn't start" error (`Worker.ts:295-304`). The gate already fails closed on a profile outage (`GameServer.ts:950-951`). This adds Yandex trouble as a second way to fail. | **Keep for unverified.** It is a convenience perk with nothing scarce behind it (`Client.ts:18-24`). Re-raise if private lobbies gain value. |
| **Q5 — approved name in matches** | A forged id shows a citizen's approved name (ADR-115 residual 1). | An honest unverified citizen plays under their **typed** name. That is **almost always the same text**, because the start screen pre-fills and locks the name box to the approved name (`0321`; `ApprovedName.ts:1-16`), and unverified profile reads still show `display_name` (it is not equalized, `PublicProjection.ts:1-21`). | **Verified only.** It costs honest citizens close to nothing and closes the impersonation case. `0323`'s mark is honest only under this ruling. ⚠️ Note: anyone can still *type* a citizen's name (ADR-115 residual 2, accepted). So this closes residual 1 but does not stop look-alikes. |

**Whatever the rulings,** the task that applies them must, per the brief's 2026-10-06 note: (1) reword `0397`'s
*not confirmed* text (EN + RU, owner-approved) to name each new loss, and (2) switch on a message for unverified
non-citizens if Q2 = verified only.

---

## 8. Point 6 — the token is a credential: never logged, stored or relayed

### 8.1 Path by path

| Where | Today | What the build must do |
|---|---|---|
| Client memory | Token in a module variable, never persisted (`ProfileSession.ts:17-22`, `:81-87`) | Unchanged. The new getter never logs. The join is serialized in `sendMsg` (`Transport.ts:725-746`), which does not log |
| Client send buffer | A message sent while the socket is CLOSED is buffered and flushed **before** `onconnect` re-sends the join (`Transport.ts:330-339`, `:735-741`) | The late `update_identity` is sent only when the socket is OPEN (as `:418` already does), so it is never buffered ahead of a join |
| Game server, pre-join message | 🚨 **`Worker.ts:457-460` logs any non-join message in full: `JSON.stringify(clientMsg, replacer)`** | **Must change to log the message `type` only.** It is reachable: Worker's listener stays attached while it awaits `verifyClientToken`/`getUserMe` (`Worker.ts:474`, `:494`) until `GameServer.addClient` removes it (`GameServer.ts:343`). An `update_identity` that arrives in that gap is logged **with its token**, and today with its Yandex id. Logs go to Uptrace via the winston OTEL transport |
| Game server, parse failure | `GameServer.ts:350-360` logs the zod summary and **echoes the raw message** back to the sender | Stop echoing the raw message. It only returns to its own sender, so this is hardening, not a leak onward |
| Game server, catch-alls | `GameServer.ts:461-467` and `Worker.ts:556-563` log `${error}`. On malformed JSON, V8's `SyntaxError` text includes a fragment of the input | Log the error name only. Honest clients always send valid JSON, so this is hardening |
| Game server memory | — | `Client.profileSession`, held only until the first vouch, then nulled (§ 3.2) |
| Outbound to players | `gameInfo()` (`GameServer.ts:1084-1098`), the start roster (`:557-574`) and the archive record (`:1179-1197`) all list fields **one by one**. Turns carry intents only | No change needed. A test pins that the token is absent from each |
| Game → profile | `ProfileApiClient.postWithRetry` logs path, status and attempt, never the body (`ProfileApiClient.ts:247-288`) | Unchanged. The token travels in the HTTPS body, never in a URL |
| Profile server | The resolve route logs only `formatError` on a DB failure (`Routes.ts:866-871`). The request-timing metric uses the route pattern, never the path (`Routes.ts:561-593`). There is no HTTP auto-instrumentation | The vouch helper logs nothing. Its metric label is a fixed enum (§ 10). The token is never passed to the repository |
| Persisted anywhere | — | Nowhere: no DB column, no analytics event, no archive field |

### 8.2 Residuals

- **The game box now briefly holds bearer tokens** (§ 4.2). Accepted under option A. The upgrade path is C.
- **The pre-join race can drop a late token** (the same gap as above, after the log fix). The player stays
  unverified for that match, which is fail-soft. The client re-sends on every reconnect. Today's `update_identity`
  has the same race; that is not in this task's scope, but it is flagged.

---

## 9. Point 7 — compatibility, deploy order, rollback, shadow phase

### 9.1 Compatibility matrix

| Pairing | What happens | Player impact |
|---|---|---|
| Old client (no token) → new game server | Joins as today. Unverified | Loses only the perks the owner denies. Old tabs age out within ~1 match |
| New client → old game server (after a game rollback, tab already open) | `profileSession` is dropped by the plain `z.object` schemas. `update_identity` still does null → value as today | None: back to ADR-103 trust |
| New game server → old profile server | The resolve's `sessionToken` is dropped (plain `z.object`, `CreditContract.ts:68-71`). The reply has no `verified` | Read as **unverified** (§ 9.3). Under any "deny", that perk is off for everyone |
| Old game server → new profile server | No token is sent. The reply carries `verified: false`, and the old parser drops it (plain `z.object`, `CreditContract.ts:91-95`) | None |

### 9.2 Deploy order and rollback

- **Order:** profile server first (it accepts the token and replies `verified`), then the game image (client and
  server ship together). The reverse order is also safe in shadow mode. Under enforcement it would briefly read
  everyone as unverified, so profile-first is the rule.
- **Game rollback:** always safe. The old image ignores tokens.
- **Profile rollback below the vouch build:** every player reads as unverified. **If any perk is set to "verified
  only", roll back game enforcement first**, or accept that the perk is off for everyone until then. The existing
  rule still applies: never roll the profile server back below S2 (ADR-116 Decision 6; `SessionToken.ts:14-15`).
- **Deploy gates already in the brief:** `0395` confirmed `vfy: true` live (met 2026-10-07). The post-`0391`
  numbers no longer gate this (ADR-123). Weekend slot, commit only when the owner asks.

### 9.3 Missing `verified` (old profile server): unverified or allow?

This matters only if some perk is "verified only". **Recommendation: unverified (fail closed).** Otherwise a
profile rollback would silently reopen every forged-id hole the owner closed. The cost is the rollback rule above.
This is in the draft ADR, and the owner signs it off with the ADR (Q7).

### 9.4 A shadow phase: worth it? Yes, if any perk is "verified only"

Slice A computes `verified` and **measures it without changing anything a player sees**:

- **Profile server:** `geoconflict.profile.resolve.vouch`, label `outcome` ∈ `verified | absent | invalid | expired
  | unverified_session | other_player | other_platform | no_secret` (8 series).
- **Game server:** at `start()`, count the roster's players by state, `geoconflict.server.match.identity`, label
  `state` ∈ `verified | unverified | unresolved | guest` (4 series). This answers what matters for Q3 and Q5: *what
  share of real match players would lose the ★ or name*. That share includes late tokens, which the login numbers
  cannot show.

**Why it is worth it:** the login `ok` share does not include late tokens, logins with no signature, or old tabs.
`0325`'s S2 showed that measuring first catches surprises; `0373` found the stale tail that way. **What it costs:**
one more weekend slot before enforcement, plus about 12 metric series. If the owner keeps all four perks for
unverified players, slice A is still worth building: `0323` needs `verified`, and the numbers inform a later
re-raise.

---

## 10. Point 8 — one unit or several

| Slice | Contents | Ships to | Depends on | Player-visible? |
|---|---|---|---|---|
| **A — Vouch + measure** | Profile: optional `sessionToken` on resolve, the vouch helper, optional `verified` in the reply, the vouch metric. Game: client sends the token (join + late `update_identity`), `Client` fields, funnel `{yandexId, verified}`, in-flight-resolve chaining, reconnect carry, start-time metric, **the § 8.1 log fixes**, `IdentityPolicy.ts` with all four set to `allow` | profile, then game | `0340` (met) | **No** |
| **B — Enforce** | Flip the owner's denied uses in `IdentityPolicy.ts`; the one-line reads in § 6; `selectMatchCredits` `requireVerified` (core + tests) if Q2 = deny; ★ carry fix if Q3 = deny; `0397` text (EN + RU) and the non-citizen message if Q2 = deny | game only | A deployed + shadow numbers read (if Q1 = shadow first) | Yes |
| **Verify-live** (owner rule: split build and verify) | Deploy A, read both metrics after a window the owner picks, confirm no token in logs | — | A built | — |

**Recommendation:** the producer files **A** and **B** as their own briefs, plus a verify task for A at the top of
the next sprint. **`0323` depends on A, not on B.** It needs `verified` to set its mark honestly. If Q5 = verified
only, B and `0323` should ship in the same slot, so the mark and the name always agree. If all four rulings are
"keep", B is not filed. Effort is not estimated here; the coder's plan sizes it. A is the larger slice, and it
touches both servers and the client.

---

## 11. Point 9 — the ADR and what it changes

Drafted as [ADR-124](../decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md),
status **proposed — owner sign-off pending**. **No accepted ADR was edited.** The changes below are applied only
after sign-off, as dated, attributed notes, or by supersession where the change reverses a decision
(`decisions/README.md` § *Immutability starts at `accepted`*).

| ADR | What ADR-124 does to it | Why it takes that form |
|---|---|---|
| **ADR-103** | **Superseded in part, whatever the rulings:** design rule 2 (*"returns `string \| null` … downstream does not change at all"*) gives way to `{yandexId, verified}` + the policy table. **If Q2 = verified only,** its decision for earned XP is superseded too. Rules 1, 3, 4 and 5 stand, and are extended to the two new fields. Its *"exit is now `0332`"* note is met by the mechanism | Changing rule 2 changes a design decision, not wording, so it needs supersession (README) |
| **ADR-115** | **If Q5 = verified only:** residual 1 closes. That is its own pre-committed re-raise trigger firing, so a dated note in place is allowed. The note must also correct the forecast *"the later fix … needs no change to this code"*: it needs one policy read in `matchDisplayName`. **If Q5 = keep:** residual 1 stays open by owner ruling, recorded in a dated note | A trigger firing, plus a clarification of a forecast. No decision is reversed |
| **ADR-113** | A dated note on point 6: the WS join now also carries the player's session token, which the game server relays to the profile server on resolve and holds in memory only. *"The game server does not hold the session secret"* still holds | A clarification |
| **ADR-116** | A dated note on residual 7 (*"closes only with `0332`"*): the mechanism shipped. What closes is per the Q2–Q5 rulings | A trigger firing |

**`0267`** still lists "the game-server path" as open. Narrowing it to item 4 (other platforms) is producer/owner
housekeeping once ADR-124 is accepted.

---

## 12. Alternatives considered (summary)

- **The game server checks the token itself (B)** — rejected. The secret would live on two boxes, against ADR-113
  point 6, and a broken-into game box could mint verified sessions. It saves no request.
- **An audience-bound join ticket (C)** — not now. It is safer if the game box is broken into, but it adds an
  endpoint, a token type and a client step. Recorded as the upgrade path.
- **A new `profile_session` message type** — rejected. An old game server closes the socket, and the client ends
  the match (§ 3.3).
- **The profile server applies the policy** (sends `isCitizen:false` / `displayName:null` to unverified players) —
  rejected. It would leave `0322`'s code untouched, but it splits game policy across two boxes, and a profile
  rollback would silently fail open.
- **Verify again on every credit or lobby check** — rejected. The token may have expired by then, and a vouch once
  per `Client` object is enough (false → true only).

## 13. Impact and risks

- **Blast radius:** `Worker.ts` (the join, the log fix), `GameServer.ts` (funnel, resolve chaining, carry, the
  start metric, slice-B reads), `Client.ts`, `ProfileApiClient.ts`, `Schemas.ts`, `CreditContract.ts`,
  `Routes.ts` (resolve), a new `SessionVouch.ts` on the profile server, a new `IdentityPolicy.ts`,
  `ProfileSession.ts` + `Transport.ts` on the client; `MatchQualification.ts` only if Q2 = deny.
- **Security:** the forged-id hole closes for each denied use. A new, bounded exposure: bearer tokens in game-box
  memory (§ 4.2).
- **Performance:** none measurable. One HMAC per resolve on the profile side, and the token adds ~200 bytes to the
  join.
- **Debt it pays off:** a hidden log of message bodies (`Worker.ts:459`), which today also logs Yandex ids.

## 14. Testing strategy (for the coder's plan)

Each item is a test, not a claim (brief, verification 4–11):

1. **Profile vouch (unit, pure):** each outcome of § 5: valid `vfy:true` for the same player ⇒ verified; another
   player's token, tampered, expired, `vfy:false`, wrong platform, absent, unusable secret ⇒ not verified. A
   malformed `sessionToken` ⇒ the resolve still answers 200 with `playerId`/`isCitizen`.
2. **Contract parity:** an old reply (no `verified`) parses on the new game server as unverified. A new reply
   parses on the old schema. The request with and without the token parses on both.
3. **Game server (`tests/server/`, the `ApprovedNameInMatch.test.ts` style):** join with a token ⇒ verified. Late
   token via `update_identity` ⇒ verified. A late token for a different id ⇒ the id is unchanged and the result is
   unverified. A tokenless resolve in flight plus a token arriving ⇒ a second resolve carries the token. Reconnect
   with the same id carries `identityVerified`; with a different id it does not. Verified never goes back to false.
4. **Join never fails on a token:** an over-long or non-string `profileSession` in `join`/`update_identity` ⇒
   joined, unverified, socket open.
5. **Policy, one test per use** (slice B), each for a verified and an unverified player.
6. **No leak:** drive join, a pre-join `update_identity`, a parse failure and a resolve with a sentinel token
   through a capturing logger. Assert no log line contains it. Assert it is absent from `gameInfo()`, the start
   roster and the archive record JSON.
7. **Client:** the join carries the token when it is held; a late token is sent once, over an open socket; none for
   local games; never buffered.
8. `npm test` green. If a known `supertest` flake shows, re-run and say so (CLAUDE.md). Fixtures are synthetic: no
   real ids, tokens or hosts.

---

## 15. Open questions for the owner

Put to the owner by `fkit-lead`. Each has at most 3 options. The recommended option is listed first.

**Q1 — Measure first, or switch on at once?**
*Plain terms:* the game server can first just *count* how many real match players would be unverified, change
nothing for a week, then apply your rulings. Or it can apply them straight away.
- **(a) Measure first (Recommended).** Build the check + counters now. Apply the Q2–Q5 rulings after one weekend
  slot of numbers. Costs one extra slot. Avoids surprising honest players.
- (b) Apply at once. Faster by one slot. Any "verified only" ruling hits the unknown share of honest players from
  day one.

**Q2 — XP: should an unverified player still earn match XP?**
*Plain terms:* today anyone who sends another player's Yandex id can give that player XP (1 XP per match; 100 XP
makes a citizen). Refusing XP to unverified players stops that, but honest players whose check failed (roughly
3–7 %, everyone during Yandex trouble) would silently earn nothing for those matches, with no make-up. It would not
stop someone farming XP for their own account.
- **(a) Keep XP for unverified (Recommended).** Small harm, needs a victim's id. Re-raise if abuse is seen.
- (b) Verified only. Closes the gifting hole. Honest unverified players lose XP silently, and `0397` must start
  showing non-citizens a message.

**Q3 — ★ badge: should an unverified citizen still show the ★ in matches?**
*Plain terms:* a forged id can show a citizen's ★ today (cosmetic, accepted in `0068`). Refusing it means an honest
citizen, a paying one included, whose check failed shows no ★ in matches for the whole visit, while their card still
says citizen.
- **(a) Keep the ★ for unverified (Recommended).** Forging needs the victim's id, which no screen shows. Refusing
  risks complaints from paying citizens.
- (b) Verified only. No forged ★, at the cost above.

**Q4 — Private lobby: may an unverified citizen start a private match?**
*Plain terms:* a forged citizen id can host today (accepted 2026-09-26). Refusing means an honest citizen whose
check failed cannot start a private match this visit, and sees only "couldn't start".
- **(a) Keep it open for unverified citizens (Recommended).** A convenience perk, nothing scarce.
- (b) Verified only. No forged hosts. Honest citizens are blocked during Yandex trouble with an unclear message.

**Q5 — Approved name: show a citizen's approved name in matches only when verified?**
*Plain terms:* a forged id can show a citizen's approved name today (ADR-115 residual 1). Refusing costs honest
citizens almost nothing, because their name box is already pre-filled and locked to that same name, so they appear
the same either way. `0323`'s "confirmed name" mark is honest only with this. Anyone can still *type* the name; that
stays an accepted risk.
- **(a) Verified only (Recommended).** Closes the impersonation case at almost no cost. `0323` can then ship
  honestly.
- (b) Keep for unverified. Residual 1 stays open by your ruling, and `0323`'s mark would need its own check.

**Q6 — How the game server asks (the main technical choice in ADR-124).**
*Plain terms:* the game server needs the profile server to confirm "this session is really this player". The
simplest way adds the player's session token to a request the game server already makes. The cost: the game server
briefly holds that 24-hour pass in memory, so a break-in there could misuse it. The safer way invents a separate
short-lived "match ticket" that is useless anywhere else, but adds a new endpoint and one more step that can fail
for the player.
- **(a) Add the token to the existing request (Recommended).** No extra requests. The secret stays on one box.
  Re-raise if the session ever unlocks money or admin power.
- (b) Build the short-lived match ticket now. Safer if the game box is broken into. More to build, and one more way
  for a player's check to fail.

**Q7 — If the profile server cannot answer "verified" (old version or rolled back), treat players as unverified?**
*Only matters if any Q2–Q5 answer is "verified only".*
- **(a) Treat as unverified (Recommended).** A rollback can never quietly reopen a hole you closed. The rule: roll
  back the game's enforcement before rolling the profile server back below this build.
- (b) Treat as verified/allowed. No perk loss during such a rollback, but the holes silently reopen.

**Q8 — Sign off ADR-124?**
- **(a) Accept, with the Q1–Q7 answers folded in (Recommended).** It becomes `accepted`. The ADR-103/113/115/116
  notes in § 11 are then applied.
- (b) Changes first. Name them; the architect revises the draft.

---

## 16. What was written

- This report: `ai-agents/knowledge-base/reports/2026-10-07-0332-join-token-design.md`.
- Draft ADR: `ai-agents/knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md`
  (**proposed — owner sign-off pending**).
- No source files, no stubs in the tree, no wiki writes, no commits. The brief's `## Status` and `## Owner` were not
  touched.
- **Wiki:** once the owner has ruled, `fkit-wiki` should ingest this report and ADR-124 (`/fkit-wiki-ingest`).

---

## 17. Addendum, 2026-10-07 — the owner's rulings

**Added 2026-10-07 by `fkit-architect`, spawned by `fkit-lead` (`/fkit-sprint-ship-loop`, Sprint 7).** Sections 0–16
are kept as written; where they recommend otherwise, **the rulings below win.** All given 2026-10-07, live via
`AskUserQuestion` in the `fkit lead` session, relayed verbatim by `fkit-lead` (option labels unless marked free text).

| # | Owner's answer (verbatim) | Followed § 15's recommendation? |
|---|---|---|
| Q1 | FREE TEXT: *"No, we're not spending another weekend slot for counting only, but we can add some metrics to the code and check them after."* | Neither option as worded |
| Q2 | **"Keep XP (Recommended)"** | yes |
| Q3 | **"Keep the ★ (Recommended)"** | yes |
| Q4 | **"Keep it open (Recommended)"** | yes |
| Q5 | **"Keep for unconfirmed"** | **no** — recommended *verified only* |
| Q6 | **"Reuse login pass (Recommended)"** | yes |
| Q7 | **"Treat as unconfirmed (Recommended)"** | yes |
| Q8 | **"Accept with answers (Recommended)"** | yes |

**What changes in this report's reading:**
- **§ 0 point 8, § 10 — one slice.** All four perks stay open to unverified players, so **slice B is not needed**
  (the case § 0 point 8 and § 10 already named). The build is **slice A only**: the token on the join /
  `update_identity`, the vouch on the existing resolve call (§ 4 option A, Q6), the funnel's `{ yandexId, verified }`,
  late-token chaining and reconnect carry (§ 3), the two counters (§ 9.4), and the § 8.1 log fix
  (`Worker.ts:457-460`) and hardening (`GameServer.ts:350-360`, `:461-467`, `Worker.ts:556-563`).
- **§ 6, § 10 — no `IdentityPolicy.ts` in slice A** (architect's call, recorded in ADR-124 Decision 5). With every row
  `allow` nothing would read it. § 6's table and per-use reads become the template for a future flip, not a build item.
  § 10's slice-A row listed *"`IdentityPolicy.ts` with all four set to `allow`"* — superseded by this point.
- **§ 9.4 — no shadow phase as a separate step (Q1).** The counters ship inside slice A's normal deploy and are read
  afterwards. They gate nothing now.
- **§ 7.2 Q5 — the approved name stays for unverified players.** ADR-115 residual 1 **stays open by owner ruling**,
  also after this ships. `0323`'s mark therefore cannot lean on the name: it must check `verified` itself through the
  funnel and freeze it at `start()` with the roster (ADR-124 Decision 5 note). That is `0323`'s design.
- **§ 7.2 closing note — `0397`'s text is not reworded by `0332`.** No perk is lost. A future flip of any row carries
  that duty (ADR-124 § *Re-raise only if*).
- **§ 9.3 (Q7) — confirmed, dormant.** A missing `verified` reads as unverified. With all rows `allow` it only affects
  the counter; it is the rule for any future enforcement, with the rollback rule in § 9.2.
- **§ 13 Security — no forged-id hole closes with this build.** XP gifting, forged ★, forged hosts and forged approved
  names all stay open by owner ruling. The new exposure (§ 4.2, bearer tokens in game-box memory) is still accepted
  (Q6). Its return is now the counters, `0323`'s mark, the log fix and readiness for a later flip, not a closed hole.
- **§ 11 — applied.** ADR-124 is `accepted`. The notes on ADR-103, ADR-113, ADR-115 and ADR-116 were applied
  2026-10-07, **adjusted to these rulings**: ADR-103's earned-XP decision is **not** superseded (Q2 = keep; only design
  rule 2 is); ADR-115 residual 1 stays open (Q5); ADR-116 residual 7 stays open; ADR-113 point 6 is clarified. Each
  note says `0332` is accepted, not built.

**Wiki:** `fkit-wiki` should ingest this report and ADR-124, plus the dated notes on ADR-103/113/115/116
(`/fkit-wiki-ingest`).
