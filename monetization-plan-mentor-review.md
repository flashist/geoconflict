# Geoconflict — In-App Monetization Plan

> **Context for reviewer:** Geoconflict is a real-time territory-control browser game published on Yandex Games (Russia). It is a fork/adaptation of the open-source OpenFront.io. This document covers the full monetization design and implementation roadmap for mentor review. Player metrics in Section 2 are internal — please treat as confidential.

---

## 1. Strategic Sequence — Why This Order

The game's primary revenue today is **ad impressions** (interstitial and sticky-banner ads served by Yandex Games). Before adding paid features, we ran three retention-focused sprints:

- **Sprint 1** — Analytics baseline, crash monitoring, ghost rate investigation
- **Sprint 2** — Tutorial, auto-spawn, UX clarity for new players
- **Sprint 3** — Server observability, stale-build handling, map preload

The reasoning: ad impressions scale with engaged sessions. Fixing retention first means every monetization feature launches into a larger, more engaged player base. Yandex Games also promotes higher-revenue titles, so the effect compounds: better retention → higher revenue per player → better ranking → more DAU → more revenue.

**Sprint 4 onwards is where monetization begins.**

---

## 2. Player Baseline (as of Sprint 3, March 2026)

| Platform | DAU | Returning session | New player session |
|---|---|---|---|
| Desktop | ~3,500 | 37–40 min | 20–25 min |
| Mobile | ~700 | 20 min | 11 min |

- Ghost rate (players who join but never spawn): ~20% on both platforms — addressed in Sprints 1–2
- Mobile iOS shows near-zero return rate
- Desktop is the core audience; deep mobile optimization is parked until mobile DAU > 1,500

---

## 3. Revenue Streams — Overview

| Stream | Sprint | Status |
|---|---|---|
| Ad impressions (existing) | Ongoing | Live |
| Paid citizenship (one-time purchase) | Sprint 4 | In design |
| Earned citizenship (XP progression) | Sprint 4 | In design |
| In-game cosmetics (flags, patterns, nickname styling) | Sprint 5 | Planned |
| Coin economy + rewarded ads | Sprint 5 | Planned |
| Paid clan features | Sprint 5 | Planned |
| Premium replay access | Sprint 5 | Planned |
| Custom uploaded flags/patterns | Sprint 5 | Planned |
| Paid campaign map packs | Sprint 6 | Planned |

---

## 4. Sprint 4 — Citizenship & Payment Foundation

### 4.1 Core Concept: Citizenship

Citizenship is the foundational membership tier. There are two paths to it:

**Earned path (XP):**
- 10 XP per qualifying match
- 1,000 XP threshold = citizenship (~100 qualifying matches)
- XP continues accumulating after citizenship (future milestone hooks)
- This path can ship before the Yandex payment catalog is approved — no dependency

**Paid path:**
- One-time purchase: 99 rubles (~50% goes to Yandex + taxes)
- Sets both `isCitizen = true` and `isPaidCitizen = true` (preserves distinction for future targeting)

**Qualifying match definition (locked):**

| Outcome | Awards XP? |
|---|---|
| Eliminated by another player or bot | Yes |
| Survived to match end (any outcome) | Yes |
| Voluntary Leave mid-match | No |
| Disconnected, did not return | No |
| Never spawned | No |

**Design rationale:** The dual path avoids pay-to-win concerns — any player can earn citizenship through play. The paid path rewards impatient or committed players and generates early revenue. The 100-match threshold is long enough to have meaning but not so long that it feels unreachable.

### 4.2 First Citizenship Benefits

The benefits planned for Sprint 4 are modest but visible:

- **Name change** — citizens can change their display name (requires moderation)
- **Citizen verified icon** — visible badge in lobbies and match player list, distinguishing citizens from non-citizens

The verified icon serves a dual purpose: social status for citizens, and a visible signal to non-citizens that citizenship exists and is worth pursuing.

### 4.3 Start Screen Redesign

The citizenship progress UI requires a redesigned start screen (the current layout has no room for a persistent citizenship surface). The locked design decisions:

- Minimum supported usable area: 360×430 px
- Two-tab layout: Multiplayer (default) and Single Player
- Full-width citizenship card above the tabs
- Guest (non-Yandex-logged) state shows a Yandex login CTA rather than hiding the citizenship surface entirely — this preserves the conversion hook
- Last active tab persists across sessions

**This redesign is a prerequisite for all citizenship UI** — it is not a polish task.

### 4.4 Player Profile Store

The first persistent per-player database in the codebase. Investigation findings:

