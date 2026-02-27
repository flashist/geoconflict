# Task 2e — Performance Monitoring Events

## Context

We know that mobile players crash and abandon matches at a disproportionate rate, but we currently have no visibility into *why* or *which* devices are most affected. Without performance data, the decisions around mobile optimization (Tasks 3 and 5) are based on assumption rather than evidence.

This task adds periodic performance sampling that fires analytics events during gameplay, giving us a continuous picture of how the game actually runs across the player base — broken down by device type. This data serves two purposes: measuring the impact of Task 3 (mobile quick wins) after it ships, and providing the gate data that determines whether Task 5 (deep mobile rendering overhaul) is worth investing 3–6 weeks in.

## Goal

Sample game performance at regular intervals during active gameplay and send the results as Design Events to GameAnalytics. The data must be broken down by platform (mobile / desktop) so mobile and desktop performance can be compared directly.

## Events to Implement

### Performance:FPS — framerate snapshot

Sample the current framerate every 60 seconds during active gameplay and fire a bucketed Design Event:

- `Performance:FPS:Above30` — game is running smoothly
- `Performance:FPS:15to30` — game is running under load, noticeable degradation
- `Performance:FPS:Below15` — game is in crash-risk territory

Use buckets rather than exact values. Exact FPS numbers create too many distinct event names and make the data harder to read in the dashboard. The buckets map directly to player experience categories: smooth, degraded, and critical.

Each event must include platform context (mobile / desktop) so the distribution can be compared between device types.

The `Below15` bucket is the primary signal to watch. A high proportion of mobile players in this bucket after Task 3 ships indicates Task 3 was not sufficient and Task 5 should proceed.

### Performance:MemoryPressure — available heap (best-effort)

If `performance.memory` is available in the browser (Chrome and Chromium-based browsers only — not available in Firefox or Safari), sample available JS heap size at the same 60-second interval and fire a bucketed event:

- `Performance:Memory:Low` — heap is heavily constrained, high crash risk
- `Performance:Memory:Medium` — heap is under moderate pressure
- `Performance:Memory:High` — heap is healthy

Define thresholds based on what the game's typical memory footprint looks like at runtime — the developer should calibrate these during implementation. Low memory on mobile correlates strongly with tab crashes and is a useful complement to the FPS data.

This event is explicitly best-effort. If `performance.memory` is unavailable, no event is fired and no error occurs.

## What "Done" Looks Like

- FPS snapshot events are firing every 60 seconds during active gameplay for all players
- Each FPS event includes platform context (mobile / desktop)
- Memory pressure events are firing on supported browsers (Chrome/Chromium), silently absent on others
- Events are visible in GameAnalytics within 24–48 hours of aggregation
- Adding these events has **no measurable impact on game performance or framerate** — verified by the developer before shipping (see critical constraint below)
- Desktop players see no change in behavior whatsoever

## Critical Implementation Constraint — Must Not Affect Performance

Performance sampling must run on a low-priority interval. The sampling logic itself — reading framerate, reading memory, constructing and queuing the event — must not cause frame drops or affect game determinism.

If the act of measuring performance degrades performance, the data is invalid and the feature is actively harmful. The developer must verify before shipping that adding these events has no measurable impact on frame timing. A simple before/after framerate comparison on a mid-range mobile device is sufficient validation.

Do not run sampling logic inside the main game loop or on the rendering thread. Use a separate `setInterval` running independently of the render cycle.

## How This Data Is Used

**After Task 3 ships:** compare the `Performance:FPS` distribution on mobile before and after. If the `Below15` proportion drops significantly, Task 3 was effective. If it remains high, Task 5 should be prioritized.

**Task 5 gate decision:** Task 5 (deep mobile rendering overhaul, 3–6 weeks effort) should only proceed if both of these are true after Task 3 has been live for at least two weeks:
- `Session:Heartbeat` events (Task 2d) show mobile players still dropping off significantly earlier than desktop players
- `Performance:FPS` events show a meaningful proportion of mobile players still in `Below15` or `15to30` buckets

## Dependencies and Notes

- Depends on Task 1 (analytics infrastructure must be live for events to be sent)
- This task is intentionally separated from Task 2d (behavioral events). Performance sampling involves framerate timing and rendering pipeline awareness — it is more complex and should not block Task 2d from shipping first.
- Memory sampling via `performance.memory` is a non-standard API. Do not attempt to polyfill or approximate it on unsupported browsers. Silent absence is the correct behavior.
- 60-second sampling interval is the recommended default. It is frequent enough to catch performance degradation during a match (typical match length is 15–30 minutes) without generating excessive event volume.
