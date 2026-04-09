# HF-11d — Stale Build Sessions: Blocking Modal

## Priority
High. Depends on HF-11c (detection logic) being deployed. This is the final step of the stale build fix.

## Context

HF-11c added detection logic that calls `onStaleBuildDetected()` when the client discovers it is running a stale build. This task wires that function to the blocking modal UI, completing the user-facing fix.

## What to Build

### Wire the modal to the detection stub

In `onStaleBuildDetected()` from HF-11c, uncomment and implement the `showStaleBuildModal()` call.

### Modal spec

Use the **existing modal component** already present in the codebase (used for tutorial popups and other cases). Do not create a new component — find and reuse the existing one, parameterised for this use case.

**Required behaviour:**
- Full-screen blocking overlay — cannot be dismissed by the player (no close button, no clicking outside)
- Non-dismissible regardless of game state — including mid-match. A player mid-match on a stale build is already on a broken build; there is nothing to protect.

**Copy:**
> *"The version of the game you're playing is outdated. Please refresh the page. If this popup keeps appearing, contact us."*

**Primary action:**
- Single prominent **REFRESH** button
- On click: `window.location.reload(true)`

**Secondary action:**
- Text link below the REFRESH button: **"Contact support"**
- Same visual style as the inline tutorial skip button — plain underlined text, visually subordinate to the primary button
- Opens the feedback form inline without dismissing the modal (the modal stays blocking even while feedback is open)

**Relationship to Task 5b:**
Task 5b (server restart UX) uses the same existing modal component for its blocking overlay. If 5b has already shipped, the parameterisation work may already be done — check before implementing.

## Verification

1. **Startup detection:** load the game on a stale build — confirm the modal appears immediately, before the game is playable
2. **Polling detection:** open the game on current build, deploy a new build, wait 5 minutes — confirm the modal appears
3. **Focus detection:** background a tab, deploy a new build, return to tab — confirm the modal appears on focus
4. **Mid-match:** start a match, trigger detection — confirm the modal appears and blocks gameplay
5. **REFRESH button:** click REFRESH — confirm the page reloads and the new build number appears in GameAnalytics
6. **Contact support link:** confirm the feedback form opens without the modal dismissing
7. **Repeat stale load:** after clicking REFRESH, if the page somehow loads a stale build again, confirm the modal reappears immediately (startup check fires again)
8. **7-day monitor:** after deploy, monitor stale build tail in GameAnalytics — should decay to near-zero within one natural polling cycle

## Notes

- The modal must not have a close button or any dismissal mechanism. If the player is on a stale build, the only correct action is to refresh.
- The "if this popup keeps appearing" clause in the copy handles the edge case where a hard refresh still loads a stale build (e.g. Yandex CDN issue). The "contact support" link is the escape hatch for that scenario.
- `window.location.reload(true)` forces a hard reload bypassing the browser cache — use this, not `window.location.reload()`.
