# Remove the Game Name from Player-Facing Texts (task 0311)

**Source**: `ai-agents/tasks/done/0311-remove-the-game-name-from-player-facing-texts/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 14 / task `0311`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. The by-eye check in a running client
> was **not** done.

## Goal

The owner, verbatim: *"The internal name of the project is GeoConflict, but I would like not to mention the
name of the game at all. To make texts without the actual name of the game. Is it possible?"* Triggered by
the inbox title *"Вы получили гражданство Geoconflict!"*.

## Key Changes

- 🚩 **An owner premise did not match the code — and was put back to the owner.** The owner first ruled
  *"Leave them"* for already-sent inbox messages, assuming each stores its text. **Citizenship messages are
  templates** rendered from the lang file at view time, so a lang edit changes **every one ever sent**, with no
  DB edit. Only literal (admin-sent) messages keep their original text.
- **Owner rulings (verbatim, 2026-09-28):** Q1 **"Yes, old ones update too (Recommended)"**; Q2 **"Yes,
  others fall back to English (Recommended)"** — a neutral title; `main.title` deleted from the other
  languages so they show the English *"Online strategy"*; Q3 **"Approve all as written (Recommended)"**;
  Q4 **"Wide check (Recommended)"** — all en/ru texts, titles, the install name and the news feed.
- **Texts changed** (en + ru): the citizenship inbox title, the tenure-gift body, `main.title` (page title and
  header), both HTML `<title>` tags, and `resources/manifest.json` `name` / `short_name`. `main.title`
  deleted from **29** other lang files (`pt-BR.json` and `debug.json` never had it).
- **Guard test** `tests/client/NoGameNameInPlayerText.test.ts` — red on the old files (6 failed), green after.
  It also checks `main.title` for the **upstream** name (`ar` spelled it "OpentFront") and that en/ru still
  define `main.title`, the fallback the others now rely on. The kept "Based on OpenFront" credit is not
  matched.
- **Out of scope, stays:** the canonical domain (it *is* the name, visible in the address bar on the
  standalone site), the favicon filename, operator-facing alerts, metric names, code identifiers.

## Outcome

- **Evidence:** `npm test` 163 suites / 2757 tests, first run. `npm run lint` had one error — the untracked
  `0325` helper, not this task's.
- **Not verified:** an already-sent `citizenship_earned` message and the tenure popup seen in a running client
  (needs a local profile server and a seeded message).

## Related

- [[tasks/personal-inbox]] — task `0012`, the template-message model this relies on
- [[tasks/tenure-xp-grant]] — task `0253`, whose owner-approved popup copy this changes
- [[tasks/name-change-approved-message-wording]] — task `0316`, same files, shipped together
- [[systems/localization]] — the en/ru rule and the deliberate all-languages exception for `main.title`
- [[decisions/sprint-6]] — the board carrying this task
