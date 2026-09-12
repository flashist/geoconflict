# Suppress interstitial ads for paid citizens — deliver the benefit `PROJECT.md` already promises

## ID
0248

> ℹ️ **ID allocation, checked 2026-09-12 before filing. `0248` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
>
> 1. **Task folders** — `ls -d ai-agents/tasks/*/0248-*/`: **no matches.** Highest ID in use across all
>    three boards is **`0242`**.
> 2. **`## ID` fields** — `grep -rn "^0248$" ai-agents/tasks/ --include=brief.md`: **zero hits.**
> 3. ⭐ **Upstream toolkit prose** — `grep -rn "0248" .claude/`: **zero hits.** The full upstream-occupied
>    set, re-derived this turn by `grep -rhoE '\b0[0-9]{3}\b' .claude/ | sort -u`, is `0204`, `0241`,
>    `0243`, `0244`, `0245`, `0246`, `0247`, `0264`, `0265` (plus numbers already held by project tasks).
>    **`0248` is in none of them.**
> 4. **Repo-wide** — three hits, **all three SVG path coordinates** (`resources/flags_source/Rhode_Island.svg`,
>    `resources/images/EuropeBackground.svg`, `resources/images/PortIcon.svg`). No task, board, skill or
>    ADR refers to `0248`.

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-12, given live in session and relayed through the spawning
session — ⛔ NOT Sprint 4.** The owner ruled **that this be filed**, and that it be filed **rather than
scheduled**. ⛔ **They did NOT rule what it is worth or when it is worked** — see *Priority*, where the
rank is the **producer's**.

## Priority
Unscheduled *(Backlog board is unranked by design)*

📌 **Producer's rank: Medium.** ⛔ **This is the PRODUCER's rank, not the owner's** — the owner ruled that
the task be filed, not what it is worth. Medium and not High because: the owner explicitly recorded that
**this does not have to ship before launch**, and the work is **not ready to plan** (see *The blocker*
below). Medium and not Low because it is the single benefit a paying player will notice **every session**,
and because `PROJECT.md` currently promises it.

## Status
🔲 Backlog

## Owner
fkit-producer

⚠️ **`fkit-producer`, not `fkit-coder`, and that is deliberate.** Phase 1 of this task is a **decision**
(*where does the client learn that a player paid?*) that nobody has taken, and a **product framing** the
owner has not been given yet (*what does this cost in ad revenue?*). It re-assigns to `fkit-coder` once
those are settled — see *What to build*, step 1.

## Context

### The claim this task exists to make true

[`ai-agents/knowledge-base/PROJECT.md:36`](../../../knowledge-base/PROJECT.md) states, of citizenship:

> *"Benefits include no interstitial ads for paid citizens, the full emoji set, and further perks
> (name change, verified icon, private lobbies, spectating) planned behind it."*

🚨 **The ad-free benefit is not implemented. There is no citizen check anywhere in the ad path.** Verified
in code 2026-09-12 at commit `b349210`:

- `FlashistFacade.showInterstitial()` — `src/client/flashist/FlashistFacade.ts:1237`, calling
  `this.yandexGamesSDK.adv.showFullscreenAdv({…})` at `:1253`. It checks **only** that the Yandex SDK is
  present. No profile read, no citizenship read, no entitlement read.
- **Six call sites**, none of them gated:
  `src/client/PublicLobby.ts:339` · `src/client/Main.ts:877` · `src/client/SinglePlayerModal.ts:501` ·
  `src/client/HostLobbyModal.ts:803` · `src/client/graphics/layers/WinModal.ts:325` ·
  `src/client/graphics/layers/GameRightSidebar.ts:130`.

**The claim in `PROJECT.md` stays.** The owner ruled 2026-09-12 that the right response is to **build the
benefit**, not to delete the claim — explicitly rejecting (a) correcting `PROJECT.md` to drop it and
(b) shipping ad-free before launch while dropping the emoji half. 🔒 **The owner's recorded condition:
they do not have to ship this before launch, but the claim comes out of the STORE COPY until this
ships.** See *Notes*.

### 🚨 The blocker — the client cannot read `is_paid_citizen` today. This is NOT "add a check."

⛔ **Read this before estimating.** The gate named below (`is_paid_citizen`) is **deliberately stripped
from every profile response the client can see.** Verified 2026-09-12:

- `src/core/profile/PlayerProfile.ts:55-58` — `PublicPlayerProfileSchema` is
  `PlayerProfileSchema.omit({ is_paid_citizen: true, citizenship_purchased_at: true, persistent_id: true })`.
- `src/profile-server/Routes.ts:169-171` — `toPublicProfile()` destructures `is_paid_citizen` and
  `citizenship_purchased_at` off the record and `void`s them.
