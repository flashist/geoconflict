# Verify 0496 live: entitlements migration and ownership privacy

**Source**: `ai-agents/tasks/backlog/0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md`; `ai-agents/tasks/backlog/0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/worklog.md`
**Status**: in-progress *(blocked)*
**Sprint/Tag**: Sprint 9 · task 0497 · append rank 26

## Goal
Verify the B4 migration and ownership privacy, preserving owner-run checks and applying the owner-approved 2026-11-05 replacement criteria to the remaining acceptance.

## Key Changes
The owner approved same-Sprint-9 tasks 0522 and 0523 as an exception to the next-sprint verification rule, and approved replacing remaining acceptance while keeping 0497 open until 0523 completes. 0497 is **blocked** on 0523, which waits on 0522 and its deployed metric arrival; original 0496/0506/0510 and deploy dependencies remain. No TOP NEXT or implementation approval follows. Source: `brief.md` — search for `2026-11-05 — owner-approved acceptance and dependency amendment`.

## Outcome
- Migration applied and a fresh confirmed-login GET are **PASS — owner-run reported**. The GET returned HTTP 200 and an empty entitlements array. No independent live verification; current live versions and exact observation times retain the worklog's provenance limits.
- Original manual unverified-read and Yandex test-listed purchase checks remain **NOT RUN** historically; a later metric verdict cannot retroactively pass them.
- Approved future evidence: seven full UTC days after arrival, release attribution and healthy collection; eligible unverified exposure and zero observed forbidden disclosures; at least three fresh acknowledged committed citizenship transitions. Thin data gets one seven-day extension, then an explicit owner decision; positive durable ownership exposure remains unproven if absent. See [[tasks/profile-privacy-grant-metrics-verification]] for exclusions and limitations. These are criteria, not observed results.
- Technical Verify and independent review remain pending. Source: `worklog.md` — search for `follow-ups filed; acceptance amended on actual owner rulings`.

## Related
- [[tasks/profile-privacy-grant-telemetry]] — 0522 proposed build
- [[tasks/profile-privacy-grant-metrics-verification]] — 0523 verifier
- [[tasks/durable-items-entitlements]] — 0496 build
- [[systems/shared-purchase-flow]]
- [[decisions/sprint-9]]
