# Dark Thin Scrollbar in Every Game Window (task 0423)

**Source**: `ai-agents/tasks/done/0423-dark-thin-scrollbar-in-every-game-window/brief.md` (`worklog.md`, `plan.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 21 (ADR-035 append rank) / task `0423`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09. Code committed in `bcc9bf0` (2026-10-10);
> `git tag --contains bcc9bf0` → **no tag**, so **committed, NOT deployed** (checked 2026-10-10). Live check folded into
> `0429` (owner ruling *"Add a line to 0429 (Recommended)"*).

## Goal

The owner's screenshot of the "Одиночная игра" window on `0.0.161` showed the browser's light default scrollbar instead
of the game's dark thin one. Cause: the dark scrollbar lives in `src/client/styles.css`, which does not reach inside the
shadow-DOM `o-modal`. Visual polish only — no platform rule.

## Key Changes

- New `src/client/components/baseComponents/DarkScrollbarStyles.ts` — one shared Lit `css` piece with the exact
  `styles.css` values (8 px, dark translucent track, light translucent thumb). **No `scrollbar-color` /
  `scrollbar-width`** — in Chromium they switch the `::-webkit-scrollbar` rules off (the trap `0417` recorded).
- Added to the four shadow-DOM components that declare a scrolling area: `Modal.ts` (content area and the backdrop,
  which scrolls only on very short screens), `NewsModal.ts` (defensive), `BuildMenu.ts` (in-game) and
  `CitizenshipExplainerModal.ts` — where it **replaces** `0417`'s copied rules ([[tasks/explainer-popup-wider]]), same
  values, look unchanged.
- New `tests/client/components/DarkScrollbar.test.ts` (13 tests), including a source scan that fails if a shadow
  component declares a scroll area without the shared piece.
- Light-DOM windows were already dark and were left alone. Chromium-based browsers only; Firefox keeps its default.

## Outcome

- Browser check (Playwright, RU): every `o-modal` scroll area and the build menu read 8 px after; the citizenship popup
  unchanged.
- ⚠️ **Found, not fixed:** `FeedbackModal`'s `<textarea>` still uses the light scrollbar (a textarea scrolls by browser
  default, so neither the inventory nor the scan test sees it). It is one of the seven small popups the owner kept in
  `0419` (Backlog) — a two-line change there.
- Built on top of `0415`'s uncommitted `Modal.ts` change ([[tasks/no-native-tooltips]]); neither reverted the other.

## Related

- [[tasks/explainer-popup-wider]] — task `0417`, the reference look whose copied rules this replaced
- [[tasks/no-native-tooltips]] — task `0415`, same `Modal.ts`
- [[decisions/sprint-8]] — the board (rank 21)
