# Citizenship explainer popup: shorter text so the Buy button shows without scrolling on phones

## ID
0421

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree) was `0420`, so this is `0421`. No folder, `## ID` or board hit for `0421`.

## Sprint
Sprint 7

## Priority
64

⚠️ Priority 64 is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0417`**, because it is the next change to the same popup file, built on top of
`0417`'s width change, and it is a small, owner-urgent UI fix the owner wants started now (possibly with its own deploy
tomorrow). (ADR-035: appended after [Sprint 7](../../../sprints/plan-sprint-7.md)'s highest, 63 (`0417`). The owner
named the sprint, not a rank. Directly below `0417` is in fact where 64 sits, since `0417` holds 63; and `0417` is a
closed row, so no re-rank could lift this one any higher on this board. The urgency lives in "start now", not in the
rank number.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### The request — the owner's words

Owner, 2026-10-08, typed directly in the live coordinating session, relayed to a spawned `fkit-producer` (no owner
channel; ADR-021/037). ⛔ Not producer precedent. Verbatim:

> *"I want to brief a task to the current sprint (maybe we will do another deploy tomorrow just for that task): we need
> to make the amount of text for the "What is cizineship" popup smaller. Right now on mobile it takes too much space and
> scroll is shown, the "buy" button is not visible "on the 1st screen". Brief a task and let's start working on that
> right now, before implementing, I would need to approve the new text for the popup: show me the new text and the old
> text."*

### What is on screen today

The popup is `src/client/CitizenshipExplainerModal.ts` (from
[`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)), with its strings under
`citizenship_explainer.*` in `resources/lang/en.json` and `resources/lang/ru.json`. Live in production since game
`0.0.157`; the follow-ups [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md),
[`0409`](../../done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md)
and [`0417`](../../done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md) shipped in game
`0.0.160` (owner-run prod deploy, 2026-10-08 evening).

For a non-citizen with a product to buy (the `buy` case — the one the owner is talking about), the popup draws, top to
bottom:

1. Title — `title`
2. Intro paragraph — `intro`
3. Heading "What citizens get" — `benefits_title`
4. 2–3 benefit lines — `benefit_badge`, `benefit_name_change`, and `benefit_private_lobby` (shown only when the player
   can see the Create Lobby button)
5. Sub-heading "Paid citizenship only:" — `paid_only_title` (task `0408`)
6. The no-ads line — `benefit_no_ads`
7. Heading "Get it for free" — `free_title`
8. Free-path paragraph — `free_body`
9. "You have X of Y XP" — `your_xp`
10. Heading "Or buy it now" — `buy_title`
11. **Buy button** — `citizenship_paid.buy_cta` + price
12. Close button — `close`

On a phone this is taller than the screen, so the popup scrolls and the Buy button sits below the first screen.

### The current text — for reference when drafting (as of 2026-10-08)

| Key | en | ru |
|---|---|---|
| `title` | What is citizenship? | Что такое гражданство? |
| `intro` | Citizenship is a special player status. Citizens get extra features in the game. | Гражданство — особый статус игрока. Граждане получают дополнительные возможности в игре. |
| `benefits_title` | What citizens get | Что получают граждане |
| `benefit_badge` | A ★ citizen badge next to your name in matches | Значок ★ гражданина рядом с вашим именем в матчах |
| `benefit_name_change` | Change your display name (a moderator checks each new name) | Смена имени (каждое новое имя проверяет модератор) |
| `benefit_private_lobby` | Create private lobbies to play with friends (anyone can join them) | Создание приватных лобби для игры с друзьями (присоединиться может любой) |
| `paid_only_title` | Paid citizenship only: | Только для платного гражданства: |
| `benefit_no_ads` | No full-screen ads before and after matches | Без полноэкранной рекламы перед матчами и после них |
| `free_title` | Get it for free | Как получить бесплатно |
| `free_body` | Play multiplayer matches: each match you play gives {xpPerMatch} XP. Reach {threshold} XP and citizenship is yours for free. | Играйте в мультиплеере: каждый сыгранный матч даёт {xpPerMatch} XP. Наберите {threshold} XP — и гражданство ваше бесплатно. |
| `your_xp` | You have {xp} of {threshold} XP. | Сейчас у вас {xp} из {threshold} XP. |
| `buy_title` | Or buy it now | Или купите сразу |
| `citizenship_paid.buy_cta` (button, + price) | Buy Citizenship | Купить гражданство |
| `login_hint` (guest case) | Log in with Yandex to earn XP or buy citizenship. | Войдите в Яндекс, чтобы копить XP или купить гражданство. |
| `already_citizen` (citizen cases) | You are already a citizen. | Вы уже гражданин. |
| `citizen_buy_title` (`citizen_buy`) | Paid citizenship | Платное гражданство |
| `citizen_buy_cta` (`citizen_buy`) | Buy paid citizenship | Купить платное гражданство |
| `close` | Close | Закрыть |

