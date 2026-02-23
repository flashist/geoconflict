# Task 3 — Mobile Quick Wins: Reduce Crashes and Abandonment on Mobile

## Context

A noticeable portion of players are on mobile devices. Many of them appear to abandon matches early — either because the game performs poorly on their device, or because their browser tab crashes under the rendering load. This directly reduces the time players spend in the game, which hurts ad revenue.

The game is built on a canvas-based renderer (Pixi.js) with multiple visual layers, real-time unit movement, and particle effects. This is heavy for mid-range and low-end mobile devices. A full rendering overhaul is a separate, larger project — this task is about making targeted, low-risk changes that reduce the load on mobile devices without touching the core rendering architecture.

## Goal

Reduce the rate at which mobile players crash or abandon matches by making the game less demanding on mobile hardware. The changes should be conditional — desktop players should see no difference whatsoever. The game's visual quality on desktop must be completely unaffected.

## What "Done" Looks Like

- On mobile devices, the game runs noticeably more smoothly than before, particularly on mid-range Android phones
- At least the following specific optimizations are implemented on mobile:
  - High-resolution / retina rendering is disabled (the game renders at standard resolution instead of 2× on HiDPI screens)
  - The render framerate is capped at 30fps (instead of the default 60fps)
  - Particle effects and visual FX (explosions, impact effects, etc.) are reduced or disabled
- All optimizations are applied conditionally — only when the game detects it is running on a mobile device
- Desktop players see zero change in visual quality or framerate behavior
- The game still functions correctly on mobile — these are visual/performance reductions only, not functional changes

## Notes

- The goal is stability and crash reduction, not perfection. A player on a mid-range Android phone who can complete a full match without crashing is a better outcome than a visually rich experience that crashes halfway through.
- The developer should use their judgment on which additional visual elements are safe and worthwhile to reduce on mobile. The list above is the minimum — if there are other obvious wins, they are welcome.
- This task is explicitly scoped to configuration and conditional rendering changes only. It is not the time to refactor the rendering pipeline or rewrite how layers work. That is a separate, larger task (Task 5 in the roadmap).
- After this task ships, we will use analytics data (from Task 1) to measure whether mobile session duration and match completion rates improve. That data will determine whether the deeper rendering overhaul (Task 5) is worth investing in.
