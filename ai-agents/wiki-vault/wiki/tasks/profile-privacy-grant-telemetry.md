# Measure profile privacy and committed purchase grants on the profile server

**Source**: `ai-agents/tasks/backlog/0522-measure-profile-privacy-and-committed-purchase-grants-on-the-profile-server/brief.md`
**Status**: in-progress
**Sprint/Tag**: Sprint 9 · task 0522 · append rank 46

## Goal
Propose server measurements for serialized profile privacy and fresh committed citizenship grants, using existing profile OTEL and Uptrace. 0516's client funnels remain unchanged.

## Key Changes
Scope is **proposed only**: classify final GET/login output, verified/unverified access, paid-field exposure, ownership projection and lookup outcomes, and finished/aborted responses. Lookup failure is unknown, not an empty list. Distinguish product, fresh receipt/replay, already-paid and new unpaid-to-paid-and-citizen transitions; count success only after acknowledged COMMIT. Keep attempt denominators distinct, avoid double counting, use bounded labels and protect payment behavior from telemetry failures. Export loss and post-COMMIT crashes limit measurement. No new backend, client analytics, account-testing mechanism or schema change is proposed.

## Outcome
**Plan only:** formal coder plan review and actual owner implementation-plan approval are required before code. The supplied source audit ran no tests; it is not runtime evidence. No implementation, deployment or metric arrival is established here. The owner approved Sprint 9 filing and the exception for 0522/0523 only; append rank is not priority confirmation and grants no TOP NEXT. Source: `brief.md` — search for `Owner authority — 2026-11-05`.

## Related
- [[tasks/profile-privacy-grant-metrics-verification]] — 0523 waits for this build and its deployed, healthy metric arrival
- [[tasks/entitlements-privacy-live-check]] — 0497 waits on 0523
- [[decisions/sprint-9]]