- **Database:** PostgreSQL on the game VPS (same server, sibling container) — not a managed cloud database, not MongoDB
- **Initial schema:** `player_profiles` table plus an idempotent `player_match_credits` table for XP recording
- **Match crediting:** happens on the game server at match end; requires one additional per-player state summary at end-of-match (the server does not currently track spawn/elimination per player)
- **Identity gap:** the server currently only sees an internal `persistentID`. A verified Yandex player ID claim must be added to the join/auth path before paid citizenship can safely attach entitlements to a player profile

### 4.5 Yandex Payments Integration

Investigation findings on the Yandex Games payments SDK:

- API: `ysdk.getPayments({ signed: true })`, `getCatalog()`, `purchase()`, `getPurchases()`, `consumePurchase()`
- No webhook exists for Yandex Games purchases; the safe pattern is client-triggers-server with signed token verification
- **Session catalog caching:** fetch catalog once per session in `FlashistFacade`; gracefully return empty outside Yandex or on fetch failure; gate all purchase UI on catalog item presence
- **Server verification flow:** client passes signed purchase token → server verifies signature → server persists entitlement idempotently → server calls `consumePurchase()` → server confirms grant to client
- **Startup reconciliation:** call `getPurchases()` at session start to catch any grants that completed while the player was offline
- **Current state:** no payment integration exists anywhere in the codebase; cosmetics previously went through a Stripe flow that is no longer in use

**Non-engineering prerequisite:** Yandex catalog items must be registered in the Yandex Games dashboard manually. Approval takes several days and is the main non-engineering blocker for paid citizenship.

### 4.6 Personal Inbox (8d-B)

A personal messaging surface for citizens:
- Server-side messages from the game to individual players
- Initial triggers: citizenship earned, citizenship purchased, name change approved/rejected
- Builds on the already-shipped global announcements feature (8d-A)
- **Blocked by:** player profile store going live

### 4.7 Sprint 4 Implementation Dependency Graph

```
Start Screen Redesign (impl)
    └── Citizenship XP Counter & Progress UI

Player Profile Store (impl)
    ├── Citizenship: Earned Path
    ├── Personal Inbox (8d-B)
    └── Name Change (citizens only)

Yandex Payments (impl)  +  Yandex Catalog Approval
    └── Citizenship: Paid Path
```

The earned path and paid path are independent of each other — earned citizenship can ship first.

---

## 5. Sprint 5 — Full F2P Loop

Sprint 5 builds on the citizenship/payments infrastructure from Sprint 4.

### 5.1 Coin Economy + Rewarded Ads

- Post-match coin rewards based on performance
- Rewarded ads: double post-match coins, or a daily "watch once for X coins" grant
- Coins spent on cosmetics (basic flags, colors)
- Some cosmetics earnable via coins; premium cosmetics (patterns, special effects) are money-only
- **Key constraint:** leaderboard badges and verified nickname marks must NOT be purchasable with coins — earned/purchased achievements stay distinct from the coin economy
- Ships to all users simultaneously (parallel pricing models create fairness issues)

**Effort:** 3–4 weeks

### 5.2 Cosmetics — Flags and Territory Patterns

- Re-enable existing flags feature (currently disabled)
- Re-enable territory patterns (currently disabled)
- Both are high-visibility in-match features and the primary upsell surface for the coin/purchase economy
- A/B tested before full rollout

### 5.3 Nickname Styling System (upsell)

For players who have purchased citizenship:
- Nickname background color
- Nickname border
- Nickname text color
- Sold separately (~49–99 rubles each) or as a bundle (149–199 rubles)
- Hard readability constraint: any style that makes the nickname unreadable during a match is rejected
- **Depends on:** centralized name rendering component (from the citizenship verified icon work in Sprint 4)

**Effort:** 1–2 weeks

### 5.4 Leaderboard Rewards

Adds a prestige layer on top of a core leaderboard:
- Top 10 players (global or monthly) get a visible badge in every match they play
- Players who finish top 3 on a monthly leaderboard keep that month's badge permanently — collectible prestige that does not disappear when rank is lost
- Badges are purely social proof; nothing purchasable
- A/B tested

**Effort:** 3–5 days

### 5.5 Map Voting (Citizenship Gate)

- Maps alternate: random → voted → random → voted (repeating)
- Voting happens during the preceding match (no dedicated vote screen)
- Citizens can vote; non-citizens can see the vote panel but not cast a vote — keeps the citizenship perk visible
- Tiebreaker: random among all tied maps
- Cooldown: recently played maps excluded from the vote pool
- **Depends on:** citizenship verified status queryable server-side

**Effort:** 1–2 weeks

### 5.6 Replay Access as Premium Feature

The replay system is already built. Extended access is a natural upsell:
- Free tier: last 3 matches
- Premium tier: last 20+ matches, shareable links
- **Depends on:** tier/pricing system from the coin economy task

**Effort:** 3–5 days

### 5.7 Clans

