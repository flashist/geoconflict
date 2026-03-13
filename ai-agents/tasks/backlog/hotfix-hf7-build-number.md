# HF-7 — Build Number Tracking via GameAnalytics Custom Dimension

## Priority
Post-Sprint 2 hotfix — urgent. Ship before any further analytics investigation. Without build segmentation, it is impossible to determine whether a metric shift is caused by a code change or a natural trend.

## Problem

GameAnalytics does not currently segment events by game build number. This means:
- Any metric change after a deployment is unattributable — could be the new build, could be organic trend
- Tutorial funnel data from Sprint 2 cannot be cleanly separated from pre-tutorial data if the experiment was running across a build boundary
- Future A/B test analysis is unreliable if both variants span multiple builds

## Implementation

### Step 1 — Configure custom dimension in GameAnalytics dashboard

In the GameAnalytics dashboard, go to **Setup → Custom Dimensions** and create:

- **Dimension slot:** Custom Dimension 01 (use slot 1 if unused, otherwise next available)
- **Name:** `build`
- **Type:** string

Note the slot number — it is needed in the SDK call.

### Step 2 — Define build number in the codebase

The build number should be a single constant defined in one place, updated manually on each deployment (or injected automatically via the build pipeline if one exists).

```typescript
// src/config/build.ts
export const BUILD_NUMBER = "1.0.0-sprint2-hotfix"; // update on each deploy
```

Format recommendation: `{semver}-{sprint}-{optional-suffix}` — e.g. `1.0.0-sprint2`, `1.0.0-sprint2-hf7`, `1.1.0-sprint3`. Human-readable sprint labels are more useful in GameAnalytics than raw commit hashes.

### Step 3 — Set the custom dimension on SDK init

Call `setCustomDimension01` (or whichever slot was configured) immediately after `GameAnalytics.initialize()`:

```typescript
import GameAnalytics from "gameanalytics";
import { BUILD_NUMBER } from "./config/build";

GameAnalytics.initialize(gameKey, secretKey);
GameAnalytics.setCustomDimension01(BUILD_NUMBER);
```

This must be called before any events are fired. All subsequent events in the session will carry the dimension value automatically.

### Step 4 — Verify in GameAnalytics

After deploying:
1. Open a browser session and trigger any event
2. In GameAnalytics dashboard, go to Explorer and check that the event shows the correct build value in Custom Dimension 01
3. Confirm the dimension appears as a filter/group-by option in the funnel and event count views

---

## Notes

- **No event schema changes** — custom dimensions are session-level properties set once on init, not per-event properties. No existing event definitions need to change.
- **Historical data:** events before this change will show no value for the build dimension — this is expected. Filter to "build is set" to exclude pre-implementation data when analysing post-deploy metrics.
- **Automatic injection (optional):** if the project has a webpack or Vite build step, `BUILD_NUMBER` can be injected from `package.json` version + a `DEPLOY_ENV` env variable automatically. Document this as a follow-up if manual updates are considered error-prone.
- **GameAnalytics limit:** custom dimension values must be pre-registered in the dashboard before use — a value sent from the SDK that isn't in the allowed list will be rejected. Register the current build number in the dashboard at the same time as deploying the code change.
