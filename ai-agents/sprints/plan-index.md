# Geoconflict — Execution Plan Index

## Strategic Logic

The current primary revenue source is ad impressions (interstitial and sticky-banner ads). Every improvement that keeps players in the game longer, brings them back for another match, or converts curious new players into active ones **directly increases ad revenue without touching the monetization system**. Fixing retention first is therefore the correct sequence — a larger, more engaged player base also makes every future monetization feature more effective.

Additionally, Yandex Games promotes titles that generate more revenue per player. This means that once monetization features are added, improvements to engagement and session length compound: better retention → higher revenue per player → better Yandex ranking → more DAU → more revenue.

---

## Experiments Policy

Yandex Games provides a built-in A/B experiments API (https://yandex.ru/dev/games/doc/ru/sdk/sdk-config) that allows features to be tested on a subset of players before full rollout.

**Default rule: if a feature is additive and does not break backward compatibility, it must be tested via the Yandex experiments API before full rollout.**

A feature is considered suitable for experiments if:
- It adds something new without removing or changing existing behavior for players who are not in the experiment group
- The previous experience remains fully intact for the control group
- Running two versions in parallel does not create fairness issues or support complexity

Features are **excluded** from experiments if:
- They are part of the analytics/measurement layer itself (experimenting on the tool you use to measure results is circular)
- Rolling back or maintaining two parallel versions would require disproportionate additional engineering work
- The change affects all users uniformly by nature (e.g. rendering performance fixes)
- The feature involves an economy or pricing model where two parallel versions would create player fairness issues

---

## Sprint Files

| File | Sprint | Goal |
|------|--------|------|
| [cancelled-tasks.md](cancelled-tasks.md) | — | Documents cancelled/reverted tasks with reasons |
| [hotfix-post-sprint2.md](hotfix-post-sprint2.md) | Post-Sprint 2 Hotfix | Experiment flag analytics, tutorial skip button, UI tap analytics, mobile hit area bug, win condition bug |
| [plan-sprint-1.md](plan-sprint-1.md) | Sprint 1 — Stop the Bleeding | Reduce ghost rate and crash-driven abandonment |
| [plan-sprint-2.md](plan-sprint-2.md) | Sprint 2 — Fix Onboarding | Convert new players into players who complete at least one full match |
| [plan-sprint-3.md](plan-sprint-3.md) | Sprint 3 — Deepen Retention | Infrastructure quality and UX; mobile performance parked |
| [plan-sprint-4.md](plan-sprint-4.md) | Sprint 4 — First Monetization Layer | Revenue streams, leaderboard, citizen tier |
| [plan-sprint-5.md](plan-sprint-5.md) | Sprint 5 — Full F2P Loop & Social Features | Long-term engagement and monetization systems |

---

## Complete Priority Table

| # | Item | Effort | Experiments | Primary Benefit | Sprint |
|---|------|--------|-------------|-----------------|--------|
| 1 | Analytics — session & match event tracking | 1–2 days | ❌ Excluded | Informs everything else, baseline measurement | 1 |
| 2 | Tab crash reconnection | Already implemented | ✅ Test | Reduces ghost rate, more ad impressions | 1 |
| 2a | Reconnection analytics instrumentation | 0.5–1 day | ❌ All users | Measures whether reconnection is actually working and being used | 1 |
| 2b | In-game feedback button | 2–3 days | ❌ All users | Opens player feedback channel before further changes ship | 1 |
| 2c | Automatic device & environment info collection | 1–2 days | ❌ All users | Enriches feedback reports with device context for bug reproduction | 1 |
| 2d | Additional analytics events — session depth & spawn behavior | 1–2 days | ❌ All users | Enables funnel construction; measures spawn confusion and session drop-off | 1 |
| 2e | Performance monitoring events (FPS & memory sampling) | 2–3 days | ❌ All users | Measures rendering performance by device class; gates Task 5 decision | 1 |
| 2f | Device type & platform OS analytics events | Already implemented ✅ | ❌ All users | Enables device- and OS-segmented funnels | 1 |
| 2g | New vs returning player analytics event | 0.5 days | ❌ All users | Enables new/returning segmentation in funnels | 1 |
| 2h | Sentry integration — error & crash monitoring | 0.5 days | ❌ All users | Captures JS errors and stack traces; establishes crash baseline before Task 3 | 1 |
| 2i | Microsoft Clarity — session recordings & heatmaps | ⏸ Deferred (after Task 3 stable) | ❌ All users | Qualitative diagnosis — deferred until mobile perf confirmed stable | 1→3 |
| 2j | Spawn behavior anomaly investigation | ✅ Complete | ❌ Excluded | Root cause: touch-only event listener on desktop. Fix deployed. Real ghost rate: ~20% on both platforms. | 1 |
| 3 | Mobile quick wins (retina off, 30fps cap, FX reduction) | 2–3 days | ❌ Excluded | Reduces crash abandonment, more ad impressions | 1 |
| 4 | Tutorial — guided first bot match | 1–2 weeks | ✅ Test | Biggest new player conversion lever | 2 |
| 4a | Auto-spawn — automatic starting location on join | 1–2 days | ❌ All users | Eliminates zero-action abandonment at match start | 2 |
| 4b | Zoom to territory — name click + auto-zoom on spawn | 1–2 days | ❌ All users | Single function: name click zoom, find-me button, auto-zoom on spawn | 2 |
| 4e | Spawn indicator visibility improvement | 1 day | ❌ All users | Expanding ring pulse in player's territory color; fades after 3–4s; depends on 4b | 2 |
| 4c | Auto-expansion for inactive players | 2–3 days | ❌ All users | Gives ghost players a minimal foothold; multiplayer only; fully deterministic | 2 |
| 5 | Deep mobile rendering optimization | ⏸ Parked | ❌ Excluded | Parked: desktop is core audience. Revisit if mobile DAU > 1,500. | — |
| HF-1 | Experiment flag analytics | 2–3 hours | ❌ Excluded | Hotfix: fire Experiment:Tutorial:Enabled/Disabled at flag eval point; unblocks control group funnels; establishes convention for all future experiments | Hotfix |
| HF-2 | Tutorial skip button — inline link | 1–2 hours | ❌ Excluded | Hotfix: add secondary skip link below "Got it" in each tooltip modal; reduces silent tab-close exits | Hotfix |
| HF-3 | UI tap analytics — UI:Tap:{ElementId} | 2–3 hours | ❌ Excluded | Hotfix: establish convention; V1 instruments TutorialSkipCorner and TutorialSkipInline only | Hotfix |
| HF-4 | Mobile control panel hit area bug | 1–2 hours | ❌ Excluded | Critical: transparent container area blocks right half of map on mobile; pointer-events fix | Hotfix |
| HF-5 | Win condition detection bug | ~~1–3 days~~ | ❌ Excluded | ⛔ Cancelled & reverted — ghost-bot logic too entangled, contradicting test instructions. See cancelled-tasks.md | Hotfix |
| HF-6 | Auto-spawn failure — player stuck unable to place | 1–2 days | ❌ Excluded | Critical: auto-spawn may corrupt spawn state on failure, blocking manual placement too; investigation + fix; especially severe in tutorial | Hotfix |
| — | Humans vs Nations re-enable | 0.5 days | ❌ All users | Re-enable existing mode; AI fills empty slots so safe at current DAU; investigate disable mechanism first | 3 |
| — | Feedback — attach match history | ~~1 day~~ | ❌ Excluded | ⛔ Cancelled & reverted — too many moving parts. Replaced by simpler task below. See cancelled-tasks.md | 3 |
| — | Feedback — attach last match IDs (simple) | 2–3 hours | ❌ Excluded | Read last 3 game IDs from existing localStorage['game-records'] and attach to feedback payload. No new writes. | 3 |
| 5b | Server restart UX — notification & auto-refresh | 2–3 days | ❌ Excluded | Eliminates silent freeze on deployments; Part B ships first | 3 |
| 5c | Mobile warning screen | 0.5 days | ❌ All users | Sets honest expectations for mobile players; improves Yandex retention signals | 3 |
| 5d | Server performance investigation & Sentry instrumentation | 2–3 days | ❌ Excluded | Investigates lag reports from desktop users; threshold-based Sentry transactions on server turn processing | 3 |
| 6 | Rewarded ads — minimal version | 2–3 days | ✅ Test | Yandex algorithm boost, first monetization signal | 4 |
| 7 | Leaderboard — core system | 1–2 weeks | ✅ Test | Replaces buggy Yandex built-in, drives Yandex login conversion | 4 |
| 8 | Citizen tier — supporter membership system | 1–2 weeks | ✅ Experiment | Three paths; paid citizens get no interstitials; all citizens get full emoji set; non-citizens get 5-10 core emojis only | 4 |
| 8b | Private lobbies — citizens only | 1–2 weeks | ❌ Citizens only | Directly requested by players; creates friend-invite conversion loop | 4 |
| 8c | Spectating — citizens only | 1 week | ❌ Citizens only | Watch any live public match; zero match balance impact | 4 |
| 8d (A) | Announcements — global changelog re-enable | 1–2 days | ❌ Excluded | Re-enable existing OpenFront feature; JSON-driven; no backend; seed with Sprint 1–2 features | 2 |
| 8d (B) | Announcements — personal citizen inbox | 2–3 days | ❌ Excluded | Citizen-only; server-side; triggered by admin actions (nickname review, citizenship grant) | 4 |
| 9 | Re-enable flags | 1 week | ✅ Test | Identity feature, drives Yandex login, upsell surface | 4 |
| 9a | Re-enable territory patterns | 1 week | ✅ Test | High-visibility cosmetic; upsell surface | 4 |
| 10 | Leaderboard — rewards layer | 3–5 days | ✅ Test | Competitive motivation, social proof, long-term prestige | 5 |
| 8a | Nickname styling system | 1–2 weeks | ✅ Test | ARPU upsell for nickname buyers, social visibility | 5 |
| 11 | Coin economy + rewarded ads full version | 3–4 weeks | ❌ Excluded | Core F2P engagement loop | 5 |
| 12 | Clans | 3–4 weeks | ✅ Test | Long-term retention, social monetization | 5 |
| 14 | Map voting for verified players | 1–2 weeks | ✅ Test | Verified tier participation mechanic | 5 |
| 13 | Replay access as premium feature | 3–5 days | ❌ Excluded | ARPU increase, needs tier system from Task 11 first | 5 |
| 15 | Custom uploaded flags & patterns — paid citizens only | 2–3 weeks | ❌ Excluded | Unique in-match appearance; requires moderation infrastructure; V1 flags only | 5 |
