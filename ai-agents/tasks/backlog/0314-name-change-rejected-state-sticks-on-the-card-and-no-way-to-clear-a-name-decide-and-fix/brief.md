# Name change: the "rejected" state sticks on the card, and a name can never be cleared — decide and fix

## ID
0314

## Sprint
Sprint 6

## Priority
7

✅ **7 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Directly below `0308`. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~29~~ (append rank).

~~⚠️ **29 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0308`**, because it is player-facing name UX in the same area as `0308`'s name rules and is
annoying rather than harmful — nothing is lost or wrong, the card just keeps saying "rejected".

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, under the same owner
rulings as `0312` (finding **"Name-change moderation gaps"** → **"Sprint 6, bottom"**, live via
`AskUserQuestion`, relayed by `fkit-lead`). ⛔ Not producer precedent. The two gaps below were established by
a **`fkit-coder` consult during today's live test** (read of the code, relayed by `fkit-lead`) — not
re-verified line by line by the producer; the planner confirms them first.

**Gap 1 — the rejected state is sticky.** The card shows the **newest** request's state
(`CitizenshipCard.ts` pending → approved | rejected). After a reject, the card keeps showing *"rejected"*
until the player makes a **new request that gets approved**. Withdrawing does not clear it (withdraw deletes
only a *pending* row). So a player who was rejected and does not want to try again sees the rejection
indefinitely.

**Gap 2 — no way back to "no custom name".** There is no API path (player or operator) that sets
`display_name` back to `NULL`. Once a name is approved, the only way to change it is another approved name;
to remove it (for example a name approved by mistake, or a player's request to drop it) needs hand-written
SQL on the production database.

⚠️ Gap 2 is also a **moderation** gap: an approved name later found offensive can only be replaced, not
removed, without touching the DB by hand.

## What to build

**Step 0 — Owner decides both.** Candidates (producer's, not rulings):
- Gap 1: (a) the player can **dismiss** the rejected notice (it then shows the idle state); (b) it expires
  after N days; (c) leave as is. *Recommended: (a)* — one tap, no timer to reason about. The inbox already
  keeps the record of the rejection.
- Gap 2: (a) an **operator** "clear name" action on the same internal decide surface as `0312`
  (service-token authenticated, logged, sends an inbox note); (b) also a **player** "reset to default"
  button; (c) neither — document the SQL in the runbook. *Recommended: (a)* now, (b) only if players ask.

**Step 1 — Build the chosen options.** Any new operator action uses the same command/runbook shape `0312`
settles on — do not invent a second one. Any new player-visible text goes through `translateText`, in both
`en.json` and `ru.json`, and does not name the game (`0311`).

**Step 2 — Tests:** rejected → dismiss → idle state on the card, and a following request still works;
operator clear → `display_name` is `NULL`, the card shows the default name, history keeps an audit row,
uniqueness frees the old name.

## Verification steps

1. Owner's two decisions recorded verbatim before building.
2. The step 2 tests pass (unit, and the integration suite for the DB path — `npm run test:integration`).
3. Local run: reject → the chosen dismiss/expire behaviour is visible in ru and en.
4. If an operator action was added: it appears in the runbook next to `0312`'s commands, token never
   printed; owner-run once live on a test account.
5. `npm test` green (re-run and say so if the known `supertest` flake appears).

## Notes

- **Depends on:** nothing
- **Related:** [`0312`](../0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md)
  (an operator "clear" action rides its command shape — if both run, do `0312` first) ·
  [`0308`](../0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  and [`0307`](../0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) (same
  name paths) · [`0067`](../../done/0067-name-change-citizens-only/brief.md) (original state machine) ·
  [`0311`](../0311-remove-the-game-name-from-player-facing-texts/brief.md) (no game name in new copy).
- **Privacy/secrets:** a clear-name action touches personal data (a chosen name); log the action, never the
  name value in a public channel beyond what the existing moderation messages already carry.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Rejected notice: player can dismiss / expires after N days / leave it? *Recommended: dismiss.*
2. Clearing a name: operator action / also a player button / SQL in the runbook only?
   *Recommended: operator action.*
