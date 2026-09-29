# Name-Change Approved Message: No "Now Active" Promise (task 0316)

**Source**: `ai-agents/tasks/done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 15 / task `0316`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. Copy-only change; the by-eye check of
> an existing inbox message was **not** done.

## Goal

The approve inbox message said *«Ваше новое имя «{name}» теперь активно.»* / *"Your new display name
'{name}' is now active."* — but by owner ruling `0067`(b) the approved name showed **only on the
citizenship card**, not in matches. Observed live 2026-09-26. With paying citizens live, *"now active"* read
as *"you will play under this name"*, which was not true.

## Key Changes

- **Owner ruling Q1 (verbatim):** **"C: short"** — *"Never goes stale, but doesn't say where the name
  shows."* (Not the recommended option A.) Body now:
  - en `Your new display name '{name}' has been approved.`
  - ru `Ваше новое имя «{name}» одобрено.`
  Title unchanged. Key `inbox.templates.name_change_approved.body` in `resources/lang/en.json` and `ru.json`.
- **Retroactive by design:** the message is a **template** rendered from the lang file at view time, so every
  approval already sent shows the new text — no DB edit ([[tasks/personal-inbox]]).
- `tests/client/NameChangeLang.test.ts` pins the text, checks the old phrases are gone, and renders it with
  the client's own `IntlMessageFormat` call.

## Outcome

- **Later ruling, 2026-09-28 (verbatim):** **"Keep the short text"** — *"No reword. The current text is true
  and never goes stale."* Supersedes the earlier Q2 ruling *"Once, when 0322 ships"*. **No reword task is
  filed**, even though `0322` now shows the approved name in matches.
- **Evidence:** `npm test` 163 suites / 2761 tests after one `socket hang up` in `SessionRoutes.test.ts`
  (a supertest-family shape that has never been traced) — re-ran, said so.
- **Not verified:** an existing `name_change_approved` inbox message seen in a running client. The render
  test proves what `translateText` would output, not what the inbox panel shows.

## Related

- [[tasks/citizenship-name-change]] — task `0067`, ruling (b): card only
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, the real fix (approved name in matches)
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, which shipped it; no reword followed, by ruling
- [[tasks/remove-game-name-from-player-texts]] — task `0311`, same lang files, shipped alongside
- [[tasks/personal-inbox]] — task `0012`, template messages render at view time
- [[systems/localization]] — the en/ru pair rule
- [[decisions/sprint-6]] — the board carrying this task
