# No native browser tooltips anywhere in the UI (`o-button` / `o-modal` `title`, and every other `title` attribute)

## ID
0415

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0414` (now in `cancelled/`), so this is `0415`.
> `grep -rn 0415 ai-agents/tasks ai-agents/sprints`: no task hits before this filing.

## Sprint
Sprint 8

> 📌 **MOVED FROM BACKLOG TO SPRINT 8 — OWNER RULING, 2026-10-09**, given live via `AskUserQuestion` in the
> coordinating Claude Code session (the owner's own selection), relayed to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. The owner reported two more tooltips live on `0.0.161` and asked
> for a Sprint 8 task; the producer pointed out that this task already covers them. Question: *"How should it get into
> Sprint 8?"* Owner chose, verbatim: **"Move 0415 into Sprint 8 (Recommended)"**. The option text was *"No duplicate
> task; the whole tooltip job is done at once (fits the Yandex rule). Bigger: includes the in-game panels and that one
> planning decision. Today's report is added to its brief."* ⇒ The whole task (§1 + §2) is pulled, unchanged in scope.
> The [Backlog board](../../../sprints/backlog.md) row now reads `➡️ Moved to Sprint 8 — priority 20`.

> 📌 *History — original filing.* **OWNER RULING, 2026-10-08, typed directly by the owner in the `fkit lead` session**, relayed verbatim by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> `fkit-lead` asked, verbatim: *"keep 0413/0414 split or merge them? And file the app-wide "no browser tooltips" task,
> and where?"* Owner, verbatim: *"1. Merge. 2. Brief a task to the backlog."* ⇒ filed on the Backlog board.

## Priority
20

⚠️ **Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (19, the cancelled `0422`); the owner named the sprint, not a
rank. **On merit this belongs directly below `0420`**, because the owner found these tooltips while running `0420`'s
checklist and believes they break a Yandex Games rule — a compliance fix for the game's only storefront. Not inserted
there: closed rows sit below the top of the board, and ADR-035 never renumbers them, so a new row always appends.

*History (2026-10-08, while on the Backlog board):* the owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row
(ADR-035) — its place on that board is **append order, not a merit ranking**. Needing a rank is the signal to pull it
into a sprint. On merit it matters more than its board position suggests: the owner believes these tooltips break a
Yandex Games rule (see *Context*), and the game is shipped through Yandex Games.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### New report — seen live 2026-10-09 (production game `0.0.161`, paid account, computer, inside Yandex Games)

Found by the owner while running [`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)'s
checklist; relayed verbatim by the coordinating session.

- **Join-lobby button in the "Присоединиться к приватному лобби" window** (`JoinPrivateLobbyModal`). Hovering the blue
  "Присоединиться к лобби" button shows a browser tooltip "Присоединиться к лобби". Owner, verbatim, with a screenshot:
  *"There are no tooltip over the buttons on the PRIVATE tab, but there are tooltips when I hover over the button in
  the popup"*. Source: `<o-button title=${translateText("private_lobby.join_lobby")}>` at
  `src/client/JoinPrivateLobbyModal.ts:176`.
- **Start button in the "Одиночная игра" window** (`SinglePlayerModal`). Hovering the blue "Начать игру" button shows a
  browser tooltip "Начать игру". Owner, verbatim, with a screenshot: *"Confirmed: the START button also have the same
  tooltip"*. Source: `<o-button title=${translateText("single_modal.start")}>` at `src/client/SinglePlayerModal.ts:398`.
- **The two start-screen "Приватная" tab rows show no tooltip** — `0412` (done) removed theirs. That matches the owner's
  report.
- **Window titles (`o-modal`) — seen once, the other windows still to check.** The host-lobby window's tooltip
  "Приватное лобби" was seen on 2026-10-08 (below). On 2026-10-09 it was not reported for the join or single-player
  windows. **The coder checks each window** and does not assume the result. The mechanism is the same, so it is
  expected.
- Both new cases were already in this task's scope (§1). Today's report changes no scope — it only adds evidence.

### What was seen (2026-10-08, production game `0.0.157`, owner screenshots)

- Hovering "Присоединиться к лобби" shows a browser tooltip **"Join Lobby"** (English).
- Hovering inside the host-lobby window shows a browser tooltip **"Приватное лобби"**.
- Owner, verbatim (2026-10-08): *"the private lobby buttons have generic "hints", which is forbidden by Yandex.Games
  rules"*. ⚠️ The rule itself is the owner's statement; the wiki holds nothing on it (`/fkit-query` for "tooltip" found
  only the in-game tutorial's own tooltips, which are unrelated) — **a wiki gap**, not checked against the Yandex rules
  text by the producer.

