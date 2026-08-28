# Wiki Index — Geoconflict

> Master catalog of all wiki pages. One line per entry. Updated by LLM after every ingest.

## Features

- [[features/tutorial]] — Guided singleplayer bot match for first-time players; 7-step tooltip sequence, Yandex A/B gated
- [[features/reconnection]] — Crash reconnection: rejoin prompt when tab closes/crashes mid-match
- [[features/feedback-button]] — In-game feedback form on start screen and battle screen with automatic context
- [[features/announcements]] — Start-screen bell and popup for repo-authored player update messages with unread badge; task 0012 adds a citizens-only Personal inbox tab (built 2026-08-26, **not launched**)
- [[features/ai-players]] — AI Players in public lobbies: active, indistinguishable from humans in UI

## Systems

- [[systems/project-brief]] — Product ground truth: what the game is, who it is for, how it earns, and the platform/legal/scope constraints every task works inside
- [[systems/architecture-overview]] — Evidence-first 2026-08-08 codebase survey: four tiers, tick model, deploy topology, ranked risks, and the documented-but-stale corrections
- [[systems/agent-conventions]] — The project's standing law: task status and owner vocabularies, status-report shape, evidence-before-assertion, one-skill-one-output, priority-vs-identity, dependency form, and the project-added task-ID allocation rule
- [[systems/game-overview]] — Project overview: game types, maps, units, economy, combat, tick system
- [[systems/producer-workflow]] — Producer role: scope, responsibilities, coordination boundaries, and release guardrails
- [[systems/project-operations]] — Operational handbook: team roles, environment boundaries, sprint workflow, and roadmap constraints
- [[systems/game-loop]] — Deterministic turn replay from server turns into worker-executed core simulation
- [[systems/networking]] — Worker-routed WebSocket/HTTP flow with Zod-validated client/server messages; carries the post-outage master/worker coordination — `WorkerSupervisor`, the quorum gate, ready-worker ID sampling, the lobby-poll guard, and the departed-requester create guard
- [[systems/execution-pipeline]] — Client input to Intent to Execution to GameUpdate path
- [[systems/rendering]] — Layered client rendering, mixed canvas/Lit UI, and camera transform orchestration
- [[systems/flashist-init]] — Explicit Bootstrap.ts startup gate for analytics, Yandex SDK, player data, flags, language, degraded mode, and app loading
- [[systems/analytics]] — GameAnalytics player behaviour tracking: event conventions, bootstrap/session events, experiment funnels, and monetization measurement baselines
- [[systems/telemetry]] — OTEL/Uptrace server/client observability, source maps, ClickHouse VPS guardrails, and investigation workflows; the winston-transport gotcha **corrected 2026-08-27** against measurement — single-object meta survives as attributes, only `null` values are dropped
- [[systems/configuration]] — GAME_ENV, /api/env, runtime public settings, and gameplay/server config selection
- [[systems/localization]] — LangSelector and translateText flow for bundled UI translations and English fallback
- [[systems/server-performance]] — Server-side lag candidates ranked by likelihood; `endTurn()` performance analysis
- [[systems/match-logging]] — What is recorded per match, where it goes, and what cannot be retrieved
- [[systems/clans]] — Name-tag clan grouping system: parsing, team assignment logic, gaps, and no-UI status
- [[systems/player-infrastructure]] — Pre-S4 identity/customization substrate: local-only persistence, join transport, dead inherited Stripe/Fuse monetization, and trust gaps; **corrected 2026-08-09** — the `flares` entitlement path is **live** and upstream-OpenFront-sourced, with ad suppression coupled to it (production liveness still unverified, task `0009`)
- [[systems/player-profile-store]] — Dedicated Sprint 4 profile API/Postgres backend and match-end XP crediting path for citizenship and future paid entitlements

## Decisions

### Project ADRs (this project's series — 101+)

> `ADR-001`–`ADR-099` are **fkit toolkit** ADRs and do not live in this repo. See [[decisions/adr-numbering-two-series]].

