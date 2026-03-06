# Geoconflict — Sprint 3 — Deepen Retention (Data-Driven)

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 3 — Deepen Retention (Data-Driven)

**Goal:** address infrastructure quality and UX issues that affect all players. Mobile performance work has been formally parked based on analytics data — see Task 5 below.

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