### Why it happens (checked in code by `fkit-lead`, re-checked by the producer 2026-10-08)

- The two base components have a Lit property named **`title`** — the same name as the standard HTML attribute that
  browsers show as a hover tooltip:
  - `o-button` — `src/client/components/baseComponents/Button.ts:8` (rendered as the button's label when no
    `translationKey` is given, around line 52);
  - `o-modal` — `src/client/components/baseComponents/Modal.ts:8` (rendered as the window heading, around line 97).
- So any `<o-button title=…>` and every `<o-modal title=…>` puts a real `title` attribute on the element, and the
  browser shows it as a tooltip over the whole button or the whole window.
- Note for the plan: setting the Lit **property** from script (e.g. `missionButton.title = …` in `src/client/Main.ts`)
  does not add the attribute, so it shows no tooltip; markup (`title="…"` in HTML, `title=${…}` in a Lit template) does.
  A rename removes both routes at once.

### Where (inventory starting point — the coder completes it)

- *Line numbers re-checked 2026-10-09 by the producer:* `FlagInputModal.ts:22`, `HostLobbyModal.ts:118` (was `:117`),
  `JoinPrivateLobbyModal.ts:108` (was `:65`), `SinglePlayerModal.ts:75`. The `o-button` cases seen live are
  `JoinPrivateLobbyModal.ts:176` and `SinglePlayerModal.ts:398`. Plain `title=` example: `HostLobbyModal.ts:620`
  (`"Remove <username>"`, English). Lines move; the grep is the real list.
- `<o-modal title=…>` (original list): `FlagInputModal.ts:22`, `HostLobbyModal.ts:117`, `JoinPrivateLobbyModal.ts:65`, `HelpModal.ts`,
  `AccountModal.ts`, `Matchmaking.ts` (per `fkit-lead`); the producer's grep also shows `<o-modal` in
  `TokenLoginModal.ts`, `NewsModal.ts`, `TerritoryPatternsModal.ts`, `UserSettingModal.ts`, `SinglePlayerModal.ts` and
  `graphics/layers/ChatModal.ts` — check each for `title`.
- `<o-button title=…>`: both HTML templates (`src/client/yandex-games_iframe.html`, `src/client/index.html` — e.g. the
  create/join lobby, chat-test, single-player and instructions buttons) and Lit templates (e.g.
  `JoinPrivateLobbyModal.ts`, `SinglePlayerModal.ts`).
- **Plain HTML `title` attributes beyond the two base components:** the producer's grep counted **~39** other
  `title=` uses across **~23** client files, including in-game layers (`BuildMenu.ts`, `PlayerPanel.ts`,
  `GameRightSidebar.ts`, `SendResourceModal.ts`), `CitizenBadge.ts`, `UsernameInput.ts`, `FlagInput.ts`,
  `NewsButton.ts`, `components/ui/ActionButton.ts`, `PlayerStatsTree.ts`; plus script-set ones such as
  `licenseCredits.title = version` in `src/client/Main.ts` (a real tooltip on a plain `div`). A rough count — some may
  be props of other components, not attributes; the coder's inventory is the real list.

### Dependencies and conflicts

- **Update 2026-10-09:** `0412` and `0413` are both **done** (`ai-agents/tasks/done/`). Their "whichever lands
  second" rule below is settled: this task builds on their code as it is now, and leaves `0412`'s two start-screen
  rows as they are (no `title`).
- **`0423` (Sprint 8, filed 2026-10-09 — dark thin scrollbar in every game window)** edits the same shared window file,
  `src/client/components/baseComponents/Modal.ts`. Neither depends on the other: **whichever lands second rebases** and
  must keep the other's change.
- **`0412` (Sprint 7)** already removes the tooltip from the two private-lobby buttons ("Создать лобби" /
  "Присоединиться к лобби") as part of their restyle, and names this wider problem as out of its scope. This task
  covers **everything else**. No dependency either way: **whichever lands second rebases on the other and must not
  re-introduce or double-fix those two buttons** (e.g. if this task renames the property first, `0412` uses the new
  name; if `0412` lands first, this task leaves its two buttons as `0412` left them).
- **`0413` (Sprint 7)** edits `JoinPrivateLobbyModal.ts` (paste button) — the same file this task touches for its
  `<o-modal>` / `<o-button>`. Same rule: whichever lands second rebases.
- No locked decision found that conflicts. Upstream OpenFront uses the same `title` property name; renaming it is a
  local divergence — mark it with a `// Flashist Adaptation` comment.

## What to build

Client-only. **Goal: no native browser tooltip appears anywhere in the game's UI** — menus, windows and in-game
panels — while every piece of visible text stays exactly as it is.

