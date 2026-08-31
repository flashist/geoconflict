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
- **H1–H3 (hygiene):** **H1** — `openfront.io`/`.dev` jwt-audience fallback strings in the shipped
  bundle (latent, overridden by `/api/env` in practice); **H2** — a `static/LICENSE` collision (moot
  once V1 lands); **H3** — inert commented upstream leftovers in HTML.
  *State as of 2026-08-31: **H1 ✅ fixed and verified in production**, **H2 ✅ moot as predicted**,
  **H3 ❌ still open and owned by task `0073`** (low risk, no gate — commented markup ships no asset).*
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

### ✅ The `0025` audit task is CLOSED (2026-08-31)

🔧 **This paragraph previously read: "The `0025` audit-task row itself stays In progress on the sprint
board pending the producer-routed close." That is FALSE as of 2026-08-31.** The task closed that day
and moved to `ai-agents/tasks/done/0025-licensing-asset-audit/`, status
**`✅ Done (agent-closed — not owner-verified)`**.

**Closed by a spawned producer, with no owner present.** The owner *ruled the close* via
`AskUserQuestion` relayed from the lead session; the owner did **not** sign off on the audit findings
themselves. `0025` was the **last `🔄 In progress` row on the Sprint 4 board** — that board now has
none.

**Finding states at close:** V1 ✅ remediated by `0066`, verified in production 2026-08-30; A1 ✅
remediated by `0066`, verified in production 2026-08-30 on **both** entry points; **H1 ✅ remediated by
`0066` Part C, verified in production 2026-08-31** — all three live bundles (`runtime`, `vendors`,
`main`) fetched and grepped, **0 occurrences of `openfront.io` / `openfront.dev` in each**; H2 ✅ moot
once V1 landed; **H3 ❌ still open.**

📌 **H3 is OWNED — by task `0073`** (`0073-remove-inert-upstream-html-leftovers`, `🔲 Backlog`,
Unscheduled, filed 2026-08-24 from this audit's §H3). ⚠️ **The relay that drove the close asserted H3
was unowned; that was WRONG.** No new task was filed and none was needed. **If any record says H3 is
unowned, it is wrong — `0073` owns it.**

⚠️ **Gate consequence, not overstated:** `0065`'s licensing prerequisite is **satisfied and
demonstrated**, and that is all. **`0065` remains blocked on `0014`, `0062` and `0195`. The paid
go-live is NOT unblocked.** No other task's status changed at this close.

See [[tasks/licensing-asset-audit]] and [[tasks/licensing-remediation]].

## Related

- [[systems/game-overview]] — fork/adaptation context and upstream divergence notes
- [[systems/project-operations]] — release and operational process constraints
- [[decisions/product-strategy]] — monetization sequencing and business model implications
- [[decisions/sprint-4]] — citizenship and payments plan affected by compliance gates
- [[tasks/legal-vat-investigation]] — separate VAT/tax gate that does not cover IP/licensing review
- [[tasks/yandex-payments-investigation]] — paid citizenship flow that should not scale without licensing posture review
- [[tasks/licensing-asset-audit]] — task `0025`, the audit that produced these findings (closed 2026-08-31; carries the production-verification method for V1/A1/H1 and the open H3 residual)
- [[systems/project-brief]] — the asset-audit gate before paid IAP ships (**satisfied and demonstrated as of 2026-08-31**)
- [[decisions/sprint-backlog]] — the board holding `0073`, the task that owns the open H3 residual
- [[tasks/licensing-remediation]] — the 0066 remediation implementing the 0025 audit's V1/A1/H1 fixes (agent-closed; deployed in `362a2f9`; live checks RAN AND PASSED 2026-08-30 by byte-identity against a nonexistent control, not by 404)
