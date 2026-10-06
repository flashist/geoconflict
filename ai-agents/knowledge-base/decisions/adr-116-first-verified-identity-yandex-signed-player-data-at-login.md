# ADR-116: The first verified identity — Yandex signed player data, checked once at login, carried as `vfy:true`

- **Status:** accepted (owner sign-off 2026-09-29, relayed by fkit-lead). Promoted `proposed` → `accepted`
  in place, per `decisions/README.md` § *Immutability starts at `accepted`*.
  - **The ruling, verbatim** (live via `AskUserQuestion` in the `fkit lead` session, 2026-09-29, relayed by
    `fkit-lead`): asked *"Accept ADR-116 (the verified-login design, with today's decisions)?"*, the owner
    chose **"Accept as written (Recommended)"** — option text: *"Status becomes accepted. The architect then
    adds the dated notes to ADR-103 now, and to ADR-113 once S3a ships. 0325 can close once built."*
  - *History, kept visible:* until 2026-09-29 this line read *"proposed — **owner sign-off pending.** Task
    `0325` does not close without that sign-off, or an owner ruling that it may (`0325` brief, § *The
    ADR*)."* The sign-off above satisfies that condition; `0325` still closes only once built.
- **Date:** 2026-09-29 (drafted and accepted the same day)
- **Deciders:** Owner (Mark Dolbyrev) — signed off 2026-09-29 (above). Drafted by `fkit-architect` (spawned by
  `fkit-lead`) from the approved `0325` plan's § *The ADR*. The architect heard no ruling first-hand; every
  ruling below, and the acceptance itself, arrived by relay.
  - **Owner rulings this ADR rests on (all live via `AskUserQuestion` in the `fkit lead` session, relayed by
    `fkit-lead`):**
    - **`0250` D3, 2026-09-27** — verified login is its own build task: *"New task, above 0250 (Recommended)"*
      (`0250` brief, § *Owner rulings (2026-09-27)*).
    - **`0250` D4, 2026-09-27** — *"Accept all (Recommended)"*; the polling hole L5 is a known, accepted risk that
      *"must also be recorded in `0325`'s ADR"* (same section).
    - **`0250` Q3 and Q-A, 2026-09-27** — S1's residuals accepted; every citizen shows exactly 100 to an
      unverified caller until verified reads ship (`0325` brief, § *Added 2026-09-27*).
    - **`0325` Q1–Q3 and plan approval, 2026-09-28** — *"You run the 45-min test"*, *"Test first, then build"*,
      *"Stop and come back to me"* if no timestamp, and *"Approve (Recommended)"*. The approval carried the
      15 min / 5 min freshness window, the 7th metric value `bad_payload`, the deploy dependency on `0250` S1,
      and this ADR's outline, including *"ADR-103 is **amended, not superseded**"* (`0325` `plan.md`, § *Owner
      rulings* and § *Carried for approval with the plan*).
    - **Build `0325`, 2026-09-29** — relayed by `fkit-lead` in the spawn that asked for this ADR, after S0
      passed.
    - **`0325` S0-informed plan amendment and D1–D3, 2026-09-29** — *"Approve and build (Recommended)"* for the
      amendment (`0325` `plan.md`, § *S0-informed amendment (2026-09-29)*), plus separate rulings on D1–D3.
      Recorded in § *Points settled at build* below.
- **Citation frame:** working tree on `dev` at `572d134`, 2026-09-29. Nothing from S2/S3a is built yet;
  source citations below describe **today's** code, and the Decision describes what S2/S3a will build.
