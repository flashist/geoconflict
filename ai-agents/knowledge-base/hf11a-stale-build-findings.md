# HF-11a — Stale Build Sessions: Investigation Findings

**Date:** 2026-04-10
**Status:** Complete — gates HF-11b/c/d implementation

---

## Summary

The dominant cause of returning users persisting on old builds is **zombie tabs** (Hypothesis 1). A browser tab opened days or weeks ago continues running the old JavaScript bundle in memory. Cache headers, CDN invalidation, and new deploys cannot reach a tab that is already loaded.

All other hypotheses are ruled out by the data.

---

## Evidence

### Analytics data (Apr 3–9, last 7 days)

Build `0.0.118` was deployed on or around Apr 5. Data observed on Apr 9:

**Returning users on old builds (Apr 9):**

| Build | Returning users |
|---|---|
| 0.0.118 | 3,600 (current) |
| 0.0.104 | 364 |
| 0.0.111 | 194 |
| 0.0.102 | 154 |
| null | 140 |
| 0.0.99 | 89 |
| 0.0.106 | 35 |
| 0.0.110 | 3 |

**New users on old builds (Apr 9):**

| Build | New users |
|---|---|
| 0.0.118 | 2,500 (current) |
| 0.0.104 | 3 |
| 0.0.99 | 3 |
| 0.0.102 | 1 |
| null | 2 |

### Decay curve — Hypothesis 1 confirmed

`0.0.104` returning users over the observation window:
- Fri Apr 3: ~3,500
- Thu Apr 9: 364
- Drop: ~90% over 6 days

This is smooth exponential decay consistent with natural tab and browser turnover (users eventually closing tabs, restarting devices). It is not a cliff (which would indicate cache invalidation) and not flat (which would indicate active re-serving of an old build).

`0.0.99` still has 89 returning users despite being several weeks old — consistent with desktop users who keep their browsers open for extended periods without restarting.

The pattern is identical on desktop and mobile (confirmed via segmented charts), which rules out device-specific browser cache behaviour.

---

## Hypothesis Verdicts

### Hypothesis 1 — Zombie Tabs: **PRIMARY CAUSE (confirmed)**

An already-loaded JavaScript bundle runs indefinitely in an open tab. No server-side mechanism can reach it. Users must reload the page to get the new build.

**Evidence:** Smooth exponential decay of returning users on old builds. Pattern identical across desktop and mobile.

---

### Hypothesis 2 — Yandex CDN Caching Old HTML: **RULED OUT**

If Yandex CDN were caching old HTML at their layer, new users would be receiving old builds on fresh loads. The data shows 99.6% of new users on Apr 9 are on `0.0.118` (2,500 of ~2,510 total new users). The CDN is delivering the current build correctly.

No separate CDN fix is needed.

---

### Hypothesis 3 — Aggressive Browser Cache Persistence: **RULED OUT**

The HTML is served with `no-store, no-cache, must-revalidate, proxy-revalidate` headers (confirmed in `src/server/Master.ts`). The desktop and mobile segmented charts show identical decay curves, which rules out a browser-specific cache regression. Browser cache is not a contributing factor.

---

### Hypothesis 4 — BUILD_NUMBER Not Updated on Deploy: **RULED OUT**

Build versioning is fully automated via `scripts/bump-version.js`, which runs at the start of every `build-deploy.sh` execution and writes the new version to `package.json` before the build starts. Manual version error is not possible under the current pipeline.

---

## Anomaly: `null` Build Version (140 returning users)

140 returning users on Apr 9 reported a `null` build version. These are likely sessions from before `configureBuild()` was properly wired up, or an edge case where GameAnalytics initialises without a build string. Not related to the stale build problem — investigate separately if the count persists.

---

## Fix Direction Assessment

**HF-11b/c/d (version polling + blocking reload modal) is the correct and complete fix.**

The fix targets the exact mechanism: a tab that is already loaded and will not self-update. Periodic polling of a `/version` endpoint detects when the deployed build has advanced, and a blocking modal forces the user to reload — clearing the zombie tab.

No additional fixes are required for CDN, browser cache, or versioning.

---

## Next Steps

- **HF-11b** — Implement server-side `/version` endpoint
- **HF-11c** — Implement client-side version polling
- **HF-11d** — Implement blocking reload modal
- **Separate (low priority)** — Investigate `null` build version sessions
