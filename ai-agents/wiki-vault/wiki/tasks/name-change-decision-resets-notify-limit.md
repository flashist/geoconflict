# Name Change: a New Request After a Decision Reaches the Operator (task 0313)

**Source**: `ai-agents/tasks/done/0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 4 / task `0313`

> ✅ Done (agent-closed — not owner-verified). Code committed in `390c4b4`. The live check is owner-run and
> **not done**.

## Goal

Owner-run test on `0.0.154`, 2026-09-26: a first name request notified the operator and was approved; a
**second, new** request three minutes later produced **no Telegram message** — found only because the owner
was watching. Cause: `NameChangeRepository.claimNotifySlot` allows **one operator notification per player
per 10 minutes** (`OPERATOR_NOTIFY_COOLDOWN_MS`), in memory, keyed on the player alone — added by `0067`'s
review R1 to stop a request → withdraw → request flood. It also swallowed a real request made **after** the
operator had already decided.

## Key Changes

- **Owner ruling (verbatim):** **"(a) Decision resets the limit (Recommended)"** — *"Once you approve or
  reject, that player's next request messages you at once. Withdrawing doesn't reset it, so
  ask/withdraw/ask spam stays at 1 per 10 minutes. Only you can decide, so players can't abuse it."*
- New private `releaseNotifySlot(playerId)` in `src/profile-server/NameChangeRepository.ts`, called on
  `decideNameChange`'s success path **immediately before `COMMIT`**. The `0067` R1 test block is
  byte-identical and still passes.
- **Review R1 (owner: "Fix it"):** the slot map was keyed on the raw id string while the decide schema and
  the session accept any-case UUIDs, so an uppercase-id decision freed no slot. Fixed with one key function
  (`notifySlotKey`, lower-case) used by both claim and release. **R2:** tests pin release-before-COMMIT and
  the COMMIT-failure cost.
- Runbook note: *"Once you approve or reject, that player's next request messages you at once. A withdraw
  does not reset it"* — a withdraw-then-re-request inside 10 minutes shows only in the digest list
  ([[tasks/name-change-digest-pending-list]]).

## Outcome

- **Evidence:** the approve/reject tests were red on the old code (`Expected 2 calls, Received 1`) and green
  after; full `npm test` 157 suites / 2499 tests after review (first run, no flake). `test:integration` not
  run — no DB behaviour changed.
- **Still true (unchanged, from `0067`):** the cooldown is **in-process** — a restart resets it (the harmless
  direction). The `expectedName` binding, not the cooldown, carries the moderation safety.
- **Not verified — owner-run after a profile deploy:** request → approve → a new request within 10 minutes →
  a second Telegram message arrives.

## Related

- [[tasks/citizenship-name-change]] — task `0067`: review R1's cooldown and the `expectedName` binding (option A)
- [[tasks/name-change-operator-decide-command]] — task `0312`, same message and file
- [[tasks/name-change-digest-pending-list]] — task `0315`, the safety net for anything the rule still suppresses
- [[tasks/name-change-daily-digest]] — task `0283`, the count-only digest that was the only later trace
- [[decisions/sprint-6]] — the board carrying this task
