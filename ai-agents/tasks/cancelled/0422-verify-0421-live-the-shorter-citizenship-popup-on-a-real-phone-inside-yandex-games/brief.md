# Verify 0421 live: the shorter citizenship popup on a real phone inside Yandex Games

## ID
0422

> ℹ️ **ID allocation, checked 2026-10-09 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), base-10 forced). Highest across
> `backlog/`, `done/` and `cancelled/` before this run: `0421` (folder names and `## ID` fields agree). `0422`: no task
> folder, no `## ID` hit, no board hit (one unrelated hit — a git blob hash inside `0355`'s worklog).

## Sprint
Sprint 8

## Priority
19

> ⚠️ **Priority 19 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0420`, in the top group of [Sprint 8](../../../sprints/plan-sprint-8.md)**,
> because the owner's standing build/verify-split rule (2026-09-29) puts a verify task at the top of the next sprint,
> and `0420` checks the same popup with the same test accounts, so the two are best run in one sitting.
> **Where it sits, and why not higher:** ADR-035 — a new row always appends; it is never inserted, because closed rows
> sit below the top of this board (`0373` ➡️, `0363` ✅, `0358` ✅, `0392`–`0404` ➡️) and closed rows are never
> renumbered, *"not even under an owner ruling"*. Appended after the board's highest (18, `0420`) — which is in fact
> directly below `0420`. **Read it as the top group**, the same reading the board gives `0420`.

## Status
⛔ Cancelled (agent-closed — not owner-verified) (2026-10-09) — Merged into 0420 by owner ruling 2026-10-09 ('Fold into 0420')

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, inside the Yandex Games shell, on a real phone, on his own test
accounts. No agent can do the looking.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0420`.)*

## Context

