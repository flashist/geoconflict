# Sprint 4 — In-App Monetization & Citizenship

**Date**: 2026-04-16
**Status**: proposed

## Context

Goal: launch the citizenship system and the in-app purchase foundation. Establish the payment infrastructure, player profile store, and start-screen UI foundation that future monetization depends on.

The latest sprint brief now frames citizenship progression as an XP system: `10 XP` per qualifying match and `1,000 XP` for citizenship, or roughly `100` qualifying matches. This supersedes the older Sprint 4 shorthand that described the goal as a 50-match milestone.

**Rewarded ads explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

Source: `ai-agents/sprints/plan-sprint-4.md`
Follow-up sources: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/tasks/done/s4-profile-01-schema-contract.md`, `ai-agents/tasks/done/sprint4-investigation-yandex-payments.md`, `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`, `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`, `ai-agents/tasks/done/analytics-p0-game-mode-segmentation.md`, `ai-agents/tasks/done/analytics-p0-match-duration.md`, `ai-agents/tasks/done/analytics-p0-player-days-played.md`, `ai-agents/tasks/done/analytics-p0-yandex-login-status.md`, `ai-agents/tasks/done/8d-a-task-global-announcements.md`, `ai-agents/tasks/done/s4-start-screen-redesign-investigation.md`, `ai-agents/tasks/done/s4-start-screen-redesign-impl.md`, `ai-agents/tasks/done/s4-app-bootstrap-single-entry-point.md`, `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`, `ai-agents/tasks/done/s4-legal-vat-investigation.md`, `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`, `ai-agents/tasks/done/s4-ai-lobby-slot-bug.md`, `ai-agents/tasks/done/s4-feedback-modal-space-key.md`, `ai-agents/tasks/done/s4-email-subscribe-task.md`, `ai-agents/tasks/done/s4-tutorial-no-nations.md`, `ai-agents/tasks/done/s4-tutorial-build-menu-lock.md`, `ai-agents/tasks/done/s4-tutorial-reduce-bots.md`, `ai-agents/tasks/done/s4-missions-difficulty-investigation.md`, `ai-agents/knowledge-base/s4-missions-difficulty-findings.md`, `ai-agents/tasks/done/s4-solo-win-condition-fix.md`, `ai-agents/tasks/done/s4-telegram-link.md`, `ai-agents/tasks/done/s4-vk-link.md`, `ai-agents/tasks/done/s4-nuke-trajectory-visibility.md`, `ai-agents/tasks/done/s4-teams-mode-max-teams.md`, `ai-agents/tasks/cancelled/s4-tutorial-action-pause.md`, `ai-agents/tasks/cancelled/s4-nations-balance-task.md`, `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`, `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`, `ai-agents/tasks/backlog/s4-investigate-null-id-errors.md`, `ai-agents/tasks/done/s4c-enable-client-source-maps.md`
Recent profile-store cancellation sources: `ai-agents/tasks/cancelled/s4-profile-02-guest-localstorage.md`, `ai-agents/tasks/cancelled/s4-profile-07-guest-migration.md`, `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`

## Decision

Sprint 4 is no longer just a future plan. The latest source brief records a mixed state: the two technical investigations are complete, several independent fixes are shipped, multiple side tasks were cancelled, and the player profile store implementation has started. The broader payments/citizenship track still depends on identity, legal/compliance, backup, and infrastructure prerequisites.

**Completed groundwork:**
- **Investigation A: Player Profile Store** is complete. It recommends PostgreSQL, an initial `player_profiles` plus idempotent match-credit ledger, server-side match crediting at match end, and a verified Yandex identity claim in the join/auth path because the current server only sees `persistentID`. Its original game-VPS co-location recommendation is superseded: the profile store and non-game backend logic now run on a dedicated reg.ru VPS behind `api.geoconflict.ru`, with Postgres localhost-only on that box. See [[tasks/player-profile-store-investigation]].
- **Player Profile Store T1: Schema Contract** is complete. The shared `PlayerProfile` v1 payload, Zod schema, pure `migrateProfile()`, and `createGuestProfile()` factory now live in `src/core/profile/PlayerProfile.ts`, with focused tests in `tests/core/profile/PlayerProfile.test.ts`. See [[tasks/profile-schema-contract]].
- **Player Profile Store T2/T7 guest-first slices are cancelled.** The client-only guest localStorage XP store and guest-to-authenticated migration flow were dropped on 2026-06-13 after review-driven hardening expanded the scope beyond the intended small client slice. Profile XP is now authenticated-only until the backend path lands; no one earns profile XP before T5/T6. See [[decisions/cancelled-tasks]].
- **Investigation B: Yandex Payments Catalog** is complete. It recommends signed Yandex purchases, a memoized session catalog cache in `FlashistFacade`, signed client-to-server verification plus startup reconciliation through `getPurchases()`, and post-grant consumption after durable entitlement storage. See [[tasks/yandex-payments-investigation]].
- **Global announcements (`8d-A`)** are complete and available as the base communication surface for future inbox or citizenship messaging. See [[tasks/global-announcements]].
- **Start screen redesign investigation** is complete and locks the layout direction for citizenship UI. See [[tasks/start-screen-redesign-investigation]].
- **Start screen redesign implementation** is complete. The start screen now uses the two-tab Multiplayer/Singleplayer layout, has a citizenship card shell above the tabs, persists the active tab, renamed Single Player to `Custom Game` / `Своя игра`, and emits tab/citizenship-surface analytics. See [[tasks/start-screen-redesign-implementation]].
- **App Bootstrap: Single Explicit Entry Point** is complete. Client boot now runs through `Bootstrap.ts`, with immediate analytics, a bounded Yandex/platform gate, language-before-render, degraded mode, and app-chunk recovery. See [[tasks/app-bootstrap-single-entry-point]].
- **Legal/VAT investigation** is complete and clears the external legal/tax gate for in-app purchases. See [[tasks/legal-vat-investigation]].
- **Licensing compliance brief** confirms commercial use is allowed but adds AGPL/source-access and asset-use obligations that must be handled separately from VAT/tax setup. See [[decisions/licensing-compliance]].
- **Monetization analytics spec** is captured as the P0/P1 measurement baseline for identity, match lifecycle, citizenship funnel, and ad-tier revenue questions. See [[tasks/monetization-analytics-spec]].

**Completed independent Sprint 4 tasks:**
- AI Lobby Slot Bug — done
- Tutorial: remove nations — done
- Tutorial: lock build menu to City during tooltip 5 — done
- Tutorial: reduce bot count from 400 to 100 — done
- Email Subscription Modal — done
- Missions difficulty investigation and follow-up mission-generation tuning — done
- Solo opponent win-condition fix — done
- Feedback modal Space-key/hotkey guard — done
- Analytics P0: game mode segmentation — done
- Analytics P0: match duration — done
- Analytics P0: player days played — done
- Analytics P0: Yandex login status — done
- Analytics P0: session match count — done
- Start Screen Redesign — Implementation — done
- App Bootstrap — Single Explicit Entry Point — done
- Telegram Channel Link — done
- VK Channel Link — done
- Nuke trajectory visibility — done
- Teams mode max teams cap — done

**Cancelled side tasks:**
- Humans vs Nations balance task — cancelled after no-ship review
- Tutorial action-pause variant — cancelled due to implementation complexity
- Player Profile Store T2 guest localStorage — cancelled after the client-only store accumulated too much edge-surface hardening
- Player Profile Store T7 guest-to-authenticated migration — cancelled with the guest-first XP story; the T5 migration endpoint was removed

**Remaining implementation track:**

| Task | Status | Notes |
|---|---|---|
| Player Profile Store — Implementation | in progress | T1 schema contract is done; T2 guest localStorage and T7 guest migration are cancelled. Next path is T3 Yandex identity and T4 backend infra in parallel, then T5 DB/API and T6 server-side match crediting |
| Personal-Data Compliance (152-ФЗ) — Roskomnadzor notification + consent flow | backlog | Investigation-first legal track; interim gate before real Yandex IDs/display names are persisted in production |
| PostgreSQL Backup Routine (Profile Store) | backlog | Daily off-box encrypted backup and tested restore for the dedicated profile VPS; must be live before paid citizenship |
| Yandex Payments — Catalog Fetch & Purchase Infrastructure | backlog | Depends on Investigation B conclusions and catalog readiness |
| Citizenship Core — XP Counter & Progress UI | backlog | Blocked by start screen redesign implementation |
| Citizenship Core — Earned Citizenship | backlog | Blocked by player profile store |
| Citizenship Core — Paid Citizenship | backlog | Blocked by payments implementation plus catalog approval |
| 8d-B — Personal Inbox | backlog | Blocked by player profile store; builds on announcements |
| S3-Backed Match Archival (Citizen-Gated) | backlog | Blocked by player profile store, citizenship, and S3 bucket/credentials |
| Investigate & Fix Client Null-ID Errors | backlog | Stabilization follow-up; source-map enablement is done, but triage should use a deployed build with resolved Uptrace stacks |
| Name Change (Citizens Only) | backlog | First user-facing citizenship benefit |
| Citizen Verified Icon | backlog | Visible identity/status marker in lobbies and match UI |
| Licensing asset audit | backlog | Prerequisite before paid citizenship; confirm production bundle has no proprietary/CDN assets |
| Map Labels — Show Troops/Max + Attacking Troops | backlog | Independent client rendering enhancement; no citizenship/payments dependency |
| Public Modifier — Add "5M Starting Gold" | backlog | Independent public-rotation modifier replacing degenerate infinite-gold play with bounded real-player starting gold |

**External/manual blocker:**
- Yandex catalog registration and approval is the remaining urgent non-engineering prerequisite called out directly in the sprint brief
- The production asset audit is now an explicit engineering prerequisite before paid citizenship goes live; see [[decisions/licensing-compliance]]
- The personal-data compliance investigation is a separate legal gate from VAT/tax and IP/licensing: until findings say otherwise, production profile-store launch should not persist real user Yandex IDs or display names before Roskomnadzor notification and consent/privacy-policy coverage are in place

## Locked Decisions

**XP economy:**
- `10 XP` per qualifying match
- `1,000 XP` citizenship threshold, or roughly `100` matches
- XP keeps accumulating after citizenship
- Sprint 4 has only one XP milestone: citizenship
- Rewarded-ad XP boosts remain Sprint 5 scope

**Qualifying match definition:**
- ✅ Counts: eliminated by another player/bot, survived to match end (any outcome)
- ❌ Does not count: voluntary Leave mid-match, disconnected without return, never spawned

**Start screen redesign decisions:**
- Minimum supported usable area: `360x430`
- Shipped layout: two tabs, with Multiplayer as the default first tab
- Citizenship surface placement: full-width card above the tabs; live data remains for later citizenship tasks
- Guest state must show a Yandex login CTA rather than silently hiding progress
- The last active tab should persist across sessions
- "Single Player" is renamed to `Custom Game` / `Своя игра`
- `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` shipped with the redesign implementation
- Win-screen return target remains the only explicitly open product question from the redesign investigation

**Pricing:**
- Citizenship: **99 rubles** (~50% to Yandex + taxes)
- Cosmetics (Sprint 5): 149–199 rubles (includes citizenship automatically)

**Earned path is independent of payments** — the XP/progression path can ship before Yandex catalog approval once the player profile store and redesigned UI exist.

## Consequences

- Sprint 4's core citizenship, payments, player profile store, and start-screen implementation track is temporarily paused during Mark's May 15 to June 1, 2026 travel window; [[decisions/sprint-4b]] covers the interim player-facing variety sprint and [[decisions/sprint-4c]] covers production stabilization, both explicitly excluding this monetization infrastructure.
- Start screen redesign implementation is now done and unblocks the citizenship XP/progress UI from a layout standpoint
- The app-bootstrap refactor removes the race-condition class around Yandex SDK, experiment flags, player data, and language startup. Future citizenship auth and Yandex payments work should plug into the explicit `Bootstrap.ts` / `FlashistFacade.initializePlatform()` gate instead of adding per-component startup waits.
- Production release validation for bootstrap-sensitive work must include the Yandex iframe path because the real `YaGames.init()` path, SDK language, player name, experiment flags, and `LoadingAPI.ready()` timing are platform-dependent.
- The VAT/tax gate is cleared; payments work no longer waits on extra legal registration, bank changes, or company-structure changes
- The VAT/tax gate does not clear IP/licensing compliance: before monetization scales, GeoConflict still needs a public current source repository, visible in-game source-code link, production asset audit, and legal review of AGPL/Yandex.Games interactions. See [[decisions/licensing-compliance]].
- The VAT/tax gate also does not clear Russian personal-data obligations. The Sprint 4 source now treats 152-ФЗ/Roskomnadzor notification plus consent/privacy-policy work as investigation-first, with an interim gate before profile-store production launch; consent metadata should feed the profile-store schema, and deletion requirements interact with deferred S3 archival.
- Register Yandex catalog items immediately — approval takes days and remains the main non-engineering blocker
- Player Profile Store investigation concluded that the current codebase needs a verified Yandex identity in the join/auth path before Yandex-keyed paid entitlements are safe.
- The profile-store hosting decision changed on 2026-06-13: run the profile API and Postgres on a dedicated reg.ru VPS at `api.geoconflict.ru`, with Postgres localhost-only and game servers calling the profile API over authenticated HTTP. This isolates match availability from profile outages and protects paid data from game-server crashes.
- T1 of the profile-store implementation is done: `PlayerProfile` v1 is shared from `src/core/profile/PlayerProfile.ts`, `migrateProfile()` normalizes untrusted persisted JSON without clocks or I/O, and `createGuestProfile()` creates fresh local profiles. T5 must still enforce DB column bounds for `xp`; if any guest migration endpoint is revived later, paid fields must be force-cleared and earned citizenship recomputed server-side instead of trusted from client payloads. See [[tasks/profile-schema-contract]].
- The guest-first XP path was dropped on 2026-06-13: T2 localStorage-authoritative XP and T7 guest-to-authenticated migration are cancelled, and the `POST /v1/profile/migrate` endpoint was removed from T5 rather than deferred. Guest users still get the locked citizenship card plus login prompt, but profile XP is authenticated-only until T5/T6 server-side crediting ships. A future guest-XP retry should be a thin best-effort cache over the server source of truth, not a localStorage-authoritative store. See [[decisions/cancelled-tasks]].
- Profile-store backups are now explicitly part of the Sprint 4 prerequisite chain: daily `pg_dump`, encrypted off-box copy to Reg.ru S3-compatible storage, and a tested restore must be live before paid citizenship because paid entitlements, earned XP, and display names would otherwise exist only in one profile-server Docker volume.
- Yandex Payments investigation concluded that paid citizenship should use signed purchase verification on the server, startup reconciliation via `getPurchases()`, and post-grant consumption once the entitlement is durably stored; purchase UI should be hidden when the dashboard catalog item is absent or unavailable
- Qualifying-match crediting should happen on the game server at match end, but implementation needs one additional end-of-match per-player state summary because the server does not currently simulate spawn/elimination itself
- The source brief now consistently uses the XP-based citizenship threshold, reducing ambiguity across the Sprint 4 progression tasks
- 8d-A is already done and provides the communication channel Sprint 4 can build on
- 8d-B (personal inbox) depends on both 8d-A already being live and the player profile store going live
- Sprint 4 is no longer purely monetization scope; it also bundles completed tutorial/lobby fixes and a now-locked start-screen redesign direction
- Mission-mode follow-up work has moved beyond investigation: the wiki now records the generated mission structure, zero-nation map exclusion, nation-count map ordering, and slower Medium nation ramp in [[tasks/missions-difficulty-investigation]]
- Solo mode no longer stalls indefinitely when an opponent reaches the win threshold; the player sees a distinct opponent-win loss state and `Match:Loss:OpponentWon` tracks that reason
- In-match feedback text fields now receive Space normally and suppress gameplay hotkeys while focused; see [[tasks/feedback-modal-space-key]].
- `Game:Start` analytics now emits an immediate `Game:Mode:Multiplayer` or `Game:Mode:Solo` classifier for first real match starts; see [[tasks/analytics-p0-game-mode-segmentation]].
- `Player:DaysPlayed` now records cumulative unique local calendar days opened, giving the citizenship funnel a loyalty-depth signal beyond `Player:New` and `Player:Returning`; see [[tasks/analytics-p0-player-days-played]].
- Yandex login status now emits one of `Player:YandexLoggedIn`, `Player:YandexGuest`, or `Player:YandexUnknown` per session, so citizenship planning can measure authenticated reach before launch; see [[tasks/analytics-p0-yandex-login-status]].
- Session match count now fires `Session:MatchesPlayed` before `Session:Start` on each new session using UUID-keyed localStorage entries, giving per-session match depth data for citizenship XP threshold analysis; see [[tasks/analytics-p0-session-match-count]].
- Telegram Channel Link shipped as an experiment-gated CTA on the start/loading and game-end modals, with placement-specific `UI:Tap:*` analytics
- VK Channel Link mirrors the Telegram community CTA with its own `vk_link` experiment flag, live `https://vk.com/gameworldwar` URL, and placement-specific `UI:Tap:VkLinkStartScreen` / `UI:Tap:VkLinkGameEnd` analytics.
- Nuke trajectory visibility increased the pre-launch targeting arc thickness while leaving color, alpha, and launch mechanics unchanged; see [[tasks/nuke-trajectory-visibility]].
- Teams mode max teams caps regular auto-generated public team lobbies to 2, 3, or 4 teams while preserving Humans vs Nations in the public rotation; see [[tasks/teams-mode-max-teams]].
- The source brief now carries two independent backlog enhancements outside the citizenship/payment track: richer map labels from existing client-side troop data (`ai-agents/tasks/backlog/s4-map-population-army-labels.md`) and a bounded 5M starting-gold public modifier for real players only (`ai-agents/tasks/backlog/s4-starting-gold-public-modifier.md`).
- Monetization launch decisions should use the analytics spec's P0/P1 gates instead of treating the 1,000 XP threshold, purchase funnel, or ad-removal economics as validated without identity, match-depth, and ad-tier data.
- Match archival is now split: Sprint 4c only reduces noise from the dead inherited archive path, while real S3-backed archival is deferred to the citizen-history track after player profiles, citizenship, and S3 infrastructure exist. See [[decisions/archive-archival-strategy]].
- The client null-ID/null-object investigation is carried by Sprint 4 as a stabilization follow-up rather than active Sprint 4c work. Sprint 4c completed source-map enablement, so this task should start from newly resolved Uptrace client stacks on a deployed build instead of minified `e is null` / `a.id` messages. See [[tasks/s4c-enable-client-source-maps]].
- Tutorial follow-up work later resolved into three shipped fixes (`[[tasks/tutorial-no-nations]]`, `[[tasks/tutorial-build-menu-lock]]`, `[[tasks/tutorial-reduce-bots]]`) plus one cancelled pause-window attempt recorded in [[decisions/cancelled-tasks]]
- The Humans vs Nations balance task was later rejected as no-ship and cancelled after review; see [[decisions/hvn-balance-pr70-no-ship]]

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-3]] — previous sprint
- [[decisions/sprint-4b]] — interim public-match variety sprint while this sprint's core monetization track is paused
- [[decisions/sprint-4c]] — production stabilization sprint while this sprint's core monetization track is paused
- [[decisions/sprint-5]] — next sprint
- [[decisions/sprint-6]] — later content sprint depends on this payments/citizenship layer
- [[systems/producer-workflow]] — producer operating model and brief-writing guardrails reflected in this sprint plan
- [[systems/project-operations]] — operational context and source brief covering Sprint 4 planning constraints
- [[features/announcements]] — already-live dependency Sprint 4 can build on for global and future personal messaging
- [[features/tutorial]] — tutorial follow-up fixes were added to the Sprint 4 backlog
- [[features/ai-players]] — AI Players feature (already active in production)
- [[tasks/player-profile-store-investigation]] — completed Sprint 4 investigation for player-store technology, hosting, schema, and match-crediting approach
- [[tasks/profile-schema-contract]] — completed T1 shared profile payload, migration, and guest-profile factory
- [[tasks/yandex-payments-investigation]] — completed Sprint 4 investigation for Yandex payments SDK usage, catalog caching, dashboard setup, and purchase verification flow
- [[tasks/global-announcements]] — completed `8d-A` dependency for future inbox and citizenship messaging
- [[tasks/feedback-modal-space-key]] — Sprint 4 fix for in-match feedback typing and hotkey suppression
- [[tasks/start-screen-redesign-investigation]] — locked tab layout, viewport target, and citizenship placement decisions
- [[tasks/start-screen-redesign-implementation]] — shipped two-tab start screen, citizenship card shell, persistence, copy rename, and tab analytics
- [[tasks/app-bootstrap-single-entry-point]] — explicit client bootstrap sequence and degraded-mode Yandex SDK gate
- [[tasks/legal-vat-investigation]] — external gate-clear task confirming no additional legal/tax blocker before payments
- [[decisions/licensing-compliance]] — separate OpenFront-derived licensing posture for AGPL/source access, assets, and trademark boundaries
- [[decisions/archive-archival-strategy]] — S3-backed, citizen-gated match archival decision and deferred storage scope
- [[tasks/archive-endpoint-failures]] — Sprint 4c cleanup that precedes the deferred citizen-history archival track
- [[tasks/s4c-enable-client-source-maps]] — Sprint 4c source-map enablement that unblocks client null-ID triage
- [[tasks/monetization-analytics-spec]] — P0/P1 analytics baseline for citizenship, payments, match lifecycle, and ad-tier measurement
- [[tasks/ai-lobby-slot-bug]] — Sprint 4 bug fix for mixed real-plus-AI full lobbies
- [[tasks/email-subscribe-modal]] — Sprint 4 email opt-in modal on start and win screens
- [[tasks/tutorial-no-nations]] — Sprint 4 tutorial simplification that removed nation opponents
- [[tasks/tutorial-build-menu-lock]] — Sprint 4 tooltip-5 build-menu guardrail
- [[tasks/tutorial-reduce-bots]] — Sprint 4 tutorial config change that lowered tutorial bot count from 400 to 100
- [[tasks/missions-difficulty-investigation]] — Sprint 4 findings on generated mission difficulty, tuning levers, and analytics gaps
- [[tasks/solo-win-condition-fix]] — Sprint 4 bug fix for opponent-win loss handling in solo modes
- [[tasks/analytics-p0-game-mode-segmentation]] — Sprint 4 P0 analytics classifier for multiplayer versus solo match starts
- [[tasks/analytics-p0-match-duration]] — Sprint 4 P0 analytics duration event from fresh match start to match end
- [[tasks/analytics-p0-player-days-played]] — Sprint 4 P0 analytics loyalty-depth event for unique calendar days opened
- [[tasks/analytics-p0-yandex-login-status]] — Sprint 4 P0 analytics identity-reach event for Yandex logged-in, guest, and unknown states
- [[tasks/analytics-p0-session-match-count]] — Sprint 4 P0 analytics per-session match starts for citizenship XP threshold analysis
- [[tasks/telegram-link]] — Sprint 4 experiment-gated Telegram CTA on start and game-end screens
- [[tasks/vk-link]] — Sprint 4 experiment-gated VK CTA on start and game-end screens
- [[tasks/nuke-trajectory-visibility]] — Sprint 4 nuke targeting arc visual polish
- [[tasks/teams-mode-max-teams]] — Sprint 4 cap for regular public teams-mode lobby team counts
- [[decisions/hvn-balance-pr70-no-ship]] — no-ship review and cancellation outcome for the HvN balance attempt
- [[decisions/cancelled-tasks]] — cancelled action-pause variant, HvN balance attempt, compact-map runtime fallback, and dropped guest-first profile XP slices
