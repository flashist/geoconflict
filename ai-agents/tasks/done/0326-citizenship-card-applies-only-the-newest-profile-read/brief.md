# Citizenship card: apply only the newest profile read (fix the stale-read race in `refreshProfile`)

## ID
0326

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names
> and `## ID` fields agree): `0325`. **`0326`:** no task folder, no `## ID` hit, no hit under `.claude/`,
> `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 6

> ➡️ **2026-09-28 — moved into Sprint 6 by OWNER RULING** (live via `AskUserQuestion` in the `fkit lead`
> session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037; ⛔ not producer precedent).
> Verbatim: *"Yes, into Sprint 6 (Recommended)"* — option text: *"Placed just before the new B1–B4 rows so
> B2 can follow it."* Reason: `0318`'s brief B2 (`0329`) adds a second concurrent profile read on the
> card, so this stale-read guard must land first. Was ~~Backlog~~.

~~**Unscheduled.** The owner ruled that this be filed but named no sprint, so it sits on the Backlog board.
Pulling it into a sprint is a separate producer act (three edits; see `/fkit-task-brief` step 8).~~
*(struck 2026-09-28 — pulled into Sprint 6, see above.)*

## Priority
40

> **40 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/plan-sprint-6.md) after
> `0327`, appended, never inserted (ADR-035). Placement owner-ruled 2026-09-28 (see `## Sprint`): directly
> before `0328`–`0331` (`0318`'s B1–B4). Was ~~Unscheduled~~.

~~Producer's rank if pulled in: **Low** (not owner-ruled).~~ *(struck 2026-09-28 — superseded by the owner's
placement ruling above.)* The worst case on its own is a brief, self-correcting display glitch; see
*Context*. Its weight now comes from blocking `0329`.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.

- Question put to the owner: `0303`'s plan question **Q-C** (optional extras, both dropped from `0303`).
- Owner's answer, verbatim: **"Leave both out; file (ii) (Recommended)"**. Option text, verbatim: *"0303
  stays exactly as ruled; the producer files (ii) as its own small task."*
- **(ii) is this task.** The other extra ("show threshold, not 0" on a failed re-read) was left out and is
  **not** filed.

**The problem, in plain terms.** The citizenship card re-reads the player's profile from several places:
the first read when the card appears, the re-read after a session-start purchase reconciliation grant
(`PURCHASES_RECONCILED_EVENT`), the re-read after the tenure XP grant, and the re-reads after a purchase.
`CitizenshipCard.refreshProfile` (around `src/client/CitizenshipCard.ts:162-166`) simply awaits the read
and writes whatever comes back. It has **no ordering guard**. If an **older** read is slow and finishes
**after** a newer one, the older (stale) answer overwrites the newer one.

- **Concrete case:** the reconciliation listener is registered before the card's first read starts. If
  reconciliation re-grants citizenship at start-up while the first read is still in flight, the re-read
  can finish first (citizen), then the slow first read lands (not citizen) and wins.
- **Worst case:** the **buy button briefly comes back** for a player who is already a citizen, and the
  published citizenship status (which drives the private-lobby perk lock, task `0302`) goes stale with
  it, until the next re-read or the next page load.
- **The race already exists today. `0303` did not cause it.** `0303`'s plan found it while scoping and
  dropped the fix because `0303`'s restart popup does not need it.

**Source.** `0303`'s plan,
[`plan.md`](../../done/0303-the-whole-game-reflects-a-purchase-without-a-reload/plan.md), section *"(A) pieces:
kept or dropped under (B)"*, row *"Stale-read guard in `refreshProfile`"*; the ruling is recorded in the
same file's rulings list (Q-C). The guard was first proposed in `0303`'s **round-1** plan; that round-1
text is not kept as a separate file on disk (the plan file was rewritten for round 2), so the table row is
the surviving record.

**No conflict found** with a locked decision. One constraint to keep: the card's own comment
(`startTenureClaim` doc block) says the profile is re-read **only** through `refreshProfile()`, never a
second `loadPlayerProfileView()` caller, so `Citizenship:Earned:XP` cannot double-fire. The fix must keep
`refreshProfile` as the single read path.

## What to build

1. **An ordering guard in `refreshProfile`.** A per-card request counter: each call takes the next number
   before it starts the read; when the read comes back, its result is applied (profile set, citizenship
   status published, re-render requested) **only if** its number is still the newest one issued. An older
   read that finishes late is dropped silently.
2. **Keep every existing caller's contract.** Callers that `await this.refreshProfile()` (the tenure grant,
   the purchase paths) must still resume after the call settles, whether their own result was applied or
   superseded. A superseded read must not throw and must not leave the card in a half-updated state.
3. **Keep the single-read-path rule** above: no new `loadPlayerProfileView()` caller, no change to how or
   when `Citizenship:Earned:XP` fires.
4. **A test** in `tests/CitizenshipCard.test.ts` (or the nearest existing card test) that reproduces the
   race: two overlapping reads where the first resolves **after** the second, and asserts the card ends up
   showing the second (newer) result — citizen, no buy button, citizen status published. The test must
   fail on today's code.

**Out of scope:** the "show threshold, not 0" extra (left out by the same ruling); any change to
reconciliation, the purchase flow, or `0303`'s restart popup; the card-vanishing problem investigated in
`0318`.

## Verification steps

- The new race test **fails on the current code** (stale result wins) and **passes** with the guard. Record
  both runs in the worklog.
- `npm test -- tests/CitizenshipCard.test.ts` and the other citizenship suites
  (`CitizenshipStatus`, `CitizenshipPurchase`, `CitizenBadge`, `CitizensOnlyModal`) pass.
- A test (new or existing) shows that `Citizenship:Earned:XP` still fires exactly once for one load.
- A test (new or existing) shows an awaiting caller (e.g. the tenure grant path) still continues when its
  read was superseded.
- `npm run lint` clean.
- Full `npm test` run; if a known `supertest` flake appears, follow the CLAUDE.md flake procedure and say
  that you re-ran.

## Notes

- **Depends on:** nothing
- **Blocks:** ~~nothing~~ `0329` *(changed 2026-09-28)* (`0318` B2 — the card re-checks its gate on late recovery; it adds a second concurrent profile read, so this guard must land first).
- **Related:** `0303` (where the race was found; its plan dropped this fix by owner ruling Q-C), `0318`
  (same card, different symptom: the card vanishing after a match on a shaky connection — do not merge the
  two), `0302` (the private-lobby lock follows the status the card publishes).
- Small, self-contained change in one client file plus its test. No `src/core/` change expected.
- **2026-09-28 — second publish call to guard.** Task `0321` (done, 2026-09-28) added a `publishApprovedName()` call next to `publishCitizenshipStatus()` in `CitizenshipCard.refreshProfile`. This task's newest-read-only guard must wrap **both** publish calls, so an older read that lands late cannot republish a stale approved name either. Source: [`0321` plan § 6](../../done/0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name/plan.md) (merge note) and that task's close note in [`worklog.md`](../../done/0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name/worklog.md).
