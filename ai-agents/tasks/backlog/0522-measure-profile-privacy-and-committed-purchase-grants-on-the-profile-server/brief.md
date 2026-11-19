# Measure profile privacy and committed purchase grants on the profile server

## ID
0522

> ℹ️ **ID allocation checked 2026-11-05 before filing.** Folder maximum and `## ID` maximum
> across backlog/done/cancelled were `0521`; allocated sequentially in dependency order, base 10.
> Candidate folder/field checks were empty; `.claude/`, `.agents/` and `.codex/` searches found
> neither candidate. Whole-repo filename search found only unrelated asset/generated/old console
> artifact hits outside task/toolkit records; no console contents inspected. No ID reused.

## Sprint
Sprint 9

## Priority
46

> ⚠️ Priority 46 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below 0497**, because it supplies that task's missing server evidence.
> Appended after rank 45; no existing rank changed, no pickup-order override.

## Status
🔄 In progress

## Owner
fkit-coder

## Context

[0497](../0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md) lacks a safe established unverified-session workflow and an
eligible unpaid test buyer. The owner requested measurement of natural production behavior instead
of manufacturing test accounts or changing their state. Its remaining acceptance is now amended;
the prior migration and fresh confirmed-GET PASS results remain owner reports.

0516 covers client purchase/rewarded funnels. Client `Completed` includes replay and cannot establish
a newly committed citizenship transition. Existing server reconcile totals lack the required product
and transition distinctions. Profile lookup failure can produce HTTP 200 with missing ownership data,
so missing must remain distinct from empty.

The supplied coder audit checked source at HEAD `8378e143` and ran **no tests**. It establishes this
bounded implementation proposal, not implementation approval. Wiki grounding: durable-items-entitlements,
purchase-grant-registry, shared-purchase-flow and ADR-116 verified-login. Their November 5 evidence is
missing; the current source brief/worklog and relayed rulings govern the amendment.

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

Extend existing profile-server OTEL → Uptrace measurement, using existing `service.version`.
No new backend, collector, client analytics, migration/schema or account-testing mechanism.

1. **Serialized profile privacy measurement**
   - Cover successful profile GET and login-envelope profile output at final serialization.
   - Fixed classifications: verified/unverified; forbidden paid-key exposure; entitlements
     absent/empty/nonempty/invalid; lookup empty/nonempty/failed/unwired.
   - Separate response finish from abort. Server finish establishes server emission, not browser receipt.
   - Count eligible unverified exposures where existing server reads establish stored paid facts or
     ownership. Emit coarse counters only.
   - Count compliant, violating and unknown classifications separately. Lookup failure never counts
     as an empty ownership list.
2. **Shared grant measurement**
   - Observe complete/reconcile through the shared grant repository.
   - Distinguish citizenship/other product kind, fresh receipt/replay, locked unpaid-before →
     paid-and-citizen-after, and already-paid grants.
   - Count committed success only after acknowledged COMMIT. Distinguish pre-commit failure from
     uncertain COMMIT outcome.
   - Prevent double counting the same repository outcome at complete/reconcile route level.
     Request, reconcile-entry and repository-attempt denominators remain explicitly different.
   - Telemetry failure must preserve payment behavior. Export loss or a crash after COMMIT remains
     a measurement limitation, never evidence of no grant.
3. **Complete outcomes**
   - Add bounded outcome reasons and denominators for complete requests; reuse existing reconcile
     counters where sufficient.
   - Expose enough aggregate counts for eligible attempts, new committed citizenship transitions,
     replays, failures and unknown outcomes.

Allow only fixed enums for route, verification, lookup, projection, product kind and transaction
outcome. No identifiers, hashes of identifiers, tokens, signatures, receipts, payloads, product
contents, user attributes, arbitrary errors or unbounded labels.

Likely scope: `src/profile-server/Telemetry.ts`, `Routes.ts`, `PaymentsRepository.ts`, `Server.ts`,
plus a small observer helper if needed. The coder's reviewed plan determines exact files and
instrument names.

## Verification steps

1. Extend existing telemetry/route tests to exercise final serialized GET and login output,
   including verified/unverified, absent/empty/nonempty/invalid ownership and paid-field exposure.
2. Prove failed/unwired lookup remains unknown; successful HTTP status cannot classify ownership as empty.
3. Exercise finish/abort and observer/exporter failures; verify unchanged response and payment behavior.
4. Extend payment repository and Postgres integration coverage for fresh citizenship, replay,
   already-paid, rollback, concurrent attempts, acknowledged COMMIT and uncertain COMMIT outcome.
5. Verify shared grant counters are not duplicated across complete/reconcile; test denominator and
   fixed-label accounting.
6. Inspect emitted telemetry for forbidden data and high-cardinality labels.
7. Run relevant existing tests and required project checks. Record actual execution separately from reasoning.
8. Supply [0523](../0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md) with instrument definitions, denominator meanings,
   release identification and known blind spots. Live arrival is the separate verification task.

## Notes

- **Depends on:** nothing
- **Blocks:** [0523](../0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md); [0497](../0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md) indirectly through 0523.
- Relevant B4/S1/S2 builds are closed; no hard unfinished build dependency is introduced.
- **Knock-on:** 0523 waits on this Sprint 9 implementation and its deployed arrival; 0497 alone
  waits on 0523 in Sprint 9. No open task behind 0497 was found in current dependency declarations.
- Formal coder plan review and actual owner approval precede implementation. No purchase-flow,
  account or privacy-policy change, production access or deployment is authorized by this filing.
- **Split rationale:** this bounded server instrumentation can ship independently; 0523 requires
  deployed arrival and elapsed monitoring time. The three measurement sections share the server
  accounting contract for this acceptance and remain one bounded build, as in the prepared draft.
- 0516 is related only; its scope, dependencies, window and thin-data ruling remain unchanged.
- Nothing is committed or pushed without the owner's explicit ask.
