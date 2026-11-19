# Verify profile privacy and new citizenship grants through deployed server metrics

## ID
0523

> ℹ️ **ID allocation checked 2026-11-05 before filing.** Folder maximum and `## ID` maximum
> across backlog/done/cancelled were `0521`; allocated sequentially in dependency order, base 10.
> Candidate folder/field checks were empty; `.claude/`, `.agents/` and `.codex/` searches found
> neither candidate. Whole-repo filename search found only unrelated asset/generated/old console
> artifact hits outside task/toolkit records; no console contents inspected. No ID reused.

## Sprint
Sprint 9

## Priority
47

> ⚠️ Priority 47 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below 0522**, because it verifies that build's deployed metrics.
> Appended after rank 46; no existing rank changed, no pickup-order override.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Read the new [0522](../0522-measure-profile-privacy-and-committed-purchase-grants-on-the-profile-server/brief.md) server measurements after deployment.
[0497](../0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md) remains open until this verifier completes under its amended
acceptance. Preserve its two owner-run PASS results; historical manual checks 3/4 remain NOT RUN.
Keep 0516's existing client/rewarded scope and window unchanged.

Use existing `profile · overview` dashboard and Uptrace release filters. Observation requires
separately authorized access or owner-reported aggregate readings; this filing grants no agent
production, credential or log access.

### Owner authority — 2026-11-05

Actual owner answers, quoted verbatim by `fkit-lead` from live `fkit_roles.fkit_ask_owner`
in its session on **2026-11-05**, relayed to this fresh producer (ADR-021/037); not producer precedent:

- **Placement:** "Both Sprint 9 (Recommended) — exception to the next-sprint verification rule. After acceptance amendment, 0497 alone waits on the Sprint 9 verifier and its build/deploy; the proposed monitoring window keeps Sprint 9 open for at least seven days after arrival."
- **Acceptance:** "Approve replacement criteria (Recommended) — preserve the two owner-run PASS results, replace remaining acceptance with the stated monitoring criteria, and keep 0497 open until its new verifier completes. Implementation needs separate plan approval."

The placement exception covers **0522 and 0523 only**. Both are on Sprint 9; it does not extend
OD-4 or 0516 precedent. No TOP NEXT or re-ranking authority is claimed. The owner confirmed the
current 0497 telemetry focus by typing **"Continue"** after lead's explanation. Filing and acceptance
approval are not implementation-plan approval. Formal coder plan review and actual owner plan
approval remain required **before any code**.

## What to build

A dated aggregate evidence record containing:

- Deployed profile version, first confirmed metric arrival and exact UTC monitoring window.
- Instrument/query definitions and denominator meanings.
- Daily counts by release: eligible unverified GET/login exposures, compliant projections,
  privacy violations, lookup unknowns, finishes and aborts.
- Eligible citizenship grant attempts, new acknowledged committed unpaid→paid-and-citizen
  transitions, already-paid outcomes, replays, failures and uncertain outcomes.
- Export/collection gaps, alert-delivery evidence, verdicts and unresolved coverage.

Use existing dashboard capabilities. Any required dashboard/alert configuration change needs its
own authorized execution; no new monitoring backend. Record aggregate readings daily so retention
limits cannot silently erase evidence needed for the extension.

## Verification steps

1. **Arrival and release attribution:** establish deployed version and actual metric arrival.
   Confirm release filtering and exporter health. Missing series, collector outage or zero traffic
   cannot yield PASS. Record the source and date of readings; owner reports remain attributed reports.
2. **Monitoring readiness:** verify relevant alerts exist, reach their intended destination and
   have an approved delivery-check method. Missing alert/delivery evidence remains unresolved.
3. **Window:** **seven full UTC days**, beginning at the first UTC midnight after confirmed arrival,
   release attribution and healthy collection are established. Record release changes and gaps;
   incomplete collection cannot count as seven complete days.
4. **Privacy:** require actual eligible successful unverified GET exposure, with known stored paid
   facts or ownership; classify login output separately. Require **zero observed forbidden paid-field
   or entitlement disclosures**. Report compliant/violating/unknown counts and denominators. Missing
   eligible exposure remains unproven. Any forbidden exposure triggers **immediate investigation**,
   rather than waiting for the window to end.
5. **Grant evidence:** require **at least three fresh, acknowledged committed citizenship
   unpaid→paid-and-citizen transitions** during the approved window. Replays, already-paid grants,
   client completion and uncertain COMMIT outcomes do not count. Three is an **operational sample
   target, not a confidence guarantee**.
6. **Invariants:** any acknowledged committed citizenship grant with inconsistent paid/citizen flags
   triggers immediate investigation. Report failures and uncertain outcomes separately; never
   silently discard them from denominators.
7. **Thin evidence:** one additional **seven-full-UTC-day** window, then an **explicit owner
   disposition** if still thin. No automatic waiver or inherited 0516 acceptance of unproven items.
8. **Coverage limits:** missing positive durable-item ownership exposure is **unproven**, an explicit
   residual requiring owner disposition. B4 has no real sellable item, so that population may never
   appear naturally. An empty list does not prove the positive-ownership case.
9. **Verdict:** separate server emission, committed grant, privacy exposure and collection health.
   Natural grants replace 0497's Yandex test-listed purchase criterion. Aggregates do not prove
   billing, payment-dialog behavior, browser receipt or permanent privacy. Later metrics verdicts
   are under amended acceptance; never retroactively PASS original manual checks 3/4.
10. **Evidence privacy:** retain only dates, versions, fixed classifications, aggregate counts,
    dashboard/query names and attributed conclusions. No screenshots/raw exports containing
    account data, IDs, tokens, receipts, addresses or payloads.

## Notes

- **Depends on:** [0522](../0522-measure-profile-privacy-and-committed-purchase-grants-on-the-profile-server/brief.md) and its deployed profile release with confirmed metric arrival, release attribution and healthy collection.
- **Blocks:** [0497](../0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md)
- **Knock-on accepted:** 0497 and zero open tasks behind it wait on this Sprint 9 verifier, which
  waits on the Sprint 9 build/deploy. Sprint 9 stays open at least seven full UTC days after arrival,
  plus release/collection readiness delay; thin data adds one further seven-day window, then owner
  disposition. This is the exact placement approved in the quoted option.
- 0516 is related, not a dependency; its client funnel work and window are not duplicated or changed.
- Threshold/window/extension policy above are owner-approved replacement criteria of 2026-11-05,
  not unapproved proposals. They grant neither implementation nor deployment approval.
- Any defect leads to a separate bounded fix decision. Technical Verify and independent review
  precede any closure recommendation; 0497 and this task remain open meanwhile.
- Nothing is committed or pushed without the owner's explicit ask.
