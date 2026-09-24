# Task — Analytics P1: Ad Impression Tier Tracking

## ID
0020

## Sprint

Sprint 4

📌 **Re-worded 2026-09-23 — OWNER RULING (Sprint 4 rescope, Q4 = (a))**, given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. **This task STAYS in Sprint 4, investigation first**: (1) how the client learns the **paid** tier — today the public profile strips `is_paid_citizen` (`src/client/PlayerProfileView.ts:116-121`), so this probably needs [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md); (2) whether interstitial suppression for paid citizens exists at all (none was found in `FlashistFacade.showInterstitial()` on 2026-09-23). The tier-free baseline events (`Ad:Interstitial` / `Ad:Banner`, see Notes) can be built now. ~~implement when citizenship tiers are live~~ — **no longer a gate** (struck, not deleted: it was the field's wording from filing until 2026-09-23).

✂️ **SCOPE NARROWED 2026-09-24: OWNER RULINGS at the approval of `plan-baseline.md`** (live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent):
- **"Yes, baseline only".** This task now builds **only** the tier-free `Ad:Interstitial` event, fired on a
  **real impression** (`showInterstitial()`'s `onClose` with `wasShown === true`), not on an attempt.
- **Banners, "Drop it".** `Ad:Banner*` is out of scope. See the struck *Banner ads* section for the reason.
- **Tier events, "New task, close 0020".** The tiered `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}`
  events moved to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md) (Backlog). **This task closes on the baseline alone.** `## Verification` items 1–4
  are deferred there.
- 🚩 **The investigation disproved this brief's premise** (`plan-baseline.md` Q2): **no ad suppression
  exists for any tier today.** `showInterstitial()` and its six call sites have no tier check.
  Suppression is [`0248`](../../backlog/0248-suppress-interstitial-ads-for-paid-citizens/brief.md). So paid citizens
  *do* see interstitials, and the "`PaidCitizen` should never fire" guard below does not hold yet.
- The text below is kept as written, with struck or annotated parts marked.

## Priority
Medium-high. Paid citizenship removes interstitial ads. Without tracking ad impressions by player tier, we cannot model the net revenue impact of a citizenship conversion — we don't know whether gaining a 99-ruble payment loses more in ad revenue than it gains.

## Status
✅ Done (agent-closed — not owner-verified) — **closed 2026-09-24 by a spawned `fkit-producer` (close step of `/fkit-sprint-ship-loop`, fkit-lead driver), no owner present (ADR-033 §5), on the owner's close ruling *"Close, note check as open"*.** Shipped the tier-free baseline only (owner-approved `plan-baseline.md`, *"Yes, baseline only"*): one event, `Ad:Interstitial`, fired once per real impression. Stateful review round 1 `closed-out` (reasoning-only second opinion, normal under ADR-042; R1 fixed). Driver re-verify 2026-09-24: targeted 13/13; tsc 0, lint 0, prettier clean; `CITIZENSHIP_CARD_ENABLED` still `false`. ⚠️ **The full `npm test` was NOT green on the first run:** one failure, `tests/profile-server/PaymentsRoutes.test.ts` › *"is 400 for an invalid signature"*, `socket hang up`. It is outside this task's change surface. `0197` was ruled out (no SIGSEGV, no new `.ips`). CLAUDE.md lists `socket hang up` as *seen, never traced*, so this is **likely the supertest flake family, not proven**. It passed on a single re-run: 147/147 suites, 2101/2101 tests. 🚩 **OWED, not done: the manual in-Yandex check.** On a Yandex draft or production build, start a mission and confirm **exactly one `Ad:Interstitial` log per ad actually shown**, and **none when the SDK declines**. It cannot be done locally, because there is no SDK. **The owner does it after the 2026-09-26 deploy.** By owner ruling it is **not a new task**; it is recorded as owed here. **Not verified in Yandex or in production.** · earlier: 🔄 In progress — driven by `fkit-sprint-ship-loop` from 2026-09-24 (investigation + plan step; owner-ruled "investigation only" for this run). Earlier: 🔲 Backlog

## Owner
fkit-coder

## Dependencies
- `0017-citizenship-earned` and `0018-citizenship-paid` — player tier must be defined and queryable client-side before these events can include tier dimension
- Player tier must be available synchronously at the point ads are shown (either from the player profile store or from a cached local flag)

---

## Context

We currently have no analytics events for ad impressions in our own tracking system (GameAnalytics). Yandex Games records ad impression data on its side, but we cannot cross-reference it with player behaviour data (match count, session depth, citizenship status) held in our own analytics.

The specific question this task answers: **how much ad revenue does a paid citizen generate compared to a free player?** If a paid citizen generates 80% of the ad revenue of a free player (because they still see banner ads), then the real net revenue per citizenship purchase = 99 rubles × (1 - Yandex cut) + lifetime delta in ad revenue. Without this data, pricing decisions are guesses.

---

## What to Build

Fire an analytics event each time an ad is shown to the player. Include the player's citizenship tier in the event string.

### Interstitial ads

| Enum key | Event string | Condition |
|---|---|---|
| `AD_INTERSTITIAL_GUEST` | `Ad:Interstitial:Guest` | Player is a Yandex guest (not logged in) |
| `AD_INTERSTITIAL_FREE` | `Ad:Interstitial:Free` | Player is logged in, not a citizen |
| `AD_INTERSTITIAL_EARNED_CITIZEN` | `Ad:Interstitial:EarnedCitizen` | Player is an earned citizen |
| `AD_INTERSTITIAL_PAID_CITIZEN` | `Ad:Interstitial:PaidCitizen` | Player is a paid citizen |

📌 *2026-09-24: this tier table moved to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md); the baseline builds only the tier-free `Ad:Interstitial`. The next sentence's premise is false today (no suppression exists, see the scope block above).*

