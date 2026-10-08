# Citizenship explainer popup: use more width on larger screens

## ID
0417

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree) is `0416`, so this is `0417`.

## Sprint
Sprint 7

## Priority
63

⚠️ Priority 63 is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0409`**, because it edits the same popup file as `0408` and `0409` and is best
built right after them so the three changes do not collide; it blocks nothing and carries no same-day deploy intent.
(ADR-035: appended after [Sprint 7](../../../sprints/plan-sprint-7.md)'s highest, 62 (`0416`). The owner named the
sprint, not a rank.)

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### The request — the owner's words

Owner, 2026-10-08, typed live in the `fkit lead` session with a desktop screenshot of the **"Что такое гражданство?"**
explainer popup inside Yandex Games (game `0.0.157`), relayed by `fkit-lead` to a spawned `fkit-producer` (no owner
channel; ADR-021/037). Verbatim:

> *"the popup is shown and it's ok, but I think we can use more space by width (depending on the screen, ofc). Right now
> on desktop it looks like it still uses the same width as mobile. Brief a task for that and add it to the current
> sprint."*

### What the screenshot shows (lead's description)

- On a wide desktop screen the popup is a **narrow column, about phone width**, centred over the start screen. Text
  wraps into short lines and the content needs a **vertical scrollbar**, even though there is lots of room left and
  right.
- **Observation, not part of the owner's request:** the popup's scrollbar track renders **light/white** against the
  dark popup. See open point 3.

The popup is the citizenship explainer from
[`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md), live since the 2026-10-08 game
deploy `0.0.157`. It was found while [`0401`](../../done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md)
(the popup's live check) was running its check 3.

### Where to start looking — a pointer, not a diagnosis

The lead did not investigate the CSS; the owner asked for code-level digging to be delegated. The producer glanced at
the file only to scope this brief. **The coder confirms before changing anything.**

- `src/client/CitizenshipExplainerModal.ts` carries its **own** styles (a standalone LitElement, following the
  `GameStartingModal` pattern). Its popup box appears to have a **fixed width of 360 px** (capped at 90% of the screen
  width) and a height cap of 90% of the screen with vertical scrolling. If that holds, the fixed width is what keeps it
  phone-sized on desktop.
- It does **not** appear to extend a shared base modal component, so a change here may not affect other modals at all.
  The coder confirms this — it decides how much open point 2 matters.
- No scrollbar styling appears in that file, so the light track is likely the browser's default scrollbar.
  **Likely, not proven.**

### Dependencies and conflicts

- **None blocking.** `0301` (the popup) is built and closed.
- [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md)
  and [`0409`](../../done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md)
  (both Sprint 7) change this same popup's content and render. **Sequence with them** — build this after they land, or
  rebase onto them — to avoid edit conflicts in the same file. No hard dependency: this task does not wait on them.
- `0408` and `0409` may ship in a same-day deploy by owner ruling; **this task is not covered by that exception** (see
  *Notes → Deploy*).

## What to build

A small, client-only layout change to the explainer popup.

1. **Find what limits the popup's width today** (see the pointer above) and record it in the plan.
2. **Let the popup use more width on larger screens**, responsively: on tablet and desktop it grows wider than today;
   on a phone (about 360 px wide) it looks and behaves as it does now — full content visible, nothing clipped, no
   sideways scroll.
3. **Cap it at a comfortable reading width**, not full screen (see open point 1). Wider should mean fewer wrapped lines
   and less vertical scrolling, not lines so long they are hard to read.
4. Everything inside keeps working at every width: headings, the benefit lists (including `0408`'s sub-heading and
   `0409`'s buy button if they have landed), the purchase and login buttons, the close button, and the
   private-lobby benefit line's existing show/hide rule.
5. The popup still sits **above** the Instructions window it can be opened from (its stacking order is unchanged).
6. No text changes. If any text is touched by accident, both `resources/lang/en.json` and `resources/lang/ru.json`
   stay in sync.
7. Keep or extend the existing popup tests (`tests/client/CitizenshipExplainerModal.test.ts`) so they still pass; a
   width rule is mostly a visual check (below), so no test is required for the width itself unless the coder finds a
   cheap, meaningful one.

### Open points — the owner confirms these at the coder's plan gate (NOT decided here)

The producer recommends; the owner decides. Put these to the owner in plain words before building.

1. **Target maximum width on desktop.** **Recommendation:** a comfortable reading width of roughly **560–640 px**
   (about 1.5–1.8× today's), still capped by the screen width minus a margin on small screens. Tradeoff: wider than
   that makes lines long and harder to read; narrower leaves the "phone box on desktop" look the owner flagged. The
   coder may propose a specific number with a before/after screenshot.
2. **Same change for other modals?** **Recommendation: no — scope stays this popup only.** The popup appears to have its
   own styles (coder confirms), so other modals are untouched unless the owner asks. If the owner wants a wider look
   app-wide, that is a separate task.
3. **The light scrollbar observation.** Not in the owner's request. **Recommendation: fix it here** — a dark scrollbar
   matching the popup is a few lines in the same file, the popup is being restyled anyway, and on desktop a wider popup
   may need less scrolling but can still scroll. Tradeoff: slightly widens this task's scope; the owner may prefer to
   leave it. If not fixed here, record it in the worklog as an unfixed observation.

## Verification steps

1. **Plan gate:** the coder's plan names what limited the width, and records the owner's answers to open points 1–3
   (who, date, channel, words) before building.
2. **Visual check, local dev (`npm run dev`)**, in both **ru** and **en**, at three widths — **phone ~360 px**,
   **tablet ~768 px**, **desktop ≥1280 px**:
   - phone: the popup looks as it does today — nothing clipped, no sideways scroll, the close button reachable;
   - tablet and desktop: the popup is visibly wider than today, up to the owner-confirmed cap, and never wider than the
     screen;
   - at every width: all headings, lists and buttons fully visible and not overlapping; the popup still scrolls when
     its content is taller than the screen.
   Screenshots (or a written yes/no per case) in the worklog.
3. If open point 3 is taken: the scrollbar is dark against the popup at desktop width (where a scrollbar shows), in
   at least one Chromium-based browser; if another browser shows the default, say so in the worklog.
4. Opening the popup from the Instructions window still shows it on top.
5. `npm test` green for the touched suites; `npm run lint` clean.
6. **Inside the Yandex iframe:** checked on the live game after a later deploy (see *Notes → Deploy*). The iframe may be
   narrower than the browser window, so the live look is what proves "uses more width" for real players.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0301` (the popup), `0408` and `0409` (same popup, Sprint 7 — sequence with them, no hard dependency),
  `0401` (the popup's live check; its check 3 was being run when this was found — not changed by this task).
- **Deploy:** ships in a later game deploy, in the owner's **weekend slot** (ruling 2026-09-29) unless the owner says
  otherwise. The 2026-10-08 same-day exception covers only `0407`–`0409` and `0416`, **not this task**. Committed is not
  deployed; commit and deploy stay the owner's call.
- **Live check:** per the owner's build/verify split rule (2026-09-29), this task closes on the local evidence above.
  The look inside the real Yandex iframe stays **open** after close — fold it into the next popup live check. **No
  verify task is filed.**
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
  precedent.
