# Sprint 4 — In-App Monetization & Citizenship

**Date**: 2026-04-16
**Status**: accepted

> **Status corrected 2026-08-08.** This page carried `proposed` while describing a sprint that is live and mostly shipped. Sprint 4 is the **current** sprint. See [[systems/project-brief]].
>
> **Chain updated 2026-08-23.** The degraded-mode gate is cleared (0049 done) and the citizenship card is interim-hidden (0054), but the earned/paid citizenship chain is **blocked by `0062`**: the profile backend's code path is complete and its host live, yet production never forwards `PROFILE_INTERNAL_TOKEN`, so no profile row is created and no XP is credited in prod. A 2026-08-22 production outage also added an outage track (`0055` done → `0057` → `0056`). See [[decisions/incident-2026-08-22-public-lobbies-outage]].
>
> **Re-scoped 2026-08-23 (owner-ruled: "don't block on Yandex externals"), built 2026-08-24.** `0017` (earned) and `0018` (paid) were re-scoped to build/verify against the **local profile stack** (0017) and a **mocked SDK catalog** (0018) now; both are built and review-converged Ready-to-merge **on that local/mock scope only** — and both stay **OPEN**: `0017` until its `0062`-gated Deferred Live Tail runs, `0018` until the split-out live tail `0065` (blocked on Yandex catalog approval + secret key `0014` **AND** `0062` — neither alone unblocks). `0012` got the same local-first treatment. The 0025 licensing audit completed 2026-08-23 (V1 violation found) and its remediation `0066` is built and agent-closed but **NOT deployed** — `0065`'s flip-ON gate is "`0066` DEPLOYED".

## Context

Goal: launch the citizenship system and the in-app purchase foundation. Establish the payment infrastructure, player profile store, and start-screen UI foundation that future monetization depends on.

The latest sprint brief now frames citizenship progression as an XP system: `10 XP` per qualifying match and `1,000 XP` for citizenship, or roughly `100` qualifying matches. This supersedes the older Sprint 4 shorthand that described the goal as a 50-match milestone.

**Rewarded ads explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

Source: `ai-agents/sprints/plan-sprint-4.md`
Follow-up sources: `ai-agents/tasks/done/0124-investigation-player-store/brief.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/tasks/done/0168-profile-01-schema-contract/brief.md`, `ai-agents/tasks/done/0170-profile-03-yandex-identity/brief.md`, `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`, `ai-agents/tasks/done/0173-profile-04a-server-skeleton/brief.md`, `ai-agents/tasks/done/0174-profile-04b-client-api-url-config/brief.md`, `ai-agents/tasks/done/0175-profile-04c-dockerfile/brief.md`, `ai-agents/tasks/done/0176-profile-04d-vps-provisioning/brief.md`, `ai-agents/knowledge-base/s4-profile-04d-ru-residency-review-finding-2026-06-20.md`, `ai-agents/tasks/done/0177-profile-04e1-build-push-digest/brief.md`, `ai-agents/tasks/done/0179-profile-04e2-onbox-stack-gate/brief.md`, `ai-agents/tasks/done/0180-profile-04e3-deploy-wiring-milestone/brief.md`, `ai-agents/tasks/done/0181-profile-04f-image-secret-scan/brief.md`, `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md`, `ai-agents/tasks/done/0125-investigation-yandex-payments/brief.md`, `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`, `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`, `ai-agents/tasks/done/0146-analytics-p0-game-mode-segmentation/brief.md`, `ai-agents/tasks/done/0147-analytics-p0-match-duration/brief.md`, `ai-agents/tasks/done/0149-analytics-p0-player-days-played/brief.md`, `ai-agents/tasks/done/0151-analytics-p0-yandex-login-status/brief.md`, `ai-agents/tasks/done/0126-global-announcements/brief.md`, `ai-agents/tasks/done/0139-start-screen-redesign-investigation/brief.md`, `ai-agents/tasks/done/0166-start-screen-redesign-impl/brief.md`, `ai-agents/tasks/done/0167-app-bootstrap-single-entry-point/brief.md`, `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`, `ai-agents/tasks/done/0128-legal-vat-investigation/brief.md`, `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`, `ai-agents/tasks/done/0117-ai-lobby-slot-bug/brief.md`, `ai-agents/tasks/done/0165-feedback-modal-space-key/brief.md`, `ai-agents/tasks/done/0127-email-subscribe/brief.md`, `ai-agents/tasks/done/0122-tutorial-no-nations/brief.md`, `ai-agents/tasks/done/0121-tutorial-build-menu-lock/brief.md`, `ai-agents/tasks/done/0123-tutorial-reduce-bots/brief.md`, `ai-agents/tasks/done/0142-missions-difficulty-investigation/brief.md`, `ai-agents/knowledge-base/s4-missions-difficulty-findings.md`, `ai-agents/tasks/done/0140-solo-win-condition-fix/brief.md`, `ai-agents/tasks/done/0141-telegram-link/brief.md`, `ai-agents/tasks/done/0145-vk-link/brief.md`, `ai-agents/tasks/done/0143-nuke-trajectory-visibility/brief.md`, `ai-agents/tasks/done/0144-teams-mode-max-teams/brief.md`, `ai-agents/tasks/cancelled/0120-tutorial-action-pause/brief.md`, `ai-agents/tasks/cancelled/0119-nations-balance/brief.md`, `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`, `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`, `ai-agents/tasks/backlog/s4-investigate-null-id-errors.md`, `ai-agents/tasks/done/0164-enable-client-source-maps/brief.md`
Recent profile-store cancellation sources: `ai-agents/tasks/cancelled/0169-profile-02-guest-localstorage/brief.md`, `ai-agents/tasks/cancelled/0171-profile-07-guest-migration/brief.md`, `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`
Recent profile-store completion/compliance sources: `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md`, `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`, `ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md`, `ai-agents/tasks/done/0184-profile-04h-game-server-deploy-env/brief.md`, `ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md`, `ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md`, `ai-agents/tasks/done/0189-postgres-backup-routine/brief.md`, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, `ai-agents/tasks/done/0186-personal-data-compliance-investigation/brief.md`, `ai-agents/knowledge-base/personal-data-152fz-findings.md`, `ai-agents/tasks/cancelled/0187-profile-hash-player-ids/brief.md`
Recent citizenship UI sources: `ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md`, `ai-agents/tasks/done/0190-citizenship-card-guest-cta-no-sdk/brief.md`

