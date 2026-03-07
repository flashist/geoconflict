# Geoconflict — Sprint 4 — First Monetization Layer

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 4 — First Monetization Layer

**Goal:** Add revenue streams and engagement features that are low-complexity, safe for Yandex's platform rules, and generate monetization signals that improve Yandex's algorithmic promotion of the game.

### 6. Rewarded Ads — Minimal Version
**Effort:** 2–3 days
**Experiments:** ✅ Test via Yandex experiments API — the post-match rewarded ad prompt is purely additive. Players not in the experiment group see the normal post-match screen. Success metric: rewarded ad engagement rate and session length comparison between groups.

Rewarded ads can add 10–20% to ad-generated revenue and — critically — signal monetization activity to Yandex's promotion algorithm. The Yandex SDK is already partially integrated.

Minimal implementation — no coin economy required:
- On the post-match screen, offer: *"Watch an ad to unlock this week's featured color palette for 24 hours"*
- One rewarded ad placement tied to a temporary cosmetic reward
- No currency, no balance work, no economy design

This validates whether players engage with rewarded ads at all. That data informs the full coin economy design in Sprint 5.

---

### 7. Leaderboard — Core System
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — the leaderboard is a new UI surface that can be shown to an experiment group while the control group continues using (or not seeing) the existing Yandex built-in. Success metric: Yandex login conversion rate and return visit rate between groups.

The current Yandex built-in leaderboard is buggy and causes players to lose their scores. A robust server-side leaderboard builds trust and creates a meaningful reason to keep playing and to log in with Yandex.

**Two leaderboards:**
- **Global all-time:** ranks all players by total score across all matches ever played. Provides prestige and long-term aspiration.
- **Monthly:** resets at the start of each calendar month. More competitive and motivating for a wider range of players than weekly (weekly resets are too harsh for casual players and only serve the most hardcore).

**Authorization gate — show, don't block:**
- Anonymous players can view both leaderboards in full, including real names and scores
- Where the anonymous player's own rank would appear, show a grayed-out row: *"Log in with Yandex to track your rank"*
- This is more motivating than a generic login gate because the player can see exactly what they are competing against

**Score metric:** the developer should propose the most appropriate metric to rank players on, based on the existing stats tracking system (`Stats.ts`). Likely candidates are total tiles conquered, matches won, or a weighted combination. This decision should be discussed before implementation begins.

**Architectural requirement:** the player name row in the leaderboard must be designed from the start to accommodate future additions next to the name — specifically a verification mark (Task 8), leaderboard rank badges (Task 10), and nickname styling (Task 8a). Build the row with this in mind rather than retrofitting it later. Placeholder space is sufficient at this stage.

**Key requirement:** the system must be robust. Players must never lose their scores due to a bug or data issue. This is the primary reason we are replacing the Yandex built-in.

---

### 8. Citizen Tier — Supporter Membership System
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — citizenship perks are additive. Players not in the experiment group see no change. Success metrics: citizen adoption rate (all paths combined), return visit rate for citizens vs non-citizens, paid vs earned citizen ratio, session time comparison.

The Citizen tier is a **supporter membership** layer for committed and paying players. Citizenship signals community investment — either financial or through long-term play. It is not pay-to-win: every privilege affects the meta-experience around the game, never the game outcome itself.

**Three paths to citizenship:**

**Path 1 — Earned (free):** complete 50 qualifying matches. A match qualifies if the player was alive past the halfway point. A progress bar is always visible to non-citizens — a player at 34/50 has a specific reason to return. This is one of the most important retention mechanics in this task.

**Path 2 — Direct purchase:** pay 49–99 rubles to unlock citizenship immediately. Shown alongside the progress bar. Low price is intentional — citizenship is a retention hook, not a primary revenue source.

**Path 3 — Cosmetic purchase:** any player who buys a pattern, flag, or any other paid cosmetic is automatically granted citizenship at the moment of purchase. No separate citizenship purchase needed. This means citizenship is effectively "anyone who has paid us anything."

**Two citizen types — different ad treatment:**

