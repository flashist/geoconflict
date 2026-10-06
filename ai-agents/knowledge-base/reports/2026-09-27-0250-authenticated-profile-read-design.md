# 0250 — Authenticated profile read for paid entitlement: design evaluation (phase 1)

- **Task:** [`0250`](../../tasks/done/0250-authenticated-profile-read-for-paid-entitlement/brief.md)
- **Date:** 2026-09-27
- **Author:** `fkit-architect`, spawned as a **consult** by `fkit-lead` in `/fkit-sprint-ship-loop`
  (Sprint 6). **No owner channel** — every owner decision is returned as an open question (§10), none is
  taken here.
- **Procedure:** `/fkit-evaluate-approach`. Analysis only: no source edits, no wiki writes, no commit, no
  task-status change.
- **Tree read:** `dev` @ `390c4b4` **plus the uncommitted working tree** (0302/0307/0312–0315 work in
  `Routes.ts`, `NameChangeRepository.ts`, `CitizenshipCard.ts`, …). Line numbers below are the working
  tree's, not the commit's.
- **Status of this document:** a proposal. Nothing in it is ruled.

---

## 0. The answer in five lines

1. **Recommended mechanism: "verified login".** The client sends Yandex's signed player data
   (`getPlayer({ signed: true }).signature`) to the existing `POST /v1/login`. The server checks it with the
   per-game key and, only when it checks out, mints a `vfy:true` session. Paid information goes only to
   `vfy:true` callers. Every other route stays as it is. (Candidate 1, placed at login rather than on every
   read.)
2. **Recommended payload: a narrow entitlement.** A verified caller gets `entitlements: { ad_free: boolean }`
   (candidate 2), **not** the raw `is_paid_citizen` / `citizenship_purchased_at`.
3. **The MUST-FIX leak is bigger than the brief says, and it is fixable now, with no Yandex dependency.**
   Paid state leaks through **four** channels today, not one (§2.3). One server-side rule set, the
   **"equalized projection"** (§5), removes all four for unverified callers and keeps the citizen badge.
   It should ship first, on its own.
4. **Candidate 3 (read the purchase from the Yandex SDK on the client) is dead.** Our citizenship purchase is
   **consumed** after the grant, so `getPurchases()` no longer returns it (§3.4).
5. **Overlap:** verified login is exactly what `0267` would recommend and what `0319` needs. It does **not**
   by itself close ADR-103 or `0322`'s forged-id case (the game server never sees the session). Recommend
   **0250 depends on a separate "verified login" build task, pulled into Sprint 6 directly above it; 0250
   does not absorb it** (§6). This is an owner call.

**Main tradeoff accepted:** until verified login is live, and for any session that falls back to
unverified, a paid citizen with under 100 XP sees **100 / 100** on their own card, and the
`Citizenship:Earned:XP` analytics event under-counts. That is the price of hiding "who paid" from people
who can impersonate the owner.

---

## 1. The problem and the decision

