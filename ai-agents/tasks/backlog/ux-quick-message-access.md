# Task — UX: Faster Access to Quick Messages

## Priority
Low / Future — player-reported friction, no sprint assigned

---

## Player Feedback

> "делайте пожалуйста чат между игроками более простой/доступный, на данный нужно совершить слишком много действий чтобы добраться к чату, а когда тебя атакуют ты ничего не успеваешь сделать. Я имею ввиду про быстрый доступ к нему, в игре есть меню обмен необходимых слов между игрокам, и пока нажмешь на игрока, выберешь нужный тебе раздел, выберешь нужное сообщение, проходит много времени, например при призыве помощи золота/войск, тебя уже захватят"

**Summary**: The quick message menu takes too many steps to reach during active combat. By the time you tap a player, open the chat section, select a category, and select a phrase, you've already been captured — particularly when calling for help (troops, gold).

---

## Current System

The flow to send a quick message:

1. Tap a player (opens the radial menu)
2. Tap the **Chat** icon
3. Select a **category** (help / attack / defend / greet / misc / warnings — 6 categories)
4. Select a **phrase** within that category

Minimum 3 taps before any message is sent. The most time-critical messages — `help.troops`, `help.gold`, `help.no_attack`, `help.alliance` — all live inside the `help` category and require the full flow.

Key files:
- `resources/QuickChat.json` — phrase categories and keys
- `src/client/graphics/layers/ChatModal.ts` — category/phrase selection UI
- `src/client/graphics/layers/ChatIntegration.ts` — `createQuickChatMenu()` wiring into the radial menu
- `src/client/graphics/layers/RadialMenuElements.ts` — `infoChatElement` radial menu entry

---

## Problem

The quick message system is a diplomacy tool used in real-time under pressure. The current 3-tap depth is acceptable for non-urgent messages (greet, misc), but makes the `help` category nearly unusable during active attacks on mobile. The player rightly identifies calling for gold/troops as the highest-friction case.

---

## Possible Directions

These are options to evaluate, not a committed scope:

**Option A — "Help" shortcut on the radial menu**
Add a second radial menu entry that directly opens the `help` category, skipping category selection. Reduces 3 taps to 2 for the most urgent message type. Minimal implementation.

**Option B — Contextual quick-action strip**
When the player is under attack (an enemy attack execution targets their territory), surface a persistent HUD strip with 2–4 one-tap buttons for the most common messages (`help.troops`, `help.gold`, `help.no_attack`). No menu navigation required. More invasive but highest impact.

**Option C — Pinned / favourite messages**
Let players pin up to 3 phrases to the top level of their radial menu as personal shortcuts. Gives player control but adds settings complexity.

**Option D — Global broadcast shortcut**
Keep the player-targeted flow as-is, but add a separate panic-broadcast button that sends a `help.troops` or `help.gold` message to all allies simultaneously. Requires no player tap to target. Useful in team modes.

---

## Notes

- The player asked specifically about the `help.troops` and `help.gold` messages — these are player-targeted in `QuickChat.json` (`requiresPlayer: false` for troops/gold, meaning they work as general broadcasts, not targeting a specific player). This suggests Option D or B may be the most directly responsive.
- Option A is the lowest-effort starting point and can ship independently.
- Any solution must work on mobile (small tap targets, no hover states).
- No analytics are instrumented for quick message sends currently — adding a `Chat:QuickMessage:Sent` event with the category would be valuable context before designing a solution.
- Do not scope implementation until a short investigation confirms which messages are most frequently sent (if analytics allow) and which option fits the existing radial menu architecture cleanly.
