# HF-11a — Stale Build Sessions: Investigation

## Priority
High — must complete before HF-11b, HF-11c, HF-11d. Results of this investigation determine whether the fix direction is correct and whether any hypotheses need additional remediation.

## Context

Build segmentation (HF-7) is now working. Analytics show a persistent tail of returning users on old builds despite newer builds being deployed:

- `0.0.99` — 87 returning users on Apr 8, despite being many builds old
- `0.0.102` — 189 returning users on Apr 8, despite `0.0.118` being current
- `0.0.104` — 502 returning users on Apr 8
- New users are almost entirely on current builds — the problem is specific to returning users

**Critical observation:** every feedback submission shows the latest deployed build version. Players on old builds are not submitting reports — their experience is a black box. They may be experiencing broken gameplay silently.

**Build history:**
- `0.0.99` — several weeks old
- `0.0.102` — live for ~10 days before `0.0.111` deployed (large returning user base accumulated)
- `0.0.104` — deployed ~2 weeks ago
- `0.0.110` — broken prod build, quickly replaced
- `0.0.111` — deployed 4 days ago
- `0.0.118` — deployed 3 days ago (current)

---

## Hypotheses to Investigate

### Hypothesis 1 — Zombie Tabs (Most Likely)

A player opened the game days or weeks ago and never closed the tab. The old JavaScript bundle is running in memory. No cache-busting mechanism can reach a tab that is already loaded.

**Why it fits:** explains why the problem is almost exclusively returning users, and why the `0.0.102` cliff correlates with natural tab turnover after `0.0.118` deployed rather than an immediate clean switchover.

**How to confirm:** look at the decay rate of `0.0.102` returning users over the 7 days following the `0.0.118` deploy. Plot it day by day. Smooth exponential decay (roughly halving every 3–4 days) = natural tab turnover = zombie tabs confirmed.

---

### Hypothesis 2 — Yandex CDN Caching Old HTML

HF-10 added `Cache-Control: no-cache` on the origin server, but Yandex may be caching HTML at their CDN layer before those headers reach the player's browser.

**Why it fits less well:** CDN caching would predominantly affect new users (fresh loads), not returning users — the opposite of what the data shows. But could explain the `0.0.99` users on a very old build.

**How to confirm:**
1. Review Yandex Games developer documentation for iframe CDN caching behaviour
2. Immediately after the next deploy, open the game in a fresh incognito window on a different device/network — if a new user gets an old build, CDN caching is confirmed
3. If unclear, ask Yandex support: "Do you cache game HTML at the CDN level? How do we invalidate it after a deploy?"

---

### Hypothesis 3 — Aggressive Browser Cache Persistence

Some browsers (particularly mobile) serve from disk cache even with `Cache-Control: no-cache` on the HTML, for pages visited many times.

**How to confirm:** test on Chrome desktop, Firefox desktop, Chrome Android, Safari iOS:
1. Load the game normally
2. Deploy a new build
3. Close and reopen the tab (not hard refresh)
4. Check which build number is reported in analytics

If a specific browser consistently shows an old build after a normal reload, this is the culprit.

---

### Hypothesis 4 — `BUILD_NUMBER` Not Updated on Deploy

A developer forgot to update `BUILD_NUMBER` before deploying, causing two different code versions to report the same build number.

**How to confirm:** cross-reference the build numbers visible in analytics against the git commit or deploy log. If a build number appears for longer than its deploy window, it was likely reused.

---

## Output Required

A short written document (message or markdown file) covering:

1. Which hypothesis is the primary cause — with evidence from the decay curve analysis
2. Whether any secondary hypotheses are also contributing
3. Confirmation that HF-11b/c/d fix direction (version polling + blocking modal) is appropriate, or any adjustments needed
4. Whether Hypothesis 2 (Yandex CDN) requires a separate fix beyond what HF-11b/c/d covers

This output is required before HF-11b begins.

## Notes

- The investigation is purely analytical — no code changes in this task
- Hypothesis 1 can be confirmed or ruled out from existing GameAnalytics data alone, without any new deploy
- Hypotheses 2 and 3 require a new deploy to test properly — schedule the test immediately after the next planned deploy
