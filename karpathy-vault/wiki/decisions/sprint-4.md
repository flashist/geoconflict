# Sprint 4 — In-App Monetization & Citizenship

**Date**: planned
**Status**: proposed

## Context

Goal: launch the citizenship system and the in-app purchase foundation. Give loyal players a visible long-term goal (50 qualifying matches), a direct purchase path (99 rubles), and the first meaningful citizenship benefit (name change). Establish the payment infrastructure and player profile store that future monetization depends on.

**Rewarded ads explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

Source: `ai-agents/sprints/plan-sprint-4.md`

## Sprint Structure

**Phase 1 — Investigations (run in parallel):**
- **Investigation A:** Player Profile Store — first persistent per-player database. Findings needed: DB technology, hosting, initial schema, match completion tracking, guest player handling.
- **Investigation B:** Yandex Payments Catalog — SDK API, catalog fetch architecture, dashboard setup + approval timeline. **Action required immediately:** register catalog items in Yandex Games dashboard (approval takes days).

**Phase 1 — Independent (no investigation dependency):**
- 8d-A (Global Announcements) remains part of Sprint 4 and can ship in parallel with the investigation work.

**Phase 2 — Implementation (after investigation findings reviewed with Mark):**
Briefs to be written after findings. Confirmed scope:

| Task | Description |
|---|---|
| Player Profile Store | Database + schema from Investigation A |
| Yandex Payments | Catalog fetch + caching from Investigation B |
| Citizenship — match counter | Track 50 qualifying matches server-side + progress UI |
| Citizenship — earned path | At 50 matches: flip `isCitizen = true`, send inbox message, in-game notification |
| Citizenship — paid path | 99 rubles via Yandex catalog. `isPaidCitizen = true` on purchase |
| 8d-A — Global announcements | Re-enable the existing OpenFront announcements channel with seed content for citizenship rollout |
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
- Phase 2 briefs written only after both investigation findings reviewed
- 8d-A can ship early in Sprint 4 and provides the communication channel for upcoming citizenship messaging
- 8d-B (personal inbox) depends on both 8d-A live and player profile store live

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-3]] — previous sprint
- [[decisions/sprint-5]] — next sprint
- [[decisions/sprint-6]] — later content sprint depends on this payments/citizenship layer
- [[features/ai-players]] — AI Players feature (already active in production)
