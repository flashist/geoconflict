# Geoconflict — Execution Plan

## Strategic Logic

The current primary revenue source is ad impressions (interstitial and sticky-banner ads). Every improvement that keeps players in the game longer, brings them back for another match, or converts curious new players into active ones **directly increases ad revenue without touching the monetization system**. Fixing retention first is therefore the correct sequence — a larger, more engaged player base also makes every future monetization feature more effective.

Additionally, Yandex Games promotes titles that generate more revenue per player. This means that once monetization features are added, improvements to engagement and session length compound: better retention → higher revenue per player → better Yandex ranking → more DAU → more revenue.

---

## Sprint 1 — Stop the Bleeding

**Goal:** Reduce the ghost rate (30–50% of lobby players never becoming active) and crash-driven abandonment. All items are small and can ship within one week.

### 1. Analytics — Session & Match Events
**Effort:** 1–2 days

Right now decisions are made without data. A lightweight event system is the foundation for measuring whether anything else works.

Minimum viable events to track:
- Match started
- Match completed
- Player eliminated
- Session duration
- Tab/browser close mid-match

Even a simple self-hosted solution (Plausible, or a basic Postgres table) is sufficient. Without this, it's impossible to measure the impact of items 2–11.

---

### 2. Tab Crash Reconnection
**Effort:** 2–3 days

A significant portion of the ghost rate is likely players whose browser tab crashes mid-match, especially on mobile. Currently they have no way back in.

**Proposed flow:**
1. On game join, write `activeMatchId` to `localStorage`.
2. On clean exit (match ends normally), clear it.
3. On next game load, if `activeMatchId` is present, call a lightweight server endpoint to check: is this match still active, and is this player still alive in it?
4. If yes — show a "Rejoin your match?" prompt and reconnect automatically.
5. If the player was eliminated while disconnected — show a match summary instead of reconnecting to a lost game.

**Technical note:** `MarkDisconnectedExecution` already exists in the codebase, meaning disconnection state is already tracked server-side. This is not starting from scratch.

---

### 3. Mobile Quick Wins
**Effort:** 2–3 days

Mobile players are abandoning or crashing at a disproportionate rate. Several high-impact fixes require only configuration or conditional rendering changes — no architecture work.

**Quick wins:**
- Disable retina / HiDPI rendering on mobile (single config flag, meaningfully reduces GPU load)
- Cap render framerate to 30fps on mobile (reduces CPU/GPU pressure)
- Disable or reduce the FX particle effects layer on mobile
- Disable or reduce other non-essential visual layers on small screens

These won't fix the deep rendering problems on low-end Android, but they will meaningfully reduce crash rates and keep more mobile players in matches long enough to generate ad impressions.

---

## Sprint 2 — Fix Onboarding

**Goal:** Convert curious new players into players who complete at least one full match. This is the single biggest lever on long-term DAU quality.

### 4. Tutorial — Guided First Bot Match
**Effort:** 1–2 weeks

Currently there is no tutorial. A first-time player opening Geoconflict faces a complex map with no context — territory expansion, economy, alliances, nukes — and will close the tab within 90 seconds without guidance.

**Design principles:**
- Auto-trigger on first game open (detect via `localStorage` flag)
- Run as a singleplayer bot match on a small map, not a separate "tutorial mode"
- The singleplayer mission infrastructure is already built — a tutorial is essentially Mission Level 0 with a tooltip overlay system
- Show 4–5 tooltip moments at natural decision points:
  - When troops first become available: *"Click a neighboring territory to attack"*
  - When gold accumulates enough to build: *"You can now build a City"*
  - When an alliance request arrives: explain accept/reject
  - When a nuke becomes affordable: brief explanation
- **Critical design rule:** The player must *win* the tutorial match. End on a positive memory. A 3–4 minute bot map where victory is achievable creates the motivation for a second session.

---

## Sprint 3 — Deepen Retention (Data-Driven)

**Goal:** Address the deeper mobile performance issues, but only once analytics from Sprint 1 confirms the investment is justified.

### 5. Deep Mobile Rendering Optimization
**Effort:** 3–6 weeks

The underlying problem for mid-range Android devices is that Pixi.js canvas rendering with multiple layers, real-time unit movement, and 32 tile types is genuinely heavy. The `TerrainLayer` and `TerritoryLayer` redrawing on every tick is the likely primary culprit for tab crashes.

**Proper fixes (significant engineering work):**
- Dirty-rect rendering: only redraw tiles that have actually changed
- Viewport culling: don't render tiles outside the visible screen area
- Texture atlasing review and optimization

**Gate this on data:** Only proceed if analytics from Sprint 1 shows that mobile represents a significant portion of *active* (non-ghost) players. Do not invest 3–6 weeks based on assumption.

---

## Sprint 4 — First Monetization Layer

**Goal:** Add revenue streams that are low-complexity, safe for Yandex's platform rules, and generate a monetization signal that improves Yandex's algorithmic promotion of the game.

