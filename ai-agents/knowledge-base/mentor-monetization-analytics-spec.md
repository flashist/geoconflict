# GeoConflict — Analytics Specification
> **Purpose:** Pre-monetization instrumentation baseline + Sprint 4 launch funnel tracking.
> Share with team to create implementation tasks.
> All events should be tracked before Sprint 4 UI work begins unless noted otherwise.

---

## 1. Priority Tiers

| Tier | Meaning |
|---|---|
| 🔴 P0 | Must have before Sprint 4 ships. Blocking decisions depend on this data. |
| 🟡 P1 | Must have at Sprint 4 launch. Required to measure monetization funnel. |
| 🟢 P2 | Ship when convenient. Improves decision quality over time. |

---

## 2. Player Identity & Session Baseline

These events establish who your players are before monetization touches anything.

### 2.1 Yandex Login Status `session_start`
**Priority:** 🔴 P0

Track on every session start:
- `is_yandex_logged_in`: boolean
- `platform`: `desktop` | `mobile`
- `is_returning_player`: boolean (has played before)

**Why it matters:** Your entire citizenship system requires Yandex identity. If guest rate is high (>40%), the addressable market for citizenship is much smaller than DAU suggests. This number needs to be known before you design the login CTA flow.

---

### 2.2 Session Depth `session_end`
**Priority:** 🔴 P0

Track on session end (tab close, navigate away, or inactivity timeout):
- `matches_played_this_session`: integer
- `total_matches_alltime`: integer (from player profile once live; estimated from cookie until then)
- `session_duration_seconds`: integer
- `platform`: `desktop` | `mobile`
- `is_yandex_logged_in`: boolean

**Why it matters:** Total matches all-time is the raw input for the earned citizenship threshold decision. Without per-player match count distribution, the 100-match threshold is a guess.

---

### 2.3 Platform Trend (passive, derived)
**Priority:** 🔴 P0

No new event needed — derive from existing session data. Set up a weekly report showing:
- DAU split: desktop vs mobile, trended over time
- Session duration: desktop vs mobile, trended over time

**Why it matters:** Tells you how long you can park mobile optimization before it becomes strategically urgent.

---

## 3. Match Lifecycle Events

### 3.1 Match Started `match_started`
**Priority:** 🔴 P0

- `match_id`: string
- `player_id`: string (internal persistent ID)
- `map_name`: string
- `mode`: `multiplayer` | `solo`
- `platform`: `desktop` | `mobile`
- `player_alltime_match_count`: integer

---

### 3.2 Player Spawned `player_spawned`
**Priority:** 🔴 P0

- `match_id`: string
- `player_id`: string
- `time_to_spawn_seconds`: integer (from match join to first spawn)

**Why it matters:** Ghost rate (players who join but never spawn) was ~20% before Sprints 1-2. This event confirms whether ghost rate has actually improved and tracks regression.

---

### 3.3 Match Completed `match_completed`
**Priority:** 🔴 P0

Fire when a player's participation in a match ends (win, elimination, or voluntary leave):

- `match_id`: string
- `player_id`: string
- `outcome`: `eliminated` | `survived` | `voluntary_leave` | `disconnect`
- `match_duration_seconds`: integer
- `did_spawn`: boolean
- `platform`: `desktop` | `mobile`
- `player_alltime_match_count`: integer

**Why it matters:** Match completion rate directly affects XP earn rate. If 40% of matches end in voluntary leave or disconnect, your citizenship progression is slower than designed — which pushes real conversion threshold higher.

---

### 3.4 Match Count Distribution (derived)
**Priority:** 🔴 P0

From `match_completed` data, generate a retention curve:
- % of players who reach match 5
- % of players who reach match 10
- % of players who reach match 25
- % of players who reach match 50
- % of players who reach match 100

Segment this by: new players (first 7 days of account) vs returning players.

**Why it matters:** This is the key input for validating or adjusting the 100-match citizenship threshold before it ships.

---

## 4. Citizenship Funnel (Sprint 4 Launch)

These events go live the moment citizenship UI is visible to players.

### 4.1 Citizenship Surface Seen `citizenship_surface_impression`
**Priority:** 🟡 P1

Fire when the citizenship card on the start screen is rendered and visible:
- `player_id`: string
- `player_alltime_match_count`: integer
- `is_yandex_logged_in`: boolean
- `current_xp`: integer
- `surface`: `start_screen` | `post_match` | `other`

---

### 4.2 Citizenship CTA Clicked `citizenship_cta_clicked`
**Priority:** 🟡 P1

- `player_id`: string
- `cta_type`: `buy_now` | `learn_more` | `login_to_earn`
- `player_alltime_match_count`: integer
- `current_xp`: integer

---

### 4.3 Purchase Flow Started `purchase_flow_started`
**Priority:** 🟡 P1

Fire when Yandex payment dialog is triggered:
- `player_id`: string
- `product_id`: string (Yandex catalog item ID)
- `price_rubles`: integer

