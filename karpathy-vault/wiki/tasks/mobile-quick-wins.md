# Mobile Quick Wins (Task 3)

**Source**: `ai-agents/tasks/done/task-03-mobile-quick-wins.md`
**Status**: done
**Sprint/Tag**: Sprint 1

## Goal

Reduce the rate at which mobile players crash or abandon matches by making the game less demanding on mobile hardware. All changes conditional on device type — desktop unaffected.

## Key Changes

Three minimum required optimizations, all mobile-only:

1. **High-resolution rendering disabled** — render at standard resolution instead of 2× on HiDPI/retina screens. Biggest single memory and GPU load reduction.
2. **Framerate capped at 30fps** — reduces GPU pressure without affecting gameplay (tick-based game; rendering frame rate is independent of game state).
3. **Particle effects reduced or disabled** — explosions, impact FX, etc. removed or simplified.

**Mobile detection:** reuses the same user-agent detection from `Task 2f` (`Device:Type` event). A player classified as `Device:mobile` in analytics receives the mobile rendering optimizations — must be the same detection path.

## Outcome

Before/after measured via:
- `Performance:FPS:Below15` proportion on mobile (should decrease)
- Funnel 4 (`Session:Heartbeat`) mobile session depth curve (should flatten)
- Sentry crash rate on mobile (should decrease)

**Task 5 gate:** if after two weeks `Performance:FPS:Below15` remains high OR mobile session depth is still poor, Task 5 (deep rendering overhaul, 3–6 week investment) should proceed. Task 5 is currently parked (Sprint 3 decision) as desktop is the core audience (3,500 DAU vs 700 mobile).

## Related

- [[systems/analytics]] — `Performance:FPS:*` events and session heartbeat funnels
- [[decisions/sprint-1]] — sprint where this shipped
- [[decisions/product-strategy]] — mobile DAU threshold for Task 5 revisit (mobile DAU > 1,500)
