# Other small standalone popups: use more width on larger screens

## ID
0419

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0418`, so this is `0419`. `grep -rn 0419 ai-agents/tasks
> ai-agents/sprints`: no hits before this filing.

## Sprint
Backlog

## Priority
Unscheduled

⚠️ The owner gave no sprint and no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an
appended row (ADR-035) — its place on that board is **append order, not a merit ranking**. Needing a rank is the
signal to pull it into a sprint. **On merit it belongs right after `0417` lands**, because it reuses `0417`'s approach
and should not start before that approach is reviewed and settled.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### The ruling — the owner's words

Owner, 2026-10-08, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (driving
`fkit-sprint-ship-loop` on Sprint 7) to a spawned `fkit-producer` with no owner channel (ADR-021/037). While approving
[`0417`](../../done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md)'s plan, the owner was asked
*"should other small popups get wider too?"* and chose **"File a task for the others"** — a separate task; `0417`
itself is unchanged. ⛔ Not producer precedent.

### The problem

`0417` found that the citizenship explainer popup is phone-width on desktop because its own styles fix its width at
360 px. Several other popups in the game client are built the same way — standalone components with their **own**
styles and a **fixed small width** — so on a desktop or tablet they also look like a phone-sized box in the middle of a
wide screen.

### Survey — producer's quick grep, a starting list, not a verified inventory

The producer grepped `src/client` only to scope this brief. **The coder confirms each entry and looks for any the grep
missed** (for example popups sized another way). Every one below appears to set a fixed `width` plus a `max-width` of
about 90% of the screen, and **none** appears to set its own scrolling:

| Popup (component file) | Fixed width today | Kind of content (producer's guess — coder confirms) |
|---|---|---|
| `GameStartingModal.ts` | 300 px | short status message |
| `CitizenshipRestartModal.ts` | 320 px | short message + button |
| `TenureGrantModal.ts` | 320 px | short message + button |
| `ReconnectModal.ts` | 340 px | short status message |
| `StaleBuildModal.ts` | 340 px | short message + button |
| `EmailSubscribeModal.ts` | 340 px | text + form |
| `FeedbackModal.ts` | 340 px | form with a text box |

**Already wide — leave alone unless the coder finds a real problem:** the shared `o-modal`
(`src/client/components/baseComponents/Modal.ts`, max 860 px) and every popup built on it; `WinModal` (already grows
to 700 px on wider screens); `LanguageModal` (up to 480 px).

**Borderline — the coder notes them, the owner decides at the plan gate:** in-game `SettingsModal` and
`MultiTabModal` (`src/client/graphics/layers/`) cap at about 448 px via utility classes; `SendResourceModal` caps at
540 px. These are not phone-width, so they are **out of scope by default**.

### What `0417` learned that applies here

- **The approach:** change only the fixed `width` to a larger cap, keep the existing `max-width` of about 90% of the
  screen. Result: on a phone (~360 px) the box is unchanged, pixel for pixel; it grows with the screen up to the cap.
  See `0417`'s plan (`ai-agents/tasks/backlog/0417-…/plan.md` today; it may move to `done/` when `0417` closes).
- **The scrollbar:** the app's dark scrollbar is set once on the page (`src/client/styles.css`), and page styles do
  **not** reach inside these components' private style scope (shadow DOM). So any of these popups that scrolls shows
  the browser's default **light** scrollbar. None of the seven appears to scroll today — **but** a popup with no
  scroll and no height cap can run off the bottom of a short screen. The coder checks each one on a short screen.

### Dependencies and conflicts

- **Depends on `0417`** — reuse its settled approach (the cap, the width rule, the scrollbar rules if `0417` takes them)
  rather than inventing a second one. Start only after `0417` is reviewed and closed, so a late change there is not
  copied in its old form.
- No conflict with a locked decision found. Each popup's existing logic, text and stacking order stay as they are.

## What to build

A client-only layout change to the small standalone popups listed above (as confirmed by the coder).

1. **Confirm the list.** Check each popup in the table, and look for any other standalone popup with a fixed small
   width the grep missed. Record the final list in the plan, with each popup's width rule today.
2. **For each confirmed popup, let it use more width on larger screens**, following `0417`'s approach: unchanged at
   phone width (~360 px) — nothing clipped, no sideways scroll — and wider on tablet and desktop, up to a cap.
3. **Cap per popup by its content** (see open point 1). Wider should mean fewer wrapped lines, not a near-empty wide
   box around two lines of text.
4. **Short screens:** for each popup, check that its content and its buttons stay reachable when the screen is short.
   If one runs off the screen, give it the same height cap and scrolling `0417`'s popup has.
5. **Scrollbar:** any popup that scrolls (today or after step 4) gets the same dark scrollbar `0417` uses, if `0417`
   took that fix (open point 3).
6. No text changes. If any text is touched by accident, both `resources/lang/en.json` and `resources/lang/ru.json`
   stay in sync. No change to any popup's logic, buttons, analytics or stacking order.
7. Keep every existing test for these popups passing. A width rule is a visual check, not a unit test (the test
   browser does no layout — `0417` reached the same conclusion), so no new width test is required.

### Open points — the owner confirms these at the coder's plan gate (NOT decided here)

The producer recommends; the owner decides. Put these to the owner in plain words before building.

1. **Cap per popup.** **Recommendation:** two sizes, not one — text-heavy popups (the feedback form, the email
   subscribe popup) get `0417`'s cap (600 px if `0417` keeps it); short-message popups (game starting, reconnect,
   stale build, restart, tenure grant) get a smaller cap of about **420–480 px**. Tradeoff: one cap for all is simpler,
   but a two-line status message in a 600 px box looks empty. The coder may propose numbers with screenshots.
2. **Include the borderline in-game popups** (`SettingsModal`, `MultiTabModal`, `SendResourceModal`)? **Recommendation:
   no** — they are already well above phone width. Tradeoff: leaving them keeps the task small; including them makes
   the look more uniform.
3. **Scrollbar fix.** Follow whatever the owner ruled for `0417`'s open point 3. If `0417` fixed it, apply the same
   rules to any popup here that scrolls.
4. **One task or one per popup?** The owner ruled "a task" — so this is **one** brief. Each popup could ship on its
   own; if the owner prefers smaller pieces (for example, the two forms separately from the five status popups), the
   producer splits it.

## Verification steps

1. **Plan gate:** the plan lists every popup in scope with its width rule today, and records the owner's answers to
   open points 1–4 (who, date, channel, words) before building.
2. **Before editing:** measure each popup's box width at **360×740** and **1280×800**, with screenshots — the baseline
   for "phone unchanged".
3. **Visual check, local dev (`npm run dev`)**, in both **ru** and **en**, for each popup in scope, at **360×740**,
   **768×1024** and **1280×800**:
   - phone: box width equals the baseline; nothing clipped; no sideways scroll; every button reachable;
   - tablet and desktop: visibly wider than before, never wider than its owner-confirmed cap or the screen;
   - at every width: text, form fields and buttons fully visible and not overlapping.
   A yes/no table (plus screenshots) per popup per width goes in the worklog. Popups that are hard to open locally
   (for example the reconnect popup) may be forced visible in the test browser — say which ones were, and how.
4. **Short screen:** each popup at **1280×600** and **360×560** — content and buttons reachable; any popup that
   scrolls shows the dark scrollbar in a Chromium-based browser (if open point 3 applies).
5. Each popup still appears on top of whatever it opens over (stacking order unchanged).
6. `npm test` green for the touched suites, then full `npm test` (judge any `supertest` timeout by the known-flake
   rule and say so if re-run); `npm run lint` clean.
7. **Inside the Yandex iframe:** not checked locally — it stays open after close and is folded into the next live
   check of these popups (see *Notes*).

## Notes

- **Depends on:** `0417`
- **Blocks:** nothing
- **Scrollbar (2026-10-09, owner ruling *"Keep them in 0419"*):** the scrollbar item here should reuse [`0423`](../0423-dark-thin-scrollbar-in-every-game-window/brief.md)'s shared dark-scrollbar piece rather than copy the rules again.
- Related: `0417` (the same change for the citizenship explainer — the approach this reuses), `0301` (the explainer
  popup).
- **Shared files:** both HTML templates (`src/client/index.html` and `src/client/yandex-games_iframe.html`) host these
  popups, but this task changes only the components' own styles, so neither template should need an edit. If one
  does, update both.
- **Deploy:** ships in a later game deploy in the owner's **weekend slot** (ruling 2026-09-29) unless the owner says
  otherwise. Committed is not deployed; commit and deploy stay the owner's call.
- **Live check:** per the owner's build/verify split rule (2026-09-29), this task closes on the local evidence above.
  The look inside the real Yandex iframe stays open after close. **No verify task is filed** unless the owner asks.
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead` (ADR-021/037). ⛔ Not
  producer precedent.
