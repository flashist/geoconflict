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

## 2026-08-28 — ingest (sync)
- Sync window: `c99110f` → HEAD (`d442ac2`). The working tree is now **clean** — everything the earlier run ingested from the uncommitted tree (`0067`, `0068`, `0198`, `architecture.md` §5) is committed inside this window, so most of the delta is **already covered** and was not re-ingested.
- Changed source files detected: 21 (deduplicated). Ingest-worthy after filtering: 4.
- Ingested: `ai-agents/tasks/backlog/0199-yandex-invite-link-leaves-portal-iframe/brief.md` → created [[wiki/decisions/yandex-invite-portal-boundary]]. Filed as a **decision page with `Status: proposed`** because nothing is ruled: the owner approved *filing* the brief and confirmed the **Backlog / Unscheduled** placement (explicitly not Sprint 4), and ruled nothing else. Records the host-vs-path distinction from `0198`, the current invite string, the `location.search` sub-question, and the code fact below.
- Ingested: `ai-agents/tasks/backlog/0198-.../review.md` (close-out only) → updated [[wiki/decisions/windoworigin-url-join-defect]] and [[wiki/decisions/sprint-4]] with the terminal state **`🚧 Blocked — awaiting deploy proof` — review closed, task NOT Done**, six owner-confirmed residuals with binding re-raise conditions, and the fact that round-2 gates were **not** re-run (the 107/1075/exit-0 numbers stand on round 1).
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] with the `0199` row and why it is off the Sprint 4 board.
- Verified-consistent, **not re-ingested**: `ai-agents/knowledge-base/architecture.md` §5 — its GET/404 verb correction was already amended into the vault earlier today; re-read and confirmed the vault matches.
- **Code fact recorded** on [[wiki/systems/flashist-init]], verified in source this run: `src/client/yandex-games_iframe.html:19` sets `window.flashist_isYandexPlatform = true` **unconditionally**, and `FlashistFacade`'s constructor (`FlashistFacade.ts:358-363`) sets `yaGamesAvailable = true` on that flag **or** a defined `window.YaGames`, so the flag alone suffices. Consequence: an off-portal load of that template still enters Yandex platform mode. ⚠️ **Written as an open measurement question, never as a behaviour claim** — what the SDK/ads/auth/payments path actually does off-portal is **not established**.
- **Stale mechanism corrected (2 spots, both on [[wiki/decisions/windoworigin-url-join-defect]]):** the trailing-slash sentence attributed the standalone-`index.html` substitution to nginx. Both `~* \.html$` and `location /` `proxy_pass` to the same master, so nginx never picks a file — the substitution is **Express's** (`express.static` hit vs the `app.get("*")` SPA fallback). Consequence was correct; only the layer was wrong. `ai-agents/knowledge-base/architecture.md` still carries the older wording — outside the vault, flagged not fixed.
- Skipped (already covered by the earlier working-tree ingest): `tasks/done/0067-*/brief.md`, `tasks/done/0068-*/brief.md`, `sprints/plan-sprint-4.md`. Skipped per procedure: the in-folder `plan.md` / `worklog.md` working artifacts, and backlog briefs `0064`/`0065`/`0195`/`0196`/`0197`/`0198` (already summarized on their board pages).
- Pages created: 1. Pages updated: 8 (`index.md`, sprint-4, sprint-backlog, windoworigin-url-join-defect, flashist-init, networking, citizen-verified-icon, plus this log).
- Targeted lint on the changed pages: every link added resolves and is reciprocated in the same pass; 0 one-way links left.
- `.wiki-watermark` advanced `c99110f` → `d442ac2` — this run adds **new coverage** (`0199`, `0198`'s close-out), not only a correction.
- ⚠️ **Nothing added by this run is verified in production.** `0067` / `0068` remain built-awaiting-deploy; `0198`'s fix is built and **not deployed**; `0199` is unstarted and unruled.
- Nothing written outside `ai-agents/wiki-vault/`; no commit.

## 2026-08-28 — lint
- Issues found: 6. Issues fixed: 4. Flagged for human review / carried forward unfixed: 2 classes.
- Mechanical sweep over all **153** pages: **0 broken wiki-links** (153 distinct link targets, all resolving), index↔file coverage **exact both ways**, **0 orphans**, required inline metadata and required sections present for every page type (**0 template drift**). The only unresolved `[[…]]` tokens in the vault are `schema.md`'s own template placeholders (`[[systems/...]]`, `[[features/attack]]`) — examples, not links; not counted, not "fixed".
- **ADR number/slug cross-check: clean.** 9 vault ADR pages, 9 knowledge-base ADRs, numbers compared numerically and case-insensitively over regular files only: no missing counterpart, no knowledge-base number collision, no vault duplicate, no heading/filename disagreement. Abbreviated vault slugs not flagged, per `schema.md`'s owner-ruled standing style.
- **Fixed — 2 one-way links** (both pre-existing, neither introduced today): [[wiki/decisions/sprint-backlog]] → [[wiki/tasks/worker-routing-dead-worker-investigation]] and [[wiki/systems/flashist-init]] → [[wiki/tasks/citizenship-name-change]]. Back-links added on the two targets.
- **Fixed — 1 stale source path.** [[wiki/tasks/licensing-remediation]] named `resources/images/Favicon.svg`, which no longer exists. The sentence was *historically* correct (task `0066` deleted that file), so it was clarified rather than rewritten: marked deleted and the live icon named — `resources/images/GeoConflictFavicon.svg`, which is what both HTML templates reference today. Full sweep of the other **147** `src/` / `tests/` / `resources/` paths cited across the vault: all exist.
- **Deferred, unchanged (task `0052`) — 3 dangling legacy task paths**, re-verified as still missing on disk: `s4-player-profile-store-impl.md` in [[wiki/decisions/profile-storage-strategy]], `s4-investigate-null-id-errors.md` in [[wiki/decisions/sprint-4]], `mobile-webgl-rendering.md` in [[wiki/decisions/sprint-backlog]]. `0002`-era names, exactly `0052`'s remaining scope, deferred by an unchanged ruling. **Reported, not fixed.**
- **Flagged for human review, still the open owner question from 2026-08-27 — public hostnames, RE-COUNTED this run rather than carried:** `api.geoconflict.ru` on **8** pages; the bare host `geoconflict.ru` on **3**; the player-facing `t.me/` and `vk.com` channel URLs on **3** (1 + 2). ⚠️ **The counts moved, and the reason is method, not drift** — the previous lint's `geoconflict.ru` figure was produced by an unescaped pattern whose `.` matched any character, so it silently counted the `api.` pages. The two hostname families are disjoint here (8 + 3 = 11 pages mentioning either). **This run added the bare host to 2 pages** — [[wiki/decisions/yandex-invite-portal-boundary]] and [[wiki/systems/flashist-init]] — where the URL **is** the finding.
- **Secret scan: clean.** No credentials, DSNs, tokens, keys, connection strings, private keys, or non-localhost IPs anywhere in the vault. This run named variables only, never values.
- **Both must-never-soften residuals re-verified present and un-softened**, on all four pages that carry them: `0068`'s **R3** (`isCitizen` on the unauthenticated lobby poll — valid **only** while the flag is purely cosmetic, **VOID** the moment anything of value is gated on it) and `0067`'s **publicly readable, unmoderated pending name — passes no gate at all, UNMITIGATED**.
- ⚠️ **Deploy-status language audited and holding.** Every "live" still in the vault next to `0067` / `0068` / `0198` refers to a *live test* or the *live production defect*, never to a deployed fix. **Nothing from 2026-08-28 is verified in production**; `0198`'s fix is built and NOT deployed. A future lint must not quietly promote "built" to "live".
- `log.md` not edited above this line; nothing written outside `ai-agents/wiki-vault/`; no commit.

## 2026-08-29 — owner ruling recorded (policy record — not an ingest, sync, or lint)
- **Recorded a standing owner ruling: public hostnames may remain in vault pages. CLOSED.** Source: the owner, 2026-08-29, via `AskUserQuestion` in the fkit-lead session; relayed to the wiki role for the write.
- **Home: `schema.md`, new section `## Standing Owner Rulings (binding on lint)`**, placed before Cross-Reference Rules. Chosen because `schema.md` is the rulebook a lint run already reads as ground truth, and it already carries the precedent — the 2026-08-23 owner-ruled ADR-naming style, written as a binding "lint must not flag" instruction. The new section cross-references that ruling rather than moving it.
- **Reasoning captured in the record:** `api.geoconflict.ru` (8 pages), bare `geoconflict.ru` (3), `t.me`/`vk.com` (3) are public endpoints already in the repo and the shipped client; none is a credential; on [[wiki/decisions/yandex-invite-portal-boundary]] the hostname **is** the finding.
- **Explicitly supersedes the open-question entries from the three prior lint runs** (the three lint entries above, all filed under `## 2026-08-28`). ⚠️ **Dating discrepancy recorded, not resolved:** the lead's instruction and the two later entries call the first of those "the 2026-08-27 lint", but that run's own log header reads 2026-08-28; there is no `## 2026-08-27` lint header in this file. Noted in the ruling itself. Those entries stay as written — append-only — and are now settled, not open.
- **Boundary written into the record, loudly:** the ruling covers **public hostnames only**. It does **not** license credentials, tokens, keys, DSNs, connection strings, private keys, or private/non-localhost IPs, and the secret scan must keep failing on those. A future reader must not read it as "hostnames are fine, therefore endpoints are fine".
- **No hostname was stripped, altered, or added anywhere in the vault.** No page content was rewritten. Pages touched: 3 — `schema.md` (new section), [[wiki/decisions/yandex-invite-portal-boundary]] (back-link to the ruling, per the bidirectional-link rule), and this log.
- `index.md` **not** touched — no page created or removed. `.wiki-watermark` **not advanced**: this is a policy record, not new source coverage.
- No sync and no lint run this turn; both ran 2026-08-28 and were clean (0 broken links, 0 orphans, 0 template drift, secret scan clean). Nothing written outside `ai-agents/wiki-vault/`; no commit, no push.

## 2026-08-30 — ingest (sync)

- **Sync window:** `d442ac29f27b9ba42ae361b15c208b8717e9d92b` → HEAD (`362a2f985aefb25651e4804b8e27d68cb8b382a2`), plus the uncommitted working tree — see the coverage note below.
- ⚠️ **Coverage note, stated because the watermark alone would have understated the delta.** `git log <watermark>..HEAD` over `ai-agents/` returned exactly **one** file (`knowledge-base/architecture.md`). Everything else this sync ingested is **uncommitted in the working tree**: the `0063` and `0197` task-folder moves into `done/`, the `0197` rename, the new findings report, the `0200` brief, and the sprint-plan/backlog edits. Ingesting the committed delta alone would have missed the entire session's work, so the working tree was swept as well. The watermark is advanced to `362a2f9` regardless; **a future sync will re-see those files once they are committed, and should treat them as already covered by this entry.**
- Changed ingest-worthy sources detected: **6** (1 committed, 5 uncommitted).

**Ingested:**

- `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md` → **created** [[wiki/tasks/prod-api-env-https-apex]]
- `ai-agents/tasks/done/0197-test-suite-reliability-investigation/brief.md` + `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md` → **created** [[wiki/tasks/test-suite-reliability-investigation]]
- `ai-agents/knowledge-base/architecture.md` (§5 mechanism correction: the invite-link substitution is **Express's**, not nginx's) → **updated** [[wiki/systems/architecture-overview]], and **discharged the open flag** in [[wiki/decisions/windoworigin-url-join-defect]] that said §5 still carried the older wording
- `ai-agents/sprints/plan-sprint-4.md` → **updated** [[wiki/decisions/sprint-4]] (rows for `0062`, `0063`, `0066`, `0197`, `0198`; new `0200` row; deploy banner)
- `ai-agents/sprints/backlog.md` → **updated** [[wiki/decisions/sprint-backlog]] (`0200` moved to Sprint 4; `0064` sequencing note)

**Production deploy `362a2f9` — ingested as a first-class fact, because it falsified a posture carried across nine pages.** Verified by commit ancestry in this repo plus the live evidence recorded in `0063`'s close-out. Everything on `dev` at that commit is in production: the whole 2026-08-22 outage track, `0066`, `0067`, `0068`, `0198`'s URL fix and `0063`'s config. **Updated:** [[wiki/decisions/sprint-4]], [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]], [[wiki/decisions/windoworigin-url-join-defect]], [[wiki/decisions/config-parity-failure-class]], [[wiki/decisions/licensing-compliance]], [[wiki/decisions/yandex-invite-portal-boundary]], [[wiki/systems/networking]], [[wiki/systems/player-profile-store]], [[wiki/systems/project-brief]], [[wiki/tasks/licensing-remediation]], [[wiki/tasks/citizenship-name-change]], [[wiki/tasks/citizen-verified-icon]].

- ⚠️ **Every one of those updates says the same narrow thing and none of them says more:** the bytes are on the box; the behaviour was not checked. `PROFILE_INTERNAL_TOKEN` was **deliberately left blank** by the owner for this release, so `0062`'s shipped fix has never been exercised and citizenship is dark **by design**; `CITIZENSHIP_CARD_ENABLED` is still `false`; `0198`'s production proof is **unreachable**, not merely unrun (the private-lobby buttons are `display: none` on the Yandex template); `0066`'s three live checks were not run.

**Stale claims corrected at the same time** (all four flagged by the caller, all four confirmed against source before editing):

- **"The integration suite hangs without `--forceExit`"** — FALSE. Corrected in [[wiki/tasks/citizenship-name-change]] (the only vault page asserting it), with the disproof and the "a future hang is a real regression" rule.
- **"Five segfaulting suites"** — the count is **four**. Corrected in [[wiki/decisions/sprint-4]] and noted in [[wiki/tasks/citizen-verified-icon]], whose own `review.md` is the origin of the error and is finished output that was **not** edited.
- **"Environmental / jsdom / memory-pressure cause"** — refuted by experiment. Corrected in [[wiki/decisions/sprint-4]]; the full hypothesis table is on the new `0197` page.
- **The Node pin as a fix** — recorded explicitly as **NOT a mitigation** on [[wiki/tasks/test-suite-reliability-investigation]] and [[wiki/systems/architecture-overview]], with the reason (it pins to the very major the crash was reproduced on) attached so no retelling can quietly upgrade it.

- **Skipped, per procedure:** `ai-agents/tasks/backlog/0200-…/brief.md`, `0069`, `0070`, `0198`, `0195`, `0196` — backlog briefs, no task page created; their durable content is carried on the sprint and decision pages instead. In-folder `plan.md` / `worklog.md` / `review.md` skipped as working artifacts. `CLAUDE.md` is outside `ai-agents/` and so outside the sync filter; its new integration-test section is nonetheless recorded as the single source of truth on [[wiki/systems/architecture-overview]] and the `0197` page.
- Pages created: **2**. Pages updated: **15**. `index.md` updated (2 new entries, 6 corrected descriptions). `.wiki-watermark` advanced to `362a2f9`.
- Targeted lint on the changed pages: 0 broken links, 6 one-way links found and **all 6 fixed** with reciprocal back-links.

## 2026-08-30 — lint

- **Issues found: 8. Issues fixed: 8. Flagged for human review: 0.** (Plus the sync's own 6 one-way links, fixed in that pass and re-verified clean here.)
- **Most significant finding is a NEGATIVE one, and it is the answer to the question this lint was called on:** the `0197` rename and the `0063` folder move into `done/` **broke nothing in the vault**. Every vault page that mentions `0197` or `0063` mentions the **task ID**, never the folder path, so there was no path to rot. Verified by scanning every `ai-agents/tasks/...` path in `wiki/`, `index.md` and `schema.md` against disk, and by grepping the whole vault for the old folder name `0197-test-suite-reliability-segfault-and-integration-hang` — its only occurrences are the two deliberate before/after rename records on the new `0197` page and nowhere else. Nobody had checked; now someone has.

**Fixed (8):**

- **3 legacy task-filename pointers**, 4 occurrences, all naming files that no longer exist — the surviving `0002`-era residue that is task `0052`'s scope. `ai-agents/tasks/backlog/mobile-webgl-rendering.md` → `0031-mobile-webgl-rendering/brief.md` ([[wiki/decisions/sprint-backlog]]); `…/s4-investigate-null-id-errors.md` → `0032-investigate-null-id-errors/brief.md` ([[wiki/decisions/sprint-4]]); `s4-player-profile-store-impl.md` → `0013-player-profile-store-impl/brief.md`, **twice** in [[wiki/decisions/profile-storage-strategy]] — once as a bare stem and once as a `backlog/` path that is now a `done/` path. Prose unchanged; only the paths moved. `log.md` **not edited** — its 60 occurrences are historical record and are barred from repair by `0052`'s own hard constraint.
- **1 stale invocation left readable as current.** [[wiki/tasks/citizenship-name-change]]'s Outcome recorded `… --runInBand --forceExit` as its integration command. It is a true record of what was run then, so it is **kept and marked historical inline** rather than rewritten — a reader arriving at that line now sees that `--forceExit` is gone and that `npm run test:integration` is the command.
- **4 remaining "not deployed" postures** carried on [[wiki/systems/player-profile-store]], [[wiki/systems/project-brief]], [[wiki/decisions/yandex-invite-portal-boundary]] and [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]] — corrected against release `362a2f9`. The incident page's was the sharpest: it told operators to assume **"production still runs with crash recovery disarmed"**, which was actively misleading after the deploy. It now records crash recovery as **armed and quiet, not proven** — nothing killed a worker in production to watch the supervisor restart it.

**Checked clean, with the method, so a future lint need not re-derive it:**

- **Structure** — all 155 pages carry their schema-required inline bold metadata and section headings for their type. 0 template drift, 0 missing fields.
- **Links** — 0 broken wiki-links, 0 one-way links, 0 pages missing from `index.md`, 0 orphans (every page has at least one inbound link from another page).
- **Source paths** — every `` `src/…` ``, `` `tests/…` ``, `` `resources/…` ``, `` `scripts/…` `` and `` `ai-agents/knowledge-base/…` `` path in the vault resolves on disk, with **one deliberate exception**: [[wiki/tasks/licensing-remediation]] names `resources/images/Favicon.svg` **as a file it says was deleted**. That is the claim, not a stale pointer. Left alone.
- **ADR numbers** — 9 vault ADR pages, 9 knowledge-base ADRs, numbers compared **numerically**, filenames matched **case-insensitively**, regular files only. 0 missing counterparts, 0 heading/filename disagreements, 0 duplicate numbers in `knowledge-base/decisions/`. Eight vault pages carry **abbreviated slugs** against their counterparts (e.g. `adr-104-archiving-disabled.md` ↔ `adr-104-match-archiving-disabled-until-s3-citizen-gated.md`) — **not flagged**, per `schema.md`'s owner ruling of 2026-08-23 making abbreviation the vault's accepted standing style.
- **Secrets** — clean. No connection string, key, token, DSN, private key, or IP literal (public or private) anywhere in `wiki/`, `index.md` or `schema.md`. The only regex hits were long `src/client/graphics/layers/...` paths tripping a base64 pattern.
- **Standing rulings honoured** — the public-hostname question is **CLOSED** per `schema.md` and was **not** re-raised. No open owner question is carried by this run.

### Addendum to the two entries above — 2026-08-30, watermark correction

⚠️ **The owner committed this run's in-flight vault work mid-run**, as `65a8fd2` ("Sprint push", authored 13:23:22 by the repo owner). **The wiki role did not commit and did not push** — it never does. That commit swept up the sync's pages and edits together with the task-folder moves, the `0197` rename, the findings report and the sprint-plan edits that this run had just ingested from the working tree.

**Watermark advanced a second time, from `362a2f9` to `65a8fd2`.** Checked before advancing: `65a8fd2` carries **no ingest-worthy source this run did not already ingest** — its `ai-agents/` payload outside the vault is exactly the findings report, `backlog.md`, `plan-sprint-4.md`, the `0063` and `0197` folder moves, and the `0069` / `0070` / `0197`-old / `0200` backlog briefs (backlog briefs are skipped by procedure). Advancing therefore records the truth and spares the next sync a full re-ingest of work already on the pages.

📌 **This supersedes the coverage note in the sync entry above**, which warned that a future sync would re-see those files as uncommitted. They are committed now, and the watermark is past them. The note stays as written — the log is append-only — but read this addendum as the current state.

## 2026-08-30 — ingest (sync, second run of the day)

- **Sync window:** watermark `65a8fd2` → HEAD — and **HEAD IS `65a8fd2`.** `git log <watermark>..HEAD -- ai-agents/` returned **zero files**. The committed delta is empty.
- ⚠️ **COVERAGE NOTE — the watermark understated the delta again, totally this time, and the working tree was swept instead.** Every source this run ingested is **uncommitted**: the `0198` folder move into `done/`, and modifications to the `0063`, `0066` and `0198` briefs, `sprints/plan-sprint-4.md` and `knowledge-base/geoconflict-producer-knowledge-base.md`. Ingesting the committed delta alone would have found **nothing at all**. This is the second consecutive sync where that was true; it is a property of how this project works (the owner commits in batches, after the work), not an anomaly. **A future sync will re-see these files once they are committed and should treat them as already covered by this entry.**
- **`.wiki-watermark` NOT advanced — deliberately.** It already reads `65a8fd2`, which is HEAD. There is no later commit to point at. Advancing it is a no-op, and writing anything else would misstate what is committed.
- **Base state at start, recorded:** six vault files were still uncommitted from the previous run (`.wiki-watermark`, `log.md`, and four wiki pages). They were left as they were and edited in place where this run needed them. **No commit, no push — the wiki role never commits.**
- Changed ingest-worthy sources detected: **5** (0 committed, 5 uncommitted).

**Ingested:**

- `ai-agents/tasks/done/0198-private-lobby-start-url-double-slash/brief.md` (moved out of `backlog/`, modified) → **created** [[wiki/tasks/private-lobby-start-url]]
- `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md` → **updated** [[wiki/tasks/prod-api-env-https-apex]] (the close-out's new state-at-close vs final-state table)
- `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md` → **updated** [[wiki/tasks/licensing-remediation]] (verification steps 7 and 8 run and passed)
- `ai-agents/sprints/plan-sprint-4.md` → **updated** [[wiki/decisions/sprint-4]] (rows for `0063`, `0065`, `0066`, `0198`, `0200`; two narrative bullets)
- `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md` → **updated** [[wiki/systems/producer-workflow]] (the new never-write-endpoints rule and the owner's 2026-08-30 no-retro-scrub ruling)

**Three substantive changes of posture, each recorded with the thing that must not be softened:**

- **`0063`'s evidence is COMPLETE — and the ORDERING is the record.** All six of the owner's deploy pendings are now discharged; **four of them were unevidenced at the moment the task closed**, and the close was made anyway. The page carries a **two-column table, state-at-close vs final-state**, precisely so no future retelling can flatten this into "it was always fine". Pending 2 (browser console) is the **only** one a human checked. Pending 6 was measured in Uptrace by grouping on the **`openfront_host`** attribute (OTEL normalizes the dot in `openfront.host` to an underscore) — **a raw-IP host value whose last entry is `Aug 29 2026 15:43:27.876`, 19 seconds before the new master booted at 15:43:46**, and nothing but the apex domain after. 🔒 **The IP value itself is deliberately not written into any vault page**; the attribute name and the timestamps are enough to re-run the query. The `(agent-closed — not owner-verified)` marker stays.
- **`0066`'s licensing gate moves from "shipped, not demonstrated" to DEMONSTRATED.** 🚨 **The control method is recorded on the page, not just the verdict, because the original check would make a future re-run read a pass as a fail.** This server's `app.get("*")` never 404s, so "expect 404" is unsatisfiable; the correct test is **byte-identity against a known-nonexistent control**, and **all seven purged paths returning `200` IS THE PASS**. Negative control `200`/10801 bytes/`text/html`; positive control `/commit.txt` 41 bytes `text/plain`. New original favicon `200`/445 bytes/`image/svg+xml`, and `yandex-games_iframe.html` links the identical hashed file. **The Dockerfile pending was re-verified AT SOURCE during this ingest rather than taken on report**: no `COPY proprietary` line exists at all, lines 38–43 are an explicit allowlist copy, `proprietary/` is untracked, no `sounds/music` files are tracked, and the only `OpenFrontLogo.svg` hits are the two `resources/claude-design-files/**` copies the owner's 2026-08-23 ruling declared expected non-empty. ⚠️ **Recorded on four pages that this clears ONE of `0065`'s blockers and no others — `0014`, `0062` and `0195` remain open and unchanged, and the paid go-live is NOT unblocked.**
- **`0198` is Done, on LOCAL PROOF ONLY, and the weakness is written down un-softened.** Its production check was **WAIVED as unsatisfiable, not merely unrun**: the private-lobby buttons sit in a `display: none` row in `src/client/yandex-games_iframe.html` **by the owner's deliberate choice**, so the failing path has no route to being reached in production at all. The fix shipped in `362a2f9` and `HostLobbyModal.ts` now builds root-absolute worker paths, but **its correctness in production is inferred from the code, never observed**, and no human checked the work. The "do not reinstate the waived step — a future re-enablement owes that check" instruction is carried on both the task page and the decision page.

**The `0198` folder move — the link-damage question, answered: it broke NOTHING.** Every `ai-agents/tasks/...` path written anywhere in `wiki/`, `index.md` and `schema.md` was resolved against disk; the only non-resolving string is `ai-agents/tasks/.../filename.md`, which is `schema.md`'s own template placeholder. **No vault page ever cited `tasks/backlog/0198-…`** — vault pages cite task **IDs**, as the 2026-08-30 lint established for `0197`/`0063`. The old `backlog/0198` path appears **once**, in `log.md`, which is append-only historical record and is not repaired. **Verified, not assumed.**

**The fkit `adr-0XX` link question, also answered: nothing to fix.** Grepped the whole vault for the `adr-0XX` series (fkit's own ADRs, which live in fkit's install share, not this repo's knowledge base). **Zero occurrences anywhere in the vault** — no page links them, so no page carries the unresolvable link `plan-sprint-4.md` is having removed. The vault's nine ADR pages are all `adr-1XX`, this project's series.

- **One deliberate deviation from the sync filter, stated so it is not mistaken for scope creep.** `ai-agents/tasks/backlog/0200-…/brief.md` is a **backlog** brief and is skipped by procedure — **no task page was created for it**. But one durable trap from it was added to the existing `0200` row on [[wiki/decisions/sprint-4]]: the first identity-captured instance (`tests/profile-server/PaymentsRoutes.test.ts`, 2026-08-30) was observed on the **`unitConfig`** jest path, which ignores `/tests/integration/` — so **any experiment reproducing only under `npm run test:integration` is on the wrong surface**. Verified in the brief before writing. It enriches a row that already existed; it does not create a page.
- **Skipped, per procedure:** backlog briefs `0064`, `0065`, `0199`, `0200` (no task pages); in-folder `plan.md` / `worklog.md` / `review.md` for `0063`, `0066` and `0198` (working artifacts, not sources) — including `0198`'s modified `review.md`.
- **Not touched, per the caller's instruction and the role boundary:** `ai-agents/sprints/plan-sprint-4.md` and every task brief were read as **input only**. A producer was editing the sprint plan during this run (the ADR-035 href fix). **Nothing was written outside `ai-agents/wiki-vault/`.**
- Pages created: **1**. Pages updated: **13** ([[wiki/tasks/prod-api-env-https-apex]], [[wiki/tasks/licensing-remediation]], [[wiki/tasks/citizen-verified-icon]], [[wiki/decisions/windoworigin-url-join-defect]], [[wiki/decisions/licensing-compliance]], [[wiki/decisions/config-parity-failure-class]], [[wiki/decisions/sprint-4]], [[wiki/decisions/yandex-invite-portal-boundary]], [[wiki/systems/networking]], [[wiki/systems/architecture-overview]], [[wiki/systems/telemetry]], [[wiki/systems/project-brief]], [[wiki/systems/producer-workflow]]). `index.md` updated: 1 new entry, 7 corrected descriptions.
- **Targeted lint on the changed pages:** 0 broken links; **1 one-way link found and fixed** (`config-parity-failure-class` → the new `0198` page, back-link added); new page conforms to the schema task template; secret scan over the touched pages and `index.md` **clean** — no IP literal, connection string, key or token.
- **Stale claims corrected while passing through** (each confirmed against source before editing): `windoworigin-url-join-defect`'s "the built-but-undeployed fix removes the separator" — release `362a2f9` falsified it; the same page's "the task's status is the producer's to set" — settled by the close; `sprint-4`'s and `index.md`'s "`0198` still NOT Done" and "`0066` NOT deployed / live checks unrun"; `project-brief`'s and `licensing-compliance`'s "shipped, not demonstrated" licensing posture.
- 🔒 **No IP address was written into any vault page**, including on `0063`'s telemetry evidence where the raw-IP host value is the finding — it is described, never quoted. `schema.md`'s standing public-hostname ruling was honoured and **not** re-raised; the producer-side no-retro-scrub ruling was recorded together with an explicit note that **it does not relax the vault's own bar**.
- No commit, no push. No task file moved, no brief edited, no sprint plan touched.

## 2026-08-31 — ingest (sync)

- **Sync window:** watermark `65a8fd2` → HEAD (`b8978111af5b0c2ac4f50b879738f63a04659b84`), **plus the uncommitted working tree.**
- ✅ **The watermark was USEFUL this time, and that is a change from the last two runs.** The owner committed everything as `b897811` ("Sprint push and wiki update", 2026-08-31 11:28), including all six vault files that had been sitting uncommitted. There is a real later commit, so `.wiki-watermark` **advanced `65a8fd2` → `b897811`.** Verified before advancing rather than assumed.
- **The committed delta was checked and found ALREADY COVERED.** `git log 65a8fd2..HEAD` over `ai-agents/` returned 13 files, and every one of them is what the **2026-08-30 second sync** ingested from the working tree: the `0198` folder move, the `0063` / `0066` / `0198` brief+worklog edits, `plan-sprint-4.md`, and `geoconflict-producer-knowledge-base.md`. The remaining three (`0064`, `0065`, `0199` briefs) are **backlog briefs, skipped by procedure** — `0065`'s addition was spot-checked anyway and its substance (the `0066` gate confirmed demonstrated; other blockers untouched) is already carried on the vault pages. **No re-ingest was needed.** This discharges the previous entry's warning that a future sync would re-see those files.
- ⚠️ **The genuinely new sources are all UNCOMMITTED again**, so the working tree was swept as before. This is now the third consecutive sync where the real delta was in the working tree; it is how this project works (the owner commits in batches, after the work), not an anomaly.
- Changed ingest-worthy sources detected: **4** (0 new committed, 4 uncommitted).

**Ingested:**

- `ai-agents/tasks/done/0025-licensing-asset-audit/brief.md` (moved out of `backlog/`, close-out section added) → **created** [[wiki/tasks/licensing-asset-audit]]
- `ai-agents/sprints/plan-sprint-4.md` (the `0025` row flipped `🔄 In progress` → `✅ Done (agent-closed — not owner-verified)`) → **updated** [[wiki/decisions/sprint-4]]
- `ai-agents/knowledge-base/PROJECT.md` (line 97 corrected by a producer under owner ruling R13) → **updated** [[wiki/systems/project-brief]]
- `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (task-pointer updated `backlog/` → `done/`; findings body unchanged) → no new page; the audit's substance now lives on the new `0025` page

**🚨 The false "In progress" claims — TWO were found, not one.**

- **`0025` — the one this run was called on.** The vault asserted the `0025` row *"stays In progress: the close routes through the producer's mover skill"*. **False as of 2026-08-31.** Corrected at source on [[wiki/decisions/sprint-4]] (the board row), [[wiki/decisions/licensing-compliance]] (the named line 79 paragraph, replaced by a dated close-out section) and `index.md`. **`log.md` was NOT rewritten** — it is append-only and its 2026-08-23 entry recording "0025 row In progress" is a true historical record of that date.
- **`0013` — found while sweeping, not reported by the caller.** [[wiki/decisions/sprint-4]]'s "Remaining implementation track" table carried **Player Profile Store — Implementation | in progress**. `plan-sprint-4.md` has read `✅ Done (agent-closed — not owner-verified)` since the epic **closed 2026-08-24 by owner ruling**. Corrected, with the close's limit attached: the epic closing does **not** mean the profile store works in production — the prod substance is in `0062` and the live tails, and `PROFILE_INTERNAL_TOKEN` is still deliberately blank.
- **One more stale posture struck on the same page:** the 2026-08-23 header blockquote still said `0066` *"is built and agent-closed but **NOT deployed**"*. Falsified by release `362a2f9`. Struck through and dated rather than deleted.

**📌 Sprint 4 now has ZERO `🔄 In progress` rows — verified independently, not taken on report.** Counted the status markers in `ai-agents/sprints/plan-sprint-4.md`: `🔄 In progress` appears **0** times; the board is 22 `✅ Done`, 20 `✅ Done (agent-closed)`, 7 `🔲 Backlog`, 6 `🚧 Blocked`, 3 `⛔ Cancelled`. Recorded on [[wiki/decisions/sprint-4]] and `index.md` **with the caveat that this is not the same as the sprint being finished** — every remaining open row is blocked or backlogged.

**🔧 The "H3 is unowned" error — corrected, and recorded as a correction.** The relay that drove `0025`'s close stated no task owned finding **H3**. **That was wrong: task `0073`** (`0073-remove-inert-upstream-html-leftovers`, `🔲 Backlog`, Unscheduled, filed 2026-08-24 from the audit's §H3) owns it, and the producer caught the error. Verified against the brief on disk before writing. **No vault page had ever asserted H3 was unowned** — the only prior H3 mentions were [[wiki/tasks/licensing-remediation]] ("out of scope per the audit") and [[wiki/decisions/sprint-backlog]], which already recorded `0073` as the H3 task. So there was nothing false to repair; instead the **ownership is now stated positively** on four pages so the error cannot recur.

**All five findings recorded with their true states**, on the new page and on [[wiki/decisions/sprint-4]] / [[wiki/decisions/licensing-compliance]]: **V1** ✅ remediated by `0066`, verified in production 2026-08-30; **A1** ✅ remediated by `0066`, verified 2026-08-30 on both entry points; **H1** ✅ remediated by `0066` Part C, **verified in production 2026-08-31** — `runtime`, `vendors` and `main` bundles fetched and grepped, **0 occurrences in each**; **H2** ✅ moot once V1 landed, as the audit predicted; **H3** ❌ still open under `0073`, audit-rated low risk / no gate (commented markup ships no asset).

**🚨 The V1/A1 verification METHOD is recorded, not just the verdict — this is the trap the page exists to document.** Seven paths were checked and **all seven returned `200`, which is a PASS**, because this server's `app.get("*")` catch-all never 404s. Proven by controls: a certainly-nonexistent path returns the identical `200` / **10801 bytes** / `text/html`, while a real asset (`/commit.txt`) returns **41 bytes** of `text/plain`; all seven purged paths are **byte-identical to the nonexistent control**. **A page saying "expect 404" would make a future re-run read a pass as a fail.**

**⚠️ Gate consequence recorded on five pages, and deliberately NOT overstated.** `0025` was `0065`'s licensing prerequisite and that prerequisite is **satisfied and demonstrated**. **`0065` REMAINS BLOCKED on `0014`, `0062` and `0195`. The paid go-live is NOT unblocked.** No other task's status changed at this close — `0065`, `0066` and `0073` are exactly as they were.

**The `0025` folder move — the link-damage question, answered: it broke NOTHING.** Every `ai-agents/tasks/...` path written anywhere in `wiki/`, `index.md` and `schema.md` was resolved against disk; the only non-resolving string is `ai-agents/tasks/.../filename.md`, `schema.md`'s own template placeholder. **No vault page had ever cited `tasks/backlog/0025-…`** — vault pages cite task **IDs**, exactly as the `0197`/`0063` and `0198` moves established. The only `0025` folder paths in the vault are the two written by this run, both pointing at `done/`. Verified, not assumed.

- **`ai-agents/knowledge-base/PROJECT.md` was read as INPUT ONLY, and the corrected version was taken.** A producer was correcting its line 97 during this run; by the time it was read, the "an open gate before paid IAP ships" claim was already replaced by the R13 correction. **The stale claim was never ingested.** [[wiki/systems/project-brief]] now follows the corrected wording, keeping the "licensing gate only, IAP not clear to ship" caveat intact.
- **Skipped, per procedure:** backlog briefs `0064`, `0065`, `0073`, `0199` (no task pages — `0073`'s content is carried on the `0025` page and [[wiki/decisions/sprint-backlog]] instead); in-folder `plan.md` / `worklog.md` / `review.md` as working artifacts.
- **Not touched, per the role boundary and the caller's instruction:** `ai-agents/tasks/`, `ai-agents/sprints/` and `ai-agents/knowledge-base/` were read as input only. **Nothing was written outside `ai-agents/wiki-vault/`.** No task file moved, no brief edited, no sprint plan touched, no task status set.
- Pages created: **1**. Pages updated: **6** ([[wiki/decisions/sprint-4]], [[wiki/decisions/licensing-compliance]], [[wiki/systems/project-brief]], [[wiki/decisions/sprint-backlog]], [[wiki/tasks/licensing-remediation]], [[wiki/tasks/prod-api-env-https-apex]]). `index.md` updated: 1 new entry, 2 corrected descriptions.
- **Targeted lint on the changed pages:** **0 broken wiki-links** across the whole vault (all `[[…]]` targets resolve), **0 pages missing from `index.md`**, and **all 6 back-links to the new page verified reciprocal in the same pass — 0 one-way links left**. New page conforms to the schema task template (`**Source**` / `**Status**` / `**Sprint/Tag**` + Goal / Key Changes / Outcome / Related). **Secret scan over every touched page: CLEAN** — no IP literal, DSN, connection string, key or token. `schema.md`'s standing public-hostname ruling honoured and **not** re-raised; no open owner question is carried by this run.
- A full lint ran 2026-08-30 (8 found / 8 fixed / 0 flagged) and was not repeated; only the delta's own link damage was checked, and there was none.
- No commit, no push.

---

## 2026-09-02 — ingest (sync)

- **Sync window:** `b897811` → HEAD (`8aae001`). Three commits in range — `f2b9422`, `2c23d22`, `8aae001` — **not the two the caller named**; `f2b9422` was also inside the watermark's range and was swept. Working tree clean, `dev` level with `origin/dev`, so the delta is genuinely all committed for the first time in four syncs.
- **Changed source files detected under `ai-agents/` (excluding the vault): 58.** Of those, **44 backlog `brief.md` files were skipped by procedure** (`0196`'s dependency sweep touched them; a backlog brief gets no page until it is done). **12 in-folder `plan.md` / `worklog.md` / `review.md` files skipped** as working artifacts.
- Ingested: `ai-agents/tasks/done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md` → created [[wiki/tasks/yandex-payments-secret-forwarding]]
- Ingested: `ai-agents/tasks/done/0196-sweep-dependency-declarations-into-briefs/brief.md` → created [[wiki/tasks/dependency-declaration-sweep]]
- Ingested: `ai-agents/tasks/done/0200-supertest-profile-server-flake-confirm-and-fix/brief.md` + `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md` → created [[wiki/tasks/supertest-profile-server-flake]]
- Ingested: `ai-agents/tasks/done/0060-container-log-retention-after-nginx-stream-merge/brief.md` + `ai-agents/knowledge-base/container-log-retention.md` → created [[wiki/tasks/container-log-retention]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]] (four board rows rewritten, `0065`'s three-condition gate, the board count, and three correction bullets)
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] (`0201`, `0202`)
- **Skipped (already covered):** `ai-agents/knowledge-base/PROJECT.md` — its licensing-bullet correction (owner ruling R13) was already ingested by the 2026-08-31 run, and [[wiki/systems/project-brief]] already carries the corrected wording plus the "licensing gate only, IAP not clear to ship" caveat. Re-read to confirm; no edit needed.
- **Skipped (already covered):** `ai-agents/tasks/done/0025-licensing-asset-audit/brief.md` and `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` — the only change in range is the `backlog/` → `done/` path string; content is byte-identical and [[wiki/tasks/licensing-asset-audit]] is current.

**🔧 Stale claims found and FIXED — five, all five confirmed against source before editing.**

1. **"The only four suites in the repo using `supertest`"** — **FALSE; there are seven**, including `tests/server/Master.test.ts` on the **default `npm test`** path. Asserted on [[wiki/tasks/test-suite-reliability-investigation]], on [[wiki/decisions/sprint-4]]'s `0200` row, and in `index.md`. Corrected in all three, **struck rather than deleted** so the correction is auditable. The observation it sat under is unchanged and still holds — all nine measured failures did land in those four suites — but that is an **observed distribution, not a structural boundary**.
2. **`0060`'s log config "is not in this repo, may be a server-side change with no commit"** — **FALSE.** It shipped as an ordinary two-file commit; retention is version-controlled at `update.sh:90-92` and overrides the host `daemon.json`. The claim was carried by [[wiki/decisions/sprint-4]] and [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]]; both corrected.
3. **The `0200` flake is "in our own test code"** — **FALSE. Upstream, not ours** — it reproduces in ~40 lines of plain Node with no jest, express or project code. This was `0200`'s whole **promotion premise**, and the `🏁 OUTCOME` note recording that the premise was wrong is carried onto the sprint row. Corrected on [[wiki/tasks/test-suite-reliability-investigation]], [[wiki/decisions/sprint-4]] and `index.md`.
4. **`0065` blocked "until `0195` ships"** — **stale.** [[wiki/decisions/sprint-4]]'s status cell read *blocked by 0014 AND 0062*; it now reads **three conditions** and states the distinction explicitly: ⚠️ **`0195` is a gate now SATISFIED, not a gate REMOVED — the count does not drop.** The routes still 503 because `0014` has not issued the key. Same caveat added to [[wiki/decisions/config-parity-failure-class]], [[wiki/systems/player-profile-store]] and the new `0195` page.
5. **A commit SHA** — the harness precondition landed in **`b3909a7`**, not `282655c`. No vault page had ever asserted either SHA (checked by grep across the whole vault); the correct one is now recorded on [[wiki/decisions/sprint-4]] so the wrong one cannot be reintroduced.

**🚨 Two shapes recorded as EXPLICITLY UNTRACED, on three pages, and they must never be written up as understood.** The **`401`** on a route with no auth middleware (observed once, never recurred, never traced — **mechanism unknown**) and the **`socket hang up`** sub-shape (**6 occurrences**, uninstrumented arms only, never traced). No vault page had claimed either was explained; the flag is now stated positively on [[wiki/tasks/supertest-profile-server-flake]], [[wiki/decisions/sprint-4]] and `index.md` so the `0068` error cannot recur here. `0200`'s "mechanism confirmed" is scoped in writing to the **timeout sub-shape and its `Jest did not exit` companion** only.

**📌 Zero `🔄 In progress` rows — verified independently, not taken on the caller's word.** Counted the status markers in `ai-agents/sprints/plan-sprint-4.md` directly: `🔄` at the start of a row appears **0** times, and the board is **46 `✅ Done` · 6 `🚧 Blocked` · 3 `🔲 Backlog` · 3 `⛔ Cancelled` = 58**. Matches the caller's figure exactly. Recorded on [[wiki/decisions/sprint-4]] and `index.md`, again with the caveat that this is **not** the same as the sprint being finished.

**🚢 Nothing from this batch is live in production, and every page says so.** `0195` and `0060` are **repo-only**, pending deploys; `0200` shipped **no code at all**; `0196` was documentation-only. ⚠️ **`0060`'s two halves deploy differently** — the `update.sh` retention flags ride a plain `deploy.sh`, but `access_log off;` needs an **image rebuild via `build-deploy.sh`** because `nginx.conf` is baked into the image, so a plain deploy ships the smaller win and **silently not** the volume fix. That distinction is stated on [[wiki/tasks/container-log-retention]], [[wiki/decisions/sprint-4]], [[wiki/systems/configuration]] and `index.md`; no page implies one deploy ships both.

**⚠️ Numbers reported, not laundered.** `0196`'s scope is written as **30 briefs, not the brief's stated 31**, and **7 board-visible, not 8**, with the note that the gaps were investigated, could not be reconciled, and must not be "corrected" back. `0060`'s `100m × 10` is written as **provisional, not sized**, and its pre-change baseline as **unverified**. `0200`'s *"not a repository defect"* is written as **what stands after every alternative was refuted, on one host with no CI** — not as something positively proven.

- **Not touched, per the role boundary and the caller's instruction:** `ai-agents/tasks/`, `ai-agents/sprints/`, `ai-agents/knowledge-base/` and `CLAUDE.md` were read as **input only**. **Nothing was written outside `ai-agents/wiki-vault/`.** No task file moved, no brief edited, no sprint plan touched, no task status set.
- Pages created: **4**. Pages updated: **15** ([[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], [[wiki/decisions/config-parity-failure-class]], [[wiki/decisions/incident-2026-08-22-public-lobbies-outage]], [[wiki/tasks/test-suite-reliability-investigation]], [[wiki/systems/player-profile-store]], [[wiki/systems/configuration]], [[wiki/systems/architecture-overview]], [[wiki/systems/telemetry]], [[wiki/systems/agent-conventions]], [[wiki/tasks/master-lobbies-worker-exit-diagnostics]], [[wiki/tasks/licensing-asset-audit]], [[wiki/tasks/citizen-verified-icon]], [[wiki/tasks/citizenship-name-change]], [[wiki/tasks/yandex-payments-implementation]], [[wiki/tasks/prod-api-env-https-apex]]). `index.md`: 4 new entries, 5 corrected descriptions.
- **Targeted lint on the changed pages:** **0 broken wiki-links**, **0 pages missing from `index.md`**, and **2 one-way links found and closed** in the same pass (`dependency-declaration-sweep` → `yandex-payments-secret-forwarding` and → `sprint-backlog`); re-verified reciprocal afterwards. All four new pages conform to the schema task template. **Secret scan over every touched page: CLEAN** — variable names only (`YANDEX_PAYMENTS_SECRET`, `PROFILE_INTERNAL_TOKEN`, `TEST_DATABASE_URL`), no value, host, endpoint or DSN. `schema.md`'s standing public-hostname ruling honoured and not re-raised.
- No full lint this run; only the delta's own link damage was checked. No commit, no push.

---

## 2026-09-02 — ingest (sync)

- Sync window: `8aae001b19d9978062a7eb7b9715177a40289233` → HEAD (`6f0bb364fbbf43f4a4f36e7e0b11c494d5c7fd8d`), **2 commits** (`cfa3e33` "Wiki update", `6f0bb36` "Sprint push"). Working tree clean, `dev` level with `origin/dev` — the delta was genuinely in range this time.
- Changed source files detected under `ai-agents/` (excluding the vault): **18**. Ingest-worthy after filtering: **6**.
- Ingested:
  - `ai-agents/tasks/done/0021-analytics-p1-citizenship-funnel/brief.md` → created [[wiki/tasks/analytics-p1-citizenship-funnel]]
  - `ai-agents/knowledge-base/analytics-event-reference.md` → updated [[wiki/systems/analytics]]
  - `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]], [[wiki/decisions/config-parity-failure-class]]
  - `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]], [[wiki/decisions/config-parity-failure-class]]
  - `ai-agents/sprints/sprint-backlog.md` → updated [[wiki/decisions/sprint-backlog]] (the `0047` stale-gate correction)
  - `ai-agents/tasks/done/0060-container-log-retention-after-nginx-stream-merge/brief.md` → updated [[wiki/tasks/container-log-retention]] (finding **F6**)
- Skipped (per the procedure's filter, with reason):
  - Backlog task briefs — not done, a page would be premature: `0024`, `0028`, `0037`, `0064`, `0201`, `0202`, `0203`. **`0064` and `0203` are nevertheless recorded** on [[wiki/decisions/config-parity-failure-class]] and the two board pages, sourced from the **sprint boards** (which are ingest-worthy), never from the skipped briefs.
  - In-folder working artifacts (`plan.md` / `worklog.md` / `review.md`) for `0021`, `0028`, `0064`.

**🔧 The highest-value correction this run: task `0021`'s founding premise was DISPROVED, and the vault now says so on four pages.** The brief's *"the first weeks of live data are lost and cannot be backfilled"* is **false** — every citizenship event is hard-gated by `CITIZENSHIP_CARD_ENABLED: false` (`src/client/flashist/FlashistFacade.ts:182`), checked before any analytics call in `CitizenshipCard.connectedCallback()` (`src/client/CitizenshipCard.ts:76-79`), so **zero citizenship events have ever fired anywhere** and no collection window ever opened. Verified against the source, not taken on the caller's word.

**📌 The two repairs the caller flagged as likely were checked and were NOT NEEDED — reported rather than invented.** (1) A `grep` across the whole vault for *"lost weeks"* / *"cannot be backfilled"* / *"first weeks"* / *"data are lost"* found **the false funnel claim on zero pages** — it had never been ingested. (2) A `grep` for `backlog/0021` and `0021-analytics` found **zero stale-path references**, so the `backlog/` → `done/` move broke no vault link. The one nearby hit, [[wiki/tasks/analytics-p0-session-match-count]]'s *"match count per session cannot be backfilled"*, is about a **different, live P0 event** and is **not the same claim** — deliberately left alone.

**🚫 `UI:Tap:CitizenshipLearnMore` recorded as obsolete on two pages, with the accepted cost stated.** Dropped by owner ruling R2: the Learn-more surface **was never designed** (grep for `CitizenshipLearnMore` / `LEARN_MORE` / `learnMore` across `src/` and `tests/` re-verified empty this run). The cost is written in, not smoothed over — **the funnel has no "researched it but didn't buy" signal**.

**🚨 `Citizenship:Seen`'s under-count risk (R3) carried into the wiki with its error direction, because a page that omitted it would mislead.** It **UNDER-counts impressions, which INFLATES every downstream conversion rate** — tap, purchase and earn rates all read better than reality, and it cannot err the other way. Recorded as **unproven** (a code-reading conclusion, unmeasurable before citizenship is live), **deliberately unfixed**, and its follow-up brief as a **recorded deliberate non-filing**, not a dropped thread.

**🚨 `0064`'s R1 caveat survived into every page that describes the guard, as required.** The client parity check **prints green while incomplete** — `src/core/configuration/**` is mapped to the game pipeline only though the browser bundle reads it too, reproduced by deleting a `DefinePlugin` entry and still getting `REQUIRED 0` / exit `0`. No page says the guard checks all three pipelines. Also recorded: **arming `--enforce` is ten gate items, not two** (`0203`), **R4 is explicitly undispositioned — the owner declined to rule (D7)**, and R12's silent `export KEY=` case.

**❓ One open question recorded as EXPLICITLY UNRESOLVED and not answered here: does Docker Compose `env_file` tolerate an `export` prefix?** It decides R12's severity. The reviewer explicitly did not verify it; neither did this run. It must be **measured**, not recalled.

**📌 Board counts re-derived independently, not taken from the caller.** Counted directly from `ai-agents/sprints/plan-sprint-4.md`: **47 done · 6 blocked · 4 backlog · 3 cancelled · 1 in progress — 61 rows**, which matched the relay. The previous vault claim of *"ZERO `🔄 In progress` rows … 46 · 6 · 3 · 3 of 58"* is now **false and struck in place** on both [[wiki/decisions/sprint-4]] and `index.md`. **25 of the 47 done rows carry `(agent-closed — not owner-verified)`** — recorded loudly, with the note that `/fkit-status` collapses every `✅` variant to plain `done`, so the board reads greener than the evidence supports.

**⚠️ Two of the caller's orienting notes could NOT be verified from any ingest-worthy source and were therefore NOT written as new claims.** (1) *"The profile pipeline is two hops, not one"* — plausible and consistent with what [[wiki/decisions/config-parity-failure-class]] already records about `build-deploy-profile.sh` → `setup-profile.sh`, but its stated source is `0064`'s review/worklog, which this procedure skips; nothing new was asserted. (2) *"Two agents fought over `package-lock.json` and a concurrent restore to `HEAD` can silently drop another agent's dependency entry"* — a real-sounding dev-environment gotcha, but it appears in **no file in this delta**, so there was no source to ingest it from. Both are **flagged, not filed**; if either should be durable, it needs a source.

- Pages created: **1** ([[wiki/tasks/analytics-p1-citizenship-funnel]]). Pages updated: **12** — [[wiki/systems/analytics]], [[wiki/decisions/config-parity-failure-class]], [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], [[wiki/tasks/container-log-retention]], [[wiki/tasks/hide-citizenship-card-flag]], [[wiki/tasks/solo-win-condition-fix]], [[wiki/tasks/monetization-analytics-spec]], [[wiki/tasks/start-screen-redesign-implementation]], [[wiki/tasks/citizenship-xp-progress-ui]], [[wiki/tasks/yandex-payments-implementation]], [[wiki/tasks/supertest-profile-server-flake]], plus `index.md`.
- **Targeted lint on the changed pages:** **0 broken wiki-links** (every target resolves to an existing page), **0 pages missing from `index.md`**, and **5 one-way links found and closed** in the same pass — four to the new funnel page (from `monetization-analytics-spec`, `start-screen-redesign-implementation`, `citizenship-xp-progress-ui`, `yandex-payments-implementation`) and one from `supertest-profile-server-flake` to [[wiki/decisions/sprint-backlog]].
- **Secret scan: CLEAN.** Variable **names** only (`CITIZENSHIP_CARD_ENABLED`, `PROFILE_INTERNAL_TOKEN`, `YANDEX_PAYMENTS_SECRET`, `STRIPE_PUBLISHABLE_KEY`, …) — no values, no connection strings, no tokens, no private or VPS IP addresses on any touched page.
- No full lint this run; only the delta's own link damage was checked. No commit, no push.

## 2026-09-02 — lint

- Issues found: 8
- Issues fixed: 8
- Issues flagged for human review: 0
- **Most significant: the Sprint 4 counts were stale in two places and the `0022` board row still read `backlog` after the task closed and its founding premise was refuted.**

**`0022` moved-path verdict: CLEAN — no broken link.** `0022`'s folder moved `backlog/` → `done/`
today and **no vault page carried a path to the old location**. Verified exhaustively, not
spot-checked: all **129** unique `ai-agents/tasks/…` paths referenced across `wiki/` and `index.md`
resolve on disk, as do all **353** repo file paths of any kind (the only three non-resolving strings
are correct as written — `schema.md`'s own `ai-agents/tasks/.../filename.md` template placeholder;
`ai-agents/sprints/.active-sprint`, which [[wiki/decisions/adr-108-active-sprint-pointer]] *proposes*
and states does not exist; and `resources/images/Favicon.svg`, which
[[wiki/tasks/licensing-remediation]] explicitly describes as **since deleted**). This matches the
`0021` move earlier today, which also broke nothing.

**Stale claims fixed (5):**
- [[wiki/decisions/sprint-4]] head re-count — `47 done · 6 blocked · 4 backlog` → **48 done · 6
  blocked · 3 backlog · 3 cancelled · 1 in progress, of 61**, and `25 of the 47` agent-closed → **26
  of the 48**. Counted directly from `ai-agents/sprints/plan-sprint-4.md` this run rather than taken
  on report: 26 `✅ Done (agent-closed — not owner-verified)` + 22 `✅ Done` = 48; 6 `🚧 Blocked`;
  3 `🔲 Backlog`; 3 `⛔ Cancelled`; 1 `🔄 In progress`.
- [[wiki/decisions/sprint-4]] `0022` row — status `backlog` → `✅ done (agent-closed — not
  owner-verified)`, with the refutation and the `0205` split recorded.
- [[wiki/decisions/sprint-4]] — the older "**Sprint 4 has ZERO `🔄 In progress` rows** … 46 done …
  of 58" bullet **struck in place** (not deleted): both halves are now false, and the page's own head
  note already contradicted it. Its surviving point — "no rows in progress" ≠ "sprint finished" — is
  kept.
- [[wiki/index]] — the same two count corrections, plus the `0022` close and refutation.
- [[wiki/tasks/solo-win-condition-fix]] — the page asserted `0022` was "**investigation-first and
  still `🔲 Backlog`**" and left `0140`/PR #77 under open suspicion. `0022` closed the same day and
  **refuted its own premise**: `src/core/game/GameImpl.ts` is not in PR #77's first commit's diff, and
  the clientless-`makeWinner()` `undefined` return is original to the fork (`feea527`) — net effect
  zero. Page now records the change as **cleared**, with risk 2 split out to `0205`.

**Legacy-filename stale claims fixed (2) — the `0052` residue class, verified against source:**
- [[wiki/tasks/disable-compact-public-maps]] said the `MINI_MAP_MODIFIER` comment points at
  `s5-fix-compact-map-shore-generation.md`. It points at `0026-fix-compact-map-shore-generation`
  (`src/server/MapPlaylist.ts:42,51`).
- [[wiki/tasks/archive-endpoint-failures]] said the `archiveEnabled()` comment points at
  `s4-archive-s3-backed-citizen-gated.md`. It points at `0030-archive-s3-backed-citizen-gated`
  (`src/core/configuration/DefaultConfig.ts:311-314`).
- These were previously deferred to `0052` under the owner ruling "`0052` depends on `0003`". **That
  prerequisite is satisfied** (`0003`'s renames were swept in the vault 2026-08-25), and both are
  bare *stems* describing what a code comment says — factually wrong against the source, which is
  lint's own scope. Fixed here rather than deferred a fifth time.

**Verified as already correct — no repair needed:**
- **`0064`'s R1 caveat SURVIVES** wherever the config-parity guard is described: the client parity
  check **prints green while incomplete** is stated on [[wiki/decisions/config-parity-failure-class]],
  on the `0064` row in [[wiki/decisions/sprint-4]], and in [[wiki/index]]. **No page claims the guard
  checks all three pipelines soundly.**
- **`0204` / `0205`: the vault mentioned NEITHER number** before this run. Nothing pointed at the
  wrong thing. `0205` (`ai-agents/tasks/backlog/0205-teams-bot-team-win-stall-resolution-policy`) is
  now named correctly in the two `0022` repairs above; `0204` has no task folder at all and is
  correctly absent.
- **`0052`'s audit table is NOT in the vault.** It lives in
  `ai-agents/tasks/backlog/0052-wiki-vault-legacy-filename-follow-up/brief.md`, **outside this role's
  write surface** — so its staleness could not be repaired here, only reported. Its "9 wiki pages
  carry 12 occurrences" is a 2026-08-10 snapshot the brief itself marks for re-derivation; measured
  today, **0 occurrences remain** under `wiki/` after the two fixes above.

**Clean on every other check:** 0 broken wiki-links (162 pages, 0 unresolved targets, re-verified
after the edits); 0 one-way links; 0 orphan pages; `index.md` accurate in both directions (every page
catalogued, every entry resolving); full schema conformance — every feature/system/decision/task page
carries its required **bold inline** metadata fields, and no page uses YAML frontmatter.

**ADR number/slug cross-check: CLEAN.** All 9 vault ADR pages (101–109) have exactly one
`ai-agents/knowledge-base/decisions/` counterpart at the same number (compared numerically,
case-insensitively, regular files only); no knowledge-base number is duplicated; every `# ADR-NNN`
heading agrees with its own filename. All 9 slugs are abbreviated relative to their counterparts —
**not flagged**, per the 2026-08-23 owner ruling in `schema.md`. `adr-numbering-two-series.md` does
not parse as `adr-NNN-` and is skipped by the deliberate non-rule.

**Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings, private keys or passwords on any
page. The only IPv4 literal anywhere in the vault is `127.0.0.1` (localhost, outside the
`schema.md` ruling's prohibition). Public hostnames left in place per the 2026-08-29 owner ruling.

**Left for the upcoming sync (deliberately not done here):** `0022`'s and `0205`'s substance. This
run corrected `0022`'s **status** and struck the refuted suspicion, but wrote **no task page** for
`0022` and no record of `0205` beyond the pointer — that is ingest, not lint, and the caller scoped
this run lint-only. `.wiki-watermark` **left at `6f0bb364fbbf43f4a4f36e7e0b11c494d5c7fd8d`, not
advanced.** No commit, no push.

## 2026-09-03 — ingest

- Sync window: `6f0bb364fbbf43f4a4f36e7e0b11c494d5c7fd8d` → HEAD (`82365bcc126e3671811370a845d8e58a359f7fbe`)
- Commits in window: **2** — `b08f607` "Wiki sync" (**vault-only output, no ingestable source**) and `82365bc` "Sprint push". Changed files in window: **31**, of which **8** are under `ai-agents/` outside the vault.
- Changed source files detected: **8** → **3 ingest-worthy** after filtering.
- Ingested: `ai-agents/tasks/done/0022-win-check-multiplayer-regression-investigation/brief.md` → created [[wiki/tasks/win-check-clientless-leader-guard]] and [[wiki/decisions/clientless-leader-win-policy]]
- Ingested: `ai-agents/sprints/plan-sprint-4.md` → updated [[wiki/decisions/sprint-4]]
- Ingested: `ai-agents/sprints/backlog.md` → updated [[wiki/decisions/sprint-backlog]] (`0205`, `0206`)
- Skipped (per procedure): `ai-agents/tasks/backlog/0205-…/brief.md` and `ai-agents/tasks/backlog/0206-…/brief.md` — **backlog briefs, not done**; their substance is recorded from the Backlog board instead. `0022`'s sibling `plan.md` / `worklog.md` / `review.md` — working artifacts, not sources. All of `ai-agents/wiki-vault/**` — wiki output.

**🚨 The delta carries a LIVE, UNFIXED production defect, and it is recorded as such on every page that
touches it.** When a clientless leader — a Bot **or** a `FakeHuman` Nation — wins FFA, `WinModal.ts`
hits an empty block, so no `SendWinnerEvent` is emitted, so no `winner` message reaches the server, so
`GameServer.handleWinner` never runs, so **`creditMatchXp` (`GameServer.ts:1253`, sole call site
`:1199`) never runs — the entire match's match-end XP is silently lost for every player in it.** Task
`0022` shipped the **guard only**: the match no longer wedges and a human can still win later, but
**nothing awards the win, so the XP is still never credited.** The fix is `0206`, **unscheduled and
unstarted**. Failure mode is silent — not a crash, not a hang, not a desync.

**🔧 `0022`'s founding premise was REFUTED, and the vault now says so coherently in four places.** It
was scheduled as a live regression from `0140-solo-win-condition-fix` (PR #77). It is not one:
`src/core/game/GameImpl.ts` is **not in `de2fd00`'s diff at all**, and the clientless `undefined` return
is **original to the fork** (`feea527`). Net effect of PR #77 on that path: **zero**. The earlier lint
had already cleared the accusation on [[wiki/tasks/solo-win-condition-fix]]; this run added the missing
substance and removed the last stale pointer (a duplicate `Related` entry on [[wiki/decisions/sprint-4]]
still describing the suspicion as open).

**⛔ The brief's own prescribed risk-3 fix is recorded as REJECTED, because the prescription is still
written in the brief and a future reader could follow it.** Reverting the `gameType !== Singleplayer`
clause from `checkWinnerTeam()` would **reintroduce the singleplayer Team stall PR #77 was written to
remove** — the guard returns above `setWinner` and above `this.active = false`, so the match could never
end. Filed as a decision, not a note: [[wiki/decisions/clientless-leader-win-policy]].

**⚠️ The verification residual was carried, not softened: risk 1 has NO live reproduction.** It needed a
non-Singleplayer private lobby and would have collided with the owner's dev server on port 3001; the
owner declined the interruption (ruling R5). Coverage is **synthetic jest tests only**. The live check
that ran covered **risk 3 only**, in Singleplayer, with the player's death **forced** rather than
natural. Test/lint figures on the page are **quoted from the task's worklog and review ledger, not
re-measured here**: `npm test` 108 suites / 1128 tests green on the first run; `npm run lint` clean.

**⛔ One consequence is a FIX and is recorded so nobody "restores" the old behaviour.** For the
**tutorial**, losing `reportPlacements()` removes a real bug: a bot winning a tutorial previously
awarded the single human player **first place for LOSING**, on the **real platform leaderboard**, through
a function with no game-type guard. Recorded on [[wiki/features/tutorial]] and both new pages, together
with the hard requirement that `0206` be **re-checked against it before shipping**.

**⚠️ A boundary was added to [[wiki/decisions/adr-101-fail-soft-xp-crediting]] to stop its closeout
clause being misapplied.** That ADR closes out findings of the form *"crediting can silently lose XP"*
**inside `ProfileApiClient`** — a bounded-retry drop after the credit was attempted. `0022`'s defect is
**upstream of that client entirely**: the credit is never attempted. Two different mechanisms; the ADR
does not cover the new one.

**📌 Board counts re-derived independently this run, not taken from the caller.** Counted directly from
`ai-agents/sprints/plan-sprint-4.md`: 26 `✅ Done (agent-closed — not owner-verified)` + 22 `✅ Done` =
**48 done**; **6** `🚧 Blocked`; **3** `🔲 Backlog`; **3** `⛔ Cancelled`; **1** `🔄 In progress` (`0064`)
— **61 rows.** This **matches** the figures already on [[wiki/decisions/sprint-4]] and `index.md` from
the 2026-09-02 lint, so no count was changed.

**⚠️ Five items the caller listed as likely delta material were NOT in the delta and were NOT
re-ingested.** `0021`, `0028`, `0064` and `0203` all last changed **in commit `6f0bb36` — the watermark
commit itself**, so they fall outside `<sha>..HEAD` by construction and were the *previous* sync's input
(`b08f607`). Spot-checked as already present and accurate: `0021` → [[wiki/tasks/analytics-p1-citizenship-funnel]];
`0064`/`0203` → [[wiki/decisions/config-parity-failure-class]]. Nothing was duplicated. A sixth item, a
separate *"tutorial fix"*, **does not exist as its own change** — see the correction below.

**🔧 One caller claim was CORRECTED against the diff rather than written as given.** There is no separate
tutorial fix in this delta: the only source changes are `WinCheckExecution.ts` and `WinModal.ts`. The
tutorial first-place-for-losing behaviour changed as an **emergent consequence** of `0022`'s risk-1
guard (tutorial ⇒ guard returns ⇒ no `Win` update ⇒ `reportPlacements()` never runs), and it is recorded
that way, as residual R1's useful half — not as a change anyone made on purpose.

- Pages created: **2** — [[wiki/tasks/win-check-clientless-leader-guard]], [[wiki/decisions/clientless-leader-win-policy]].
- Pages updated: **10** — [[wiki/decisions/sprint-4]], [[wiki/decisions/sprint-backlog]], [[wiki/tasks/solo-win-condition-fix]], [[wiki/decisions/adr-101-fail-soft-xp-crediting]], [[wiki/systems/execution-pipeline]], [[wiki/systems/game-loop]], [[wiki/systems/localization]], [[wiki/systems/player-profile-store]], [[wiki/features/ai-players]], [[wiki/features/tutorial]], plus `index.md`.
- **Targeted lint on the changed pages:** **0 broken wiki-links** (re-verified across the whole vault after the edits — every target resolves), **0 pages missing from `index.md`**, and **7 one-way links found and closed** in the same pass — six inbound back-links added (`execution-pipeline`, `game-loop`, `localization`, `player-profile-store`, `ai-players`, `tutorial`) and one outbound return link (task page → [[wiki/features/tutorial]]). One **stale duplicate** `Related` entry removed from [[wiki/decisions/sprint-4]], which linked [[wiki/tasks/solo-win-condition-fix]] a second time while still describing `0022`'s suspicion as open.
- **Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings or credentials on any touched page; **no IPv4 literal of any kind** on either new page.
- **Reported, not fixed — outside this role's write surface:** `0022`'s brief still carries its wrong prescribed risk-3 fix and its false *"Before"* framing in the body text. Both are **struck in place** by that board's own convention and the close-out section supersedes them, so nothing is misleading *if read in order* — but the vault, not the brief, is where the correction is authoritative.
- Watermark advanced `6f0bb364fbbf43f4a4f36e7e0b11c494d5c7fd8d` → `82365bcc126e3671811370a845d8e58a359f7fbe`. No commit, no push.

## 2026-09-03 — ingest

- **Ingested:** `ai-agents/knowledge-base/glossary.md` (written the same day by the architect) →
  **created [[wiki/systems/glossary]]**, merged with the former Player Types / Team Types /
  bots-vs-Bot-team sections of [[wiki/systems/game-overview]].

**📌 Owner ruling of 2026-09-03 executed.** The owner ruled the glossary's home: the wiki ingests it,
merges it with `game-overview.md`, the vault **schema is amended** to accommodate a glossary page type,
and the knowledge base keeps only a short pointer. Stated reason, honoured here: *a KB glossary and a
wiki page covering the same ground is exactly how the two drift back apart* — so the deliverable is
**one source of truth**, not merely a new page.

**Vault shape chosen: a dedicated `wiki/systems/glossary.md`, cross-linked from `game-overview.md`**
— not an extension of `game-overview.md`. Reasons: (a) the material reaches well past the game
reference (player identity IDs, win-condition vocabulary, the two team-assignment paths), and
`game-overview.md` was already 132 lines of maps/economy/combat; (b) the vault's wiki-link convention
(`schema.md`, Cross-Reference Rules) has **no anchor form**, so a section inside another page cannot be
linked to — a single canonical link target requires a page of its own; (c) the vocabulary is
cross-cutting (win-condition work, profile/XP work, lobby work), which is a system page, not a
subsection.

**Schema amendment — made properly, not smuggled.** `schema.md` gains a **Glossary Page** type under
*Page Types & Templates*, with its template, its provenance, and four binding rules: exactly one
glossary and other pages link rather than restate; every term cites `file:line` or goes under
*Unverified*; a word/identifier divergence is never smoothed into prose; the owner's stated model is
kept beside the code, labelled, never overwritten. `glossary` was also added to *Canonical Systems to
Maintain Pages For*.

**🔧 Two claims on [[wiki/systems/game-overview]] were WRONG and were corrected against code, not
merged as written.**
1. *"the `HumansVsNations` game mode"* — ❌ **wrong.** `GameMode` has exactly two members, `FFA` and
   `Team` (`src/core/game/Game.ts:158-161`). `HumansVsNations` is a **`playerTeams` config value**
   (`Game.ts:57`), consumed at `src/core/game/GameImpl.ts:110-114` and `:156-162`. The glossary was
   right; the wiki was wrong.
2. *"Nations … present in singleplayer, missions, and the tutorial (when not disabled)"* — ❌
   **incomplete and partly wrong.** Nations are present in **public FFA** and in **private Team lobbies
   by default** (`src/server/MapPlaylist.ts:165`, `src/client/HostLobbyModal.ts:42`), and are **never**
   present in the tutorial: `src/client/LocalServer.ts:115-121` forces `disableNPCs = true`
   unconditionally for `isTutorial`. The glossary's lobby table was right; the wiki was wrong.

**Every load-bearing claim re-verified against the working tree before writing** — the glossary was not
taken on trust. Confirmed: the four-value `PlayerType` enum (`Game.ts:347-352`); `type Team = string`
(`:51`); `ColoredTeams` including `Bot` (`:59-70`); `teams()` returning `[botTeam, ...playerTeams]`
(`GameImpl.ts:696-701`); `maybeAssignTeam()` (`:463-472`); `assignTeams()`'s FakeHuman partition being a
shuffle-ordering detail only (`TeamAssignment.ts:61-73`); `isOnSameTeam()` excluding the Bot team
(`PlayerImpl.ts:800-802`); **`aiPlayerExecutions()` constructing `FakeHumanExecution`**
(`ExecutionManager.ts:154-162`); `BotExecution` 102 lines vs `FakeHumanExecution` 950; the 95 %/80 %
thresholds (`DefaultConfig.ts:713-718`); both win guards (`WinCheckExecution.ts:65-73`, `:109-114`); and
that **`grep -rn "AiPlayerExecution" src tests` returns nothing**.

**One precision the source glossary omitted, added here:** `teams()` returns `[]` outside
`GameMode.Team` (`GameImpl.ts:696-698`), so the Bot team is listed **in Team mode**. Also added
explicitly: the Bot team is **counted in win-check tile accounting** (`WinCheckExecution.ts:81-99`) and
is excluded from *winning* only by the later explicit guard — the point the "`isOnSameTeam()` returns
false" line is most often misread as denying.

**Partials reconciled — four copies reduced to one canonical page plus pointers:**
- [[wiki/systems/game-overview]] — its three vocabulary sections **replaced** by a short orientation
  pointer carrying the three load-bearing facts and both corrections, marked *do not re-grow*.
- [[wiki/systems/project-brief]] — its five-term product table (*Tick, Intent, Ghost player, Nations,
  Citizen*) **kept as-is and NOT absorbed**; it is product framing, a different register. Linked both
  ways, and the glossary states the split in its Summary.
- `ai-agents/knowledge-base/PROJECT.md:39-42` — the same five-term run-in, **outside the vault**; the
  KB-side pointer was returned to the caller for routing, not written here.
- `ai-agents/knowledge-base/geoconflict-overview.md:73-82` — **outside the vault, and being edited
  concurrently by the architect**; deliberately not cited by line. Its two stale claims are recorded on
  the glossary page against **code** instead.

- Pages created: **1** — [[wiki/systems/glossary]].
- Pages updated: **13** — `schema.md`, [[wiki/systems/game-overview]], [[wiki/systems/project-brief]],
  [[wiki/systems/agent-conventions]], [[wiki/systems/architecture-overview]],
  [[wiki/systems/execution-pipeline]], [[wiki/systems/player-profile-store]],
  [[wiki/features/ai-players]], [[wiki/features/tutorial]],
  [[wiki/decisions/clientless-leader-win-policy]], [[wiki/tasks/win-check-clientless-leader-guard]],
  [[wiki/tasks/tutorial-no-nations]], plus `index.md`.
- **Back-links: bidirectional.** All 11 pages the glossary links to now link back to it.
- **Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings, credentials, or IP literals on any
  touched page. `persistentID` is named as PII with **no value anywhere**.
- **Watermark deliberately NOT advanced** — this is an ingest, not a sync.
- **`ai-agents/knowledge-base/` was NOT written to.** The KB pointer is the caller's to route.
- No commit, no push.

## 2026-09-03 — ingest (closing pass: ADR-110, `0205` findings, `0207`, board reconciliation)

Sources read directly from the working tree (all uncommitted; a watermark-driven delta would not see
them):

- `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`
- `ai-agents/tasks/backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md`
- `ai-agents/tasks/backlog/0207-winmodal-participation-comment-ai-player-correction/brief.md`
- `ai-agents/sprints/backlog.md`, `ai-agents/sprints/plan-sprint-4.md` (counted, not just read)

**Created (3):**

- [[wiki/decisions/adr-110-ai-winner-allowed]] — ADR-110, accepted 2026-09-03. Slug abbreviated per the
  schema's standing ADR-naming style. 🔴 **Its known expiry is the FIRST thing on the page**, above the
  Context, in a blockquote: the owner accepted `allow` knowing a durable, player-visible winner surface
  is **planned** ("None today, but planned"), so the counter-argument was **overridden with eyes open,
  not refuted** — *"never answered on its merits, only deferred"* — and the ADR must be re-examined
  before any leaderboard, match history, announcements feed, share card or similar ships.
- [[wiki/tasks/teams-bot-team-win-stall]] — task `0205`, carrying the 2026-09-03 empirical findings in
  full, with the two caveats that must never be dropped: **production frequency is unmeasured** (a
  simulator result, not a field observation) and **the real activity crossover is probably higher than
  40 %**, because the "active" players were `FakeHumanExecution` at Medium.
- [[wiki/tasks/winmodal-participation-comment-correction]] — task `0207`.

**Updated (13):** [[wiki/decisions/clientless-leader-win-policy]] (ADR-110 as a fourth decision with the
expiry in a loud block; the `0206` promotion; the measured Team-mode correction; sub-question (b) now
partly ruled), [[wiki/tasks/win-check-clientless-leader-guard]], [[wiki/systems/glossary]] (§1 AI-player
entry, §2 brief-corrected-at-source note, §3 measured Team guard + `0206` status, Unverified list
amended in place), [[wiki/features/ai-players]] (Winner Flow), [[wiki/features/tutorial]],
[[wiki/decisions/sprint-4]] (re-count + the `0206` promotion), [[wiki/decisions/sprint-backlog]] (`0206`
moved out, `0207` appended, `0205` confirmed and rank held), [[wiki/decisions/adr-numbering-two-series]],
[[wiki/systems/player-profile-store]], [[wiki/systems/execution-pipeline]],
[[wiki/tasks/solo-win-condition-fix]], plus `index.md`.

**Every claim struck was struck in place, never deleted** — the vault's prior wording stays visible
next to the correction.

**Corrections the vault carried and that were resolved this run:**

- Six places said `0206` was *unscheduled / unstarted / nobody building it*. It is now **scheduled into
  Sprint 4** and **still unstarted**; every one now says both, because "scheduled" alone would
  overstate it.
- The win-policy page called the Team-mode 95 % route **rare** *because humans are already wiped out*.
  Measurement says rare **because humans play**. Struck and corrected; the realistic-shape conclusion
  survives, the reason for it did not.
- The glossary's Unverified "frequency: both unmeasured" bullet was amended, not deleted: the Team half
  is now measured **in a simulator only**; the FFA half was not measured at all.
- The glossary's §2 note said `0205`'s `maybeAssignTeam` mechanism claim was uncorrected at source. It
  **was** corrected on the brief 2026-09-03; the note now records that, and the vault and brief agree.
- Incidental: the glossary's AI-player entry pointed at "§4" for the win guard. The guards are in **§3**.
  Fixed.

**Board counts — counted independently by the wiki this run, and they AGREE with the producer's:**
`backlog.md` **37 task rows** (39 pipe-lines minus header and separator); `plan-sprint-4.md`
**62 task rows — 48 done (26 of them agent-closed) · 6 blocked · 4 backlog · 3 cancelled · 1 in
progress**. No disagreement to report.

- **Back-links: bidirectional.** Every page the three new pages link to links back.
- **Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings, credentials, or IP literals on any
  touched page.
- **Watermark deliberately NOT advanced** — this is an ingest, not a sync.
- **Nothing outside `ai-agents/wiki-vault/` was written.** `PROJECT.md`'s wiki-link-syntax defect is
  reported to the caller as replacement text, not edited.
- No commit, no push.

## 2026-09-03 — lint (closing health-check, `0206` moved-path sweep)

- **Issues found: 9 · fixed: 6 · flagged for human review: 3**
- **Most significant: `0206`'s `backlog/` → `done/` move DID rot one vault link, and eleven vault
  pages asserted `0206` was unstarted when it had already shipped and closed.**

### 🔴 The `0206` moved-path verdict — NOT CLEAN (unlike the `0022` move checked the same morning)

`ai-agents/tasks/backlog/0206-ffa-timer-expiry-award-to-top-client-player/` →
`ai-agents/tasks/done/…`. Swept exhaustively: every `0206` occurrence in every file under
`ai-agents/wiki-vault/`, then separately every markdown relative link (`](../`) in the whole vault.

- **One rotted link, and it is the only relative markdown link in the entire vault:**
  `wiki/decisions/adr-110-ai-winner-allowed.md` line 36 —
  `[`0206`](../../tasks/backlog/0206-…/brief.md)`. **It was doubly broken:** the board is now `done/`,
  **and the depth was already wrong before the move** (`../../` from `wiki/decisions/` lands in
  `wiki-vault/`, not `ai-agents/`; it needed `../../../`). **FIXED** — rewritten as a backticked
  `ai-agents/tasks/done/…` path, the vault's dominant convention. **The vault now contains zero
  relative markdown links.**
- **`log.md:1409` also names the old `backlog/` path. LEFT UNEDITED, deliberately** — append-only
  record; that path was correct on the date written.
- Every other `0206` mention is a bare task ID, not a path, and could not rot.

### Fixed (6)

1. **The rotted `adr-110` path link** (above).
2. **Stale `0206` status across eleven pages** — all said `🔲 Backlog` / unstarted / unscheduled;
   `0206` was **planned, built, reviewed and closed the same day** as
   `✅ Done (agent-closed — not owner-verified)`. Struck in place, never deleted, on `index.md`,
   `decisions/adr-110-ai-winner-allowed`, `decisions/clientless-leader-win-policy`,
   `decisions/adr-101-fail-soft-xp-crediting`, `decisions/sprint-4`, `decisions/sprint-backlog`,
   `tasks/win-check-clientless-leader-guard`, `tasks/teams-bot-team-win-stall`,
   `tasks/winmodal-participation-comment-correction`, `systems/glossary`, `features/tutorial`.
   🔴 **Every one now also carries the three load-bearing residuals** — nothing run live (no deploy,
   no production observation, no owner play-test, so **production still has the old behaviour**); the
   XP loss **still open** where every clientful player is eliminated before the threshold; and public
   FFA **now ends at 80 %**, possibly crowning a player holding very little territory.
3. **Sprint 4 counts** — `48 done · 4 backlog · 26 agent-closed` → **`62 rows — 49 done (27
   agent-closed) · 6 blocked · 3 backlog · 3 cancelled · 1 in progress (`0064`)`**, on `index.md` and
   `decisions/sprint-4`. **Counted independently from `plan-sprint-4.md` this run; agrees with the
   producer's.**
4. **`0206` had no row on the vault's Sprint 4 task table.** Row added, carrying the shipped scope,
   the review outcome (Codex "No findings."; three low Claude findings dispositioned; `npm test`
   109 suites / 1133 tests green first-run) and the nine residuals.
5. **The `placement` / `points` conflation was not *stated* wrongly anywhere, but nothing in the vault
   made it hard to re-conflate.** A canonical keep-them-apart table now lives on
   `decisions/clientless-leader-win-policy`, with pointers from `tasks/win-check-clientless-leader-guard`
   and `features/tutorial`. Verified against `src/client/leaderboard/LeaderboardReporter.ts:44-59`:
   `reportPlacement` passes **only `params.points`** to `increaseCurPlayerLeaderboardScore`;
   `placement` (a literal `1` for everyone) is read **only** by a `console.debug` under a TODO and
   **never leaves the browser**. The **points DO reach the Yandex platform** — 10 for losing to a bot
   in non-tutorial Singleplayer, and farmable. `0209` owns the first, `0210` the second.
6. **Four one-way links** — back-links added on `decisions/adr-101-fail-soft-xp-crediting`,
   `tasks/winmodal-participation-comment-correction` (×2) and `decisions/adr-110-ai-winner-allowed`.
   Re-verified: **zero one-way links vault-wide.**

### Flagged, not fixed (3)

1. **`0206` has NO wiki task page**, though it is now a closed Sprint 4 row cited by ten pages. Its
   brief carries nine residuals. **Creating the page is an ingest, not a lint** — flagged in place on
   `decisions/sprint-4` and `decisions/clientless-leader-win-policy`. Same for `0208`, `0209`, `0210`;
   only `0207` of the four spawned briefs has a page.
2. **`0210` has a brief but no board row** on `ai-agents/sprints/backlog.md` as of this run — a
   producer was editing that file concurrently. **Outside the vault: reported, not touched.** Every
   vault mention says "briefed, no board row yet as of this lint" rather than asserting placement.
3. **Task `0052`'s legacy-filename census has drifted from its brief.** The brief's 2026-08-10 table
   names 9 pages / 12 occurrences; the page set in the tree today differs (some listed pages are now
   clean, others not listed carry hits). **Not repaired** — `0052` is the owned task for it, with an
   owner-ratified sequencing gate and a hard `log.md`-untouched constraint. It needs a re-census at
   task time.

### Verified clean this run

- **Broken wiki-links: 0. Index entries with no file: 0. Pages missing from `index.md`: 0.
  One-way links: 0.**
- **`src/…` references: 117 distinct, all resolve.** (One apparent miss,
  `src/core/game/MapNationCounts.js`, was a scan artefact — the real file is `.json` and exists.)
- **ADR cross-check: 10 vault ADR pages, 10 knowledge-base ADRs, numbers compared numerically and
  case-insensitively over regular files only.** No missing counterpart, no heading/filename mismatch,
  **no duplicate number in the knowledge base.** Nine slug abbreviations are the vault's standing
  style per `schema.md` and are **not** flagged.
- **Metadata: 0 gaps.** Every page carries its template's bold inline fields; no YAML frontmatter.
- **Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings, credentials or private IPs.
- **`0208`'s scope is asserted settled NOWHERE** — it is in flight; every mention says so.
- **`.wiki-watermark` deliberately NOT advanced** — this is a lint, not a sync.
- **Nothing outside `ai-agents/wiki-vault/` was written.** No commit, no push.

## 2026-09-03 — ingest (`0206` close + the four briefs it spawned)

- **Ingested:** `ai-agents/tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md`
  (plus its `plan.md`, `review.md`, `worklog.md`) and the `0208` / `0209` / `0210` briefs under
  `ai-agents/tasks/backlog/` → **created 4 pages**, **updated 14**.
- **Run on an owner ruling** given live in session, closing the gap the same day's lint had flagged
  rather than fixed: *ship the vault complete, not accurate-with-a-marked-gap.*

### Created

- [[tasks/ffa-clientless-leader-fallback-award]] — `0206`. The shipped award, the ranking and
  tie-break, the multiplayer-only carve-out that discharges the tutorial re-check, the review outcome,
  and **all nine residuals in full**.
- [[tasks/measure-clientless-leader-and-solo-awards]] — `0208`, **both halves**.
- [[tasks/placement-semantics-literal-one]] — `0209`.
- [[tasks/singleplayer-leaderboard-reporting-policy]] — `0210`.

### 🔧 Two corrections to THIS LINT'S OWN OUTPUT, both verified before being written

1. **`0210` DOES have a board row.** The earlier lint reported *"briefed but no board row yet"* and
   wrote that into three vault pages. **Verified directly this run:** `ai-agents/sprints/backlog.md`
   line **59** carries `0210`, with `0208` at `:57` and `0209` at `:58`. **All three vault statements
   corrected.** ⚠️ **Honest account of the cause: partly a live edit, partly my own bad method.** The
   file demonstrably changed between the two reads — `0208`'s row gained escaped pipes that shifted its
   columns. But the earlier check split table rows on `|`, which is **unreliable on any row containing
   an escaped pipe**, so it cannot be blamed wholly on the race. **The earlier read was wrong; that is
   the finding.**
2. **`0208`'s scope is SETTLED, not in flight.** The earlier lint wrote *"scope being widened, NOT
   settled — do not cite its shape"* into three pages. The producer finished; the widening is an owner
   ruling (*"Add it — measure both"*). **All three corrected**, and the shape is now recorded: **Part A**
   multiplayer clientless-leader incidence (`src/core/`), **Part B** Singleplayer platform-leaderboard
   award incidence (`src/client/`), via **both** `reportPlacements()` **and** `reportParticipation()`.
   ⛔ **Not to be merged.** ⛔ **Part A excludes AI players** — an AI-player win is a normal win under
   ADR-110, not a stall.

### Facts carried because they contradict Part A and must not be copied across

- 🟢 **Part B has NO over-count problem.** `ClientGameRunner`'s `hasReportedParticipation` and
  `hasProcessedWin` are **pre-existing production latches**, and Singleplayer runs a **single in-browser
  client** (`Transport.ts`, `isLocal`). 🔴 **So Part B's denominator is MATCHES, not client-matches** —
  ⛔ Part A's denominator caveat must never be written onto Part B's events.
- ⚠️ **One residual deliberately left unverified there:** whether a **mid-match page reload** resets
  those latches. Recorded as unverified, **not resolved either way.**
- ⚠️ **`0208`'s folder name deliberately under-describes it now** — renaming would break inbound links,
  including ones `0206`'s close had just re-pointed. **Said so on the page** so nobody "fixes" it.

### ⏳ Recorded as PENDING, never as passed

**`0206`'s play-test is IN FLIGHT** — an `fkit-coder` driving the real browser client headlessly, on an
owner ruling. **The result is not in.** It is recorded as pending on
[[tasks/ffa-clientless-leader-fallback-award]] and on [[decisions/sprint-4]]'s `0206` row; **`0206`'s
gate and residual 3 ("nothing has been run live") stand exactly as the lint left them.** ⛔ No page
reads it as a pass or a discharge.

### Also cleared / updated

- **Both in-place `LINT NOTE` gap blocks removed** — on [[decisions/sprint-4]] and
  [[decisions/clientless-leader-win-policy]] — replaced by real links to the new pages. The third, on
  [[decisions/sprint-backlog]], likewise.
- **Updated:** `index.md` (4 new catalog entries + 2 corrections), [[decisions/sprint-4]],
  [[decisions/sprint-backlog]], [[decisions/clientless-leader-win-policy]],
  [[decisions/adr-110-ai-winner-allowed]], [[decisions/adr-101-fail-soft-xp-crediting]],
  [[tasks/win-check-clientless-leader-guard]], [[tasks/teams-bot-team-win-stall]],
  [[tasks/winmodal-participation-comment-correction]], [[systems/glossary]], [[systems/analytics]],
  [[systems/execution-pipeline]], [[systems/player-profile-store]], [[features/tutorial]],
  [[features/ai-players]].
- **`0052`'s census drift: LEFT ALONE on an owner ruling** — it waits for when `0052` is scheduled. The
  re-census is that task's own work, it has a sequencing gate and a hard `log.md`-untouched constraint,
  and a partial answer now would look authoritative. The existing flag stands unchanged.

### Verified after the ingest

- **172 pages. Broken wiki-links 0 · index entries with no file 0 · pages missing from `index.md` 0 ·
  one-way links 0.** Every new page's outbound link has a back-link.
- **`src/…` references: 111 distinct, all resolve.**
- **Metadata:** all four new pages carry the task template's bold inline `**Source**` / `**Status**` /
  `**Sprint/Tag**` fields. No YAML frontmatter.
- **Secret scan: CLEAN.** No keys, tokens, DSNs, connection strings, credentials or private IPs.
- **`.wiki-watermark` NOT advanced** — this is an ingest, not a sync. Still
  `82365bcc126e3671811370a845d8e58a359f7fbe`.
- **Nothing outside `ai-agents/wiki-vault/` was written.** No commit, no push.

## 2026-09-04 — sync

- **Sync window:** `82365bcc126e3671811370a845d8e58a359f7fbe` → HEAD (`71246ebfe3873b952acf1ae8c52c2ec81c28f5d6`)
- **Commits in window: 2** — `8f6e478` (2026-09-03) and `71246eb` (2026-09-04), both *"Sprint push"*.
- **Changed files in window: 58.** Ingest-worthy after filtering: **12**.

### 🔧 The window was derived, and it needed a correction the watermark alone does not give

`.wiki-watermark` read `82365bc`, which is **`8f6e478`'s own parent** — the watermark was advanced by
a sync *during* the work that later landed as `8f6e478`, and that commit then also carried the
`0206`-close ingest and the closing lint (both of which deliberately did **not** advance it). So
`82365bc..HEAD` **over-reports**: every source in `8f6e478` was already ingested, as this log's own
2026-09-03 entries record and as the vault pages created in that same commit confirm.

⇒ **The genuinely un-ingested delta is `71246eb` alone.** `8f6e478` was re-checked file by file
against existing pages and needed **no new ingest**; its sources' pages were updated only where
`71246eb` falsified them.

### Ingested (`71246eb`)

- `ai-agents/tasks/backlog/0211-…/brief.md` → **created** [[tasks/credit-participation-xp-elimination-or-match-end]]
- `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md` → carried onto [[tasks/credit-participation-xp-elimination-or-match-end]] and [[systems/player-profile-store]] (⛔ **cited, not duplicated** — the report stays the design authority)
- `ai-agents/knowledge-base/decisions/adr-110-…md` → updated [[decisions/adr-110-ai-winner-allowed]]
- `ai-agents/tasks/done/0206-…/brief.md` → updated [[tasks/ffa-clientless-leader-fallback-award]]
- `ai-agents/tasks/backlog/{0205,0207,0208,0209,0210}/brief.md` → updated their five pages
- `ai-agents/sprints/plan-sprint-4.md` → updated [[decisions/sprint-4]]
- `ai-agents/sprints/backlog.md` → updated [[decisions/sprint-backlog]]

**1 page created, 15 updated** (+ `index.md`). **171 → 173 pages** *(172 at the last lint; `0211` is the 173rd — the 172→173 step is this run's single creation).*

### 🔴 The headline: `0206` was REVERTED, and ~35 pages described it as shipped

**Reverted 2026-09-04 on an owner ruling; never deployed.** The correction is carried **loudly and in
the reader's path**, not in a footnote — a **STOP box above the `Goal`** on
[[tasks/ffa-clientless-leader-fallback-award]], and a marker **beside the `Status` field itself**, so
`Status: done` cannot be read as live behaviour. `done` was **kept deliberately**: the *work* was done,
the *effect* was reverted, and only the first is a status.

**Stated with the three claims kept apart, on every page that carries it:** ✅ `0206` did what its
approved plan specified and **the plan's PREMISE was wrong**; ⛔ **NOT** "it was buggy"; ⛔ **NOT** "it
caused the stall".

**Two findings recorded as MEASURED, never as reasoned:** (1) `0206` was a **no-op in the case that
loses the XP** — a Nation reached **100.0 %** of the map with the match still not ending, because
`players()` filters to `isAlive()` (`src/core/game/GameImpl.ts:421-423`); (2) its **only** live effect
was the behaviour the owner **reproduced and rejected** — crowning a survivor on ~0.5 % against a bot
on 80.2 %. ⇒ **Participation XP is genuinely LOST, not delayed** (`creditMatchXp`'s sole call site is
inside `handleWinner`, `GameServer.ts:1199`).

✅ **The play-test PASS and the review result are recorded as STANDING, not retracted** — what changed
is the *value* of what was tested, not the result.

⚠️ **Recorded on four pages: `WinCheckExecution.ts` is deliberately NOT byte-identical to its
pre-`0206` state.** ✅ **Verified this run against `82365bc`..`HEAD`: the only residual diff is the
four-line ADR-110 comment the revert kept on purpose** — the **only in-code trace of ADR-110 in the
repository**. Also recorded: the revert removed `0206`'s `smallID` tie-break.

### Claims in the vault that CONTRADICTED the delta, and how each was resolved

All struck-not-deleted, per this vault's convention:

1. **`index.md`: "✅ `0206` SHIPPED 2026-09-03 with the predicate intact"** → struck; replaced with
   *"ADR-110 now rules on a predicate that exists in NO shipped code"*.
2. **ADR-110's Consequences: "Public FFA matches where every human dies now complete and credit XP"**
   → **STRUCK as false — and false when written, including at acceptance.** Cause recorded: it was a
   degraded restatement of **T3** that dropped T3's own *"while AI players are still alive"*
   qualifier. **T3 itself is sound.** Status stays `accepted`; the decision is **not** superseded.
3. **ADR-110's re-raise pointer cited `0206`'s phase-1 measurement** → **corrected to `0208`**; the
   trigger is recorded as **still unfired and still live**.
4. **"The pre-fix baseline is permanently unmeasurable"** (3 pages) → **REVERSED**: `0206` never
   deployed, so `0208`'s Part A clock **stopped**. It is **`0211` shipping** that would destroy it.
5. **"Public FFA now ends at 80 %"** (4 pages) → struck; that never reached a player.
6. **`0206`'s residual 4 ("XP loss still open in a corner case")** → **PROMOTED**: measurement showed
   it is *the* case. Its text was accurate; only its **weight** changed. ⚠️ Residuals 1–3 and 5–9
   explicitly **not** re-weighted.
7. **"`checkWinnerTeam()` byte-identical ⇒ Team unaffected"** → corrected on 5 pages: the **same guard
   shape** means Team loses its XP **identically**. ⚠️ **Reported by the revert coder, NOT re-verified
   by symbol** — recorded that way everywhere.
8. **`0209` / `0210`'s `0206` frequency and line-number claims** → struck; both tasks' **defects are
   unaffected**, and `0210`'s claim is now true in a *stronger* sense.

### Recorded as HYPOTHESIS, never as established

⚠️ **The Nation case has been assumed twice and observed ZERO times in a public lobby.** Only a **Bot**
was ever seen crossing the threshold; public FFA runs with Nations **enabled** while the play-test ran
with them **off** — so **the untested case is the one production has.** Written onto
[[decisions/clientless-leader-win-policy]] as a hypothesis.

### Also carried

- **`0208` and `0211` scheduled into Sprint 4.** 🔴 **ORDERED: `0208` deployed and collecting data
  before `0211` SHIPS** — ✅ **planning and building `0211` in parallel is explicitly allowed**;
  ⚠️ **only the ship is ordered, and NEITHER task is `🚧 Blocked`.** Recorded that way on all five
  pages that mention it, because the over-strict reading is the likely failure.
- **`0208` raised to `High` with SPLIT provenance** — the **raise** is an owner ruling, the **value**
  is the producer's. ⛔ Never restated as *"the owner ranked it High"*.
- **`0211`'s traps:** `0210`'s ruling is **leaderboard POINTS, not profile XP** (⛔ not to be read
  across); the **leaver-rule reversal is deliberate** and **narrows, not deletes**, the exclusion;
  XP **holds at 10 flat** as a deliberate hold; *"fix the stall"* was **considered and not chosen as
  the SCOPE decision, but is NOT forbidden as the MECHANISM.**
- **From the architect's report:** ✅ **idempotency already exists and is verified at the database
  layer** — `(game_id, yandex_player_id)` primary key with the XP increment gated on the insert,
  tested against real Postgres **including the concurrent case**; 🔴 **the server does not learn a
  player was eliminated — the central design problem**; ⛔ **`GameServer.end()` is the WRONG seam.**
  All three onto [[systems/player-profile-store]] and the `0211` page.
- **Timer branch unreachable in public matches** (`MapPlaylist.ts`) — ⚠️ and the report's note that
  `GameImpl.players()` filters to alive while `GameView.players()` does not was added to
  [[systems/glossary]], since that is where the misconception forms.

### Verified after the sync

- **173 pages. Broken wiki-links 0 · index entries with no file 0 · pages missing from `index.md` 0 ·
  one-way links 0** (4 found and fixed: on `adr-103-identity-trust-seam`,
  `measure-clientless-leader-and-solo-awards`, and two onto the new `0211` page).
- **`src/` / `tests/` / `migrations/` references: 160 distinct, all resolve.**
- **Metadata:** the new page carries the task template's bold inline `**Source**` / `**Status**` /
  `**Sprint/Tag**`. No YAML frontmatter.
- **Secret scan: CLEAN.**
- **Own Sprint 4 re-count, direct from `plan-sprint-4.md`: 64 rows — 49 done (27 agent-closed) ·
  6 blocked · 5 backlog · 3 cancelled · 1 in progress (`0064`).** Was 62 rows / 3 backlog.
- **`.wiki-watermark` ADVANCED** `82365bcc126e3671811370a845d8e58a359f7fbe` →
  `71246ebfe3873b952acf1ae8c52c2ec81c28f5d6`.
- **Nothing outside `ai-agents/wiki-vault/` was written. No commit, no push.**

### ⚠️ Outside the vault — reported, NOT fixed

- **`ai-agents/sprints/plan-sprint-4.md`, `0206`'s row** says the replacement `0211` is *"unscheduled
  on `backlog.md`"*. **Stale within the same commit** — `0211`'s own row three lines below records it
  as promoted into Sprint 4.
- **`ai-agents/tasks/done/0206-…/brief.md`** says the same in two places (STOP box and status table).
- ⚠️ **Both are producer-owned files. The vault records the correct state; the boards do not.**

## 2026-09-04 — lint

- Issues found: 24
- Issues fixed: 20
- Issues flagged for human review: 4
- **The `0206` revert framing did NOT hold everywhere — the sync missed two pages entirely and left
  stale shipped-language on four it had touched.** Worst: [[decisions/sprint-4]]'s `0206` board row
  still read `**Shipped:** …` and *"public FFA now ends at 80 %"*, and still carried the superseded
  *"play-test IN FLIGHT, result NOT IN"* note. All corrected.

### 🔴 Pages the sync MISSED — neither was in its modified set

- **[[features/tutorial]]** — *"✅ RE-CHECK DISCHARGED 2026-09-03: `0206` **shipped** and did NOT
  reintroduce it"*, plus a Related line describing the award in the present tense. Corrected: the
  re-check is **still discharged, and now in a stronger sense** — there is no award branch left at
  all. ⚠️ The `0022` guard is a different thing and it stays; that is stated in place.
- **[[systems/execution-pipeline]]** — *"which **restored** the `Win` update on the FFA
  clientless-leader path"* and *"which players the **restored** `Win` update may name"*. The `Win`
  update is **not** restored. Corrected, with the ADR-110-comment nuance carried.

### 🔴 Stale shipped-language on pages the sync DID touch

- **[[decisions/sprint-4]]** — the `0206` table row (the sync edited only the page header, not the
  row); *"`0206` was planned and **shipped**"*; *"the **shipped** award"*.
- **[[tasks/teams-bot-team-win-stall]]** — a **duplicate** Related entry for `0206`: the sync fixed
  the first and left the second reading *"**shipped 2026-09-03**"*. Duplicate removed, survivor
  corrected. Also *"`0206` **shipping** does NOT advance this task"*.
- **[[tasks/win-check-clientless-leader-guard]]** — *"the award that **closes** the XP residual"*.
- **[[tasks/ffa-clientless-leader-fallback-award]]** — three present-tense Related lines (*"closes"*,
  *"unblocks"*, *"may **now** be named winner"*).
- **`index.md`** — the `clientless-leader-win-policy` entry **contradicted itself in one line**:
  it opened *"LIVE IN PRODUCTION and **fixed only in the repo**"* and later said *"the defect is fixed
  NOWHERE"*. Lead phrase struck and corrected.

### 🆕 A second survivor of the revert, which the sync did not find

**`tests/server/GameServerWinner.test.ts` (135 lines) also survives** — the vault asserted the ADR-110
comment was *"the ONE exception"*. ✅ Verified: `git diff 82365bc HEAD -- src/ tests/` is **exactly two
files** — `WinCheckExecution.ts` (`+4`) and `GameServerWinner.test.ts` (`+135`). ✅ The test still
passes (run at this lint) because it never tested the fallback award; it tests the **ordinary**
`handleWinner` → `creditMatchXp` path. 🔴 Recorded with what it does **not** cover: it proves crediting
fires *given a winner message*, and says nothing about the stall, where no winner message is ever sent.
✅ The four tests added to `WinCheckExecution.test.ts` **were** reverted — that file is byte-identical
to `82365bc`. The **four-line** ADR-110 comment claim is exact (one blank + three comment lines).

### Measured-vs-inferred distinctions that had been lost

- 🔴 **The Nation hypothesis lived on ONE page.** Five other pages asserted *"a Nation reached 100.0 %
  of the map"* as measured; three of them ([[decisions/sprint-4]], [[systems/glossary]], `index.md`)
  gave **no private/public marker at all**. The caveat — **assumed twice, observed ZERO times in a
  public lobby; only a Bot was ever seen crossing the threshold; public FFA runs with Nations enabled
  while the play-test had them off** — was added to those three and to
  [[tasks/ffa-clientless-leader-fallback-award]], each pointing at the canonical statement on
  [[decisions/clientless-leader-win-policy]].
- 🔴 **ADR-110's struck bullet was regrowing in other pages' own words.** Five sites restated T1 as
  *"what the award does is unblock crediting for every real player"* **without T1's qualifier** — the
  exact degradation that produced the false bullet. The qualifier (*only where a **living clientful**
  player exists to award to*) was added at the source ([[decisions/adr-110-ai-winner-allowed]]) and at
  all four restatements, each naming the failure mode explicitly.

### Stale `file:line` claims — all caused by the revert shifting `WinCheckExecution.ts`

13 refs across [[systems/glossary]] (9), [[tasks/win-check-clientless-leader-guard]],
[[systems/game-overview]], [[decisions/sprint-4]] and `index.md`, each re-verified by symbol:
`checkWinnerFFA()` `:40-82`, `checkWinnerTeam()` `:84-123`, the clientless branch `:69`, the FFA guard
`:69-77` (`setWinner` `:78`, deactivation `:80`), the Team guard `:113-118`, the timer branch
`:110-111`, tick gate `:27-30`. **All other cited symbols re-verified and correct** —
`GameImpl.players()` `:421-423`, `makeWinner()` `:668-675`, `teams()` `:696-701`,
`GameView.players()` `:632-634`, `creditMatchXp` `:1253` / sole call `:1199`,
`MatchQualification` `:43-45` and `:74-100`, `LeaderboardReporter` `:44-59`, `MapPlaylist`
`:162`/`:165`/`:169`, `DefaultConfig` `:713-718`, `GameRunner` `:89-93`/`:147`.

### A code-level difference nobody had written down

Recorded on [[systems/glossary]]: **the two guards' PREDICATES are not the same.** FFA guards on
**clientlessness** (`max.clientID() === null`) — Bots *and* Nations. Team guards on **team identity**
(`max[0] === ColoredTeams.Bot`) — **only** the `ColoredTeams.Bot` team, so a *named* team led by
Nations is **not** guarded there. ⇒ *"same guard shape"* is accurate **only for the bot-team-led
case**, which is how every source states it. ⛔ Do not widen it. This is the code-level reason the
all-Nations-team case the owner deferred to `0205` is a real gap.
⚠️ **The *"reported, not re-verified by symbol"* flag on the Team XP-loss claim was deliberately NOT
upgraded** — it survives on all its carriers. A lint reads structure; the flagged claim is behavioural.
What the lint checked, and what it does not discharge, is recorded in place.

### Verified clean

- **173 pages. Broken wiki-links 0 · index entries with no file 0 · pages missing from `index.md` 0 ·
  orphans 0 · one-way links 0.**
- **Metadata:** 0 pages missing a required inline field; **no YAML frontmatter anywhere.**
- **ADR cross-check:** 10 vault ADR pages, 10 knowledge-base counterparts, **no missing counterpart,
  no number collision, no heading/filename mismatch.** All 9 slug differences are the **accepted
  abbreviation style** (`schema.md`) and are **not** flagged.
- **Source refs:** 608 in pages, all resolve. One deliberate exception:
  `resources/images/Favicon.svg` on [[tasks/licensing-remediation]], which the page itself records as
  **deleted** — correct as written.
- **Secret scan: CLEAN.**
- **`0208` / `0211` ship-ordering:** checked on all 7 carriers — **neither is `🚧 Blocked`**, both are
  `🔲 Backlog`, and every carrier states that **planning and building `0211` in parallel is allowed**
  and only the **ship** is ordered. **No page has hardened it into a blanket block.**
- **Own Sprint 4 re-count, direct from `plan-sprint-4.md`: 64 rows — 49 done (27 agent-closed) ·
  6 blocked · 5 backlog · 3 cancelled · 1 in progress (`0064`).** Agrees with the sync and the caller.
- **`.wiki-watermark` UNTOUCHED** at `71246ebfe3873b952acf1ae8c52c2ec81c28f5d6` — this was a lint.
- **`0052`'s legacy-filename census: not touched**, by the sync or by this lint.
- **Nothing outside `ai-agents/wiki-vault/` was written. No commit, no push.**

### ⚠️ Flagged — outside the vault, reported not fixed

- **`ai-agents/tasks/done/0206-…/brief.md`, the follow-up table (`0208`'s row)** says `0208` is
  *"Backlog — unscheduled"*. **Stale** — `0208` was promoted into Sprint 4 on 2026-09-04 and raised
  to `High`. Producer-owned.
- 🔧 **CORRECTION to the sync's own two outside-vault flags: BOTH are already fixed in the tree, and
  neither is stale as described.** `plan-sprint-4.md`'s `0206` row reads
  `~~unscheduled on backlog.md~~ — ✅ **CORRECTED 2026-09-04: `0211` is SCHEDULED INTO SPRINT 4**`, and
  both mentions in `0206`'s brief (lines 52 and 107) are **struck, not standing.** The sync read the
  struck text as live. **Do not route these to the producer.**

### ⚠️ Flagged — needs an owner call

- **[[decisions/sprint-4]]'s table carries 42 of the board's 64 rows** (a curated subset by long
  standing). Two rows were added this lint (`0208`, `0211`) because the page's own header says they
  were scheduled and they are the sprint's live work. **Whether this table should mirror the board or
  stay curated is not a lint decision.**

---

## 2026-09-04 — targeted correction ("the profile host is live" — the vault's last copy)

**Scope: ONE stale claim and its sweep. Not an ingest, not a sync, not a lint** — the caller scoped it
that way explicitly and no broader pass was run. **`.wiki-watermark` UNTOUCHED.**

**The claim, and the ruling that kills it.** [[systems/project-brief]] `:64` read *"the profile host is
live"*. **Owner ruling, given live in session 2026-09-04:** *"We don't have ANY profile-related VPS
yet, we would need to have a full-scale setup for it (whatever is needed)."* The host is gone, or
never properly stood. The owner has since ruled a **clean-slate rebuild** — new VPS, new S3 bucket,
new `age` keypair — tracked as **`0213` (epic) → `0222`, plus `0201`**, all scheduled into Sprint 4.

⛔ **The opposite error is equally wrong and is guarded against in every edit below: the profile
backend WAS built.** Service code, Docker image, `setup-profile.sh` (~1,025 lines — genuinely
provisions a bare box *and* deploys the stack), `build-deploy-profile.sh`, the backup script with a
scripted restore path, and a complete operator runbook all exist and are sound. **Only the running
machine is missing.**

**Provenance.** A producer applied the same correction at **13 sites outside the vault** the same day
(`PROJECT.md:181`, `architecture.md`'s topology diagram, four `plan-sprint-4.md` sites, and briefs for
`0013`, `0191`, `0187`, `0064`, `0195`), and deliberately left the vault alone under ADR-005. Full
grounding, including a three-column *exists in the repo / never run in production / believed true but
now known false* table at its §0:
`ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

### Fixed — 15 pages, 22 sites (strike-not-delete, dated, per the vault's standing style)

- [[systems/project-brief]] — `:64` **the named site**; plus the four-tier paragraph (*"three
  self-hosted VPS fleets"* → **two stand, not three**) and a new Gotchas bullet, because this is the
  claim most likely to mislead a reader of this vault.
- [[systems/player-profile-store]] — read-first banner; *Summary* (**"It runs as…"** → designed and
  scripted to run); the *Dedicated host* bullet; the backup gotcha; the payments-503 gotcha reframed.
- [[systems/architecture-overview]] — *Profile backend tier* banner; *Deployment* (**three fleets →
  two**); the profile deploy bullet, which also now carries the gaps behind *"well hardened"* (no log
  rotation, no image prune, no monitoring, no OS hardening, `restart: on-failure`).
- [[decisions/sprint-4]] — the T4-complete claim (*"The profile box is live"*), the T4e2–T4i
  consequence (*"a live 200/TLS profile host"*), the `0195` board row, the `0062` board row, and the
  page's opening state paragraph.
- [[decisions/config-parity-failure-class]] — banner + the `0195` table cell. **The failure class is
  untouched and all three instances stay real.**
- [[decisions/profile-deploy-hardening-review-loop]] — *"operator bring-up of the live host"*.
- [[tasks/profile-server-bring-up-runbook]] — the strongest stale claim in the vault (*"the real reg.ru
  host is provisioned, DNS points at …, HTTPS `/health` returns 200 over valid TLS"*), plus the
  **`PROFILE_INTERNAL_TOKEN` trap** and the rebuild's open decisions.
- [[tasks/profile-vps-provisioning]] — *"The provisioned host establishes…"* / *"The live host still
  needs…"*, plus the gaps this slice never covered.
- [[tasks/postgres-backup-routine]] — **no backups are running**; the three durability gaps, including
  the `age` key with no recorded home.
- [[tasks/profile-match-end-crediting]] — the reason it no-ops is bigger than `0062`.
- [[tasks/profile-backend-db-api]], [[tasks/profile-onbox-stack-gate]],
  [[tasks/profile-game-server-deploy-env]], [[tasks/player-profile-store-investigation]],
  [[tasks/citizenship-xp-progress-ui]] — shorter notes in the same shape.
- [[tasks/yandex-payments-secret-forwarding]], [[tasks/yandex-payments-implementation]],
  [[tasks/citizenship-name-change]] — the *"503s on the real box"* narrative. ⛔ **`0195`'s CODE FIX
  STANDS** — that guard is written into every one of those edits, per the survey's §7.
- `index.md` — 7 entries updated ([[systems/project-brief]], [[systems/player-profile-store]],
  [[tasks/profile-vps-provisioning]], [[tasks/profile-server-bring-up-runbook]],
  [[tasks/postgres-backup-routine]], [[tasks/profile-match-end-crediting]], [[decisions/sprint-4]]).

### Recorded as inference, never as fact

**Match-end XP crediting has almost certainly never worked in production** — `0062` exists precisely
because `PROFILE_INTERNAL_TOKEN` never reached the production game server, and there is now no host it
could have credited. **Nobody measured it.** Every page that carries it carries that qualifier.

### ⚠️ Flagged — not fixed, deliberately

- **[[tasks/citizenship-name-change]]'s "the code shipped" claim was NARROWED, not resolved.** The
  ancestry check proves `0067`'s code is in the **game** release `362a2f9`; its three profile-server
  routes and migration 004 ship in a **separate image to a separate box that does not exist**. Whether
  those routes ever ran on the box that used to stand **is not established anywhere I could see**, and
  I did not assume it either way.
- **[[decisions/sprint-4]] and `index.md` do NOT yet carry the `0213`–`0222` rows or a re-count.** The
  rebuild tasks are named in the corrections but the board table and the counts are unchanged — that
  is ingest work, and no ingest was authorized in this pass.
- **A broader ingest of 2026-09-04's profile-backend work is RECOMMENDED and was NOT run.** See the
  reply to the caller.

## 2026-09-04 — correction to the correction ("there is NO profile VPS" was an overstatement)

**This entry SUPERSEDES the framing of the 2026-09-04 entry above, *"targeted correction ('the profile
host is live' — the vault's last copy)"* (`log.md:2052`).** That pass was instructed, on what was
presented as an owner ruling, that **there is NO profile VPS**, and it faithfully wrote that into the
vault. ⛔ **The instruction overstated the owner's position; the owner has since corrected it. This is a
correction to the caller's error, not to that pass's work** — the pass did what it was told, and every
guard it wrote that is still true has been kept.

Per this vault's own convention the earlier entry **stays in the append-only log exactly as written**
(the same treatment `schema.md` gives the superseded public-hostname lint entries). It is **superseded,
not open**, and a future lint must not re-raise its claims.

### The framing that now stands

Two owner rulings of 2026-09-04, **both given live in session, both true, neither discarded**:

1. *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it
   (whatever is needed)."*
2. On a direct follow-up: *"We don't need to cancel any billings, the VPS and S3 I created will be
   reused."*

> 🔴 **Reconciled: a profile VPS and an S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE. What is on
> them — provisioning state, what runs, what the bucket holds — is UNKNOWN AND UNVERIFIED. Hardware
> existence and provisioning state are two different facts, and only the first one is known.**

🔴 **"Clean slate" now means WIPE AND REBUILD ONTO EXISTING RESOURCES, not procure new ones.** The
owner's *"I think I am completely lost here about what was done and what wasn't"* is the honest state
of the provisioning, and **that uncertainty is itself the fact recorded** — not a claim in either
direction. Source of the wording: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`
(§0 the reconciliation, §5 the UNKNOWN-state table, §13 the correction to the corrections).

### Pages re-corrected — 19 files, 37 edit sites (18 pages + `index.md`)

- [[systems/player-profile-store]] — READ-FIRST banner rewritten; the "runs at `api.geoconflict.ru`"
  strike, the *Dedicated host* bullet, the backups bullet and the `0195` bullet all re-framed to
  **unverified**. New: the `api.` subdomain rationale, and the re-opened `age`-key decision.
- [[systems/project-brief]] — the three-fleet line, the *Current focus* correction, and the
  Gotchas entry; a new Gotchas entry for the `api.` subdomain ruling.
- [[systems/architecture-overview]] — *Profile backend tier* banner and the deploy-topology line.
- [[decisions/sprint-4]] — 5 sites: the page-head warning, the T4 correction, the `0062` row, the
  `0195` row, and the T4e–T4i line.
- [[decisions/config-parity-failure-class]] — the 2026-09-04 banner and its rebuild pointer.
- [[decisions/profile-deploy-hardening-review-loop]] — the "live host" strike.
- [[tasks/profile-server-bring-up-runbook]] — the bring-up correction and the rebuild-context note
  (hostname reuse now settled; `0216` runnable today; `0222` carries the old-object decision).
- [[tasks/postgres-backup-routine]] — the "no backups are running" correction, and 🔴 **the `age`-key
  question RE-OPENED**, replacing the entry that had recorded it closed.
- [[tasks/profile-match-end-crediting]], [[tasks/profile-vps-provisioning]],
  [[tasks/profile-backend-db-api]], [[tasks/profile-onbox-stack-gate]],
  [[tasks/profile-game-server-deploy-env]], [[tasks/player-profile-store-investigation]],
  [[tasks/citizenship-xp-progress-ui]], [[tasks/yandex-payments-secret-forwarding]],
  [[tasks/yandex-payments-implementation]] — same re-framing, in each page's own register.
- [[tasks/citizenship-name-change]] — rewritten to the repo-evidence position: **whether `0067`'s
  profile-server half ever deployed is NOT determinable from the repository** (a profile deploy leaves
  no artifact in git), and `migrate.ts` is idempotent so `0217` runs migrations regardless.
- `index.md` — 5 entries re-corrected ([[systems/project-brief]], [[systems/player-profile-store]],
  [[decisions/sprint-4]], [[tasks/profile-match-end-crediting]], [[tasks/postgres-backup-routine]]).

Every withdrawn phrase is **quoted in place and marked withdrawn** — strike-not-delete, so a reader who
remembers the earlier wording can see what happened to it.

### Also recorded this pass

- 🔴 **The `api.` subdomain is architecturally required, not incidental** (owner, 2026-09-04): Yandex
  Games permits only ONE main domain for an iframe game, so everything routes through subdomains of it.
  **Reuse the existing hostname** — ruled, not a convenience choice. ⚠️ Standing caution recorded
  alongside it: **a DNS record resolving proves nothing about a server running.**
- 🔴 **The `age`-key question is RE-OPENED.** With the bucket reused, pre-existing encrypted objects are
  still in it and are unreadable without the old private identity. **Purge, or keep pending a search?**
  — a live owner decision tracked in `0222`.
- 📌 **`0222` renamed** to `0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects` and
  **rescoped from decommissioning to cleanup** — nothing is being decommissioned.
- ⚠️ **`0217` may carry an unapplied migration `004`** — `migrate.ts` is idempotent, so running it is
  the cheap mitigation; do not investigate first.
- ⚠️ **Trap 3 gets MORE likely under the reframe**, recorded on [[tasks/profile-onbox-stack-gate]]:
  rotating `POSTGRES_PASSWORD` against a **surviving data volume** breaks auth, and rebuilding onto an
  existing box is exactly where a volume may outlive the password.

### Guards deliberately KEPT from the earlier pass

- ⛔ **The backend WAS built** — code, image, scripts and runbook all exist and are sound.
- ⛔ **`0195`'s code fix stands**; only its production narrative was ever wrong.
- ⚠️ **Match-end XP crediting has almost certainly never worked in production — INFERENCE, not
  measurement.** Still carried with that qualifier on every page.

### ⚠️ Flagged — not fixed, deliberately

- **[[decisions/sprint-4]] and `index.md` still do NOT carry the `0213`–`0222` rows or a re-count.**
  Unchanged from the earlier pass: that is ingest work, and no ingest was authorized here either.
- **No ingest and no sync was run**, by instruction. `.wiki-watermark` untouched.
- **The 2026-09-04 "targeted correction" log entry above was NOT edited** — append-only, per this
  vault's convention for superseded entries. A reader landing on it directly sees the old framing
  until they reach this entry.
