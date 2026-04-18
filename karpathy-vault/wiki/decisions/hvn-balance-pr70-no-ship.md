# Humans vs Nations Balance (PR 70) — No-Ship

**Date**: 2026-04-18
**Status**: accepted

## Context

Sprint 4 included a backlog task to balance Humans vs Nations by reducing nation-controlled opponents toward a 1:1 ratio with the human side. A later implementation review found that the attempted fix did not preserve the product contract of the mode.

Sources: `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`, `ai-agents/tasks/cancelled/s4-nations-balance-task.md`

## Decision

Do not ship the current Humans vs Nations balance implementation. Treat the current PR / task attempt as unsuccessful and cancelled.

The no-ship call is based on two confirmed issues:

- Removed nation slots were converted into regular Bots, producing a three-faction match (`Humans`, `Nations`, `Bot`) instead of a strict Humans-vs-Nations mode.
- The balancing logic only applied to public Humans vs Nations, while private and singleplayer entry points still exposed the old all-nations behavior.

## Consequences

- The Sprint 4 balance attempt is recorded as cancelled in [[decisions/cancelled-tasks]] rather than treated as a shipped fix.
- Future work needs a fresh brief before implementation starts. At minimum it must answer whether HvN is strictly two-faction, whether regular bots are ever allowed, which entry points are supported, and whether the nation count should follow real humans only or the full human-side roster.
- The current roadmap context for this failed attempt remains part of [[decisions/sprint-4]], but the implementation itself should not be revived from the rejected PR.

## Related

- [[decisions/sprint-4]]
- [[decisions/cancelled-tasks]]
