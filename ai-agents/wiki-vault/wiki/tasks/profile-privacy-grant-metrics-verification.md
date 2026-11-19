# Verify profile privacy and new citizenship grants through deployed server metrics

**Source**: `ai-agents/tasks/backlog/0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md`
**Status**: backlog
**Sprint/Tag**: Sprint 9 · task 0523 · append rank 47

## Goal
After 0522 deployment and confirmed metric arrival, verify privacy and new citizenship grants with release-attributed aggregate server metrics. This is owner-approved replacement acceptance for 0497, not an observed monitoring result.

## Key Changes
- Start seven full UTC days at the first UTC midnight after confirmed arrival, release attribution and healthy collection. Missing series, outages or zero traffic cannot pass; check alert delivery and record gaps and daily aggregates.
- Require eligible successful unverified GET exposure with known stored paid facts or ownership, zero observed forbidden disclosures, and separate compliant, violating and unknown counts; classify login separately. Investigate violations immediately. Missing positive durable-item ownership exposure is unproven and needs owner disposition.
- Require at least three fresh acknowledged committed unpaid-to-paid-and-citizen transitions. Exclude replays, already-paid grants and uncertain commits. Three is an operational sample target, not a confidence guarantee; investigate inconsistent flags immediately.
- If evidence is thin, extend once for seven full UTC days, then obtain an explicit owner decision; no automatic acceptance. Aggregate metrics do not prove billing, payment-dialog behavior, browser receipt or permanent privacy.

## Outcome
Backlog; depends on 0522 and deployed arrival/readiness, and blocks 0497. No monitoring or new metric arrival is reported. Observation needs separate access authorization or attributed owner aggregate reports. Technical Verify and independent review precede closure. Sprint 9 placement exception covers 0522/0523 only; ranks are append ranks, not confirmed merit order. Source: `brief.md` — search for `Owner authority — 2026-11-05` and `Thin evidence`.

## Related
- [[tasks/profile-privacy-grant-telemetry]] — 0522 build
- [[tasks/entitlements-privacy-live-check]] — 0497 amended acceptance
- [[decisions/sprint-9]]
