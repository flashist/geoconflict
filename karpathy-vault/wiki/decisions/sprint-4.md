# Sprint 4 — In-App Monetization & Citizenship

**Date**: planned
**Status**: proposed

## Context

Goal: launch the citizenship system and the in-app purchase foundation. Give loyal players a visible long-term goal (50 qualifying matches), a direct purchase path (99 rubles), and the first meaningful citizenship benefit (name change). Establish the payment infrastructure and player profile store that future monetization depends on.

**Rewarded ads explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

Source: `ai-agents/sprints/plan-sprint-4.md`
Follow-up sources: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/tasks/done/s4-tutorial-no-nations.md`, `ai-agents/tasks/done/s4-tutorial-build-menu-lock.md`, `ai-agents/tasks/done/s4-tutorial-reduce-bots.md`, `ai-agents/tasks/cancelled/s4-tutorial-action-pause.md`, `ai-agents/tasks/cancelled/s4-nations-balance-task.md`, `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`

## Decision

Sprint 4 remains the planned citizenship and payments sprint, but the wiki now reflects two roadmap updates from the latest source brief:

- `8d-A` (global announcements) was already pulled forward and shipped in Sprint 2, so it is no longer upcoming Sprint 4 scope
- Sprint 4 now also carries four small independent backlog items that can ship alongside the monetization track without waiting on the investigation work

**Phase 1 — Investigations (run in parallel):**
- **Investigation A:** Player Profile Store — complete. Recommended PostgreSQL on the game VPS as a sibling service, an initial `player_profiles` + idempotent `player_match_credits` schema, server-side match crediting at match end, and a verified Yandex identity claim in the join/auth path because the current server only sees `persistentID`. See [[tasks/player-profile-store-investigation]].
- **Investigation B:** Yandex Payments Catalog — SDK API, catalog fetch architecture, dashboard setup + approval timeline. **Action required immediately:** register catalog items in Yandex Games dashboard (approval takes days).

**Already shipped earlier:** `8d-A` (Global Announcements) was pulled forward into Sprint 2 and should be treated as an available dependency for Sprint 4 work, not a Sprint 4 deliverable.

**Independent Sprint 4 backlog additions:**

| Task | Effort | Notes |
|---|---|---|
| Humans vs Nations — Balance Nation Count | half a day | Balance fix. Target nation count as close to 1:1 with human players as lobby capacity allows |
| AI Lobby Slot Bug — Always Keep One Slot Free | half a day | Bug fix. Preserve one human-joinable slot and only auto-start when no AI players remain |
| Tutorial — Pause During Action-Required Steps | half a day | Tutorial polish. Keep the match near-paused until the expected tutorial action is detected |
| Tutorial — Remove Nations, Keep Only Bots | 1-2 hours | Config-only tutorial simplification to remove aggressive nation opponents |
| Tutorial — Lock Build Menu to City During Tooltip 5 | half a day | Tutorial guardrail so the player cannot stall tooltip 5 by building the wrong structure |
| Tutorial — Reduce Bot Count from 400 to 100 | 30 minutes | Tutorial simplification to make Iceland less crowded and easier to follow |

**Phase 2 — Implementation (after investigation findings reviewed with Mark):**
Briefs to be written after findings. Confirmed scope:

| Task | Description |
|---|---|
| Player Profile Store | Database + schema from Investigation A |
| Yandex Payments | Catalog fetch + caching from Investigation B |
| Citizenship — match counter | Track 50 qualifying matches server-side + progress UI |
| Citizenship — earned path | At 50 matches: flip `isCitizen = true`, send inbox message, in-game notification |
| Citizenship — paid path | 99 rubles via Yandex catalog. `isPaidCitizen = true` on purchase |
| 8d-B — Personal inbox | Direct messages from game to citizens (citizenship earned/purchased, name review) |
| Name change | First citizenship benefit — citizens only, requires moderation |
| Citizen verified icon | Visible in lobbies and match player list |

## Locked Decisions

**Qualifying match definition:**
- ✅ Counts: eliminated by another player/bot, survived to match end (any outcome)
- ❌ Does not count: voluntary Leave mid-match, disconnected without return, never spawned

**Pricing:**
- Citizenship: **99 rubles** (~50% to Yandex + taxes)
- Cosmetics (Sprint 5): 149–199 rubles (includes citizenship automatically)

**Earned path is independent of payments** — 50-match counter can ship before Yandex catalog approval.

## Consequences

- Register Yandex catalog items immediately — approval takes days and should not block implementation
- Player Profile Store investigation concluded that the current codebase needs a verified Yandex identity in the join/auth path before Yandex-keyed paid entitlements are safe
- Qualifying-match crediting should happen on the game server at match end, but implementation needs one additional end-of-match per-player state summary because the server does not currently simulate spawn/elimination itself
- Phase 2 briefs written only after both investigation findings reviewed
- 8d-A is already live from Sprint 2 and provides the communication channel Sprint 4 can build on
- 8d-B (personal inbox) depends on both 8d-A already being live and the player profile store going live
- Sprint 4 is no longer purely monetization scope; it also bundles four tutorial follow-ups and two lobby/balance fixes that can be scheduled independently
- Tutorial follow-up work later resolved into three shipped fixes (`[[tasks/tutorial-no-nations]]`, `[[tasks/tutorial-build-menu-lock]]`, `[[tasks/tutorial-reduce-bots]]`) plus one cancelled pause-window attempt recorded in [[decisions/cancelled-tasks]]
- The Humans vs Nations balance task was later rejected as no-ship and cancelled after review; see [[decisions/hvn-balance-pr70-no-ship]]

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-3]] — previous sprint
- [[decisions/sprint-5]] — next sprint
- [[decisions/sprint-6]] — later content sprint depends on this payments/citizenship layer
- [[features/tutorial]] — tutorial follow-up fixes were added to the Sprint 4 backlog
- [[features/ai-players]] — AI Players feature (already active in production)
- [[tasks/player-profile-store-investigation]] — completed Sprint 4 investigation for player-store technology, hosting, schema, and match-crediting approach
- [[tasks/ai-lobby-slot-bug]] — Sprint 4 bug fix for mixed real-plus-AI full lobbies
- [[tasks/tutorial-no-nations]] — Sprint 4 tutorial simplification that removed nation opponents
- [[tasks/tutorial-build-menu-lock]] — Sprint 4 tooltip-5 build-menu guardrail
- [[tasks/tutorial-reduce-bots]] — Sprint 4 tutorial config change that lowered tutorial bot count from 400 to 100
- [[decisions/hvn-balance-pr70-no-ship]] — no-ship review and cancellation outcome for the HvN balance attempt
- [[decisions/cancelled-tasks]] — cancelled action-pause variant for tutorial follow-up work
