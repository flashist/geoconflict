Plan: HF-11a — Stale Build Investigation                                                                                                             
                                                                                                                                                      
 Context                                                                                                                                            

 Analytics show returning users persisting on old builds (0.0.99, 0.0.102, 0.0.104) long after newer builds deployed, with 0.0.118 current. New users 
  are almost entirely on current builds. Four hypotheses exist. This task produces a written findings document that gates HF-11b/c/d implementation.
                                                                                                                                                      
 No code changes. Output is a single markdown document.                                                                                               

 ---
 What We Already Know From Code Analysis

 Caching is correctly configured at the origin:
 - HTML: no-store, no-cache, must-revalidate, proxy-revalidate + Pragma: no-cache + Expires: 0 + empty ETag (Master.ts)
 - JS/CSS assets: public, max-age=31536000, immutable with content-hash filenames (webpack)

 Build version is already automated:
 - package.json version is the build identifier passed to GameAnalytics.configureBuild(version) via src/version.ts
 - bump-version.js runs automatically at the start of every build-deploy.sh run — Hypothesis 4 is effectively ruled out for all deploys after this
 automation was introduced (it may have been a factor in earlier builds like 0.0.99 if the script predates them)

 The only thing that can't be fixed by cache headers: an already-loaded tab.

 ---
 Hypothesis Assessment (Pre-Data)

1. Zombie tabs
- Fits pattern? ✓ Strong — returning users only, not new users
- Can confirm without new deploy? ✓ Yes — decay curve analysis in GameAnalytics

2. Yandex CDN caching HTML
- Fits pattern? ✗ Weak — would hit new users more
- Can confirm without new deploy? ✗ Needs incognito test after next deploy

3. Aggressive browser cache
- Fits pattern? Possible — but no-store should prevent it
- Can confirm without new deploy? ✗ Needs manual browser test

4. Manual BUILD_NUMBER error
- Fits pattern? ✗ Ruled out — version is automated via bump-version.js
- Can confirm without new deploy? ✓ Confirmed ruled out

 ---
 Investigation Steps

 Step 1 — Decay Curve Analysis (Hypothesis 1)

 In GameAnalytics, pull day-by-day returning user counts for 0.0.102 over the 7 days following the 0.0.118 deploy (Apr 5–11):

 - If smooth exponential decay (roughly halving every 3–4 days): zombie tabs confirmed as primary cause
 - If sharp cliff on day 1–2: CDN invalidation or cache headers kicking in — points to Hypothesis 2 or 3
 - If flat / no decay: something is actively re-serving the old build to returning users (cache issue)

 Also check 0.0.104 decay curve — this build accumulated more users (~502) so the curve will be clearer.

 Step 2 — Confirm Hypothesis 4 Ruled Out

 Cross-reference build history against bump-version.js git introduction date:
 - If 0.0.99 predates the automated bump, manual error was possible
 - Check whether any two successive builds share the same version string in analytics

 Step 3 — Yandex CDN Check (Hypothesis 2, requires next deploy)

 Immediately after the next deploy:
 1. Open the game in a fresh incognito window on a different network
 2. Check the build version in the UI or feedback form
 3. If old version: CDN cache confirmed — needs separate fix (cache invalidation step in deploy script)
 4. If new version: CDN is not a factor

 Step 4 — Browser Cache Test (Hypothesis 3, requires next deploy)

 On Chrome desktop, Chrome Android, Safari iOS:
 1. Load game → note build version
 2. After next deploy: close tab, reopen (not hard refresh)
 3. If old build appears: browser ignoring no-store directive

 ---
 Output Document

 Path: ai-agents/knowledge-base/hf11a-stale-build-findings.md

 Sections:
 1. Primary cause determination — with decay curve evidence
 2. Secondary hypothesis status (CDN, browser cache, BUILD_NUMBER)
 3. Confirmation that HF-11b/c/d fix direction is appropriate (or adjustments needed)
 4. Whether Hypothesis 2 requires a separate fix in the deploy pipeline

 ---
 Files Relevant to This Investigation

 - src/server/Master.ts — HTML cache headers (confirmed correct)
 - webpack.config.js — content-hash filenames (confirmed correct)
 - scripts/bump-version.js — automated versioning (Hypothesis 4 ruled out)
 - src/client/flashist/FlashistFacade.ts — GameAnalytics.configureBuild(version) call

 No Verification Step

 This is a pure analytical task. The findings document itself is the deliverable. HF-11b implementation begins after the document confirms the fix
 direction.