# Authenticated profile read — let a verified player see their own paid state, without leaking who paid

## ID
0250

> ℹ️ **ID allocation, checked 2026-09-12 before filing. `0250` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
>
> 1. **Task folders** — `ls -d ai-agents/tasks/*/0250-*/`: **no matches.** Highest ID in use across all
>    three boards is **`0249`**.
> 2. **`## ID` fields** — `grep -rn "^0250$" ai-agents/tasks/ --include=brief.md`: **zero hits.**
> 3. ⭐ **Upstream toolkit prose** — `grep -rn "0250" .claude/`: **zero hits.** The full upstream-occupied
>    set, re-derived this turn by `grep -rhoE '\b0[0-9]{3}\b' .claude/ | sort -u`, is `0001`, `0029`,
>    `0042`, `0043`, `0044`, `0051`, `0053`, `0064`, `0065`, `0095`, `0100`–`0105`, `0107`, `0108`,
>    `0116`, `0147`, `0162`, `0202`, `0204`, `0241`, `0243`–`0247`, `0264`, `0265`. **`0250` is in none
>    of them.**
> 4. **Repo-wide** — hits in **six `.svg` files** (path coordinates) plus **exactly one prose hit**:
>    [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md) itself, where
>    `N=0250` is the **worked example** in its own "run the four checks" snippet. ⚠️ **That is an
>    illustration, not a reservation** — it is the convention doc demonstrating the method on an
>    arbitrary number. Recorded here so the next reader does not re-derive it and does not mistake it
>    for a claim on the number.

## Sprint
Sprint 7

📌 **Moved from Sprint 6 to Sprint 7 on 2026-09-29** — OWNER RULING given 2026-09-29 live in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Move 0340 and any tasks from the Sprint 6 that depends on it to the Sprint 7."* **This reverses the same day's earlier ruling A** (*"Move 0340 into Sprint 6"*) — the latest explicit ruling wins. `fkit-lead` read *"depends on it"* as transitive (so no Sprint 6 task is left waiting on a Sprint 7 task) and stated that reading to the owner: `0340`; `0250` (its slice S3b waits on `0340`); `0248` (waits on `0250`); `0301` (waits on `0248` and `0250`). Record: the 2026-09-29 *`0340` chain* addenda under the status tables of [Sprint 6](../../../sprints/plan-sprint-6.md) and [Sprint 7](../../../sprints/plan-sprint-7.md). The owner gave no rank on Sprint 7; this board's highest was 15 (`0308`), and the four tasks moved by this ruling were appended in their Sprint 6 relative order: `0340` 16, `0250` 17, `0248` 18, `0301` 19. ADR-035: appended, never inserted; nothing was renumbered. `## Status` unchanged (still `🚧 Blocked` with its reason); no folder moved; no mover run. The bare-token warning below still applies — the token is now `Sprint 7`.

🚨 **This move changes only WHERE `0250` is tracked. Slice S1 — the leak fix, built + reviewed 2026-09-27, verdict *Ready to merge*, committed on `dev` in `68303d5`, NOT deployed — STILL SHIPS IN THIS WEEKEND'S DEPLOY SLOT**, exactly as planned in the [weekend deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *Next window — plan (written 2026-09-29)* (checked 2026-09-29: that section still carries `0250` S1 — client in the game deploy, server in the profile deploy after it). It has to: [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md), Sprint 6's owner-ruled top priority, cannot start until S1 is live, and until S1 is deployed the paid-state leak stays live. Only slice **S3b** (which waits on [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md)) is Sprint 7 work.

*(Earlier value, kept as history — true from 2026-09-26 until 2026-09-29:)* ~~Sprint 6~~

⚠️ **The field above is the bare token `Sprint 6` (was `Backlog` until 2026-09-26) on purpose** —
`dashboard.sh`'s drift rule compares it against the board's identity, and a decorated value is reported
as drift. **Do not decorate it.**

📌 **MOVED FROM THE BACKLOG BOARD INTO SPRINT 6 ON 2026-09-26 — OWNER RULING** given live in the
`fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no
owner channel (ADR-021; the relay named the ruling, ADR-037 §3); ⛔ not producer precedent. Asked
*"Pull 0250 … into Sprint 6, directly above ad-free (0248)?"*, the owner chose, verbatim: **"Yes, above
0248 (Recommended)"**.
- **Why it was asked:** earlier that day the owner moved
  [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (ad-free for paid citizens) into
  Sprint 6 above the citizenship explainer popup
  ([`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)). `0248` cannot be built
  without this task, so both waited on it.
- **Effect:** rank **4** on [Sprint 6](../../../sprints/plan-sprint-6.md), directly above `0248`; the
  [Backlog board](../../../sprints/backlog.md) row reads `➡️ Moved`. Full record: the second *RE-RANK
  2026-09-26* addendum on the Sprint 6 board.
- ⛔ **What the ruling did NOT change:** phase 1 is still a design decision (`fkit-architect` on the
  shape, the owner on the privacy posture), the MUST-FIX section below still binds, and open questions 1–2
  are still open.

