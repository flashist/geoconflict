# Sprint 4 — In-App Monetization & Citizenship

**Date**: 2026-04-16
**Status**: proposed

## Context

Goal: launch the citizenship system and the in-app purchase foundation. Establish the payment infrastructure, player profile store, and start-screen UI foundation that future monetization depends on.

The latest sprint brief now frames citizenship progression as an XP system: `10 XP` per qualifying match and `1,000 XP` for citizenship, or roughly `100` qualifying matches. This supersedes the older Sprint 4 shorthand that described the goal as a 50-match milestone.

**Rewarded ads explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

Source: `ai-agents/sprints/plan-sprint-4.md`
Follow-up sources: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/tasks/done/sprint4-investigation-yandex-payments.md`, `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`, `ai-agents/tasks/done/8d-a-task-global-announcements.md`, `ai-agents/tasks/done/s4-start-screen-redesign-investigation.md`, `ai-agents/tasks/done/s4-legal-vat-investigation.md`, `ai-agents/tasks/done/s4-ai-lobby-slot-bug.md`, `ai-agents/tasks/done/s4-email-subscribe-task.md`, `ai-agents/tasks/done/s4-tutorial-no-nations.md`, `ai-agents/tasks/done/s4-tutorial-build-menu-lock.md`, `ai-agents/tasks/done/s4-tutorial-reduce-bots.md`, `ai-agents/tasks/done/s4-missions-difficulty-investigation.md`, `ai-agents/knowledge-base/s4-missions-difficulty-findings.md`, `ai-agents/tasks/done/s4-solo-win-condition-fix.md`, `ai-agents/tasks/done/s4-telegram-link.md`, `ai-agents/tasks/cancelled/s4-tutorial-action-pause.md`, `ai-agents/tasks/cancelled/s4-nations-balance-task.md`, `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`

## Decision

Sprint 4 is no longer just a future plan. The latest source brief records a mixed state: the two technical investigations are complete, several independent fixes are shipped, two side tasks were cancelled, and the core payments/citizenship implementation track remains blocked on redesign and infrastructure prerequisites.

**Completed groundwork:**
- **Investigation A: Player Profile Store** is complete. It recommends PostgreSQL on the game VPS, an initial `player_profiles` plus idempotent `player_match_credits` schema, server-side match crediting at match end, and a verified Yandex identity claim in the join/auth path because the current server only sees `persistentID`. See [[tasks/player-profile-store-investigation]].
- **Investigation B: Yandex Payments Catalog** is complete. It recommends signed Yandex purchases, a memoized session catalog cache in `FlashistFacade`, signed client-to-server verification plus startup reconciliation through `getPurchases()`, and post-grant consumption after durable entitlement storage. See [[tasks/yandex-payments-investigation]].
- **Global announcements (`8d-A`)** are complete and available as the base communication surface for future inbox or citizenship messaging. See [[tasks/global-announcements]].
- **Start screen redesign investigation** is complete and locks the layout direction for citizenship UI. See [[tasks/start-screen-redesign-investigation]].
- **Legal/VAT investigation** is complete and clears the external legal/tax gate for in-app purchases. See [[tasks/legal-vat-investigation]].

**Completed independent Sprint 4 tasks:**
- AI Lobby Slot Bug — done
- Tutorial: remove nations — done
- Tutorial: lock build menu to City during tooltip 5 — done
- Tutorial: reduce bot count from 400 to 100 — done
- Email Subscription Modal — done
- Missions difficulty investigation and follow-up mission-generation tuning — done
- Solo opponent win-condition fix — done
- Telegram Channel Link — done

**Cancelled side tasks:**
- Humans vs Nations balance task — cancelled after no-ship review
- Tutorial action-pause variant — cancelled due to implementation complexity

**Remaining implementation track:**

| Task | Status | Notes |
|---|---|---|
| Start Screen Redesign — Implementation | backlog | Required before citizenship progress UI can fit on the start screen |
| Player Profile Store — Implementation | backlog | Depends on Investigation A conclusions and verified Yandex identity work |
| Yandex Payments — Catalog Fetch & Purchase Infrastructure | backlog | Depends on Investigation B conclusions and catalog readiness |
| Citizenship Core — XP Counter & Progress UI | backlog | Blocked by start screen redesign implementation |
| Citizenship Core — Earned Citizenship | backlog | Blocked by player profile store |
| Citizenship Core — Paid Citizenship | backlog | Blocked by payments implementation plus catalog approval |
| 8d-B — Personal Inbox | backlog | Blocked by player profile store; builds on announcements |
| Name Change (Citizens Only) | backlog | First user-facing citizenship benefit |
| Citizen Verified Icon | backlog | Visible identity/status marker in lobbies and match UI |

**External/manual blocker:**
- Yandex catalog registration and approval is the remaining urgent non-engineering prerequisite called out directly in the sprint brief

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
- Adopted layout: two tabs, with Multiplayer as the default first tab
- Citizenship surface placement: full-width card above the tabs
- Guest state must show a Yandex login CTA rather than silently hiding progress
- The last active tab should persist across sessions
- "Single Player" should be renamed to `Custom Game` / `Своя игра` when implemented
- `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` are the planned analytics events for the redesign implementation
- Win-screen return target remains the only explicitly open product question from the redesign investigation

**Pricing:**
- Citizenship: **99 rubles** (~50% to Yandex + taxes)
- Cosmetics (Sprint 5): 149–199 rubles (includes citizenship automatically)

**Earned path is independent of payments** — the XP/progression path can ship before Yandex catalog approval once the player profile store and redesigned UI exist.

## Consequences

- Start screen redesign implementation is now a prerequisite for the citizenship XP/progress UI, not a nice-to-have polish task
- The VAT/tax gate is cleared; payments work no longer waits on extra legal registration, bank changes, or company-structure changes
- Register Yandex catalog items immediately — approval takes days and remains the main non-engineering blocker
- Player Profile Store investigation concluded that the current codebase needs a verified Yandex identity in the join/auth path before Yandex-keyed paid entitlements are safe
- Yandex Payments investigation concluded that paid citizenship should use signed purchase verification on the server, startup reconciliation via `getPurchases()`, and post-grant consumption once the entitlement is durably stored; purchase UI should be hidden when the dashboard catalog item is absent or unavailable
- Qualifying-match crediting should happen on the game server at match end, but implementation needs one additional end-of-match per-player state summary because the server does not currently simulate spawn/elimination itself
- The source brief now consistently uses the XP-based citizenship threshold, reducing ambiguity across the Sprint 4 progression tasks
- 8d-A is already done and provides the communication channel Sprint 4 can build on
- 8d-B (personal inbox) depends on both 8d-A already being live and the player profile store going live
- Sprint 4 is no longer purely monetization scope; it also bundles completed tutorial/lobby fixes and a now-locked start-screen redesign direction
- Mission-mode follow-up work has moved beyond investigation: the wiki now records the generated mission structure, zero-nation map exclusion, nation-count map ordering, and slower Medium nation ramp in [[tasks/missions-difficulty-investigation]]
- Solo mode no longer stalls indefinitely when an opponent reaches the win threshold; the player sees a distinct opponent-win loss state and `Match:Loss:OpponentWon` tracks that reason
- Telegram Channel Link shipped as an experiment-gated CTA on the start/loading and game-end modals, with placement-specific `UI:Tap:*` analytics
- Tutorial follow-up work later resolved into three shipped fixes (`[[tasks/tutorial-no-nations]]`, `[[tasks/tutorial-build-menu-lock]]`, `[[tasks/tutorial-reduce-bots]]`) plus one cancelled pause-window attempt recorded in [[decisions/cancelled-tasks]]
- The Humans vs Nations balance task was later rejected as no-ship and cancelled after review; see [[decisions/hvn-balance-pr70-no-ship]]

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-3]] — previous sprint
- [[decisions/sprint-5]] — next sprint
- [[decisions/sprint-6]] — later content sprint depends on this payments/citizenship layer
- [[systems/producer-workflow]] — producer operating model and brief-writing guardrails reflected in this sprint plan
- [[systems/project-operations]] — operational context and source brief covering Sprint 4 planning constraints
- [[features/announcements]] — already-live dependency Sprint 4 can build on for global and future personal messaging
- [[features/tutorial]] — tutorial follow-up fixes were added to the Sprint 4 backlog
- [[features/ai-players]] — AI Players feature (already active in production)
- [[tasks/player-profile-store-investigation]] — completed Sprint 4 investigation for player-store technology, hosting, schema, and match-crediting approach
- [[tasks/yandex-payments-investigation]] — completed Sprint 4 investigation for Yandex payments SDK usage, catalog caching, dashboard setup, and purchase verification flow
- [[tasks/global-announcements]] — completed `8d-A` dependency for future inbox and citizenship messaging
- [[tasks/start-screen-redesign-investigation]] — locked tab layout, viewport target, and citizenship placement decisions
- [[tasks/legal-vat-investigation]] — external gate-clear task confirming no additional legal/tax blocker before payments
- [[tasks/ai-lobby-slot-bug]] — Sprint 4 bug fix for mixed real-plus-AI full lobbies
- [[tasks/email-subscribe-modal]] — Sprint 4 email opt-in modal on start and win screens
- [[tasks/tutorial-no-nations]] — Sprint 4 tutorial simplification that removed nation opponents
- [[tasks/tutorial-build-menu-lock]] — Sprint 4 tooltip-5 build-menu guardrail
- [[tasks/tutorial-reduce-bots]] — Sprint 4 tutorial config change that lowered tutorial bot count from 400 to 100
- [[tasks/missions-difficulty-investigation]] — Sprint 4 findings on generated mission difficulty, tuning levers, and analytics gaps
- [[tasks/solo-win-condition-fix]] — Sprint 4 bug fix for opponent-win loss handling in solo modes
- [[tasks/telegram-link]] — Sprint 4 experiment-gated Telegram CTA on start and game-end screens
- [[decisions/hvn-balance-pr70-no-ship]] — no-ship review and cancellation outcome for the HvN balance attempt
- [[decisions/cancelled-tasks]] — cancelled action-pause variant for tutorial follow-up work