- **📝 Note, 2026-09-29 — S2 shipped in `0325`; S3a moved to task `0340`.** Added by `fkit-architect`
  (spawned by `fkit-lead`) under `decisions/README.md` § *Immutability starts at `accepted`* — the
  clarification carve-out: an owner's follow-up ruling that clarifies wording already in this ADR. **No
  decision changes.** The design, the gates, the deploy order and the rollback rule stand as written; only the
  task that carries S3a changed. Every earlier wording below is kept as written.
  - **The ruling, verbatim** (live via `AskUserQuestion` in the `fkit lead` session, 2026-09-29, relayed by
    `fkit-lead`; the architect heard it by relay only): asked how to track what is left of `0325`, the owner
    chose **"Split it (Recommended)"** — option text: *"Close 0325 as the S2 build (agent-closed). File a
    'verify S2 live' task (deploy check + watch the ok-rate) at the top of Sprint 7, and a separate 'S3a
    enforce' build task after it. ADR-116 gets a note that S3a moved to that task."*
  - **Where things stand.** S2 (shadow) shipped in `0325`: built and reviewed, closed 2026-09-29
    `(agent-closed — not owner-verified)`. **Not yet deployed** — and not committed at close (`0339` brief,
    § *Context*). So from that date the citation frame's *"Nothing from S2/S3a is built yet"* holds for S3a
    only.
  - **S3a — the first `vfy:true` mint — is now task `0340`**
    (`ai-agents/tasks/done/0340-0325-s3a-enforce-mint-verified-sessions/`). It starts only when **both**
    hold: `0339`'s S2 exit is met
    (`ai-agents/tasks/done/0339-verify-0325-s2-live-the-login-signature-check-in-production/` — the
    deploys named and dated, the owner's watch window and threshold, `ok` the large majority), **and** an
    explicit owner approval to enforce, given after `0339`'s numbers are in. `0339` closing does not by
    itself approve `0340`. This is the gate Decision 6 already states (*"observe for an owner-picked window →
    owner approves → profile server S3a"*); only its task home is new.

    > 📝 **Clarification, 2026-10-05** (added by `fkit-architect`, spawned by `fkit-lead`, under
    > `decisions/README.md` § *Immutability starts at `accepted`* — the clarification carve-out: an owner's
    > follow-up ruling that clarifies wording already here. The bullet above is left byte-identical.) **"The
    > owner's watch window and threshold" has no fixed value.** Owner ruling 2026-10-05, relayed by
    > `fkit-lead`: *"Remove the 7 days requirement, we will check whatever data we have at the time it's
    > needed and we will make a decision about waiting or not waiting longer based on that"*; for the 10/11 Oct
    > slot, *"Judge by eye"*. So `0339`'s S2 exit is the owner's look at whatever post-`0391` data exists —
    > see [ADR-122](adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md), which
    > supersedes ADR-121 Decision 4's *"≤ 5% over 7 days"*. The second condition — an explicit owner approval
    > to enforce — is unchanged, and so is Decision 6.
  - **How to read the older wording.** Wherever this ADR says "`0325` S3a", "once `0325` S3a ships" or
    "S3a ships", read **task `0340`**. The places: the Status line's quoted option text *"…and to ADR-113
    once S3a ships"* (a verbatim quote, left untouched); Decision 3's *"tunable **before** S3a enforces
    anything"*; Decision 6's S3a bullet and deploy order; *Known risk*'s *"before S3a enforces anything"*;
    § *Amendments to older ADRs* — its heading, the ADR-113 table row (*"Only once `0325` S3a ships"*), and
    the ADR-113 subsection's *"Apply only once `0325` S3a ships"* and *"via `0325` rather than `0267`"*
    (read: via `0325`'s S3a slice, now carried by `0340`); and § *Related*'s ADR-113 line.
  - **The ADR-113 trigger is unchanged:** the profile server minting `vfy:true` **in production** — i.e.
    `0340` deployed, not merely built or closed. The reminder now also lives in `0340`'s brief (§ *The
    ADR-113 note — shipping this task triggers it*), which makes the note a close condition for `0340`:
    applied by `fkit-architect` after the S3a deploy, or deferred by an owner ruling.
- **⛔ Superseded in part by [ADR-121](adr-121-login-signature-freshness-window-24h-id-checked-first.md),
  2026-10-05** (owner ruling *"24 hours (Recommended)"*, relayed by `fkit-lead`; pointer added by
  `fkit-architect`, append-only — every line above and below is left byte-identical). **Superseded:** Decision
  3's 900 s freshness window (now **86,400 s**; the 300 s future limit is unchanged), residual 8 (now ADR-121
  R1, *"a stolen signature works up to ~48 h"*), and by consequence the 900 s in *Points settled at build*'s
  A4 and B4 bullets. ADR-121 also adds an id-before-age check order. **Everything else in this ADR stands;
  Status stays `accepted`.** ⛔ marks the two superseded sites below.

## Context

**Today nobody proves who they are to the profile server.** `POST /v1/login` takes a Yandex id the client
*says* is its own, find-or-creates that player and hands back a session
(`src/profile-server/Routes.ts`, the login route). Every session is `vfy:false` — a zod literal
(`src/profile-server/SessionToken.ts:54` — `vfy: z.literal(false),`), so a `vfy:true` token is *invalid* to
today's server. The header says *"A `vfy:false` token must NEVER count as a proven owner"*
(`SessionToken.ts:8`). ⇒ Anyone who knows a player's Yandex id gets a working session as that player
(report §2.1). ADR-113 point 5 said this plainly: *"while identity is client-asserted the token adds NO
security"*.

**Yandex offers the fix, and the key is on the box.** `getPlayer({ signed: true })` returns player data signed
with the game's per-game secret. That secret is `YANDEX_PAYMENTS_SECRET` — issued 2026-09-12, present on the
profile box, and proven correct by real purchases on 2026-09-26 (report §2.5). The purchase check already
exists (`src/profile-server/YandexSignature.ts:105` — `export function verifySignedPayload(`), and
`resolveCaller`'s doc reserves the seam: *"(0267) drops in HERE and nowhere else"* (`Routes.ts:442`).
But the docs do not document the player payload's fields, and no signed player payload had ever been
verified by this code (report §2.6). So spike S0 came first.

**S0 result — owner-run live in the Yandex iframe, 2026-09-29** (`0325` `worklog.md`, § *2026-09-29 — S0
result*). Field names, construction, units and yes/no only; no values:

| Question | Answer |
|---|---|
| Does the box's key verify signed player data? | **Yes** |
| Which HMAC construction matched? | **Decoded JSON only.** The base64-payload construction did **not** match. |
| Envelope shape | One dot (`<signature>.<payload>`); payload is standard base64 (no URL-safe characters); it decodes to JSON |
| Top-level payload fields | `algorithm` (string), `issuedAt` (number), `requestPayload` (string), `data` (object) |
| `data` fields | `id`, `uniqueID`, `lang`, `publicName`, `avatarIdHash`, `scopePermissions` (object), `payingStatus`, `hasPremium` (boolean) |
| Which field equals `getUniqueID()` (the id `player_identities` stores)? | **Both `data.id` and `data.uniqueID`** |
| Does the signed object's own `getUniqueID()` equal the plain one? | **Yes** |
| `issuedAt` present? Unit? | **Yes, top level, in seconds** |
| Signature length | 733 characters (sets the request bound) |
| Signed-call latency | **6852 ms — one sample**, with a `net::ERR_SOCKET_NOT_CONNECTED` logged on the SDK's signed request (a retry is likely — inferred, not proven). See *Known risk* below. |

**Caveat, stated honestly:** one account, one sample, one day. The key check's first real attempt was
invalid (a paste error, not a failed check); the second, clipboard-length-checked attempt is the valid one.

**Why this is a real decision.** It is the first time the system proves who a player is. It changes what a
session means (ADR-113), and it is half of ADR-103's long-planned exit. It was flagged as an unanticipated
architecture decision in the `0250` design report §6.

## Decision

1. **Mechanism.** The client asks Yandex for signed player data, holds the signature **in memory only**, and
   sends it as an optional `signature` field in the `POST /v1/login` body. The server checks the HMAC with
   `YANDEX_PAYMENTS_SECRET`, reads the signed id (`data.uniqueID`) and `issuedAt`, and discards everything
   else (settled 2026-09-29, see *Points settled at build*).
2. **One seam, one check, once per login.** Verification happens **only** at `POST /v1/login`. Its result is
   carried in the session as `vfy`, and `resolveCaller` returns `{ playerId, verified }` so any route can ask
   "is this the proven owner?". No route re-checks a signature (option 1b, rejected). No route reads
   `verified` in this ADR's scope — that is `0250` S3b and `0319`.
3. **`vfy:true` if and only if all three hold:**
   - the HMAC verifies (outcome `ok`);
   - the signed id **equals** the id the client asserted in the same body;
   - the signature is **fresh**: `issuedAt` is present (required — a payload without it never verifies)
     and no more than **900 s (15 min)** old and no more than **300 s
     (5 min)** in the future (owner-approved with the plan; measured through S2's `stale` count and tunable
     **before** S3a enforces anything).

   > ⛔ **2026-10-05 — superseded by ADR-121.** The window is now **86,400 s (24 h)** old; 300 s future is
   > unchanged; the signed id is compared **before** the age. Do not follow the 900 s above. Text above left
   > byte-identical.

   When verified, the player is resolved by the **signed** id (equal to the asserted id by construction).
4. **Fail behaviour — failure ⇒ an unverified session, never a refused login, never a read error.** Absent,
   malformed, forged, tampered, mismatched or stale signature; no secret configured; a Yandex outage or
   payload change; the client's signed call failing or timing out; the classifier throwing — every one of
   these yields today's `vfy:false` login, status 200, same response shape. The paid benefit is withheld
   (fail-closed for entitlement), the card still loads (fail-open for the read).

   > 📝 **Clarification, 2026-09-29 — what "malformed" means here** (review finding **R1(b)**, `0325`
   > `review.md`, round 1; added by `fkit-architect`, spawned by `fkit-lead`, under `decisions/README.md` §
   > *Immutability starts at `accepted`* — the clarification carve-out. No decision changes; the wording
   > above is kept as written.) "Malformed" above means a signature that **passes the login contract but
   > fails verification** — not a real envelope, bad HMAC, bad payload, stale, or id mismatch. All of those
   > still get 200 and a `vfy:false` session. A body whose `signature` field **breaks the contract** — an
   > empty string, longer than `SIGNATURE_MAX` (2932), or not a string — fails `LoginRequestSchema`
   > (`src/core/profile/LoginContract.ts:45`) and gets **400 `bad_request`**, like any other bad login body;
   > it is counted in the login metric as `bad_request`, not in the verification metric. This is what
   > owner-approved amendment A1 intends (§ *Points settled at build*, the `SIGNATURE_MAX` bullet): our
   > client drops an over-long or empty value and sends no field, and old bundles send no field, so no
   > honest client reaches the 400. *Not a defect:* a review finding that *"a malformed signature gets a
   > 400, contradicting Decision 4"* is closeout of this note.
5. **The signature is a credential.** Never logged, never persisted, never put in analytics, on either
   side — unlike a purchase's stored payload. The public name, avatar and every other `data` field transit
   the server and are **dropped unread** (152-ФЗ context, `0048`).
6. **Rollout: shadow first, and the wider claim ships before the first mint.**
   - **S2 (shadow):** `vfy` widens from `z.literal(false)` to a boolean; the server still mints only `false`.
     It classifies every login signature and records one bounded metric,
     `geoconflict.profile.login.verification`, label `outcome` ∈
     `absent | no_secret | bad_signature | bad_payload | stale | id_mismatch | ok` (7 series). Nothing else
     uses the result.
   - **S3a (enforce):** mint `vfy:true` under point 3. No response changes.
   - **Deploy order:** `0250` S1 fully deployed → profile server S2 → game client S2 → observe for an
     owner-picked window → owner approves → profile server S3a.
   - **Rollback rule:** S3a → S2 is safe (a live `vfy:true` token still parses). ⛔ **Never roll S3a straight
     back to a pre-S2 build** — every live verified token turns invalid and every client re-logs in once.

   > 📝 **2026-09-29:** S2 shipped in `0325` (not yet deployed); **S3a is now task `0340`**, gated on `0339`'s
   > S2 exit plus an explicit owner approval. The rollout above is unchanged. See the dated note under
   > *Citation frame* at the top of this file.

   > 📝 **Clarification, 2026-09-29 — the deploy order for the next weekend slot** (added by
   > `fkit-architect`, spawned by `fkit-lead`, under `decisions/README.md` § *Immutability starts at
   > `accepted`* — the clarification carve-out. The *Deploy order* bullet above is kept as written.)
   > **For this slot the order is telemetry → game (`0250` S1 client + `0325` S2 client) → profile (`0250`
   > S1 server + `0325` S2 server).** Why: S1 and S2 are both committed on `dev` now (`68303d5`, `df3c6b3`),
   > so one game build carries both client halves and one profile build carries both server halves. The
   > bullet's "profile server S2 → game client S2" cannot happen without extra deploys, and `0250` S1's rule
   > is client first. The S2 client going out before the S2 server is safe:
   > - the deployed server's `LoginRequestSchema` is a plain `z.object`, so it drops the unknown
   >   `signature` field (`5b3e6ec:src/core/profile/LoginContract.ts:25`, the 0.0.154 commit);
   > - the old login route never logs the body (`5b3e6ec:src/profile-server/Routes.ts:687` parses it; the
   >   route's only log line is the `formatError` catch).
   >
   > The cost: until the profile deploy, logins are not counted by the metric, and `0314`'s name "Hide"
   > button gets a 404. **This decision's invariant is kept:** the claim is widened before the first mint,
   > because S3a (`0340`) is not built. The rollback rule is unchanged.
   > **Why this is a clarification, not a reversal:** `0325` `plan.md` § *Deploy order and rollback*,
   > step 2, already recorded *"Either order would be safe for the body"*. Server first was preferred only
   > so the metric would be live on day one. If a later reader finds the S2 server-before-client order
   > load-bearing, that needs a superseding ADR, not another note.
   > **Owner ruling, 2026-09-29**, given live in the `fkit lead` session via `AskUserQuestion` and relayed
   > by `fkit-lead`. Verbatim answer: **"Game first, record it (Recommended)"**. Option text: *"Keeps
   > 0250's client-first rule. Cost: a few minutes where the new login check isn't counted yet, and the
   > rarely used name 'Hide' button shows an error until profile is deployed. Nothing breaks or is lost.
   > ADR-116 and 0339 get a dated note."*
   > Steps, checks and rollback: [`../weekend-deploy-slot-runbook.md`](../weekend-deploy-slot-runbook.md) §
   > *Next window — plan (written 2026-09-29)*. ⚠️ That section was being written in parallel when this
   > note was added, so it did not exist yet. Check the anchor once it lands.
7. **One key serves payments and identity.** `YANDEX_PAYMENTS_SECRET`, read once in
   `src/profile-server/Server.ts:118`, is passed to login as well as payments. No new env var; config parity
   is unchanged.
8. **Both HMAC constructions stay accepted**, in parity with purchases, and the shared envelope check is
   extracted from `verifySignedPayload` unchanged in behaviour. S0's "decoded JSON only" finding feeds
   `0309`/`0310`, which own dropping the unused construction.

### Points settled at build — owner rulings, 2026-09-29

**History, so it is not re-litigated:** this section was first drafted as *"Points NOT decided here"* —
four open points (the client's signed-call timeout, pinning `algorithm`, `requestPayload` as a nonce, and
which id field to read), left to the build's plan amendment. `fkit-coder` wrote that amendment (`0325`
`plan.md`, § *S0-informed amendment (2026-09-29)*), and the owner ruled on it live via `AskUserQuestion` in
the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`. The architect heard none of it first-hand.

**The amendment — approved:** *"Approve and build (Recommended)"*. That approval settles:

- **The id field: the server reads `data.uniqueID` only** (amendment A2). It must be a non-empty string,
  else `bad_payload`. `data.id` is never read; there is **no** equality check between the two, and **no**
  fallback to `data.id` if `uniqueID` is missing. *Why:* `uniqueID` is what `getUniqueID()` returns, which
  is what the client asserts and `player_identities` stores, so Decision 3's id check compares like with
  like. Both fields are inside the signed payload, so an equality check adds no security, only a way to
  fail; a silent fallback would hide the *"Yandex changed the payload"* signal `bad_payload` exists for.
- **`issuedAt` is REQUIRED** (amendment A3), per the 2026-09-28 Q3 ruling (*"Don't hand out verified
  sessions on data that can be replayed forever"*). Missing, not a number, or not finite ⇒ `bad_payload` ⇒
  unverified. This makes Decision 3's freshness test unconditional. Boundaries (A4): exactly 900 s old or
  exactly 300 s ahead is still fresh.
- **The client drops an over-long signature** (amendment A1). `SIGNATURE_MAX = 2932`
  (`max(4 × 733, 2048)`); a longer signature is treated as absent, so the server never answers 400 and the
  client never latches "no profile session for this page load" — which would have broken Decision 4. Rule
  for later: never lower `SIGNATURE_MAX` on the server ahead of the client.
- **A held pre-fetched signature older than 300 s is refetched** (amendment B4), so a login that starts
  late (e.g. after a failed `/api/env` fetch) does not send a signature that arrives `stale`. 300 s is well
  inside the 900 s window.
- **`requestPayload` is not used; residual 8 stays accepted** (amendment D). Yandex documents no payload
  or nonce option for `getPlayer` (docs fetched 2026-09-29); the verifier never reads the field. Re-raise
  only if Yandex documents one.

**D1 — the client's wait for the signed call: no normal time limit, plus a 60 s hang safety net.** This
replaces both the plan's formula (*"≈ max(2000, 3 × S0's latency)"*) and the amendment's recommended fixed
5 s wait. The owner's words: *"we should not have any limit, and the only case of the "fallback/fail"
state is when the request is actually failed"*, choosing *"#1, but add the analytic event that we can then
analyse to find out how big the problem is"*. So:

- the login waits for the signed call as long as it is making progress;
- a **real failure** (the call throws, or returns no usable string) falls back to an unsigned login
  **immediately**;
- only a call that is **still silent after 60 s** counts as failed, and the login then goes ahead
  unsigned. The net exists for a hung SDK promise, not as a latency budget.

Decision 4 is unchanged by this: every one of those outcomes is an unverified login, never a refused one.

**D2 — four client analytics events, carrying nothing but their name** (no ids, no personal data, never
the signature — Decision 5): `Profile:Login:Signature:Ready` (the pre-fetch was done before login asked),
`Profile:Login:Signature:Waited` (it arrived while login waited), `Profile:Login:Signature:Timeout` (the
60 s hang net fired), `Profile:Login:Signature:Failed` (the call failed, returned no string, or was over
bound — per the amendment's definitions, B5). At most one per take; guests fire none. They go in the
`flashistConstants.analyticEvents` enum and `analytics-event-reference.md`. This reverses the original
plan's *"no new client events"* (step 12). *Why they matter:* the server's `absent` count alone mixes
failures, hangs and old bundles; these split them, and `Timeout` sizes the hang problem D1 accepts.

> 📝 **Clarification, 2026-09-29 — the events carry one number: the wait in ms** (review finding **R1(a)**,
> `0325` `review.md`, round 1; added by `fkit-architect`, spawned by `fkit-lead`, under `decisions/README.md`
> § *Immutability starts at `accepted`* — the clarification carve-out. No decision changes; the wording
> above is kept as written.) *"Nothing but their name"* above is too strict. `Waited` and `Timeout` also
> carry the **elapsed wait in milliseconds** as the event's value (`src/client/flashist/FlashistFacade.ts`,
> `awaitSignedPlayer`); `Ready` and `Failed` carry only their name. The record of the D2 ruling allows
> this: *"the elapsed wait in ms MAY be attached to `Waited` and `Timeout`"* (`0325` `plan.md`, § *Owner
> rulings on the amendment (2026-09-29)*, D2 — an allowance in the build instruction `fkit-lead` relayed
> with that ruling). It serves the owner's D1 ask to *"add the analytic event that we can then analyse to
> find out how big the problem is"*. What the parenthesis above guards is unchanged: **no ids, no personal
> data, never the signature** (Decision 5). A duration is none of those.

**D3 — `algorithm` is ignored: never read, never pinned.** It sits inside the signed payload and cannot
choose the algorithm (our check hardcodes HMAC-SHA256, unlike a JWT `alg` header), so pinning adds no
security. A real algorithm change at Yandex already shows as a `bad_signature` spike; pinning would add
only the risk that a label-only change turns every login `bad_payload`.

## Options considered

- **Verified login — check once at `POST /v1/login`, carry as `vfy` (chosen)** — one check, one seam that
  `resolveCaller` already reserves, negligible cost (one HMAC per login), fully reversible by ceasing to mint
  `vfy:true` (report §3.1).
- **Signature on every paid read (report 1b)** — rejected. The signature becomes a long-lived secret sent on
  every request (larger replay surface), and each route re-implements the check — the "trust rule in N
  places" ADR-103 rejected.
- **Client-side Yandex SDK purchase state** — rejected as **dead**: our flow consumes the purchase right
  after the server grant, so `getPurchases()` cannot show ownership, and `getPayingStatus()` is not about
  our product (report §3.4).
- **Refusing unverified logins or reads** — rejected. A Yandex outage, key problem or payload change would
  empty every player's card (report §3.6; `0325` brief, § *Out of scope*).
- **A hash of the id** — rejected; the code ships to the client, so anyone can compute it. ADR-103 already
  says **do not re-propose it**.

## Consequences

- **Positive:**
  - the first identity a forger cannot mint: a `vfy:true` session means Yandex signed that id, recently;
  - unblocks `0250` S3b (verified-only paid state), `0319` (gate name changes) and `0323` (the mark), and is
    the foundation `0332` (the join token) builds on;
  - no response change, no new env var, reversible by ceasing to mint.
- **Negative / costs:** one more client SDK call per load, a new metric, four new client analytics events
  (D2), a wider session claim, a login that waits on a possibly slow signed call (up to the 60 s hang net —
  see *Known risk*), and a deploy order that must be followed (Decision 6).

### Accepted residuals

1. **A verified session is a 24 h bearer credential with no revocation.** A stolen token acts as the
   victim until it expires. Rotating `PROFILE_SESSION_SECRET` drops **all** sessions, verified ones too.
   Revisit a key id / dual key, as `SessionToken.ts:18` already says (*"Once 0267 issues `vfy:true`
   tokens, revisit a key id / dual key"*).
2. **A Yandex payload or key change silently makes everyone unverified.** Nothing breaks visibly (Decision
   4). The S2 metric (`ok` ratio, `bad_payload`) makes it visible; an alert on it is a later task, only if
   the owner wants one.
3. **The signed data carries personal and account fields** — the public name and avatar (as the report
   predicted) and, per S0, also `lang`, `scopePermissions`, `payingStatus`, `hasPremium`. They transit the
   server and are **never stored or logged** (152-ФЗ, `0048`). Only the id and `issuedAt` are read.
4. **L5, the polling inference** (`0250` D4, accepted): someone who knows a player's id and polls around the
   moment of purchase can still infer it. Closing it fully means refusing unverified reads, which Decision
   4 forbids. Verified login shrinks the population that ever sees an unverified projection.
5. **`0250` S1 rollback caveat** (`0250` Q3): after S1, a **profile-server** rollback can let old client
   bundles that stored `""` under the old analytics prefix fire a false `Citizenship:Earned:XP`. New clients
   use the `_v2` prefix.
6. **Accepted cost (`0250` Q-A):** an earned citizen's own card reads 100 / 100 until verified reads ship
   (this task + `0250` S3b). *History:* `0250` Q3 items 1–2 (the "exactly 100" hint, "XP did not move")
   were closed by Q-A.
7. **ADR-103 / `0322`'s forged id stays open.** The game server learns the id from the WebSocket join and
   never sees the profile session. It closes only with `0332` (the join token).
8. **Replay within the freshness window.** A captured signature logs in as its owner for up to ~15 min
   (plus 5 min of future skew). Same class as a stolen token (residual 1). *Settled 2026-09-29 (amendment
   D, approved):* `requestPayload` is **not** used as a nonce — Yandex documents no `getPlayer` payload
   option, and a server-issued challenge would be a design change. Re-raise only if Yandex documents one.

   > ⛔ **2026-10-05 — superseded by ADR-121 residual R1:** *a stolen signature works up to ~48 h* (24 h
   > window + 24 h session). The no-nonce reasoning above still holds. Text above left byte-identical.
9. **Wider blast radius of `YANDEX_PAYMENTS_SECRET`.** A leak now forges identity as well as purchases, and a
   rotation at Yandex breaks both at once (identity fails soft to unverified; payments per their own path).
10. **Both HMAC constructions are accepted** (Decision 8). S0 matched decoded JSON only; dropping the other
    is `0309`/`0310`'s call. Either construction still needs the key, so accepting both lets no keyless
    forger in.

### Known risk from S0 — the signed call can be slow

S0's only signed call took **6852 ms**, with a socket error logged on the SDK's request (retry likely,
inferred). **One sample: neither typical nor worst case.**

**With D1's ruling (no normal wait limit), login waits for the signature, so a slow signed call makes the
login — and the citizenship card — that much slower.** The cost falls on logged-in players:

- **Pre-existing UX gap, now longer.** While the login is pending, `CitizenshipCard` renders a logged-in
  player as a **guest** — a false "log in" button, no XP, no citizen status (`0325` `plan.md`, amendment
  B2, citing `CitizenshipCard.ts:417-420`; not re-verified by the architect). Today that lasts up to about
  5 s of login plus 5 s of read. A slow signed call adds its full duration on top. Fixing the guest-card
  gap is **not** in `0325`'s scope; it is noted as a **possible future task**.
- **A hang is capped at 60 s** by D1's safety net, then login proceeds unsigned (Decision 4). The worst
  case for the card is therefore roughly 60 s + the login and read times.
- **It is measured, not guessed.** `Profile:Login:Signature:Timeout` counts how often the 60 s net fires;
  `Waited` vs `Ready` shows how often a player waited at all; `Failed` counts real failures. S2's server
  `absent` count gives the server-side view. Both are available before S3a enforces anything.
- **What the choice buys:** no player is left unverified merely because Yandex was slow — only a real
  failure or a 60 s hang produces an unverified login.

### Re-raise only if

- **The `ok` ratio collapses in production** (a Yandex payload/key change, or the id field moves) — then
  re-examine the payload check; the fail-soft behaviour itself is working as designed.
- **Anyone proposes refusing a login or a read because of the signature** — that reverses Decision 4 and
  needs a superseding ADR.
- **The signature appears in a log, a DB row, an analytics event or a stored file** — a defect against this
  ADR.
- **`vfy:true` is used to authorize something beyond a player acting on their own account** (money
  movement, actions on other players, admin power) — then 24 h with no revocation (residual 1) must be
  revisited first.
- **Observed replay or token-theft abuse** — then shorten the window, adopt a nonce, or add revocation.
- **A second login method is scheduled** — account linking (ADR-113) and what `vfy` means per platform.
- **`PROFILE_SESSION_SECRET` must be rotated** — then do the key id / dual key first (residual 1).

Absent those, a review finding of the form *"login does not refuse a bad signature"*, *"the game server
still trusts the client-sent id"*, *"a captured signature can be replayed within the window"*, *"there is
no session revocation"*, *"both HMAC constructions are accepted"* or *"one key serves payments and
identity"* is **closeout of this ADR, not a new defect.**

## Amendments to older ADRs — ADR-103 applied 2026-09-29; ADR-113 waits for S3a

**Status of these amendments (2026-09-29, on the acceptance ruling above):**

| Older ADR | Applied? | When |
|---|---|---|
| **ADR-103** | ✅ **Applied 2026-09-29** — a dated, attributed, append-only note under its key-issued re-raise bullet, plus a `## Related` line. Nothing already written in ADR-103 was changed. | Now: its pre-committed trigger (*"The Yandex secret key is issued"*) has fired — `decisions/README.md` carve-out *"recording that a pre-committed trigger fired"*. |
| **ADR-113** | ⛔ **NOT applied — do not edit ADR-113 yet.** | **Only once `0325` S3a ships** (the server actually mints `vfy:true`). Until then its trigger has not fired, and writing the note would record a change that has not happened. The reminder is in `0325` `worklog.md` (2026-09-29 entry) for whoever ships S3a. |

> 📝 **2026-09-29:** "`0325` S3a" in this heading and table now means **task `0340`**; the ADR-113 reminder
> also lives in `0340`'s brief. The trigger is unchanged (S3a minting `vfy:true` in production). See the dated
> note under *Citation frame* at the top of this file.

*History, kept visible:* this heading first read *"Amendments to older ADRs — recorded HERE, not yet written
into them"*, and the paragraph below was written while this ADR was `proposed`.

**Why here.** ADR-103 and ADR-113 are `accepted`, and accepted ADRs are immutable except for the narrow
carve-outs in `decisions/README.md` (recording that a pre-committed trigger fired; clarifications). This ADR
is only `proposed`, and S3a has not shipped, so writing into them now would record a change that has not
happened. The edits below are listed for the owner/producer; they should be applied **after this ADR is
accepted** (and the ADR-113 part after S3a ships), as dated, attributed, append-only notes that keep every
earlier wording visible.

### ADR-103 — amended, not superseded (owner-approved with the `0325` plan, 2026-09-28)

✅ **Applied 2026-09-29.** One wording change from the proposed text below, for accuracy: the applied note
says verification **is being built** at the profile login (S2/S3a are not yet shipped), not that it
*"landed"*. The proposed text is kept as drafted.

- **Its trigger fired.** *"The Yandex secret key is issued"* — issued 2026-09-12 (report §2.5), and unrecorded
  in ADR-103 until now. ADR-113 (2026-09-15) already noted the secret was set and that ADR-103 stands.
- **What happened instead of its stated exit.** ADR-103 said: verify *inside* `getCreditableYandexId()` and
  supersede. What lands is verification at the **profile login** (this ADR). The **game-server** seam
  (`getCreditableYandexId`, `src/server/GameServer.ts`) is **still client-asserted**, so ADR-103's decision
  still governs the game server. Hence amended, not superseded.
- **Its exit is now:** `0332` (the join token) — the client sends its session token in the join and the game
  server has the profile server vouch for it. ADR-115's residual 1 closes at the same time.
- **Proposed text** (append a dated note below ADR-103's *"re-raise only if"* key-issued bullet, and a
  `## Related` line): *"⚠️ 2026-MM-DD — this trigger fired: the key was issued 2026-09-12. Verification landed
  at the profile login (ADR-116), not in `getCreditableYandexId()`; the game-server seam is still asserted,
  so this ADR stands for the game server and is amended, not superseded. Its exit is now `0332`."*

### ADR-113 — point 5, point 9 and the re-raise list (a pre-committed trigger fired)

⛔ **NOT applied. Apply only once `0325` S3a ships** (the profile server mints `vfy:true` in production).
Then add these as a dated, attributed, append-only note to ADR-113, keeping every earlier wording visible,
and mark this subsection applied.

> 📝 **2026-09-29:** read "`0325` S3a" here as **task `0340`** (moved there on the owner's ruling — dated note
> under *Citation frame* at the top of this file). Still ⛔ not applied; apply after `0340`'s S3a deploy.

- **Point 5** (*"A token counts as 'proven owner' … only once a verified login issues `vfy:true`"*): from
  S3a, a verified login issues `vfy:true`; `resolveCaller` carries `verified`. The 🔓 *"the token adds NO
  security"* bullet then holds for `vfy:false` sessions only.
- **Point 9** (*"Identity is still client-asserted … login is where verification goes"*): at the profile
  server, verification now happens at login (ADR-116). The game server is still asserted (ADR-103).
- **Re-raise list** (*"Identity verification lands (`0267`) — then verify at login and issue `vfy:true`"*):
  this is that trigger firing, via `0325` rather than `0267`.
- **Key rotation note:** rotating `PROFILE_SESSION_SECRET` now also drops verified sessions (residual 1).

## Related

- `ai-agents/tasks/done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/`
  — `brief.md`, `plan.md` (§ *The ADR*, § *Owner rulings*, § *S0-informed amendment (2026-09-29)* — owner-
  approved 2026-09-29, see § *Points settled at build*), `worklog.md` (§ *2026-09-29 — S0 result*)
- `../reports/2026-09-27-0250-authenticated-profile-read-design.md` — §2.1, §2.5, §2.6, §3, §5.4 (L5), §6,
  §8, §9
- [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md) — the game-server trust seam; amended
  by this ADR (dated note applied 2026-09-29)
- [ADR-113](adr-113-profile-internal-player-id-and-platform-identities.md) — the session and `resolveCaller`;
  to be updated by this ADR **once `0325` S3a ships** (not yet applied)
  - 📝 2026-09-29: S3a is now task `0340` — see the dated note at the top of this file.
- [ADR-115](adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md) — residual 1 closes with `0332`,
  not with this ADR
- [ADR-112](adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md) — the tenure claim a
  verified caller could later gate
- Code today: `src/profile-server/SessionToken.ts` (`vfy: z.literal(false)`, key-rotation note),
  `src/profile-server/Routes.ts` (`CallerResolution`, `resolveCaller`, the login route),
  `src/profile-server/YandexSignature.ts` (`verifySignedPayload`), `src/core/profile/LoginContract.ts`
  (`LoginRequestSchema`), `src/profile-server/Server.ts` (`YANDEX_PAYMENTS_SECRET`)
- Tasks: `0250` (S1, S3b), `0319`, `0323`, `0332`, `0267` (Yandex half answered), `0309` / `0310`, `0048`
- 📝 Added 2026-09-29: `ai-agents/tasks/done/0339-verify-0325-s2-live-the-login-signature-check-in-production/`
  (verify S2 live) and `ai-agents/tasks/done/0340-0325-s3a-enforce-mint-verified-sessions/` (S3a enforce)
  — see the dated note at the top of this file.
