# Player name loses its space ("First Last" shows as "FirstLast") — find where, and decide which characters a name may contain

## ID
0308

## Sprint
Sprint 6

## Priority
6

✅ **6 — OWNER-RULED later on 2026-09-26** by a third OWNER RULING (R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner chose order *A* — `0307`, `0302`, `0312`, `0313`, `0315`, **`0308`**, `0314`, `0317`, … — which **closes the "open to owner correction" note below**. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~3~~ —

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** — an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3); ⛔ not producer precedent. Full record: the *RE-RANK 2026-09-26* addendum on the Sprint 6 board. ⚠️ **Slot 3 is `fkit-lead`'s reconciliation, open to owner correction:** the owner put this task *"right below"* `0307` (Q1) and separately made `0302` *"the 2nd priority"* (Q3); the owner never ranked `0308` against `0302` directly. ~~23~~ was the append rank until then.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request made
in the `fkit lead` session on 2026-09-26 (voice-dictated) and relayed by `fkit-lead`.** The owner asked for
the work and for Sprint 6. ⚠️ They did **not** rule the rank, the split into two briefs (this one and
`0307`), or any change to the name rules. ⛔ Not producer precedent.

**The owner's words, verbatim:**
> *"Another thing that I noticed is that after getting citizenship the name of my account changed like it
> looks like previously I had space in the name of my account and right now I don't have it like it's
> right now it's my name and my last name without space and before that I believe I had a space so my
> guess is that our names they don't support certain symbols"*

### What is already known — 2026-09-26, working tree on `dev` at `5b3e6ec`. A LEAD, not a diagnosis.

- **Citizenship probably did not cause it.** `fkit-lead` found the citizenship card already showing the
  name without the space in the owner's 14:38 MSK screenshot, **before** citizenship was earned (15:15).
  The owner's `players.display_name` is empty (no name change was made).
- **The card shows the Yandex name as-is.** With no `display_name`, the card shows
  `FlashistFacade.getCurPlayerName()` — the Yandex SDK `player.getName()` — with **no** clean-up on the
  way (`src/client/PlayerProfileView.ts` ≈:69–100 → `CitizenshipCard.ts` ≈:380).
- **The in-game name is cleaned.** `UsernameInput.getStoredUsername` and `PlayerImpl` run
  `sanitizeUsername` (`src/core/validations/username.ts`), which **deletes** (does not replace) every
  character outside letters, digits, `_`, `[`, `]` and whitespace. A plain space is kept. A `-`, `.`, `'`,
  zero-width space, emoji, or a combining accent is **deleted** — so `"First-Last"` would become
  `"FirstLast"` in game.
- **So no line was found that deletes a plain space.** Hypotheses, none proven: (1) Yandex returns the
  name without the space; (2) the separator is not a plain space (a zero-width space, a dot, a hyphen…);
  (3) an older name kept in `localStorage` (the fallback in `getStoredUsername`); (4) two different
  screens being compared; (5) something not yet found.

## What to build

**Step 0 — Find the exact characters.** Get the raw `getName()` value in the owner's session and list its
**code points** (not how it looks). Compare with: the citizenship card, the in-game name field, the name
above the owner's territory in a match, and the Yandex account page. ⚠️ Reading the owner's live Yandex
session may need the owner at the keyboard — ask; do not guess. Record the finding in `worklog.md`.

**Step 1 — Fix the cause** if it is in our code. If it is on Yandex's side, record that, and say so to
the owner plainly — it is then a "nothing to fix in our code" result, not a failure.

**Step 2 — Put the character rule to the owner, as a decision.** Today's rule (`usernameRules.ts`):
3–27 characters; letters and digits in any script, `_`, `[`, `]`, whitespace; **no** hyphen, apostrophe,
dot, emoji or combining accents. Real names that break it: *Анна-Мария*, *O'Neil*, *Jr.*, many
accented/diacritic names typed in decomposed form. Questions for the owner, with the coder's
recommendation:
- Which extra characters (if any) a name may contain.
- Whether an unsupported character is **deleted** (today) or **turned into a space** — the latter keeps
  `"First-Last"` readable as `"First Last"`.
