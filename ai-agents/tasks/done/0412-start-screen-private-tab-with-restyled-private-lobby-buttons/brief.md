# Start screen: a third tab "Приватная" holding the private-lobby buttons, restyled like the Solo-tab buttons

## ID
0412

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0411`, so this is `0412`. `grep -rn 0412 ai-agents/tasks ai-agents/sprints`:
> no hits before this filing.

## Sprint
Sprint 7

> 📌 **OWNER RULING, 2026-10-08, typed directly by the owner in the `fkit lead` session**, relayed verbatim by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
> *"Regarding splitting it into 2 tasks: I disagree, keep it in the same task and add it to the current sprint."*
> Never filed on the Backlog board. The owner did **not** say this ships today — the weekend-slot deploy rule
> (2026-09-29) applies unless the owner says otherwise.

## Priority
57

⚠️ **Priority 57 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 7](../../../sprints/plan-sprint-7.md)'s highest (56, `0409`); the owner named the sprint, not a rank.
**On merit this belongs directly below `0409`** anyway, because it blocks nothing, nothing in Sprint 7 waits on it, and
`0407`–`0409` carry the owner's same-day deploy intent while this task does not.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### Why this exists — the owner's words

Owner, 2026-10-08, typed live in the `fkit lead` session (with two screenshots: the start screen on desktop with the
private-lobby row visible, and on the smallest supported phone). Relayed verbatim by `fkit-lead`. Verbatim:

> *"I want to redesign the start page, and we probably need to brief few tasks for that: 1. The private lobby buttons
> don't follow the design of the rest of the page (they look like some generic buttons, not like the buttons from our
> game). The simplest way to change it (for now), would be to deisn them similarly to the buttons from the "SOLO" tab.
> - one of the problems is that on the smallest screen that we're supporting there is almost no free space for us. I
> am thinking about adding a 3rd tab next to "Multiplayer, Solor" named "Private", and move the Private-lobbies
> related buttons there, what do you think about it?"*

Two problems, one task:
1. **Look.** "Создать лобби" / "Присоединиться к лобби" are generic `secondary` buttons, not the game's own button
   style.
2. **Space.** On the smallest supported phone the Multiplayer tab has almost no free room. The smallest supported
   usable start-screen area is **360×430** (start-screen redesign investigation, wiki
   `wiki/tasks/start-screen-redesign-investigation.md`).

### Owner rulings — decided, not open (2026-10-08, typed live in the `fkit lead` session)

`fkit-lead` proposed a two-task split and five design points. Owner answers, **verbatim**:
*"1. Agree. 2. Приватная. 3. Agree. 4. Just a new tab, it's gonna be visible for those who are interested in that.
5. Yep, and also if we don't have the event for clicking the current tabs we should add it (it can be the same Design
Event, but with different paramters)."*

And on the split, **verbatim**: *"Regarding splitting it into 2 tasks: I disagree, keep it in the same task and add it
to the current sprint."* ⇒ **One task.** The restyle and the new tab ship together. ⛔ Do not re-split without a new
owner ruling.

| # | Point | Ruling |
|---|---|---|
| R1 | When the tab shows | **Same rule as today's private-lobby row:** citizenship surfaces on AND (tester marker OR `private_lobbies_all` flag) — `isPrivateLobbyRowEnabled()` in `src/client/PrivateLobbyAccess.ts` (tasks `0302`/`0354`). When off: **only two tabs, as today — never an empty third tab.** *"Agree."* |
| R2 | Tab name (RU) | **"Приватная"** — owner-given, exact. *"Приватная."* |
| R3 | Inside the tab | **"Создать лобби" stays locked for non-citizens** and a tap opens the citizenship explainer (`0302`/`0301` behaviour, unchanged); **"Присоединиться к лобби" stays free for everyone.** *"Agree."* |
| R4 | New-tab marker | **None.** No ★, no "new" badge — a plain tab. *"Just a new tab, it's gonna be visible for those who are interested in that."* |
| R5 | Analytics | A tap event for the new tab, and tab-tap events wherever missing. *"Yep, and also if we don't have the event for clicking the current tabs we should add it (it can be the same Design Event, but with different paramters)."* |
| R6 | Tab name (EN) | **"Private"** — owner-approved, exact. |
| R7 | Row icons + subtitle texts (RU + EN) | **Delegated by the owner to the producer/coder at build time** — not an owner gate at the plan step. |

R6/R7 — owner, 2026-10-08, typed live in the `fkit lead` session, relayed verbatim by `fkit-lead`: *"English name -
approved. Regarding icons and short descriptions - let the producer/coder decide it when the task is taken into work."*
R7 does not relax the localization rule: new subtitle keys via `translateText()`, in both `en.json` and `ru.json`.

**R5, checked in code by `fkit-lead` (2026-10-08):** the two existing tabs **already** log taps —
`UI:Tap:MultiplayerTab` / `UI:Tap:SingleplayerTab` via `logUiTapEvent` (`flashistConstants.uiElementIds.multiplayerTab` /
`singleplayerTab`, `src/client/flashist/FlashistFacade.ts`; documented in
`ai-agents/knowledge-base/analytics-event-reference.md`). So R5 reduces to **adding `UI:Tap:PrivateTab`** in the same
pattern — the "same event, different parameter" the owner described. Nothing else is missing.

### Facts checked in code (2026-10-08)

- **Tabs:** `src/client/StartScreenTabs.ts` — `renderTabButton("multiplayer" | "singleplayer", …)`, a
  `TAB_CONTENT_IDS` map to `#multiplayer-tab-content` / `#singleplayer-tab-content`; the active tab persists through
  `src/client/StartScreenTabStorage.ts` (`StartScreenTab` type, `getActiveTab()` accepts only the two known values and
  falls back to `multiplayer`). Restoring the persisted tab on load fires no analytics.
