# Name change: the daily digest lists the pending requests, not just how many there are

## ID
0315

## Sprint
Sprint 6

## Priority
5

✅ **5 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Directly below `0313`. ~~⚠️ **The rank does NOT answer whether to do this task at all** — that yes/no is still the owner's.~~ ✅ **DO IT — OWNER-RULED later on 2026-09-26** (fourth re-rank, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): Q *"0315 … do it at all? If 0313 ships, the need mostly goes away."* → **"Keep it"** (*"Stays at rank 5 as extra safety."*). Rank unchanged. See the *RE-RANK 2026-09-26, FOURTH* addendum. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~30~~ (append rank).

~~⚠️ **30 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0313`**, because it is the safety net for any request the per-request message still misses;
it is small and optional — if `0313` ships, the need drops.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, under the same owner
rulings as `0312` (finding **"Name-change moderation gaps"** → **"Sprint 6, bottom"**, live via
`AskUserQuestion`, relayed by `fkit-lead`). ⚠️ The lead's framing was *"consider"* a richer digest — the
owner has **not** asked for it; this brief exists so they can say yes or no. ⛔ Not producer precedent.

Today the `0283` digest sends one message a day (07:00 MSK) into the Name Changes topic with the **count**
of players waiting. On 2026-09-26 a request was silently not notified (`0313`); the digest would have shown
"1 waiting" the next morning with no way to act on it without a DB query.

## What to build

**Step 0 — Owner says whether to do this, and how much to list.** Candidates: (a) list each pending
request — player id (internal id only, as the per-request message already does since `0270`), requested
name, age of the request — capped at N lines with "and M more"; (b) (a) plus the approve/reject commands per
line in `0312`'s shape; ~~(c) don't do it~~ *(ruled out 2026-09-26 — owner: "Keep it")*. *Recommended: (a)*, cap 20 — commands per line make one long
message the operator must scroll, and every pasted name is an injection surface (`0307`).

**Step 1 — Build it** in the existing digest job (`name-change-digest-runbook.md` describes it — extend,
do not add a second job). Names go through the same Telegram HTML escaping as the per-request message.
Keep the "zero pending" behaviour `0283` settled.

**Step 2 — Tests:** 0, 1, N and more-than-cap pending rows render as expected; a hostile name is escaped.

## Verification steps

1. Owner's answer to step 0 recorded verbatim (a "no" closes this via the producer's cancel mover).
2. Step 2 tests pass.
3. The digest runbook is updated to describe the new message.
4. **Owner-run, live:** with one pending test request, the next digest lists it.
5. `npm test` green; the shell harnesses in `npm test` still pass if the digest script is one of the files
   they assert on.

## Notes

- **Depends on:** nothing
- **Related:** [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) (the digest) ·
  [`0313`](../0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator/brief.md)
  (fixes the main cause of missed requests) ·
  [`0312`](../0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md)
  (command shape, if option (b)) ·
  [`0307`](../0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) (names in
  Telegram are in its scope).
- **Privacy/secrets:** internal player ids only, never Yandex ids; no tokens.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. ~~Do it at all?~~ ✅ **Yes — owner ruled *"Keep it"* 2026-09-26** (see *Priority*; option (c) is ruled out). ⏳ **Still open:** list only (a), or list with commands (b)? *Recommended: (a), capped at 20.*
