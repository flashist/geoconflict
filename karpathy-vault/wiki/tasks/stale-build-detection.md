# Stale Build Detection & Blocking Modal (HF-11b/c/d)

**Source**: `ai-agents/tasks/done/hf11b-hotfix-version-endpoint.md`, `hf11c-hotfix-stale-build-detection.md`, `hf11d-hotfix-stale-build-modal.md`
**Status**: pending (Sprint 3)
**Sprint/Tag**: Sprint 3 / HF-11

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

// 3. On tab focus (catches long-idle tabs)
window.addEventListener('focus', checkVersion);
```

Once detected, cancel interval + remove listener (fires exactly once per session).

Analytics event: `Build:StaleDetected` with value = minutes since page load (0 = startup/CDN, >0 = zombie tab).

### HF-11d — Blocking Modal

Non-dismissible full-screen overlay wired to `onStaleBuildDetected()`:
- Copy: *"The version of the game you're playing is outdated. Please refresh the page. If this popup keeps appearing, contact us."*
- Primary action: `REFRESH` button → `window.location.reload(true)` (hard reload, bypasses browser cache)
- Secondary: "Contact support" link opens feedback form without dismissing modal
- No close button, no clicking outside to dismiss — mid-match players on stale builds are already on a broken build

Uses the **existing modal component** (same one used for Task 5b server restart UX). Check if 5b has already parameterised it before implementing.

## Outcome

After HF-11b/c/d all ship, the stale build tail in GameAnalytics should decay to near-zero within one natural polling cycle (5 minutes). Monitor with `Build:StaleDetected` analytics events.

## Related

- [[decisions/stale-build-zombie-tabs]] — HF-11a investigation findings (root cause: zombie tabs confirmed)
- [[decisions/sprint-3]] — sprint containing this work
- [[systems/analytics]] — `Build:StaleDetected` analytics event
