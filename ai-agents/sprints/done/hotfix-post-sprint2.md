# Geoconflict — Post-Sprint 2 Hotfix Tasks

Hotfix release between Sprint 2 and Sprint 3. These tasks are small, low-risk, and time-sensitive — the tutorial is live and generating data right now.

---

## HF-1. Experiment Flag Analytics
**Effort:** 2–3 hours
**Brief:** `task-experiment-analytics.md`
**Status:** ✅ Done

Fire `Experiment:Tutorial:Enabled` and `Experiment:Tutorial:Disabled` at the Yandex experiment flag evaluation point in `Main.ts`. Unblocks control group funnel analysis. Every day without this fix is unrecoverable lost data.

Also establishes the required `Experiment:{Name}:{Variant}` convention for all future experiments.

---

## HF-2. Tutorial Skip Button — Inline Link
**Effort:** 1–2 hours
**Brief:** `hotfix-tutorial-skip-visibility.md`
**Status:** ✅ Done

Add a secondary "Skip tutorial" text link directly below the "Got it" button inside each tooltip modal. Plain white underlined text, visually subordinate to the primary action. Wired to the existing `skipTutorial()` method. Corner button remains in place.

**Note:** analytics for both skip buttons are covered by HF-3 below — do not add skip-specific analytics in this task.

---

## HF-3. UI Tap Analytics — `UI:Tap:{ElementId}`
**Effort:** 2–3 hours
**Brief:** `hotfix-hf3-ui-tap-analytics.md`
**Status:** ✅ Done

Establish `UI:Tap:{ElementId}` as the standard convention for tracking UI element interactions, and instrument the first two elements immediately.

**Convention:**
- Event format: `UI:Tap:{ElementId}` following the existing `Category:Subcategory:Value` pattern
- ElementId should be descriptive and PascalCase: e.g. `TutorialSkipCorner`, `TutorialSkipInline`
- Only add to UI elements explicitly listed — this is opt-in instrumentation, not automatic tracking of all clicks
- Add new enum keys to `flashistConstants.analyticEvents` following the existing pattern

**V1 — instrument these two elements only:**

| Event String | Element | When Fired |
|---|---|---|
| `UI:Tap:TutorialSkipCorner` | Existing top-right corner skip button | Player clicks the corner skip button |
| `UI:Tap:TutorialSkipInline` | New inline skip link (HF-2) | Player clicks the inline skip link |

**Why this matters:** both buttons call the same `skipTutorial()` method and both fire `Tutorial:Skipped`. Without separate `UI:Tap` events there is no way to know which button triggered the skip — making it impossible to measure whether the inline link fixed the visibility problem.

**Update analytics event reference:** add `UI:Tap:{ElementId}` to the event reference document under UI Events, with a note that this pattern is opt-in and must be explicitly added per element.

**Future candidates** (do not instrument in this hotfix — add when relevant):
- Main menu buttons (Multiplayer, Singleplayer)
- Find me button (Task 4b)
- Announcements bell icon

---

## HF-4. Mobile Control Panel Hit Area Bug
**Effort:** 1–2 hours
**Brief:** `hotfix-hf4-control-panel-hit-area.md`
**Status:** ✅ Done

Critical mobile bug. The `control-panel` container has a full-width hit area on mobile even though its visible content is only ~320px wide. The transparent right portion intercepts all touch events, blocking map interactions on the right half of the screen for all mobile players in all match types.

Fix: `pointer-events: none` on the container with `pointer-events: auto` restored on interactive children — or constrain container width to match content width on mobile.

---

## HF-5. Win Condition Detection Bug
**Effort:** 1–3 days (investigation + fix; scope depends on root cause)
**Brief:** `hotfix-hf5-win-condition-bug.md`
**Status:** ✅ Done

Critical retention bug. Players completing singleplayer missions after 30–60 minutes report the win dialogue never appears. Root cause unknown — structured as Part A (investigation) then Part B (fix).

Primary suspects: ghost players blocking the win condition check (~20% ghost rate means one in five players could be an unresolved game state entry), bot elimination event not firing on last territory capture, race condition between last capture and win check, or WinModal failing to render silently.

Part A must complete before any code is written.

---

## HF-6. Auto-Spawn Failure — Player Stuck Unable to Place
**Effort:** 1–2 days (investigation + fix)
**Brief:** `task-autospawn-bug-investigation.md`
**Status:** ✅ Done

Root cause confirmed: auto-spawn was firing during the client catch-up fast-forward window (for late joiners), before the client was in sync with the server. The spawn intent was sent but rejected server-side, while the client marked itself as already having attempted — leaving the player permanently stuck. Affected ~0.36% of spawn sessions (1 in 275).

Fix: auto-spawn now waits until fast-forward is fully complete before sending the spawn request. New event `Match:SpawnRetryAfterCatchup` fires when the fix saves a player — this is the key signal to watch after deploy.

**Known limitation not yet fixed:** if catch-up takes longer than the entire spawn phase, the player is still stuck. Tracked as `Match:SpawnMissed:CatchupTooLong` — separate task required.

---

