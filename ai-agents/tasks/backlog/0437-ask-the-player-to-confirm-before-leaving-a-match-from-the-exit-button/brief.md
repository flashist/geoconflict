# Ask the player to confirm before leaving a match from the in-match exit button

## ID
0437

> ℹ️ **ID allocation, checked 2026-10-11 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0436` (folder names and `## ID` fields agree). `0437`: no task folder, no
> `## ID` hit, no reference in `ai-agents/tasks`, `ai-agents/sprints` or `ai-agents/knowledge-base`, and no
> `tasks/*/0437` path on any local or remote branch.

## Sprint
Backlog

> 📌 **OWNER REQUEST, 2026-10-11, typed by the owner in the `fkit lead` session**, relayed verbatim by `fkit-lead` to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"Brief a task and
> add it to Backlog: confirmation popup when players click on the "exit" button during match - right now the user
> leaves the match immediately. This was done on purpose as the 1st version of the game (because Yandex.Games didn't
> allow generic confirm popups from the browser, but right now we have a couple of designed popups and buttons and we
> can reuse their design for this confirmation popup too)."* ⇒ filed on the Backlog board.

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**What happens today.** A player who taps the exit button in the in-match sidebar leaves the match at once — no
question asked. One mis-tap ends their match.

**Why it is like that.** Upstream OpenFront asks with the browser's own `confirm()` box. Yandex Games does not allow
native browser popups, so the first version of Geoconflict switched the question off. The game now has its own
designed popups and buttons, so a confirmation can come back in the game's own look.

**Code facts (verified by the producer 2026-10-11 by reading the code; line numbers drift — find by name).**
- `src/client/graphics/layers/GameRightSidebar.ts`, `onExitButtonClick()`: a `// Flashist Adaptation` comment
  disables upstream's `confirm(translateText("help_modal.exit_confirmation"))`. Upstream asked **only while the player
  is alive** (`this.game.myPlayer()?.isAlive()`); that check is still in the code, with an empty body. Today the method
  goes straight to: interstitial ad (`FlashistFacade.instance.showInterstitial()`) → `clearReconnectSession()` →
  `FlashistFacade.instance.changeHref(rootPathname)`.
- **A second exit path exists:** `src/client/graphics/layers/SettingsModal.ts`, `onExitButtonClick()` (button text key
  `user_setting.exit_game_label`, "Exit Game" / "Выйти из игры"). It **only** calls `changeHref(...)` — it skips both
  the interstitial ad and `clearReconnectSession()`. The two paths already behave differently. Whether this task
  touches the second path is an open question below (Q1) — **not decided here**.
- Existing text: `help_modal.exit_confirmation` — en *"Are you sure you want to exit the game?"*, ru *"Вы уверены, что
  хотите выйти из игры?"*. Currently unused by any live code (only the commented-out line refers to it).
- The settings window pauses a single-player match while it is open (`wasPausedWhenOpened`), so the second path runs
  from an already-paused game. The sidebar path does not pause.

