# Name change: a genuinely new request after a decision or withdraw must still reach the operator

## ID
0313

## Sprint
Sprint 6

## Priority
4

✅ **4 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Directly below `0312`. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~28~~ (append rank).

~~⚠️ **28 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0312`**, because a silently-missed request means a paying citizen waits with no operator
aware of it, and it touches the same notification code as `0312`.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, under the same owner
rulings as `0312` (finding **"Name-change moderation gaps"** → **"Sprint 6, bottom"**, live via
`AskUserQuestion`, relayed by `fkit-lead`). The split and everything below are the producer's; ⛔ not
producer precedent.

**Observed 2026-09-26 (prod `0.0.154`, owner-run):** a first request at 15:03:21 UTC notified the
operator; it was approved at 15:05:59. A **second, new** request at 15:06:29 — after the first was already
decided — produced **no Telegram message**. It was only found because the owner was watching.

**Why:** `NameChangeRepository.claimNotifySlot` allows **one operator notification per player per 10
minutes** (`OPERATOR_NOTIFY_COOLDOWN_MS`), kept **in memory**, keyed on the **player alone**. It was added
by review R1 of `0067` to stop a request → withdraw → request loop from flooding the channel, and it is
safe from a moderation standpoint only because each decision is bound to `expectedName` (owner ruling
`0067` option A). The code comment records a deliberate choice: keying on (player, name) *"would hand the
flood straight back"*.

**The gap:** the cooldown also swallows a request made **after the operator already decided** the previous
one — not a flood, a real new request. The daily digest (`0283`, count-only, once a day at 07:00 MSK) is the
only later trace, and it does not say who.

Also note: the map is in memory, so a container restart resets it (harmless direction) and the rule is not
visible anywhere an operator would look.

## What to build

**Step 0 — Owner decides the rule.** Candidates (producer's, not rulings):
- (a) **A decision clears the player's slot**: after approve/reject, the next request notifies at once.
  Withdraw does **not** clear it (keeps R1's anti-flood guarantee — the loop R1 stopped is
  request → **withdraw** → request, which never involves an operator decision).
  *Recommended* — closes today's case, keeps R1 intact.
- (b) (a), plus a suppressed request still gets a short **"another request from this player — see
  digest/pending"** line once the window ends (a trailing notice), so nothing is lost silently.
- (c) Shorter window, same keying. ⚠️ Narrows the gap, does not close it.
Whatever is chosen must not re-open the flood R1 closed; say how in the plan.

**Step 1 — Build the chosen rule** in `NameChangeRepository` (keep the never-throw discipline of
`notifyOperator`).

**Step 2 — Tests:** request → approve → request notifies twice; request → reject → request notifies twice;
request → withdraw → request within the window notifies once (R1 still holds); for (b), the trailing notice
fires exactly once.

## Verification steps

1. Owner's rule recorded verbatim before building.
2. The step 2 tests pass; the approve/reject cases fail on today's code.
3. The R1 flood test that exists today still passes unchanged.
4. **Owner-run, live:** request → approve → a new request within 10 minutes → a Telegram message arrives
   for the second request.
5. `npm test` green (re-run and say so if the known `supertest` flake appears).

## Notes

- **Depends on:** nothing
- **Related:** [`0312`](../0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md)
  (same message; if both are in flight, build on one branch) ·
  [`0067`](../../done/0067-name-change-citizens-only/brief.md) (R1 and option A) ·
  [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) · `0315` (digest listing
  names — a partial safety net for anything the rule still suppresses).
- **Privacy/secrets:** none; no player ids or names in tests or worklog beyond synthetic ones.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Rule: (a) a decision clears the slot, (b) (a) plus a trailing notice, or (c) shorter window?
   *Recommended: (a).*
