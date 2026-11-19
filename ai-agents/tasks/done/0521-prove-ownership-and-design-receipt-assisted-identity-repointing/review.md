# Review — 0521

Task: ai-agents/tasks/done/0521-prove-ownership-and-design-receipt-assisted-identity-repointing/brief.md
File(s) under review: ai-agents/tasks/backlog/0521-prove-ownership-and-design-receipt-assisted-identity-repointing/findings.md — appended Parts 1–3 as one decision packet; preserved seed as attributed context; brief/plan/plan-review/worklog as scope and verification evidence.
Status: closed-out
Coverage: reasoning-only second opinion — both passes usable; primary ran read-only Git, Python artifact checks, source/ADR/wiki inspection and official-document retrieval; adversarial independently ran Git, Python artifact checks, source/ADR inspection and official-document retrieval. Neither ran behavioral checks, tests or SDK/race experiments.

## Reviewer findings

| # | Round | Sev | Location | Claim |
|---|-------|-----|----------|-------|
| R1 | 1 | low | findings.md § Fresh architect assessment of owner's repoint-only policy; § Whole-packet static artifact validation | CORRECT / Defect: historical “separate caller comparison” links to Routes.ts#L1357 (`verifySignedPayload`), not `classifyHeld` at src/profile-server/Routes.ts:428 (equality at :435; call at :1434). No dated packet clarification corrects this pairing. Append a source-framed correction distinguishing purchase verification, caller resolution (:1371) and comparison; preserve every seed/Part 1–3 byte. This is a mechanical evidence defect, not a false NO-GO conclusion. Strict content-anchor Verify remains red until corrected and freshly checked. Raised by primary and independently confirmed by adversarial as a historical nit. |

### Round 1 decision and scope — 2026-11-05

**⚠️ Changes requested — 1 defects (none blocking).** One low-severity citation defect; no confirmed substantive defect in the bounded NO-GO decision packet. This recommendation grants no fix, policy, implementation or closure authority.

Caller: fkit-lead, driver fkit-sprint-ship-loop, fresh reviewer worker at hop 1. Loaded fkit-stateful-review through the dispatcher; used reviewer-only fkit_adversarial for a fresh independent leaf. No raw CLI wrapper or coder consultation. New ledger: no prior findings, coder responses or accepted residuals to deduplicate.

The delivery/exception/retry owner answers dated 2026-11-05 are trusted lead-relayed authority, not independently verified consent. Saved plan blob matched f4b75ec46892b72fb69c01bd4c043871d7c5f3a1. Historical NOT APPROVED wording is superseded for delivery by the later relayed live answer; no automatic-link/policy approval follows. An evidence-backed NO-GO and explicit SDK unknowns satisfy the investigation boundary; missing trustworthy proof is its result, not an unfinished deliverable.

### Pass availability, identity and actual evidence

| Pass | Availability / provenance | Actual checks and limits |
|---|---|---|
| Primary | Available, independent reviewer context. Local role configuration requests gpt-6.1-sol; exact primary runtime model identity is not exposed to this worker. | Read brief, full packet, saved plan/review/worklog context and relevant ADRs; targeted authentication, identity creation, receipt/intent/grant, schema, session/cache/restart source reads with rg/sed/nl/cat. Git HEAD matched 8378e14384e93edfdab372e81a9906845fdbcbf4; scoped source/config/test/.agents diff returned no paths. Read-only Python confirmed 119,899-byte final hash, all four supplied hash boundaries, 121 relative links, 107 in-range anchors and verification rows 1–7. Bounded UUID/private-path/DSN/bearer-value scans returned zero matches; manual packet read found no private values. These checks establish artifact properties, not behavioral safety or exhaustive semantic citation validation. |
| Adversarial | Available, fresh read-only leaf; dispatcher: runtime codex, actual/requested model gpt-6.1-sol, exit 0, no timeout/truncation. Dispatcher identity supersedes the leaf's self-reported identity uncertainty. | Reported git rev-parse HEAD match and empty scoped git diff; python3 -B -c hash/prefix/link/range checks; nl/sed citation verification; source/ADR reads and official player/purchase/events/PostgreSQL contract retrieval. Explicitly no behavioral execution, tests, SDK/backend/private access, delegation or writes. |

**Model diversity unknown:** primary configuration alone cannot establish actual identity. A different model is recommended for a broader second opinion. No same-model or different-model claim is inferred from configuration.

