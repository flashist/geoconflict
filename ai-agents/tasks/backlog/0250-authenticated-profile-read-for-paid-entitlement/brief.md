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
Sprint 6

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
9

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
🔲 Backlog

## Owner
fkit-producer

⚠️ **`fkit-producer`, not `fkit-coder`, and that is deliberate.** Phase 1 is a **design decision** that
nobody has taken, and it is not the producer's to take alone either — it needs `fkit-architect` on the
technical shape and the owner on the privacy posture. It re-assigns to `fkit-coder` once the design is
settled.

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

### Out of scope — named so it is not absorbed

- ⛔ **The ad-suppression gate itself.** That is [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md).
- ⛔ **The emoji split and its gate.** That is [`0249`](../0249-citizen-gated-full-emoji-set/brief.md).
- ⛔ **Exiting ADR-103 for XP crediting.** The `getCreditableYandexId()` seam
  (`src/server/GameServer.ts:1189-1202`) is a *different* trust question — it is about the **game
  server** trusting an id for crediting, not about a **browser** proving identity to the profile API.
  ⚠️ **They plausibly share a mechanism.** If phase 1's design would also close ADR-103, **say so and
  raise it** — but do not silently widen this task into that one.
- ⛔ **The inbox routes' `resolvePlayerId()` seam** (`src/profile-server/Routes.ts:128-137`), which
  carries the same "signature drops in here" note. Same rule: **flag the overlap, file it separately,
  do not absorb it.**
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

- **Depends on:** nothing on the boards. ⚠️ **But possibly on an external gate:** if phase 1 chooses a
  Yandex-signature design, it needs the per-game secret key, tracked as
  [`0014`](../../done/0014-yandex-catalog-registration/brief.md) `## Verification` item 3, whose state is
  **unknown**. ⛔ **Check it; do not assume.**
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
- **Effort:** ⛔ **not estimable today.** Phase 1 is ~0.5–1 day of design plus an architect consult.
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

1. **What paid signal should a verified caller get — the raw `is_paid_citizen`, or a narrow derived
   entitlement (candidate 2)?** ⛔ **Producer has no recommendation; this is a privacy-posture call the
   architect should give you options on.** The narrower shape leaks less if the auth is ever weakened.
2. **Does this need to hold up `0248`, or should `0248` be re-scoped to `is_citizen`?** Ruling 2 of
   2026-09-12 settled `0248` as **paid-only**, which makes this a hard prerequisite. **Recorded as an
   open question only because it is the one lever that would remove the prerequisite** — the producer's
   recommendation is to **leave the paid-only ruling standing**: ad-free is the strongest paid benefit
   and giving it to earned citizens removes the main reason to pay.
3. **Is the per-game payments secret key collected?** Unknown — `0014` open item 1. **It decides whether
   candidate 1 is plannable at all today.**
   📌 *Noted 2026-09-26 by the producer — a pointer, not a ruling:* this **looks answered.**
   [`0014`](../../done/0014-yandex-catalog-registration/brief.md) item 3 records the key issued 2026-09-12,
   and [`0065`](../../done/0065-citizenship-paid-live-verification/brief.md) records `YANDEX_PAYMENTS_SECRET`
   present in the running `profile-api` container since 2026-09-20. Confirm at plan time; do not assume.
