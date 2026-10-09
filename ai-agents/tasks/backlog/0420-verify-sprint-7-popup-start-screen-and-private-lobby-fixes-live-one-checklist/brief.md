# Verify Sprint 7's popup, start-screen and private-lobby fixes live — one checklist for 0416, 0408, 0409, 0407, 0417, 0412, 0413

## ID
0420

> ℹ️ **ID allocation, checked 2026-10-08 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0419` (folder names and `## ID` fields agree). `0420`: no task folder, no
> `## ID` hit, no board hit.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-08, given live via `AskUserQuestion` in the `fkit lead` session** (end of a
> `/fkit-sprint-ship-loop` run on Sprint 7), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ **not producer precedent.** The ruling: file **one** verify task — a single live-check checklist —
> **at the top of Sprint 8**, per the owner's standing build/verify-split rule (2026-09-29: the build task closes, its
> verify task goes on top of the next sprint and does not block the current sprint's deploy). `0382` is **not**
> included — its live check is the existing task
> [`0383`](../0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md).

## Priority
18

> ⚠️ **Priority 18 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs at the very top of [Sprint 8](../../../sprints/plan-sprint-8.md), directly beside `0370`**,
> because the owner ruled "top of Sprint 8" and his standing build/verify-split rule puts verify tasks there.
> **Not placed there, and why:** inserting a new row at the top would renumber every row below it, and that board holds
> closed rows below the top (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done, and `0392`–`0404` ➡️ Moved). ADR-035: closed
> rows are never renumbered, *"not even under an owner ruling"*, and a new row always appends — insertion is never the
> exception's to grant. Appended after the board's highest (17, `0418`). **Read it as the top group** — the same
> reading the board already gives `0396`/`0398`. An owner re-rank can lift it at most to the top of the open run it
> sits in (rank 15, above `0405`); the true top is out of reach under ADR-035.
>
> ✅ **Confirmed 2026-10-08 — OWNER RULING "Keep rank 18"** (the owner's own selection, live via `AskUserQuestion` in the
> `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent): no re-rank; read it as the top group.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, inside the Yandex Games shell, on his own test accounts, after
the game deploy(s). No agent can do the looking or the tapping. One read-only check (item 1's game-log line) may be
run by an agent session that has access, **with the owner's OK in-session** (production read).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0376` /
`0418`.)*

## Context

**What this is, in plain terms.** Seven Sprint 7 build tasks closed on local evidence (tests, local browser checks).
Each one left its **live** check open, to be done after a deploy, per the owner's build/verify-split rule (2026-09-29).
The owner ruled (2026-10-08, above) that those seven live checks go into **one** checklist here instead of seven tasks.
Every check below is copied from that task's own brief, plan or worklog — none is invented here.

**⛔ No real purchase anywhere in this task.** Item 3 is look-only: **never tap Buy** on the earned test account — a
purchase would turn it paid for good, and that account is the earned-citizen test account (`0401`).

**Deploy timing — so the checklist may run in two passes:**

| Pass | Tasks | When they ship |
|---|---|---|
| **Pass 1** | `0416`, `0408`, `0409`, `0407` | Cleared for a **same-day** deploy (OWNER RULING 2026-10-08 — *"might"*, not a commitment) |
| **Pass 2** | `0417`, `0412`, `0413` | The **weekend slot** (owner rule 2026-09-29) |

If all seven ship together, run everything in one pass. If pass 1 happens first, run items 1–4 then and items 5–7
after the weekend deploy. After pass 2 ships `0417`, glance at the popup once more (item 5) — `0417` changes the width
that items 2–3 were looked at in.