*History, kept as written — the board part was true until 2026-09-26:*

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-12, given live in session — ⛔ NOT Sprint 4.** The owner
ruled **that this be filed**, and filed **rather than scheduled**. Their reasoning as put to them and
accepted: **both [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) and
[`0249`](../0249-citizen-gated-full-emoji-set/brief.md) would want this work, so it should be filed
ONCE rather than absorbed into either.** ⛔ **They did NOT rule what it is worth or when it is worked**
— see *Priority*, where the rank is the **producer's**.

## Priority
17

📌 **2026-09-29 — rank 17 on [Sprint 7](../../../sprints/plan-sprint-7.md) is APPEND RANK, not a merit ranking** (see *Sprint*). On merit it sits directly below `0340`, whose ship its slice S3b waits on — which is where it is. *Earlier value, kept:* ~~9~~ (Sprint 6) —

📌 **Shifted 4 → 9 later on 2026-09-26** by a third OWNER RULING (R2/R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): five appended name-change rows (`0312`, `0313`, `0315`, `0314`, `0317`) were placed above it. Still directly above `0248`; order relative to `0248`, `0301` and `0303` unchanged. ⛔ Not a merit re-rank of this task. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~4~~ —

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** (see *Sprint*:
*"Yes, above 0248"*). It arrived at append rank 25 and was moved to 4 under that ruling.
~~Unscheduled *(Backlog board is unranked by design)*~~ — true until 2026-09-26.

*History, kept as written:*

