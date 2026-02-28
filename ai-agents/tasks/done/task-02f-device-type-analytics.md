# Task 2f — Device Type & Platform OS Analytics Events

## Context

Task 2d added the `Session:Start` custom Design Event which makes funnels possible in GameAnalytics. Task 2e adds FPS and memory events with platform context attached to each individual event, enabling filtering in the Explore tool.

However, there is still a gap: it is not possible to build separate funnels for mobile players vs desktop players and compare them side by side. Attaching platform context to individual events allows filtering *within* a single funnel, but GameAnalytics funnel segmentation requires a dedicated Design Event fired at the start of the session to split players into groups from the top of the funnel downward.

Additionally, knowing a player is on "mobile" is useful but not fully actionable — iOS and Android are completely different rendering environments with different browser engines and vastly different device fragmentation. Knowing *which* OS is affected by a crash or performance problem changes what you focus on in Tasks 3 and 5.

This task adds two events, both fired once per session at startup.

## Goal

Fire `Device:Type` and `Platform:OS` Design Events once per session, immediately after `Session:Start`, identifying the player's device class and operating system. Together these enable device-segmented and OS-segmented funnels in GameAnalytics.

## Events to Implement

All three session-start events fire in sequence: `Session:Start` → `Device:Type` → `Platform:OS`.

---

### Device:Type

Fired once per session, immediately after `Session:Start`. Four possible values:
- `Device:mobile`
- `Device:desktop`
- `Device:tablet`
- `Device:tv`

Device class should be detected from the user agent string at session start. TV detection (Smart TV browsers, game console browsers) is a nice-to-have — if it adds complexity, collapsing TV into `Device:other` is acceptable.

---

### Platform:OS

Fired once per session, immediately after `Device:Type`. Values:
- `Platform:android`
- `Platform:ios`
- `Platform:windows`
- `Platform:macos`
- `Platform:linux`
- `Platform:other` — for Chrome OS, obscure Linux distributions, or any unrecognized OS

On mobile, OS detection from user agent is reliable — iOS and Android are clearly identifiable. On desktop, Windows/Mac/Linux are equally reliable. Chrome OS should map to `Platform:other` rather than introducing a separate bucket. Unknown or unrecognized OS strings should also map to `Platform:other` rather than causing an error.

## What "Done" Looks Like

- `Device:Type` and `Platform:OS` fire once per session for every player, in sequence after `Session:Start`
- Both events appear in GameAnalytics as Design Events within 24–48 hours of aggregation
- It is possible to build device-segmented and OS-segmented funnels in GameAnalytics
- No visible change to the player experience whatsoever

## How This Data Is Used

**Device-segmented funnels:** once aggregated, `Device:Type` enables separate conversion funnels for mobile vs desktop players — showing where each group drops off differently.

**OS-segmented crash diagnosis:** `Platform:OS` combined with `Performance:FPS` events (Task 2e) tells you whether the crash and performance problems are Android-specific or affect iOS equally. Android has far more device fragmentation and is the likely primary source of mobile crashes. Confirming this changes what Tasks 3 and 5 should prioritize — for example, Android-specific rendering workarounds vs broad mobile optimizations.

**Key funnel use cases:**
- New player conversion by device: `Device:mobile` → `Session:FirstAction` → `Match:Started` → `Match:Completed`
- FPS distribution by OS: `Platform:android` vs `Platform:ios` in the Explore tool alongside `Performance:FPS` events
- Ghost rate by device class: proportion of mobile vs desktop players who join a match but never become active

## Dependencies and Notes

- Depends on Task 2d — `Session:Start` must exist before these events can fire immediately after it
- Does not depend on Task 2e — these events and the FPS/memory events from 2e are complementary but independent. Either can ship first.
- This task is intentionally standalone because Task 2d is already implemented and should not be reopened.
- GameAnalytics aggregates new Design Events within 24–48 hours of first receipt. Segmented funnels cannot be built until events have been aggregated — expected behavior, not a bug.
- The user agent detection should reuse whatever detection logic already exists in the codebase from Task 2e, Task 3, and the feedback system. Do not introduce a second detection implementation — reuse the existing one.