- **Private-lobby row today:** `#private-lobby-row` inside `#multiplayer-tab-content`, in **both** templates —
  `src/client/yandex-games_iframe.html` (the one served in production) and `src/client/index.html`. It holds
  `<o-button id="host-lobby-button" … secondary>` and `<o-button id="join-private-lobby-button" … secondary>`, side by
  side (`container__row--equal`), hidden by default; `PrivateLobbyAccess.start()` reveals it.
- **Target look:** the Solo tab's two buttons — `<o-button … icon=… subtitleTranslationKey=… chevron menurow block>`
  (icon, title + subtitle, chevron, full-width, stacked).
- **Locked look already composes with `menurow`:** the shared button component (`o-button`) draws a 🔒 and **replaces the
  subtitle** with `locked_feature.citizens_only` while `locked` is set. So in the new style, a locked Create shows its
  icon + 🔒 + "citizens only" in place of its own subtitle, and its own subtitle appears once unlocked. The coder must
  confirm this still reads clearly as locked at 360 px (R3).
- **Create lock:** `PrivateLobbyAccess.isCreateLocked()`; the dev build is always unlocked (owner ruling 2026-09-27).
- Existing keys: `main.create_lobby`, `main.join_lobby`, `main.tab_multiplayer` ("Мультиплеер" / "Multiplayer"),
  `main.tab_singleplayer` ("Одиночная" / "Singleplayer").

### Dependencies and conflicts

- No conflict with a locked decision found. R1/R3 keep `0302`/`0354`/`0301` behaviour exactly; only *where* the
  buttons live and *how they look* change.
- ⚠️ **`0401` (live check of `0301`) — its check 4, the locked-tap path, moves into the new tab.** After this task ships,
  the locked "Создать лобби" lives under "Приватная", not under Multiplayer. If `0401` is run after this deploy, its
  check 4 steps need the tab switch added. This task does **not** edit `0401`; flagged for whoever runs it.
