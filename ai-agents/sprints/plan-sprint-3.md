# Geoconflict — Sprint 3 — Deepen Retention (Data-Driven)

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 3 — Deepen Retention (Data-Driven)

**Goal:** address infrastructure quality and UX issues that affect all players. Mobile performance work has been formally parked based on analytics data — see Task 5 below.

> **Note:** Before Sprint 3 begins, a small hotfix release ships five changes: experiment flag analytics (HF-1), tutorial skip button inline link (HF-2), UI tap analytics (HF-3), mobile control panel hit area bug (HF-4), and win condition detection bug fix (HF-5). See `hotfix-post-sprint2.md` for details.

## Sprint 3 Status

| Status | Task | Brief |
|---|---|---|
| ⬜ Backlog | Humans vs Nations — Re-enable | `s3-humans-vs-nations-task.md` |
| ⬜ Backlog | Feedback — Attach Last Match IDs | `s3-feedback-match-ids-simple-task.md` |
| ⛔ Parked | Deep Mobile Rendering Optimization | — |
| ⬜ Backlog | 5c. Mobile Warning Screen | `s3-5c-task-mobile-warning.md` |
| ⬜ Backlog | 5b. Server Restart UX | `s3-5b-task-server-restart-ux.md` |
| ✅ Done | 5d-A. Server System Metrics (OTEL) | `s3-5d-a-task-server-metrics.md` |
| ✅ Done | 5d-B. Server Performance & Uptrace Instrumentation | `s3-5d-b-task-server-performance.md` |
| ✅ Done | HF-11a. Stale Builds — Investigation | `s3-hf11a-hotfix-stale-build-investigation.md` |
| ✅ Done | HF-11b. Stale Builds — Version Endpoint | `s3-hf11b-hotfix-version-endpoint.md` |
| ✅ Done | HF-11c. Stale Builds — Client Detection | `s3-hf11c-hotfix-stale-build-detection.md` |
| ✅ Done | HF-11d. Stale Builds — Blocking Modal | `s3-hf11d-hotfix-stale-build-modal.md` |
| ⛔ Cancelled | HF-11e. Stale Builds — BUILD_NUMBER Automation | `s3-hf11e-hotfix-build-number-automation.md` |
| ✅ Done | HF-12. Spawn Camera/Animation Timing Fix | `s3-hf12-hotfix-spawn-camera-timing.md` |
| ⬜ Backlog | HF-13. Map File Preloading on JOIN | `s3-hf13-hotfix-map-preload.md` |

---

### Humans vs Nations — Re-enable Existing Mode
**Effort:** half a day (assuming single flag/config reversal — see brief)
**Experiments:** ❌ Excluded — ships to all players.

Humans vs Nations is an existing mode where human players compete against AI-controlled nation bots. Disabled early due to low concurrent player counts and observed errors. Safe to re-enable now — unlike Teams mode, AI nations fill all non-human slots regardless of lobby size, so the match runs correctly even with one human player.

Key steps: identify exactly how it was disabled (flag, config, commented-out code), confirm the errors at disable time were Teams-mode-specific not this mode, verify locally, then re-enable. If re-enabling requires more than reversing a single gate, escalate before proceeding.

Teams mode stays disabled — the lobby composition error for that mode is unresolved.

See full brief: `task-humans-vs-nations.md`

---

### Feedback — Attach Last Match IDs to Submissions (Simple)
**Effort:** 2–3 hours
**Experiments:** ❌ Excluded — backend debugging infrastructure.

Replaces the cancelled `task-feedback-match-history.md`. Narrower scope: read the last 3 game IDs from the existing `localStorage['game-records']` structure (already written by `LocalPersistantStats.ts`) and attach them to the feedback payload. No new localStorage writes, no new data structures.

A match ID is all that is needed to look up the full match in the archive API and attempt replay or diagnosis. Client-side only change — no server changes required.

See full brief: `task-feedback-match-ids-simple.md`

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

### 5d-A. Server System Metrics Monitoring via OpenTelemetry
**Effort:** 2–4 days (including Part A investigation and possible backend setup)
**Experiments:** ❌ Excluded — monitoring infrastructure.

Player lag reports may be caused by server resource exhaustion — CPU pressure, memory/GC pauses, or bandwidth saturation — on modest hardware (16GB RAM, unknown bandwidth). The server already uses OTEL but it is unconfirmed whether it is connected to a live backend in production.

**Part A — investigation first:** confirm OTEL is active and connected. If no backend exists, set one up (Grafana + Prometheus + OTEL Collector). Use existing OTEL infrastructure — no parallel monitoring solutions.

**Part B — collect eight metrics every 60 seconds:** CPU usage, memory used/total, active match count, connected players, network I/O bytes sent/received, and Node.js event loop lag. Event loop lag is the most critical — a 50–200ms block causes simultaneous freezes for all players in all active matches.

**Part C — basic dashboard:** all eight metrics visible over time, enabling direct correlation with 5d-B Sentry transaction data.

See full brief: `task-5d-a-server-metrics.md`

---

