# Investigate Yandex progress selection: identity, authentication and session behavior; prevention options

## ID
0520

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Investigation only, filed 2026-11-04 by `fkit-producer`, consulted by `fkit-lead` at hop 1 of 2.**
Owner approval via live `fkit_roles.fkit_ask_owner`, 2026-11-04, relayed by `fkit-lead`, verbatim:

> New focused investigation (Recommended) — file on Backlog for progress-selection identity/session behavior and prevention options; no existing task gains a dependency or sprint wait.

The owner's objective is to restore the affected player first, then prevent this edge case recurring.
This brief covers the Yandex progress-selection dialog only: do its choices change identity or authentication,
reload the game iframe, or leave client, backend and session attached to different progress?

**Recovery is separate.** The redacted [0504 worklog](../0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/worklog.md)
records the owner-run merge and successful immediate readback on November 4. `0504` remains `🔄 In progress`:
player fresh-login confirmation and the required ≥24-hour follow-up are pending. Follow-up not before
**2026-11-05T12:09:08.742023Z**; recommended **12:15 UTC / 15:15 Moscow**. This investigation adds no wait to recovery.

### Evidence and limits at filing

- **Recorded recovery evidence:** `0504`'s worklog records support-linked profiles, the owner's approval and
  owner-reported merge/readback. The [0502 worklog](../../done/0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/worklog.md)
  records the earlier profile chain and limits of its owner-run checks. Neither proves the dialog's exact event sequence.
- **Support and player statements, attributed:** the lead relayed owner-supplied support screenshots on November 4:
  support says progress merging can change the unique ID and recommends account-selection events and refreshing
  player data after close. Its `setData` advice is generic SDK persistence advice, not proof about our backend.
  The player reports selecting saved progress before the loss. The underlying conversation date is not visible in
  the screenshot; November 4 is the evidence-supply date. These are relayed statements, not producer-verified cause.
  Private images remain outside the repository; do not embed them or reproduce personal data.
- **Fresh coder inspection, relayed by the lead:** read November 4 against code frame `8378e143`:
  account-selection events are not currently handled; `FlashistFacade` caches the plain player and refreshes it
  through its own authentication path, but not arbitrary progress selection; `ProfileSession` drops the old token
  only when the facade reports a changed ID. An unknown Yandex ID, verified or unverified, maps to a new backend
  profile without a trusted automatic old-to-new mapping. These are reported local-code facts to re-check with
  source anchors, not an independently verified producer trace or proof of this incident's cause.
- **Purchase boundary:** the same coder inspection reports permanent purchases are no longer consumed locally.
  This cannot make this incident's already-consumed purchase reappear. Do not present non-consumption as a complete
  identity/session fix or automatic account-linking evidence.
