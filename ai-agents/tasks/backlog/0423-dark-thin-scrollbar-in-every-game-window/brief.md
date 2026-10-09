# Dark thin scrollbar in every game window (shared `o-modal` first), matching the citizenship popup

## ID
0423

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0422` (in `cancelled/`), so this is `0423`.
> `grep -rn 0423 ai-agents/tasks ai-agents/sprints`: no hits before this filing.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session** (the
> owner's own selection), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
> precedent. Question: *"What should I do with it?"* (the light scrollbar in the "Одиночная игра" window). Owner chose,
> verbatim: **"Brief a small task, Sprint 8 (Recommended)"**. The option text was *"A separate small task: dark thin
> scrollbar in all game windows, done once in the shared window part. Appended to Sprint 8."*

## Priority
21

⚠️ **Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (20, `0415`); the owner named the sprint, not a rank.
**On merit this belongs directly below `0415`**, because it is low-priority visual polish (nothing is broken, and no
platform rule is involved), while `0415` is a Yandex-rules fix in the same file. 21 is already directly below `0415`.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### What was seen (2026-10-09, production game `0.0.161`, paid account, computer, inside Yandex Games)

The owner's screenshot of the **"Одиночная игра" window** (`SinglePlayerModal`, built on the shared `o-modal`), taken
while running [`0420`](../0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)'s
checklist, shows the browser's **default light scrollbar** on the right. It is not the dark, thin scrollbar the rest of
the game uses. Relayed by the coordinating session.

### Why it happens (checked in code by the producer, 2026-10-09 — the coder confirms)

- The game's dark thin scrollbar is defined **once, on the page**: `src/client/styles.css` (around lines 21–38,
  `::-webkit-scrollbar` width 8 px, a dark translucent track and a light translucent thumb).
- Page styles **do not reach inside** components that keep their own private style scope (shadow DOM). The shared
  window component `o-modal` (`src/client/components/baseComponents/Modal.ts`) is one of those. It has **two** areas
  that can scroll (`overflow-y: auto`): the full-screen backdrop (`.c-modal`) and the window's content area
  (`.c-modal__content`, max height 60 % of the screen). Neither carries scrollbar rules, so the browser draws its
  default light scrollbar.
- **The reference look already exists:** task
  [`0417`](../../done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md) gave the citizenship
  explainer popup the dark scrollbar by copying the page rules into that component
  (`src/client/CitizenshipExplainerModal.ts`, the `.modal-box::-webkit-scrollbar*` rules). Its comment records a trap
  worth knowing: *"No scrollbar-color here — in Chromium it turns these rules off."* `0417`'s worklog also records that
  other popups were left to a separate task (owner Q2). This is that task, for the shared windows.

### Scope

- **In:** every game window that scrolls and today shows the light default scrollbar. Start with the shared `o-modal`,
  which covers every window built on it: single player, host lobby, join private lobby, news, user settings, account,
  help, flag input, token login, territory patterns, matchmaking, chat. Then any other scrolling window the coder finds
  with the same problem. **The coder inventories them.** A window that already shows the dark scrollbar (for example
  one that is not shadow DOM, which `styles.css` already reaches) is left alone.
- **Chromium-based browsers only** (the Yandex browser and Chrome), the same as `0417`. Firefox keeps its default
  scrollbar, as it does for the rest of the app.
- **Out of scope (assumption — reversible):** the seven small standalone popups listed in
  [`0419`](../0419-other-small-standalone-popups-use-more-width-on-larger-screens/brief.md) (Backlog board). `0419`
  already carries a scrollbar item for them, and none of them scrolls today. If this task builds one shared scrollbar
  piece, `0419` should reuse it instead of copying the rules again. Recorded in *Notes*.
- **No change** to window size, layout, text, or behaviour. Only how the scrollbar looks.

### Dependencies and conflicts

- **`0415` (Sprint 8, no native tooltips)** also edits `src/client/components/baseComponents/Modal.ts`. Neither depends
  on the other: **whichever lands second rebases** and keeps the other's change.
- **`0419` (Backlog)** — see *Scope*. No dependency either way.
- No locked decision found that conflicts. Upstream OpenFront has the same `o-modal`, so this is a local divergence —
  mark it with a `// Flashist Adaptation` comment.

## What to build

Client-only, CSS-level.

1. **Every scrolling area of the shared `o-modal`** (the content area, and the backdrop if it can scroll) shows the
   same dark thin scrollbar as the citizenship popup: same width, track, thumb and hover look as
   `src/client/styles.css`.
2. **Done once, where possible.** Fix it in the shared component, so every window built on `o-modal` gets it and new
   windows can't bring the light scrollbar back. If several components need the same rules (the shared window, the
   citizenship popup, any other window the inventory finds), **the coder decides at the plan gate** whether to keep
   one shared copy of the rules that all of them use, or copy them per component as `0417` did. The coder says why.
   Don't leave four slightly different copies.
3. **Other scrolling windows** found by the inventory get the same look the same way.
4. Keep `0417`'s trap in mind: no `scrollbar-color` in the same scope, since in Chromium it switches the
   `::-webkit-scrollbar` rules off.

## Verification steps

1. **Inventory in the worklog:** every window that can scroll, whether it showed the light scrollbar before, and what
   changed. Windows that were already dark are listed as left alone.
2. **Local visual check, Chromium, RU, screenshots in the worklog.** Make each window scroll (a short browser window
   or long content) and confirm the dark thin scrollbar: single player (the window from the owner's report), host
   lobby, join private lobby, news, user settings, plus any other window from the inventory. Before and after for
   single player.
3. **The citizenship explainer popup is unchanged** — still the dark scrollbar (a regression check on `0417`).
4. **A test where feasible.** For example, a jsdom check that the shared window's styles include the
   `::-webkit-scrollbar` rules for its scrolling areas and **no** `scrollbar-color`, so a later edit can't silently
   drop them. If a test is impractical (jsdom does not render scrollbars), say so in the worklog and rely on step 2.
5. `npm test` and `npm run lint` pass.
6. **Live check — not filed now.** The look inside the real Yandex Games iframe after the deploy goes to a verify step
   **filed at close**, per the owner's build/verify-split rule (2026-09-29). It can be folded into an existing live
   checklist if the owner prefers.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Reference look: `0417` (citizenship explainer popup; its scrollbar rules in `src/client/CitizenshipExplainerModal.ts`).
- Same file as `0415` (`Modal.ts`) — whichever lands second rebases.
- **Assumption, flagged for the owner:** the seven small standalone popups stay with `0419` (its existing scrollbar
  item), not here. They don't scroll today. If the owner wants "all game windows" to include them in this task, move
  `0419`'s scrollbar item here. That is a scope change either way, so it is the owner's call.
  ✅ **ANSWERED 2026-10-09 — OWNER RULING *"Keep them in 0419 (Recommended)"*** (the owner's own selection, live via
  `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer`; ⛔ not producer
  precedent). Option text: *"0423 stays small and fixes what you saw. 0419 reuses 0423's shared piece later. No
  overlap."* ⇒ The assumption stands. `0419`'s Notes now point to this task.
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- No ids, hosts, URLs or secrets belong in this brief or its follow-ups.
- Filed 2026-10-09 by a spawned `fkit-producer` on an owner ruling relayed by the coordinating session. ⛔ Not producer
  precedent.
