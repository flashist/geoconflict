# Rename the Custom Game window's title to «Своя Игра» / "Custom Game" to match the start-screen button and the 2026-10-17 news

## ID
0468

> ℹ️ **ID allocation, checked 2026-10-16 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0467`. `0468`: no task folder and no task
> reference in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/` (one unrelated git-hash substring match only).

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-16**, given live via `AskUserQuestion` in the `fkit lead` session and
> relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel). ⛔ **Not producer precedent.**
> Question: *"The news says "Single Player" is now called "Custom Game" («Своя Игра»). The start-screen button really
> is renamed, but the window it opens is still titled "Single Player" («Одиночная игра»). What should we do?"*
> Verbatim selection: **"Keep text + file a fix task (Recommended)"** — *"The news ships as approved. A small Backlog
> task renames that window's title to «Своя Игра» / "Custom Game" later, so the news becomes fully true."*
> No sprint was named, so it is filed on the Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design.)

## Status
🔲 Backlog

## Owner
fkit-coder

> ℹ️ **Model routing:** this is a small routine fix, and the project's model routing (`CLAUDE.md`, generated from
> `ai-agents/ai-agents.yml`) sends `routine-fix` to **Codex**. The owner decides who builds it.

## Context

**In plain terms.** Task `0166` renamed the start-screen button from «Одиночная игра» / "Single Player" to
«Своя Игра» / "Custom Game". But when a player taps that button, the window that opens still says
«Одиночная игра» / "Single Player" at the top. The 2026-10-17 news entry (task `0426`, entry B, bullet 1) tells
players *"Single Player" is now called "Custom Game"* — true for the button, not yet for the window. This task
renames the window's title so the button, the window and the news all agree.

**Facts, verified 2026-10-16 against the working tree** (source: `0426` stateful review, finding R1 —
`ai-agents/tasks/done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/review.md`):

| What | Where | Current value |
|---|---|---|
| Window heading (the thing to change) | `src/client/SinglePlayerModal.ts:75` — `<o-modal heading=${translateText("single_modal.title")}>` | key `single_modal.title` |
| English string | `resources/lang/en.json:266` | `"Single Player"` |
| Russian string | `resources/lang/ru.json:270` | `«Одиночная игра»` |
| Start-screen button (already renamed by `0166` — the target wording) | `en.json:40` / `ru.json:39`, key `main.single_player` | `"Custom Game"` / `«Своя Игра»` (capital «И») |

**Other "Single Player"-like strings found while filing — NOT in scope by default** (the coder confirms, and flags
to the owner if any of them is in fact the Custom Game mode):

- `main.tab_singleplayer` — `"Singleplayer"` / `«Одиночная»` (`en.json:43`, `ru.json:42`), used in
  `src/client/StartScreenTabs.ts:53`. This is the **tab** that holds both Custom Game and the missions, named that way
  on purpose by `0166`, and the news itself names the tab «Одиночная». **Do not rename.**
- `player_stats_tree.singleplayer` — `"Single Player"` / `«Один Игрок»` (`en.json:988`, `ru.json:1012`), used in
  `src/client/components/baseComponents/stats/PlayerStatsTree.ts:135` as the stats filter for the single-player
  **game type** (which covers missions too, not only Custom Game). **Do not rename** unless the coder finds it means
  Custom Game only — then flag it, don't decide.
- `src/client/yandex-games_iframe.html:315` — a commented-out button carrying `title="Single Player"`. Not
  player-visible. Leave it.

**Must NOT be renamed — contracts, not display text:**

- **Analytics event names**, e.g. `UI:ClickSinglePlayer` and the `SingleplayerTab` value in
  `src/client/flashist/FlashistFacade.ts`. These are a contract with the analytics dashboards; renaming them breaks
  history. (Source of truth: `ai-agents/knowledge-base/analytics-event-reference.md`.)
- **Translation keys** (`single_modal.title`, `main.single_player`, …), code identifiers (`SinglePlayerModal`,
  `GameType.Singleplayer`), element ids (`single-player`), and the `localStorage` tab value `singleplayer`. Only the
  **text values** change.

**No news edit.** The 2026-10-17 entry in `resources/announcements.json` is frozen once shipped; this task makes it
true, it does not reword it.

**Related, not dependencies:** `0166` (start-screen redesign — renamed the button), `0426` (the news entry; finding
R1 raised this).

## What to build

1. Change the **value** of `single_modal.title` to `"Custom Game"` in `resources/lang/en.json` and to `«Своя Игра»`
   (same capitalisation as `main.single_player` in `ru.json`) in `resources/lang/ru.json`. Both files, always (project
   rule). Other language files are not required.
   - Implementation choice for the coder: change the value in place, or point the heading at the existing
     `main.single_player` key so the two can never drift again. Either is acceptable; say which and why in the plan.
2. Do one sweep for any **other player-visible** "Single Player" / «Одиночная игра» text that labels **the Custom
   Game mode or its window** (not the tab, not the game-type stats filter — see Context), and list what you found in
   the worklog. Rename only what is clearly the Custom Game mode; anything ambiguous goes to the owner as a question.
3. Do **not** rename analytics events, translation keys, code identifiers, element ids or stored values.
4. Do **not** touch `resources/announcements.json`.

## Verification steps

1. `resources/lang/en.json` → `single_modal.title` (or whatever the heading now reads from) resolves to
   `"Custom Game"`; `resources/lang/ru.json` → `«Своя Игра»`. Both files changed in the same diff.
2. Run the app (`npm run dev`), Russian locale: start screen → «Одиночная» tab → tap «Своя Игра» → the window heading
   reads **«Своя Игра»**. Repeat in English: heading reads **"Custom Game"**. Screenshot or state what was seen.
3. `git diff` shows **no** change to analytics event strings in `src/client/flashist/FlashistFacade.ts`, to
   `ai-agents/knowledge-base/analytics-event-reference.md`, or to `resources/announcements.json`.
4. Tests: search `tests/` for any assertion on this title. Known at filing: `tests/client/components/Modal.test.ts`
   uses the literal `"Single Player"` as a sample `heading` — it sets its own value and does **not** read the
   translation, so it should need no change; confirm that, and update any test that does assert the translated title.
   Run the affected test files (`npm test -- <path>`); a full `npm test` is not required for a string change.
5. `npm run lint` passes (JSON stays valid; no duplicate keys).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** `0166` (button rename), `0426` (news entry; review finding R1).
- Small, low-risk string change. Ships with any normal client deploy — no server or data change. Committed ≠ deployed;
  the news becomes fully true only once this is live.