## Decision

Sprint 4 is no longer just a future plan. The latest source brief records a mixed state: the two technical investigations are complete, several independent fixes are shipped, multiple side tasks were cancelled, and the backend profile-store path is complete in code through match-end XP crediting plus off-box backups — though **in production the crediting path silently no-ops until `0062` lands** (verified 2026-08-23; see Consequences). The citizenship XP/progress card is wired to live profile reads, but the card itself is hidden behind the 0054 flag until launch. The broader payments/citizenship track still depends on payments/catalog work, earned/paid citizenship flows, and deferred legal/compliance follow-up.

**Completed groundwork:**
- **Investigation A: Player Profile Store** is complete. It recommends PostgreSQL, an initial `player_profiles` plus idempotent match-credit ledger, server-side match crediting at match end, and a verified Yandex identity claim in the join/auth path because the current server only sees `persistentID`. Its original game-VPS co-location recommendation is superseded: the profile store and non-game backend logic now run on a dedicated reg.ru VPS behind `api.geoconflict.ru`, with Postgres localhost-only on that box. See [[tasks/player-profile-store-investigation]].
- **Player Profile Store T1: Schema Contract** is complete. The shared `PlayerProfile` v1 payload, Zod schema, pure `migrateProfile()`, and `createGuestProfile()` factory now live in `src/core/profile/PlayerProfile.ts`, with focused tests in `tests/core/profile/PlayerProfile.test.ts`. See [[tasks/profile-schema-contract]].
- **Player Profile Store T3: Yandex Identity** is complete. The client resolves a tolerant Yandex unique ID during lobby join, the optional/nullable join schema carries it through `Transport`, and the server retains it on `Client` for later match crediting. The value is an unsigned profile key, not paid-identity verification. See [[tasks/yandex-identity-plumbing]].
- **Player Profile Store T4 is complete.** The monolithic backend-infrastructure PR #112 was reverted after an unbounded hardening/review loop, then restarted as bounded T4a–T4i slices. The full T4 track has now shipped: liveness-only profile server, public API-URL runtime config, allowlist-copy amd64 Docker image, dedicated reg.ru VPS provisioning/TLS boundary, local build/push with fail-closed immutable digest resolution, on-box compose plus rollback lifecycle, SSH/SCP deploy wiring, image secret scan, argv/concurrency/wrong-host hardening, game-server `PROFILE_API_URL` propagation, and operator bring-up. The profile box is live at `api.geoconflict.ru`. See [[tasks/profile-server-skeleton]], [[tasks/profile-api-url-config]], [[tasks/profile-docker-image]], [[tasks/profile-vps-provisioning]], [[tasks/profile-build-push-digest]], [[tasks/profile-onbox-stack-gate]], [[tasks/profile-deploy-wiring]], [[tasks/profile-image-secret-scan]], [[tasks/profile-deploy-hardening]], [[tasks/profile-game-server-deploy-env]], [[tasks/profile-server-bring-up-runbook]], and [[decisions/profile-deploy-hardening-review-loop]].
- **Player Profile Store T5: Backend DB + API is complete.** The dedicated profile service now owns the Postgres migration, repository, `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `/ready` endpoint. The chosen storage strategy is typed columns plus `extra jsonb`, with `xp bigint` and `persistent_id text`; the profile service, not the game server, owns direct DB access. See [[tasks/profile-backend-db-api]], [[systems/player-profile-store]], and [[decisions/profile-storage-strategy]].
- **Player Profile Store T6: Match-End XP Crediting is complete.** The game server now accepts client participation summaries with winner messages, applies server-side qualification against the frozen roster and live connection state, and fire-and-forgets idempotent profile API credits through `ProfileApiClient`. Profile API failures remain fail-soft for match cleanup. See [[tasks/profile-match-end-crediting]] and [[systems/player-profile-store]].
- **Player Profile Store T8: PostgreSQL backups are complete.** The profile deploy path now installs a daily encrypted off-box `pg_dump -Fc` backup using age and S3-compatible storage, verifies upload size before deleting local temp files, writes a monitor-readable marker, fail-closes on bad redeploy backup config, and documents default-deny restore drills. See [[tasks/postgres-backup-routine]] and [[systems/player-profile-store]].
- **Player Profile Store T2/T7 guest-first slices are cancelled.** The client-only guest localStorage XP store and guest-to-authenticated migration flow were dropped on 2026-06-13 after review-driven hardening expanded the scope beyond the intended small client slice. Profile XP is now authenticated-only through the backend T5/T6 path. See [[decisions/cancelled-tasks]].
- **Personal-data compliance (152-ФЗ) is no longer a Sprint 4 go-live gate, but the risk is explicit.** The initial hash-based avoidance conclusion was overturned on 2026-06-28: hashing the Yandex ID does not remove the notification/consent obligation. The hash implementation task is cancelled, PR #127 was reverted, and Roskomnadzor/consent work moved to no-sprint backlog with accepted risk. See [[tasks/personal-data-compliance-investigation]], [[decisions/personal-data-152fz-compliance]], and [[decisions/sprint-backlog]].
- **Investigation B: Yandex Payments Catalog** is complete. It recommends signed Yandex purchases, a memoized session catalog cache in `FlashistFacade`, signed client-to-server verification plus startup reconciliation through `getPurchases()`, and post-grant consumption after durable entitlement storage. See [[tasks/yandex-payments-investigation]].
- **Global announcements (`8d-A`)** are complete and available as the base communication surface for future inbox or citizenship messaging. See [[tasks/global-announcements]].
- **Start screen redesign investigation** is complete and locks the layout direction for citizenship UI. See [[tasks/start-screen-redesign-investigation]].
- **Start screen redesign implementation** is complete. The start screen now uses the two-tab Multiplayer/Singleplayer layout, has a citizenship card shell above the tabs, persists the active tab, renamed Single Player to `Custom Game` / `Своя игра`, and emits tab/citizenship-surface analytics. See [[tasks/start-screen-redesign-implementation]].
- **Citizenship Core: XP Counter & Progress UI is complete.** The citizenship card now reads the profile API through `loadPlayerProfileView()`, parses the shared public profile projection, shows live XP/citizenship state for authorized users, and degrades authorized failures to a logged-in zero-state rather than a guest login CTA. See [[tasks/citizenship-xp-progress-ui]].
- **Citizenship Card: no-SDK guest CTA fix is complete.** The card now omits the Yandex login button when `FlashistFacade.instance.yaGamesAvailable` is false, so standalone/local sessions keep the locked guest message without presenting a dead auth control. Real Yandex guests still see the login CTA. See [[tasks/citizenship-card-guest-cta-no-sdk]].
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
| Player Profile Store — Implementation | in progress | T1, T3, T4a–T4i, T5, T6, and T8 are done; T2/T7 are cancelled. Parent brief still carries the broader profile-store epic context |
| Feedback Popup — Remove Email/Contact Field | done (agent-closed — not owner-verified) | 0046 shipped 2026-08-14: contact field removed end-to-end; post-deploy live checks still owner-side. See [[tasks/feedback-remove-contact-field]] |
| Personal-Data Compliance (152-ФЗ) — Roskomnadzor notification + consent flow | no-sprint backlog | Deferred from Sprint 4 on 2026-06-28 with risk accepted; real PII may persist before notification/consent work is complete |
| PostgreSQL Backup Routine (Profile Store) | done | Daily encrypted off-box backup, deploy-time smoke check, failure marker, retention, restore runbook, and first empty-DB restore drill are complete |
| Yandex Payments — Catalog Fetch & Purchase Infrastructure | done (agent-closed — not owner-verified) | 0019 shipped 2026-08-14: catalog cache, profile-server verification endpoints, reconciliation. Live verifications (real catalog/purchase/reconcile) deferred to a written checklist until 0014's catalog approval + secret key. See [[tasks/yandex-payments-implementation]] |
| Citizenship Core — XP Counter & Progress UI | done | Live profile API read now drives the start-screen citizenship card for authorized players |
| Citizenship Card — Login CTA outside Yandex context | done | Standalone/no-SDK guest state hides the login CTA instead of showing a dead button |
| Degraded-Mode UX — Yandex SDK timeout/failure treatment | done (agent-closed — not owner-verified) | 0049 closed 2026-08-14: `isYandexDegraded()` + distinct card state; case (b) healthy-SDK guest unit-test-only. Clears the earned/paid citizenship gate. See [[tasks/degraded-mode-ux-treatment]] |
| Citizenship Core — Earned Citizenship | **built + reviewed 2026-08-24 — OPEN** | 0017, re-scoped 2026-08-23 (owner-ruled: don't block on Yandex externals): built and verified against the **local** profile stack (profile server + Postgres via Docker, `RUN_DB_TESTS=1`); review converged Ready-to-merge **on local scope only**. `0062` stays real but gates only the brief's **Deferred Live Tail** (prod XP accrual, live grant, card-flag flip-ON) — ⚠️ **do not close until that tail runs**. Never depended on 0014/Yandex |
| Citizenship Core — Paid Citizenship | **built + reviewed 2026-08-24 (mock scope) — OPEN** | 0018, re-scoped 2026-08-23 to the **mock-buildable scope only**: purchase flow, grant, reconciliation UI against a mocked SDK catalog on 0019's `PaymentsContract`/`PaymentsApiClient` seam; review converged Ready-to-merge **on that scope only**. Does NOT go live from this task — both former blockers (`0062`, catalog approval `0014`) now gate the split-out live tail `0065`. Stays open pending `0065` |
| Paid Citizenship — Live Verification & Go-Live Tail | **blocked by 0014 AND 0062** | 0065, split out of 0018 on 2026-08-23 (owner-ruled, on the 0019 deferred-checklist precedent); absorbs 0019's live checklist: real signed payloads/HMAC confirmation, live catalog fetch, real test purchase, live reconciliation, moderation behavior, 0054 flip-ON at go-live. Neither blocker alone unblocks it; **flip-ON additionally gated on "`0066` DEPLOYED"** |
| Hide Citizenship Card Behind Client Flag (default OFF) | done (agent-closed — not owner-verified) | 0054 shipped 2026-08-21: the dead-end degraded card no longer tops the production start screen; flipping the flag ON is the relaunch mechanism bundled into 0017/0018. See [[tasks/hide-citizenship-card-flag]] |
| `Master.ts` — Parseable Lobbies Body + Worker-Exit Diagnostics | done (agent-closed — not owner-verified) | 0055 closed 2026-08-22 (outage track, unblocked half). ⚠️ On the **unpushed** branch `419a116` at close — not deployed. First-ever `Master.ts` tests. See [[tasks/master-lobbies-worker-exit-diagnostics]] |
| Worker Crash Recovery + Survivable Scheduling Gate | backlog (after 0057) | 0056 — the 2026-08-22 outage root-cause fix. Both owner decisions ruled 2026-08-22 (quorum 18/20 with 90 s deadline; restart cap 5 per index per 10 min, backoff 1s→30s, cap mandatory — fork-loop risk). Starts after 0057's findings |
| Investigation — Routing to Dead/Unready Workers | backlog | 0057, architect-led, promoted from the Backlog board 2026-08-22 (owner-ruled to run **before** 0056 — quorum size sets the misroute rate) |
| Forward `PROFILE_INTERNAL_TOKEN` in Deploy | backlog | 0062 — 🚨 verified 2026-08-23: the profile client silently no-ops in prod (miss logged at `debug`), the profile server independently fails closed; **blocks the citizenship go-live** — since the mock-first re-scope that means 0017's Deferred Live Tail and 0065, while the 0017/0018 builds proceed locally. Fix is one line in `deploy.sh` |
| Prod `/api/env` Advertises `http` + Raw IP | backlog | 0063 — ⚠️ already broken in production, architect-traced 2026-08-23: token login never completes and returning users silently lose their profile on every load. Carries an open question about a possible JWT issuer-claim mismatch |
| Container Log Retention After nginx Stream Merge | backlog | 0060 — 150 MB shared budget nearly cost the 2026-08-22 investigation; pulled into the sprint to protect the next one. The log config is not in this repo |
| 8d-B — Personal Inbox | backlog | 0012, re-scoped 2026-08-23 (owner-ruled: local-first, same treatment as 0017) — buildable/verifiable against the local profile stack now; `0062` gates only its Deferred Live Tail. Shipping it retires the no-op inbox seams in 0017/0018/0019; builds on announcements |
| S3-Backed Match Archival (Citizen-Gated) | backlog | Blocked by player profile store, citizenship, and S3 bucket/credentials |
| Investigate & Fix Client Null-ID Errors | backlog | Stabilization follow-up; source-map enablement is done, but triage should use a deployed build with resolved Uptrace stacks |
| Name Change (Citizens Only) | backlog | First user-facing citizenship benefit |
| Citizen Verified Icon | backlog | Visible identity/status marker in lobbies and match UI |
| Licensing asset audit | in progress (audit complete 2026-08-23) | 0025 — findings: `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md`. Verdict: 1 confirmed violation (V1 — All-Rights-Reserved music shipping to the prod web root), 1 trademark item (A1 — live favicon was OpenFront's brand mark), 3 hygiene items. Gates the paid go-live (`0065`'s flip-ON), never waited on citizenship. Row stays In progress: the close routes through the producer's mover skill. See [[decisions/licensing-compliance]] |
| Licensing remediation — proprietary purge + favicon + JWT fallbacks | done (agent-closed — not owner-verified; **NOT deployed**) | 0066, from the 0025 audit, all three scope items owner-approved 2026-08-23; built + review converged 2026-08-24. ⚠️ **`0065`'s flip-ON gate is "`0066` DEPLOYED to prod" — deployment has NOT happened**; prod redeploy checks (music URLs 404, favicon live) pending owner-side. See [[tasks/licensing-remediation]] |
| Map Labels — Show Troops/Max + Attacking Troops | done (agent-closed — not owner-verified) | 0041 shipped 2026-08-14: `current / max` troops line + red attacking-troops line; singleplayer-only live validation. See [[tasks/map-troops-labels]] |
| Public Modifier — Add "5M Starting Gold" | done (agent-closed — not owner-verified) | 0042 shipped 2026-08-14: fifth weird sub-option + new `startGold` GameConfig field; post-deploy live check owner-side. See [[tasks/starting-gold-public-modifier]] |

**External/manual blocker:**
- Yandex catalog registration and approval is the remaining urgent non-engineering prerequisite called out directly in the sprint brief
- The production asset audit is now an explicit engineering prerequisite before paid citizenship goes live; see [[decisions/licensing-compliance]]
- The personal-data compliance track is separate from VAT/tax and IP/licensing. Its first hash-based avoidance plan was invalidated; Sprint 4 now accepts the risk and defers Roskomnadzor notification plus consent/privacy-policy work to backlog.

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
- Citizenship surface placement: full-width card above the tabs; live XP/profile reads have shipped, while purchase and earned-notification flows remain separate tasks
- Guest state must show a Yandex login CTA rather than silently hiding progress
- Standalone/no-SDK guest state is the exception: when no Yandex context exists, the card must not show a login CTA that can only no-op
- Yandex degraded mode now has its own Sprint 4 backlog treatment before earned/paid citizenship launch; it should not remain collapsed into the real-guest CTA state for the citizenship funnel
- The last active tab should persist across sessions
- "Single Player" is renamed to `Custom Game` / `Своя игра`
- `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` shipped with the redesign implementation
- Win-screen return target remains the only explicitly open product question from the redesign investigation

**Pricing:**
- Citizenship: **99 rubles** (~50% to Yandex + taxes)
- Cosmetics (Sprint 5): 149–199 rubles (includes citizenship automatically)

**Earned path is independent of payments** — the XP/progression path can ship before Yandex catalog approval once the player profile store and redesigned UI exist.

## Consequences

- Sprint 4's core track **was** paused during the owner's May 15 – June 1, 2026 travel window; that pause ended and the track resumed. [[decisions/sprint-4b]] covers the interim player-facing variety sprint and [[decisions/sprint-4c]] covers production stabilization, both of which explicitly excluded this monetization infrastructure.
- Start screen redesign implementation is done, and the follow-up citizenship XP/progress UI now reads live profile data through the profile API.
- The app-bootstrap refactor removes the race-condition class around Yandex SDK, experiment flags, player data, and language startup. Future citizenship auth and Yandex payments work should plug into the explicit `Bootstrap.ts` / `FlashistFacade.initializePlatform()` gate instead of adding per-component startup waits.
- The no-SDK card fix resolved only standalone/local dead controls. The real Yandex degraded-mode treatment has since shipped (0049, agent-closed 2026-08-14): `isYandexDegraded()` drives a distinct connection-problem card state with no login CTA, clearing the gate before earned/paid citizenship. The healthy-SDK real-guest case remains unit-test-only pending a Yandex embed run. See [[tasks/degraded-mode-ux-treatment]].
- Production release validation for bootstrap-sensitive work must include the Yandex iframe path because the real `YaGames.init()` path, SDK language, player name, experiment flags, and `LoadingAPI.ready()` timing are platform-dependent.
- The VAT/tax gate is cleared; payments work no longer waits on extra legal registration, bank changes, or company-structure changes
- The VAT/tax gate does not clear IP/licensing compliance: before monetization scales, GeoConflict still needs a public current source repository, visible in-game source-code link, production asset audit, and legal review of AGPL/Yandex.Games interactions. See [[decisions/licensing-compliance]].
- The VAT/tax gate also does not clear Russian personal-data obligations. The current Sprint 4 source explicitly defers 152-ФЗ/Roskomnadzor notification plus consent/privacy-policy work with accepted risk; future compliance work still needs to cover Yandex IDs, display names, email subscription, and deferred archive PII surfaces.
- Register Yandex catalog items immediately — approval takes days and remains the main non-engineering blocker
- Player Profile Store investigation concluded that the current codebase needs a verified Yandex identity in the join/auth path before Yandex-keyed paid entitlements are safe.
- The profile-store hosting decision changed on 2026-06-13: run the profile API and Postgres on a dedicated reg.ru VPS at `api.geoconflict.ru`, with Postgres localhost-only and game servers calling the profile API over authenticated HTTP. This isolates match availability from profile outages and protects paid data from game-server crashes.
- T1 of the profile-store implementation is done: `PlayerProfile` v1 is shared from `src/core/profile/PlayerProfile.ts`, `migrateProfile()` normalizes untrusted persisted JSON without clocks or I/O, and `createGuestProfile()` creates fresh local profiles. T5 must still enforce DB column bounds for `xp`; if any guest migration endpoint is revived later, paid fields must be force-cleared and earned citizenship recomputed server-side instead of trusted from client payloads. See [[tasks/profile-schema-contract]].
- T3 is done: authorized Yandex sessions now carry `yandexPlayerId` through the join message into the server-side `Client`, while guests, degraded SDK sessions, and older clients normalize to `null`. The ID remains untrusted until a separate verification boundary uses it. See [[tasks/yandex-identity-plumbing]].
- The original T4 backend-infrastructure implementation was reverted rather than hardened further as one branch. The restart now uses T4a–T4i, fixed per-slice acceptance criteria, bounded review, authoritative security oracles, and explicit residuals; database-URL semantics stay with T5's real consumer. See [[decisions/profile-deploy-hardening-review-loop]].
- T4e2/T4e3/T4f/T4g/T4h/T4i are done: the profile deploy path now has on-box compose lifecycle, digest rollback, secret-staged SSH/SCP transport, a blocking built-image layer byte scan, argv/concurrency/wrong-host hardening, game-server `PROFILE_API_URL` propagation, and a live 200/TLS profile host. See [[tasks/profile-onbox-stack-gate]], [[tasks/profile-deploy-wiring]], [[tasks/profile-image-secret-scan]], [[tasks/profile-deploy-hardening]], [[tasks/profile-game-server-deploy-env]], and [[tasks/profile-server-bring-up-runbook]].
- T5 is done: profile persistence now has Postgres migrations, a repository, client read endpoint, internal credit endpoint, DB-backed readiness, and typed-column storage. See [[tasks/profile-backend-db-api]] and [[systems/player-profile-store]].
- T6 is done: match-end winner handling now carries client participation summaries, applies server-side qualification, uses `ProfileApiClient` for bounded-retry internal credit calls, and keeps profile outages fail-soft for gameplay. See [[tasks/profile-match-end-crediting]].
- The guest-first XP path was dropped on 2026-06-13: T2 localStorage-authoritative XP and T7 guest-to-authenticated migration are cancelled, and the `POST /v1/profile/migrate` endpoint was removed from T5 rather than deferred. Guest users still get the locked citizenship card plus login prompt, but profile XP is authenticated-only through T6 server-side crediting. A future guest-XP retry should be a thin best-effort cache over the server source of truth, not a localStorage-authoritative store. See [[decisions/cancelled-tasks]].
- The hash-based 152-ФЗ avoidance path was cancelled on 2026-06-28. Current profile storage should not assume hashed IDs remove legal obligations; compliance resolution is now backlog work under [[decisions/personal-data-152fz-compliance]].
- Profile-store backups have moved from prerequisite to implemented T8: daily `pg_dump`, age encryption, off-box S3-compatible upload, upload verification, failure marker, retention, restore runbook, and deploy-time smoke validation are in place. A non-empty restore drill remains the main operational follow-up once real profile/entitlement data exists.
- Yandex Payments investigation concluded that paid citizenship should use signed purchase verification on the server, startup reconciliation via `getPurchases()`, and post-grant consumption once the entitlement is durably stored; purchase UI should be hidden when the dashboard catalog item is absent or unavailable. That infrastructure is now built (0019, agent-closed): endpoints live on the **profile server**, not the game server, fail-closed until the Yandex secret key exists; live purchase verification waits on catalog approval (0014) and the 0018 purchase UI. See [[tasks/yandex-payments-implementation]].
- Qualifying-match crediting now happens from the game server at match end via the T6 participation-summary path.
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
- The two independent enhancements outside the citizenship/payment track have both shipped (agent-closed 2026-08-14): richer map labels from existing client-side troop data ([[tasks/map-troops-labels]], task 0041) and the bounded 5M starting-gold public modifier for real players only ([[tasks/starting-gold-public-modifier]], task 0042).
- Monetization launch decisions should use the analytics spec's P0/P1 gates instead of treating the 1,000 XP threshold, purchase funnel, or ad-removal economics as validated without identity, match-depth, and ad-tier data.
- Match archival is now split: Sprint 4c only reduces noise from the dead inherited archive path, while real S3-backed archival is deferred to the citizen-history track after player profiles, citizenship, and S3 infrastructure exist. See [[decisions/archive-archival-strategy]].
- The client null-ID/null-object investigation is carried by Sprint 4 as a stabilization follow-up rather than active Sprint 4c work. Sprint 4c completed source-map enablement, so this task should start from newly resolved Uptrace client stacks on a deployed build instead of minified `e is null` / `a.id` messages. See [[tasks/s4c-enable-client-source-maps]].
- Tutorial follow-up work later resolved into three shipped fixes (`[[tasks/tutorial-no-nations]]`, `[[tasks/tutorial-build-menu-lock]]`, `[[tasks/tutorial-reduce-bots]]`) plus one cancelled pause-window attempt recorded in [[decisions/cancelled-tasks]]
- The Humans vs Nations balance task was later rejected as no-ship and cancelled after review; see [[decisions/hvn-balance-pr70-no-ship]]
- **The citizenship card is hidden in production as of 0054 (2026-08-21)**: a default-OFF client flag gates the whole card, because the 0049 degraded state had become the dead-end top element of every player's start screen while citizenship remains unlaunched. Flipping the flag ON is part of the 0017/0018 launch, recorded in both briefs. See [[tasks/hide-citizenship-card-flag]].
- **The 2026-08-22 production outage added an outage track to this sprint** (`0055` shipped → `0057` investigation → `0056` root-cause fix), plus three promoted config-drift findings (`0062`, `0063`, `0060`) from the same sweep; `0058`/`0059`/`0061` stayed unsprinted. Full chain and rulings: [[decisions/incident-2026-08-22-public-lobbies-outage]].
- **The earned/paid citizenship blockers were rewritten 2026-08-23 on verified evidence**: the real gate is no longer "player profile store" (its slices are done) but `0062` — production never forwards `PROFILE_INTERNAL_TOKEN`, so no profile row is created and no XP is credited, invisibly (`debug`-level miss logging, fail-closed server side). See [[systems/player-profile-store]].
- **The same day the owner re-scoped the chain to stop blocking on Yandex externals**: `0017`/`0012` became local-first (build + verify against the local profile stack; `0062` gates only each brief's Deferred Live Tail) and `0018` became mock-first (mocked SDK catalog on 0019's payments seam), with the paid live tail split out as `0065` (blocked on `0014` AND `0062`). By 2026-08-24 both `0017` and `0018` were built and review-converged Ready-to-merge **on local/mock scope only** — both remain open pending their live tails.
- **The 0025 licensing audit completed 2026-08-23**: one confirmed violation (proprietary music in the prod web root), one trademark item (upstream favicon), three hygiene items. The remediation `0066` was owner-approved the same day, built and agent-closed 2026-08-24, but **not deployed** — `0065`'s flip-ON additionally gates on "`0066` DEPLOYED". See [[decisions/licensing-compliance]] and [[tasks/licensing-remediation]].

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
- [[tasks/yandex-identity-plumbing]] — completed T3 Yandex unique-ID plumbing from client bootstrap through server join
- [[decisions/profile-deploy-hardening-review-loop]] — T4 revert, decomposition, keeper properties, and bounded-review rules
- [[tasks/profile-server-skeleton]] — completed T4a profile-service liveness skeleton
- [[tasks/profile-api-url-config]] — completed T4b public profile URL configuration path
- [[tasks/profile-docker-image]] — completed T4c standalone profile image
- [[tasks/profile-vps-provisioning]] — completed T4d dedicated profile-VPS provisioning and TLS/network boundary
- [[tasks/profile-build-push-digest]] — completed T4e1 local amd64 build, registry push, and immutable digest resolution
- [[tasks/profile-onbox-stack-gate]] — completed T4e2 on-box stack, health gate, systemd, cron, and digest rollback
- [[tasks/profile-deploy-wiring]] — completed T4e3 SSH/SCP deploy wiring and secret staging
- [[tasks/profile-image-secret-scan]] — completed T4f built-image layer byte scan gate
- [[tasks/profile-deploy-hardening]] — completed T4g argv/concurrency and wrong-host deploy hardening
- [[tasks/profile-game-server-deploy-env]] — completed T4h game-server `PROFILE_API_URL` deploy propagation
- [[tasks/profile-server-bring-up-runbook]] — T4i operator runbook for live profile host bring-up
- [[tasks/profile-backend-db-api]] — completed T5 Postgres-backed profile API and credit endpoint
- [[tasks/profile-match-end-crediting]] — completed T6 game-server match-end XP crediting into the profile API
- [[tasks/postgres-backup-routine]] — completed T8 encrypted off-box profile DB backup and restore path
- [[systems/player-profile-store]] — profile API/Postgres architecture
- [[systems/player-infrastructure]] — pre-S4 identity/customization substrate and trust boundaries
- [[decisions/personal-data-152fz-compliance]] — current 152-ФЗ status and accepted Sprint 4 risk
- [[tasks/yandex-payments-investigation]] — completed Sprint 4 investigation for Yandex payments SDK usage, catalog caching, dashboard setup, and purchase verification flow
- [[tasks/yandex-payments-implementation]] — 0019 payments infrastructure: catalog cache, profile-server verification endpoints, reconciliation (agent-closed; live verification deferred)
- [[tasks/degraded-mode-ux-treatment]] — 0049 degraded-mode citizenship-card treatment clearing the earned/paid citizenship gate (agent-closed)
- [[tasks/feedback-remove-contact-field]] — 0046 152-ФЗ removal of the feedback contact field (agent-closed)
- [[tasks/map-troops-labels]] — 0041 map label troops/max + attacking-troops enhancement (agent-closed)
- [[tasks/starting-gold-public-modifier]] — 0042 5M starting-gold public weird sub-option (agent-closed)
- [[tasks/global-announcements]] — completed `8d-A` dependency for future inbox and citizenship messaging
- [[tasks/feedback-modal-space-key]] — Sprint 4 fix for in-match feedback typing and hotkey suppression
- [[tasks/start-screen-redesign-investigation]] — locked tab layout, viewport target, and citizenship placement decisions
- [[tasks/start-screen-redesign-implementation]] — shipped two-tab start screen, citizenship card shell, persistence, copy rename, and tab analytics
- [[tasks/citizenship-xp-progress-ui]] — shipped profile API read and live XP/citizenship card state
- [[tasks/citizenship-card-guest-cta-no-sdk]] — shipped no-Yandex-context guest CTA suppression on the citizenship card
- [[tasks/app-bootstrap-single-entry-point]] — explicit client bootstrap sequence and degraded-mode Yandex SDK gate
- [[tasks/legal-vat-investigation]] — external gate-clear task confirming no additional legal/tax blocker before payments
- [[decisions/licensing-compliance]] — separate OpenFront-derived licensing posture for AGPL/source access, assets, and trademark boundaries
- [[tasks/licensing-remediation]] — 0066 remediation of the 0025 audit findings (agent-closed 2026-08-24, not deployed; gates 0065's flip-ON)
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
- [[tasks/hide-citizenship-card-flag]] — 0054 default-OFF client flag hiding the citizenship card until launch (agent-closed)
- [[tasks/master-lobbies-worker-exit-diagnostics]] — 0055 outage-track parseable lobbies body + worker-exit logging (agent-closed)
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the 2026-08-22 public-lobbies outage record behind the sprint's outage track and the 0062/0063/0060 promotions