| | Earned citizen | Paid citizen |
|---|---|---|
| Verification mark | ✅ | ✅ |
| Map voting (Task 14) | ✅ | ✅ |
| Private lobbies (Task 8b) | ✅ | ✅ |
| Spectating (Task 8c) | ✅ | ✅ |
| Custom nickname | ✅ | ✅ |
| Full emoji set (all ~50 emojis) | ✅ | ✅ |
| No interstitial ads | ❌ | ✅ |
| Banner ads | shown | shown |

Non-citizens have access to 5–10 core emojis only. The core set should cover basic gameplay communication (thumbs up, handshake, sword, wave). The remaining expressive/personality emojis (clown, betrayal, trophy, etc.) are citizen-only. This creates visible in-match awareness of the citizen tier — other players will notice emojis they don't have access to.

Interstitial ad removal is exclusively for paid citizens. Earned citizens get all community perks but continue seeing interstitials. Banner ads are shown to everyone including paid citizens — low friction, maintains revenue floor.

**Implementation note — two citizen flags required:** the system must track two separate boolean states per player: `isCitizen` (earned or paid) and `isPaidCitizen` (paid path only). Ad suppression is gated on `isPaidCitizen`, not `isCitizen`. A single citizenship flag is insufficient and would incorrectly remove ads for earned citizens.

**Leading with the right benefit in the citizenship pitch:**

For paid path: *"No more interstitial ads — ever. Plus verification mark, map voting, private lobbies, and more."* Ad removal goes first. It is the most immediately tangible benefit and the highest-conversion message for players who have just sat through an interstitial.

For earned path: *"Join the community — verification mark, map voting, private lobbies, spectating."*

**"Citizens first" principle:** any new feature or perk introduced in the future should be offered to citizens first. Private lobbies, spectating, and future features (tournaments, moderation trust, early access) follow this pattern. Core game mechanics remain available to all players — citizenship unlocks the layer on top.

**Custom nickname — citizenship privilege:**

Non-citizen players directed to citizenship flow before any nickname change proceeds. Rules once a player is a citizen:

| Situation | Cost |
|---|---|
| First nickname change ever | Free |
| Subsequent changes | 29–49 rubles each |

Every change goes through manual review (Yandex UGC rules). Admin review panel with approve/reject and automatic player notification. Review SLA: 24–72 hours. Rejected changes refund the fee and return the free slot if applicable.

**Architectural requirement — centralized name rendering:** player names appear across multiple contexts — in-match above territory, leaderboard, post-match summary, diplomacy UI. The verification mark must render through a single centralized component. Tasks 8a, 8b, 8c, 10, and 14 all depend on this foundation. Build it correctly in Task 8 and do not retrofit later.

**Key risks:**
- Match progress count must never be lost — losing progress toward 50 would feel like a betrayal to players close to the threshold
- Yandex platform payment cut applies to both purchase paths — price accordingly
- The `isPaidCitizen` flag must be set correctly for all three paid paths (direct purchase, cosmetic purchase, future purchases) — a missed case means a paying player doesn't get ad removal

---

### 8b. Private Lobbies — Citizens Only
**Effort:** 1–2 weeks
**Experiments:** ❌ Excluded — feature is gated behind citizenship, so all eligible players should have access. Withholding from a subset of citizens would be confusing.

**Depends on:** Task 8 (citizenship system must exist first)

Players have requested private lobbies directly. Currently all matches are public. Private lobbies allow a player to create a match and share an invite link or code with specific people, preventing random players from joining.

**Why citizen-only:** private lobbies are a social feature — citizens bringing friends creates more citizens. The conversion loop: friend receives invite → joins private match → sees citizenship perks → becomes citizen. Gating it behind citizenship makes the feature a visible citizenship benefit while creating organic acquisition.

**Core behavior:**
- Citizens can create a private lobby with a shareable invite code or link
- The lobby is not listed in the public game browser — only players with the code can join
- The host can start the match when ready, regardless of lobby size
- Bots fill remaining slots if the host chooses (reuse existing bot infrastructure)
- Match type, map selection, and other settings follow existing public lobby options

**Note on public lobby cannibalization:** at current DAU (~3,500 desktop), the risk of private lobbies thinning public games is low. Private lobbies primarily bring in new players through social channels rather than pulling existing players away from public matches. Monitor public lobby fill rates after launch.

---

### 8c. Spectating — Citizens Only
**Effort:** 1 week
**Experiments:** ❌ Excluded — feature gated behind citizenship, available to all citizens.