**Problem.** The client cannot learn that *its own* player paid, because every client-visible response
strips paid state. The strip is deliberate: login is unverified, so anything a caller can see about
"themselves" can also be seen by anyone who asserts their Yandex id. Meanwhile paid state **still leaks**
through fields the strip missed (the owner's MUST-FIX, 2026-09-24).

**Decision to make.**
- (a) What proves a caller is the profile's owner.
- (b) What paid signal that proven owner receives.
- (c) How every unverified response stops telling payers apart from other citizens without breaking
  the citizen badge.

**Hard requirement (brief, "The redaction is CORRECT"):** paid state may reach a caller proven to be the
profile's owner, **and no one else**. That includes derived fields.

---

## 2. Current state, checked in the tree

### 2.1 The session and the login route

- **Token format:** `v1.<b64url(JSON)>.<b64url(HMAC-SHA256)>`, claims `{pid, plt, iat, exp, vfy:false}`,
  TTL 24 h (`src/profile-server/SessionToken.ts:1-4,31-37,85-91`). `vfy` is a **zod literal `false`**
  (`SessionToken.ts:55`). A token with `vfy:true` is **`invalid`** to today's server. That matters for
  rollback (§8, deploy order).
- **Header comment, verbatim intent:** *"A `vfy:false` token must NEVER count as a proven owner — not for
  paid state (0250)"* (`SessionToken.ts:6-9`). The same warning is on `CallerResolution`
  (`src/profile-server/Routes.ts:291-293`).
- **`resolveCaller`** (`Routes.ts:498-521`) is the single place every player-facing route learns who is
  asking: Bearer header → `verifySessionToken` → `{status:"ok", playerId}`. **No DB read and no
  signature.** Its doc says *"Any future signature check (0267) drops in HERE and nowhere else"*
  (`Routes.ts:461-466`).
- **`POST /v1/login`** (`Routes.ts:681-758`): parses `{platform, platformUserId}`
  (`src/core/profile/LoginContract.ts:26-29`), **find-or-creates** the player for the asserted id
  (`Routes.ts:711-720`), and returns `{created, profile: toPublicProfile(…), grantChecks, session}`
  (`Routes.ts:733-746`). It has **no rate limiter**, by owner acceptance (`Routes.ts:667-669`).
  ⇒ **Anyone who knows a player's Yandex id can get a working session as that player.**
- **Client:** one login per page load, token kept in memory only, **401 → re-login once, retry once**
  (`src/client/ProfileSession.ts:1-23`, `:247`, `:291-294`). The login body is
  `{platform, platformUserId: yandexId}` (`ProfileSession.ts:213`). The boot call is plain
  `getPlayer()` (`src/client/flashist/FlashistFacade.ts:850`). **Nothing requests signed player data
  today.**

### 2.2 `toPublicProfile`

`Routes.ts:330-356`. It removes `is_paid_citizen` and `citizenship_purchased_at` and passes everything
else through: `schema_version, xp, is_citizen, citizenship_earned_at, display_name, created_at,
updated_at` (+ optional `name_change`). It is used by **`GET /v1/profile`** (`Routes.ts:653-657`) and
**`POST /v1/login`** (`Routes.ts:735`). The shared schema is `PublicPlayerProfileSchema`
(`src/core/profile/PlayerProfile.ts:63-79`).

### 2.3 🚨 The paid-state leak inventory — FOUR channels, not one

"Unverified caller" = anyone holding a `vfy:false` token, which today is **everyone, including anyone who
has asserted someone else's Yandex id**. Paid state is **live**: real purchases went through on
2026-09-26, and a DB snapshot that day showed paid citizens with `citizenship_earned_at` NULL
(`ai-agents/tasks/done/0065-citizenship-paid-live-verification/worklog.md:72-92`).

| # | Route | What tells a payer apart | Strength | In the brief? |
|---|---|---|---|---|
| L1 | `GET /v1/profile`, `POST /v1/login` | `is_citizen && citizenship_earned_at === null` ⇒ paid, not (yet) earned | Certain, from **one** read | ✅ Named (the MUST-FIX) |
| L2 | the same two routes | `is_citizen && xp < 100` ⇒ paid. Earned citizenship needs `xp >= 100` (`src/profile-server/PlayerProfileRepository.ts:105-113`; `src/core/profile/Citizenship.ts:20,53-55`), and XP never goes down. **Only the paid grant makes a citizen below 100** (`src/profile-server/PaymentsRepository.ts:46-52`). The card shows the raw number to citizens too (`src/client/CitizenshipCard.ts:405-408`). | Certain, from one read | ❌ **New** |
| L3 | `POST /v1/profile/tenure-grant` | Returns the **true** `xp` (`Routes.ts:1506-1510`; `src/core/profile/TenureGrantContract.ts:66-70`). After the one-time claim it answers `duplicate` with the true xp, again and again. This defeats any fix to L2 that only touches the profile read. | Certain (combined with `is_citizen` from L1's route) | ❌ **New** |
| L4 | `GET /v1/messages` (inbox) | The paid grant sends the inbox template **`citizenship_paid`** (`PaymentsRepository.ts:189-209`). Its text says *"Your citizenship purchase was successful"* (`resources/lang/en.json`, `inbox.templates.citizenship_paid`). The route returns `templateKey` to any citizen's session (`Routes.ts:1074-1090`). | **Direct and permanent.** Unlike L1/L2, it does **not** disappear when the payer later earns 100 XP. The strongest leak of the four. | ❌ **New** |
| L5 | L1–L3, observed over time | Polling a target: `is_citizen` flips false→true while `xp` jumps from well under 100 (an earned flip moves by at most one match, +1, or the one-time tenure grant, max +50). `updated_at` changes at the purchase moment. | Needs a known id **and** repeated polling around the purchase | ❌ New, **residual** (§5.4) |

Checked and **clean** (no paid signal): the name-change routes (their 403 is citizen-only, and paid and
earned citizens pass alike), `POST /v1/payments/yandex/intent` (returns an intent id to anyone), the match
roster's `isCitizen` (`0068`; citizen-level only), and `/internal/*` (never client-facing).

⚠️ **Scope flag.** The brief lists the inbox **auth seam** as out of scope. It does not list the inbox
**projection**. Verification step 2 (*"cannot learn paid state, by any route and by any derived field"*)
covers L3 and L4, so they are inside 0250 by the brief's own test. This is raised as owner decision **D5**
rather than absorbed silently.

**How exploitable in practice.** The attacker needs the victim's Yandex id. The game server never
broadcasts it (`yandexPlayerId` lives only in `src/server/Client.ts` and `GameServer.ts`, and appears in no
`src/core` message sent to other clients). Guessing ids is impractical. So the realistic attacker already
has the id from somewhere else. That makes exploitation **uncommon, not impossible**. The owner ruled
MUST-FIX regardless, and this report treats it that way.

### 2.4 `YandexSignature.ts`

- `verifySignedPayload(signed, secret)` (`src/profile-server/YandexSignature.ts:101-153`) splits
  `<b64 sig>.<b64 payload>`. It accepts an HMAC-SHA256 over **either** the base64 payload **or** the decoded
  JSON (`:130-140`), then **normalizes purchases** (`:69-94`). It fails closed on an empty secret
  (`:105-107`) and never throws.
- **What reuses cleanly for player identity:** the envelope split, the dual-construction HMAC check, and
  the fail-closed posture. **What does not:** `normalizePurchases`. A player payload has no
  `purchaseToken`/`productId`, so today's function returns `null` for it. A **separate normalizer** over a
  shared HMAC core is needed.
- **Construction still unconfirmed.** Real purchases verify, but *which* of the two constructions matched
  is unknown (`0065` worklog `:88`; tasks `0309`/`0310`). Yandex's own Node example HMACs the **decoded
  JSON** (see §2.6).

### 2.5 Is `YANDEX_PAYMENTS_SECRET` configured on the profile box? — **Yes**

No value was printed, read or stored in producing any of this evidence.

| Evidence | Date | Source |
|---|---|---|
| Key issued by Yandex | 2026-09-12 | owner ruling, `0014` `## Verification` item 3 (`ai-agents/tasks/done/0014-yandex-catalog-registration/brief.md:304`) |
| Present in the running `profile-api` container, length 32; the "payments disabled" warning appears 0 times | 2026-09-19 | read-only inspection, `0014` brief `:326-331` |
| **Correct value:** a real player purchase and an owner test purchase both got `POST /v1/payments/yandex/complete` → **200**, and the grant landed | 2026-09-26 | `0065` worklog `:77-88` ("⇒ The secret value on the box is correct") |
| **Re-checked by this consult:** a `POST` to a deliberately non-existent `/v1/payments/` sub-path on the live profile API returned **404, not 503**, so the `paymentsEnabled` gate (`Routes.ts:863-869`) passes. `/health` returned 200. | **2026-09-27** | read-only probe run for this report |

⇒ Brief open question 3 is **answered: the key is collected, on the box, and verifies real purchases.**

### 2.6 Is Yandex's signed **player** data verified with the same key? — **Very likely, NOT established**

- The Yandex player docs (`yandex.ru/dev/games/doc/ru/sdk/sdk-player`, fetched 2026-09-27) say
  `getPlayer({ signed: true })` exists *"to authorize a user … on your server"*. The `signature` field is
  *"two base64 strings: `<signature>.<profile data>`"*. The key *"becomes available after connecting
  in-app purchases"*, with a pointer to the purchases page's anti-fraud section.
- The purchases docs (`…/sdk/sdk-purchases`) describe **one** secret key per game, on the console's
  *In-app purchases → Settings* tab, and give the Node check `HMAC-SHA256(key, decodedJson)` compared to the
  base64 signature.
- ⇒ The docs strongly **imply** one key for both. **But no signed player payload has ever been verified by
  this code base.** The docs also **do not document the payload's fields**: whether the id field is
  `uniqueID`, whether it carries `issuedAt` (the purchase envelope does), and whether that id equals
  `getUniqueID()`, which is what `player_identities` stores. **Establishing these is spike S0 (§8).
  Nothing may be enforced before it.**

### 2.7 Brief anchors that have drifted (for the implementer)

- The brief's "`resolvePlayerId()` at `Routes.ts:128-137`" no longer exists. Its successor is
  `resolveCaller` at `Routes.ts:498-521`.
- `toPublicProfile` is now at `Routes.ts:346`; the login projection is at `:735`; `GET /v1/profile` is at
  `:640`.
- `PlayerProfile.ts:53-62` still says *"Sprint 4's read is unauthenticated"*. That is stale (Bearer since
  `0273`). The brief already asks for this fix.

---

## 3. The candidates

Each candidate is scored on six dimensions: privacy posture, what it closes, external dependencies,
fail-open/closed behaviour, schema compatibility across separate deploys, and cost.

### 3.1 Candidate 1a — **Verified login** (Yandex signed player data, checked once, at `POST /v1/login`) ⭐

**How it works.**

```
client boot: getPlayer({signed:true}) ──► player.signature   (in memory only, never logged or stored)
POST /v1/login { platform, platformUserId, signature? }
   server: verifyPlayerSignature(signature, YANDEX_PAYMENTS_SECRET)
     ├─ ok  AND signedId === platformUserId AND fresh ─► resolve(signedId) ─► token{vfy:true}
     └─ absent | bad | mismatch | stale | no secret     ─► resolve(asserted) ─► token{vfy:false}  (today's path)
every Bearer route: resolveCaller → {playerId, verified: claims.vfy}
   GET /v1/profile / login body / tenure-grant / inbox:
     verified ─► owner projection (+ entitlements)
     else     ─► equalized projection (§5)
```

- **Privacy:** paid information goes only to a caller whose Yandex id **Yandex signed**. No route takes a
  player id as input (ADR-113), so a verified caller can only read itself. That satisfies verification step
  2's "different player id" case by construction.
- **Closes:**
  - 0250's positive case (step 1).
  - `0319`'s root cause, once `0319` gates its routes on `verified`.
  - The ADR-112 tenure-claim-on-behalf risk, if the owner chooses to gate it.
  - It does **not** close ADR-103 (see §6).
- **External dependency:**
  - The per-game key: **present and correct** (§2.5).
  - The signed-player payload shape: **undocumented**, so spike S0 is needed.
  - No Yandex console action appears needed. *Unverified*: whether signed player data needs any console
    switch.
- **Fail behaviour (explicit, step 6):** every verification failure falls back to a `vfy:false` login, and
  **login never refuses because of the signature**. The profile read never errors because of verification.
  The paid benefit is withheld, so ads are shown (`0248`'s fail-open-to-ads rule). This is *fail-closed for
  the entitlement, fail-open for the read*.
- **Schema compatibility:**
  - `signature` is `.optional()` on `LoginRequestSchema`. An old server strips it (zod's default), and a
    new server treats a missing one as `vfy:false`.
  - `entitlements` is `.optional()` on `PublicPlayerProfileSchema` (the review-R3 rule). An old client
    strips it, and a new client treats a missing one as "not entitled".
  - Token claims widen `vfy: z.literal(false)` → `z.boolean()`. **This must ship before any server mints
    `vfy:true`** (§8 deploy order). Otherwise a rollback turns every live verified token into `invalid`.
    That is survivable — the client re-logs-in once (`ProfileSession.ts:18`) — but noisy.
- **Cost:** server ~2 days, client ~0.5 day, plus spike S0 (owner-run in the live iframe, ~0.5 day). One HMAC
  per login, which is negligible.
- **Reversible:** yes. Stop minting `vfy:true`, and everything falls back to today's behaviour.

### 3.2 Candidate 1b — Signature on **every** paid read (no session change)

The client sends the signed player data as a header on `GET /v1/profile`, and the server verifies it
per request.

- **Privacy and dependencies:** same as 1a.
- **Worse on everything else:**
  - The signature becomes a long-lived secret sent on every request (larger replay surface).
  - Each route needing proof re-implements the check. That is the "trust rule in N places" ADR-103
    rejected.
  - `0319` and every future perk would each need it again.
  - It duplicates the seam `resolveCaller`'s doc already reserves.
- **Cost:** similar to 1a, and it grows with every route.
- **Rejected:** 1a does the same job once.

### 3.3 Candidate 2 — **Narrow entitlement** (`ad_free` for self) — a *payload* choice, layered on 1a ⭐

Not an alternative mechanism: the brief says so, and it is right. The decision is between what a verified
caller receives:

| Option | Returns to a verified caller | For | Against |
|---|---|---|---|
| **2-narrow (recommended)** | `entitlements: { ad_free: boolean }` (computed server-side; today `ad_free = is_paid_citizen`) | Smallest disclosure. Describes the **benefit**, not the purchase record, so promos, refunds or a separate ad-free product later need no client change. Extends to `0249` or other perks as more keys. A weakened auth later leaks "no ads", not "bought, on date X". | `0299` wants a `PaidCitizen` tier. It can use `ad_free` as a stand-in only while `ad_free ≡ paid` (flagged, D1). |
| 2-raw | `is_paid_citizen`, `citizenship_purchased_at` | Simplest (un-strip two fields). `0299` gets its tier directly. | Returns a purchase timestamp nobody needs, and ties every perk to "paid" forever. |

Verified callers also get the **true** `xp` and `citizenship_earned_at` and the original inbox template
keys (§5). That is what the card and the `Citizenship:Earned:XP` detection need.

### 3.4 Candidate 3 — Client-side Yandex SDK purchase state — ❌ **DEAD, recorded as such**

- `getPurchases()` lists purchases **not yet consumed**. Our flow **consumes the citizenship purchase
  right after the server grant**: `src/client/CitizenshipPurchase.ts:85`, and
  `src/client/PaymentsReconciliation.ts:74-83` (*"consumed here so they stop reappearing in
  getPurchases()"*). The go-live evidence confirms a purchase *"consumed"* after the grant (`0065` worklog
  `:84-85`).
- `getPayingStatus()` reports whether the user pays **across Yandex in general**
  (`paying | partially_paying | not_paying | unknown`). It is not our product.
- The Yandex docs describe **no** "does this player own product X" query for non-consumable items.
- Reviving it would mean **stopping consumption**. That breaks the reconcile design, where "unconsumed" =
  "not yet granted", and Yandex's moderation-compliance recovery path. It would still say nothing about
  a purchase made on another device before this build.
- ⇒ Infeasible without re-architecting payments. Not a real option.

### 3.5 Candidate 4 (found) — **No paid read at all: re-scope `0248` to `is_citizen`**

`is_citizen` already reaches the client (`src/client/PlayerProfileView.ts:102`), so ad-free for all
citizens needs **no auth work at all**. This is brief open question 2, the one lever that removes 0250's
phase 2 as a prerequisite.

- **The MUST-FIX (§5) is still required either way.**
- It is a **product** decision, not a technical one. The producer recommends against it (ad-free is the
  main reason to pay). Presented as D2, not as the recommendation.

### 3.6 Considered and rejected quickly

- **A client-computed hash of the id** (`0267` item 2): the code ships to the client, so anyone can compute
  it. It adds nothing against someone who already knows the id.
- **Putting `ad_free` inside the token's claims:** it would be stale for up to 24 h after a mid-session
  purchase, and the token is readable base64. Compute it at read time instead.
- **Refusing unverified sessions outright:** this turns a Yandex-side format change or a key problem into
  a zero-XP card for every player. It violates step 6.

---

## 4. Comparison

| | Privacy posture | Closes | External dependency | Fail behaviour | Cross-deploy schema | Cost |
|---|---|---|---|---|---|---|
| **1a Verified login** ⭐ | Paid info only to a Yandex-signed owner; a single choke point | 0250 steps 1–2; root of 0319; the enabler for ADR-103's exit | Key ✅ present. Payload shape ❓ (spike S0) | Entitlement fail-closed; read fail-open | Additive-optional; claims widening must ship first | ~2.5–3 d incl. client, + S0 |
| 1b Per-read signature | Same | Same, route by route | Same | Same | Header-only; fine | Same now, growing per route |
| **2-narrow payload** ⭐ | Least disclosure | — (payload) | none | Missing ⇒ not entitled | `.optional()` object | trivial on top of 1a |
| 2-raw payload | Discloses purchase date | — | none | same | same | trivial |
| 3 Client SDK state | n/a | **nothing** (purchases consumed) | Yandex API that doesn't exist | — | — | ❌ infeasible |
| 4 Re-scope 0248 | No paid read anywhere | removes the need | none | n/a | n/a | 0 (product cost: weaker paid tier) |
| **Equalized projection (§5)** — needed under every candidate | Unverified callers see no paid signal (L1–L4) | the MUST-FIX | none | n/a | value-only for the profile; **new inbox key needs client-first deploy** | ~1–1.5 d |

---

## 5. The MUST-FIX: the equalized projection (closes L1–L4 without breaking the badge)

### 5.1 The rule

For any caller that is **not** verified, every client-visible response is built so that a paid citizen and
an earned citizen look the same. It lives in **one** server function beside `toPublicProfile` (say
`projectProfile(profile, nameChange, { verified })`), and every route in the table uses it.

| Field / channel | Unverified caller gets | Verified caller gets | Why this value |
|---|---|---|---|
| `is_citizen` | **unchanged** | unchanged | Drives the citizen badge (`CitizenshipCard.ts:356`). Step 4 holds. |
| `citizenship_earned_at` | **`null`, always** | true value | `null` for everyone ⇒ L1 carries no signal. Not "earned_at ?? purchased_at": that would make old clients fire `Citizenship:Earned:XP` **at purchase** (a misattributed event), which is worse than under-counting. |
| `xp` (profile **and** login **and** tenure-grant response) | `is_citizen ? max(xp, 100) : xp` | true value | Closes L2 **and L3**. Earned citizens already have `xp >= 100`, so their value is unchanged; only paid-not-earned citizens are raised to the threshold. Non-citizens are untouched, so the XP bar works for everyone still working toward citizenship. |
| `is_paid_citizen`, `citizenship_purchased_at` | omitted (as today) | omitted; `entitlements.ad_free` instead (D1) | — |
| `entitlements` | **absent** | present | Its presence depends only on the caller's own token, never on the target's state, so it gives nothing away (step 3). |
| Inbox `templateKey` `citizenship_paid` / `citizenship_earned` | both mapped **at read time** to one neutral key, `citizenship_granted` ("Welcome, Citizen! You now have access to citizen benefits.") | original keys | Closes L4. Stored rows are not rewritten, so the mapping is reversible. |
| `created_at`, `display_name`, `name_change`, `schema_version` | unchanged | unchanged | No paid signal. |

### 5.2 Why the badge does not break (step 4)

`is_citizen` is untouched, so the badge, the full bar for citizens (`CitizenshipCard.ts:361`) and the
"hide the buy CTA from citizens" rule all behave as today. The response **shape** does not change: the
same keys and the same types. So old and new clients parse old and new servers in both directions (step 5).

### 5.3 What it costs, stated plainly (goes to the owner as D4)

1. **A paid citizen under 100 XP sees "100 / 100" on their own card** whenever their session is unverified.
   Today that is every session; after verified login, only fallback sessions. The same clamp shows in the
   tenure popup (*"Теперь у вас 100 / 100 XP"*) for such a player. It is a displayed untruth to the owner of
   the profile, not to anyone else.
2. **`Citizenship:Earned:XP` stops firing on unverified sessions.** The client keys it on
   `citizenship_earned_at` (`PlayerProfileView.ts:94-97,111-146`). The new client should run that detection
   **only on verified responses**, with a **fresh storage-key prefix**. Otherwise an unverified read storing
   `""` followed by a verified read showing a date would fire a false "earned" event. Old clients simply
   under-count, which is the same class as the already-accepted "fresh device" residual
   (`PlayerProfileView.ts:119-123`).
3. **Payers lose the "your purchase was successful" wording** in the inbox on unverified sessions. They see
   the neutral welcome instead.

**Deploy order for the inbox key:** a client that does not know `citizenship_granted` **drops that one
message** (`src/client/Inbox.ts:191-198`). So ship the **client** (new key plus en/ru text) **first**, then the
**profile server**. The profile fields are value-only and can ship in either order.

### 5.4 Residual that stays open — L5, the polling attack

Someone who knows the id and **polls** the target across the moment of purchase sees `is_citizen` flip while
the (non-citizen, so unclamped) `xp` jumps to the clamp value, which an earned flip can only do by at most
+50. A `updated_at` change at that moment is a weaker version of the same signal.

- **Closing it fully means refusing unverified reads,** which step 6 forbids.
- **Optional hardening, to decide at plan time:** return `updated_at = created_at` to unverified callers,
  after checking no consumer reads it. A grep of `src/client` finds none.
- **Recommendation:** accept L5 and record it in the ADR. It needs a known id **and** timed polling.
  Verified login shrinks the population that ever sees an unverified projection.

---

## 6. Overlap — `0267`, `0319`, ADR-103, `0322`

| Item | What it needs | Does verified login (1a) close it? |
|---|---|---|
| **`0267`** — investigate verifying platform identity (architect, report only) | A recommendation on how to verify identity | **This report answers its Yandex half** (items 1, 3 and 5 for Yandex). Still open: item 2 (hash, rejected in §3.6), item 4 (other platforms), and the game-server path. |
| **`0319`** — forged-login name-change hole | "A token that proves the player — e.g. `vfy:true`" (its brief) | **Yes, the prerequisite.** `0319` then gates its routes on `verified`. Same mechanism, different routes. |
| **ADR-103** — the game server trusts the client-sent Yandex id for crediting | The **game server** must know the id is real | **No, not by itself.** The game server learns the id from the WebSocket join (`src/server/Worker.ts:520-521`, `GameServer.ts:428`) and never sees the profile session. Closing ADR-103 needs a **second step on the same root**: the client sends its session token in the join, and `getCreditableYandexId()` / the resolve call asks the profile server to vouch for it. That is a separate, later change. |
| **`0322`** — server swaps in the approved name (ADR-103 trust, D3-accepted) | Same as ADR-103 | **No, not by itself.** `0322`'s forged-id case closes with ADR-103's exit, as its brief says. Verified login is the first half of that. |

**One mechanism, several closes:** yes for **0250 + 0319** directly. For **ADR-103 + 0322** it is the
foundation, not the closure.

**Recommendation on 0250 ↔ 0267: *depend*, via a separate build task, and do not absorb it.**

- **Verified login is a shared prerequisite** of 0250 and 0319, and the first half of ADR-103's exit.
  Building it inside a task named "paid entitlement" hides it. `0319` would then depend on the wrong task,
  and the next person looking for "where did identity get verified" would not find it.
- **Concretely:**
  1. The producer files **one build task, "verified login (`vfy:true` sessions)"** (slices S0, S2 and S3a in
     §8).
  2. The owner decides whether it goes into Sprint 6 **directly above 0250**.
  3. `0267` is either closed against this report's Yandex findings or narrowed to items 2 and 4 plus the
     game-server path. That is owner/producer housekeeping.
  4. 0250 keeps **S1 (the MUST-FIX)**, which ships immediately with no dependency, and **S3b (entitlement +
     verified-only projection)** on top of the build task.
- **The alternative (absorb)** is faster by one hand-off. Its cost is a wider 0250 and a misfiled
  prerequisite. Presented as D3.
- ⚠️ **This is an unanticipated architecture decision** (the first verified identity in the system).
  Recommend recording it as an **ADR with the owner's sign-off** once D1–D5 are ruled. It updates ADR-103's
  "re-raise only if" (the key is now issued) and ADR-113's session notes.

---

## 7. Recommendation

**Build verified login (1a) with a narrow `ad_free` entitlement (2-narrow). Ship the equalized projection
(§5) first, now, independently.** Record candidate 3 as dead and candidate 4 as the owner's lever.

- **Why:**
  - It is the only design that meets "paid state reaches the proven owner and no one else".
  - It reuses the existing single seam (`resolveCaller`) and the existing, proven key.
  - Its failure mode is "ads shown, card unchanged".
  - The same work unblocks `0319` and starts ADR-103's exit.
- **Main tradeoff:** a dependency on an undocumented Yandex payload shape (de-risked by S0 before anything
  is enforced), plus the §5.3 display and analytics compromises on unverified sessions.
- **Spike before committing (S0):** confirm in the live iframe that a signed player payload verifies with
  the box's key, which construction matches, and what the id and timestamp fields are called. Confirm the
  id equals `getUniqueID()`.

---

## 8. Phase 2 implementation outline (for the coder's plan)

Slices, in ship order. Each slice deploys safely on its own.

### S0 — Spike: signed player payload (owner-run, no production behaviour change)

- A dev-only path, or shadow telemetry (see S2), records **only the key names and types** of the decoded
  payload, **which HMAC construction matched**, and **whether the signed id equals `getUniqueID()`**. Never
  values, never the signature.
- **Exit criteria:** the payload's id field name, whether `issuedAt` exists, and id equality are known.
  If the key does **not** verify player data, stop and return to the owner. Candidate 1 is then blocked.

### S1 — MUST-FIX: equalized projection (0250) — **no external dependency, ship first**

- **Server:**
  - Add `projectProfile(profile, nameChange, { verified })` next to `toPublicProfile` (`Routes.ts:346`).
    `verified` is always `false` in this slice.
  - Use it in `GET /v1/profile` (`:653-657`) and login (`:735`).
  - Clamp `xp` in the tenure-grant response (`:1506-1510`) by the same rule. That needs `is_citizen`: have
    `recordTenureCheck`'s outcome return it (`LOCK_PLAYER_FOR_TENURE_SQL` already selects it,
    `PlayerProfileRepository.ts:121-126`).
  - Inbox: map `citizenship_paid` / `citizenship_earned` → `citizenship_granted` at read time for
    unverified callers (`GET /v1/messages`, `Routes.ts:1074-1090`, or `InboxRepository.listMessages`).
  - Put the rule in **one** helper that is unit-tested in isolation.
- **Core:**
  - Add `citizenship_granted` to `INBOX_TEMPLATE_KEYS` (`src/core/profile/InboxContract.ts:26-32`) with its
    required params `[]`.
  - Fix the stale comment at `PlayerProfile.ts:53-62`.
  - Put the clamp rule, if shared, in `src/core/profile/Citizenship.ts`, which triggers CLAUDE.md's
    mandatory-test rule.
- **Client:**
  - Add the `inbox.templates.citizenship_granted.{title,body}` text to `en.json` **and** `ru.json`.
  - Make the `Citizenship:Earned:XP` detection verified-only, with a new storage-key prefix
    (`PlayerProfileView.ts:46,94-97`). Until S3 it never fires on the new client either; that is accepted
    in D4.
  - Update `analytics-event-reference.md` to say so.
- **Deploy:** **client first, then the profile server.**
- **Tests (steps 2–5, 7):**
  - For each of `GET /v1/profile`, login, tenure-grant and `GET /v1/messages`, a paid-not-earned citizen
    and an earned citizen produce responses **identical apart from fields unrelated to paid state**. Assert
    by attempting the leak: compute `is_citizen && earned_at === null`, `is_citizen && xp < 100` and
    `templateKey === "citizenship_paid"` and assert all are false for the paid fixture.
  - The badge still renders for both.
  - Old client schema parses new server output, and the reverse.
  - The inbox: an unknown key is still dropped, and the new key renders.

### S2 — Verified-login shadow mode (the build task; 0250 depends on it)

- **Core contract:**
  - `LoginRequestSchema` gains `signature: z.string().min(1).max(<bound from S0>).optional()`.
  - `SessionClaims.vfy` widens to `boolean`, and `SessionClaimsSchema` to `z.boolean()`.
  - **Mint** still only `false` in this slice. That makes the rollback-safe claims widening live before
    anyone relies on it.
- **Server:**
  - Split `YandexSignature.ts` into a shared `verifyHmacEnvelope(signed, secret) → decodedJson | null`
    (today's `:101-140`) plus the existing purchase normalizer.
  - Add `verifySignedPlayer(signed, secret, nowMs) → { platformUserId, issuedAt? } | null`.
  - Login verifies when a signature is present and records a bounded metric,
    `login_verification{absent|ok|bad_signature|id_mismatch|stale|no_secret}` (in `Telemetry.ts`, same
    cardinality discipline as `sessionRejected`), **and changes nothing else**.
  - **Never log or persist the signature** (unlike purchases' `rawPayload`, it is a credential).
    `Cache-Control: no-store` is already on the login response (`Routes.ts:749`).
- **Client:**
  - Obtain `getPlayer({ signed: true })` once. Either switch the boot call at `FlashistFacade.ts:850` and in
    `initPlayer`, or make a separate call bounded by the existing platform-init deadline.
  - Hold the signature in memory like the token (`ProfileSession.ts:9-14`) and send it in the login body.
  - A signed-call failure must not block login: send without it.
- **Exit:** the metric shows `ok` for the large majority of real authorized logins over an owner-chosen
  window.

### S3 — Enforce + entitlement

- **S3a (build task):** mint `vfy:true` iff verification is `ok` **and** the signed id equals the asserted
  `platformUserId`. Resolve the player by the **signed** id. If `issuedAt` exists, apply a freshness window
  (value to plan). `resolveCaller` returns `{ playerId, verified }`.
- **S3b (0250):**
  - `projectProfile(…, { verified: true })` returns the true `xp` and `citizenship_earned_at`, the original
    inbox keys, and `entitlements: { ad_free }` as an `.optional()` object on `PublicPlayerProfileSchema`.
  - The client's `PlayerProfileView` surfaces `adFree` for `0248`, and the Earned:XP detection works again
    on verified reads.
- **Tests:**
  - **Step 1:** a verified caller gets `ad_free: true` when paid, `false` otherwise.
  - **Step 2:** a `vfy:false` token for a paid player gets no `entitlements` and the equalized fields; a
    valid signature for player A with `platformUserId` of B → `vfy:false`, and B's paid state is not
    returned.
  - **Step 3:** response shape and status are the same for paid and unpaid targets under an unverified
    token.
  - **Step 6:** a bad signature, no secret, a Yandex failure → login 200, `vfy:false`, card intact, no
    entitlement. Both branches tested.
  - **Step 8:** no secret, id or signature in any fixture committed to git. Use synthetic keys, as the
    purchase tests do.

**Deploy order across all slices:** client S1 → server S1 → server S2 → client S2 → server S3a/b → client
S3b. **Rollback of any server slice is safe**, because the claims widening shipped in S2 before any
`vfy:true` was minted.

---

## 9. Residual risks after the recommended design

1. **L5 polling inference** (§5.4). Accepted, pending D4; record it in the ADR.
2. **A verified session is a bearer credential for 24 h.** A stolen token (e.g. from the victim's page) acts
   as the victim. Unchanged from today in kind; there is no revocation (`SessionToken.ts:15-19`).
3. **A Yandex payload change** silently turns everyone `vfy:false`. The design shows ads and leaves the card
   intact, and the S2 metric makes it visible. Consider an alert on the `ok` ratio (a later task).
4. **Signed player data may carry the player's public name and avatar** (152-ФЗ context, `0048`). It
   transits the server and is **not stored**. Keep it that way.
5. **ADR-103 / `0322`'s forged-id case stays open** until the join-token step (§6) is built.

---

## 10. Open questions → owner decisions (see the NEEDS-DECISION block in the hand-off)

- **D1:** Raw paid flag or narrow entitlement (brief OQ1).
- **D2:** Keep `0248` paid-only (brief OQ2).
- **D3:** The approach choice, and the 0267 overlap: absorb, depend, or separate.
- **D4:** Accept the §5.3 compromises and the L5 residual for the MUST-FIX.
- **D5:** Include the newly found leaks L3 (tenure-grant) and L4 (inbox) in 0250.

**Unknowns that no ruling settles (spike S0):** whether the per-game key verifies signed **player** data;
the payload's field names and `issuedAt`; whether the signed id equals `getUniqueID()`; which HMAC
construction matches (`0309`).

---

## 11. What was written

- This file only. No source, wiki, task-status or sprint-board change. No commit.
- **Wiki:** `fkit-wiki` should ingest this report (and the ADR, once written) after the owner rules.
