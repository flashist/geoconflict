# Name Change: a Working Operator Approve/Reject Command (task 0312)

**Source**: `ai-agents/tasks/done/0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 3 / task `0312`

> ✅ Done (agent-closed — not owner-verified). Code committed in `390c4b4`. **Nothing ran on the real box**
> — the live approve/reject check is owner-run. Runbook of record:
> `ai-agents/knowledge-base/name-change-digest-runbook.md` § *Deciding a request: approve or reject*.
>
> ⛔ No token values, hosts, IPs, player ids or names on this page.

## Goal

The owner's live name-change test on release `0.0.154` (2026-09-26) found that the only decide command the
operator was handed — a laptop `curl` in the per-request Telegram message — got **`403`**, because since
task `0276` the profile box allows `/internal/` only from the game and monitoring boxes. Nothing said where
the command should run, and the message had **no Reject command at all**. That day's two decisions were made
by hand on the profile box. Give the operator a working, documented Approve **and** Reject.

## Key Changes

- **Owner ruling (verbatim):** **"Built-in command (Recommended)"** — *"Two short ready-to-paste lines
  (Approve, Reject) calling a small command shipped inside the profile server. Tested like normal code, and
  it can never get out of step with the server after a rollback."*
- **New command** `npm run -s name-change:decide` (`src/profile-server/decideNameChange.ts`, logic in
  `src/profile-server/NameChangeDecideCommand.ts`), run in the `profile-api` container. It reads the internal
  token **from the container's own environment** and posts to the decide route over the container's
  loopback. **The token is never typed, printed, logged or put in Telegram.** Inputs travel as
  `NAME_CHANGE_DECISION` (JSON) and `NAME_CHANGE_REASON` — runtime-only, allowlisted in
  `scripts/config-parity-allowlist.json`; **no new deploy variable**.
- **The per-request Telegram message now ends with two lines**, Approve and Reject (`decideCommandLines`),
  replacing the laptop `curl`. The name travels only as `0307`'s pure-ASCII body inside `'…'`
  ([[tasks/player-name-path-security-review]] F2, byte-unchanged). Each line keeps the owner-ruled
  **`expectedName` binding** (`0067` option A). The Reject line carries a `REPLACE-WITH-REASON` placeholder
  the command **refuses** unedited, so it can never reach a player's inbox.
- **Operator rules (runbook):** SSH to the profile box first, **then** paste — never `ssh <box> '<line>'`
  (a second shell breaks the quoting); never from the laptop. An outcome table maps every answer
  (`200 approved/rejected`, `404 no_pending`, `409 name_taken`, `409 name_mismatch` with the pending name
  printed **escaped**, `400`, `401`, `503`, `500`, no answer ⇒ "may or may not have been applied", local
  `Refused: … Nothing was sent.` exit 2) to what to do, plus a read-only confirm query.
- **Review R1–R3 fixed:** a token with a non-printable-ASCII character is refused and any error text
  redacts it; the bash history-expansion test was made real; an unexpected server `error` code is printed
  escaped.
- **Rollback note:** message and command ship in the **same image**; an image from before `0312` has no
  `name-change:decide` script. Messages sent before this deploy still show the old `curl` line — the runbook
  says how to rebuild the new line from it.

## Outcome

- **Evidence:** `npm test` 157 suites / 2486 tests (review round); `npm run test:integration` 11 / 135 after
  one known-shape `socket hang up` re-run (said so). The new "carries BOTH an Approve and a Reject command"
  test fails on the pre-`0312` code.
- **Not verified — owner-run on the real box:** request on a test account → both lines shown → Approve pasted
  → `HTTP 200: approved` and the card shows the name → a second request → Reject with a reason →
  `HTTP 200: rejected`; neither run prints the token. Also unproven: `docker compose exec -e` passing values
  as-is on the box's compose version, and ts-node start-up time on the low-RAM box.

## Related

- [[tasks/citizenship-name-change]] — task `0067`, the moderation flow and the `expectedName` binding
- [[tasks/player-name-path-security-review]] — task `0307`, the shell-safe name encoding this reuses
- [[tasks/name-change-decision-resets-notify-limit]] — task `0313`, same message, same file
- [[tasks/name-change-dismiss-and-clear]] — task `0314`, adds `"decision":"clear"` to this command
- [[tasks/name-change-digest-pending-list]] — task `0315`, how to build this line for a request seen only in the digest list
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, adds the rude-name filter warning to the same message
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, the `/internal/` allowlist that made the laptop `curl` fail (correct; kept)
- [[tasks/name-change-daily-digest]] — task `0283`; the runbook this extends
- [[decisions/sprint-6]] — the board carrying this task
- [[systems/player-profile-store]] — the profile store, updated 2026-09-28 with this task's change
- [[tasks/config-parity-guard-arm-enforce]] — task `0298` (2026-09-28): the config guards' first real report-only run, then armed `--enforce`
