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

## 2026-04-18 — ingest
- Ingested: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md` → created [[wiki/tasks/player-profile-store-investigation]]; updated [[wiki/decisions/sprint-4]]

## 2026-04-18 — ingest
- Ingested: `ai-agents/tasks/done/sprint4-investigation-yandex-payments.md`, `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md` → created [[wiki/tasks/yandex-payments-investigation]]; updated [[wiki/decisions/sprint-4]]

## 2026-04-19 — ingest
- Ingested: `ai-agents/knowledge-base/geoconflict-overview.md` → updated [[wiki/systems/game-overview]]

## 2026-04-19 — ingest
- Ingested: `ai-agents/knowledge-base/announcements-system-guide.md` → created [[wiki/features/announcements]]

## 2026-04-19 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/knowledge-base/announcements-system-guide.md` → updated [[wiki/features/announcements]]

## 2026-04-19 — ingest
- Sync window: 1e857a0432d72de4a9e006b0f7e2cd51ace40bd6 → HEAD (9090a390027b748eba242affc07c0d29333dd285)
- Changed source files detected: 11
- Ingested: `ai-agents/tasks/done/8d-a-task-global-announcements.md` → created [[wiki/tasks/global-announcements]]; updated [[wiki/features/announcements]], [[wiki/decisions/sprint-2]]
- Skipped (already covered): `ai-agents/knowledge-base/analytics-event-reference.md` → current content already reflected in [[wiki/systems/analytics]]
- Skipped (already covered): `ai-agents/knowledge-base/announcements-system-guide.md` → current content already reflected in [[wiki/features/announcements]]
- Skipped (already covered): `ai-agents/knowledge-base/geoconflict-overview.md` → current content already reflected in [[wiki/systems/game-overview]]
- Skipped (already covered): `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md` and `ai-agents/tasks/done/sprint4-investigation-player-store.md` → current content already reflected in [[wiki/tasks/player-profile-store-investigation]] and [[wiki/decisions/sprint-4]]
- Skipped (already covered): `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md` and `ai-agents/tasks/done/sprint4-investigation-yandex-payments.md` → current content already reflected in [[wiki/tasks/yandex-payments-investigation]] and [[wiki/decisions/sprint-4]]
- Skipped (already covered): `ai-agents/sprints/plan-sprint-4.md` → current content already reflected in [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-email-subscribe-task.md`, `ai-agents/tasks/backlog/s4-legal-vat-investigation.md` — backlog files are not yet ready for wiki task pages

## 2026-04-19 — lint
- Issues found: 3
- Issues fixed: 3
- Issues flagged for human review: 0
- Fixed three backlink gaps: Sprint 4 now links back to announcements, Flashist init links back to the Yandex payments investigation, and the player-profile investigation links back to the parallel payments investigation

## 2026-04-20 — ingest
- Sync window: 9090a390027b748eba242affc07c0d29333dd285 → HEAD (9cff2b65036320c6ed505ba7ae714a26c84ef52e)
- Changed source files detected: 2
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/tasks/done/s4-email-subscribe-task.md` → created [[wiki/tasks/email-subscribe-modal]]; updated [[wiki/decisions/sprint-4]], [[wiki/features/feedback-button]], [[wiki/systems/analytics]]

## 2026-04-20 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full index/schema audit passed: 42 indexed pages, 42 on-disk pages, with no broken targets, stale path references, backlink gaps, or template violations detected

## 2026-04-21 — ingest
- Ingested: `ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md` → created [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md` → updated [[wiki/systems/telemetry]]

## 2026-04-21 — ingest
- Ingested: `docs/security/registry-image-policy.md` → created [[wiki/decisions/registry-image-policy]]

## 2026-04-21 — ingest
- Sync window: `9cff2b65036320c6ed505ba7ae714a26c84ef52e` → HEAD (`89e3d81c687a3207ec137dae97e3a1df113553ae`)
- Changed source files detected: 23
- Ingested: `ai-agents/tasks/done/sec00-incident-index.md` → created [[wiki/tasks/incident-response-index]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec01-immediate-containment.md` → created [[wiki/tasks/immediate-containment]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec02-registry-image-exposure-audit.md` → created [[wiki/tasks/registry-image-audit]]; updated [[wiki/decisions/vps-credential-leak-response]], [[wiki/decisions/registry-image-policy]]
- Ingested: `ai-agents/tasks/done/sec03-vps-access-audit-and-hardening.md` → created [[wiki/tasks/vps-access-hardening]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec04-repo-build-context-hardening.md` → created [[wiki/tasks/repo-build-context-hardening]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec05-deployment-credential-model-hardening.md` → created [[wiki/tasks/deployment-credential-hardening]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec06-clean-rebuild-redeploy-and-validation.md` → created [[wiki/tasks/clean-redeploy-validation]]; updated [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec07-postmortem-wiki-and-follow-ups.md` → created [[wiki/tasks/incident-postmortem-followups]]; updated [[wiki/decisions/vps-credential-leak-response]], [[wiki/decisions/registry-image-policy]]
- Ingested: `ai-agents/tasks/done/sec08-ci-docker-secret-boundary-check.md` → created [[wiki/tasks/docker-secret-boundary-check]]; updated [[wiki/tasks/incident-postmortem-followups]], [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/tasks/done/sec09-registry-visibility-and-image-retention-policy.md` → created [[wiki/tasks/registry-image-policy-followup]]; updated [[wiki/tasks/incident-postmortem-followups]], [[wiki/decisions/vps-credential-leak-response]], [[wiki/decisions/registry-image-policy]]
- Skipped (already covered): `ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md` — current content already reflected in [[wiki/decisions/vps-credential-leak-response]] and [[wiki/systems/telemetry]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/sec00-incident-index.md`, `ai-agents/tasks/backlog/sec01-immediate-containment.md`, `ai-agents/tasks/backlog/sec02-registry-image-exposure-audit.md`, `ai-agents/tasks/backlog/sec03-vps-access-audit-and-hardening.md`, `ai-agents/tasks/backlog/sec04-repo-build-context-hardening.md`, `ai-agents/tasks/backlog/sec05-deployment-credential-model-hardening.md`, `ai-agents/tasks/backlog/sec06-clean-rebuild-redeploy-and-validation.md`, `ai-agents/tasks/backlog/sec07-postmortem-wiki-and-follow-ups.md`, `ai-agents/tasks/backlog/sec08-ci-docker-secret-boundary-check.md`, `ai-agents/tasks/backlog/sec09-registry-visibility-and-image-retention-policy.md`, `ai-agents/tasks/backlog/sec10-remove-password-deploy-fallbacks.md`, `ai-agents/tasks/backlog/sec11-secret-management-beyond-env-files.md` — backlog files are not eligible for `wiki-sync`

## 2026-04-21 — ingest
- Sync window: `89e3d81c687a3207ec137dae97e3a1df113553ae` → HEAD (`97ff570e508164df8d5ec2a12a959102cd9d1da9`)
- Changed source files detected: 1
- Ingested: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md` → created [[wiki/systems/project-operations]]; updated [[wiki/systems/game-overview]], [[wiki/systems/analytics]], [[wiki/systems/telemetry]], [[wiki/decisions/product-strategy]], [[wiki/decisions/sprint-4]]

## 2026-04-21 — restructure
- Reorganized producer guidance from `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md` into dedicated [[wiki/systems/producer-workflow]]
- Updated index entry and backlinks in [[wiki/systems/project-operations]], [[wiki/systems/analytics]], [[wiki/decisions/product-strategy]], and [[wiki/decisions/sprint-4]]

## 2026-04-21 — lint
- Issues found: 2
- Issues fixed: 2
- Issues flagged for human review: 0
- Fixed two backlink gaps by linking [[wiki/systems/game-overview]] back to [[wiki/decisions/vps-credential-leak-response]] and [[wiki/decisions/registry-image-policy]]; index coverage, metadata fields, and source-path references all validated clean

## 2026-04-22 — ingest
- Sync window: `97ff570e508164df8d5ec2a12a959102cd9d1da9` → HEAD (`5c01322634ccd38c80c68dce10b3c4a386ce809d`)
- Changed source files detected: 14
- Ingested: `ai-agents/sprints/done/plan-sprint-3.md` → updated [[wiki/decisions/sprint-3]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/s4-legal-vat-investigation.md` → created [[wiki/tasks/legal-vat-investigation]]; updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/s4-start-screen-redesign-investigation.md` → created [[wiki/tasks/start-screen-redesign-investigation]]; updated [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/8d-b-task-personal-inbox.md`, `ai-agents/tasks/backlog/s4-citizenship-earned.md`, `ai-agents/tasks/backlog/s4-citizenship-paid.md`, `ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md`, `ai-agents/tasks/backlog/s4-legal-vat-investigation.md`, `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-start-screen-redesign-impl.md`, `ai-agents/tasks/backlog/s4-start-screen-redesign-investigation.md`, `ai-agents/tasks/backlog/s4-yandex-catalog-registration.md`, `ai-agents/tasks/backlog/s4-yandex-payments-impl.md` — backlog files are not eligible for `wiki-sync`

## 2026-04-22 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Fixed one backlink gap by linking [[wiki/tasks/global-announcements]] back to [[wiki/decisions/sprint-4]]; targeted changed-page link audit otherwise passed

## 2026-04-22 — lint
- Issues found: 4
- Issues fixed: 4
- Issues flagged for human review: 0
- Fixed two decision-page schema heading mismatches, one stale cancelled-task source path, and one stale Sprint 4 threshold note; full index/link/source-path audit passed

## 2026-04-22 — lint
- Issues found: 10
- Issues fixed: 10
- Issues flagged for human review: 0
- Normalized 10 decision-page `Date` fields to schema-compliant `YYYY-MM-DD` values using git history; full structural/link/source-path audit passed

## 2026-04-22 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full structural/link/source-path audit passed; no new issues beyond the existing intentional warning in [[wiki/systems/match-logging]]

## 2026-04-24 — ingest
- Sync window: `5c01322634ccd38c80c68dce10b3c4a386ce809d` → HEAD (`33de62b78f9994165cbb91fecbedfa8f45cbe7f6`)
- Changed source files detected: 1
- Skipped (already covered): `ai-agents/sprints/plan-sprint-4.md` — current XP-based Sprint 4 framing is already reflected in [[wiki/decisions/sprint-4]]

## 2026-04-25 — ingest
- Sync window: `33de62b78f9994165cbb91fecbedfa8f45cbe7f6` → HEAD (`f569e78954f0290ff9ff20b2c75c2334f7eb959f`)
- Changed source files detected: 3
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-telegram-link.md` — backlog files do not get wiki task pages during `wiki-sync`

## 2026-04-28 — ingest
- Sync window: `f569e78954f0290ff9ff20b2c75c2334f7eb959f` → HEAD (`3060792ef4fb87562d03e6a1cbb08e09e884da46`)
- Changed source files detected: 2
- Skipped (already covered): `ai-agents/knowledge-base/analytics-event-reference.md` — current wiki already reserves only `UI:Tap:TelegramLinkStartScreen` and `UI:Tap:TelegramLinkGameEnd` in [[wiki/systems/analytics]]
- Skipped (already covered): `ai-agents/sprints/plan-sprint-4.md` — current Sprint 4 page already lists Telegram Channel Link as start-screen and game-end only in [[wiki/decisions/sprint-4]]

## 2026-04-28 — lint
- Issues found: 2
- Issues fixed: 2
- Issues flagged for human review: 0
- Fixed two stale/unqualified task filename references for the feedback match-ID replacement; full index/schema/link/source-path audit passed, with only the pre-existing [[wiki/systems/match-logging]] line-number warning remaining.

## 2026-04-28 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]

## 2026-04-28 — ingest
- Ingested: `ai-agents/knowledge-base/server-match-logging-state.md` → updated [[wiki/systems/match-logging]]

## 2026-04-29 — ingest
- Ingested: `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` → created [[wiki/tasks/missions-difficulty-investigation]]; updated [[wiki/features/tutorial]], [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]

## 2026-04-29 — ingest
- Ingested: `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` follow-up mission map ordering implementation → updated [[wiki/tasks/missions-difficulty-investigation]]

## 2026-04-29 — ingest
- Ingested: zero-nation mission map exclusion follow-up → updated `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` and [[wiki/tasks/missions-difficulty-investigation]]
