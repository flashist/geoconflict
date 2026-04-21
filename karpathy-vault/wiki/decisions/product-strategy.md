# Product Strategy

**Date**: 2026-04-15 (ongoing)
**Status**: accepted

## Context

Geoconflict's primary revenue is ad impressions. The strategic sequence is:
1. Fix retention first — engaged players generate more ad impressions without touching monetization
2. Add monetization — a larger player base makes every monetization feature more effective
3. Compound: Yandex Games promotes higher-revenue titles → better ranking → more DAU → more revenue

Source: `ai-agents/sprints/plan-index.md`

## Decision

**Retention before monetization.** Sprint order follows this logic:
- **Sprint 1** — Stop the Bleeding (ghost rate, crashes, analytics baseline)
- **Sprint 2** — Fix Onboarding (tutorial, auto-spawn, UX clarity)
- **Sprint 3** — Deepen Retention (infra quality, UX fixes, observability)
- **Sprint 4** — In-App Monetization & Citizenship (citizenship, Yandex payments, player profile store)
- **Sprint 5** — Full F2P Loop (coin economy, clans, cosmetics, social features)
- **Sprint 6** — More Content (historical multiplayer maps, paid campaign map packs)

## Experiments Policy

**Default rule:** if a feature is additive and does not break backward compatibility, test via Yandex A/B experiments API before full rollout.

**Excluded from experiments:**
- Analytics/measurement layer itself (circular)
- Changes requiring disproportionate engineering to maintain two versions
- Uniform changes by nature (rendering fixes, performance)
- Economy/pricing (player fairness)

## Key Analytics Data (as of Sprint 3, March 2026)

- **Desktop:** ~3,500 DAU, returning players 37–40 min/session, new players 20–25 min/session
- **Mobile:** ~700 DAU, returning players 20 min/session, new players 11 min/session
- Mobile iOS shows near-zero return rate
- Ghost rate: ~20% on both platforms (players who never spawn)

Mobile deep optimization parked — desktop is core audience. Revisit if mobile DAU > 1,500.

## Consequences

- **Task ordering is intentional** — do not skip retention work to ship monetization early
- **Feature flags/experiments preferred** for all additive features
- **Mobile warning screen moved** from Sprint 3 to Sprint 6, where it supports a content-led acquisition push on mobile

## Related

- [[decisions/sprint-1]] — stop the bleeding
- [[decisions/sprint-2]] — fix onboarding
- [[decisions/sprint-3]] — deepen retention (current)
- [[decisions/sprint-4]] — first monetization layer
- [[decisions/sprint-5]] — full F2P loop
- [[decisions/sprint-6]] — content expansion after payments/cosmetics infrastructure exists
- [[decisions/cancelled-tasks]] — work cancelled with reasons
- [[systems/analytics]] — analytics infrastructure built in Sprint 1
- [[systems/project-operations]] — operational handbook for team roles, release workflow, and roadmap constraints
- [[tasks/mobile-quick-wins]] — Task 3 mobile optimizations; Task 5 gate conditions documented here
