# Stale Build — Zombie Tab Investigation & Fix

**Date**: 2026-04-15
**Status**: accepted

## Context

Returning users persisted on old builds long after new versions were deployed. As of 2026-04-09, `0.0.104` still had 364 returning users 4+ days after deployment of `0.0.118`. `0.0.99` still had 89 users several weeks later.

HF-11a was an investigation sprint to determine the root cause before implementing fixes.

Source: `ai-agents/knowledge-base/hf11a-stale-build-findings.md` (2026-04-10)

## Decision

**Root cause: zombie tabs (Hypothesis 1 — confirmed).**

A browser tab that loaded JavaScript days or weeks ago continues running the old bundle in memory. No server-side mechanism (cache headers, CDN invalidation, new deploys) can reach a tab that is already loaded. Users must manually reload.

Evidence: smooth exponential decay of returning users on old builds (~90% drop over 6 days for `0.0.104`), consistent across desktop and mobile. A cliff would indicate CDN invalidation; flatness would indicate active re-serving of an old build.

**All other hypotheses ruled out:**
- **Yandex CDN caching old HTML:** Ruled out — 99.6% of new users on Apr 9 were on `0.0.118`
- **Aggressive browser cache persistence:** Ruled out — HTML served with `no-store, no-cache, must-revalidate`; identical decay curves on desktop and mobile
- **BUILD_NUMBER not updated on deploy:** Ruled out — fully automated via `scripts/bump-version.js` in `build-deploy.sh`

**Fix: HF-11b/c/d** — version polling + blocking reload modal:
- **HF-11b:** Server-side `/api/version` endpoint
- **HF-11c:** Client-side periodic polling of `/api/version`
- **HF-11d:** Blocking modal that forces reload when client detects it's behind

Targets the exact mechanism: a loaded tab that will not self-update.

## Consequences

- Version polling is the complete fix — no additional CDN, cache header, or versioning changes needed
- `Build:StaleDetected` analytics event measures ongoing impact. **Value:** minutes since page load (0 = CDN/cache issue on startup; >0 = zombie tab mid-session)
- Anomaly: 140 returning users reported `null` build version — likely from before `configureBuild()` was wired; investigate separately if count persists

## Related

- [[systems/analytics]] — `Build:StaleDetected` event
- [[decisions/double-reload-fix]] — separate but related browser/tab lifecycle issue
- [[decisions/sprint-3]] — HF-11a/b/c/d context
- [[decisions/hotfix-post-sprint2]] — HF-10 cache-busting reduced stale asset risk before this full zombie-tab fix
- [[decisions/cancelled-tasks]] — HF-11e cancellation belongs to the same investigation thread
- [[tasks/stale-build-detection]] — HF-11b/c/d implementation spec (version endpoint, client polling, modal)
