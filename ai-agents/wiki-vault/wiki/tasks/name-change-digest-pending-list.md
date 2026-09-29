# Name Change: the Daily Digest Lists the Pending Requests (task 0315)

**Source**: `ai-agents/tasks/done/0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 5 / task `0315`

> ✅ Done (agent-closed — not owner-verified). Code committed in `390c4b4`. **No agent can observe Telegram
> delivery** — the live checks are owner-run and not done.

## Goal

The `0283` digest sends one message a day with the **count** of pending name requests. On 2026-09-26 a
request was silently not notified (`0313`), and the digest would only have said "1 waiting" — no way to act
without a DB query. The owner first ruled **"Keep it"** (*"Stays at rank 5 as extra safety"*) when asked
whether `0313` made it unnecessary.

## Key Changes

- **Owner rulings (verbatim):** Q1 *"(a) List only, up to 20"* — no Approve/Reject lines; Q2 *"Always send
  the short message as it works today. And the next message with more text"*. Plan approval also covered
  **no list on an empty day** and **list only after the heartbeat succeeds**.
- **A second message** on days with ≥ 1 pending request, after the unchanged heartbeat, in the same topic:
  up to 20 requests **oldest first** — internal player id (never a Yandex id) · the name shown like the
  per-request `Requested:` line (hidden characters as `⟨U+XXXX⟩` codes, `⚠️ hidden characters`) · waiting
  time — then `…and M more`. A very long list is cut earlier to stay under Telegram's length limit.
- 🚩 **The heartbeat, not the list, is still the liveness proof.** The heartbeat is byte-for-byte unchanged,
  is sent first, and **alone** decides the freshness marker, check 12 and the exit code. A failed list
  changes none of them — so **nothing pages when only the list fails**; it shows only as
  `name-change digest list NOT sent` in the digest log.
- **Review R3 (owner: "Fix it"):** `…and M more` followed the heartbeat's older count and could be wrong in
  both directions; the list query now counts its own total with a window function (`count(*) OVER ()`), so M
  is exact.
- **Runbook:** *Acting on a request you only see in the list* — build the decide line by hand, replacing each
  `⟨U+XXXX⟩` with `\uXXXX`; a mistake is safe (`409 name_mismatch`, nothing changes).
- Since `0322` a list line can also end `⚠️ rude-name filter` — the **only** place a request that never got
  its own message is flagged ([[tasks/approved-name-in-multiplayer-matches]]).

## Outcome

- **Evidence:** full `npm test` 157 suites / 2530 tests after review round 2 (first run); the shell harness
  still asserts the digest sends unconditionally; `test:integration` 11 / 136 after one **uninvestigated**
  `TenureGrant.it` failure whose error text was not captured (passed alone and on the full re-run — said so).
- **Not verified — owner-run:** deploy; a day with one pending test request shows the heartbeat then the list;
  a zero day sends the heartbeat only.

## Related

- [[tasks/name-change-daily-digest]] — task `0283`, the digest this extends (and the heartbeat's liveness role)
- [[tasks/name-change-decision-resets-notify-limit]] — task `0313`, which fixed the main cause of missed requests
- [[tasks/name-change-operator-decide-command]] — task `0312`, the command a listed request is decided with
- [[tasks/player-name-path-security-review]] — task `0307`, the hidden-character display reused here
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, the rude-name filter mark on list lines
- [[systems/alert-delivery]] — the Telegram topic routing and check 12
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/citizenship-name-change]] — task `0067`, the name-change feature this follow-up extends