### 1. The two base components (the core)

- Stop `o-button` and `o-modal` from carrying a `title` attribute. `fkit-lead`'s suggestion: rename the property (e.g.
  `heading` for `o-modal`, `label` for `o-button`) in both components and all their callers, so the visible label /
  heading stays and the attribute is gone. **The coder chooses the approach at the plan gate** and says why (a rename is
  the obvious fit; any alternative must still leave no `title` attribute on the host element and no other element).
- Update every caller found by the inventory: both HTML templates (**always both** — `yandex-games_iframe.html` is the
  one served in production) and every Lit template and script that sets it.
- Visible text unchanged: same labels, same headings, same translations; no new user-visible text, so no lang-file edits
  are expected (if one turns out to be needed, update both `en.json` and `ru.json`).

### 2. Every other native tooltip in the client UI

- Inventory every remaining source of a native tooltip in `src/client/`: `title` attributes in HTML and Lit templates,
  `.title = …` / `setAttribute("title", …)` on plain elements, and SVG `<title>` children. Put the full list (file,
  element, current text) in the plan.
- Default: **remove** each one.
- ⚠️ **Plan-gate point for the owner:** where a `title` is the **only** label of an icon-only control (likely in some
  in-game panels), removing it leaves no text label at all. The coder lists those cases separately at the plan gate
  with a recommendation (just remove / an `aria-label` for screen readers — which shows no tooltip / a visible label),
  and the owner confirms. Do not silently keep any native tooltip.

### 3. Leave everything else unchanged

- No behaviour change beyond the tooltips: clicks, the `locked` citizen-perk state (`0302`), disabled states and the
  modal close all behave as today.
- The page's `document.title` (the browser tab name, `LangSelector.ts`) is **not** a tooltip — leave it.

## Verification steps

1. **Unit tests** (jsdom):
   - render `o-button` with its label set (via the new property, or whatever the plan chose) → the host element and its
     inner `<button>` carry **no `title` attribute**, and the label text still renders;
   - render `o-modal` with its heading set → the host element and its wrapper carry **no `title` attribute**, and the
     heading text still renders;
   - a guard over the two HTML templates (`yandex-games_iframe.html`, `index.html`) that no `<o-button` / `<o-modal`
     tag carries `title=` (so a future edit cannot quietly bring one back).
2. **Inventory in the worklog:** every `title` source found in §2, and what happened to each (removed / replaced by
   `aria-label` / owner-approved exception). A final grep of `src/client/` shows no remaining `title=` on rendered
   elements other than the ones the owner approved.
3. **Hover spot-check, local, RU and EN, screenshots into the worklog** — hover each and see no browser tooltip:
   - start screen: Multiplayer / Solo tab buttons, "Создать лобби", "Присоединиться к лобби", the mission button,
     instructions (where present), the version / licence line;
   - windows: host lobby (hover the heading and the body — today shows "Приватное лобби"), join private lobby (**its
     "Присоединиться к лобби" button** — seen live 2026-10-09 — and the window body), single player (**its
     "Начать игру" button** — seen live 2026-10-09 — and the window body), user settings, account, help, news, flag input, matchmaking;
   - in game: build menu, player panel, right sidebar, send-resources window, chat window.
4. `npm test` and `npm run lint` pass.
5. **Live check — left OPEN, not filed now.** After the deploy, inside the Yandex Games iframe, repeat a short version
   of step 3 (start screen buttons, host and join windows, the join window's "Присоединиться к лобби" button, the
   single-player window's "Начать игру" button, one in-game panel). Per the owner's build/verify split rule
   (2026-09-29), if this needs a deploy + owner check it becomes its own verify task at the top of the next sprint;
   **no verify task is filed now**.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **2026-10-09: pulled into Sprint 8 whole, by owner ruling** (see *Sprint*). Not split. The owner chose the whole
  task over a smaller Sprint 8 piece. Related new task: `0423` (same `Modal.ts` file; see *Dependencies*).
- **Filed as one task, not split.** By the skill's smallest-shippable-unit rule it could be two (§1 base components,
  §2 every other `title`) — each can be built and shipped alone. Kept as one because the owner asked for *"a task"*
  and, the same day, twice ruled split proposals back into one task (`0412`: *"keep it in the same task"*; `0413`/`0414`:
  *"1. Merge."*). If the owner wants the split, §2 becomes its own task.
- Related: `0412` (Sprint 7 — the two private-lobby buttons; whichever lands second rebases), `0413` (Sprint 7 — same
  file `JoinPrivateLobbyModal.ts`), `0302` (`locked` state on `o-button`).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- No ids, hosts, URLs or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
