# Tiered ad-impression analytics (`Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}`)

## ID
0299

> ℹ️ **ID allocation, checked 2026-09-24 before filing. `0299` is free.** The checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** Task folders across `backlog/`, `done/` and `cancelled/`: the highest ID on disk is `0298`, and
> `ls -d ai-agents/tasks/*/0299-*/` has no matches. **2.** `## ID` fields: the highest is `0298`, and
> `grep -rn "^0299$" ai-agents/tasks/ --include=brief.md` has zero hits. **3.** `grep -rnw "0299" .claude/`
> has zero hits. **4.** A repo-wide word grep (`node_modules`, `.git` and `static` excluded, `.svg` filtered)
> finds zero files. The duplicate-prefix check over task folders is empty. (0299 was also held free
> earlier the same day when the owner ruled that `ADMIN_TOKEN` stays a note in `0005`.)

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-24 by a spawned `fkit-producer` with no owner channel, on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021); ⛔ not producer
precedent.** Owner, verbatim: *"New task, close 0020"*. [`0020`](../../done/0020-analytics-p1-ad-impression-tier/brief.md)
was narrowed the same day (*"Yes, baseline only"*) to the tier-free `Ad:Interstitial` event. It closes
on that baseline alone. This task carries the **tier dimension** it no longer builds.

**Why the tiers matter** (from `0020`'s *Priority* and *Context*): without ad impressions by player
tier, we cannot model what a citizenship conversion costs in ad revenue. That means we cannot tell
whether a 99-ruble purchase gains more than the ads it removes.

**What `0020`'s investigation found** (`0020/plan-baseline.md` § *Investigation findings*, 2026-09-24):

- **No ad suppression exists for any tier today.** `showInterstitial()` (`FlashistFacade.ts:1289-1334`)
  and its six call sites have no tier check. Suppression for paid citizens is
  [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md), which is blocked on
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md). ⇒ Until `0248` ships,
  `Ad:Interstitial:PaidCitizen` is **not** the "should never fire" bug guard that `0020`'s brief
  described. Any paid citizen would fire it.
- **The tier is not available synchronously at ad time**, except guest vs logged-in:
  - **Guest / logged-in:** available now and synchronous (`FlashistFacade.isYandexLoggedIn()`).
  - **`:Free` needs the profile.** "Logged in and not a citizen" can only be known after a profile read.
    Labelling every logged-in player `Free` would silently go wrong once citizens exist.
  - **Earned:** `citizenship_earned_at` is in the public projection, but no profile read happens in
    production today. The only caller is `CitizenshipCard`, which is gated off by `CITIZENSHIP_CARD_ENABLED`.
    The read is also async, and nothing caches a tier.
  - **Paid:** the proper path is `0250`. None of it exists yet.
- **Banners are out of scope for good.** Our code never shows a banner, so there is no impression
  point to hook. Owner ruled *"Drop it"* for `0020`, and that carries here. This task is interstitials only.

## What to build

1. **A synchronous tier cache** read at ad time, for example `getPlayerTier()` on `FlashistFacade`,
   as `0020` originally proposed. It is filled by a profile read that is **not** tied to the citizenship
   card. The read and cache design is the coder's plan, not this brief's.
2. **An `Unknown` bucket.** An ad shown before the first profile read completes (or when the read fails)
   must land in `Ad:Interstitial:Unknown`, never in a guessed tier. The event list is therefore
   `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen,Unknown}`. Confirm the exact list with the
   owner at plan time, because `Unknown` is new relative to `0020`'s original four.
3. **Fire the tiered event at the same seam as `0020`'s baseline:** `showInterstitial()`'s
   `onClose(wasShown === true)`, a real impression and not an attempt. Whether the tier-free
   `Ad:Interstitial` keeps firing beside it is a plan-time question for the owner. It changes how
   dashboards compare before and after.
4. **The paid tier only through `0250`'s sanctioned seam.** ⛔ **Explicitly ruled out: deriving
   `PaidCitizen` from `is_citizen && citizenship_earned_at === null`.** That derivation is exactly the
   paid-state leak that `0250` must close (owner ruling 2026-09-24, *"Must-fix in 0250"*). Building on it
   would lock the leak in as a feature.
5. **Enum keys and reference doc:** every new key in `flashistConstants.analyticEvents`, documented in
   `ai-agents/knowledge-base/analytics-event-reference.md`. No inline event strings.

## Verification steps

1. Guest session: an interstitial that is shown fires `Ad:Interstitial:Guest` and no other tiered variant.
2. Logged-in non-citizen, after the profile read: a shown interstitial fires `Ad:Interstitial:Free`.
3. Earned citizen, after the profile read: a shown interstitial fires `Ad:Interstitial:EarnedCitizen`.
4. Paid citizen, through `0250`'s seam: `Ad:Interstitial:PaidCitizen` fires if `0248` has not shipped.
   Once `0248` ships, **no** interstitial fires for them.
5. An interstitial shown before the first profile read completes fires `Ad:Interstitial:Unknown`, never
   `:Free`. Test it by delaying the read.
6. `onClose(false)`, meaning the SDK declined, fires no tiered event.
7. A test proves the tier code never computes paid from `is_citizen` / `citizenship_earned_at`: a
   fixture with `is_citizen: true, citizenship_earned_at: null` and no `0250` paid signal must **not**
   yield `PaidCitizen`.
8. Every key appears in `analytics-event-reference.md`, and no event string is written inline.
9. `npm test` passes. Any `src/core/` change carries tests.

## Notes

- **Depends on:** [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) (the paid tier, through an authenticated read, with the paid-state leak fixed) and [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (the Bearer client session, which must be deployed to production). The earned tier also needs a synchronous tier cache fed by a profile read outside the citizenship card; this task builds that cache itself (What to build 1).
- **Blocks:** nothing
- **Split from:** [`0020`](../../done/0020-analytics-p1-ad-impression-tier/brief.md), 2026-09-24 (owner: *"New
  task, close 0020"*). `0020` closes on the tier-free `Ad:Interstitial` baseline alone.
- **Related:** [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md). Until it ships,
  paid citizens do see interstitials, so `:PaidCitizen` is real data and not a bug guard.
- **Stale doc comment, a finding and not a task:** `src/core/profile/PlayerProfile.ts:55` still says
  *"Sprint 4's read is unauthenticated"*. `GET /v1/profile` now goes through a Bearer session. Recorded
  here and in `0250`; fix it with whichever change next touches that schema.
- **Event budget:** interstitials are rare, and Yandex caps their frequency, so there is no pressure on
  GameAnalytics' 500 events per user per day limit (`0020/plan-baseline.md` Q3).
- **No secrets in any artifact.**
