# Player Name Loses Its Space — Not Reproduced (task 0308)

**Source**: `ai-agents/tasks/cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md` (evidence read from the same folder's `worklog.md`)
**Status**: cancelled (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 15 (append rank; moved from Sprint 6 on 2026-09-29) / task `0308`

> ⛔ **Cancelled 2026-10-01 — not reproduced** (owner ruling *"Cancel it, file hyphen task (Recommended)"*, live via
> `AskUserQuestion`, relayed by `fkit-lead`). Its two remaining real findings live on as **`0364`** (hyphens and
> apostrophes) and **`0365`** (invisible-character names + a look-alike warning), both on the Backlog board.

## Goal

The owner reported (2026-09-26) that their account name seemed to have lost its space after getting citizenship
(*"First Last"* shown as *"FirstLast"*), guessing that names *"don't support certain symbols"*. The task was: **Step 0**
read the real code points of the Yandex `getName()` value; **Step 1** fix the cause if it is ours; **Steps 2–3** put
the character rule to the owner as a decision and build it on one shared cleaner.

Early leads (a lead, not a diagnosis): citizenship probably did not cause it — the card already showed the name
without a space before citizenship was earned; with no `display_name`, the card shows the Yandex name as-is; no
line of our code removes a plain space.

History: filed on Sprint 6; owner-ranked 6 (order *A*); **parked** 2026-09-27 at the bottom of Sprint 6; unparked
2026-09-29; plan **approved** the same day (ruling R1) and moved to Sprint 7; set `🔄 In progress` 2026-09-30 waiting
on the owner's Step 0 snippet. **The build never started and no source changed.**

## Key Changes

Nothing was built. **Step 0, 2026-10-01:** the browser-extension route was blocked (the tool could not reach the
owner's tab, nor the cross-origin game iframe), so the owner ran the plan's DevTools snippet in the game iframe on the
**main account** (ruling R3). Shapes only, never the real name:

- **Yandex `getName()` returns a plain `U+0020` space between the two words** — no invisible separator.
- The account's **approved** name (a different, three-word string) shows **with its spaces** on the citizenship card
  and above the territory in a match (owner screenshots).
- The in-match cleaner `sanitize()` keeps whitespace, so a plain space survives it.
- **So the "lost space" is not reproduced on this account.** Most likely the original report came from a **different
  account whose Yandex name has no space — a guess, not checked** (the owner declined).
- ⚠️ Not done in full: Step 0's per-screen table — the name input and the Yandex profile page were not checked.

## Outcome

- **Split out as `0364`** — *names lose hyphens and apostrophes in matches* (e.g. a hyphenated nation name shows run
  together). The plan had found a **second, separate cleaner**: `sanitize()` in `src/core/Util.ts`, run by
  `GameRunner.ts` on human players' own names, on others' names via `fixProfaneUsername`, **and on AI players'
  names**, before `PlayerImpl`'s `sanitizeUsername`. Its allow-list is letters, digits, whitespace, emoji, `[`, `]`,
  `_` — it **deletes** `-` and `'`. So widening only `usernameRules.ts` would never fix a hyphen in a match. `0308`'s
  plan is prior analysis for `0364`; **its approval does not carry over.**
- **Split out as `0365`** — the two safety parts (owner *"New task for the 2 safety parts (Recommended)"*): (a) refuse
  names made only of invisible characters, at join and on a name-change request ([[tasks/player-name-path-security-review]]
  rows 9 / 15); (b) **warn-only** look-alike lines in the Name Changes Telegram message and digest. Part (b) carries
  owner ruling **R2** of 2026-09-29, *"Warn the moderator (Recommended)"* — the **only** `0308` ruling that carries
  over — which answered [[tasks/approved-name-in-matches-investigation]]'s D6. It never refuses or changes a name.
- **Dropped by the owner:** odd-space normalization, replace-instead-of-delete, and cleaning the card's name. Ruling R4
  (`U+200B` → space) applied only *if* Step 0 found a `U+200B` between words; it found none.
- [[decisions/adr-115-approved-name-in-matches]] was amended 2026-10-01: its residual 2 (*"revisited in `0308`"*) now
  points at `0365`; the residual itself is unchanged.

## Related

- [[tasks/player-name-path-security-review]] — task `0307`, whose hand-offs (the character rule) came here, then to `0364` / `0365`
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, ruling D6 *"revisit in 0308"*, answered here by R2
- [[decisions/adr-115-approved-name-in-matches]] — residual 2 (look-alikes), repointed to `0365`
- [[tasks/citizenship-name-change]] — the name-change feature whose card and requests this touched
- [[decisions/sprint-6]] — where it was filed, ranked and parked
- [[decisions/sprint-7]] — where it was cancelled
- [[decisions/sprint-backlog]] — where `0364` and `0365` sit
