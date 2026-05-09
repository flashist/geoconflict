# Licensing Compliance Posture

**Date**: 2026-05-09
**Status**: proposed

## Context

GeoConflict is a derivative fork/adaptation of OpenFront. The licensing brief reviewed the inherited OpenFront license stack: AGPL v3 with Section 7 attribution terms for code, CC BY-SA 4.0 for assets under `/resources`, and proprietary restrictions for `/proprietary`, CDN, database, and API assets.

Source: `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`

This is an internal working analysis, not legal advice. A Russian IP lawyer should review the compliance posture before monetization scales, especially AGPL Section 13 obligations in a Yandex.Games web-game context and any interaction with platform terms.

## Decision

GeoConflict can continue development, publication, and monetization on Yandex.Games, but the business and release process must treat the inherited licenses as product constraints:

- The full current GeoConflict source must be public under AGPL v3, including modifications and integrations combined with OpenFront code.
- Players interacting with the web game over the network must be offered current corresponding source code at no charge.
- The existing "Based on OpenFront" main-menu attribution satisfies the OpenFront Section 7 attribution requirement, but a separate "Source Code" link to the public GeoConflict repository is still required for AGPL Section 13 compliance.
- Assets from `/resources` can be used commercially with attribution and ShareAlike obligations; modified resource assets cannot become proprietary GeoConflict-only content.
- Assets from `/proprietary`, OpenFront CDN, OpenFront database, or OpenFront API are off-limits.
- "OpenFront" should stay limited to required attribution and source/license context, not primary title, store listing positioning, or marketing claims that imply endorsement.

## Consequences

- Monetization remains allowed, but premium value should not depend on technical exclusivity of AGPL-covered code or CC BY-SA derivative assets; defensibility must come from live operations, Yandex integration, localization, community, and iteration speed.
- Production deploys need a process that keeps the public source repository aligned with what is actually running.
- Engineering should add a visible Source Code link near the existing OpenFront attribution, preserve AGPL and asset license notices, and audit production bundles for `/proprietary` or OpenFront-hosted assets.
- Sprint 4's VAT/tax clearance does not by itself clear IP/licensing compliance; the two legal tracks are separate.
- Backend work that links against or combines with OpenFront code should be presumed AGPL-covered unless legal review confirms a separate-work boundary.

## Related

- [[systems/game-overview]] — fork/adaptation context and upstream divergence notes
- [[systems/project-operations]] — release and operational process constraints
- [[decisions/product-strategy]] — monetization sequencing and business model implications
- [[decisions/sprint-4]] — citizenship and payments plan affected by compliance gates
- [[tasks/legal-vat-investigation]] — separate VAT/tax gate that does not cover IP/licensing review
- [[tasks/yandex-payments-investigation]] — paid citizenship flow that should not scale without licensing posture review
