# Geoconflict — Sprint 1 — Stop the Bleeding

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

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

### 2f. Device Type & Platform OS Analytics Events
**Effort:** Already implemented and deployed ✅
**Experiments:** ❌ Excluded — measurement layer. Must cover all players to produce valid funnel data.

**Depends on:** Task 2d (Session:Start event must exist, as these events fire immediately after it)

Two events, both fired once per session immediately after `Session:Start`. All three session-start events fire in sequence: `Session:Start` → `Device:Type` → `Platform:OS`.

**Device:Type** — identifies the player's device class:
- `Device:mobile`, `Device:desktop`, `Device:tablet`, `Device:tv`

Enables device-segmented funnels — essential for comparing mobile vs desktop conversion and drop-off patterns before and after Tasks 3 and 5.

**Platform:OS** — identifies the player's operating system:
- `Platform:android`, `Platform:ios`, `Platform:windows`, `Platform:macos`, `Platform:linux`, `Platform:other`

Enables OS-segmented analysis. Knowing crashes are on "mobile" is useful; knowing they are specifically on Android vs iOS is actionable — these are different rendering environments with different browser engines and device fragmentation profiles. Combined with `Performance:FPS` events (Task 2e), this tells you whether mobile performance problems are Android-specific or affect both platforms equally, which directly shapes what Tasks 3 and 5 should prioritize.

Both events should reuse whatever user agent detection logic already exists in the codebase from Tasks 2e, 3, and the feedback system. Do not introduce a second detection implementation.

---

### 2g. New vs Returning Player Analytics Event
**Effort:** half a day
**Experiments:** ❌ Excluded — measurement layer. Must cover all players to produce valid funnel data.

**Depends on:** Task 2d (Session:Start must exist; this event fires in the same session-start sequence)

One additional event to add to the session-start sequence alongside `Device:Type` and `Platform:OS`. The full sequence becomes: `Session:Start` → `Device:Type` → `Platform:OS` → `Player:New` or `Player:Returning`.

**Event to implement:**
- `Player:New` — fired on the player's very first session
- `Player:Returning` — fired on every subsequent session

Detection: check for a first-open flag stored server-side (preferred) or in localStorage. If the flag is absent, fire `Player:New` and set the flag. If present, fire `Player:Returning`.

**Why this matters:** GameAnalytics tracks new vs returning users automatically in its summary metrics, but cannot segment *funnels* by this dimension without a dedicated Design Event. Without it, the impact of the tutorial (Task 4) is difficult to measure cleanly — new and returning players get mixed together in the same funnel, diluting the signal. With it, you can run the new player conversion funnel exclusively on `Player:New` sessions and see Task 4's effect without noise from returning players who already know how to play.

---

### 2h. Sentry Integration — Error & Crash Monitoring
**Effort:** half a day
**Experiments:** ❌ Excluded — monitoring infrastructure, must cover all players.

Sentry captures unhandled JavaScript exceptions, promise rejections, and runtime errors in real time with full stack traces and browser/OS context. This fills the gap that GameAnalytics cannot — it tells us *what the application is doing wrong*, not just what players are doing.

Must ship before Task 3 so that the current error baseline is captured. After Task 3 ships, Sentry will confirm whether the crashes causing mobile abandonment have been resolved or whether different errors have emerged.

**Critical requirements:**
- Initialize Sentry before any other game logic — it must be running before anything else can throw
- Upload source maps as part of the deployment pipeline — without them, stack traces point to minified code and are unreadable
- Attach player identity (Yandex username or AnonXXXX) to error reports via `Sentry.setUser()`
- Tag events with `release` (current game version) and `environment: "production"`

Free tier: 5,000 errors/month — sufficient at current scale. Do not enable Sentry's built-in session replay; Microsoft Clarity (Task 2i) handles this better.

---

### 2i. Microsoft Clarity — Session Recordings & Heatmaps
**Effort:** half a day
**Status:** ⏸ Deferred — do not ship until after Task 3 has been live for at least two weeks and mobile performance is confirmed stable via `Performance:FPS` and `Session:Heartbeat` analytics.
**Experiments:** ❌ Excluded — monitoring infrastructure, must cover all players.

Clarity provides session recordings and heatmaps that would be valuable for diagnosing the ghost rate, spawn confusion, and mobile UX problems. However, Clarity works by snapshotting the Pixi.js canvas at a continuous interval, which carries a real risk of causing frame drops on mid-range and low-end mobile devices — exactly the players most at risk of abandonment.

Without a large QA device pool to validate performance impact before shipping, there is no safe way to confirm Clarity doesn't worsen the mobile experience before it reaches real users. Sentry (Task 2h) and the existing analytics events provide sufficient diagnostic coverage in the meantime.

**Gate conditions before shipping Clarity:**
- Task 3 has been live for at least two weeks
- `Performance:FPS` events show mobile FPS has stabilized — the `Below15` bucket is not growing
- `Session:Heartbeat` shows mobile session depth is not declining

When these conditions are met, ship Clarity with mobile session sampling configured at 20–30% (not 100%) to limit canvas snapshotting overhead on mobile. Record 100% of desktop sessions. After shipping, monitor `Performance:FPS` and `Session:Heartbeat` for any regression within the first 48 hours.

**Note:** the custom Clarity tags (deviceType, playerType, authStatus) should reuse detection logic from Tasks 2f and 2g when this task eventually ships.

---

### 2j. Spawn Behavior Anomaly Investigation ✅ Complete
**Resolved:** fix deployed, confirmed via analytics after 48 hours.

**What was found:** `Match:SpawnChosen` was triggered by a touch event listener only — mouse clicks on desktop never fired the event. The 8.8% desktop spawn rate was a measurement artifact, not real player behavior.

**Fix applied:** mouse click handling added alongside touch events. After the fix deployed, Funnel 7 now shows ~20% ghost rate on both desktop and mobile — consistent, trustworthy, and platform-agnostic.

**What the real data tells us:** the ghost rate is not a mobile-specific problem caused by crashes. It is a universal onboarding and engagement issue affecting both platforms equally. Task 4a (auto-spawn) and Task 4c (auto-expansion) are the correct interventions. The Task 5 gate decision (deep mobile rendering overhaul) should be made on FPS and Heartbeat data, not ghost rate.

Task 4a's dependency on this task is now cleared — auto-spawn can proceed.

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