Social retention and monetization:
- Free: clan tag + auto-team placement in Team mode
- Paid: clan banner (custom territory color/pattern in team matches), clan stats, match history together
- Small founding fee (99–149 rubles) to filter throwaway clans
- **Gate condition:** only build when analytics confirms lobbies are consistently filling and match completion is strong — the auto-team mechanic only feels meaningful when clan members can actually find each other in matches
- A/B tested

**Effort:** 3–4 weeks

### 5.8 Custom Uploaded Flags and Patterns

Highest tier of visual customization. Paid citizens only (not earned citizens):
- Player uploads their own flag or territory pattern
- Image must pass moderation before appearing in any match
- V1: flags only (simpler than patterns)
- Pricing: 199–399 rubles per upload (higher price signals exclusivity and limits submission volume)
- Moderation approach: manual review for V1 (acceptable at current player counts); automated content screening API if volume grows
- Personal inbox notification on approval/rejection
- Refund policy required before launch; clear Yandex content policy compliance

**Effort:** 2–3 weeks

---

## 6. Sprint 6 — Content Monetization

- Historical multiplayer maps (content-led acquisition, especially for mobile)
- Paid campaign map packs
- Mobile warning screen (sets honest expectations; improves Yandex retention signals)

This sprint depends on the payments and citizenship infrastructure from Sprint 4 being fully live.

---

## 7. Experiments Policy

Yandex Games provides a native A/B experiments API. The default rule: any additive feature that does not break backward compatibility is tested via this API before full rollout.

**Excluded from experiments:**
- Analytics layer (circular — you can't measure an experiment using the thing you're experimenting on)
- Economy/pricing (player fairness — two players earning or spending at different rates creates support and trust issues)
- Changes that require disproportionate engineering to maintain two parallel versions
- Uniform-by-nature changes (rendering fixes, performance)

Features that can ship to all: pricing, coin economy, replay tiers.
Features that are A/B tested: leaderboard badges, clan features, map voting, cosmetics, nickname styling.

---

## 8. Key Risks and Open Questions

These are areas where feedback would be most useful:

**8.1 Citizenship threshold — is 100 matches the right target?**
The XP economy is set at 10 XP/match and 1,000 XP for citizenship. At typical session lengths (~20–37 min) and match durations, this likely maps to several weeks of regular play. The goal is to make earned citizenship feel meaningful without being discouraging.

**8.2 Paid path pricing — 99 rubles**
After Yandex's ~50% cut plus taxes, the net is modest. This is intentionally low — the goal in Sprint 4 is to validate that players will pay, not to maximize ARPU immediately. The Sprint 5 cosmetics pricing (149–199 rubles) is where higher ARPU begins.

**8.3 Identity gap — Yandex login rate**
The player profile store requires a verified Yandex player ID, but not all players are logged into Yandex Games. Guest players exist. The planned approach is to show a Yandex login CTA on the citizenship surface for guests — it converts citizenship interest into a login conversion. The risk is that if the Yandex login friction is high, a significant fraction of interested players will drop off rather than complete citizenship.

**8.4 Moderation overhead**
Name changes (Sprint 4) and custom uploads (Sprint 5) both require moderation. At current scale (~3,500 DAU desktop), this is manageable manually. If the game grows significantly, the manual moderation queue becomes a bottleneck. The Sprint 5 brief acknowledges this and recommends an automated content screening API as a scale path, but V1 is manual.

**8.5 Coin economy balance**
The coin earn and spend rates are not yet set. Once published, changing them creates player backlash (players who banked coins under one rate feel cheated by a change). This needs careful design before launch.

**8.6 Clan feature gate**
The clans feature is explicitly gated on lobby health — it only works if clan members can find each other in matches. The current DAU (~3,500 desktop) may or may not be sufficient. The brief recommends confirming lobby fill rates before building. The risk is building the feature and finding it rarely triggers.

**8.7 No ad removal option**
The current design does not include an "ad-free" tier as a citizenship benefit. Paid citizens only lose interstitials (a lesser benefit), but sticky banner ads persist for all tiers. This may be a missed monetization hook — players often cite ad removal as the primary reason to pay in browser games.

**8.8 Replay as premium — discoverability**
Replay access is already built. Turning it into a premium feature means free players will lose access to older replays when the tier is introduced. This is a potential retention risk (players who relied on replays may feel something was taken away).

---

## 9. What Is Already Shipped

For context, the following Sprint 4 items are already live:

- Global announcements (in-game changelog / update notifications)
- Email subscription modal (start screen and win screen)
- Solo mode opponent win condition fix
- Tutorial: bot count reduced, nation opponents removed, build menu locked during tutorial step 5
- Telegram and VK community channel CTAs (experiment-gated)
- AI lobby slot bug fix
- Server observability (OTEL/Uptrace)
- Stale build detection and non-dismissible refresh modal
