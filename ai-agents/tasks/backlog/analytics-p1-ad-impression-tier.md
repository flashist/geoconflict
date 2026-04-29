# Task — Analytics P1: Ad Impression Tier Tracking

## Sprint
Sprint 4 — implement when citizenship tiers are live

## Priority
Medium-high. Paid citizenship removes interstitial ads. Without tracking ad impressions by player tier, we cannot model the net revenue impact of a citizenship conversion — we don't know whether gaining a 99-ruble payment loses more in ad revenue than it gains.

## Dependencies
- `s4-citizenship-earned.md` and `s4-citizenship-paid.md` — player tier must be defined and queryable client-side before these events can include tier dimension
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

Paid citizens do not see interstitials by design — `Ad:Interstitial:PaidCitizen` should never fire. Its presence in the enum is a guard: if it ever appears in the dashboard, there is a bug in the interstitial suppression logic.

### Banner ads

| Enum key | Event string | Condition |
|---|---|---|
| `AD_BANNER_GUEST` | `Ad:Banner:Guest` | Player is a Yandex guest |
| `AD_BANNER_FREE` | `Ad:Banner:Free` | Player is logged in, not a citizen |
| `AD_BANNER_EARNED_CITIZEN` | `Ad:Banner:EarnedCitizen` | Player is an earned citizen |
| `AD_BANNER_PAID_CITIZEN` | `Ad:Banner:PaidCitizen` | Player is a paid citizen |

### Where to instrument

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

Add all eight enum keys to `flashistConstants.analyticEvents` and document in `ai-agents/knowledge-base/analytics-event-reference.md`.

---

## Verification

1. Play as a guest — trigger an interstitial ad — confirm `Ad:Interstitial:Guest` fires, no other `Ad:Interstitial:*` fires.
2. Play as a logged-in, non-citizen player — trigger an interstitial — confirm `Ad:Interstitial:Free` fires.
3. Play as a paid citizen — confirm no `Ad:Interstitial:*` fires (paid citizens are exempt). Confirm `Ad:Banner:PaidCitizen` fires when a banner is shown.
4. Play as an earned citizen — trigger an interstitial — confirm `Ad:Interstitial:EarnedCitizen` fires.
5. Confirm all eight enum keys appear in `ai-agents/knowledge-base/analytics-event-reference.md`.
6. Confirm no event strings are written inline — all references go through `flashistConstants.analyticEvents`.

---

## Notes

- Banner ad frequency is high — if `Ad:Banner:*` fires on every render tick rather than on each unique impression, it will pollute the analytics dashboard. Confirm the instrumentation point corresponds to a new impression show call, not a per-frame check.
- Before citizenship ships, consider adding a simpler `Ad:Interstitial` and `Ad:Banner` event (no tier dimension) in the same task, as a baseline. This gives us pre-citizenship ad frequency data to compare against.