- [[decisions/adr-numbering-two-series]] — Owner ruling reserving 001–099 for the toolkit series; this project's ADRs start at 101. Also carries the immutability rule: `proposed` is a draft promoted in place, `accepted` is history, and the in-place amendment carve-out covers **clarifications only** — a reversal needs a superseding ADR
- [[decisions/adr-101-fail-soft-xp-crediting]] — Match-end XP crediting is fail-soft with bounded retries and no durable queue; outage XP loss is silent and unrecoverable
- [[decisions/adr-102-privilege-refresher-fails-open]] — Cosmetic entitlements fail open until `cosmetics.json` loads; **accepted 2026-08-09 while nothing is sold, expiring at the first paid entitlement of any kind** — trigger ruled three times in one day, all three kept visible
- [[decisions/adr-103-identity-trust-seam]] — Client-asserted Yandex IDs accepted for earned XP behind one trust seam; signed verification deferred until the Yandex secret key exists
- [[decisions/adr-104-archiving-disabled]] — Match archiving disabled behind one config switch until S3-backed, citizen-gated archival ships
- [[decisions/adr-105-compact-maps-out-of-rotation]] — Compact maps removed from public rotation until the map binaries are regenerated with correct shore bits
- [[decisions/adr-106-flags-suppressed]] — Real-country flags suppressed by parse-then-drop; flags reserved as a future paid non-country cosmetic
- [[decisions/adr-107-turn-interval-1-5x]] — The game runs at 1.5× upstream tick rate (66.7 ms); owner-supplied rationale (2026-08-09): two goals — quicker matches and a higher interstitial rate — with 1.5 chosen by playtesting and 2× rejected as too fast; neither goal measured
- [[decisions/adr-108-active-sprint-pointer]] — Direction for the next fkit update: the active sprint should be owner-set via an optional `.active-sprint` pointer, derived only as fallback, failing loud when stale. **Nothing in this repo changes** — the interim rule is to ask for status by name
- [[decisions/adr-109-worker-index-placement-contract]] — The worker index is a fixed placement contract computed independently by client, worker, nginx and master; to move a game, move its **ID** (rejection-sample it), never the index. Private-lobby exposure and wedged-but-alive workers are recorded, owner-accepted tradeoffs

### Product Strategy & Sprints
- [[decisions/product-strategy]] — Strategic logic: retention-first sequence, experiments policy, key analytics data
- [[decisions/sprint-1]] — Sprint 1 (done): analytics baseline, Sentry, mobile quick wins, ghost rate investigation
- [[decisions/sprint-2]] — Sprint 2 (done): tutorial, auto-spawn, auto-expansion, zoom-to-territory, announcements
- [[decisions/hotfix-post-sprint2]] — Post-Sprint 2 hotfix (done): experiment analytics, skip button, UI:Tap, HF-6/7/9
- [[decisions/sprint-3]] — Sprint 3 (done): server observability, stale-build fixes, map preload, and deferrals to Sprint 6
- [[decisions/sprint-4]] — Sprint 4 (mixed): profile T4/T5/T6/T8, citizenship XP UI, payments infrastructure (0019), degraded-mode UX (0049), the independent 0041/0042/0046 tasks, the 0054 card-hide flag, the 0055 outage half, and the 0066 licensing remediation done (all agent-closed, not owner-verified; 0066 NOT deployed); 0017/0018 re-scoped local/mock-first 2026-08-23 and built+reviewed 2026-08-24 but open pending live tails — the go-live now hangs on 0065 (blocked by 0014 AND 0062, flip-ON gated on "0066 DEPLOYED"); the 2026-08-22 outage track **closed 2026-08-28** (0057→0056→0192→0194, with 0193 alongside — all agent-closed, none owner-verified, none confirmed deployed); promoted config-drift tasks (0060/0062/0063) are still open on the board
- [[decisions/sprint-4b]] — Sprint 4b (done): interim public-match variety with compact maps, Duos/Trios/Quads, and weird-setting modifiers
- [[decisions/sprint-4c]] — Sprint 4c stabilization (closed; plan archived to `sprints/done/` 2026-08-24): quick wins done, source maps enabled, lobby/map fetch fixed, mobile WebGL deferred
- [[decisions/sprint-backlog]] — No-sprint backlog across both unsprinted boards: monitoring, mobile WebGL, worker init, bot anti-SAM nuke tactics, weird-mode cleanup, FuseTag/GutterAds fixes, the `0001`–`0011` briefs and cosmetics monetization dependency chain, plus the 2026-08 additions — heal tasks `0050`–`0053`, outage follow-ups `0058`/`0059`/`0061`/`0064`, the `0057`/`0062` promotions, and the owner-ruled email-subscribe fold-in to `0048`
- [[decisions/sprint-5]] — Sprint 5 (planned): coin economy, clans, cosmetics, map voting, replay
- [[decisions/sprint-6]] — Sprint 6 (planned): historical multiplayer maps, paid campaign packs, mobile warning; its "Sprint 5 cosmetics store" prerequisite was corrected 2026-08-09 — no such store exists
- [[decisions/cancelled-tasks]] — HF-5, feedback match history, HF-11e, tutorial action-pause, HvN balance, compact-map runtime fallback, and guest-first profile XP cancellations
- [[decisions/personal-data-152fz-compliance]] — Hash-based 152-ФЗ avoidance invalidated; notification/consent work deferred to backlog with accepted risk