## HF-7. Build Number Tracking via GameAnalytics Custom Dimension
**Effort:** 1–2 hours
**Brief:** `hotfix-hf7-build-number.md`
**Status:** ✅ Done

Without build segmentation, any metric change after a deployment is unattributable. Especially critical right now with the tutorial experiment running across multiple deployments.

Implementation: configure Custom Dimension 01 in the GameAnalytics dashboard, define a `BUILD_NUMBER` constant in the codebase, call `setCustomDimension01(BUILD_NUMBER)` immediately after SDK init. All subsequent events carry the build value automatically — no event schema changes needed.

**Important:** new build values must be pre-registered in the GA dashboard before each deploy, otherwise the dimension value is rejected.

---

## HF-8. Tutorial Attempt Number on Tutorial:Started Event
**Effort:** 1–2 hours
**Brief:** `hotfix-hf8-tutorial-attempt-count.md`
**Status:** ✅ Done
**Depends on:** HF-7 — deploy after build number tracking so attempt data is immediately segmentable by build

Extends `Tutorial:Started` with a lifetime attempt count as the event value. A new `tutorialAttemptCount` key in localStorage is incremented on each `Tutorial:Started` fire and persisted across sessions. Value 1 = first ever attempt, 2 = second, etc. Enables distinguishing first-time abandonment from restart loops in the 2.9K vs 731 gap analysis. No new event, no funnel breakage, no GA dashboard configuration required.

---

## HF-9. Remove `#refresh` History Push for All Non-Tutorial Game Types
**Effort:** 30 minutes
**Brief:** `hotfix-hf9-remove-refresh-push.md`
**Status:** ✅ Done
**Context:** PR #45 (merged & deployed) fixed the double-reload for tutorial games. This task completes the fix for all remaining game types by removing the `#refresh` push entirely — it was part of a two-step history pattern whose second step (`#join=gameID`) is disabled for all game types in this codebase.

One-line change: delete the `history.pushState` block in `handleJoinLobby()` in `Main.ts`. Low risk, high impact on analytics data quality.

---

## HF-10. Cache Busting & Build Freshness Guarantee
**Effort:** 2–4 hours (investigation + config changes)
**Brief:** `hotfix-hf10-cache-busting.md`
**Status:** Pending — critical, include in next release

Players are running stale cached builds, reporting analytics under old or missing build numbers and potentially still experiencing already-fixed bugs. Three-part fix: (A) investigate current cache configuration, (B) add content hash to bundle filenames so changed bundles get new URLs, (C) set `Cache-Control: no-cache` on the HTML entry point so it is always fetched fresh. Also confirm whether Yandex Games has its own CDN caching layer that requires a separate invalidation step on publish.

---


---

## HF-11. Stale Build Sessions — Investigation & Fix
**Effort:** R&D — 2–5 days depending on findings
**Brief:** `hf11-hotfix-stale-build-sessions.md`
**Status:** Pending — high priority

Returning users on old builds (0.0.99, 0.0.102, 0.0.104) persist in analytics despite newer builds being deployed. Players on stale builds may be experiencing broken gameplay silently — feedback data shows old-build players are not submitting reports, suggesting the feedback form itself may be non-functional for them.

Primary hypothesis: zombie tabs — players who opened the game before the latest deploy and never closed the tab. The old JavaScript bundle continues running in memory indefinitely; no cache-busting mechanism can reach an already-loaded page.

Secondary hypotheses: Yandex CDN caching old HTML, aggressive browser cache persistence, BUILD_NUMBER not updated on deploy.

**Investigation first** — confirm which hypothesis explains the data before implementing fixes. Primary fix direction (if zombie tabs confirmed): version polling endpoint + client-side stale build detection with a non-dismissible update banner. Never auto-reload during an active match.

## Hotfix Release Checklist

- [x] HF-1 deployed and verified — `Experiment:Tutorial:Enabled/Disabled` appearing in GameAnalytics
- [x] HF-2 deployed and verified — inline skip link visible in all tooltip modals
- [x] HF-3 deployed and verified — `UI:Tap:TutorialSkipCorner` and `UI:Tap:TutorialSkipInline` appearing in GameAnalytics
- [x] HF-4 deployed and verified — right half of map tappable on mobile while control panel is visible
- [x] HF-5 — ⛔ Cancelled & reverted. See cancelled-tasks.md
- [x] HF-6 deployed and verified — auto-spawn places on valid tile; manual placement works correctly if auto-spawn fails
- [x] HF-7 deployed and verified — Custom Dimension 01 showing correct build value in GameAnalytics Explorer
- [x] HF-8 deployed and verified — `Tutorial:Started` events showing attempt values > 1 for returning players in GameAnalytics Explorer
- [x] HF-9 deployed and verified — single `Session:Start` per session after browser refresh following a non-tutorial game
- [ ] HF-10 deployed and verified — no events appearing under old build versions 48h after deploy; HTML entry point serving no-cache headers
- [x] PR #45 merged and deployed — double-reload fixed for tutorial games, NaN guard on attempt counter
- [x] No new Sentry errors introduced
