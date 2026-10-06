# ADR-122 — The Stale-Login Gate Is the Owner's Judgment on the Data at Hand (No Fixed Window, No Fixed Threshold)

**Date**: 2026-10-05
**Status**: accepted

> Project ADR-122 — see [[decisions/adr-numbering-two-series]].
> **Accepted 2026-10-05** on owner rulings given live via `AskUserQuestion` in the `fkit lead` session, relayed by
> `fkit-lead`. Drafted by `fkit-architect`, which heard every ruling by relay only.
> **Supersedes [[decisions/adr-121-login-signature-24h-window]] Decision 4 only** — the *"≤ 5 % over 7 days"* gate —
> and ADR-121's re-raise bullet that restates it. [[decisions/adr-116-verified-login]] Decision 6 is unchanged.
>
> Source: `ai-agents/knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md`

## Context

ADR-121 Decision 4 set the S2 exit as a server `stale` share ≤ 5 % over 7 days after the fix (`0391`) ships. A 7-day
window starting at a Tuesday deploy cannot finish before the 10/11 Oct weekend slot, so the fixed gate would push
`0340` (S3a, minting verified sessions) back a full week by construction.

**The rulings, verbatim (2026-10-05):**
- On the 7-day check: *"Remove the 7 days requirement, we will check whatever data we have at the time it's needed and
  we will make a decision about waiting or not waiting longer based on that"*.
- Deploy `0391` on Tuesday 6 Oct (a mid-week exception to the weekend-slot rule): *"Yes, Tuesday (Recommended)"*.
- Before `0340` deploys at the 10/11 Oct slot: *"Judge by eye"* (option text *"Look at whatever numbers exist by the
  weekend and decide then"*).
- `0394` (re-login on account switch): *"I already told you that the described scenario is very rare. Keep the task in
  the backlog"*.

## Decision

1. **The fixed "≤ 5 % over 7 days" gate is removed.** No fixed window, no fixed threshold.
2. **At each point where the data matters, the owner looks at whatever post-`0391` data exists** and decides to
   proceed or wait. That look *is* the gate.
3. **`0340` may be built now.** Its deploy needs (a) the owner's look at the data then available, and (b) the
   separate, explicit owner approval to enforce (ADR-116 Decision 6, unchanged).
4. **`0394` is not a gate** for `0340` or anything else. It stays on the Backlog board.

Rejected: keeping ADR-121 D4 — it holds `0340` back at least one slot whatever the data shows.

## Consequences

- **Positive:** `0340` is not held back by the calendar; the owner can act on early data in either direction.
- **What the owner should know when looking** (the ADR's own list):
  - **The data before 10/11 Oct measures `0391`'s effect, not `0340`'s** — S2 is shadow only.
  - **It is weekday-only data** (Tue 6 – Fri 9 Oct). `0373` saw the worst stale share at 20–23 UTC on weekend evenings.
  - **Counters restart at each profile deploy** — never compare a cumulative value across a deploy.
  - **Where a high stale share starts to cost players:** `0340` alone costs no one (a stale login stays `vfy:false`,
    as every login is today). The cost appears as readers of `verified` ship, in this order: `0250` S3b (paid citizen
    missing their benefit) → `0248` (paid citizen still sees ads) → `0319` (name change refused) → `0332` / `0323`. **So
    the look should be repeated before each of those deploys.**
  - **Advice: do not deploy `0340` in the same slot as `0250` S3b.**
- 🚨 **Residual, stated plainly: there is no pre-set number.** No bar exists that a reviewer or an agent can check a
  deploy against. An agent asked *"is the stale share good enough?"* reports the numbers and the caveats above; **it
  does not answer the question.**
- **Re-raise only if** the owner asks for a fixed bar again, or a deploy that reads `verified` is about to ship with
  no owner look on record for it. Otherwise *"`0340` shipped without meeting a stale-share threshold"* is closeout of
  this ADR, not a new defect.
- ⚠️ **Appended note (2026-10-05, same day):** `0392` is no longer a "7-day verify" — it moved to Sprint 7 (rank 44),
  was renamed *"Read the post-0391 login numbers before the 0340 deploy"*, and closes after the owner's first look,
  before `0340` deploys. Each later `verified` reader (`0250` S3b, `0319`, `0332`, `0323`) carries its own owner-look
  step — the repeat look this ADR advises.

## Related

- [[decisions/adr-121-login-signature-24h-window]] — Decision 4 superseded by this ADR
- [[decisions/adr-116-verified-login]] — Decision 6 unchanged; dated clarification added there
- [[tasks/verified-login-enforce]] — task `0340`, built now, deploy gated by this ADR
- [[tasks/login-signature-24h-window]] — task `0391`, deployed Tue 2026-10-06 by the ruling above
- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b deploy needs its own owner look
- [[tasks/stale-login-fix-decision]] — task `0373`, the data behind the caveats
- [[decisions/sprint-7]] — the board carrying `0340`, `0391`, `0392`, `0395`
- [[systems/weekend-deploy-window]] — the mid-week exception and the 10/11 Oct slot
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[decisions/sprint-8]] — where `0392` and `0395` were filed before moving to Sprint 7
- [[systems/player-profile-store]] — the profile box whose deploys this gate governs
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 exit whose bar this ADR removed
- [[tasks/verified-login-shadow-mode]] — task `0325`, the S2 shadow mode the gate reads
