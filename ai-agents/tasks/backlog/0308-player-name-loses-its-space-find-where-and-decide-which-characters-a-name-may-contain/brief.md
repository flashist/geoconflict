# Player name loses its space ("First Last" shows as "FirstLast") — find where, and decide which characters a name may contain

## ID
0308

## Sprint
Sprint 7

➡️ **Moved to [Sprint 7](../../../sprints/plan-sprint-7.md) on 2026-09-29 by OWNER RULING R1** (live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037; ⛔ not producer precedent) — see the *Addendum 2026-09-29, later — plan APPROVED, moved to Sprint 7* at the end. *Earlier value, kept:* ~~Sprint 6~~

## Priority
15

➡️ **15 — append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), 2026-09-29.** ⚠️ **The owner gave no rank on Sprint 7**; 15 is the next rank after that board's highest (14, epic `0213`) — a position, **not** a merit rank and **not** owner-ruled. *Earlier value, kept (Sprint 6):* ~~35~~ —

⬇️ **35 — PARKED AT THE BOTTOM OF SPRINT 6 BY OWNER RULING, 2026-09-27** — the owner's own free-text answer live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"Let's come back to this task later, decrease the priority and put it to the end of the current sprint"*. Rank 35 is the next append rank below `0297` (34). See the *PARK 2026-09-27* addendum on the Sprint 6 board. *Earlier value, kept:* ~~6~~ —

✅ **6 — OWNER-RULED later on 2026-09-26** by a third OWNER RULING (R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner chose order *A* — `0307`, `0302`, `0312`, `0313`, `0315`, **`0308`**, `0314`, `0317`, … — which **closes the "open to owner correction" note below**. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~3~~ —

**Board rank on [Sprint 6](../../../sprints/done/plan-sprint-6.md), OWNER-RULED 2026-09-26** — an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3); ⛔ not producer precedent. Full record: the *RE-RANK 2026-09-26* addendum on the Sprint 6 board. ⚠️ **Slot 3 is `fkit-lead`'s reconciliation, open to owner correction:** the owner put this task *"right below"* `0307` (Q1) and separately made `0302` *"the 2nd priority"* (Q3); the owner never ranked `0308` against `0302` directly. ~~23~~ was the append rank until then.

## Status
🔲 Backlog *(moved to Sprint 7 by owner ruling R1, 2026-09-29: plan **approved** that day, build **not started**, **no source changed**; resume from Step 0 (the owner runs the snippet, R3) — see the *plan APPROVED, moved to Sprint 7* addendum at the end)*