- **Official documentation, checked for scoping 2026-11-04:** [Yandex SDK events](https://yandex.com/dev/games/doc/en/sdk/sdk-events)
  documents `ACCOUNT_SELECTION_DIALOG_OPENED` / `ACCOUNT_SELECTION_DIALOG_CLOSED`, recommends handling progress changes
  for games with their own server, and re-fetching the player after close. This describes an integration contract;
  it does not prove which choice this player made, runtime ordering, an automatic iframe reload or a trusted ID mapping.

The wiki incident page `[[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]` and
`[[decisions/adr-128-owner-run-profile-merge]]` establish the recovery context and manual-only merge rule.
**Wiki gap:** they retain older recovery/support state and do not establish this dialog's behavior. The watermark
check found 0 committed `ai-agents/` changes since sync at `2aa3cefb13caad3cd36817da4fcbff1def9b0883`;
that check does not cover newer live evidence or working-tree records. Use the redacted sources above for recovery;
route completed findings to `fkit-wiki` for ingestion separately.

## What to build

Produce investigation findings in this task's `worklog.md`; no implementation in this task.

1. **Check the platform contract.** Read the official [SDK events](https://yandex.com/dev/games/doc/en/sdk/sdk-events)
   and [player-data documentation](https://yandex.com/dev/games/doc/en/sdk/sdk-player). Record dates and exact SDK
   methods/events, what is guaranteed about each progress choice, authorization and `getUniqueID()`, and what is
   unspecified. Separate support guidance from public guarantees. Check whether any reliable old-to-new identity
   mapping is supplied; do not infer one from similar progress or a shared browser.
2. **Trace the current local flows without source edits.** Start with `src/client/flashist/FlashistFacade.ts`,
   `src/client/ProfileSession.ts` and `src/profile-server/PlayerIdentityRepository.ts`; follow relevant callers.
   Explain cached plain-player data, signed-player data, authentication, profile-session reuse/invalidation,
   backend identity resolution and game-server identity/session updates across a progress choice or reload.
   Record exact code frame and searchable anchors, distinguishing existing auth-dialog refresh from selection.
3. **Define a minimal owner-run SDK reproduction, where runtime evidence is needed.** For each progress choice
   available to the owner, record platform/browser/build, iframe reload yes/no, observed events/order, identity
   same/changed, authentication state, signed-player refresh and resulting profile/session alignment. Use role
   aliases and equality/change results only, never raw IDs, signatures, tokens or receipts. Record unavailable
   branches and limitations. Production tests are owner-run only; this brief grants no credential, production-log,
   database or account access. No paid test, merge or other production write is authorized by this brief.
   Existing tools/tests may be used without source edits. Any prototype or instrumentation that changes source
   needs a separately approved plan. If runtime checks cannot be performed here, provide the checklist and mark
   every missing observation pending rather than inventing results or blocking the factual local report.
4. **Deliver facts, unknowns and prevention options for owner review.** Use an evidence table separating local
   inspection, official documentation, support/player reports and observed reproduction. Explain which failure
   paths are established, plausible or unsupported. Compare feasible prevention options and their limits, including
   refreshing/restarting after selection, session/identity realignment and manual recovery when trusted mapping
   is absent. Assess compatibility with existing restart/match guards and identity-trust decisions; do not choose
   new product behavior. Recommend one next step with tradeoffs, missing evidence and rough scope. Stop for owner
   review before implementation; future independently shippable changes need separately approved briefs/plans.

## Verification steps

1. Findings answer the identity/authentication, iframe-reload and client/backend/session-alignment questions for
   each available dialog choice, with a citation or explicit **unknown / pending owner-run reproduction** per answer.
2. Every factual claim names its evidence kind and source: dated official page, inspected code frame/anchor,
   redacted incident record, relayed support/player statement or actual owner-run observation. Screenshot supply
   date is not silently substituted for the underlying conversation date.
3. The local trace explains both the existing authentication refresh path and arbitrary selection, including
   signed data/session reuse and backend resolution. It neither claims that verified new identity proves ownership
   of an older profile nor recommends automatic merging from browser history.
4. Runtime checklist/results state what actually ran, by whom and on which build/platform; unrun cases remain
   explicit. Existing unit tests can support local logic only: they do not prove SDK event order, post-selection
   signed-data freshness, iframe behavior or an old-to-new identity mapping.
5. Prevention comparison, recommendation, risks and unknowns are ready for owner review. Source-writing prototypes,
   instrumentation and implementation remain subject to separate plan approval. No source/wiki/production changes
   or automatic merge are claimed as investigation results.
6. Review the findings for private IDs, fingerprints, account names, endpoints, receipts, signatures, tokens and
   credentials; keep only aliases, counts and same/changed observations. Cite redacted `0504`/`0502` records and
   official documentation; no private screenshots or raw logs in repository artifacts.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related context only:** [0424](../0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md)
  covers broader ID-change causes/prevention; [0394](../0394-re-login-when-a-player-switches-yandex-accounts/brief.md)
  covers general account-switch Phase 0. Neither is absorbed, activated or made a dependency by this brief.
- **Knock-on:** `0504`, `0394`, `0424`, `0513` and every other open task gain no dependency or sprint wait.
  No sprint pull, reprioritization or rank commitment; Backlog is unranked.
- **One brief:** the independently reviewable deliverable is one bounded explanation of progress-selection behavior
  and prevention options. Implementation cannot be scoped until those findings are reviewed with the owner.
- **Ownership:** a fresh `fkit-coder` owns read-only code/docs investigation and the findings record; the owner runs
  required live SDK checks and decides any follow-up product behavior. This filing does not start that work.
- **Standing constraints:** ADR-113 identity boundaries and ADR-128 manual, per-case owner-approved recovery stand.
  No automatic account merge, source changes, deployment, terminal moves, commit or push authorized here.
- **ID allocation:** checked all three task locations and `## ID` fields (highest `0519`), toolkit prose and repo-wide
  references before filing; candidate `0520` had no task reservation. The only substring hit was an unrelated Git hash.