📌 **Producer's rank: Medium.** ⛔ **This is the PRODUCER's rank, not the owner's** — the owner ruled
that the task be filed, not what it is worth. Medium and not High because the two things it unblocks
(`0248`, and `0249` if that brief's phase 1 lands on the paid flag) are themselves unscheduled, and the
owner recorded that neither has to ship before launch. Medium and not Low because it is a **shared
prerequisite**: it is the single piece of work standing between the paid tier and *any* client-visible
paid benefit, and every additional paid perk `PROJECT.md` promises ("name change, verified icon, private
lobbies, spectating") will want the same seam.

## Status
🚧 Blocked — slice S1 (leak fix) built + reviewed 2026-09-27, verdict *Ready to merge* (see `review.md`); slice S3b waits on `0340` (verified sessions — `0325`'s slice S3a, split into its own task 2026-09-29; was ~~`0325`~~, which closed as the S2 build). Driven by `/fkit-sprint-ship-loop` (fkit-lead). **Deploy state (2026-09-29):** S1 is committed on `dev` in commit `68303d5` (2026-09-28; lead-verified — `src/profile-server/PublicProjection.ts` first appears there) and is **NOT deployed**. Per OWNER RULING 2026-09-29 (relayed by `fkit-lead`), it is queued for the **next weekend deploy slot** — deploys use weekend slots unless something urgent comes up. ⚠️ **Until S1 is deployed, the paid-state leak stays live.**

## Owner
fkit-coder

📌 **Re-assigned `fkit-producer` → `fkit-coder` on 2026-09-27**, as this brief anticipated: phase 1 (the
design) is settled — the architect's report is in and the owner ruled D1–D5 (see *Owner rulings
(2026-09-27)* at the end of this brief). Done by a spawned `fkit-producer` on `fkit-lead`'s instruction in
`/fkit-sprint-ship-loop`.

*History, kept as written — true until 2026-09-27:* ~~`fkit-producer`~~ — ~~⚠️ **`fkit-producer`, not
`fkit-coder`, and that is deliberate.** Phase 1 is a **design decision** that nobody has taken, and it is not
the producer's to take alone either — it needs `fkit-architect` on the technical shape and the owner on the
privacy posture. It re-assigns to `fkit-coder` once the design is settled.~~

## Context

### What is missing, stated exactly

**A client cannot learn that the player in front of it has paid.** The `is_paid_citizen` flag exists on
the profile record but is stripped from every response a client can see. Verified in code 2026-09-12 at
commit `b349210`:

- `src/core/profile/PlayerProfile.ts:55-58` — `PublicPlayerProfileSchema` is
  `PlayerProfileSchema.omit({ is_paid_citizen: true, citizenship_purchased_at: true, persistent_id: true })`.
- `src/profile-server/Routes.ts:169-171` — `toPublicProfile()` destructures `is_paid_citizen` and
  `citizenship_purchased_at` off the record and `void`s them.

The sibling flag `is_citizen` (**earned or paid** — `src/core/profile/Citizenship.ts:15,25`) **does**
reach the client, as `isCitizen` (`src/core/Schemas.ts:146,470`; `src/core/game/GameView.ts:342`). So
the client knows *whether someone is a citizen*; it does not and cannot know *whether they paid*.

### 🔒 The redaction is CORRECT. This task must not undo it.

⛔ **Read this before designing anything.** The omission is a deliberate privacy decision, and it is the
right one for the code as it stands. The reason is written into the code itself,
`src/profile-server/Routes.ts:150-158`:

> *"Sprint 4: this read is unauthenticated (no Yandex signature verification yet — deferred to the
> Payments task), so omit fields a caller shouldn't be able to resolve by guessing a (non-secret)
> yandexPlayerId: paid state (`is_paid_citizen`, `citizenship_purchased_at`) — leaking "who paid"."*

`GET /v1/profile` takes a **Yandex player id** and returns that player's profile, to **anyone**. The id
is not a secret, and the route is deliberately open: it carries
`Access-Control-Allow-Origin: *` and a per-IP rate limiter that exists precisely "to blunt enumeration
of the (non-secret) Yandex player IDs" (`src/profile-server/Routes.ts:207-216,222-228`). ⇒ **Returning
paid state on that route would let anyone who can guess or enumerate player ids build a list of who
paid.** That is a privacy leak about real people's purchases, in a jurisdiction where
[`0048`](../0048-compliance-152fz-notification-consent/brief.md) already tracks 152-ФЗ obligations.

🚨 **The constraint the chosen design must satisfy, stated as a requirement and not as an obstacle:**
**paid state may reach a caller that is proven to be the profile's owner, and no one else.** A design
that returns paid state to an unauthenticated caller — including a "harmless-looking" derived field
that still answers *did this player pay?* for an arbitrary id — is a **regression of a decision that
was made on purpose**, not a simplification. ⛔ **Do not treat the redaction as a defect to remove. It
is the current answer; this task's job is to earn the right to a different one.**

### The `TODO(payments)` anchor — where the seam already is

The code marks the exact places the work belongs. **An implementer should start here, not by searching:**

| Anchor | What it says |
|---|---|
| `src/profile-server/Routes.ts:157-158` | `TODO(payments): once Yandex-signature auth lands, these can be returned to the verified owner of the profile.` — sits in `toPublicProfile()`'s doc comment, directly above the omission. |
| `src/profile-server/Routes.ts:208-210` | `TODO(payments): verify a Yandex signature so a caller can only read its own profile.` — on the `GET /v1/profile` route itself. |
| `src/profile-server/Routes.ts:128-137` | The inbox routes' `resolvePlayerId()` doc: *"when ADR-103 exits (the Yandex secret lands with `0014` and signed-player verification exists), the signature check drops in **HERE and nowhere else**."* ⚠️ **A second seam with the same dependency** — see *Scope*. |

📌 **Anchors re-checked 2026-09-27 — the table above has drifted; it is kept as written, and these are the
current places** (from the design report §2.7, re-confirmed by the producer with `grep` against the working
tree that day; line numbers will move again, so re-find them by name):
- ~~`resolvePlayerId()` at `Routes.ts:128-137`~~ — **no longer exists.** Its successor is **`resolveCaller`**
  (`src/profile-server/Routes.ts`, ~`:498`), the single place every player-facing route (profile, inbox,
  name change, tenure grant) learns who is calling. Its doc reserves it for the signature check.
- **`toPublicProfile`** now sits at ~`Routes.ts:346`, with its `TODO(payments)` comment at ~`:338`. The
  login projection is at ~`:735`; `GET /v1/profile` is at ~`:640`.
- ~~The `TODO(payments)` on the `GET /v1/profile` route (`:208-210`)~~ — **no longer in the file**; only the
  `toPublicProfile` one remains.
- Leak sites the report added (see *Owner rulings*, D5): the tenure-grant response (`POST
  /v1/profile/tenure-grant`, ~`Routes.ts:1477`) and the inbox read (`GET /v1/messages`, ~`Routes.ts:1074`).
- `src/core/profile/PlayerProfile.ts` ~`:55` still carries the stale *"Sprint 4's read is unauthenticated"*
  comment (see *Notes*).

### 🚨 No auth mechanism exists for profile reads today — so this is a DESIGN task first

⛔ **The shape of this work is genuinely unsettled. This brief does not know the answer and does not
pretend to.** Do not read the anchors above as "a known fix waiting to be typed in."

What exists today, stated precisely so nobody over- or under-reads it:

- ✅ **Server-to-server auth exists** — `internalAuth` (`src/profile-server/InternalAuth.ts:21`), a
  `timingSafeEqual` on a shared secret, gating the `/internal/*` routes. ⛔ **It is not applicable
  here**: it authenticates *the game server*, not *a player*, and the shared secret cannot be shipped
  to a browser.
- ✅ **Yandex signature-verification machinery exists in the repo** —
  `src/profile-server/YandexSignature.ts:101-116`, `verifySignedPayload()`, used today by the payments
  routes (`src/profile-server/Routes.ts:436,508`). ⚠️ **It verifies a signed *purchase* payload against
  the per-game secret. Whether and how it generalizes to verifying a signed *player identity* on a
  profile read has NOT been assessed by anyone.**
- ❌ **Nothing authenticates a player on `GET /v1/profile`.** There is no login, no session, no token,
  no signature check on that route.

⇒ **Phase 1 of this task is to choose a design, not to implement one.** The candidate shapes below are
**input to that decision, not a recommendation, and the list is not closed:**

1. **Yandex-signature auth on the profile read** — `getPlayer({ signed: true })` on the client, verified
   server-side, paid state returned only to the verified owner. The path the `TODO` anticipates and the
   one [ADR-103](../../../knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md)
   names as its exit. ⚠️ **Carries an external dependency — see *The dependency nobody controls*.**
2. **A narrow, non-identifying entitlement response** — e.g. an authenticated caller learns only
   `ad_free: boolean` about **itself**, rather than un-redacting `is_paid_citizen` wholesale. Smaller
   blast radius; still needs an authentication step, so it is a variant of the question, not an escape
   from it.
3. **Read the entitlement client-side from the Yandex purchase/SDK state** and never ask the profile
   server. ⚠️ **Unverified as feasible** — nobody has checked whether the Yandex SDK exposes a durable
   owned-purchase query this client can trust. If it does, it sidesteps the server privacy question
   entirely; if it does not, this candidate is dead and should be recorded as such.

⛔ **DO NOT design the auth scheme in this brief, and do not let a plan invent one.** The owner ruled
2026-09-12 that the design belongs to **`fkit-architect`, at plan time**. This brief's job is to record
that the work exists, what it must not break, and where the seam is.

### ⚠️ The dependency nobody controls — the per-game secret key

Candidate 1 (and anything else reusing `YandexSignature.ts`) verifies against the **per-game Yandex
payments secret key**. Two facts an estimator needs:

- `verifySignedPayload()` **fails closed on an empty secret** (`src/profile-server/YandexSignature.ts:110-111`:
  *"Fail closed — never verify against an empty key"*), and `src/profile-server/Server.ts:35,38` disables
  the payments routes with a 503 when `YANDEX_PAYMENTS_SECRET` is unset. **A signature-based design
  inherits that failure mode.**
- **Collecting that key is `0014` `## Verification` item 3**, and per
  [ADR-103](../../../knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md)
  the key is only issued once in-app purchases are enabled for the game.

⛔ **Whether the key has been collected is NOT KNOWN as of 2026-09-12, and this brief asserts NEITHER
that it has NOR that it has not.** It is recorded as an open item on
[`0014`](../../done/0014-yandex-catalog-registration/brief.md). **Check `0014` before planning candidate 1; do
not assume either state.**

## 🚨 MUST-FIX: paid state LEAKS through the public profile TODAY (owner ruling 2026-09-24)

**Authority:** OWNER RULING *"Must-fix in 0250"*, given 2026-09-24 live in the `fkit lead` session via
`AskUserQuestion` at the approval of [`0020`](../../done/0020-analytics-p1-ad-impression-tier/brief.md)'s
`plan-baseline.md`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021);
⛔ not producer precedent. **This is a hard constraint on this task, not an option.** The owner ruled
that the leak is fixed **as part of `0250`**, with **`fkit-architect` weighing the options**. **Until it
is fixed, a player's paid state must not be considered private.**

