# Activity Log — Geoconflict Wiki

> Append-only. Each entry records what was ingested, queried, or linted and when.

<!-- Entries added below, newest last -->

## 2026-04-15 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → created [[wiki/systems/analytics]]
- Ingested: `ai-agents/knowledge-base/geoconflict-overview.md` → created [[wiki/systems/game-overview]]
- Ingested: `ai-agents/knowledge-base/autospawn-bug-fix-report.md` → created [[wiki/decisions/autospawn-late-join-fix]]
- Ingested: `ai-agents/knowledge-base/double-reload-findings.md` → created [[wiki/decisions/double-reload-fix]]
- Ingested: `ai-agents/knowledge-base/hf11a-stale-build-findings.md` → created [[wiki/decisions/stale-build-zombie-tabs]]
- Ingested: `ai-agents/knowledge-base/server-match-logging-state.md` → created [[wiki/systems/match-logging]]
- Ingested: `ai-agents/knowledge-base/server-performance-investigation.md` → created [[wiki/systems/server-performance]]
- Ingested: `ai-agents/knowledge-base/tutorial-technical-description.md` → created [[wiki/features/tutorial]]
- Ingested: `ai-agents/knowledge-base/uptrace-knowledge-base.md` → created [[wiki/systems/telemetry]]

## 2026-04-15 — lint
- Issues found: 10
- Issues fixed: 5 (missing back-links: analytics→game-overview, telemetry→game-overview, game-overview→server-performance, game-overview→match-logging, double-reload-fix→game-overview)
- Issues flagged for human review: 5
- Most significant: 5 forward-reference broken links to pages not yet created (game-loop, networking, execution-pipeline, rendering, flashist-init) — resolve by running `/wiki-ingest architecture`

## 2026-04-15 — ingest
- Ingested: `ai-agents/sprints/plan-index.md` → created [[wiki/decisions/product-strategy]]
- Ingested: `ai-agents/sprints/done/plan-sprint-1.md` → created [[wiki/decisions/sprint-1]]
- Ingested: `ai-agents/sprints/done/plan-sprint-2.md` → created [[wiki/decisions/sprint-2]]
- Ingested: `ai-agents/sprints/done/hotfix-post-sprint2.md` → created [[wiki/decisions/hotfix-post-sprint2]]
- Ingested: `ai-agents/sprints/plan-sprint-3.md` → created [[wiki/decisions/sprint-3]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → created [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/plan-sprint-5.md` → created [[wiki/decisions/sprint-5]]
- Ingested: `ai-agents/sprints/cancelled-tasks.md` → created [[wiki/decisions/cancelled-tasks]]

## 2026-04-15 — lint
- Issues found: 7
- Issues fixed: 6 (sprint-4 stale 8d-A note; back-links: cancelled-tasks→product-strategy, telemetry→sprint-3, server-performance→sprint-3, tutorial→sprint-1/sprint-2/hotfix-post-sprint2)
- Issues flagged for human review: 1
- Most significant: FeedbackModal.ts:265 already implements the sprint-3 "Feedback — match IDs" task — verify whether it's truly complete before treating as pending

## 2026-04-15 — lint
- Issues found: 20
- Issues fixed: 20
- Issues flagged for human review: 0
- Most significant: `features/ai-players` incorrectly marked as "planned" — `PlayerType.AiPlayer` is confirmed active in production across 10+ files; also fixed sprint attribution errors (reconnection and feedback-button were Sprint 1, not Sprint 2) and 15 missing bidirectional back-links across analytics, game-overview, sprint pages, and autospawn/stale-build decision pages

## 2026-04-15 — ingest
- Ingested: `ai-agents/tasks/done/feature_spec_ai_players_standalone.md` → created [[wiki/features/ai-players]]
- Ingested: `ai-agents/tasks/done/task-02-crash-reconnection.md` + `task-02a-reconnection-analytics.md` → created [[wiki/features/reconnection]]
- Ingested: `ai-agents/tasks/done/task-02b-feedback-button.md` + `task-02c-device-environment-info.md` + `task-feedback-match-ids-simple.md` → created [[wiki/features/feedback-button]]
- Ingested: `ai-agents/tasks/done/task-02d-additional-analytics-events.md` + `task-02f-device-type-analytics.md` + `task-02g-new-returning-player.md` → created [[wiki/tasks/session-start-sequence]]
- Ingested: `ai-agents/tasks/done/hf11b-hotfix-version-endpoint.md` + `hf11c-hotfix-stale-build-detection.md` + `hf11d-hotfix-stale-build-modal.md` → created [[wiki/tasks/stale-build-detection]]
- Ingested: `ai-agents/tasks/done/task-03-mobile-quick-wins.md` → created [[wiki/tasks/mobile-quick-wins]]
- Ingested: `ai-agents/tasks/done/task-zoom-to-territory.md` + `task-04e-spawn-indicator.md` → created [[wiki/tasks/spawn-ux]]
- Also read (covered by existing pages or sprint pages): task-02e (analytics), task-02h (sentry, covered by sprint-1), task-02j (spawn anomaly investigation), task-04-tutorial, task-04a-auto-spawn, task-04c-auto-expansion, task-autospawn-bug-investigation (covered by autospawn-late-join-fix), task-experiment-analytics (covered by hotfix-post-sprint2), task-server-performance + 5d-b-task-server-performance (covered by server-performance), task-uptrace-setup (covered by telemetry), task-5d-a-server-metrics (covered by telemetry), 5d-c-task-telemetry-knowledge-base (telemetry doc task), investigation-server-logging (covered by match-logging), task-humans-vs-nations (covered by sprint-3), hf11a investigation files (covered by stale-build-zombie-tabs), hf12 (covered by sprint-3), hotfix-hf3/4/7/8/9/10 (covered by hotfix-post-sprint2), hotfix-tutorial-skip-visibility (covered by hotfix-post-sprint2), cancelled files (covered by cancelled-tasks), backlog files (covered by sprint-3/4 pages)
- Updated cross-links: sprint-1, sprint-2, sprint-3, sprint-4 → new feature/task pages
