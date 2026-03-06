# Geoconflict — Sprint 5 — Full F2P Loop & Social Features

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 5 — Full F2P Loop & Social Features

**Goal:** Build long-term engagement and monetization systems. These are higher effort and should only be started once retention metrics from Sprints 1–3 are moving positively.

### 10. Leaderboard — Rewards Layer
**Effort:** 3–5 days
**Experiments:** ✅ Test via Yandex experiments API — badges and rank icons are additive display elements. Players not in the experiment group see the leaderboard without badges. Success metric: return visit rate and match frequency for top-ranked players in the experiment group vs control.

Once the core leaderboard system (Task 7) is live and players are engaging with it, add a reward layer that gives top finishers visible recognition.

**Top 10 badge:** players ranked in the top 10 on either the global or monthly leaderboard get a visible icon next to their nickname in every match they play. This is social proof — other players see the badge mid-game, which signals that the leaderboard is real and worth competing for.

**Collectible period rewards:** players who finish in the top 3 of a monthly leaderboard receive a special badge for that month (e.g. "June 2025 — Top 3") that they keep permanently, even after the monthly reset. This creates collectible prestige — veterans accumulate badges from multiple months, which is a visible signal of long-term dedication. Critically, the reward does not disappear when the player loses the rank — it marks the achievement forever.

**Reward tiers (suggested):**
- Global top 3: permanent special icon, distinct from monthly rewards
- Monthly top 3: collectible monthly badge, kept permanently
- Global / monthly top 4–10: smaller icon, refreshed based on current rank

The exact visual design of badges and icons is a separate design task. The developer should implement the data model and display logic; assets can be placeholders initially.

**Architectural note:** all badge and icon display must go through the centralized name rendering component introduced in Task 8. Do not implement badge display as a separate ad-hoc solution.

---

### 8a. Nickname Styling System
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — styling options are purely additive and only visible to players who have already purchased a verified nickname. Players not in the experiment group simply don't see the styling purchase options. Success metric: upsell conversion rate among verified nickname owners.

**Depends on:** Task 8 (verified nickname purchase and centralized name rendering component must exist first)

Once players can purchase a verified nickname (Task 8), offer additional purchasable visual styles for how their nickname is displayed. This gives players who are already bought in a natural upgrade path and increases ARPU from motivated buyers.

**V1 styling options (recommended scope):**
- **Nickname background color:** a colored fill behind the nickname text
- **Nickname border:** a decorative border around the nickname display area
- **Nickname text color:** a custom color applied to the nickname letters themselves

**Pricing model:** style options are sold separately from the nickname purchase, either individually (49–99 rubles each) or as a bundled "nickname style pack" (149–199 rubles). A player who has not purchased a verified nickname (Task 8) cannot purchase styles — styles are an upsell, not a standalone product.

**Display scope:** styled nicknames must render correctly in all the same places as the verification mark — in-match above territory, on the leaderboard, in the post-match summary, and in the diplomacy UI. This is why the centralized name rendering component from Task 8 is a hard prerequisite.

**Important constraints:**
- Readability is a hard requirement. Any style option that makes the nickname difficult to read during a match must be rejected, regardless of how visually interesting it is. The game map is a busy background and nicknames must remain legible at a glance.
- The verification mark introduced in Task 8 must remain visible and unobscured by any styling option.
- Leaderboard badge icons from Task 10 must also remain visible alongside styled nicknames.

**Explicitly out of scope for V1:**
- Custom fonts: technically complex in a Pixi.js canvas renderer and introduce font loading overhead. Revisit only after V1 styling is validated.
- Text pattern fills (gradient or texture on letter shapes): high readability risk and significant rendering complexity. Not recommended until simpler options are proven to sell.

---

### 11. Coin Economy + Rewarded Ads Full Version
**Effort:** 3–4 weeks
**Experiments:** ❌ Excluded — running two parallel economic models creates player fairness issues (players in different groups earn and spend at different rates) and significant support complexity. Ship to all users simultaneously.

Once rewarded ads are validated in Sprint 4, build the proper economy layer using real engagement data to set earn and spend rates.

Design:
- Some cosmetics earnable via coins (flags, basic colors), others money-only (premium patterns, special effects)
- Post-match coin reward based on performance
- Rewarded ad: double post-match coins, or a daily "watch once for X coins" grant
- Coin earn and spend rates must be carefully balanced — once players have expectations about the economy, it is very difficult to change without backlash

**Important constraint:** leaderboard badges and rank icons (Task 10) and verified nickname marks (Task 8) are earned or purchased features — they must not be purchasable with coins. The coin economy should be scoped to cosmetic items only, keeping earned achievements clearly distinct.

---

### 12. Clans
**Effort:** 3–4 weeks
**Experiments:** ✅ Test via Yandex experiments API — clan creation, clan tags, and auto-team placement are additive. Players not in the experiment group see no clan-related UI. Success metric: session frequency and match completion rate for clan members vs non-clan players.

The highest long-term retention upside, but requires healthy lobby fill to feel meaningful. If the auto-team placement mechanic rarely triggers because clan members can't find each other in matches, the feature will feel broken.

Design:
- Free clan creation (tag only) + auto-team placement in Team mode matches as the core mechanic
- Paid clan features: clan banner (custom territory color/pattern in team matches), clan stats page, match history together
- Small clan founding fee (99–149 rubles) to filter throwaway clans