**The leak.** `toPublicProfile()` removes `is_paid_citizen` and `citizenship_purchased_at`
(`src/profile-server/Routes.ts`, the function at `:337`). But paid state can be **derived** from what
it still returns:
`is_citizen && citizenship_earned_at === null` ⇒ **paid, and not (yet) earned**.
- Only two code paths set `is_citizen = true`:
  - the **paid grant**, `GRANT_FLAGS_SQL` (`src/profile-server/PaymentsRepository.ts:46-52`), sets
    `is_paid_citizen`, not `citizenship_earned_at`;
  - the **XP crossing**, `GRANT_CITIZENSHIP_SQL` (`src/profile-server/PlayerProfileRepository.ts:105-113`),
    sets `citizenship_earned_at`.
- The database checks agree (`migrations/006_player_identity.sql:81,85`: `chk_paid_implies_citizen`,
  `chk_earned_implies_citizen`).
- **Who can exploit it:** Bearer tokens are `vfy:false`, so anyone can get one for a player id they merely
  assert. Anyone asserting **another** player's id can therefore learn that player **paid**.
- **The same projection is returned by login** (`toPublicProfile(…)` in the login response,
  `Routes.ts:726`), so fixing `GET /v1/profile` alone is not enough.
- A paid player who later crosses the XP threshold gets `citizenship_earned_at` stamped, and after that
  the derivation no longer tells them apart. The leak is real until then.
- **Evidence:** `0020/plan-baseline.md` § *Investigation findings* Q1 (2026-09-24). The producer
  re-checked the three code sites read-only on 2026-09-24.

**How it binds this task:** Verification step 2 below (*"…by any route and by any derived field"*)
already requires this to be closed. This block records that the derived field **exists today** and
names it. Phase 1's design must say how `is_citizen` and `citizenship_earned_at` stop telling payers
apart on every route that returns the profile, at least `GET /v1/profile` and the login response.
Candidates include not exposing one of them to non-owners, or reshaping the projection. **The choice is
the architect's, and the owner rules.** ⛔ Note the conflict with Verification step 4: the card reads
`is_citizen` today, so the fix must not break the citizen badge.

