# Sprint 4b — Interim Game Variety Update

**Date**: 2026-05-05
**Status**: accepted

## Context

Sprint 4's citizenship, payments, and player profile store track is paused while Mark is travelling from approximately May 15 to June 1, 2026. Sprint 4b exists as an intermission sprint to ship visible player-facing variety before that pause, while avoiding new backend systems or monetization infrastructure.

Source: `ai-agents/sprints/done/plan-sprint-4b.md`

## Decision

Sprint 4b is closed with all planned public-matchmaking variety changes shipped before the May 15, 2026 deadline:

| Area | Decision |
|---|---|
| Compact maps | Mix compact maps into regular public rotation; show a `Mini` / `Мини` lobby badge; do not change rules beyond map scale |
| Duos/Trios/Quads | Re-enable the modes; AI players fill unfilled slots; test on staging before shipping |
| Weird settings | Randomly apply one of unlimited gold, unlimited army, no nukes, or no SAM; show a lobby badge; never combine with compact maps |

The sprint started with a one-day compatibility investigation covering compact maps plus Duos/Trios/Quads, then shipped the three implementation tracks.

Rotation originally used a configurable `MODIFIED_MATCH_RATE` of `0.2`: 80% normal matches, 10% compact-map matches, and 10% weird-setting matches. Sprint 4c later disabled compact maps in public rotation because compact `resources/maps/*/map4x.bin` shore data breaks transport-boat targeting; with `mini_map` removed, weird-setting matches now receive the full 20% modified-match budget.

No analytics are planned for these new features in Sprint 4b.

## Consequences

- Sprint 4b deliberately avoids citizenship, payments, player profile store, and start-screen redesign work while Sprint 4's core monetization track is paused; [[decisions/sprint-4c]] continues that pause with production stabilization instead of player-facing variety.
- The compact-map and Duos/Trios/Quads work waited for investigation findings so map scale, player count, and AI-fill risks could be scoped before implementation.
- The modifier system is mutually exclusive by design: a public match can be normal, compact, or weird-setting, but never compact and weird-setting at the same time.
- The modifier system is still reversible, but as of Sprint 4c the active public registry contains only `weird_setting`; `MINI_MAP_MODIFIER` is retained in code for re-enable after compact binaries are regenerated.
- Weird-setting badge wording shipped with initial coder-selected labels; Mark can still adjust localization wording after staging/player review.
- The win-check regression investigation, sec10, and sec11 stayed outside Sprint 4b.

## Related

- [[decisions/product-strategy]] — retention and content sequencing context
- [[decisions/sprint-4]] — paused citizenship and payments foundation sprint
- [[decisions/sprint-4c]] — follow-up production stabilization sprint before the same travel pause
- [[decisions/sprint-5]] — later full F2P loop after citizenship infrastructure resumes
- [[systems/producer-workflow]] — investigation-first planning and Mark approval boundaries
- [[systems/project-operations]] — sprint/task workflow and release constraints
- [[tasks/sprint4b-mini-mode-investigation]] — compatibility findings for compact maps plus Duos/Trios/Quads
- [[tasks/sprint4b-compact-map-rotation]] — compact-map public modifier and Mini/Мини lobby badge implementation
- [[tasks/sprint4b-duos-trios-quads]] — public-only implementation of Duos/Trios/Quads after the compatibility investigation
- [[tasks/sprint4b-weird-setting-modifier]] — weird-setting public modifier and lobby badge implementation
- [[tasks/disable-compact-public-maps]] — Sprint 4c mitigation that removed compact maps from public rotation