### Legal & Operations
- [[decisions/fkit-transfer-blueprint]] — Extracting the two-model agent OS into a reusable kit: the generic/project seam, the routing manifest, and single-sourced skills that kill copy drift
- [[decisions/licensing-compliance]] — AGPL, CC BY-SA, source-access, and OpenFront asset/trademark constraints for GeoConflict; the 0025 audit (2026-08-23) found one violation (proprietary music) — remediation 0066 built but not deployed, so the paid-IAP gate is not yet clear

### Bug Fixes & Investigations
- [[decisions/autospawn-late-join-fix]] — Fix for auto-spawn failure when joining during catch-up (late join / reconnect)
- [[decisions/double-reload-fix]] — Fix for double page reload on browser refresh caused by orphaned `#refresh` history push
- [[decisions/archive-archival-strategy]] — Split archive work: disable noisy dead path now, defer S3-backed citizen archival until citizenship exists
- [[decisions/hvn-balance-pr70-no-ship]] — No-ship review for the cancelled Sprint 4 Humans vs Nations balance attempt
- [[decisions/registry-image-policy]] — Trusted vs untrusted image rules, registry visibility policy, and rollback/retention guidance
- [[decisions/stale-build-zombie-tabs]] — Investigation and fix for users persisting on old builds (HF-11a/b/c/d)
- [[decisions/vps-credential-leak-response]] — Incident postmortem: Docker build-context secret leak path, deploy hardening, and trusted recovery workflow
- [[decisions/profile-deploy-hardening-review-loop]] — Reset of the unbounded profile-deploy review loop into bounded T4 slices and fixed acceptance criteria
- [[decisions/profile-storage-strategy]] — Player profile DB storage: Option B (typed columns + jsonb overflow), `xp bigint`, `persistent_id text` — chosen in T5 before the first migration
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — 2026-08-22 prod outage: worker 16 died, crash recovery has never worked (`worker.process.env` bug), the all-20 gate stalled scheduling for ~3.5 h; task split 0055→0057→0056 plus the config-drift findings 0060–0064

## Tasks