**Known consumer that must not build on the leak:** [`0299`](../0299-tiered-ad-impression-analytics/brief.md)
(tiered ad analytics) is explicitly barred from deriving `PaidCitizen` this way.

## Scope

### In scope

- **Phase 1 — the design decision.** Which seam carries proof-of-identity to the profile read, what
  paid state (if any) is returned once it does, and what the privacy posture of that response is.
  Producer-owned, `fkit-architect` consulted on the technical shape, **owner rules the privacy posture.**
- **Phase 2 — implement the chosen design** on `GET /v1/profile` and the shared profile projection
  (`PublicPlayerProfileSchema`), so that a **verified** caller can learn its own paid state.

📌 **Phase 2 re-shaped by the owner rulings of 2026-09-27** (full record: *Owner rulings (2026-09-27)*
below). Phase 1 is **done**. Phase 2 is now **two slices of this task**, in this order:
- **S1 — the MUST-FIX (the "equalized projection").** For every caller that is **not** verified, paid and
  earned citizens look the same on **all four** leak channels: `GET /v1/profile`, the login response, the
  tenure-grant response, and the inbox read (D5). **No dependency — ships first. Deploy the client
  first, then the profile server** (a client that does not know the new neutral inbox key drops that
  message). Design: report §5 and §8 S1.
- **S3b — the verified-only view.** A **verified** caller (`vfy:true`) gets its own true `xp`,
  `citizenship_earned_at`, the original inbox keys, and — per D1 — the raw facts **`is_paid_citizen`** and
  **`citizenship_purchased_at`**, to itself only. **Hard-depends on
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)**
  (verified login). Design: report §8 S3b, with D1 replacing its `entitlements: { ad_free }` payload.
- ⛔ **Verified login itself (report slices S0, S2, S3a) is NOT in this task** — it is `0325` (D3).

### Out of scope — named so it is not absorbed

- ⛔ **The ad-suppression gate itself.** That is [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md).
- ⛔ **The emoji split and its gate.** That is [`0249`](../0249-citizen-gated-full-emoji-set/brief.md).
- ⛔ **Exiting ADR-103 for XP crediting.** The `getCreditableYandexId()` seam
  (`src/server/GameServer.ts:1189-1202`) is a *different* trust question — it is about the **game
  server** trusting an id for crediting, not about a **browser** proving identity to the profile API.
  ⚠️ **They plausibly share a mechanism.** If phase 1's design would also close ADR-103, **say so and
  raise it** — but do not silently widen this task into that one.
  📌 *Answered 2026-09-27 by the design report (§6):* verified login does **not** close ADR-103 by itself —
  the game server never sees the profile session. It needs a second step (the session token in the
  WebSocket join), which is **not filed**; see
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)
  *Out of scope*. Still out of scope here.
- ⛔ **The inbox routes' `resolvePlayerId()` seam** (`src/profile-server/Routes.ts:128-137`), which
  carries the same "signature drops in here" note. Same rule: **flag the overlap, file it separately,
  do not absorb it.**
  📌 **Narrowed 2026-09-27 by OWNER RULING D5 — read before relying on the bullet above.** The seam
  (now `resolveCaller`) and the signature check **stay out of scope**; they are filed separately as
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) (D3).
  But the **inbox projection** (leak L4: the `citizenship_paid` inbox template tells a payer apart) and the
  **tenure-grant response** (leak L3: it returns the true XP) are now **IN scope** — D5 widened this task for
  **these two leaks only**, so slice S1 closes all four known leaks at once.
- ⛔ **`persistent_id`.** It is redacted for a **different** reason (it is the internal cross-device
  identity-linkage token). This task is about paid state. Un-redacting `persistent_id` is not implied
  by anything here and must not ride along.

## Verification steps

Written against the requirement, not against an implementation that does not exist yet. **Whatever
phase 1 chooses, all of these must hold:**

1. **A verified caller can read its own paid state.** The positive case, end to end.
2. 🔴 **An UNVERIFIED caller — or a verified caller asking about a DIFFERENT player id — cannot learn
   paid state, by any route and by any derived field.** ⛔ **This is the step the task exists to
   protect. Test it by attempting the leak, not by reading the code.** Include the case of a caller
   that supplies a *valid* player id belonging to someone else.
3. **Enumeration still gains nothing.** Walking a range of player ids against the public read returns
   no paid signal — not directly, not via a field that differs only for payers, and not via response
   size or status-code timing that answers the same question.
4. **The unauthenticated read still works for everything it returns today.** ⛔ **The citizenship card
   must not regress.** `GET /v1/profile` drives XP, the citizen badge and the buy CTA; the existing
   comment at `src/profile-server/Routes.ts:217-221` records that a failure here degrades the card to a
   silent zero-XP state for every player.
