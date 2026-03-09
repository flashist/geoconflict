# Geoconflict — Post-Sprint 2 Hotfix Tasks

Hotfix release between Sprint 2 and Sprint 3. These tasks are small, low-risk, and time-sensitive — the tutorial is live and generating data right now.

---

## HF-1. Experiment Flag Analytics
**Effort:** 2–3 hours
**Brief:** `task-experiment-analytics.md`
**Status:** In progress

Fire `Experiment:Tutorial:Enabled` and `Experiment:Tutorial:Disabled` at the Yandex experiment flag evaluation point in `Main.ts`. Unblocks control group funnel analysis. Every day without this fix is unrecoverable lost data.

Also establishes the required `Experiment:{Name}:{Variant}` convention for all future experiments.

---

## HF-2. Tutorial Skip Button — Inline Link
**Effort:** 1–2 hours
**Brief:** `hotfix-tutorial-skip-visibility.md`
**Status:** Pending

Add a secondary "Skip tutorial" text link directly below the "Got it" button inside each tooltip modal. Plain white underlined text, visually subordinate to the primary action. Wired to the existing `skipTutorial()` method. Corner button remains in place.

**Note:** analytics for both skip buttons are covered by HF-3 below — do not add skip-specific analytics in this task.

---

## HF-3. UI Tap Analytics — `UI:Tap:{ElementId}`
**Effort:** 2–3 hours
**Brief:** `hotfix-hf3-ui-tap-analytics.md`
**Status:** Pending

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
**Status:** Pending

Critical mobile bug. The `control-panel` container has a full-width hit area on mobile even though its visible content is only ~320px wide. The transparent right portion intercepts all touch events, blocking map interactions on the right half of the screen for all mobile players in all match types.

Fix: `pointer-events: none` on the container with `pointer-events: auto` restored on interactive children — or constrain container width to match content width on mobile.

---

## Hotfix Release Checklist

- [ ] HF-1 deployed and verified — `Experiment:Tutorial:Enabled/Disabled` appearing in GameAnalytics
- [ ] HF-2 deployed and verified — inline skip link visible in all tooltip modals
- [ ] HF-3 deployed and verified — `UI:Tap:TutorialSkipCorner` and `UI:Tap:TutorialSkipInline` appearing in GameAnalytics
- [ ] HF-4 deployed and verified — right half of map tappable on mobile while control panel is visible
- [ ] No new Sentry errors introduced by any of the four changes
