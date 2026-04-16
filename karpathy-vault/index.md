# Wiki Index — Geoconflict

> Master catalog of all wiki pages. One line per entry. Updated by LLM after every ingest.

## Features

- [[features/tutorial]] — Guided singleplayer bot match for first-time players; 7-step tooltip sequence, Yandex A/B gated
- [[features/reconnection]] — Crash reconnection: rejoin prompt when tab closes/crashes mid-match
- [[features/feedback-button]] — In-game feedback form on start screen and battle screen with automatic context
- [[features/ai-players]] — AI Players in public lobbies: indistinguishable from humans, planned for Sprint 4+

## Systems

- [[systems/game-overview]] — Project overview: game types, maps, units, economy, combat, tick system
- [[systems/analytics]] — GameAnalytics player behaviour tracking: event conventions, categories, experiment funnels
- [[systems/telemetry]] — OTEL/Uptrace server observability: logs, metrics, slow-turn spans, investigation workflows
- [[systems/server-performance]] — Server-side lag candidates ranked by likelihood; `endTurn()` performance analysis
- [[systems/match-logging]] — What is recorded per match, where it goes, and what cannot be retrieved

## Decisions

### Product Strategy & Sprints
- [[decisions/product-strategy]] — Strategic logic: retention-first sequence, experiments policy, key analytics data
- [[decisions/sprint-1]] — Sprint 1 (done): analytics baseline, Sentry, mobile quick wins, ghost rate investigation
- [[decisions/sprint-2]] — Sprint 2 (done): tutorial, auto-spawn, auto-expansion, zoom-to-territory, announcements
- [[decisions/hotfix-post-sprint2]] — Post-Sprint 2 hotfix (done): experiment analytics, skip button, UI:Tap, HF-6/9
- [[decisions/sprint-3]] — Sprint 3 (current): server observability, stale builds, server restart UX, mobile warning
- [[decisions/sprint-4]] — Sprint 4 (planned): citizenship system, Yandex payments, personal inbox, leaderboard
- [[decisions/sprint-5]] — Sprint 5 (planned): coin economy, clans, cosmetics, map voting, replay
- [[decisions/cancelled-tasks]] — HF-5 (win condition), feedback match history, HF-11e — with reasons and re-attempt guidance

### Bug Fixes & Investigations
- [[decisions/autospawn-late-join-fix]] — Fix for auto-spawn failure when joining during catch-up (late join / reconnect)
- [[decisions/double-reload-fix]] — Fix for double page reload on browser refresh caused by orphaned `#refresh` history push
- [[decisions/stale-build-zombie-tabs]] — Investigation and fix for users persisting on old builds (HF-11a/b/c/d)

## Tasks

- [[tasks/session-start-sequence]] — Session start event sequence (Session:Start → Device:Type → Platform:OS → Player:New/Returning)
- [[tasks/mobile-quick-wins]] — Task 3: retina off, 30fps cap, particles reduced on mobile
- [[tasks/spawn-ux]] — Tasks 4b + 4e: zoom-to-territory function and expanding ring spawn indicator
- [[tasks/stale-build-detection]] — HF-11b/c/d: `/api/version` endpoint, client polling, non-dismissible refresh modal
