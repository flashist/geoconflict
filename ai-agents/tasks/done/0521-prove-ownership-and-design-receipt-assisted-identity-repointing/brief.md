# Prove ownership and design receipt-assisted identity recovery — repoint only to the older profile

## ID
0521

## Sprint
Sprint 9

## Priority
45

> **SPENT — 2026-11-05:** the owner-confirmed TOP NEXT pickup directive below was satisfied by this task’s delivery and agent-close; retained as placement history, not a current pickup instruction.
> **OWNER-CONFIRMED TOP NEXT — 2026-11-05, live user chat, relayed by `fkit-lead`.**
> **Next eligible work: 0521**, ahead of the other eligible Sprint 9 tasks. This explicit owner instruction
> governs pickup; 45 is append rank only, preserving ADR-035 closed-row history. No existing rank changes.
> ⚠️ Priority 45 is append rank, NOT a merit ranking — flagged for owner confirmation. **That confirmation
> is already supplied by the November 5 TOP NEXT ruling below**; no further placement/priority answer is needed.
> **On merit this belongs directly below 0496**, immediately above 0497 (the first other open row), because the owner
> made this the next eligible work; this describes merit, not a mid-board insertion. Numeric-only automation must be directed to
> 0521 explicitly; the next-task note is not claimed to change a scheduler.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-architect

## Context

**Proof/design investigation only. Filing does not start implementation.** The feature goal is eventual automatic
restoration when a changed Yandex identity can be **trustworthily linked** to an existing internal player.
A safe restart and retained receipt may help discover that player; neither alone proves authority to access it.
The smallest useful next deliverable is one ownership-proof go/no-go and minimal repoint design, not a broad
account-switch build or another general incident investigation. Supplied coder/architect findings are preserved
in full in [findings.md](findings.md), with a dated synthesis, evidence limits and next questions.

### Explicit owner authority — 2026-11-05, live user chat, relayed by fkit-lead

> Brief a task for working on what we've just discussed. Save all our findings there. This task should be our top next priority (should be in the current sprint).

The owner also proposed this canonical-data policy, verbatim:

> "If the new ID already has a profile with progress, we need controlled reconciliation rather than simply repointing it." - I think we need to implement a simple solution here: if the current server-side profile is older than a new "fresh" account, we shouldn't merge anything from the new account, we basically should repoint the new Yandex.Games account to the existing our-server profile and let the user play as the old our-server account.

This authorizes the brief/findings and Sprint 9 top-next placement. It records the proposed **repoint-only**
policy; it does not authorize access by age, source changes, automatic linking or an unreviewed implementation.
Not producer precedent for re-ranking. Current sprint was independently resolved on filing with
`dashboard.sh select-active`: Sprint 9, `🔄 In progress`, `plan-sprint-9.md`, reason `lowest-ordered`.

### Existing evidence and locked boundaries

- Several external identities already map to one internal profile. Historical owner-run
  [0504 recovery](../../backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/worklog.md)
  kept old paid P, **4 identities, 173 XP**, original receipt/name; immediate readback and narrow audit passed
  according to owner output. **Player fresh-login confirmation and the required November 5 ≥24-hour follow-up
  remain unreported**: not before 12:09:08.742023 UTC, recommendation **12:15 UTC / 15:15 Moscow**. This task
  adds no delay or change to those mandatory checks. The existing manual merge's sweep rule still applies there.
- Source reasoning at **8378e143**, November 5: a signed purchase proves purchase data, while verified login proves
  new identity B. Current checks do not bind the two. Ledger P is our recorded beneficiary, not a signed original
  vendor UID. Receipt possession, age, token uniqueness and `heldElsewhere` are insufficient ownership proof.
  Current held-elsewhere handling blocks access; this is not a demonstrated existing account takeover.
- Consumption of permanent purchases is disabled in current source; deployment is owner-reported. The incident's
  already-consumed purchase cannot reappear. Non-buyers and players without a retained receipt need a fallback.
