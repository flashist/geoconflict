# Licensing Compliance Posture

**Date**: 2026-05-09
**Status**: proposed

## Context

GeoConflict is a derivative fork/adaptation of OpenFront. The licensing brief reviewed the inherited OpenFront license stack: AGPL v3 with Section 7 attribution terms for code, CC BY-SA 4.0 for assets under `/resources`, and proprietary restrictions for `/proprietary`, CDN, database, and API assets.

Source: `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`
Follow-up source: `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (task 0025 audit, 2026-08-23)

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

## Audit Outcome (2026-08-23) and Remediation Status

The production-bundle asset audit (task `0025`) completed 2026-08-23 — findings in
`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md`. Verdict: **1 confirmed
violation, 1 trademark-posture item, 3 hygiene items**:

- **V1 (violation):** OpenFront's All-Rights-Reserved music (6 files under `proprietary/`) shipped
  to the production web root and was redistributed via the public GitHub repo — confirmed serving
  live. Mitigating: the game never plays them (imports commented out).
- **A1 (trademark posture):** the live favicon of both HTML entry points was upstream's brand mark.
  Copyright likely fine (CC BY-SA at fork date, irrevocable), but as the product's tab/platform
  identity it exceeds nominative attribution.
- **H1–H3 (hygiene):** `openfront.io`/`.dev` jwt-audience fallback strings in the shipped bundle
  (latent, overridden by `/api/env` in practice); a `static/LICENSE` collision (moot once V1 lands);
  inert commented upstream leftovers in HTML.
- Everything else verified clean: no OpenFront CDN/API references in the prod bundle, no runtime
  fetches of OpenFront infrastructure, attribution coverage in place. **ShareAlike note:** assets
  derived from upstream CC BY-SA art stay CC BY-SA and cannot be sold as exclusive content — planned
  paid non-country flags must be original work.

Remediation shipped as task `0066` (V1 purge + A1 original-placeholder favicon and brand-file
deletion + H1 retarget, all owner-approved 2026-08-23): built and agent-closed 2026-08-24, and
**deployed to production 2026-08-29 in release `362a2f9`** (its commit `6f66aff` is an ancestor of
that release; the release is live per the `commit.txt` check in [[tasks/prod-api-env-https-apex]]).

> ✅ **THE LICENSING GATE IS DEMONSTRATED as of 2026-08-30 — both halves are now satisfied.**
> This paragraph has been corrected twice. It first read *"**NOT yet deployed**"*; it was then
> corrected on 2026-08-30 to *"the deploy half is satisfied, the live-check half is not — read the
> gate as shipped, not demonstrated"*. **The live checks then ran, in the browser against live
> production, and passed.**
>
> 🚨 **The check list's own "expect a 404" wording was WRONG FOR THIS SERVER and is superseded.**
> `app.get("*")` in `src/server/Master.ts` serves the SPA shell for any unmatched path, so nothing
> 404s and a `200` proves nothing by itself. The correct test is **byte-identity against a
> known-nonexistent control** — and all **seven** purged paths (three `sounds/music/*.mp3`, three
> `OpenFrontLogo.*`, upstream `Favicon.svg`) returned `200` / 10801 bytes / `text/html`, identical to
> that control, while a real asset (`/commit.txt`) returned 41 bytes of `text/plain`. **Seven `200`s
> here are the PASS.** The new original favicon serves on both entry points (445 bytes,
> `image/svg+xml`, the same hashed file linked from `yandex-games_iframe.html`). Method and numbers on
> [[tasks/licensing-remediation]].
>
> ⚠️ **This clears the licensing gate and nothing else.** `0065`'s paid go-live still waits on
> `0014`, `0062` and `0195`. Do not read "the licensing gate is demonstrated" as "the paid launch is
> unblocked".

The `0025` audit-task row itself stays In progress on the sprint board pending the
producer-routed close. See [[tasks/licensing-remediation]].

## Related

- [[systems/game-overview]] — fork/adaptation context and upstream divergence notes
- [[systems/project-operations]] — release and operational process constraints
- [[decisions/product-strategy]] — monetization sequencing and business model implications
- [[decisions/sprint-4]] — citizenship and payments plan affected by compliance gates
- [[tasks/legal-vat-investigation]] — separate VAT/tax gate that does not cover IP/licensing review
- [[tasks/yandex-payments-investigation]] — paid citizenship flow that should not scale without licensing posture review
- [[systems/project-brief]] — the asset-audit gate before paid IAP ships
- [[tasks/licensing-remediation]] — the 0066 remediation implementing the 0025 audit's V1/A1/H1 fixes (agent-closed; deployed in `362a2f9`; live checks RAN AND PASSED 2026-08-30 by byte-identity against a nonexistent control, not by 404)