---

### 4.4 Purchase Completed `purchase_completed`
**Priority:** 🟡 P1

Fire after server verifies signed token and grants entitlement:
- `player_id`: string
- `product_id`: string
- `price_rubles`: integer
- `player_alltime_match_count`: integer (were they close to earned path?)

---

### 4.5 Purchase Abandoned `purchase_abandoned`
**Priority:** 🟡 P1

Fire when `purchase_flow_started` is followed by dialog close without `purchase_completed`:
- `player_id`: string
- `product_id`: string
- `player_alltime_match_count`: integer

**Why it matters:** The gap between `purchase_flow_started` and `purchase_completed` tells you whether drop-off is happening inside the Yandex payment UI (a flow problem) or before the player even opens it (a proposition problem).

---

### 4.6 Earned Citizenship Achieved `citizenship_earned`
**Priority:** 🟡 P1

- `player_id`: string
- `path`: `earned` | `paid`
- `days_since_first_match`: integer
- `total_sessions_to_earn`: integer

---

### 4.7 High-Intent Unconverted Players (derived)
**Priority:** 🟡 P1

Define a segment: players who triggered `citizenship_surface_impression` 3+ times but have no `purchase_completed` and no `citizenship_earned`. Track weekly:
- How many players are in this segment
- What is their 7-day and 30-day retention vs converted players
- Do they eventually convert, or churn

**Why it matters:** This is your highest-value remarketing target. Knowing what they do next is more useful than overall conversion rate.

---

## 5. Ad Revenue Impact Tracking

### 5.1 Ad Impression by Player Tier `ad_impression`
**Priority:** 🟡 P1

Extend existing ad impression events to include:
- `player_tier`: `guest` | `free` | `earned_citizen` | `paid_citizen`
- `ad_type`: `interstitial` | `sticky_banner` | `rewarded`

**Why it matters:** You're removing interstitials for paid citizens. You need to quantify the ad revenue impact per converted player to model the real net revenue of citizenship purchases.

---

### 5.2 Rewarded Ad Watched `rewarded_ad_watched`
**Priority:** 🟡 P1

- `player_id`: string
- `reward_type`: `double_coins` | `daily_grant` | `xp_boost` (when applicable)
- `player_alltime_match_count`: integer
- `current_xp`: integer

**Why it matters:** Players grinding toward citizenship via rewarded ads are your heaviest ad consumers and will become ad-free citizens. Tracking their volume lets you model the revenue tradeoff.

---

## 6. Post-Sprint 4 / Sprint 5 Preparation

These are lower priority now but should be designed into the schema early to avoid backfill pain.

### 6.1 Cosmetic Applied `cosmetic_applied`
**Priority:** 🟢 P2

- `player_id`: string
- `cosmetic_type`: `flag` | `pattern` | `nickname_color` | `nickname_border` | `custom_upload`
- `acquisition_method`: `purchased` | `earned_coins` | `default`

---

### 6.2 Map Vote Cast `map_vote_cast`
**Priority:** 🟢 P2

- `player_id`: string
- `map_voted_for`: string
- `match_context`: string (the match during which the vote was cast)

---

### 6.3 Replay Accessed `replay_accessed`
**Priority:** 🟢 P2

- `player_id`: string
- `replay_age_matches`: integer (how old is the replay being accessed — 1 = most recent)
- `player_tier`: `free` | `earned_citizen` | `paid_citizen`

**Why it matters:** Before making replays a premium feature, you need to know how many free players access replays older than 3 matches. If usage is near zero, the grandfathering concern is smaller than assumed.

---

## 7. Reporting Cadence Recommendation

| Report | Frequency | Key metric |
|---|---|---|
| DAU / platform split | Weekly | Desktop vs mobile growth rate |
| Yandex login rate | Weekly | % logged-in vs guest |
| Match count distribution | Once (2-3 weeks after instrumentation) | % reaching match 25, 50, 100 |
| Citizenship funnel | Daily from Sprint 4 launch | Impression → CTA → purchase conversion |
| High-intent unconverted segment | Weekly from Sprint 4 launch | Size and 7-day retention |
| Ad revenue by tier | Weekly from Sprint 4 launch | ARPU: free vs paid citizen |

---

## 8. Open Implementation Questions for the Team

1. **Where do events get sent?** Confirm analytics backend (Yandex AppMetrica, custom, or other) before instrumenting — event schema may need to conform to platform constraints.
2. **Guest player tracking** — before Yandex login, players have only an internal `persistentID`. Confirm this ID is stable across sessions (cookie-based?) so match count attribution is accurate.
3. **Server-side vs client-side events** — `match_completed` and `player_spawned` should ideally fire from the game server, not the client, to prevent manipulation. Confirm which events need server-side instrumentation vs client.
4. **Backfill** — existing players have match history that isn't instrumented. Decide whether to estimate alltime match count from server logs or start fresh from the instrumentation date.