Paid citizens do not see interstitials by design — `Ad:Interstitial:PaidCitizen` should never fire. Its presence in the enum is a guard: if it ever appears in the dashboard, there is a bug in the interstitial suppression logic.

### Banner ads

⛔ **DROPPED 2026-09-24: owner ruling *"Drop it"*** (live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent). The table is struck and kept visible.
**Why:** our code never shows a banner, so an impression cannot be observed from our code. The Fuse
script is commented out in both templates (`index.html:96`, `yandex-games_iframe.html:170`).
`GutterAds.show()` returns early inside the iframe (`GutterAds.ts:63-66`). Nothing calls Yandex
`showBannerAdv`. Any banner revenue shows up only in Yandex's own reports. Evidence: `plan-baseline.md` Q3.

| Enum key | Event string | Condition |
|---|---|---|
| ~~`AD_BANNER_GUEST`~~ | ~~`Ad:Banner:Guest`~~ | ~~Player is a Yandex guest~~ |
| ~~`AD_BANNER_FREE`~~ | ~~`Ad:Banner:Free`~~ | ~~Player is logged in, not a citizen~~ |
| ~~`AD_BANNER_EARNED_CITIZEN`~~ | ~~`Ad:Banner:EarnedCitizen`~~ | ~~Player is an earned citizen~~ |
| ~~`AD_BANNER_PAID_CITIZEN`~~ | ~~`Ad:Banner:PaidCitizen`~~ | ~~Player is a paid citizen~~ |

### Where to instrument

📌 *2026-09-24: for this task, the one instrumentation point is `showInterstitial()`'s `onClose(wasShown === true)`. The tier lookup and resolution order below moved to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md). Its paid tier may **not** use the `is_citizen && citizenship_earned_at === null` derivation (owner ruling *"Must-fix in 0250"*).*

Find the call sites in the client where interstitial and banner ads are shown via the Yandex SDK. These are already in `FlashistFacade` or the ad management layer. Add the analytics fire immediately after each successful ad show call, using the player's current tier at that moment.

**Tier lookup:** add a `getPlayerTier(): 'guest' | 'free' | 'earned_citizen' | 'paid_citizen'` helper to `FlashistFacade` once citizenship is live. Use this helper at every ad fire point — do not read citizenship state directly in the ad layer.

### Tier resolution order