### 6. Rewarded Ads — Minimal Version
**Effort:** 2–3 days

Rewarded ads can add 10–20% to ad-generated revenue and — critically — signal monetization activity to Yandex's promotion algorithm. The Yandex SDK is already partially integrated.

**Minimal implementation (no coin economy required):**
- On the post-match screen, offer: *"Watch an ad to unlock this week's featured color palette for 24 hours"*
- One rewarded ad placement, one temporary cosmetic reward
- No currency, no balance work, no economy design

This validates whether players engage with rewarded ads at all. That data informs the full coin economy design in Sprint 5.

---

### 7. Paid Nickname Change
**Effort:** 1 week

Currently non-logged-in players are `AnonXXXX`. Yandex-logged-in players use their Yandex username. A paid nickname change gives players identity expression while respecting Yandex's strict UGC rules through manual review.

**Design:**
- One-time purchase (suggested: 149–199 rubles)
- Clear upfront communication: review takes 24–72 hours
- If the name is rejected (vulgar, against Yandex rules, against game rules): full automatic refund
- Simple admin panel: review queue with approve/reject buttons + automatic player notification

**Key risks to manage:**
- The review queue needs a real SLA. If it silently sits for a week, expect chargebacks and negative platform reviews.
- Check whether Yandex's platform payment cut applies to this transaction and price accordingly.

---

### 8. Re-enable Flags
**Effort:** 1 week

Flag data is fully defined in `cosmetics.json` (40+ layer definitions, 30+ colors including special effects). The feature is disabled by a single commented-out line in `Privilege.ts`. Country flags are a deeply personal feature in a territorial strategy game — players want to represent.

**Proposed approach:**
- Re-enable basic country flags as a **free feature** tied to Yandex account login (logging in = your flag appears). This drives account creation.
- Premium flag customization (special effects: rainbow, gold-glow, lava, neon, water; custom layer combinations) as a paid upsell via the existing Stripe flow.

---

## Sprint 5 — Full F2P Loop & Social Features

**Goal:** Build the long-term engagement and monetization systems. These are higher effort and should only be started once retention metrics from Sprints 1–3 are moving positively.

### 9. Coin Economy + Rewarded Ads Full Version
**Effort:** 3–4 weeks

Once rewarded ads are validated in Sprint 4, build the proper economy layer. Use the earn/spend data from the minimal version to set rates.

**Design:**
- Some cosmetics earnable via coins (flags, basic colors), others money-only (premium patterns, special effects)
- Post-match coin reward based on performance
- Rewarded ad: double post-match coins, or a daily "watch once for X coins" grant
- Coin earn and spend rates must be balanced carefully — this is a design commitment you maintain forever once players have expectations

---

### 10. Clans
**Effort:** 3–4 weeks

The highest long-term retention upside, but requires healthy lobby fill to feel meaningful. If the auto-team placement mechanic rarely triggers because clan members can't find each other in matches, the feature feels broken.

**Design:**
- Free clan creation (just a tag) + auto-team placement in Team mode matches as the core mechanic
- Paid clan features: clan banner (custom territory color/pattern in team matches), clan stats page, match history together
- Clan founding fee (99–149 rubles) to filter throwaway clans

**Gate this on lobby health:** Only build clans when analytics shows lobbies are consistently filling and match completion rates are strong.

---

### 11. Replay Access as Premium Feature
**Effort:** 3–5 days

The replay system is fully built. Extended replay history is a natural premium feature for competitive players.

**Design:**
- Free tier: last 3 matches
- Premium tier: last 20+ matches, shareable replay links
- Requires a premium account / tier concept from item 9 to be defined first

---

## Complete Priority Table

| # | Item | Effort | Primary Benefit | Sprint |
|---|------|--------|-----------------|--------|
| 1 | Analytics (session & match events) | 1–2 days | Informs everything else, baseline measurement | 1 |
| 2 | Tab crash reconnection | 2–3 days | Reduces ghost rate, more ad impressions | 1 |
| 3 | Mobile quick wins (retina off, 30fps cap, FX reduction) | 2–3 days | Reduces crash abandonment, more ad impressions | 1 |
| 4 | Tutorial — guided first bot match | 1–2 weeks | Biggest new player conversion lever | 2 |
| 5 | Deep mobile rendering optimization | 3–6 weeks | Only if analytics confirms mobile worth investment | 3 |
| 6 | Rewarded ads — minimal version (no coin economy) | 2–3 days | Yandex algorithm boost, first monetization signal | 4 |
| 7 | Paid nickname change | 1 week | Direct revenue, low complexity, Yandex UGC safe | 4 |
| 8 | Re-enable flags | 1 week | Identity feature, drives account creation, upsell surface | 4 |
| 9 | Coin economy + rewarded ads full version | 3–4 weeks | Core F2P engagement loop | 5 |
| 10 | Clans | 3–4 weeks | Long-term retention, social monetization | 5 |
| 11 | Replay access as premium feature | 3–5 days | ARPU increase, needs tier system from #9 first | 5 |