- **The reason is written into the code** (`src/profile-server/Routes.ts:150-158`): the Sprint-4 profile
  read is **unauthenticated**, so returning paid state would let anyone who can guess a (non-secret)
  `yandexPlayerId` resolve **who paid**. The same comment carries
  `TODO(payments): once Yandex-signature auth lands, these can be returned to the verified owner of the
  profile.`

⇒ **The redaction is a deliberate privacy decision, not an oversight, and this task must not quietly
reverse it.** Delivering the benefit requires **first choosing a seam**, and that choice has not been
made by anyone. Candidate seams, named so step 1 does not start from a blank page — ⛔ **this list is
input to a decision, not a recommendation**:

1. **Land Yandex-signature auth on the profile read** and return paid state to the verified owner — the
   path the `TODO` anticipates. Largest scope; also unblocks the other planned perks.
   ~~**No task exists for it on any board.**~~ 📌 **CORRECTED 2026-09-12 — a task exists now:**
   [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md), filed on an owner ruling
   given live in session.
2. **Return a narrow, non-identifying entitlement** (e.g. an `ad_free: boolean` on the authenticated
   caller's own response only) rather than un-redacting `is_paid_citizen` wholesale.
3. **Read the entitlement client-side from the Yandex purchase/SDK state** rather than from the profile
   server at all. ⚠️ Unverified as feasible — nobody has checked whether the Yandex SDK exposes a durable
   owned-purchase query this client can trust.

⚠️ **Every one of the three has a different cost, a different privacy posture, and a different blast
radius. Do not pick one inside an implementation plan.**

📌 **UPDATED 2026-09-12 — THE SEAM CHOICE HAS MOVED OUT OF THIS BRIEF.** It is now
[`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md)'s phase 1, by owner ruling.
~~*"step 1 exists precisely so the owner and the architect settle it in the open"*~~ — step 1 of this
brief **no longer carries the seam question**; it carries only the **revenue framing** (see *What to
build*). ⛔ **The three candidates above are kept here as context, not as this task's decision to take.
Take them to `0250`.**

### The gate is `is_paid_citizen`, not `is_citizen` — and here is the tradeoff, stated not assumed

`PROJECT.md:36` says **"paid citizens"** specifically, and the owner's ruling was given against that
sentence. **This brief therefore specifies `is_paid_citizen`, and an implementer must not silently widen
it.** The two flags are genuinely different and both exist:

| Flag | Where | Means | Client-visible today? |
|---|---|---|---|
| `is_citizen` | `src/core/profile/PlayerProfile.ts:99`; reaches the client as `isCitizen` (`src/core/Schemas.ts:146,470`, `src/core/game/GameView.ts:342`) | Citizen by **either** path — 1,000 XP earned **or** paid (`src/core/profile/Citizenship.ts:15,25`) | **Yes** |
| `is_paid_citizen` | `src/core/profile/PlayerProfile.ts:100` | Paid the 99 ₽ only | **No — redacted, see above** |

~~🚩 **Flagged for the owner rather than decided here, because it is a product call and it changes who
pays nothing:** … ⛔ **The brief's specification stands at `is_paid_citizen` until the owner says
otherwise.** See *Open questions*.~~

### ✅ SETTLED — OWNER RULING, 2026-09-12, given live in session: **PAID CITIZENS ONLY.**

The owner was shown **both options with the tradeoff stated** and ruled **`is_paid_citizen`**.

| Option | What was put to them | Ruling |
|---|---|---|
| **`is_paid_citizen`** (paid only) | Matches [`PROJECT.md:36`](../../../knowledge-base/PROJECT.md); preserves ad revenue from XP-earned citizens; keeps ad-free a real reason to **pay**. ⚠️ **Costs the auth work** — the paid flag reaches no client today. | ✅ **CHOSEN** |
| `is_citizen` (earned **or** paid) | **Much cheaper** — `isCitizen` already reaches the client, so the blocker largely evaporates. ⚠️ Hands the **strongest paid benefit** to everyone who grinds the 1,000-XP threshold. | ⛔ Rejected |

🔴 **This is what makes [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) a
HARD PREREQUISITE rather than a nice-to-have.** The cheap option was the one that would have let this
task proceed without any auth work; the owner declined it with that cost in view. ⛔ **An implementer
must not re-open this to make the task cheaper — the cost was ruled on, not overlooked.**

### 🚨 This trades measurable revenue for conversion — frame it, do not assume it

**Advertising is the game's primary revenue today** (`PROJECT.md`, Monetization). This task deliberately
**removes** ad impressions from the players most likely to keep playing. That is a real, ongoing cost,
not a rounding error, and it is paid **forever per converted player** while the 99 ₽ is paid **once**.

⛔ **Do not treat "it converts more buyers" as established. Nobody has measured it here.** The honest
statement is: the benefit is a **conversion hypothesis**, its cost is an **arithmetic certainty**. The
owner is owed that framing **before** this ships, in numbers they can act on — see *What to build*,
step 1, and *Verification steps*.

## What to build

### Step 1 — the decision gate. ⛔ NOTHING BELOW MAY BE PLANNED OR BUILT UNTIL THIS CLOSES.

Two things must be settled with the owner (consulting `fkit-architect` for the technical half):

1. **The seam** — which of the three candidates above (or a fourth) carries the paid entitlement to the
   client, and what it costs. **If the answer is candidate 1, that work is its own task and this brief
   becomes blocked on it** — file it, do not absorb it.
2. **The revenue framing** — put in front of the owner, as numbers:
   - current interstitial impressions per player per session, and per **retained** player;
   - what share of impressions the six call sites contribute each (the WinModal and lobby-join
     placements are likely not equal, and suppressing all six is a choice, not a given);
   - the resulting revenue forgone per converted citizen per month, against the one-off 99 ₽.

   ⚠️ **If this data does not exist, say so plainly and scope measuring it** — do not estimate it into
   the brief and present the estimate as a finding.

🚩 **A live option the owner must be shown, not a strawman: suppress SOME placements, not all six.**
Killing the mid-session/post-match interstitials while keeping a lobby-entry one delivers most of the
felt benefit at a fraction of the revenue cost. ⛔ **This brief does not choose. It requires that the
owner be offered the choice.**

### Step 2 — implement the gate at ONE seam

- Resolve the paid entitlement **once**, into a single readable state on the client — not six
  independent reads at six call sites.
- Gate inside `FlashistFacade.showInterstitial()` (`src/client/flashist/FlashistFacade.ts:1237`), **not**
  at the six call sites, **unless step 1 ruled for partial suppression** — in which case the seam must be
  able to distinguish placements, and the brief's implementer must say how.
  **Rationale: one gate cannot be forgotten at a seventh call site; six can.**
- **Fail OPEN — show the ad — on every unknown.** SDK absent, profile unreachable, entitlement
  unresolved, degraded boot: the ad shows. ⛔ **An entitlement check that fails closed silently turns off
  the game's primary revenue for everybody the moment the profile server has a bad minute.**
  The codebase already has this failure shape on record — `PROFILE_INTERNAL_TOKEN` and
  `YANDEX_PAYMENTS_SECRET` are both fail-closed by design, and both have produced silent whole-feature
  outages (`0062`, `0195`).
- **Respect the citizenship kill switch.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`
  (`src/client/flashist/FlashistFacade.ts:184`, currently `false`) and the remote `citizenship_ui`
  Yandex experiment flag (`:174`) exist to turn citizenship surfaces off in an incident. **A new
  citizen-gated surface that ignores them reopens the hole `0236` closed.** With citizenship off, ads
  show.
- **Analytics.** Suppression must be observable, or step 1's cost estimate can never be checked against
  reality. Add an event for "interstitial suppressed for paid citizen". ⚠️ **Follow
  [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md) and the
  `flashistConstants.analyticEvents` enum — never an inline string — and update the reference doc.**

### Step 3 — out of scope, named so it is not absorbed

⛔ **Rewarded video is NOT in scope.** `PROJECT.md` promises no *interstitial* ads. A rewarded ad the
player chooses to watch for a benefit is a different thing and is not covered by this brief or by the
store-copy condition.

## Verification steps

1. **A paid citizen sees no interstitial at any of the six call sites** (or at exactly the subset step 1
   ruled), verified by running each of the six paths against a profile with `is_paid_citizen` true.
2. **A non-paying player still sees every interstitial**, verified on the same six paths. ⛔ **Both
   directions are required — a gate verified only on the citizen side is a gate that might be off for
   everyone.**
3. **An earned-only citizen** (`is_citizen` true, `is_paid_citizen` false) **still sees ads** — unless
   step 1 ruled for the widened gate, in which case invert this and say so.
4. **Fail-open proven, not assumed.** With the profile server unreachable, and again with the Yandex SDK
   absent, a paid citizen **sees the ad**. Run it; do not reason about it.
5. **Kill switch proven.** With `CITIZENSHIP_CARD_ENABLED` false, a paid citizen sees ads.
   ⚠️ **The remote `citizenship_ui` half cannot be exercised in `npm run dev`** — `checkExperimentFlag()`
   returns `true` unconditionally when the bundle's `GAME_ENV` is `dev`, and that value comes from the
   **webpack mode** (`webpack.config.js:334`), not from the npm script's `cross-env`. That is
   [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)'s subject.
   **Record the remote half as unverified here rather than claiming it.**
6. **Unit tests** covering the gate's true/false/unknown branches. Client-side, so `src/core/`'s
   mandatory-test rule does not bite — ⚠️ **but if the implementation touches `src/core/`, it does**
   (CLAUDE.md, *Testing*).
7. **The analytics event fires** on suppression and carries the placement.
8. **The step-1 revenue framing is written down and was actually put to the owner.** ⛔ **This task does
   not close with the gate shipped and the framing skipped** — the framing is the deliverable the owner
   asked for, not a preamble to it.

## Notes

- **Depends on:** 📌 **UPDATED 2026-09-12 — this is no longer "nothing on the boards."** The superseded
  text is struck, not deleted: ~~*"Depends on: nothing on the boards."*~~ and
  ~~*"⚠️ **"Depends on: nothing" does NOT mean ready to build.** No *task* gates this, but the work is
  blocked on a decision that has not been taken … If step 1 rules for candidate 1 (Yandex-signature auth
  on the profile read), that becomes a **new task** and this brief becomes blocked on it. **File it; do
  not absorb it.**"*~~

  ⇒ **[`0250-authenticated-profile-read-for-paid-entitlement`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md)
  — a HARD PREREQUISITE.** 🔴 **This task cannot be built until `0250` ships.** The owner ruled
  2026-09-12, live in session, that the profile-read work be **filed now as its own task** rather than
  left as a recorded gap here — on the reasoning that both this brief and
  [`0249`](../0249-citizen-gated-full-emoji-set/brief.md) would want it, so it should be filed **once**.
  ⚠️ **The conditional is gone:** the old wording made the new task contingent on step 1 choosing
  candidate 1. It is not contingent any more — *Ruling 2* below fixes this brief's gate at
  `is_paid_citizen`, and that flag reaches no client by **any** of the three candidate seams without
  `0250`'s design decision being taken first. **`0250` owns that decision; step 1 of this brief no
  longer does.**

  ⛔ **What did NOT change:** step 1's *revenue framing* (the ad-impression numbers) and the
  all-six-placements-or-a-subset question stay here and are **not** `0250`'s. `0250` carries the
  entitlement seam only.
- **Blocks:** nothing.
- 🚨 **STORE-COPY CONDITION — recorded on the owner's ruling, 2026-09-12, and it is the reason the
  `PROJECT.md` claim was allowed to stand:** **the Yandex Games store description must NOT promise
  ad-free play for citizens until this task ships.** ⛔ Whoever writes or edits the store copy must read
  this bullet. The same condition applies independently to
  [`0249`](../0249-citizen-gated-full-emoji-set/brief.md) for the emoji half.
- **Cross-references for whoever writes the store copy or the paid-citizenship launch plan:**
  - [`0018-citizenship-paid`](../0018-citizenship-paid/brief.md) — paid citizenship, the 99 ₽ path
    (mock-buildable scope).
  - [`0065-citizenship-paid-live-verification`](../0065-citizenship-paid-live-verification/brief.md) —
    the paid go-live gate.
  - [`0014-yandex-catalog-registration`](../0014-yandex-catalog-registration/brief.md) — catalog
    registration; the product ID is fixed at `citizenship`.
  - [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md) — the
    kill-switch launch gate this task's surface must respect.
- ⛔ **`PROJECT.md` is NOT edited by this task.** The owner ruled the claim stays, backed by this filed
  work. Do not "tidy" it.
- **Effort:** unknown until step 1 closes, and saying otherwise would be a guess. Step 2 alone is small
  (~0.5 day); step 1's seam could be anywhere from ~0.5 day (candidate 3, if the SDK cooperates) to a
  multi-day auth task (candidate 1).

## Open questions for the owner

1. ✅ **CLOSED 2026-09-12 BY OWNER RULING — `is_paid_citizen`, paid citizens only.** The superseded
   question, struck not deleted: ~~*"**`is_paid_citizen` or `is_citizen`?** The brief specifies **paid**,
   per `PROJECT.md:36`. Widening to all citizens is far cheaper to build but gives ad-free away to free
   earned citizens. **Producer's recommendation: keep it paid** — the whole point of the benefit is that
   it is a reason to pay."*~~ The owner was shown both options with the tradeoff stated and ruled
   **paid-only**, in agreement with the producer's recommendation. **Full record in *The gate is
   `is_paid_citizen`, not `is_citizen`* above.** ⇒ Makes
   [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) a hard prerequisite.
2. **All six interstitial placements, or a subset?** Suppressing some placements delivers most of the
   felt benefit at a fraction of the revenue cost.
   **Producer's recommendation: decide this against step 1's numbers, not now.**
3. **Is the ad-revenue data in question 2 available at all?** If not, measuring it is its own small task
   and should be filed before this one is planned.
