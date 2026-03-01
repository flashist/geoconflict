# Task 3 — Mobile Quick Wins: Reduce Crashes and Abandonment on Mobile

## Context

A significant portion of players are on mobile devices. Many of them appear to abandon matches early — either because the game performs poorly on their device, or because their browser tab crashes under the rendering load. This directly reduces time spent in the game and hurts ad revenue.

The game is built on a canvas-based renderer (Pixi.js) with multiple visual layers, real-time unit movement, and particle effects. This is heavy for mid-range and low-end mobile devices. A full rendering overhaul is a separate, larger project (Task 5) — this task is about making targeted, low-risk changes that reduce mobile load without touching the core rendering architecture.

All analytics instrumentation is now in place (Tasks 1, 2d, 2e, 2f, 2g, 2h). The before-state is actively being captured. After this task ships, the same events and funnels will show precisely whether mobile performance improved.

**Before this task ships:** record the current baseline numbers from GameAnalytics — specifically the `Performance:FPS:Below15` proportion on mobile and the session depth curve from the `Device:mobile` segmented Funnel 4. These are the before-state you will compare against after deployment.

## Goal

Reduce the rate at which mobile players crash or abandon matches by making the game less demanding on mobile hardware. All changes must be conditional — desktop players must see no difference whatsoever.

## What "Done" Looks Like

- On mobile devices, the game runs noticeably more smoothly than before, particularly on mid-range Android phones
- At least the following specific optimizations are implemented and active on mobile:
  - High-resolution / retina rendering is disabled (renders at standard resolution instead of 2× on HiDPI screens)
  - Render framerate is capped at 30fps
  - Particle effects and visual FX (explosions, impact effects, etc.) are reduced or disabled
- All optimizations are applied conditionally — only when the game detects a mobile device
- Desktop players see zero change in visual quality or framerate behavior
- The game functions correctly on mobile — these are performance reductions only, not functional changes
- Sentry (Task 2h) shows no new error types introduced by this task

## Mobile Detection

Do not introduce a new mobile detection implementation. The user agent detection logic was already built and deployed as part of Task 2f. Reuse that exact logic here to ensure consistent device classification across analytics and rendering behavior. A player classified as `Device:mobile` in analytics must receive the mobile rendering optimizations — the same detection path must drive both. Using a different detection method risks mismatches where analytics and rendering disagree on which players are mobile.

## Notes

- The goal is stability and crash reduction, not perfection. A player on a mid-range Android phone who completes a full match without crashing is a better outcome than a visually rich experience that crashes halfway through.
- The developer should use their judgment on additional visual elements that are safe to reduce on mobile. The list above is the minimum — other obvious wins are welcome.
- This task is explicitly scoped to configuration and conditional rendering changes only. It is not the time to refactor the rendering pipeline or rewrite how layers work. That is Task 5.
- If any change has unexpected side effects on desktop, it must be reverted immediately. Desktop experience is non-negotiable.

## How Impact Will Be Measured

All measurement infrastructure is live. After this task ships, watch the following over a minimum two-week window:

### Sentry (Task 2h)
- Watch for any new error types appearing after deployment — if Task 3 introduces new crashes, Sentry will catch them within hours
- If error volume increases on mobile after deployment, investigate before proceeding

### GameAnalytics Explore Tool
- **`Performance:FPS:Below15` on mobile** — this proportion should decrease. Compare to the baseline recorded before Task 3 shipped.
- **`Performance:FPS:Above30` on mobile** — should increase correspondingly
- **Drill to `Platform:android` vs `Platform:ios`** — if improvement is concentrated on one platform, it signals where further work is most needed. Android is expected to show more improvement due to greater device fragmentation.

### GameAnalytics Funnels
- **Funnel 4 (Session Depth) — `Device:mobile` segment** — the drop-off curve should flatten. More mobile players should reach the `Session:Heartbeat:10` and `Session:Heartbeat:15` steps than before.
- **Funnel 3 (Ghost Rate) — `Device:mobile` segment** — the drop-off between `Game:Start` and `Player:Eliminated` should decrease.

### Task 5 Gate Decision
After two weeks of data, evaluate both signals together:
- If `Performance:FPS:Below15` proportion has dropped significantly AND Funnel 4 mobile session depth has improved → Task 3 was sufficient. Task 5 can be deprioritized.
- If either metric remains poor → Task 5 (deep mobile rendering overhaul) should be scheduled next.
