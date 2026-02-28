# Geoconflict — Execution Plan

## Strategic Logic

The current primary revenue source is ad impressions (interstitial and sticky-banner ads). Every improvement that keeps players in the game longer, brings them back for another match, or converts curious new players into active ones **directly increases ad revenue without touching the monetization system**. Fixing retention first is therefore the correct sequence — a larger, more engaged player base also makes every future monetization feature more effective.

Additionally, Yandex Games promotes titles that generate more revenue per player. This means that once monetization features are added, improvements to engagement and session length compound: better retention → higher revenue per player → better Yandex ranking → more DAU → more revenue.

---

## Experiments Policy

Yandex Games provides a built-in A/B experiments API (https://yandex.ru/dev/games/doc/ru/sdk/sdk-config) that allows features to be tested on a subset of players before full rollout.

**Default rule: if a feature is additive and does not break backward compatibility, it must be tested via the Yandex experiments API before full rollout.**

A feature is considered suitable for experiments if:
- It adds something new without removing or changing existing behavior for players who are not in the experiment group
- The previous experience remains fully intact for the control group
- Running two versions in parallel does not create fairness issues or support complexity

Features are **excluded** from experiments if:
- They are part of the analytics/measurement layer itself (experimenting on the tool you use to measure results is circular)
- Rolling back or maintaining two parallel versions would require disproportionate additional engineering work
- The change affects all users uniformly by nature (e.g. rendering performance fixes)
- The feature involves an economy or pricing model where two parallel versions would create player fairness issues

Each task below is marked with its experiments status and reasoning.

---

## Sprint 1 — Stop the Bleeding

**Goal:** Reduce the ghost rate (30–50% of lobby players never becoming active) and crash-driven abandonment. All items are small and can ship within one week.

### 1. Analytics — Session & Match Event Tracking
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — this is the measurement layer itself. Experimenting on analytics would make results unreadable.

Right now decisions are made without data. A lightweight event system is the foundation for measuring whether anything else works.

Minimum viable events to track:
- Match started (including: map name, number of human players, number of bots, game mode)
- Match completed (including: duration, winning player/team, number of players still active at the end)
- Player joined a match
- Player was eliminated (including: at what point in the match, by whom if available)
- Player abandoned a match (closed the tab or disconnected without being eliminated)
- Session started (player opened the game)
- Session duration (how long the player was active before leaving)

Device and platform context should be attached to all events where possible: whether the player is on mobile or desktop, and whether they are logged in via Yandex or anonymous.

The choice of storage and tooling is up to the developer — a simple self-hosted solution is perfectly fine at this stage. The implementation must not affect game performance or determinism. Analytics must be a side-effect that cannot interfere with the core game logic.

---

### 2. Tab Crash Reconnection
**Status: Already implemented**
**Experiments:** ✅ Test via Yandex experiments API — the reconnection prompt is purely additive. Players not in the experiment group simply never see the prompt and experience no change. Success metric: match completion rate for the experiment group vs control group.

When a player's browser tab crashes or closes unexpectedly mid-match and they reopen the game, they are automatically detected as having an interrupted session and offered the chance to rejoin their active match — if that match is still ongoing and their character is still alive in it.

See Task 2a for the analytics instrumentation that should be added on top of this feature.

---

### 2a. Reconnection Analytics
**Effort:** half a day — 1 day
**Experiments:** ❌ Excluded — this is a measurement addition to an already-shipped feature, not a new behavior being tested.

The reconnection feature (Task 2) is already implemented, but without specific tracking we cannot tell whether it is working, how often players encounter it, or whether reconnection attempts succeed or fail. General match completion analytics from Task 1 are not granular enough to answer these questions.

The following events should be tracked inside the reconnection flow:

- **Reconnection prompt shown** — a player opened the game and was shown the rejoin prompt. This tells us how frequently unexpected exits and crashes actually occur.
- **Reconnection accepted** — the player tapped the rejoin button. Combined with the above, this gives the prompt's conversion rate.
- **Reconnection declined** — the player dismissed the prompt and went to the main menu instead.
- **Reconnection succeeded** — the player rejoined and was confirmed active in the match. This is distinct from accepted — the rejoin attempt could still fail server-side.
- **Reconnection failed** — the player accepted the prompt but the server reported the match had already ended or the player had been eliminated by the time they tried to rejoin.

These five events form a complete funnel: how often the problem occurs → how many players attempt to fix it → how many succeed. Without the last two events in particular, it is impossible to distinguish between "the feature works but players don't use it" and "the feature is broken and rejoin attempts are silently failing."

All events should include the standard device and platform context from Task 1 (mobile/desktop, Yandex login status).

---

### 2b. In-Game Feedback Button
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — this is a utility feature that should be available to all players from day one. Limiting it to an experiment group means a portion of players have no way to report problems, which defeats the purpose.

Currently the only way for players to send feedback is through Yandex's built-in review mechanism, which is slow and designed for post-session star ratings — not for reporting specific bugs or problems mid-experience. An in-game feedback button catches issues in the moment, with full context, producing far more actionable reports. It should be shipped as early as possible — as each new feature lands, player feedback becomes increasingly valuable.

**Placement — two locations:**

- **Start screen:** bottom bar, next to the existing settings gear icon (bottom right). The bottom bar already establishes itself as the place for meta/utility actions. The feedback button belongs in the same category — discoverable but not competing with the primary actions (join game, play mission, singleplayer).
- **Battle screen:** top right corner, next to the existing settings and exit icons. This is already where utility controls live, so placement there is consistent with the existing UI language.

The button must use the same icon and color in both locations so players who discover it in one context immediately recognize it in the other. A small speech bubble or flag icon is recommended — universally understood as "feedback" or "report." Avoid red as the button color since red typically signals errors or alerts in game UI.

**What happens when the button is tapped:**

A lightweight overlay appears — not a full-screen form. It must be dismissible instantly so players in the middle of a match are not pulled out of the game. The form contains:
- A category selector: Bug / Suggestion / Other
- A free-text field (optional, not mandatory)
- A send button
- A brief confirmation after sending: *"Thanks, we read every report"*
- An optional contact field for players who want a response (not mandatory)

**Automatically attach context with every submission:**
- Platform (mobile / desktop)
- Yandex login status
- Current game version
- Last match ID (if the player just finished or is currently in a match)
- Timestamp

This context turns vague reports like "the game crashed" into actionable ones without requiring the player to provide technical details themselves.

**Admin side:** submissions need to be readable somewhere. A simple list view — category, text, attached context, timestamp — is sufficient for V1. No complex tooling required.

**Dependency:** if Task 1 analytics infrastructure is already live, the automatic context attachment can reuse the same event/session data. If not, the context should still be collected and attached directly to the feedback submission independently.

**Analytics tracking:** two events should be tracked as part of this task:
- **Feedback button opened** — player tapped the feedback button and the form appeared. Tracks visibility and discoverability of the button.
- **Feedback submitted** — player completed and sent a feedback report. The ratio between opened and submitted reveals whether the form itself is causing drop-off.

Both events should include which screen the button was opened from (start screen or battle screen) so we can compare discoverability across both placements.

---

### 2c. Automatic Device & Environment Info Collection
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — this is a data enrichment layer on top of the already-shipped feedback system. Should be available for all feedback submissions from all players.

**Depends on:** Task 2b (feedback button must exist first)

When a player submits feedback, automatically collect and attach device and environment information that would be useful for reproducing bugs. Players should never need to provide this manually — it is collected silently in the background at the moment of submission.

**Data to collect (all best-effort — some values may be unavailable depending on browser):**

- **User agent string** — full browser user agent, from which browser name, version, and OS can be parsed
- **Browser name and version** — parsed from user agent for readability in the admin view
- **Device type** — mobile or desktop (can be derived from user agent or screen size)
- **CPU cores** — available via `navigator.hardwareConcurrency`
- **RAM (approximate)** — available via `navigator.deviceMemory`; returns rounded values (0.25, 0.5, 1, 2, 4, 8 GB) rather than exact figures, but sufficient for device class identification
- **GPU / renderer info** — available via WebGL renderer string; note that some browsers block this for fingerprinting protection, so this field may not always be populated
- **Screen resolution and pixel ratio** — useful for identifying HiDPI/retina devices and screen size class
- **Browser language** — useful for understanding which player market a report is coming from

**Important notes for the developer:**
- All fields are best-effort. If a value is unavailable or blocked by the browser, it should be omitted gracefully rather than causing an error or blocking the submission.
- This data is collected for bug reproduction purposes only — it is attached to feedback submissions, not stored as a general player profile.
- GPU info via WebGL may be absent on privacy-focused browsers or when the user has blocked canvas fingerprinting. The developer should handle this silently.

---

### 2d. Additional Analytics Events — Session Depth & Spawn Behavior
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — this is a measurement layer addition. Analytics must be available for all players to produce valid data.

**Depends on:** Task 1 (analytics infrastructure must be live)

Task 1 delivered match-level and player-level events. This task adds the missing events needed for funnel construction and session depth tracking.

**Session:Start — custom Design Event**
GameAnalytics funnels only support Design Events and Progression Events — the built-in automatic session event is not available in the funnel builder. A custom `Session:Start` Design Event must be fired once on game load, immediately after the SDK initializes. This is the top step of every funnel we will build. Without it, no player-conversion funnels are possible.

**Session:Heartbeat — every 5 minutes**
Fired periodically while the player is active, using a named interval: `Session:Heartbeat:05`, `Session:Heartbeat:10`, `Session:Heartbeat:15`, and so on. Each event represents a player still present at that point in their session. This creates a session depth curve — you can see what percentage of players reach 5 minutes, 10 minutes, 15 minutes, and so on. Combined with match events from Task 1, this tells you whether players are losing interest between matches or during them. Stop firing after the player closes the game or becomes inactive.

**Session:FirstAction**
Fired once per session the first time a player takes any meaningful action on the start screen — joining a lobby, clicking play mission, opening settings, or clicking anything interactive. Players who open the game but never trigger this event are pure zero-action abandonment. This is a direct measurement of the problem Task 4a is solving and should be tracked before and after Task 4a ships to confirm it is working.

**Match:SpawnChosen and Match:SpawnAuto**
Two mutually exclusive events fired during the spawn phase of every match:
- `Match:SpawnChosen` — the player actively clicked or tapped a spawn location themselves
- `Match:SpawnAuto` — the player was auto-placed (Task 4a mechanic triggered)

These events directly measure the scale of the spawn confusion problem and track whether it improves over time. Once Task 4a ships, the ratio of SpawnAuto to SpawnChosen tells you how many players were still confused even after auto-spawn existed — useful for determining if additional guidance is needed.

---

### 2e. Performance Monitoring Events
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — performance monitoring must cover all players to produce valid data, particularly across mobile device classes.

**Depends on:** Task 1 (analytics infrastructure must be live)

Currently we have no visibility into how the game actually performs on players' devices. We know mobile players crash and abandon at a higher rate, but we don't know which device classes are most affected or how framerate varies across the player base. This task adds periodic performance sampling that gives us that visibility.

**Performance:FPS snapshot**
Sample the current framerate at regular intervals (every 60 seconds is sufficient) and fire a Design Event with the value. Use buckets rather than exact values to keep the data clean: `Performance:FPS:Above30`, `Performance:FPS:15to30`, `Performance:FPS:Below15`. Below 15fps is the crash-risk zone. This must be broken down by mobile vs desktop. This data is the primary measurement tool for Tasks 3 and 5 — it tells you whether mobile quick wins (Task 3) actually improved framerate, and it is one of the key inputs for the gate decision on deep rendering optimization (Task 5).

**Performance:MemoryPressure** (best-effort)
If the browser exposes memory information via `performance.memory` (Chrome only, not available in all browsers), sample available heap size at the same 60-second interval and fire a bucketed event: `Performance:Memory:Low`, `Performance:Memory:Medium`, `Performance:Memory:High`. Low memory correlates strongly with tab crashes on mobile. Handle unavailability silently — this is a best-effort event, not a required one.

**Critical implementation constraint:** performance sampling must run on a low-priority interval and must never affect game performance or determinism. If sampling itself causes a framerate drop, it defeats the purpose. The developer should verify that adding these events has no measurable impact on frame timing before shipping.

This task is intentionally separated from Task 2d because performance monitoring involves framerate sampling, timing logic, and rendering pipeline awareness — it is more complex than simple behavioral event tracking and should not block Task 2d from shipping.

---

### 2f. Device Type Analytics Event
**Effort:** half a day
**Experiments:** ❌ Excluded — measurement layer. Must cover all players to produce valid funnel data.

**Depends on:** Task 2d (Session:Start event must exist, as Device:Type fires immediately after it)

**The problem:** attaching platform context (mobile/desktop) to individual events allows filtering in the GameAnalytics Explore tool, but it does not allow splitting funnels by device class from the top. To build separate mobile vs desktop conversion funnels and compare them directly — which is essential for measuring the impact of Tasks 3 and 5 — a dedicated Design Event must fire at the start of every session.

**Event to implement: Device:Type**

Fired once per session, immediately after `Session:Start`, identifying the player's device class:
- `Device:mobile`
- `Device:desktop`
- `Device:tablet`
- `Device:tv`

Device class should be detected from the user agent string at session start. This is a single event, fired once, with no ongoing sampling — it is a very small task.

**Why this is a separate task from 2d:** Task 2d is already implemented. This event was identified as missing after 2d shipped. It should be added as a standalone change rather than reopening the 2d implementation.

**What this enables:** once aggregated (24–48 hours after first fire), it becomes possible to build device-segmented funnels in GameAnalytics — for example, the new player conversion funnel run separately for mobile and desktop players, showing whether drop-off patterns differ by device class. This is the primary measurement tool for comparing mobile vs desktop retention before and after Tasks 3 and 5.

---

### 3. Mobile Quick Wins
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — applying different rendering settings to a subset of mobile users would produce inconsistent crash data and make analytics results unreadable. Ship to all mobile users and measure impact via Task 2d Session:Heartbeat and Task 2e Performance:FPS events.

Mobile players are abandoning or crashing at a disproportionate rate. Several high-impact fixes require only configuration or conditional rendering changes — no architecture work.

All optimizations must be applied conditionally — only when the game detects it is running on a mobile device. Desktop players should see zero change in visual quality or framerate behavior.

Minimum changes to implement on mobile:
- Disable retina / HiDPI rendering (renders at standard resolution instead of 2× on HiDPI screens)
- Cap render framerate to 30fps
- Disable or reduce particle effects and the visual FX layer

The developer is welcome to identify and implement other low-risk mobile optimizations beyond this list. This task is explicitly scoped to configuration and conditional rendering changes only — it is not the time to refactor the rendering pipeline. That is a separate larger task (Task 5).

**How impact will be measured:** after this task ships, watch `Session:Heartbeat` events (Task 2d) filtered to mobile players — session depth should increase. Watch `Performance:FPS` events (Task 2e) on mobile — the proportion of players in the `Below15` bucket should decrease. These two signals together confirm whether this task had the intended effect.

---

## Sprint 2 — Fix Onboarding

**Goal:** Convert curious new players into players who complete at least one full match. This is the single biggest lever on long-term DAU quality.

### 4. Tutorial — Guided First Bot Match
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — the tutorial is purely additive and only triggers for first-time players. Players not in the experiment group simply don't see it. Success metrics: second-session rate (do players who completed the tutorial come back for a second match?), match completion rate for new players, and `Session:FirstAction` rate (Task 2d) — the tutorial should increase the proportion of new players who take any meaningful action at all.

Currently there is no tutorial. A first-time player opening Geoconflict faces a complex map with no context — territory expansion, economy, alliances, nukes — and will close the tab within 90 seconds without guidance.

The tutorial should:
- Auto-trigger on first game open (detect via a first-open flag)
- Run as a singleplayer bot match on a small map — not a separate tutorial mode
- Show 4–5 tooltip moments at natural decision points:
  - When troops first become available: *"Click a neighboring territory to attack"*
  - When gold accumulates enough to build: *"You can now build a City"*
  - When an alliance request arrives: explain accept/reject
  - When a nuke becomes affordable: brief explanation
- End with the player winning. This is a critical design requirement — a player who wins their first match has a positive first memory, which drives the second session. The bot map should be small and easy enough that victory is achievable in 3–4 minutes.

The singleplayer mission infrastructure is already built. A tutorial is essentially Mission Level 0 with a tooltip overlay system added on top.

**Note:** the spawn selection tooltip in the tutorial should reflect the auto-spawn mechanic introduced in Task 4a. Instead of *"Click the map to choose your starting location"*, it should say something like *"You've been placed automatically — tap anywhere to choose a different spot"*.

---

### 4a. Auto-Spawn — Automatic Starting Location on Join
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — this is a universal UX fix that applies to all players in all matches. Running it as an experiment would mean a portion of new players continue to experience the broken state we already know is a problem. Ship to all players.

**How impact will be measured:** the `Match:SpawnAuto` and `Match:SpawnChosen` events (Task 2d) directly measure this task's effect. Before Task 4a ships, SpawnAuto should be zero (no auto-placement exists). After it ships, the ratio of SpawnAuto to total spawn events tells you how many players were being missed by the old flow. Over time, as players learn the mechanic, SpawnChosen should increase relative to SpawnAuto.

A significant number of new players never make their first action because they don't realize they need to click the map to choose a spawn location. Even though a text prompt exists, it is easy to miss — especially on mobile. The result is a player who sits through the entire spawn phase and enters the match without a territory, or misses the window entirely.

**The fix:** place every player automatically at a valid spawn location the moment they join the match. They retain the ability to tap or click a different location at any point during the spawn phase if they want to reposition. There is no delay — instant placement is strictly better because it immediately communicates to the player that they are in the game and have a position on the map. Experienced players who have a preferred location will simply click it immediately, overriding the auto-placement as before.

**Key behaviors:**
- Auto-placement happens instantly on join, before the player has taken any action
- Show a brief contextual message near their placed location: *"You've been placed here. Tap anywhere to choose a different starting point"*
- The message must be clearly visible on mobile screens
- The player can reposition at any point during the remaining spawn phase by tapping or clicking any valid location
- This applies to all match types — singleplayer, public, and private

**Spawn location quality:** purely random placement can put a new player in a poor strategic position — surrounded by strong opponents with no room to expand — leading to early elimination before they've understood the game. The developer should check whether the existing spawn logic can be extended to bias auto-placement toward lower-competition areas such as map edges or zones with fewer nearby opponents. If this is straightforward, it should be included. If it adds significant complexity, random placement is acceptable for V1 and can be refined later.

---

## Sprint 3 — Deepen Retention (Data-Driven)

**Goal:** Address deeper mobile performance issues, but only once analytics from Sprint 1 confirms the investment is justified.

### 5. Deep Mobile Rendering Optimization
**Effort:** 3–6 weeks
**Experiments:** ❌ Excluded — rendering architecture changes affect all users uniformly by nature, and maintaining two parallel rendering pipelines would require disproportionate engineering effort. Ship to all users and measure via analytics.

The underlying problem for mid-range Android devices is that Pixi.js canvas rendering with multiple layers, real-time unit movement, and 32 tile types is genuinely heavy. The `TerrainLayer` and `TerritoryLayer` redrawing on every tick is the likely primary culprit for tab crashes.

Proper fixes include:
- Dirty-rect rendering: only redraw tiles that have actually changed
- Viewport culling: don't render tiles outside the visible screen area
- Texture atlasing review and optimization

**This task is gated on data.** Only proceed if the following two conditions are both true after Task 3 has been live for at least two weeks:
- `Session:Heartbeat` events (Task 2d) show that mobile players are still dropping off significantly earlier than desktop players — meaning Task 3 did not close the gap sufficiently
- `Performance:FPS` events (Task 2e) show a meaningful proportion of mobile players still in the `Below15` or `15to30` buckets after Task 3 shipped

If Task 3 moved both metrics to acceptable levels, this task should be deprioritized in favor of other roadmap items. Do not invest 3–6 weeks based on assumption.

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

### 8. Verified Player (Citizen) Tier — Identity & Membership System
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — verification mark and purchase/earn options are additive. Players not in the experiment group see no change. Success metric: citizen tier adoption rate (earned + purchased combined), return visit rate for citizens vs non-citizens, and progress bar engagement rate.

This task establishes the **Citizen tier** — a community membership layer for committed players. Citizens get a visible verification mark that other players see during matches, and over time they gain access to participation mechanics (map voting, tournaments, moderation trust) that regular players don't have. The tier is about community membership and influence, not pay-to-win — every privilege it grants affects the meta-experience around the game, never the game outcome itself.

**Two paths to citizenship — both lead to the same tier:**

**Path 1 — Earned (free):** complete 50 qualifying matches. A match qualifies if the player was alive past the halfway point of the match — this prevents the obvious exploit of joining and immediately quitting. The exact threshold (halfway point, or a fixed minimum duration) should be determined by the developer based on average match length data from analytics.

A progress bar is displayed to all non-citizen players showing their current count toward 50. This is one of the most important retention mechanics in this task — a player who can see they are at 34/50 has a specific reason to come back. The progress bar must always be visible, not buried in a settings menu.

**Path 2 — Instant purchase (cheap):** pay a small fee (suggested: 49–99 rubles) to unlock citizenship immediately. This option is shown alongside the progress bar with clear framing — players who want to skip the grind can do so at minimal cost. The low price is intentional: citizenship is a hook for retention, not a primary revenue source. Revenue comes from the privileges citizens spend on (nickname, styling, patterns), not from citizenship itself.

**What a citizen gets:**
- Verification mark displayed next to their name in all contexts — in-match, leaderboard, post-match, diplomacy UI
- Custom nickname (separate purchase, see below)
- Access to map voting (Task 14)
- Future privileges as the tier evolves (tournaments, moderation trust, early access)

**Custom nickname — a citizenship privilege, not a separate product:**

The ability to change and verify your nickname is a privilege that comes with citizenship. There is no separate "nickname purchase" flow. If a non-citizen player tries to change their nickname, they are directed to the citizenship flow — earn it or buy it — and once they become a citizen, the nickname change proceeds.

The rules for nickname changes once a player is a citizen:

| Situation | Cost |
|---|---|
| Citizen, has never changed nickname | First change is free |
| Citizen, has already changed nickname once or more | Small fee per subsequent change (suggested: 29–49 rubles) |

Every nickname change — including the first free one — goes through manual review due to Yandex's UGC rules. The review process and admin panel apply to all changes.

**Nickname change and review flow:**
- Player initiates a nickname change (free or paid depending on their history, per the table above)
- Clear upfront communication: review takes 24–72 hours
- If the name is rejected: fee is refunded if paid, free slot is returned if it was a free change — player is notified with the reason
- Admin panel: review queue with approve/reject and automatic player notification

**Architectural requirement — centralized name rendering:** player names appear in multiple places across the game. The verification mark must be implemented through a single centralized name rendering component. This is a hard requirement. Future tasks (8a, 10, 14) depend on this foundation.

**Key risks:**
- Progress bar count must be accurate and never lose progress — losing tracked match count would feel like a betrayal to players close to the threshold
- Review queue SLA must be honored for nickname purchases
- Verify Yandex platform payment cut applies to both purchase paths and price accordingly

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

## Complete Priority Table

| # | Item | Effort | Experiments | Primary Benefit | Sprint |
|---|------|--------|-------------|-----------------|--------|
| 1 | Analytics — session & match event tracking | 1–2 days | ❌ Excluded | Informs everything else, baseline measurement | 1 |
| 2 | Tab crash reconnection | Already implemented | ✅ Test | Reduces ghost rate, more ad impressions | 1 |
| 2a | Reconnection analytics instrumentation | 0.5–1 day | ❌ All users | Measures whether reconnection is actually working and being used | 1 |
| 2b | In-game feedback button (start screen + battle screen) | 2–3 days | ❌ All users | Opens player feedback channel before further changes ship | 1 |
| 2c | Automatic device & environment info collection | 1–2 days | ❌ All users | Enriches feedback reports with device context for bug reproduction | 1 |
| 2d | Additional analytics events — session depth & spawn behavior | 1–2 days | ❌ All users | Enables funnel construction; measures spawn confusion and session drop-off | 1 |
| 2e | Performance monitoring events (FPS & memory sampling) | 2–3 days | ❌ All users | Measures rendering performance by device class; gates Task 5 decision | 1 |
| 2f | Device type analytics event | 0.5 days | ❌ All users | Enables device-segmented funnels (mobile vs desktop) | 1 |
| 3 | Mobile quick wins (retina off, 30fps cap, FX reduction) | 2–3 days | ❌ Excluded | Reduces crash abandonment, more ad impressions | 1 |
| 4a | Auto-spawn — automatic starting location on join | 1–2 days | ❌ All users | Eliminates zero-action abandonment at match start | 2 |
| 4 | Tutorial — guided first bot match | 1–2 weeks | ✅ Test | Biggest new player conversion lever | 2 |
| 5 | Deep mobile rendering optimization | 3–6 weeks | ❌ Excluded | Only if analytics confirms mobile worth the investment | 3 |
| 6 | Rewarded ads — minimal version (no coin economy) | 2–3 days | ✅ Test | Yandex algorithm boost, first monetization signal | 4 |
| 7 | Leaderboard — core system (global + monthly, auth gate) | 1–2 weeks | ✅ Test | Replaces buggy Yandex built-in, drives Yandex login conversion | 4 |
| 8 | Citizen tier — earned path + instant purchase + nickname system | 1–2 weeks | ✅ Test | Retention hook (progress bar); community membership; revenue foundation | 4 |
| 9 | Re-enable flags | 1 week | ✅ Test | Identity feature, drives Yandex login, upsell surface | 4 |
| 9a | Re-enable territory patterns | 1 week | ✅ Test | High-visibility cosmetic; upsell surface; more impactful than flags | 4 |
| 10 | Leaderboard — rewards layer (badges, collectible period awards) | 3–5 days | ✅ Test | Competitive motivation, social proof, long-term prestige | 5 |
| 8a | Nickname styling system (backgrounds, borders, text color) | 1–2 weeks | ✅ Test | ARPU upsell for nickname buyers, social visibility | 5 |
| 11 | Coin economy + rewarded ads full version | 3–4 weeks | ❌ Excluded | Core F2P engagement loop | 5 |
| 12 | Clans | 3–4 weeks | ✅ Test | Long-term retention, social monetization | 5 |
| 14 | Map voting for verified players | 1–2 weeks | ✅ Test | Verified tier participation mechanic; retention for engaged players | 5 |
| 13 | Replay access as premium feature | 3–5 days | ❌ Excluded | ARPU increase, needs tier system from #11 first | 5 |