Primary independently re-fetched official [player](https://yandex.com/dev/games/doc/en/sdk/sdk-player), [purchases](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases#fraud-prevention), [selection events](https://yandex.com/dev/games/doc/en/sdk/sdk-events#game-account-selection-dialog) and [PostgreSQL advisory-lock](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) documentation. They support the packet's bounded distinctions between identity authentication, purchase evidence, selection notifications and cooperative locking; this inspection establishes no full-profile B→P migration credential. Documentation silence is not proof that no vendor mechanism exists.

Read-only fkit-query consulted schema/catalog, [[tasks/receipt-assisted-identity-recovery]], [[tasks/yandex-progress-selection-investigation]] and [[decisions/adr-128-owner-run-profile-merge]], with source ADRs controlling current policy. Watermark 2aa3cefb13caad3cd36817da4fcbff1def9b0883 has zero committed non-wiki ai-agents changes through HEAD; uncommitted packet changes are excluded. Wiki Backlog/seed-only claims are stale against the current brief/packet; no wiki write.

### Finding verification and recommendation

R1 raw positions: primary **low**; adversarial **historical citation nit, no significant new issue in Parts 1–3** (no numeric severity assigned). Reviewer verdict **CORRECT, low, Defect** because the brief requires content-faithful citations and the current verification failure is independently reproducible. At this source frame, Routes.ts:1357 invokes `verifySignedPayload`, :1371 calls `resolveOptionalCaller`, :428 declares `classifyHeld`, :435 compares `caller.playerId === holderPlayerId`, and :1434 invokes the comparison for a processed receipt. The underlying proof conclusion remains supported. Recommended action: append a narrowly scoped dated clarification, then fresh content/preservation/link verification. Never repair the immutable historical seed in place.

The other historical receipt-schema citation is already explicitly corrected in Part 3's validation footer and Part 1's receipt-schema reference; no duplicate finding. Source inspection also confirms the packet does not present current GameServer assignment or ProfileSession retry behavior as satisfying its proposed isolation invariant: both remain activation blockers. No new implementation defect is alleged.

### Re-litigates settled decisions (suppressed)

- Ordinary login replay window — ADR-121 § Accepted residuals R1 / Re-raise only if. No ordinary-login change is warranted here. Cross-profile authorization is separately gated and explicitly reopens that question before implementation.
- Forced reload / removal of Later / guest-buy interruption — ADR-125 Decisions 1–5 and RP-1 preserve continuity and both buttons. The packet requires later transition policy rather than silently changing them.
- Tombstone, broad XP merge, name release, blanket Q revocation/sweep — ADR-113 § Account linking and ADR-128 Decisions 2/2.6. The proposed narrow operation retains Q; its deliberate ordinary-write cost is explicit. Existing 0504 manual-merge follow-up/sweep is preserved, not independently verified or waived.
- Current block/contact/manual recovery — ADR-126 Decisions 5/7/8 and ADR-128 owner-only boundaries remain effective. Conditional policy deltas are proposals, not an accepted automatic-merge exception.

These are suppression boundaries, not newly accepted residuals or owner dispositions. AR-9's identity-rebinding trigger is expressly reopened/unresolved in the packet, not suppressed as settled.

### Convergence and owner questions

Recommend process R1 as a localized citation clarification within existing authority, followed by fresh Verify. Do not claim Verify pass or closeout now. No substantive correction or immediate owner disposition was established by this round. Proof, paid admission, creation-pause policy, restart/AR-9 and ADR choices remain later owner decisions before dependent activation. No new residual accepted. Placement knock-on: none checked against brief (depends on nothing; blocks nothing); no new wait for 0504. Task/board status unchanged by reviewer.

Tests, integration, coverage, builds, lint, generators and future SDK/race/session/restart checks **SKIPPED / NOT EXECUTED** under the approved document-only plan. No SDK cell became observed or passed. Historical owner-run recovery, deployment, 0504 fresh-login/follow-up and runtime behavior were not independently verified. No source/findings/worklog/plan/wiki/ADR/production change, commit, push, message or move by reviewer. Only this ledger is authored; the dispatcher created its authorized unique scratch prompt.

### Independent leaf response [adversarial] — verbatim

> No significant new issues found in **0521 Parts 1–3** against the full brief, inspected source and ADR-113/121/125/126/128. The completed **NO-GO** packet consistently preserves proof, payment, session and later-approval gates; explicit SDK unknowns are valid outputs.
>
> Known historical citation nit independently confirmed: “separate caller comparison” points to `Routes.ts:1357`, which verifies the purchase signature. Caller resolution is at `1371`; comparison is at `435`. This does not invalidate the proof conclusion or constitute a novel defect in Parts 1–3.
>
> Coverage self-assessment: fresh independent adversarial pass; exact model identity/diversity unknown. Read/reasoned about behavior only; no behavioral execution. `git rev-parse HEAD` matched; scoped `git diff` was empty; `python3 -B -c` confirmed final hash, preserved prefixes and 121 local links/107 anchor ranges; `nl`/`sed` confirmed the citation mismatch. Re-read official [player](https://yandex.com/dev/games/doc/en/sdk/sdk-player), [purchases](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases), [events](https://yandex.com/dev/games/doc/en/sdk/sdk-events#game-account-selection-dialog) and [PostgreSQL locking](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS) contracts. No tests, SDK/backend/private access, delegation or writes.

## Coder response

| # | Verdict | Defect / Frontier | Action | Status |
|---|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (low; independently assigned) | Appended findings.md § R1 localized citation clarification — 2026-11-05; verified five source anchors, all prior bytes, local links/ranges and bounded privacy. No code change. Fresh driver Verify pending; ledger remains in-review. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)

None — no owner residual disposition supplied or inferred.
