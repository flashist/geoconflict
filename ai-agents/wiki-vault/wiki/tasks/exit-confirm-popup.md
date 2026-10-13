# Ask the Player to Confirm Before Leaving a Match From the Exit Button (task 0437)

**Source**: `ai-agents/tasks/done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md` (`plan.md`, `worklog.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 35 (ADR-035 append rank; moved in from the Backlog board 2026-10-11) / task `0437`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-11 on the owner ruling *"Close both (Recommended)"*.
> Code committed in `5449571` ("Sprint push"); `git tag --contains 5449571` → **no tag**, so **committed, NOT
> deployed** (checked 2026-10-12). Live check: `0439` (Backlog board; belongs at the top of the next sprint).

## Goal

Tapping the in-match exit button used to leave the match at once — one mis-tap ended it. Upstream OpenFront asks with
the browser's `confirm()` box, which Yandex Games does not allow, so the first Geoconflict version switched the
question off (a `// Flashist Adaptation` in `GameRightSidebar.onExitButtonClick()`). The owner asked (2026-10-11) for a
confirmation in the game's own designed popup look. The settings window's own "Exit Game" button was a second exit path
that **skipped** the interstitial ad and the reconnect-session clear — the two paths already behaved differently.

**Owner rulings, 2026-10-11:**
- **Q1** *"Popup + same as top Exit (Recommended)"* — the settings-window exit gets the same popup, and after Leave
  does exactly what the sidebar exit does (ad → clear reconnect info → start screen). ⚠️ This adds an interstitial ad to
  an exit that showed none before — owner-accepted.
- **Q2** *"Always"* — ask on every exit tap, alive, dead or watching. ⚠️ **Not** the recommended default (upstream asked
  only while alive).
- **Q3** — the question reuses the existing `help_modal.exit_confirmation` text; buttons "Выйти" / "Остаться"
  (en "Leave" / "Stay").
- **Q4 + Q5** *"No pause, no counting (Recommended)"* — no pause change, no analytics events.
- Plan: *"Stay blue, Leave grey (Recommended)"* — Stay is the blue primary on the right.

## Key Changes

- New `src/client/ExitConfirmModal.ts` (`<exit-confirm-modal>`, styled like the citizenship restart popup) and
  `src/client/MatchExit.ts` — one shared `leaveMatch()` (ad → `clearReconnectSession()` → back to the start screen) and
  `askToLeaveMatch()`, so the two exit paths cannot drift apart again.
- `GameRightSidebar.onExitButtonClick()` and `SettingsModal.onExitButtonClick()` both call `askToLeaveMatch()`.
- The element added to **both** HTML templates; imported in `Main.ts`; added to the language-switch re-render list.
- New keys `exit_confirm_modal.leave` / `.stay` in `en.json` and `ru.json`.
- **Coder's calls, kept by the owner:** a tap outside the popup = Stay (never Leave); if the popup element is missing,
  log an error and leave at once (today's behaviour), never a dead button. Escape is caught only while the popup is
  visible, so the settings window's own Escape does not also close settings underneath.
- New `tests/client/ExitConfirm.test.ts` against the real exit flow (two mutation checks: the Escape guard and the
  Leave-once guard each fail a test when removed).

## Outcome

- Full `npm test`: 223 suites, 4549 passed, exit 0; lint and `tsc` clean.
- **By-hand check** (owner ruling *"Yes, check it locally"*): dev build, headless Chromium, single-player match, both
  templates, desktop English and phone-size Russian — all 10 steps passed in all 4 runs (popup, Stay / Escape / outside
  tap close it, the popup over Settings, Escape closes only the popup, Leave returns to the start screen; no `title`
  attributes).
- ⚠️ **Not tested:** the real Yandex interstitial ad (no Yandex SDK locally, so the ad step returns at once); a real
  phone inside Yandex Games — that is `0439`.
- **Accepted residual (review R1, owner ruling *"Accept the risk"*):** the once-only guard that stops a double Leave
  is never reset. If the Yandex SDK never calls back from the interstitial, **both exit buttons do nothing for the rest
  of the session** (before this change a second sidebar tap retried the ad). Revisit only if a player is seen stuck
  after pressing Выйти.
- Ships in a normal deploy slot ([[systems/weekend-deploy-window]]); `0440` lists `0439` among the checks waiting on
  Yandex Games recovering.

## Related

- [[systems/yandex-games-platform-rules]] — why the native `confirm()` was removed
- [[tasks/no-native-tooltips]] — task `0415`, the no-`title` rule the popup follows
- [[systems/localization]] — the en/ru sync rule for the new keys
- [[decisions/sprint-8]] — the board (rank 35)
- [[decisions/sprint-backlog]] — where it was filed, and `0439`
- [[tasks/yandex-outage-recovery-checklist]] — task `0440`: listed `0439` as item 4; re-planned 2026-10-13 so `0439` stands alone
