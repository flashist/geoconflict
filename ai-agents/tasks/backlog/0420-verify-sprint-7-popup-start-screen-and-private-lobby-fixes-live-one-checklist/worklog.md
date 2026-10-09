# Worklog — 0420 Verify Sprint 7 fixes live (one checklist)

## Run 1 — 2026-10-09, single pass (all tasks shipped)

- **When:** 2026-10-09, ~08:00Z (owner's screenshots at 11:00 MSK).
- **Deployed game version:** `0.0.161` (shown on the start screen in the owner's screenshots). It carries all 8 tasks
  of this checklist: `0416`, `0408`, `0409`, `0407`, `0417`, `0412`, `0413` (shipped in `0.0.160`) and `0421` (shipped
  in `0.0.161`). So the two passes run as one.
- **Who ran it:** the owner. Results relayed by the coordinating Claude Code session, which grouped the steps by
  account (its "steps 1–13"); each line below names the checklist item and bullet.
- **Accounts:** paid citizen (computer, Yandex Games, Chrome) so far.

### Paid account, computer — 2026-10-09 ~08:00Z

Owner, verbatim: *"Regarding 1-2 everything looks good (scrollbar works the way you described it)"*, with two
screenshots (start screen; popup open). Steps 1–2 = items 4 and 2/5 below.

| Item / bullet | Result | Evidence |
|---|---|---|
| Item 4 — paid account: the thank-you line, exactly "Спасибо, что поддерживаете игру! Преимущества платного гражданства включены.", one line, status-line style, no ✓ | **pass** | owner's words + screenshot |
| Item 2 — popup list (0421 text): no heading; "Значок ★ рядом с именем в матчах", "Смена имени", "Приватные лобби"; then "Только с платным гражданством:" and "Без рекламы между уровнями" | **pass** | owner's words + screenshot |
| Item 2 — fully visible, not clipped or overlapping | **pass** | owner's words + screenshot |
| Item 5 — desktop: popup visibly wider (up to 600 px), nothing overlaps | **pass** | owner's words + screenshot |
| Item 5 — scrollbar dark and thin when the popup scrolls | **pass** | owner, verbatim: *"scrollbar works the way you described it"* |
| Item 3 (b) / Item 8 (c) — paid account: no Buy button and no "Получите бесплатно" line; reads "Вы уже гражданин." then "Закрыть" | **pass** (seen in the owner's screenshot; the owner reported steps 1–2, not this step by name) | screenshot |
| Item 6 — three tabs "Мультиплеер \| Одиночная \| Приватная", in that order (computer) | **pass** (order seen in the owner's screenshot) | screenshot |
| Item 6 — hover Create / Join → no tooltip | **pass** (2026-10-09 ~08:03Z) | owner, verbatim: *"There are no tooltip over the buttons on the PRIVATE tab"* |
| Item 7 (A) — join window: no paste button | **pass** (2026-10-09 ~08:03Z) | owner's screenshot of the open join window |
| Item 7 (A) — hint "Вставьте ID: Ctrl+V / ⌘V или долгое нажатие" under the ID box | **pass** | owner's screenshot |
| Item 7 (A) — no `NotAllowedError` from `pasteFromClipboard` in the console | **pass** (2026-10-09 ~08:15Z) | console cleared, join window opened, filter `NotAllowed`; owner, verbatim: *"nothing is shown there"* |
| Item 7 (A) — if a paste button shows, press it once | **not applicable** — no paste button showed | — |
| ⚠️ Found while checking (outside this checklist's items): the join window's **"Присоединиться к лобби" button shows a native browser tooltip** on hover ("Присоединиться к лобби"). Owner, verbatim: *"there are tooltips when I hover over the button in the popup … Brief a task for that, and put it to the Sprint 8"*. Not a fail of item 6 (that item covers the two start-screen rows only). | **new task filed** on Sprint 8 (see the board) | owner's screenshot |
| Item 5 — phone width; Item 6 — tabs on phone | **not run yet** | — |

### Earned test account — blocked (2026-10-09)

- Step 0 (does the earned test account still open the earned record?) could **not** be run: owner, verbatim, *"The
  "private/incognito" mode doesn't work properly with Yandex.Games auth interfaces, I tested them."* On 2026-10-08 that
  login already opened a **new, non-citizen** record (Yandex returned a different user id; owner ruled: accept the
  incident, main theory = Yandex-side id change; deferred investigation briefed to the Backlog).
- So items **3 (a)**, **8 (b)** and the earned part of **item 4** are **not run — blocked**: there is no working
  earned-citizen test account right now. Never recorded as passed. They can run if an earned test account is available
  again. (The code for these cases was checked locally on 2026-10-09 — see `0421`'s worklog — but that is not a live
  check.)
- ℹ️ The login that now opens the new non-citizen record (50 / 100 XP) can serve as the **non-citizen** account for
  item 8 (a). ⛔ Still never tap Buy on it.

### Still to run
- Item 8 (a) non-citizen on a phone; item 6 non-tester (2 tabs).
- Item 1 — private lobby start (paid host + second account), then the read-only game-log check (needs the owner's OK).
- Item 7 (B) — record **not checked live** (owner ruling 2026-10-08), unless an error window appears on its own.