**What this is, in plain terms.** [`0421`](../../done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md)
shortened the text of the "Что такое гражданство?" popup so that on a phone the Buy button shows without scrolling. It
was built, committed and deployed (game `0.0.161`, owner-run deploy, 2026-10-09). It closed on **local** evidence only:
on the Yandex Games page served locally, at 390 × 844 and 360 × 640, ru + en, non-citizen and earned-citizen cases —
no scroll, Buy and Close visible. **Never checked:** the popup on the live site, a real phone, inside the real Yandex
frame (Yandex's own bars take some of the screen), landscape. This task is that live check — the owner's
build/verify-split rule (2026-09-29): the build task closes, its verify task goes at the top of the next sprint.

**Authority for filing.** `0421`'s brief, *Notes → Live check*: the live check on a real phone inside Yandex Games
becomes a verify task filed at close and does not block the deploy — a plan the owner approved in the coordinating
session. Filed at `0421`'s close by a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer
precedent.

**There is no size target.** OWNER RULING 2026-10-08 (in `0421`): *"Don't expect any size, we're just trying to make
the text as small as possible, while preserving the meaning."* So "Buy visible without scrolling" is **recorded**, and
a "no" is worth knowing — but it is not a failure of `0421`, and it does not reopen it. A "no" goes back to the owner
as a question (see *Verification steps*).

**Overlap with [`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
— read before running.** `0420` items 2, 3 and 5 look at the same popup (its text, the earned account's Buy button, the
phone width), and items 2 and 5 were updated to `0421`'s text on 2026-10-09. What only this task asks: a **real phone**,
**Buy visible without scrolling**, the **"get it free" line absent for citizens**. The two can be run in one sitting
with the same accounts. Whether to fold this task into `0420` instead is an open question for the owner (see *Notes*).

**⛔ No real purchase anywhere in this task.** On the earned test account, **never tap Buy** — a purchase would turn it
paid for good, and it is the earned-citizen test account (`0401`).

### The text to expect (ru) — `0421`'s approved text, as live in `0.0.161`

| Line | Non-citizen (Buy) | Earned citizen, not paid | Paid citizen |
|---|---|---|---|
| Title | Что такое гражданство? | same | same |
| List (no heading above it) | Значок ★ рядом с именем в матчах · Смена имени · Приватные лобби *(only where private lobbies are enabled)* | same | same |
| Sub-heading, then one line | Только с платным гражданством: · Без рекламы между уровнями | same | same |
| Free line | **Получите бесплатно за 100 XP** | **not shown** | **not shown** |
| XP line | У вас N / 100 XP. | not shown | not shown |
| Below | **Buy button** "Купить гражданство — <price>" | Вы уже гражданин. · Платное гражданство · button **"Купить платное гражданство — <price>"** | Вы уже гражданин. — **no Buy button** |
| Last | Закрыть | Закрыть | Закрыть |

**Gone** (must not appear): an intro paragraph, the headings "Что получают граждане" / "Граждане получают:",
"Как получить бесплатно" and "Или купите сразу".

## What to build

Nothing is built. The owner opens the deployed game inside the Yandex Games shell **on a real phone**, in **ru**,
**portrait**, opens the citizenship popup in each case below, and records the results in `worklog.md` in this folder.

**Before starting, record:** date, UTC time, deployed game version (expected `0.0.161` or later), the phone model and
browser (or the Yandex app), and which test accounts are used — **described by role only** (non-citizen / earned
citizen / paid citizen), never an id.

**Check (a) — non-citizen (a non-citizen account with a product to buy):**
1. The popup opens with **no scrolling needed to see the Buy button** — the whole button visible on the first screen.
   Record yes / no.
2. "Закрыть" visible without scrolling. Record yes / no.
3. The text matches the *Non-citizen* column above, line by line, and none of the *Gone* lines appear. Record yes / no,
   and if no, which line differs (words only — no screenshot with ids in it).

**Check (b) — earned test account, verified session (the card's status line shows the session is confirmed):**
1. **No** "Получите бесплатно за 100 XP" line. Record yes / no.
2. "Вы уже гражданин.", the "Платное гражданство" heading and the button **"Купить платное гражданство — <price>"** are
   all visible without scrolling, with "Закрыть" below. Record yes / no.
3. ⛔ **Do not tap the Buy button.** Record that it was not tapped (yes / no), and that the account is still earned
   (not paid) afterwards.

**Check (c) — paid test account, verified session:**
1. **No** "Получите бесплатно" line, and **no** Buy button. Record yes / no.
2. Text otherwise matches the *Paid citizen* column. Record yes / no.

**Optional — landscape:** turn the phone sideways in check (a) and record whether the popup scrolls and whether Buy is
reachable by scrolling. Write **not run** if skipped — that is allowed. Scrolling in landscape is expected and is not a
failure (`0421` open point 3).

## Verification steps

1. `worklog.md` records date, UTC time, game version, phone model + browser/app, and accounts **by role only**.
2. Every numbered step of checks (a), (b) and (c) is recorded **pass**, **fail** or **not run**, with who ran it and
   when, in the owner's words. A step not run is written **not run**, never passed. Landscape: a result or **not run**.
3. Check (b) records explicitly that **Buy was not tapped** and the earned account is still earned afterwards.
4. **If check (a)1 is "no"** (Buy not visible without scrolling on a real phone): record by how much, roughly (e.g.
   "half the button hidden"), and put it to the owner as a question — shorten again, or accept. There is no size
   target (owner ruling 2026-10-08), so this is **not** a failure of `0421` and `0421` is not reopened.
5. **If any text check fails** (a line differs from `0421`'s approved text, a *Gone* line is back, the free line shows
   to a citizen, or a Buy button shows to the paid account): file a new task with the readings and point this worklog
   at it; do not reopen `0421` silently. This task still closes, with the failure recorded.
6. **No secret leaks:** no player id, Yandex id, client id, token, host, IP, full URL or screenshot carrying any of
   those in any artifact — yes/no, counts, dates and times only.

## Notes

- **Depends on:** [`0421`](../../done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md)
  — built, deployed in game `0.0.161` (2026-10-09).
- **Blocks:** nothing. It does not block any deploy (owner's build/verify-split rule, 2026-09-29).
- Related: [`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
  (items 2, 3 and 5 — same popup, same accounts; run together if convenient), `0409` (the earned account's Buy button),
  `0401` (the earned test account must stay earned).
- ❓ **OPEN QUESTION for the owner — keep this task separate, or fold it into `0420`?** The producer judges folding is
  slightly better on merit (one checklist, one sitting, the same accounts and popup), but did **not** fold it: `0420`
  was ruled by the owner as a checklist for seven named tasks, and changing its scope is the owner's call. If the owner
  says fold: the checks above are added to `0420` as a new item, and this task is cancelled via `/fkit-task-cancelled`
  pointing at `0420`. Until then, this task stands.
- Filed 2026-10-09 by a spawned `fkit-producer` at `0421`'s close (ADR-021/037). ⛔ Not producer precedent.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
