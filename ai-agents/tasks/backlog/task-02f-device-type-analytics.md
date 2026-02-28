# Task 2f — Device Type Analytics Event

## Context

Task 2d added the `Session:Start` custom Design Event which makes funnels possible in GameAnalytics. Task 2e adds FPS and memory events with platform context attached to each individual event, enabling filtering in the Explore tool.

However, there is still a gap: it is not possible to build separate funnels for mobile players vs desktop players and compare them side by side. Attaching platform context to individual events allows filtering *within* a single funnel, but GameAnalytics funnel segmentation requires a dedicated Design Event fired at the start of the session to split players into groups from the top of the funnel downward.

Without this event, we cannot answer questions like: "Do mobile players drop off at a different point in the new player conversion funnel than desktop players?" or "Is the ghost rate problem worse on mobile or desktop?" — which are exactly the questions that Tasks 3 and 5 are trying to answer.

This is a very small task — a single event, fired once per session.

## Goal

Fire a `Device:Type` Design Event once per session, immediately after `Session:Start`, identifying the player's device class. This enables device-segmented funnels in GameAnalytics.

## Event to Implement

**Device:Type** — fired once per session, immediately after `Session:Start`.

Four possible values:
- `Device:mobile`
- `Device:desktop`
- `Device:tablet`
- `Device:tv`

Device class should be detected from the user agent string at session start. The detection logic does not need to be sophisticated — a standard user agent check that distinguishes mobile/tablet from desktop is sufficient. TV detection (Smart TV browsers, game console browsers) is a nice-to-have; if it adds complexity, collapsing TV into `Device:other` is acceptable.

## What "Done" Looks Like

- `Device:Type` fires once per session for every player, immediately after `Session:Start`
- The event appears in GameAnalytics as a Design Event within 24–48 hours of aggregation
- It is possible to build a funnel in GameAnalytics using `Device:mobile` or `Device:desktop` as the first step, producing a device-specific conversion funnel
- No visible change to the player experience whatsoever

## How This Data Is Used

Once aggregated, this event enables device-segmented versions of every funnel built on top of `Session:Start`. The most important use cases:

- **New player conversion funnel by device:** `Device:mobile` → `Session:FirstAction` → `Match:Started` → `Match:Completed`. Compare the drop-off curve for mobile vs desktop to identify where mobile players specifically are being lost.
- **Ghost rate by device:** what proportion of mobile vs desktop players who start a match never become active.
- **Task 3 and Task 5 validation:** after mobile quick wins (Task 3) ship, compare the mobile conversion funnel before and after. If the funnel improves, Task 3 worked. If not, Task 5 is needed. This comparison is only possible if device type is a funnel dimension from the start.

## Dependencies and Notes

- Depends on Task 2d — `Session:Start` must exist before `Device:Type` can fire immediately after it. The two events are fired in sequence at session start; they are not independent.
- Does not depend on Task 2e — this event and the FPS/memory events from 2e are complementary but independent. Either can ship first.
- This task is intentionally a standalone item because Task 2d is already implemented and should not be reopened. This is a one-line addition conceptually, but it has its own aggregation cycle in GameAnalytics and its own funnel-building implications.
- GameAnalytics aggregates new Design Events within 24–48 hours of first receipt. Device-segmented funnels cannot be built until the event has been seen and aggregated — this is expected behavior, not a bug.
- The user agent detection should use the same detection logic already used elsewhere in the codebase (Task 2e, Task 3, and the feedback system all detect mobile/desktop). Reuse that logic rather than introducing a second detection method.