*Earlier values, kept:* ~~🔄 In progress — driven by `fkit-lead`, 2026-09-29 *(unparked by owner ruling 2026-09-29; approved plan.md must be re-presented at the plan gate before any build; resume from Step 0 — see the UNPARK 2026-09-29 addendum at the end)*~~ (held for a few minutes on 2026-09-29) · ~~🔲 Backlog *(parked by owner ruling 2026-09-27; approved plan.md kept; resume from Step 0)*~~ · ~~🔄 In progress — driven by `/fkit-sprint-ship-loop` (fkit-lead), 2026-09-27~~ — the build had not started and no source changed when the task was parked.

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
- **Look-alike names — to be revisited HERE (owner ruling D6 on `0317`, 2026-09-27).** *Added 2026-09-27 by a
  spawned `fkit-producer` with no owner channel, on an owner ruling given live via `AskUserQuestion` in the
  `fkit lead` session and relayed by `fkit-lead` (ADR-021/037); ⛔ not producer precedent.* `0317` re-raised
  `0307`'s *"Accept for now"* look-alike residual, because its re-raise condition is now met: approved names
  will be shown to other players in matches ([`0322`](../../done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md)).
  The owner, verbatim: **"Keep accepting, revisit in 0308 (Recommended)"** — option text *"You, as moderator,
  catch look-alikes when approving. Handle it properly with 0308 (which characters a name may contain)."* So
  this task's character rule must also decide how look-alike names are handled (today uniqueness among approved
  names is `lower()` only, with no normalization — [`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md)
  §2 point 3). ⚠️ The owner-approved `plan.md` predates this ruling and says the look-alike residual is **not**
  reopened (its opening notes); raise the conflict at the plan gate. This note changes neither this task's status nor its plan.
  - ✅ **Answered 2026-09-29 by owner ruling R2: option A, "Warn the moderator (Recommended)"** — see the
    *plan APPROVED, moved to Sprint 7* addendum at the end. *(Appended 2026-09-29, ADR-035.)*
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

## Addendum 2026-09-27 — what `0307` hands to this task

**Appended by a spawned `fkit-producer` with no owner channel (ADR-021), closing `0307` for
`/fkit-sprint-ship-loop` (driver `fkit-lead`). Append-only (ADR-035); Status, Priority and Sprint
unchanged.** The hand-offs below come from `0307`'s owner-approved plan (*"Hand to other tasks (via
fkit-producer; no new briefs)"*, 2026-09-26) and its review rulings (2026-09-27). ⛔ Not producer precedent.

Source: [`0307`'s findings report](../../../knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md)
(findings rows 9 and 15, and its §8 *Hand-offs*) · [`0307` brief](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md).

What `0307` leaves for `0308` to decide or do:
- **(a) Narrowing `\s`.** Today's rule accepts newline, tab, no-break space, U+2028, U+3000 and U+FEFF
  in a name. Owner ruling Q1 (2026-09-26) put this whitespace question here, not in `0307`.
- **(b) Delete vs replace in `sanitizeUsername`.** Whether the cleaner deletes a refused character or
  swaps it for something (for example a space). This is the same question as this task's step 2.
- **(c) Invisible Hangul filler letters.** The rule allows U+115F, U+1160, U+3164 and U+FFA0, so a
  name made only of invisible characters is possible. `0307` only made them *visible to the moderator*
  (F3, review R1). Whether names may contain them at all is this task's call.
- **(d) `sanitizeUsernameForJoin` cuts before it trims.** It runs `sanitizeUsername` (which cuts to 27)
  and only then trims, so a name that starts with 27 or more spaces loses all its letters and becomes
  the `xxx` filler. Checked by reading `src/core/validations/usernameRules.ts`, not by running it.
- **(e) Tests meant to flip here.** The characterization tests in `tests/UsernameHostileInputs.test.ts`
  (the "accepted today" cases) pin today's behaviour on purpose. When `0308` changes the rule, those
  tests should fail and be updated. That is expected, not a regression.
- **(f) Player-facing texts.** `username.rules_hint` and `username.invalid_chars` (in both `en.json`
  and `ru.json`) describe the rule. Any change to which characters are allowed must edit them too.

**Still true from the Notes:** any *wider* rule is a security change and needs `0307`'s path map
re-checked (the report's hop table). `0307` fixed the operator's curl line (F2) so it no longer depends on
the rule refusing `'`, but re-check each hop anyway.

## Addendum 2026-09-27 — parked by owner ruling; Step 0 partial evidence; the approved plan is kept

**Appended by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
2026-09-27 live in the `fkit lead` session via `AskUserQuestion` (the owner's own free-text answer),
relayed by `fkit-lead` (ADR-021/037).** ⛔ Not producer precedent. Append-only (ADR-035).

**The owner, verbatim:**
> *"Let's come back to this task later, decrease the priority and put it to the end of the current sprint"*

**Effect.** `## Status` reset from `🔄 In progress` to `🔲 Backlog`; `## Priority` 6 → **35**, the bottom of
[Sprint 6](../../../sprints/done/plan-sprint-6.md) (below `0297`, 34). Sprint unchanged (Sprint 6). At the time of
parking the build had **not** started and **no source file had changed**.

### The approved `plan.md` is kept

- [`plan.md`](plan.md) in this folder (git blob `f7a579d`) is the owner-approved plan, carrying the owner's
  rulings Q0–Q4. It was **not deleted and not re-authored**.
- ⚠️ **A later run must re-present it to the owner at the plan gate before building** (the ship-loop rule).
  Approval given on 2026-09-27 does not carry over to a resumed run on its own. Code, rules or evidence may
  have moved in the meantime; the plan may need a refresh before it is shown again.
- **Resume from Step 0.**

### Step 0 partial evidence (2026-09-27)

Read by `fkit-lead` in the owner's Chrome, on the Yandex Games page. **Shapes only — no real name is written
anywhere** (privacy note above).

- **Which account:** probably the owner's **SECOND** Yandex account — the citizenship card showed a citizen
  at 0/100 XP and a Cyrillic Yandex name. Not proven to be the second account; inferred from the card.
- **Yandex portal `displayName` shape:** `L L L L U+0020 L L L L L L L L` (four letters, a normal space
  U+0020, eight letters). The separator is a **plain space**, not a look-alike.
- **In-game citizenship card:** showed the name **with** the space.
- ⚠️ **The MAIN account — the one where the space was lost — was NOT checked.** This evidence therefore does
  **not** decide the cause; it only confirms, for the second account, the shape the 2026-09-26 addendum
  could only see by eye.
- **Method limit:** the game runs in a **cross-origin iframe**, so the browser tool cannot run the planned
  code-point snippet inside the game (no direct read of the game's `getName()`). The Yandex **portal page's**
  `displayName` is readable from the top frame, which is what was read here.

**Still open for Step 0:** the main account's code points — both the portal `displayName` and, ideally, the
game's own `getName()` value — which likely needs the owner at the keyboard (ask; do not guess).

## Addendum 2026-09-29 — UNPARK by owner ruling; status back to In progress; plan gate still required

**Appended by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
2026-09-29 live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (ADR-021/037).**
⛔ Not producer precedent. Append-only (ADR-035).

**Authority chain:** owner → `AskUserQuestion` in the `fkit lead` session (2026-09-29) → `fkit-lead` →
spawned `fkit-producer` (this edit).

**The owner chose, verbatim:** **"Unpark and start it (Recommended)"** — relayed purpose: unpark it so coding
can use this week while everything else waits on the weekend deploy.

**Effect.**
- `## Status`: `🔲 Backlog` (parked) → **`🔄 In progress` — driven by `fkit-lead`, 2026-09-29**. Old values kept, struck.
- `## Priority` **unchanged at 35**; Sprint unchanged (Sprint 6). The ruling was to unpark and start, not to re-rank.
- [Sprint 6](../../../sprints/done/plan-sprint-6.md) row Status cell updated to match.

**Plan gate — still required.** Per the 2026-09-27 park addendum: the owner-approved [`plan.md`](plan.md)
(blob `f7a579d`, rulings Q0–Q4) **must be re-presented to the owner at the plan gate before any build.** The
2026-09-27 approval does not carry over on its own; this ruling unparks the task, it does **not** re-approve the
plan. Refresh the plan first if code, rules or evidence have moved — in particular the known conflict with owner
ruling D6 on `0317` (look-alike names to be revisited here; see Notes), which the plan predates. Resume from Step 0
(the main account's code points are still unread and likely need the owner at the keyboard).

**Unchanged:** everything else in this brief; no source changed by this edit.

## Addendum 2026-09-29, later — plan APPROVED (with the refresh); moved to Sprint 7; four owner rulings

**Appended by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given 2026-09-29 live
in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (ADR-021/037).** ⛔ Not producer
precedent. Append-only (ADR-035). Recorded verbatim; the same four rulings are copied into
[`plan.md`](plan.md) § *Refresh 2026-09-29* → *Owner rulings 2026-09-29*.

**Authority chain:** owner → `AskUserQuestion` in the `fkit lead` session (2026-09-29) → `fkit-lead` → spawned
`fkit-producer` (this edit).

| # | Question | Owner's answer (verbatim) | What it means |
|---|---|---|---|
| **R1** | Plan gate | The owner's own free text: **"Plan approved, but move it to the next Sprint (Sprint 7). We're not doing it now, not delaying the deploy of the current sprint because of that."** | The plan approved = [`plan.md`](plan.md) **including** the `fkit-coder`'s appended `## Refresh 2026-09-29` section (its 4 additions: the `applyApprovedName` entry point from `0321`; the `Util.sanitize` removal also updating the `ApprovedNameInvariants` test and the `NameChangeRepository` comment, from `0322`; a game-server approved-name swap test plus the two-server deploy-order risk, from `0322`; the read-only legacy-data count query). Task moved to Sprint 7; not worked now; Sprint 6's deploy does not wait for it. |
| **R2** | `0317` D6 — look-alike names | **"Warn the moderator (Recommended)"** — option **A** | The name-request Telegram message **and** the daily digest get a *"⚠️ looks like approved name … / mixes alphabets"* line, computed with a look-alike comparison key (NFKC + lowercase + a small Latin/Cyrillic/Greek look-alike map). The **stored name is never changed**; **no DB change**; **no automatic refusal**. This **supersedes** the approved plan's *"look-alike … residual is not reopened"* line and **answers `0317`'s D6** (*"revisit in 0308"*). |
| **R3** | Step 0 method | **"I run the snippet (Recommended)"** | The owner runs the DevTools snippet on the **MAIN** account, console switched to the game iframe, and pastes back **shapes only** (no real name). **Supersedes** Q0's *"Drive my Chrome"* for Step 0 — a browser tool reading the portal page cannot reach the game's own `getName()`. |
| **R4** | U+200B (zero-width space) between words | **"Turn it into a space (Recommended)"** | **If** Step 0 finds U+200B between words, U+200B becomes a normal space. Every other invisible character is still deleted per Q2. A **narrow amendment to Q2**, nothing wider. |

**Effect.**
- `## Sprint`: Sprint 6 → **Sprint 7** (old value struck, kept).
- `## Priority`: **15**, the append rank on [Sprint 7](../../../sprints/plan-sprint-7.md) (after its highest, 14).
  ⚠️ **The owner gave no rank on Sprint 7** — a position, not a merit rank. Sprint 6's 35 struck, kept.
- `## Status`: `🔄 In progress — driven by fkit-lead, 2026-09-29` (held a few minutes) → **`🔲 Backlog`** (old value
  struck, kept). The plan was **approved**; the build **had not started**; **no source file changed**.
- [Sprint 6](../../../sprints/done/plan-sprint-6.md) row → `➡️ Moved to Sprint 7 — priority 15`; a row appended on
  [Sprint 7](../../../sprints/plan-sprint-7.md) at rank 15. No other row renumbered (ADR-035). No task folder moved.
- The Notes' look-alike item (*"raise the conflict at the plan gate"*) is **answered** by R2.
- `0317`'s brief (in `done/`) gained a dated one-line pointer under D6.

**For whoever resumes this task.**
- The owner **approved the plan (with the refresh) on 2026-09-29.** Whether a later resumed run must re-present
  it at the plan gate (the ship-loop rule; see the 2026-09-27 park addendum) is **for the driver to decide at
  resume time** — this addendum only records the date of the approval and the rulings above.
- **Step 0 still comes first:** the owner runs the snippet on the MAIN account (R3). Nothing is built before the
  main account's code points are read.
- ⚠️ The approved plan text does not yet describe R2 (the look-alike warning) or R4 (U+200B → space) as build
  steps; they are recorded here and in `plan.md`'s rulings subsection. The builder folds them in; if that changes
  the plan's scope materially, say so at resume.

**Unchanged:** everything else in this brief; no source changed by this edit; nothing committed; nothing under
`ai-agents/wiki-vault/` touched.