- **Policy conflict to resolve before any build:** [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
  leaves automatic linking undesigned; [ADR-126 D1/D8](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
  requires block/contact/manual handling and only observes purchase freshness;
  [ADR-128](../../../knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md)
  permits owner-run merges, excludes automatic matching and requires `transferPurchase` for actual paid transfers.
  [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
  replay assumptions must be reconsidered for access to another profile. Filing changes none of these decisions.
- D3 and [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md)
  protect failed-login finality, guest-buy continuity, purchase completion and Restart now / Later; lobby/join/match
  guards still apply. Events are selection-specific, not a universal account-switch contract. Forced reload must
  not interrupt charged work or silently override those rules. The related client restart **R1 plan + annex/HTML
  remain UNAPPROVED**; backend linking is new scope, not authority inherited from that proposal.

## What to build

Deliver **one completed proof/design decision packet in this task's findings.md**, extending the preserved reports.
No source/config/test/wiki/production writes, SDK experiments, credentials/log access, commits/push or closures are
licensed by this brief. Public-document research and read-only source inspection may inform the packet; any missing
vendor/runtime fact is an explicit unknown, not a reason to lose the automatic-restoration objective.

1. **Resolve the authoritative ownership-proof question first.** Use the concrete vendor questions in findings.md.
   Determine whether a backend can verify a replay-resistant relationship B→P beyond independently valid player
   and purchase signatures. Validate candidate vendor migration proof or independent authentication of both
   identities with explicit consent; do not invent a vendor API or assume sharing/gifting behavior. Explain why
   the evidence would authorize **all of P**, including private account data and progress, rather than just a paid
   entitlement. Define freshness, request correlation, replay defense and the ADR-121 impact. If no such proof is
   established, recommend **NO-GO for automatic linking**, retain safe current handling and specify what evidence
   would reopen it. No silent entitlement-to-account-access promotion.
2. **Prepare a bounded observation matrix for both save choices.** Record UID/authentication, event order versus
   auth completion, iframe survival/reload, fresh plain/signed/payment-object alignment, retained receipt visibility,
   stable token/developerPayload, issuedAt and any authoritative signed identity binding. Visibility alone is not
   authorization. Actual SDK cases and new tests are **NOT EXECUTED**. Owner-run isolated disposable fixtures need
   separate authorization; do not assume the existing test copy has an isolated backend. No real charges,
   production writes, data reset or experiments on the restored player. Unavailable cases remain explicit unknowns.
3. **Specify the minimal repoint-only operation, conditional on proof.** Define three outcomes: unmapped B→alias P;
   B→eligible newer Q→atomically move **only B's identity** to P; B→P→successful no-op. P remains canonical. Ignore
   Q's ordinary XP/progress: no XP merge, Q deletion, broad identity move or ordinary-progress sweep. Other Q
   identities/data and nickname reservation remain untouched. Compare internal `created_at` only **after proof**;
   equal/reversed ages, missing profiles, multiple receipt holders and conflicting targets stop automatic recovery.
   Define paid receipts/cosmetics/pending payments on Q as explicit exceptions requiring separate paid-state
   handling; do not silently discard paid value. Charged work completes for its original intent's Q. No paid
   transfer is part of this narrow transaction; any separately approved transfer must follow `transferPurchase`.
4. **Make the design complete across creation, sessions and races.** Coordinate public login and internal game-server
   resolution, both of which currently create Q before proof; internal resolution still creates when public
   creation is paused. Cover persistent page/game caches. Specify one concurrency boundary for missing identity
   rows, uniqueness, conflicting targets, simultaneous first login/join and paid-state writers; recheck proof,
   mapping, age and eligibility in the transaction. Repeats must be consistently idempotent across both paths.
   After the link, a fresh verified B login receives a P session. Existing Q tokens/pages/matches remain isolated:
   never redirect or upgrade a Q token into P, never overwrite a server-known match identity, never promise XP from
   a Q-admitted match reaches P. Old Q pages can write ordinary progress for up to 24 h; deliberately ignoring it
   does not inherently require token revocation or an XP sweep. Paid writes retain the exception above. A frontend
   purchase-fetch reorder alone is insufficient. Specify the safe restart boundary without inheriting R1 approval.
5. **Return a reviewable go/no-go with fallback and follow-on scope.** Give a concrete acceptance table for proof,
   ambiguous/missing/consumed receipt, unverified/stale/mismatched login, age, paid exceptions, old sessions and
   concurrent retries. Recommend safe manual/contact recovery without exposing P when proof is unavailable;
   preserve current rights and the repeat-purchase block. List exact proposed policy amendments and the smallest
   independently shippable implementation slices only after the proof result is reviewed. **Code starts only after
   trustworthy proof is established, independent review and an owner-approved implementation plan.** This task's
   delivery is the decision packet; it does not deliver or authorize automatic restoration itself.

## Verification steps

1. Packet distinguishes owner decisions/proposals, supplied static source reasoning, official contract, historical
   owner-run recovery and actual SDK observations. All three November 5 reports remain available locally in
   findings.md; no substantive evidence depends on temporary files or chat. Portable links and source-frame
   line anchors resolve, and a corrected source citation is documented.
2. Ownership section names the exact authenticated B→P relationship and server checks, or explicitly returns
   NO-GO with missing evidence and a safe fallback. Receipt visibility/possession, two independent signatures,
   `heldElsewhere` and profile age never pass this gate. Entitlement recovery is not silently equated to full access.
3. Both save-choice matrix rows have actual dated/build-labelled observations or explicit NOT EXECUTED/unknown.
   Signed/plain/payment alignment, token/developerPayload stability and issuedAt are covered without saving private
   values. Candidate proof options are evaluated, not reported as vendor guarantees. Unit reasoning cannot count
   as SDK execution; unrun tests remain unrun.
4. Design table covers unmapped B, eligible Q, already-P no-op, age ties/reversal, absent/deleted owner, multiple
   holders/conflicts and Q paid/pending exceptions. It preserves P and Q's untouched data/name/other identities;
   original purchase intent beneficiary remains fixed; no XP merge, Q deletion or token upgrade is implied.
5. Transaction/race table covers both creation paths, absent-row serialization, uniqueness/rollback, retries,
   conflicting targets and concurrent payment writers; fresh P-session issuance and old Q cache/match isolation
   have explicit outcomes. Any unsafe/unproved branch stops automatic linking, never picks the first receipt.
6. Review records proposed ADR-113/121/126/128 changes and D3/ADR-125/AR-9 implications, unresolved decisions,
   actual execution coverage and follow-on approval gate. Existing manual handling and 0504 follow-up stay intact.
7. Artifact privacy/link checks pass: aliases/counts only; no raw IDs/UUIDs, purchase tokens, fingerprints,
   credentials, DSNs, private endpoints, screenshots, launcher diagnostics or broad conversation dumps.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **On merit:** immediately above 0497 — owner-confirmed next eligible Sprint 9 work; establish safe restoration
  before other eligible pickup. 0497 is the first other open board row, not a new correctness dependency.
- **Next action:** proof/design packet delivered, fresh artifact Verify PASS, review closed-out; automatic linking
  remains NO-GO. Future proof/policy/fixtures and implementation require separate owner approval.
- **One brief / one deliverable:** ownership proof, minimal transaction and go/no-go are inseparable parts of one
  bounded recovery design. Implementation and live verification are later separately approved work, not bundled here.
- **Related, not dependencies:** [0520 findings](../../backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/findings.md)
  already provide selection/lifecycle evidence; [0394](../../backlog/0394-re-login-when-a-player-switches-yandex-accounts/brief.md)
  covers general switching; [0424](../../backlog/0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md)
  covers ID-change causes; [0504](../../backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/brief.md)
  covers the existing recovery. No artificial wait on unscheduled Backlog work, no 0520 move/cancel or rejected patch.
- **Knock-on:** no existing task gains a dependency or sprint wait. Top-next pickup does not delay 0504's mandatory
  player/follow-up checks. No existing row/status/rank is changed.
- **Allocation:** all backlog/done/cancelled folders and brief ID fields checked on filing; maximum 0520, next 0521;
  no prior 0521 reference in tasks/sprints. No ID reuse or renumbering.