5. **Schema compatibility across separate deploys, both directions.** The profile server and the client
   bundle deploy independently. An old client must still parse a new server's response, and a new
   client must still parse an old server's. ⚠️ The codebase already carries this lesson explicitly —
   `src/core/profile/PlayerProfile.ts`'s `name_change` field comment records `.optional()` as
   **mandatory, not cosmetic**, from InboxContract review-R3.
6. **Fail-open vs fail-closed is decided EXPLICITLY and tested.** ⚠️ **The right answer is not obvious
   and this brief does not rule it:** an unresolvable entitlement should almost certainly read as *"not
   paid"* (so a benefit is withheld rather than granted — matching `0248`'s and `0249`'s fail-open-to-ads
   /unlock rule), **but a verification outage must not turn the profile read itself into an error.**
   Test both branches.
7. **Tests are mandatory for any `src/core/` change** — `PlayerProfile.ts` is in `src/core/`, so touching
   the schema triggers CLAUDE.md's rule. Not discretionary.
8. **No secret reaches a git-tracked artifact.** If the design uses the per-game key, record only that it
   is configured and where — never its value.

## Notes

- **Depends on:** [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (verified sessions —
  `0325`'s slice S3a, split into its own task 2026-09-29) — **hard, for slice S3b only** (owner ruling D3,
  2026-09-27). **Slice S1 (the MUST-FIX) depends on nothing** and ships first. The task as a whole cannot
  close until `0340` ships. *Repointed 2026-09-29 (see the dated note below), kept as written:*
  ~~[`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)
  (verified login) — hard, for slice S3b only … The task as a whole cannot close until `0325` ships.~~
  *Superseded 2026-09-27, kept as written:* ~~nothing on the boards. ⚠️ **But possibly on an external
  gate:** if phase 1 chooses a Yandex-signature design, it needs the per-game secret key, tracked as
  [`0014`](../../done/0014-yandex-catalog-registration/brief.md) `## Verification` item 3, whose state is
  **unknown**. ⛔ **Check it; do not assume.**~~ — the key is configured and correct (open question 3,
  answered below).
- 📌 **2026-09-29 — dependency repointed from `0325` to `0340` (append-only).** Added by a spawned
  `fkit-producer` at `fkit-lead`'s request, on an OWNER RULING given 2026-09-29 live via `AskUserQuestion` in
  the `fkit lead` session (ADR-021/037): **"Split it (Recommended)"** — *"Close 0325 as the S2 build
  (agent-closed). File a 'verify S2 live' task … at the top of Sprint 7, and a separate 'S3a enforce' build
  task after it."* `0325` closed as the S2 build (shadow mode: checks the signature, still mints only
  `vfy:false`). The verified session that slice **S3b** needs now comes from
  [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (S3a, enforce), which waits on
  [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (verify S2 live) and an
  explicit owner approval. Where the slice table and deploy order below say *"`0325` (S3a)"*, read `0340`.
  Slice S1 is unaffected.
- **Blocks:** [`0248-suppress-interstitial-ads-for-paid-citizens`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md)
  — ⛔ **hard prerequisite.** `0248` is specified on `is_paid_citizen` by owner ruling (2026-09-12,
  paid-only confirmed), and that flag cannot reach the client until this task ships.
- **Likely wanted by:** [`0249-citizen-gated-full-emoji-set`](../0249-citizen-gated-full-emoji-set/brief.md)
  — ⚠️ **conditional, not established.** `0249`'s flag is an **open question** (`PROJECT.md:36` does not
  say "paid" for the emoji benefit, and the producer's reading there favours `is_citizen`, which needs
  none of this work). **If `0249` lands on `is_paid_citizen`, this task becomes its prerequisite too.**
  ⛔ **Do not record `0249` as blocked on this until that question is answered.**
- **Why this is its own task rather than a step inside `0248`:** owner ruling, 2026-09-12 — both briefs
  want it, so it is filed once. `0248`'s *The blocker* section and `0249`'s *shared prerequisite* note
  both said "file that work as its own task, do not absorb it." **This is that task.**
- **It also unblocks the perks not yet filed.** `PROJECT.md:36` names "name change, verified icon,
  private lobbies, spectating" as planned perks. Any of them gated on **paid** state will want this same
  seam. ⚠️ **Recorded as context for ranking — no task exists for any of them, and this brief does not
  file one.**
- ⛔ **Do NOT put the auth design in this brief.** Owner ruling, 2026-09-12: that is `fkit-architect`'s,
  at plan time. A plan that arrives having already picked a scheme without the architect consult has
  skipped phase 1.
- 📌 **Effort, updated 2026-09-27 from the design report (§4):** slice S1 ~1–1.5 days. Slice S3b is not
  separately estimated in the report (it rides on `0325`, which is ~2.5–3 days plus the owner-run spike).
  Estimates, not measurements. *Earlier text, kept:*
- ~~**Effort:** ⛔ **not estimable today.**~~ Phase 1 is ~0.5–1 day of design plus an architect consult.
  Phase 2 is unknowable until phase 1 closes — candidate 3 could be small if the SDK cooperates;
  candidate 1 is a multi-day auth change with an external dependency. **An estimate here would be
  fiction.**

- **Stale doc comment, a finding and not a task (2026-09-24, from `0020`'s investigation):**
  `src/core/profile/PlayerProfile.ts:55` still says *"Sprint 4's read is unauthenticated"*. `GET /v1/profile`
  now goes through a Bearer session (`resolveCaller`, `Routes.ts:630-653`). This task edits that schema, so
  fix the comment here. Also recorded in `0299`.
- **Split-out consumer:** [`0299`](../0299-tiered-ad-impression-analytics/brief.md) depends on this task
  for its `PaidCitizen` tier.

## Open questions for the owner

1. ✅ **ANSWERED 2026-09-27 by OWNER RULING D1 — the raw facts: `is_paid_citizen` and
   `citizenship_purchased_at`, to the verified owner only.** Owner's answer, verbatim: **"Raw facts: paid +
   date"**. ⚠️ Not the architect's recommendation (the narrow `ad_free` entitlement). See *Owner rulings
   (2026-09-27)*. *The question as asked, kept:*
   ~~**What paid signal should a verified caller get — the raw `is_paid_citizen`, or a narrow derived
   entitlement (candidate 2)?** ⛔ **Producer has no recommendation; this is a privacy-posture call the
   architect should give you options on.** The narrower shape leaks less if the auth is ever weakened.~~
2. ✅ **ANSWERED 2026-09-27 by OWNER RULING D2 — `0248` stays paid-only and waits for verified login.**
   Owner's answer, verbatim: **"Paid only (Recommended)"**. See *Owner rulings (2026-09-27)*. *The question
   as asked, kept:*
   ~~**Does this need to hold up `0248`, or should `0248` be re-scoped to `is_citizen`?**~~ Ruling 2 of
   2026-09-12 settled `0248` as **paid-only**, which makes this a hard prerequisite. **Recorded as an
   open question only because it is the one lever that would remove the prerequisite** — the producer's
   recommendation is to **leave the paid-only ruling standing**: ad-free is the strongest paid benefit
   and giving it to earned citizens removes the main reason to pay.
3. ✅ **ANSWERED 2026-09-27 by the design report (§2.5) — yes: the key is collected, configured on the
   profile box, and correct.** Evidence, none of it printing or storing the value: issued 2026-09-12
   (`0014`); present in the running container 2026-09-19; real purchases verified with it 2026-09-26
   (`0065`); and a **read-only probe on 2026-09-27** showed the payments gate passes (a deliberately
   non-existent payments path answered 404, not the 503 a missing key gives). ⚠️ **Still NOT established:**
   whether the same key verifies signed **player** data, and the payload's fields — that is
   [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)'s
   spike S0. *The question as asked, kept:*
   ~~**Is the per-game payments secret key collected?** Unknown — `0014` open item 1. **It decides whether
   candidate 1 is plannable at all today.**~~
   📌 *Noted 2026-09-26 by the producer — a pointer, not a ruling:* this **looks answered.**
   [`0014`](../../done/0014-yandex-catalog-registration/brief.md) item 3 records the key issued 2026-09-12,
   and [`0065`](../../done/0065-citizenship-paid-live-verification/brief.md) records `YANDEX_PAYMENTS_SECRET`
   present in the running `profile-api` container since 2026-09-20. Confirm at plan time; do not assume.

## Owner rulings (2026-09-27)

**Given live via `AskUserQuestion` in the `fkit lead` session on 2026-09-27, relayed by `fkit-lead` to a
spawned `fkit-producer` holding no owner channel (ADR-021/037).** Recorded verbatim; appended (ADR-035). ⛔ Not
producer precedent. The questions are D1–D5 of the design report
[`2026-09-27-0250-authenticated-profile-read-design.md`](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md)
(§10). They close phase 1 and answer *Open questions* 1–2; question 3 is answered by the report itself.

| # | Question (plain terms) | Owner's answer (verbatim) | Option text shown (verbatim) |
|---|---|---|---|
| **D1** | What does a **verified** player learn about their own payment? (brief open question 1) | **"Raw facts: paid + date"** | *"The paid flag and the purchase date."* |
| **D2** | Ad-free for whom? (brief open question 2) | **"Paid only (Recommended)"** | *"Keep it the main reason to pay. 0248 waits for verified login."* |
| **D3** | Where does verified login live? | **"New task, above 0250 (Recommended)"** | *"Its own build task in Sprint 6, directly above 0250; 0250 waits on it. 0267 (the identity investigation) is closed or narrowed using this report."* |
| **D4** | Accept the side effects of the leak fix on **unverified** sessions? | **"Accept all (Recommended)"** | *"Accept the 3 side effects; record the polling hole as a known, accepted risk."* |
| **D5** | Leak scope | **"Fix all 4 in 0250 (Recommended)"** | *"One first slice closes every known leak. Ships first, needs no Yandex work."* |

**What each ruling means for this task:**

- **D1 — raw facts, verified owner only.** ⚠️ **This is NOT the architect's recommendation**, which was *"Only
  the benefit: ad_free"* (report §3.3, candidate 2-narrow). So slice S3b returns **`is_paid_citizen`** and
  **`citizenship_purchased_at`** to a caller holding a **verified** (`vfy:true`) session, about **itself only**
  — and to nobody else. The report's `entitlements: { ad_free }` payload (§3.3, §5.1 row 4, §8 S3b) is
  **superseded** by this ruling. Returning *both* the raw facts and an `ad_free` object was not asked or
  ruled; if the plan wants both, that is a new owner question. The cross-deploy rule still binds: any field
  added to `PublicPlayerProfileSchema` is `.optional()` (verification step 5). The owner's accepted cost, as
  the report states it: the purchase date is disclosed to the verified owner, and every perk is tied to
  "paid" rather than to a named benefit.
- **D2 — `0248` stays paid-only.** It waits on this task's slice S3b. Candidate 4 of the report (re-scope
  `0248` to `is_citizen`) is **declined**.
- **D3 — verified login is its own task:**
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md), filed
  2026-09-27 with the report's slices **S0** (owner-run spike), **S2** (shadow mode) and **S3a** (mint
  `vfy:true`), plus the ADR recording the first verified identity (owner sign-off pending). This task keeps
  **S1** and **S3b**; S3b hard-depends on `0325`. ⚠️ The owner ruled `0325` *"directly above 0250"*; on the
  board it is **appended** (ADR-035 — closed rows sit below this row, so the rank cannot be written) and the
  order is carried by the dependency and by a note on the Sprint 6 board. **`0267`:** the report answers its
  Yandex half; closing or narrowing it is a **pending producer/owner step** — nothing was closed or cancelled.