- [[tasks/session-start-sequence]] — Session start event sequence (Session:Start → Device:Type → Platform:OS → Player:New/Returning)
- [[tasks/build-number-tracking]] — HF-7 build segmentation: original GA custom-dimension approach and current native build-field tracking
- [[tasks/mobile-quick-wins]] — Task 3: retina off, 30fps cap, particles reduced on mobile
- [[tasks/spawn-ux]] — Tasks 4b + 4e: zoom-to-territory function and expanding ring spawn indicator
- [[tasks/stale-build-detection]] — HF-11b/c/d: `/api/version` endpoint, client polling, non-dismissible refresh modal
- [[tasks/ui-click-multiplayer]] — Investigation confirming `UI:ClickMultiplayer` fires on per-lobby JOIN attempts
- [[tasks/player-profile-store-investigation]] — Sprint 4 investigation recommending Postgres, now on a dedicated reg.ru profile/API VPS, and identifying the Yandex identity gap
- [[tasks/profile-schema-contract]] — Sprint 4 T1 shared PlayerProfile v1 contract, migration function, guest-profile factory, and tests
- [[tasks/yandex-identity-plumbing]] — Sprint 4 T3 client-to-server Yandex unique-ID plumbing for later profile crediting
- [[tasks/profile-server-skeleton]] — Sprint 4 T4a standalone profile-service `/health` skeleton, logger, and validated port
- [[tasks/profile-api-url-config]] — Sprint 4 T4b public profile API URL plumbing through runtime config and `/api/env`
- [[tasks/profile-docker-image]] — Sprint 4 T4c allowlist-copy, linux/amd64 Docker image for the profile service
- [[tasks/profile-vps-provisioning]] — Sprint 4 T4d dedicated reg.ru VPS provisioning, TLS/network boundary, and operator-verified RU residency
- [[tasks/profile-build-push-digest]] — Sprint 4 T4e1 local amd64 profile-image build, registry push, and fail-closed immutable digest resolution
- [[tasks/profile-onbox-stack-gate]] — Sprint 4 T4e2 on-box compose stack, health gate, systemd lifecycle, and digest rollback
- [[tasks/profile-deploy-wiring]] — Sprint 4 T4e3 SSH/SCP deploy wiring, secret staging, and end-to-end digest passthrough
- [[tasks/profile-image-secret-scan]] — Sprint 4 T4f built-image layer byte scan that blocks secret-bearing profile image pushes
- [[tasks/profile-server-bring-up-runbook]] — Sprint 4 T4i operator runbook for bringing `api.geoconflict.ru/health` live on the reg.ru VPS
- [[tasks/profile-deploy-hardening]] — Sprint 4 T4g argv-safety, deploy locking, atomic record, and wrong-host preflight hardening
- [[tasks/profile-game-server-deploy-env]] — Sprint 4 T4h propagation of `PROFILE_API_URL` through the game-server deploy environment
- [[tasks/profile-backend-db-api]] — Sprint 4 T5 Postgres-backed profile API, repository, migrations, readiness, and idempotent XP crediting
- [[tasks/profile-match-end-crediting]] — Sprint 4 T6 game-server match-end XP crediting into the profile API
- [[tasks/postgres-backup-routine]] — Sprint 4 T8 encrypted daily off-box profile DB backups, restore runbook, and deploy-time smoke validation
- [[tasks/personal-data-compliance-investigation]] — Sprint 4 152-ФЗ investigation whose hash-based conclusion was later overturned
- [[tasks/yandex-payments-investigation]] — Sprint 4 investigation recommending signed Yandex purchase verification and a session-cached catalog in `FlashistFacade`
- [[tasks/start-screen-redesign-investigation]] — Sprint 4 design investigation that locked the two-tab start screen and citizenship card placement
- [[tasks/start-screen-redesign-implementation]] — Sprint 4 implementation of the two-tab start screen, citizenship card shell, tab persistence, localization rename, and tab analytics
- [[tasks/citizenship-xp-progress-ui]] — Sprint 4 live citizenship card wiring: profile API read, XP progress, citizen state, and degraded zero-state handling
- [[tasks/citizenship-card-guest-cta-no-sdk]] — Sprint 4 citizenship-card fix hiding the Yandex login CTA outside a Yandex SDK context
- [[tasks/app-bootstrap-single-entry-point]] — Sprint 4 explicit client bootstrap refactor with bounded Yandex platform init, degraded mode, language-before-render, and app-chunk recovery
- [[tasks/legal-vat-investigation]] — External VAT/legal check that cleared the pre-launch payments gate
- [[tasks/global-announcements]] — Re-enabled repo-authored announcements bell and popup with unread badge
- [[tasks/feedback-modal-space-key]] — Sprint 4 fix allowing spaces in the in-match feedback modal and suppressing gameplay hotkeys while typing
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
- [[tasks/archive-endpoint-failures]] — Sprint 4c cleanup disabling broken archive writes through `archiveEnabled()`; S3-backed citizen archival deferred
- [[tasks/leaderboard-player-count]] — Sprint 4c quick win showing the human-like player count in the leaderboard's Players only label
- [[tasks/disable-compact-public-maps]] — Sprint 4c mitigation removing compact maps from public rotation while keeping opt-in compact paths
- [[tasks/s4c-enable-client-source-maps]] — Sprint 4c source-map upload pipeline for Uptrace client stack symbolication
- [[tasks/s4c-investigate-lobby-map-fetch]] — Sprint 4c fix for lobby polling noise and map manifest fetch failures
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
- [[tasks/yandex-payments-implementation]] — Sprint 4 task 0019 payments infrastructure: catalog cache, profile-server HMAC verification endpoints, reconciliation; agent-closed, live verification deferred on catalog approval
- [[tasks/map-troops-labels]] — Sprint 4 task 0041 map label enhancement: troops `current / max` line plus red attacking-troops line in `NameLayer`; agent-closed, singleplayer-only live validation
- [[tasks/starting-gold-public-modifier]] — Sprint 4 task 0042 fifth weird sub-option granting real players 5M starting gold via the new `startGold` GameConfig field; agent-closed, live check owner-side
- [[tasks/feedback-remove-contact-field]] — Sprint 4 task 0046 152-ФЗ data minimization removing the feedback contact field end-to-end; agent-closed, post-deploy checks owner-side
- [[tasks/degraded-mode-ux-treatment]] — Sprint 4 task 0049 `isYandexDegraded()` citizenship-card connection-problem state clearing the earned/paid citizenship gate; agent-closed, healthy-SDK guest case unit-test-only
- [[tasks/hide-citizenship-card-flag]] — Sprint 4 task 0054 default-OFF `CITIZENSHIP_CARD_ENABLED` client flag hiding the citizenship card until 0017/0018 flip it ON at launch; agent-closed
- [[tasks/master-lobbies-worker-exit-diagnostics]] — Sprint 4 task 0055 outage-track fix: parseable empty lobbies body plus worker-exit `code`/`signal` logging in `Master.ts`, first-ever tests for that file; agent-closed, unpushed branch at close
- [[tasks/licensing-remediation]] — Sprint 4 task 0066 licensing remediation from the 0025 audit: proprietary-music purge, original placeholder favicon, JWT fallback retarget; agent-closed 2026-08-24, NOT deployed — gates 0065's flip-ON
- [[tasks/worker-routing-dead-worker-investigation]] — Sprint 4 task 0057 architect-led routing investigation: dead-index vs wedged-index severity, the placement contract behind ADR-109, and the confirmation (not revision) of the 18/20 quorum; agent-closed 2026-08-26
- [[tasks/worker-crash-recovery-and-quorum-gate]] — Sprint 4 task 0056 outage root-cause fix: `WorkerSupervisor`, restart cap 5/index/10 min with 1 s→30 s backoff, quorum `ceil(n × 9/10)`-or-90 s gate; agent-closed 2026-08-27, deployment unconfirmed
- [[tasks/schedule-public-games-onto-ready-workers]] — Sprint 4 task 0192 ADR-109's first application: `pickGameID` rejection-samples the game ID onto a ready index and a 5 s abort bounds the create call; agent-closed 2026-08-27, orphan residual since discharged by 0194
- [[tasks/fetchlobbies-in-flight-guard]] — Sprint 4 task 0193 single-poll-in-flight guard on the 100 ms lobby tick: error lines per stuck ID 50→1, lobby flapping 21%→0, self-inflicted 429s 3→0; agent-closed 2026-08-27
- [[tasks/worker-reject-departed-requester-create]] — Sprint 4 task 0194 departed-requester guard on `create_game` (bounded 10 ms settle wait, `503`): 0 orphans against a baseline of 5, closing the outage track; agent-closed 2026-08-28. ⚠️ Its plan deliberately supersedes its brief