**Designed popups to reuse (candidates — the coder picks the closest after looking).** All are LitElement modals:
`src/client/ReconnectModal.ts` (already a two-choice "Reconnect / Leave" popup — likely the nearest shape),
`src/client/CitizenshipRestartModal.ts`, `src/client/CitizenshipExplainerModal.ts` (recent, designed),
`src/client/GameStartingModal.ts` (the project's canonical modal pattern), and the shared
`src/client/components/baseComponents/Modal.ts` / `Button.ts`. ⚠️ A new custom element placed in the page must be
added to **both** `src/client/index.html` and `src/client/yandex-games_iframe.html` (the second is the one actually
served).

**Rules that bear on this.**
- **No native `window.confirm` / `alert`** — that is why the question was removed in the first place.
- **No native browser tooltips** (no `title` attributes) — the rule from
  [`0415`](../../done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md).
- All new text through `translateText`, in **both** `en.json` and `ru.json`.
- Analytics names follow `ai-agents/knowledge-base/analytics-event-reference.md`, enum in `flashistConstants`; update
  the reference if any event is added.

## What to build

Defaults below are the producer's recommendations; each one marked **(Q)** is an open question for the owner and may
change before work starts.

1. **A confirmation popup for the in-match sidebar exit button**, in the look of the existing designed popups (no native
   browser box). It shows the question and two buttons: **Leave** (exits) and **Stay** (closes the popup, the match goes
   on as before).
2. **When it asks (Q2).** Default: **only while the player is alive** — the upstream rule. A dead player or a
   spectator leaves at once, as today. Same rule in single player and multiplayer.
3. **The exit itself is unchanged after "Leave".** The interstitial ad, `clearReconnectSession()` and the return to the
   start screen run **only after** the player confirms — **never** on "Stay", and never while the popup is open.
4. **Text (Q3).** Default: reuse `help_modal.exit_confirmation` for the question; add button labels (or reuse existing
   leave/cancel keys if suitable ones exist) in both `en.json` and `ru.json`.
5. **Pause (Q4).** Default: **no change** — opening the popup does not pause or unpause the game.
6. **Keyboard and phones.** Escape = Stay. Tapping outside the popup = Stay (or nothing — coder's call, recorded in
   the worklog; never Leave). The popup fits a phone screen in the Yandex Games iframe with both buttons visible without
   scrolling. Repeated taps on the exit button do not stack popups; a double tap on "Leave" does not run the exit twice.
7. **Analytics (Q5).** Default: **none** unless the owner asks. If the owner wants them: shown / confirmed / cancelled
   events in `Category:Action` form, added to the reference doc.
8. **The settings-window exit (Q1)** — do only what the owner rules. Until ruled, leave `SettingsModal.ts` unchanged.
9. Out of scope: the reconnect popup's own "Leave" button; anything that happens after the player is back on the start
   screen.

## Verification steps

1. **Unit test against the real exit flow** (not a mock of the popup logic): with the player alive, tapping exit shows
   the popup and does **not** call the interstitial, `clearReconnectSession()` or `changeHref`.
2. Same file: "Stay" (and Escape) closes the popup and none of those three is called; the match goes on.
3. Same file: "Leave" calls the interstitial, then `clearReconnectSession()`, then `changeHref` — in that order, once
   only, even on a double tap.
4. Same file: with the player dead (or no player — spectator), tapping exit leaves at once with no popup (per Q2's
   default; adjust if the owner rules otherwise).
5. **By hand, in the dev build, both templates:** start a single-player match; tap exit → popup in the game's style,
   Stay works, Leave works and the ad shows only after Leave. Repeat on a narrow phone-sized window: both buttons
   visible, no scrolling, no hover tooltips.
6. `en.json` and `ru.json` both carry every new key (no key shown raw on screen in either language).
7. `npm test` (through the npm script) and `npm run lint` are green. Judge any `supertest` failure by the known-flake
   rule in `CLAUDE.md` and say you re-ran.
8. **Live check on a real phone inside Yandex Games is NOT part of this task** — per the owner's build/verify split
   rule, file it as a separate verify task at the top of the sprint after this one ships.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- **Open questions for the owner** (answer before work starts; the defaults above apply if the owner says "use the
  defaults"):
  - **Q1 — The settings-window exit.** The settings window has its own "Exit Game" button. Today it leaves with no ad
    and without clearing the reconnect session — unlike the sidebar button. Options: (a) leave it alone in this task;
    (b) give it the same confirmation; (c) give it the same confirmation **and** make it behave exactly like the
    sidebar exit (ad + clear the reconnect session). Producer leans (c) — two exit buttons that do different things is
    likely an accident — but it changes ad frequency and reconnect behaviour, so it is the owner's call. ⚠️ Not
    checked: whether the settings path's skipped ad / skipped clear was deliberate.
  - **Q2 — When to ask.** Only while the player is alive (recommended, upstream rule), or always? Same in single player
    and multiplayer?
  - **Q3 — Wording.** Reuse "Are you sure you want to exit the game?" / "Вы уверены, что хотите выйти из игры?", or new
    wording (for example, a line saying the match will be lost)? Button labels?
  - **Q4 — Pause in single player.** Keep the game running while the popup is open (recommended), or pause it?
  - **Q5 — Analytics.** Add shown / confirmed / cancelled events, or none (recommended: owner decides; default none)?
- Type: small client-only feature (`complex-feature` routing → Claude coder). Ships in a normal weekend deploy slot.
- Filed 2026-10-11 by a spawned `fkit-producer` on the owner request above. ⛔ Not producer precedent.
