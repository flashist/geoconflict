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

## 2026-04-17 — ingest
- Sync window: force/first-run (no previous watermark) → HEAD (`2bca900ac4da0761b860c76d52186091383b6d75`)
- Changed source files detected: 61
- Ingested: `ai-agents/sprints/plan-sprint-6.md` → created [[wiki/decisions/sprint-6]]
- Ingested: `ai-agents/sprints/plan-index.md` → updated [[wiki/decisions/product-strategy]]
- Ingested: `ai-agents/sprints/plan-sprint-3.md` → updated [[wiki/decisions/sprint-3]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/plan-sprint-5.md` → updated [[wiki/decisions/sprint-5]]
- Ingested: `ai-agents/sprints/done/hotfix-post-sprint2.md` + `ai-agents/tasks/done/hotfix-hf10-cache-busting.md` → updated [[wiki/decisions/hotfix-post-sprint2]]
- Ingested: `ai-agents/sprints/cancelled-tasks.md` + `ai-agents/tasks/cancelled/hotfix-hf5-win-condition-bug.md` + `ai-agents/tasks/cancelled/hf11e-hotfix-build-number-automation.md` → updated [[wiki/decisions/cancelled-tasks]]
- Ingested: `karpathy-vault/index.md` → updated decision index entry for [[wiki/decisions/sprint-6]]
- Skipped (already covered): 53 remaining eligible `ai-agents/knowledge-base/*.md`, `ai-agents/sprints/done/*.md`, and `ai-agents/tasks/done/*.md` files were already represented by existing wiki pages; this sync only refreshed the stale decision pages and added the missing Sprint 6 page

## 2026-04-17 — lint
- Issues found: 29
- Issues fixed: 24
- Issues flagged for human review: 5
- Most significant: fixed template drift on feature/task pages, corrected stale HF-11 status and trigger details against current code, and closed all bidirectional cross-link gaps; remaining warnings are the five still-missing architecture/system pages (`flashist-init`, `game-loop`, `networking`, `execution-pipeline`, `rendering`)

## 2026-04-17 — ingest
- Ingested: `CLAUDE.md` → created [[wiki/systems/game-loop]]
- Ingested: `CLAUDE.md` → created [[wiki/systems/networking]]
- Ingested: `CLAUDE.md` → created [[wiki/systems/execution-pipeline]]
- Ingested: `CLAUDE.md` → created [[wiki/systems/rendering]]
- Ingested: `CLAUDE.md` → created [[wiki/systems/flashist-init]]
- Ingested: `CLAUDE.md` → updated [[wiki/systems/game-overview]]
- Ingested: `CLAUDE.md` → updated [[wiki/systems/analytics]]
- Ingested: `CLAUDE.md` → updated `karpathy-vault/index.md`

## 2026-04-17 — ingest
- Sync window: `2bca900ac4da0761b860c76d52186091383b6d75` → HEAD (`6b47389dab53093b59b5e946b2c1e7bd7a3f6474`)
- Changed source files detected: 2
- Ingested: `ai-agents/sprints/plan-sprint-3.md` → updated [[wiki/decisions/sprint-3]]
- Ingested: `ai-agents/sprints/plan-sprint-6.md` → updated [[wiki/decisions/sprint-6]]

## 2026-04-17 — lint
- Issues found: 13
- Issues fixed: 13
- Issues flagged for human review: 0
- Corrected decision/task template drift, fixed stale analytics and endpoint references against current code, and removed the Sprint 4/8d-A roadmap contradiction

## 2026-04-17 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Revalidated all indexed wiki pages; schema compliance, index coverage, backlinks, and source/code references are currently clean

## 2026-04-17 — ingest
- Sync window: `6b47389dab53093b59b5e946b2c1e7bd7a3f6474` → HEAD (`4f88b59075f488fcd6843db777526ff6031f46fc`)
- Changed source files detected: 5
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Skipped: `ai-agents/tasks/backlog/s4-ai-lobby-slot-bug.md`, `ai-agents/tasks/backlog/s4-nations-balance-task.md`, `ai-agents/tasks/backlog/s4-tutorial-action-pause.md`, `ai-agents/tasks/backlog/s4-tutorial-no-nations.md` — backlog files are not ingest-worthy in `wiki-sync`; their scope is reflected through [[wiki/decisions/sprint-4]]

## 2026-04-18 — ingest
- Sync window: `4f88b59075f488fcd6843db777526ff6031f46fc` → HEAD (`255d6cb79003a82a2a66184c586976058c1c0503`)
- Changed source files detected: 9
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/cancelled/s4-tutorial-action-pause.md` → updated [[wiki/decisions/cancelled-tasks]]
- Ingested: `ai-agents/tasks/done/s3-investigation-ui-click-multiplayer.md` → created [[wiki/tasks/ui-click-multiplayer]]; updated [[wiki/decisions/sprint-3]], [[wiki/systems/analytics]]
- Ingested: `ai-agents/tasks/done/hf13-hotfix-map-preload.md` → created [[wiki/tasks/map-preload]]; updated [[wiki/decisions/sprint-3]], [[wiki/systems/analytics]]
- Ingested: `ai-agents/tasks/done/s4-ai-lobby-slot-bug.md` → created [[wiki/tasks/ai-lobby-slot-bug]]; updated [[wiki/decisions/sprint-4]], [[wiki/features/ai-players]]
- Ingested: `ai-agents/tasks/done/s4-tutorial-no-nations.md` → created [[wiki/tasks/tutorial-no-nations]]; updated [[wiki/features/tutorial]]
- Ingested: `ai-agents/tasks/done/s4-tutorial-build-menu-lock.md` → created [[wiki/tasks/tutorial-build-menu-lock]]; updated [[wiki/features/tutorial]]
- Skipped (already covered): `ai-agents/tasks/backlog/s4-tutorial-build-menu-lock.md` — backlog files are not ingest-worthy in `wiki-sync`; the completed task file was processed instead

## 2026-04-18 — ingest
- Sync window: `255d6cb79003a82a2a66184c586976058c1c0503` → HEAD (`1e857a0432d72de4a9e006b0f7e2cd51ace40bd6`)
- Changed source files detected: 5
- Ingested: `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md` → created [[wiki/decisions/hvn-balance-pr70-no-ship]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/cancelled/s4-nations-balance-task.md` → updated [[wiki/decisions/cancelled-tasks]]
- Ingested: `ai-agents/tasks/done/s4-tutorial-reduce-bots.md` → created [[wiki/tasks/tutorial-reduce-bots]]
- Skipped (already covered): `ai-agents/tasks/backlog/s4-tutorial-reduce-bots.md` — backlog files are not ingest-worthy in `wiki-sync`; the completed task file was processed instead

## 2026-04-18 — lint
- Issues found: 2
- Issues fixed: 2
- Issues flagged for human review: 0
- Fixed stale `src/...:line` source references in [[wiki/systems/match-logging]]; index coverage, wikilinks, backlinks, and required page templates all validated clean
