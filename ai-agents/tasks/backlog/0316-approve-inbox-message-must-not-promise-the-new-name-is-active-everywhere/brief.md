# Name-change approved message must not promise the new name is active everywhere (en + ru)

## ID
0316

## Sprint
Sprint 6

## Priority
15

✅ **15 — OWNER-RULED later on 2026-09-26** (fourth re-rank, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner moved `0311` and this task up together — **"Move up after 0318 (Recommended)"**. Still directly below `0311`. See the *RE-RANK 2026-09-26, FOURTH* addendum on the Sprint 6 board. *Earlier value, kept:* ~~33~~ —

✅ **33 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"* — *"0316 under 0311 (same text files, ship together)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). **Directly below `0311`.** ⚠️ `0311` itself was not moved, so the pair sits at the bottom of the board. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~31~~ (append rank).

~~⚠️ **31 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0311`**, because it is a copy-only change in the same lang files and inbox templates as
`0311` and can ship in the same change; it sits well above `0317` because it is small and paying citizens
read the over-promise today.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live
in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`:** Q *"Which of today's findings
should get task briefs?"* → includes **"In-match name + wording"**; Q *"Where should the chosen briefs go?"*
→ **"Sprint 6, bottom (Recommended)"**. ⚠️ The owner did **not** rule the split into two briefs (this one
and `0317` — the producer's call: a wording fix ships alone, in hours; the in-match name needs design first),
the wording, or the rank. ⛔ Not producer precedent.

**The problem.** On approval the player gets the inbox message `inbox.templates.name_change_approved`:
- ru: *«Ваше новое имя «{name}» теперь активно.»*
- en: *"Your new display name '{name}' is now active."*

But by owner ruling `0067`(b) the approved name shows **only on the citizenship card** — not in matches, not
in lobby lists, not on the start screen (the in-match follow-up was ruled a *"separate follow-up task"* and
was never filed; `0317` files it). Observed live 2026-09-26: after an approve, the card showed the new name;
the in-match name did not change. With citizenship (and paid buyers) live, *"now active"* reads as *"you will
play under this name"*, which is not true.

**Retroactive by design — say so to the owner.** Like the citizenship message `0311` examined, this is a
**template** message: the client renders it from the lang file every time it is shown. Changing the text
changes it for **every approval already sent**, with no DB edit. That is the desired effect here.

## What to build

**Step 0 — Owner approves the wording.** Producer's draft (the owner decides):
- ru: *«Ваше новое имя «{name}» одобрено. Оно показывается в карточке гражданина.»*
- en: *"Your new display name '{name}' has been approved. It is shown on your citizen card."*
Keep the `{name}` placeholder. No game name (`0311`). If `0317` later ships the in-match name, the text is
updated again then.

**Step 1 — Edit** `resources/lang/en.json` and `ru.json` together (project rule). Other languages fall back to
en.

**Step 2 — Tests.** If a test pins today's text, update it; add or extend a check that en and ru carry the
same placeholders for this key.

## Verification steps

1. Owner's approved wording recorded verbatim before the edit.
2. `grep` for *«теперь активно»* / *"is now active"* in `resources/lang/en.json`/`ru.json` returns nothing
   for this key.
3. Placeholder check passes; `npm test` green (re-run and say so if the known `supertest` flake appears).
4. Local run: an existing `name_change_approved` inbox message shows the new text in ru and en.

## Notes

- **Depends on:** nothing
- **Related:** [`0317`](../0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) (the real fix —
  the approved name in matches) · [`0311`](../0311-remove-the-game-name-from-player-facing-texts/brief.md)
  (same files; ship together if both are open) ·
  [`0067`](../../done/0067-name-change-citizens-only/brief.md) (ruling (b): card only) ·
  [`0012`](../../done/0012-personal-inbox/brief.md) (template messages render at view time).
- **Privacy/secrets:** none.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Approve the ru/en wording above, or give your own.