- Whether the Yandex name shown on the citizenship card should go through the same clean-up as the
  in-game name, so a player sees **one** name everywhere.

**Step 3 — Build the ruling.** One rule, shared by the client input, the in-game sanitizer and the
profile server (`checkUsernameRules` is already shared — keep it that way). If error texts change,
update `resources/lang/en.json` **and** `ru.json` together.

⚠️ **A wider rule is a security change.** See the Notes: do not ship any widening before `0307` has made
each path safe on its own.

## Verification steps

1. `worklog.md` records the exact code points of the owner's Yandex name and which screen showed what.
   The cause is named with evidence, or recorded as "on Yandex's side" with evidence.
2. If the cause is in our code: a test that fails on the old code and passes on the fix, using the
   owner's name **shape** (never the owner's real name in the repo).
3. The owner's ruling on the character rule is recorded in the brief, verbatim, before step 3 starts.
4. After step 3: tests show each newly allowed character is kept, each still-refused character is
   handled as ruled (deleted or turned into a space), on the in-game name **and** the name-change request.
5. `npm test` green; en/ru texts updated together if any changed.
6. If the rule was widened: `0307`'s report lists every path that relied on the old rule, and each is
   shown safe with the new characters (in particular the operator's pasted `curl` command).

## Notes

- **Depends on:** `0307` — soft. Only step 3 (a *wider* character rule) waits for `0307`'s map of the
  places that rely on the rule. Steps 0–2 can start at once.
- **Why the dependency.** Today the character rule is the only thing keeping `'` out of the shell
  command the operator pastes from Telegram (`NameChangeRepository.decideCommandLines`), and `<` out of
  `NameLayer`'s `innerHTML`. Allowing `'` for *O'Neil* without fixing those first would open a
  command-injection hole on the operator's own machine.
- **Related:** `0067` (name change, which reused this rule on the server by owner ruling) · `0068`
  (citizen verified icon) · `0296` (after-deploy production checks) · the Sprint 6 *Nickname Styling System* row (will draw names too). *(Reworded 2026-09-26: it cited a
  board rank, which the re-rank of that day changed.)*
- **Privacy:** never write the owner's real name into a brief, worklog, test or report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## Addendum 2026-09-26 — second-account evidence; the owner's "stripped symbols" guess may be wrong

**Appended by a spawned `fkit-producer` with no owner channel (ADR-021), on evidence and an owner statement
relayed by `fkit-lead` from the `fkit lead` session. Append-only (ADR-035); Status, Priority and Sprint
unchanged.** ⛔ Not producer precedent.

**New evidence (owner screenshots, relayed; the real name is withheld here per the privacy note).**
- The owner's **second** Yandex account, opened in production (game `0.0.154`) at ≈17:42 MSK for the
  `0297` test purchase: its citizenship card shows the name **with** a space — shape `"First Last"`.
- The **main** account's card shows the same name **without** a space — shape `"FirstLast"` — in the
  14:38 and 15:15 MSK screenshots (before and after citizenship was earned).

**What this suggests — a lead, not proven.** The card path does not remove a space (at least on this path;
the second account's separator *looks* like a plain space but its code point was not read either).
So the main account's missing space most likely comes from the name Yandex returns for that account, or
from a separator that is not a plain space (hypotheses 1 and 2 above). The card reads `getName()` with no
clean-up and does not use the `localStorage` fallback, which points away from hypothesis 3 for the card
(the in-game name is not covered by this evidence). ⚠️ The two accounts are different Yandex accounts; their
names only *look* the same. **Step 0's code-point read of the main account's `getName()` still decides the
cause.** Do not close step 0/1 on this evidence alone.

**The owner, verbatim:**
> *"I might've been wrong about this. It's worth adding a note about it in the briefing, about the "stripped" symbols"*

Read: the owner's original guess (*"our names they don't support certain symbols"*, quoted in Context) may
not be the cause of **this** missing space.

**Unchanged:** the rest of the task stands. The character-rule question — which symbols `sanitizeUsername`
deletes today (`-`, `.`, `'`, zero-width characters, emoji, combining accents) — is still valid on its own
and is still **the owner's decision in step 2**. Step 3 still waits on `0307`.
