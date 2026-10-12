# Verify 0415 Live — No Native Browser Tooltips Inside the Yandex Games Iframe (task 0429)

**Source**: `ai-agents/tasks/done/0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 31 (ADR-035 append rank; owner ruled *"Bottom of Sprint 8"*) / task `0429`

> ✅ Done (agent-closed — not owner-verified). Owner-run on game `0.0.163` (live from 2026-10-10, ~18:43 UTC) inside the
> Yandex Games iframe: **"Pass"** — no native hover hint on buttons, and the dark thin scrollbar in game windows.
> ⚠️ One overall pass: which items were hovered and which windows were looked at were **not** listed one by one.

## Goal

The live check of `0415` ([[tasks/no-native-tooltips]]), with `0423`'s scrollbar
([[tasks/dark-modal-scrollbar]]) folded in as item 6 by owner ruling *"Add a line to 0429 (Recommended)"*
(2026-10-09). A native tooltip cannot be screenshotted — the browser draws it outside the page and headless Chromium
draws none — so only a person hovering with a real mouse proves it. Checklist: start-screen buttons, the host lobby
window, the join window and its "Присоединиться к лобби" button, the single-player window and its "Начать игру" button,
one in-game panel; plus the dark thin scrollbar in game windows (Chromium-based browsers only).

Expected, not a bug (owner-approved in `0415`): very long player names in the in-game player panel are cut with "…" and
no longer have a hover hint.

## Key Changes

None — a live check. Nothing built.

## Outcome

- **Pass**, owner-run, 2026-10-10, game `0.0.163`, inside the Yandex Games iframe — rule 1 of
  [[systems/yandex-games-platform-rules]] (no generic hover hints) now holds in the shipped game as far as this check
  saw.
- ⚠️ **Granularity:** the owner reported one overall pass; items 1–5 and the windows for item 6 were not itemized.
  Recorded as given.
- Post-deploy server check (read-only, by `fkit-lead`, 18:55 UTC): 0 error-level lines, 0 `failed after retries`,
  match credits flowing with 0 errors.

## Related

- [[tasks/no-native-tooltips]] — task `0415`, the build this checks
- [[tasks/dark-modal-scrollbar]] — task `0423`, folded in as item 6
- [[systems/yandex-games-platform-rules]] — Rule 1
- [[tasks/sprint-7-fixes-live-checklist]] — task `0420`, where the owner first saw the leftover tooltips
- [[decisions/sprint-8]] — the board (rank 31)
- [[systems/weekend-deploy-window]] — the 2026-10-10 game deploy that carried `0415` and `0423`
- [[tasks/explainer-popup-wider]] — task `0417`, whose popup uses the shared dark scrollbar checked here
