# No Native Browser Tooltips Anywhere in the UI (task 0415)

**Source**: `ai-agents/tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md` (`worklog.md`, `plan.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 20 (ADR-035 append rank; pulled in from the Backlog board 2026-10-09) / task `0415`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09. Code committed in `bcc9bf0` (2026-10-10);
> `git tag --contains bcc9bf0` → **no tag**, so **committed, NOT deployed** (checked 2026-10-10). Live check: `0429`
> (owner-run, a real hover inside the Yandex Games iframe), which also carries `0423`'s scrollbar check.

## Goal

Make Rule 1 of [[systems/yandex-games-platform-rules]] true app-wide: **no generic browser hover hints**. The owner saw
them live on `0.0.157` (host window "Приватное лобби", "Join Lobby") and again on `0.0.161` (the join window's
"Присоединиться к лобби" button, the single-player "Начать игру" button) while running `0420`. Visible text must stay
exactly as it is.

## Key Changes

- **Cause:** the shared components `o-button` and `o-modal` had a Lit property named `title` — the same name as the HTML
  attribute browsers show as a tooltip — so every `<o-button title=…>` / `<o-modal title=…>` drew one.
- **Fix (§1):** `o-button`'s `title` → **`label`**, `o-modal`'s `title` → **`heading`**, both marked
  `// Flashist Adaptation: task 0415`; every caller in both HTML templates and the Lit templates updated (including the
  mission button set from `Main.ts`, where a leftover `.title =` would still compile — caught by a mutation check).
- **§2 — every other native tooltip removed** across the client, in-game layers included (the brief's rough grep
  counted ~39 other `title=` uses in ~23 files; the worklog's inventory tables are the real list). Owner ruling Q1
  *"Hidden name on 3"*: of the 12 icon-only controls, only three get an `aria-label` with the same existing text (pattern
  preview button, flag button, remove-player "×"); the rest rely on their existing `alt` / `aria-label` or have none.
  `AccountModal`'s now-unused `buttonTitle` code deleted. No lang-file edits.
- Final grep of `src/client/`: only 5 `title=` hits, all inside HTML comments. A new DOM-parsing template guard
  (`tests/client/NoNativeTooltips.test.ts`) fails `npm test` if one is un-commented with `title` still on it; new
  `Modal.test.ts`, extended `Button.test.ts`.

## Outcome

- Local live check (owner ruling Q2 *"Count check is fine"*): zero `[title]` elements across the document and every
  shadow root, on **both** templates, RU and EN, for the start screen and 11 windows; in-game panels checked too.
  Matchmaking not in the page locally.
- Full `npm test` 218/218 suites, 4414 passed, 1 skipped (the Docker harness — skipped, not passed).
- ⚠️ **Not proven live:** a native tooltip cannot be screenshotted (the browser draws it outside the page; headless
  Chromium draws none), so only a real hover inside the Yandex Games iframe proves it — that is `0429`.
- Shares `Modal.ts` with `0423` ([[tasks/dark-modal-scrollbar]]), which was built on top of this change.

## Related

- [[systems/yandex-games-platform-rules]] — Rule 1, which this makes true app-wide
- [[tasks/start-screen-private-tab]] — task `0412`, which had already removed the two start-screen private-lobby tooltips
- [[tasks/dark-modal-scrollbar]] — task `0423`, same `Modal.ts`
- [[decisions/sprint-8]] — the board (rank 20); live check `0429` at 31
- [[decisions/sprint-backlog]] — where it was filed on 2026-10-08