- `0407`–`0411` touch the same start screen (citizenship card, explainer popup) — no file or behaviour overlap
  expected; nothing waits on anything.

## What to build

One change, client-only, both HTML templates.

### 1. Restyle the two private-lobby buttons in the Solo-tab `menurow` style
- "Создать лобби" and "Присоединиться к лобби" become `menurow` rows like the Solo tab: icon, title + subtitle, chevron,
  full width.
- Create's locked state (R3) must still read as locked in the new style (see the locked-look fact above).
- Any new subtitle text goes through `translateText()`, with keys added to **both** `resources/lang/en.json` and
  `resources/lang/ru.json`.

### 2. Add a third tab "Приватная" and move the buttons into it
- A new tab and its own content container, holding the restyled buttons; they leave the Multiplayer tab.
- **Visibility (R1):** the tab exists only when `isPrivateLobbyRowEnabled()` is true — the same single rule the row
  and the explainer's private-lobby line read today (one rule, now three readers; never a second copy of the rule).
  Off ⇒ two tabs exactly as today.
- **Persisted tab fallback:** a stored "private" tab that is not allowed this session (rule false, or the check fails —
  fail closed as today) must show **Multiplayer**, never an empty screen or no tab selected.
- **Timing edge case for the plan:** the rule resolves only after platform init, so the third tab appears a moment after
  the first two. The plan must say how a returning player whose stored tab is "private" is handled during that wait
  (e.g. show Multiplayer, then switch when the rule resolves — or not), and avoid a visible jump of the tab strip if
  possible.
- **Analytics (R5):** register `PrivateTab` in `flashistConstants.uiElementIds` and log `UI:Tap:PrivateTab` through
  `logUiTapEvent` on every tap, including re-taps — same semantics as `MultiplayerTab`; restoring the stored tab on load
  does not fire. Enum key only, never an inline string. Add the row to
  `ai-agents/knowledge-base/analytics-event-reference.md`.
- **Fit (smallest phone):** three RU labels **"Мультиплеер | Одиночная | Приватная"** must fit the 360 px-wide tab strip
  without clipping, ellipsis or wrapping to a second line. **If they do not fit, stop and flag it to the owner** with a
  screenshot — do not shrink the font or abbreviate a label on your own.
- New tab label keys in both `en.json` and `ru.json`.
- The Create/Join click handlers in `src/client/Main.ts` keep working unchanged (same element ids, or updated
  consistently).

### 3. No browser tooltip on the two private-lobby buttons (owner request, 2026-10-08)

Owner, verbatim (typed live in the `fkit lead` session, with a screenshot of a browser tooltip "Join Lobby" on hover
over "Присоединиться к лобби"; relayed by `fkit-lead`): *"the private lobby buttons have generic "hints", which is
forbidden by Yandex.Games rules, I guess the generic hints will be removed when we redesign the buttons, but it's still
worth mentioning it in the related task, to be sure we don't forget about it."*

- **Requirement:** after the restyle, "Создать лобби" and "Присоединиться к лобби" show **no browser (native)
  tooltip** on hover. Drop their `title` attributes, or otherwise make sure no native tooltip appears.
- **Why it happens (checked in code by `fkit-lead`, confirmed by the producer):** both templates
  (`src/client/yandex-games_iframe.html` and `src/client/index.html`) give the two buttons `title="Create Lobby"` /
  `title="Join Lobby"` — English and generic. `o-button` (`src/client/components/baseComponents/Button.ts`) has a Lit
  property named `title`, which is also the standard HTML attribute that browsers show as a tooltip — so any `title`
  set on the element shows one. Do not assume the restyle removes it by itself: the Solo-tab rows avoid it only because
  they set `title=""` or none.

### Decided at build time by the coder (R7 — owner-delegated, not a plan-gate question)

- **Icons** for the two rows (emoji, like 🗺️ / 🎯 on Solo) and **subtitle texts, RU + EN** (new keys, both lang files).
  Record the choices in the worklog.
