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

### Non-citizen login, owner's phone — 2026-10-09 (~09:00Z, owner working remotely, phone only)

The login that now opens the new non-citizen record (50 / 100 XP) — see "Earned test account — blocked" above. No
tester marker on the phone. ⛔ Buy not tapped.

| Item / bullet | Result | Evidence |
|---|---|---|
| Item 8 (a) — Buy visible without scrolling, real phone, inside Yandex Games, portrait | **pass** | owner, verbatim: *"1. Yes."* |
| Item 8 (a) — text matches 0421's table | **pass** | owner, verbatim: *"2. Приватные лобби is not shown (… correct, because the phone doesn't have the console tweak for private lobby testing)"* — correct by design: that line shows only when the private-lobby rule is on (tester marker or the everyone flag), as the brief's table says ("when enabled") |
| Item 5 — phone width: nothing clipped, no sideways scroll, "Закрыть" reachable | **pass** | owner, verbatim: *"3. Ok"* |
| Item 6 — flag-off, non-tester player: exactly two tabs (Мультиплеер, Одиночная), no empty third; each on one line at phone width | **pass** | owner, verbatim: *"4. Ok"* |
| Item 6 — three tabs at phone width (tester) | **moved** — run on the computer instead, see below | — |
| Item 8 — landscape (optional) | **pass — works; Buy and Close need a scroll in landscape, accepted by the owner** (no size target, owner ruling 2026-10-08) | owner, verbatim: *"Landscape popup works"*, then *"For landscape: buy and close are not visible without scroll, but that's ok"* |

### Tester tabs at phone width, computer — 2026-10-09

Paid account (has the tester marker), Chrome on the computer, DevTools phone view (Cmd+Shift+M, a phone preset such as
iPhone 12 Pro), page reloaded. Steps given: three tabs "Мультиплеер | Одиночная | Приватная", each on one line, no "…";
optional smaller ~360-wide phone; note if the third tab appears late.

| Item / bullet | Result | Evidence |
|---|---|---|
| Item 6 — tester: three tabs in order, each on one line at phone width | **pass** | owner, verbatim: *"Part A: all good."* |
| Item 6 — optional ~360-wide phone preset | **not recorded separately** — the owner's "all good" did not say whether it was run | — |
| Item 6 — third tab appearing late | **not reported** (the owner reported nothing unusual) | — |
| ⚠️ Method note | DevTools phone view on the computer, **not** a real phone | — |

### Item 1 — private lobby start, computer host + phone friend — 2026-10-09 (reported ~12:00Z)

Host: paid account (tester) on the computer, Chrome, Yandex Games. Friend: the non-citizen login on the owner's phone
(no tester marker). The friend joined through an invite link (this run also covers `0383` — see its worklog). Steps
given: Приватная → Create → invite link → open it on the phone → join → console filtered for `403` → host presses
"Начать игру" → friend leaves the match and returns to the menu.

| Item / bullet | Result | Evidence |
|---|---|---|
| Item 1 — host presses "Начать игру" → the match starts for both | **pass** | owner, verbatim: *"Part B: all good"* |
| Item 1 — console: no `403` on start, no "Не удалось начать игру" window | **pass** | same |
| Item 1 — game server log: create line carries the creator, no "creator not a citizen" refusal | **pass** — last 60 min: 1 private create line, 1 of 1 with the creator suffix, 0 "creator not a citizen" refusals | owner gave the OK in-session (~12:05Z); the coordinating session's own SSH login was refused, so the owner ran a read-only count command on the game server and pasted the three counts (counts only — no log line, id or lobby code) |
| Start time | **not recorded** — the owner did not give it | — |

ℹ️ Seen by the owner, outside this checklist: after leaving the running match, opening the **same** invite link again
put the friend **back into that private match**, with a fast-forward replay to catch up with the host. Owner,
verbatim: *"the player joins the private lobby again and sees the "fast forward" history of the match, to catch up
with the host"*. Recorded as an observation, not a fail.

### Item 7 (B) — error-window copy

**Not checked live** — by OWNER RULING 2026-10-08 ("Mark 'not checked live'"); no error window appeared on its own
during this run. The Yandex SDK copy path stays unproven. Never recorded as passed.

### Still to run
- ~~Item 8 (a) non-citizen on a phone; item 6 non-tester (2 tabs); items 5 and 6 at phone width~~ (done 2026-10-09, above). Item 7 (A) on a phone: not run (optional — not required by the brief).
- ~~Item 1 — private lobby start and the read-only game-log check~~ (done 2026-10-09, above).
- Item 7 (B) — record **not checked live** (owner ruling 2026-10-08), unless an error window appears on its own.