```
if (player is Yandex guest)    → 'guest'
else if (player.isPaidCitizen) → 'paid_citizen'
else if (player.isCitizen)     → 'earned_citizen'
else                           → 'free'
```

---

## Analytics Reference Updates

📌 *2026-09-24: for this task, only the baseline key `Ad:Interstitial`. The tier keys belong to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), and the banner keys were dropped.* ~~Add all eight enum keys to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.~~

---

## Verification

1. ~~Play as a guest — trigger an interstitial ad — confirm `Ad:Interstitial:Guest` fires, no other `Ad:Interstitial:*` fires.~~ *(Deferred to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), 2026-09-24.)*
2. ~~Play as a logged-in, non-citizen player — trigger an interstitial — confirm `Ad:Interstitial:Free` fires.~~ *(Deferred to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), 2026-09-24.)*
3. ~~Play as a paid citizen — confirm no `Ad:Interstitial:*` fires (paid citizens are exempt). Confirm `Ad:Banner:PaidCitizen` fires when a banner is shown.~~ *(Deferred to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), 2026-09-24.)*
4. ~~Play as an earned citizen — trigger an interstitial — confirm `Ad:Interstitial:EarnedCitizen` fires.~~ *(Deferred to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), 2026-09-24.)*
5. *(2026-09-24: read as "the baseline key"; the rest are [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md)'s.)* Confirm all eight enum keys appear in `ai-agents/knowledge-base/analytics-event-reference.md`.
6. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.

---

## Notes

- **Depends on:** nothing for the scope this task shipped. ~~flattened from the brief's `## Dependencies` section above (left unedited):
  `0017-citizenship-earned` and `0018-citizenship-paid`, because the player tier must be defined and
  queryable client-side before these events can carry a tier dimension; and the player tier must be
  available synchronously at the point ads are shown, either from the player profile store or from a
  cached local flag. The Sprint field adds that this is implemented when citizenship tiers are live.
  Full prose above; this bullet is the machine-readable form beside it.~~ *(Struck 2026-09-24, kept
  visible. These are **tier** dependencies, and they are moot for the tier-free `Ad:Interstitial` baseline
  this task shipped. The tier work moved to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md),
  whose own `**Depends on:**` carries the live dependencies.)*
  📌 *2026-09-23: `0017` is closed as built + reviewed (owner ruling; its production checks moved to
  `0296`). The tier is defined in code, but citizenship tiers go live only at the flip owned by `0065`
  §6 — so "implemented when citizenship tiers are live" now waits on that flip. `0018` is unchanged.*
  📌 **Superseded later on 2026-09-23 — OWNER RULING (Sprint 4 rescope, Q4 = (a))**, given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (ADR-021); ⛔ not producer precedent. **This task no longer waits on the flip.** It stays in Sprint 4, **investigation first**: how the client learns the paid tier, and whether interstitial suppression for paid citizens exists (see `## Sprint`). `0018` (now Sprint 5) is code-complete; its remaining step is the launch, not code, so it is not a build wait here. 🚨 Sprint 4 closes AT THE DEPLOY (Q7 = (b)), and whatever of this task is unfinished then rolls to Sprint 5. Work in progress must sit on a branch, out of the working tree, at runbook W12.
- *(2026-09-24: moot. Banners were dropped from scope.)* Banner ad frequency is high — if `Ad:Banner:*` fires on every render tick rather than on each unique impression, it will pollute the analytics dashboard. Confirm the instrumentation point corresponds to a new impression show call, not a per-frame check.
- *(2026-09-24: this is now the whole of this task's scope, for interstitials only.)* Before citizenship ships, consider adding a simpler `Ad:Interstitial` and `Ad:Banner` event (no tier dimension) in the same task, as a baseline. This gives us pre-citizenship ad frequency data to compare against.
- 📌 **2026-09-24: the dependencies above describe the tier events, which moved to [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md).** The baseline this task now builds needs no tier, so it waits on none of them. The `**Depends on:**` bullet is left as written; the producer flags it rather than rewriting it. **Split out:** [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md), which is linked back here.
