# Stale Build Detection & Blocking Modal (HF-11b/c/d)

**Source**: `ai-agents/tasks/done/0111-version-endpoint/brief.md`, `ai-agents/tasks/done/0112-stale-build-detection/brief.md`, `ai-agents/tasks/done/0113-stale-build-modal/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 3 / HF-11

> 📌 **2026-10-07 sync — the stale-build popup now has a sibling message.** `0404` ([[tasks/long-session-refresh-popup]]) reuses `StaleBuildModal` for a
> forced "please refresh" popup after 23 h on the **start screen only**. One popup at a time: the stale-build reason
> wins. **This task's mid-match rule is unchanged** — the stale-build popup still shows mid-match. Built, committed
> `077c9e3`, not deployed. 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `077c9e3` is an ancestor of tag `0.0.157`); verify `0406` still open.*

## Goal

Detect clients running an outdated JavaScript bundle and force a page reload with a non-dismissible modal. Resolves zombie tab sessions confirmed by HF-11a investigation.

## Key Changes

### HF-11b — `/api/version` endpoint

New server endpoint:
```
GET /api/version → { "build": "0.0.118" }
```
Response headers: `Cache-Control: no-cache, no-store, must-revalidate` + `Pragma: no-cache` + `Expires: 0` (caching this endpoint defeats the whole fix).

### HF-11c — Client Detection (three triggers)

```typescript
// 1. On startup (catches CDN-cached pages)
checkVersion();  // calls GET /api/version with { cache: 'no-store' }

// 2. Polling every 5 minutes (catches zombie tabs mid-session)
setInterval(checkVersion, 5 * 60 * 1000);

// 3. On tab visible again (catches long-idle tabs)
document.addEventListener('visibilitychange', onVisibilityChange);
```

Once detected, cancel interval + remove listener (fires exactly once per session).

Analytics event: `Build:StaleDetected` with value = minutes since page load (0 = startup/CDN, >0 = zombie tab).

### HF-11d — Blocking Modal

Non-dismissible full-screen overlay wired to `onStaleBuildDetected()`:
- Copy: *"The version of the game you're playing is outdated. Please refresh the page. If this popup keeps appearing, contact us."*
- Primary action: `REFRESH` button → `window.location.reload()`
- Secondary: "Contact support" link opens feedback form without dismissing modal
- No close button, no clicking outside to dismiss — mid-match players on stale builds are already on a broken build

Implemented as a dedicated `StaleBuildModal.ts` Lit component rather than reusing a generic modal wrapper.

## Outcome

After HF-11b/c/d all ship, the stale build tail in GameAnalytics should decay to near-zero within one natural polling cycle (5 minutes). Monitor with `Build:StaleDetected` analytics events.

The implementation is present in the repo: `Master.ts` serves `GET /api/version`, `BuildVersionChecker.ts` runs startup/polling/visibility checks, and `StaleBuildModal.ts` shows the blocking reload UI.

## Related

- [[decisions/stale-build-zombie-tabs]] — HF-11a investigation findings (root cause: zombie tabs confirmed)
- [[decisions/sprint-3]] — sprint containing this work
- [[systems/analytics]] — `Build:StaleDetected` analytics event
- [[tasks/long-session-refresh-popup]] — task `0404` (2026-10-07): reuses `StaleBuildModal` for the 23 h start-screen-only refresh popup; the mid-match rule here unchanged
