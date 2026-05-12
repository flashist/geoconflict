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
- [[systems/analytics]] — GameAnalytics player behaviour tracking: event conventions, experiment funnels, and monetization measurement baselines
- [[systems/telemetry]] — OTEL/Uptrace server observability: logs, metrics, slow-turn spans, investigation workflows
- [[systems/configuration]] — GAME_ENV, /api/env, runtime public settings, and gameplay/server config selection
- [[systems/localization]] — LangSelector and translateText flow for bundled UI translations and English fallback
- [[systems/server-performance]] — Server-side lag candidates ranked by likelihood; `endTurn()` performance analysis
- [[systems/match-logging]] — What is recorded per match, where it goes, and what cannot be retrieved
- [[systems/clans]] — Name-tag clan grouping system: parsing, team assignment logic, gaps, and no-UI status

## Decisions

### Product Strategy & Sprints
- [[decisions/product-strategy]] — Strategic logic: retention-first sequence, experiments policy, key analytics data
- [[decisions/sprint-1]] — Sprint 1 (done): analytics baseline, Sentry, mobile quick wins, ghost rate investigation
- [[decisions/sprint-2]] — Sprint 2 (done): tutorial, auto-spawn, auto-expansion, zoom-to-territory, announcements
- [[decisions/hotfix-post-sprint2]] — Post-Sprint 2 hotfix (done): experiment analytics, skip button, UI:Tap, HF-6/9
- [[decisions/sprint-3]] — Sprint 3 (done): server observability, stale-build fixes, map preload, and deferrals to Sprint 6
- [[decisions/sprint-4]] — Sprint 4 (mixed): citizenship/payment foundation plus shipped tutorial, missions, solo-loss, email, Telegram, and AI-lobby follow-ups
- [[decisions/sprint-4b]] — Sprint 4b (done): interim public-match variety with compact maps, Duos/Trios/Quads, and weird-setting modifiers
- [[decisions/sprint-4c]] — Sprint 4c (proposed): production stabilization against top Uptrace error families before May 15 travel pause
- [[decisions/sprint-5]] — Sprint 5 (planned): coin economy, clans, cosmetics, map voting, replay
- [[decisions/sprint-6]] — Sprint 6 (planned): historical multiplayer maps, paid campaign packs, mobile warning
- [[decisions/cancelled-tasks]] — HF-5, feedback match history, HF-11e, tutorial action-pause, HvN balance no-ship — with reasons and re-attempt guidance

### Legal & Operations
- [[decisions/licensing-compliance]] — AGPL, CC BY-SA, source-access, and OpenFront asset/trademark constraints for GeoConflict; one open prerequisite: proprietary asset audit before in-app purchases

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
- [[tasks/missions-difficulty-investigation]] — Sprint 4 investigation finding missions are generated, not authored; follow-ups exclude zero-nation maps, sort by prebuilt nation counts, and slow the Medium nation ramp
- [[tasks/solo-win-condition-fix]] — Solo-mode fix showing a distinct loss when an opponent reaches the win threshold
- [[tasks/telegram-link]] — Experiment-gated Telegram channel CTA on start/loading and game-end screens
- [[tasks/vk-link]] — Experiment-gated VK community CTA on start/loading and game-end screens
- [[tasks/nuke-trajectory-visibility]] — Sprint 4 visual polish making the nuke pre-launch targeting arc thicker
- [[tasks/teams-mode-max-teams]] — Sprint 4 server-side cap limiting regular public teams lobbies to 2, 3, or 4 teams
- [[tasks/sprint4b-mini-mode-investigation]] — Sprint 4b investigation finding compact nation-spawn risks and confirming Duos/Trios/Quads AI-fill compatibility
- [[tasks/sprint4b-duos-trios-quads]] — Sprint 4b public-only re-enable of Duos/Trios/Quads team-size modes with AI-fill coverage
- [[tasks/sprint4b-compact-map-rotation]] — Sprint 4b public compact-map modifier plus Mini/Мини lobby badge
- [[tasks/sprint4b-weird-setting-modifier]] — Sprint 4b weird-setting public modifiers and lobby badges
- [[tasks/monetization-analytics-spec]] — Sprint 4 analytics baseline for identity, match lifecycle, citizenship funnel, and ad-tier measurement
- [[tasks/analytics-p0-game-mode-segmentation]] — P0 analytics event pair segmenting fresh match starts into multiplayer versus solo
- [[tasks/analytics-p0-spawn-confirmation]] — P0 analytics event measuring server-confirmed spawn and time-to-spawn
- [[tasks/analytics-p0-match-duration]] — P0 analytics event measuring seconds from fresh match start to match end
- [[tasks/analytics-p0-player-days-played]] — P0 analytics event measuring cumulative unique local calendar days opened
- [[tasks/analytics-p0-yandex-login-status]] — P0 analytics event measuring Yandex logged-in, guest, and unknown session states
- [[tasks/analytics-p0-session-match-count]] — P0 analytics event measuring match starts per session via UUID-keyed localStorage, consumed before Session:Start
- [[tasks/cosmetics-serving]] — Sprint 4c fix restoring `/cosmetics.json` serving and deduplicating cosmetics fetch telemetry noise
- [[tasks/local-server-hash-guard]] — Sprint 4c guard preventing missing-turn hash messages from crashing local/singleplayer matches
- [[tasks/archive-endpoint-failures]] — Sprint 4c plan to restore multiplayer and singleplayer match archive reliability
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
- [[tasks/investigate-clans-system]] — Investigation confirming clans parse/team-assign works; silent kick bug and no-UI gap documented
- [[tasks/compact-map-click-interaction]] — Investigation confirming compact boat-button failures come from lost `isShore` bits in `map4x.bin`, not click coordinates
