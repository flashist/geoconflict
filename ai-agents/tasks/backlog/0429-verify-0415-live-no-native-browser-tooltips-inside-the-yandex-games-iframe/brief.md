# Verify 0415 live — no native browser tooltips inside the Yandex Games iframe

## ID
0429

> ℹ️ **ID allocation, checked 2026-10-09 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0428` (folder names and `## ID` fields agree). `0429`: no task folder, no
> board hit.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-09, given live via `AskUserQuestion` in the `fkit lead` session** (during a
> `/fkit-sprint-ship-loop` run on Sprint 8, at `0415`'s close), relayed by `fkit-lead` to a spawned `fkit-producer` with
> no owner channel (ADR-021/037); ⛔ **not producer precedent.** The owner applied the standing build/verify-split rule
> (2026-09-29: the build task closes, its live check becomes its own verify task) and chose the placement, verbatim:
> **"Bottom of Sprint 8"**. The other option offered — *"Backlog board, flagged for Sprint 9"* — was not chosen.

## Priority
31

> ⚠️ **Priority 31 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0428`** — exactly where it sits — because the owner ruled "Bottom of Sprint 8",
> and it can only run after the deploy that carries `0415`. Appended after the board's highest (30, `0428`), per
> ADR-035. Rank barely matters here: the deploy, not the rank, decides when it can start.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, by hand, inside the Yandex Games iframe, after the deploy. No agent
can do this check: it needs a real mouse hover and a human eye (see *Context*).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0420`.)*

## Context

**What this is, in plain terms.** [`0415`](../../done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md)
removed the small grey browser hint boxes ("native tooltips") that popped up when hovering buttons and windows — for
example "Присоединиться к лобби" over the join window's button, and "Начать игру" over the single-player start button.
The owner believes these hints break a Yandex Games rule (see
[`yandex-games-platform-rules.md`](../../../knowledge-base/yandex-games-platform-rules.md)). `0415` closed on local
evidence only. Its brief left the **live** check open (its *Verification steps*, step 5); this task is that check.

**Why a human must hover.** A screenshot cannot show a native tooltip: the browser draws that box outside the page, and
headless Chromium does not draw it at all (recorded in the wiki from `0412`, and again in `0415`'s plan). So `0415`'s
local proof was a scan of the live page for leftover `title` attributes (zero on every screen checked, RU and EN, both
templates — see its worklog). The only way to see the real result inside Yandex Games is a person hovering with a mouse.

**Expected, not a bug** (owner-approved in `0415`'s plan, Q1):
- In the in-game player panel, **very long player names are cut off with "…"** and there is no longer a hint showing the
  full name. That small loss was accepted.
- A few icon-only controls keep a hidden screen-reader name (`aria-label`). That never shows a hover box.

**Deploy timing.** `0415` ships in a weekend deploy slot (owner rule 2026-09-29) unless the owner says otherwise.
Commit and deploy are the owner's call; committed is not deployed. Run this check only after the game version carrying
`0415` is live.

## What to build

Nothing to build. A short hover checklist, run by the owner inside the Yandex Games iframe on the deployed game, in
Russian (and English if convenient). For each item: hover the mouse over it, hold still for about two seconds, and
confirm **no small grey browser hint box appears**.

1. **Start screen buttons** — the Multiplayer / Solo tab buttons, "Создать лобби", "Присоединиться к лобби", the
   mission button.
2. **Host lobby window** — hover its heading and its body (before `0415`, "Приватное лобби" appeared here).
3. **Join private lobby window** — hover its body, and **its "Присоединиться к лобби" button** (seen live 2026-10-09).
4. **Single-player window** — hover **its "Начать игру" button** (seen live 2026-10-09) and its body.
5. **One in-game panel** — start a quick single-player game and hover the controls in one panel (for example the build
   menu, or the player panel).
6. **Dark scrollbar (`0423`)** — not a hover check: inside the Yandex Games iframe, the game windows (e.g. single player,
   host lobby, news, and the in-game build menu on a short/phone-height screen) show the **dark thin scrollbar**, not
   the light browser default. Make a window short enough to scroll if needed. Chromium-based browsers only (Firefox
   draws its own; out of scope). Added 2026-10-09 — see *Notes*.

Record the result in this task's `worklog.md`: game version checked, the date, each item pass/fail, and for any fail
the exact text of the hint box and where it appeared.

## Verification steps

1. The game version checked is the deployed one that includes `0415` — the owner names it in the worklog.
2. Items 1–5 above were hovered, and item 6 looked at, inside the Yandex Games iframe; the worklog records pass/fail
   for each.
3. **Pass** = no native hint box on any of items 1–5, and the dark thin scrollbar on every window checked in item 6.
   **Any hint box = fail**: the worklog names the control and the hint text. **Any light default scrollbar = fail**: the
   worklog names the window. Either way a follow-up build task is filed (this task does not fix code).

## Notes

- **Depends on:** `0415` and `0423` committed and deployed
- **Blocks:** nothing
- Build task: [`0415`](../../done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md) (closed
  2026-10-09, agent-closed — not owner-verified). Its full local inventory and per-screen scan are in its `worklog.md`.
- **`0423` folded in (2026-10-09).** 📌 OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session (at
  `0423`'s close, `/fkit-sprint-ship-loop` on Sprint 8), relayed by `fkit-lead` to a spawned `fkit-producer` with no
  owner channel (ADR-021/037); ⛔ not producer precedent. Owner chose, verbatim, **"Add a line to 0429 (Recommended)"**;
  the alternative offered (a separate verify task at the bottom of Sprint 8) was not chosen. That is checklist item 6.
  Build task: [`0423`](../../done/0423-dark-thin-scrollbar-in-every-game-window/brief.md) (closed 2026-10-09,
  agent-closed — not owner-verified). The title above still names only `0415`; kept so the ID and folder stay stable.
- Related: `0420` (the Sprint 7 live checklist — where the owner first found these tooltips), `0423` (dark scrollbar —
  folded in as item 6; same `Modal.ts` file, may ride the same deploy), `0426` (news-window entry — depends on `0415`).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- No ids, hosts, URLs or secrets belong in this brief or its worklog.
- Filed 2026-10-09 by a spawned `fkit-producer` at `0415`'s close, on the owner ruling above. ⛔ Not producer precedent.