Gate this on lobby health: only build clans when analytics shows lobbies are consistently filling and match completion rates are strong.

---

### 14. Map Voting for Verified Players
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — map voting UI is additive and only visible to verified players. Non-verified players and the control group see no change. Success metric: voting participation rate among verified players, and whether sessions containing a voted map show higher match completion rates than sessions with random maps only.

**Depends on:** Task 8 (Verified Player tier must exist — voting is gated to verified players only)

**The mechanic:**

Maps alternate in a fixed sequence: **random map → voted map → random map → voted map**, repeating indefinitely. While a random map is being played, verified players can cast their vote for what the next voted map will be. By the time the random map ends, the vote is settled and the winning map plays immediately after. Then while the voted map runs, the next random map is already queued, and voting opens again for the one after.

This means:
- There is always an active vote in progress
- Voting happens during dead time — players are in a match, not staring at a vote screen
- Half of all maps are always random, regardless of votes — the game never feels fully controlled by a small verified group
- Verified players always know their vote will be acted on

**Winner selection rules:**
- The map with the most votes wins
- On any tie — including the case where every eligible map has zero votes — the winner is chosen randomly among all tied maps
- This means even a single vote is decisive if no other map matches it. A verified player's vote always matters. There is no fallback to "fully random" — zero votes across all maps is simply a tie among all of them, resolved randomly

**Map eligibility and cooldown:**
- All maps are eligible for voting by default
- Any map played in the last N cycles (random or voted) is placed on cooldown and excluded from the vote pool until the cooldown expires. The developer should propose a sensible N based on the total number of available maps — the goal is to prevent the same popular maps from dominating every vote while still allowing them to recur over a reasonable time window

**Where voting appears:**
- A small voting panel visible to verified players during the spawn phase and early match phase of random maps
- Shows the eligible maps with current vote counts
- Non-verified players can see the vote panel and current standings but cannot cast a vote — this makes the verified tier visibly meaningful to players who haven't purchased it yet

**What "done" looks like:**
- The random/voted alternation sequence is running in production
- Verified players can cast one vote per voting cycle
- Vote results are correctly determining the next voted map
- Tiebreaking is random among tied maps
- Recently played maps are excluded from the pool via cooldown
- Non-verified players can see the vote panel but the vote button is disabled with a clear explanation

**Architectural note:** the voting system needs to know which players are verified. This relies on the verified player status introduced in Task 8. Coordinate with Task 8's data model to ensure verified status is queryable server-side at the time votes are cast.

---

### 13. Replay Access as Premium Feature
**Effort:** 3–5 days
**Experiments:** ❌ Excluded — depends on Task 11's tier and pricing system. Introducing two parallel pricing models during an experiment creates fairness and support issues. Ship alongside or after Task 11.

The replay system is fully built. Extended replay history is a natural premium feature for competitive players.

Design:
- Free tier: last 3 matches
- Premium tier: last 20+ matches, shareable replay links
- Requires the premium account / tier concept from Task 11 to be defined first

---

### 15. Custom Uploaded Flags & Patterns — Paid Citizens Only
**Effort:** 2–3 weeks
**Experiments:** ❌ Excluded — paid feature with moderation overhead; running two parallel pricing models creates fairness and support complexity.

**Depends on:** Tasks 9 and 9a (existing flags and patterns must be live first to establish cosmetic purchase baseline), Task 8 (citizenship and payment infrastructure)

Paid citizens can upload their own custom flag or territory pattern, making their in-match appearance completely unique. This is the highest tier of visual customization — no other player can have the same look.

**Why paid-citizen only:** custom uploads require manual moderation before appearing in matches. The moderation cost per submission only makes sense for players who have already demonstrated financial commitment. Earned citizens are not eligible.

**Moderation is the critical design decision — choose one approach before implementation begins:**

- **Manual review** (same queue as nickname changes): safe, no third-party dependency, but creates operational burden at scale. Acceptable for V1 at current player counts.
- **Automated content screening API** (e.g. AWS Rekognition, Google Vision SafeSearch): scales better, adds cost (~$1–2 per 1,000 images) and integration work. Recommended if upload volume grows.

Either way: uploaded images must not appear in any match until they have passed review. A player submits their image, sees a "pending review" status, and receives a personal inbox notification (Task 8d) when it is approved or rejected.

**Yandex platform rules:** images must comply with Yandex Games content policies. Rejection reasons must be communicated clearly. Refund policy for rejected uploads must be defined before launch.

**Pricing:** 199–399 rubles per custom upload. Higher price than standard cosmetics — signals exclusivity and offsets moderation cost. The price also naturally limits submission volume, which keeps the manual review queue manageable.

**Technical scope:**
- Image upload endpoint with file size and format validation (PNG/JPG, max dimensions, reasonable file size cap)
- S3 storage for uploaded images
- Admin moderation queue (approve/reject with reason, automatic player notification via Task 8d inbox)
- Integration with existing cosmetics rendering — uploaded patterns need to fit within the existing `PatternDecoder` pipeline or a new rendering path
- The uploaded image must tile or fit correctly as a territory pattern — provide clear upload guidelines to players (recommended dimensions, aspect ratio, how it will appear on territory)

**Scope for V1:** custom flags only, or custom patterns only — do not attempt both simultaneously. Flags are simpler (small icon, less rendering complexity). Patterns are more visually impactful but more technically involved. Recommend starting with flags.

---