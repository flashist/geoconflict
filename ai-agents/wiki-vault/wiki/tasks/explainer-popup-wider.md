# Citizenship Explainer Popup: Use More Width on Larger Screens (task 0417)

**Source**: `ai-agents/tasks/done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 63 (ADR-035 append rank) / task `0417`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Weekend-slot deploy. The look inside the real Yandex iframe → `0420` ([[decisions/sprint-8]]).
> 📌 *2026-10-09 sync: **deployed since** — `a555111` is in deploy tags `0.0.158`–`0.0.161`; `0420`'s worklog records these builds as shipped in game `0.0.160` (2026-10-08 evening).* *`0420` item 5 passed live 2026-10-09 (desktop wider, dark scrollbar; phone width OK). Text since shortened by `0421` — [[tasks/explainer-popup-shorter-text]].*

## Goal

Owner, 2026-10-08, with a desktop screenshot inside Yandex Games (`0.0.157`): the explainer popup
([[tasks/citizenship-explainer-popup]]) *"still uses the same width as mobile"* — a narrow column that scrolls despite
room on both sides. Side observation: its scrollbar track rendered light against the dark popup.

## Key Changes

**Owner answers at the plan gate (2026-10-08):** Q1 **"600 px"** max width · Q2 **"File a task for the others"** — this
popup only; other small popups became `0419` (Backlog board, [[decisions/sprint-backlog]]) · Q3 **"Yes, fix it here"** —
the scrollbar.

- **Cause confirmed:** the popup is a standalone LitElement with its own styles; `.modal-box` had a fixed `width: 360px`
  (capped at `90vw`). It does not use the shared `o-modal`, so no other popup changes.
- `src/client/CitizenshipExplainerModal.ts` — `width: 360px` → `width: 600px`; `max-width: 90vw`, `max-height: 90vh`,
  `overflow-y: auto` unchanged. So a 360 px phone still gets 324 px, pixel for pixel; it grows with the screen up to 600.
- **Scrollbar:** page-level rules in `src/client/styles.css` do not reach inside the component's shadow DOM, so the popup
  showed the browser default. Four scoped `.modal-box::-webkit-scrollbar*` rules copy the app's values. Deliberately **no**
  `scrollbar-color` / `scrollbar-width` — in current Chromium those switch the `::-webkit-scrollbar` rules off.

## Outcome

- Measured (Playwright, RU and EN): 360 → 324 px (unchanged); 768, 1280, 1920 → **600 px** (was 360). At 1280×600 the box
  no longer scrolls; at 1280×500 and 360×560 it scrolls with a dark 8 px scrollbar, Close reachable. Still above the
  Instructions window (z-index unchanged). Side effect: at 360 px the thinner scrollbar gives ~7 px more content width.
- Review round 1: no findings. **Accepted residuals:** the 600 px cap (owner Q1); buttons stay full width (~552 px at the
  cap); Firefox keeps its default scrollbar; no automated width test (jsdom does no layout).
- Not done: the look inside the real Yandex iframe (it may be narrower than the window).

## Related

- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, whose live check surfaced this
- [[tasks/explainer-paid-only-subheading]] — task `0408`, same popup, built first
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, same popup, built first
- [[decisions/sprint-backlog]] — `0419`, the same change for other small popups
- [[decisions/sprint-7]] — the board (rank 63)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