- **Layout:** stacked full-width rows, as on the Solo tab — this follows the owner's own request ("design them
  similarly to the buttons from the SOLO tab"). If the coder finds a reason to deviate, raise it at the plan gate.

### Open point — the coder recommends at the plan gate, the owner confirms (not decided here)

| Point | Recommendation (`fkit-lead` / producer) |
|---|---|
| Tab order | Multiplayer \| Solo \| Private |

## Verification steps

1. **Unit tests** (`StartScreenTabs` / `StartScreenTabStorage` / `PrivateLobbyAccess`):
   - rule true → three tabs, "Приватная" last (or per the approved order); rule false or rejecting → exactly two tabs,
     no third tab element;
   - stored tab "private" + rule false → Multiplayer shown and selected; stored "private" + rule true → Private shown;
   - tapping the Private tab logs `UI:Tap:PrivateTab` (re-tap too); restoring it on load logs nothing; the two existing
     tab events are unchanged.
2. **Lock behaviour unchanged (R3):** non-citizen → Create shows locked and a tap opens the citizenship explainer, the
   host modal never opens; citizen → Create opens the host modal; Join opens the join modal for everyone. Existing
   `0302`/`0354` tests still pass.
3. **Both templates** (`yandex-games_iframe.html`, `index.html`) carry the new tab content and no longer carry the old
   row in the Multiplayer tab.
4. **Localization:** every new key is present in both `en.json` and `ru.json`; no hardcoded user-visible text; the tab
   label is exactly "Приватная" (RU) / "Private" (EN).
5. **Analytics reference** has a `UI:Tap:PrivateTab` row; the constant is in `flashistConstants.uiElementIds`.
6. **Fit check, local:** at 360×430 in RU, screenshot the tab strip (no clipping/wrapping) and the Private tab with a
   locked Create (reads as locked) — attach to the worklog.
7. `npm test` and `npm run lint` pass.
8. **Live check** — after the deploy, inside the Yandex Games shell: tester sees three tabs, non-tester (flag off) sees
   two. Per the owner's build/verify split rule (2026-09-29) this goes into its own verify task at the top of the next
   sprint if it needs a deploy + owner check; **no verify task is filed now.**
9. **No native tooltip (What to build §3):** a test asserting neither button element (nor its inner `<button>`) carries
   a non-empty `title` attribute in either template — or, if a test is impractical, a manual check step recorded in the
   worklog: hover both buttons locally (RU and EN) and confirm no browser tooltip. The live check (step 8) **includes
   hovering both buttons** inside the Yandex Games shell and seeing no tooltip.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **One task by owner ruling** (2026-10-08, verbatim under *Context*): `fkit-lead` had proposed two tasks (restyle, then
  tab); the owner rejected the split. Do not re-split without a new ruling.
- Related: `0302` (private-lobby row + Create lock), `0354` (row visibility rule), `0301` (citizenship explainer —
  the locked-tap destination), `0401` (its check 4 moves into the new tab — flagged above), `0407`–`0411` (same start
  screen; no waits).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise; the same-day exception granted to
  `0407`–`0409` does **not** extend to this task.
- ⚠️ **Wider tooltip issue — NOT in this task's scope unless the owner says so.** The cause behind §3 (a `title`
  property name that is also the browser's tooltip attribute) affects other `o-button`s that set `title`, and every
  `o-modal` with a `title` (`src/client/components/baseComponents/Modal.ts`, property `title`) — e.g. the host modal
  shows a native tooltip "Приватное лобби" on hover over its content (owner screenshot). Other `<o-modal title=…>` users:
  `FlagInputModal.ts`, `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`, `HelpModal.ts`, `AccountModal.ts`,
  `Matchmaking.ts`. `fkit-lead` will ask the owner whether to file a separate app-wide task. ⛔ Do not fix those here.
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request + rulings relayed by `fkit-lead`. ⛔ Not producer
  precedent.
