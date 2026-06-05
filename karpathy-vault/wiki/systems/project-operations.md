# Project Operations

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md`, `CLAUDE.md`, `src/client/flashist/FlashistFacade.ts`, `src/server/GameServer.ts`, `src/core/configuration/DefaultConfig.ts`

## Summary

Operational handbook for how Geoconflict is run day to day: team roles, environment boundaries, sprint/task workflow, monetization sequencing, and the non-negotiable delivery constraints around analytics, telemetry, and deploys.

Source: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md`

## Architecture

### Ownership and decision flow
- Mark owns product direction, sprint priorities, release decisions, and community-facing coordination
- The coding agent implements approved briefs and maintains the wiki, but does not make product decisions unilaterally
- Producer-specific responsibilities and guardrails are documented in [[systems/producer-workflow]]

### Runtime and infrastructure boundaries
- Gameplay is split across `src/client/`, `src/core/`, and `src/server/`, but authoritative per-tick simulation still runs in the client Web Worker; the server assembles and relays turns rather than simulating combat itself
- Production game hosting, archive storage, and Uptrace telemetry are intentionally documented without git-tracked secrets or exact private endpoints
- Dev and production observability are intentionally asymmetric: production sends OTEL data, dev does not

### Delivery workflow
- Work is organized through sprint plans in `ai-agents/sprints/` and implementation/investigation briefs in `ai-agents/tasks/`
- Significant unknowns are expected to go through an investigation-first pass before implementation scope is locked
- Shipping is verified with analytics, not just local correctness; build-number segmentation and funnel instrumentation are part of release readiness
- Build numbers are bumped automatically by `scripts/bump-version.js` during deploy and sent to GameAnalytics via `configureBuild()`; GA auto-ingests new build versions from the client — no dashboard pre-registration is required

### Roadmap and current planning context
- Product sequencing is retention first, monetization second, then content expansion; see [[decisions/product-strategy]]
- The source document records Sprint 4 as the active citizenship and Yandex payments foundation sprint, with independent tutorial and lobby fixes able to ship in parallel; see [[decisions/sprint-4]]
- Sprint 4b is a short interim variety sprint that keeps public matchmaking fresh while Sprint 4's citizenship/payment work is paused; see [[decisions/sprint-4b]]
- Sprint 4c is a short production stabilization sprint that converts the 2026-05-07 Uptrace error-priority review into deployable fixes before the May 15 travel pause; see [[decisions/sprint-4c]]
- No-sprint tasks are tracked separately in [[decisions/sprint-backlog]] and need a sprint home before implementation begins
- Community operations, monetization planning, and internal dashboards are treated as operational context, not game-client features
- Licensing compliance is an operational release constraint: GeoConflict's public source repository must track what is deployed, players need a visible source-code access path, and production bundles must not include OpenFront `/proprietary` or hosted-only assets. See [[decisions/licensing-compliance]].

## Gotchas / Known Issues

- Because the server does not execute gameplay simulation, any feature that depends on authoritative per-player match outcomes or spawn/elimination state needs explicit server-side summary data rather than assuming it already exists
- `this.turns` accumulation in `src/server/GameServer.ts` remains open technical debt and is called out here as a future scaling risk
- Historical analytics before the double-reload and stale-build fixes have known data-quality problems; operational decisions should use the corrected post-fix windows where possible
- Sensitive infrastructure details are intentionally omitted from git-tracked docs; operational pages should describe boundaries and workflow, not secrets
- The VAT/tax gate and the OpenFront-derived licensing posture are separate. The former cleared in Sprint 4; the latter still needs a public-source/source-link process and eventual IP-lawyer review before monetization scales.

## Related

- [[systems/game-overview]] — gameplay, architecture, and mechanics baseline
- [[systems/producer-workflow]] — dedicated producer-role behaviour and coordination rules
- [[systems/analytics]] — player-behaviour instrumentation and release verification rules
- [[systems/telemetry]] — production-only server observability boundaries
- [[systems/configuration]] — environment selection, runtime public config, and deploy-sensitive defaults
- [[systems/localization]] — bundled UI copy and language fallback workflow that release changes depend on
- [[decisions/product-strategy]] — retention-first sequencing and experiment policy
- [[decisions/sprint-4]] — current citizenship and payments planning context captured by the source
- [[decisions/sprint-4b]] — interim public-match variety sprint and deadline constraints
- [[decisions/sprint-4c]] — production stabilization sprint and May 15 deadline constraints
- [[decisions/sprint-backlog]] — no-sprint task queue and deferral rationale
- [[decisions/licensing-compliance]] — AGPL/source access, asset-use, and trademark constraints for releases