`citizenship_explainer.link` ("What is citizenship?") is **not** in the popup body — it is the link on the citizenship
card and in Instructions (`CitizenshipCard.ts`, `CitizenshipHelpSection.ts`). Out of scope unless the owner says
otherwise.

### Dependencies and conflicts

- **None blocking.** `0301`, `0408`, `0409`, `0417` are all built, closed and live.
- ⚠️ **Some current strings are pinned as "the owner's exact words" by tests.** `tests/client/CitizenshipExplainerLang.test.ts`
  asserts `paid_only_title` (from `0408`) and `citizen_buy_title` / `citizen_buy_cta` (from `0409`) word for word. If
  the owner's approved new text changes any of them, that approval **supersedes** the earlier ruling for that string,
  and the test is updated to the new approved words — say so in the worklog.
- ⚠️ **Conflict with the open verify checklist [`0420`](../0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
  (Sprint 8).** Its item 2 quotes the `0408` sub-heading **"Только для платного гражданства:"** word for word, and its
  item 5 (`0417`) expects the popup at phone width to look "as before". If this task ships before `0420` is run, those
  items describe a popup that no longer exists. Not edited here — flagged for the owner (see the report / open
  questions); the coordinating session or the producer updates `0420` once the new text is approved.

## What to build

### 0. Text approval gate — HARD REQUIREMENT, before any code

**No implementation starts until the owner has approved the new text.** The coordinating session drafts it and puts it
to the owner as an **old text vs new text** comparison, en **and** ru, for every string that changes and every element
that would be removed. Owner's words: *"before implementing, I would need to approve the new text for the popup: show me
the new text and the old text."*

- The comparison covers **every case the popup draws** (see step 3), not only the `buy` case, wherever a shared string
  changes.
- The approved text — who approved, date, channel, and the final en + ru strings — is recorded in this brief or the
  task's `worklog.md` before building. The coordinating session does this.
- If, after building, the shorter text still does not get the Buy button onto the first screen, the coder **stops and
  comes back to the owner** with a second draft; it does not trim further on its own.

#### ✅ APPROVED TEXT — OWNER RULING, 2026-10-08

**Authority:** the owner's own selection, *"Approve as shown (Recommended)"*, given live via `AskUserQuestion` in the
coordinating Claude Code session on 2026-10-08 (old-vs-new tables for en and ru shown in that session, plus a rendered
ru preview of the `buy` case). The owner chose this over keeping the moderator and "anyone can join" hints. Recorded by
the coordinating session. The gate above is **met**.

**Elements removed (template change in `CitizenshipExplainerModal.ts`; keys deleted from both language files):**
the intro paragraph (`intro`), the "Get it for free" heading (`free_title`), the "Or buy it now" heading (`buy_title`).

| Key | ru — approved | en — approved |
|---|---|---|
| `title` | Что такое гражданство? *(unchanged)* | What is citizenship? *(unchanged)* |
| `intro` | **removed** | **removed** |
| `benefits_title` | **removed** *(was ~~Граждане получают:~~ — owner change 2026-10-09, see below)* | **removed** *(was ~~Citizens get:~~)* |
| `benefit_badge` | Значок ★ рядом с именем в матчах | A ★ badge next to your name in matches |
| `benefit_name_change` | Смена имени *(was ~~Смену имени~~ — owner choice 2026-10-09, grammar after the heading was removed)* | Name changes |
| `benefit_private_lobby` | Приватные лобби *(was ~~Приватные лобби для игры с друзьями~~ — changed by the owner 2026-10-09, see below)* | Private lobbies *(was ~~Private lobbies to play with friends~~; en kept in sync)* |
| `paid_only_title` | Только с платным гражданством: | Paid citizenship only: *(unchanged)* |
| `benefit_no_ads` | Без рекламы между уровнями *(was ~~Без полноэкранной рекламы~~ — owner change 2026-10-09, see below)* | No ads between levels *(was ~~No full-screen ads~~; en kept in sync)* |
| `free_title` | **removed** | **removed** |
| `free_body` | Получите бесплатно за {threshold} XP *(was ~~Бесплатно — наберите {threshold} XP: +{xpPerMatch} XP за каждый матч в мультиплеере.~~ — owner change 2026-10-09, see below)* | Get it free for {threshold} XP *(was ~~Free — reach {threshold} XP: +{xpPerMatch} XP for every multiplayer match.~~; en kept in sync)* |
| `your_xp` | У вас {xp} / {threshold} XP. | You have {xp} / {threshold} XP. |
| `buy_title` | **removed** | **removed** |

All other `citizenship_explainer.*` keys (`link`, `login_hint`, `already_citizen`, `citizen_buy_title`,
`citizen_buy_cta`, `close`) and `citizenship_paid.buy_cta` are **unchanged**.

✏️ **OWNER CHANGE, 2026-10-09** (the owner's own typed message in the coordinating session, after seeing the ru phone
screenshots), verbatim: *"Change "• Приватные лобби для игры с друзьями" - into "• Приватные лобби""*. Applied to ru;
en shortened to match ("Private lobbies") to keep the two files in sync (project rule) — the owner named only the ru
line.

✏️ **OWNER CHANGE, 2026-10-09** (the owner's own typed message in the coordinating session), verbatim: *"Remove the
title "Граждане получают:""*. The heading element is removed from the template and `benefits_title` is deleted from
both language files.

✏️ **OWNER CHANGE, 2026-10-09** (the owner's own typed message in the coordinating session), verbatim: *"Change "Без
полноэкранной рекламы" into "Без рекламы между уровнями""*. Applied to ru; en changed to match ("No ads between
levels") to keep the two files in sync — the owner named only the ru line. This also supersedes `0408`'s
`benefit_no_ads` pin.

✏️ **OWNER CHANGE, 2026-10-09** (the owner's own typed message in the coordinating session), verbatim: *"Change
"Бесплатно — наберите 100 XP: +1 XP за каждый матч в мультиплеере." into "Получите бесплатно за 100 XP""*. Applied
with the number kept as the `{threshold}` placeholder (never hard-coded); en changed to match ("Get it free for
{threshold} XP"). The per-match number (`{xpPerMatch}`) is no longer shown, so the template stops passing it.

✏️ **OWNER CHANGE, 2026-10-09** (the owner's own typed message in the coordinating session, answering the session's
note that an earned citizen saw "Получите бесплатно за 100 XP" right above "Вы уже гражданин."), verbatim: *"do it"*.
The free-route line (`free_body`) is **not drawn** for the `citizen` and `citizen_buy` offers; every other state still
shows it. A template change only — no text change.

⚠️ The ru `paid_only_title` changes from `0408`'s pinned owner wording (*"Только для платного гражданства:"*). **This
ruling supersedes it**; update the pin in `CitizenshipExplainerLang.test.ts` to the new wording.

### 1. Shorten the popup to the approved text

*(The approved text is the table under step 0 — owner ruling 2026-10-08.)*

- Apply the approved strings to **both** `resources/lang/en.json` and `resources/lang/ru.json` (they must stay in sync).
  Keep the `{xpPerMatch}`, `{threshold}` and `{xp}` placeholders wherever the approved text still uses those numbers —
  numbers come from the existing constants, never hard-coded into copy.
- **Removing whole elements is in scope if the owner approves it** — for example the intro paragraph or the "Or buy it
  now" heading. That is a template change in `CitizenshipExplainerModal.ts`, not only a JSON change. A key whose element
  is removed should be deleted from both language files (and from the lang test's key list), not left dead.

### 2. The goal the text must reach

> ✅ **OWNER RULING, 2026-10-08** (live via `AskUserQuestion` in the coordinating session, owner's own typed answer):
> *"Don't expect any size, we're just trying to make the text as small as possible, while preserving the meaning."*
> **There is NO pass/fail phone-size target.** The goal is the approved, shorter text with its meaning kept. The
> original *"Buy button on the first screen"* wording below is history — kept, not a gate.

~~In the `buy` case, on a typical phone inside Yandex Games, the **Buy button is fully visible on the first screen,
without scrolling**, in both en and ru — with the private-lobby benefit line **shown** (the longest version of the
list). See open point 1 for which phone size counts.~~

### 3. Keep every case working

Every offer the popup can draw still draws correctly: `buy`, `guest` (with and without a login button), `citizen`,
`citizen_buy`, `read_failed`, `no_product`, and `checking`. Shortened shared text must still read correctly in each —
for example, if the intro goes, the guest and citizen cases still make sense without it. The private-lobby line keeps
its existing show/hide rule. Purchase errors (`renderPurchaseError`) still show under the Buy buttons.

### 4. Tests

Update `tests/client/CitizenshipExplainerModal.test.ts` and `tests/client/CitizenshipExplainerLang.test.ts` to the new
text and structure (removed keys out of the key list, pinned owner wording updated to the new approved wording). Add
an absence check for any element removed, so it cannot creep back unnoticed.

### Open points — ✅ ALL ANSWERED 2026-10-08

> **OWNER RULINGS, 2026-10-08**, live via `AskUserQuestion` in the coordinating session:
> 1. Phone size — *"Don't expect any size, we're just trying to make the text as small as possible, while preserving
>    the meaning."* No size target (see step 2).
> 2. Spacing — *"For now, text is ok."* **Text only: no spacing or font changes** in this task.
> 3. Landscape — not asked; moot now that there is no size target.
> 4. `0420` — *"Update 0420 after build (Recommended)"*: once `0421` is built, the producer updates `0420` items 2 and 5
>    to the new popup text and look.
>
> The recommendations below are history.

1. **Which phone counts as "a typical phone".** **Recommendation:** pass at **360 × 640** (a small, common Android
   screen — the strict case) and at **390 × 844** (a modern iPhone-size screen), both portrait. Tradeoff: passing at
   360 × 640 needs the most cutting; if the owner only cares about larger phones, less text has to go. Inside Yandex
   Games the game area is a little shorter than the screen (the platform's own top bar), so a pass with a small margin
   is safer than a pass by a few pixels.
2. **Spacing and font size, if text alone is not enough.** The request is about the amount of text. **Recommendation:**
   text first; tighter spacing (smaller gaps between headings and lists) only if the approved text alone still leaves
   the button below the fold, and only with the owner told. No smaller font sizes unless the owner asks — small text is
   hard to read on a phone.
3. **Landscape phones.** **Recommendation:** out of scope — a landscape phone is too short for any sensible version of
   this popup to fit; it keeps scrolling there, which is fine. Say so if the owner disagrees.

## Verification steps

1. **Approval recorded:** the worklog (or this brief) carries the owner's approved old→new text, en + ru, with who /
   date / channel, **dated before** the first code change.
2. `resources/lang/en.json` and `ru.json` carry exactly the approved strings (a script check, string by string, like
   `0301`'s "N rows, 0 mismatches"); removed keys are gone from both files.
3. **Mobile look, local dev (`npm run dev`), en and ru,** at a phone size (e.g. 390 × 844 portrait), in the `buy` case
   **with the private-lobby line shown**: the popup shows the approved text, the removed elements are gone, nothing is
   clipped. **Record** whether the Buy button is visible without scrolling — **information only, not pass/fail** (owner
   ruling 2026-10-08, step 2). **The Buy button is never tapped** in a local check.
4. The same phone sizes, each other case (`guest`, `citizen`, `citizen_buy`, `read_failed`, `no_product`, `checking`):
   draws without error, text reads correctly, nothing clipped, Close reachable. A written yes/no per case is enough.
5. Desktop width (≥ 1280 px): still uses `0417`'s 600 px width; nothing broken.
6. `npm test` green for the touched suites; `npm run lint` clean; `tsc` clean.
7. **Inside the real Yandex iframe on a phone:** after a deploy — see *Notes → Live check*.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0301` (the popup), `0408` (paid-only sub-heading — its pinned wording may change here), `0409` (`citizen_buy`
  case — its pinned wording may change here), `0417` (width — unchanged here), `0420` (Sprint 8 live checklist — see the
  conflict in *Context*).
- **One unit, not split.** The text and the small template change are proved together on one screen (does the Buy
  button fit?), so neither half can be verified alone.
- **Deploy:** the owner **may** do a mid-week deploy tomorrow (2026-10-09) just for this task — owner's words "maybe",
  **not a commitment**. Otherwise the owner's weekend slot (ruling 2026-09-29). Committed is not deployed; commit and
  deploy stay the owner's call.
- **Live check:** per the owner's build/verify split rule (2026-09-29), this task closes on the local evidence above;
  the live check on a real phone inside Yandex Games becomes a **verify task filed at close**, and it does **not** block
  the deploy. **No verify task is filed now.**
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request relayed from the live coordinating session (ADR-021/037). ⛔ Not producer
  precedent.