### 5d-B. Server Performance Investigation & Uptrace Instrumentation
**Status:** ✅ Largely complete — instrumentation shipped, awaiting data
**Experiments:** ❌ Excluded — diagnostic and monitoring infrastructure.

Investigation complete (see `server-performance-investigation.md`). Key finding: **the server does not execute game logic** — `executeNextTick()` runs on the client. Server per-tick work is turn assembly, sync check, and WebSocket broadcast only.

**Ranked suspects:** (1) Worker overload from hash-based routing — multiple large matches on one worker, invisible until now; (2) GC pauses from `this.turns` growing indefinitely — ~162,000 Turn objects retained per 3-hour match; (3) Turn broadcast serialization cost at high client counts.

**Instrumentation shipped:** `endTurn()` wrapped with threshold-based OTEL spans (>100ms threshold). Span structure: `server.turn.process → turn.assembly → synchronization → turn.broadcast` with attributes including `game.id`, `turn.number`, `intents.count`, `clients.active`, `message.size_bytes`. Zero overhead on normal turns.

**What remains:** wait for slow turn data to accumulate in Uptrace, then correlate with 5d-A system metrics to confirm which suspect is responsible.

**Technical debt flagged:** `this.turns` growing indefinitely is a memory concern at scale — not urgent now but worth a dedicated cleanup task before player counts grow significantly.

See full brief: `task-server-performance.md`

---
### HF-11a. Stale Build Sessions — Investigation
**Effort:** 1–2 hours
**Experiments:** ❌ Excluded.
**Status:** ✅ Complete — see `hf11a-stale-build-findings.md`

Zombie tabs confirmed as sole cause. CDN, browser cache, and BUILD_NUMBER hypotheses all ruled out. HF-11b/c/d fix direction confirmed correct and complete. `null` build sessions (140 users) flagged as separate minor anomaly to investigate separately.

See findings: `hf11a-stale-build-findings.md`

---

### HF-11b. Stale Build Sessions — Version Endpoint
**Effort:** 1–2 hours
**Experiments:** ❌ Excluded.
**Status:** ✅ Complete

Add `GET /api/version` endpoint returning `{ "build": "CURRENT_BUILD" }` with `Cache-Control: no-cache, no-store` headers. Pure server-side change. Unblocks HF-11c.

See full brief: `hf11b-hotfix-version-endpoint.md`

---

### HF-11c. Stale Build Sessions — Client Detection
**Effort:** 2–3 hours
**Experiments:** ❌ Excluded.
**Status:** ✅ Complete

Three detection triggers: on startup, polling every 5 minutes, on tab focus. Fires `Build:StaleDetected` analytics event.

See full brief: `hf11c-hotfix-stale-build-detection.md`

---

### HF-11d. Stale Build Sessions — Blocking Modal
**Effort:** 2–3 hours
**Experiments:** ❌ Excluded.
**Status:** ✅ Complete

Wire detection to existing modal component. Non-dismissible overlay with REFRESH button and "Contact support" text link. Confirmed working — `0.0.122` → `0.0.125` transition showed sharp 24-hour cliff vs multi-week decay on older builds without the fix.

See full brief: `hf11d-hotfix-stale-build-modal.md`

---

### HF-11e. Stale Build Sessions — BUILD_NUMBER Automation
**Status:** ⛔ Cancelled — HF-11a confirmed BUILD_NUMBER is already automated via `scripts/bump-version.js` in `build-deploy.sh`. Hypothesis 4 ruled out. No action needed.

---

### HF-12. Spawn Camera/Animation Fires Before Confirmed Placement
**Effort:** half a day (investigation + fix)
**Experiments:** ❌ Excluded — bug fix.
**Status:** ✅ Done
**Depends on:** Task 4b, Task 4e, HF-6 all deployed ✅

On slow connections, the camera zoom and spawn indicator animation fire at intent-send time rather than confirmed-placement time. The player sees the camera move and the animation play at a position where they are not actually placed — they end up spawned elsewhere with the camera pointing at the wrong spot.

Fix: move camera zoom (`zoomToTerritory()`) and spawn indicator animation to fire when the server's spawn confirmation is received by the client, not when the intent is dispatched. Manual spawn tap camera behaviour must not change — only auto-spawn is affected.

See full brief: `hf12-hotfix-spawn-camera-timing.md`

---

### HF-13. Map File Preloading on JOIN
**Effort:** 1–2 days (investigation + implementation)
**Experiments:** ❌ Excluded — performance improvement.
**Depends on:** HF-6 deployed ✅

Reduces frequency of `Match:SpawnMissed:CatchupTooLong` by starting map asset loading as soon as the player clicks JOIN — before the match starts. Map identity is known at JOIN time so preloading is precise, not speculative. Assets load silently in the background during lobby wait; match initialisation uses the cached assets instead of loading from scratch, shortening the catch-up window.

Key requirements: fire-and-forget at JOIN, no duplicate loading if match starts mid-preload, graceful failure fallback, assets released on lobby cancel.

Analytics: `Match:PreloadHit` with value = seconds saved is the key metric for evaluating impact on `CatchupTooLong` rate.

See full brief: `hf13-hotfix-map-preload.md`
