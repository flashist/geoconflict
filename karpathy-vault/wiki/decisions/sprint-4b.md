# Sprint 4b — Interim Game Variety Update

**Date**: 2026-05-05
**Status**: proposed

## Context

Sprint 4's citizenship, payments, and player profile store track is paused while Mark is travelling from approximately May 15 to June 1, 2026. Sprint 4b exists as an intermission sprint to ship visible player-facing variety before that pause, while avoiding new backend systems or monetization infrastructure.

Source: `ai-agents/sprints/plan-sprint-4b.md`

## Decision

Ship three public-matchmaking variety changes before May 15, 2026:

| Area | Decision |
|---|---|
| Compact maps | Mix compact maps into regular public rotation; show a `Mini` / `Мини` lobby badge; do not change rules beyond map scale |
| Duos/Trios/Quads | Re-enable the modes; AI players fill unfilled slots; test on staging before shipping |
| Weird settings | Randomly apply one of unlimited gold, unlimited army, no nukes, or no SAM; show a lobby badge; never combine with compact maps |

The sprint must start with a one-day compatibility investigation covering compact maps plus Duos/Trios/Quads. Implementation tasks can proceed in parallel only after those findings are reviewed.

Rotation is locked to a configurable `MODIFIED_MATCH_RATE` of `0.2`: 80% normal matches, 10% compact-map matches, and 10% weird-setting matches. Weird-setting matches then split evenly across four sub-options, about 2.5% of all matches each.

No analytics are planned for these new features in Sprint 4b.

## Consequences

- Sprint 4b deliberately avoids citizenship, payments, player profile store, and start-screen redesign work while Sprint 4's core monetization track is paused.
- The compact-map and Duos/Trios/Quads work must wait for investigation findings so map scale, player count, and AI-fill risks can be scoped before implementation.
- The modifier system is mutually exclusive by design: a public match can be normal, compact, or weird-setting, but never compact and weird-setting at the same time.
- The compact-map modifier and public lobby badge are implemented; the registry currently contains only `mini_map` until the weird-setting task adds its entry.
- Weird-setting badge wording is left to implementation, but Mark must review it before release.
- The win-check regression investigation, sec10, and sec11 stay in backlog until after Mark returns.

## Related

- [[decisions/product-strategy]] — retention and content sequencing context
- [[decisions/sprint-4]] — paused citizenship and payments foundation sprint
- [[decisions/sprint-5]] — later full F2P loop after citizenship infrastructure resumes
- [[systems/producer-workflow]] — investigation-first planning and Mark approval boundaries
- [[systems/project-operations]] — sprint/task workflow and release constraints
- [[tasks/sprint4b-mini-mode-investigation]] — compatibility findings for compact maps plus Duos/Trios/Quads
- [[tasks/sprint4b-compact-map-rotation]] — compact-map public modifier and Mini/Мини lobby badge implementation
- [[tasks/sprint4b-duos-trios-quads]] — public-only implementation of Duos/Trios/Quads after the compatibility investigation