**How each item overlaps existing tasks (checked 2026-10-08):**
- **`0416` vs [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
  and [`0401`](../../done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md) check 4 — not
  covered, so it stays here.** `0376` step 4 (*"the host starts the match"*) would exercise the fix, but `0376` does
  not look for the 403 in the console or read the game log's create line, it needs a second person inside Yandex, and
  it is still `🔲 Backlog` on the Backlog board. `0401` check 4 is the **locked tap** for a non-citizen tester — it
  never starts a lobby — and `0401` is already ✅ Done (check 4 passed live). Item 1 is the owner alone with two
  accounts, as when the bug was found.
- **`0412`'s note for `0401` check 4 ("open the Приватная tab first") is moot for `0401`** — that task is closed and
  its check 4 already passed. It **does** apply to anyone who repeats that locked tap, and to `0376` steps 2–4: after
  `0412` ships, "Создать лобби" and "Присоединиться к лобби" live under the **Приватная** tab, not under Мультиплеер. ⚠️ `0376`'s
  brief still describes the old place — flagged, **not edited** (out of this filing's scope).
- **`0407` replaces `0397`'s "verified paid" status-line text** (owner ruling 2026-10-08, `0407` worklog: *"this ruling
  replaces the `0397` wording"*). `0400` (live check of `0397`) is ✅ Done, so nothing reopens; the old line is simply
  expected to be gone.

## What to build

Nothing is built. The owner runs the checklist below inside the Yandex Games shell on the deployed game and records
each item in `worklog.md` in this folder.

**Before starting each pass, record:** date, UTC time, the deployed game version, which tasks that deploy carried,
and which test accounts are used — **described by role only** (paid citizen / earned citizen / non-tester), never an id.

### Pass 1 — `0416`, `0408`, `0409`, `0407`

**Item 1 — `0416`: a private lobby starts (no 403).** *(Source: `0416` brief, Verification step 5; worklog § Live check.)*
- A **citizen** host (the paid account) plus a **second account** in the same private lobby. The host presses
  **"Начать игру"** → the match starts for both. *(After pass 2: Create/Join are under the **Приватная** tab — see item 6.)*
- Browser console: **no** `403` on `…/api/start_game/…`, and **no** "Не удалось начать игру. Попробуйте ещё раз." window.
- Game server log (read-only): the **create** line for that lobby ends with **`, creator: …`** again (before the fix it
  read `creating Private game with id <code>` with no suffix), and there is **no** `refused to start private lobby …:
  creator not a citizen` line for it. **Record yes/no only — never paste the line**: it carries a client id and the
  lobby code.

**Item 2 — `0408`: paid-only perk under its own sub-heading.** *(Source: `0408` brief, Verification steps 3 and 7;
worklog § Plan gate. Text as changed by [`0421`](../../done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md), live in game `0.0.161`.)*

> ✏️ **UPDATED 2026-10-09 — by OWNER RULING *"Update 0420 after build (Recommended)"*** (the owner's own selection,
> live via `AskUserQuestion` in the coordinating session, 2026-10-08, recorded in `0421`'s brief, open point 4: once
> `0421` is built, the producer updates this task's items 2 and 5). Applied by a spawned `fkit-producer` with no owner
> channel (ADR-021/037) after `0421` was built and deployed (game `0.0.161`, 2026-10-09). ⛔ Not producer precedent.
> `0421` shortened the popup text, so the expectations below are now `0421`'s approved text. The old expectations are
> kept struck through as history.

Open the citizenship explainer popup (any state — the block renders in every state):
- ~~The **"Что получают граждане"** list holds badge, name change and (when enabled) private lobby — **and not** the
  ad-free line.~~
- ~~Directly under it: the sub-heading **"Только для платного гражданства:"**, and under that the line
  **"Без полноэкранной рекламы перед матчами и после них"** (the old "только для купленного…" suffix is gone).~~
- Directly under the title **"Что такое гражданство?"**, with **no heading** above it (no intro paragraph, no
  "Что получают граждане" / "Граждане получают:" heading — `0421` removed both), a list holds
  **"Значок ★ рядом с именем в матчах"**, **"Смена имени"** and (when enabled) **"Приватные лобби"** — **and not** the
  ad-free line.
- Directly under it: the sub-heading **"Только с платным гражданством:"**, and under that the line
  **"Без рекламы между уровнями"**.
- Fully visible, not clipped or overlapping, inside the Yandex iframe.

**Item 3 — `0409`: Buy button for earned citizens who have not paid — LOOK ONLY.** *(Source: `0409` brief, Verification
step 6; worklog § Not done here — *"never tapping Buy there (Q9)"*.)*
- **(a) Earned test account, verified session** (the card's status line shows the session is confirmed): open the
  popup. It reads **"Вы уже гражданин."**, a **"Платное гражданство"** heading, and a button
  **"Купить платное гражданство — <price>"** sitting **above "Закрыть"**, styled like the popup's login button (blue).
  ⛔ **Do not tap it.**
- **(b) Paid test account, verified session:** the popup shows **no** such Buy button.
- **(c) Optional, only if it happens naturally:** an earned account on an **unverified** session shows **no** Buy
  button (the double-charge guard). Not required; write *not run* if not seen.

**Item 4 — `0407`: thank-you line for paid citizens.** *(Source: `0407` brief, Verification step 5; worklog § Owner
answers — placement "A: One line, no ✓", wording, look "Same as status lines".)*
- **Paid account, verified session:** the start-screen citizenship card shows, under the XP bar, exactly
  **"Спасибо, что поддерживаете игру! Преимущества платного гражданства включены."** — one line in the status-line
  style, **no ✓**; `0397`'s old "verified paid" wording is no longer shown.
- **Earned-only account (verified session):** that line is **not** shown.

### Pass 2 — `0417`, `0412`, `0413`

**Item 5 — `0417`: the explainer popup uses more width.** *(Source: `0417` brief, Verification steps 2, 3 and 6;
worklog § owner answers Q1 "600 px", Q3 "Yes, fix it here", and § Not done here.)*
- **Desktop and tablet:** the popup is visibly wider than before — up to **600 px**, never wider than the screen or the
  iframe. Headings, lists and buttons fully visible; nothing overlaps.
- ~~**Phone width:** looks as before — nothing clipped, no sideways scroll, "Закрыть" reachable.~~
- **Phone width:** the same width rule as before, but the popup is now **shorter** — `0421` (game `0.0.161`) cut its
  text. Nothing clipped, no sideways scroll, "Закрыть" reachable. *(✏️ Updated 2026-10-09 by the same OWNER RULING
  *"Update 0420 after build (Recommended)"* as item 2 — see the note there. Whether the Buy button now shows without
  scrolling on a real phone is `0421`'s own live check, **item 8** below (first filed as `0422`, then folded in here by
  owner ruling *"Fold into 0420"*, 2026-10-09), not this item.)*
- When the popup scrolls (short window), its scrollbar is **dark and thin**, not the light default (Chromium-based
  browser; Firefox not in scope).
- All of it **inside the Yandex iframe**, which may be narrower than the browser window — that is what proves the
  wider popup reaches real players. Glance once more at items 2–3's text at the new width.

**Item 6 — `0412`: the Приватная tab.** *(Source: `0412` brief, Verification steps 8 and 9; worklog § owner answers
Q1 "Private last".)* The tab shows only when citizenship surfaces are on **and** (the tester marker **or** the
`private_lobbies_all` flag) — the same rule as the old private-lobby row.
- **Tester / flag-on player:** three tabs **"Мультиплеер | Одиночная | Приватная"**, in that order, each on one line
  at **phone width** too (only ~2 px spare for "Мультиплеер" in the local check — watch for wrapping or "…").
  "Приватная" holds Create and Join.
- **Flag-off, non-tester player:** exactly **two** tabs, never an empty third.
- **Hover** Create and Join → **no** browser tooltip on either.
- The third tab may appear a moment after load (the rule resolves after platform init) — note it if it jumps.

**Item 7 — `0413`: join window without a paste button; error-window copy.** *(Source: `0413` brief, Verification step 7;
worklog § Unverified until live.)*
- **(A) Join window, inside the Yandex iframe:** open it → **no** paste button, and under the ID box the hint
  **"Вставьте ID: Ctrl+V / ⌘V или долгое нажатие"**; **no** `NotAllowedError` from `pasteFromClipboard` in the console.
  *If a paste button does show* (the real iframe did not report clipboard-read as blocked — unverified locally): press
  it once → it should fail into the hint and the button should disappear. Record which of the two happened.
- **(B) Error window copy — ⛔ NOT CHECKED LIVE, by OWNER RULING (2026-10-08).** Record this item as **not checked
  live** — never as passed. There is no safe way to bring up the error window in production: the game shows it only on
  real faults, and the coder's local method (reaching `showErrorModal` through the dev build's module cache) does not
  exist in a production build. **The Yandex SDK copy path stays unproven** (only the browser fallback ran, locally).
  - **Authority:** the owner's own selection, **"Mark 'not checked live'"**, given live via `AskUserQuestion` in the
    `fkit lead` session on 2026-10-08, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
    (ADR-021/037); ⛔ not producer precedent.
  - **Only if an error window appears on its own** while the owner is playing, he may check it then: press **copy** →
    the button reads **"Скопировано!"**, the window's text is on the clipboard, and the console shows
    `FlashistFacade | copyText | copied via the Yandex SDK`. Never force one.
  - **Privacy:** that text carries a game id and a client id — **never paste the copied text anywhere** (not chat, a
    worklog, a brief or any tool). To confirm it arrived, record yes/no only.

### Item 8 — `0421`: the shorter popup on a real phone (deployed in game `0.0.161`, 2026-10-09)

> ➕ **ADDED 2026-10-09 — by OWNER RULING *"Fold into 0420 (Recommended)"*** (the owner's own selection, live via
> `AskUserQuestion` in the coordinating session, 2026-10-09; option text: *"One checklist, one sitting. The producer
> adds 0422's three checks to 0420 as a new item and cancels 0422 with a pointer to 0420."*). Relayed to a spawned
> `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent.
> **Outcome:** `0421`'s live check — first filed as its own verify task `0422` at `0421`'s close (owner's
> build/verify-split rule, 2026-09-29) — is this item; `0422` is cancelled with a pointer here. The other seven items
> are unchanged by this addition.

*(Source: [`0421`](../../done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md) — approved-text table in its brief, *Notes → Live check*; worklog §
Deployed.)* `0421` closed on **local** checks only (Yandex Games page served locally, 390 × 844 and 360 × 640: no
scroll, Buy and Close visible). This item is the first look on a **real phone**, inside the real Yandex frame (Yandex's
own bars take some of the screen). Run it in **ru**, **portrait**. Record the phone model and browser (or the Yandex
app) — no ids.

**There is no size target** (OWNER RULING 2026-10-08, in `0421`: *"Don't expect any size, we're just trying to make the
text as small as possible, while preserving the meaning."*). A "Buy not visible without scrolling" result is a
**question for the owner** (shorten again, or accept) — **not a failure**, and `0421` is not reopened for it.

The text to expect (ru) — `0421`'s approved text, as live in `0.0.161`:

| Line | Non-citizen (Buy) | Earned citizen, not paid | Paid citizen |
|---|---|---|---|
| Title | Что такое гражданство? | same | same |
| List (no heading above it) | Значок ★ рядом с именем в матчах · Смена имени · Приватные лобби *(only where private lobbies are enabled)* | same | same |
| Sub-heading, then one line | Только с платным гражданством: · Без рекламы между уровнями | same | same |
| Free line | **Получите бесплатно за 100 XP** | **not shown** | **not shown** |
| XP line | У вас N / 100 XP. | not shown | not shown |
| Below | **Buy button** "Купить гражданство — <price>" | Вы уже гражданин. · Платное гражданство · button **"Купить платное гражданство — <price>"** | Вы уже гражданин. — **no Buy button** |
| Last | Закрыть | Закрыть | Закрыть |

**Gone** (must not appear): an intro paragraph, the headings "Что получают граждане" / "Граждане получают:", "Как
получить бесплатно" and "Или купите сразу".

- **(a) Non-citizen** (with a product to buy): the whole **Buy button is visible without scrolling** (yes / no — if no,
  roughly how much is hidden); "Закрыть" visible without scrolling (yes / no); the text matches the *Non-citizen*
  column line by line and no *Gone* line appears (yes / no — if no, which line, in words).
- **(b) Earned test account, verified session:** **no** "Получите бесплатно за 100 XP" line; "Вы уже гражданин.", the
  "Платное гражданство" heading and the button **"Купить платное гражданство — <price>"** visible without scrolling,
  with "Закрыть" below. ⛔ **Do not tap the Buy button** — record that it was not tapped and that the account is still
  earned afterwards. *(Same account and same popup as item 3 — run them together.)*
- **(c) Paid test account, verified session:** **no** "Получите бесплатно" line and **no** Buy button; the rest matches
  the *Paid citizen* column.
- **Optional — landscape:** turn the phone sideways in (a); record whether the popup scrolls and whether Buy is
  reachable by scrolling. **Not run** is allowed. Scrolling in landscape is expected and is not a failure.

## Verification steps

1. `worklog.md` records, per pass: date, UTC time, deployed version, which tasks the deploy carried, accounts by role.
2. **Every item's every bullet is recorded pass or fail, with who ran it and when (date + UTC time)**, in the owner's
   words. A bullet not run is written **not run**, never passed. If items run in two passes, each item records the pass
   it ran in.
3. Item 3 records explicitly that **Buy was not tapped** (yes/no), and the earned account is still earned afterwards.
4. Item 7 (B) is recorded **not checked live** (owner ruling 2026-10-08), never passed — unless an error window
   appeared on its own and was checked then, in which case the worklog says so (yes/no per bullet, no copied text).
5. **If any item fails:** file a new task with the readings and point this worklog at it; do not reopen the closed
   build task silently. This task still closes, with the failure recorded.
6. **No secret leaks:** no player id, Yandex id, client id, lobby code, token, host, IP, full URL, log line or clipboard
   content in any artifact — yes/no, counts, dates and times only.
7. *(Added 2026-10-09 with item 8, owner ruling "Fold into 0420".)* Item 8 records the phone model and browser/app,
   that **Buy was not tapped** in (b) and the earned account is still earned, and landscape as a result or **not
   run**. **If (a)'s Buy is not visible without scrolling:** record roughly how much is hidden and put it to the owner
   as a question (shorten again, or accept) — no size target, so **not** a failure of `0421`, which is not reopened.
   A text mismatch (a line differs from `0421`'s table, a *Gone* line is back, the free line shows to a citizen, or a
   Buy button shows to the paid account) is a failure and follows step 5.

## Notes

- **Depends on:** [`0416`](../../done/0416-private-lobby-start-fails-with-403-because-the-container-nginx-drops-the-query-string-on-worker-routes/brief.md), [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md), [`0409`](../../done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md), [`0407`](../../done/0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md), [`0417`](../../done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md), [`0412`](../../done/0412-start-screen-private-tab-with-restyled-private-lobby-buttons/brief.md), [`0413`](../../done/0413-join-private-lobby-modal-replace-the-paste-button-that-cannot-read-the-clipboard-inside-yandex/brief.md), [`0421`](../../done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md)
  — all ✅ Done; the real gate is their **deploy** (pass 1 / pass 2), which no board tracks. *(`0421` added 2026-10-09
  with item 8 — owner ruling "Fold into 0420"; it is already deployed, in game `0.0.161`.)*
- **Blocks:** nothing. It does **not** block Sprint 7's deploy (owner's build/verify-split rule, 2026-09-29).
- **Not included:** `0382` — its live check is [`0383`](../0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md) (owner ruling 2026-10-08).
- **Owner answers to the two open questions — ✅ ANSWERED 2026-10-08.** Both are the owner's own selections, given
  live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` with no
  owner channel (ADR-021/037); ⛔ not producer precedent. No open questions remain on this brief.
  1. ~~**Item 7 (B) — how to open the error window in production.**~~ Owner: **"Mark 'not checked live'"**. Item 7 (B)
     is recorded **not checked live**; the Yandex SDK copy path stays unproven until an error window appears on its
     own, when it may be checked (never paste the copied text anywhere). Applied in item 7 (B) and Verification step 4.
  2. ~~**Placement** — is "read it as the top group" acceptable?~~ Owner: **"Keep rank 18"** — no re-rank; the
     *"read it as the top group"* note stands. `## Priority` unchanged.
- Related: `0376` (its private-lobby steps now start from the Приватная tab — brief not updated), `0401` (closed;
  check 4 passed), `0397` / `0400` (old paid status line replaced by `0407`), `0383` (`0382`'s live check).
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