**Depends on:** Task 8 (citizenship system must exist first)

Citizens can watch any ongoing public match as a spectator without participating. Zero impact on match balance — spectators cannot interact with the game state.

**Core behavior:**
- Citizens see a "Spectate" option on any active public match in the game browser
- Spectator view shows the full map with all territory, units, and player names visible — no fog of war
- Spectators cannot send any intents or interact with the match
- Spectator count is optionally visible to players in the match (social proof — knowing people are watching adds prestige)

**Primary use case:** watching friends play. A citizen who finishes a match and wants to observe their friend's ongoing match. This is the most common scenario and the one that creates citizenship conversion — the friend who is being spectated sees the feature and wants it too.

**Technical note:** the existing replay system uses `LocalServer` to replay archived matches. Spectating a live match is a different problem — the spectator needs a live feed of turn messages from the server. Check whether the existing WebSocket turn broadcast can support read-only spectator connections without significant server changes. If server changes are complex, a simplified version using the replay infrastructure with a short delay (5–10 second lag) may be acceptable for V1.

---

### 8d. Personal Inbox — Citizens Only (Part B)
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — informational feature for all citizens.

**Note:** Part A (global changelog re-enable) shipped in Sprint 2. This task adds the personal citizen inbox tab to the existing announcements popup.

**Depends on:** Task 8 (citizenship system), Task 8d Part A (bell icon and popup UI already exist — this adds a second tab to that popup)

**Part B — Personal inbox (citizens only, requires new backend):**
- Separate tab in the announcements popup, visible only to citizens
- One-way messages from the game to a specific citizen — no replies
- Persists across devices — stored server-side in the player database
- Unread badge covers both global and personal unread counts
- Messages sent automatically as side effects of existing admin actions (nickname approved/rejected, citizenship granted via cosmetic purchase)
- New endpoints needed: `GET /player/messages`, `POST /admin/player-message`, bulk mark-as-read
- Simple schema: `id`, `player_id`, `title`, `body`, `sent_at`, `read_at`

---

### 9. Re-enable Flags
**Effort:** 1 week
**Experiments:** ✅ Test via Yandex experiments API — flags are purely additive. Players not in the experiment group see no flags at all (current behavior). Success metric: Yandex login conversion rate for the experiment group vs control.

Flag data is fully defined in `cosmetics.json` (40+ layer definitions, 30+ colors including special effects). The feature is disabled by a single commented-out line in `Privilege.ts`. Country flags are a deeply personal feature in a territorial strategy game.

Proposed approach:
- Re-enable basic country flags as a free feature tied to Yandex account login. Logging in = your flag appears automatically. This directly incentivizes Yandex authorization.
- Premium flag customization (special effects: rainbow, gold-glow, lava, neon, water; custom layer combinations) as a paid upsell via the existing Stripe flow.

---

### 9a. Re-enable Territory Patterns
**Effort:** 1 week
**Experiments:** ✅ Test via Yandex experiments API — territory patterns are purely additive. Players not in the experiment group see no patterns (current behavior). Success metric: purchase conversion rate and session length comparison between groups.

**Depends on:** Task 9 (flags should ship first as the simpler of the two re-enables; patterns follow immediately after)

Territory patterns are a disabled cosmetic layer that applies a visual pattern to a player's entire territory on the map — stripes, textures, gradients, and similar designs overlaid on the color fill. This is more visually impactful than flags because it affects the entire territory area rather than a small icon, making it immediately noticeable to every player in a match.

Like flags, the pattern data is already defined in `cosmetics.json` and the feature is disabled via `Privilege.ts` or equivalent. The re-enable work is expected to be similar in scope to Task 9.

**Proposed approach:**
- A small set of basic patterns available free with Yandex login — gives players a reason to log in and a taste of the feature
- Premium patterns (more complex designs, animated or special effects if technically feasible) as a paid upsell via the existing Stripe flow
- Patterns should be compatible with flags — a player should be able to use both simultaneously without visual conflicts

**Note for the developer:** check whether patterns interact with the territory rendering in ways that could affect mobile performance. If applying patterns adds significant rendering overhead on low-end devices, consider making them desktop-only or adding a mobile quality setting that disables them. Coordinate with the mobile optimization work (Tasks 3 and 5) if needed.

---