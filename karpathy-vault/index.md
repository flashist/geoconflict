# Wiki Index — Geoconflict

> Master catalog of all wiki pages. One line per entry. Updated by LLM after every ingest.

## Features

- [[features/tutorial]] — Guided singleplayer bot match for first-time players; 7-step tooltip sequence, Yandex A/B gated
- [[features/reconnection]] — Crash reconnection: rejoin prompt when tab closes/crashes mid-match
- [[features/feedback-button]] — In-game feedback form on start screen and battle screen with automatic context
- [[features/announcements]] — Start-screen bell and popup for repo-authored player update messages with unread badge
- [[features/ai-players]] — AI Players in public lobbies: active, indistinguishable from humans in UI

## Systems

- [[systems/game-overview]] — Project overview: game types, maps, units, economy, combat, tick system
- [[systems/producer-workflow]] — Producer role: scope, responsibilities, coordination boundaries, and release guardrails
- [[systems/project-operations]] — Operational handbook: team roles, environment boundaries, sprint workflow, and roadmap constraints
- [[systems/game-loop]] — Deterministic turn replay from server turns into worker-executed core simulation
- [[systems/networking]] — Worker-routed WebSocket/HTTP flow with Zod-validated client/server messages
- [[systems/execution-pipeline]] — Client input to Intent to Execution to GameUpdate path
- [[systems/rendering]] — Layered client rendering, mixed canvas/Lit UI, and camera transform orchestration
- [[systems/flashist-init]] — FlashistFacade startup ordering, Yandex SDK bootstrap, and experiment flag init
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
- [[decisions/sprint-3]] — Sprint 3 (done): server observability, stale-build fixes, map preload, and deferrals to Sprint 6
- [[decisions/sprint-4]] — Sprint 4 (planned/in progress): citizenship XP economy, Yandex payments, player profile store, start-screen redesign, and tutorial/lobby follow-ups
- [[decisions/sprint-5]] — Sprint 5 (planned): coin economy, clans, cosmetics, map voting, replay
- [[decisions/sprint-6]] — Sprint 6 (planned): historical multiplayer maps, paid campaign packs, mobile warning
- [[decisions/cancelled-tasks]] — HF-5, feedback match history, HF-11e, tutorial action-pause, HvN balance no-ship — with reasons and re-attempt guidance

### Bug Fixes & Investigations
- [[decisions/autospawn-late-join-fix]] — Fix for auto-spawn failure when joining during catch-up (late join / reconnect)
- [[decisions/double-reload-fix]] — Fix for double page reload on browser refresh caused by orphaned `#refresh` history push
- [[decisions/hvn-balance-pr70-no-ship]] — No-ship review for the cancelled Sprint 4 Humans vs Nations balance attempt
- [[decisions/registry-image-policy]] — Trusted vs untrusted image rules, registry visibility policy, and rollback/retention guidance
- [[decisions/stale-build-zombie-tabs]] — Investigation and fix for users persisting on old builds (HF-11a/b/c/d)
- [[decisions/vps-credential-leak-response]] — Incident postmortem: Docker build-context secret leak path, deploy hardening, and trusted recovery workflow

## Tasks

- [[tasks/session-start-sequence]] — Session start event sequence (Session:Start → Device:Type → Platform:OS → Player:New/Returning)
- [[tasks/mobile-quick-wins]] — Task 3: retina off, 30fps cap, particles reduced on mobile
- [[tasks/spawn-ux]] — Tasks 4b + 4e: zoom-to-territory function and expanding ring spawn indicator
- [[tasks/stale-build-detection]] — HF-11b/c/d: `/api/version` endpoint, client polling, non-dismissible refresh modal
- [[tasks/ui-click-multiplayer]] — Investigation confirming `UI:ClickMultiplayer` fires on per-lobby JOIN attempts
- [[tasks/player-profile-store-investigation]] — Sprint 4 investigation recommending Postgres on the game VPS and identifying the Yandex identity gap
- [[tasks/yandex-payments-investigation]] — Sprint 4 investigation recommending signed Yandex purchase verification and a session-cached catalog in `FlashistFacade`
- [[tasks/start-screen-redesign-investigation]] — Sprint 4 design investigation that locked the two-tab start screen and citizenship card placement
- [[tasks/legal-vat-investigation]] — External VAT/legal check that cleared the pre-launch payments gate
- [[tasks/global-announcements]] — Re-enabled repo-authored announcements bell and popup with unread badge
- [[tasks/email-subscribe-modal]] — Start-screen and win-screen email opt-in modal backed by Telegram delivery
- [[tasks/map-preload]] — HF-13 background terrain preload on JOIN with preload-hit analytics
- [[tasks/ai-lobby-slot-bug]] — Sprint 4 fix preserving one human slot in mixed AI/public lobbies
- [[tasks/tutorial-no-nations]] — Tutorial config change removing nation-controlled opponents
- [[tasks/tutorial-build-menu-lock]] — Tooltip-5 guardrail that restricts building to City
- [[tasks/tutorial-reduce-bots]] — Tutorial config change lowering tutorial bot count from 400 to 100
- [[tasks/missions-difficulty-investigation]] — Sprint 4 investigation finding missions are generated, not authored; follow-up sorts mission maps by prebuilt nation counts
- [[tasks/incident-response-index]] — Security incident coordination page for the VPS credential leak response
- [[tasks/immediate-containment]] — Secret rotation, deploy freeze, and containment workflow for the leak response
- [[tasks/registry-image-audit]] — Historical image-trust audit plan; outcome was conservative pre-hardening image quarantine
- [[tasks/vps-access-hardening]] — Host-access review and SSH hardening checklist after leaked VPS credentials
- [[tasks/repo-build-context-hardening]] — `.dockerignore` plus allowlist Docker copies to block env-file leakage
- [[tasks/deployment-credential-hardening]] — SSH-key-first deploy contract and password-fallback demotion
- [[tasks/clean-redeploy-validation]] — Trusted post-hardening rebuild, redeploy, and validation workflow
- [[tasks/incident-postmortem-followups]] — Final postmortem capture and explicit security follow-up queue
- [[tasks/docker-secret-boundary-check]] — Automated guard against `.env*` or `COPY . .` regressions in Docker builds
- [[tasks/registry-image-policy-followup]] — Task that authored the registry visibility and image-retention policy