- **D4 — accepted, all three side effects, for unverified sessions** (report §5.3):
  1. a paid citizen with under 100 XP sees **100 / 100** on their own card (and in the tenure popup);
  2. the `Citizenship:Earned:XP` analytics event **under-counts** — it runs on verified reads only, with a
     fresh storage-key prefix, and never fires on the new client until S3b;
  3. payers see a **neutral inbox note** (a new `citizenship_granted` key) instead of *"Your citizenship
     purchase was successful"*.

  ⚠️ **Known, accepted risk — leak L5, the polling hole:** someone who knows a player's id and polls them
  around the moment of purchase can still infer it (citizen flag flips while XP jumps). Closing it fully
  would mean refusing unverified reads, which verification step 6 forbids. **Recorded as accepted by owner
  ruling; it must also be recorded in `0325`'s ADR.** The report's optional hardening (hide `updated_at` from
  unverified callers) was **not ruled** — the plan may propose it.
- **D5 — all four leaks in this task.** Slice S1 closes **L1** (`citizenship_earned_at`), **L2** (XP under
  100), **L3** (the tenure-grant response's true XP) and **L4** (the `citizenship_paid` inbox template). This
  **widens** this task for L3 and L4 **only**; the inbox auth seam stays out (see *Scope*).

**Slice order (report §8, owner-accepted via D3/D5):**

| Order | Slice | Owner task | Depends on | Deploy |
|---|---|---|---|---|
| 1 | **S1** — equalized projection (the MUST-FIX) | **0250** | **nothing** | **client first**, then profile server |
| 2 | S0 — spike on the signed player payload (owner-run) | `0325` | the owner, live iframe | — |
| 3 | S2 — verified-login shadow mode | `0325` | S0's answers | server, then client |
| 4 | S3a — mint `vfy:true` | `0325` | S2's metric + owner go-ahead | server |
| 5 | **S3b** — verified-only projection with the raw paid facts (D1) | **0250** | **`0325` (S3a)** | server, then client |

Full deploy order across all slices (report §8): client S1 → server S1 → server S2 → client S2 → server
S3a/S3b → client S3b.

**Effect on other briefs (dated notes added 2026-09-27, same producer):** `0248` (unchanged, paid-only, waits
on S3b) · `0299` (may use the raw `is_paid_citizen` for verified callers) · `0319` (now depends on `0325`) ·
`0322` (pointer to the not-filed second step) · `0267` (the report answers its Yandex half).

⛔ **What this producer did NOT do:** change `## Status`; close, cancel or move any task; re-rank any row;
write the ADR (that is `0325`'s deliverable); touch `ai-agents/wiki-vault/`; commit or push.

## 📌 Note for S3b's future plan — added 2026-09-27

**Source:** this task's [`worklog.md`](worklog.md), 2026-09-27 build, *Decision log* item **(4)**.

S1 turned `Citizenship:Earned:XP` detection off (dormant). **When S3b turns it back on for verified reads, the
detection must use the paid state that S3b can then see**, so that a **paid** citizen who later crosses 100 XP is
**not** counted as "earned". Without that check, the server would stamp `citizenship_earned_at` for that player
and the event would fire, over-counting earned citizens. The S1 code comment and the analytics reference doc
already say this residual is gone only *while the event is dormant*. S3b's plan must carry the fix.
