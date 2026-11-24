# Purchase and Rewarded-Ad Metrics Read — task 0516

**Source**: `ai-agents/tasks/done/0516-verify-the-2026-10-27-purchase-and-rewarded-ad-deploys-through-gameanalytics-metrics-read-on-or-after-2026-11-03/brief.md` (also `plan.md`, `plan-review.md`, `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9 / task 0516

## Goal

Assess aggregate purchase and rewarded-ad evidence after the 2026-10-27 deploy, replacing four cancelled hand-run checks. Metrics do not establish billing, server behavior or an individual account's journey. The owner approved the plan and its numeric thresholds on 2026-11-06; qualitative “approximately” has no numeric tolerance. Source: `plan-review.md` — “Owner plan decision”.

## Key Changes

No product change. GameAnalytics Explore counted event occurrences for 2026-10-28–2026-11-05 (nine dates); purchase and interstitial comparison was 2026-10-20–26 (seven dates), all builds. Documented Explore UTC basis; project timezone setting, exact original read times and data maturity unverified. Native Build attribution covers primary purchases only, not ads, guest traffic, baseline or all traffic. Source: `worklog.md` — “2026-11-06 — current evidence assessment for independent review”.

| Check | Result and limits |
|---|---|
| 1. Names and selectors | FLAG / UNPROVEN. Only 2 of 9 named leaves observed: Login:Succeeded 6 and Continue:Ready 4; the explainer tap is outside the nine. The other seven are missing or omitted, not proven zero or never fired. Broad parent selectors do not verify exact leaves; the guest purchase funnel lacks Ready. |
| 2. Purchases | FLAG / UNPROVEN. Native Started / Abandoned / Completed: primary **450 / 376 / 4**, comparison **418 / 369 / 7**; accounting gaps 70 and 42. Restart count unavailable; Shown 4 and Completed 4 are unpaired. No billing or reconciliation conclusion. |
| 3. Guest purchase | FLAG / UNPROVEN. All three saved funnels use any-order semantics; the requested ordered whole chain and account binding are unproven. Ready mean **1.73K ms** is rounded time from login-dialog closure to auto-continue, before payment; occurrence Count 4 is not a numeric-sample count, and numeric sample count and maximum were unavailable. |
| 4. Blocks and held purchases | FLAG / UNPROVEN. Missing counts leave daily and window thresholds unevaluated; no-data is not zero. |
| 5. Rewarded payout | FLAG / UNPROVEN. Watched **2.34K** exceeds Opened **1.62K**; cause unknown, not a conversion rate. Granted 2.30K, NotCredited 3 and Duplicate 2 are displayed; Failed and Unavailable are unknown. Full payout-failure fraction and exact R2 balance are unproven; the >5% positive R2 trigger was not demonstrated. No diagnosis or fix. |
| 6. Rewarded gates | PASS for aggregate criteria only: citizen suppression 4.29K and guest login offers 14.30K are positive. Visible button absence, sound behavior and same-account reward remain unproven. |
| 7. Interstitial suppression | PASS for displayed aggregate criteria only: 489 suppressed / 1.62K opened, approximately 0.30; GameAnalytics interstitial daily average fell approximately 5.1% versus comparison. Same-/cross-page adjacency, revenue and causation remain unproven; the existing page-only residual stands. |
| 8. Partner statistics | FLAG / UNPROVEN. Site/App plus Ad unit grouping and licensing were unavailable for this collection, not established impossible in the interface. |

The owner supplied five aggregate exports and attested they came from the game's Yandex Games dashboard; the original transaction file is outside that attestation, remains unverified and was excluded from the assessment. Yandex advertising series are **daily per-player averages**, not impression counts; window summaries are **unweighted means** of daily averages, not weighted rates. Format/widget mapping is inferred; report timezone, filters and freshness are unknown, so calendar comparisons are conditional. Blank, unknown, no-data and N/A values are never converted to zero. The selected GameAnalytics demo banner was ignored by a scoped owner decision, not technical proof of provenance. Source: `worklog.md` — “Official Yandex Games definitions and export mapping” and “Named owner ruling — selected-project provenance disposition”.

## Outcome

On 2026-11-06 and 2026-11-07 the owner gave nine **separate, scoped** dispositions, relayed through the lead: accept as unproven (1) event coverage, (2) purchase accounting gaps, (3) guest journey and timing, (4) block/held counts, (5) missing payout/Unavailable data, (6) the observed Watched/Open consistency flag with cause unknown, (7) Restart count, (8) partner grouping/licensing, and (9) collection metadata. The check-8 answer came on 6 November; the others on 7 November. These do not change any quantitative verdict or imply blanket approval or a fix. Source: `worklog.md` — “Actual selected answers — verbatim”.

No measured check met the thin-volume condition: Completed 4, Succeeded 6, Watched 2.34K and Opened 1.62K met their volume gates. The owner’s one-reread policy around 10 November remains **unconsumed**; missing data is not a thin measurement. Prior accepted limits stay scoped: one charge, Yandex retention, consume reply/consumeTokens, stray reconcile grant, exact account binding, T2/T4 live, sound restoration, citizen button absence, same-/cross-page suppression, restart buttons and exactly-one cancellation reload remain unproven or indirect. The 0511 ruling covers its three server unknowns; it does not waive other gaps.

Independent reviewer and adversarial passes were usable and found no significant deliverable defects. They executed document reads, validation of the five supplied CSVs, hashes and arithmetic; the second opinion's assessment was reasoning-only. No product tests or independent live vendor replay. Actual served identities unverified; model diversity unknown. A different model is recommended for a broader second opinion. The later Process-review recorded zero findings and no fixes; its owner-authorized narrow recording exception added the worklog entry and closed-out review header without changing task status or verdicts. Sources: `review.md` — “Coder response”; `worklog.md` — “2026-11-07 — Process-review audit” and “sanctioned producer close executed and reconciled”.

## Related

- [[systems/analytics]] — event and funnel interpretation
- [[systems/shared-purchase-flow]] — purchase flow and live-check limits
- [[tasks/rewarded-video-double-match-xp]] — rewarded-ad implementation and accepted residuals
- [[tasks/stop-consuming-profile-box-live-check]] — server-side checks; separate evidence from the aggregate read.
