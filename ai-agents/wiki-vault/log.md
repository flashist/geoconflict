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
- Ingested: `wiki-vault/index.md` → updated decision index entry for [[wiki/decisions/sprint-6]]
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
- Ingested: `CLAUDE.md` → updated `wiki-vault/index.md`

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
- Changed source files detected: 13
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

## 2026-04-29 — ingest
- Ingested: Medium nation ramp tuning follow-up (`floor(level / 5)`) → updated `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` and [[wiki/tasks/missions-difficulty-investigation]]

## 2026-04-29 — ingest
- Ingested: generic-bot difficulty clarification → updated `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` and [[wiki/tasks/missions-difficulty-investigation]]

## 2026-04-29 — ingest
- Sync window: `3060792ef4fb87562d03e6a1cbb08e09e884da46` → HEAD (`b9d7f1071341c2259669aadf772bce548dcac3f9`)
- Changed source files detected: 14
- Ingested: `ai-agents/tasks/done/s4-solo-win-condition-fix.md` → created [[wiki/tasks/solo-win-condition-fix]]; updated [[wiki/systems/analytics]], [[wiki/systems/match-logging]], [[wiki/systems/execution-pipeline]], [[wiki/systems/game-loop]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/s4-telegram-link.md` → created [[wiki/tasks/telegram-link]]; updated [[wiki/systems/analytics]], [[wiki/tasks/email-subscribe-modal]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/s4-missions-difficulty-investigation.md` + `ai-agents/knowledge-base/s4-missions-difficulty-findings.md` → updated [[wiki/tasks/missions-difficulty-investigation]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Skipped (already covered): `ai-agents/knowledge-base/server-match-logging-state.md` — current content already reflected in [[wiki/systems/match-logging]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-feedback-modal-space-key.md`, `ai-agents/tasks/backlog/s4-missions-difficulty-investigation.md`, `ai-agents/tasks/backlog/s4-nuke-trajectory-visibility.md`, `ai-agents/tasks/backlog/s4-solo-win-condition-fix.md`, `ai-agents/tasks/backlog/s4-teams-mode-max-teams.md`, `ai-agents/tasks/backlog/s4-vk-link.md` — backlog files are not eligible for `wiki-sync`
- Skipped (not a sprint plan ingest): `ai-agents/sprints/sprint-backlog.md` — no-sprint holding list, no completed task or sprint decision page created

## 2026-04-29 — ingest
- Ingested: `ai-agents/tasks/backlog/s4-vk-link.md` → created [[wiki/tasks/vk-link]]; updated [[wiki/systems/analytics]], [[wiki/tasks/telegram-link]], [[wiki/decisions/sprint-4]]

## 2026-04-29 — ingest
- Ingested: VK link real URL follow-up (`https://vk.com/gameworldwar`) → updated [[wiki/tasks/vk-link]], [[wiki/decisions/sprint-4]]

## 2026-04-29 — ingest
- Ingested: `ai-agents/tasks/done/s4-nuke-trajectory-visibility.md` → created [[wiki/tasks/nuke-trajectory-visibility]]; updated [[wiki/systems/rendering]]

## 2026-04-30 — ingest
- Sync window: `b9d7f1071341c2259669aadf772bce548dcac3f9` → HEAD (`a033288a638b2444c4512dc6b5e5e516957c8e79`)
- Changed source files detected: 13
- Ingested: `ai-agents/tasks/done/s4-teams-mode-max-teams.md` → created [[wiki/tasks/teams-mode-max-teams]]; updated [[wiki/decisions/sprint-4]], [[wiki/systems/game-overview]]
- Ingested: `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md` → created [[wiki/tasks/monetization-analytics-spec]]; updated [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/tasks/done/s4-vk-link.md` → updated [[wiki/tasks/vk-link]]
- Ingested: `ai-agents/tasks/done/s4-nuke-trajectory-visibility.md` → updated [[wiki/tasks/nuke-trajectory-visibility]], [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/analytics-p0-match-lifecycle.md`, `ai-agents/tasks/backlog/analytics-p0-session-enrichment.md`, `ai-agents/tasks/backlog/analytics-p1-ad-impression-tier.md`, `ai-agents/tasks/backlog/analytics-p1-citizenship-funnel.md`, `ai-agents/tasks/backlog/s4-citizenship-earned.md`, `ai-agents/tasks/backlog/s4-citizenship-paid.md`, `ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md`, `ai-agents/tasks/backlog/s4-start-screen-redesign-impl.md` — backlog files are not eligible for `wiki-sync`

## 2026-04-30 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Re-verified stale `GameServer.ts` line references in [[wiki/systems/match-logging]] and removed the resolved lint warning; structural, index, backlink, orphan, and source-path checks passed.

## 2026-04-30 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]

## 2026-04-30 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` reconnect/replay guard follow-up → updated [[wiki/systems/analytics]]

## 2026-04-30 — ingest
- Sync window: `a033288a638b2444c4512dc6b5e5e516957c8e79` → HEAD (`53205390e64866bcfa73b72fffd8a4e6d7140916`)
- Changed source files detected: 5
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/tasks/done/analytics-p0-game-mode-segmentation.md` → created [[wiki/tasks/analytics-p0-game-mode-segmentation]]; updated [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/analytics-p0-game-mode-segmentation.md`, `ai-agents/tasks/backlog/analytics-p0-match-duration.md`, `ai-agents/tasks/backlog/analytics-p0-spawn-confirmation.md` — backlog files are not eligible for `wiki-sync`

## 2026-04-30 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Fixed one stale `Worker.ts` line reference in [[wiki/systems/match-logging]]; full structural, index, backlink, orphan, and exact source-path checks passed for 66 pages.

## 2026-04-30 — ingest
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]

## 2026-04-30 — ingest
- Sync window: `53205390e64866bcfa73b72fffd8a4e6d7140916` → HEAD (`30a232eb76e62cbeeae6dd188286e0210f411e1a`)
- Changed source files detected: 2
- Ingested: `ai-agents/tasks/done/analytics-p0-spawn-confirmation.md` → created [[wiki/tasks/analytics-p0-spawn-confirmation]]; updated [[wiki/systems/analytics]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Skipped (already covered): none

## 2026-04-30 — ingest
- Ingested: `ai-agents/tasks/done/analytics-p0-match-duration.md` → created [[wiki/tasks/analytics-p0-match-duration]]; updated [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]

## 2026-05-02 — ingest
- Sync window: `30a232eb76e62cbeeae6dd188286e0210f411e1a` → HEAD (`a5568a3255440662403231d251f3490fc520be68`)
- Changed source files detected: 7
- Ingested: `ai-agents/tasks/done/analytics-p0-player-days-played.md` → created [[wiki/tasks/analytics-p0-player-days-played]]; updated [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Skipped (already covered): `ai-agents/tasks/done/analytics-p0-match-duration.md` — current wiki page and backlinks were already created in the 2026-04-30 manual ingest
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/analytics-p0-player-days-played.md`, `ai-agents/tasks/backlog/s4-win-check-multiplayer-regression-investigation.md`, `ai-agents/tasks/backlog/analytics-p0-session-match-count.md`, `ai-agents/tasks/backlog/analytics-p0-yandex-login-status.md` — backlog files are not eligible for `wiki-sync`

## 2026-05-02 — ingest
- Sync window: `a5568a3255440662403231d251f3490fc520be68` → HEAD (`bfb764f7cf9fd1c51ac630cdca223a834e929d80`)
- Changed source files detected: 2
- Ingested: `ai-agents/tasks/done/analytics-p0-yandex-login-status.md` → created [[wiki/tasks/analytics-p0-yandex-login-status]]; updated [[wiki/systems/analytics]], [[wiki/systems/flashist-init]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
- Skipped (already covered): none

## 2026-05-03 — ingest
- Sync window: `bfb764f7cf9fd1c51ac630cdca223a834e929d80` → HEAD (`425be224a054ba027053667f3898d0a7227aa361`)
- Changed source files detected: 3
- Ingested: `ai-agents/tasks/done/analytics-p0-session-match-count.md` → created [[wiki/tasks/analytics-p0-session-match-count]]; updated [[wiki/systems/analytics]], [[wiki/tasks/analytics-p0-yandex-login-status]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]] (Session:MatchesPlayed added to sequence; session start sequence updated)
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/streamer-program.md` — backlog file, not eligible for `wiki-sync`

## 2026-05-03 — lint
- Issues found: 6
- Issues fixed: 6
- Issues flagged for human review: 0
- Fixed 5 missing bidirectional back-links (flashist-init, monetization-analytics-spec, analytics-p0-game-mode-segmentation, sprint-4 ×2) and updated stale session-start-sequence task page to include Session:MatchesPlayed before Session:Start

## 2026-05-03 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Fixed one-way link introduced by previous lint: session-start-sequence → analytics-p0-session-match-count lacked the reverse back-link

## 2026-05-05 — ingest
- Sync window: `425be224a054ba027053667f3898d0a7227aa361` → HEAD (`79afbc7c3a6cf99aaa7a57f48502e5228d88eb36`)
- Changed source files detected: 5
- Ingested: `ai-agents/sprints/plan-sprint-4b.md` → created [[wiki/decisions/sprint-4b]]; updated [[wiki/decisions/product-strategy]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-5]], [[wiki/systems/project-operations]], [[wiki/systems/producer-workflow]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/sprint4b-compact-map-rotation.md`, `ai-agents/tasks/backlog/sprint4b-duos-trios-quads.md`, `ai-agents/tasks/backlog/sprint4b-mini-mode-investigation.md`, `ai-agents/tasks/backlog/sprint4b-weird-setting-modifier.md` — backlog files are not eligible for `wiki-sync`

## 2026-05-05 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Fixed one missing backlink from [[wiki/decisions/sprint-4]] to [[wiki/tasks/analytics-p0-match-duration]]; full structural, index, backlink, orphan, and source-path checks passed for 72 pages.

## 2026-05-05 — ingest
- Ingested: `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md` → created [[wiki/tasks/sprint4b-mini-mode-investigation]]; updated [[wiki/decisions/sprint-4b]], [[wiki/features/ai-players]], [[wiki/tasks/teams-mode-max-teams]]

## 2026-05-05 — ingest
- Updated: `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md` and [[wiki/tasks/sprint4b-mini-mode-investigation]] to record that compact water-centered nation coordinates are accepted as non-blocking spawn-distribution risks, not map exclusions.

## 2026-05-05 — ingest
- Sync window: `79afbc7c3a6cf99aaa7a57f48502e5228d88eb36` → HEAD (`980493298860097205308d0f7488dbdf57f9c80e`)
- Changed source files detected: 2
- Ingested: `ai-agents/tasks/done/sprint4b-mini-mode-investigation.md` → updated [[wiki/tasks/sprint4b-mini-mode-investigation]]
- Ingested: `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md` → updated [[wiki/tasks/sprint4b-mini-mode-investigation]]
- Skipped (already covered): none

## 2026-05-05 — ingest
- Ingested: `ai-agents/tasks/done/sprint4b-duos-trios-quads.md` → created [[wiki/tasks/sprint4b-duos-trios-quads]]; updated [[wiki/decisions/sprint-4b]], [[wiki/features/ai-players]], [[wiki/tasks/sprint4b-mini-mode-investigation]], [[wiki/tasks/teams-mode-max-teams]]

## 2026-05-05 — ingest
- Ingested: `ai-agents/tasks/done/sprint4b-duos-trios-quads.md` → updated [[wiki/tasks/sprint4b-duos-trios-quads]] to record singleplayer/private lobby UI exposure and the unchanged low-participant limitation

## 2026-05-05 — ingest
- Ingested: `ai-agents/knowledge-base/clans-system-findings.md` → created [[wiki/systems/clans]], created [[wiki/tasks/investigate-clans-system]]; updated [[wiki/decisions/sprint-5]], [[wiki/tasks/sprint4b-duos-trios-quads]], index.md

## 2026-05-05 — lint
- Issues found: 3
- Issues fixed: 3
- Issues flagged for human review: 0
- Stale claim: game-overview listed Duos/Trios/Quads as "Disabled" in two places — updated to reflect Sprint 4b re-enable; fixed two one-way links (sprint-5 and sprint4b-duos-trios-quads both now link back to investigate-clans-system)

## 2026-05-05 — sync
- Sync window: `980493298860097205308d0f7488dbdf57f9c80e` → HEAD (`62b460292ac07c05cf3c79295a976e2c43dcd42e`)
- Changed source files detected: 4
- Skipped (already covered): `ai-agents/knowledge-base/clans-system-findings.md` — [[wiki/systems/clans]] already comprehensive from prior manual ingest
- Skipped (already covered): `ai-agents/tasks/done/sprint4b-duos-trios-quads.md` — [[wiki/tasks/sprint4b-duos-trios-quads]] already up to date
- Updated: `ai-agents/tasks/done/investigate-clans-system.md` → fixed stale source path in [[wiki/tasks/investigate-clans-system]] (`backlog/` → `done/`)
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/investigate-clans-system.md` — backlog file

## 2026-05-06 — ingest
- Ingested: `ai-agents/tasks/done/sprint4b-compact-map-rotation.md` → created [[wiki/tasks/sprint4b-compact-map-rotation]]; updated [[wiki/decisions/sprint-4b]], [[wiki/tasks/sprint4b-mini-mode-investigation]], index.md

## 2026-05-06 — correction
- Reverted premature task-file move and wiki task ingest for `ai-agents/tasks/backlog/sprint4b-compact-map-rotation.md`; task remains in backlog until human testing/verification moves it to done.

## 2026-05-06 — ingest
- Sync window: `62b460292ac07c05cf3c79295a976e2c43dcd42e` → HEAD (`2d47933a26471929b417f617c57b88c66d5f0c85`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/sprint4b-compact-map-rotation.md` → created [[wiki/tasks/sprint4b-compact-map-rotation]]; updated [[wiki/decisions/sprint-4b]], [[wiki/tasks/sprint4b-mini-mode-investigation]], index.md
- Skipped (already covered): none

## 2026-05-06 — lint
- Issues found: 5
- Issues fixed: 5
- Issues flagged for human review: 0
- Fixed two one-way backlinks (`systems/clans` ↔ `systems/execution-pipeline`, `systems/game-overview` ↔ `tasks/sprint4b-duos-trios-quads`) and normalized stale-looking source references with line ranges in the clans pages.

## 2026-05-06 — ingest
- Sync window: `2d47933a26471929b417f617c57b88c66d5f0c85` → HEAD (`37b1beb37c02216d1613c09733c808affdb11a89`)
- Changed source files detected: 3
- Ingested: `ai-agents/sprints/done/plan-sprint-4b.md` → updated [[wiki/decisions/sprint-4b]], index.md
- Ingested: `ai-agents/tasks/done/sprint4b-weird-setting-modifier.md` → created [[wiki/tasks/sprint4b-weird-setting-modifier]]; updated [[wiki/decisions/sprint-4b]], [[wiki/tasks/sprint4b-compact-map-rotation]], index.md
- Skipped (already covered): `ai-agents/sprints/plan-sprint-4b.md` — renamed to `ai-agents/sprints/done/plan-sprint-4b.md` and ingested from the done path

## 2026-05-06 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full structural, index, backlink, orphan, source-path, and targeted stale-wording checks passed for 78 indexed pages.

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md` → updated [[wiki/systems/telemetry]]

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md` → updated [[wiki/systems/telemetry]]

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md` → updated [[wiki/systems/telemetry]]

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md` → updated [[wiki/systems/telemetry]] with deploy-secret placeholder guard and retention row-count retry notes

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md` → updated [[wiki/systems/telemetry]] with separate 90-day metrics retention

## 2026-05-07 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md` → updated [[wiki/systems/telemetry]] with PostgreSQL backup-pruning rationale

## 2026-05-07 — ingest
- Sync window: `37b1beb37c02216d1613c09733c808affdb11a89` → HEAD (`a7a7798dd8d337c930eed9ea9a289f94a578e672`)
- Changed source files detected: 4
- Skipped (already covered): `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md` — already ingested into [[wiki/systems/telemetry]] earlier on 2026-05-07
- Skipped (already covered): `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md` — already ingested into [[wiki/systems/telemetry]] earlier on 2026-05-07
- Skipped (already covered): `ai-agents/knowledge-base/telemetry-retention-review-2026-05-07.md` — already ingested into [[wiki/systems/telemetry]] earlier on 2026-05-07
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/ux-quick-message-access.md` — backlog task

## 2026-05-07 — lint
- Issues found: 2
- Issues fixed: 2
- Issues flagged for human review: 0
- Added missing canonical system pages for [[wiki/systems/configuration]] and [[wiki/systems/localization]], updated index entries, and added bidirectional links from related pages.

## 2026-05-07 — ingest
- Ingested: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md` → created [[wiki/tasks/cosmetics-serving]]; updated [[wiki/systems/telemetry]], index.md

## 2026-05-07 — ingest
- Ingested: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md` → updated [[wiki/tasks/cosmetics-serving]] with same-origin cosmetics fetch and local dev proxy notes

## 2026-05-07 — ingest
- Ingested: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md` → updated [[wiki/tasks/cosmetics-serving]] with worker-side local master cosmetics endpoint review fix

## 2026-05-07 — ingest
- Ingested: `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md` → updated [[wiki/tasks/cosmetics-serving]] with `MASTER_INTERNAL_ORIGIN` override for worker cosmetics fetches

## 2026-05-07 — ingest
- Sync window: `a7a7798dd8d337c930eed9ea9a289f94a578e672` → HEAD (`a93739abe46faa7a3e2387498b73a090e28dd87c`)
- Changed source files detected: 7
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → created [[wiki/decisions/sprint-4c]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4c-fix-archive-endpoint.md`, `ai-agents/tasks/backlog/s4c-fix-cosmetics-serving.md`, `ai-agents/tasks/backlog/s4c-fix-local-server-hash-guard.md`, `ai-agents/tasks/backlog/s4c-investigate-lobby-map-fetch.md`, `ai-agents/tasks/backlog/s4c-investigate-null-id-errors.md`, `ai-agents/tasks/backlog/s4c-mobile-webgl-rendering.md` — backlog files are not ingested by wiki-sync; their scope is summarized through [[wiki/decisions/sprint-4c]]

## 2026-05-07 — ingest
- Sync window: `a93739abe46faa7a3e2387498b73a090e28dd87c` → HEAD (`866018fe6bec57ddde7f16ec3718c8bf29f94076`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/s4c-fix-cosmetics-serving.md` → updated [[wiki/tasks/cosmetics-serving]], [[wiki/systems/configuration]]
- Skipped (already covered): none

## 2026-05-08 — ingest
- Sync window: `866018fe6bec57ddde7f16ec3718c8bf29f94076` → HEAD (`6b7ab395d34772e8a9f9d37488796393eda9fe31`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/s4c-fix-local-server-hash-guard.md` → created [[wiki/tasks/local-server-hash-guard]]; updated [[wiki/systems/telemetry]], [[wiki/decisions/sprint-4c]], index.md
- Skipped (already covered): none

## 2026-05-08 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-clickhouse-system-log-retention-2026-05-08.md` → updated [[wiki/systems/telemetry]]

## 2026-05-09 — ingest
- Sync window: `6b7ab395d34772e8a9f9d37488796393eda9fe31` → HEAD (`2f8a4a178878ea6a88cea075ee7dcc54605bc589`)
- Changed source files detected: 4
- Ingested: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md` → created [[wiki/tasks/archive-endpoint-failures]]; updated [[wiki/systems/match-logging]], [[wiki/systems/telemetry]], [[wiki/tasks/cosmetics-serving]], index.md
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]]
- Skipped (already covered): `ai-agents/knowledge-base/telemetry-clickhouse-system-log-retention-2026-05-08.md` — already reflected in [[wiki/systems/telemetry]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4c-leaderboard-player-count.md` — backlog task; summarized through [[wiki/decisions/sprint-4c]]

## 2026-05-09 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed: index/file coverage, required metadata, wiki-link resolution, backlinks, and local source-path references are clean.

## 2026-05-09 — ingest
- Sync window: `2f8a4a178878ea6a88cea075ee7dcc54605bc589` → HEAD (`4850f82bbd43267eb3c34c62639eb81d273649ad`)
- Changed source files detected: 1
- Ingested: `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md` → created [[wiki/decisions/licensing-compliance]]; updated [[wiki/systems/game-overview]], [[wiki/systems/project-operations]], [[wiki/decisions/product-strategy]], [[wiki/decisions/sprint-4]], [[wiki/tasks/legal-vat-investigation]], [[wiki/tasks/yandex-payments-investigation]], index.md
- Skipped (already covered): none

## 2026-05-10 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-clickhouse-file-log-hardening-2026-05-10.md` → updated [[wiki/systems/telemetry]]

## 2026-05-10 — ingest
- Ingested: `ai-agents/knowledge-base/telemetry-clickhouse-file-log-hardening-2026-05-10.md` → updated [[wiki/systems/telemetry]] with memory XML and forced config-application details

## 2026-05-11 — ingest
- Sync window: `4850f82bbd43267eb3c34c62639eb81d273649ad` → HEAD (`3e0f49f705845e6f62caec9e795d36fce30d028f`)
- Changed source files detected: 8
- Ingested: `ai-agents/knowledge-base/compact-map-click-interaction-findings.md` → created [[wiki/tasks/compact-map-click-interaction]]; updated [[wiki/systems/rendering]], [[wiki/tasks/sprint4b-compact-map-rotation]], [[wiki/tasks/sprint4b-mini-mode-investigation]], [[wiki/decisions/sprint-4c]], index.md
- Ingested: `ai-agents/knowledge-base/telemetry-clickhouse-file-log-hardening-2026-05-10.md` → already reflected in [[wiki/systems/telemetry]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-licensing-asset-audit.md`, `ai-agents/tasks/backlog/s4c-fix-compact-map-boat-attack.md`, `ai-agents/tasks/backlog/s5-fix-compact-map-shore-generation.md`, `ai-agents/tasks/backlog/s6-new-maps-community-demand.md` — backlog tasks; summarized through sprint/decision pages where applicable

## 2026-06-01 — ingest
- Sync window: `3e0f49f705845e6f62caec9e795d36fce30d028f` → HEAD (`eeada17a5d26770ec729476c9148bd7c6f3d91fe`)
- Changed source files detected: 8
- Ingested: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md` → updated [[wiki/tasks/archive-endpoint-failures]]; created [[wiki/decisions/archive-archival-strategy]]
- Ingested: `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md` → updated [[wiki/decisions/archive-archival-strategy]], [[wiki/tasks/archive-endpoint-failures]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-archive-s3-backed-citizen-gated.md`, `ai-agents/tasks/backlog/s4c-reduce-archive-telemetry-noise.md`, `ai-agents/tasks/backlog/content-hint-videos-production.md`, `ai-agents/tasks/backlog/s5-hint-videos-in-game.md` — backlog files are not ingested directly by wiki-sync; the archive split is summarized through the knowledge-base and sprint pages

## 2026-06-01 — ingest
- Sync window: `eeada17a5d26770ec729476c9148bd7c6f3d91fe` → HEAD (`8e9267e6d70eb348a5e46239f1f77edc71272c74`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/s4c-reduce-archive-telemetry-noise.md` → updated [[wiki/tasks/archive-endpoint-failures]], [[wiki/systems/match-logging]], [[wiki/systems/telemetry]]
- Skipped (already covered): none

## 2026-06-02 — ingest
- Sync window: `8e9267e6d70eb348a5e46239f1f77edc71272c74` → HEAD (`dacab6de4a4ddd499cb1da553adb1087acbaa133`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/s4c-leaderboard-player-count.md` → created [[wiki/tasks/leaderboard-player-count]]; updated [[wiki/decisions/sprint-4c]], [[wiki/systems/rendering]], [[wiki/features/ai-players]], index.md
- Skipped (already covered): none

## 2026-06-02 — ingest
- Sync window: `dacab6de4a4ddd499cb1da553adb1087acbaa133` → HEAD (`3c7e4ab87871dc1e4781eab87cd8c6b33bfd1c2f`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/cancelled/s4c-fix-compact-map-boat-attack.md` → updated [[wiki/decisions/cancelled-tasks]], [[wiki/tasks/compact-map-click-interaction]]
- Skipped (already covered): none

## 2026-06-03 — ingest
- Sync window: `3c7e4ab87871dc1e4781eab87cd8c6b33bfd1c2f` → HEAD (`dd81922dcfa00c53e576154e9d8b847763988482`)
- Changed source files detected: 4
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]], [[wiki/decisions/sprint-4b]], [[wiki/tasks/sprint4b-compact-map-rotation]], [[wiki/tasks/sprint4b-weird-setting-modifier]], [[wiki/tasks/compact-map-click-interaction]]
- Ingested: `ai-agents/tasks/done/s4c-disable-compact-public-maps.md` → created [[wiki/tasks/disable-compact-public-maps]]; updated [[wiki/decisions/sprint-4c]], [[wiki/decisions/sprint-4b]], [[wiki/tasks/sprint4b-compact-map-rotation]], [[wiki/tasks/sprint4b-weird-setting-modifier]], [[wiki/tasks/compact-map-click-interaction]], [[wiki/decisions/cancelled-tasks]], index.md
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4c-disable-compact-public-maps.md`, `ai-agents/tasks/backlog/s5-fix-compact-map-shore-generation.md` — backlog files are not ingested directly by wiki-sync; the completed Sprint 4c mitigation is represented by [[wiki/tasks/disable-compact-public-maps]]

## 2026-06-03 — ingest
- Sync window: `dd81922dcfa00c53e576154e9d8b847763988482` → HEAD (`d075db34fba931851f74a7982fa51f8909b1caf3`)
- Changed source files detected: 3
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]], index.md
- Ingested: `ai-agents/sprints/sprint-backlog.md` → created [[wiki/decisions/sprint-backlog]]; updated [[wiki/decisions/product-strategy]], [[wiki/systems/project-operations]], [[wiki/systems/rendering]], [[wiki/tasks/mobile-quick-wins]], [[wiki/decisions/sprint-4c]], index.md
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/mobile-webgl-rendering.md` — backlog files are not ingested directly by wiki-sync; the deferral is summarized through [[wiki/decisions/sprint-backlog]] and [[wiki/decisions/sprint-4c]]

## 2026-06-04 — ingest
- Sync window: `d075db34fba931851f74a7982fa51f8909b1caf3` → HEAD (`510e9f156df286c7b1b30c550d978de895241a19`)
- Changed source files detected: 8
- Ingested: `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md` → updated [[wiki/systems/telemetry]]
- Ingested: `ai-agents/knowledge-base/telemetry-server-incident-history-2026-06-03.md` → updated [[wiki/systems/telemetry]]
- Ingested: `ai-agents/knowledge-base/lobby-map-fetch-investigation-2026-06-03.md` → created [[wiki/tasks/s4c-investigate-lobby-map-fetch]]; updated [[wiki/systems/telemetry]], [[wiki/decisions/sprint-4c]], index.md
- Ingested: `ai-agents/tasks/done/s4c-investigate-lobby-map-fetch.md` → created/updated [[wiki/tasks/s4c-investigate-lobby-map-fetch]]; updated [[wiki/decisions/sprint-4c]], [[wiki/systems/telemetry]], index.md
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], index.md
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]], index.md
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-investigate-null-id-errors.md`, `ai-agents/tasks/backlog/s4c-enable-client-source-maps.md` — backlog files are not ingested directly by wiki-sync; the null-ID follow-up is summarized through [[wiki/decisions/sprint-4]] and source-map enablement through [[wiki/decisions/sprint-4c]]

## 2026-06-04 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed: index/file coverage, required metadata, wiki-link resolution, backlinks, orphan scan, and local source-path references are clean.

## 2026-06-04 — ingest
- Sync window: `510e9f156df286c7b1b30c550d978de895241a19` → HEAD (`0cf324850b8d1bc0d171b1a2ed05cef764918ddc`)
- Changed source files detected: 1
- Ingested: `ai-agents/tasks/done/s4c-enable-client-source-maps.md` → created [[wiki/tasks/s4c-enable-client-source-maps]]; updated [[wiki/systems/telemetry]], [[wiki/decisions/sprint-4c]], [[wiki/decisions/sprint-4]], index.md
- Skipped (already covered): none

## 2026-06-06 — ingest
- Sync window: `0cf324850b8d1bc0d171b1a2ed05cef764918ddc` → HEAD (`ef4e4666b94b3e5b2dbde896d15fbce6fb793797`)
- Changed source files detected: 8
- Ingested: `ai-agents/tasks/done/hotfix-hf7-build-number.md` → created [[wiki/tasks/build-number-tracking]]; updated [[wiki/decisions/hotfix-post-sprint2]], [[wiki/systems/analytics]], [[wiki/systems/project-operations]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/done/hotfix-post-sprint2.md` → updated [[wiki/decisions/hotfix-post-sprint2]]
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md` → updated [[wiki/systems/analytics]], [[wiki/systems/project-operations]]
- Ingested: `ai-agents/sprints/plan-sprint-4c.md` → updated [[wiki/decisions/sprint-4c]]
- Skipped (already covered): `ai-agents/tasks/cancelled/hf11e-hotfix-build-number-automation.md` → already covered in [[wiki/decisions/cancelled-tasks]]; `ai-agents/tasks/backlog/monitoring-alert-bot-phase1.md`, `ai-agents/tasks/backlog/monitoring-alert-bot-phase2.md` → backlog files are not ingested directly by wiki-sync, summarized through [[wiki/decisions/sprint-backlog]]

## 2026-06-06 — lint
- Issues found: 2
- Issues fixed: 2
- Issues flagged for human review: 0
- Fixed two stale line references in [[wiki/systems/server-performance]] and [[wiki/systems/match-logging]]; structural, index, wikilink, backlink, orphan, source-path, and targeted stale-claim checks passed.

## 2026-06-11 — ingest
- Sync window: `ef4e4666b94b3e5b2dbde896d15fbce6fb793797` → HEAD (`459af8bc7e04daf4713f8983602c90e081122ca4`)
- Changed source files detected: 7
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/tasks/done/s4-feedback-modal-space-key.md` → created [[wiki/tasks/feedback-modal-space-key]]; updated [[wiki/features/feedback-button]], [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-start-screen-redesign-impl.md`, `ai-agents/tasks/backlog/bots-skip-sam-when-nukes-disabled.md`, `ai-agents/tasks/backlog/s4-postgres-backup-routine.md`, `ai-agents/tasks/backlog/worker-init-timeout-map-refetch.md` — backlog files are not ingested directly by wiki-sync; relevant backlog status is summarized through [[wiki/decisions/sprint-backlog]] and [[wiki/decisions/sprint-4]]

## 2026-06-11 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed: index/file coverage, required metadata, wiki-link resolution, backlinks, orphan scan, and source-path references are clean.

## 2026-06-13 — ingest
- Sync window: `459af8bc7e04daf4713f8983602c90e081122ca4` → HEAD (`15a1c0480f4a122a9d2c4f9dfa3941ade4c459f9`)
- Changed source files detected: 11
- Ingested: `ai-agents/tasks/done/s4-app-bootstrap-single-entry-point.md` → created [[wiki/tasks/app-bootstrap-single-entry-point]]; updated [[wiki/systems/flashist-init]], [[wiki/systems/analytics]], [[wiki/systems/localization]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md` → updated [[wiki/tasks/app-bootstrap-single-entry-point]], [[wiki/systems/flashist-init]], [[wiki/systems/analytics]], [[wiki/systems/localization]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]], [[wiki/tasks/analytics-p0-yandex-login-status]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-start-screen-redesign-impl.md` → created [[wiki/tasks/start-screen-redesign-implementation]]; updated [[wiki/decisions/sprint-4]], [[wiki/systems/analytics]], [[wiki/systems/localization]], [[wiki/tasks/start-screen-redesign-investigation]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/fix-fusetag-dead-polling-loop.md`, `ai-agents/tasks/backlog/fix-gutterads-usermeresponse-unsubscribe.md`, `ai-agents/tasks/backlog/s4c-disable-infinite-gold-public-rotation.md` — backlog files are summarized through [[wiki/decisions/sprint-backlog]]; `ai-agents/tasks/backlog/s4-app-bootstrap-single-entry-point.md`, `ai-agents/tasks/backlog/s4-start-screen-redesign-impl.md` — moved to done and represented by [[wiki/tasks/app-bootstrap-single-entry-point]] and [[wiki/tasks/start-screen-redesign-implementation]]

## 2026-06-13 — ingest
- Sync window: `15a1c0480f4a122a9d2c4f9dfa3941ade4c459f9` → HEAD (`7e8556fb839b2d947641b6cf16c1bdff8841910e`)
- Changed source files detected: 13
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-personal-data-compliance-investigation.md`, `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-01-schema-contract.md`, `ai-agents/tasks/backlog/s4-profile-02-guest-localstorage.md`, `ai-agents/tasks/backlog/s4-profile-03-yandex-identity.md`, `ai-agents/tasks/backlog/s4-profile-04-backend-infra.md`, `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md`, `ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md`, `ai-agents/tasks/backlog/s4-profile-07-guest-migration.md`, `ai-agents/tasks/backlog/s4-profile-08-backups.md`, `ai-agents/tasks/backlog/s4-starting-gold-public-modifier.md`, `ai-agents/tasks/backlog/s4-map-population-army-labels.md` — backlog files are not ingested directly by wiki-sync; relevant Sprint 4 backlog status is summarized through [[wiki/decisions/sprint-4]]

## 2026-06-13 — lint
- Issues found: 7
- Issues fixed: 7
- Issues flagged for human review: 0
- Replaced ambiguous basename-only source references with explicit `src/client/...` paths or `resources/maps/*/map4x.bin` compact-map paths; structural metadata, index coverage, wiki-link resolution, backlinks, and source-path existence checks passed.

## 2026-06-13 — lint
- Issues found: 3
- Issues fixed: 3
- Issues flagged for human review: 0
- Normalized two schema metadata values and updated one stale `src/client/LocalServer.ts` line reference; structural metadata, index coverage, wiki-link resolution, backlinks, orphan scan, source-path existence, and targeted line-reference checks passed.

## 2026-06-13 — ingest
- Sync window: `7e8556fb839b2d947641b6cf16c1bdff8841910e` → HEAD (`41dc4624a7c0b4c6552447c4a3604549677d77aa`)
- Changed source files detected: 8
- Ingested: `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md` → updated [[wiki/tasks/player-profile-store-investigation]], [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-01-schema-contract.md`, `ai-agents/tasks/backlog/s4-profile-02-guest-localstorage.md`, `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md`, `ai-agents/tasks/backlog/s4-profile-07-guest-migration.md`, `ai-agents/tasks/backlog/s4-citizenship-earned.md`, `ai-agents/tasks/backlog/s4-yandex-payments-impl.md` — backlog files are not ingested directly by wiki-sync; the profile-store infrastructure supersession is summarized through [[wiki/tasks/player-profile-store-investigation]] and [[wiki/decisions/sprint-4]]

## 2026-06-13 — ingest
- Sync window: `41dc4624a7c0b4c6552447c4a3604549677d77aa` → HEAD (`3c18ec5fe5276fe1843750cd87c53fe2e137cfb5`)
- Changed source files detected: 3
- Ingested: `ai-agents/tasks/done/s4-profile-01-schema-contract.md` → created [[wiki/tasks/profile-schema-contract]], updated [[wiki/decisions/sprint-4]], [[wiki/tasks/player-profile-store-investigation]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — backlog files are not ingested directly by wiki-sync; the implementation status and T1/T2 sequence are summarized through [[wiki/decisions/sprint-4]]

## 2026-06-13 — ingest
- Sync window: `3c18ec5fe5276fe1843750cd87c53fe2e137cfb5` → HEAD (`488d41ddcd1e5caeaa82fe61b715d6517c1e4eb3`)
- Changed source files detected: 6
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/cancelled/s4-profile-02-guest-localstorage.md` → updated [[wiki/decisions/cancelled-tasks]], [[wiki/decisions/sprint-4]], [[wiki/tasks/player-profile-store-investigation]], [[wiki/tasks/profile-schema-contract]]
- Ingested: `ai-agents/tasks/cancelled/s4-profile-07-guest-migration.md` → updated [[wiki/decisions/cancelled-tasks]], [[wiki/decisions/sprint-4]], [[wiki/tasks/profile-schema-contract]]
- Ingested: `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md` → updated [[wiki/decisions/cancelled-tasks]], [[wiki/decisions/sprint-4]], [[wiki/tasks/player-profile-store-investigation]], [[wiki/tasks/profile-schema-contract]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md` — backlog files are not ingested directly by wiki-sync; the T2/T7 cancellation and authenticated-only profile path are summarized through [[wiki/decisions/sprint-4]] and [[wiki/decisions/cancelled-tasks]]

## 2026-06-13 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed: index/file coverage, required metadata, wiki-link resolution, backlinks, orphan scan, source-path references, and sampled line-reference checks are clean.

## 2026-06-13 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed: index/file coverage, required metadata, wiki-link resolution, backlinks, orphan scan, source-path references, filename-style line references, and existing lint-warning scan are clean.

## 2026-06-19 — ingest
- Sync window: `488d41ddcd1e5caeaa82fe61b715d6517c1e4eb3` → HEAD (`eef55e506f7437fd2727f151cf2c7f26bbe187c6`)
- Changed source files detected: 18
- Ingested: `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md` → created [[wiki/decisions/profile-deploy-hardening-review-loop]]; updated [[wiki/decisions/sprint-4]], [[wiki/systems/producer-workflow]], [[wiki/decisions/vps-credential-leak-response]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/tasks/done/s4-profile-03-yandex-identity.md` → created [[wiki/tasks/yandex-identity-plumbing]]; updated [[wiki/decisions/sprint-4]], [[wiki/tasks/player-profile-store-investigation]], [[wiki/tasks/yandex-payments-investigation]], [[wiki/systems/flashist-init]], [[wiki/systems/networking]]
- Skipped (not ingest-worthy): 13 changed files under `ai-agents/tasks/backlog/` — backlog tasks are not ingested directly; current Sprint 4 and no-sprint status was summarized through the changed sprint sources
- Skipped (no longer a completed source): `ai-agents/tasks/done/s4-profile-04-backend-infra.md` — the monolithic T4 task was moved back to backlog and split into T4a–T4g; represented through [[wiki/decisions/sprint-4]] and [[wiki/decisions/profile-deploy-hardening-review-loop]]

## 2026-06-19 — ingest
- Sync window: `eef55e506f7437fd2727f151cf2c7f26bbe187c6` → HEAD (`aa7e165a0b008f4bacf6e796c3d18c68a08b6f55`)
- Changed source files detected: 6
- Ingested: `ai-agents/tasks/done/s4-profile-04a-server-skeleton.md` → created [[wiki/tasks/profile-server-skeleton]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]]
- Ingested: `ai-agents/tasks/done/s4-profile-04b-client-api-url-config.md` → created [[wiki/tasks/profile-api-url-config]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/systems/configuration]]
- Ingested: `ai-agents/tasks/done/s4-profile-04c-dockerfile.md` → created [[wiki/tasks/profile-docker-image]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/repo-build-context-hardening]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-04h-game-server-deploy-env.md`, `ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md` — backlog files are not ingested directly by wiki-sync

## 2026-06-20 — ingest
- Sync window: `aa7e165a0b008f4bacf6e796c3d18c68a08b6f55` → HEAD (`6a03a8533c5d0d46e16345e79dabb4058f6c83e2`)
- Changed source files detected: 11
- Ingested: `ai-agents/knowledge-base/s4-profile-04d-ru-residency-review-finding-2026-06-20.md` → created [[wiki/tasks/profile-vps-provisioning]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/player-profile-store-investigation]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04d-vps-provisioning.md` → created [[wiki/tasks/profile-vps-provisioning]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/player-profile-store-investigation]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/defense-post-range-always-visible.md`, `ai-agents/tasks/backlog/infinite-gold-force-no-nukes-public-rotation.md`, `ai-agents/tasks/backlog/s4-profile-04e-deploy-mechanics.md`, `ai-agents/tasks/backlog/s4-profile-04e1-build-push-digest.md`, `ai-agents/tasks/backlog/s4-profile-04e2-onbox-stack-gate.md`, `ai-agents/tasks/backlog/s4-profile-04e3-deploy-wiring-milestone.md`, `ai-agents/tasks/backlog/s4-starting-gold-public-modifier.md` — backlog files are not ingested directly; changed sprint sources summarize the applicable roadmap updates

## 2026-06-20 — lint
- Issues found: 7
- Issues fixed: 7
- Issues flagged for human review: 0
- Corrected stale bootstrap/session, AI execution, spawn-camera, Sprint 4c backlog, and telemetry-priority claims; index coverage, structure, source paths, wiki-links, backlinks, and line references otherwise passed.

## 2026-06-21 — ingest
- Sync window: `6a03a8533c5d0d46e16345e79dabb4058f6c83e2` → HEAD (`eec3f71c6366318bacbc1ef663b176d17abf02a4`)
- Changed source files detected: 4
- Ingested: `ai-agents/tasks/done/s4-profile-04e1-build-push-digest.md` → created [[wiki/tasks/profile-build-push-digest]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/profile-docker-image]], [[wiki/tasks/profile-vps-provisioning]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/reviews/README.md`, `ai-agents/reviews/s4-profile-04e1-coder-handoff.md`, `ai-agents/reviews/s4-profile-04e1.md` — review artifacts are outside the wiki-sync eligible source set

## 2026-06-21 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed across all 104 indexed pages: index/file coverage, required structure and metadata, source paths, wiki-link resolution, backlinks, and orphan detection are clean.

## 2026-06-23 — ingest
- Sync window: `eec3f71c6366318bacbc1ef663b176d17abf02a4` → HEAD (`cd0c1b36bae7f7c88a5f7a7aa958144d45633741`)
- Changed source files detected: 18
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04e2-onbox-stack-gate.md` → created [[wiki/tasks/profile-onbox-stack-gate]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/profile-build-push-digest]], [[wiki/tasks/profile-vps-provisioning]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04e3-deploy-wiring-milestone.md` → created [[wiki/tasks/profile-deploy-wiring]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/profile-build-push-digest]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04f-image-secret-scan.md` → created [[wiki/tasks/profile-image-secret-scan]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/decisions/vps-credential-leak-response]], [[wiki/tasks/profile-docker-image]], [[wiki/tasks/profile-build-push-digest]], [[wiki/tasks/docker-secret-boundary-check]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04i-server-bring-up-runbook.md` → created [[wiki/tasks/profile-server-bring-up-runbook]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/profile-build-push-digest]], [[wiki/tasks/profile-vps-provisioning]], [[wiki/tasks/profile-image-secret-scan]], `wiki-vault/index.md`
- Skipped (already covered): `ai-agents/tasks/done/s4-profile-04e-deploy-mechanics.md` — broad T4e brief is represented by split pages [[wiki/tasks/profile-build-push-digest]], [[wiki/tasks/profile-onbox-stack-gate]], and [[wiki/tasks/profile-deploy-wiring]]
- Skipped (not ingest-worthy): `ai-agents/reviews/s4-profile-04e2.md`, `ai-agents/reviews/s4-profile-04e2-coder-handoff.md`, `ai-agents/reviews/s4-profile-04e3.md`, `ai-agents/reviews/s4-profile-04e3-coder-handoff.md`, `ai-agents/reviews/s4-profile-04f.md`, `ai-agents/reviews/s4-profile-04f-coder-handoff.md`, `ai-agents/reviews/s4-profile-04i.md`, `ai-agents/tasks/backlog/s4-feedback-remove-contact-field.md`, `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-04g-argv-concurrency-hardening.md`, `ai-agents/tasks/backlog/s4-profile-04i-server-bring-up-runbook.md`, `ai-agents/tasks/backlog/sec12-vps-registry-credential-hygiene.md` — review artifacts and backlog files are not ingested directly by wiki-sync; relevant status is summarized through [[wiki/decisions/sprint-4]]

## 2026-06-28 — ingest
- Sync window: `cd0c1b36bae7f7c88a5f7a7aa958144d45633741` → HEAD (`6a0cc36ac09715d46d848fc393c5ad7fbb6ddc84`)
- Changed source files detected: 24
- Ingested: `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` → created [[wiki/systems/player-infrastructure]]; updated [[wiki/systems/clans]], [[wiki/tasks/player-profile-store-investigation]], [[wiki/tasks/yandex-identity-plumbing]], `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` → created [[wiki/systems/player-profile-store]]; updated [[wiki/decisions/sprint-4]], [[wiki/tasks/player-profile-store-investigation]], `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/personal-data-152fz-findings.md` → created [[wiki/decisions/personal-data-152fz-compliance]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], [[wiki/decisions/cancelled-tasks]], [[wiki/systems/project-operations]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md` → updated [[wiki/decisions/cancelled-tasks]], [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/s4-personal-data-compliance-investigation.md` → created [[wiki/tasks/personal-data-compliance-investigation]]; updated [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04g-argv-concurrency-hardening.md` → created [[wiki/tasks/profile-deploy-hardening]]; updated [[wiki/decisions/profile-deploy-hardening-review-loop]], [[wiki/tasks/profile-deploy-wiring]], [[wiki/tasks/profile-image-secret-scan]], [[wiki/tasks/profile-server-bring-up-runbook]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-04h-game-server-deploy-env.md` → created [[wiki/tasks/profile-game-server-deploy-env]]; updated [[wiki/systems/configuration]], [[wiki/tasks/profile-api-url-config]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-05-backend-db-api.md` → created [[wiki/tasks/profile-backend-db-api]]; updated [[wiki/decisions/profile-storage-strategy]], [[wiki/tasks/profile-schema-contract]], `wiki-vault/index.md`
- Skipped (already covered): `ai-agents/tasks/done/s4-profile-01-schema-contract.md` — existing [[wiki/tasks/profile-schema-contract]] already captured the T1 outcome; only backlinks were updated while ingesting T5
- Skipped (not ingest-worthy): `ai-agents/reviews/s4-profile-04g.md`, `ai-agents/reviews/s4-profile-05-backend-db-api-coder-handoff.md`, `ai-agents/reviews/s4-profile-05-backend-db-api.md`, `ai-agents/reviews/s4-profile-hash-player-ids-coder-handoff.md`, `ai-agents/reviews/s4-profile-hash-player-ids.md`, `ai-agents/tasks/backlog/compliance-152fz-notification-consent.md`, `ai-agents/tasks/backlog/s4-archive-s3-backed-citizen-gated.md`, `ai-agents/tasks/backlog/s4-citizenship-earned.md`, `ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md`, `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md`, `ai-agents/tasks/backlog/s4-profile-hash-player-ids.md`, `ai-agents/tasks/backlog/s4-yandex-payments-impl.md`, `ai-agents/tasks/backlog/sec13-deploy-transport-secret-hygiene.md` — review artifacts and backlog files are not ingested directly; changed sprint and decision pages summarize applicable state
- Skipped (no longer exists at HEAD): `ai-agents/tasks/done/s4-profile-hash-player-ids.md` — represented by cancelled source `ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md` and [[wiki/decisions/cancelled-tasks]]

## 2026-06-29 — ingest
- Sync window: `6a0cc36ac09715d46d848fc393c5ad7fbb6ddc84` -> HEAD (`09ebcc4cf9a7146488aed5c4cc68f45c71df2658`)
- Changed source files detected: 5
- Ingested: `ai-agents/sprints/plan-sprint-4.md` -> updated [[wiki/decisions/sprint-4]], [[wiki/systems/player-profile-store]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-profile-06-match-end-crediting.md` -> created [[wiki/tasks/profile-match-end-crediting]]; updated [[wiki/decisions/sprint-4]], [[wiki/systems/player-profile-store]], [[wiki/tasks/profile-backend-db-api]], [[wiki/tasks/profile-game-server-deploy-env]], [[wiki/tasks/yandex-identity-plumbing]], [[wiki/systems/player-infrastructure]], [[wiki/systems/networking]], [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/tasks/yandex-payments-investigation]], `wiki-vault/index.md`
- Skipped (already covered): `ai-agents/tasks/done/s4-profile-04-backend-infra.md` — 100% rename from backlog to done; T4 outcome is represented by the split T4a-T4i pages and [[wiki/decisions/sprint-4]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/reviews/s4-profile-06-match-end-crediting.md` — backlog and review artifacts are outside the wiki-sync eligible source set; relevant status is summarized through [[wiki/decisions/sprint-4]]

## 2026-06-29 — ingest
- Sync window: `09ebcc4cf9a7146488aed5c4cc68f45c71df2658` → HEAD (`ac4d48296cc5bd24ca1186b5568629b2e88d55b0`)
- Changed source files detected: 4
- Ingested: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` → updated [[wiki/systems/player-profile-store]]
- Ingested: `ai-agents/tasks/done/s4-profile-04i-server-bring-up-runbook.md` → updated [[wiki/tasks/profile-server-bring-up-runbook]]
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`, `ai-agents/tasks/backlog/s4-postgres-backup-routine.md` — backlog files are not ingested directly by wiki-sync; their resolved T8 backup-track status was captured through the changed knowledge-base and completed T4i sources

## 2026-07-02 — ingest
- Sync window: `ac4d48296cc5bd24ca1186b5568629b2e88d55b0` → HEAD (`4219b02933be37493c1c3e405cf52bf34d444ba5`)
- Changed source files detected: 11
- Ingested: `ai-agents/knowledge-base/profile-backup-restore-runbook.md` → created/updated [[wiki/tasks/postgres-backup-routine]], updated [[wiki/systems/player-profile-store]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-citizenship-xp-progress-ui.md` → created [[wiki/tasks/citizenship-xp-progress-ui]], updated [[wiki/decisions/sprint-4]], [[wiki/systems/player-profile-store]], [[wiki/tasks/start-screen-redesign-implementation]], `wiki-vault/index.md`
- Ingested: `ai-agents/tasks/done/s4-postgres-backup-routine.md` → created [[wiki/tasks/postgres-backup-routine]], updated [[wiki/decisions/sprint-4]], [[wiki/systems/player-profile-store]], [[wiki/tasks/profile-server-bring-up-runbook]], [[wiki/decisions/vps-credential-leak-response]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/reviews/s4-citizenship-xp-progress-ui-coder-handoff.md`, `ai-agents/reviews/s4-citizenship-xp-progress-ui.md`, `ai-agents/reviews/s4-postgres-backup-routine-coder-handoff.md`, `ai-agents/reviews/s4-postgres-backup-routine.md`, `ai-agents/tasks/backlog/monitoring-alert-bot-phase2.md`, `ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md`, `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — review artifacts and backlog files are outside the wiki-sync eligible source set; applicable status is summarized through completed task pages and [[wiki/decisions/sprint-4]]

## 2026-07-02 — lint
- Issues found: 1
- Issues fixed: 1
- Issues flagged for human review: 0
- Fixed a stale T6 profile-crediting outcome that still described T8 backups as pending; full structural, wikilink/backlink, index coverage, orphan, and source-metadata checks pass across 119 indexed pages.

## 2026-07-02 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed across all 119 indexed pages: index/file coverage, required metadata and sections, wiki-link resolution, backlinks, orphan detection, and backticked source-path freshness are clean.

## 2026-07-02 — ingest
- Sync window: `4219b02933be37493c1c3e405cf52bf34d444ba5` → HEAD (`2715f4b411447f110c80b1bcc5ef92cb6392e2a1`)
- Changed source files detected: 4
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/tasks/start-screen-redesign-implementation]], [[wiki/tasks/app-bootstrap-single-entry-point]], [[wiki/systems/flashist-init]], `wiki-vault/index.md`
- Ingested: `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/tasks/done/s4-citizenship-card-guest-cta-no-sdk.md` → created [[wiki/tasks/citizenship-card-guest-cta-no-sdk]], updated [[wiki/decisions/sprint-4]], [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/tasks/start-screen-redesign-implementation]], [[wiki/tasks/app-bootstrap-single-entry-point]], [[wiki/systems/flashist-init]], `wiki-vault/index.md`
- Skipped (not ingest-worthy): `ai-agents/tasks/backlog/degraded-mode-full-ux-treatment.md` — backlog files are not ingested directly; its Sprint 4 blocker status is summarized through [[wiki/decisions/sprint-4]] and [[wiki/decisions/sprint-backlog]]

## 2026-07-03 — lint
- Issues found: 0
- Issues fixed: 0
- Issues flagged for human review: 0
- Full wiki health-check passed across all 120 indexed pages: index/file coverage, required metadata and sections, wiki-link resolution, backlinks, orphan detection, and backticked source-path freshness are clean.

## 2026-08-08 — ingest
- Sync window: `2715f4b411447f110c80b1bcc5ef92cb6392e2a1` → HEAD (`c8a204110d2d121374e0c39b2f2d9be6e89a5604`), plus the uncommitted working-tree additions under `ai-agents/` present on 2026-08-08
- Changed source files detected: 34 (14 committed since the watermark + 20 uncommitted/untracked)
- Ingested: `ai-agents/knowledge-base/PROJECT.md` → created [[wiki/systems/project-brief]]; updated `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/architecture.md` → created [[wiki/systems/architecture-overview]]; updated [[wiki/systems/game-overview]], [[wiki/systems/rendering]], `wiki-vault/schema.md`, `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/conventions/` (README + 7 conventions) → created [[wiki/systems/agent-conventions]]; updated [[wiki/systems/producer-workflow]], [[wiki/systems/project-operations]], [[wiki/decisions/sprint-backlog]], `wiki-vault/index.md`
- Ingested: `ai-agents/knowledge-base/decisions/README.md` → created [[wiki/decisions/adr-numbering-two-series]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md` → created [[wiki/decisions/adr-101-fail-soft-xp-crediting]]; updated [[wiki/systems/player-profile-store]], [[wiki/tasks/profile-match-end-crediting]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-102-privilege-refresher-fails-open.md` → created [[wiki/decisions/adr-102-privilege-refresher-fails-open]]; updated [[wiki/systems/networking]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md` → created [[wiki/decisions/adr-103-identity-trust-seam]]; updated [[wiki/systems/player-profile-store]], [[wiki/tasks/yandex-identity-plumbing]], [[wiki/tasks/profile-match-end-crediting]], [[wiki/decisions/personal-data-152fz-compliance]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-104-match-archiving-disabled-until-s3-citizen-gated.md` → created [[wiki/decisions/adr-104-archiving-disabled]]; updated [[wiki/decisions/archive-archival-strategy]], [[wiki/tasks/archive-endpoint-failures]], [[wiki/systems/match-logging]], [[wiki/systems/telemetry]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-105-compact-maps-out-of-public-rotation.md` → created [[wiki/decisions/adr-105-compact-maps-out-of-rotation]]; updated [[wiki/tasks/disable-compact-public-maps]], [[wiki/tasks/compact-map-click-interaction]], [[wiki/tasks/sprint4b-compact-map-rotation]], [[wiki/tasks/sprint4b-mini-mode-investigation]], [[wiki/decisions/cancelled-tasks]], [[wiki/decisions/sprint-5]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-106-country-flags-suppressed-parse-then-drop.md` → created [[wiki/decisions/adr-106-flags-suppressed]]; updated [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/systems/player-infrastructure]]
- Ingested: `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md` → created [[wiki/decisions/adr-107-turn-interval-1-5x]]; updated [[wiki/systems/game-loop]], [[wiki/systems/server-performance]], [[wiki/systems/telemetry]], [[wiki/systems/game-overview]], [[wiki/features/tutorial]]
- Ingested: `ai-agents/knowledge-base/fkit-transfer-blueprint.md` + `ai-agents/ai-agents.yml` → created [[wiki/decisions/fkit-transfer-blueprint]]; updated [[wiki/systems/producer-workflow]], [[wiki/systems/project-operations]], [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] with the second unsprinted board, its unranked-by-design rule, and tasks 0001–0004 in dependency order
- Stale claim corrected: `wiki-vault/schema.md` and [[wiki/systems/game-overview]] named **Pixi.js** as the renderer — corrected to Canvas 2D with one composited Pixi/WebGL layer, and "~40 layers" corrected to 32 + a conditional tutorial layer; [[wiki/systems/rendering]] gained the same explicit statement
- Stale claim corrected: [[wiki/systems/game-overview]] said "18 unit types" — the enum has 17
- Stale metadata corrected: [[wiki/decisions/sprint-4]] `Status: proposed` → `accepted` (it describes a live, mostly-shipped sprint), and its "temporarily paused during the May 15 – June 1 travel window" recast as past
- Stale metadata corrected: [[wiki/decisions/product-strategy]] marked Sprint 3 "(current)" → Sprint 4 is current; the March 2026 analytics block is now dated and carries a do-not-quote-as-current warning; travel-pause prose recast as past
- Stale metadata corrected: [[wiki/systems/project-operations]] referred to the May 15 travel pause as a live constraint — recast as history with an explicit "long past" flag
- Skipped (no content change): `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md`, `monitoring-alert-bot-findings-2026-06-04.md`, `sprint4b-mini-mode-findings.md`, `telemetry-server-incident-history-2026-06-03.md`, `ai-agents/tasks/done/sec00-incident-index.md`, `ai-agents/tasks/done/sec07-postmortem-wiki-and-follow-ups.md`, `ai-agents/tasks/backlog/monitoring-alert-bot-phase1.md`, `monitoring-alert-bot-phase2.md` — commit `418b4a9` changed only the `karpathy-vault` → `ai-agents/wiki-vault` path string in each; no new synthesized knowledge
- Skipped (superseded by rename): `ai-agents/knowledge-base/ai-agents-kit-transfer-blueprint.md` — renamed to `fkit-transfer-blueprint.md`, ingested under the new name
- Skipped (not ingest-worthy): `ai-agents/reviews/degraded-mode-full-ux-treatment.md`, `degraded-mode-full-ux-treatment-coder-handoff.md`, `s4-citizenship-card-guest-cta-no-sdk.md` — review artifacts are outside the eligible source set
- Skipped (backlog briefs, per procedure): `ai-agents/tasks/backlog/0001-…/brief.md` through `0004-…/brief.md` — a task is not paged until done or cancelled; all four are summarized on [[wiki/decisions/sprint-backlog]] instead
- Skipped (scaffolding, no synthesized knowledge): `ai-agents/README.md`, `ai-agents/tasks/README.md`, and the four `.gitkeep` files under `knowledge-base/{decisions,history,incidents,reports}/`
- Flagged for human review: pre-existing [[wiki/systems/telemetry]] carries the telemetry dashboard URL in its monitoring-gap section; out of this sync's scope, reported to the caller rather than edited
- Targeted lint on the changed pages: 132 pages, 0 broken wiki-links, 0 pages missing from the index, 0 stale index entries, 2 one-way links found and fixed

## 2026-08-09 — ingest

- Sync window: `c8a204110d2d121374e0c39b2f2d9be6e89a5604` → HEAD (`c8a204110d2d121374e0c39b2f2d9be6e89a5604`) — **the same SHA**.
- ⚠️ **The watermark alone does NOT represent this sync.** The watermark already equalled HEAD from the 2026-08-08 sync, so `git log <sha>..HEAD` returned nothing. Every source in this delta is **uncommitted working-tree state** dated 2026-08-09 — revised ADRs, seven new task briefs, a new backlog board, and corrections to `PROJECT.md`, `architecture.md`, and `plan-sprint-6.md`. The delta was supplied explicitly by the caller and verified against the files on disk. **A future sync resuming from this watermark will re-detect all of it once it is committed** — that is expected and harmless (re-ingest is idempotent), but nobody should read the unchanged watermark as evidence the vault is behind.
- Changed source files detected: 14 (all uncommitted).
- Ingested: `ai-agents/knowledge-base/decisions/adr-102-privilege-refresher-fails-open.md` → updated [[wiki/decisions/adr-102-privilege-refresher-fails-open]] — `proposed` → `accepted`; the three same-day trigger rulings preserved as a progression table (wide → narrow → wide) with the "why the narrow reading failed" lesson; upstream-API dependency section added; coin-chain residual recorded as downgraded, not deleted; closeout shield made conditional. Also updated [[wiki/decisions/adr-103-identity-trust-seam]], [[wiki/decisions/adr-106-flags-suppressed]], [[wiki/decisions/sprint-5]], [[wiki/decisions/sprint-6]], `index.md`
- Ingested: `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md` → updated [[wiki/decisions/adr-107-turn-interval-1-5x]] — the "selection rationale is unrecorded" warning replaced by the owner's 2026-08-09 statement (two goals; 1.5 by playtesting; 2× tried and rejected), with "playtesting is not measurement" kept explicit; Options rebuilt with `[owner]` attributions; slow-turn blind band linked to task `0006`
- Ingested: `ai-agents/knowledge-base/decisions/README.md` → updated [[wiki/decisions/adr-numbering-two-series]] — immutability-starts-at-`accepted` rule, the clarifications-only carve-out, the reversal-needs-a-superseding-ADR rule, and ADR-102 recorded as the one non-precedent exception
- Ingested: `ai-agents/knowledge-base/architecture.md` (§11 R5, §13 open question 6) → updated [[wiki/systems/architecture-overview]] — R5 rewritten with the conditional acceptance, the expiry trigger, the accepted alerting gap, and the `0009` dependency; open-questions block now records Q6 answered, Q1 partly answered, and which questions produced briefs
- Ingested: `ai-agents/knowledge-base/PROJECT.md` → updated [[wiki/systems/project-brief]] — new "Standing rulings — do not clean these up" section (dormant non-Yandex web build, intentionally half-present `staging`, upstream API to be self-hosted) and the ADR-numbering band rule as a working rule
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] — board table extended from four to eleven rows with per-task blocked reasons, one-line summaries of `0005`–`0011`, the cosmetics-chain dependency diagram, and the unranked-by-design/pull-`0009`-first ruling
- Ingested: `ai-agents/sprints/plan-sprint-6.md` → updated [[wiki/decisions/sprint-6]] — the "Sprint 5 cosmetics store" dependency corrected in all three places it appeared (context, key decisions, consequences); real prerequisites recorded as Tasks 9/9a plus the upstream entitlement-origin question
- Skipped (backlog briefs, per procedure — unchanged rule, applied consistently): `ai-agents/tasks/backlog/0005-…/brief.md` through `0011-…/brief.md` — a task is not paged until done or cancelled. Same call as `0001`–`0004` on 2026-08-08; no owner ruling has overridden it. All seven are summarized on [[wiki/decisions/sprint-backlog]] instead.
- Skipped (working artifacts, per procedure): the `plan.md` / `worklog.md` / `review.md` siblings inside the `0005`–`0011` task folders
- ⚠️ Flagged for human review, not fixed: [[wiki/systems/player-infrastructure]] states the inherited "Stripe/Fuse/**flares** paths are dead". The flares path is **live** — `src/server/Worker.ts:377` sources `flares` from the upstream OpenFront user API, and `src/client/GutterAds.ts:35` suppresses ads for any player holding a `pattern:` flare. Contradicts `architecture.md` §11 R5; left alone per the caller's flag-don't-fix instruction.
- ⚠️ Flagged, unchanged from 2026-08-08: [[wiki/systems/telemetry]] still carries the telemetry dashboard URL in its monitoring-gap section. Out of this sync's scope.
- Targeted lint on the ten changed pages: 132 pages, 0 broken wiki-links, 0 pages missing from the index, 0 one-way links (all backlinks added at write time)

## 2026-08-09 — ingest

- Scope: targeted correction supplied by the caller (fkit-producer), resolving the ⚠️ flag raised by this same day's earlier sync. Source is **direct code verification**, not a knowledge-base document.
- Ingested: `src/server/Worker.ts:377`, `src/core/ApiSchemas.ts:53`, `src/server/Privilege.ts:16`, `src/client/GutterAds.ts:35` (all re-read and confirmed on disk before writing) → updated [[wiki/systems/player-infrastructure]] — the single "Stripe/Fuse/flares paths are dead" bullet **split in two**. Stripe and Fuse keep their original June-2026 audit wording and provenance, explicitly marked as **not re-verified** by this correction. A new **Flares** bullet records the path as live, sourced from the **upstream OpenFront user API** (not Geoconflict's profile server, not Yandex), consumed by `PrivilegeChecker.isAllowed()` to gate patterns/colours/flag layers, with gutter-ad suppression coupled to `pattern:` flares.
- Two consequences added so the page agrees with the rest of the vault rather than contradicting it: (1) ad revenue is **already** coupled to cosmetic entitlements; (2) task `0009` is the findings phase for moving the entitlement source in-house.
- ⚠️ **Liveness distinction kept explicit on the page:** the *code path* is live and reachable; whether **production** calls that upstream service is **unverified and asserted neither way** — task `0009` determines it, and the 152-ФЗ angle is recorded as a question, not an accusation.
- Cross-links added, bidirectionally: [[wiki/systems/player-infrastructure]] ↔ [[wiki/decisions/adr-102-privilege-refresher-fails-open]], [[wiki/systems/player-infrastructure]] ↔ [[wiki/systems/architecture-overview]] (risk **R5**), and [[wiki/systems/player-infrastructure]] ↔ [[wiki/decisions/sprint-backlog]] (task `0009`).
- `index.md`: the [[wiki/systems/player-infrastructure]] line rewritten — "dead inherited auth/monetization" narrowed to "dead inherited Stripe/Fuse monetization", flares recorded as live and upstream-sourced with the unverified-production caveat.
- ⚠️ Flagged for human review, **not** fixed (out of this correction's scope, reported to the caller): two adjacent claims on the same page sit in tension with the corrected flares finding and were left exactly as written — (a) the Architecture bullet's "the inherited Discord/email/JWT account system is effectively dead in production", when `flares` arrive via `getUserMe(clientMsg.token, config)` on that same upstream account API; (b) the Cosmetics bullet's "purchase and account entitlement flows inherited from OpenFront are dead in the Yandex build", where the *entitlement-checking* half of that sentence is now known live even though the *purchase* half is not disputed. Both hinge on the same unverified production-liveness question that task `0009` owns.
- ⚠️ Flagged, unchanged and still open from the two prior runs: [[wiki/systems/telemetry]] carries the telemetry dashboard URL in its monitoring-gap section. Out of scope here.
- No new pages created. Pages updated: 5 (`player-infrastructure`, `adr-102-privilege-refresher-fails-open`, `architecture-overview`, `sprint-backlog`, `index.md`).

## 2026-08-21 — ingest

- Scope: the five Sprint 4 task folders closed by the 2026-08-14 sprint-ship-loop run, supplied explicitly by the caller (fkit-lead). All five closed with the `(agent-closed — not owner-verified)` marker — carried onto every page and into the index/sprint-4 entries. Context read per procedure: each folder's `plan.md` / `worklog.md` / `review.md` (0049 has no `review.md` by owner ruling — review of record is the pre-fkit ledger in `ai-agents/reviews/`; 0019 additionally has `live-verification-checklist.md`).
- Ingested: `ai-agents/tasks/done/0019-yandex-payments-impl/brief.md` → created [[wiki/tasks/yandex-payments-implementation]] — catalog cache in the boot batch, profile-server `POST /v1/payments/yandex/{intent,complete,reconcile}`, HMAC verifier (dual-construction until the first live payload), migration 002, sole-authority paid-flags rule, owner rulings (profile-server placement, infra-only/no CTA, deferred live verifications), and the owner-ruled residuals. No secrets: `YANDEX_PAYMENTS_SECRET` referenced as a mechanism (env var name already in repo docs), no values, no endpoints beyond what repo docs carry.
- Ingested: `ai-agents/tasks/done/0041-map-population-army-labels/brief.md` → created [[wiki/tasks/map-troops-labels]] — troops `current / max` + red attacking-troops line in `NameLayer`, the R1 nowrap fix, and the honest coverage gaps (singleplayer-only live validation; zero-troop and dark-terrain cases not shown; pre-existing 360×430 density left to the owner).
- Ingested: `ai-agents/tasks/done/0042-starting-gold-public-modifier/brief.md` → created [[wiki/tasks/starting-gold-public-modifier]] — new `startGold` GameConfig field across schema/literals, fifth weird sub-option, badge/localization, and the residuals (owner-side live check, deploy-window desync-kick, R1 partial-PUT dead guard, R2 pre-existing RNG seam).
- Ingested: `ai-agents/tasks/done/0046-feedback-remove-contact-field/brief.md` → created [[wiki/tasks/feedback-remove-contact-field]] — end-to-end 152-ФЗ removal, Zod strip of stale-client payloads, zero review findings, live checks still owner-side, and the carried owner flag that the email-subscribe modal is the larger remaining PII surface.
- Ingested: `ai-agents/tasks/done/0049-degraded-mode-full-ux-treatment/brief.md` → created [[wiki/tasks/degraded-mode-ux-treatment]] — `isYandexDegraded()` + distinct card state, live simulation of cases (c) and (a), case (b) explicitly NOT live-verified (unit tests only), analytics pull deferred post-close, no-fresh-review-round ruling recorded.
- Updated for content (not just links): [[wiki/features/feedback-button]] (contact field removed from Form/Implementation, removal note added), [[wiki/tasks/yandex-payments-investigation]] (implementation-shipped note), [[wiki/tasks/citizenship-card-guest-cta-no-sdk]] (degraded-mode follow-up shipped), [[wiki/systems/flashist-init]] (initPayments in the boot batch; degraded-mode gotcha resolved into `isYandexDegraded()`), [[wiki/systems/player-profile-store]] (payments endpoints bullet, paid-verification gotcha updated), [[wiki/tasks/sprint4b-weird-setting-modifier]] (four → five sub-options, ~4% each), [[wiki/decisions/sprint-4]] (five table rows to done-with-caveat, three stale consequences rewritten, five Related links).
- Updated for backlinks only: [[wiki/systems/rendering]], [[wiki/decisions/adr-103-identity-trust-seam]], [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/tasks/email-subscribe-modal]], [[wiki/tasks/citizenship-xp-progress-ui]].
- `index.md`: five new task lines added; the [[wiki/decisions/sprint-4]] line rewritten to reflect the 2026-08-14 closes with the agent-closed caveat.
- Skipped (working artifacts, per procedure — read as context only, not paged): the `plan.md` / `worklog.md` / `review.md` / `live-verification-checklist.md` / `evidence/` siblings in all five folders.
- Targeted lint on the new pages: all wiki-links resolve, all backlinks present, all five pages indexed.

## 2026-08-23 — ingest
- Sync window: `c8a204110d2d121374e0c39b2f2d9be6e89a5604` → HEAD (`14613bb971edc085ee7bd4f1da05b0096c3c4673`)
- Changed source files detected: 180+ paths under `ai-agents/` across 16 commits — the FKIT-migration commits (`8a86ee5`, `52a7340`, `6462e59`) re-committed working-tree state the 2026-08-08/09 syncs and the 2026-08-21 targeted ingest had already ingested, plus ID-renumbering path churn; the substantive delta reduced to the files below.
- Ingested: `ai-agents/tasks/done/0054-hide-citizenship-card-behind-client-flag/brief.md` → created [[wiki/tasks/hide-citizenship-card-flag]]; updated [[wiki/tasks/degraded-mode-ux-treatment]], [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/tasks/citizenship-card-guest-cta-no-sdk]], [[wiki/systems/flashist-init]], [[wiki/systems/analytics]], [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/tasks/done/0055-master-parseable-lobbies-body-and-worker-exit-diagnostics/brief.md` → created [[wiki/tasks/master-lobbies-worker-exit-diagnostics]]; updated [[wiki/systems/networking]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]]
- Ingested: `ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md` (created `419a116`, amended `201872a`) → created [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]]; updated [[wiki/systems/networking]], [[wiki/systems/player-profile-store]], [[wiki/decisions/adr-101-fail-soft-xp-crediting]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` (post-2026-08-21 changes: `e4f01e6`, `419a116`, `201872a`) → updated [[wiki/decisions/sprint-4]] — 0017/0018 blockers rewritten to the verified `0062` gate, 0054/0055 done rows, outage-track and promoted config-drift rows (0056/0057/0060/0062/0063)
- Ingested: `ai-agents/sprints/backlog.md` (`419a116`, `201872a`, `6462e59`) → updated [[wiki/decisions/sprint-backlog]] — board-evolution note: folder-migration ID map, 0043–0048 scoping, 0048 email-subscribe fold-in (owner-ruled 2026-08-21), heal tasks 0050–0053, outage follow-ups 0058/0059/0061/0064, 0057/0062 promotions, misroute re-estimate under 18/20 quorum
- Ingested: `ai-agents/tasks/backlog/0048-compliance-152fz-notification-consent/brief.md` scope addition (`b7760ff`; summarized via decision/board pages, not paged — backlog rule) → updated [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/tasks/feedback-remove-contact-field]] (owner flag marked resolved)
- Ingested: `ai-agents/knowledge-base/conventions/task-id-allocation.md` (new) + `conventions/README.md` + `task-status-vocabulary.md` clarification → updated [[wiki/systems/agent-conventions]] (seven → eight conventions; Moved-to sprint-identity caveat)
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` (`0beb899`) → updated [[wiki/systems/analytics]] — `UI:Tap:PurchaseCitizenship` registered by 0019, fires only once 0018 wires the button; flag-off surface-event suppression noted
- Skipped (backlog briefs, per procedure): `0017`/`0018` flip-ON coupling notes (`e4f01e6`) — recorded on [[wiki/tasks/hide-citizenship-card-flag]] and [[wiki/decisions/sprint-4]] instead; `0056`–`0064` briefs — summarized on the sprint-4/sprint-backlog pages
- Skipped (path-string ID-renumbering churn only, no new knowledge): `personal-data-152fz-findings.md`, `sprint4-player-profile-store-findings.md`, `geoconflict-producer-knowledge-base.md`, `s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`, `security-vps-credential-leak-postmortem.md`, `announcements-system-guide.md`, `profile-backup-restore-runbook.md`, `architecture.md`, ADR-104/105, the four `ai-agents/tasks/cancelled/s4-*.md` files, `sprints/done/plan-sprint-4b.md`, `sprints/sprint-backlog.md`
- Skipped (shape-only reconciliation, task `0004` scope — no new synthesized knowledge): `plan-sprint-4c.md`, `plan-sprint-5.md` status tables; `plan-sprint-6.md` change was the Sprint-5-cosmetics-store correction already ingested 2026-08-09
- Skipped (not ingest-worthy per procedure): `ai-agents/reviews/*` (review artifacts), `ai-agents/knowledge-base/reports/fkit-dashboard-plan-sprint-resolution-defect-2026-08-10.md` (tooling defect report; its outcome is carried as backlog tasks 0050–0053 on [[wiki/decisions/sprint-backlog]]), the five 2026-08-14 ship-batch briefs (already paged 2026-08-21), `plan.md`/`worklog.md`/`review.md`/`evidence/` working artifacts, READMEs and `.gitkeep` scaffolding
- ⚠️ Flagged: the spawning caller stated the 2026-08-22 outage diagnosis was "conversation-only, not in any file". That was stale — the committed incident record exists and was ingested as a real source. Nothing was invented.
- Targeted lint on the changed pages: all introduced wiki-links resolve; backlinks added at write time.

## 2026-08-23 — lint
- Issues found: 15
- Issues fixed: 4
- Issues flagged for human review: 6
- Issues deferred to a tracked task: 5
- Fixed (stale claims invalidated by the 2026-08-23 sync's findings): [[wiki/decisions/sprint-4]] header still called the citizenship chain "active" and the Decision text called crediting "live" — both now carry the verified `0062` prod no-op and the 0054 card-hide; [[wiki/systems/project-brief]] current-focus paragraph rewritten the same way (dated update, original date kept); [[wiki/tasks/profile-match-end-crediting]] gained the production-status caveat.
- Flagged, not fixed (needs a human call): 6 vault ADR pages (`adr-101`, `adr-103`, `adr-104`, `adr-105`, `adr-106`, `adr-107`) carry abbreviated filenames vs their knowledge-base counterparts — same numbers, verified same decisions, but the copy-the-filename-verbatim convention says they should match. `> **LINT WARNING:**` blockquotes added in place; repair is rename-plus-relink or accept the abbreviation as standing style. ADR numeric-collision check (both directions, plus the separate knowledge-base duplicate pass, case-insensitive, regular files only): clean. Headings agree with filenames.
- Deferred to task `0052` (owner-ruled to run after `0003`, one pass over both rename maps — not fixed piecemeal here): 5 stale legacy task-file paths in [[wiki/decisions/licensing-compliance]], [[wiki/decisions/profile-storage-strategy]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], [[wiki/features/announcements]].
- Mechanical sweep over all 140 pages: index↔file coverage clean, 0 broken wiki-links, 0 one-way links, required metadata present on every page, 0 orphans. `karpathy-vault` mention in [[wiki/decisions/fkit-transfer-blueprint]] confirmed deliberate history, left alone. The email-subscribe/152-ФЗ cross-links added during this session's sync were re-verified bidirectional.

## 2026-08-23 — lint (follow-up)
- Owner ruling relayed via the lead session: the abbreviated vault ADR slugs are ACCEPTED as standing style — do not rename.
- Removed the six `LINT WARNING` slug-divergence blockquotes placed earlier today on [[wiki/decisions/adr-101-fail-soft-xp-crediting]], [[wiki/decisions/adr-103-identity-trust-seam]], [[wiki/decisions/adr-104-archiving-disabled]], [[wiki/decisions/adr-105-compact-maps-out-of-rotation]], [[wiki/decisions/adr-106-flags-suppressed]], [[wiki/decisions/adr-107-turn-interval-1-5x]].
- Recorded the convention in `schema.md` (ADR page naming note under the Decision Page template): slug abbreviation vs the knowledge-base counterpart is accepted style and must not be re-flagged; number match/uniqueness and heading agreement remain lint checks.
- Informational, no page edit: owner ruled task `0055` deploys with the next batch — the undeployed caveat on [[wiki/tasks/master-lobbies-worker-exit-diagnostics]] stays accurate until then.

## 2026-08-24 — ingest
- Sync window: `14613bb` → HEAD (`00d7a64`)
- Changed source files detected: 22 (8 ingest-worthy after filtering)
- Ingested: `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md` → created [[wiki/tasks/licensing-remediation]]; updated [[wiki/decisions/sprint-4]], [[wiki/decisions/licensing-compliance]] — done agent-closed, **NOT deployed**; 0065's flip-ON gate is "0066 DEPLOYED"
- Ingested: `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (0025 audit, complete 2026-08-23) → updated [[wiki/decisions/licensing-compliance]] (Open Items table replaced by the audit outcome: V1 violation, A1 trademark, H1–H3 hygiene, ShareAlike note), [[wiki/decisions/sprint-4]] (0025 row In progress — audit complete, task not closed)
- Ingested: `ai-agents/sprints/plan-sprint-4.md` (`e15bac7`, `7b58655`, `12eb6ad`) → updated [[wiki/decisions/sprint-4]] — 0012/0017/0018 re-scoped local-first/mock-first (owner-ruled 2026-08-23, "don't block on Yandex externals"); 0017/0018 built + review-converged 2026-08-24 on local/mock scope only, both OPEN pending live tails; new 0065 row (blocked on 0014 AND 0062); 0062 blocker rewording; 0066 done row
- Ingested: `ai-agents/knowledge-base/analytics-event-reference.md` (`12eb6ad`, `00d7a64`) → updated [[wiki/systems/analytics]] — new Citizenship Funnel Events section (Purchase:Started/Completed/Abandoned:Citizenship, Citizenship:Earned:XP, all 0054-flag-gated, none live); `UI:Tap:PurchaseCitizenship` supersedes the 0021-planned `UI:Tap:CitizenshipBuy` (0021 brief corrected `00d7a64`)
- Ingested: `ai-agents/sprints/done/plan-sprint-4c.md` (rename-only archive, `821d610`) → updated [[wiki/decisions/sprint-4c]] source path + archived/closed note; index line updated
- Skipped (backlog briefs, per procedure — statuses carried via the sprint-4 page instead): `0012`, `0017`, `0018`, `0021`, `0025`, `0053`, `0065` briefs
- Skipped (in-folder working artifacts, per procedure): `0017`/`0018`/`0066` `plan.md`/`worklog.md`/`review.md`, `0017` screenshot
- Skipped (no content change beyond already-ingested knowledge): `0014` brief touch in pre-watermark history — not in this window
- Targeted lint on the changed pages: all introduced wiki-links resolve; [[wiki/tasks/licensing-remediation]] backlinks bidirectional at write time

## 2026-08-24 — lint
- Issues found: 3 (+5 known-deferred)
- Issues fixed: 3
- Issues flagged for human review: 0
- Issues deferred to a tracked task: 5 (unchanged — task `0052` legacy task-file paths, owner-ruled to stay deferred)
- Fixed (stale claims dated by the 2026-08-23/24 re-scope and audit): [[wiki/tasks/hide-citizenship-card-flag]] flip-ON coupling no longer rides the 0017/0018 builds — moved to 0017's Deferred Live Tail and 0065's go-live step (0066-DEPLOYED-gated); [[wiki/tasks/yandex-payments-implementation]] live-verification checklist now absorbed into 0065; [[wiki/systems/project-brief]] paid-IAP audit gate updated — audit ran, V1 found, 0066 built but not deployed, gate still open. Backlink [[wiki/tasks/licensing-remediation]] ↔ [[wiki/systems/project-brief]] added.
- Mechanical sweep over all 141 pages: index↔file coverage exact (141/141), 0 broken wiki-links, 0 one-way links, 0 orphans, required metadata present per page type. ADR cross-check (case-insensitive, numeric, regular files only, all three enumerations): 7 vault ADRs (101–107) each match a same-numbered knowledge-base counterpart, headings agree, no vault or knowledge-base collisions. Abbreviated ADR slugs not flagged — accepted standing style per schema.md (owner-ruled 2026-08-23).
- Purged-asset sweep (0066 delta): remaining `proprietary`/favicon/brand mentions in [[wiki/systems/game-overview]] and [[wiki/systems/project-operations]] are constraint statements, still accurate — left alone.

## 2026-08-24 — lint (follow-up)
- Owner ruling relayed via the lead session (AskUserQuestion, 2026-08-24): the dashboard URL in the Monitoring and Alerting Gap section of [[wiki/systems/telemetry]] is REMOVED per the no-endpoints-in-artifacts rule; the prose now describes the dashboard's location (public HTTPS entry point on the telemetry VPS) without the endpoint.
- Standing flag RETIRED: the "dashboard URL in monitoring-gap section" finding, re-flagged by the last 3 lint runs, is resolved — future lints must not re-flag it.
- Resolved by extension: the same host also appeared once in the page's Summary section (line 8); the URL removed there too, same treatment (destination described without the host string) — lead-extended per the ruling's rationale, owner informed 2026-08-24.
- No other pages touched; no commits.

## 2026-08-25 — lint (task-path sweep for 0003)
- Owner-authorized (lead session, 2026-08-25): task `0003` moved 118 closed briefs from loose `ai-agents/tasks/{done,cancelled}/<legacy>.md` into `<board>/<NNNN>-<slug>/brief.md` folders (`0074`–`0191`) plus `hf11a-hotfix-stale-build-investigation-plan.md` → `done/0110-stale-build-investigation/plan.md`. Source of truth: the frozen 118-row map in `ai-agents/tasks/backlog/0003-migrate-done-cancelled-tasks-to-folders/worklog.md`.
- Rewrote every vault reference to the 119 migrated files: 96 lines in 89 pages — 73 `wiki/tasks/*` pages (`**Source**` fields), [[wiki/decisions/sprint-4]] (4), [[wiki/decisions/cancelled-tasks]] (2), [[wiki/decisions/profile-storage-strategy]] (2), [[wiki/decisions/sprint-4c]], [[wiki/decisions/sprint-3]], [[wiki/decisions/personal-data-152fz-compliance]], [[wiki/decisions/hvn-balance-pr70-no-ship]], [[wiki/decisions/hotfix-post-sprint2]], [[wiki/features/reconnection]] (2), [[wiki/features/feedback-button]] (2), [[wiki/features/tutorial]], [[wiki/features/announcements]], [[wiki/features/ai-players]], [[wiki/systems/telemetry]], [[wiki/systems/player-profile-store]], [[wiki/systems/analytics]]. Two bare (path-less) mentions in [[wiki/decisions/profile-storage-strategy]] and [[wiki/systems/analytics]] were expanded to the full new path. Full-filename matches only; `index.md` carried no such paths (unchanged); this log's 137 historical lines left as-is.
- Verified: vault grep for all 119 legacy names → hits only in `log.md` history; all 92 distinct new `ai-agents/tasks/{done,cancelled}/NNNN-*/{brief,plan}.md` paths referenced by pages exist on disk; `git diff --numstat` shows 89 vault files, every one line-for-line (no line added or dropped).
- Left untouched (not in the 0003 map — pre-existing `0002`-era backlog names, still deferred to task `0052`): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` in [[wiki/decisions/profile-storage-strategy]] (lines 8, 17) and `ai-agents/tasks/backlog/s4-investigate-null-id-errors.md` in [[wiki/decisions/sprint-4]] (line 21); plus the 5 legacy paths the 2026-08-23/24 lints already deferred to `0052`.
- No commit; nothing written outside `ai-agents/wiki-vault/`.

## 2026-08-28 — ingest
- Sync window: `00d7a64` → HEAD (`c86b87d`) — commits `282655c`, `dc90719`, `c86b87d` ("Sprint push" ×3). Read from the working tree, which is clean at `c86b87d`.
- Changed source files detected under `ai-agents/` (excluding the vault): 214 paths, of which **119 are rename-only** (task `0003`'s legacy-flat → `NNNN-slug/brief.md` folder migration, already swept in the vault on 2026-08-25) and **~60 are mechanical path-reference rewrites** from commit `282655c` (the same rename map applied inside knowledge-base, reviews and sprint docs — no new knowledge). **12 sources were ingest-worthy.**
- Ingested: `ai-agents/knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md` → created [[wiki/decisions/adr-109-worker-index-placement-contract]] (accepted 2026-08-26; the index is a fixed placement contract — move the game ID, never the index; options (i)–(iv) and their rejections; private-lobby exposure and wedged-but-alive workers recorded as owner-accepted tradeoffs)
- Ingested: `ai-agents/knowledge-base/decisions/adr-108-owner-set-active-sprint-pointer.md` + `ai-agents/knowledge-base/reports/2026-08-24-eval-active-sprint-pointer.md` → created [[wiki/decisions/adr-108-active-sprint-pointer]] (accepted 2026-08-24; **direction for upstream fkit — nothing in this repo changes**; interim rule is to ask for status by name)
- Ingested: `ai-agents/tasks/done/0057-.../brief.md` + `ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md` → created [[wiki/tasks/worker-routing-dead-worker-investigation]]
- Ingested: `ai-agents/tasks/done/0056-.../brief.md` → created [[wiki/tasks/worker-crash-recovery-and-quorum-gate]]
- Ingested: `ai-agents/tasks/done/0192-.../brief.md` → created [[wiki/tasks/schedule-public-games-onto-ready-workers]]
- Ingested: `ai-agents/tasks/done/0193-.../brief.md` → created [[wiki/tasks/fetchlobbies-in-flight-guard]]
- Ingested: `ai-agents/tasks/done/0194-.../brief.md` → created [[wiki/tasks/worker-reject-departed-requester-create]]. ⚠️ Its brief is **deliberately superseded by its `plan.md`** on the central point (the specified synchronous socket check was measured not to fire; a bounded 10 ms settle wait shipped instead) — the page records that, per the brief's own warning box.
- Ingested: `ai-agents/tasks/cancelled/0072-deploy-time-config-guard/brief.md` → updated [[wiki/decisions/cancelled-tasks]] (new section: cancelled 2026-08-24 as a duplicate of `0064`, specifics merged; the `0062`/`0063` failure class it recorded kept)
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]] — outage-track rows 0056/0057 flipped to done and 0192/0193/0194 added; the 0055 row's "unpushed branch" note corrected (it reached `dev` via PR #133); the 0012 row updated to built-but-blocked; Name Change / Citizen Verified Icon rows given their IDs `0067` / `0068`
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] — new briefs `0069` (auth-strategy decision), `0070` (`TokenLoginModal` silent failure, follows 0069's ruling), `0071` (map label density at mid-zoom), `0073` (inert upstream HTML leftovers); `0064` noted as the surviving guard task after `0072`'s cancellation
- Ingested: `ai-agents/knowledge-base/architecture.md` + `ai-agents/knowledge-base/analytics-event-reference.md` (task `0012` personal inbox) → updated [[wiki/features/announcements]] (new Personal-inbox subsection: tab strip, the three routes, template-vs-literal sends, `player_messages`, the never-throwing `InboxSender` seam, the `CITIZENSHIP_CARD_ENABLED` gate), [[wiki/systems/player-profile-store]] (schema + routes), [[wiki/systems/analytics]] (new Personal Inbox Events section — `Inbox:Opened`, `Inbox:LoadFailed`, the two tab taps)
- Also updated: [[wiki/systems/networking]] (post-outage master/worker coordination replaces the two pre-fix gotchas), [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]] (new Outcome section + track-status note), [[wiki/systems/telemetry]] (**stale claim corrected — see the lint entry**), [[wiki/decisions/adr-numbering-two-series]], [[wiki/decisions/adr-103-identity-trust-seam]], `index.md`
- Skipped (rename-only, no content change): the 119 `0003` migration renames — the vault swept these on 2026-08-25.
- Skipped (mechanical path rewrites from `282655c`, no new knowledge): `adr-103`, `adr-105`, `geoconflict-overview.md`, `pre-s4-player-infra-audit-*`, `s4-preexisting-infra-impact-*`, `personal-data-152fz-findings.md`, `profile-backup-restore-runbook.md`, the `ai-agents/reviews/*` ledgers, `sprints/done/*`, and ~15 other knowledge-base files.
- Skipped (backlog briefs, per procedure — statuses carried via the sprint pages instead): `0012`, `0062`, `0063`, `0067`–`0071`, `0073`, `0004`, `0017`, `0018`, `0021`, `0026`, `0030`, `0032`, `0034`, `0035`, `0044`, `0048`, `0051`, `0052`, `0064`
- Skipped (in-folder working artifacts, per procedure): every `plan.md` / `worklog.md` / `review.md` in the window — **except** as *evidence* for two claims: `0056`'s worklog (the measured OTEL attribute behaviour) and `0194`'s plan (the shipped design that supersedes its brief).
- Targeted lint on the changed pages: 6 one-way links introduced by this ingest, all fixed the same pass; 0 broken links; 0 pages missing from `index.md`.

## 2026-08-28 — lint
- Issues found: 5 (+3 known-deferred). Issues fixed: 5. Flagged for human review: 1. Deferred to a tracked task: 3.
- **Stale claim corrected (the headline one):** [[wiki/systems/telemetry]] said "Winston OTEL transport silently drops extra arguments — embed all error details in the message string", in **two** places (the Logs architecture bullet and the Gotchas list). Corrected to what was **measured** on 2026-08-27 during task `0056`'s verification 4a (worker deaths observed in Uptrace, dev environment): a **single meta object survives as log attributes** — `workerIndex`, `clusterId`, `pid`, `signal`, `restartsInWindow`, `windowMs`, `missingWorkerIndices`, `readyCount`, `numWorkers`, `quorum` all arrived — and the one exception observed is that **an attribute whose value is `null` is dropped** from the attribute set, while the message text still carries it. Deliberately **not** overstated beyond that observation: the multi-argument (`Symbol(splat)`) form was never exercised in the run, so the page now says the claim about it is a code reading, not an observation. Also recorded: Uptrace free-text search did not match those lines, attribute filters did. Evidence: `ai-agents/tasks/done/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/worklog.md`.
- **Stale claim corrected:** [[wiki/tasks/master-lobbies-worker-exit-diagnostics]] said task `0055`'s commit `419a116` was on an **unpushed** branch, "not pushed, not deployed". Per `0057` findings §1 it reached `dev` via **PR #133 (`7410bfb`)**. Corrected, with the honest residual kept loud: **whether prod has it is UNKNOWN — never checked.** The page's "production still runs with crash recovery disarmed" line was re-grounded rather than deleted: `0056` has landed on `dev` but no production deploy of the track is confirmed.
- **Stale claim corrected:** the same page's outage-track order and [[wiki/decisions/sprint-backlog]]'s `0057` note, both of which predated the track's extension to `0192`/`0193`/`0194` and its close.
- Fixed: 6 one-way links (all introduced by this run's own ingest) — backlinks added on [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]], [[wiki/systems/telemetry]], [[wiki/tasks/master-lobbies-worker-exit-diagnostics]], [[wiki/tasks/worker-crash-recovery-and-quorum-gate]].
- Mechanical sweep over all 148 pages: index↔file coverage exact (148/148), **0 broken wiki-links, 0 one-way links, 0 orphans**, required metadata and required sections present for every page type. ADR cross-check (numeric, case-insensitive): 9 vault ADRs (101–109) each match a same-numbered knowledge-base counterpart, no collisions on either side. Abbreviated ADR slugs not flagged — accepted standing style per `schema.md` (owner-ruled 2026-08-23).
- **Deferred to task `0052` (unchanged ruling):** 3 dangling legacy task paths remain under `wiki/` — `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` in [[wiki/decisions/profile-storage-strategy]], `ai-agents/tasks/backlog/s4-investigate-null-id-errors.md` in [[wiki/decisions/sprint-4]], `ai-agents/tasks/backlog/mobile-webgl-rendering.md` in [[wiki/decisions/sprint-backlog]]. All three are `0002`-era backlog names, which is exactly `0052`'s remaining scope. **One of `0052`'s twelve listed occurrences was discharged incidentally by this ingest** — `8d-b-task-personal-inbox.md` in [[wiki/features/announcements]], rewritten to `ai-agents/tasks/backlog/0012-personal-inbox/brief.md` because that page's inbox claim was being rewritten anyway.
- **Flagged for human review, not changed:** six vault pages carry public hostnames — `api.geoconflict.ru` (5 pages) and the player-facing `t.me` / `vk.com` channel URLs (2 pages). No credentials, DSNs, IPs, or `persistentID` values anywhere in the vault. The 2026-08-24 owner ruling that removed a URL from this vault was specifically about the **telemetry dashboard** endpoint; it was not a blanket hostname purge, and these entries have survived several lints since. Left as-is pending an owner call — see the report's NEEDS-DECISION.
- `log.md` not edited above this line; nothing written outside `ai-agents/wiki-vault/`; no commit.

## 2026-08-28 — ingest (sync)
- Sync window: `c86b87d` → HEAD (`c99110f`). ⚠️ **The commit delta alone was one file** (`plan-sprint-4.md`); today's work is almost entirely **uncommitted in the working tree**, so the working-tree delta under `ai-agents/` was ingested alongside it. The watermark is HEAD, so that work will be re-seen (harmlessly) when it is committed.
- Changed ingest-worthy source files detected: 6 (1 committed, 5 working-tree).
- Ingested: `ai-agents/tasks/done/0067-name-change-citizens-only/brief.md` (+ its `worklog.md` and the sprint row as evidence) → created [[wiki/tasks/citizenship-name-change]]
- Ingested: `ai-agents/tasks/done/0068-citizen-verified-icon/brief.md` (+ its `worklog.md` as evidence) → created [[wiki/tasks/citizen-verified-icon]]
- Ingested: `ai-agents/knowledge-base/architecture.md` §5 + §9 (the `0198` delta) → created [[wiki/decisions/windoworigin-url-join-defect]]; also updated [[wiki/systems/architecture-overview]] (new §5 bullet + the §9 look-alike-trap table), [[wiki/systems/networking]], [[wiki/systems/flashist-init]]
- Ingested: `ai-agents/tasks/backlog/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md` (the recurring-class content only, not a task page) → created [[wiki/decisions/config-parity-failure-class]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]] — `0067`/`0068` rows flipped backlog → done with their built-awaiting-deploy posture and their unsoftened residuals; four new rows (`0195`–`0198`); a new header note and four new Consequences bullets
- Also updated: [[wiki/systems/player-profile-store]] (name-change routes + migration 004, the `is_citizen` game path, and three new production-gap gotchas), [[wiki/systems/configuration]], [[wiki/systems/game-loop]], [[wiki/systems/localization]], [[wiki/decisions/adr-103-identity-trust-seam]], [[wiki/decisions/adr-104-archiving-disabled]], [[wiki/decisions/adr-109-worker-index-placement-contract]], [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]], [[wiki/tasks/hide-citizenship-card-flag]], [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/tasks/yandex-payments-implementation]], `index.md`
- Skipped (backlog briefs, per procedure — no task pages created): `0195`, `0196`, `0197`, `0198`. Their **content** was ingested where it is durable knowledge (the `0198` production defect and the `0195` failure class each got a decisions page); `0196` and `0197` are recorded as sprint-board rows only, since neither has produced a finding yet.
- Skipped (backlog briefs, modified but not done): `0064`, `0065` — their status changes are carried by the sprint page.
- Skipped (in-folder working artifacts, per procedure): every `plan.md` / `review.md` in the window — **except** `0067`'s and `0068`'s `worklog.md`, read as evidence for what actually shipped versus what the briefs specified.
- Link repairs: 0 rotted `tasks/backlog/0067-*` / `0068-*` paths existed in the vault (checked; those pages did not exist before today).
- Targeted lint on the changed pages: every new page's links resolve and every one is reciprocated; 0 one-way links left.

## 2026-08-28 — lint
- Mechanical sweep over all 152 pages: **0 broken wiki-links** (152 distinct link targets resolved), index↔file coverage exact, 0 orphans, required metadata and required sections present for every page type.
- Stale claims fixed: 3 — [[wiki/decisions/sprint-4]]'s `0067`/`0068` rows still read `backlog` after both closed; the same page's citizenship-track narrative omitted the deploy line both tasks stop at; [[wiki/systems/player-profile-store]] described the payments endpoints as fail-closed-pending-a-key without recording that the key **cannot reach the box at all** (`0195`).
- Fixed: 0 one-way links remaining. Every link added by this run was reciprocated in the same pass.
- **Deferred, unchanged (task `0052`):** 3 dangling legacy task paths under `wiki/` — `s4-player-profile-store-impl.md` in [[wiki/decisions/profile-storage-strategy]], `s4-investigate-null-id-errors.md` in [[wiki/decisions/sprint-4]], `mobile-webgl-rendering.md` in [[wiki/decisions/sprint-backlog]]. All `0002`-era names, exactly `0052`'s remaining scope. Not fixed here.
- **Flagged for human review, not changed (same open question as the 2026-08-27 lint):** public hostnames — `api.geoconflict.ru` on 7 pages, the player-facing `t.me` / `vk.com` channel URLs on 3, `geoconflict.ru` on 8. ⚠️ **Counted, and the previous lint's "5 pages / 2 pages" figures were low** — they are corrected here, not silently carried. This run added the hostname to exactly one new page ([[wiki/decisions/windoworigin-url-join-defect]], where `geoconflict.ru/yandex-games_iframe.html` **is** the finding). No credentials, DSNs, tokens, keys, connection strings or IPs anywhere in the vault; this run named variables only, never values.
- ⚠️ **Not verifiable by lint, and stated as such:** every claim added today about `0067`, `0068` and `0198` is *build* evidence. **Nothing is verified in production.** The vault says so on every page carrying it; a future lint must not quietly promote "built" to "live".
- `log.md` not edited above this line; nothing written outside `ai-agents/wiki-vault/`; no commit.

## 2026-08-28 — amendment (correction to today's `0198` ingest — not a re-ingest)
- Trigger: task `0198`'s review finding **R1** (low, docs), owner ruled fix; `ai-agents/knowledge-base/architecture.md` §5 corrected by the coder. The vault carried the same imprecision.
- **The correction:** a URL wrongly concatenated onto `windowOrigin` never matches the worker route, but the outcome is **verb-dependent** — **non-GET (PUT/POST) → 404**; **GET → 200 with `static/index.html`** via nginx's catch-all `location /` → the master's SPA fallback `app.get("*")` (`src/server/Master.ts:689-691`), which sets no status, so a GET caller fails on a **JSON parse error, not a network error**.
- Amended [[wiki/decisions/windoworigin-url-join-defect]] — 3 spots: the measured table's outcome cell (bare `404` → verb-qualified, plus a new verb note under the table attributed to the §5 correction, with the Chrome measurement explicitly scoped to the non-GET path); the `path-prefix miss` paragraph (GET clause appended — the `PUT or POST therefore 404s` prose was already correct and was kept); the `indistinguishable from success` line (now notes the GET 200-with-HTML-body is even more success-shaped).
- Same bare-404 claim found and amended on 2 other pages touched by today's ingest: [[wiki/systems/architecture-overview]] (§5 bullet) and `index.md` (the catalog line). **Only that claim was changed on each.**
- Checked and left alone (already verb-scoped, not a bare claim): [[wiki/systems/networking]], which names the PUT and POST routes explicitly. Every other `404` occurrence in the vault is unrelated (flags suppression, `.map` 404s, archive endpoint, licensing checks).
- **Not re-ingested, not rewritten.** Preserved verbatim: the `fix BUILT but NOT DEPLOYED` banner, the measured pathname table rows, `The production failure is NOT the double-slash bug`, the `⚠️ Derived, NOT measured` invite-symptom label, and the owner rulings block. **Nothing here is verified in production.**
- **`.wiki-watermark` deliberately NOT advanced** — this corrects an existing ingest, it adds no new coverage.
- `log.md` not edited above this line; nothing written outside `ai-agents/wiki-vault/`; no commit.
