# HF-11c — Stale Build Sessions: Client-Side Detection

## Priority
High. Depends on HF-11b (`/api/version` endpoint) being deployed. Unblocks HF-11d.

## Context

With the version endpoint live (HF-11b), the client can now check whether it is running the current build. This task adds the detection logic — three triggers that cover every stale build scenario. No UI is added in this task — detection fires an analytics event and calls a stub function `onStaleBuildDetected()` that HF-11d will wire to the modal.

Keeping detection separate from UI means this task ships independently and immediately starts producing analytics data, even before the modal is ready.

## What to Build

### Three detection triggers

**1. On startup** — catches stale builds on first load, including CDN-cached pages:
```typescript
async function checkVersion(): Promise<void> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    const { build } = await res.json();
    if (build !== BUILD_NUMBER) {
      onStaleBuildDetected();
    }
  } catch {
    // Silently ignore — do not block startup on network failure
  }
}

// Call immediately on page load, before game initialisation
checkVersion();
```

**2. Polling every 5 minutes** — catches zombie tabs mid-session:
```typescript
const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

setInterval(checkVersion, VERSION_CHECK_INTERVAL_MS);
```

**3. On tab focus** — catches long-idle tabs when the player returns to them:
```typescript
window.addEventListener('focus', checkVersion);
```

### Stub for HF-11d

```typescript
function onStaleBuildDetected(): void {
  const minutesSinceLoad = Math.floor(
    (Date.now() - PAGE_LOAD_TIMESTAMP) / 60000
  );
  GameAnalytics.addDesignEvent('Build:StaleDetected', minutesSinceLoad);

  // TODO HF-11d: show stale build modal here
  // showStaleBuildModal();
}
```

`PAGE_LOAD_TIMESTAMP` should be set once at module load time: `const PAGE_LOAD_TIMESTAMP = Date.now();`

### Important: prevent duplicate triggers

Once `onStaleBuildDetected()` has been called, cancel the polling interval and remove the focus listener — there is no need to fire it repeatedly:

```typescript
let staleDetected = false;

function onStaleBuildDetected(): void {
  if (staleDetected) return;
  staleDetected = true;

  // Cancel further checks
  clearInterval(pollingInterval);
  window.removeEventListener('focus', checkVersion);

  const minutesSinceLoad = Math.floor(
    (Date.now() - PAGE_LOAD_TIMESTAMP) / 60000
  );
  GameAnalytics.addDesignEvent('Build:StaleDetected', minutesSinceLoad);

  // TODO HF-11d: showStaleBuildModal();
}
```

## Verification

1. Deploy a new build without closing an existing tab — confirm `Build:StaleDetected` appears in GameAnalytics within 5 minutes
2. Open the game on a stale build (use a cached browser) — confirm `Build:StaleDetected` fires on startup with value = 0 (minutes since load)
3. Background a tab for 5+ minutes, deploy a new build, return to the tab — confirm `Build:StaleDetected` fires on focus
4. Confirm the event only fires once per session — multiple detection triggers do not produce multiple events
5. Confirm the polling interval and focus listener are removed after first detection

## Notes

- The `Build:StaleDetected` value (minutes since page load) will be immediately useful in GameAnalytics — value = 0 means startup detection (CDN/cache issue), value > 0 means zombie tab. This distinction informs whether Hypothesis 2 (Yandex CDN) needs a separate fix.
- No UI is shown in this task — the game continues running normally after detection. The modal is added in HF-11d.
- `fetch` with `{ cache: 'no-store' }` bypasses the browser cache on the request itself — this is separate from the server's Cache-Control headers but both are needed.
