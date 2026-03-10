# Geoconflict — Sprint 3 — Deepen Retention (Data-Driven)

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 3 — Deepen Retention (Data-Driven)

**Goal:** address infrastructure quality and UX issues that affect all players. Mobile performance work has been formally parked based on analytics data — see Task 5 below.

> **Note:** Before Sprint 3 begins, a small hotfix release ships five changes: experiment flag analytics (HF-1), tutorial skip button inline link (HF-2), UI tap analytics (HF-3), mobile control panel hit area bug (HF-4), and win condition detection bug fix (HF-5). See `hotfix-post-sprint2.md` for details.



### Humans vs Nations — Re-enable Existing Mode
**Effort:** half a day (assuming single flag/config reversal — see brief)
**Experiments:** ❌ Excluded — ships to all players.

Humans vs Nations is an existing mode where human players compete against AI-controlled nation bots. Disabled early due to low concurrent player counts and observed errors. Safe to re-enable now — unlike Teams mode, AI nations fill all non-human slots regardless of lobby size, so the match runs correctly even with one human player.

Key steps: identify exactly how it was disabled (flag, config, commented-out code), confirm the errors at disable time were Teams-mode-specific not this mode, verify locally, then re-enable. If re-enabling requires more than reversing a single gate, escalate before proceeding.

Teams mode stays disabled — the lobby composition error for that mode is unresolved.

See full brief: `task-humans-vs-nations.md`

---

### Feedback — Attach Match History to Submissions
**Effort:** 1 day
**Experiments:** ❌ Excluded — backend debugging infrastructure.

The server archive contains rich match data (full config, players, stats, intent log) accessible via `/game/{gameID}`, but feedback submissions currently have no match ID attached. When a bug report comes in there is no way to look up the specific match where the bug occurred.

This task automatically attaches the last 3 match IDs and their outcomes to every feedback submission — no player action required. On each match end, a minimal record (gameID, map, game type, outcome, timestamp) is written to localStorage. On feedback submission, the last 3 entries are included in the payload automatically.

Match IDs are not shown to the player — they are backend metadata only. Client-side only change.

See full brief: `task-feedback-match-history.md`

---

### 5. Deep Mobile Rendering Optimization — ⏸ Parked
**Effort:** 3–6 weeks (if revisited)

**Parked based on analytics data collected March 2026:**
- Desktop: ~3,500 DAU, returning players average 37–40 min/session, new players 20–25 min/session
- Mobile: ~700 DAU, returning players average 20 min/session, new players 11 min/session
- Mobile returning players spend the same time per session as desktop new players
- iOS shows near-zero return rate — essentially 100% new players every day

The data shows desktop is the core audience and the platform generating meaningful session depth and ad revenue. Mobile users engage at roughly half the depth of desktop users even after returning multiple times. Investing 3–6 weeks of engineering in mobile rendering would serve 700 DAU at shallow engagement while the 3,500 desktop DAU wait for features.

**Condition for revisiting:** mobile DAU exceeds 1,500 consistently, or a dedicated mobile UI redesign (not just rendering optimization) is scoped as a standalone project. Rendering performance is not the primary mobile problem — the game's UI and complexity are fundamentally mismatched with small touch screens, and a rendering overhaul alone would not fix that.

**Task 3 (mobile quick wins) already shipped** — the low-effort improvements are in place. This deeper overhaul is what is being parked.

---

### 5c. Mobile Warning Screen
**Effort:** half a day
**Experiments:** ❌ Excluded — applies to all mobile players.

A simple, honest screen shown to mobile players before they enter the game. The game was designed for desktop and the current mobile experience is limited — players discovering this mid-match is worse than being told upfront.

**What it does:**
- Detected via the existing `Device:mobile` detection logic from Task 2f — no new detection needed
- Shows a non-blocking informational screen on game load for mobile players: "Geoconflict is best on desktop. Mobile support is limited — some UI elements may be hard to use on small screens."
- Include a "Continue anyway" button that dismisses the screen and proceeds normally
- Optionally include a "Open on desktop" prompt pointing players toward desktop
- The screen should not show again for returning mobile players who have already seen it (store a flag in localStorage)

**Why this matters:** if mobile players who would have had a bad experience self-select out after seeing the warning, apparent mobile retention improves — Yandex's algorithm sees fewer single-session mobile users, which improves the game's ranking signals. It also sets honest expectations for players who do continue.

**Analytics:** fire a new event `Mobile:WarningShown` when the screen appears, and `Mobile:WarningSuppressed` vs `Mobile:WarningContinued` based on what the player does. This tells you how many mobile players are choosing to continue despite the warning — useful for deciding if and when to invest in mobile properly.

---

### 5b. Server Restart UX — Notification & Auto-Refresh
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — infrastructure and UX fix, applies to all players.

Currently when the production server is restarted for updates, connected clients drop silently. The game freezes with no message and no recovery path. Players see a frozen screen until they manually refresh — if they realize they need to at all. This happens on every deployment.

**Part A — Pre-restart notification:** before deploying, an admin endpoint triggers a server broadcast warning all connected clients: "Server update in approximately 2 minutes — the game will reload automatically when ready." Clients display this as a non-dismissible banner. After the warning period, the server shuts down. V1 can be triggered manually as part of the deployment process; automation into the pipeline is a nice-to-have.

**Part B — Auto-refresh on recovery (higher priority):** when the client detects a lost connection, it enters a silent polling loop — checking a lightweight server health endpoint every 5–10 seconds — and displays "Server update in progress, you'll be back shortly." When the server responds, the client reloads automatically. No time limit on polling.

**Important:** this polling flow is separate from the Task 2 reconnection flow. Task 2 handles individual player disconnects with a 1-minute match-rejoin window. This flow handles server-wide restarts with no time limit and no match state restoration — just wait and reload. The heuristic for distinguishing them: if the server is unreachable entirely, use the restart polling flow.

Part B can ship independently of Part A and should be prioritized first — it resolves the silent freeze with no deployment process changes required.

---

### 5d. Server Performance Investigation & Sentry Instrumentation
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — diagnostic and monitoring infrastructure.

Desktop players with decent hardware are reporting occasional lag. Client hardware is not the bottleneck — server-side causes or network are the likely candidates. Lag appears infrequent.

**Part A — Investigation first:** map out where server-side lag can theoretically originate — turn processing budget overruns, Node.js GC pauses, intent queue pressure, WebSocket broadcast cost, worker load imbalance, blocking I/O during turn processing. Produce a short written findings document with ranked suspects before any instrumentation begins.

**Part B — Sentry server-side integration:**
- Error tracking always on — unhandled server exceptions currently produce no external signal
- Turn processing wrapped in threshold-based Sentry transactions: capture only if total duration exceeds **100ms** (~1.5× the 67ms tick budget). Normal turns produce zero overhead and zero noise. Slow turns captured with full span breakdown: `intent.collection` → `game.execute` → `turn.broadcast`
- Threshold is a named constant — adjustable without code search
- Separate Sentry project or environment tag from client-side errors

The span breakdown directly identifies the lag source: slow `game.execute` → GC or expensive logic; slow `turn.broadcast` → serialization or WebSocket pressure; all spans slow together → GC pause affecting the entire event loop.

---