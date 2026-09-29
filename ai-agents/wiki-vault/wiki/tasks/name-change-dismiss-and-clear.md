# Name Change: Hide a Declined Request, and Remove an Approved Name (task 0314)

**Source**: `ai-agents/tasks/done/0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 7 / task `0314`

> ✅ Done (agent-closed — not owner-verified). Code committed in `68303d5`, including a **new migration**
> (`migrations/007_name_change_dismiss_and_clear.sql`). **Deploy order: profile server first, then the
> client.** Nothing ran live. Runbook: `ai-agents/knowledge-base/name-change-digest-runbook.md` §
> *Removing an approved name (task `0314`)*.

## Goal

Two gaps from the owner's 2026-09-26 live test: **(1)** after a reject, the citizenship card showed
*"rejected"* indefinitely — withdraw deletes only a *pending* row, so only a new approved request cleared it;
**(2)** there was **no path at all** back to "no custom name" — an approved name (by mistake, or found
offensive later) could only be replaced, or removed by hand-written SQL on production.

## Key Changes

- **Owner rulings (verbatim, 2026-09-27):** Q1 **"Hide button, server (Recommended)"** — a server-remembered
  *Hide*, hidden on every device; Q2 **"Operator command (Recommended)"** — a third choice `clear` on the
  existing approve/reject command, needing a reason, sending the player an inbox note, keeping a history
  record and freeing the name; Q3 **"Yes, like the others (Recommended)"** — the inbox note repeats the
  removed name. Button text *"Hide" / "Скрыть"*.
- **Migration `007`:** `dismissed_at`; `new_display_name` nullable; the status CHECK re-added (same name)
  with `cleared`; a new CHECK that a `cleared` row has no name. The wire `NameChangeStatus` stays three values.
- **Player side:** `POST /v1/profile/name-change-dismiss`; a Hide button on the card next to "Try another
  name"; `getLatestState` returns null for a hidden decline.
- **Operator side:** `decision: "clear"` on the decide route and on `0312`'s command — `200 name removed` /
  `404 no_custom_name` / `409 name_mismatch` with the **current** name printed escaped. A reason is required
  (placeholder refused, ≤ 500 chars). **There is no Telegram line for it** — the operator builds it from the
  runbook, after a read-only lookup. A clear **does not touch** a pending request.
- New inbox template `name_change_cleared` (en + ru).
- **Build call worth knowing:** `LATEST_SQL` now orders a **pending row first**, else a clear (a newer row)
  would hide the player's own pending request from them.

## Outcome

- **Owner-accepted residual (review R1, *"Accept it"*):** if the operator later *rejects* a request that was
  pending across a clear, the card shows idle rather than the declined notice; the reason still reaches the
  inbox. R2–R4 fixed (the runbook's read-only check now orders by decision time; clear-specific wording).
- **Evidence:** `npm test` 157 suites / 2615 tests (first run); `test:integration` 146 passed, all 10 new
  `0314` integration cases ran.
- **Not verified — owner-run:** a local run in ru and en; after deploying profile then client, on a test
  account — decline → Hide → card back to normal; approve → clear on the box → `200`, default name shown,
  inbox note arrives.
- ⚠️ Since `0322`, an approved name is what other players see in a match — the clear command is also the
  runbook's remedy for an approved name the rude-name filter would hide
  ([[tasks/approved-name-in-multiplayer-matches]]).

## Related

- [[tasks/citizenship-name-change]] — task `0067`, the original state machine
- [[tasks/name-change-operator-decide-command]] — task `0312`, whose command shape the clear rides
- [[tasks/start-screen-approved-name-lock]] — task `0321`: a cleared name unlocks the start-screen box on the next load
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`: the resolve reply's `null` means "cleared"
- [[tasks/personal-inbox]] — task `0012`, the inbox template mechanism
- [[systems/player-profile-store]] — the profile DB and its migrations
- [[decisions/sprint-6]] — the board carrying this task
- [[decisions/adr-115-approved-name-in-matches]] — ADR-115 (2026-09-28): a citizen's approved name is shown in matches at ADR-103 trust level; forged-id and look-alike cases are owner-accepted risks
- [[tasks/name-change-daily-digest]] — task `0283`, the daily heartbeat digest
