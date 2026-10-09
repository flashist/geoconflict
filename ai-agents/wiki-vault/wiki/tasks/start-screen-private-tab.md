# Start Screen: a Third Tab "Приватная" Holding the Private-Lobby Buttons, Restyled Like the Solo-Tab Buttons (task 0412)

**Source**: `ai-agents/tasks/done/0412-start-screen-private-tab-with-restyled-private-lobby-buttons/brief.md` (`plan.md`, `worklog.md`, `review.md` and `screenshots/` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 57 (ADR-035 append rank) / task `0412`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Weekend-slot deploy (the same-day exception does not cover it). Live look → `0420` ([[decisions/sprint-8]]).
> 📌 *2026-10-09 sync: **deployed since** — `a555111` is in deploy tags `0.0.158`–`0.0.161`; `0420`'s worklog records these builds as shipped in game `0.0.160` (2026-10-08 evening).* *`0420` item 6 passed live 2026-10-09 (three tabs for a tester, two for a non-tester, no tooltip on the two private-lobby buttons).*

## Goal

Owner, 2026-10-08: the private-lobby buttons *"look like some generic buttons, not like the buttons from our game"*, and
on the smallest supported phone (start-screen area 360×430, [[tasks/start-screen-redesign-investigation]]) the
Multiplayer tab has almost no room. Fix: restyle them like the Solo-tab rows and move them to a third tab. Also: the two
buttons showed a generic **native browser tooltip** (`title="Create Lobby"` / `"Join Lobby"`), which the owner says
Yandex rules forbid — [[systems/yandex-games-platform-rules]] Rule 1.

## Key Changes

**Owner rulings (2026-10-08):** one task, not two (*"keep it in the same task"*) · R1 the tab shows under the **same
rule** as the old row — citizenship surfaces on AND (tester OR `private_lobbies_all`), `isPrivateLobbyRowEnabled()`;
otherwise exactly two tabs, never an empty third · R2/R6 label **"Приватная"** / **"Private"** · R3 Create stays locked
for non-citizens (tap → citizenship explainer), Join free for everyone · R4 no "new" marker · R5 a tap event · R7 icons
and subtitles delegated to the coder. Plan gate: Q1 **"Private last"** · Q2 **"Switch unless they tapped"** (a late
rule resolve switches to a stored Private tab unless the player already tapped a tab).

- `src/client/StartScreenTabs.ts` / `StartScreenTabStorage.ts` — `"private"` is a stored tab; a stored `private` starts on
  Multiplayer and switches when `enablePrivateTab()` is called (idempotent); third tab rendered only when enabled.
- `src/client/PrivateLobbyAccess.ts` — `start()` calls `enablePrivateTab()` right after revealing the row: one rule, now
  three readers. **Review R1 (low, fixed):** the hand-off was duck-typed, so a rename would fail silently and hide
  Create/Join from every flag-on player; now typed against the real class (`import type { StartScreenTabs }`), so a
  rename is a compile error. Missing element still fails closed.
- **Both templates** (`yandex-games_iframe.html`, `index.html`) — `#private-lobby-row` moved into a new
  `#private-tab-content`; both buttons `menurow chevron block` with icon and subtitle, **no `title`**, no `secondary`.
  Ids unchanged, so `Main.ts` is unchanged.
- Icons 🏠 (Create) / 🚪 (Join). New keys in both lang files: `main.tab_private`, `main.create_lobby_subtitle`
  (*Играйте с друзьями*), `main.join_lobby_subtitle` (*Введите ID лобби от друга*).
- Analytics: `UI:Tap:PrivateTab` — same semantics as `MultiplayerTab`; restoring the tab or the late switch fires
  nothing ([[systems/analytics]]).

## Outcome

- Full `npm test`: four runs, the last green (4270/4270). Runs 1–3 each had one or two **supertest** failures in
  server/profile-server suites this client-only change does not touch (a `404`, `Exceeded timeout of 5000 ms`,
  `socket hang up`); `0197` ruled out. ⚠️ 3 red of 4 is above the measured ~4–7 % rate — recorded, not explained (load
  average ~6–8).
- **Fit at 360×430, RU:** fits, but **only ~2 px spare for "Мультиплеер"** (89.9 of 92 px). A phone whose fallback font is
  wider could wrap or clip it — not checked on a real phone. EN fits easily.
- **Tooltip:** no `title` on either button, their inner nodes or any ancestor. Headless Chromium draws no native
  tooltips, so this is proven by absence, not by eye.
- Not seen on dev: the two-tab (rule off) screen — unit tests only.
- ⚠️ `0401`'s check 4 (the locked-tap path) now needs a switch to the Private tab first.
- The app-wide tooltip fix is a separate task, `0415` (Backlog board).

## Related

- [[tasks/private-lobby-citizen-perk]] — task `0302`, the private-lobby row and the Create lock
- [[tasks/private-lobby-tester-default]] — task `0354`, the visibility rule the tab reuses
- [[tasks/citizenship-explainer-popup]] — task `0301`, the locked-tap destination
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, whose check 4 moves into the new tab
- [[tasks/start-screen-redesign-investigation]] — the 360×430 smallest area
- [[tasks/start-screen-redesign-implementation]] — the existing two-tab start screen
- [[systems/yandex-games-platform-rules]] — Rule 1, no generic tooltips
- [[systems/analytics]] — `UI:Tap:PrivateTab`
- [[tasks/join-modal-paste-hint]] — task `0413`, the Join window behind the moved button
- [[decisions/sprint-7]] — the board (rank 57)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
