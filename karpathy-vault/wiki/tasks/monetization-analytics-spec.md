# Monetization Analytics Spec

**Source**: `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`
**Status**: backlog
**Sprint/Tag**: Sprint 4 / monetization analytics

## Goal

Define the pre-monetization analytics baseline and Sprint 4 launch-funnel tracking needed before citizenship, Yandex payments, and ad-tier tradeoffs become product decisions.

## Key Changes

- Establishes P0 session identity and match-lifecycle tracking: Yandex login status, session depth, match start, spawn, completion, and match-count distribution.
- Defines P1 citizenship funnel events for surface impressions, CTA clicks, payment start/completion/abandonment, earned citizenship, and high-intent unconverted segments.
- Defines P1 ad-revenue segmentation by player tier so paid or earned citizen ad removal can be measured against lost ad revenue.
- Records P2 future-loop analytics for cosmetics, map voting, and replay usage before those systems become premium or retention features.
- Calls out implementation questions around analytics backend constraints, guest player ID stability, server-side event authority, and possible match-history backfill.

## Outcome

The spec is a planning baseline, not an implementation result. It should be used to create the P0/P1 backlog tasks and to keep Sprint 4 monetization decisions gated on measured identity, match-depth, purchase, and ad-impact data.

## Related

- [[systems/analytics]]
- [[decisions/sprint-4]]
