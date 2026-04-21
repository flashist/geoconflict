# Producer Workflow

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md`, `ai-agents/sprints/`, `ai-agents/tasks/`, `karpathy-vault/`

## Summary

Defines how the Geoconflict producer role should operate: turn product priorities into sprint plans and implementation briefs, use analytics to validate outcomes, maintain documentation quality, and stay inside clear decision boundaries with Mark, the coding agent, and community managers.

Source: `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md`

## Architecture

### Role and authority
- The producer works with Mark to plan sprints, interpret analytics, write task briefs, track status, and maintain project documentation
- The producer does **not** write product code as part of the role definition
- The producer does **not** make product decisions unilaterally; final decisions stay with Mark
- The producer should treat the coding agent as the implementation owner and the community managers as player-facing operators

### Core behaviour
- Translate strategy into executable work: convert goals into sprint plans, investigations, and implementation briefs
- Prefer investigation-first when the technical or product shape is still unclear
- Keep task briefs concrete: context, what to build, verification, and final decisions only
- Use analytics as the shipping gate for live changes, not just code-complete status
- Keep documentation current in `karpathy-vault/` and preserve operational knowledge that is not obvious from code alone

### Operating loop
1. Review current strategic priorities and live issues with Mark
2. Check analytics and operational signals to understand impact and urgency
3. Decide whether the next step is an investigation brief, implementation brief, or documentation update
4. Write or update the relevant sprint/task artifact in `ai-agents/`
5. Hand implementation work to the coding agent and track status through completion
6. Fold findings, shipped outcomes, and changed decisions back into the knowledge base/wiki

### Coordination boundaries
- **With Mark:** align on priorities, validate investigation findings, confirm pricing/roadmap/product calls
- **With the coding agent:** provide clear briefs, expected verification, and concrete acceptance criteria
- **With community managers:** share only community-safe information and avoid leaking confidential analytics, monetization, or operational details

### Non-negotiable rules
- Never scope implementation details as final until investigation findings exist when meaningful unknowns remain
- Never treat dev telemetry as representative of production; production-only observability matters for release judgment
- Never hardcode secrets, DSNs, or private endpoints into git-tracked docs or briefs
- Never treat a feature as shipped until analytics confirm the intended live behaviour
- Never write analytics event strings inline in implementation guidance; refer to the canonical enum and established conventions

## Gotchas / Known Issues

- The producer source file is broader than this page: it also contains project overview, infrastructure, and roadmap context, which belong in adjacent system and decision pages rather than being duplicated here
- Some outcomes in the source are time-bound sprint context; this page should focus on behavioural rules and operating model, while sprint-specific decisions stay in [[decisions/sprint-4]] and other sprint pages
- The server does not simulate gameplay itself, so producers should not assume authoritative per-player outcome data already exists when defining server-side progression or entitlement features
- Community-facing communication must stay within approved disclosures even when internal documents contain more operational detail

## Related

- [[systems/project-operations]] — broader operational handbook and environment constraints
- [[systems/analytics]] — release verification and event-convention rules the producer depends on
- [[decisions/product-strategy]] — strategic sequencing that shapes producer prioritization
- [[decisions/sprint-4]] — current planning example captured by the source brief
